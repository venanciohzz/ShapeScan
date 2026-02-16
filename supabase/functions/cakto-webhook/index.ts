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
        const supabase = createClient(supabaseUrl, supabaseKey);

        const payload = await req.text();
        const event = JSON.parse(payload);
        console.log('Webhook event received:', event);

        // Formato Cakto: { event: "purchase_approved", data: {...} }
        const { event: eventType, data } = event;

        switch (eventType) {
            case 'purchase_approved': {
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

                console.log('Processing purchase:', {
                    customerEmail,
                    customerName,
                    productShortId,
                    amount
                });

                if (!customerEmail) {
                    return new Response(JSON.stringify({ error: 'Customer email required' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Mapear product short_id para plan_id
                const planMapping: Record<string, string> = {
                    'e2j2mqh': 'monthly',
                    '3ce3ypz': 'annual',
                    '598qhka': 'pro_monthly',
                    '392xpbn': 'pro_annual',
                };

                const planId = planMapping[productShortId] || 'monthly';

                // Buscar usuário por email
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', customerEmail)
                    .single();

                if (!profile) {
                    console.error('User not found:', customerEmail);
                    return new Response(JSON.stringify({ error: 'User not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                const userId = profile.id;

                // Salvar dados do pagamento
                await supabase.from('payments').insert({
                    user_id: userId,
                    plan_id: planId,
                    amount: amount,
                    status: 'approved',
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
                        raw_data: data,
                    }
                });

                // Atualizar plano do usuário
                await supabase.from('user_plans').upsert({
                    user_id: userId,
                    plan_id: planId,
                    active: true,
                }, {
                    onConflict: 'user_id'
                });

                console.log('Payment processed for:', customerEmail, 'Plan:', planId);
                console.log('Customer data saved:', { customerName, customerPhone });
                break;
            }

            case 'purchase_refunded':
            case 'purchase_chargeback': {
                const customerEmail = data.customer?.email;
                const orderId = data.id;

                // Atualizar status do pagamento
                await supabase
                    .from('payments')
                    .update({ status: 'refunded' })
                    .eq('metadata->>order_id', orderId);

                // Desativar plano
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', customerEmail)
                    .single();

                if (profile) {
                    await supabase
                        .from('user_plans')
                        .update({ active: false, plan_id: 'free' })
                        .eq('user_id', profile.id);
                }

                console.log('Payment refunded:', orderId);
                break;
            }

            default:
                console.log('Unknown event:', eventType);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
