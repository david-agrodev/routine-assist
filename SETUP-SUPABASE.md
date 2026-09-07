# Supabase — Routine Assist v1.7

Para uma base que já está na v1.5, execute somente:

`supabase/migration-v1.7.sql`

A migration:

- adiciona `route_distance_km` em `trips`;
- adiciona `route_duration_minutes` em `trips`;
- adiciona `route_calculated_at` em `trips`;
- ajusta a regra de conflito para não tratar atendimentos da mesma viagem como conflito durante edição;
- mantém bloqueios entre viagens diferentes.

Nenhuma demanda, viagem, hotel ou veículo é apagado.
