
export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  weight: number;
}

export interface SavedMeal {
  id: string;
  userId: string;
  name: string;
  items: FoodItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weight: number;
}

export interface FoodLog {
  id: string;
  userId?: string;
  name: string;
  items: FoodItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weight: number;
  timestamp: number;
}

export interface EvolutionRecord {
  id: string;
  userId?: string;
  date: number;
  weight?: number;
  height?: number;
  bf?: number | string;
  photo?: string; // Optional now, usually not saved to DB to save space
  notes?: string;
  detailedAnalysis?: string; // New: Text analysis
  pointsToImprove?: string; // New: Specific feedback
  macroSuggestions?: string; // New: Diet advice
}

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  phone?: string; 
  photo?: string; 
  isPremium: boolean;
  isAdmin: boolean;
  dailyCalorieGoal: number;
  dailyWaterGoal?: number;
  // Macro Goals
  dailyProtein?: number;
  dailyCarbs?: number;
  dailyFat?: number;
  
  age?: number;
  height?: number;
  weight?: number;
  gender?: 'male' | 'female';
  goal?: 'lose' | 'maintain' | 'gain' | 'recomp';
  activityLevel?: string;
  plan?: 'free' | 'monthly' | 'annual' | 'lifetime' | 'pro_monthly' | 'pro_annual'; // Updated Plan Types
  freeScansUsed?: number; // Tracks total food scans for free users (Limit 1)
  createdAt?: number;
}

export interface ShapeAnalysisResult {
  bfPercentage: string;
  biotype: string;
  fatDistribution: string;
  muscleMass: string;
  definition: string;
  fatMassWeight?: string;
  detailedAnalysis: string;
  pointsToImprove: string; // New
  macroSuggestions: string; // New
  coachAdvice: string;
  fatScore: number;
  muscleScore: number;
  definitionScore: number;
  fatContext: string;
  muscleContext: string;
  definitionContext: string;
  proportions: {
    arms: string;
    chest: string;
    abs: string;
    legs: string;
  };
}

export interface FoodAnalysisResult {
  items: FoodAnalysisItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalWeight: number;
  reasoning: string;
}

export interface FoodAnalysisItem {
  name: string;
  weight: number;
  calories: number;
  weightUnit?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type View = 'landing' | 'how_it_works' | 'about' | 'dashboard' | 'food_ai' | 'food_manual' | 'saved_meals' | 'shape' | 'chat' | 'auth' | 'bmi_calc' | 'calorie_calc' | 'calorie_plan' | 'water_calc' | 'upgrade' | 'upgrade_pro' | 'quiz' | 'plans' | 'evolution' | 'settings';
