-- Routine Assist v1.7 — rota apenas de ida
-- Execute uma vez no SQL Editor do Supabase.
-- Não apaga viagens, atendimentos ou reservas.
-- Apenas limpa estimativas antigas que foram calculadas considerando ida + retorno,
-- para que sejam recalculadas no novo padrão: ponto de partida -> última parada.

update public.trips
set route_distance_km = null,
    route_duration_minutes = null,
    route_calculated_at = null
where route_distance_km is not null
   or route_duration_minutes is not null
   or route_calculated_at is not null;
