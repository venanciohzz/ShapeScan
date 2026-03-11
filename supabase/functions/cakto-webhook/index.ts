import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const webhookSecret = Deno.env.get('CAKTO_WEBHOOK_SECRET');
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (!webhookSecret) {
            throw new Error('Missing CAKTO_WEBHOOK_SECRET environment variable');
        }

        // 0. OBTER CORPO BRUTO (CRÍTICO PARA VALIDAÇÃO)
        const rawBody = await req.text();
        const signature = req.headers.get('x-cakto-signature');

        // 1. VERIFICAÇÃO DE ASSINATURA (CRÍTICO)
        // Usamos o segredo configurado no dashboard da Cakto
        if (signature !== webhookSecret) {
            console.error('Unauthorized webhook attempt. Invalid signature.');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. PARSE DO JSON (APÓS VALIDAÇÃO)
        const event = JSON.parse(rawBody);
        
        // 3. FILTRAGEM DE EVENTOS PERMITIDOS
        const allowedEvents = ['purchase_approved', 'subscription_canceled', 'purchase_refunded', 'purchase_chargeback'];
        const { event: eventType, data } = event;

        if (!allowedEvents.includes(eventType)) {
            console.log('Ignoring non-monitored event (returning 200):', eventType);
            return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        console.log('Verified webhook event received:', eventType);

        switch (eventType) {
            case 'purchase_approved': {
                const customerEmail = data.customer?.email;
                const customerName = data.customer?.name;
                const customerPhone = data.customer?.phone;
                const customerDocNumber = data.customer?.docNumber;

                const productShortId = data.product?.short_id;
                const productName = data.product?.name;

                const amount = data.amount;
                const orderId = data.id; // ID único da transação na Cakto
                const subscriptionId = data.subscription?.id;
                const paymentMethod = data.paymentMethod;
                const installments = data.installments || 1;
                const paidAt = data.paidAt;

                // Extrair UUID do usuário do parâmetro 'src' (passado via link de checkout)
                const userIdFromTracking = data.tracking?.src;

                console.log('Processing purchase:', {
                    customerEmail,
                    userIdFromTracking,
                    productShortId,
                    orderId
                });

                if (!customerEmail && !userIdFromTracking) {
                    return new Response(JSON.stringify({ error: 'Customer identification required' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // 1. Verificar IDEMPOTÊNCIA (evitar duplicados)
                const { data: existingPayment } = await supabase
                    .from('payments')
                    .select('id')
                    .eq('metadata->>order_id', orderId)
                    .single();

                if (existingPayment) {
                    console.log('Payment already processed (idempotency):', orderId);
                    return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    });
                }

                // 2. Identificar Usuário (Prioridade: UUID via src -> fallback: Email)
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
                    console.error('User not found for identification:', { email: customerEmail, uuid: userIdFromTracking });
                    return new Response(JSON.stringify({ error: 'User not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Mapear product short_id para plan_id (Consolidado com PAYMENT_CONFIG)
                const planMapping: Record<string, string> = {
                    '5vw2inp': 'monthly',
                    '3ce3ypz': 'annual',
                    '598qhka': 'pro_monthly',
                    '392xpbn': 'pro_annual',
                };

                const planId = planMapping[productShortId] || 'monthly';

                // 3. Salvar dados do pagamento
                await supabase.from('payments').insert({
                    user_id: userId,
                    plan_id: planId,
                    amount: amount,
                    status: 'approved',
                    provider: 'cakto', // Padronizado
                    metadata: {
                        customer: {
                            name: customerName,
                            email: customerEmail,
                            phone: customerPhone,
                            docNumber: customerDocNumber,
                        },
                        product: {
                            name: productName,
                            short_id: productShortId,
                        },
                        order_id: orderId,
                        subscription_id: subscriptionId,
                        payment_method: paymentMethod,
                        installments: installments,
                        paid_at: paidAt,
                        tracking_src: userIdFromTracking,
                        raw_data: data,
                    }
                });

                // 4. Atualizar plano do usuário
                await supabase.from('user_plans').upsert({
                    user_id: userId,
                    plan_id: planId,
                    active: true,
                }, {
                    onConflict: 'user_id'
                });

                console.log('Payment processed successfully for user:', userId, 'Plan:', planId);
                break;
            }

            case 'subscription_canceled':
            case 'purchase_refunded':
            case 'purchase_chargeback': {
                const customerEmail = data.customer?.email;
                const orderId = data.id || data.purchase?.id; // Alguns eventos podem vir com estrutura diferente

                console.log(`Processing ${eventType}:`, { orderId, customerEmail });

                // 1. Identificar o pagamento e o usuário pelo order_id (MUITO mais robusto que e-mail)
                const { data: payment } = await supabase
                    .from('payments')
                    .select('user_id, plan_id')
                    .eq('metadata->>order_id', orderId)
                    .single();

                let userId = payment?.user_id;

                // 2. Fallback para e-mail se não achar pelo order_id
                if (!userId && customerEmail) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', customerEmail)
                        .single();
                    if (profile) userId = profile.id;
                }

                if (!userId) {
                    console.error(`User not found for ${eventType}:`, { orderId, email: customerEmail });
                    break;
                }

                // 3. Atualizar status do pagamento se for reembolso/chargeback
                if (eventType !== 'subscription_canceled') {
                    await supabase
                        .from('payments')
                        .update({ status: eventType === 'purchase_refunded' ? 'refunded' : 'chargeback' })
                        .eq('metadata->>order_id', orderId);
                }

                // 4. Desativar plano (Trigger cuidará de atualizar a profile.is_premium)
                await supabase
                    .from('user_plans')
                    .update({ active: false, plan_id: 'free' })
                    .eq('user_id', userId);

                console.log(`Successfully processed ${eventType} for user:`, userId);
                break;
            }

            default:
                console.log('Unknown event:', eventType);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
