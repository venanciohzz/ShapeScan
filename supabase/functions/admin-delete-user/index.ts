import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const token = authHeader.replace('Bearer ', '');

  // Verificar que o chamador é admin
  let callerUserId: string;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new Error('Unauthorized');
    callerUserId = data.user.id;
  } catch {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', callerUserId)
    .maybeSingle();

  if (!callerProfile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Acesso negado — permissão de admin necessária' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { targetUserId } = await req.json();
    if (!targetUserId) throw new Error('targetUserId é obrigatório');
    if (targetUserId === callerUserId) throw new Error('Não é possível excluir a própria conta pelo admin');

    // Deletar do Auth (cascade apaga profile e dados relacionados via FK ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error('[ADMIN-DELETE-USER] Supabase deleteUser error:', JSON.stringify(deleteError));
      throw new Error(deleteError.message);
    }

    console.log('[ADMIN-DELETE-USER] OK:', { targetUserId, adminId: callerUserId });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[ADMIN-DELETE-USER] ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
