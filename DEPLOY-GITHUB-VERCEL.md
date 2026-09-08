# Deploy Routine Assist v1.9

Depois de testar localmente:

```bash
git add .
git commit -m "feat: Routine Assist v1.9"
git push origin main
```

O repositório conectado à Vercel fará o novo deploy automaticamente.

As variáveis continuam as mesmas:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_CONTROL_TECH_URL` (opcional)

Não há variável adicional para o Outlook. O destinatário corporativo da solicitação de passagem está definido no aplicativo.
