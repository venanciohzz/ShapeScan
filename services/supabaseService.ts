import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, FoodLog, EvolutionRecord, SavedMeal, UserStats } from '../types';
import { getTrackingDateString } from './dateUtils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  const isConfirmed = authData.user.email_confirmed_at !== undefined && authData.user.email_confirmed_at !== null;
  // Se exigirmos confirmação de email e ele não estiver confirmado, jogamos erro pro Auth saber
  if (!isConfirmed) {
      throw new Error('auth/confirmation-required');
  }

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
    emailConfirmed: isConfirmed
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
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

// ==================== PENDING PAYMENT (ESTADO INTERMEDIÁRIO) ====================

export async function setUserPendingPayment(userId: string, planId: string): Promise<void> {
  const { error } = await supabase
    .from('user_plans')
    .upsert({ user_id: userId, plan_id: planId, active: true }, { onConflict: 'user_id' });
  if (error) {
    console.error('[supabaseService] Erro ao gravar plano (plano pode estar duplicado ou inconsistente):', error.message);
  }
}

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
  
  const profilePromise = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data, error } = await profilePromise;

  if (error) {
    console.error(`[SupabaseService] ❌ Erro ao buscar perfil (${userId}):`, error.message);
    throw new Error(error.message);
  }
  if (!data) throw new Error('Perfil não encontrado');

  console.log('[SupabaseService] 💳 Buscando planos do usuário...');

  // Buscar plano do usuário (com tratamento resiliente para colunas faltantes)
  let planQuery = supabase
    .from('user_plans')
    .select('plan_id, active, pending_payment')
    .eq('user_id', userId)
    .eq('active', true);
    
  let { data: plans, error: planError } = await planQuery
    .order('created_at', { ascending: false })
    .limit(1);

  // Se der erro de "coluna não existe", tenta novamente sem a coluna pending_payment
  if (planError && planError.message.includes('pending_payment')) {
    console.warn('[SupabaseService] Coluna pending_payment não encontrada. Rodando fallback...');
    const fallback = await supabase
      .from('user_plans')
      .select('plan_id, active')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    plans = fallback.data as any;
  } else if (planError) {
    console.error('[SupabaseService] Erro ao carregar plano:', planError.message);
  }

  const planData = plans?.[0];
  const planId = planData?.plan_id || data.plan || 'free';
  const isPremium = planData ? (planData.plan_id !== 'free') : (data.is_premium || false);
  const isAdmin = data.is_admin || false;
  const isPendingPayment = (planData as any)?.pending_payment ?? false;

  return mapProfileToUser(data, planId, isPremium, isAdmin, isPendingPayment);
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

/**
 * Incrementa o uso diário de um recurso usando RPC securizada que valida limites no backend
 */
export async function incrementDailyUsage(userId: string, type: 'food' | 'shape'): Promise<{ success: boolean; count?: number; limit?: number; error?: string }> {
  const { data, error } = await supabase.rpc('increment_usage_with_limit', {
    scan_type: type
  });

  if (error) {
    console.error('Erro ao incrementar uso via RPC:', error);
    throw new Error(error.message);
  }

  if (data && data.success === false) {
    console.warn(`Limite de uso atingido para ${type}:`, data);
  }

  return data;
}

/**
 * Incrementa o contador de trial (scans gratuitos) do usuário via RPC
 */
export async function incrementFreeScanTrial(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('increment_free_scans', {
    target_user_id: userId
  });

  if (error) {
    console.error('Erro ao incrementar trial via RPC:', error);
    throw new Error(error.message);
  }

  return data;
}

// ==================== GAMIFICAÇÃO = [STREAKS, BADGES, LEVELS] = ====================

export async function getUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
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
    throw new Error(error.message);
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

function mapProfileToUser(profile: any, plan?: string, isPremium?: boolean, isAdmin?: boolean, isPendingPayment?: boolean): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    username: profile.username,
    phone: profile.phone,
    photo: profile.photo,
    isPremium: isPremium ?? profile.is_premium ?? false,
    isAdmin: isAdmin ?? profile.is_admin ?? false,
    isPendingPayment: isPendingPayment ?? false,
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
  };
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

  const { data: plans } = await supabase
    .from('user_plans')
    .select('user_id, plan_id, active')
    .eq('active', true);

  const planMap = new Map();
  plans?.forEach((p: any) => planMap.set(p.user_id, p.plan_id));

  return profiles.map((p: any) =>
    mapProfileToUser(p, planMap.get(p.id), planMap.get(p.id) !== 'free', p.is_admin)
  );
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

export async function adminUpdateUserPlan(userId: string, planId: string): Promise<void> {
  // 1. Desativar planos anteriores
  await supabase
    .from('user_plans')
    .update({ active: false })
    .eq('user_id', userId);

  // 2. Inserir novo plano
  const { error } = await supabase
    .from('user_plans')
    .insert({
      user_id: userId,
      plan_id: planId,
      active: true
    });

  if (error) throw new Error(error.message);
}
