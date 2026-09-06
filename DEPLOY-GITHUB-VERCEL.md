# Publicação — Routine Assist v1.3

## 1. Atualizar o Supabase

Antes de publicar a v1.3, execute no Supabase → **SQL Editor**:

```text
supabase/migration-v1.3.sql
```

Ela adiciona o bloqueio definitivo de datas sobrepostas para o mesmo responsável e não apaga dados existentes.

## 2. Testar no VSCode

Preserve seu `.env.local` e rode:

```bash
npm install
npm run build
npm run dev
```

Confirme que `.env.local` continua ignorado pelo Git.

## 3. Enviar ao GitHub

Como o repositório já existe, o fluxo normal é:

```bash
git add .
git commit -m "feat: Routine Assist v1.3"
git push origin main
```

## 4. Vercel

O push para `main` dispara o deploy automaticamente.

Configuração esperada do projeto:

- Framework Preset: Vite
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 5. Variáveis de ambiente

Na Vercel mantenha:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Use os mesmos valores do `.env.local`. Essas variáveis podem ser do tipo **Config**.

Nunca coloque senha do banco, `service_role` ou outra chave privada em variável `VITE_*`.

## 6. URLs do Supabase

Em **Authentication → URL Configuration**:

```text
Site URL:
https://routine-assist.vercel.app

Redirect URLs:
http://localhost:5173/**
https://routine-assist.vercel.app/**
```

## 7. Instalar como aplicativo

### Android / Chrome
Abra a URL publicada e use **Instalar Routine Assist** em Configurações ou o menu do Chrome.

### iPhone / Safari
Abra a URL → Compartilhar → **Adicionar à Tela de Início**.

### Computador
Chrome/Edge podem oferecer a instalação na barra de endereço.
