import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const HomeIcon = (p:P) => <svg {...base} {...p}><path d="M4 11.5 12 5l8 6.5v7.2a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 18.7Z"/><path d="M9.3 20v-5.8h5.4V20"/></svg>
export const InboxIcon = (p:P) => <svg {...base} {...p}><path d="M5.5 6.5h13l1.5 8.2v3.5a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 18.2v-3.5Z"/><path d="M4.5 14.5h4l1.4 2h4.2l1.4-2h4"/><path d="M8 9h8"/></svg>
export const CalendarIcon = (p:P) => <svg {...base} {...p}><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M8 3.8v3.4M16 3.8v3.4M4 9.3h16"/><path d="M8 13h3M8 16h5"/></svg>
export const TripIcon = (p:P) => <svg {...base} {...p}><path d="M7 6.2h10a2 2 0 0 1 2 2v9.3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8.2a2 2 0 0 1 2-2Z"/><path d="M9 6.2V4.7h6v1.5M8.4 11.2h7.2M8.4 15h4.7"/><circle cx="16.8" cy="15.2" r="1.4"/></svg>
export const ToolIcon = (p:P) => <svg {...base} {...p}><path d="M14.6 6.3a4.4 4.4 0 0 0 5.1 5.1l-7.6 7.6a2.7 2.7 0 0 1-3.8-3.8Z"/><path d="M6.6 17.4 4.5 19.5M15.7 5.2l3.1 3.1"/></svg>
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
export const TrashIcon = (p:P) => <svg {...base} {...p}><path d="M4.5 7h15M9 7V4.8h6V7M7 7l.7 12h8.6L17 7M10 10.5v5M14 10.5v5"/></svg>
export const FilterIcon = (p:P) => <svg {...base} {...p}><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="12" cy="18" r="1.4"/></svg>
export const LogoutIcon = (p:P) => <svg {...base} {...p}><path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10"/><path d="M14 8l4 4-4 4M18 12H9"/></svg>
export const EditIcon = (p:P) => <svg {...base} {...p}><path d="m5 19 3.4-.7L18 8.7a2 2 0 0 0-2.7-2.7L5.7 15.6Z"/><path d="m13.8 7.5 2.7 2.7M5.7 15.6l2.7 2.7"/></svg>
export const BuildingIcon = (p:P) => <svg {...base} {...p}><path d="M5 20V5.8A1.8 1.8 0 0 1 6.8 4h8.4A1.8 1.8 0 0 1 17 5.8V20"/><path d="M8 8h2M12 8h2M8 11.5h2M12 11.5h2M8 15h2M12 15h2M3.5 20h17"/></svg>
export const ClockIcon = (p:P) => <svg {...base} {...p}><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>
export const MoneyIcon = (p:P) => <svg {...base} {...p}><rect x="4" y="6" width="16" height="12" rx="2.2"/><path d="M7 9.5h.01M17 14.5h.01"/><circle cx="12" cy="12" r="2.2"/></svg>
export const ListIcon = (p:P) => <svg {...base} {...p}><path d="M9 7h10M9 12h10M9 17h10"/><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/></svg>
export const CompassIcon = (p:P) => <svg {...base} {...p}><circle cx="12" cy="12" r="8"/><path d="m14.7 9.3-1.5 3.9-3.9 1.5 1.5-3.9Z"/></svg>
export const SearchIcon = (p:P) => <svg {...base} {...p}><circle cx="10.5" cy="10.5" r="5.8"/><path d="m15 15 4.5 4.5"/></svg>
export const ArchiveIcon = (p:P) => <svg {...base} {...p}><path d="M5 7h14v12H5z"/><path d="M4 4h16v3H4zM9 11h6"/></svg>
export const PrintIcon = (p:P) => <svg {...base} {...p}><path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v6H7z"/><path d="M17 12h.01"/></svg>
export const CopyIcon = (p:P) => <svg {...base} {...p}><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg>

export const EyeIcon = (p:P) => <svg {...base} {...p}><path d="M2.8 12s3.4-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.4 5.5-9.2 5.5S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>
export const EyeOffIcon = (p:P) => <svg {...base} {...p}><path d="m4 4 16 16"/><path d="M9.2 6.9A9.8 9.8 0 0 1 12 6.5c5.8 0 9.2 5.5 9.2 5.5a15.5 15.5 0 0 1-3 3.5M14.7 14.7a3.7 3.7 0 0 1-5.4-5.4M6.1 8.1A16 16 0 0 0 2.8 12s3.4 5.5 9.2 5.5a9.7 9.7 0 0 0 3-.5"/></svg>
export const PlaneIcon = (p:P) => <svg {...base} {...p}><path d="M3.5 13.5 20 6.2c1.1-.5 2 .8 1.1 1.6l-5 4.2-1 5.6-2.1 1-.8-4.6-4.5 2.5-1 2.8-1.5.7-.1-3.2-2.6-1.8 1-.5 3 .4 4.6-2.7-3.6-2.4.4-1.5 5.1 1.5Z"/></svg>
export const SendIcon = (p:P) => <svg {...base} {...p}><path d="M3.5 12 20 4.8 16 20l-4.4-6.1L5.8 16Z"/><path d="m11.6 13.9 3.2-3.7"/></svg>
export const MailIcon = (p:P) => <svg {...base} {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2.2"/><path d="m5 8 7 5 7-5"/></svg>
export const UserIcon = (p:P) => <svg {...base} {...p}><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>
