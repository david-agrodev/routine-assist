import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const HomeIcon = (p:P) => <svg {...base} {...p}><path d="M4 11.5 12 5l8 6.5v7.2a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 18.7Z"/><path d="M9.3 20v-5.8h5.4V20"/></svg>
export const InboxIcon = (p:P) => <svg {...base} {...p}><path d="M5.5 6.5h13l1.5 8.2v3.5a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 18.2v-3.5Z"/><path d="M4.5 14.5h4l1.4 2h4.2l1.4-2h4"/><path d="M8 9h8"/></svg>
export const CalendarIcon = (p:P) => <svg {...base} {...p}><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M8 3.8v3.4M16 3.8v3.4M4 9.3h16"/><path d="M8 13h3M8 16h5"/></svg>
export const TripIcon = (p:P) => <svg {...base} {...p}><path d="M7 6.2h10a2 2 0 0 1 2 2v9.3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8.2a2 2 0 0 1 2-2Z"/><path d="M9 6.2V4.7h6v1.5M8.4 11.2h7.2M8.4 15h4.7"/><circle cx="16.8" cy="15.2" r="1.4"/></svg>
export const BellIcon = (p:P) => <svg {...base} {...p}><path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 6 2 6 2 7.5h-15c0-1.5 2-1.5 2-7.5Z"/><path d="M9.8 19a2.5 2.5 0 0 0 4.4 0"/></svg>
export const PlusIcon = (p:P) => <svg {...base} {...p}><path d="M12 5v14M5 12h14"/></svg>
export const LocationIcon = (p:P) => <svg {...base} {...p}><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg>
export const HotelIcon = (p:P) => <svg {...base} {...p}><path d="M4 19V7.5A1.5 1.5 0 0 1 5.5 6h8A1.5 1.5 0 0 1 15 7.5V19M15 10h3.5A1.5 1.5 0 0 1 20 11.5V19M7.5 10h2M7.5 13.5h2M7.5 17h2M4 19h17"/></svg>
export const CarIcon = (p:P) => <svg {...base} {...p}><path d="m5.5 10 1.4-4h10.2l1.4 4 1.5 1.5V17H4v-5.5Z"/><path d="M6.5 10h11M7 17v2M17 17v2"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/></svg>
export const AlertIcon = (p:P) => <svg {...base} {...p}><path d="M12 4.4 21 20H3Z"/><path d="M12 9v5M12 17.3v.1"/></svg>
export const CheckIcon = (p:P) => <svg {...base} {...p}><path d="m5 12.5 4.1 4L19 7.7"/></svg>
export const ArrowIcon = (p:P) => <svg {...base} {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
export const SettingsIcon = (p:P) => <svg {...base} {...p}><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.8-1.9.9-1.9-2.1-2.1-1.9.9-1.9-.8-.7-2h-3l-.7 2-1.9.8-1.9-.9L.9 6l.9 1.9-.8 1.9-2 .7v3l2 .7.8 1.9-.9 1.9 2.1 2.1 1.9-.9 1.9.8.7 2h3l.7-2 1.9-.8 1.9.9 2.1-2.1-.9-1.9.8-1.9Z" transform="translate(2.5 -1.5) scale(.8)"/></svg>
export const RouteIcon = (p:P) => <svg {...base} {...p}><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18c4 0 2-7 6-7h2M8 6h3"/></svg>
export const MenuIcon = (p:P) => <svg {...base} {...p}><path d="M5 7h14M5 12h14M5 17h14"/></svg>
