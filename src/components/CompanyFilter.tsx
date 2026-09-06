import { FilterIcon } from './Icons'
import type { CompanyFilter as CompanyFilterValue } from '../lib/company'

export function CompanyFilter({ value, onChange, compact=false }: { value: CompanyFilterValue; onChange: (value: CompanyFilterValue)=>void; compact?: boolean }) {
  return <div className={`company-filter ${compact?'compact':''}`}>
    <span className="company-filter-label"><FilterIcon/> Central</span>
    <div className={`company-segmented state-${value}`} role="group" aria-label="Filtrar por central">
      <button type="button" className={value==='all'?'active':''} onClick={()=>onChange('all')}>Todas</button>
      <button type="button" className={`alta ${value==='alta'?'active':''}`} onClick={()=>onChange('alta')}>ALTA</button>
      <button type="button" className={`genex ${value==='genex'?'active':''}`} onClick={()=>onChange('genex')}>GENEX</button>
    </div>
  </div>
}
