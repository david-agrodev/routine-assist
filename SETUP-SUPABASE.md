# Supabase — Routine Assist v1.4

A v1.4 não exige nova migration.

Mantenha executadas as migrations anteriores, incluindo a `migration-v1.3.sql`.

## Variáveis do frontend

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Nunca exponha `service_role`, senha do banco ou outras chaves privadas em variáveis `VITE_`.
