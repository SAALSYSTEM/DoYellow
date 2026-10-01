import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BookOpenCheck, Building2, CalendarClock, ChevronDown, ListChecks, Menu, Plus, Search, StickyNote } from 'lucide-react'
import { useStore } from '../state/store'
import { TODAY, addDays, fmt } from '../lib/dates'
import { client, sortTasks, taskState } from '../lib/select'
import { ClientTag, StatusBadge, cx, useOutside } from './ui'

export function TopBar() {
  const { s, d } = useStore()
  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-hair bg-canvas/90 px-4 backdrop-blur md:px-6" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink2 hover:bg-well lg:hidden" aria-label="Navigation öffnen" onClick={() => d({ type: 'nav', open: !s.navOpen })}>
        <Menu size={20} />
      </button>
      <SearchBox />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Reminders />
        <NewMenu />
      </div>
    </header>
  )
}

function SearchBox() {
  const { s, d } = useStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const ref = useOutside(() => setOpen(false), open)

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus(); setOpen(true) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const res = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 2) return null
    const has = (...v: (string | undefined)[]) => v.some((x) => x?.toLowerCase().includes(t))
    return {
      clients: s.clients.filter((c) => has(c.number, c.name, c.contact)).slice(0, 4),
      tasks: s.tasks
        .filter((x) => x.status === 'open' && has(x.title, x.description, client(s, x.clientId)?.name, client(s, x.clientId)?.number, fmt.refPeriod(x.refPeriodKey)))
        .sort(sortTasks)
        .slice(0, 6),
      appts: s.appointments.filter((a) => a.date >= addDays(TODAY, -14) && has(a.title, client(s, a.clientId)?.name, client(s, a.clientId)?.number)).slice(0, 4),
      notes: s.notes.filter((n) => has(n.title, n.body)).slice(0, 3),
      follow: s.followups.filter((f) => !f.done && has(f.title, f.note)).slice(0, 3),
    }
  }, [q, s])

  const total = res ? res.clients.length + res.tasks.length + res.appts.length + res.notes.length + res.follow.length : 0
  const close = () => { setOpen(false); setQ('') }

  return (
    <div className="relative min-w-0 max-w-[620px] flex-1" ref={ref}>
      <label htmlFor="search" className="sr-only">Suche</label>
      <div className="flex h-10 items-center gap-2.5 rounded-xl bg-surface px-3.5 ring-1 ring-line focus-within:ring-ink/30">
        <Search size={17} className="shrink-0 text-ink3" aria-hidden="true" />
        <input
          id="search"
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Suche nach Mandanten, Aufgaben, Terminen, Notizen"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink3 focus:outline-none"
          autoComplete="off"
        />
        <kbd className="hidden rounded-md bg-well px-1.5 py-0.5 text-[11px] text-ink3 ring-1 ring-line sm:inline">⌘ K</kbd>
      </div>
      {open && res && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-auto rounded-2xl bg-surface p-2 shadow-pop ring-1 ring-line scroll-thin">
          {total === 0 && <p className="px-3 py-4 text-[13px] text-ink2">Keine Treffer für „{q}“. Suche nach Mandantennummer, Namen oder Aufgabentitel.</p>}
          {res.clients.length > 0 && (
            <Group title="Mandanten" icon={<Building2 size={14} />}>
              {res.clients.map((c) => (
                <Row key={c.id} onClick={() => { d({ type: 'drawer', drawer: { kind: 'client', id: c.id } }); close() }}>
                  <ClientTag client={c} withName />
                  <span className="ml-auto text-xs text-ink3">{c.contact}</span>
                </Row>
              ))}
            </Group>
          )}
          {res.tasks.length > 0 && (
            <Group title="Aufgaben" icon={<ListChecks size={14} />}>
              {res.tasks.map((t) => (
                <Row key={t.id} onClick={() => { d({ type: 'drawer', drawer: { kind: 'task', id: t.id } }); close() }}>
                  <ClientTag client={client(s, t.clientId)} size="sm" />
                  <span className="truncate text-[13px]">{t.title}</span>
                  {t.refPeriodKey && <span className="hidden truncate text-xs text-ink3 sm:inline">{fmt.refPeriod(t.refPeriodKey)}</span>}
                  <span className="ml-auto"><StatusBadge state={taskState(s, t)} task={t} compact /></span>
                </Row>
              ))}
            </Group>
          )}
          {res.appts.length > 0 && (
            <Group title="Termine" icon={<CalendarClock size={14} />}>
              {res.appts.map((a) => (
                <Row key={a.id} onClick={() => { d({ type: 'select', date: a.date }); d({ type: 'view', view: 'calendar' }); close() }}>
                  <ClientTag client={client(s, a.clientId)} size="sm" />
                  <span className="truncate text-[13px]">{a.title}</span>
                  <span className="ml-auto text-xs text-ink3 tabular">{fmt.short(a.date)} · {a.start}</span>
                </Row>
              ))}
            </Group>
          )}
          {res.follow.length > 0 && (
            <Group title="Wiedervorlagen" icon={<BookOpenCheck size={14} />}>
              {res.follow.map((f) => (
                <Row key={f.id} onClick={() => { d({ type: 'view', view: 'followups' }); close() }}>
                  <span className="truncate text-[13px]">{f.title}</span>
                  <span className="ml-auto text-xs text-ink3 tabular">{fmt.short(f.date)}</span>
                </Row>
              ))}
            </Group>
          )}
          {res.notes.length > 0 && (
            <Group title="Notizen" icon={<StickyNote size={14} />}>
              {res.notes.map((n) => (
                <Row key={n.id} onClick={() => { n.clientId ? d({ type: 'drawer', drawer: { kind: 'client', id: n.clientId, tab: 'notes' } }) : d({ type: 'view', view: 'notes' }); close() }}>
                  <span className="truncate text-[13px]">{n.title}</span>
                  <span className="ml-auto truncate text-xs text-ink3">{n.body.slice(0, 40)}</span>
                </Row>
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">{icon}{title}</p>
      {children}
    </div>
  )
}
function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-well">
      {children}
    </button>
  )
}

function Reminders() {
  const { s, d } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false), open)
  // Erinnerungen, deren Zeitpunkt erreicht ist (Fälligkeit minus Vorlauf <= heute), nur offene Aufgaben
  const items = s.tasks
    .filter((t) => t.status === 'open' && t.reminderDays !== undefined && addDays(t.dueDate, -(t.reminderDays ?? 0)) <= TODAY && t.dueDate >= addDays(TODAY, -1))
    .sort(sortTasks)
    .slice(0, 8)
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label={`Erinnerungen, ${items.length} aktiv`} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="relative grid h-10 w-10 place-items-center rounded-xl text-ink2 hover:bg-well hover:text-ink">
        <Bell size={19} />
        {items.length > 0 && <span className="absolute right-1.5 top-1.5 min-w-[16px] rounded-full bg-ink px-1 text-[10px] font-semibold leading-4 text-white tabular">{items.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(360px,calc(100vw-32px))] rounded-2xl bg-surface p-2 shadow-pop ring-1 ring-line">
          <p className="px-3 pb-1 pt-2 text-[13px] font-semibold">Erinnerungen</p>
          <p className="px-3 pb-2 text-xs text-ink3">Per E-Mail um 07:30 Uhr, hier zusätzlich in der App.</p>
          <ul>
            {items.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => { d({ type: 'drawer', drawer: { kind: 'task', id: t.id } }); setOpen(false) }} className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-well">
                  <Bell size={14} className="mt-0.5 shrink-0 text-ink3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]"><ClientTag client={client(s, t.clientId)} size="sm" /> <span className="ml-1">{t.title}</span></span>
                    <span className="text-xs text-ink3">Fällig {fmt.relative(t.dueDate)} · {fmt.short(t.dueDate)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function NewMenu() {
  const { s, d } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false), open)
  const start = (what: 'task' | 'appointment' | 'followup') => { d({ type: 'drawer', drawer: { kind: 'new', what, date: s.cal.selected } }); setOpen(false) }
  return (
    <div className="relative flex" ref={ref}>
      <button type="button" onClick={() => start('task')} className="flex h-10 items-center gap-1.5 rounded-l-xl bg-brand pl-3.5 pr-3 text-sm font-semibold text-brandink hover:brightness-[.97]">
        <Plus size={18} strokeWidth={2.4} /> <span className="hidden sm:inline">Neu</span>
      </button>
      <button type="button" aria-label="Weitere neue Einträge" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cx('grid h-10 w-9 place-items-center rounded-r-xl border-l border-black/10 bg-brand text-brandink hover:brightness-[.97]')}>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl bg-surface p-1 shadow-pop ring-1 ring-line">
          {([['task', 'Aufgabe', ListChecks], ['appointment', 'Termin', CalendarClock], ['followup', 'Wiedervorlage', BookOpenCheck]] as const).map(([k, l, I]) => (
            <button key={k} type="button" onClick={() => start(k)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-well">
              <I size={16} className="text-ink2" /> {l}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
