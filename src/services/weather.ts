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

const cache = new Map<string, Promise<WeatherData>>()

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

export async function fetchWeather(city: string, signal?: AbortSignal): Promise<WeatherData> {
  const key = city.trim().toLocaleLowerCase('pt-BR')
  if (!signal && cache.has(key)) return cache.get(key)!

  const request = loadWeather(city, signal)
  if (!signal) cache.set(key, request)
  return request
}

async function loadWeather(city: string, signal?: AbortSignal): Promise<WeatherData> {
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

export function tripWeatherCity(trip: Trip) {
  const appointment = trip.appointments.find(item => item.city)
  if (!appointment?.city) return ''
  return [appointment.city, appointment.state].filter(Boolean).join(' ')
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
