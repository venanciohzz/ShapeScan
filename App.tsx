
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { View, User, FoodLog, EvolutionRecord, ChatMessage } from './types';
import { db } from './services/db';
import { supabase } from './services/supabaseService';
import { lazyRetry } from './src/utils/lazyRetry';

// Lazy loading for better performance
const LandingPage = React.lazy(() => lazyRetry(() => import('./components/LandingPage')));
const HowItWorks = React.lazy(() => lazyRetry(() => import('./components/HowItWorks')));
const About = React.lazy(() => lazyRetry(() => import('./components/About')));
const Dashboard = React.lazy(() => lazyRetry(() => import('./components/Dashboard')));
const FoodAnalyzer = React.lazy(() => lazyRetry(() => import('./components/FoodAnalyzer')));
const ShapeAnalyzer = React.lazy(() => lazyRetry(() => import('./components/ShapeAnalyzer')));
const PersonalIA = React.lazy(() => lazyRetry(() => import('./components/Personal24H')));
const Auth = React.lazy(() => lazyRetry(() => import('./components/Auth')));
const Navigation = React.lazy(() => lazyRetry(() => import('./components/Navigation')));
const CaloriePlan = React.lazy(() => lazyRetry(() => import('./components/CaloriePlan')));
const WaterCalculator = React.lazy(() => lazyRetry(() => import('./components/WaterCalculator')));
const OnboardingQuiz = React.lazy(() => lazyRetry(() => import('./components/onboarding/OnboardingQuiz')));
const PlanSelection = React.lazy(() => lazyRetry(() => import('./components/PlanSelection')));
const UpgradePro = React.lazy(() => lazyRetry(() => import('./components/UpgradePro')));
const Evolution = React.lazy(() => lazyRetry(() => import('./components/Evolution')));
const Settings = React.lazy(() => lazyRetry(() => import('./components/Settings')));
const SavedMeals = React.lazy(() => lazyRetry(() => import('./components/SavedMeals')));
const AdminDashboard = React.lazy(() => lazyRetry(() => import('./components/AdminDashboard')));
const AppDemo = React.lazy(() => lazyRetry(() => import('./components/AppDemo')));
const PasswordRecovery = React.lazy(() => lazyRetry(() => import('./components/PasswordRecovery')));
const ResetPassword = React.lazy(() => lazyRetry(() => import('./components/ResetPassword')));
import SuccessCelebration from './components/ui/SuccessCelebration';
const { BMICalculator, DailyCalorieCalculator } = { 
  BMICalculator: React.lazy(() => lazyRetry(() => import('./components/Calculators').then(m => ({ default: m.BMICalculator })))),
  DailyCalorieCalculator: React.lazy(() => lazyRetry(() => import('./components/Calculators').then(m => ({ default: m.DailyCalorieCalculator }))))
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const userRef = React.useRef<User | null>(null);
  // Ref para evitar que onAuthStateChange interfira durante o carregamento inicial
  const isSessionLoadingRef = React.useRef(true);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [evolutionRecords, setEvolutionRecords] = useState<EvolutionRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [waterConsumed, setWaterConsumed] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('shapescan_theme');
    return saved ? saved === 'dark' : true;
  });
  const [authMode, setAuthMode] = useState<'entrar' | 'registrar'>('entrar');
  const [currentView, setCurrentView] = useState<View>('landing'); // Keep for legacy but sync with route
  const [previousView, setPreviousView] = useState<View>('dashboard');

  /* estado novo */
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // 5s for better visibility on errors
  };

  // Sync currentView with route for navigation component
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setCurrentView('landing');
    else if (path === '/dashboard') setCurrentView('dashboard');
    else if (path === '/analise-refeicao') setCurrentView('food_ai');
    else if (path === '/analise-fisica') setCurrentView('shape');
    else if (path === '/evolucao') setCurrentView('evolution');
    else if (path === '/personal-24h') setCurrentView('chat');
    else if (path === '/configuracoes') setCurrentView('settings');
    else if (path === '/perfil') setCurrentView('settings');
    else if (path.startsWith('/entrar') || path.startsWith('/registrar')) setCurrentView('auth');
  }, [location]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
    // Reinforce scroll to top for mobile browsers after render
    const timer = setTimeout(() => window.scrollTo(0, 0), 100);
    
    // Meta Pixel PageView for SPA routing
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'PageView');
    }
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Handle Hash Errors (e.g. Email Confirmation Expired)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorMsg = params.get('error_description') || params.get('error') || 'Erro de autenticação';
      const errorCode = params.get('error_code');
      
      let displayMessage = errorMsg;
      if (errorCode === 'otp_expired' || errorMsg.toLowerCase().includes('expired')) {
        displayMessage = 'O link de confirmação de e-mail expirou ou já foi usado. Tente fazer login novamente.';
      }

      showToast(displayMessage, 'error');
      navigate('/entrar');
      
      // Clear hash from URL safely
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.search;
      window.history.replaceState(null, '', cleanUrl);
    }
  }, [location.hash, navigate]);

  // ============================================================
  // HANDLER DE RETORNO PÓS-PAGAMENTO STRIPE
  // Quando o Stripe redireciona para /dashboard?payment=success,
  // utilizamos polling com retry exponencial para aguardar o webhook
  // processar e ativar o plano (tolerante a latência do webhook).
  // ============================================================
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isPaymentSuccessParams = params.get('payment') === 'success';
    const isAwaitingStripePayment = localStorage.getItem('awaiting_stripe_payment') === 'true';

    // Dispara se veio do Stripe (URL param) OU se flag do localStorage constatar pending (fechou aba ou app)
    if ((isPaymentSuccessParams || isAwaitingStripePayment) && user) {
      console.log('[App] Retorno pós-pagamento detectado. Iniciando polling de ativação do plano...');

      // Polling com strict timeout de 60s (MAX_POLL_TIME = 60_000, POLL_INTERVAL = 3000)
      const pollForPremium = async () => {
        const MAX_POLL_TIME = 60_000;
        const POLL_INTERVAL = 3000;
        let elapsed = 0;
        
        const { getProfile } = await import('./services/supabaseService');

        const interval = setInterval(async () => {
          elapsed += POLL_INTERVAL;
          
          try {
            const updatedUser = await getProfile(user.id);
            console.log(`[App] Polling: Perfil recuperado. isPremium: ${updatedUser?.isPremium}, Plan: ${updatedUser?.plan}`);
            
            if (updatedUser) {
              setUser(updatedUser);
              localStorage.setItem('shapescan_user_profile', JSON.stringify(updatedUser));

              if (updatedUser.isPremium) {
                console.log(`[App] Plano premium ativado! (${elapsed / 1000}s)`);
                showToast('🎉 Pagamento confirmado! Seu plano premium está ativo.', 'success');
                clearInterval(interval);
                localStorage.removeItem('awaiting_stripe_payment');
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
              }
            }
            console.log(`[App] Plano ainda não ativo (${elapsed / 1000}s/60s). Aguardando...`);
          } catch (e) {
            console.error(`[App] Erro ao verificar plano:`, e);
          }

          if (elapsed >= MAX_POLL_TIME) {
            clearInterval(interval);
            console.log('[App] Fim do polling (timeout atingido).');
            showToast('Pagamento recebido! Aguarde alguns instantes e atualize a página.', 'info');
            localStorage.removeItem('awaiting_stripe_payment');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }, POLL_INTERVAL);
      };

      pollForPremium();

      if (isPaymentSuccessParams) {
        // Limpar o parâmetro da URL sem recarregar a página
        const cleanUrl = window.location.protocol + '//' + window.location.host + '/dashboard';
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, [location.search, user]);

  // Sincronizar userRef para uso em listeners e callbacks assíncronos
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ============================================================
  // 🛠️ FERRAMENTAS DE EMERGÊNCIA (AUTH FIX)
  // ============================================================
  const forceCleanSession = async () => {
    console.warn('[App] 🚨 Executando reset forçado de sessão...');
    
    // Deixar a biblioteca do Supabase cuidar da própria chave:
    await supabase.auth.signOut();
    
    localStorage.removeItem('shapescan_user_profile');
    sessionStorage.clear();
    
    setUser(null);
    setIsSessionLoading(false);
    navigate('/', { replace: true });
  };

  // Professional Optimization 1: Unified Session Loading (Removed stale cache)
  useEffect(() => {
    console.log('Auth Debug:', {
      hasToken: !!localStorage.getItem('supabase.auth.token')
    });

    const initSession = async () => {
      console.log('[App] 🚀 Iniciando initSession...');
      const startTime = Date.now();

      // Timers de expiração removidos a pedido do usuário


      try {
        console.log('[App] Buscando sessão atual...');

        // ============================================================
        // TIMEOUT DEFENSIVO: getSession compete com 8s de timeout.
        // Se o Supabase/rede demorar mais que isso, tratar como visitante.
        // Isso previne loading infinito em conexões lentas ou cold starts.
        // O safety timeout do useEffect (5s) continua como fallback final.
        // ============================================================
        // Use APENAS a sessão oficial do Supabase para inicializar
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          const authUser = data.session.user;
          console.log(`[App] Sessão Auth Válida encontrada:`, authUser.email);
          
          // Carrega o perfil do DB e só então libera o loading
          await loadProfileSafely(authUser.id, authUser.email || '');

          if (location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/entrar' || location.pathname === '/registrar') {
             navigate('/dashboard', { replace: true });
          }
        } else {
            console.log('[App] Nenhuma sessão ativa encontrada (Visitante).');
            localStorage.removeItem('shapescan_user_profile');
            const publicPaths = ['/', '/como-funciona', '/sobre', '/recuperar-senha', '/nova-senha'];
            if (!publicPaths.includes(location.pathname) && !location.pathname.startsWith('/entrar') && !location.pathname.startsWith('/registrar')) {
               navigate('/', { replace: true });
            }
        }
      } catch (e: any) {
        console.error("[App] ❌ Erro não tratado durante initSession:", e);
        setIsSessionLoading(false);
        isSessionLoadingRef.current = false;
      } finally {
        console.log(`[App] ✅ initSession finalizada.`);
      }
    };

    const loadProfileSafely = async (userId: string, email: string) => {
      try {
        const { getProfile } = await import('./services/supabaseService');
        const profile = await getProfile(userId);
        
        setUser(profile);
        localStorage.setItem('shapescan_user_profile', JSON.stringify(profile));
        
        // Se precisar preencher infos do form inicial
        if (!profile.weight || !profile.height) {
            navigate('/quiz', { replace: true });
        }
      } catch (err) {
        console.warn("[App] ⚠️ Erro ao carregar perfil do DB. Fallback ativado:", err);
        // Fallback seguro: O Client tá logado mas o BD falhou em dar os meta-dados
        const fallbackProfile = {
          id: userId,
          email: email,
          name: 'Usuário',
          username: 'usuario_' + userId.substring(0, 5),
          phone: '',
          isPremium: false,
          isAdmin: false,
          isPendingPayment: false,
          plan: 'free',
          dailyCalorieGoal: 2000,
        } as User;
        
        setUser(fallbackProfile);
      } finally {
        // Libera o loading DA SESSÃO E DA UI agora que o user (ou fallback) está definido
        setIsSessionLoading(false);
        isSessionLoadingRef.current = false;
      }
      
      // Continua carregando dados em BG
      loadUserDataBackground(userId);
    };

    const loadUserDataBackground = async (userId: string) => {
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
        console.error("Erro ao carregar dados em background:", e);
      }
    };

    initSession();
  }, []); // Apenas no mount

  // Separar o listener de eventos para não depender do ciclo do initSession
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log(`[App] 🔄 Auth Event: ${event}`, session ? `Sessão ativa: ${session.user.email}` : 'Sem sessão');

        // ⚠️ GUARD: Ignorar eventos durante o carregamento inicial da sessão.
        // O initSession já cuida do estado inicial. Reagir aqui causaria race condition.
        if (isSessionLoadingRef.current) {
          console.log(`[App] ⏳ Ignorando evento '${event}' durante initSession.`);
          return;
        }

        if (event === 'SIGNED_OUT') {
          console.log('[Auth] Usuário deslogado centralmente.');
          setUser(null);
          navigate('/', { replace: true });
        } else if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.user?.id) {
          // Evitar re-fetch se já temos o usuário com o mesmo ID (login explícito já fez o fetch)
          if (userRef.current?.id === session.user.id && event === 'SIGNED_IN') {
             console.log('[App] ℹ️ SIGNED_IN: perfil já carregado (mesmo userId). Pulando fetch redundante.');
             return;
          }

          console.log('[App] 🔄 Re-fetching perfil por evento:', event);
          try {
            const { getProfile } = await import('./services/supabaseService');
            const freshProfile = await getProfile(session.user.id);
            setUser(freshProfile);
            localStorage.setItem('shapescan_user_profile', JSON.stringify(freshProfile));
          } catch (e) {
            console.error('[App] onAuthStateChange: erro ao re-fetchar perfil:', e);
          }
        }
      }
    );

    // ============================================================
    // HARDENING FINAL: Sincronização entre abas (multi-tab logout)
    // Se o usuário deslogar numa aba, as outras abas recarregam p/ bloquear acesso
    // ============================================================
    const handleStorageChange = (event: StorageEvent) => {
      // Monitora o token oficial do supabase
      if (event.key?.includes('supabase.auth.token') && !event.newValue) {
         console.warn('[App] 🔄 Sync multi-tab: estado de logout detectado. Recarregando app...');
         window.location.assign('/');
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('[App] 🔌 Encerrando subscription do auth listener.');
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    }
  }, []); // Apenas no mount

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
    if (isNew || !user.weight || !user.height) {
      navigate('/quiz');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    // Limpar estado local 
    setUser(null);
    setFoodLogs([]);
    setEvolutionRecords([]);
    setChatHistory([]);
    setWaterConsumed(0);
    localStorage.removeItem('shapescan_user_profile');

    // Usar signOut oficial e esperar apenas o processo natural
    await supabase.auth.signOut();

    navigate('/', { replace: true });
  };

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
      navigate('/planos');
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
    // Atualizar Gamificação e Mostrar Celebração
    db.gamification.updateStreak(user.id)
      .then(() => setShowCelebration(true))
      .catch(err => console.error("Erro ao atualizar streak:", err));
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

      // Atualizar Gamificação e Mostrar Celebração
      db.gamification.updateStreak(user.id)
        .then(() => setShowCelebration(true))
        .catch(err => console.error("Erro ao atualizar streak:", err));
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
    const viewPathMap: Record<string, string> = {
      'landing': '/',
      'dashboard': '/dashboard',
      'food_ai': '/analise-refeicao',
      'food_manual': '/adicionar-manualmente',
      'shape': '/analise-fisica',
      'chat': '/personal-24h',
      'evolution': '/evolucao',
      'settings': '/configuracoes',
      'quiz': '/quiz',
      'plans': '/planos',
      'upgrade_pro': '/assinatura',
      'water_calc': '/meta-agua',
      'bmi_calc': '/imc',
      'calorie_calc': '/gasto-calorico',
      'calorie_plan': '/minha-meta',
      'saved_meals': '/refeicoes-salvas',
      'admin': '/admin'
    };
    
    const path = viewPathMap[view] || '/dashboard';
    navigate(path);
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#F3F6F8] dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Toast state moved up

  const renderView = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 flex flex-col"
        >
          <React.Suspense fallback={
            <div className="min-h-[100dvh] transition-opacity duration-300 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage onStart={() => { setAuthMode('registrar'); navigate('/registrar'); }} onLogin={() => { setAuthMode('entrar'); navigate('/entrar'); }} onHowItWorks={() => navigate('/como-funciona')} onAbout={() => navigate('/sobre')} />} />
              <Route path="/como-funciona" element={<HowItWorks onBack={() => navigate('/')} onRegister={() => { setAuthMode('registrar'); navigate('/registrar'); }} />} />
              <Route path="/sobre" element={<About onBack={() => navigate('/')} onRegister={() => { setAuthMode('registrar'); navigate('/registrar'); }} />} />
              <Route path="/entrar" element={<Auth initialMode="entrar" onLogin={handleLogin} onBack={() => navigate('/')} />} />
              <Route path="/registrar" element={<Auth initialMode="registrar" onLogin={handleLogin} onBack={() => navigate('/')} />} />
              <Route path="/recuperar-senha" element={<PasswordRecovery />} />
              <Route path="/nova-senha" element={<ResetPassword />} />

              {/* Protected Routes Wrapper */}
              <Route path="/*" element={user ? (
                <Routes>
                   <Route path="/quiz" element={<OnboardingQuiz onComplete={handleQuizComplete} isLoading={isQuizLoading} />} />
                   <Route path="/planos" element={<PlanSelection user={user} onBack={() => navigate('/dashboard')} onSelect={async (plan) => { if (plan === 'free') { const updated = await db.users.update(user.email, { isPremium: false, plan: 'free' }); setUser(updated); navigate('/dashboard'); } }} onShowToast={showToast} />} />
                   <Route path="/assinatura" element={<UpgradePro user={user} onBack={() => navigate('/dashboard')} onShowToast={showToast} />} />
                   <Route path="/dashboard" element={<Dashboard user={user} logs={foodLogs} onNavigate={navigateWithPremiumCheck} onLogout={handleLogout} onDeleteLog={removeFoodLog} onEditLog={editFoodLog} waterConsumed={waterConsumed || 0} setWaterConsumed={setWaterConsumed} onShowToast={showToast} />} />
                   <Route path="/analise-refeicao" element={<FoodAnalyzer mode="ai" user={user} onAdd={addFoodLog} onBack={() => navigate('/dashboard')} onUpdateUser={refreshUser} onUpgrade={() => navigate('/planos')} onUpgradePro={() => navigate('/assinatura')} onShowToast={showToast} />} />
                   <Route path="/adicionar-manualmente" element={<FoodAnalyzer mode="manual" user={user} onAdd={addFoodLog} onBack={() => navigate('/dashboard')} onUpdateUser={refreshUser} onUpgrade={() => navigate('/planos')} onUpgradePro={() => navigate('/assinatura')} onShowToast={showToast} />} />
                   <Route path="/refeicoes-salvas" element={<SavedMeals user={user} onAddLog={addFoodLog} onBack={() => navigate('/dashboard')} onShowToast={showToast} />} />
                   <Route path="/analise-fisica" element={<ShapeAnalyzer user={user} onBack={() => navigate('/dashboard')} onSaveToEvolution={(data) => addEvolutionRecord({ ...data, date: Date.now() })} onUpgrade={() => navigate('/planos')} onUpgradePro={() => navigate('/assinatura')} onShowToast={showToast} />} />
                   <Route path="/personal-24h" element={<PersonalIA user={user} logs={foodLogs} evolution={evolutionRecords} onBack={() => navigate('/dashboard')} messages={chatHistory} setMessages={setChatHistory} onUpgrade={() => navigate('/planos')} onShowToast={showToast} />} />
                   <Route path="/evolucao" element={<Evolution user={user} records={evolutionRecords} logs={foodLogs} onBack={() => navigate('/dashboard')} onAdd={addEvolutionRecord} onDelete={deleteEvolutionRecord} onEdit={editEvolutionRecord} onUpgrade={() => navigate('/planos')} />} />
                   <Route path="/imc" element={<BMICalculator onBack={() => navigate('/dashboard')} />} />
                   <Route path="/gasto-calorico" element={<DailyCalorieCalculator onBack={() => navigate('/dashboard')} />} />
                   <Route path="/minha-meta" element={<CaloriePlan user={user} onBack={() => navigate('/dashboard')} onUpdateGoal={handleUpdateGoal} />} />
                   <Route path="/meta-agua" element={<WaterCalculator user={user} onBack={() => navigate('/dashboard')} onUpdateWaterGoal={handleUpdateWaterGoal} />} />
                   <Route path="/perfil" element={<Settings user={user} onUpdateProfile={handleUpdateProfile} onBack={() => navigate('/dashboard')} darkMode={darkMode} toggleTheme={() => setDarkMode(!darkMode)} onGoToAdmin={() => navigate('/admin')} />} />
                   <Route path="/configuracoes" element={<Settings user={user} onUpdateProfile={handleUpdateProfile} onBack={() => navigate('/dashboard')} darkMode={darkMode} toggleTheme={() => setDarkMode(!darkMode)} onGoToAdmin={() => navigate('/admin')} />} />
                   <Route path="/admin" element={<AdminDashboard user={user} onBack={() => navigate('/configuracoes')} onShowToast={showToast} />} />
                   <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              ) : <Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </motion.div>
      </AnimatePresence>
    );
  };

  const hideNavPaths = ['/', '/como-funciona', '/sobre', '/entrar', '/registrar', '/quiz', '/planos', '/assinatura', '/meta-agua', '/gasto-calorico', '/imc', '/minha-meta', '/refeicoes-salvas', '/personal-24h'];
  const showMobileNav = user && !hideNavPaths.includes(location.pathname);

  return (
    <div className="relative min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-[#F3F6F8] dark:bg-zinc-950 text-gray-900 dark:text-white transition-colors duration-500">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-emerald-50/20 dark:from-zinc-950 dark:via-zinc-900 dark:to-black transition-colors duration-500" />
        <div className="absolute inset-0 grid-bg opacity-40 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal" />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className={`relative z-10 min-h-[100dvh] flex flex-col ${showMobileNav ? 'pb-32 md:pb-0' : ''} overflow-x-hidden`}>
        {renderView()}
      </div>
      <SuccessCelebration show={showCelebration} onComplete={() => setShowCelebration(false)} />
      {showMobileNav && <Navigation currentView={currentView} />}

      {/* Botão de Emergência Oculto (Debug/Fix) */}
      {(import.meta as any).env?.DEV && (
        <div className="fixed bottom-0 right-0 p-4 opacity-5 hover:opacity-100 transition-opacity z-[9999]">
          <button 
            onClick={forceCleanSession}
            className="text-[10px] bg-red-500/20 text-red-500 px-2 py-1 rounded border border-red-500/50"
          >
            Resetar sessão
          </button>
        </div>
      )}
    </div>
  );
};

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  const bg = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-5 duration-300 w-full max-w-sm px-4">
      <div className={`${bg} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md bg-opacity-90 border border-white/20`}>
        <span className="text-xl">{icon}</span>
        <p className="font-bold text-sm tracking-wide flex-1">{message}</p>
        <button onClick={onClose} className="opacity-70 hover:opacity-100 font-bold">✕</button>
      </div>
    </div>
  );
};

export default App;
