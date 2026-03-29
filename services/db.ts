
import { User, FoodLog, EvolutionRecord, ChatMessage, SavedMeal, UserStats } from '../types';
import * as supabaseService from './supabaseService';
import type { SubscriptionInfo } from './supabaseService';

export const db = {
    auth: {
        async signIn(email: string, password: string): Promise<User> {
            const user = await supabaseService.signIn(email, password);
            return user;
        },

        async signUp(user: Omit<User, 'id'>, password: string): Promise<User> {
            const newUser = await supabaseService.signUp(user.email, password, user);
            return newUser;
        },

        async getSession(): Promise<User | null> {
            return await supabaseService.getSession();
        },

        async setSession(user: User | null) {
            // Supabase gerencia a sessão automaticamente
            // Não precisamos fazer nada aqui
            if (!user) {
                await supabaseService.signOut();
            }
        },

        async resetPassword(email: string): Promise<void> {
            await supabaseService.resetPassword(email);
        },

        async updatePassword(password: string): Promise<void> {
            await supabaseService.updatePassword(password);
        },

        async resendConfirmationEmail(email: string): Promise<void> {
            await supabaseService.resendConfirmationEmail(email);
        }
    },

    users: {
        async get(email: string): Promise<User> {
            const session = await supabaseService.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            const user = await supabaseService.getProfile(session.id);
            // is_admin e isPremium vêm do banco via getProfile — não há hardcode de email aqui.
            return user;
        },

        async update(email: string, updates: Partial<User>): Promise<User> {
            const session = await supabaseService.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            const updatedUser = await supabaseService.updateProfile(session.id, updates);
            return updatedUser;
        }
    },

    water: {
        async getDaily(userId: string): Promise<number> {
            return await supabaseService.getDailyWater(userId);
        },

        async upsertDaily(userId: string, amount: number, dailyGoal: number): Promise<void> {
            await supabaseService.upsertDailyWater(userId, amount, dailyGoal);
        }
    },

    logs: {
        async list(userId: string): Promise<FoodLog[]> {
            return await supabaseService.listFoodLogs(userId);
        },

        async add(userId: string, log: Omit<FoodLog, 'id' | 'timestamp'>): Promise<FoodLog> {
            const newLog = await supabaseService.addFoodLog(userId, log);

            // O incremento agora é feito explicitamente no componente 
            // para permitir controle fino de trial vs diário
            return newLog;
        },

        async update(userId: string, updatedLog: FoodLog): Promise<void> {
            await supabaseService.updateFoodLog(userId, updatedLog);
        },

        async delete(userId: string, logId: string): Promise<void> {
            await supabaseService.deleteFoodLog(userId, logId);
        }
    },

    savedMeals: {
        async list(userId: string): Promise<SavedMeal[]> {
            return await supabaseService.listSavedMeals(userId);
        },

        async add(userId: string, meal: Omit<SavedMeal, 'id' | 'userId'>): Promise<SavedMeal> {
            return await supabaseService.addSavedMeal(userId, meal);
        },

        async delete(userId: string, mealId: string): Promise<void> {
            await supabaseService.deleteSavedMeal(userId, mealId);
        }
    },

    evolution: {
        async list(userId: string): Promise<EvolutionRecord[]> {
            return await supabaseService.listEvolutionRecords(userId);
        },

        async add(userId: string, record: Omit<EvolutionRecord, 'id'>): Promise<EvolutionRecord> {
            // Remover foto antes de salvar (para economizar espaço)
            const { photo, ...cleanRecord } = record;
            const newRecord = await supabaseService.addEvolutionRecord(userId, cleanRecord);

            return newRecord;
        },

        async update(userId: string, record: EvolutionRecord): Promise<void> {
            await supabaseService.updateEvolutionRecord(userId, record);
        },

        async delete(userId: string, recordId: string): Promise<void> {
            await supabaseService.deleteEvolutionRecord(userId, recordId);
        }
    },

    chat: {
        async getHistory(userId: string): Promise<ChatMessage[]> {
            return await supabaseService.getChatHistory(userId);
        },

        async saveMessages(userId: string, messages: ChatMessage[]): Promise<void> {
            await supabaseService.saveChatMessages(userId, messages);
        }
    },

    admin: {
        async getAllUsers(): Promise<User[]> {
            return await supabaseService.getAllUsers();
        },

        async getStats() {
            return await supabaseService.getRevenueStats();
        },

        async updateUserPlan(userId: string, planId: string): Promise<void> {
            await supabaseService.adminUpdateUserPlan(userId, planId);
        },

        async cancelUserSubscription(targetUserId: string): Promise<{ success: boolean; current_period_end: number; expiry_date: string }> {
            return await supabaseService.adminCancelUserSubscription(targetUserId);
        },

        async getUserDetails(targetUserId: string): Promise<supabaseService.AdminUserDetails> {
            return await supabaseService.adminGetUserDetails(targetUserId);
        }
    },

    usage: {
        // Lê o contador diário atual (apenas leitura — sem modificar)
        async getDaily(userId: string, type: 'food' | 'shape'): Promise<number> {
            return await supabaseService.getDailyUsage(userId, type);
        },
        // O incremento é feito atomicamente pela Edge Function ai-analyzer.
        // Não existe método de incremento no frontend por design de segurança.
    },

    gamification: {
        async getStats(userId: string): Promise<UserStats> {
            return await supabaseService.getUserStats(userId);
        },

        async updateStreak(userId: string): Promise<UserStats> {
            return await supabaseService.updateStreak(userId);
        }
    },

    subscription: {
        async getInfo(userId: string): Promise<SubscriptionInfo | null> {
            return await supabaseService.getSubscriptionInfo(userId);
        },

        async cancel(reason?: string, feedback?: string): Promise<{ cancel_at_period_end: boolean; current_period_end: number }> {
            return await supabaseService.cancelSubscription(reason, feedback);
        },

        async reactivate(): Promise<{ cancel_at_period_end: boolean; current_period_end: number }> {
            return await supabaseService.reactivateSubscription();
        }
    }
};
