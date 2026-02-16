
import React, { useState, useEffect } from 'react';
import { View, User, FoodLog, EvolutionRecord, ChatMessage } from './types';
import LandingPage from './components/LandingPage';
import HowItWorks from './components/HowItWorks';
import About from './components/About';
import Dashboard from './components/Dashboard';
import FoodAnalyzer from './components/FoodAnalyzer';
import ShapeAnalyzer from './components/ShapeAnalyzer';
import CoachChat from './components/CoachChat';
import Auth from './components/Auth';
import Navigation from './components/Navigation';
import { BMICalculator, DailyCalorieCalculator } from './components/Calculators';
import CaloriePlan from './components/CaloriePlan';
import WaterCalculator from './components/WaterCalculator';
import Quiz from './components/Quiz';
import PlanSelection from './components/PlanSelection';
import UpgradePro from './components/UpgradePro';
import Evolution from './components/Evolution';
import Settings from './components/Settings';
import SavedMeals from './components/SavedMeals';
import { db } from './services/db';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [evolutionRecords, setEvolutionRecords] = useState<EvolutionRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [waterConsumed, setWaterConsumed] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('shapescan_theme');
    return saved ? saved === 'dark' : true;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentView, setCurrentView] = useState<View>('landing');
  const [previousView, setPreviousView] = useState<View>('dashboard');

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  useEffect(() => {
    const initSession = async () => {
      try {
        const sessionUser = await db.auth.getSession();
        if (sessionUser) {
          const freshUser = await db.users.get(sessionUser.email);

          let needsUpdate = false;
          const updates: Partial<User> = {};

          // Calculate Macros if ANY is missing (ensures carbs/fat are set for legacy users)
          // Fix: Check for undefined specifically, allowing 0 as a valid goal (e.g. Keto)
          if ((freshUser.dailyProtein === undefined || freshUser.dailyCarbs === undefined || freshUser.dailyFat === undefined) && freshUser.weight) {
            const protein = Math.round(freshUser.weight * 2); // 2g/kg
            const fat = Math.round(freshUser.weight * 0.8); // 0.8g/kg
            const proteinCal = protein * 4;
            const fatCal = fat * 9;
            const remainCal = freshUser.dailyCalorieGoal - (proteinCal + fatCal);
            const carbs = Math.max(0, Math.round(remainCal / 4));

            updates.dailyProtein = freshUser.dailyProtein !== undefined ? freshUser.dailyProtein : protein;
            updates.dailyFat = freshUser.dailyFat !== undefined ? freshUser.dailyFat : fat;
            updates.dailyCarbs = freshUser.dailyCarbs !== undefined ? freshUser.dailyCarbs : carbs;
            needsUpdate = true;
          }

          // Initialize freeScansUsed for legacy users
          if (freshUser.freeScansUsed === undefined) {
            updates.freeScansUsed = 0;
            needsUpdate = true;
          }

          let finalUser = freshUser;
          if (needsUpdate) {
            finalUser = await db.users.update(freshUser.email, updates);
          }

          setUser(finalUser);
          await loadUserData(freshUser.id);

          // CRITICAL CHECK: Force Quiz if metrics are missing (e.g., user refreshed during onboarding)
          if (!freshUser.weight || !freshUser.height) {
            setCurrentView('quiz');
          } else {
            setCurrentView('dashboard');
          }

        } else {
          setCurrentView('landing');
        }
      } catch (e) {
        console.error("Erro ao restaurar sessão:", e);
        setUser(null);
        setCurrentView('landing');
      } finally {
        setIsSessionLoading(false);
      }
    };
    initSession();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const [logs, evo, water] = await Promise.all([
        db.logs.list(userId),
        db.evolution.list(userId),
        db.water.getDaily(userId)
      ]);
      setFoodLogs(logs);
      setEvolutionRecords(evo);
      setWaterConsumed(water);

    } catch (e) {
      console.error("Erro ao carregar dados do usuário:", e);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('shapescan_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('shapescan_theme', 'light');
    }
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.removeAttribute('media');
      metaThemeColor.setAttribute('content', darkMode ? '#09090b' : '#F3F6F8');
    }
  }, [darkMode]);

  // Debounce saved to DB to avoid too many requests
  useEffect(() => {
    if (waterConsumed === null) return;

    const timeoutId = setTimeout(() => {
      if (user) {
        db.water.upsertDaily(user.id, waterConsumed, user.dailyWaterGoal || 2500);
      }
    }, 1000); // Wait 1s after last change

    return () => clearTimeout(timeoutId);
  }, [waterConsumed, user]);

  const handleLogin = (user: User, isNew: boolean) => {
    setUser(user);
    loadUserData(user.id);
    if (isNew) {
      setCurrentView('quiz');
    } else {
      // Logic handled in initSession mostly, but here specifically:
      if (!user.weight || !user.height) {
        setCurrentView('quiz');
      } else {
        setCurrentView('dashboard');
      }
    }
  };

  const handleLogout = async () => {
    await db.auth.setSession(null);
    setUser(null);
    setFoodLogs([]);
    setEvolutionRecords([]);
    setChatHistory([]);
    setWaterConsumed(0);
    setCurrentView('landing');
  };

  /* estado novo */
  const [isQuizLoading, setIsQuizLoading] = useState(false);

  // ... (código existente)

  const handleQuizComplete = async (metrics: Partial<User>) => {
    if (!user) {
      alert("Erro: Usuário não identificado. Tente fazer login novamente.");
      return;
    }

    setIsQuizLoading(true);
    try {
      const { age, height, weight, gender, goal, activityLevel } = metrics;
      const activityFactor = parseFloat(activityLevel || '1.2');
      let bmr = 0;
      if (gender === 'male') {
        bmr = 10 * (weight || 0) + 6.25 * (height || 0) - 5 * (age || 0) + 5;
      } else {
        bmr = 10 * (weight || 0) + 6.25 * (height || 0) - 5 * (age || 0) - 161;
      }
      let tdee = bmr * activityFactor;
      let calorieGoal = tdee;
      if (goal === 'lose') calorieGoal -= 500;
      if (goal === 'gain') calorieGoal += 300;
      const waterGoal = Math.round((weight || 70) * 35);

      // Macro Calculation
      const w = weight || 70;
      const protein = Math.round(w * 2);
      const fat = Math.round(w * 0.8);
      const pCal = protein * 4;
      const fCal = fat * 9;
      const carbs = Math.max(0, Math.round((calorieGoal - pCal - fCal) / 4));

      const updates: any = {
        ...metrics,
        dailyCalorieGoal: Math.round(calorieGoal),
        dailyWaterGoal: waterGoal,
        dailyProtein: protein,
        dailyCarbs: carbs,
        dailyFat: fat,
        // Remover atualização de plano aqui, pois é controlada pela tabela user_plans
        // plan: (user.isAdmin ? 'lifetime' : 'free') as any, // REMOVIDO PARA EVITAR ERRO
        freeScansUsed: user.freeScansUsed || 0
      };

      const updatedUser = await db.users.update(user.email, updates);
      setUser(updatedUser);
      setCurrentView('plans');
    } catch (error: any) {
      console.error("Erro no Quiz:", error);
      alert("Erro ao salvar dados: " + (error.message || "Tente novamente."));
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleUpdateGoal = async (newGoal: number, metrics: Partial<User>) => {
    if (user) {
      const w = metrics.weight || user.weight || 70;
      const protein = Math.round(w * 2);
      const fat = Math.round(w * 0.8);
      const carbs = Math.max(0, Math.round((newGoal - (protein * 4) - (fat * 9)) / 4));

      const updatedUser = await db.users.update(user.email, {
        ...metrics,
        dailyCalorieGoal: newGoal,
        dailyProtein: protein,
        dailyFat: fat,
        dailyCarbs: carbs
      });
      setUser(updatedUser);
    }
  };

  const handleUpdateWaterGoal = async (newWaterGoal: number) => {
    if (user) {
      const updatedUser = await db.users.update(user.email, { dailyWaterGoal: newWaterGoal });
      setUser(updatedUser);
    }
  }

  const handleUpdateProfile = async (data: Partial<User>) => {
    if (user) {
      const updatedUser = await db.users.update(user.email, data);
      setUser(updatedUser);
    }
  };

  // Used by components to update local user state (e.g. usage counts)
  const refreshUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const addFoodLog = async (logData: Omit<FoodLog, 'id' | 'timestamp'>) => {
    if (!user) return;
    const newLog = await db.logs.add(user.id, logData);
    setFoodLogs(prev => [newLog, ...prev]);
  };

  const removeFoodLog = async (id: string) => {
    if (!user) return;
    await db.logs.delete(user.id, id);
    setFoodLogs(prev => prev.filter(log => log.id !== id));
  };

  const editFoodLog = async (updatedLog: FoodLog) => {
    if (!user) return;
    await db.logs.update(user.id, updatedLog);
    setFoodLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  };

  const addEvolutionRecord = async (recordData: Omit<EvolutionRecord, 'id'>) => {
    if (!user) {
      console.error('❌ addEvolutionRecord: Usuário não encontrado');
      return;
    }

    try {
      console.log('📊 Salvando evolução:', recordData);

      // FIX: Usar user.id (UUID) ao invés de user.email
      const newRecord = await db.evolution.add(user.id, recordData);

      console.log('✅ Evolução salva no banco:', newRecord);

      setEvolutionRecords(prev => {
        const updated = [newRecord, ...prev];
        console.log('📈 Estado atualizado. Total de registros:', updated.length);
        return updated;
      });
    } catch (error) {
      console.error('❌ Erro ao salvar evolução:', error);
      alert('Erro ao salvar evolução: ' + (error as Error).message);
    }
  };

  const deleteEvolutionRecord = async (id: string) => {
    if (!user) return;
    await db.evolution.delete(user.id, id);
    setEvolutionRecords(prev => prev.filter(r => r.id !== id));
  };

  const editEvolutionRecord = async (updatedRecord: EvolutionRecord) => {
    if (!user) return;
    await db.evolution.update(user.id, updatedRecord);
    setEvolutionRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const navigateWithPremiumCheck = (view: View) => {
    const premiumViews: View[] = ['chat'];
    // Shape and Food AI have internal limit logic now, so we let them enter the view
    // Chat remains blocked for free users or handled internally? Let's handle check inside component or keep it simple.
    // For now, allow navigation to all views, let components handle specific blocks.
    setCurrentView(view);
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#F3F6F8] dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'landing': return <LandingPage onStart={() => { setAuthMode('register'); setCurrentView('auth'); }} onLogin={() => { setAuthMode('login'); setCurrentView('auth'); }} onHowItWorks={() => setCurrentView('how_it_works')} onAbout={() => setCurrentView('about')} />;
      case 'how_it_works': return <HowItWorks onBack={() => setCurrentView('landing')} onRegister={() => { setAuthMode('register'); setCurrentView('auth'); }} />;
      case 'about': return <About onBack={() => setCurrentView('landing')} onRegister={() => { setAuthMode('register'); setCurrentView('auth'); }} />;
      case 'auth': return <Auth initialMode={authMode} onLogin={handleLogin} onBack={() => setCurrentView('landing')} />;
      case 'quiz': return <Quiz onComplete={handleQuizComplete} isLoading={isQuizLoading} />;
      case 'plans': return <PlanSelection user={user} onBack={() => setCurrentView(previousView || 'dashboard')} onSelect={async (plan) => { if (plan === 'free' && user) { const updated = await db.users.update(user.email, { isPremium: false, plan: 'free' }); setUser(updated); setCurrentView('dashboard'); } }} />;
      case 'upgrade_pro': return <UpgradePro user={user} onBack={() => setCurrentView(previousView || 'dashboard')} />;
      case 'dashboard': return <Dashboard user={user!} logs={foodLogs} onNavigate={navigateWithPremiumCheck} onLogout={handleLogout} onDeleteLog={removeFoodLog} onEditLog={editFoodLog} waterConsumed={waterConsumed || 0} setWaterConsumed={setWaterConsumed} />;
      case 'food_ai': return <FoodAnalyzer mode="ai" user={user!} onAdd={addFoodLog} onBack={() => setCurrentView('dashboard')} onUpdateUser={refreshUser} onUpgrade={() => setCurrentView('plans')} onUpgradePro={() => setCurrentView('upgrade_pro')} />;
      case 'food_manual': return <FoodAnalyzer mode="manual" user={user!} onAdd={addFoodLog} onBack={() => setCurrentView('dashboard')} onUpdateUser={refreshUser} onUpgrade={() => setCurrentView('plans')} onUpgradePro={() => setCurrentView('upgrade_pro')} />;
      case 'saved_meals': return <SavedMeals user={user!} onAddLog={addFoodLog} onBack={() => setCurrentView('dashboard')} />;
      case 'shape': return <ShapeAnalyzer user={user!} onBack={() => setCurrentView('dashboard')} onSaveToEvolution={(data) => addEvolutionRecord({ ...data, date: Date.now() })} onUpgrade={() => setCurrentView('plans')} onUpgradePro={() => setCurrentView('upgrade_pro')} />;
      case 'chat': return <CoachChat user={user!} logs={foodLogs} evolution={evolutionRecords} onBack={() => setCurrentView('dashboard')} messages={chatHistory} setMessages={setChatHistory} onUpgrade={() => setCurrentView('plans')} />;
      case 'evolution': return <Evolution user={user!} records={evolutionRecords} onBack={() => setCurrentView('dashboard')} onAdd={addEvolutionRecord} onDelete={deleteEvolutionRecord} onEdit={editEvolutionRecord} onUpgrade={() => setCurrentView('plans')} />;
      case 'bmi_calc': return <BMICalculator onBack={() => setCurrentView('dashboard')} />;
      case 'calorie_calc': return <DailyCalorieCalculator onBack={() => setCurrentView('dashboard')} />;
      case 'calorie_plan': return <CaloriePlan user={user!} onBack={() => setCurrentView('dashboard')} onUpdateGoal={handleUpdateGoal} />;
      case 'water_calc': return <WaterCalculator user={user!} onBack={() => setCurrentView('dashboard')} onUpdateWaterGoal={handleUpdateWaterGoal} />;
      case 'settings': return <Settings user={user!} onUpdateProfile={handleUpdateProfile} onBack={() => setCurrentView('dashboard')} darkMode={darkMode} toggleTheme={() => setDarkMode(!darkMode)} />;
      default: return <Dashboard user={user!} logs={foodLogs} onNavigate={navigateWithPremiumCheck} onLogout={handleLogout} onDeleteLog={removeFoodLog} onEditLog={editFoodLog} waterConsumed={waterConsumed || 0} setWaterConsumed={setWaterConsumed} />;
    }
  };

  const hideNavViews: View[] = ['landing', 'how_it_works', 'about', 'auth', 'quiz', 'plans', 'upgrade_pro', 'water_calc', 'calorie_calc', 'bmi_calc', 'calorie_plan', 'saved_meals'];
  const showMobileNav = user && !hideNavViews.includes(currentView);

  return (
    <div className="relative min-h-[100dvh] bg-[#F3F6F8] dark:bg-zinc-950 text-gray-900 dark:text-white transition-colors duration-500">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-emerald-50/20 dark:from-zinc-950 dark:via-zinc-900 dark:to-black transition-colors duration-500" />
        <div className="absolute inset-0 grid-bg opacity-40 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal" />
      </div>
      <div className={`relative z-10 min-h-[100dvh] flex flex-col ${showMobileNav ? 'pb-32 md:pb-0' : ''}`}>
        {renderView()}
      </div>
      {showMobileNav && <Navigation currentView={currentView} onNavigate={navigateWithPremiumCheck} />}
    </div>
  );
};

export default App;
