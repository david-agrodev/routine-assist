# Supabase — Routine Assist v1.9

## Projeto existente

Se você já está usando o Routine Assist v1.8, execute somente:

`supabase/migration-v1.9.sql`

No painel do Supabase:

1. SQL Editor
2. New query
3. Cole todo o conteúdo de `migration-v1.9.sql`
4. Run

A migration não apaga demandas, viagens, hotéis ou veículos existentes.

Ela adiciona:
- `profiles.cpf`
- `profiles.phone`
- `profiles.birth_date`
- `trips.flight_required`
- tabela `flight_reservations`
- RLS e índices para a nova tabela

## Projeto novo

Para uma instalação do zero, use `supabase/setup.sql`, que já contém a estrutura da v1.9.
