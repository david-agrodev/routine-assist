import type { Trip } from '../types/routine'

export type GeoResult = {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country_code?: string
}

export type WeatherDay = {
  date: string
  code: number
  min: number
  max: number
  rainChance: number
}

export type WeatherData = {
  city: string
  source: string
  fetchedAt: string
  timezone: string
  station?: {
    icao: string
    name: string
    distanceKm: number
  }
  current: {
    temperature: number
    apparentTemperature: number
    humidity: number
    wind: number
    code: number
    rainChance: number
    precipitation: number
    observedAt: string
  }
  today: {
    min: number
    max: number
    rainChance: number
  }
  daily: WeatherDay[]
}

export type TripWeatherSummary = {
  icon: string
  label: string
  detail: string
  tone: 'good' | 'warn' | 'rain' | 'neutral'
  min: number
  max: number
  rainChance: number
}

type WeatherCacheEntry = {
  expiresAt: number
  request: Promise<WeatherData>
}

type CurrentObservation = {
  temperature: number
  humidity: number
  wind: number
  observedAt: string
  station: {
    icao: string
    name: string
    distanceKm: number
  }
}

const WEATHER_CACHE_TTL = 15 * 60 * 1000
const cache = new Map<string, WeatherCacheEntry>()
const BR_STATES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
}

export function cityLabel(result: GeoResult) {
  return [result.name, result.admin1, result.country_code].filter(Boolean).join(' / ')
}

export function weatherInfo(code: number) {
  if (code === 0) return { icon: '☀️', label: 'Céu limpo' }
  if ([1, 2].includes(code)) return { icon: '🌤️', label: 'Parcialmente nublado' }
  if (code === 3) return { icon: '☁️', label: 'Nublado' }
  if ([45, 48].includes(code)) return { icon: '🌫️', label: 'Neblina' }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { icon: '🌧️', label: 'Chuva' }
  if (code >= 71 && code <= 77) return { icon: '❄️', label: 'Frio intenso' }
  if (code >= 95) return { icon: '⛈️', label: 'Tempestade' }
  return { icon: '🌡️', label: 'Clima variável' }
}

export function roundWeather(value?: number) {
  return Math.round(value ?? 0)
}

export function buildWeatherSummary(data: WeatherData) {
  const rainDays = data.daily.filter(day => day.rainChance >= 60).length
  const maxRain = Math.max(...data.daily.map(day => day.rainChance))
  const stormDays = data.daily.filter(day => day.code >= 95).length
  const clearDays = data.daily.filter(day => day.rainChance <= 35 && day.code <= 3).length

  if (stormDays > 0 || maxRain >= 75 || rainDays >= 3) return 'Alta probabilidade de chuva durante a semana.'
  if (clearDays >= 4 && maxRain < 55) return 'Tempo favorável para viagem nos próximos dias.'
  return 'Condições climáticas estáveis para acompanhar a agenda.'
}

export async function fetchWeather(city: string, signal?: AbortSignal, force = false, includeStationObservation = false): Promise<WeatherData> {
  const key = `${city.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')}:${includeStationObservation ? 'observed' : 'forecast'}`
  const cached = cache.get(key)
  if (!force && !signal && cached && cached.expiresAt > Date.now()) return cached.request

  const request = loadWeather(city, signal, includeStationObservation)
  if (!signal) {
    cache.set(key, { expiresAt: Date.now() + WEATHER_CACHE_TTL, request })
    request.catch(() => cache.delete(key))
  }
  return request
}

export async function fetchWeatherByCoordinates(latitude: number, longitude: number, label: string, signal?: AbortSignal): Promise<WeatherData> {
  return loadWeatherForPlace({ name: label, latitude, longitude }, signal, true)
}

async function loadWeather(city: string, signal?: AbortSignal, includeStationObservation = false): Promise<WeatherData> {
  const place = await findGeoPlace(city, signal)
  if (!place) throw new Error('Cidade não encontrada. Tente informar cidade e UF.')

  return loadWeatherForPlace(place, signal, includeStationObservation)
}

async function loadWeatherForPlace(place: GeoResult, signal?: AbortSignal, includeStationObservation = false): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '7',
    timezone: 'auto',
  })
  const stationRequest = includeStationObservation
    ? fetchCurrentObservation(place.latitude, place.longitude, signal)
    : Promise.resolve(null)
  const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal })
  if (!weatherResponse.ok) throw new Error('Não foi possível carregar a previsão.')
  const json = await weatherResponse.json()
  const observation = await stationRequest
  const daily = (json.daily?.time ?? []).map((date: string, index: number) => ({
    date,
    code: json.daily.weather_code?.[index] ?? 0,
    min: json.daily.temperature_2m_min?.[index] ?? 0,
    max: json.daily.temperature_2m_max?.[index] ?? 0,
    rainChance: json.daily.precipitation_probability_max?.[index] ?? 0,
  }))

  const temperature = observation?.temperature ?? json.current?.temperature_2m ?? daily[0]?.max ?? 0
  const humidity = observation?.humidity ?? json.current?.relative_humidity_2m ?? 0
  const wind = observation?.wind ?? json.current?.wind_speed_10m ?? 0

  return {
    city: cityLabel(place),
    source: observation ? `Estação ${observation.station.icao} + Open-Meteo` : 'Open-Meteo',
    fetchedAt: new Date().toISOString(),
    timezone: json.timezone ?? 'America/Sao_Paulo',
    station: observation?.station,
    current: {
      temperature,
      apparentTemperature: observation ? apparentTemperature(temperature, humidity, wind) : json.current?.apparent_temperature ?? temperature,
      humidity,
      wind,
      code: json.current?.weather_code ?? daily[0]?.code ?? 0,
      rainChance: json.current?.precipitation_probability ?? 0,
      precipitation: json.current?.precipitation ?? 0,
      observedAt: observation?.observedAt ?? json.current?.time ?? '',
    },
    today: {
      min: daily[0]?.min ?? 0,
      max: daily[0]?.max ?? 0,
      rainChance: daily[0]?.rainChance ?? 0,
    },
    daily,
  }
}

async function fetchCurrentObservation(latitude: number, longitude: number, signal?: AbortSignal): Promise<CurrentObservation | null> {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) })
  try {
    const response = await fetch(`/api/weather-current?${params.toString()}`, { signal })
    if (response.status === 204 || !response.ok) return null
    const observation = await response.json() as CurrentObservation
    if (!Number.isFinite(observation.temperature) || !Number.isFinite(observation.humidity) || !Number.isFinite(observation.wind)) return null
    return observation
  } catch (error) {
    if (signal?.aborted) throw error
    return null
  }
}

function apparentTemperature(temperature: number, humidity: number, windKmH: number) {
  const vaporPressure = humidity / 100 * 6.105 * Math.exp(17.27 * temperature / (237.7 + temperature))
  return temperature + 0.33 * vaporPressure - 0.7 * (windKmH / 3.6) - 4
}

function normalizeCityInput(value: string) {
  return value.trim().replace(/\s*\/\s*/g, ' ').replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ')
}

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function parseCityAndState(value: string) {
  const normalized = normalizeCityInput(value)
  const match = normalized.match(/^(.*)\s([A-Z]{2})$/i)
  const state = match?.[2]?.toUpperCase()
  if (match && state && BR_STATES[state]) return { city: match[1].trim(), state }
  return { city: normalized, state: '' }
}

async function findGeoPlace(city: string, signal?: AbortSignal): Promise<GeoResult | undefined> {
  const parsed = parseCityAndState(city)
  const queries = [parsed.city, stripDiacritics(parsed.city), normalizeCityInput(city), stripDiacritics(normalizeCityInput(city))]
    .map(query => query.trim())
    .filter((query, index, list) => query && list.indexOf(query) === index)

  for (const query of queries) {
    const params = new URLSearchParams({ name: query, count: '5', language: 'pt', format: 'json' })
    if (parsed.state) params.set('countryCode', 'BR')
    const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, { signal })
    if (!geoResponse.ok) throw new Error('Não foi possível buscar a cidade.')
    const geoJson = await geoResponse.json()
    const results = (geoJson.results ?? []) as GeoResult[]
    if (!results.length) continue

    if (parsed.state) {
      const expectedState = BR_STATES[parsed.state]
      const stateMatch = results.find(result => result.country_code === 'BR' && result.admin1 === expectedState)
      if (stateMatch) return stateMatch
      const brazilMatch = results.find(result => result.country_code === 'BR')
      if (brazilMatch) return brazilMatch
    }

    return results[0]
  }
}

export function tripWeatherCity(trip: Trip) {
  const appointment = trip.appointments.find(item => item.city)
  if (!appointment?.city) return ''
  return [appointment.city, appointment.state].filter(Boolean).join(', ')
}

export function summarizeTripWeather(trip: Trip, data: WeatherData): TripWeatherSummary | null {
  const today = new Date().toISOString().slice(0, 10)
  if (trip.end < today) return null

  const days = data.daily.filter(day => day.date >= trip.start && day.date <= trip.end)
  if (!days.length) return null

  const min = Math.min(...days.map(day => day.min))
  const max = Math.max(...days.map(day => day.max))
  const rainChance = Math.max(...days.map(day => day.rainChance))
  const mainDay = [...days].sort((a, b) => b.rainChance - a.rainChance || b.code - a.code)[0]
  const storm = days.some(day => day.code >= 95)
  const info = weatherInfo(mainDay.code)

  if (storm || rainChance >= 70) {
    return { icon: storm ? '⛈️' : '🌧️', label: 'Chuva prevista', detail: `${rainChance}% de chance no período`, tone: 'rain', min, max, rainChance }
  }
  if (max >= 34) {
    return { icon: '🌡️', label: 'Calor forte', detail: `Até ${roundWeather(max)}°C`, tone: 'warn', min, max, rainChance }
  }
  if (rainChance <= 35 && days.every(day => day.code <= 3)) {
    return { icon: '☀️', label: 'Tempo favorável', detail: `${roundWeather(min)}°/${roundWeather(max)}°C`, tone: 'good', min, max, rainChance }
  }
  return { icon: info.icon, label: 'Clima estável', detail: `${roundWeather(rainChance)}% chuva`, tone: 'neutral', min, max, rainChance }
}
