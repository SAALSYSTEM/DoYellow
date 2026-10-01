import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, BookOpenCheck, Check, Clock, Info, Link2, Plane, Plus } from 'lucide-react'
import type { AbsenceType, ViewId } from '../types'
import { useStore } from '../state/store'
import { CURRENT_USER_ID, EMPLOYEES, TEAMS, WORKSPACE } from '../data/mock'
import { TODAY, addDays, diffDays, fmt, inRange, startOfWeek } from '../lib/dates'
import { groupRuleLabel } from '../lib/recurrence'
import { client, employee, isPaused, sortTasks, taskState, team, teamLoad, visible } from '../lib/select'
import { QuickFilters } from '../components/QuickFilters'
import { Calendar } from '../components/Calendar'
import { DayList, TaskRow } from '../components/TaskList'
import { ContextPanel } from '../components/ContextPanel'
import { Avatar, Button, ClientTag, Empty, Field, GroupTag, Segmented, SectionTitle, cx, inputCls } from '../components/ui'

function Page({ title, sub, actions, children, filters = false }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode; filters?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 pb-24 pt-5 md:px-6">
      {filters && <QuickFilters />}
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto min-w-0">
          <h1 className="font-display text-[28px] font-bold tracking-[-0.025em] sm:text-[32px]">{title}</h1>
          {sub && <p className="mt-0.5 text-[14px] text-ink2">{sub}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

const card = 'rounded-2xl bg-surface ring-1 ring-line'

export function CalendarView() {
  const { s } = useStore()
  const year = s.cal.mode === 'year'
  return (
    <div className={cx('mx-auto w-full space-y-5 px-4 pb-24 pt-5 md:px-6', year ? 'max-w-[1720px]' : 'max-w-[1480px]')}>
      <QuickFilters />
      {year ? (
        <div className="space-y-5">
          <Calendar />
          <DayList />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <Calendar />
            <DayList />
          </div>
          <ContextPanel />
        </div>
      )}
    </div>
  )
}

export function OverviewView() {
  const { s, d } = useStore()
  const v = visible(s)
  const me = employee(CURRENT_USER_ID)!
  const overdue = v.tasks.filter((t) => taskState(s, t) === 'overdue').sort(sortTasks)
  const today = v.tasks.filter((t) => t.dueDate === TODAY && t.status !== 'skipped').sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))
  const soon = v.tasks.filter((t) => taskState(s, t) === 'soon').sort(sortTasks)
  const apptsToday = v.appointments.filter((a) => a.date === TODAY).sort((a, b) => a.start.localeCompare(b.start))
  const follow = v.followups.filter((f) => !f.done && f.date <= TODAY)
  const attention = overdue.length + today.filter((t) => t.status === 'open').length
  return (
    <Page title={`Guten Morgen, ${me.firstName}.`} sub={`${fmt.long(TODAY)} · ${attention === 0 ? 'Heute ist nichts offen.' : `${attention} ${attention === 1 ? 'Aufgabe braucht' : 'Aufgaben brauchen'} heute deine Aufmerksamkeit.`}`} filters>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {overdue.length > 0 && (
            <section className={cx(card, 'px-5 pb-2 pt-4')}>
              <SectionTitle aside={<span className="text-xs text-ink2 tabular">{overdue.length}</span>}>Überfällig</SectionTitle>
              <ul>{overdue.map((t) => <TaskRow key={t.id} t={t} showDate />)}</ul>
            </section>
          )}
          <section className={cx(card, 'px-5 pb-2 pt-4')}>
            <SectionTitle aside={<span className="text-xs text-ink2 tabular">{today.length}</span>}>Heute</SectionTitle>
            {today.length === 0 ? <div className="pb-3"><Empty title="Heute ist nichts fällig" /></div> : <ul>{today.map((t) => <TaskRow key={t.id} t={t} />)}</ul>}
          </section>
          <section className={cx(card, 'px-5 pb-2 pt-4')}>
            <SectionTitle aside={<span className="text-xs text-ink2 tabular">{soon.length}</span>}>Nächste 7 Tage</SectionTitle>
            {soon.length === 0 ? <div className="pb-3"><Empty title="Keine Fälligkeiten in den nächsten 7 Tagen" /></div> : <ul>{soon.map((t) => <TaskRow key={t.id} t={t} showDate />)}</ul>}
          </section>
        </div>
        <aside className="space-y-4">
          <div className={cx(card, 'p-4')}>
            <SectionTitle>Termine heute</SectionTitle>
            {apptsToday.length === 0 ? <p className="text-[13px] text-ink3">Keine Termine.</p> : (
              <ul className="space-y-1">
                {apptsToday.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg py-1.5 text-[13px]">
                    <span className="w-11 text-ink2 tabular">{a.start}</span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: client(s, a.clientId)?.color ?? 'var(--ink-3)' }} />
                    <span className="min-w-0 flex-1 truncate">{a.title}</span>
                    <span className="text-xs text-ink3">{client(s, a.clientId)?.number}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={cx(card, 'p-4')}>
            <SectionTitle aside={<button type="button" onClick={() => d({ type: 'view', view: 'followups' })} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-ink">Alle <ArrowRight size={14} /></button>}>Wiedervorlagen</SectionTitle>
            {follow.length === 0 ? <p className="text-[13px] text-ink3">Nichts wieder vorzulegen.</p> : (
              <ul className="space-y-2">
                {follow.map((f) => (
                  <li key={f.id} className="flex items-start gap-2.5 text-[13px]">
                    <BookOpenCheck size={15} className="mt-0.5 shrink-0 text-ink3" />
                    <span className="min-w-0"><span className="block truncate font-medium">{f.title}</span><span className="block truncate text-xs text-ink2">{f.note}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={cx(card, 'p-4')}>
            <SectionTitle>Diese Woche</SectionTitle>
            <TeamWeek />
          </div>
        </aside>
      </div>
    </Page>
  )
}

function TeamWeek() {
  const { s, d } = useStore()
  const v = visible(s)
  const from = startOfWeek(TODAY)
  const rows = teamLoad(v.tasks, from, addDays(from, 6))
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.team.id}>
          <button type="button" onClick={() => { d({ type: 'filters', patch: { teamId: r.team.id } }); d({ type: 'view', view: 'calendar' }) }} className="flex w-full items-center gap-3 rounded-lg px-1.5 py-1.5 text-left text-[13px] hover:bg-well">
            <span className="w-24 font-medium">{r.team.name}</span>
            <span className="flex-1 text-ink2 tabular">{r.count} {r.count === 1 ? 'Aufgabe' : 'Aufgaben'}</span>
            <span className="font-medium tabular">{fmt.hours(r.minutes)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function TasksView() {
  const { s, d } = useStore()
  const [mode, setMode] = useState<'open' | 'done' | 'all'>('open')
  const v = visible(s)
  const horizon = addDays(TODAY, 45)
  const list = v.tasks
    .filter((t) => (mode === 'open' ? t.status === 'open' && t.dueDate <= horizon : mode === 'done' ? t.status === 'done' : t.dueDate <= horizon))
    .sort(mode === 'done' ? (a, b) => sortTasks(b, a) : sortTasks)
  const groups: { title: string; items: typeof list }[] = []
  const label = (t: (typeof list)[number]) => {
    if (mode === 'done') return fmt.monthYear(Number(t.dueDate.slice(0, 4)), Number(t.dueDate.slice(5, 7)))
    const n = diffDays(t.dueDate, TODAY)
    if (n < 0) return 'Überfällig'
    if (n === 0) return 'Heute'
    if (n <= 7) return 'Nächste 7 Tage'
    return 'Später'
  }
  for (const t of list) {
    const l = label(t)
    const g = groups[groups.length - 1]
    if (g && g.title === l) g.items.push(t)
    else groups.push({ title: l, items: [t] })
  }
  const minutes = list.filter((t) => t.status === 'open').reduce((n, t) => n + t.estimatedMinutes, 0)
  return (
    <Page
      title="Aufgaben"
      sub={mode === 'done' ? `${list.length} erledigte Aufgaben` : `${list.filter((t) => t.status === 'open').length} offen bis ${fmt.date(horizon)} · ${fmt.hours(minutes)} geplanter Aufwand`}
      actions={<><Segmented label="Aufgabenfilter" value={mode} onChange={setMode} options={[{ value: 'open', label: 'Offen' }, { value: 'done', label: 'Erledigt' }, { value: 'all', label: 'Alle' }]} /><Button variant="primary" onClick={() => d({ type: 'drawer', drawer: { kind: 'new', what: 'task' } })}><Plus size={16} />Aufgabe</Button></>}
      filters
    >
      {groups.length === 0 ? <Empty title="Keine Aufgaben mit diesen Filtern" body="Filter anpassen oder eine neue Aufgabe anlegen." /> : (
        <div className="space-y-5">
          {groups.slice(0, 12).map((g) => (
            <section key={g.title} className={cx(card, 'px-5 pb-2 pt-4')}>
              <SectionTitle aside={<span className="text-xs text-ink2 tabular">{g.items.length}</span>}>{g.title}</SectionTitle>
              <ul>{g.items.slice(0, 60).map((t) => <TaskRow key={t.id} t={t} showDate />)}</ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}

export function AppointmentsView() {
  const { s, d } = useStore()
  const v = visible(s)
  // Termine = eigene Termine + gekoppelte Termine aus Aufgabengruppen (z. B. MAB, Beirat)
  const meetings = v.tasks.filter((t) => t.start && t.end && t.state !== 'cancelled' && t.dueDate >= addDays(TODAY, -7) && t.dueDate <= addDays(TODAY, 120))
    .map((t) => ({ id: t.id, title: t.title, date: t.dueDate, start: t.start!, end: t.end!, clientId: t.clientId, teamId: t.teamId, employeeIds: t.participantIds ?? [], location: undefined as string | undefined, taskId: t.id, short: t.short }))
  const list = [...v.appointments.filter((a) => a.date >= addDays(TODAY, -7)).map((a) => ({ ...a, taskId: undefined as string | undefined, short: undefined as string | undefined })), ...meetings]
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const days = [...new Set(list.map((a) => a.date))]
  return (
    <Page title="Termine" sub="Termine haben Beginn und Ende. Aufgaben haben eine Fälligkeit und einen Aufwand." actions={<Button variant="primary" onClick={() => d({ type: 'drawer', drawer: { kind: 'new', what: 'appointment' } })}><Plus size={16} />Termin</Button>} filters>
      {days.length === 0 ? <Empty title="Keine Termine mit diesen Filtern" /> : (
        <div className={cx(card, 'divide-y divide-hair')}>
          {days.map((day) => (
            <div key={day} className={cx('grid gap-2 px-5 py-4 sm:grid-cols-[160px_minmax(0,1fr)]', day < TODAY && 'opacity-60')}>
              <p className="text-[13px] font-semibold">{day === TODAY ? 'Heute' : fmt.medium(day)}</p>
              <ul className="space-y-2">
                {list.filter((a) => a.date === day).map((a) => {
                  const c = client(s, a.clientId)
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => { if (a.taskId) { d({ type: 'drawer', drawer: { kind: 'task', id: a.taskId } }); return } d({ type: 'select', date: a.date }); d({ type: 'calMode', mode: 'day' }); d({ type: 'view', view: 'calendar' }) }} className="flex w-full min-w-0 items-center gap-3 rounded-lg text-left text-[13px] hover:bg-canvas">
                        <span className="w-24 shrink-0 text-ink2 tabular"><Clock size={13} className="mr-1 inline" />{a.start}–{a.end}</span>
                        <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 truncate font-medium">{a.short && <GroupTag short={a.short} />}{a.title}</span><span className="block truncate text-xs text-ink2">{a.teamId ? team(a.teamId)?.name + ' · ' : ''}{a.employeeIds.map((e) => employee(e)?.lastName).join(', ')}{a.location ? ` · ${a.location}` : ''}</span></span>
                        {c ? <ClientTag client={c} withName /> : <span className="text-xs text-ink3">Intern</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}

export function AbsencesView() {
  const { s, d } = useStore()
  const [f, setF] = useState({ emp: EMPLOYEES[0].id, from: addDays(TODAY, 7), to: addDays(TODAY, 8), type: 'Urlaub' as AbsenceType })
  const [err, setErr] = useState('')
  const list = [...s.absences].sort((a, b) => a.from.localeCompare(b.from))
  const add = (e: FormEvent) => {
    e.preventDefault()
    if (f.to < f.from) return setErr('„Bis“ darf nicht vor „Von“ liegen.')
    d({ type: 'addAbsence', item: { id: `ab-${Date.now()}`, employeeId: f.emp, from: f.from, to: f.to, type: f.type } })
    d({ type: 'toast', toast: { text: 'Abwesenheit eingetragen', sub: `${employee(f.emp)?.lastName}: ${fmt.date(f.from)} bis ${fmt.date(f.to)}` } })
    setErr('')
  }
  return (
    <Page title="Abwesenheiten" sub="Erscheinen im Kalender als dezente Zeitspanne. Vertretungen regelt später eine eigene Logik.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={cx(card, 'overflow-x-auto')}>
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead><tr className="border-b border-hair text-xs text-ink2"><th className="px-5 py-2.5 font-medium">Mitarbeiter</th><th className="py-2.5 font-medium">Von</th><th className="py-2.5 font-medium">Bis</th><th className="py-2.5 font-medium">Typ</th><th className="py-2.5 pr-5 font-medium">Status</th></tr></thead>
            <tbody>
              {list.map((a) => {
                const e = employee(a.employeeId)
                const now = inRange(TODAY, a.from, a.to)
                return (
                  <tr key={a.id} className={cx('border-b border-hair last:border-0', a.to < TODAY && 'text-ink3')}>
                    <td className="px-5 py-3"><span className="inline-flex items-center gap-2"><Avatar id={a.employeeId} size={24} />{e?.firstName} {e?.lastName}</span></td>
                    <td className="py-3 tabular">{fmt.short(a.from)}</td>
                    <td className="py-3 tabular">{fmt.short(a.to)}</td>
                    <td className="py-3"><span className="inline-flex items-center gap-1.5"><Plane size={13} className="text-ink3" />{a.type}{a.note ? ` · ${a.note}` : ''}</span></td>
                    <td className="py-3 pr-5 text-xs">{now ? <span className="rounded-md border border-ink px-2 py-0.5 font-medium">Heute abwesend</span> : a.to < TODAY ? 'Vergangen' : `ab ${fmt.relative(a.from)}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <form onSubmit={add} className={cx(card, 'space-y-3 p-4')} noValidate>
          <SectionTitle>Abwesenheit eintragen</SectionTitle>
          <Field label="Mitarbeiter" htmlFor="ab-emp"><select id="ab-emp" value={f.emp} onChange={(e) => setF({ ...f, emp: e.target.value })} className={inputCls}>{EMPLOYEES.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Von" htmlFor="ab-from"><input id="ab-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className={inputCls} /></Field>
            <Field label="Bis" htmlFor="ab-to"><input id="ab-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Typ" htmlFor="ab-type"><select id="ab-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as AbsenceType })} className={inputCls}>{(['Urlaub', 'Krank', 'Sonstiges'] as const).map((t) => <option key={t}>{t}</option>)}</select></Field>
          {err && <p role="alert" className="text-[13px] font-medium">{err}</p>}
          <Button type="submit" variant="dark" className="w-full">Eintragen</Button>
        </form>
      </div>
    </Page>
  )
}

export function FollowUpsView() {
  const { s, d } = useStore()
  const v = visible(s)
  const list = [...v.followups].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date))
  return (
    <Page title="Wiedervorlagen" sub="Themen, die zu einem bestimmten Datum wieder auf den Tisch sollen. Keine wiederkehrenden Aufgaben." actions={<Button variant="primary" onClick={() => d({ type: 'drawer', drawer: { kind: 'new', what: 'followup' } })}><Plus size={16} />Wiedervorlage</Button>} filters>
      {list.length === 0 ? <Empty title="Keine Wiedervorlagen mit diesen Filtern" /> : (
        <ul className={cx(card, 'divide-y divide-hair')}>
          {list.map((f) => {
            const c = client(s, f.clientId)
            const due = f.date <= TODAY
            return (
              <li key={f.id} className={cx('flex items-start gap-3 px-5 py-4', f.done && 'opacity-55')}>
                <button type="button" aria-label={f.done ? 'Wieder öffnen' : 'Als erledigt markieren'} onClick={() => d({ type: 'followUpDone', id: f.id, done: !f.done })} className={cx('mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] ring-1', f.done ? 'bg-ink text-white ring-ink' : 'ring-ink3/60 hover:ring-ink')}>
                  {f.done && <Check size={12} strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cx('text-[14px] font-medium', f.done && 'line-through')}>{f.title}</p>
                  <p className="text-[13px] text-ink2">{f.note}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink2">
                    {c ? <ClientTag client={c} withName size="sm" /> : <span>Ohne Mandant</span>}
                    <span>{employee(f.ownerId)?.lastName}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="tabular">{fmt.short(f.date)}</p>
                  {!f.done && due && <p className="mt-1 inline-flex items-center gap-1 rounded-md border border-ink px-1.5 py-0.5 font-medium">{f.date === TODAY ? 'Heute' : 'Fällig'}</p>}
                  {!f.done && !due && <p className="mt-1 text-ink3">{fmt.relative(f.date)}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}

export function NotesView() {
  const { s, d } = useStore()
  const [f, setF] = useState({ title: '', body: '', clientId: '' })
  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return
    d({ type: 'addNote', item: { id: `n-${Date.now()}`, title: f.title.trim(), body: f.body.trim(), clientId: f.clientId || undefined, date: TODAY, authorId: CURRENT_USER_ID } })
    setF({ title: '', body: '', clientId: '' })
  }
  return (
    <Page title="Notizen" sub="Kurze Notizen, optional einem Mandanten, Mitarbeiter oder einer Aufgabe zugeordnet.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="grid gap-3 md:grid-cols-2">
          {s.notes.map((n) => {
            const c = client(s, n.clientId)
            return (
              <li key={n.id} className={cx(card, 'p-4')}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-ink2">
                  {c ? <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'client', id: c.id, tab: 'notes' } })}><ClientTag client={c} withName size="sm" /></button> : <span>Allgemein</span>}
                  <span className="tabular">{fmt.date(n.date)}</span>
                </div>
                <p className="text-[14px] font-semibold">{n.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink2">{n.body}</p>
                <p className="mt-2 text-xs text-ink3">{employee(n.authorId)?.firstName} {employee(n.authorId)?.lastName}{n.employeeId ? ` · betrifft ${employee(n.employeeId)?.lastName}` : ''}</p>
              </li>
            )
          })}
        </ul>
        <form onSubmit={add} className={cx(card, 'h-fit space-y-3 p-4')}>
          <SectionTitle>Neue Notiz</SectionTitle>
          <Field label="Titel" htmlFor="nn-title"><input id="nn-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} placeholder="Kurzer Titel" /></Field>
          <Field label="Mandant (optional)" htmlFor="nn-client"><select id="nn-client" value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} className={inputCls}><option value="">Ohne Mandant</option>{s.clients.map((c) => <option key={c.id} value={c.id}>{c.number} · {c.name}</option>)}</select></Field>
          <Field label="Text" htmlFor="nn-body"><textarea id="nn-body" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} className={cx(inputCls, 'h-auto py-2')} /></Field>
          <Button type="submit" variant="dark" className="w-full">Notiz speichern</Button>
        </form>
      </div>
    </Page>
  )
}

export function ClientsView() {
  const { s, d } = useStore()
  return (
    <Page title="Mandanten" sub={`${s.clients.length} Mandanten · Farbe dient der Orientierung, die Nummer der Identität.`}>
      <div className={cx(card, 'overflow-x-auto')}>
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead><tr className="border-b border-hair text-xs text-ink2">{['Nr.', 'Name', 'Teams', 'Ansprechpartner', 'Offen · 30 Tage', 'Überfällig', 'Nächste Fälligkeit', 'Status'].map((h, i) => <th key={h} className={cx('py-2.5 font-medium', i === 0 && 'pl-5', i === 7 && 'pr-5')}>{h}</th>)}</tr></thead>
          <tbody>
            {s.clients.map((c) => {
              const open = s.tasks.filter((t) => t.clientId === c.id && t.status === 'open' && !isPaused(s, t))
              const next = open.filter((t) => t.dueDate >= TODAY).sort(sortTasks)[0]
              const od = open.filter((t) => t.dueDate < TODAY).length
              return (
                <tr key={c.id} onClick={() => d({ type: 'drawer', drawer: { kind: 'client', id: c.id } })} className="cursor-pointer border-b border-hair last:border-0 hover:bg-canvas">
                  <td className="py-3 pl-5"><ClientTag client={c} /></td>
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3 text-ink2">{c.teamIds.map((t) => team(t)?.name).join(', ')}</td>
                  <td className="py-3 text-ink2">{c.contact}</td>
                  <td className="py-3 tabular">{open.filter((t) => t.dueDate <= addDays(TODAY, 30)).length}</td>
                  <td className="py-3 tabular">{od > 0 ? <span className="inline-flex items-center gap-1 rounded-md bg-ink px-1.5 py-0.5 text-xs font-medium text-white">{od}</span> : <span className="text-ink3">0</span>}</td>
                  <td className="py-3 text-ink2">{next ? `${fmt.short(next.dueDate)} · ${next.title}` : '–'}</td>
                  <td className="py-3 pr-5 text-ink2">{c.active ? 'Aktiv' : 'Inaktiv'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Page>
  )
}

export function TeamsView() {
  const { s, d } = useStore()
  const wk = startOfWeek(TODAY)
  const week = teamLoad(s.tasks.filter((t) => !isPaused(s, t)), wk, addDays(wk, 6))
  const month = teamLoad(s.tasks.filter((t) => !isPaused(s, t)), TODAY.slice(0, 8) + '01', TODAY.slice(0, 8) + '31')
  return (
    <Page title="Teams" sub="Offene Aufgaben und geschätzter Aufwand. Eine Auslastung in Prozent folgt, sobald Kapazitäten gepflegt sind.">
      <div className="grid gap-4 md:grid-cols-2">
        {TEAMS.map((tm, i) => {
          const members = EMPLOYEES.filter((e) => e.teamIds.includes(tm.id))
          const cl = s.clients.filter((c) => c.teamIds.includes(tm.id))
          return (
            <section key={tm.id} className={cx(card, 'p-5')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.01em]">{tm.name}</h2>
                  <p className="text-[13px] text-ink2">{tm.description}</p>
                </div>
                <Button size="sm" onClick={() => { d({ type: 'filters', patch: { teamId: tm.id, clientId: undefined } }); d({ type: 'view', view: 'calendar' }) }}>Im Kalender <ArrowRight size={14} /></Button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-xl bg-well px-3 py-2.5"><dt className="text-xs text-ink2">Diese Woche</dt><dd className="mt-0.5 font-semibold tabular">{week[i].count} Aufgaben · {fmt.hours(week[i].minutes)}</dd></div>
                <div className="rounded-xl bg-well px-3 py-2.5"><dt className="text-xs text-ink2">{fmt.month(Number(TODAY.slice(5, 7)))} offen</dt><dd className="mt-0.5 font-semibold tabular">{month[i].count} Aufgaben · {fmt.hours(month[i].minutes)}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                {members.map((m) => <span key={m.id} className="inline-flex items-center gap-1.5"><Avatar id={m.id} size={24} />{m.firstName} {m.lastName}</span>)}
              </div>
              <p className="mt-3 flex flex-wrap gap-3 text-xs text-ink2">{cl.map((c) => <ClientTag key={c.id} client={c} withName size="sm" />)}</p>
            </section>
          )
        })}
      </div>
    </Page>
  )
}

export function EmployeesView() {
  const { s, d } = useStore()
  const wk = startOfWeek(TODAY)
  return (
    <Page title="Mitarbeiter">
      <div className={cx(card, 'overflow-x-auto')}>
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead><tr className="border-b border-hair text-xs text-ink2">{['Name', 'Teams', 'Offen · diese Woche', 'Geplanter Aufwand', 'Vertretung für', 'Abwesenheit'].map((h, i) => <th key={h} className={cx('py-2.5 font-medium', i === 0 && 'pl-5')}>{h}</th>)}</tr></thead>
          <tbody>
            {EMPLOYEES.map((e) => {
              const mine = s.tasks.filter((t) => t.assigneeId === e.id && t.status === 'open' && !isPaused(s, t) && inRange(t.dueDate, wk, addDays(wk, 6)))
              const subs = new Set(s.tasks.filter((t) => t.substituteId === e.id).map((t) => t.clientId))
              const abs = s.absences.find((a) => a.employeeId === e.id && a.to >= TODAY)
              return (
                <tr key={e.id} onClick={() => { d({ type: 'filters', patch: { employeeId: e.id } }); d({ type: 'view', view: 'calendar' }) }} className="cursor-pointer border-b border-hair last:border-0 hover:bg-canvas">
                  <td className="py-3 pl-5"><span className="inline-flex items-center gap-2.5"><Avatar id={e.id} />{e.firstName} {e.lastName}{e.id === CURRENT_USER_ID && <span className="text-xs text-ink3">(Ich)</span>}</span></td>
                  <td className="py-3 text-ink2">{e.teamIds.map((t) => team(t)?.name).join(', ')}</td>
                  <td className="py-3 tabular">{mine.length}</td>
                  <td className="py-3 tabular">{fmt.hours(mine.reduce((n, t) => n + t.estimatedMinutes, 0))}</td>
                  <td className="py-3 text-ink2">{[...subs].map((c) => client(s, c)?.number).filter(Boolean).join(', ') || '–'}</td>
                  <td className="py-3 text-ink2">{abs ? `${abs.type} ${fmt.dayMonth(abs.from)}–${fmt.dayMonth(abs.to)}` : '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Page>
  )
}

export function CategoriesView() {
  const { s, d } = useStore()
  const [f, setF] = useState({ name: '', description: '', teamIds: ['t-fibu'] as string[] })
  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return
    d({ type: 'saveCategory', category: { id: `cat-${Date.now()}`, name: f.name.trim(), description: f.description.trim() || undefined, active: true, teamIds: f.teamIds, clientIds: [] } })
    d({ type: 'toast', toast: { text: `Kategorie „${f.name.trim()}“ angelegt`, sub: 'Jetzt Aufgabengruppen zuordnen' } })
    setF({ name: '', description: '', teamIds: ['t-fibu'] })
  }
  return (
    <Page title="Kategorien" sub="Oberste Ebene der Prozessstruktur: Kategorie → Aufgabengruppe → Termin im Kalender.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={cx(card, 'overflow-x-auto')}>
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead><tr className="border-b border-hair text-xs text-ink2">{['Kategorie', 'Sichtbar für', 'Mandanten', 'Aufgabengruppen', 'Termine 2026', 'Status'].map((h, i) => <th key={h} className={cx('py-2.5 font-medium', i === 0 && 'pl-5', i === 5 && 'pr-5')}>{h}</th>)}</tr></thead>
            <tbody>
              {s.categories.map((c) => {
                const groups = s.groups.filter((g) => g.categoryId === c.id)
                const n = s.tasks.filter((t) => t.categoryId === c.id && t.dueDate.startsWith('2026')).length
                return (
                  <tr key={c.id} className={cx('border-b border-hair align-top last:border-0', !c.active && 'text-ink3')}>
                    <td className="py-3 pl-5">
                      <button type="button" onClick={() => { d({ type: 'filters', patch: { categoryId: c.id } }); d({ type: 'calMode', mode: 'year' }); d({ type: 'view', view: 'calendar' }) }} className="text-left">
                        <span className="block font-semibold hover:underline">{c.name}</span>
                        {c.description && <span className="block text-xs text-ink2">{c.description}</span>}
                      </button>
                    </td>
                    <td className="py-3 text-ink2">{c.teamIds.map((t) => team(t)?.name).join(', ')}</td>
                    <td className="py-3">{c.clientIds.length ? <span className="flex flex-wrap gap-2">{c.clientIds.map((id) => <ClientTag key={id} client={client(s, id)} size="sm" />)}</span> : <span className="text-ink2">Global, ohne Mandant</span>}</td>
                    <td className="py-3"><span className="flex flex-wrap gap-1">{groups.map((g) => <button key={g.id} type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'group', id: g.id } })}><GroupTag short={g.short} /></button>)}{groups.length === 0 && <span className="text-ink3">–</span>}</span></td>
                    <td className="py-3 tabular">{n}</td>
                    <td className="py-3 pr-5">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={c.active} onChange={(e) => d({ type: 'saveCategory', category: { ...c, active: e.target.checked } })} className="h-4 w-4 accent-[var(--ink)]" />
                        {c.active ? 'Aktiv' : 'Inaktiv'}
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <form onSubmit={add} className={cx(card, 'h-fit space-y-3 p-4')}>
          <SectionTitle>Neue Kategorie</SectionTitle>
          <Field label="Name" htmlFor="nc-name"><input id="nc-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Interne Organisation" className={inputCls} /></Field>
          <Field label="Beschreibung (optional)" htmlFor="nc-desc"><input id="nc-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} /></Field>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-ink2">Sichtbar für</legend>
            <div className="flex flex-wrap gap-1.5">
              {TEAMS.map((t) => {
                const on = f.teamIds.includes(t.id)
                return <button key={t.id} type="button" aria-pressed={on} onClick={() => setF({ ...f, teamIds: on ? f.teamIds.filter((x) => x !== t.id) : [...f.teamIds, t.id] })} className={cx('h-8 rounded-lg px-3 text-[13px] ring-1', on ? 'bg-ink text-white ring-ink' : 'text-ink2 ring-line')}>{t.name}</button>
              })}
            </div>
          </fieldset>
          <Button type="submit" variant="dark" className="w-full">Kategorie anlegen</Button>
          <p className="text-xs text-ink2">Inaktive Kategorien blenden ihre Termine im Kalender aus.</p>
        </form>
      </div>
    </Page>
  )
}

export function GroupsView() {
  const { s, d } = useStore()
  return (
    <Page
      title="Aufgabengruppen"
      sub="Jede Gruppe definiert eine Serie. Der Kalender erzeugt daraus konkrete Termine für 12 Monate."
      actions={<Button variant="primary" onClick={() => d({ type: 'drawer', drawer: { kind: 'group', edit: true } })}><Plus size={16} />Aufgabengruppe</Button>}
    >
      <div className="space-y-5">
        {s.categories.map((c) => {
          const groups = s.groups.filter((g) => g.categoryId === c.id)
          if (!groups.length) return null
          return (
            <section key={c.id} className={cx(card, 'overflow-x-auto')}>
              <div className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-4">
                <h2 className={cx('text-[15px] font-semibold', !c.active && 'text-ink3')}>{c.name}{!c.active && ' · inaktiv'}</h2>
                <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'group', edit: true, categoryId: c.id } })} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-ink"><Plus size={14} />Gruppe</button>
              </div>
              <table className="w-full min-w-[920px] text-left text-[13px]">
                <thead><tr className="border-y border-hair text-xs text-ink2">{['Kürzel', 'Aufgabengruppe', 'Verantwortlich', 'Sichtbar für', 'Serie', 'Mandanten', 'Aufwand', 'Status'].map((h, i) => <th key={h} className={cx('py-2 font-medium', i === 0 && 'pl-5', i === 7 && 'pr-5')}>{h}</th>)}</tr></thead>
                <tbody>
                  {groups.map((g) => {
                    const used = s.clientTemplates.filter((x) => x.templateId === g.id)
                    return (
                      <tr key={g.id} onClick={() => d({ type: 'drawer', drawer: { kind: 'group', id: g.id } })} className={cx('cursor-pointer border-b border-hair last:border-0 hover:bg-canvas', g.status === 'inactive' && 'text-ink3')}>
                        <td className="py-3 pl-5"><GroupTag short={g.short} /></td>
                        <td className="py-3 font-medium">{g.name}{g.meeting && <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-normal text-ink2"><Clock size={12} />Termin</span>}</td>
                        <td className="py-3">{team(g.teamId)?.name}</td>
                        <td className="py-3 text-ink2">{g.visibleTeamIds.map((t) => team(t)?.name).join(', ')}</td>
                        <td className="py-3 text-ink2">{g.dependency && <Link2 size={12} className="mr-1 inline" />}{groupRuleLabel(g, s.groups)}</td>
                        <td className="py-3"><span className="flex flex-wrap gap-2">{used.some((u) => u.clientId) ? used.map((u) => <ClientTag key={u.id} client={client(s, u.clientId)} size="sm" />) : <span className="text-ink2">Intern</span>}</span></td>
                        <td className="py-3 tabular">{fmt.minutes(g.estimatedMinutes)}</td>
                        <td className="py-3 pr-5 text-ink2">{g.status === 'active' ? 'Aktiv' : 'Inaktiv'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>
      <p className="flex items-start gap-2 text-xs text-ink2"><Info size={14} className="mt-px shrink-0" />Verantwortlich ist das Team, das die Arbeit erledigt. „Sichtbar für“ steuert, in welchen Teamansichten die Termine zusätzlich erscheinen.</p>
    </Page>
  )
}

const INFO: Partial<Record<ViewId, { title: string; sub: string; rows: [string, string][] }>> = {
  profile: { title: 'Profil & Account', sub: 'Persönliche Einstellungen', rows: [['Name', 'Benutzer Muster1'], ['E-Mail', 'muster1@example.com'], ['Sprache', 'Deutsch'], ['Erinnerungs-Mail', 'Täglich um 07:30 Uhr'], ['Zeitzone', WORKSPACE.timezone]] },
  help: { title: 'Hilfe & Support', sub: 'Kurzanleitung für die Vorschau', rows: [['Filtern', 'Mandant, Team, Mitarbeiter und Typ wirken gleichzeitig auf Kalender, Tagesliste und Kontextleiste.'], ['Erledigen', 'Haken setzen. Die nächste Fälligkeit der Serie steht im Hinweis unten.'], ['Suche', '⌘ K oder Strg K öffnet die Suche.'], ['Farben', 'Farbe steht für den Mandanten. Status erkennst du an Symbol, Text und Form.']] },
  users: { title: 'Benutzer & Berechtigungen', sub: 'Wer darf was im Workspace', rows: EMPLOYEES.map((e) => [`${e.firstName} ${e.lastName}`, `${e.role} · ${e.teamIds.map((t) => team(t)?.name).join(', ')}`]) },
  rules: { title: 'Regeln', sub: 'Workspace-weite Regeln der Recurrence-Engine', rows: [['Feiertagsregion', `Deutschland · ${WORKSPACE.region}`], ['Standard-Verschiebung', 'Keine Verschiebung (je Aufgabengruppe wählbar)'], ['Einzelne Termine', 'Verschieben ändert nur diesen Termin. Die Serie schreibt ihn danach nicht mehr um.'], ['Abhängigkeiten', 'Folgetermine werden beim Verschieben angezeigt und auf Wunsch mitverschoben.'], ['Horizont', 'Aufgaben werden bis Monatsende in 12 Monaten erzeugt'], ['Erinnerungen', '3 Tage vorher, am Fälligkeitstag, 1 Tag überfällig'], ['Versand', 'Täglich ab 07:30 Uhr Workspace-Zeit']] },
  billing: { title: 'Vertrag & Abrechnung', sub: 'In der Vorschau nicht aktiv', rows: [['Tarif', 'Vorschau'], ['Workspace', WORKSPACE.name], ['Benutzer', `${EMPLOYEES.length}`], ['Abrechnung', 'Noch keine']] },
}

export function InfoView({ id }: { id: ViewId }) {
  const info = INFO[id]!
  return (
    <Page title={info.title} sub={info.sub}>
      <dl className={cx(card, 'max-w-3xl divide-y divide-hair')}>
        {info.rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-5 py-3.5 text-[13px] sm:grid-cols-[200px_minmax(0,1fr)]">
            <dt className="text-ink2">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Page>
  )
}

