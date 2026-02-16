import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, FoodLog, EvolutionRecord, SavedMeal } from '../types';

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
  return {
    id: authData.user.id,
    email: email,
    createdAt: new Date().getTime(),
    isPremium: false,
    isAdmin: false,
    plan: 'free',
    ...userData,
    dailyCalorieGoal: userData.dailyCalorieGoal || 2000,
    freeScansUsed: 0
  } as User;
}

export async function signIn(email: string, password: string): Promise<User> {
  // Tentar login normal
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Se login funcionou, retornar perfil
  if (!error && data.user) {
    const profile = await getProfile(data.user.id);
    return profile;
  }

  // Se erro foi "Invalid login credentials", verificar se é perfil existente sem Auth
  if (error?.message.includes('Invalid login credentials')) {
    // Buscar perfil existente por email
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (profileData) {
      // Perfil existe mas não tem Auth - criar conta Auth
      const { data: newAuthData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!newAuthData.user) throw new Error('Falha ao criar autenticação');

      // Atualizar ID do perfil para corresponder ao Auth
      const oldId = profileData.id;
      const newId = newAuthData.user.id;

      // Atualizar todas as referências
      await migrateUserData(oldId, newId);

      // Buscar perfil atualizado
      const profile = await getProfile(newId);
      return profile;
    }
  }

  throw new Error(error?.message || 'Erro ao fazer login');
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getSession(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) return null;

  try {
    const profile = await getProfile(session.user.id);
    return profile;
  } catch (error) {
    return null;
  }
}

// ==================== PERFIL ====================

export async function getProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Perfil não encontrado');

  // Buscar plano do usuário
  const { data: planData } = await supabase
    .from('user_plans')
    .select('plan_id, active')
    .eq('user_id', userId)
    .eq('active', true)
    .single();

  const isPremium = planData?.plan_id !== 'free';
  const isAdmin = data.is_admin || false;

  return mapProfileToUser(data, planData?.plan_id, isPremium, isAdmin);
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
  const today = new Date().toISOString().split('T')[0];

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
  const today = new Date().toISOString().split('T')[0];

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

  // 6. Atualizar user_usage
  await supabase
    .from('user_usage')
    .update({ user_id: newId })
    .eq('user_id', oldId);

  // 7. Atualizar payments
  await supabase
    .from('payments')
    .update({ user_id: newId })
    .eq('user_id', oldId);
}

// ==================== USO (LIMITES) ====================

export async function getUserUsage(userId: string) {
  const { data, error } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function incrementUsage(userId: string, type: 'food' | 'shape'): Promise<void> {
  const usage = await getUserUsage(userId);
  const today = new Date().toISOString().split('T')[0];

  // Reset se for um novo dia
  if (usage.last_reset !== today) {
    const { error } = await supabase
      .from('user_usage')
      .update({
        daily_food_scans: type === 'food' ? 1 : 0,
        daily_shape_scans: type === 'shape' ? 1 : 0,
        last_reset: today,
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  } else {
    // Incrementar contador apropriado
    const field = type === 'food' ? 'daily_food_scans' : 'daily_shape_scans';
    const { error } = await supabase
      .from('user_usage')
      .update({
        [field]: usage[field] + 1,
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }
}

// ==================== HELPERS DE MAPEAMENTO ====================

function mapProfileToUser(profile: any, plan?: string, isPremium?: boolean, isAdmin?: boolean): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    username: profile.username,
    phone: profile.phone,
    photo: profile.photo,
    isPremium: isPremium ?? false,
    isAdmin: isAdmin ?? false,
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
    plan: plan as any || 'free',
    freeScansUsed: profile.freeScansUsed || profile.free_scans_used || 0,
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
