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
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('401: Sessão expirada ou não encontrada. Por favor, saia e entre novamente.');
  }

  const { data, error } = await supabase.functions.invoke('ai-analyzer', {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) {
    throw new Error(error.message || 'Erro desconhecido na análise de IA');
  }

  if (data?.isError) {
    throw new Error(data.error || 'Erro na lógica da IA');
  }

  return data.text;
};

const extractJson = (text: string): string => {
  try {
    const markdownMatch = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      return markdownMatch[1].trim();
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1);
    }
    return text.replace(/```json|```JSON|```/g, '').trim();
  } catch (e) {
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

export const analyzePlate = async (base64Image: string, userDescription?: string, userGoal?: string): Promise<FoodAnalysisResult> => {
  try {
    const descriptionContext = userDescription ? `O usuário descreveu a refeição como: "${userDescription}".` : '';

    const prompt = `Analise a imagem da refeição e identifique os alimentos visíveis. ${descriptionContext}

Instruções (v51 - Ultra Precision):
1. Identifique cada alimento separadamente (Máximo 8 itens).
2. Identifique o tamanho do prato ("plate_size"): "P", "M" ou "G".
3. Estime peso e macros com foco em DENSIDADE REAL e REFERÊNCIA DE ESCALA.

Regras de Ouro (v54):
- DENSIDADE DE PROTEÍNA (CÁLCULO): Use a âncora de 85g para 2 pedaços finos. Calcule proporcionalmente a quantidade: 1 pedaço ≈ 42g, 2 ≈ 85g, 3 ≈ 127g.
- COBERTURA DE ARROZ (EQUILÍBRIO): Arroz que cobre o fundo do prato de forma rasa e completa pesa ≈ 130-150g. Só dê >160g se houver altura (montanha).
- ESCALA VISUAL: O prato azul é raso. Arroz espalhado nele nunca passa de 150g a menos que forme uma pilha.
- REALISMO ABSOLUTO: Prefira a gramatura menor se houver dúvida entre densidades.

Retorne apenas um JSON válido contendo:
{
 "dish_name": "Nome",
 "plate_size": "P" | "M" | "G",
 "calories": 0,
 "protein_g": 0,
 "carbs_g": 0,
 "fat_g": 0,
 "ingredients": [
   {"name": "Item", "estimated_weight_g": 0, "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}
 ],
 "score": 0.0,
 "goal_analysis": {"bulking": "Dica", "cutting": "Dica"},
 "observation": "Resumo"
}`;

    const systemPrompt = `Você é um analista nutricional focado em REALISMO EXTREMO e JUSTIÇA NUTRICIONAL.
DIRETRIZES:
- Âncora: 2 pedaços finos de frango = 85g. (1 pedaço ≈ 42g).
- Arroz (Cobertura Rasa): 130g-150g.
- HEALTH SCORE: Arroz e Frango/Carne Grelhado é uma refeição EXCELENTE (Nota 8 a 10).
- META DO USUÁRIO: ${userGoal || 'Não informada'}. 
- No campo do JSON correspondente à meta do usuário, escreva de 2 a 3 frases DETALHADAS explicando por que a refeição é adequada (ou o que ajustar) especificamente para ESSA meta. Não diga apenas "Ideal". Justifique com base nos macros. No outro campo, mantenha uma dica curta e genérica.
- Responda apenas com o JSON solicitado.`;

    let text = await callAIAnalyzer({ image: base64Image, prompt, systemPrompt, type: 'food' });
    if (typeof text !== 'string') text = JSON.stringify(text);

    const data = JSON.parse(extractJson(text));
    const ingredientsRaw = data.ingredients || data.items || [];
    const plateSize = data.plate_size || "M";

    const plateLimits: Record<string, number> = { "P": 350, "M": 550, "G": 750 };
    const maxTotalWeight = plateLimits[plateSize] || 550;
    
    let processedItems = ingredientsRaw.map((item: any) => ({
      name: item.name,
      weight: clampWeight(item.name, safeParseFloat(item.estimated_weight_g || item.weight)),
      calories: safeParseFloat(item.calories),
      protein: safeParseFloat(item.protein_g || item.protein),
      carbs: safeParseFloat(item.carbs_g || item.carbs),
      fat: safeParseFloat(item.fat_g || item.fat)
    }));

    processedItems = normalizeWeights(processedItems, maxTotalWeight);

    const result: FoodAnalysisResult = {
      dish_name: data.dish_name || data.mealName || "Refeição Analisada",
      score: safeParseFloat(data.health_score ?? data.nutrition_score ?? data.score ?? 5),
      calories: processedItems.reduce((acc: number, i: any) => acc + i.calories, 0),
      protein_g: processedItems.reduce((acc: number, i: any) => acc + i.protein, 0),
      carbs_g: processedItems.reduce((acc: number, i: any) => acc + i.carbs, 0),
      fat_g: processedItems.reduce((acc: number, i: any) => acc + i.fat, 0),
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
    return { 
      dish_name: "Erro na análise", items: [], calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, totalWeight: 0, score: 0, 
      observation: "Não foi possível analisar. Tente uma foto mais clara.",
      mealName: "Erro", reasoning: "Erro"
    };
  }
};

export const getManualFoodMacros = async (foodDescription: string, userGoal?: string): Promise<FoodAnalysisResult> => {
  try {
    const prompt = `Analise a refeição e estime macros. Refeição: "${foodDescription}"
Retorne JSON com: food_items, total_calories, total_protein_g, total_carbs_g, total_fat_g, health_score, dish_category, goal_analysis, observation.
Limite máximo de 8 ingredientes.`;

    const systemPrompt = `Você é um nutricionista especialista brasileiro focado no objetivo: ${userGoal || 'Geral'}. Forneça diagnósticos para Bulking/Cutting e macros realistas baseados em porções padrão.`;

    let text = await callAIAnalyzer({ prompt, systemPrompt, type: 'food' });
    if (typeof text !== 'string') text = JSON.stringify(text);

    const data = JSON.parse(extractJson(text));
    const itemsRaw = data.food_items || data.ingredients || [];
    
    let processedItems = itemsRaw.map((item: any) => ({
      name: item.name,
      weight: clampWeight(item.name, safeParseFloat(item.weight_g || item.weight)),
      calories: safeParseFloat(item.calories),
      protein: safeParseFloat(item.total_protein_g || item.protein_g || item.protein),
      carbs: safeParseFloat(item.total_carbs_g || item.carbs_g || item.carbs),
      fat: safeParseFloat(item.total_fat_g || item.fat_g || item.fat)
    }));

    const result: FoodAnalysisResult = {
      dish_name: foodDescription,
      score: safeParseFloat(data.health_score ?? data.nutrition_score ?? data.score ?? 5),
      calories: processedItems.reduce((acc: number, i: any) => acc + i.calories, 0),
      protein_g: processedItems.reduce((acc: number, i: any) => acc + i.protein, 0),
      carbs_g: processedItems.reduce((acc: number, i: any) => acc + i.carbs, 0),
      fat_g: processedItems.reduce((acc: number, i: any) => acc + i.fat, 0),
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
  } catch (error) {
    return { dish_name: "Erro ao calcular", items: [], calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, totalWeight: 0, score: 0, observation: "Erro ao calcular." };
  }
};

export const analyzeShape = async (base64Image: string, metrics?: { weight?: number, height?: number, goal?: string }): Promise<ShapeAnalysisResult> => {
  try {
    const prompt = `Analise BF%, massa muscular e pontos fortes/fracos. ${metrics?.weight ? `Dados: ${metrics.weight}kg, ${metrics.height}cm, Objetivo: ${metrics.goal}.` : ''}`;
    const systemPrompt = `Especialista em antropometria visual. Use faixas BF (ex: 12-14%). Sem conselho médico. JSON: structural_analysis, body_fat_range, muscle_score, shape_score, regional_analysis, recommendations.`;

    let text = await callAIAnalyzer({ image: base64Image, prompt, systemPrompt, type: 'shape' });
    if (typeof text !== 'string') text = JSON.stringify(text);

    const data = JSON.parse(extractJson(text));

    return {
      ...data,
      body_fat_range: data.body_fat_range || data.bf_range || data.bf || "N/A",
      shape_score: safeParseFloat(data.shape_score ?? data.shapeScore ?? 0),
      muscle_score: safeParseFloat(data.muscle_score ?? data.muscleScore ?? 0),
      definition_score: safeParseFloat(data.definition_score ?? data.definitionScore ?? 0),
      fat_score: safeParseFloat(data.fat_score ?? data.fatScore ?? 0)
    };
  } catch (error) {
    throw error;
  }
};

export const chatWithNutricionistaDiario = async (message: string, history: any[], userContext: any) => {
  const limitedHistory = history.slice(-10);
  let conversationContext = '';
  if (limitedHistory.length > 0) {
    conversationContext = '\n\nHistórico:\n' + limitedHistory.map(msg =>
      `${msg.role === 'user' ? 'U' : 'AI'}: ${msg.content}`
    ).join('\n');
  }

  const systemPrompt = `Você é a "Nutricionista Diário" do ShapeScan. 
REGRAS: 1. Sem conselho médico. 2. Estilo WhatsApp (Sem markdown, texto puro). 3. Respostas curtas e motivadoras. 4. Emojis moderados.
CONTEXTO: ${JSON.stringify(userContext.user)}. ${conversationContext}`;

  try {
    return await callAIAnalyzer({ prompt: message, systemPrompt, type: 'chat' });
  } catch (error: any) {
    return `Erro: ${error.message || "Tente novamente mais tarde."}`;
  }
};

export const getDailyFeedback = async (
  consumed: { calories: number, protein: number, carbs: number, fat: number },
  goals: { calories: number, protein: number, carbs: number, fat: number },
  userGoal: string
): Promise<any> => {
  const prompt = `Analise o resumo nutricional do dia e forneça um feedback inteligente.
Consumido: ${consumed.calories.toFixed(0)}kcal, P:${consumed.protein.toFixed(0)}g, C:${consumed.carbs.toFixed(0)}g, G:${consumed.fat.toFixed(0)}g
Metas: ${goals.calories.toFixed(0)}kcal, P:${goals.protein.toFixed(0)}g, C:${goals.carbs.toFixed(0)}g, G:${goals.fat.toFixed(0)}g
Objetivo do Usuário: ${userGoal}

Retorne um JSON válido contendo:
{
  "status": "excellent",
  "protein_feedback": "mensagem curta sobre proteína",
  "energy_feedback": "mensagem curta sobre calorias e energia",
  "general_advice": "dica prática final",
  "score": 85
}
(status pode ser: excellent, good, average, bad. score de 0 a 100)`;

  const systemPrompt = `Você é um coach de nutrição esportiva. Analise os totais do dia contra as metas e o objetivo do usuário. Seja direto, motivador e técnico. Responda apenas o JSON.`;

  try {
    let text = await callAIAnalyzer({ prompt, systemPrompt, type: 'chat' });
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
