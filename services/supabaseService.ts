import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, FoodLog, EvolutionRecord, SavedMeal, UserStats } from '../types';
import { getTrackingDateString } from './dateUtils';

export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
export const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ==================== AUTENTICAÇÃO ====================

export async function signUp(email: string, password: string, userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  // 1. Criar usuário no Supabase Auth com metadados
  // A trigger handle_new_user cuidará de criar profile, user_plans e user_usage
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://shapescan.com.br/quiz",
      data: {
        name: userData.name,
        username: userData.username,
        phone: userData.phone,
        age: userData.age,
        height: userData.height,
        weight: userData.weight,
        gender: userData.gender,
        goal: userData.goal,
        activityLevel: userData.activityLevel,
        dailyCalorieGoal: userData.dailyCalorieGoal,
        dailyWaterGoal: userData.dailyWaterGoal,
        dailyProtein: userData.dailyProtein,
        dailyCarbs: userData.dailyCarbs,
        dailyFat: userData.dailyFat,
        freeScansUsed: 0,
        photo: userData.photo,
      }
    }
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('Falha ao criar usuário');

  // Retornar objeto User construído com os dados enviados (já que o profile pode levar uns ms para ser criado)
  // Não bloquear por confirmação de email — o usuário acessa o app imediatamente
  const isConfirmed = authData.user.email_confirmed_at !== undefined && authData.user.email_confirmed_at !== null;

  return {
    ...userData,
    id: authData.user.id,
    email: email,
    createdAt: new Date().getTime(),
    isPremium: false,
    isAdmin: false,
    plan: 'free',
    dailyCalorieGoal: userData.dailyCalorieGoal || 2000,
    freeScansUsed: 0,
    emailConfirmed: isConfirmed,
    needsEmailConfirmation: !isConfirmed
  } as User;
}
export async function signIn(email: string, password: string): Promise<User> {
  console.log('[SupabaseService] 🔑 Iniciando processo de signIn para:', email);
  const start = Date.now();

  // NOTA: NÃO chamamos signOut() aqui pois isso dispararia SIGNED_OUT no onAuthStateChange
  // causando loop: login → SIGNED_OUT → user=null → loading infinito.
  // O Supabase substitui automaticamente a sessão ao fazer novo signInWithPassword.

  try {
    console.log('[SupabaseService] 🔌 Chamando signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
       console.error('[SupabaseService] ❌ Erro retornado pelo Supabase Auth:', error);
       if (error.message.includes('Invalid login credentials')) {
         throw new Error('E-mail ou senha incorretos. Verifique seus dados e tente novamente.');
       }
       if (error.message.includes('Email not confirmed')) {
         throw new Error('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
       }
       if (error.message.includes('Too many requests')) {
         throw new Error('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
       }
       throw new Error(error.message || 'Erro ao fazer login. Tente novamente.');
    }

    if (data.user) {
      console.log('[SupabaseService] ✅ Auth OK. Buscando perfil completo em bg/fallback...');
      
      try {
        const profile = await getProfile(data.user.id);
        console.log(`[SupabaseService] 🏁 Login com perfil concluído.`);
        return profile;
      } catch (profileError) {
        console.warn('[SupabaseService] ⚠️ Erro crítico ao carregar perfil. O Auth passou, ativando fallback temporário:', profileError);
        // O login NÃO pode depender do DB do Profile estar perfeitamente íntegro.
        return {
          id: data.user.id,
          email: data.user.email || email,
          name: 'Usuário',
          username: 'usuario_' + data.user.id.substring(0, 5),
          phone: '',
          isPremium: false,
          isAdmin: false,
          isPendingPayment: false,
          plan: 'free',
          dailyCalorieGoal: 2000,
        } as User;
      }
    }

    throw new Error('Falha inesperada: Nenhuma sessão retornada.');
  } catch (err: any) {
    console.error('[SupabaseService] 💥 Erro no fluxo de Login:', err);
    throw err;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function resetPassword(email: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout real

  try {
    const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Configuração do Supabase ausente no ambiente.');
    }

    console.log(`[SupabaseService] Enviando recuperação para ${email} via Direct Fetch...`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[SupabaseService] Erro na Edge Function:', errorData);
      throw new Error(errorData.error || errorData.message || `Erro do servidor: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('[SupabaseService] Erro no body da resposta:', data.error);
      throw new Error(data.error);
    }

    console.log('[SupabaseService] Sucesso no envio:', data);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn('[SupabaseService] Timeout de 30s atingido e requisição abortada.');
      throw new Error('Timeout: O servidor demorou muito para responder (cold start). Verifique sua conexão ou tente novamente.');
    }
    console.error('[SupabaseService] Erro crítico em resetPassword:', err);
    throw err;
  }
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: "https://shapescan.com.br/quiz",
    }
  });
  if (error) throw new Error(error.message);
}

// ==================== REMOVIDO: PENDING PAYMENT (ESTADO INTERMEDIÁRIO) ====================

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function getSession(): Promise<User | null> {
  const start = Date.now();
  console.log('[SupabaseService] 🛠️ getSession: Chamando supabase.auth.getSession()...');
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('[SupabaseService] ❌ Erro em getSession:', error.message);
    return null;
  }

  console.log(`[SupabaseService] ⏱️ getSession respondeu em ${Date.now() - start}ms.`);

  if (!session?.user) {
    console.log('[SupabaseService] ℹ️ Nenhuma sessão ativa encontrada.');
    return null;
  }

  // Desacoplamento do Profile: Auth não cai se o Database Profile falhar.
  try {
    const profile = await getProfile(session.user.id);
    return profile;
  } catch (error) {
    console.error('[SupabaseService] ⚠️ Sessão Auth VÁLIDA mas getProfile() FALHOU. Entregando usuário em Fallback para não quebrar UI.', error);
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: 'Usuário',
      username: 'usuario_' + session.user.id.substring(0, 5),
      phone: '',
      isPremium: false,
      isAdmin: false,
      isPendingPayment: false,
      plan: 'free',
      dailyCalorieGoal: 2000,
    } as User;
  }
}

// ==================== PERFIL ====================

export async function getProfile(userId: string): Promise<User> {
  console.log(`[SupabaseService] 🔍 getProfile iniciada para ${userId}`);

  // Bypass supabase.from() — ele chama getSession() internamente que usa o lock
  // do SDK e trava indefinidamente para Google OAuth. Usamos fetch direto com o
  // token válido (com refresh automático se expirado).
  let token: string;
  try {
    token = await getValidToken();
  } catch {
    // Sem token no localStorage — usa anonKey para leitura (RLS permitirá se a policy for pública)
    token = supabaseAnonKey;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': supabaseAnonKey,
  };

  // Buscar perfil
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
    { headers }
  );
  if (!profileRes.ok) {
    const msg = `HTTP ${profileRes.status} ao buscar perfil`;
    console.error(`[SupabaseService] ❌ Erro ao buscar perfil (${userId}):`, msg);
    throw new Error(msg);
  }
  const profileRows = await profileRes.json();
  const data = profileRows?.[0];
  if (!data) throw new Error('Perfil não encontrado');

  console.log('[SupabaseService] 💳 Buscando planos do usuário...');

  // Buscar plano do usuário
  const plansRes = await fetch(
    `${supabaseUrl}/rest/v1/user_plans?user_id=eq.${encodeURIComponent(userId)}&active=eq.true&select=plan_id,active&order=created_at.desc&limit=1`,
    { headers }
  );
  const plans = plansRes.ok ? await plansRes.json() : [];
  if (!plansRes.ok) {
    console.error('[SupabaseService] Erro ao carregar plano:', plansRes.status);
  }

  const planData = plans?.[0];
  const planId = planData?.plan_id || data.plan || 'free';
  const isPremium = planId !== 'free';
  const isAdmin = data.is_admin || false;

  // Buscar status de confirmação de e-mail direto da Auth API
  let emailConfirmed = false;
  try {
    const authUserRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      }
    });
    if (authUserRes.ok) {
      const authUser = await authUserRes.json();
      emailConfirmed = !!authUser.email_confirmed_at;
    }
  } catch (e) {
    console.warn('[SupabaseService] Não foi possível verificar confirmação de e-mail:', e);
  }

  return mapProfileToUser({ ...data, emailConfirmed }, planId, isPremium, isAdmin);
}

export async function updateProfile(userId: string, updates: Partial<User>): Promise<User> {
  const profileUpdates: any = {
    name: updates.name,
    username: updates.username,
    phone: updates.phone,
    age: updates.age,
    height: updates.height,
    weight: updates.weight,
    gender: updates.gender,
    goal: updates.goal,
    activityLevel: updates.activityLevel,
    dailyCalorieGoal: updates.dailyCalorieGoal,
    dailyWaterGoal: updates.dailyWaterGoal,
    dailyProtein: updates.dailyProtein,
    dailyCarbs: updates.dailyCarbs,
    dailyFat: updates.dailyFat,
    freeScansUsed: updates.freeScansUsed,
    photo: updates.photo,
    velocity: updates.velocity,
    impediments: updates.impediments,
    conquests: updates.conquests,
    targetWeight: updates.targetWeight,
  };

  // Remover campos undefined
  Object.keys(profileUpdates).forEach(key =>
    profileUpdates[key] === undefined && delete profileUpdates[key]
  );

  const { error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId);

  if (error) throw new Error(error.message);

  return await getProfile(userId);
}

// ==================== LOGS DE ALIMENTOS ====================

export async function listFoodLogs(userId: string): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(mapFoodLogFromDB);
}

export async function addFoodLog(userId: string, log: Omit<FoodLog, 'id' | 'timestamp'>): Promise<FoodLog> {
  const dbLog = {
    user_id: userId,
    name: log.name,
    items: log.items,
    calories: log.calories,
    protein: log.protein,
    carbs: log.carbs,
    fat: log.fat,
    weight: log.weight,
  };

  const { data, error } = await supabase
    .from('food_logs')
    .insert(dbLog)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return mapFoodLogFromDB(data);
}

export async function updateFoodLog(userId: string, log: FoodLog): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .update({
      name: log.name,
      items: log.items,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      weight: log.weight,
    })
    .eq('id', log.id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function deleteFoodLog(userId: string, logId: string): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ==================== HIDRATAÇÃO ====================

export async function getDailyWater(userId: string): Promise<number> {
  const today = getTrackingDateString();

  const { data, error } = await supabase
    .from('hydration_logs')
    .select('amount')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 é "No rows found"
    console.error('Erro ao buscar hidratação:', error);
    return 0;
  }

  return data?.amount || 0;
}

export async function upsertDailyWater(userId: string, amount: number, dailyGoal: number): Promise<void> {
  const today = getTrackingDateString();

  const { error } = await supabase
    .from('hydration_logs')
    .upsert({
      user_id: userId,
      date: today,
      amount: amount,
      daily_goal: dailyGoal
    }, { onConflict: 'user_id, date' });

  if (error) {
    console.error('Erro ao salvar hidratação:', error);
    throw new Error(error.message);
  }
}

// ==================== REFEIÇÕES SALVAS ====================

export async function listSavedMeals(userId: string): Promise<SavedMeal[]> {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(mapSavedMealFromDB);
}

export async function addSavedMeal(userId: string, meal: Omit<SavedMeal, 'id' | 'userId'>): Promise<SavedMeal> {
  const dbMeal = {
    user_id: userId,
    name: meal.name,
    items: meal.items,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    weight: meal.weight,
  };

  const { data, error } = await supabase
    .from('saved_meals')
    .insert(dbMeal)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return mapSavedMealFromDB(data);
}

export async function deleteSavedMeal(userId: string, mealId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_meals')
    .delete()
    .eq('id', mealId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ==================== EVOLUÇÃO ====================

export async function listEvolutionRecords(userId: string): Promise<EvolutionRecord[]> {
  console.log('🔵 listEvolutionRecords - userId:', userId);

  const { data, error } = await supabase
    .from('evolution_records')
    .select('*')
    .eq('user_id', userId)
    .order('record_date', { ascending: false });

  if (error) {
    console.error('🔴 Erro ao listar evolução:', error);
    throw new Error(error.message);
  }

  console.log('🟢 Registros encontrados:', data?.length || 0);

  return (data || []).map(mapEvolutionRecordFromDB);
}

export async function addEvolutionRecord(userId: string, record: Omit<EvolutionRecord, 'id'>): Promise<EvolutionRecord> {
  console.log('🔵 supabaseService.addEvolutionRecord - userId:', userId);
  console.log('🔵 Dados recebidos:', record);

  const dbRecord = {
    user_id: userId,
    record_date: record.date,
    weight: record.weight,
    height: record.height,
    bf: record.bf?.toString(),
    photo: record.photo,
    notes: record.notes,
    detailed_analysis: record.detailedAnalysis,
    points_to_improve: record.pointsToImprove,
    macro_suggestions: record.macroSuggestions,
  };

  console.log('🔵 Dados formatados para DB:', dbRecord);

  const { data, error } = await supabase
    .from('evolution_records')
    .insert(dbRecord)
    .select()
    .single();

  if (error) {
    console.error('🔴 Erro ao inserir no banco:', error);
    throw new Error(error.message);
  }

  console.log('🟢 Dados inseridos com sucesso:', data);

  return mapEvolutionRecordFromDB(data);
}

export async function updateEvolutionRecord(userId: string, record: EvolutionRecord): Promise<void> {
  const { error } = await supabase
    .from('evolution_records')
    .update({
      weight: record.weight,
      height: record.height,
      bf: record.bf?.toString(),
      notes: record.notes,
      detailed_analysis: record.detailedAnalysis,
      points_to_improve: record.pointsToImprove,
      macro_suggestions: record.macroSuggestions,
    })
    .eq('id', record.id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function deleteEvolutionRecord(userId: string, recordId: string): Promise<void> {
  const { error } = await supabase
    .from('evolution_records')
    .delete()
    .eq('id', recordId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ==================== MIGRAÇÃO ====================

export async function migrateUserData(oldId: string, newId: string): Promise<void> {
  // 1. Atualizar perfil
  await supabase
    .from('profiles')
    .update({ id: newId })
    .eq('id', oldId);

  // 2. Atualizar food_logs
  await supabase
    .from('food_logs')
    .update({ user_id: newId })
    .eq('user_id', oldId);

  // 3. Atualizar saved_meals
  await supabase
    .from('saved_meals')
    .update({ user_id: newId })
    .eq('user_id', oldId);

  // 4. Atualizar evolution_records
  await supabase
    .from('evolution_records')
    .update({ user_id: newId })
    .eq('user_id', oldId);

  // 5. Atualizar user_plans
  await supabase
    .from('user_plans')
    .update({ user_id: newId })
    .eq('user_id', oldId);

  // 6. Atualizar daily_usage
  await supabase
    .from('daily_usage')
    .update({ user_id: newId })
    .eq('user_id', oldId);

  // 7. Atualizar payments
  await supabase
    .from('payments')
    .update({ user_id: newId })
    .eq('user_id', oldId);
}

// ==================== USO (LIMITES) ====================

/**
 * Busca o uso diário de um recurso específico
 */
export async function getDailyUsage(userId: string, type: 'food' | 'shape'): Promise<number> {
  const today = getTrackingDateString();

  const { data, error } = await supabase
    .from('daily_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('type', type)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar uso diário:', error);
    return 0;
  }

  return data?.count || 0;
}

// NOTA: O incremento de uso diário é feito atomicamente pela Edge Function ai-analyzer
// via as RPCs claim_daily_slot e claim_free_slot (migration 20260325_atomic_usage_slots.sql).
// O frontend não incrementa diretamente — apenas lê o contador via getDailyUsage().

// ==================== GAMIFICAÇÃO = [STREAKS, BADGES, LEVELS] = ====================

export async function getUserStats(userId: string): Promise<UserStats> {
  // maybeSingle() retorna 200+null quando não há linha, evitando o 406 no console
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    // Criar stats iniciais se não existirem
    const initialStats = {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      total_logs: 0,
      level: 1,
      experience: 0,
      badges: []
    };
    const { data: newData, error: insertError } = await supabase
      .from('user_stats')
      .insert(initialStats)
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    return mapStatsFromDB(newData);
  }

  return mapStatsFromDB(data);
}

export async function updateStreak(userId: string): Promise<UserStats> {
  const today = getTrackingDateString();
  const stats = await getUserStats(userId);
  
  if (stats.lastActivityDate === today) return stats;

  const lastDate = stats.lastActivityDate ? new Date(stats.lastActivityDate) : null;
  const todayDate = new Date(today);
  
  let newStreak = 1;
  if (lastDate) {
    const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      newStreak = (stats.currentStreak || 0) + 1;
    }
  }

  const updates: any = {
    current_streak: newStreak,
    last_activity_date: today,
    total_logs: (stats.totalLogs || 0) + 1,
    experience: (stats.experience || 0) + 50, // 50 XP por atividade
    updated_at: new Date().toISOString()
  };

  if (newStreak > (stats.longestStreak || 0)) {
    updates.longest_streak = newStreak;
  }

  // Lógica simples de nível: Cada nível precisa de 500 XP
  updates.level = Math.floor(updates.experience / 500) + 1;

  // Lógica de medalhas (badges)
  const newBadges = [...(stats.badges || [])];
  if (newStreak === 1 && !newBadges.includes('first_step')) newBadges.push('first_step');
  if (newStreak === 7 && !newBadges.includes('seven_days')) newBadges.push('seven_days');
  if (newStreak === 30 && !newBadges.includes('thirty_days')) newBadges.push('thirty_days');
  if (updates.total_logs >= 50 && !newBadges.includes('food_master')) newBadges.push('food_master');
  
  // Novas medalhas estratégicas
  if (updates.experience >= 1000 && !newBadges.includes('level_up')) newBadges.push('level_up');
  if (updates.total_logs >= 10 && !newBadges.includes('scanner_pro')) newBadges.push('scanner_pro');
  if (newStreak >= 3 && !newBadges.includes('consistency_starter')) newBadges.push('consistency_starter');
  
  updates.badges = newBadges;

  const { data, error } = await supabase
    .from('user_stats')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapStatsFromDB(data);
}

// ==================== HELPERS DE MAPEAMENTO ====================

function mapStatsFromDB(dbStats: any): UserStats {
  return {
    userId: dbStats.user_id,
    currentStreak: dbStats.current_streak,
    longestStreak: dbStats.longest_streak,
    lastActivityDate: dbStats.last_activity_date,
    totalLogs: dbStats.total_logs,
    level: dbStats.level,
    experience: dbStats.experience,
    badges: dbStats.badges || [],
    updatedAt: new Date(dbStats.updated_at).getTime(),
  };
}

function mapProfileToUser(profile: any, plan?: string, isPremium?: boolean, isAdmin?: boolean): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    username: profile.username,
    phone: profile.phone,
    photo: profile.photo,
    isPremium: isPremium ?? false,
    isAdmin: isAdmin ?? profile.is_admin ?? false,
    isPendingPayment: false,
    dailyCalorieGoal: profile.dailyCalorieGoal || profile.daily_calorie_goal || 2000,
    dailyWaterGoal: profile.dailyWaterGoal || profile.daily_water_goal,
    dailyProtein: profile.dailyProtein || profile.daily_protein,
    dailyCarbs: profile.dailyCarbs || profile.daily_carbs,
    dailyFat: profile.dailyFat || profile.daily_fat,
    age: profile.age,
    height: profile.height,
    weight: profile.weight,
    gender: profile.gender,
    goal: profile.goal,
    activityLevel: profile.activityLevel || profile.activity_level,
    plan: (plan || profile.plan || 'free') as any,
    freeScansUsed: profile.freeScansUsed || profile.free_scans_used || 0,
    velocity: profile.velocity,
    impediments: profile.impediments || [],
    conquests: profile.conquests || [],
    targetWeight: profile.targetWeight || profile.target_weight,
    emailConfirmed: profile.emailConfirmed || profile.email_confirmed || false,
    createdAt: new Date(profile.created_at).getTime(),
    adminNote: profile.admin_note || '',
  } as any;
}

function mapFoodLogFromDB(dbLog: any): FoodLog {
  return {
    id: dbLog.id,
    userId: dbLog.user_id,
    name: dbLog.name,
    items: dbLog.items,
    calories: dbLog.calories,
    protein: dbLog.protein,
    carbs: dbLog.carbs,
    fat: dbLog.fat,
    weight: dbLog.weight,
    timestamp: new Date(dbLog.created_at).getTime(),
  };
}

function mapSavedMealFromDB(dbMeal: any): SavedMeal {
  return {
    id: dbMeal.id,
    userId: dbMeal.user_id,
    name: dbMeal.name,
    items: dbMeal.items,
    calories: dbMeal.calories,
    protein: dbMeal.protein,
    carbs: dbMeal.carbs,
    fat: dbMeal.fat,
    weight: dbMeal.weight,
  };
}

function mapEvolutionRecordFromDB(dbRecord: any): EvolutionRecord {
  return {
    id: dbRecord.id,
    userId: dbRecord.user_id,
    date: dbRecord.record_date,
    weight: dbRecord.weight,
    height: dbRecord.height,
    bf: dbRecord.bf,
    photo: dbRecord.photo,
    notes: dbRecord.notes,
    detailedAnalysis: dbRecord.detailed_analysis,
    pointsToImprove: dbRecord.points_to_improve,
    macroSuggestions: dbRecord.macro_suggestions,
  };
}

// ==================== ADMIN ====================

export async function getAllUsers(): Promise<User[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const [plansResult, foodLogsResult, chatMsgsResult, savedMealsResult, hydrationLogsResult] = await Promise.all([
    supabase.from('user_plans').select('user_id, plan_id, active, subscription_start, current_period_end, cancel_at_period_end, cancelled_at, cancellation_reason, cancellation_feedback'),
    supabase.from('food_logs').select('user_id'),
    supabase.from('chat_messages').select('user_id'),
    supabase.from('saved_meals').select('user_id'),
    supabase.from('hydration_logs').select('user_id'),
  ]);

  const planMap = new Map();
  plansResult.data?.forEach((p: any) => planMap.set(p.user_id, p));

  const foodLogCountMap = new Map<string, number>();
  foodLogsResult.data?.forEach((f: any) => foodLogCountMap.set(f.user_id, (foodLogCountMap.get(f.user_id) || 0) + 1));

  const chatMsgCountMap = new Map<string, number>();
  chatMsgsResult.data?.forEach((c: any) => chatMsgCountMap.set(c.user_id, (chatMsgCountMap.get(c.user_id) || 0) + 1));

  const savedMealsCountMap = new Map<string, number>();
  savedMealsResult.data?.forEach((s: any) => savedMealsCountMap.set(s.user_id, (savedMealsCountMap.get(s.user_id) || 0) + 1));

  const hydrationCountMap = new Map<string, number>();
  hydrationLogsResult.data?.forEach((h: any) => hydrationCountMap.set(h.user_id, (hydrationCountMap.get(h.user_id) || 0) + 1));

  return profiles.map((p: any) => {
    const plan = planMap.get(p.id);
    const planId = plan?.active ? plan.plan_id : 'free';
    const user = mapProfileToUser(p, planId, planId !== 'free', p.is_admin);
    if (plan) {
      user.subscriptionStart = plan.subscription_start ?? null;
      user.subscriptionEnd = plan.current_period_end ?? null;
      user.cancelAtPeriodEnd = plan.cancel_at_period_end ?? false;
      user.cancelledAt = plan.cancelled_at ?? null;
      user.cancellationReason = plan.cancellation_reason ?? null;
      user.cancellationFeedback = plan.cancellation_feedback ?? null;
    }
    user.foodLogsCount = foodLogCountMap.get(p.id) || 0;
    user.savedMealsCount = savedMealsCountMap.get(p.id) || 0;
    user.hydrationLogsCount = hydrationCountMap.get(p.id) || 0;
    user.chatMsgsCount = chatMsgCountMap.get(p.id) || 0;
    return user;
  });
}

export async function getRevenueStats() {
  const { data: payments, error } = await supabase
    .from('payments')
    .select('amount, status');

  if (error) throw new Error(error.message);

  const totalRevenue = payments
    .filter((p: any) => p.status === 'approved')
    .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { data: activePlans } = await supabase
    .from('user_plans')
    .select('user_id')
    .eq('active', true)
    .neq('plan_id', 'free');

  // Count unique users with active paid plans
  const uniqueActiveSubs = new Set(activePlans?.map((p: any) => p.user_id)).size;

  return {
    totalRevenue,
    totalUsers: totalUsers || 0,
    activeSubs: uniqueActiveSubs
  };
}

export async function adminUpdateUserPlan(userId: string, planId: string, expiresAt?: number): Promise<void> {
  // UPSERT: a tabela tem UNIQUE(user_id), então INSERT causaria violação de constraint.
  // upsert com onConflict: 'user_id' atualiza a linha existente em vez de inserir nova.
  const payload: any = {
    user_id: userId,
    plan_id: planId,
    active: true,
    plan_origin: 'manual',
  };
  if (expiresAt !== undefined) {
    payload.current_period_end = expiresAt;
  }
  const { error } = await supabase
    .from('user_plans')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) throw new Error(error.message);
}

// ==================== ASSINATURA ====================

export interface SubscriptionInfo {
  plan_id: string;
  active: boolean;
  subscription_id: string | null;
  cancel_at_period_end: boolean;
  current_period_end: number | null;
  subscription_start: number | null;
  created_at: string;
}

export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo | null> {
  const { data, error } = await supabase
    .from('user_plans')
    .select('plan_id, active, subscription_id, cancel_at_period_end, current_period_end, subscription_start, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SubscriptionInfo | null;
}

// Lê a sessão bruta do localStorage (síncrono, sem SDK).
function getStoredSession(): { access_token: string; refresh_token: string; expires_at?: number; user?: any } | null {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    const key = `sb-${projectRef}-auth-token`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const session = JSON.parse(stored);
      if (session?.access_token) return session;
    }
  } catch { /* fallback */ }
  return null;
}

// Salva sessão atualizada no localStorage.
function storeSession(session: { access_token: string; refresh_token: string; expires_at?: number; user?: any }): void {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    const key = `sb-${projectRef}-auth-token`;
    // Ler o existente para preservar campos extras (token_type, etc.)
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(key, JSON.stringify({ ...existing, ...session }));
  } catch { /* ignora */ }
}

// Obtém um access token válido. Se expirado, faz refresh direto via fetch (sem SDK, sem lock).
export async function getValidToken(): Promise<string> {
  const session = getStoredSession();
  if (!session) throw new Error('Sessão não encontrada. Faça login novamente.');

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  // Renova se expirado ou expira em menos de 60s
  if (expiresAt > now + 60) return session.access_token;

  // Token expirado — refresh direto sem SDK
  console.log('[SupabaseService] 🔄 Token expirado, fazendo refresh direto...');
  if (!session.refresh_token) throw new Error('Sem refresh_token. Faça login novamente.');

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error_description || `Refresh falhou (${res.status}). Faça login novamente.`);
  }

  const newSession = await res.json();
  storeSession(newSession);
  console.log('[SupabaseService] ✅ Token renovado com sucesso.');
  return newSession.access_token;
}

// Mantém compatibilidade síncrona para casos onde token não precisa ser válido (leitura imediata).
export function getStoredToken(): string {
  const session = getStoredSession();
  if (session?.access_token) return session.access_token;
  throw new Error('Sessão não encontrada. Faça login novamente.');
}

// Chama uma edge function via fetch direto — evita o supabase.functions.invoke
// que internamente chama getSession() e pode travar com Google OAuth.
export async function callEdgeFunction(name: string, body?: object): Promise<any> {
  const token = await getValidToken();
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}

export async function cancelSubscription(reason?: string, feedback?: string): Promise<{ cancel_at_period_end: boolean; current_period_end: number }> {
  return callEdgeFunction('stripe-cancel-subscription', { reason: reason || '', feedback: feedback || '' });
}

export async function adminCancelUserSubscription(targetUserId: string): Promise<{ success: boolean; current_period_end: number; expiry_date: string }> {
  return callEdgeFunction('admin-cancel-subscription', { targetUserId });
}

// ==================== ADMIN USER DETAILS ====================

export interface AdminUserDetails {
  totalFoodScans: number;
  totalShapeScans: number;
  totalChatMessages: number;
  totalFoodLogs: number;
  totalEvolutionRecords: number;
  usageByMonth: { month: string; food: number; shape: number; chat: number }[];
  usageLast7Days: { date: string; food: number; shape: number; chat: number }[];
  usageLast30Days: { date: string; food: number; shape: number; chat: number }[];
  userStats: {
    level: number;
    experience: number;
    currentStreak: number;
    longestStreak: number;
    totalLogs: number;
    badges: string[];
  } | null;
}

export async function adminGetUserDetails(targetUserId: string): Promise<AdminUserDetails> {
  const token = await getValidToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': supabaseAnonKey,
  };
  const uid = encodeURIComponent(targetUserId);

  const [dailyUsageRes, foodCountRes, evoCountRes, chatCountRes, statsRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/daily_usage?user_id=eq.${uid}&select=date,type,count&order=date.desc`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/food_logs?user_id=eq.${uid}&select=*`, { headers: { ...headers, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' } }),
    fetch(`${supabaseUrl}/rest/v1/evolution_records?user_id=eq.${uid}&select=*`, { headers: { ...headers, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' } }),
    fetch(`${supabaseUrl}/rest/v1/chat_messages?user_id=eq.${uid}&role=eq.user&select=*`, { headers: { ...headers, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' } }),
    fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${uid}&select=*&limit=1`, { headers }),
  ]);

  const dailyUsage = dailyUsageRes.ok ? await dailyUsageRes.json() : [];
  const foodLogsCount = parseInt(foodCountRes.headers.get('Content-Range')?.split('/')[1] || '0', 10);
  const evolutionCount = parseInt(evoCountRes.headers.get('Content-Range')?.split('/')[1] || '0', 10);
  const chatCount = parseInt(chatCountRes.headers.get('Content-Range')?.split('/')[1] || '0', 10);
  const statsArr = statsRes.ok ? await statsRes.json() : [];
  const statsData = statsArr?.[0] || null;

  const rows: { date: string; type: string; count: number }[] = dailyUsage || [];

  // Totals from daily_usage
  const totalFoodScans = rows.filter(r => r.type === 'food').reduce((a, r) => a + r.count, 0);
  const totalShapeScans = rows.filter(r => r.type === 'shape').reduce((a, r) => a + r.count, 0);
  const totalChatMessages = rows.filter(r => r.type === 'chat').reduce((a, r) => a + r.count, 0);

  // Monthly breakdown (last 12 months)
  const monthMap = new Map<string, { food: number; shape: number; chat: number }>();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  rows.forEach(r => {
    const d = new Date(r.date);
    if (d < twelveMonthsAgo) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) monthMap.set(key, { food: 0, shape: 0, chat: 0 });
    const m = monthMap.get(key)!;
    if (r.type === 'food') m.food += r.count;
    else if (r.type === 'shape') m.shape += r.count;
    else if (r.type === 'chat') m.chat += r.count;
  });
  const usageByMonth = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, ...v }));

  // Last 7 days
  const dayMap7 = new Map<string, { food: number; shape: number; chat: number }>();
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  rows.forEach(r => {
    const d = new Date(r.date);
    if (d < sevenDaysAgo) return;
    const key = r.date;
    if (!dayMap7.has(key)) dayMap7.set(key, { food: 0, shape: 0, chat: 0 });
    const m = dayMap7.get(key)!;
    if (r.type === 'food') m.food += r.count;
    else if (r.type === 'shape') m.shape += r.count;
    else if (r.type === 'chat') m.chat += r.count;
  });
  const usageLast7Days = Array.from(dayMap7.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }));

  // Last 30 days
  const dayMap30 = new Map<string, { food: number; shape: number; chat: number }>();
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  rows.forEach(r => {
    const d = new Date(r.date);
    if (d < thirtyDaysAgo) return;
    const key = r.date;
    if (!dayMap30.has(key)) dayMap30.set(key, { food: 0, shape: 0, chat: 0 });
    const m = dayMap30.get(key)!;
    if (r.type === 'food') m.food += r.count;
    else if (r.type === 'shape') m.shape += r.count;
    else if (r.type === 'chat') m.chat += r.count;
  });
  const usageLast30Days = Array.from(dayMap30.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }));

  return {
    totalFoodScans,
    totalShapeScans,
    totalChatMessages,
    totalFoodLogs: foodLogsCount ?? 0,
    totalEvolutionRecords: evolutionCount ?? 0,
    usageByMonth,
    usageLast7Days,
    usageLast30Days,
    userStats: statsData ? {
      level: statsData.level ?? 1,
      experience: statsData.experience ?? 0,
      currentStreak: statsData.current_streak ?? 0,
      longestStreak: statsData.longest_streak ?? 0,
      totalLogs: statsData.total_logs ?? 0,
      badges: statsData.badges ?? [],
    } : null,
  };
}

// ==================== CHAT ====================

export async function getChatHistory(userId: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data || []) as { role: 'user' | 'assistant'; content: string }[];
}

export async function saveChatMessages(userId: string, messages: { role: string; content: string }[]): Promise<void> {
  if (!messages.length) return;
  const rows = messages.map(m => ({ user_id: userId, role: m.role, content: m.content }));
  const token = await getValidToken();
  const res = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `HTTP ${res.status} ao salvar mensagens`);
  }
}

export async function reactivateSubscription(): Promise<{ cancel_at_period_end: boolean; current_period_end: number }> {
  const data = await callEdgeFunction('stripe-reactivate-subscription');
  return data as { cancel_at_period_end: boolean; current_period_end: number };
}

// ==================== ADMIN EXTRAS ====================

export interface AdminPayment {
  id: string;
  amount: number;
  status: string;
  plan_id: string | null;
  created_at: string;
}

export async function adminGetUserPayments(userId: string): Promise<AdminPayment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, plan_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as AdminPayment[];
}

export interface GrowthPoint { date: string; count: number }

export async function adminGetGrowthData(): Promise<GrowthPoint[]> {
  // Busca cadastros dos últimos 30 dias agrupados por dia
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const { data, error } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const dayMap = new Map<string, number>();
  // preenche todos os 30 dias com 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    dayMap.set(d.toISOString().split('T')[0], 0);
  }
  (data || []).forEach((r: any) => {
    const day = r.created_at.split('T')[0];
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });

  return Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}

export async function adminSaveNote(userId: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ admin_note: note })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function adminSendEmail(userId: string, userEmail: string, userName: string, subject: string, message: string): Promise<void> {
  await callEdgeFunction('admin-send-email', { userId, userEmail, userName, subject, message });
}

export async function adminDeleteUser(targetUserId: string): Promise<void> {
  await callEdgeFunction('admin-delete-user', { targetUserId });
}

