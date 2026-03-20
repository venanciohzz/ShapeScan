import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Aumenta o limite de aviso para chunks grandes (three.js é grande por design)
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // Manual chunking: isola bibliotecas pesadas do bundle inicial
          manualChunks: (id) => {
            // Three.js isolado — o maior gargalo (~500KB)
            if (id.includes('node_modules/three')) {
              return 'vendor-three';
            }
            // Framer Motion — pesado e só necessário em rotas com animações
            if (id.includes('node_modules/framer-motion')) {
              return 'vendor-framer';
            }
            // Stripe — só necessário em rotas de pagamento
            if (id.includes('node_modules/@stripe') || id.includes('node_modules/stripe')) {
              return 'vendor-stripe';
            }
            // Supabase — necessário mas pode ser chunk separado do app
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
            // Lucide icons — muito ícones = bundle grande
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            // React e bibliotecas de routing — essenciais no bundle inicial
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
          },
        }
      }
    },
  };
});
