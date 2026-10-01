import { AlertTriangle, BookOpenCheck, ChevronLeft, ChevronRight, CircleAlert, Clock, Plane, Plus } from 'lucide-react'
import type { Absence, Appointment, FollowUp, ISODate, Task } from '../types'
import { useStore, type CalendarMode } from '../state/store'
import { TODAY, addDays, daysInMonth, fmt, inRange, isoWeek, make, startOfWeek, weekday } from '../lib/dates'
import { HOLIDAYS_NW } from '../lib/recurrence'
import { client, employee, taskState, team, visible } from '../lib/select'
import { Segmented, StateBadge, chipShape, cx } from './ui'
import { YearView } from './YearView'

type DayItems = { tasks: Task[]; appts: Appointment[]; abs: Absence[]; follow: FollowUp[] }

function useDayIndex() {
  const { s } = useStore()
  const v = visible(s)
  return (d: ISODate): DayItems => ({
    tasks: v.tasks.filter((t) => t.dueDate === d),
    appts: v.appointments.filter((a) => a.date === d).sort((a, b) => a.start.localeCompare(b.start)),
    abs: v.absences.filter((a) => inRange(d, a.from, a.to)),
    follow: v.followups.filter((f) => f.date === d && !f.done),
  })
}

export function Calendar() {
  const { s, d } = useStore()
  const { year, month, mode, selected } = s.cal
  const title =
    mode === 'year' ? String(year)
    : mode === 'month' ? fmt.monthYear(year, month)
    : mode === 'week' ? `KW ${isoWeek(selected)} · ${fmt.dayMonth(startOfWeek(selected))}–${fmt.dayMonth(addDays(startOfWeek(selected), 6))}${selected.slice(0, 4)}`
    : fmt.long(selected)
  const step = (dir: number) => {
    if (mode === 'year') d({ type: 'calMonth', delta: dir * 12 })
    else if (mode === 'month') d({ type: 'calMonth', delta: dir })
    else d({ type: 'select', date: addDays(selected, dir * (mode === 'week' ? 7 : 1)) })
  }
  return (
    <section aria-label="Kalender" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-[28px] font-bold tracking-[-0.025em] text-ink sm:text-[32px]">{title}</h1>
        <button type="button" onClick={() => d({ type: 'calToday' })} className="h-9 rounded-lg bg-surface px-3.5 text-[13px] font-semibold ring-1 ring-line hover:bg-well">Heute</button>
        <div className="flex rounded-lg bg-surface ring-1 ring-line">
          <button type="button" aria-label="Zurück" onClick={() => step(-1)} className="grid h-9 w-9 place-items-center rounded-l-lg text-ink2 hover:bg-well"><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Weiter" onClick={() => step(1)} className="grid h-9 w-9 place-items-center rounded-r-lg border-l border-line text-ink2 hover:bg-well"><ChevronRight size={18} /></button>
        </div>
        <Segmented<CalendarMode>
          label="Kalenderansicht"
          value={mode}
          onChange={(m) => d({ type: 'calMode', mode: m })}
          options={[{ value: 'year', label: 'Jahr' }, { value: 'month', label: 'Monat' }, { value: 'week', label: 'Woche' }, { value: 'day', label: 'Tag' }]}
        />
      </div>
      {mode === 'year' && <YearView />}
      {mode === 'month' && <MonthView />}
      {mode === 'week' && <WeekView />}
      {mode === 'day' && <DayView />}
    </section>
  )
}

function MonthView() {
  const { s, d } = useStore()
  const { year, month, selected } = s.cal
  const itemsOf = useDayIndex()
  const first = make(year, month, 1)
  const start = startOfWeek(first)
  const last = make(year, month, daysInMonth(year, month))
  const weeks: ISODate[][] = []
  for (let w = start; w <= last; w = addDays(w, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)))
  const inMonth = (x: ISODate) => x.slice(0, 7) === first.slice(0, 7)

  return (
    <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-line scroll-thin">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[36px_repeat(7,minmax(0,1fr))] border-b border-line text-center text-xs font-medium text-ink2">
          <div />
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="py-2.5">{fmt.weekdayShort(i)}</div>)}
        </div>
        {weeks.map((wk, wi) => (
          <div key={wk[0]} className={cx('grid grid-cols-[36px_repeat(7,minmax(0,1fr))]', wi < weeks.length - 1 && 'border-b border-hair')}>
            <div className="pt-2.5 text-center text-[10.5px] leading-tight text-ink3 tabular">KW<br />{isoWeek(wk[0])}</div>
            {wk.map((day) => {
              const it = itemsOf(day)
              const wkEnd = weekday(day) >= 6
              const isToday = day === TODAY
              const isSel = day === selected
              const holiday = HOLIDAYS_NW[day]
              const show = inMonth(day)
              const events = show ? [...it.appts.map((a) => ({ k: 'a' as const, a })), ...it.tasks.map((t) => ({ k: 't' as const, t })), ...it.follow.map((f) => ({ k: 'f' as const, f }))] : []
              const max = it.abs.length ? 2 : 3
              return (
                <div
                  key={day}
                  role="gridcell"
                  aria-selected={isSel}
                  onClick={() => d({ type: 'select', date: day })}
                  className={cx(
                    'group relative min-h-[112px] cursor-pointer border-l border-hair p-1.5 transition-colors',
                    wkEnd && 'bg-canvas',
                    isSel && 'bg-brandsoft/40',
                  )}
                >
                  {isSel && <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ink/15" />}
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={cx(
                      'grid h-6 min-w-6 place-items-center rounded-full px-1 text-[13px] tabular',
                      isToday ? 'bg-brand font-bold text-brandink' : show ? 'font-semibold text-ink' : 'text-ink3',
                    )}>
                      {Number(day.slice(8))}
                    </span>
                    {holiday && show && <span className="truncate text-[10.5px] text-ink3" title={holiday}>{holiday}</span>}
                    {show && (
                      <button type="button" aria-label={`Neue Aufgabe am ${fmt.date(day)}`} onClick={(e) => { e.stopPropagation(); d({ type: 'drawer', drawer: { kind: 'new', what: 'task', date: day } }) }} className="ml-auto hidden h-5 w-5 place-items-center rounded text-ink3 hover:bg-well hover:text-ink group-hover:grid">
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {show && it.abs.map((a) => <AbsenceBar key={a.id} a={a} day={day} />)}
                    {events.slice(0, max).map((e) =>
                      e.k === 'a' ? <ApptChip key={e.a.id} a={e.a} /> : e.k === 't' ? <TaskChip key={e.t.id} t={e.t} /> : <FollowChip key={e.f.id} f={e.f} />,
                    )}
                    {events.length > max && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); d({ type: 'select', date: day }); d({ type: 'drawer', drawer: { kind: 'day', date: day } }) }} className="w-full rounded px-1.5 text-left text-[11px] font-medium text-ink2 hover:text-ink">
                        + {events.length - max} weitere
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mehrtägige Abwesenheit als durchgehender, neutraler Streifen */
function AbsenceBar({ a, day }: { a: Absence; day: ISODate }) {
  const start = day === a.from || weekday(day) === 1
  const end = day === a.to || weekday(day) === 7
  const e = employee(a.employeeId)
  const single = start && end
  return (
    <div
      className={cx(
        'flex h-[22px] items-center gap-1.5 bg-well px-2 text-[11px] text-ink2 ring-1 ring-inset ring-line',
        start ? 'rounded-l-md' : '-ml-[7px] rounded-l-none',
        end ? 'rounded-r-md' : '-mr-[7px] rounded-r-none',
      )}
      title={`${e?.firstName} ${e?.lastName} · ${a.type}${a.note ? ' · ' + a.note : ''}`}
    >
      {start && (
        <span className={cx('relative z-10 flex min-w-0 items-center gap-1.5 whitespace-nowrap', single && 'overflow-hidden')}>
          <Plane size={12} className="shrink-0" aria-hidden="true" />
          <span className={cx(single && 'truncate')}>{e?.lastName} · {a.type}</span>
        </span>
      )}
    </div>
  )
}

export function Strip({ color }: { color?: string }) {
  return <span className="absolute inset-y-1 left-[3px] w-[3px] rounded-full" style={{ background: color ?? 'var(--line)' }} aria-hidden="true" />
}

export function TaskChip({ t }: { t: Task }) {
  const { s, d } = useStore()
  const c = client(s, t.clientId)
  const st = taskState(s, t)
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); d({ type: 'drawer', drawer: { kind: 'task', id: t.id } }) }}
      className={cx('relative block w-full rounded-md py-1 pl-2.5 pr-1 text-left transition hover:shadow-soft', chipShape(t.state))}
      title={`${c ? c.number + ' · ' + c.name + ' · ' : ''}${t.title}${t.refPeriodKey ? ' · ' + fmt.refPeriod(t.refPeriodKey) : ''}`}
    >
      <Strip color={c?.color} />
      <span className="flex items-center gap-1 text-[11px] font-semibold leading-4 text-ink">
        <span className="min-w-0 truncate">{c ? c.number : 'Intern'} · {t.short ?? team(t.teamId)?.name}</span>
        <span className="ml-auto shrink-0">
          {st === 'overdue' ? <span className="grid h-4 w-4 place-items-center rounded bg-ink text-white" aria-label="Überfällig"><AlertTriangle size={10} strokeWidth={2.6} /></span>
            : st === 'today' ? <CircleAlert size={13} strokeWidth={2.4} aria-label="Heute fällig" />
            : t.state !== 'confirmed' ? <StateBadge state={t.state} iconOnly size={12} /> : null}
        </span>
      </span>
      <span className="flex items-center gap-1 text-[11px] leading-4 text-ink2">
        <span className={cx('min-w-0 truncate', (t.state === 'done' || t.state === 'cancelled') && 'line-through decoration-ink3/60')}>{t.title}</span>
        {t.start && <span className="ml-auto shrink-0 text-[10.5px] not-italic tabular">{t.start}</span>}
      </span>
    </button>
  )
}

function ApptChip({ a }: { a: Appointment }) {
  const { s, d } = useStore()
  const c = client(s, a.clientId)
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); d({ type: 'select', date: a.date }); d({ type: 'calMode', mode: 'day' }) }}
      className="relative block w-full rounded-md bg-well py-1 pl-2.5 pr-1 text-left ring-1 ring-hair hover:ring-line"
      title={`${a.title} · ${a.start}–${a.end}`}
    >
      <Strip color={c?.color} />
      <span className="block truncate text-[11px] font-semibold leading-4 text-ink">{c ? c.number : 'Intern'} · {a.teamId ? team(a.teamId)?.name : 'Termin'}</span>
      <span className="flex items-center gap-1 text-[11px] leading-4 text-ink2">
        <span className="min-w-0 truncate">{a.title}</span>
        <span className="ml-auto shrink-0 text-[10.5px] tabular">{a.start}</span>
      </span>
    </button>
  )
}

function FollowChip({ f }: { f: FollowUp }) {
  const { s, d } = useStore()
  const c = client(s, f.clientId)
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); d({ type: 'view', view: 'followups' }) }} className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] text-ink2 hover:bg-well" title={f.title}>
      <BookOpenCheck size={12} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{c ? c.number + ' · ' : ''}{f.title}</span>
    </button>
  )
}

function WeekView() {
  const { s, d } = useStore()
  const itemsOf = useDayIndex()
  const start = startOfWeek(s.cal.selected)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-line scroll-thin">
      <div className="grid min-w-[760px] grid-cols-7">
        {days.map((day, i) => {
          const it = itemsOf(day)
          return (
            <div key={day} onClick={() => d({ type: 'select', date: day })} className={cx('min-h-[420px] cursor-pointer p-2', i > 0 && 'border-l border-hair', weekday(day) >= 6 && 'bg-canvas', day === s.cal.selected && 'bg-brandsoft/40')}>
              <div className="mb-2 flex items-baseline gap-1.5 px-1">
                <span className="text-xs text-ink2">{fmt.weekdayShort(weekday(day))}</span>
                <span className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1 text-[13px] font-semibold tabular', day === TODAY && 'bg-brand')}>{Number(day.slice(8))}</span>
              </div>
              {HOLIDAYS_NW[day] && <p className="mb-1 px-1 text-[10.5px] text-ink3">{HOLIDAYS_NW[day]}</p>}
              <div className="space-y-1">
                {it.abs.map((a) => (
                  <div key={a.id} className="flex items-center gap-1.5 rounded-md bg-well px-2 py-1 text-[11px] text-ink2 ring-1 ring-inset ring-line"><Plane size={12} />{employee(a.employeeId)?.lastName}</div>
                ))}
                {it.appts.map((a) => <ApptChip key={a.id} a={a} />)}
                {it.tasks.map((t) => <TaskChip key={t.id} t={t} />)}
                {it.follow.map((f) => <FollowChip key={f.id} f={f} />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayView() {
  const { s, d } = useStore()
  const itemsOf = useDayIndex()
  const day = s.cal.selected
  const it = itemsOf(day)
  const hours = Array.from({ length: 12 }, (_, i) => 7 + i)
  const H = 52
  const pos = (hm: string) => { const [h, m] = hm.split(':').map(Number); return (h - 7 + m / 60) * H }
  return (
    <div className="grid gap-4 rounded-2xl bg-surface p-4 ring-1 ring-line md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-medium text-ink2">Fällige Aufgaben</p>
        <div className="space-y-1.5">
          {it.abs.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md bg-well px-2.5 py-1.5 text-xs text-ink2 ring-1 ring-inset ring-line"><Plane size={13} />{employee(a.employeeId)?.firstName} {employee(a.employeeId)?.lastName} · {a.type}</div>
          ))}
          {it.tasks.filter((t) => !t.start).length === 0 && <p className="text-[13px] text-ink3">Keine Aufgaben an diesem Tag.</p>}
          {it.tasks.filter((t) => !t.start).map((t) => <TaskChip key={t.id} t={t} />)}
          {it.follow.map((f) => <FollowChip key={f.id} f={f} />)}
        </div>
      </div>
      <div className="min-w-0">
        <p className="mb-4 text-xs font-medium text-ink2">Termine</p>
        <div className="relative" style={{ height: hours.length * H }}>
          {hours.map((h, i) => (
            <div key={h} className="absolute inset-x-0 flex items-start gap-2 border-t border-hair" style={{ top: i * H }}>
              <span className="-mt-2 w-10 bg-surface pr-1 text-right text-[11px] text-ink3 tabular">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
          {it.tasks.filter((t) => t.start && t.end).map((t) => {
            const c = client(s, t.clientId)
            return (
              <button type="button" key={t.id} onClick={() => d({ type: 'drawer', drawer: { kind: 'task', id: t.id } })} className={cx('absolute left-12 right-0 overflow-hidden rounded-lg py-1.5 pl-3.5 pr-2 text-left', chipShape(t.state))} style={{ top: pos(t.start!) + 2, height: Math.max(pos(t.end!) - pos(t.start!) - 4, 26) }}>
                <Strip color={c?.color} />
                <p className="flex items-center gap-1.5 text-[12px] font-semibold"><Clock size={12} aria-hidden="true" />{t.start}–{t.end} · {t.title}<span className="ml-auto"><StateBadge state={t.state} /></span></p>
                <p className="truncate text-[11px] text-ink2">{c ? `${c.number} · ${c.name}` : 'Intern'} · {t.short} · {(t.participantIds ?? []).map((e) => employee(e)?.lastName).join(', ')}</p>
              </button>
            )
          })}
          {it.appts.map((a) => {
            const c = client(s, a.clientId)
            return (
              <div key={a.id} className="absolute left-12 right-0 overflow-hidden rounded-lg bg-well py-1.5 pl-3.5 pr-2 ring-1 ring-line" style={{ top: pos(a.start) + 2, height: Math.max(pos(a.end) - pos(a.start) - 4, 26) }}>
                <Strip color={c?.color} />
                <p className="flex items-center gap-1.5 text-[12px] font-semibold"><Clock size={12} aria-hidden="true" />{a.start}–{a.end} · {a.title}</p>
                <p className="truncate text-[11px] text-ink2">{c ? `${c.number} · ${c.name}` : 'Intern'}{a.location ? ` · ${a.location}` : ''} · {a.employeeIds.map((e) => employee(e)?.lastName).join(', ')}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
