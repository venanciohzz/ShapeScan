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

    const prompt = `### PROMPT PARA A IA — ANÁLISE NUTRICIONAL AVANÇADA E IDENTIFICAÇÃO DE ALTA PRECISÃO

Você é um Nutricionista e Analista Visual de Alimentos especialista em gastronomia brasileira e tabelas TACO/IBGE.

Sua tarefa é analisar a imagem e identificar TODOS os alimentos com rigor técnico, seguindo as diretrizes abaixo:

🔍 1. IDENTIFICAÇÃO DE PROTEÍNAS (CRÍTICO):
Não seja genérico. Analise cor, textura e fibras para diferenciar:
- CARNE DE PORCO: Geralmente mais clara após cozida (rosado pálido ou branco acinzentado), fibras mais curtas. Ex: Lombo, pernil, bisteca.
- CARNE BOVINA: Fibras mais escuras e robustas. Identifique o ponto (mal passado, selado).
- FRANGO: Fibras brancas e longas. Diferencie peito (seco/fibrado) de sobrecoxa (mais suculenta/escura).
- DIFERENCIE PREPARO: Empanado (crosta de farinha), Frito (brilho de óleo), Grelhado (marcas de grelha/chapa), Cozido (ausência de brilho de fritura).

🧠 2. LÓGICA DE ESTIMATIVA DE PESO:
- Use Escala de Referência: Compare com o tamanho do prato, talheres ou grãos de arroz.
- Fragmentação: Se vir tiras/pedaços, conte a quantidade e estime o peso individual (ex: 3 tiras médias = ~120-150g).
- Densidade: Proteínas pesam mais que vegetais/folhas por volume.

3. REGRAS ANTI-VÍCIO:
- PARE de assumir que toda carne branca é frango. Verifique se não é peixe ou porco pela textura.
- PARE de ser "excessivamente conservador" a ponto de ignorar volume óbvio. Se a porção parece grande, dê o peso real.

🎯 ESTRUTURA DA ANÁLISE POR ITEM:
Para cada ingrediente: Pesos, Macros, Confiança e Justificativa (ex: "Fibra escura e densa característica de bife bovino").

📊 RETORNO OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "dish_name": "Nome descritivo",
  "total_calories": 0,
  "total_protein_g": 0,
  "total_carbs_g": 0,
  "total_fat_g": 0,
  "nutrition_score": 0,
  "ingredients": [
    {
      "name": "Nome",
      "estimated_weight_g": 0,
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "confidence": "Alta",
      "observation": "Justificativa visual"
    }
  ],
  "analysis_comment": "Feedback curto e elegante."
}

❗ IMPORTANTE: Não retorne texto fora do JSON. Calcule os totais somando os itens.`;

    const systemPrompt = `Você é um nutricionista brasileiro especialista em estimativa visual de alimentos. Retorne APENAS o JSON solicitado.`;

    const text = await callAIAnalyzer({ image: base64Image, prompt, systemPrompt, type: 'food' });
    const data = JSON.parse(extractJson(text));

    return {
      mealName: data.dish_name || data.mealName || "Refeição Digitalizada",
      score: safeParseFloat(data.nutrition_score || data.score) || 5,
      totalCalories: safeParseFloat(data.total_calories || data.totalCalories),
      totalProtein: safeParseFloat(data.total_protein_g || data.totalProtein),
      totalCarbs: safeParseFloat(data.total_carbs_g || data.totalCarbs),
      totalFat: safeParseFloat(data.total_fat_g || data.totalFat),
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
(Mantenha a estrutura JSON solicitada anteriormente: structural_analysis, weight_metrics, target_projections, etc.)

❗ IMPORTANTE: Seja técnico, direto e evite clichês. Não retorne texto fora do JSON.`;

    const text = await callAIAnalyzer({ image: base64Image, prompt, type: 'shape' });
    const data = JSON.parse(extractJson(text));

    return {
      ...data,
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
