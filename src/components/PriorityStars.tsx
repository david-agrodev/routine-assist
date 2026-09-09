import type { DemandPriority } from '../types/routine'

export function PriorityStars({ value, onChange, label = 'Prioridade' }: { value: DemandPriority; onChange: (value: DemandPriority) => void; label?: string }) {
  return <div className="priority-picker" role="radiogroup" aria-label={label}>
    <span className="priority-picker-label">{label}</span>
    <div className="priority-stars">
      {Array.from({ length: 5 }, (_, index) => {
        const level = (index + 1) as DemandPriority
        return <button type="button" key={level} className={`priority-star ${level <= value ? 'active' : ''}`} onClick={() => onChange(level)} aria-label={`${level} ${level === 1 ? 'estrela' : 'estrelas'}`} aria-pressed={level === value}>★</button>
      })}
    </div>
    <span className="priority-level">{value}/5</span>
  </div>
}
