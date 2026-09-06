import { useEffect, useMemo, useState } from 'react'
import { getBrazilStates, getCitiesByState, type IbgeCity, type IbgeState } from '../services/localities'

type Props = {
  city: string
  state: string
  onCityChange: (value: string) => void
  onStateChange: (value: string) => void
  required?: boolean
}

function normalizeUf(value:string){
  const head=(value || '').split('—')[0].trim().toUpperCase()
  return head.length===2 ? head : value.trim().toUpperCase()
}

export function LocationFields({ city, state, onCityChange, onStateChange, required }: Props) {
  const [states, setStates] = useState<IbgeState[]>([])
  const [cities, setCities] = useState<IbgeCity[]>([])
  const [loadingStates, setLoadingStates] = useState(true)
  const [loadingCities, setLoadingCities] = useState(false)
  const [statesFailed, setStatesFailed] = useState(false)
  const [citiesFailed, setCitiesFailed] = useState(false)
  const normalizedState=normalizeUf(state)

  useEffect(() => {
    let active = true
    setLoadingStates(true)
    getBrazilStates().then(data => { if (active) { setStates(data); setStatesFailed(false) } })
      .catch(() => { if (active) setStatesFailed(true) })
      .finally(() => { if (active) setLoadingStates(false) })
    return () => { active = false }
  }, [])

  const selectedState = useMemo(() => states.find(item => item.sigla === normalizedState), [states, normalizedState])

  useEffect(() => {
    let active = true
    setCitiesFailed(false)
    if (!selectedState) { setCities([]); setLoadingCities(false); return }
    setLoadingCities(true)
    getCitiesByState(selectedState)
      .then(data => { if (active) { setCities(data); setCitiesFailed(false) } })
      .catch(() => { if (active) { setCities([]); setCitiesFailed(true) } })
      .finally(() => { if (active) setLoadingCities(false) })
    return () => { active = false }
  }, [selectedState?.id])

  useEffect(()=>{
    if(state && normalizedState && normalizedState !== state && states.some(item=>item.sigla===normalizedState)) onStateChange(normalizedState)
  },[state,normalizedState,states.length])

  if (statesFailed && !states.length) return <div className="location-grid">
    <label className="field"><span>UF{required ? ' *' : ''}</span><input maxLength={2} value={normalizedState} onChange={e=>{onStateChange(e.target.value.toUpperCase());onCityChange('')}} placeholder="MG"/></label>
    <label className="field"><span>Cidade{required ? ' *' : ''}</span><input value={city} onChange={e=>onCityChange(e.target.value)} placeholder="Digite a cidade"/></label>
  </div>

  return <>
    <label className="field"><span>UF{required ? ' *' : ''}</span>
      <select value={normalizedState} disabled={loadingStates} onChange={e=>{ onStateChange(e.target.value); onCityChange('') }}>
        <option value="">{loadingStates ? 'Carregando estados...' : 'Selecione o estado'}</option>
        {states.map(item=><option key={item.id} value={item.sigla}>{item.sigla} — {item.nome}</option>)}
      </select>
    </label>
    {citiesFailed ? <label className="field"><span>Cidade{required ? ' *' : ''}</span><input value={city} onChange={e=>onCityChange(e.target.value)} placeholder="API indisponível — digite a cidade"/></label> :
      <label className="field"><span>Cidade{required ? ' *' : ''}</span>
        <select value={city} disabled={!selectedState || loadingCities} onChange={e=>onCityChange(e.target.value)}>
          <option value="">{!normalizedState ? 'Selecione primeiro a UF' : loadingCities ? 'Carregando cidades...' : !selectedState ? 'UF inválida' : 'Selecione a cidade'}</option>
          {city && !cities.some(item=>item.nome===city) && <option value={city}>{city}</option>}
          {cities.map(item=><option key={item.id} value={item.nome}>{item.nome}</option>)}
        </select>
      </label>}
  </>
}
