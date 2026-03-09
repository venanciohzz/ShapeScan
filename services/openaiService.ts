/// <reference types="vite/client" />
import { FoodAnalysisResult, ShapeAnalysisResult } from '../types';
import { supabase } from './supabaseService';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyzer`;

const callAIAnalyzer = async (payload: { image?: string, prompt: string, systemPrompt?: string, type: 'food' | 'shape' | 'chat' }): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('ai-analyzer', {
    body: payload
  });

  if (error) {
    console.error('AI Service Error:', error);

    // Tenta acessar o corpo da resposta de erro (algumas versões do supabase guardam em 'context')
    const context = (error as any).context;
    if (context && context.error) {
      throw new Error(context.error);
    }

    // Se a mensagem for genérica de status code, tentamos manter a mensagem original para tratamento no frontend
    if (error.message && error.message.includes('Edge Function returned a non-2xx status code')) {
      console.warn('Edge Function returned non-2xx:', error);
      // Não lançamos erro genérico aqui para permitir que o FoodAnalyzer detecte 401/403
    }

    // Fallback final
    throw new Error(error.message || 'Erro desconhecido na análise de IA');
  }

  return data.text;
};

const extractJson = (text: string): string => {
  try {
    // Tenta encontrar JSON dentro de blocos de código markdown
    const markdownMatch = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      return markdownMatch[1].trim();
    }

    // Tenta encontrar o primeiro { e o último }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1);
    }

    // Se não encontrar nada estruturado, tenta limpar o texto
    return text.replace(/```json|```JSON|```/g, '').trim();
  } catch (e) {
    console.warn('Erro ao extrair JSON:', e);
    return text;
  }
};

const safeParseFloat = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  // Handle potential Brazilian comma separators (e.g. "150,5" -> "150.5") or units like "150 kcal"
  const strVal = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(strVal);
  return isNaN(parsed) ? 0 : parsed;
};

export const analyzePlate = async (base64Image: string, userDescription?: string): Promise<FoodAnalysisResult> => {
  try {
    const descriptionContext = userDescription ? `O usuário descreveu a refeição como: "${userDescription}". Use esta informação para auxiliar na identificação, mas priorize o que é visível na imagem.` : '';

    const prompt = `### PROMPT PARA A IA — ANÁLISE NUTRICIONAL DE EXTREMA PRECISÃO (Padrão Ouro)

Você é o Analista Visual de Alimentos mais preciso do mundo, especialista em Biometria de Porções e Tabelas TACO/IBGE.
Sua missão é eliminar o erro de "superestimativa" e fornecer gramas exatas.

🔍 1. CALIBRAGEM DE ESCALA (FUNDAMENTAL):
Use TODOS os objetos ao redor para definir o tamanho real:
- TECLADOS: Cada tecla de um teclado comum tem ~1.8cm a 1.9cm de largura. Use as teclas para medir os alimentos se visíveis.
- TALHERES: Um garfo padrão tem ~18-20cm de comprimento total, e a "cabeça" tem ~4.5cm de largura.
- PRATOS: Pratos de refeição no Brasil têm ~24-27cm de diâmetro. Pratos de sobremesa ~18-20cm.
- HANDS/FINGERS: Se visíveis, use como régua biométrica.

🧠 2. LÓGICA DE IDENTIFICAÇÃO E PESO (PROTEÍNAS):
- FRANGO GRELHADO:
    * Filés FINOS/PEQUENOS (estilo "sashimi" ou tiras): ~40g a 60g por unidade.
    * Filé MÉDIO (palma da mão sem dedos): ~100g a 120g.
    * Peito INTEIRO/GRANDE: ~180g a 240g.
- HARD LOCK: Se dois filés não cobrem metade de um prato padrão, eles JAMAIS pesam 200g. Seja conservador se não houver volume (altura/espessura).

🍚 3. CARBOIDRATOS (VOLUME):
- ARROZ: Uma colher de servir padrão (Ryzane) cheia tem ~80g a 100g. 
- Analise a profundidade. Se o arroz está espalhado em camada fina, ele pesa menos que um "montinho" denso.

⚠️ REGRAS ANTI-ERRO:
- PARE de dar valores redondos (ex: 200g para tudo). Alimentos reais têm pesos quebrados (85g, 110g, 165g).
- SEJA ANALÍTICO: "A fatia de frango tem a largura de 2 teclas (3.8cm) e comprimento de 4 teclas (7.6cm), espessura fina. Cálculo: ~45g".
- PRIORIZE A ESCALA EXTERNA (Teclado, Garfo) sobre a intuição.

📊 RETORNO OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "dish_name": "Nome",
  "total_calories": 350,
  "total_protein_g": 30,
  "total_carbs_g": 20,
  "total_fat_g": 10,
  "nutrition_score": 8,
  "ingredients": [
    {
      "name": "Nome",
      "estimated_weight_g": 100,
      "calories": 165,
      "protein_g": 31,
      "carbs_g": 0,
      "fat_g": 3.6,
      "confidence": "Alta",
      "observation": "Explique a métrica: 'Usando teclas do teclado como escala (1.8cm cada), o frango mede X cm...'"
    }
  ],
  "analysis_comment": "Explique brevemente como chegou à escala (Teclado/Talher/Prato)."
}

❗ IMPORTANTE: 
1. NÃO DEIXE VALORES ZERADOS. Calcule as calorias e macros com base no peso estimado usando a tabela TACO.
2. Não retorne texto fora do JSON.`;

    const systemPrompt = `Você é um nutricionista brasileiro especialista em estimativa visual de alimentos. Retorne APENAS o JSON solicitado.`;

    const text = await callAIAnalyzer({ image: base64Image, prompt, systemPrompt, type: 'food' });
    const data = JSON.parse(extractJson(text));

    const ingredients = data.ingredients || data.items || [];
    const calculatedCalories = ingredients.reduce((acc: number, i: any) => acc + safeParseFloat(i.calories), 0);
    const calculatedProtein = ingredients.reduce((acc: number, i: any) => acc + safeParseFloat(i.protein_g || i.protein), 0);
    const calculatedCarbs = ingredients.reduce((acc: number, i: any) => acc + safeParseFloat(i.carbs_g || i.carbs), 0);
    const calculatedFat = ingredients.reduce((acc: number, i: any) => acc + safeParseFloat(i.fat_g || i.fat), 0);

    return {
      mealName: data.dish_name || data.mealName || "Refeição Digitalizada",
      score: safeParseFloat(data.nutrition_score || data.score) || 5,
      totalCalories: safeParseFloat(data.total_calories || data.totalCalories) || calculatedCalories,
      totalProtein: safeParseFloat(data.total_protein_g || data.totalProtein) || calculatedProtein,
      totalCarbs: safeParseFloat(data.total_carbs_g || data.totalCarbs) || calculatedCarbs,
      totalFat: safeParseFloat(data.total_fat_g || data.totalFat) || calculatedFat,
      totalWeight: safeParseFloat(data.ingredients?.reduce((acc: number, i: any) => acc + (i.estimated_weight_g || 0), 0) || data.totalWeight || 0),
      reasoning: data.analysis_comment || data.reasoning || "Análise concluída.",
      items: (data.ingredients || data.items || []).map((item: any) => ({
        name: item.name,
        weight: safeParseFloat(item.estimated_weight_g || item.weight),
        calories: safeParseFloat(item.calories),
        protein: safeParseFloat(item.protein_g || item.protein),
        carbs: safeParseFloat(item.carbs_g || item.carbs),
        fat: safeParseFloat(item.fat_g || item.fat),
        confidence: item.confidence,
        observation: item.observation
      }))
    };
  } catch (error) {
    console.error("Error analyzing plate:", error);
    return { mealName: "Erro na análise", items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalWeight: 0, score: 0, reasoning: "Não foi possível analisar a imagem. Tente uma foto mais clara." };
  }
};

export const getManualFoodMacros = async (foodDescription: string): Promise<FoodAnalysisResult> => {
  try {
    const prompt = `Analise a refeição: "${foodDescription}". Identifique itens, pesos, calorias e macros exatos seguindo o formato JSON da ANÁLISE NUTRICIONAL AVANÇADA.

📊 RETORNO OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "dish_name": "Nome descritivo",
  "total_calories": 350,
  "total_protein_g": 30,
  "total_carbs_g": 20,
  "total_fat_g": 10,
  "nutrition_score": 8,
  "ingredients": [
    {
      "name": "Frango Grelhado",
      "estimated_weight_g": 100,
      "calories": 165,
      "protein_g": 31,
      "carbs_g": 0,
      "fat_g": 3.6
    }
  ],
  "analysis_comment": "Análise concluída."
}

❗ IMPORTANTE:
1. SEJA CONCISO para evitar truncamento.
2. SUBSTITUA OS VALORES DE EXEMPLO (como 350, 30, etc.) pelos CÁLCULOS REAIS exatos da refeição solicitada. NÃO DEIXE ZEROS.`;

    const systemPrompt = `Você é um Nutricionista Esportivo Brasileiro especialista em tabelas nutricionais e suplementação (Whey, Creatina, etc).

DIRETRIZES CRÍTICAS:
1. MARCAS ESPECÍFICAS: Se o usuário citar uma marca (ex: Max Titanium, Growth, Integralmedica, Nestlé), USE OS DADOS EXATOS DO RÓTULO dessa marca. Não use médias genéricas.
2. PORÇÕES IMPLÍCITAS: Se a quantidade for vaga (ex: "1 scoop", "1 dose", "1 colher"), use o padrão do fabricante ou o padrão brasileiro (ex: 1 scoop whey = ~30g a 40g dependendo da marca).
3. ARROZ/FEIJÃO: Considere sempre o peso do alimento COZIDO, a menos que especificado "cru".
4. SEJA HONESTO: Se for um alimento calórico, não subestime.

Retorne sempre JSON válido.`;

    const text = await callAIAnalyzer({ prompt, systemPrompt, type: 'food' });
    const data = JSON.parse(extractJson(text));

    return {
      mealName: data.dish_name || data.mealName || foodDescription,
      score: safeParseFloat(data.nutrition_score || data.score) || 5,
      totalCalories: safeParseFloat(data.total_calories || data.totalCalories),
      totalProtein: safeParseFloat(data.total_protein_g || data.totalProtein),
      totalCarbs: safeParseFloat(data.total_carbs_g || data.totalCarbs),
      totalFat: safeParseFloat(data.total_fat_g || data.totalFat),
      totalWeight: safeParseFloat(data.ingredients?.reduce((acc: number, i: any) => acc + (i.estimated_weight_g || 0), 0) || data.totalWeight || 0),
      reasoning: data.analysis_comment || data.reasoning || "Cálculo concluído.",
      items: (data.ingredients || data.items || []).map((item: any) => ({
        name: item.name,
        weight: safeParseFloat(item.estimated_weight_g || item.weight),
        calories: safeParseFloat(item.calories),
        protein: safeParseFloat(item.protein_g || item.protein),
        carbs: safeParseFloat(item.carbs_g || item.carbs),
        fat: safeParseFloat(item.fat_g || item.fat)
      }))
    };
  } catch (error) {
    console.error("Error calculating macros:", error);
    return { mealName: "Erro ao calcular", items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalWeight: 0, score: 0, reasoning: "Erro ao calcular." };
  }
};

export const analyzeShape = async (base64Image: string, metrics?: { weight?: number, height?: number, goal?: string }): Promise<ShapeAnalysisResult> => {
  const metricsInfo = metrics?.weight || metrics?.height || metrics?.goal
    ? `Considere também estes dados: Peso ${metrics.weight || 'N/A'}kg, Altura ${metrics.height || 'N/A'}cm, Objetivo: ${metrics.goal || 'N/A'}.`
    : '';

  try {
    const prompt = `### SCANNER DE FÍSICO: BIOMETRIA VISUAL E ANÁLISE DE PROPORÇÃO

Você é um especialista em Antropometria Visual e Treinamento de Elite.
Sua missão é extrair dados técnicos da imagem, ignorando sombras de iluminação e focando em marcadores anatômicos reais.

🎯 1. BIOTIPO E ESTRUTURA:
- Identifique a base óssea (clavículas, bacia, punhos) para diferenciar Ecto, Meso ou Endomorfo.
- Diferencie volume muscular real de retenção hídrica ou gordura subcutânea.

🔍 2. MARCADORES DE BF% (PERCENTUAL DE GORDURA):
Seja cirúrgico nos marcadores:
- < 10%: Separação muscular profunda, vascularização no tronco, serrátil fibrado.
- 11-14%: Abdômen visível (gomos centrais definidos), sem acúmulo nos flancos (cintura limpa).
- 15-18%: Silhueta atlética mas "lisa", abdômen com pouco relevo, flancos iniciando leve dobra.
- 19-24%: Perda de contorno muscular no peitoral, flancos proeminentes (pneuzinhos), barriga relaxada.
- > 25%: Cintura maior que a linha dos ombros, acúmulo acentuado.

⚠️ REGRAS DE OURO (NÃO NEGOCIÁVEIS):
- ILUMINAÇÃO: Se a foto estiver escura, não assuma BF alto. Olhe o contorno da silhueta (V-Taper).
- HARD LOCK: Se houver qualquer sinal de gomos abdominais -> BF MÁXIMO de 15%.
- HARD LOCK: Se houver separação clara no quadríceps -> BF MÁXIMO de 12%.

📊 RETORNO OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "structural_analysis": {
    "name": "Ectomorfo/Mesomorfo/Endomorfo",
    "meaning": "Breve explicação",
    "strength": "Vantagem genética",
    "improvement": "Ponto fraco",
    "genetic_responsiveness": "Alta/Média/Baixa",
    "fat_storage_tendency": "Regiões de acúmulo",
    "structural_limitation_strategy": "Dica técnica"
  },
  "body_fat_range": "12-14%",
  "bf_classification": "Atlético",
  "bf_confidence": "Alta",
  "bf_visual_justification": "Justificativa visual real",
  "shape_score": 8.5,
  "muscle_score": 7.0,
  "definition_score": 7.5,
  "fat_score": 4.0,
  "regional_analysis": {
    "trunk": { "strength": "...", "improvement": "...", "strategy": "..." },
    "arms": { "strength": "...", "improvement": "...", "strategy": "..." },
    "abs_waist": { "strength": "...", "improvement": "...", "strategy": "..." },
    "legs": { "strength": "...", "improvement": "...", "strategy": "..." }
  },
  "execution_strategy": {
    "training_focus": ["...", "..."],
    "nutrition_focus": "...",
    "time_expectation": "8 semanas",
    "common_mistakes": ["...", "...", "...", "..."],
    "primary_focus_next_60_days": "..."
  },
  "nutritional_protocol": {
    "caloric_strategy": "Bulk/Cut/Recomp",
    "protein_target": "2.2g/kg",
    "distribution": "4 refeições",
    "practical_guidelines": ["...", "..."]
  },
  "personal_ia_insight": {
    "aesthetic_diagnosis": "Frase de efeito"
  },
  "personal_ia_comment": "Resumo final motivador"
}

❗ IMPORTANTE: Não retorne texto fora do JSON. Preencha TODOS os campos acima.`;

    const text = await callAIAnalyzer({ image: base64Image, prompt, type: 'shape' });
    const data = JSON.parse(extractJson(text));

    // Mapeamento de segurança para garantir que campos vitais existam
    return {
      ...data,
      body_fat_range: data.body_fat_range || data.bf_range || "15-20%",
      shape_score: safeParseFloat(data.shape_score || data.shapeScore),
      muscle_score: safeParseFloat(data.muscle_score || data.muscleScore),
      definition_score: safeParseFloat(data.definition_score || data.definitionScore),
      fat_score: safeParseFloat(data.fat_score || data.fatScore)
    };
  } catch (error) {
    console.error("Error analyzing shape:", error);
    throw error;
  }
};

export const chatWithPersonalIA = async (message: string, history: any[], userContext: any) => {
  const limitedHistory = history.slice(-20);

  // Construir contexto do histórico
  let conversationContext = '';
  if (limitedHistory.length > 0) {
    conversationContext = '\n\nHistórico da conversa:\n' + limitedHistory.map(msg =>
      `${msg.role === 'user' ? 'Usuário' : 'Personal IA'}: ${msg.content}`
    ).join('\n');
  }

  const systemPrompt = `Você é a "Personal IA" do ShapeScan.
 
 SUA PERSONALIDADE:
 - Você é aquela amiga maromba gente boa, engraçada e motivadora.
 - Você usa gírias de academia (ex: "mete o shape", "frango", "monstro", "tá pago", "bora crescer") mas com moderação para não ficar forçado.
 - Você é "papo reto". Direta ao ponto, sem enrolação técnica desnecessária, mas sabe muito do assunto.
- Você tem senso de humor. Se o cara comer besteira, dê uma zoada leve antes de ajudar a corrigir.

REGRAS RÍGIDAS DE FORMATAÇÃO (IMPORTANTE):
1. **PROIBIDO USAR ASTERISCOS (**) OU UNDERSCORES (__) PARA NEGRITO/ITÁLICO.** O chat do usuário não renderiza Markdown. Escreva apenas texto puro.
2. Se quiser enfatizar algo, USE CAIXA ALTA ou EMOJIS.
3. Use MUITOS emojis para dar vida à conversa. 🔥💪🚀🥗🍗
4. Respostas curtas, no estilo de mensagem de WhatsApp. Evite textões.
5. JAMAIS use formatação de código ou listas com hifens se puder evitar. Mantenha o texto fluido.

CONTEXTO DO USUÁRIO:
- Dados: ${JSON.stringify(userContext.user)}.
- Refeições Recentes: ${JSON.stringify(userContext.logsSummary)}.
- Análise do Shape (Se tiver): ${userContext.lastEvolution ? JSON.stringify(userContext.lastEvolution.detailedAnalysis + " " + userContext.lastEvolution.pointsToImprove) : 'Nenhuma análise recente'}.

AÇÃO:
- Se pedirem dieta: Calcule macros (2g/kg Prot, 0.8g/kg Gordura, resto Carbo) e sugira alimentos limpos.
- Se pedirem treino: Use os "pontos fracos" da análise do shape para sugerir exercícios focados.
- Se o usuário estiver desanimado: Dê um choque de realidade motivacional com humor.
${conversationContext}`;

  const prompt = message;

  try {
    const text = await callAIAnalyzer({ prompt, systemPrompt, type: 'chat' });
    return text;
  } catch (error: any) {
    console.error("Error in chat:", error);
    return `Erro detalhado: ${error.message || JSON.stringify(error)}`;
  }
};
