import { AlertTriangle, ArrowRight, CalendarRange, ChevronRight, CircleAlert, ListTodo, MoreHorizontal } from 'lucide-react'
import { useStore } from '../state/store'
import { CLIENT_PALETTE } from '../data/mock'
import { TODAY, daysInMonth, fmt, make, weekday } from '../lib/dates'
import { client, counts, employee, matchTask, team, teamLoad, visible } from '../lib/select'
import { cx } from './ui'

export function ContextPanel() {
  const { s, d } = useStore()
  const c = client(s, s.filters.clientId)
  const v = visible(s)
  const k = counts(s, v.tasks)
  const { year, month } = s.cal
  // Teamaufwand im angezeigten Monat, mit Mandant/Mitarbeiter-Filter, aber über alle Teams
  const scope = s.tasks.filter((t) => matchTask({ ...s.filters, teamId: undefined, type: 'all' }, t))
  const load = teamLoad(scope, make(year, month, 1), make(year, month, daysInMonth(year, month)))
  const appts = v.appointments.filter((a) => a.date >= TODAY).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 4)
  const counters = [
    { label: 'Überfällig', n: k.overdue, icon: <AlertTriangle size={14} strokeWidth={2.2} />, strong: k.overdue > 0 },
    { label: 'Heute', n: k.today, icon: <CircleAlert size={14} strokeWidth={2.2} /> },
    { label: 'Nächste 7 Tage', n: k.soon, icon: <CalendarRange size={14} /> },
    { label: 'Offen · 30 Tage', n: k.open, icon: <ListTodo size={14} /> },
  ]

  return (
    <aside aria-label="Kontext" className="space-y-4">
      {c ? (
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[17px] font-bold tabular" style={{ background: `${c.color}1f`, color: c.color }}>{c.number}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-semibold tracking-[-0.01em]">{c.name}</p>
              <p className="truncate text-xs text-ink2">{c.address}</p>
            </div>
            <button type="button" aria-label="Mandant öffnen" onClick={() => d({ type: 'drawer', drawer: { kind: 'client', id: c.id } })} className="grid h-8 w-8 place-items-center rounded-lg text-ink3 hover:bg-well hover:text-ink"><MoreHorizontal size={18} /></button>
          </div>
          <div className="mt-3 flex gap-1 border-b border-hair text-[13px]">
            {([['overview', 'Übersicht'], ['tasks', 'Aufgaben'], ['appointments', 'Termine'], ['notes', 'Notizen']] as const).map(([tab, label], i) => (
              <button key={tab} type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'client', id: c.id, tab } })} className={cx('-mb-px border-b-2 px-2 pb-2 pt-1', i === 0 ? 'border-ink font-semibold' : 'border-transparent text-ink2 hover:text-ink')}>
                {label}
              </button>
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-[13px]">
            <dt className="text-ink2">Ansprechpartner</dt>
            <dd className="truncate">{c.contact ?? '–'}</dd>
            <dt className="text-ink2">Teams</dt>
            <dd className="flex flex-wrap gap-1.5">
              {c.teamIds.map((id) => (
                <button key={id} type="button" onClick={() => d({ type: 'filters', patch: { teamId: s.filters.teamId === id ? undefined : id } })} className={cx('rounded-md px-2 py-0.5 text-xs', s.filters.teamId === id ? 'bg-ink text-white' : 'bg-well text-ink ring-1 ring-line hover:ring-ink/30')}>
                  {team(id)?.name}
                </button>
              ))}
            </dd>
            <dt className="text-ink2">Farbe</dt>
            <dd className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: c.color }} />{CLIENT_PALETTE.find((p) => p.hex === c.color)?.name}</dd>
          </dl>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
          <p className="text-[17px] font-semibold tracking-[-0.01em]">Alle Mandanten</p>
          <p className="mt-0.5 text-xs text-ink2">{s.clients.filter((x) => x.active).length} aktive Mandanten · Filter oben wählen, um einen Mandanten im Detail zu sehen.</p>
        </div>
      )}

      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <p className="mb-3 text-[15px] font-semibold tracking-[-0.01em]">Aktuell{c ? ` für ${c.number}` : ''}{s.filters.teamId ? ` · ${team(s.filters.teamId)?.name}` : ''}</p>
        <ul className="grid grid-cols-2 gap-2">
          {counters.map((x) => (
            <li key={x.label} className={cx('rounded-xl px-3 py-2.5', x.strong ? 'bg-ink text-white' : 'bg-well')}>
              <span className={cx('flex items-center gap-1.5 text-xs', x.strong ? 'text-white/80' : 'text-ink2')}>{x.icon}{x.label}</span>
              <span className="mt-0.5 block text-[22px] font-semibold leading-7 tabular">{x.n}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">Teams im {fmt.month(month)}</p>
        <p className="mb-2 text-xs text-ink2">Offene Aufgaben und geplanter Aufwand</p>
        <ul>
          {load.map(({ team: tm, count, minutes }) => (
            <li key={tm.id}>
              <button type="button" onClick={() => d({ type: 'filters', patch: { teamId: s.filters.teamId === tm.id ? undefined : tm.id } })} className={cx('flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-well', s.filters.teamId === tm.id && 'bg-well')}>
                <span className="w-24 font-medium">{tm.name}</span>
                <span className="flex-1 text-ink2 tabular">{count} {count === 1 ? 'Aufgabe' : 'Aufgaben'}</span>
                <span className="font-medium tabular">{fmt.hours(minutes)}</span>
                <ChevronRight size={15} className="text-ink3" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[15px] font-semibold tracking-[-0.01em]">Nächste Termine{c ? ` (${c.number})` : ''}</p>
          <button type="button" onClick={() => d({ type: 'view', view: 'appointments' })} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-ink">Alle <ArrowRight size={14} /></button>
        </div>
        {appts.length === 0 && <p className="text-[13px] text-ink3">Keine Termine mit diesen Filtern.</p>}
        <ul>
          {appts.map((a) => {
            const ac = client(s, a.clientId)
            return (
              <li key={a.id}>
                <button type="button" onClick={() => { d({ type: 'select', date: a.date }); d({ type: 'calMode', mode: 'day' }); d({ type: 'view', view: 'calendar' }) }} className="grid w-full grid-cols-[64px_40px_minmax(0,1fr)] items-center gap-2 rounded-lg px-1.5 py-2 text-left text-[13px] hover:bg-well">
                  <span className="text-ink2 tabular">{fmt.weekdayShort(weekday(a.date))} {fmt.dayMonth(a.date)}</span>
                  <span className="text-ink2 tabular">{a.start}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ac?.color ?? 'var(--ink-3)' }} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{a.title}</span>
                      <span className="block truncate text-xs text-ink2">{ac ? `${ac.number} · ` : ''}{a.teamId ? team(a.teamId)?.name : a.employeeIds.map((e) => employee(e)?.lastName).join(', ')}</span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
