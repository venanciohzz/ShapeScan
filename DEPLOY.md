# 🚀 Guia de Deploy na Vercel - ShapeScan

Este guia te ajudará a fazer deploy do ShapeScan na Vercel em poucos minutos.

## Pré-requisitos

- ✅ Projeto já está no GitHub: https://github.com/venanciohzz/ShapeScan
- ✅ Conta na Vercel (crie em https://vercel.com se ainda não tiver)
- ✅ Suas chaves de API (Supabase e Gemini)

## Passo a Passo

### 1. Acessar a Vercel

1. Acesse https://vercel.com
2. Faça login com sua conta GitHub
3. Clique em **"Add New..."** → **"Project"**

### 2. Importar o Repositório

1. Procure por **"ShapeScan"** na lista de repositórios
2. Clique em **"Import"**

### 3. Configurar o Projeto

Na tela de configuração:

1. **Framework Preset**: Vercel deve detectar automaticamente como **"Vite"**
2. **Root Directory**: deixe como `./` (raiz do projeto)
3. **Build Command**: `npm run build` (já configurado)
4. **Output Directory**: `dist` (já configurado)

### 4. Configurar Variáveis de Ambiente ⚠️ IMPORTANTE

Clique em **"Environment Variables"** e adicione as seguintes variáveis:

| Nome | Valor | Onde encontrar |
|------|-------|----------------|
| `VITE_SUPABASE_URL` | Sua URL do Supabase | Painel do Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Sua chave anon do Supabase | Painel do Supabase → Settings → API |
| `VITE_GEMINI_API_KEY` | Sua chave da API Gemini | Google AI Studio |

**Como adicionar:**
1. Digite o **nome** da variável (ex: `VITE_SUPABASE_URL`)
2. Cole o **valor** correspondente
3. Clique em **"Add"**
4. Repita para todas as 3 variáveis

### 5. Fazer Deploy

1. Clique em **"Deploy"**
2. Aguarde 1-2 minutos enquanto a Vercel:
   - Instala as dependências (`npm install`)
   - Compila o projeto (`npm run build`)
   - Faz deploy do site

### 6. Verificar o Deploy

1. Quando terminar, você verá uma tela de **"Congratulations!"**
2. Clique em **"Visit"** para ver seu site no ar! 🎉
3. Sua URL será algo como: `https://shapescan-xxx.vercel.app`

## Configurações Adicionais (Opcional)

### Domínio Personalizado

1. No painel da Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio personalizado
3. Configure o DNS conforme instruções da Vercel

### Configurar Domínio de Produção

1. Vá em **Settings** → **Domains**
2. Defina qual domínio será o principal

## Atualizações Futuras

Sempre que você fizer `git push` para o GitHub, a Vercel automaticamente:
- Detecta as mudanças
- Faz rebuild do projeto
- Atualiza o site em produção

**Sem necessidade de fazer deploy manual novamente!** 🚀

## Troubleshooting

### Build falhou?

1. Verifique os logs de build na Vercel
2. Certifique-se de que todas as variáveis de ambiente foram adicionadas
3. Verifique se os nomes das variáveis estão corretos (com `VITE_` no início)

### Site carrega mas não funciona?

1. Abra o **Console do navegador** (F12)
2. Verifique se há erros relacionados a variáveis de ambiente
3. Confirme que as chaves de API estão corretas na Vercel

### Precisa atualizar variáveis de ambiente?

1. Vá em **Settings** → **Environment Variables**
2. Edite ou adicione novas variáveis
3. Clique em **"Redeploy"** para aplicar as mudanças

## Suporte

- Documentação Vercel: https://vercel.com/docs
- Suporte Vercel: https://vercel.com/support

---

**Pronto!** Seu ShapeScan estará online e pronto para vender! 💰
