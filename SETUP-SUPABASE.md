# Routine Assist v0.7 — Supabase

> Esta versão não exige SQL novo. Se o banco da v0.6 já está funcionando, mantenha-o como está.

# Supabase — Routine Assist v0.6

Se você já executou `supabase/setup.sql` nas versões anteriores, não precisa executar nada novamente.

A v0.6 reutiliza as tabelas, funções e políticas RLS existentes.

Variáveis necessárias no `.env.local`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Nunca coloque senha do banco ou service_role no frontend.
