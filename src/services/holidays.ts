import type { Holiday } from '../types/routine'

const API_BASE = 'https://brasilapi.com.br/api/feriados/v1'
const CACHE_PREFIX = 'routine-assist-holidays-br:'

function cacheKey(year:number){ return `${CACHE_PREFIX}${year}` }

function readCache(year:number):Holiday[]|null{
  try{
    const raw=localStorage.getItem(cacheKey(year))
    if(!raw) return null
    const parsed=JSON.parse(raw)
    if(!Array.isArray(parsed)) return null
    return parsed.filter((item:any)=>item && typeof item.date==='string' && typeof item.name==='string')
  }catch{return null}
}

function writeCache(year:number,items:Holiday[]){
  try{localStorage.setItem(cacheKey(year),JSON.stringify(items))}catch{/* cache opcional */}
}

export async function getBrazilHolidays(year:number):Promise<Holiday[]>{
  const cached=readCache(year)
  if(cached) return cached
  const response=await fetch(`${API_BASE}/${year}`,{headers:{Accept:'application/json'}})
  if(!response.ok) throw new Error(`Feriados indisponíveis (${response.status}).`)
  const data=await response.json()
  const holidays:Holiday[]=(Array.isArray(data)?data:[]).map((item:any)=>({
    date:String(item.date||''),
    name:String(item.name||'Feriado'),
    type:String(item.type||'national'),
  })).filter((item:Holiday)=>/^\d{4}-\d{2}-\d{2}$/.test(item.date))
  writeCache(year,holidays)
  return holidays
}

export async function getBrazilHolidaysForYears(years:number[]):Promise<Holiday[]>{
  const unique=[...new Set(years)].filter(y=>Number.isFinite(y)&&y>2000&&y<2200)
  const results=await Promise.allSettled(unique.map(getBrazilHolidays))
  if(results.some(result=>result.status==='rejected')) throw new Error('Não foi possível consultar os feriados nacionais agora.')
  const holidays=results.flatMap(result=>result.status==='fulfilled'?result.value:[])
  return holidays.sort((a,b)=>a.date.localeCompare(b.date))
}

export async function getHolidaysInRange(start:string,end:string):Promise<Holiday[]>{
  if(!start||!end) return []
  const startYear=Number(start.slice(0,4)); const endYear=Number(end.slice(0,4))
  const years:number[]=[]
  for(let year=startYear;year<=endYear;year++) years.push(year)
  const holidays=await getBrazilHolidaysForYears(years)
  return holidays.filter(h=>h.date>=start&&h.date<=end)
}
