// Icones inline (sem dependencia externa)
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }

export const HomeIcon = () => (
  <svg {...base}><path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>
)
export const FeedIcon = () => (
  <svg {...base}><rect x="6" y="2" width="12" height="20" rx="3" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></svg>
)
export const SearchIcon = () => (
  <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const HeartIcon = ({ filled }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'}><path d="M12 21s-7-4.4-9.3-8.6C.9 8.9 3 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5 19 5 21.1 8.9 19.3 12.4 17 16.6 12 21 12 21z" /></svg>
)
export const StudioIcon = () => (
  <svg {...base}><path d="M4 7h16v12H4z" /><path d="m8 3 2 4M14 3l2 4M10 11l5 2.5-5 2.5z" fill="currentColor" stroke="none" /></svg>
)
export const PlayIcon = () => (
  <svg {...base} fill="currentColor" stroke="none"><path d="M7 4.5v15l12-7.5z" /></svg>
)
export const PauseIcon = () => (
  <svg {...base} fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
)
export const NextIcon = () => (
  <svg {...base} fill="currentColor" stroke="none"><path d="M5 5v14l10-7z" /><rect x="17" y="5" width="2.5" height="14" rx="1" /></svg>
)
export const PrevIcon = () => (
  <svg {...base} fill="currentColor" stroke="none"><path d="M19 5v14L9 12z" /><rect x="4.5" y="5" width="2.5" height="14" rx="1" /></svg>
)
export const BackIcon = () => (
  <svg {...base}><path d="m15 5-7 7 7 7" /></svg>
)
export const ListIcon = () => (
  <svg {...base}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
)
export const MuteIcon = ({ muted }) => (
  <svg {...base}>
    <path d="M4 10v4h3l5 4V6L7 10z" fill="currentColor" />
    {muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
  </svg>
)
export const CheckIcon = () => (
  <svg {...base} strokeWidth={3}><path d="m5 12 5 5 9-10" /></svg>
)
export const SparkIcon = () => (
  <svg {...base} fill="currentColor" stroke="none"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" /><path d="M19 15l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6L15.5 18l2.6-.9z" /></svg>
)
export const UserIcon = () => (
  <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
)
