<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ShapeScan - AI-Powered Nutrition & Fitness Tracker

Aplicativo de análise nutricional e acompanhamento fitness com IA, integrado com Supabase para persistência de dados.

## Tecnologias

- **Frontend**: React + TypeScript + Vite
- **IA**: Google Gemini API
- **Backend**: Supabase (PostgreSQL + Auth)
- **Estilo**: CSS Vanilla

## Funcionalidades

✅ Análise de refeições por foto com IA  
✅ Análise corporal (shape) com IA  
✅ Histórico de refeições e evolução  
✅ Refeições favoritas  
✅ Chat com personal trainer IA  
✅ Calculadoras (IMC, calorias, água)  
✅ Sistema de planos (Free/Premium)  
✅ Controle de limites de uso  

## Configuração Local

### Pré-requisitos

- Node.js (v18+)
- Conta no Supabase
- Chave API do Google Gemini

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Edite o arquivo [.env.local](.env.local) com suas credenciais:

```env
# Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima

# Google Gemini
GEMINI_API_KEY=sua_chave_gemini
```

**Como obter as credenciais do Supabase:**
1. Acesse [supabase.com](https://supabase.com)
2. Crie um projeto (ou use existente)
3. Vá em Settings > API
4. Copie a URL e a chave `anon/public`

### 3. Executar Aplicação

```bash
npm run dev
```

Acesse: `http://localhost:3000`

### 4. Build para Produção

```bash
npm run build
```

## Estrutura do Banco de Dados

O projeto utiliza as seguintes tabelas no Supabase:

- `profiles` - Dados dos usuários
- `food_logs` - Histórico de refeições
- `saved_meals` - Refeições favoritas
- `evolution_records` - Registros de evolução corporal
- `user_plans` - Planos de assinatura
- `user_usage` - Controle de uso diário
- `plans` - Definição dos planos
- `payments` - Histórico de pagamentos

Todas as tabelas possuem Row Level Security (RLS) habilitado para proteção de dados.

## Arquitetura

```
shapescan/
├── services/
│   ├── supabaseService.ts  # Integração com Supabase
│   ├── db.ts               # Camada de abstração de dados
│   └── paymentService.ts   # Serviço de pagamentos
├── components/             # Componentes React
├── utils/                  # Utilitários
└── types.ts               # Definições TypeScript
```

## Segurança

- ✅ Autenticação via Supabase Auth
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Proteção de dados por usuário
- ✅ Validação de limites de uso

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

## Licença

Proprietary - Todos os direitos reservados
