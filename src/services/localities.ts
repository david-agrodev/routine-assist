export type IbgeState = { id: number; sigla: string; nome: string }
export type IbgeCity = { id: number; nome: string }

const BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades'
const STATES_CACHE = 'routine-assist-ibge-states-v1'
const citiesCacheKey = (uf: string) => `routine-assist-ibge-cities-v1:${uf}`

function readCache<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) as T : null
  } catch { return null }
}

function writeCache<T>(key: string, value: T) {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* cache opcional */ }
}

export async function getBrazilStates(): Promise<IbgeState[]> {
  const cached = readCache<IbgeState[]>(STATES_CACHE)
  if (cached?.length) return cached
  const response = await fetch(`${BASE}/estados?orderBy=nome`)
  if (!response.ok) throw new Error('Não foi possível carregar os estados do IBGE.')
  const data = await response.json() as IbgeState[]
  writeCache(STATES_CACHE, data)
  return data
}

export async function getCitiesByState(state: IbgeState): Promise<IbgeCity[]> {
  const key = citiesCacheKey(state.sigla)
  const cached = readCache<IbgeCity[]>(key)
  if (cached?.length) return cached
  const response = await fetch(`${BASE}/estados/${state.id}/municipios?orderBy=nome`)
  if (!response.ok) throw new Error(`Não foi possível carregar as cidades de ${state.sigla}.`)
  const data = await response.json() as IbgeCity[]
  writeCache(key, data)
  return data
}
