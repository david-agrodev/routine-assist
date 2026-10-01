const MAX_STATION_DISTANCE_KM = 120
const MAX_OBSERVATION_AGE_MS = 3 * 60 * 60 * 1000
const SEARCH_RADIUS_DEGREES = 1.25

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function distanceKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const toRadians = value => value * Math.PI / 180
  const latitudeDelta = toRadians(latitudeB - latitudeA)
  const longitudeDelta = toRadians(longitudeB - longitudeA)
  const firstLatitude = toRadians(latitudeA)
  const secondLatitude = toRadians(latitudeB)
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function relativeHumidity(temperature, dewPoint) {
  const humidity = 100 * Math.exp(
    (17.625 * dewPoint) / (243.04 + dewPoint)
    - (17.625 * temperature) / (243.04 + temperature),
  )
  return Math.max(0, Math.min(100, humidity))
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const latitude = toNumber(requestUrl.searchParams.get('latitude'))
  const longitude = toNumber(requestUrl.searchParams.get('longitude'))

  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return Response.json({ error: 'Coordenadas invalidas.' }, { status: 400 })
  }

  const bbox = [
    latitude - SEARCH_RADIUS_DEGREES,
    longitude - SEARCH_RADIUS_DEGREES,
    latitude + SEARCH_RADIUS_DEGREES,
    longitude + SEARCH_RADIUS_DEGREES,
  ].join(',')
  const upstreamUrl = new URL('https://aviationweather.gov/api/data/metar')
  upstreamUrl.searchParams.set('bbox', bbox)
  upstreamUrl.searchParams.set('format', 'json')

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RoutineAssist/2.0 weather-dashboard',
      },
    })
    if (!response.ok) throw new Error(`Aviation Weather respondeu ${response.status}.`)

    const stations = await response.json()
    const candidates = (Array.isArray(stations) ? stations : [])
      .map(station => {
        const stationLatitude = toNumber(station.lat)
        const stationLongitude = toNumber(station.lon)
        const temperature = toNumber(station.temp)
        const dewPoint = toNumber(station.dewp)
        const windKnots = toNumber(station.wspd)
        const observedAt = station.reportTime || (station.obsTime ? new Date(station.obsTime * 1000).toISOString() : '')
        if (stationLatitude === null || stationLongitude === null || temperature === null || dewPoint === null || windKnots === null || !observedAt) return null
        return {
          station,
          temperature,
          dewPoint,
          windKnots,
          observedAt,
          distance: distanceKm(latitude, longitude, stationLatitude, stationLongitude),
        }
      })
      .filter(Boolean)
      .filter(candidate => candidate.distance <= MAX_STATION_DISTANCE_KM)
      .filter(candidate => {
        const observationTime = new Date(candidate.observedAt).getTime()
        return Number.isFinite(observationTime) && Math.abs(Date.now() - observationTime) <= MAX_OBSERVATION_AGE_MS
      })
      .sort((a, b) => a.distance - b.distance)

    const nearest = candidates[0]
    if (!nearest) {
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' },
      })
    }

    return Response.json({
      temperature: nearest.temperature,
      humidity: relativeHumidity(nearest.temperature, nearest.dewPoint),
      wind: nearest.windKnots * 1.852,
      observedAt: nearest.observedAt,
      station: {
        icao: nearest.station.icaoId,
        name: nearest.station.name,
        distanceKm: nearest.distance,
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' },
    })
  } catch {
    return Response.json({ error: 'Observacao meteorologica indisponivel.' }, { status: 502 })
  }
}
