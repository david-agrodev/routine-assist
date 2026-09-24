import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { AlertIcon, LocationIcon } from './Icons'
import { fetchWeather, roundWeather, summarizeTripWeather, tripWeatherCity, weatherInfo, type WeatherData } from '../services/weather'
import type { Trip } from '../types/routine'

type State = {
  loading: boolean
  data: WeatherData | null
  error: string
}

function useTripWeather(trip: Trip): State & { city: string } {
  const city = useMemo(() => tripWeatherCity(trip), [trip])
  const [state, setState] = useState<State>({ loading: false, data: null, error: '' })

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (!city || trip.end < today) {
      setState({ loading: false, data: null, error: '' })
      return
    }
    let active = true
    setState(current => ({ ...current, loading: true, error: '' }))
    fetchWeather(city)
      .then(data => { if (active) setState({ loading: false, data, error: '' }) })
      .catch((error: Error) => { if (active) setState({ loading: false, data: null, error: error.message || 'Previsão indisponível.' }) })
    return () => { active = false }
  }, [city, trip.end])

  return { ...state, city }
}

export function TripWeatherChip({ trip }: { trip: Trip }) {
  const { loading, data, city } = useTripWeather(trip)
  const summary = data ? summarizeTripWeather(trip, data) : null

  if (!city || loading) return null
  if (!summary) return null

  return <span className={`trip-weather-chip ${summary.tone}`} title={`${summary.label}: ${summary.detail}`}>
    <b aria-hidden="true">{summary.icon}</b>
    <span>{summary.label}</span>
  </span>
}

export function TripWeatherCard({ trip }: { trip: Trip }) {
  const { loading, data, error, city } = useTripWeather(trip)
  const summary = data ? summarizeTripWeather(trip, data) : null
  const tripDays = data?.daily.filter(day => day.date >= trip.start && day.date <= trip.end) ?? []

  if (!city) return null

  return <article className="trip-weather-card">
    <div className="trip-weather-card-head">
      <div>
        <span className="section-label">Clima da viagem</span>
        <h3>Condições previstas</h3>
      </div>
      <span><LocationIcon/> {city}</span>
    </div>

    {loading && <div className="trip-weather-state">Consultando previsão...</div>}
    {!loading && error && <div className="trip-weather-state error"><AlertIcon/> {error}</div>}
    {!loading && !error && !summary && <div className="trip-weather-state">Previsão disponível apenas para viagens dentro dos próximos 7 dias.</div>}

    {!loading && summary && <div className={`trip-weather-overview ${summary.tone}`}>
      <span className="trip-weather-icon" aria-hidden="true">{summary.icon}</span>
      <div>
        <strong>{summary.label}</strong>
        <small>{summary.detail} • {roundWeather(summary.min)}° / {roundWeather(summary.max)}°C</small>
      </div>
    </div>}

    {tripDays.length > 0 && <div className="trip-weather-days">
      {tripDays.map(day => {
        const info = weatherInfo(day.code)
        return <span key={day.date}>
          <small>{format(parseISO(day.date), 'EEE dd/MM', { locale: ptBR })}</small>
          <b aria-hidden="true">{info.icon}</b>
          <strong>{roundWeather(day.min)}°/{roundWeather(day.max)}°</strong>
          <em>{roundWeather(day.rainChance)}% chuva</em>
        </span>
      })}
    </div>}
  </article>
}
