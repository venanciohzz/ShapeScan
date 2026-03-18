import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// HELPER: Envio de email via Resend
// ============================================================
async function sendEmail(to: string, subject: string, html: string, resendApiKey: string) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
            from: 'ShapeScan <no-reply@shapescan.com.br>',
            to,
            subject,
            html,
        }),
    });
    const data = await response.json();
    if (!response.ok) {
        console.error('[Email] Resend API Error:', data);
        // Não lança erro — email falhar não deve parar o fluxo de pagamento
    } else {
        console.log('[Email] Enviado com sucesso para', to, '| ID:', data.id);
    }
    return data;
}

// ============================================================
// HELPER: Email de confirmação de compra
// ============================================================
function purchaseConfirmationEmail(customerName: string, planName: string, amount: number, paymentMethod: string) {
    const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount / 100);
    const methodMap: Record<string, string> = {
        'credit_card': 'Cartão de Crédito',
        'pix': 'Pix',
        'boleto': 'Boleto Bancário',
    };
    const methodLabel = methodMap[paymentMethod] || paymentMethod;

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f4f4f4; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: 900; color: #10b981; margin: 0;">✅ Pagamento Confirmado!</h1>
      </div>
      <p style="font-size: 16px; color: #d1d5db;">Olá, <strong style="color: #fff;">${customerName || 'Atleta'}</strong>!</p>
      <p style="font-size: 16px; color: #d1d5db; line-height: 1.6;">
        Seu pagamento foi aprovado e seu acesso ao <strong style="color: #10b981;">ShapeScan</strong> está liberado. Bem-vindo(a) à família! 💪
      </p>

      <div style="background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px;">Resumo do Pedido</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">Plano</td>
            <td style="color: #fff; text-align: right; font-weight: 700; font-size: 14px;">${planName}</td>
          </tr>
          <tr>
            <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">Valor</td>
            <td style="color: #10b981; text-align: right; font-weight: 700; font-size: 18px;">${amountFormatted}</td>
          </tr>
          <tr>
            <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">Forma de Pagamento</td>
            <td style="color: #fff; text-align: right; font-size: 14px;">${methodLabel}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://shapescan.com.br/dashboard"
           style="background: #10b981; color: #0a0a0a; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 900; font-size: 16px; display: inline-block; letter-spacing: 1px;">
          Acessar meu Dashboard →
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #2d2d2d; margin: 32px 0;" />
      <p style="font-size: 13px; color: #6b7280; text-align: center;">Dúvidas? Entre em contato: <a href="mailto:suporte@shapescan.com.br" style="color: #10b981;">suporte@shapescan.com.br</a></p>
      <p style="font-size: 12px; color: #4b5563; text-align: center; font-weight: 700; letter-spacing: 2px; margin-top: 8px;">EQUIPE SHAPESCAN</p>
    </div>`;
}

// ============================================================
// HELPER: Email de cancelamento/reembolso
// ============================================================
function cancellationEmail(customerName: string, planName: string, eventType: string) {
    const titleMap: Record<string, string> = {
        'subscription_canceled': 'Assinatura Cancelada',
        'purchase_refunded': 'Reembolso Processado',
        'purchase_chargeback': 'Chargeback Processado',
    };
    const msgMap: Record<string, string> = {
        'subscription_canceled': 'Sua assinatura foi cancelada conforme solicitado. Seu acesso continuará ativo até o fim do período já pago.',
        'purchase_refunded': 'Seu reembolso foi processado com sucesso. O valor será estornado em até 10 dias úteis, conforme a política do seu banco.',
        'purchase_chargeback': 'Identificamos uma contestação de pagamento (chargeback) em sua conta. Seu acesso foi suspenso. Entre em contato se achar que isso é um erro.',
    };
    const title = titleMap[eventType] || 'Atualização na sua assinatura';
    const message = msgMap[eventType] || 'Houve uma atualização na sua assinatura.';

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f4f4f4; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 900; color: #f59e0b; margin: 0;">📋 ${title}</h1>
      </div>
      <p style="font-size: 16px; color: #d1d5db;">Olá, <strong style="color: #fff;">${customerName || 'Atleta'}</strong>!</p>
      <p style="font-size: 16px; color: #d1d5db; line-height: 1.6;">${message}</p>

      <div style="background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Plano Afetado</h3>
        <p style="color: #fff; font-size: 16px; font-weight: 700; margin: 0;">${planName}</p>
      </div>

      <p style="font-size: 15px; color: #d1d5db; line-height: 1.6;">
        Caso tenha dúvidas ou queira reativar sua assinatura, fale conosco a qualquer momento.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://shapescan.com.br/planos"
           style="background: #374151; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 14px; display: inline-block;">
          Ver Planos Disponíveis
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #2d2d2d; margin: 32px 0;" />
      <p style="font-size: 13px; color: #6b7280; text-align: center;">Suporte: <a href="mailto:suporte@shapescan.com.br" style="color: #10b981;">suporte@shapescan.com.br</a></p>
      <p style="font-size: 12px; color: #4b5563; text-align: center; font-weight: 700; letter-spacing: 2px; margin-top: 8px;">EQUIPE SHAPESCAN</p>
    </div>`;
}

// ============================================================
// MAPEAMENTO DE PLANOS
// ============================================================
const planMapping: Record<string, string> = {
    '5vw2inp': 'monthly',
    '3ce3ypz': 'annual',
    '598qhka': 'pro_monthly',
    '392xpbn': 'pro_annual',
};

const planNames: Record<string, string> = {
    'monthly': 'Standard Mensal',
    'annual': 'Standard Anual',
    'pro_monthly': 'Pro Mensal',
    'pro_annual': 'Pro Anual',
    'free': 'Gratuito',
};

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const webhookSecret = Deno.env.get('CAKTO_WEBHOOK_SECRET');
        const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

        const supabase = createClient(supabaseUrl, supabaseKey);

        if (!webhookSecret) {
            throw new Error('Missing CAKTO_WEBHOOK_SECRET environment variable');
        }

        // 0. OBTER CORPO BRUTO (CRÍTICO PARA VALIDAÇÃO)
        const rawBody = await req.text();
        const signature = req.headers.get('x-cakto-signature');

        // 1. VERIFICAÇÃO DE ASSINATURA (CRÍTICO)
        if (signature !== webhookSecret) {
            console.error('[Webhook] Unauthorized attempt. Invalid signature.');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. PARSE DO JSON (APÓS VALIDAÇÃO)
        const event = JSON.parse(rawBody);

        // 3. FILTRAGEM DE EVENTOS
        const allowedEvents = ['purchase_approved', 'subscription_canceled', 'purchase_refunded', 'purchase_chargeback'];
        const { event: eventType, data } = event;

        if (!allowedEvents.includes(eventType)) {
            console.log('[Webhook] Ignoring non-monitored event:', eventType);
            return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        console.log('[Webhook] Processing event:', eventType);

        // ============================================================
        // EVENTO: COMPRA APROVADA
        // ============================================================
        if (eventType === 'purchase_approved') {
            const customerEmail = data.customer?.email;
            const customerName = data.customer?.name;
            const customerPhone = data.customer?.phone;
            const customerDocNumber = data.customer?.docNumber;

            const productShortId = data.product?.short_id;
            const productName = data.product?.name;

            const amount = data.amount;
            const orderId = data.id;
            const subscriptionId = data.subscription?.id;
            const paymentMethod = data.paymentMethod;
            const installments = data.installments || 1;
            const paidAt = data.paidAt;

            const userIdFromTracking = data.tracking?.src;

            console.log('[purchase_approved] Data:', { customerEmail, userIdFromTracking, productShortId, orderId });

            if (!customerEmail && !userIdFromTracking) {
                return new Response(JSON.stringify({ error: 'Customer identification required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // IDEMPOTÊNCIA: Verificar se já processamos este order_id
            const { data: existingPayment } = await supabase
                .from('payments')
                .select('id')
                .eq('metadata->>order_id', orderId)
                .single();

            if (existingPayment) {
                console.log('[purchase_approved] Already processed (idempotency):', orderId);
                return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

            // IDENTIFICAR USUÁRIO (Prioridade: UUID → Email)
            let userId = null;

            if (userIdFromTracking) {
                const { data: profileById } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', userIdFromTracking)
                    .single();
                if (profileById) userId = profileById.id;
            }

            if (!userId && customerEmail) {
                const { data: profileByEmail } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', customerEmail)
                    .single();
                if (profileByEmail) userId = profileByEmail.id;
            }

            if (!userId) {
                console.error('[purchase_approved] User not found:', { customerEmail, userIdFromTracking });
                return new Response(JSON.stringify({ error: 'User not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            const planId = planMapping[productShortId] || 'monthly';
            const planDisplayName = planNames[planId] || productName || planId;

            // SALVAR PAGAMENTO
            await supabase.from('payments').insert({
                user_id: userId,
                plan_id: planId,
                amount: amount,
                status: 'approved',
                provider: 'cakto',
                metadata: {
                    customer: { name: customerName, email: customerEmail, phone: customerPhone, docNumber: customerDocNumber },
                    product: { name: productName, short_id: productShortId },
                    order_id: orderId,
                    subscription_id: subscriptionId,
                    payment_method: paymentMethod,
                    installments: installments,
                    paid_at: paidAt,
                    tracking_src: userIdFromTracking,
                    raw_data: data,
                }
            });

            // ATIVAR PLANO DO USUÁRIO
            // ✅ FIX BUG #1: ON CONFLICT (user_id) agora funciona pois existe UNIQUE constraint
            await supabase.from('user_plans').upsert({
                user_id: userId,
                plan_id: planId,
                active: true,
            }, {
                onConflict: 'user_id'
            });

            console.log('[purchase_approved] Success for user:', userId, '| Plan:', planId);

            // ENVIAR EMAIL DE CONFIRMAÇÃO DE COMPRA
            if (customerEmail && resendApiKey) {
                await sendEmail(
                    customerEmail,
                    `✅ Pagamento confirmado — ${planDisplayName}`,
                    purchaseConfirmationEmail(customerName, planDisplayName, amount, paymentMethod),
                    resendApiKey
                );
            }
        }

        // ============================================================
        // EVENTOS: CANCELAMENTO, REEMBOLSO, CHARGEBACK
        // ============================================================
        else if (['subscription_canceled', 'purchase_refunded', 'purchase_chargeback'].includes(eventType)) {
            const customerEmail = data.customer?.email;
            const orderId = data.id || data.purchase?.id;

            console.log(`[${eventType}] Processing:`, { orderId, customerEmail });

            // IDENTIFICAR USUÁRIO+PLANO a partir do order_id (mais robusto)
            const { data: payment } = await supabase
                .from('payments')
                .select('user_id, plan_id')
                .eq('metadata->>order_id', orderId)
                .single();

            let userId = payment?.user_id;
            let planId = payment?.plan_id;

            // Fallback: buscar por email
            if (!userId && customerEmail) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', customerEmail)
                    .single();
                if (profile) userId = profile.id;
            }

            if (!userId) {
                console.error(`[${eventType}] User not found:`, { orderId, customerEmail });
                // Retorna 200 para não causar reenvio em loop pela Cakto
                return new Response(JSON.stringify({ success: true, message: 'User not found, skipping' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

            // ATUALIZAR STATUS DO PAGAMENTO
            if (eventType !== 'subscription_canceled') {
                await supabase
                    .from('payments')
                    .update({ status: eventType === 'purchase_refunded' ? 'refunded' : 'chargeback' })
                    .eq('metadata->>order_id', orderId);
            }

            // ✅ FIX BUG #2: Desativar TODOS os planos ativos do usuário e mudar para free
            // (não apenas o encontrado pelo order_id — garante limpeza mesmo com múltiplos registros)
            await supabase
                .from('user_plans')
                .update({ active: false, plan_id: 'free' })
                .eq('user_id', userId);

            // Garantir que exista exatamente 1 registro free/inativo (trigger cuidará do profiles)
            await supabase.from('user_plans').upsert({
                user_id: userId,
                plan_id: 'free',
                active: false,
            }, { onConflict: 'user_id' });

            console.log(`[${eventType}] Success for user:`, userId);

            // ENVIAR EMAIL DE CANCELAMENTO
            if (customerEmail && resendApiKey) {
                const planDisplayName = planNames[planId || 'free'] || 'seu plano';
                const customerName = data.customer?.name || '';
                await sendEmail(
                    customerEmail,
                    eventType === 'subscription_canceled'
                        ? '📋 Sua assinatura ShapeScan foi cancelada'
                        : eventType === 'purchase_refunded'
                        ? '💰 Reembolso processado — ShapeScan'
                        : '⚠️ Contestação de pagamento — ShapeScan',
                    cancellationEmail(customerName, planDisplayName, eventType),
                    resendApiKey
                );
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('[Webhook] Unhandled error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
