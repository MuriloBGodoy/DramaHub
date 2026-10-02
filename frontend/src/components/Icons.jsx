// Ícones inline (sem dependência externa). Traço 1.8, cor herdada (currentColor).
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true }

export const HomeIcon = () => (
  <svg {...base}><path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" /></svg>
)
export const FeedIcon = () => (
  <svg {...base}><rect x="5" y="2.5" width="14" height="19" rx="3" /><path d="m10 9 5 3-5 3z" /></svg>
)
export const SearchIcon = () => (
  <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
)
export const HeartIcon = ({ filled }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'}><path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" /></svg>
)
export const BookmarkIcon = ({ filled }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'}><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" /></svg>
)
export const StudioIcon = () => (
  <svg {...base}><rect x="3.5" y="6.5" width="17" height="13" rx="2" /><path d="m8 3 2 3.5M14 3l2 3.5" /><path d="m10.5 10.5 4 2.5-4 2.5z" /></svg>
)
export const PlayIcon = () => (
  <svg {...base} fill="currentColor" stroke="none"><path d="M7.5 4.8v14.4L19.5 12z" /></svg>
)
export const PauseIcon = () => (
  <svg {...base} fill="currentColor" stroke="none"><rect x="6.5" y="4.5" width="3.8" height="15" rx="1" /><rect x="13.7" y="4.5" width="3.8" height="15" rx="1" /></svg>
)
export const NextIcon = () => (
  <svg {...base}><path d="M6 5.5 15.5 12 6 18.5z" /><path d="M18.5 5.5v13" /></svg>
)
export const PrevIcon = () => (
  <svg {...base}><path d="M18 5.5 8.5 12l9.5 6.5z" /><path d="M5.5 5.5v13" /></svg>
)
export const BackIcon = () => (
  <svg {...base}><path d="m15 5-7 7 7 7" /></svg>
)
export const ChevronIcon = () => (
  <svg {...base}><path d="m9 5 7 7-7 7" /></svg>
)
export const ListIcon = () => (
  <svg {...base}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r=".6" fill="currentColor" /><circle cx="4.5" cy="12" r=".6" fill="currentColor" /><circle cx="4.5" cy="18" r=".6" fill="currentColor" /></svg>
)
export const MuteIcon = ({ muted }) => (
  <svg {...base}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {muted ? <path d="m16 9.5 5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" />}
  </svg>
)
export const CheckIcon = () => (
  <svg {...base} strokeWidth={2.2}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const SparkIcon = () => (
  <svg {...base}><path d="M12 3.5 13.7 9l5.3 1.8-5.3 1.8L12 18l-1.7-5.4L5 10.8 10.3 9z" /></svg>
)
export const UserIcon = () => (
  <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.6-4 4.6-6 8-6s6.4 2 8 6" /></svg>
)
export const ExternalIcon = () => (
  <svg {...base}><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
)
export const AlertIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16.3v.1" /></svg>
)
export const FitIcon = ({ fill }) => (
  <svg {...base}>
    {fill
      ? <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
      : <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />}
  </svg>
)
/** −10 s / +10 s: seta circular com o número dentro. */
export const SkipIcon = ({ forward }) => (
  <span className="skip-ic">
    <svg {...base}>
      {forward
        ? <><path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4" /><path d="M19.5 3.8v3.9h-3.9" /></>
        : <><path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4" /><path d="M4.5 3.8v3.9h3.9" /></>}
    </svg>
    <b>10</b>
  </span>
)
