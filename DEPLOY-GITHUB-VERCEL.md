# Deploy Routine Assist v1.7

Depois de executar a migration v1.7 no Supabase e validar localmente:

```bash
git add .
git commit -m "feat: Routine Assist v1.7"
git push origin main
```

O repositório `david-agrodev/routine-assist` já está conectado à Vercel, então o push em `main` deve disparar um novo deploy automaticamente.

As variáveis da Vercel continuam as mesmas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_CONTROL_TECH_URL` (quando usado)
