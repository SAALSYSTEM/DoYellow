import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Check, Clock, Pause } from 'lucide-react'
import type { Freq, ISODate, RecurrenceRule, Shift, Task } from '../types'
import { useStore, type ClientTab } from '../state/store'
import { CLIENT_PALETTE, CURRENT_USER_ID, EMPLOYEES, TEAMS } from '../data/mock'
import { Dl, Head } from './DrawerParts'
import { DayDrawer, GroupDrawer, TaskDrawer } from './ProcessDrawers'
import { TODAY, addDays, addMonths, fmt, weekday, ym } from '../lib/dates'
import { initialState } from '../lib/generate'
import { FREQ_LABEL, SHIFT_LABEL, applyShift, groupRuleLabel, occurrences, periodKey, refPeriodKey, ruleLabel } from '../lib/recurrence'
import { client, employee, group, isLate, isPaused, sortTasks, taskState, team } from '../lib/select'
import { Button, Empty, Field, Segmented, StatusBadge, cx, inputCls } from './ui'

export function DrawerHost() {
  const { s, d } = useStore()
  const dr = s.drawer
  useEffect(() => {
    if (!dr) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') d({ type: 'drawer', drawer: null }) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [dr, d])
  if (!dr) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-ink/15" onClick={() => d({ type: 'drawer', drawer: null })} />
      <div role="dialog" aria-modal="true" className="drawer-in absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-surface shadow-drawer" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {dr.kind === 'task' && <TaskDrawer id={dr.id} />}
        {dr.kind === 'client' && <ClientDrawer id={dr.id} tab={dr.tab} />}
        {dr.kind === 'new' && <NewDrawer what={dr.what} date={dr.date} />}
        {dr.kind === 'group' && <GroupDrawer id={dr.id} edit={dr.edit} categoryId={dr.categoryId} />}
        {dr.kind === 'day' && <DayDrawer date={dr.date} />}
      </div>
    </div>
  )
}

function ClientDrawer({ id, tab }: { id: string; tab?: ClientTab }) {
  const { s, d } = useStore()
  const [cur, setCur] = useState<ClientTab>(tab ?? 'overview')
  const [note, setNote] = useState({ title: '', body: '' })
  const [showDone, setShowDone] = useState(false)
  useEffect(() => setCur(tab ?? 'overview'), [id, tab])
  const c = client(s, id)
  if (!c) return null
  const tasks = s.tasks.filter((t) => t.clientId === id).sort(sortTasks)
  const openTasks = tasks.filter((t) => t.status === 'open' && !isPaused(s, t) && t.dueDate <= addDays(TODAY, 45))
  const paused = s.clientTemplates.filter((ct) => ct.clientId === id && ct.status === 'paused')
  const done = tasks.filter((t) => t.status === 'done').reverse()
  const appts = s.appointments.filter((a) => a.clientId === id).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const notes = s.notes.filter((n) => n.clientId === id)
  const cts = s.clientTemplates.filter((ct) => ct.clientId === id)
  const thisYear = tasks.filter((t) => t.dueDate.slice(0, 4) === TODAY.slice(0, 4) && t.dueDate < TODAY && t.status !== 'skipped')
  const onTime = thisYear.filter((t) => t.status === 'done' && !isLate(t)).length

  const addNote = (e: FormEvent) => {
    e.preventDefault()
    if (!note.title.trim()) return
    d({ type: 'addNote', item: { id: `n-${Date.now()}`, clientId: id, title: note.title.trim(), body: note.body.trim(), date: TODAY, authorId: CURRENT_USER_ID } })
    setNote({ title: '', body: '' })
  }

  return (
    <>
      <Head>
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[17px] font-bold tabular" style={{ background: `${c.color}1f`, color: c.color }}>{c.number}</span>
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-semibold tracking-[-0.015em]">{c.name}</h2>
            <p className="truncate text-[13px] text-ink2">{c.address}</p>
          </div>
        </div>
        <div className="mt-4">
          <Segmented<ClientTab>
            label="Mandantenbereiche"
            value={cur}
            onChange={setCur}
            options={[
              { value: 'overview', label: 'Übersicht' },
              { value: 'tasks', label: `Aufgaben ${openTasks.length}` },
              { value: 'appointments', label: `Termine ${appts.filter((a) => a.date >= TODAY).length}` },
              { value: 'notes', label: `Notizen ${notes.length}` },
            ]}
          />
        </div>
      </Head>
      <div className="flex-1 overflow-y-auto px-6 py-5 scroll-thin">
        {cur === 'overview' && (
          <div className="space-y-6">
            <Dl rows={[
              ['Mandantennummer', <span className="tabular">{c.number}</span>],
              ['Ansprechpartner', c.contact ?? '–'],
              ['Zuständige Teams', <span className="flex flex-wrap gap-1.5">{c.teamIds.map((t) => <span key={t} className="rounded-md bg-well px-2 py-0.5 text-xs ring-1 ring-line">{team(t)?.name}</span>)}</span>],
              ['Farbe', (
                <span className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Mandantenfarbe">
                  {CLIENT_PALETTE.map((p) => (
                    <button key={p.hex} type="button" role="radio" aria-checked={p.hex === c.color} aria-label={p.name} title={p.name} onClick={() => d({ type: 'clientPatch', id, patch: { color: p.hex } })} className={cx('h-6 w-6 rounded-full ring-offset-2 transition', p.hex === c.color ? 'ring-2 ring-ink' : 'hover:scale-110')} style={{ background: p.hex }} />
                  ))}
                </span>
              )],
              ['Status', (
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={c.active} onChange={(e) => d({ type: 'clientPatch', id, patch: { active: e.target.checked } })} className="h-4 w-4 accent-[var(--ink)]" />
                  {c.active ? 'Aktiv' : 'Inaktiv'}
                </label>
              )],
              ['Pünktlichkeit', thisYear.length ? `${onTime}/${thisYear.length} Aufgaben ${TODAY.slice(0, 4)} pünktlich erledigt` : '–'],
            ]} />
            <div>
              <p className="mb-2 text-[13px] font-semibold">Wiederkehrende Arbeit</p>
              <ul className="divide-y divide-hair rounded-xl ring-1 ring-line">
                {cts.map((ct) => {
                  const tpl = group(s, ct.templateId)!
                  const nx = tasks.find((t) => t.clientTemplateId === ct.id && t.status === 'open' && t.dueDate >= TODAY)
                  const pausedCount = ct.status === 'paused' ? tasks.filter((t) => t.clientTemplateId === ct.id && t.status === 'open').length : 0
                  return (
                    <li key={ct.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{tpl.short} · {tpl.name}</span>
                        <span className="block truncate text-xs text-ink2">{groupRuleLabel(tpl, s.groups, ct.day)} · {team(tpl.teamId)?.name}</span>
                      </span>
                      {ct.status === 'paused' ? (
                        <span className="text-right text-xs text-ink2"><span className="inline-flex items-center gap-1"><Pause size={12} />Pausiert</span><span className="block text-ink3">{pausedCount} pausierte Termine</span></span>
                      ) : nx ? <span className="text-xs text-ink2 tabular">nächste {fmt.short(nx.dueDate)}</span> : null}
                    </li>
                  )
                })}
              </ul>
              {paused.length > 0 && <p className="mt-2 text-xs text-ink3">Pausierte Aufgaben erscheinen nicht unter Heute und im Kalender.</p>}
            </div>
          </div>
        )}
        {cur === 'tasks' && (
          <div className="space-y-5">
            {openTasks.length === 0 ? <Empty title="Keine offenen Aufgaben" /> : (
              <ul className="divide-y divide-hair rounded-xl ring-1 ring-line">
                {openTasks.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'task', id: t.id } })} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] hover:bg-canvas">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{t.title}</span>
                        <span className="block truncate text-xs text-ink2">{t.refPeriodKey ? fmt.refPeriod(t.refPeriodKey) + ' · ' : ''}{team(t.teamId)?.name} · {fmt.short(t.dueDate)}</span>
                      </span>
                      <StatusBadge state={taskState(s, t)} task={t} compact />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <button type="button" onClick={() => setShowDone((x) => !x)} className="text-[13px] font-medium text-ink2 hover:text-ink">{showDone ? 'Erledigte ausblenden' : `Erledigte anzeigen (${done.length})`}</button>
              {showDone && (
                <ul className="mt-2 divide-y divide-hair rounded-xl ring-1 ring-line">
                  {done.slice(0, 12).map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-3.5 py-2 text-[13px] text-ink2">
                      <Check size={13} className="text-ink3" />
                      <span className="flex-1 truncate">{t.title}{t.refPeriodKey ? ` · ${fmt.refPeriod(t.refPeriodKey)}` : ''}</span>
                      <span className="text-xs tabular">{t.completedAt && fmt.date(t.completedAt)}{isLate(t) ? ' · verspätet' : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button onClick={() => { d({ type: 'filters', patch: { clientId: id } }); d({ type: 'drawer', drawer: { kind: 'new', what: 'task' } }) }}>Neue Aufgabe für {c.number}</Button>
          </div>
        )}
        {cur === 'appointments' && (
          appts.length === 0 ? <Empty title="Keine Termine" /> : (
            <ul className="divide-y divide-hair rounded-xl ring-1 ring-line">
              {appts.map((a) => (
                <li key={a.id} className={cx('flex items-center gap-3 px-3.5 py-2.5 text-[13px]', a.date < TODAY && 'text-ink3')}>
                  <Clock size={14} className="shrink-0 text-ink3" />
                  <span className="w-[110px] tabular">{fmt.short(a.date)} · {a.start}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{a.title}</span><span className="block truncate text-xs text-ink2">{a.employeeIds.map((e) => employee(e)?.lastName).join(', ')}{a.location ? ` · ${a.location}` : ''}</span></span>
                </li>
              ))}
            </ul>
          )
        )}
        {cur === 'notes' && (
          <div className="space-y-4">
            <form onSubmit={addNote} className="space-y-2 rounded-xl bg-well p-3">
              <label htmlFor="note-title" className="sr-only">Titel</label>
              <input id="note-title" value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} placeholder="Titel der Notiz" className={inputCls} />
              <label htmlFor="note-body" className="sr-only">Text</label>
              <textarea id="note-body" value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} placeholder="Was soll das Team wissen?" rows={3} className={cx(inputCls, 'h-auto py-2')} />
              <div className="flex justify-end"><Button type="submit" variant="dark" size="sm">Notiz speichern</Button></div>
            </form>
            {notes.length === 0 ? <Empty title="Noch keine Notizen" /> : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-xl px-4 py-3 ring-1 ring-line">
                    <p className="flex items-baseline justify-between gap-3 text-[13px] font-semibold">{n.title}<span className="text-xs font-normal text-ink3 tabular">{fmt.date(n.date)}</span></p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink2">{n.body}</p>
                    <p className="mt-1.5 text-xs text-ink3">{employee(n.authorId)?.firstName} {employee(n.authorId)?.lastName}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-hair px-6 py-4">
        <Button variant="dark" onClick={() => { d({ type: 'filters', patch: { clientId: id } }); d({ type: 'view', view: 'calendar' }) }}>Im Kalender filtern <ArrowRight size={15} /></Button>
      </div>
    </>
  )
}

// ——— Neue Einträge ———

const FREQS: Freq[] = ['once', 'week', 'month', 'quarter', 'year']

function NewDrawer({ what, date }: { what: 'task' | 'appointment' | 'followup'; date?: ISODate }) {
  const [kind, setKind] = useState(what)
  useEffect(() => setKind(what), [what])
  return (
    <>
      <Head>
        <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Neu</h2>
        <div className="mt-3">
          <Segmented label="Art" value={kind} onChange={setKind} options={[{ value: 'task', label: 'Aufgabe' }, { value: 'appointment', label: 'Termin' }, { value: 'followup', label: 'Wiedervorlage' }]} />
        </div>
      </Head>
      {kind === 'task' && <NewTaskForm date={date} />}
      {kind === 'appointment' && <NewAppointmentForm date={date} />}
      {kind === 'followup' && <NewFollowUpForm date={date} />}
    </>
  )
}

function Select({ id, value, onChange, children }: { id: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'appearance-auto pr-2')}>{children}</select>
}

function Footer({ onCancel, label, error }: { onCancel: () => void; label: string; error?: string }) {
  return (
    <div className="border-t border-hair px-6 py-4">
      {error && <p role="alert" className="mb-2 text-[13px] font-medium text-ink">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" variant="primary">{label}</Button>
      </div>
    </div>
  )
}

function NewTaskForm({ date }: { date?: ISODate }) {
  const { s, d } = useStore()
  const [f, setF] = useState({
    templateId: '',
    clientId: s.filters.clientId ?? '',
    teamId: s.filters.teamId ?? 't-fibu',
    title: '',
    description: '',
    due: date && date >= TODAY ? date : TODAY,
    freq: 'once' as Freq,
    refType: 'none' as 'none' | 'month' | 'quarter' | 'year',
    refOffset: -1,
    shift: 'none' as Shift,
    assigneeId: CURRENT_USER_ID,
    substituteId: '',
    minutes: 60,
    reminder: 3,
  })
  const [error, setError] = useState<string>()
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setError(undefined) }

  const applyTemplate = (id: string) => {
    const t = s.groups.find((x) => x.id === id)
    if (!t) return set({ templateId: '' })
    const freq: Freq = t.rule.freq === 'month' && t.rule.interval === 3 ? 'quarter' : t.rule.freq
    set({ templateId: id, title: t.name, teamId: t.teamId, freq, refType: t.refType, refOffset: t.refOffset, shift: t.shift, minutes: t.estimatedMinutes, reminder: t.reminderDays })
  }

  const rule: RecurrenceRule | null = f.freq === 'once' ? null
    : f.freq === 'week' ? { freq: 'week', interval: 1, weekday: weekday(f.due) }
    : f.freq === 'year' ? { freq: 'year', interval: 1, month: ym(f.due)[1], day: Number(f.due.slice(8)) }
    : { freq: 'month', interval: f.freq === 'quarter' ? 3 : 1, day: Number(f.due.slice(8)) }

  const preview = (() => {
    if (!rule) return [applyShift(f.due, f.shift)]
    const [y, m] = ym(f.due)
    const [ey, em] = addMonths(y, m, 12)
    return occurrences(rule, f.due, f.due, `${ey}-${String(em).padStart(2, '0')}-28`).slice(0, 4).map((n) => applyShift(n, f.shift))
  })()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return setError('Gib der Aufgabe einen Titel.')
    if (!f.due) return setError('Wähle ein Fälligkeitsdatum.')
    const base = `new-${Date.now()}`
    const grp = s.groups.find((g) => g.id === f.templateId)
    const make = (nominal: ISODate, i: number): Task => ({
      id: `${base}-${i}`,
      clientId: f.clientId || undefined,
      teamId: f.teamId,
      templateId: f.templateId || undefined,
      clientTemplateId: rule ? base : undefined,
      title: f.title.trim(),
      description: f.description.trim() || undefined,
      periodKey: rule ? periodKey(rule, nominal) : undefined,
      refPeriodKey: refPeriodKey(f.refType, f.refOffset, nominal),
      nominalDate: nominal,
      plannedDate: applyShift(nominal, f.shift),
      dueDate: applyShift(nominal, f.shift),
      status: 'open',
      state: initialState(applyShift(nominal, f.shift)),
      categoryId: grp?.categoryId,
      short: grp?.short,
      visibleTeamIds: grp?.visibleTeamIds,
      assigneeId: f.assigneeId || undefined,
      substituteId: f.substituteId || undefined,
      estimatedMinutes: f.minutes,
      reminderDays: f.reminder,
      recurrence: f.freq,
      recurrenceInterval: rule?.interval,
      shift: f.shift,
    })
    const [y, m] = ym(f.due)
    const [ey, em] = addMonths(y, m, 12)
    const dates = rule ? occurrences(rule, f.due, f.due, `${ey}-${String(em).padStart(2, '0')}-31`) : [f.due]
    const tasks = dates.map(make)
    d({ type: 'addTasks', tasks })
    d({ type: 'drawer', drawer: { kind: 'task', id: tasks[0].id } })
    d({ type: 'toast', toast: { text: `${f.title.trim()} angelegt`, sub: rule ? `${tasks.length} Termine für die nächsten 12 Monate erzeugt` : `Fällig ${fmt.long(tasks[0].dueDate)}` } })
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 scroll-thin">
        <Field label="Aus Aufgabengruppe (optional)" htmlFor="nt-tpl">
          <Select id="nt-tpl" value={f.templateId} onChange={applyTemplate}>
            <option value="">Ohne Aufgabengruppe</option>
            {s.groups.filter((g) => g.status === 'active' && !g.dependency).map((t) => <option key={t.id} value={t.id}>{t.short} · {t.name}</option>)}
          </Select>
        </Field>
        <Field label="Titel" htmlFor="nt-title">
          <input id="nt-title" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Monatsabschluss" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mandant (optional)" htmlFor="nt-client">
            <Select id="nt-client" value={f.clientId} onChange={(v) => set({ clientId: v })}>
              <option value="">Ohne Mandant</option>
              {s.clients.map((c) => <option key={c.id} value={c.id}>{c.number} · {c.name}</option>)}
            </Select>
          </Field>
          <Field label="Team" htmlFor="nt-team">
            <Select id="nt-team" value={f.teamId} onChange={(v) => set({ teamId: v })}>
              {TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Fällig am" htmlFor="nt-due">
            <input id="nt-due" type="date" value={f.due} onChange={(e) => set({ due: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Wiederholung" htmlFor="nt-freq">
            <Select id="nt-freq" value={f.freq} onChange={(v) => set({ freq: v as Freq })}>
              {FREQS.map((q) => <option key={q} value={q}>{FREQ_LABEL[q]}</option>)}
            </Select>
          </Field>
          <Field label="Bezugsperiode" htmlFor="nt-ref">
            <Select id="nt-ref" value={`${f.refType}:${f.refOffset}`} onChange={(v) => { const [t, o] = v.split(':'); set({ refType: t as typeof f.refType, refOffset: Number(o) }) }}>
              <option value="none:0">Keine</option>
              <option value="month:-1">Vormonat</option>
              <option value="month:0">Aktueller Monat</option>
              <option value="quarter:-1">Vorquartal</option>
              <option value="year:-1">Vorjahr</option>
            </Select>
          </Field>
          <Field label="Wochenende/Feiertag" htmlFor="nt-shift">
            <Select id="nt-shift" value={f.shift} onChange={(v) => set({ shift: v as Shift })}>
              {(['none', 'before', 'after'] as Shift[]).map((x) => <option key={x} value={x}>{SHIFT_LABEL[x]}</option>)}
            </Select>
          </Field>
          <Field label="Verantwortlich" htmlFor="nt-ass">
            <Select id="nt-ass" value={f.assigneeId} onChange={(v) => set({ assigneeId: v })}>
              <option value="">Niemand</option>
              {EMPLOYEES.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Vertretung" htmlFor="nt-sub">
            <Select id="nt-sub" value={f.substituteId} onChange={(v) => set({ substituteId: v })}>
              <option value="">Keine</option>
              {EMPLOYEES.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Geschätzter Aufwand (Min.)" htmlFor="nt-min">
            <input id="nt-min" type="number" min={0} step={15} value={f.minutes} onChange={(e) => set({ minutes: Math.max(0, Number(e.target.value) || 0) })} className={cx(inputCls, 'tabular')} />
          </Field>
          <Field label="Erinnerung" htmlFor="nt-rem">
            <Select id="nt-rem" value={String(f.reminder)} onChange={(v) => set({ reminder: Number(v) })}>
              {[0, 1, 2, 3, 5, 7, 14].map((n) => <option key={n} value={n}>{n === 0 ? 'Am Fälligkeitstag' : `${n} ${n === 1 ? 'Tag' : 'Tage'} vorher`}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Beschreibung (optional)" htmlFor="nt-desc">
          <textarea id="nt-desc" rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Was ist zu tun, was ist zu beachten?" className={cx(inputCls, 'h-auto py-2')} />
        </Field>
        <div className="rounded-xl bg-well px-4 py-3 text-[13px]">
          <p className="font-medium">{rule ? ruleLabel(rule) : 'Einmalig'}{f.refType !== 'none' && ` · Periode ${fmt.refPeriod(refPeriodKey(f.refType, f.refOffset, f.due))}`}</p>
          <p className="mt-1 text-ink2">{rule ? 'Nächste Fälligkeiten: ' : 'Fällig: '}{preview.map((p) => fmt.short(p)).join(' · ')}</p>
        </div>
      </div>
      <Footer onCancel={() => d({ type: 'drawer', drawer: null })} label="Aufgabe anlegen" error={error} />
    </form>
  )
}

function NewAppointmentForm({ date }: { date?: ISODate }) {
  const { s, d } = useStore()
  const [f, setF] = useState({ title: '', date: date ?? TODAY, start: '10:00', end: '11:00', clientId: s.filters.clientId ?? '', teamId: s.filters.teamId ?? '', emp: CURRENT_USER_ID })
  const [error, setError] = useState<string>()
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setError(undefined) }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return setError('Gib dem Termin einen Titel.')
    if (f.end <= f.start) return setError('Das Ende muss nach dem Beginn liegen.')
    d({ type: 'addAppointment', item: { id: `a-${Date.now()}`, title: f.title.trim(), date: f.date, start: f.start, end: f.end, clientId: f.clientId || undefined, teamId: f.teamId || undefined, employeeIds: [f.emp] } })
    d({ type: 'select', date: f.date })
    d({ type: 'drawer', drawer: null })
    d({ type: 'toast', toast: { text: `Termin „${f.title.trim()}“ angelegt`, sub: `${fmt.long(f.date)}, ${f.start}–${f.end}` } })
  }
  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <Field label="Titel" htmlFor="na-title"><input id="na-title" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Jour fixe" className={inputCls} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Datum" htmlFor="na-date"><input id="na-date" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} /></Field>
          <Field label="Beginn" htmlFor="na-start"><input id="na-start" type="time" value={f.start} onChange={(e) => set({ start: e.target.value })} className={inputCls} /></Field>
          <Field label="Ende" htmlFor="na-end"><input id="na-end" type="time" value={f.end} onChange={(e) => set({ end: e.target.value })} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mandant (optional)" htmlFor="na-client">
            <Select id="na-client" value={f.clientId} onChange={(v) => set({ clientId: v })}><option value="">Ohne Mandant</option>{s.clients.map((c) => <option key={c.id} value={c.id}>{c.number} · {c.name}</option>)}</Select>
          </Field>
          <Field label="Team (optional)" htmlFor="na-team">
            <Select id="na-team" value={f.teamId} onChange={(v) => set({ teamId: v })}><option value="">Ohne Team</option>{TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
          </Field>
          <Field label="Mitarbeiter" htmlFor="na-emp">
            <Select id="na-emp" value={f.emp} onChange={(v) => set({ emp: v })}>{EMPLOYEES.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</Select>
          </Field>
        </div>
      </div>
      <Footer onCancel={() => d({ type: 'drawer', drawer: null })} label="Termin anlegen" error={error} />
    </form>
  )
}

function NewFollowUpForm({ date }: { date?: ISODate }) {
  const { s, d } = useStore()
  const [f, setF] = useState({ title: '', note: '', date: date && date > TODAY ? date : addDays(TODAY, 7), clientId: s.filters.clientId ?? '' })
  const [error, setError] = useState<string>()
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setError(undefined) }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return setError('Worum geht es? Gib einen Titel ein.')
    d({ type: 'addFollowUp', item: { id: `f-${Date.now()}`, title: f.title.trim(), note: f.note.trim(), date: f.date, clientId: f.clientId || undefined, ownerId: CURRENT_USER_ID, done: false } })
    d({ type: 'drawer', drawer: null })
    d({ type: 'toast', toast: { text: 'Wiedervorlage angelegt', sub: `Kommt am ${fmt.long(f.date)} wieder` } })
  }
  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <p className="rounded-xl bg-well px-4 py-3 text-[13px] text-ink2">Eine Wiedervorlage erinnert an ein Thema zu einem späteren Datum. Sie wiederholt sich nicht.</p>
        <Field label="Titel" htmlFor="nf-title"><input id="nf-title" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Rückfrage Reisekosten" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Wieder vorlegen am" htmlFor="nf-date"><input id="nf-date" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} /></Field>
          <Field label="Mandant (optional)" htmlFor="nf-client">
            <Select id="nf-client" value={f.clientId} onChange={(v) => set({ clientId: v })}><option value="">Ohne Mandant</option>{s.clients.map((c) => <option key={c.id} value={c.id}>{c.number} · {c.name}</option>)}</Select>
          </Field>
        </div>
        <Field label="Notiz" htmlFor="nf-note"><textarea id="nf-note" rows={4} value={f.note} onChange={(e) => set({ note: e.target.value })} className={cx(inputCls, 'h-auto py-2')} /></Field>
      </div>
      <Footer onCancel={() => d({ type: 'drawer', drawer: null })} label="Wiedervorlage anlegen" error={error} />
    </form>
  )
}

export function ToastHost() {
  const { s, d } = useStore()
  const t = s.toast
  useEffect(() => {
    if (!t) return
    const h = setTimeout(() => d({ type: 'toast', toast: null }), 6000)
    return () => clearTimeout(h)
  }, [t, d])
  if (!t) return null
  return (
    <div role="status" className="fixed bottom-5 left-1/2 z-[70] flex w-[min(460px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-pop" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-brandink"><Check size={14} strokeWidth={3} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{t.text}</span>
        {t.sub && <span className="block truncate text-xs text-white/70">{t.sub}</span>}
      </span>
      {t.undo && <button type="button" onClick={() => { d(t.undo!); d({ type: 'toast', toast: null }) }} className="shrink-0 text-[13px] font-semibold text-brand hover:underline">Rückgängig</button>}
    </div>
  )
}
