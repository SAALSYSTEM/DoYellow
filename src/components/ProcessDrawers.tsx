import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, CalendarClock, Check, Clock, CornerDownRight, Link2, Pencil, RotateCcw } from 'lucide-react'
import type { ISODate, ProcessStatus, Shift, TaskGroup } from '../types'
import { useStore } from '../state/store'
import { TEAMS } from '../data/mock'
import { TODAY, fmt } from '../lib/dates'
import { SHIFT_LABEL, STATE_LABEL, applyDependency, dependencyLabel, groupRuleLabel } from '../lib/recurrence'
import { category, client, dependentsOf, employee, group, isLate, seriesOf, sortTasks, taskState, team, visible } from '../lib/select'
import { completeTask, reopenTask } from '../lib/actions'
import { Dl, Head, Person } from './DrawerParts'
import { Button, ClientTag, Empty, Field, GroupTag, RecurrenceTag, StateBadge, StatusBadge, chipShape, cx, inputCls } from './ui'

const STATES: ProcessStatus[] = ['draft', 'tentative', 'confirmed', 'done', 'cancelled']

function TeamChips({ ids, strong }: { ids: string[]; strong?: string }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((id) => <span key={id} className={cx('rounded-md px-2 py-0.5 text-xs ring-1', id === strong ? 'bg-ink text-white ring-ink' : 'bg-well ring-line')}>{team(id)?.name}</span>)}
    </span>
  )
}

// ——— Instanz ———

export function TaskDrawer({ id }: { id: string }) {
  const { s, d } = useStore()
  const t = s.tasks.find((x) => x.id === id)
  const [moving, setMoving] = useState(false)
  const [moveTo, setMoveTo] = useState<ISODate>(t?.dueDate ?? TODAY)
  const [affected, setAffected] = useState<{ id: string; short?: string; from: ISODate; to: ISODate; rule: string }[] | null>(null)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState({ title: t?.title ?? '', description: t?.description ?? '' })
  useEffect(() => {
    setMoving(false); setAffected(null); setEdit(false)
    setMoveTo(t?.dueDate ?? TODAY)
    setDraft({ title: t?.title ?? '', description: t?.description ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!t) return null

  const c = client(s, t.clientId)
  const g = group(s, t.templateId)
  const cat = category(s, t.categoryId)
  const ct = s.clientTemplates.find((x) => x.id === t.clientTemplateId)
  const st = taskState(s, t)
  const pred = t.dependsOnId ? s.tasks.find((x) => x.id === t.dependsOnId) : undefined
  const deps = dependentsOf(s, t)
  const upcoming = seriesOf(s, t).filter((x) => x.dueDate > t.dueDate).slice(0, 4)

  const doMove = () => {
    if (!moveTo || moveTo === t.dueDate) { setMoving(false); return }
    const old = t.dueDate
    d({ type: 'moveTask', id: t.id, date: moveTo })
    const list = deps.map((x) => {
      const dg = group(s, x.templateId)
      return { id: x.id, short: x.short, from: x.dueDate, to: dg?.dependency ? applyDependency(moveTo, dg.dependency) : x.dueDate, rule: dg ? groupRuleLabel(dg, s.groups) : '' }
    }).filter((x) => x.from !== x.to)
    setAffected(list.length ? list : null)
    setMoving(false)
    d({ type: 'toast', toast: { text: 'Nur dieser Termin verschoben', sub: `${t.short ?? t.title}: ${fmt.short(old)} → ${fmt.short(moveTo)} · Serie unverändert`, undo: { type: 'moveTask', id: t.id, date: old } } })
  }

  const saveEdit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    d({ type: 'taskPatch', id: t.id, patch: { title: draft.title.trim(), description: draft.description.trim() || undefined, overridden: true } })
    setEdit(false)
    d({ type: 'toast', toast: { text: 'Instanz geändert', sub: 'Nur dieser Termin. Die Serie bleibt unverändert.' } })
  }

  return (
    <>
      <Head
        eyebrow={
          <span className="flex flex-wrap items-center gap-2 text-xs text-ink2">
            {c ? <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'client', id: c.id } })} className="rounded-md hover:bg-well"><ClientTag client={c} withName /></button> : <span>Intern</span>}
            {cat && <><span aria-hidden="true">·</span><span>{cat.name}</span></>}
          </span>
        }
      >
        {edit ? (
          <form id="edit-task" onSubmit={saveEdit} className="space-y-2">
            <label htmlFor="et-title" className="sr-only">Titel</label>
            <input id="et-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={cx(inputCls, 'text-[15px] font-semibold')} />
          </form>
        ) : (
          <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-[-0.015em]">{t.short && <GroupTag short={t.short} />}<span className="min-w-0">{t.title}</span></h2>
        )}
        {t.refPeriodKey && <p className="mt-0.5 text-[14px] text-ink2">{fmt.refPeriod(t.refPeriodKey)}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StateBadge state={t.state} />
          {(st === 'overdue' || st === 'today') && <StatusBadge state={st} task={t} />}
          <RecurrenceTag freq={t.recurrence} interval={t.recurrenceInterval} />
          {t.overridden && <span className="inline-flex items-center gap-1 text-xs text-ink2"><Pencil size={12} />Einzeln geändert</span>}
        </div>
      </Head>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 scroll-thin">
        {affected && (
          <div role="status" className="rounded-xl bg-well p-4 ring-1 ring-line">
            <p className="flex items-center gap-2 text-[13px] font-semibold"><Link2 size={15} />{affected.length} abhängiger Vorgang betroffen</p>
            <ul className="mt-2 space-y-1 text-[13px] text-ink2">
              {affected.map((x) => <li key={x.id}><span className="font-medium text-ink">{x.short}</span> · {fmt.short(x.from)} → neu {fmt.short(x.to)} <span className="text-ink3">({x.rule})</span></li>)}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="dark" onClick={() => { affected.forEach((x) => d({ type: 'moveTask', id: x.id, date: x.to })); setAffected(null); d({ type: 'toast', toast: { text: 'Folgetermin mitverschoben', sub: affected.map((x) => `${x.short} → ${fmt.short(x.to)}`).join(' · ') } }) }}>Folgetermin mitverschieben</Button>
              <Button size="sm" onClick={() => setAffected(null)}>Unverändert lassen</Button>
            </div>
          </div>
        )}

        {moving && (
          <div className="rounded-xl p-4 ring-1 ring-ink/20">
            <p className="text-[13px] font-semibold">Datum verschieben</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Field label="Neues Datum" htmlFor="mv-date"><input id="mv-date" type="date" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className={cx(inputCls, 'w-44')} /></Field>
              <Button variant="dark" onClick={doMove}>Nur diesen Termin ändern</Button>
              <Button variant="ghost" onClick={() => setMoving(false)}>Abbrechen</Button>
            </div>
            <p className="mt-2 text-xs text-ink2">Die Serie bleibt unverändert. {t.refPeriodKey ? `Nur ${fmt.refPeriod(t.refPeriodKey)} wird verschoben.` : ''}{deps.length > 0 && ` ${deps.length} abhängiger Vorgang folgt diesem Termin.`}</p>
            {g && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hair pt-3">
                <span className="text-xs text-ink2">Soll sich die Regel für alle künftigen Termine ändern?</span>
                <Button size="sm" onClick={() => d({ type: 'drawer', drawer: { kind: 'group', id: g.id, edit: true } })}>Serie bearbeiten</Button>
              </div>
            )}
          </div>
        )}

        <Dl rows={[
          ['Datum', (
            <span>
              <span className="font-medium">{fmt.long(t.dueDate)}</span>
              {t.start && <span className="mt-0.5 flex items-center gap-1 text-xs text-ink2"><Clock size={12} />{t.start}–{t.end} Uhr</span>}
              {t.dueDate !== t.plannedDate ? (
                <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-ink2">
                  <CornerDownRight size={12} />Serientermin wäre {fmt.short(t.plannedDate)}
                  <button type="button" onClick={() => { d({ type: 'resetTask', id: t.id }); d({ type: 'toast', toast: { text: 'Auf Serientermin zurückgesetzt', sub: fmt.long(t.plannedDate) } }) }} className="ml-1 font-medium text-ink underline underline-offset-2">Zurücksetzen</button>
                </span>
              ) : t.nominalDate !== t.plannedDate ? (
                <span className="mt-0.5 flex items-center gap-1 text-xs text-ink2"><CornerDownRight size={12} />Soll {fmt.date(t.nominalDate)}, {SHIFT_LABEL[t.shift]}</span>
              ) : null}
            </span>
          )],
          ['Zustand', (
            <span className="flex items-center gap-2">
              <label htmlFor={`state-${t.id}`} className="sr-only">Zustand</label>
              <select id={`state-${t.id}`} value={t.state} onChange={(e) => { d({ type: 'taskState', id: t.id, state: e.target.value as ProcessStatus }); d({ type: 'toast', toast: { text: `Zustand: ${STATE_LABEL[e.target.value as ProcessStatus]}`, sub: `${t.short ?? t.title} · ${fmt.short(t.dueDate)}` } }) }} className={cx(inputCls, 'h-8 w-40')}>
                {STATES.map((x) => <option key={x} value={x}>{STATE_LABEL[x]}</option>)}
              </select>
              <StateBadge state={t.state} iconOnly size={15} />
            </span>
          )],
          ['Kategorie', cat ? <button type="button" onClick={() => { d({ type: 'filters', patch: { categoryId: cat.id } }); d({ type: 'drawer', drawer: null }) }} className="hover:underline">{cat.name}</button> : '–'],
          ['Aufgabengruppe', g ? <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'group', id: g.id } })} className="inline-flex items-center gap-1.5 text-left hover:underline"><GroupTag short={g.short} />{g.name}</button> : 'Einzelaufgabe'],
          ['Serie', g ? groupRuleLabel(g, s.groups, ct?.day) : 'Einmalig'],
          ['Abhängigkeit', (
            <span className="space-y-1">
              {g?.dependency ? <span className="block">{dependencyLabel(g.dependency, s.groups)}</span> : !deps.length && <span className="text-ink3">Keine</span>}
              {pred && <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'task', id: pred.id } })} className="flex items-center gap-1 text-xs text-ink2 hover:text-ink"><Link2 size={12} />Vorgänger {pred.short} am {fmt.short(pred.dueDate)}</button>}
              {deps.map((x) => <button key={x.id} type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'task', id: x.id } })} className="flex items-center gap-1 text-xs text-ink2 hover:text-ink"><ArrowRight size={12} />Folgt: {x.short} am {fmt.short(x.dueDate)}</button>)}
            </span>
          )],
          ['Verantwortliches Team', team(t.teamId)?.name],
          ['Sichtbar für', <TeamChips ids={t.visibleTeamIds ?? [t.teamId]} strong={t.teamId} />],
          [t.participantIds ? 'Teilnehmer' : 'Verantwortlich', t.participantIds ? t.participantIds.map((e) => `${employee(e)?.firstName} ${employee(e)?.lastName}`).join(', ') : <Person id={t.assigneeId} />],
          ...(t.substituteId ? [['Vertretung', <Person id={t.substituteId} />] as [string, React.ReactNode]] : []),
          ['Aufwand', (
            <span className="flex items-center gap-2">
              <label htmlFor={`est-${t.id}`} className="sr-only">Geschätzter Aufwand in Minuten</label>
              <input id={`est-${t.id}`} type="number" min={0} step={15} value={t.estimatedMinutes} onChange={(e) => d({ type: 'taskPatch', id: t.id, patch: { estimatedMinutes: Math.max(0, Number(e.target.value) || 0) } })} className={cx(inputCls, 'h-8 w-24 tabular')} />
              <span className="whitespace-nowrap text-ink2">Minuten</span>
            </span>
          )],
          ...(t.completedAt ? [['Erledigt am', `${fmt.date(t.completedAt)}${isLate(t) ? ' · verspätet' : ''}`] as [string, React.ReactNode]] : []),
        ]} />

        {edit ? (
          <div>
            <label htmlFor="et-desc" className="mb-1 block text-xs font-medium text-ink2">Beschreibung</label>
            <textarea id="et-desc" form="edit-task" rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={cx(inputCls, 'h-auto py-2')} />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEdit(false)}>Abbrechen</Button>
              <button type="submit" form="edit-task" className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-sm font-medium text-white hover:bg-black">Nur diesen Termin speichern</button>
            </div>
          </div>
        ) : t.description ? <p className="rounded-xl bg-well px-4 py-3 text-[13px] leading-relaxed">{t.description}</p> : null}

        {upcoming.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-semibold">Nächste Termine dieser Serie</p>
            <ul className="divide-y divide-hair rounded-xl ring-1 ring-line">
              {upcoming.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'task', id: x.id } })} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] hover:bg-canvas">
                    <span className="w-[92px] tabular text-ink2">{fmt.short(x.dueDate)}</span>
                    <span className="flex-1 truncate">{x.refPeriodKey ? fmt.refPeriod(x.refPeriodKey) : x.title}</span>
                    {x.overridden && <Pencil size={12} className="text-ink3" aria-label="Einzeln geändert" />}
                    <StateBadge state={x.state} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-hair px-6 py-4">
        {t.status === 'done'
          ? <Button onClick={() => reopenTask(d, t)}><RotateCcw size={15} />Wieder öffnen</Button>
          : <Button variant="primary" onClick={() => completeTask(s, d, t)}><Check size={16} strokeWidth={2.6} />Erledigen</Button>}
        <Button onClick={() => { setMoving((m) => !m); setMoveTo(t.dueDate) }}><CalendarClock size={15} />Datum verschieben</Button>
        {!edit && <Button variant="ghost" onClick={() => setEdit(true)}><Pencil size={14} />Bearbeiten</Button>}
        {g && <Button variant="ghost" onClick={() => d({ type: 'drawer', drawer: { kind: 'group', id: g.id } })}>Serie öffnen</Button>}
      </div>
    </>
  )
}

// ——— Tag (aus "+N weitere") ———

export function DayDrawer({ date }: { date: ISODate }) {
  const { s, d } = useStore()
  const v = visible(s)
  const tasks = v.tasks.filter((t) => t.dueDate === date).sort((a, b) => (client(s, a.clientId)?.number ?? '9').localeCompare(client(s, b.clientId)?.number ?? '9'))
  const appts = v.appointments.filter((a) => a.date === date)
  return (
    <>
      <Head eyebrow={<span className="text-xs text-ink2">{tasks.length + appts.length} Einträge mit den aktuellen Filtern</span>}>
        <h2 className="text-[20px] font-semibold tracking-[-0.015em]">{fmt.long(date)}</h2>
      </Head>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-6 py-5 scroll-thin">
        {tasks.length + appts.length === 0 && <Empty title="Keine Einträge" />}
        {appts.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl bg-well px-3.5 py-2.5 text-[13px]">
            <Clock size={14} className="text-ink3" />
            <span className="w-24 tabular text-ink2">{a.start}–{a.end}</span>
            <span className="flex-1 truncate font-medium">{a.title}</span>
            <ClientTag client={client(s, a.clientId)} size="sm" />
          </div>
        ))}
        {tasks.map((t) => {
          const c = client(s, t.clientId)
          return (
            <button key={t.id} type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'task', id: t.id } })} className={cx('relative flex w-full items-center gap-3 rounded-xl py-2.5 pl-4 pr-3.5 text-left text-[13px] hover:shadow-soft', chipShape(t.state))}>
              <span className="absolute inset-y-2 left-1.5 w-[3px] rounded-full" style={{ background: c?.color ?? 'var(--ink-3)' }} />
              <span className="w-12 font-semibold tabular">{c?.number ?? 'Intern'}</span>
              <GroupTag short={t.short} />
              <span className="min-w-0 flex-1 truncate not-italic">{t.title}{t.refPeriodKey ? <span className="text-ink2"> · {fmt.refPeriod(t.refPeriodKey)}</span> : null}</span>
              {taskState(s, t) === 'overdue' ? <StatusBadge state="overdue" task={t} compact /> : <StateBadge state={t.state} />}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ——— Aufgabengruppe (Serie) ———

type FormFreq = 'once' | 'month' | 'quarter' | 'year'
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function formFromGroup(g: TaskGroup | undefined, clientIds: (string | undefined)[], categoryId?: string) {
  const freq: FormFreq | 'week' = !g ? 'month' : g.rule.freq === 'once' ? 'once' : g.rule.freq === 'week' ? 'week' : g.rule.freq === 'year' ? 'year' : g.rule.interval === 3 ? 'quarter' : 'month'
  return {
    name: g?.name ?? '',
    short: g?.short ?? '',
    categoryId: g?.categoryId ?? categoryId ?? 'cat-mab',
    teamId: g?.teamId ?? 't-fibu',
    visibleTeamIds: g?.visibleTeamIds ?? ['t-fibu'],
    clientIds: clientIds.map((c) => c ?? ''),
    freq,
    day: (g?.rule.day ?? 5) as number | 'last',
    month: g?.rule.month ?? 1,
    date: g?.rule.date ?? TODAY,
    following: g ? g.refOffset === -1 : true,
    shift: (g?.shift ?? 'none') as Shift,
    depOn: g?.dependency?.predecessorId ?? '',
    depOffset: g?.dependency?.offset ?? 2,
    depUnit: g?.dependency?.unit ?? 'workdays',
    depDir: g?.dependency?.direction ?? 'after',
    minutes: g?.estimatedMinutes ?? 60,
    status: g?.status ?? 'active',
    description: g?.description ?? '',
  }
}

export function GroupDrawer({ id, edit: startEdit, categoryId }: { id?: string; edit?: boolean; categoryId?: string }) {
  const { s, d } = useStore()
  const g = group(s, id)
  const cts = s.clientTemplates.filter((c) => c.templateId === id)
  const [edit, setEdit] = useState(!!startEdit || !g)
  const [f, setF] = useState(() => formFromGroup(g, cts.map((c) => c.clientId), categoryId))
  const [error, setError] = useState('')
  useEffect(() => { setEdit(!!startEdit || !g); setF(formFromGroup(g, cts.map((c) => c.clientId), categoryId)); setError('') }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setError('') }

  const instances = id ? s.tasks.filter((t) => t.templateId === id) : []
  const next = instances.filter((t) => t.dueDate >= TODAY && t.status === 'open').sort(sortTasks).slice(0, 8)
  const locked = instances.filter((t) => t.overridden && t.status === 'open' && t.dueDate >= TODAY).length
  const cat = category(s, g?.categoryId)

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!f.name.trim() || !f.short.trim()) return setError('Name und Kürzel sind Pflicht.')
    if (f.depOn && f.depOn === id) return setError('Eine Aufgabengruppe kann nicht von sich selbst abhängen.')
    const day = f.day
    const rule: TaskGroup['rule'] =
      f.freq === 'week' ? g!.rule
      : f.freq === 'once' ? { freq: 'once', interval: 1, date: f.date }
      : f.freq === 'year' ? { freq: 'year', interval: 1, day, month: f.month }
      : f.freq === 'quarter' ? { freq: 'month', interval: 3, day, month: Math.min(f.month, 3) }
      : { freq: 'month', interval: 1, day }
    const initial = formFromGroup(g, [])
    const keepRef = g && f.freq === initial.freq && f.following === initial.following
    const refType = keepRef ? g!.refType : f.freq === 'once' || f.freq === 'week' ? 'none' : f.freq
    const refOffset = keepRef ? g!.refOffset : f.following ? -1 : 0
    const ng: TaskGroup = {
      id: g?.id ?? `g-${Date.now()}`,
      name: f.name.trim(),
      short: f.short.trim().toUpperCase(),
      categoryId: f.categoryId,
      teamId: f.teamId,
      visibleTeamIds: Array.from(new Set([f.teamId, ...f.visibleTeamIds])),
      rule,
      shift: f.shift,
      refType,
      refOffset,
      reminderDays: g?.reminderDays ?? 3,
      estimatedMinutes: f.minutes,
      status: f.status,
      description: f.description.trim() || undefined,
      dependency: f.depOn ? { predecessorId: f.depOn, offset: Math.max(0, f.depOffset), unit: f.depUnit, direction: f.depDir } : undefined,
      meeting: g?.meeting,
    }
    const clientIds = f.clientIds.length ? f.clientIds.map((c) => c || undefined) : [undefined]
    d({ type: 'saveGroup', group: ng, clientIds })
    d({ type: 'toast', toast: { text: g ? 'Serie gespeichert' : 'Aufgabengruppe angelegt', sub: g ? `Künftige Termine neu berechnet${locked ? `, ${locked} einzeln geänderte bleiben` : ''}` : 'Instanzen für 12 Monate erzeugt' } })
    d({ type: 'drawer', drawer: { kind: 'group', id: ng.id } })
  }

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  return (
    <>
      <Head eyebrow={<span className="text-xs text-ink2">Aufgabengruppe{cat ? ` · ${cat.name}` : ''}</span>}>
        <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-[-0.015em]">{g ? <><GroupTag short={g.short} />{g.name}</> : 'Neue Aufgabengruppe'}</h2>
        {g && <p className="mt-0.5 text-[14px] text-ink2">{groupRuleLabel(g, s.groups)}</p>}
      </Head>

      {!edit && g ? (
        <>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 scroll-thin">
            <Dl rows={[
              ['Kategorie', cat?.name ?? '–'],
              ['Kürzel', <GroupTag short={g.short} />],
              ['Verantwortlich', team(g.teamId)?.name],
              ['Sichtbar für', <TeamChips ids={g.visibleTeamIds} strong={g.teamId} />],
              ['Serie', groupRuleLabel(g, s.groups)],
              ['Wochenende/Feiertag', g.dependency ? 'Ergibt sich aus der Abhängigkeit' : SHIFT_LABEL[g.shift]],
              ['Abhängigkeit', g.dependency ? dependencyLabel(g.dependency, s.groups) : 'Keine'],
              ['Mandanten', cts.some((c) => c.clientId) ? <span className="flex flex-wrap gap-3">{cts.map((c) => <span key={c.id} className="inline-flex items-center gap-1"><ClientTag client={client(s, c.clientId)} />{c.day ? <span className="text-xs text-ink3">am {c.day}.</span> : null}{c.status === 'paused' && <span className="text-xs text-ink3">pausiert</span>}</span>)}</span> : 'Intern, ohne Mandant'],
              ...(g.meeting ? [['Gekoppelter Termin', `${g.meeting.start} Uhr, ${g.meeting.durationMinutes / 60} Std. · ${g.meeting.participantIds.map((e) => employee(e)?.lastName).join(', ')}`] as [string, React.ReactNode]] : []),
              ['Standardaufwand', fmt.minutes(g.estimatedMinutes)],
              ['Status', g.status === 'active' ? 'Aktiv' : 'Inaktiv'],
            ]} />
            {g.description && <p className="rounded-xl bg-well px-4 py-3 text-[13px] leading-relaxed">{g.description}</p>}
            <div>
              <p className="mb-2 text-[13px] font-semibold">Nächste Instanzen</p>
              {next.length === 0 ? <Empty title="Keine offenen Instanzen" /> : (
                <ul className="divide-y divide-hair rounded-xl ring-1 ring-line">
                  {next.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'task', id: t.id } })} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] hover:bg-canvas">
                        <span className="w-[92px] tabular text-ink2">{fmt.short(t.dueDate)}</span>
                        <span className="w-12"><ClientTag client={client(s, t.clientId)} size="sm" /></span>
                        <span className="flex-1 truncate">{fmt.refPeriod(t.refPeriodKey)}</span>
                        {t.overridden && <Pencil size={12} className="text-ink3" aria-label="Einzeln geändert" />}
                        <StateBadge state={t.state} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-hair px-6 py-4">
            <Button variant="dark" onClick={() => setEdit(true)}><Pencil size={14} />Serie bearbeiten</Button>
            <Button onClick={() => { d({ type: 'filters', patch: { categoryId: g.categoryId } }); d({ type: 'calMode', mode: 'year' }); d({ type: 'view', view: 'calendar' }) }}>Im Jahreskalender <ArrowRight size={14} /></Button>
          </div>
        </>
      ) : (
        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 scroll-thin">
            {g && <p className="rounded-xl bg-well px-4 py-3 text-[13px] text-ink2">Änderungen gelten ab heute für alle Mandanten dieser Gruppe. Erledigte, vergangene und einzeln geänderte Termine{locked ? ` (${locked})` : ''} bleiben unverändert.</p>}
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
              <Field label="Name" htmlFor="gf-name"><input id="gf-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Lager-/Fakturaabschluss" className={inputCls} /></Field>
              <Field label="Kürzel" htmlFor="gf-short"><input id="gf-short" value={f.short} onChange={(e) => set({ short: e.target.value })} placeholder="LF/KA" className={cx(inputCls, 'uppercase')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kategorie" htmlFor="gf-cat"><select id="gf-cat" value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={inputCls}>{s.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Verantwortliches Team" htmlFor="gf-team"><select id="gf-team" value={f.teamId} onChange={(e) => set({ teamId: e.target.value })} className={inputCls}>{TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            </div>
            <fieldset>
              <legend className="mb-1 text-xs font-medium text-ink2">Sichtbar für</legend>
              <div className="flex flex-wrap gap-1.5">
                {TEAMS.map((t) => {
                  const on = f.visibleTeamIds.includes(t.id) || t.id === f.teamId
                  return <button key={t.id} type="button" aria-pressed={on} disabled={t.id === f.teamId} onClick={() => set({ visibleTeamIds: toggle(f.visibleTeamIds, t.id) })} className={cx('h-8 rounded-lg px-3 text-[13px] ring-1', on ? 'bg-ink text-white ring-ink' : 'bg-surface text-ink2 ring-line hover:text-ink', t.id === f.teamId && 'cursor-default')}>{t.name}</button>
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-xs font-medium text-ink2">Mandanten (keine Auswahl = intern)</legend>
              <div className="flex flex-wrap gap-1.5">
                {s.clients.map((c) => {
                  const on = f.clientIds.includes(c.id)
                  return <button key={c.id} type="button" aria-pressed={on} onClick={() => set({ clientIds: toggle(f.clientIds, c.id) })} className={cx('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] ring-1', on ? 'bg-surface font-semibold text-ink ring-ink/40' : 'bg-surface text-ink2 ring-line')}><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.number}</button>
                })}
              </div>
            </fieldset>

            <div className="rounded-xl p-4 ring-1 ring-line">
              <p className="mb-3 text-[13px] font-semibold">Serie</p>
              <Field label="Abhängig von (optional)" htmlFor="gf-dep">
                <select id="gf-dep" value={f.depOn} onChange={(e) => set({ depOn: e.target.value })} className={inputCls}>
                  <option value="">Keine Abhängigkeit, eigene Regel</option>
                  {s.groups.filter((x) => x.id !== id && !x.dependency).map((x) => <option key={x.id} value={x.id}>{x.short} · {x.name}</option>)}
                </select>
              </Field>
              {f.depOn ? (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Field label="Abstand" htmlFor="gf-off"><input id="gf-off" type="number" min={0} value={f.depOffset} onChange={(e) => set({ depOffset: Number(e.target.value) || 0 })} className={cx(inputCls, 'tabular')} /></Field>
                  <Field label="Einheit" htmlFor="gf-unit"><select id="gf-unit" value={f.depUnit} onChange={(e) => set({ depUnit: e.target.value as 'workdays' | 'calendar' })} className={inputCls}><option value="workdays">Werktage</option><option value="calendar">Kalendertage</option></select></Field>
                  <Field label="Richtung" htmlFor="gf-dir"><select id="gf-dir" value={f.depDir} onChange={(e) => set({ depDir: e.target.value as 'after' | 'before' })} className={inputCls}><option value="after">danach</option><option value="before">davor</option></select></Field>
                </div>
              ) : f.freq === 'week' ? (
                <p className="mt-3 text-[13px] text-ink2">{g && groupRuleLabel(g, s.groups)}. Wöchentliche Serien sind in v1.1.1 nicht änderbar.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Wiederholung" htmlFor="gf-freq">
                    <select id="gf-freq" value={f.freq} onChange={(e) => set({ freq: e.target.value as FormFreq })} className={inputCls}>
                      <option value="once">Einmalig</option><option value="month">Monatlich</option><option value="quarter">Quartalsweise</option><option value="year">Jährlich</option>
                    </select>
                  </Field>
                  {f.freq === 'once' ? (
                    <Field label="Datum" htmlFor="gf-date"><input id="gf-date" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} /></Field>
                  ) : (
                    <Field label="Tag" htmlFor="gf-day">
                      <select id="gf-day" value={String(f.day)} onChange={(e) => set({ day: e.target.value === 'last' ? 'last' : Number(e.target.value) })} className={inputCls}>
                        {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}.</option>)}
                        <option value="last">Monatsende</option>
                      </select>
                    </Field>
                  )}
                  {(f.freq === 'year' || f.freq === 'quarter') && (
                    <Field label={f.freq === 'year' ? 'Monat' : 'Erster Monat im Quartal'} htmlFor="gf-month">
                      <select id="gf-month" value={f.month} onChange={(e) => set({ month: Number(e.target.value) })} className={inputCls}>
                        {(f.freq === 'year' ? MONTHS : MONTHS.slice(0, 3)).map((m, i) => <option key={m} value={i + 1}>{f.freq === 'year' ? m : `${m} (${MONTHS[i]}, ${MONTHS[i + 3]}, ${MONTHS[i + 6]}, ${MONTHS[i + 9]})`}</option>)}
                      </select>
                    </Field>
                  )}
                  {f.freq !== 'once' && (
                    <label className="col-span-2 flex items-center gap-2 text-[13px]">
                      <input type="checkbox" checked={f.following} onChange={(e) => set({ following: e.target.checked })} className="h-4 w-4 accent-[var(--ink)]" />
                      Betrifft die Vorperiode ({f.freq === 'month' ? 'z. B. „am 5. des Folgemonats“' : f.freq === 'quarter' ? 'nach Quartalsende' : 'Vorjahr'})
                    </label>
                  )}
                  <Field label="Wochenende/Feiertag" htmlFor="gf-shift">
                    <select id="gf-shift" value={f.shift} onChange={(e) => set({ shift: e.target.value as Shift })} className={inputCls}>{(['none', 'before', 'after'] as Shift[]).map((x) => <option key={x} value={x}>{SHIFT_LABEL[x]}</option>)}</select>
                  </Field>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Standardaufwand (Min.)" htmlFor="gf-min"><input id="gf-min" type="number" min={0} step={15} value={f.minutes} onChange={(e) => set({ minutes: Math.max(0, Number(e.target.value) || 0) })} className={cx(inputCls, 'tabular')} /></Field>
              <Field label="Status" htmlFor="gf-status"><select id="gf-status" value={f.status} onChange={(e) => set({ status: e.target.value as 'active' | 'inactive' })} className={inputCls}><option value="active">Aktiv</option><option value="inactive">Inaktiv</option></select></Field>
            </div>
            <Field label="Beschreibung (optional)" htmlFor="gf-desc"><textarea id="gf-desc" rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} className={cx(inputCls, 'h-auto py-2')} /></Field>
            <p className="text-xs text-ink2">Verantwortlich ist das Team, das die Arbeit erledigt. Sichtbar ist die Gruppe zusätzlich für die markierten Teams.</p>
          </div>
          <div className="border-t border-hair px-6 py-4">
            {error && <p role="alert" className="mb-2 text-[13px] font-medium">{error}</p>}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => (g ? setEdit(false) : d({ type: 'drawer', drawer: null }))}>Abbrechen</Button>
              <Button type="submit" variant="primary">{g ? 'Serie speichern' : 'Aufgabengruppe anlegen'}</Button>
            </div>
          </div>
        </form>
      )}
    </>
  )
}

