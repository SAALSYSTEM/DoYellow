// Jahresansicht: 12 Monatsspalten, Zeilen 1–31. Zeilenhöhe wächst mit dem vollsten Tag der Zeile.
import { AlertTriangle, CircleAlert, Clock } from 'lucide-react'
import type { Appointment, ISODate, Task } from '../types'
import { useStore } from '../state/store'
import { TODAY, daysInMonth, fmt, make, weekday } from '../lib/dates'
import { HOLIDAYS_NW } from '../lib/recurrence'
import { client, taskState, visible } from '../lib/select'
import { StateBadge, chipShape, cx } from './ui'

type Entry = { kind: 't'; t: Task } | { kind: 'a'; a: Appointment }
const MAX = 3

export function YearView() {
  const { s, d } = useStore()
  const year = s.cal.year
  const v = visible(s)
  const idx = new Map<ISODate, Entry[]>()
  const push = (date: ISODate, e: Entry) => { const l = idx.get(date); if (l) l.push(e); else idx.set(date, [e]) }
  for (const t of v.tasks) if (t.dueDate.startsWith(String(year))) push(t.dueDate, { kind: 't', t })
  for (const a of v.appointments) if (a.date.startsWith(String(year))) push(a.date, { kind: 'a', a })
  const num = (e: Entry) => client(s, e.kind === 't' ? e.t.clientId : e.a.clientId)?.number ?? '999'
  const rank = (e: Entry) => {
    if (e.kind === 'a') return 2
    const st = taskState(s, e.t)
    return st === 'overdue' ? 0 : st === 'today' ? 1 : e.t.state === 'cancelled' ? 4 : 3
  }
  for (const l of idx.values()) l.sort((a, b) => rank(a) - rank(b) || num(a).localeCompare(num(b)))
  const perMonth = Array.from({ length: 12 }, (_, i) => [...idx.entries()].filter(([k]) => Number(k.slice(5, 7)) === i + 1).reduce((n, [, l]) => n + l.length, 0))
  const total = perMonth.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      <Legend total={total} year={year} />
      <div className="max-h-[calc(100vh-240px)] min-h-[520px] overflow-auto rounded-2xl bg-surface ring-1 ring-line scroll-thin">
        <div role="grid" aria-label={`Jahresansicht ${year}`} className="grid min-w-[1180px]" style={{ gridTemplateColumns: 'repeat(12, minmax(96px, 1fr))' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <button
              key={`h${i}`}
              type="button"
              onClick={() => { d({ type: 'select', date: make(year, i + 1, i + 1 === Number(TODAY.slice(5, 7)) && year === Number(TODAY.slice(0, 4)) ? Number(TODAY.slice(8)) : 1) }); d({ type: 'calMode', mode: 'month' }) }}
              className={cx('sticky top-0 z-20 flex items-baseline justify-between gap-1 border-b border-line bg-surface/95 px-2 py-2.5 text-left backdrop-blur hover:bg-well', i > 0 && 'border-l border-hair')}
              title={`${fmt.monthYear(year, i + 1)} in der Monatsansicht öffnen`}
            >
              <span className={cx('text-[13px] font-semibold', `${year}-${String(i + 1).padStart(2, '0')}` === TODAY.slice(0, 7) && 'underline decoration-brand decoration-[3px] underline-offset-[5px]')}>{fmt.month(i + 1)}</span>
              <span className="text-[11px] text-ink3 tabular">{perMonth[i]}</span>
            </button>
          ))}
          {Array.from({ length: 31 }, (_, r) => r + 1).map((day) =>
            Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const valid = day <= daysInMonth(year, m)
              const date = valid ? make(year, m, day) : ''
              const list = valid ? idx.get(date) ?? [] : []
              const wd = valid ? weekday(date) : 0
              const holiday = valid ? HOLIDAYS_NW[date] : undefined
              const isSel = date === s.cal.selected
              return (
                <div
                  key={`${m}-${day}`}
                  role="gridcell"
                  aria-label={valid ? fmt.long(date) : undefined}
                  onClick={valid ? () => d({ type: 'select', date }) : undefined}
                  className={cx(
                    'relative flex min-h-[30px] min-w-0 gap-[3px] border-b border-hair py-[3px] pl-[3px] pr-1',
                    m > 1 && 'border-l',
                    !valid && 'bg-[repeating-linear-gradient(135deg,var(--well)_0_4px,transparent_4px_8px)]',
                    valid && 'cursor-pointer',
                    valid && (wd >= 6 || holiday) && 'bg-well',
                    isSel && 'bg-brandsoft/45',
                  )}
                  title={holiday}
                >
                  {valid && (
                    <>
                      <div className="w-[21px] shrink-0 pt-[2px] text-center leading-none">
                        <span className={cx('inline-grid h-[17px] min-w-[17px] place-items-center rounded-full px-0.5 text-[11px] tabular', date === TODAY ? 'bg-brand font-bold text-brandink' : wd >= 6 || holiday ? 'text-ink3' : 'font-semibold text-ink')}>{day}</span>
                        <span className={cx('mt-px block text-[9.5px]', holiday ? 'font-semibold text-ink2' : 'text-ink3')}>{holiday ? 'F' : fmt.weekdayShort(wd)}</span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-[2px]">
                        {list.slice(0, MAX).map((e) => <YearChip key={e.kind === 't' ? e.t.id : e.a.id} e={e} />)}
                        {list.length > MAX && (
                          <button type="button" onClick={(ev) => { ev.stopPropagation(); d({ type: 'drawer', drawer: { kind: 'day', date } }) }} className="block w-full rounded px-1 text-left text-[10.5px] font-medium text-ink2 hover:bg-well hover:text-ink">
                            +{list.length - MAX} weitere
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}

function YearChip({ e }: { e: Entry }) {
  const { s, d } = useStore()
  if (e.kind === 'a') {
    const c = client(s, e.a.clientId)
    return (
      <button type="button" onClick={(ev) => { ev.stopPropagation(); d({ type: 'select', date: e.a.date }); d({ type: 'calMode', mode: 'day' }) }} className="relative flex h-[18px] w-full items-center gap-1 rounded-[5px] bg-well pl-2 pr-1 text-left text-[10.5px] text-ink ring-1 ring-inset ring-hair" title={`${e.a.title} · ${e.a.start}–${e.a.end}`}>
        <span className="absolute inset-y-[3px] left-[3px] w-[2.5px] rounded-full" style={{ background: c?.color ?? 'var(--ink-3)' }} />
        <span className="min-w-0 truncate pl-px font-medium"><span className="font-semibold">{c ? c.number : 'INT'}</span><span className="mx-[2px] text-ink3">·</span>Termin</span>
        <Clock size={10} className="ml-auto shrink-0 text-ink3" aria-hidden="true" />
      </button>
    )
  }
  const t = e.t
  const c = client(s, t.clientId)
  const st = taskState(s, t)
  return (
    <button
      type="button"
      onClick={(ev) => { ev.stopPropagation(); d({ type: 'drawer', drawer: { kind: 'task', id: t.id } }) }}
      className={cx('relative flex h-[18px] w-full items-center gap-0.5 rounded-[5px] pl-[7px] pr-[3px] text-left text-[10.5px] text-ink transition hover:shadow-soft', chipShape(t.state))}
      title={`${c ? `${c.number} · ${c.name}` : 'Intern'} · ${t.title}${t.refPeriodKey ? ` · ${fmt.refPeriod(t.refPeriodKey)}` : ''}${t.start ? ` · ${t.start} Uhr` : ''}`}
    >
      <span className="absolute inset-y-[3px] left-[3px] w-[2.5px] rounded-full" style={{ background: c?.color ?? 'var(--ink-3)' }} />
      <span className={cx('min-w-0 truncate pl-px font-medium', t.state === 'cancelled' && 'line-through')}><span className="font-semibold">{c ? c.number : 'INT'}</span><span className="mx-[2px] text-ink3">·</span>{t.short ?? t.title}</span>
      <span className="ml-auto shrink-0 not-italic">
        {st === 'overdue' ? <span className="grid h-[13px] w-[13px] place-items-center rounded-[3px] bg-ink text-white" aria-label="Überfällig"><AlertTriangle size={8} strokeWidth={3} /></span>
          : st === 'today' ? <CircleAlert size={11} strokeWidth={2.4} aria-label="Heute fällig" />
          : t.state !== 'confirmed' && t.state !== 'done' ? <StateBadge state={t.state} iconOnly size={10} />
          : t.start ? <Clock size={10} className="text-ink3" aria-label="Termin" /> : null}
      </span>
    </button>
  )
}

function Legend({ total, year }: { total: number; year: number }) {
  const shape = (cls: string, label: string, extra?: React.ReactNode) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx('relative flex h-[16px] w-9 items-center justify-end rounded-[5px] pr-0.5', cls)}>
        <span className="absolute inset-y-[3px] left-[3px] w-[2.5px] rounded-full bg-ink3" />
        {extra}
      </span>
      {label}
    </span>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink2">
      <span className="font-medium text-ink tabular">{total} Einträge {year}</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2F9E5B]" /><span className="-ml-1 h-2 w-2 rounded-full bg-[#3B7BE8]" />Farbe = Mandant</span>
      {shape(chipShape('confirmed'), 'Bestätigt')}
      {shape(chipShape('tentative'), 'Vorläufig', <StateBadge state="tentative" iconOnly size={10} />)}
      {shape(chipShape('draft'), 'Entwurf', <StateBadge state="draft" iconOnly size={10} />)}
      {shape(chipShape('done'), 'Erledigt (blass)')}
      {shape(chipShape('cancelled'), 'Abgesagt', <StateBadge state="cancelled" iconOnly size={10} />)}
      {shape(chipShape('confirmed'), 'Überfällig', <span className="grid h-[12px] w-[12px] place-items-center rounded-[3px] bg-ink text-white"><AlertTriangle size={8} strokeWidth={3} /></span>)}
    </div>
  )
}
