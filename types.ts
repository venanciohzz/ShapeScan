
export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  weight: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
  velocity?: number | null;
  impediments?: string[];
  conquests?: string[];
  targetWeight?: number | null;
  createdAt?: number;
}

export interface ShapeAnalysisResult {
  structural_analysis: {
    name: string;
    meaning: string;
    structural_advantage: string;
    structural_challenge: string;
    genetic_responsiveness: string; // New: Volume vs Intensity
    fat_storage_tendency: string; // New: Regional storage
    structural_limitation_strategy: string; // New: Tactical bypass
  };
  weight_metrics?: {
    bmi: number;
    lean_mass_kg: number;
    fat_mass_kg: number;
    current_weight: number;
  };
  target_projections?: {
    weight_at_15_bf: number;
    weight_at_12_bf: number;
    weight_at_10_bf: number;
  };
  body_fat_range: string;
  bf_classification: string;
  bf_confidence: string; // New: Baixa/Moderada/Alta
  bf_visual_justification: string; // New: Sinais reais detectados
  shape_score: number;
  muscle_score: number;
  definition_score: number;
  fat_score: number;
  regional_analysis: {
    trunk: string;
    arms: string;
    abs_waist: string;
    legs: string;
  };
  structural_potential: string;
  future_projection: string;
  bf_timeline: { day: number; bf: number }[]; // For the line chart
  estimated_time_frame: string;
  strategic_plan: string[];
  diet_recommendation: string;
  nutritional_protocol: {
    caloric_strategy: string; // e.g., "Déficit de 20%"
    protein_target: string; // e.g., "2.2g/kg (180g)"
    distribution: string; // e.g., "4-5 refeições"
    practical_guidelines: string[];
  };
  coach_insight: {
    aesthetic_diagnosis: string;
    main_leverage: string;
    smart_strategy: string;
  };
  coach_comment: string; // Keep as fallback/summary
  execution_strategy: {
    training_focus: string[];
    nutrition_focus: string;
    time_expectation: string;
    common_mistakes: string[]; // 4 to 6 items
    primary_focus_next_60_days: string;
  };
}

export interface FoodAnalysisResult {
  mealName: string;
  items: FoodAnalysisItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalWeight: number;
  score: number;
  reasoning: string;
}

export interface FoodAnalysisItem {
  name: string;
  weight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weightUnit?: string;
  confidence?: string; // New: Baixa/Moderada/Alta
  observation?: string; // New: Justificativa visual
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type View = 'landing' | 'how_it_works' | 'about' | 'dashboard' | 'food_ai' | 'food_manual' | 'saved_meals' | 'shape' | 'chat' | 'auth' | 'bmi_calc' | 'calorie_calc' | 'calorie_plan' | 'water_calc' | 'upgrade' | 'upgrade_pro' | 'quiz' | 'plans' | 'evolution' | 'settings' | 'admin';
