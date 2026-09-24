import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AlertIcon, ArrowIcon, LocationIcon, SearchIcon } from './Icons'
import { buildWeatherSummary, fetchWeather, roundWeather, weatherInfo, type WeatherData } from '../services/weather'

const STORAGE_KEY = 'routine-assist-weather-city'
const DEFAULT_CITY = 'Uberaba'

export function WeatherPanel() {
  const [city, setCity] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY } catch { return DEFAULT_CITY }
  })
  const [query, setQuery] = useState(city)
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchWeather(city, controller.signal)
      .then(result => {
        setData(result)
        try { window.localStorage.setItem(STORAGE_KEY, city) } catch { /* noop */ }
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) return
        setError(err.message || 'Não foi possível consultar o clima agora.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [city])

  const summary = useMemo(() => data ? buildWeatherSummary(data) : 'Busque uma cidade para planejar a próxima viagem.', [data])
  const currentInfo = weatherInfo(data?.current.code ?? 0)

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = query.trim()
    if (!next) {
      setError('Digite uma cidade para consultar a previsão.')
      return
    }
    setCity(next)
  }

  return <section className="panel weather-panel">
    <div className="weather-head">
      <div><span className="eyebrow">Clima</span><h2>Previsão para viagens</h2><p>Consulte rapidamente as condições antes de planejar deslocamentos.</p></div>
      <form className="weather-search" onSubmit={search}>
        <SearchIcon/>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar cidade. Ex: Londrina" aria-label="Buscar cidade"/>
        <button type="submit" disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</button>
      </form>
    </div>

    {error && <div className="weather-message"><AlertIcon/> {error}</div>}

    {data ? <div className="weather-content">
      <article className="weather-current-card">
        <div className="weather-current-main">
          <span className="weather-icon-large" aria-hidden="true">{currentInfo.icon}</span>
          <div>
            <span className="weather-location"><LocationIcon/> {data.city}</span>
            <strong>{roundWeather(data.current.temperature)}°C</strong>
            <small>{currentInfo.label}</small>
          </div>
        </div>
        <div className="weather-summary"><ArrowIcon/><span>{summary}</span></div>
        <div className="weather-metrics">
          <span><small>Mínima</small><b>{roundWeather(data.today.min)}°C</b></span>
          <span><small>Máxima</small><b>{roundWeather(data.today.max)}°C</b></span>
          <span><small>Chuva</small><b>{roundWeather(data.today.rainChance)}%</b></span>
          <span><small>Umidade</small><b>{roundWeather(data.current.humidity)}%</b></span>
          <span><small>Vento</small><b>{roundWeather(data.current.wind)} km/h</b></span>
        </div>
      </article>

      <div className="weather-forecast-strip" aria-label="Previsão dos próximos 7 dias">
        {data.daily.map(day => {
          const info = weatherInfo(day.code)
          return <article className="weather-day-card" key={day.date}>
            <span>{format(parseISO(day.date), 'EEE', { locale: ptBR }).slice(0, 3).toUpperCase()}</span>
            <b aria-hidden="true">{info.icon}</b>
            <strong>{roundWeather(day.min)}° / {roundWeather(day.max)}°</strong>
            <small>{roundWeather(day.rainChance)}% chuva</small>
          </article>
        })}
      </div>
    </div> : <div className="weather-loading">{loading ? 'Carregando previsão...' : 'Informe uma cidade para consultar o clima.'}</div>}
  </section>
}
