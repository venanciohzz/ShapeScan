/// <reference types="vite/client" />
import { FoodAnalysisResult, ShapeAnalysisResult } from '../types';
import { supabase } from './supabaseService';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyzer`;

// --- HELPER FUNCTIONS (v43/v45/v47-v50) ---

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

// Clamps Equilibrados (v51 - Calibrado)
const clampWeight = (name: string, weight: number): number => {
  const n = name.toLowerCase();
  // Arroz continua conservador para evitar inflação (v51)
  if (n.includes("arroz")) return clamp(weight, 30, 250); 
  // Proteína calibrada: reduzimos o mínimo para aceitar pedaços pequenos (v51)
  if (n.includes("frango") || n.includes("carne") || n.includes("peixe") || n.includes("proteina")) return clamp(weight, 40, 250);
  if (n.includes("feijao")) return clamp(weight, 30, 200);
  return clamp(weight, 10, 600);
};

// Normalização de Prato Inteligente (v47/v48)
const normalizeWeights = (items: any[], maxTotal: number = 550): any[] => {
  let currentTotal = items.reduce((sum, i) => sum + i.weight, 0);
  if (currentTotal <= maxTotal) return items;
  
  const factor = maxTotal / currentTotal;
  const normalized = items.map(item => ({
    ...item,
    weight: Math.round(item.weight * factor),
    calories: Math.round(item.calories * factor),
    protein: Math.round(item.protein * factor),
    carbs: Math.round(item.carbs * factor),
    fat: Math.round(item.fat * factor)
  }));

  const finalTotal = normalized.reduce((sum, i) => sum + i.weight, 0);
  if (finalTotal > maxTotal) {
    normalized[0].weight -= (finalTotal - maxTotal);
  }

  return normalized;
};

// Health Score (v55 - Ajustado para Comida Limpa)
const calculateIntelligentScore = (baseScore: number | undefined, protein: number, fat: number, calories: number, observation: string): number => {
  let score = baseScore ?? 7; // Default maior para comida limpa
  if (fat > 35) score -= 2;
  if (protein < 12) score -= 2;
  if (calories > 1000) score -= 1;
  if (protein > 25) score += 2; // Bônus maior para proteína
  const obs = observation.toLowerCase();
  const isClean = obs.includes("grelhado") || obs.includes("cozido") || obs.includes("frango") || obs.includes("arroz");
  if (isClean && fat < 15) score += 1;
  if (obs.includes("legumes") || obs.includes("vegetais") || obs.includes("salada") || obs.includes("fibras")) score += 1;
  return clamp(Math.round(score), 0, 10);
};

// Muscle Score (v45)
const calculateMuscleScore = (protein: number, carbs: number, fat: number): number => {
  let score = 5;
  if (protein > 30) score += 2;
  if (protein > 50) score += 3;
  if (carbs > 40) score += 1;
  if (carbs > 80) score += 2;
  if (fat > 35) score -= 1;
  return clamp(Math.round(score), 0, 10);
};

const callAIAnalyzer = async (payload: { image?: string, prompt: string, systemPrompt?: string, type: 'food' | 'shape' | 'chat' }): Promise<string> => {
  // Força refresh do token para garantir JWT válido
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  const session = refreshData?.session ?? (await supabase.auth.getSession()).data.session;

  if (refreshError || !session) {
    console.error('[openaiService] Auth session error or not found:', refreshError);
    throw new Error('401: Sua sessão expirou. Por favor, saia e entre novamente no aplicativo.');
  }

  try {
    // Log for debugging (remove in production if too noisy)
    console.log(`[openaiService] Invoking ai-analyzer for ${payload.type}...`);

    // Explicitly pass Authorization header — supabase.functions.invoke auto-detection
    // can fail in some environments, explicit header guarantees the correct token is sent
    const { data, error } = await supabase.functions.invoke('ai-analyzer', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('[openaiService] Edge Function invoke error:', error);

      // Try to parse the response body for structured errors (429, 401, etc.)
      let errorBody: any = null;
      const httpStatus = error.context?.status ?? error.status;
      try {
        if (error.context && typeof error.context.json === 'function') {
          errorBody = await error.context.json();
        }
      } catch (_) { /* ignore parse errors */ }

      if (httpStatus === 401 || (error.message && error.message.includes('401'))) {
        throw new Error('401: Sessão inválida. Por favor, faça login novamente para reautenticar.');
      }

      if (httpStatus === 429 || errorBody?.isLimitReached) {
        const e: any = new Error(errorBody?.error || 'Você atingiu seu limite diário para este recurso.');
        e.isLimitReached = true;
        e.showPaywall = errorBody?.showPaywall || false;
        throw e;
      }

      if (httpStatus === 406) {
        throw new Error('Erro de configuração no servidor (406). Por favor, contate o suporte.');
      }

      throw new Error(errorBody?.error || error.message || 'Erro de conexão com o servidor de IA. Tente novamente.');
    }

    if (data?.isError) {
      console.error('[openaiService] AI Business Logic Error:', data.error);
      throw new Error(data.error || 'Não foi possível completar a análise no momento.');
    }

    if (!data || data.text === undefined) {
       console.error('[openaiService] Unexpected response structure:', data);
       throw new Error('O servidor retornou uma resposta inválida. Tente novamente em instantes.');
    }

    if (data.usage) {
      console.log(`[AI Usage] Tokens: ${data.usage.total_tokens || 'N/A'}`);
    }

    return data.text;
  } catch (err: any) {
    console.error('[openaiService] Exception in callAIAnalyzer:', err);
    throw err;
  }
};

const extractJson = (text: string): string => {
  try {
    // Tenta primeiro encontrar o bloco de código JSON padrão
    const markdownMatch = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      return markdownMatch[1].trim();
    }
    // Tenta extrair qualquer coisa entre chaves (salva o backend de textos aleatórios antes e depois)
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1);
    }
    // Fallback agressivo limpando tags markdown restantes
    return text.replace(/```json|```JSON|```/g, '').trim();
  } catch (e) {
    console.error("Erro ao extrair JSON:", e);
    return text;
  }
};

const safeParseFloat = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const strVal = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(strVal);
  return isNaN(parsed) ? 0 : parsed;
};

export const analyzePlate = async (
  base64Image: string,
  userDescription?: string,
  userGoal?: string,
  userWeight?: number,
  userHeight?: number,
  userGender?: 'male' | 'female'
): Promise<FoodAnalysisResult> => {
  try {
    const descriptionContext = userDescription ? `O usuário descreveu a refeição como: "${userDescription}".` : '';

    // Contexto físico do usuário para calibrar as porções
    const weightCtx = userWeight ? `${userWeight}kg` : 'não informado';
    const heightCtx = userHeight ? `${userHeight}m` : 'não informado';
    const sexCtx = userGender === 'male' ? 'Masculino' : userGender === 'female' ? 'Feminino' : 'não informado';
    const goalCtx = userGoal || 'Manutenção';

    const prompt = `Analise a refeição na imagem. ${descriptionContext}
Perfil do usuário: Peso ${weightCtx} | Altura ${heightCtx} | Sexo ${sexCtx} | Objetivo: ${goalCtx}.
Use o perfil para calibrar se as porções são adequadas, excessivas ou insuficientes para esse usuário.
Identifique alimentos, estime peso(g) e calcule macros.`;

    const plateLimits: Record<string, number> = { "P": 350, "M": 550, "G": 750 };
    const plateSizeHint = userDescription?.toLowerCase().includes("prato grande") ? "G" : "M";

    const systemPrompt = `Você é um analista nutricional especializado em estimativa visual de alimentos para culinária brasileira.
Seu objetivo é analisar imagens de refeições e estimar pesos e macros de forma REALISTA, calibrando as porções ao perfil físico do usuário.

PRINCÍPIOS:
1. CALIBRAÇÃO POR PERFIL: use o peso e sexo do usuário para ajustar as porções (ex: usuário de 60kg precisa de menos carbs que um de 100kg em bulking).
2. ESTIMATIVA POR ETAPAS: identifique alimentos → estime peso → calcule macros.
3. ÂNCORAS BR: Arroz (110-150g), Feijão (80-120g), Proteína/Carne (100-150g).
4. TOP-DOWN: Reduza estimativa de peso em 10-20% devido à compressão visual.
5. SEGURANÇA: Se não detectar comida, retorne {"error": "no_food_detected"}.

RESPOSTA (JSON APENAS):
{
  "dish_name": "Nome Curto",
  "food_items": [{"name": "...", "weight_g": 0, "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}],
  "total_calories": 0, "total_protein_g": 0, "total_carbs_g": 0, "total_fat_g": 0, "health_score": 0.0,
  "dish_category": "...",
  "goal_analysis": {"bulking": "...", "cutting": "..."},
  "observation": "..."
}`;

    let text = await callAIAnalyzer({ image: base64Image, prompt, systemPrompt, type: 'food' });
    if (typeof text !== 'string') text = JSON.stringify(text);

    const jsonText = extractJson(text);
    const data = JSON.parse(jsonText);

    // Tratamento para detecção de não-comida
    if (data.error === "no_food_detected") {
      return {
        dish_name: "Alimento não detectado",
        items: [],
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        totalWeight: 0,
        score: 0,
        observation: "Não conseguimos identificar alimentos nesta imagem. Certifique-se de que a foto está clara e mostra o prato de frente.",
        mealName: "Não identificado",
        reasoning: "A IA não detectou comida na imagem."
      };
    }

    const itemsRaw = data.food_items || data.ingredients || data.items || [];
    const plateSize = data.plate_size || "M";

    let processedItems = itemsRaw.map((item: any) => ({
      name: item.name,
      weight: clampWeight(item.name, safeParseFloat(item.weight_g || item.estimated_weight_g || item.weight)),
      calories: safeParseFloat(item.calories),
      protein: safeParseFloat(item.protein_g || item.protein),
      carbs: safeParseFloat(item.carbs_g || item.carbs),
      fat: safeParseFloat(item.fat_g || item.fat)
    }));

    processedItems = normalizeWeights(processedItems, plateLimits[plateSize] || 550);

    const result: FoodAnalysisResult = {
      dish_name: data.dish_name || data.mealName || "Refeição Analisada",
      score: safeParseFloat(data.health_score ?? data.nutrition_score ?? data.score ?? 5),
      calories: safeParseFloat(data.total_calories) || processedItems.reduce((acc: number, i: any) => acc + i.calories, 0),
      protein_g: safeParseFloat(data.total_protein_g) || processedItems.reduce((acc: number, i: any) => acc + i.protein, 0),
      carbs_g: safeParseFloat(data.total_carbs_g) || processedItems.reduce((acc: number, i: any) => acc + i.carbs, 0),
      fat_g: safeParseFloat(data.total_fat_g) || processedItems.reduce((acc: number, i: any) => acc + i.fat, 0),
      dish_category: data.dish_category || data.category || "Refeição",
      totalWeight: processedItems.reduce((acc: number, i: any) => acc + i.weight, 0),
      goal_analysis: data.goal_analysis || { bulking: "Análise não disponível", cutting: "Análise não disponível" },
      observation: data.observation || data.analysis_comment || "Análise concluída.",
      items: processedItems
    };

    const calculatedKcal = (result.protein_g * 4) + (result.carbs_g * 4) + (result.fat_g * 9);
    const diffRatio = result.calories > 0 ? Math.abs(result.calories - calculatedKcal) / result.calories : 1;
    if (diffRatio > 0.15 || result.calories === 0) {
      result.calories = calculatedKcal;
    }

    result.calories = clamp(result.calories, 0, 2000);
    result.score = calculateIntelligentScore(result.score, result.protein_g, result.fat_g, result.calories, result.observation);
    result.muscle_score = calculateMuscleScore(result.protein_g, result.carbs_g, result.fat_g);

    // Compatibilidade
    result.mealName = result.dish_name; result.totalCalories = result.calories;
    result.totalProtein = result.protein_g; result.totalCarbs = result.carbs_g;
    result.totalFat = result.fat_g; result.reasoning = result.observation;

    return result;
  } catch (error: any) {
    console.error('[openaiService] Error in analyzePlate:', error);
    // Re-throw auth/limit errors so FoodAnalyzer can handle them properly
    if (error.isLimitReached || (error.message && error.message.startsWith('401:'))) {
      throw error;
    }
    return {
      dish_name: "Erro na análise",
      items: [],
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      totalWeight: 0,
      score: 0,
      observation: error.message || "Não foi possível analisar. Tente uma foto mais clara.",
      mealName: "Erro",
      reasoning: "Falha na comunicação com a IA: " + (error.message || "Erro desconhecido")
    };
  }
};

export const getManualFoodMacros = async (foodDescription: string, userGoal?: string): Promise<FoodAnalysisResult> => {
  try {
    // Prompt user limpo — sem duplicar instruções do systemPrompt
    const goalContext = userGoal ? `Objetivo do usuário: ${userGoal}.` : '';
    const prompt = `Analise a refeição descrita abaixo e retorne as informações nutricionais estimadas.
Refeição: "${foodDescription}"
${goalContext}
Limite máximo de 8 ingredientes.`;

    const systemPrompt = `Você é um analista nutricional especializado em estimativa de alimentos com foco em REALISMO e CONSISTÊNCIA para culinária brasileira.
REGRAS:
1. Use porções comuns BR (ex: colher de arroz = 80g, concha de feijão = 100g, filé médio = 120g).
2. Estime por etapas internamente: identificar → pesar → calcular macros.
3. Use o objetivo do usuário para contextualizar o campo goal_analysis.
4. Retorne APENAS JSON válido com os campos: dish_name, food_items, total_calories, total_protein_g, total_carbs_g, total_fat_g, health_score (0-10), dish_category, goal_analysis (bulking/cutting), observation.`;

    let text = await callAIAnalyzer({ prompt, systemPrompt, type: 'food' });
    if (typeof text !== 'string') text = JSON.stringify(text);

    const data = JSON.parse(extractJson(text));
    const itemsRaw = data.food_items || data.ingredients || data.items || [];
    
    let processedItems = itemsRaw.map((item: any) => ({
      name: item.name,
      weight: clampWeight(item.name, safeParseFloat(item.weight_g || item.weight)),
      calories: safeParseFloat(item.calories),
      protein: safeParseFloat(item.total_protein_g || item.protein_g || item.protein),
      carbs: safeParseFloat(item.total_carbs_g || item.carbs_g || item.carbs),
      fat: safeParseFloat(item.total_fat_g || item.fat_g || item.fat)
    }));

    const result: FoodAnalysisResult = {
      dish_name: data.dish_name || foodDescription,
      score: safeParseFloat(data.health_score ?? data.nutrition_score ?? data.score ?? 5),
      calories: safeParseFloat(data.total_calories) || processedItems.reduce((acc: number, i: any) => acc + i.calories, 0),
      protein_g: safeParseFloat(data.total_protein_g) || processedItems.reduce((acc: number, i: any) => acc + i.protein, 0),
      carbs_g: safeParseFloat(data.total_carbs_g) || processedItems.reduce((acc: number, i: any) => acc + i.carbs, 0),
      fat_g: safeParseFloat(data.total_fat_g) || processedItems.reduce((acc: number, i: any) => acc + i.fat, 0),
      dish_category: data.dish_category || data.category || "Refeição",
      totalWeight: processedItems.reduce((acc: number, i: any) => acc + i.weight, 0),
      goal_analysis: data.goal_analysis || { bulking: "Análise não disponível", cutting: "Análise não disponível" },
      observation: data.observation || "Cálculo concluído.",
      items: processedItems
    };

    const calculatedKcal = (result.protein_g * 4) + (result.carbs_g * 4) + (result.fat_g * 9);
    const diffRatio = result.calories > 0 ? Math.abs(result.calories - calculatedKcal) / result.calories : 1;
    if (diffRatio > 0.15 || result.calories === 0) result.calories = calculatedKcal;

    result.calories = clamp(result.calories, 0, 2000);
    result.score = calculateIntelligentScore(result.score, result.protein_g, result.fat_g, result.calories, result.observation);
    result.muscle_score = calculateMuscleScore(result.protein_g, result.carbs_g, result.fat_g);

    result.mealName = result.dish_name; result.totalCalories = result.calories;
    result.totalProtein = result.protein_g; result.totalCarbs = result.carbs_g;
    result.totalFat = result.fat_g; result.reasoning = result.observation;

    return result;
  } catch (error: any) {
    console.error('[openaiService] Error in getManualFoodMacros:', error);
    return { 
      dish_name: "Erro na análise", 
      items: [], 
      calories: 0, 
      protein_g: 0, 
      carbs_g: 0, 
      fat_g: 0, 
      totalWeight: 0, 
      score: 0, 
      observation: "Erro ao analisar texto: " + (error.message || "Tente descrever de outra forma."),
      mealName: "Erro",
      reasoning: error.message || "Erro"
    };
  }
};

export const analyzeShape = async (base64Image: string, metrics?: { weight?: number, height?: number, goal?: string }): Promise<ShapeAnalysisResult> => {
  try {
    // Prompt user estruturado com dados completos do usuário para análise personalizada
    const weight = metrics?.weight ? `${metrics.weight}kg` : 'não informado';
    const height = metrics?.height ? `${metrics.height}m` : 'não informado';
    const goal = metrics?.goal || 'Geral';
    const prompt = `Analise o shape corporal nesta imagem considerando os dados do usuário:

Peso: ${weight}
Altura: ${height}
Objetivo: ${goal}

Analize com foco nos seguintes pontos:
• Nível de gordura corporal (estime a faixa de % de BF visualmente)
• Massa muscular visível e desenvolvimento
• Proporções (ombro/cintura, equilíbrio entre grupos musculares)
• Pontos fracos estru turais que limitam o desenvolvimento
• Recomendações específicas de treino para o objetivo: ${goal}
• Protocolo nutricional alinhado ao objetivo e ao perfil físico atual`;

    const systemPrompt = `Especialista em bioimpedância visual. Analise por etapas internamente.
REGRAS:
1. BF em faixa (ex: 14-16%).
2. Retorne APENAS JSON:
{
  "body_fat_range": "...", "bf_classification": "...", "bf_visual_justification": "...",
  "shape_score": 0, "muscle_score": 0, "definition_score": 0, "fat_score": 0,
  "structural_analysis": {"name": "...", "meaning": "...", "strength": "...", "improvement": "...", "genetic_responsiveness": "...", "fat_storage_tendency": "...", "structural_limitation_strategy": "..."},
  "regional_analysis": {"trunk": {"strength": "...", "improvement": "...", "strategy": "..."}, "arms": {"strength": "...", "improvement": "...", "strategy": "..."}, "abs_waist": {"strength": "...", "improvement": "...", "strategy": "..."}, "legs": {"strength": "...", "improvement": "...", "strategy": "..."}},
  "personal_ia_insight": {"aesthetic_diagnosis": "...", "main_leverage": "...", "smart_strategy": "..."},
  "execution_strategy": {"training_focus": [], "nutrition_focus": "...", "time_expectation": "...", "common_mistakes": [], "primary_focus_next_60_days": "..."},
  "nutritional_protocol": {"caloric_strategy": "...", "protein_target": "...", "distribution": "...", "practical_guidelines": []}
}`;

    let text = await callAIAnalyzer({ image: base64Image, prompt, systemPrompt, type: 'shape' });
    if (typeof text !== 'string') text = JSON.stringify(text);

    const data = JSON.parse(extractJson(text));

    // Fallbacks robustos para evitar crash se a IA esquecer campos (v55)
    return {
      ...data,
      body_fat_range: data.body_fat_range || data.bf_range || data.bf || "N/A",
      bf_classification: data.bf_classification || "Não identificado",
      bf_confidence: data.bf_confidence || "Moderada",
      bf_visual_justification: data.bf_visual_justification || "",
      shape_score: safeParseFloat(data.shape_score ?? data.shapeScore ?? 0),
      muscle_score: safeParseFloat(data.muscle_score ?? data.muscleScore ?? 0),
      definition_score: safeParseFloat(data.definition_score ?? data.definitionScore ?? 0),
      fat_score: safeParseFloat(data.fat_score ?? data.fatScore ?? 0),
      structural_analysis: data.structural_analysis || {
        name: data.biotype || "Não Identificado",
        meaning: "Arquitetura corporal padrão",
        strength: "Base sólida",
        improvement: "Consistência geral",
        genetic_responsiveness: "Padrão",
        fat_storage_tendency: "Equilibrada",
        structural_limitation_strategy: "Seguir plano base"
      },
      personal_ia_insight: data.personal_ia_insight || {
        aesthetic_diagnosis: data.personal_ia_comment || "Análise concluída com sucesso.",
        main_leverage: "Consistência no treino",
        smart_strategy: "Seguir o plano recomendado"
      },
      personal_ia_comment: data.personal_ia_comment || "Análise concluída.",
      regional_analysis: data.regional_analysis || {
        trunk: { strength: "N/A", improvement: "N/A", strategy: "N/A" },
        arms: { strength: "N/A", improvement: "N/A", strategy: "N/A" },
        abs_waist: { strength: "N/A", improvement: "N/A", strategy: "N/A" },
        legs: { strength: "N/A", improvement: "N/A", strategy: "N/A" }
      },
      execution_strategy: data.execution_strategy || {
        training_focus: [],
        nutrition_focus: "Foco em macros limpos",
        time_expectation: "8-12 semanas",
        common_mistakes: [],
        primary_focus_next_60_days: "Construção de base"
      },
      nutritional_protocol: data.nutritional_protocol || {
        caloric_strategy: "Manutenção",
        protein_target: "2.0g/kg",
        distribution: "4-5 refeições",
        practical_guidelines: []
      }
    };
  } catch (error) {
    console.error("Erro em analyzeShape:", error);
    throw error;
  }
};

export const chatWithPersonal24h = async (message: string, history: any[], userContext: any) => {
  const limitedHistory = history.slice(-10);
  let conversationContext = '';
  if (limitedHistory.length > 0) {
    conversationContext = '\n\nHistórico recente:\n' + limitedHistory.map(msg =>
      `${msg.role === 'user' ? 'Usuário' : 'Personal'}: ${msg.content}`
    ).join('\n');
  }

  const u = userContext.user;
  const userInfo = u ? `Nome: ${u.name || 'atleta'} | Objetivo: ${u.goal || 'não informado'} | Peso: ${u.weight || '?'}kg | Altura: ${u.height || '?'}m` : '';

  const systemPrompt = `Você é o Personal 24H do ShapeScan — um personal trainer brasileiro top, carismático e muito motivador.

PERSONALIDADE:
- Fale como um amigo de academia que manja muito: energia alta, brincalhão mas certeiro
- Use gírias brasileiras naturais (mano, cara, bora, saudade, boa demais, tá ligado?)
- Seja direto e prático — sem enrolação
- Humor leve e motivação constante — nunca robótico
- Curto e poderoso — máximo 3-4 frases por resposta

EMOJIS (use bastante, em TODA resposta):
- Motivação: 💪🔥🚀⚡🏆🎯💥
- Treino: 🏋️‍♂️🤸‍♂️🏃‍♂️💦🧠
- Comida/dieta: 🍗🥦🥚🍳🥩🫙
- Celebração: 🎉✅👊🙌😎🤙
- Diversão/gíria: 😂🫡🫣👀🤯🥵
- Coloque pelo menos 2-3 emojis por resposta, misturados no texto naturalmente

EXPERTISE (responda com autoridade):
- Treino de musculação, hipertrofia, cutting, recomposição corporal
- Dieta, macros, timing de nutrição, protocolo de bulking/cutting
- Motivação, mindset, consistência
- Dicas práticas do dia a dia de academia

REGRAS RÍGIDAS:
- NUNCA retorne JSON, dicionários ou markdown
- NUNCA use asteriscos, sublinhados ou formatação especial
- NUNCA dê conselho médico ou de suplementação com dosagem
- Responda APENAS em texto corrido, natural, como numa conversa

CONTEXTO DO USUÁRIO: ${userInfo}${conversationContext}`;

  try {
    return await callAIAnalyzer({ prompt: message, systemPrompt, type: 'chat' });
  } catch (error: any) {
    return `Essa aqui travou, mas não desiste não! Manda de novo que eu tô na área. 💪`;
  }
};

export const getDailyFeedback = async (
  consumed: { calories: number, protein: number, carbs: number, fat: number },
  goals: { calories: number, protein: number, carbs: number, fat: number },
  userGoal: string
): Promise<any> => {
  const calDiff = consumed.calories - goals.calories;
  const protDiff = consumed.protein - goals.protein;

  const prompt = `Analise o resumo nutricional do dia do usuário e retorne um feedback JSON.

Consumido hoje: ${consumed.calories.toFixed(0)}kcal | Proteína: ${consumed.protein.toFixed(0)}g | Carbs: ${consumed.carbs.toFixed(0)}g | Gordura: ${consumed.fat.toFixed(0)}g
Meta diária: ${goals.calories.toFixed(0)}kcal | Proteína: ${goals.protein.toFixed(0)}g | Carbs: ${goals.carbs.toFixed(0)}g | Gordura: ${goals.fat.toFixed(0)}g
Saldo calórico: ${calDiff >= 0 ? '+' : ''}${calDiff.toFixed(0)}kcal | Saldo proteína: ${protDiff >= 0 ? '+' : ''}${protDiff.toFixed(0)}g
Objetivo: ${userGoal}

Retorne APENAS JSON válido:
{
  "status": "excellent" | "good" | "average" | "bad",
  "protein_feedback": "feedback curto sobre proteína (max 15 palavras)",
  "energy_feedback": "feedback curto sobre calorias (max 15 palavras)",
  "general_advice": "dica prática motivadora alinhada ao objetivo (max 20 palavras)",
  "score": 0-100
}`;

  // IMPORTANTE: type 'food' força response_format json_object na Edge Function
  // getDailyFeedback precisa de JSON — nunca usar type 'chat' aqui
  const systemPrompt = `Você é um coach de nutrição esportiva brasileiro especializado em análise de macros.
Seja técnico, direto e motivador. Avalie o dia do usuário considerando seu objetivo específico (${userGoal}).
Respostas nos campos de texto devem ser curtas, energéticas e em português.
Retorne APENAS o JSON, sem texto antes ou depois.`;

  try {
    let text = await callAIAnalyzer({ prompt, systemPrompt, type: 'food' }); // 'food' força JSON na Edge Function
    if (typeof text !== 'string') text = JSON.stringify(text);
    return JSON.parse(extractJson(text));
  } catch (error) {
    return {
      status: 'average',
      protein_feedback: 'Continue monitorando sua proteína.',
      energy_feedback: 'Ajuste suas calorias conforme sua meta.',
      general_advice: 'Mantenha a consistência para ver resultados.',
      score: 50
    };
  }
};
