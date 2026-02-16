import { FoodAnalysisResult, ShapeAnalysisResult } from '../types';
import { supabase } from './supabaseService';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyzer`;

const callAIAnalyzer = async (payload: { image?: string, prompt: string, systemPrompt?: string, type: 'food' | 'shape' | 'chat' }): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('ai-analyzer', {
        body: payload
    });

    if (error) {
        throw new Error(error.message || 'Erro na análise de IA');
    }

    return data.text;
};

const extractJson = (text: string): string => {
    try {
        const markdownMatch = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[1]) return markdownMatch[1];

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
    if (typeof val === 'number') return val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

export const analyzePlate = async (base64Image: string): Promise<FoodAnalysisResult> => {
    try {
        const prompt = `Analise esta foto de comida de forma DETALHADA e PRECISA.

INSTRUÇÕES:
1. Identifique CADA item visível no prato
2. Estime o peso em gramas de cada item (seja realista com porções brasileiras)
3. Calcule calorias e macros de cada item
4. No campo "reasoning", escreva uma análise visual detalhada explicando:
   - Como você identificou cada item
   - Como estimou as porções (ex: "3 colheres de sopa", "tamanho de um baralho")
   - Método de preparo observado (grelhado, frito, cozido)
   - Qualquer detalhe relevante sobre a refeição

IMPORTANTE: Seja um nutricionista observador e detalhista. Use emojis 🍗🍚🥗 para dar vida à análise!

Retorne APENAS um JSON válido no seguinte formato:
{
  "items": [{"name": "string", "weight": number, "calories": number}],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalWeight": number,
  "reasoning": "string (análise visual detalhada com emojis)"
}`;

        const systemPrompt = `Você é um nutricionista brasileiro especialista em estimativa visual de alimentos. 

PERSONALIDADE:
- Seja detalhista e observador
- Use linguagem clara e acessível
- Adicione emojis para tornar a análise mais amigável 🍽️👨‍🍳
- Explique seu raciocínio de forma didática

PRECISÃO:
- Porções brasileiras típicas (ex: 1 concha, 1 escumadeira, 1 colher de sopa)
- Considere o método de preparo visível
- Seja honesto: se não tiver certeza, mencione
- Arroz/feijão sempre COZIDO (não cru)

Retorne sempre JSON válido.`;

        const text = await callAIAnalyzer({ image: base64Image, prompt, systemPrompt, type: 'food' });
        const data = JSON.parse(extractJson(text));

        return {
            ...data,
            totalCalories: safeParseFloat(data.totalCalories),
            totalProtein: safeParseFloat(data.totalProtein),
            totalCarbs: safeParseFloat(data.totalCarbs),
            totalFat: safeParseFloat(data.totalFat),
            totalWeight: safeParseFloat(data.totalWeight),
            items: (data.items || []).map((item: any) => ({
                ...item,
                weight: safeParseFloat(item.weight),
                calories: safeParseFloat(item.calories)
            }))
        };
    } catch (error) {
        console.error("Error analyzing plate:", error);
        return { items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalWeight: 0, reasoning: "Não foi possível analisar a imagem. Tente uma foto mais clara." };
    }
};

export const getManualFoodMacros = async (foodDescription: string): Promise<FoodAnalysisResult> => {
    try {
        const prompt = `Analise a refeição: "${foodDescription}". Identifique itens, pesos e calorias exatas.

Retorne APENAS um JSON válido no seguinte formato:
{
  "items": [{"name": "string", "weight": number, "calories": number}],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalWeight": number,
  "reasoning": "string"
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
            ...data,
            totalCalories: safeParseFloat(data.totalCalories),
            totalProtein: safeParseFloat(data.totalProtein),
            totalCarbs: safeParseFloat(data.totalCarbs),
            totalFat: safeParseFloat(data.totalFat),
            totalWeight: safeParseFloat(data.totalWeight),
            items: (data.items || []).map((item: any) => ({
                ...item,
                weight: safeParseFloat(item.weight),
                calories: safeParseFloat(item.calories)
            }))
        };
    } catch (error) {
        console.error("Error calculating macros:", error);
        return { items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalWeight: 0, reasoning: "Erro ao calcular." };
    }
};

export const analyzeShape = async (base64Image: string, metrics?: { weight?: number, height?: number }): Promise<ShapeAnalysisResult> => {
    const metricsInfo = metrics?.weight || metrics?.height
        ? `Considere também estes dados: Peso ${metrics.weight || 'N/A'}kg, Altura ${metrics.height || 'N/A'}m.`
        : '';

    try {
        const prompt = `Analise este físico de forma TÉCNICA, DETALHADA e HONESTA como um preparador físico profissional. ${metricsInfo}

ANÁLISE COMPLETA:

1. **BF% (Percentual de Gordura)**
   - Estime o BF% com precisão (ex: "8-10%")
   - Se peso fornecido, calcule massa gorda em kg (ex: "~6.1 kg - 7.7 kg de gordura")

2. **Biotipo**
   - Classifique: Ectomorfo, Mesomorfo, Endomorfo ou misto

3. **NOTAS 0-10** (seja criterioso e honesto):
   - **GORDURA**: 0 = Shredded/Seco, 10 = Obesidade. Quanto MENOR o BF, MENOR a nota.
   - **MUSCULATURA**: 0 = Sem massa muscular, 10 = Fisiculturista Pro
   - **DEFINIÇÃO**: 0 = Retido/Inchado, 10 = Fibras aparentes

4. **Contextos das Notas** (explique cada nota):
   - fatContext: Por que deu essa nota de gordura?
   - muscleContext: Por que deu essa nota de musculatura?
   - definitionContext: Por que deu essa nota de definição?

5. **Análise Detalhada** (seja MUITO detalhado):
   - Descreva o físico como um todo
   - Fale sobre V-taper, simetria, proporções
   - Mencione densidade muscular, maturidade dos feixes
   - Comente sobre vascularização, separação muscular
   - Use termos técnicos mas acessíveis

6. **Pontos a Melhorar** (seja DIRETO e HONESTO):
   - Liste defeitos e pontos fracos SEM MEDO
   - Seja específico: "Peitoral superior fraco", "Acúmulo de gordura nos flancos"
   - Indique onde focar o treino

7. **Sugestão de Macros** (baseada no objetivo aparente):
   - Calcule proteína, carbo e gordura em g/kg
   - Explique o objetivo (cutting, bulking, manutenção)
   - Seja específico com os números

8. **Papo do Coach** (seja MOTIVADOR e HUMANIZADO):
   - Use emojis 💪🔥
   - Seja aquele coach gente boa mas sincero
   - Dê um conselho prático e motivacional
   - Use gírias de academia com moderação

9. **Proporções** (avalie cada grupo muscular):
   - Braços: desenvolvimento, separação, simetria
   - Peitoral (chest): volume, separação, desenvolvimento superior/inferior
   - Abdômen (abs): definição, simetria, cortes
   - Pernas (legs): volume, separação, definição

Retorne APENAS um JSON válido no seguinte formato:
{
  "bfPercentage": "8-10% (~6.1 kg - 7.7 kg de gordura)",
  "biotype": "string",
  "fatDistribution": "string",
  "muscleMass": "string",
  "definition": "string",
  "fatMassWeight": "string",
  "detailedAnalysis": "string (MUITO detalhado, técnico, com emojis)",
  "pointsToImprove": "string (direto e honesto)",
  "macroSuggestions": "string (específico com números)",
  "coachAdvice": "string (motivador com emojis 💪🔥)",
  "fatScore": number,
  "muscleScore": number,
  "definitionScore": number,
  "fatContext": "string (explicação da nota)",
  "muscleContext": "string (explicação da nota)",
  "definitionContext": "string (explicação da nota)",
  "proportions": {
    "arms": "string (avaliação detalhada)",
    "chest": "string (avaliação detalhada)",
    "abs": "string (avaliação detalhada)",
    "legs": "string (avaliação detalhada)"
  }
}`;

        const text = await callAIAnalyzer({ image: base64Image, prompt, type: 'shape' });
        const data = JSON.parse(extractJson(text));

        return {
            ...data,
            fatScore: safeParseFloat(data.fatScore),
            muscleScore: safeParseFloat(data.muscleScore),
            definitionScore: safeParseFloat(data.definitionScore)
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
1. **PROIBIDO USAR ASTERISCOS (**) OU UNDERSCORES (__) PARA NEGRITO/ITÁLICO.** O chat do usuário não renderiza Markdown e isso parece um bug. Escreva apenas texto puro.
2. Se quiser enfatizar algo, USE CAIXA ALTA ou EMOJIS.
3. Use MUITOS emojis para dar vida à conversa. 🔥💪🚀🥗🍗
4. Respostas curtas, no estilo de mensagem de WhatsApp. Evite textões.

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
    } catch (error) {
        console.error("Error in chat:", error);
        return "Desculpa mano, deu um bug aqui. Tenta de novo! 💪";
    }
};
