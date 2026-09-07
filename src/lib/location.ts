export function parseLocationLabel(value?: string){
  const raw=(value || '').trim()
  if(!raw) return {city:'',state:''}
  const slash=raw.lastIndexOf('/')
  if(slash>0){
    const city=raw.slice(0,slash).trim()
    const state=raw.slice(slash+1).trim().toUpperCase()
    return {city,state:state.length===2?state:''}
  }
  return {city:raw,state:''}
}

export function locationLabel(city?:string,state?:string){
  const c=(city||'').trim(); const s=(state||'').trim().toUpperCase()
  return [c,s].filter(Boolean).join('/')
}
