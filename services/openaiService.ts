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
        const prompt = `Realize uma análise técnica de composição corporal baseada nesta imagem. ${metricsInfo}

OBJETIVO DA ANÁLISE:
Fornecer uma avaliação objetiva e construtiva sobre o físico apresentado, focando em métricas visuais estimadas e sugestões de aprimoramento físico.

PARÂMETROS DA ANÁLISE:

1. **Estimativa de BF% (Percentual de Gordura Corporal)**
   - Forneça uma faixa estimada (ex: "10-12%").
   - Se o peso foi informado, estime a massa gorda em kg.

2. **Classificação de Biotipo Predominante**
   - Ectomorfo, Mesomorfo, Endomorfo ou combinação.

3. **AVALIAÇÃO VISUAL (Escala 0-10)**:
   - **Nível de Gordura Corporal**: (0 = Extremamente Baixo/Competição, 5 = Médio/Atlético, 10 = Muito Alto).
   - **Volume Muscular**: (0 = Baixo Desenvolvimento, 5 = Atlético, 10 = Fisiculturista Pro).
   - **Definição Muscular**: (0 = Baixa/Retida, 5 = Visível, 10 = Extrema/Vascularizada).

4. **Contextualização das Notas**:
   - fatContext: Justificativa visual para a nota de gordura.
   - muscleContext: Justificativa visual para a nota de volume muscular.
   - definitionContext: Justificativa visual para a nota de definição.

5. **Análise Corporal Detalhada**:
   - Descreva a estrutura física observada.
   - Comente sobre simetria e proporções.
   - Analise grupos musculares visíveis.

6. **Áreas para Desenvolvimento (Pontos de Melhoria)**:
   - Identifique grupos musculares que poderiam ser mais desenvolvidos para melhor harmonia física.
   - Sugira focos de treinamento específicos.

7. **Sugestão de Protocolo Nutricional (Estimativa)**:
   - Sugira uma divisão de macros (Proteína, Carbo, Gordura em g/kg) alinhada ao estado atual e um objetivo provável (ex: ganhar massa ou reduzir gordura).

8. **Feedback do Treinador (Personal AI)**:
   - Mensagem motivadora e positiva. Use emojis 💪🔥.
   - Dê uma dica prática de treino ou mentalidade.

9. **Avaliação por Segmento**:
   - Braços: Desenvolvimento e definição.
   - Peitoral/Tronco: Volume e formato.
   - Abdômen/Core: Definição e linha de cintura.
   - Pernas: Volume e proporção em relação ao tronco.

IMPORTANTE: Mantenha um tom profissional, respeitoso e analítico. Evite linguagem ofensiva ou diagnósticos médicos.

Retorne APENAS um JSON válido no seguinte formato:
{
  "bfPercentage": "string",
  "biotype": "string",
  "fatDistribution": "string",
  "muscleMass": "string",
  "definition": "string",
  "fatMassWeight": "string",
  "detailedAnalysis": "string (análise técnica e completa com emojis)",
  "pointsToImprove": "string (focos de desenvolvimento)",
  "macroSuggestions": "string (sugestão de protocolo)",
  "coachAdvice": "string (mensagem motivadora)",
  "fatScore": number,
  "muscleScore": number,
  "definitionScore": number,
  "fatContext": "string",
  "muscleContext": "string",
  "definitionContext": "string",
  "proportions": {
    "arms": "string",
    "chest": "string",
    "abs": "string",
    "legs": "string"
  }
}`;

        const text = await callAIAnalyzer({ image: base64Image, prompt, type: 'shape' });

        let data;
        try {
            data = JSON.parse(extractJson(text));
        } catch (parseError) {
            console.error("JSON Parse Error in Shape Analysis:", parseError);
            console.log("Raw text received:", text);
            // Throw a more user-friendly error or return a fallback
            throw new Error(`Erro ao interpretar a análise da IA. O modelo pode ter recusado a imagem. Resposta bruta: ${text.substring(0, 50)}...`);
        }

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
    } catch (error: any) {
        console.error("Error in chat:", error);
        return `Erro detalhado: ${error.message || JSON.stringify(error)}`;
    }
};
