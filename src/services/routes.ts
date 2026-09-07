import type { Appointment } from '../types/routine'
import { parseLocationLabel } from '../lib/location'

type GeoPoint={ latitude:number; longitude:number; name:string; state?:string }
export type RouteEstimate={ distanceKm:number; durationMinutes:number; labels:string[] }

async function geocode(city:string,state?:string):Promise<GeoPoint>{
  const query=state?`${city}, ${state}`:city
  const url=new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name',query)
  url.searchParams.set('count','10')
  url.searchParams.set('language','pt')
  url.searchParams.set('format','json')
  url.searchParams.set('countryCode','BR')
  const response=await fetch(url.toString())
  if(!response.ok) throw new Error(`Não foi possível localizar ${query}.`)
  const body=await response.json() as {results?:Array<any>}
  const items=body.results || []
  if(!items.length) throw new Error(`Não encontrei ${query} para calcular a rota.`)
  const normalized=city.toLocaleLowerCase('pt-BR')
  const exact=items.find(item=>String(item.name||'').toLocaleLowerCase('pt-BR')===normalized) || items[0]
  return {latitude:Number(exact.latitude),longitude:Number(exact.longitude),name:String(exact.name||city),state:state||undefined}
}

export async function calculateRouteEstimate(originLabel:string,appointments:Appointment[]):Promise<RouteEstimate>{
  const origin=parseLocationLabel(originLabel)
  if(!origin.city) throw new Error('Informe o ponto de partida antes de calcular a rota.')
  const destinations:Array<{city:string;state?:string}>=[]
  const seen=new Set<string>()
  for(const a of appointments){
    if(!a.city) continue
    const key=`${a.city}|${a.state||''}`.toLocaleLowerCase('pt-BR')
    if(seen.has(key)) continue
    seen.add(key); destinations.push({city:a.city,state:a.state})
  }
  if(!destinations.length) throw new Error('A viagem ainda não possui cidades de destino para calcular a rota.')

  const points:GeoPoint[]=[]
  points.push(await geocode(origin.city,origin.state))
  for(const stop of destinations) points.push(await geocode(stop.city,stop.state))

  const coords=points.map(p=>`${p.longitude},${p.latitude}`).join(';')
  const routeUrl=`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=false`
  const response=await fetch(routeUrl)
  if(!response.ok) throw new Error('O serviço de rotas não respondeu. Tente novamente em alguns instantes.')
  const body=await response.json() as {code?:string;routes?:Array<{distance:number;duration:number}>;message?:string}
  if(body.code!=='Ok'||!body.routes?.length) throw new Error(body.message||'Não foi possível calcular uma rota rodoviária entre as cidades.')
  const route=body.routes[0]
  return {
    distanceKm:Math.round((route.distance/1000)*10)/10,
    durationMinutes:Math.max(1,Math.round(route.duration/60)),
    labels:[`${origin.city}${origin.state?`/${origin.state}`:''}`,...destinations.map(d=>`${d.city}${d.state?`/${d.state}`:''}`)],
  }
}
