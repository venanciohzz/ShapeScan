
import { User, FoodLog, EvolutionRecord, ChatMessage, SavedMeal } from '../types';
import * as supabaseService from './supabaseService';

const ADMIN_EMAIL = 'contatobielaz@gmail.com';

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
        }
    },

    users: {
        async get(email: string): Promise<User> {
            const session = await supabaseService.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            const user = await supabaseService.getProfile(session.id);

            // Garantir que admin tenha privilégios
            if (user.email === ADMIN_EMAIL && (!user.isPremium || !user.isAdmin)) {
                user.isAdmin = true;
                user.isPremium = true;
                user.plan = 'lifetime';
                await this.update(user.email, user);
            }

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

            // Incrementar contador de uso
            const session = await supabaseService.getSession();
            if (session && !session.isPremium) {
                await supabaseService.incrementUsage(userId, 'food');
            }

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

            // Incrementar contador de uso
            const session = await supabaseService.getSession();
            if (session && !session.isPremium) {
                await supabaseService.incrementUsage(userId, 'shape');
            }

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
            // Chat history não está sendo persistido no Supabase ainda
            return [];
        },

        async saveHistory(userId: string, messages: ChatMessage[]) {
            // Chat history não está sendo persistido no Supabase ainda
        }
    }
};
