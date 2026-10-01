import { ArrowRight, BookOpenCheck, Check, Clock, MoreHorizontal, Plane } from 'lucide-react'
import type { Task } from '../types'
import { useStore } from '../state/store'
import { TODAY, fmt, inRange } from '../lib/dates'
import { client, employee, sortTasks, taskState, team, visible } from '../lib/select'
import { completeTask, reopenTask } from '../lib/actions'
import { Avatar, Button, ClientTag, Empty, RecurrenceTag, StatusBadge, cx } from './ui'

/** Kompakte Aufgabenzeile für Übersicht und Listen (Spezifikation: Mandant | Aufgabe/Periode | Wiederholung | Status | Erledigen) */
export function TaskRow({ t, showDate = false }: { t: Task; showDate?: boolean }) {
  const { s, d } = useStore()
  const c = client(s, t.clientId)
  const st = taskState(s, t)
  const done = st === 'done'
  return (
    <li className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-hair px-1 py-3 last:border-0 md:grid-cols-[150px_minmax(0,1fr)_120px_150px_auto]">
      <button type="button" onClick={() => c && d({ type: 'drawer', drawer: { kind: 'client', id: c.id } })} className="order-1 flex min-w-0 flex-col items-start text-left md:order-none">
        <ClientTag client={c} />
        <span className="truncate text-xs text-ink2">{c ? c.name : team(t.teamId)?.name}</span>
      </button>
      <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'task', id: t.id } })} className="order-3 col-span-2 min-w-0 text-left md:order-none md:col-span-1">
        <span className={cx('block truncate text-[14px] font-medium', done ? 'text-ink3 line-through decoration-ink3/50' : 'text-ink')}>{t.title}</span>
        <span className="block truncate text-xs text-ink2">
          {t.refPeriodKey ? fmt.refPeriod(t.refPeriodKey) : team(t.teamId)?.name}
          {showDate && <> · fällig {fmt.short(t.dueDate)}</>}
        </span>
      </button>
      <span className="order-4 hidden md:order-none md:block"><RecurrenceTag freq={t.recurrence} interval={t.recurrenceInterval} /></span>
      <span className="order-4 md:order-none"><StatusBadge state={st} task={t} /></span>
      <span className="order-2 justify-self-end md:order-none">
        {done ? (
          <Button size="sm" variant="ghost" onClick={() => reopenTask(d, t)}>Wieder öffnen</Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => completeTask(s, d, t)}><Check size={15} strokeWidth={2.4} />Erledigen</Button>
        )}
      </span>
    </li>
  )
}

/** Liste unter dem Kalender: ausgewählter Tag, am heutigen Tag zusätzlich Überfälliges */
export function DayList() {
  const { s, d } = useStore()
  const day = s.cal.selected
  const v = visible(s)
  const overdue = day === TODAY ? v.tasks.filter((t) => taskState(s, t) === 'overdue').sort(sortTasks) : []
  const tasks = v.tasks.filter((t) => t.dueDate === day).sort(sortTasks)
  const appts = v.appointments.filter((a) => a.date === day).sort((a, b) => a.start.localeCompare(b.start))
  const follow = v.followups.filter((f) => f.date === day && !f.done)
  const abs = v.absences.filter((a) => inRange(day, a.from, a.to))
  const count = overdue.length + tasks.length + appts.length + follow.length

  type Row = { key: string; time: string; title: string; sub: string; clientId?: string; teamId?: string; who?: string; status: React.ReactNode; onOpen: () => void; check?: { done: boolean; toggle: () => void } }
  const rows: Row[] = [
    ...overdue.map((t) => taskRow(t)),
    ...appts.map((a): Row => ({
      key: a.id, time: `${a.start} – ${a.end}`, title: a.title, sub: a.location ?? (client(s, a.clientId)?.name ?? 'Intern'), clientId: a.clientId, teamId: a.teamId, who: a.employeeIds[0],
      status: <span className="inline-flex items-center gap-1 text-xs text-ink2"><Clock size={13} />Geplant</span>,
      onOpen: () => d({ type: 'calMode', mode: 'day' }),
    })),
    ...tasks.map((t) => taskRow(t)),
    ...follow.map((f): Row => ({
      key: f.id, time: 'Wiedervorlage', title: f.title, sub: f.note, clientId: f.clientId, teamId: f.teamId, who: f.ownerId,
      status: <span className="inline-flex items-center gap-1 text-xs text-ink2"><BookOpenCheck size={13} />Wieder vorlegen</span>,
      onOpen: () => d({ type: 'view', view: 'followups' }),
      check: { done: f.done, toggle: () => d({ type: 'followUpDone', id: f.id, done: !f.done }) },
    })),
  ]

  function taskRow(t: Task): Row {
    const st = taskState(s, t)
    return {
      key: t.id,
      time: st === 'overdue' ? `fällig ${fmt.dayMonth(t.dueDate)}` : t.start ? `${t.start} – ${t.end}` : 'Ganztägig',
      title: t.short ? `${t.short} · ${t.title}` : t.title,
      sub: t.refPeriodKey ? fmt.refPeriod(t.refPeriodKey) : client(s, t.clientId)?.name ?? team(t.teamId)!.name,
      clientId: t.clientId, teamId: t.teamId, who: t.assigneeId,
      status: <StatusBadge state={st} task={t} />,
      onOpen: () => d({ type: 'drawer', drawer: { kind: 'task', id: t.id } }),
      check: { done: t.status === 'done', toggle: () => (t.status === 'done' ? reopenTask(d, t) : completeTask(s, d, t)) },
    }
  }

  return (
    <section aria-label="Tagesliste" className="rounded-2xl bg-surface ring-1 ring-line">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 pb-3 pt-4">
        <h2 className="font-display text-[22px] font-bold tracking-[-0.02em]">{day === TODAY ? 'Heute' : fmt.medium(day)}</h2>
        <span className="text-[14px] text-ink2">{day === TODAY ? fmt.long(day) : `${count} ${count === 1 ? 'Eintrag' : 'Einträge'}`}</span>
        {day !== TODAY && (
          <button type="button" onClick={() => d({ type: 'calToday' })} className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-ink">Zu heute <ArrowRight size={14} /></button>
        )}
      </div>
      {abs.length > 0 && (
        <p className="mx-5 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-well px-3 py-2 text-xs text-ink2">
          <Plane size={13} aria-hidden="true" />
          {abs.map((a) => `${employee(a.employeeId)?.firstName} ${employee(a.employeeId)?.lastName} (${a.type})`).join(' · ')} abwesend
        </p>
      )}
      {rows.length === 0 ? (
        <div className="px-5 pb-5"><Empty title="Nichts geplant" body="Für diesen Tag gibt es mit den aktuellen Filtern keine Aufgaben oder Termine." /></div>
      ) : (
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-y border-hair text-xs text-ink2">
                <th className="w-10 py-2 pl-5 font-medium"><span className="sr-only">Erledigt</span></th>
                <th className="w-[120px] py-2 font-medium">Zeit</th>
                <th className="py-2 font-medium">Aufgabe</th>
                <th className="py-2 font-medium">Mandant</th>
                <th className="py-2 font-medium">Team</th>
                <th className="py-2 font-medium">Verantwortlich</th>
                <th className="py-2 font-medium">Status</th>
                <th className="w-10 py-2 pr-4"><span className="sr-only">Mehr</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-hair last:border-0 hover:bg-canvas">
                  <td className="py-3 pl-5">
                    {r.check ? (
                      <button type="button" aria-label={r.check.done ? 'Wieder öffnen' : 'Als erledigt markieren'} onClick={r.check.toggle} className={cx('grid h-[18px] w-[18px] place-items-center rounded-[5px] ring-1', r.check.done ? 'bg-ink text-white ring-ink' : 'bg-surface ring-ink3/60 hover:ring-ink')}>
                        {r.check.done && <Check size={12} strokeWidth={3} />}
                      </button>
                    ) : <span className="block h-[18px] w-[18px]" />}
                  </td>
                  <td className="py-3 text-ink2 tabular">{r.time}</td>
                  <td className="max-w-[260px] py-3">
                    <button type="button" onClick={r.onOpen} className="block max-w-full text-left">
                      <span className={cx('block truncate font-medium', r.check?.done ? 'text-ink3 line-through' : 'text-ink')}>{r.title}</span>
                      <span className="block truncate text-xs text-ink2">{r.sub}</span>
                    </button>
                  </td>
                  <td className="py-3">
                    {r.clientId ? (
                      <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'client', id: r.clientId! } })} className="rounded-md px-1 py-0.5 hover:bg-well"><ClientTag client={client(s, r.clientId)} /></button>
                    ) : <span className="text-xs text-ink3">Intern</span>}
                  </td>
                  <td className="py-3 text-ink2">{r.teamId ? team(r.teamId)?.name : 'Alle'}</td>
                  <td className="py-3"><span className="inline-flex items-center gap-2"><Avatar id={r.who} size={24} /><span className="text-ink2">{employee(r.who)?.lastName}</span></span></td>
                  <td className="py-3">{r.status}</td>
                  <td className="py-3 pr-4">
                    <button type="button" aria-label={`${r.title} öffnen`} onClick={r.onOpen} className="grid h-7 w-7 place-items-center rounded-md text-ink3 hover:bg-well hover:text-ink"><MoreHorizontal size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
