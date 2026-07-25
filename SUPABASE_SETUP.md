# Configuração do Supabase — VM Life ARCHIVE

## Variáveis na Vercel (obrigatórias)

Em **Project → Settings → Environment Variables**:

| Nome | Valor | Observação |
|------|-------|------------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Público |
| `SUPABASE_ANON_KEY` | chave `anon` / publishable | Público |

**Nunca** adicione `service_role`, senha do banco ou tokens privados.

### Como a configuração chega ao navegador

1. **Build na Vercel** (`vercel.json` → `buildCommand`): `node scripts/generate-config.js` grava `config.generated.js` com URL + anon key.
2. **Runtime**: se o arquivo gerado estiver vazio, o app chama `/api/config`, que lê as mesmas variáveis de ambiente.
3. **PWA offline**: após a primeira carga bem-sucedida, a config pública fica em `localStorage` (`vmCollection.supabaseConfig.v1`).
4. **Local**: copie `config.local.example.js` para `config.local.js` (gitignored) com URL e anon key.

## Painel Supabase — Auth

1. **Authentication → Providers → Email**: habilitar e-mail/senha.
2. **Authentication → URL Configuration**:
   - **Site URL**: URL de produção (ex.: `https://seu-app.vercel.app`)
   - **Redirect URLs**: incluir
     - `http://localhost:5500/` (ou a porta local usada)
     - `http://127.0.0.1:5500/`
     - `https://seu-app.vercel.app/`
     - `https://seu-app.vercel.app/**` (se o painel permitir curingas)
3. **Confirmação de e-mail**: escolha conforme o ambiente (em testes pode desativar temporariamente).
4. **Session**:
   - **Não** ative expiração por inatividade.
   - **Não** force sessão única por usuário.
   - **Não** use JWT longo como “sessão eterna”; o app renova com refresh token (`persistSession` + `autoRefreshToken`).
5. Motivo: o requisito do produto é permanecer conectado após fechar/reabrir o PWA.

## Migration SQL

Execute o arquivo:

`supabase/migrations/20260725120000_init_auth_schema.sql`

no **SQL Editor** do projeto (ou via CLI `supabase db push`).

Isso cria:

- tabelas `profiles`, `categories`, `items`, `media_assets`
- trigger de perfil em `auth.users`
- RLS com `TO authenticated` e `auth.uid()`
- bucket privado `user-media` e policies de Storage

## Biblioteca local

`vendor/supabase.umd.js` = `@supabase/supabase-js@2.50.0` (UMD fixo, sem CDN em runtime).

Para atualizar (com Node + rede):

```bash
node scripts/fetch-supabase-vendor.js
```

## Teste rápido após deploy

1. Criar conta A → adicionar categoria/item com foto → sair.
2. Em outro navegador/aparelho: entrar com A → dados e mídia devem reaparecer.
3. Conta B não deve ver dados de A.
4. Modo avião: coleção local continua visível; logout não apaga IndexedDB.
