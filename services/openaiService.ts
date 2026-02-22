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
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

export const analyzePlate = async (base64Image: string, userDescription?: string): Promise<FoodAnalysisResult> => {
  try {
    const descriptionContext = userDescription ? `O usuário descreveu a refeição como: "${userDescription}". Use esta informação para auxiliar na identificação, mas priorize o que é visível na imagem.` : '';

    const prompt = `### PROMPT PARA A IA — ANÁLISE NUTRICIONAL AVANÇADA E ESTIMATIVA DE PESO REALISTA

Você é um nutricionista especialista em análise visual de refeições com foco em PRECISÃO CONSERVADORA.

Sua tarefa é analisar a imagem e identificar TODOS os alimentos visíveis, seguindo rigorosamente a lógica de estimativa abaixo:

🧠 LÓGICA DE ESTIMATIVA OBRIGATÓRIA:
1. CLASSIFICAR TAMANHO ANTES DO PESO:
   - Muito pequeno: 20–50g
   - Pequeno: 50–90g
   - Médio: 90–150g
   - Grande: 150–250g
   - Muito grande: 250g+
   *Nunca assuma peso médio (150g) para porções visivelmente pequenas.*

2. REFERÊNCIA VISUAL DE ESCALA:
   - Use o tamanho relativo do item comparado ao prato (padrão 24-28cm) e outros itens (ex: arroz/feijão).
   - Observe a espessura do corte e quantidade de pedaços.
   - Se houver pedaços picados, estime 15-25g por unidade.

3. REGRAS PARA PROTEÍNAS:
   - Frango grelhado pequeno/fino: 40–80g.
   - Coxa pequena: 50–100g.
   - Bife médio: 120-150g.
   - Se a proteína ocupar menos espaço visual que o carboidrato, ela NÃO pode pesar mais que ele.

4. MÉTODOS DE PREPARO:
   - Classifique como "assado/grelhado" por padrão.
   - Só classifique como "frito" se houver brilho de óleo excessivo ou textura crocante/empanada clara.
   - Em caso de dúvida, cite: "preparo não confirmado (estimado como grelhado)".

5. RACIOCÍNIO PROPORCIONAL:
   - Mantenha coerência interna. Se o arroz ocupa 50% do prato e a carne 20%, o peso da carne deve refletir essa proporção volumétrica.

🎯 ESTRUTURA DA ANÁLISE POR ITEM:
Para cada ingrediente, você deve fornecer:
- Confiança: Baixa, Moderada ou Alta.
- Observação: Justificativa curta baseada na escala visual (ex: "Porção pequena comparada ao tamanho do prato").

⚠️ AVISO OBRIGATÓRIO:
Ao final do "analysis_comment", você DEVE incluir: "Estimativa com margem de erro de ±20% devido à ausência de balança."

📊 RETORNO OBRIGATÓRIO EM JSON:
{
  "dish_name": "string",
  "total_calories": number,
  "total_protein_g": number,
  "total_carbs_g": number,
  "total_fat_g": number,
  "nutrition_score": number,
  "ingredients": [
    {
      "name": "string",
      "estimated_weight_g": number,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "confidence": "Baixa | Moderada | Alta",
      "observation": "string (ex explicativo)"
    }
  ],
  "analysis_comment": "string (incluindo o aviso de margem de erro)"
}`;

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

Retorne APENAS um JSON válido no seguinte formato:
{
  "dish_name": "string",
  "total_calories": number,
  "total_protein_g": number,
  "total_carbs_g": number,
  "total_fat_g": number,
  "nutrition_score": number,
  "ingredients": [
    {
      "name": "string",
      "estimated_weight_g": number,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number
    }
  ],
  "analysis_comment": "string"
}`;

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

🎯 ETAPA 2: ESTIMATIVA DE BF% (PROTOCOLO DE PRECISÃO V14)
Estime com rigor técnico baseado em marcadores anatômicos específicos:

1. ZONAS DE VASCULARIZAÇÃO (Marcador Primário):
- Braços: Visível em ≤ 15% BF.
- Ombros/Peito: Visível em ≤ 12% BF.
- Abdômen Inferior/Pernas: Visível em ≤ 10% BF.

2. GRADIENTE DE DEFINIÇÃO ABDOMINAL:
- 6-9% (Secura Extrema): Pele "colada" ao músculo. Vascularização no abdômen inferior. Intercostais e serrátil extremamente profundos. Linhas profundas no oblíquo.
- 10-12% (Atlético Seco): 6 gomos com profundidade clara. Serrátil visível. Vascularização em braços e ombros. Leve camada apenas abaixo do umbigo.
- 13-15% (Definido): 2 a 4 gomos superiores visíveis. Contorno lateral do abdômen aparente. Serrátil visível sob luz favorável.
- 16-19% (Atlético): Contornos abdominais visíveis, mas gomos "embaçados" ou sem separação clara.
- 20-25% (Moderado): Abdômen plano ou com leve protuberância. Nenhuma separação muscular visível no tronco.

⚠️ REGRAS DE BLOQUEIO:
- Se houver vascularização no abdômen ou pernas, o BF é OBRIGATORIAMENTE < 10%.
- Se todos os gomos (6-pack) estiverem fundos e recortados, o BF é OBRIGATORIAMENTE < 12%.
- Jamais estime >15% para físicos com serrátil e intercostais fundos.

🎯 ETAPA 3: COERÊNCIA DE NOTAS (QUALIDADE FÍSICA)
- Definição: Visibilidade muscular. Se BF < 12%, nota DEVE ser ≥ 8/10. Se físico extremamente seco, nota 9 ou 10.
- Musculatura: Volume e densidade visível. Não reduza nota se houver boa separação e preenchimento.
- Proporção: Relação ombro/cintura e simetria geral.

🎯 ETAPA 4: MATEMÁTICA E COERÊNCIA ESTRATÉGICA (V10)
- Fórmulas: Massa Magra = Peso * (1-BF%); Peso Alvo = Massa Magra / (1-BF_alvo%).
- Projeção 60 dias: Max 1-2% queda BF para físicos já definidos. Perda saudável 0.5-1% peso/semana.

⚠️ REGRA ABSOLUTA SOBRE CORES E INDICADORES:
Você NÃO deve mencionar cores ou etiquetas de status no retorno.
- PROIBIDO usar as palavras: verde, amarelo, vermelho, status, indicador, alerta.
- Você apenas analisa e retorna números/texto técnico. A lógica de cores NÃO é sua responsabilidade.

${metricsInfo}

📊 RETORNO OBRIGATÓRIO EM JSON:
{
  "structural_analysis": {
    "name": "string",
    "meaning": "string",
    "strength": "string",
    "improvement": "string",
    "genetic_responsiveness": "string",
    "fat_storage_tendency": "string",
    "structural_limitation_strategy": "string"
  },
  "weight_metrics": {
    "bmi": number,
    "lean_mass_kg": number,
    "fat_mass_kg": number,
    "current_weight": number
  },
  "target_projections": {
    "weight_at_15_bf": number,
    "weight_at_12_bf": number,
    "weight_at_10_bf": number
  },
  "body_fat_range": "string",
  "bf_classification": "string",
  "bf_confidence": "Baixa | Moderada | Alta",
  "bf_visual_justification": "string (ex: definição abdominal completa de 6 gomos e vascularização no ombro)",
  "shape_score": number,
  "muscle_score": number,
  "definition_score": number,
  "fat_score": number,
  "regional_analysis": {
    "trunk": { "strength": "string", "improvement": "string", "strategy": "string" },
    "arms": { "strength": "string", "improvement": "string", "strategy": "string" },
    "abs_waist": { "strength": "string", "improvement": "string", "strategy": "string" },
    "legs": { "strength": "string", "improvement": "string", "strategy": "string" }
  },
  "structural_potential": "string",
  "future_projection": "string",
  "bf_timeline": [
    {"day": 0, "bf": number},
    {"day": 60, "bf": number}
  ],
  "estimated_time_frame": "string",
  "strategic_plan": ["string"],
  "diet_recommendation": "string",
  "nutritional_protocol": {
    "caloric_strategy": "string",
    "protein_target": "string",
    "distribution": "string",
    "practical_guidelines": ["string"]
  },
  "coach_insight": {
    "aesthetic_diagnosis": "string",
    "main_leverage": "string",
    "smart_strategy": "string"
  },
  "coach_comment": "string (sumário executivo)",
  "execution_strategy": {
    "training_focus": ["string"],
    "nutrition_focus": "string",
    "time_expectation": "string",
    "common_mistakes": ["string (mínimo 4)", "string", "string", "string"],
    "primary_focus_next_60_days": "string"
  }
}

❗ IMPORTANTE: Não retorne texto fora do JSON.`;

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
