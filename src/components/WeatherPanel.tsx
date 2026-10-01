import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AlertIcon, ArrowIcon, ClockIcon, CurrentLocationIcon, LocationIcon, RefreshIcon, SearchIcon } from './Icons'
import { buildWeatherSummary, fetchWeather, fetchWeatherByCoordinates, roundWeather, weatherInfo, type WeatherData } from '../services/weather'

const STORAGE_KEY = 'routine-assist-weather-city'
const MODE_KEY = 'routine-assist-weather-mode'
const DEFAULT_CITY = 'Uberaba, MG'
const AUTO_REFRESH_MS = 15 * 60 * 1000

type WeatherTarget =
  | { kind: 'city'; city: string; persist?: boolean }
  | { kind: 'coordinates'; latitude: number; longitude: number; label: string }

type ReverseLocation = {
  city?: string
  locality?: string
  principalSubdivision?: string
  principalSubdivisionCode?: string
  countryCode?: string
}

function storedCity() {
  try { return window.localStorage.getItem(STORAGE_KEY) || '' } catch { return '' }
}

function initialTarget(): WeatherTarget | null {
  try {
    const city = storedCity()
    return window.localStorage.getItem(MODE_KEY) === 'city' && city ? { kind: 'city', city, persist: false } : null
  } catch {
    return null
  }
}

function browserPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Localização não disponível neste dispositivo.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 10 * 60 * 1000,
      timeout: 9000,
    })
  })
}

async function locationLabel(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'pt',
  })
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`)
  if (!response.ok) return 'Localização atual'
  const result = await response.json() as ReverseLocation
  const city = result.city || result.locality || 'Localização atual'
  const subdivision = result.principalSubdivisionCode?.replace(/^BR-/, '') || result.principalSubdivision
  return [city, subdivision].filter((value, index, list) => value && list.indexOf(value) === index).join(' / ')
}

function fetchedTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function observedTime(value: string, timezone: string) {
  if (!value) return ''
  if (!value.endsWith('Z')) return value.slice(11, 16)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: timezone })
}

export function WeatherPanel() {
  const [target, setTarget] = useState<WeatherTarget | null>(initialTarget)
  const [query, setQuery] = useState(() => storedCity())
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [locationNotice, setLocationNotice] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  const useCurrentLocation = async (initial = false) => {
    setLocating(true)
    setError('')
    setLocationNotice('')
    try {
      const position = await browserPosition()
      const { latitude, longitude } = position.coords
      const label = await locationLabel(latitude, longitude).catch(() => 'Localização atual')
      setQuery(label)
      setTarget({ kind: 'coordinates', latitude, longitude, label })
      try { window.localStorage.setItem(MODE_KEY, 'location') } catch { /* noop */ }
    } catch {
      const fallback = storedCity() || DEFAULT_CITY
      setQuery(fallback)
      setTarget({ kind: 'city', city: fallback, persist: false })
      if (!initial) setLocationNotice(`Não foi possível acessar sua localização. Exibindo ${fallback}.`)
    } finally {
      setLocating(false)
    }
  }

  useEffect(() => {
    if (!target) void useCurrentLocation(true)
  }, [])

  useEffect(() => {
    if (!target) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    const request = target.kind === 'city'
      ? fetchWeather(target.city, controller.signal, refreshVersion > 0, true)
      : fetchWeatherByCoordinates(target.latitude, target.longitude, target.label, controller.signal)

    request
      .then(result => {
        setData(result)
        if (target.kind === 'city' && target.persist !== false) {
          try {
            window.localStorage.setItem(STORAGE_KEY, target.city)
            window.localStorage.setItem(MODE_KEY, 'city')
          } catch { /* noop */ }
        }
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) return
        setError(err.message || 'Não foi possível consultar o clima agora.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [target, refreshVersion])

  useEffect(() => {
    const interval = window.setInterval(() => setRefreshVersion(value => value + 1), AUTO_REFRESH_MS)
    return () => window.clearInterval(interval)
  }, [])

  const summary = useMemo(() => data ? buildWeatherSummary(data) : 'Busque uma cidade para planejar a próxima viagem.', [data])
  const currentInfo = weatherInfo(data?.current.code ?? 0)

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = query.trim()
    if (!next) {
      setError('Digite uma cidade para consultar a previsão.')
      return
    }
    setLocationNotice('')
    setTarget({ kind: 'city', city: next, persist: true })
  }

  return <section className="panel weather-panel">
    <div className="weather-head">
      <div><span className="eyebrow">Clima</span><h2>Previsão para viagens</h2><p>Consulte rapidamente as condições antes de planejar deslocamentos.</p></div>
      <div className="weather-tools">
        <form className="weather-search" onSubmit={search}>
          <SearchIcon/>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar cidade. Ex: Londrina, PR" aria-label="Buscar cidade"/>
          <button type="submit" disabled={loading || locating}>{loading ? 'Buscando...' : 'Buscar'}</button>
        </form>
        <button type="button" className="weather-location-button" onClick={() => void useCurrentLocation()} disabled={locating} title="Usar minha localização atual"><CurrentLocationIcon/><span>{locating ? 'Localizando...' : 'Minha localização'}</span></button>
      </div>
    </div>

    {error && <div className="weather-message"><AlertIcon/> {error}</div>}
    {locationNotice && <div className="weather-message weather-notice"><LocationIcon/> {locationNotice}</div>}

    {data ? <div className="weather-content" aria-busy={loading}>
      <article className="weather-current-card">
        <div className="weather-current-main">
          <span className="weather-icon-large" aria-hidden="true">{currentInfo.icon}</span>
          <div>
            <span className="weather-location"><LocationIcon/> {data.city}</span>
            <strong>{roundWeather(data.current.temperature)}°C</strong>
            <small>{currentInfo.label} • sensação de {roundWeather(data.current.apparentTemperature)}°C</small>
            <span className="weather-updated"><ClockIcon/> Atualizado às {fetchedTime(data.fetchedAt)}{data.current.observedAt ? ` • observação ${observedTime(data.current.observedAt, data.timezone)}` : ''} • <span title={data.station ? `${data.station.name} • ${roundWeather(data.station.distanceKm)} km` : 'Previsão meteorológica por modelo'}>{data.source}</span><button type="button" onClick={() => setRefreshVersion(value => value + 1)} disabled={loading} title="Atualizar previsão agora"><RefreshIcon/></button></span>
          </div>
        </div>
        <div className="weather-summary"><ArrowIcon/><span>{summary}</span></div>
        <div className="weather-metrics">
          <span><small>Mínima hoje</small><b>{roundWeather(data.today.min)}°C</b></span>
          <span><small>Máxima hoje</small><b>{roundWeather(data.today.max)}°C</b></span>
          <span><small>Chuva agora</small><b>{roundWeather(data.current.rainChance)}%</b><em>máx. {roundWeather(data.today.rainChance)}% hoje</em></span>
          <span><small>Umidade agora</small><b>{roundWeather(data.current.humidity)}%</b></span>
          <span><small>Vento agora</small><b>{roundWeather(data.current.wind)} km/h</b></span>
        </div>
      </article>

      <div className="weather-forecast-strip" aria-label="Previsão dos próximos 7 dias">
        {data.daily.map((day, index) => {
          const info = weatherInfo(day.code)
          return <article className="weather-day-card" key={day.date}>
            <span>{index === 0 ? 'HOJE' : format(parseISO(day.date), 'EEE', { locale: ptBR }).slice(0, 3).toUpperCase()}</span>
            <b aria-hidden="true">{info.icon}</b>
            <strong>{roundWeather(day.min)}° / {roundWeather(day.max)}°</strong>
            <small>até {roundWeather(day.rainChance)}% chuva</small>
          </article>
        })}
      </div>
    </div> : <div className="weather-loading">{locating ? 'Identificando sua localização...' : loading ? 'Carregando previsão...' : 'Informe uma cidade para consultar o clima.'}</div>}
  </section>
}
