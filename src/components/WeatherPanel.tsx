import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AlertIcon, ArrowIcon, LocationIcon, SearchIcon } from './Icons'

const STORAGE_KEY = 'routine-assist-weather-city'
const DEFAULT_CITY = 'Uberaba'

type GeoResult = {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country_code?: string
}

type WeatherData = {
  city: string
  current: {
    temperature: number
    humidity: number
    wind: number
    code: number
  }
  today: {
    min: number
    max: number
    rainChance: number
  }
  daily: Array<{
    date: string
    code: number
    min: number
    max: number
    rainChance: number
  }>
}

function cityLabel(result: GeoResult) {
  return [result.name, result.admin1, result.country_code].filter(Boolean).join(' / ')
}

function weatherInfo(code: number) {
  if (code === 0) return { icon: '☀️', label: 'Céu limpo' }
  if ([1, 2].includes(code)) return { icon: '🌤️', label: 'Parcialmente nublado' }
  if (code === 3) return { icon: '☁️', label: 'Nublado' }
  if ([45, 48].includes(code)) return { icon: '🌫️', label: 'Neblina' }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { icon: '🌧️', label: 'Chuva' }
  if (code >= 71 && code <= 77) return { icon: '❄️', label: 'Frio intenso' }
  if (code >= 95) return { icon: '⛈️', label: 'Tempestade' }
  return { icon: '🌡️', label: 'Clima variável' }
}

function round(value?: number) {
  return Math.round(value ?? 0)
}

function buildSummary(data: WeatherData) {
  const rainDays = data.daily.filter(day => day.rainChance >= 60).length
  const maxRain = Math.max(...data.daily.map(day => day.rainChance))
  const stormDays = data.daily.filter(day => day.code >= 95).length
  const clearDays = data.daily.filter(day => day.rainChance <= 35 && day.code <= 3).length

  if (stormDays > 0 || maxRain >= 75 || rainDays >= 3) return 'Alta probabilidade de chuva durante a semana.'
  if (clearDays >= 4 && maxRain < 55) return 'Tempo favorável para viagem nos próximos dias.'
  return 'Condições climáticas estáveis para acompanhar a agenda.'
}

async function fetchWeather(city: string, signal?: AbortSignal): Promise<WeatherData> {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`
  const geoResponse = await fetch(geoUrl, { signal })
  if (!geoResponse.ok) throw new Error('Não foi possível buscar a cidade.')
  const geoJson = await geoResponse.json()
  const place = geoJson.results?.[0] as GeoResult | undefined
  if (!place) throw new Error('Cidade não encontrada. Tente informar cidade e UF.')

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '7',
    timezone: 'auto',
  })
  const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal })
  if (!weatherResponse.ok) throw new Error('Não foi possível carregar a previsão.')
  const json = await weatherResponse.json()
  const daily = (json.daily?.time ?? []).map((date: string, index: number) => ({
    date,
    code: json.daily.weather_code?.[index] ?? 0,
    min: json.daily.temperature_2m_min?.[index] ?? 0,
    max: json.daily.temperature_2m_max?.[index] ?? 0,
    rainChance: json.daily.precipitation_probability_max?.[index] ?? 0,
  }))

  return {
    city: cityLabel(place),
    current: {
      temperature: json.current?.temperature_2m ?? daily[0]?.max ?? 0,
      humidity: json.current?.relative_humidity_2m ?? 0,
      wind: json.current?.wind_speed_10m ?? 0,
      code: json.current?.weather_code ?? daily[0]?.code ?? 0,
    },
    today: {
      min: daily[0]?.min ?? 0,
      max: daily[0]?.max ?? 0,
      rainChance: daily[0]?.rainChance ?? 0,
    },
    daily,
  }
}

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

  const summary = useMemo(() => data ? buildSummary(data) : 'Busque uma cidade para planejar a próxima viagem.', [data])
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
            <strong>{round(data.current.temperature)}°C</strong>
            <small>{currentInfo.label}</small>
          </div>
        </div>
        <div className="weather-summary"><ArrowIcon/><span>{summary}</span></div>
        <div className="weather-metrics">
          <span><small>Mínima</small><b>{round(data.today.min)}°C</b></span>
          <span><small>Máxima</small><b>{round(data.today.max)}°C</b></span>
          <span><small>Chuva</small><b>{round(data.today.rainChance)}%</b></span>
          <span><small>Umidade</small><b>{round(data.current.humidity)}%</b></span>
          <span><small>Vento</small><b>{round(data.current.wind)} km/h</b></span>
        </div>
      </article>

      <div className="weather-forecast-strip" aria-label="Previsão dos próximos 7 dias">
        {data.daily.map(day => {
          const info = weatherInfo(day.code)
          return <article className="weather-day-card" key={day.date}>
            <span>{format(parseISO(day.date), 'EEE', { locale: ptBR }).slice(0, 3).toUpperCase()}</span>
            <b aria-hidden="true">{info.icon}</b>
            <strong>{round(day.min)}° / {round(day.max)}°</strong>
            <small>{round(day.rainChance)}% chuva</small>
          </article>
        })}
      </div>
    </div> : <div className="weather-loading">{loading ? 'Carregando previsão...' : 'Informe uma cidade para consultar o clima.'}</div>}
  </section>
}
