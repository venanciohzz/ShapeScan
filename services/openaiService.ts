/// <reference types="vite/client" />
import { FoodAnalysisResult, ShapeAnalysisResult } from '../types';
import { supabase } from './supabaseService';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyzer`;

const callAIAnalyzer = async (payload: { image?: string, prompt: string, systemPrompt?: string, type: 'food' | 'shape' | 'chat' }): Promise<string> => {
  // 1. Verificar se existe sessão ativa
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.warn('Tentativa de chamada de IA sem sessão ativa.');
    throw new Error('401: Sessão expirada ou não encontrada. Por favor, saia e entre novamente.');
  }

  // 2. Invocar função com cabeçalhos explícitos para garantir que o token seja enviado
  const { data, error } = await supabase.functions.invoke('ai-analyzer', {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) {
    console.error('AI Service Error:', error);

    // Se a função retornar um erro JSON estruturado
    if (typeof error === 'object' && error !== null) {
       const msg = (error as any).message || '';
       
       if (msg.includes('401') || msg.includes('Unauthorized')) {
         throw new Error('401: Sessão expirada.');
       }
       if (msg.includes('403') || msg.includes('limit_reached')) {
         throw new Error('403: Limite atingido.');
       }
    }

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

    const prompt = `### PROMPT DE AUDITORIA BIOMÉTRICA — PRECISÃO ABSOLUTA

Você é um Auditor Visual de Macronutrientes. Sua missão é decompor a imagem em unidades básicas para evitar o erro de "pesos genéricos" ou "repetição de padrões".

🔍 1. PROTOCOLO DE CONTAGEM (OBRIGATÓRIO):
Antes de estimar o peso, você DEVE contar:
- "Quantos pedaços individuais de proteína existem?" (Ex: 2 filés, 3 pedaços, 5 tiras).
- Se houver 3 pedaços em vez de 2, o peso DEVE ser proporcionalmente maior se o tamanho for similar.

🧠 2. MÉTRICA DE UNIDADE (PROTEÍNAS):
Analise cada pedaço usando a escala (Teclado/Prato):
- FILÉ FINO (espessura < 1cm): ~40g a 45g por unidade.
- FILÉ MÉDIO (1cm a 2cm): ~70g a 85g por unidade.
- FILÉ GROSSO (> 2cm): ~120g+ por unidade.
- REGRA DE OURO: Somatório = Número de unidades × Peso por unidade baseado na espessura.
- EXTREMO CUIDADO: O usuário reportou que você deu o mesmo peso para 2 e 3 filés. Isso é um ERRO GRAVE. Diferencie as quantidades!

🍚 3. CARBOIDRATOS (VOLUME GEOMÉTRICO):
- Se o arroz cobre o fundo do prato mas você vê relevo de grãos individuais (camada rasa), o volume é baixo (~120g a 160g).
- Só chegue a 300g de arroz se houver uma "montanha" que oculte o centro do prato.

⚠️ SISTEMA DE CHECAGEM ANALÍTICA:
- Compare: Prato A (2 filés finos) = ~85g. Prato B (3 filés finos similares) = ~125g.
- Use a escala do teclado (cada tecla ~1.8cm) para justificar o tamanho de CADA pedaço.

📊 RETORNO OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "dish_name": "Nome",
  "total_calories": [SOMA_DOS_ITENS],
  "total_protein_g": [SOMA_DOS_ITENS],
  "total_carbs_g": [SOMA_DOS_ITENS],
  "total_fat_g": [SOMA_DOS_ITENS],
  "nutrition_score": [1-10],
  "ingredients": [
    {
      "name": "Nome",
      "estimated_weight_g": [VALOR_CALCULADO],
      "calories": [VALOR],
      "protein_g": [VALOR],
      "carbs_g": [VALOR],
      "fat_g": [VALOR],
      "confidence": "Alta",
      "observation": "AUDITORIA: 'Detectados X pedaços. Cada pedaço mede aprox. Y cm (Z teclas). Espessura fina. Cálculo: X * Wg = Total.'"
    }
  ],
  "analysis_comment": "Resumo técnico da contagem e escala utilizada."
}

❗ IMPORTANTE:
1. SEJA EXTREMAMENTE ESPECÍFICO NA CONTAGEM.
2. Não use pesos redondos se a biometria indicar valores quebrados.
3. Não retorne texto fora do JSON.`;

    const systemPrompt = `Você é um robô de biometria nutricional de alta precisão. Sua função é auditar a imagem, contar itens e calcular o peso matemático baseado em escala real. Não aceite aproximações preguiçosas.`;

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
  } catch (error: any) {
    console.error("Error analyzing plate:", error);
    const msg = error.message || "";
    let reasoning = "Não foi possível analisar a imagem. Tente uma foto mais clara.";
    
    if (msg.includes('401')) reasoning = "Sessão expirada. Por favor, saia da conta e entre novamente para renovar seu acesso.";
    if (msg.includes('403')) reasoning = "Limite de análise diária atingido para o seu plano.";

    return { 
      mealName: "Erro na análise", 
      items: [], 
      totalCalories: 0, 
      totalProtein: 0, 
      totalCarbs: 0, 
      totalFat: 0, 
      totalWeight: 0, 
      score: 0, 
      reasoning 
    };
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
