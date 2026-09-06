# Deploy Routine Assist v1.4

## 1. Teste local

```bash
npm install
npm run build
npm run dev
```

## 2. GitHub

```bash
git add .
git commit -m "feat: Routine Assist v1.4"
git push origin main
```

## 3. Vercel

O projeto já conectado ao GitHub deve iniciar um novo deploy automaticamente.

Variáveis necessárias na Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use tipo **Config** para essas variáveis públicas do frontend.
