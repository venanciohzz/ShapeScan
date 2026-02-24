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

    const prompt = `### PROMPT PARA A IA — ANÁLISE NUTRICIONAL AVANÇADA E ESTIMATIVA DE PESO REALISTA

Você é um nutricionista especialista em análise visual de refeições com foco em PRECISÃO CONSERVADORA.

Sua tarefa é analisar a imagem e identificar TODOS os alimentos visíveis, seguindo rigorosamente a lógica de estimativa abaixo:

🧠 LÓGICA DE ESTIMATIVA OBRIGATÓRIA E CÁLCULO DE MACROS:
1. CLASSIFICAR TAMANHO ANTES DO PESO:
   - Muito pequeno: 20–50g
   - Pequeno: 50–90g
   - Médio: 90–150g
   - Grande: 150–250g
   - Muito grande: 250g+

2. REFERÊNCIA VISUAL DE ESCALA:
   - Use o tamanho relativo do item comparado ao prato (padrão 24-28cm).
   - Espessura do corte e quantidade de pedaços.

3. REGRAS PARA PROTEÍNAS:
   - Frango grelhado pequeno/fino: 40–80g.
   - Coxa pequena: 50–100g.
   - Bife médio: 120-150g.

4. MÉTODOS DE PREPARO:
   - Classifique como "assado/grelhado" por padrão.
   - "Frito" apenas se houver brilho de óleo excessivo ou textura crocante/empanada.

5. CÁLCULO DE MACRONUTRIENTES E CALORIAS (OBRIGATÓRIO):
   - VOCÊ DEVE CALCULAR as calorias e macros (proteína, carboidrato, gordura) para CADA INGREDIENTE com base no peso estimado.
   - VOCÊ DEVE CALCULAR OS TOTAIS no nível principal do JSON somando os ingredientes.
   - NÃO COPIE OS ZEROS DO TEMPLATE. Substitua os zeros pelos valores numéricos calculados.

🎯 ESTRUTURA DA ANÁLISE POR ITEM:
Para cada ingrediente, você deve fornecer:
- Pesos e Macros preenchidos com precisão.
- Confiança: Baixa, Moderada ou Alta.
- Observação: Justificativa curta baseada na escala visual (ex: "Porção pequena comparada ao tamanho").

⚠️ AVISO OBRIGATÓRIO:
Ao final do "analysis_comment", você DEVE incluir: "Estimativa com margem de erro de ±20% devido à ausência de balança."

📊 RETORNO OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "dish_name": "Nome descritivo",
  "total_calories": 500,
  "total_protein_g": 35,
  "total_carbs_g": 45,
  "total_fat_g": 15,
  "nutrition_score": 8.5,
  "ingredients": [
    {
      "name": "Arroz Branco",
      "estimated_weight_g": 100,
      "calories": 130,
      "protein_g": 2.5,
      "carbs_g": 28,
      "fat_g": 0.2,
      "confidence": "Alta",
      "observation": "Porção média"
    }
  ],
  "analysis_comment": "Refeição balanceada. Estimativa com margem de erro de ±20% devido à ausência de balança."
}

❗ IMPORTANTE: Não retorne texto fora do JSON. Substitua os valores de exemplo pelos cálculos reais.`;

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
    const prompt = `### SCANNER DE FÍSICO: INTELIGÊNCIA DE BIOTIPO E ESTRATÉGIA

Você deve agir como: Treinador e Consultor especializado em Biologia e Estética.
Sua missão é realizar um DIAGNÓSTICO GENÉTICO ESTIMADO antes de sugerir qualquer plano.

🎯 ETAPA 1: DIAGNÓSTICO DE BIOTIPO (ESTRUTURA ÓSSEA)
Classifique com base exclusivamente na estrutura e proporção:
- ECTOMORFO: Estrutura fina, ombros estreitos, membros longos/finos, baixa densidade óssea.
- MESOMORFO: Ombros largos, estrutura atlética equilibrada, boa densidade muscular, cintura proporcional.
- ENDOMORFO: Estrutura larga, tendência a retenção, aparência compacta, cintura naturalmente espessa.
⚠️ Jamais classifique como Ecto se houver ombros largos. Jamais classifique como Endo se o físico for seco e cintura fina.

🎯 ETAPA 2: ESTIMATIVA DE BF% (CALIBRAGEM DE ELITE V15 - HARD LOCKS)
Analise com rigor de árbitro de fisiculturismo. Use BLOQUEIOS LÓGICOS:

1. HARD LOCK: FÍSICO DE ELITE ( < 10% BF)
Se houver os 3 sinais abaixo simultâneos, o BF é OBRIGATORIAMENTE entre 7% e 9%:
- Profundidade Abdominal: Gomos "recortados" com sombras profundas (não apenas visíveis).
- Serrátil/Intercostais: Totalmente aparentes e fundos.
- Pernas (HARD MARKER): Separação visível entre os músculos da coxa (vasto lateral e reto femoral). Se houver definição na perna, o BF NUNCA pode ser > 11%.

2. HARD LOCK: DEFINIÇÃO CLARA (10-12% BF)
- 6 gomos aparentes e profundos.
- Cintura fina e seca.
- Vascularização clara nos braços e ombros.
- BLOQUEIO: Se o abdômen for fundo e definido, é ERRO GRAVE estimar > 13%.

3. A VERDADE SOBRE OS 15% BF (CORREÇÃO DE VIÉS)
- 15% BF é um físico ATLETÍCO porém LISO.
- Abdômen é plano, gomos superiores aparecem embaçados sob luz forte.
- NÃO há serrátil profundo. NÃO há separação nas pernas.
- Se você vê serrátil e intercostais, VOCÊ NÃO PODE ESTIMAR 15%.

4. HARD LOCK: BF ELEVADO (20-25% BF)
- Ausência total de definição abdominal.
- Acúmulo leve mas visível nos flancos ("pneuzinhos").
- Peitoral começa a perder o formato quadrado e ganhar arredondamento por gordura.

5. HARD LOCK: OBESIDADE LEVE A MODERADA (26-34% BF)
- Cintura visivelmente mais larga que o tórax.
- Acúmulo significativo na região abdominal inferior e média.
- Gordura peitoral evidente (pseudo-ginecomastia por gordura).
- BLOQUEIO: Se a barriga estiver projetada para frente (protrusão abdominal) e cobrir o elástico da calça, o BF é OBRIGATORIAMENTE > 28%.

6. HARD LOCK: OBESIDADE ALTA (>35% BF)
- Protrusão abdominal acentuada e global.
- Presença de dobras cutâneas (folds) profundas.
- MARCADOR CRÍTICO: Se houver estrias (stretch marks) visíveis no abdômen ou flancos, o BF é OBRIGATORIAMENTE > 30%, frequentemente > 35%.
- Acúmulo denso de gordura nas costas, peitoral e pescoço.

⚠️ REGRAS DE OURO V16:
- Abdômen Recortado + Pernas Definidas = 7% a 9% BF.
- Abdômen Fundo + Serrátil total = 10% a 11% BF.
- Serrátil visível + Pele fina = BF < 12%.
- Protrusão Abdominal + Largura da Cintura > Ombros = BF > 30%.
- Estrias Abdominais + Dobras de Pele = BF > 35%.
- NUNCA subestime a secura de quem tem separação muscular profunda, mas TAMBÉM NUNCA subestime a gordura de quem tem protrusão abdominal e estrias.

🎯 ETAPA 3: COERÊNCIA DE NOTAS (QUALIDADE FÍSICA)
- Definição: Se BF < 12%, nota DEVE ser ≥ 8/10. Se BF > 30%, nota DEVE ser ≤ 3/10.
- Musculatura: Volume e densidade visível.
- Nível de Gordura (fat_score): ESCALA INVERTIDA (Menor = Mais Seco).
  - Se BF ≤ 10%: Nota DEVE ser entre 1.0 e 2.0.
  - Se BF 11-14%: Nota DEVE ser entre 2.5 e 4.5.
  - Se BF 15-19%: Nota DEVE ser entre 5.0 e 6.5.
  - Se BF 20-29%: Nota DEVE ser entre 7.0 e 8.0.
  - Se BF ≥ 30%: Nota DEVE ser entre 8.5 e 10.0.
⚠️ ERRO CRÍTICO: Não dê nota alta de gordura (ex: 7.0) para quem você estimou 10% de BF. Da mesma forma, não use fat_score baixo para BF alto.

🎯 ETAPA 4: MATEMÁTICA E COERÊNCIA (V21)
- Massa Magra = Peso * (1-BF_estimado/100).
- Retorne apenas os valores brutos. O sistema calcula os alvos automaticamente.

⚠️ REGRA ABSOLUTA SOBRE CORES E INDICADORES:
Você NÃO deve mencionar cores ou etiquetas de status no retorno.
- PROIBIDO usar as palavras: verde, amarelo, vermelho, status, indicador, alerta.
- Você apenas analisa e retorna números/texto técnico. A lógica de cores NÃO é sua responsabilidade.

${metricsInfo}

📊 RETORNO OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
  "structural_analysis": {
    "name": "",
    "meaning": "",
    "strength": "",
    "improvement": "",
    "genetic_responsiveness": "",
    "fat_storage_tendency": "",
    "structural_limitation_strategy": ""
  },
  "weight_metrics": {
    "bmi": 0,
    "lean_mass_kg": 0,
    "fat_mass_kg": 0,
    "current_weight": 0
  },
  "target_projections": [
    { "label": "", "bf": 0, "weight": 0 },
    { "label": "", "bf": 0, "weight": 0 },
    { "label": "", "bf": 0, "weight": 0 }
  ],
  "body_fat_range": "X-Y%",
  "bf_classification": "Categoria (ex: Atleta, Fitness, Sobrepeso, etc)",
  "bf_confidence": "Moderada",
  "bf_visual_justification": "",
  "shape_score": 0,
  "muscle_score": 0,
  "definition_score": 0,
  "fat_score": 0,
  "regional_analysis": {
    "trunk": { "strength": "", "improvement": "", "strategy": "" },
    "arms": { "strength": "", "improvement": "", "strategy": "" },
    "abs_waist": { "strength": "", "improvement": "", "strategy": "" },
    "legs": { "strength": "", "improvement": "", "strategy": "" }
  },
  "structural_potential": "",
  "future_projection": "",
  "bf_timeline": [
    {"day": 0, "bf": 0},
    {"day": 60, "bf": 0}
  ],
  "estimated_time_frame": "",
  "strategic_plan": [""],
  "diet_recommendation": "",
  "nutritional_protocol": {
    "caloric_strategy": "",
    "protein_target": "",
    "distribution": "",
    "practical_guidelines": [""]
  },
  "coach_insight": {
    "aesthetic_diagnosis": "",
    "main_leverage": "",
    "smart_strategy": ""
  },
  "coach_comment": "",
  "execution_strategy": {
    "training_focus": [""],
    "nutrition_focus": "",
    "time_expectation": "",
    "common_mistakes": ["", "", "", ""],
    "primary_focus_next_60_days": ""
  }
}

❗ IMPORTANTE: Não retorne texto fora do JSON. SEJA CONCISO em todas as descrições para garantir que o JSON não seja truncado.`;

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

export const chatWithCoach = async (message: string, history: any[], userContext: any) => {
  const limitedHistory = history.slice(-20);

  // Construir contexto do histórico
  let conversationContext = '';
  if (limitedHistory.length > 0) {
    conversationContext = '\n\nHistórico da conversa:\n' + limitedHistory.map(msg =>
      `${msg.role === 'user' ? 'Usuário' : 'Coach'}: ${msg.content}`
    ).join('\n');
  }

  const systemPrompt = `Você é o "Personal AI" do ShapeScan.

SUA PERSONALIDADE:
- Você é aquele amigo maromba gente boa, engraçado e motivador.
- Você usa gírias de academia (ex: "mete o shape", "frango", "monstro", "tá pago", "bora crescer") mas com moderação para não ficar forçado.
- Você é "papo reto". Direto ao ponto, sem enrolação técnica desnecessária, mas sabe muito do assunto.
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
