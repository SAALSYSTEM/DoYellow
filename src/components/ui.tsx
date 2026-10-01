import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowRight, BadgeCheck, Ban, Bell, Check, ChevronDown, CircleAlert, CircleDashed, Pause, PencilLine, Repeat, X } from 'lucide-react'
import type { Client, Freq, ProcessStatus, Task } from '../types'
import type { TaskState } from '../lib/select'
import { FREQ_LABEL, STATE_LABEL } from '../lib/recurrence'
import { TODAY, diffDays, fmt } from '../lib/dates'
import { employee } from '../lib/select'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" aria-label="DoYellow">
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden="true">
        <path d="M5 4 H32 C50.5 4 60 17.5 60 33 C60 49 49 61 32 61 H12 V41 L20.5 30.5 Z" fill="var(--brand)" />
        <path d="M24 61 L47 37 C52 36 57 34 60 31.5 C60.5 48 49.5 61 32 61 Z" fill="#F0A900" opacity=".85" />
        <circle cx="35" cy="31.5" r="14.5" fill="#fff" />
        <path d="M28.5 31.8 L33.3 36.4 L41.8 27.4" fill="none" stroke="var(--ink)" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <span className="font-display text-[22px] font-bold tracking-[-0.02em] leading-none">
          <span className="text-ink">Do</span>
          <span className="text-brand">Yellow</span>
        </span>
      )}
    </div>
  )
}

/** Farbe = Mandant. Punkt + Nummer, optional Name. */
export function ClientTag({ client, withName = false, size = 'md' }: { client?: Client; withName?: boolean; size?: 'sm' | 'md' }) {
  if (!client) return <span className="text-ink3">Ohne Mandant</span>
  return (
    <span className={cx('inline-flex items-center gap-1.5 min-w-0', size === 'sm' ? 'text-xs' : 'text-[13px]')}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: client.color }} />
      <span className="font-semibold tabular text-ink">{client.number}</span>
      {withName && <span className="truncate text-ink2">{client.name}</span>}
    </span>
  )
}

/** Status = Icon + Text + Form. Keine Statusfarben. */
export function StatusBadge({ state, task, compact = false }: { state: TaskState; task?: Task; compact?: boolean }) {
  const overdueDays = task ? -diffDays(task.dueDate, TODAY) : 0
  switch (state) {
    case 'overdue':
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-ink px-2 py-[3px] text-xs font-medium text-white">
          <AlertTriangle size={13} strokeWidth={2.2} aria-hidden="true" />
          {compact ? 'Überfällig' : `Überfällig · ${overdueDays} ${overdueDays === 1 ? 'Tag' : 'Tage'}`}
        </span>
      )
    case 'today':
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-ink px-2 py-[2px] text-xs font-medium text-ink">
          <CircleAlert size={13} strokeWidth={2.2} aria-hidden="true" />
          Heute fällig
        </span>
      )
    case 'soon':
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink2">
          <ArrowRight size={13} aria-hidden="true" />
          {task ? fmt.relative(task.dueDate) : 'Demnächst'}
        </span>
      )
    case 'done':
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink3">
          <Check size={13} strokeWidth={2.4} aria-hidden="true" />
          Erledigt
        </span>
      )
    case 'paused':
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink3">
          <Pause size={13} aria-hidden="true" />
          Pausiert
        </span>
      )
    case 'skipped':
      return <span className="text-xs text-ink3">Übersprungen</span>
    default:
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink2">
          <span className="h-[11px] w-[11px] rounded-full border-[1.5px] border-ink3" aria-hidden="true" />
          {task ? fmt.dayMonth(task.dueDate) : 'Offen'}
        </span>
      )
  }
}

export function RecurrenceTag({ freq, interval }: { freq: Freq; interval?: number }) {
  if (freq === 'once') return null
  const label = freq === 'week' && interval === 2 ? 'Alle 2 Wochen' : FREQ_LABEL[freq]
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink2">
      <Repeat size={12} aria-hidden="true" />
      {label}
    </span>
  )
}

export function ReminderTag({ days }: { days?: number }) {
  if (days === undefined) return null
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink2">
      <Bell size={12} aria-hidden="true" />
      {days === 0 ? 'Am Fälligkeitstag' : `${days} ${days === 1 ? 'Tag' : 'Tage'} vorher`}
    </span>
  )
}

export function Avatar({ id, size = 26 }: { id?: string; size?: number }) {
  const e = employee(id)
  if (!e) return <span className="text-ink3">–</span>
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-well text-[11px] font-semibold text-ink2 ring-1 ring-line"
      style={{ width: size, height: size }}
      title={`${e.firstName} ${e.lastName}`}
    >
      {e.firstName[0]}
      {e.lastName[0]}
    </span>
  )
}

export function Button({
  children, onClick, variant = 'secondary', size = 'md', type = 'button', className, ...rest
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit'
  className?: string
  'aria-label'?: string
  title?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm',
        variant === 'primary' && 'bg-brand text-brandink hover:brightness-[.97]',
        variant === 'secondary' && 'bg-surface text-ink ring-1 ring-line hover:bg-well',
        variant === 'ghost' && 'text-ink2 hover:bg-well hover:text-ink',
        variant === 'dark' && 'bg-ink text-white hover:bg-black',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function useOutside(onOutside: () => void, active: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!active) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOutside() }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onOutside() }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [active, onOutside])
  return ref
}

export interface Option { value: string; label: string; lead?: ReactNode; hint?: string }

/** Filter-Auswahl im Stil einer Pille. Aktive Auswahl zeigt ein × zum Entfernen. */
export function FilterSelect({
  id, label, value, options, placeholder, onChange, width = 'w-full',
}: {
  id: string
  label: string
  value?: string
  options: Option[]
  placeholder: string
  onChange: (v?: string) => void
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false), open)
  const cur = options.find((o) => o.value === value)
  return (
    <div className={cx('relative min-w-0', width)} ref={ref}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink2">{label}</label>
      <div className={cx('flex h-9 items-center rounded-lg bg-surface ring-1 transition', cur ? 'ring-ink/25' : 'ring-line')}>
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left text-[13px]"
        >
          {cur?.lead}
          <span className={cx('truncate', cur ? 'font-medium text-ink' : 'text-ink2')}>{cur ? cur.label : placeholder}</span>
        </button>
        {cur && (
          <button type="button" aria-label={`${label}-Filter entfernen`} onClick={() => onChange(undefined)} className="grid h-7 w-7 place-items-center rounded-md text-ink3 hover:bg-well hover:text-ink">
            <X size={14} />
          </button>
        )}
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOpen((o) => !o)} className="grid h-7 w-7 place-items-center text-ink3">
          <ChevronDown size={15} />
        </button>
      </div>
      {open && (
        <ul role="listbox" className="absolute left-0 top-full z-40 mt-1.5 max-h-72 w-full min-w-[220px] overflow-auto rounded-xl bg-surface p-1 shadow-pop ring-1 ring-line scroll-thin">
          <li>
            <button type="button" onClick={() => { onChange(undefined); setOpen(false) }} className={cx('flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-well', !value && 'font-medium')}>
              {placeholder}
            </button>
          </li>
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={cx('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-well', o.value === value && 'bg-well font-medium')}
              >
                {o.lead}
                <span className="truncate">{o.label}</span>
                {o.hint && <span className="ml-auto pl-2 text-xs text-ink3">{o.hint}</span>}
                {o.value === value && <Check size={14} className="ml-auto" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg bg-well p-0.5 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx('h-8 rounded-md px-3 text-[13px] transition', o.value === value ? 'bg-surface font-semibold text-ink shadow-soft ring-1 ring-line' : 'text-ink2 hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{children}</h3>
      {aside}
    </div>
  )
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {body && <p className="mt-1 text-xs text-ink2">{body}</p>}
    </div>
  )
}

export function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink2">{label}</label>
      {children}
    </div>
  )
}

export const inputCls = 'h-9 w-full rounded-lg bg-surface px-3 text-[13px] text-ink ring-1 ring-line placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-ink/40'

const STATE_ICON = { draft: PencilLine, tentative: CircleDashed, confirmed: BadgeCheck, done: Check, cancelled: Ban } as const

/** Planungszustand: Icon + Text, keine Farbe */
export function StateBadge({ state, iconOnly = false, size = 13 }: { state: ProcessStatus; iconOnly?: boolean; size?: number }) {
  const I = STATE_ICON[state]
  if (iconOnly) return <I size={size} strokeWidth={2.2} aria-label={STATE_LABEL[state]} className={cx('shrink-0', state === 'done' || state === 'cancelled' || state === 'draft' ? 'text-ink3' : 'text-ink2')} />
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap text-xs', state === 'confirmed' ? 'font-medium text-ink' : 'text-ink2')}>
      <I size={13} strokeWidth={2.2} aria-hidden="true" />
      {STATE_LABEL[state]}
    </span>
  )
}

/** Form je Zustand für Kalendereinträge: durchgezogen = bestätigt, gestrichelt = vorläufig, gestrichelt + kursiv = Entwurf */
export function chipShape(state: ProcessStatus) {
  switch (state) {
    case 'confirmed': return 'border border-solid border-line bg-surface'
    case 'tentative': return 'border border-dashed border-ink3/60 bg-surface'
    case 'draft': return 'border border-dashed border-ink3/40 bg-transparent italic'
    case 'done': return 'border border-solid border-hair bg-surface opacity-55'
    case 'cancelled': return 'border border-dashed border-hair bg-transparent opacity-45'
  }
}

export function GroupTag({ short }: { short?: string }) {
  if (!short) return null
  return <span className="inline-flex rounded-[5px] bg-well px-1.5 py-px text-[11px] font-semibold tracking-wide text-ink ring-1 ring-line">{short}</span>
}
