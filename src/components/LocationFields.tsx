import { useEffect, useMemo, useState } from 'react'
import { getBrazilStates, getCitiesByState, type IbgeCity, type IbgeState } from '../services/localities'

type Props = {
  city: string
  state: string
  onCityChange: (value: string) => void
  onStateChange: (value: string) => void
  required?: boolean
}

export function LocationFields({ city, state, onCityChange, onStateChange, required }: Props) {
  const [states, setStates] = useState<IbgeState[]>([])
  const [cities, setCities] = useState<IbgeCity[]>([])
  const [loadingStates, setLoadingStates] = useState(true)
  const [loadingCities, setLoadingCities] = useState(false)
  const [statesFailed, setStatesFailed] = useState(false)
  const [citiesFailed, setCitiesFailed] = useState(false)

  useEffect(() => {
    let active = true
    getBrazilStates().then(data => { if (active) { setStates(data); setStatesFailed(false) } })
      .catch(() => { if (active) setStatesFailed(true) })
      .finally(() => { if (active) setLoadingStates(false) })
    return () => { active = false }
  }, [])

  const selectedState = useMemo(() => states.find(item => item.sigla === state), [states, state])

  useEffect(() => {
    let active = true
    setCitiesFailed(false)
    if (!selectedState) { setCities([]); return }
    setLoadingCities(true)
    getCitiesByState(selectedState)
      .then(data => { if (active) { setCities(data); setCitiesFailed(false) } })
      .catch(() => { if (active) { setCities([]); setCitiesFailed(true) } })
      .finally(() => { if (active) setLoadingCities(false) })
    return () => { active = false }
  }, [selectedState])

  if (statesFailed && !states.length) return <>
    <label className="field"><span>UF{required ? ' *' : ''}</span><input maxLength={2} value={state} onChange={e=>onStateChange(e.target.value.toUpperCase())} placeholder="MG"/></label>
    <label className="field"><span>Cidade{required ? ' *' : ''}</span><input value={city} onChange={e=>onCityChange(e.target.value)} placeholder="Digite a cidade"/></label>
  </>

  return <>
    <label className="field"><span>UF{required ? ' *' : ''}</span>
      <select value={state} disabled={loadingStates} onChange={e=>{ onStateChange(e.target.value); onCityChange('') }}>
        <option value="">{loadingStates ? 'Carregando estados...' : 'Selecione o estado'}</option>
        {states.map(item=><option key={item.id} value={item.sigla}>{item.sigla} — {item.nome}</option>)}
      </select>
    </label>
    {citiesFailed ? <label className="field"><span>Cidade{required ? ' *' : ''}</span><input value={city} onChange={e=>onCityChange(e.target.value)} placeholder="API indisponível — digite a cidade"/></label> :
      <label className="field"><span>Cidade{required ? ' *' : ''}</span>
        <select value={city} disabled={!state || loadingCities} onChange={e=>onCityChange(e.target.value)}>
          <option value="">{!state ? 'Selecione primeiro a UF' : loadingCities ? 'Carregando cidades...' : 'Selecione a cidade'}</option>
          {city && !cities.some(item=>item.nome===city) && <option value={city}>{city}</option>}
          {cities.map(item=><option key={item.id} value={item.nome}>{item.nome}</option>)}
        </select>
      </label>}
  </>
}
