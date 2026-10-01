// Erzeugt konkrete Instanzen aus Aufgabengruppen und Mandantenzuordnungen.
// Unabhängige Gruppen zuerst, dann Gruppen mit Abhängigkeit (Vorgänger gleicher Mandant, gleiche Periode).
import type { ClientTemplate, ISODate, ProcessStatus, Task, TaskGroup } from '../types'
import { TODAY, addDays } from './dates'
import { applyDependency, applyShift, freqOf, occurrences, periodKey, refPeriodKey } from './recurrence'

export const HISTORY_FROM: ISODate = '2026-01-01'
export const HORIZON: ISODate = '2027-10-31' // Monatsende in 12 Monaten

// Beispielhafte Ausnahmen, damit die Demo realistisch aussieht
const OVERDUE = new Set(['ct-102-fikr:2026-09'])
const CANCELLED = new Set<string>([])

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Planungszustand für neu erzeugte Instanzen: nah = bestätigt, Rest 2026 = vorläufig, 2027 = Entwurf */
export function initialState(due: ISODate): ProcessStatus {
  if (due <= addDays(TODAY, 45)) return 'confirmed'
  if (due <= '2026-12-31') return 'tentative'
  return 'draft'
}

function endTime(start: string, minutes: number) {
  const [h, m] = start.split(':').map(Number)
  const t = h * 60 + m + minutes
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function buildTasks(
  cts: ClientTemplate[],
  groups: TaskGroup[],
  from: ISODate,
  to: ISODate,
  existing: Task[] = [],
  simulateHistory = false,
  only?: Set<string>,
): Task[] {
  const out: Task[] = []
  const byId = new Map(existing.map((t) => [t.id, t]))
  const lookup = (pred: (t: Task) => boolean) => {
    const seen = new Set<string>()
    const res: Task[] = []
    for (const t of [...existing, ...out]) if (!seen.has(t.id) && pred(t)) { seen.add(t.id); res.push(byId.get(t.id) ?? t) }
    return res
  }
  const depth = (g: TaskGroup, n = 0): number => {
    if (!g.dependency || n > 4) return n
    const p = groups.find((x) => x.id === g.dependency!.predecessorId)
    return p ? depth(p, n + 1) : n
  }
  const ordered = [...cts].sort((a, b) => {
    const ga = groups.find((g) => g.id === a.templateId)
    const gb = groups.find((g) => g.id === b.templateId)
    return (ga ? depth(ga) : 0) - (gb ? depth(gb) : 0)
  })

  for (const ct of ordered) {
    const g = groups.find((x) => x.id === ct.templateId)
    if (!g || g.status === 'inactive') continue
    if (only && !only.has(g.id)) continue
    const rule = { ...g.rule, day: ct.day ?? g.rule.day, weekday: ct.weekday ?? g.rule.weekday }

    type Slot = { nominal: ISODate; planned: ISODate; pk: string; ref?: string; dependsOnId?: string }
    const slots: Slot[] = []
    if (g.dependency) {
      const predCt = cts.find((c) => c.templateId === g.dependency!.predecessorId && c.clientId === ct.clientId)
      const preds = predCt ? lookup((t) => t.clientTemplateId === predCt.id && t.state !== 'cancelled') : []
      for (const p of preds) {
        const nominal = applyDependency(p.dueDate, g.dependency)
        if (nominal < from || nominal > to) continue
        slots.push({ nominal, planned: g.dependency.unit === 'calendar' ? applyShift(nominal, g.shift) : nominal, pk: p.periodKey ?? p.dueDate.slice(0, 7), ref: p.refPeriodKey, dependsOnId: p.id })
      }
    } else {
      for (const nominal of occurrences(rule, ct.startsOn, from, to)) {
        slots.push({ nominal, planned: applyShift(nominal, g.shift), pk: periodKey(rule, nominal), ref: refPeriodKey(g.refType, g.refOffset, nominal) })
      }
    }

    for (const sl of slots) {
      const key = `${ct.id}:${sl.pk}`
      const past = sl.planned < TODAY
      let state: ProcessStatus = initialState(sl.planned)
      let status: Task['status'] = 'open'
      if (simulateHistory && past && !OVERDUE.has(key)) { state = 'done'; status = 'done' }
      if (simulateHistory && OVERDUE.has(key)) state = 'confirmed'
      if (CANCELLED.has(key)) { state = 'cancelled'; status = 'skipped' }
      const late = status === 'done' && hash(key) % 9 === 0
      const meeting = g.meeting
      out.push({
        id: `task-${ct.id}-${sl.pk}`,
        clientId: ct.clientId,
        teamId: g.teamId,
        visibleTeamIds: g.visibleTeamIds,
        categoryId: g.categoryId,
        templateId: g.id,
        clientTemplateId: ct.id,
        title: g.name,
        short: g.short,
        description: g.description,
        periodKey: sl.pk,
        refPeriodKey: sl.ref,
        nominalDate: sl.nominal,
        plannedDate: sl.planned,
        dueDate: sl.planned,
        dependsOnId: sl.dependsOnId,
        status,
        state,
        completedAt: status === 'done' ? addDays(sl.planned, late ? 1 : -(hash(key) % 3)) : undefined,
        assigneeId: ct.assigneeId ?? meeting?.participantIds[0],
        substituteId: ct.substituteId,
        estimatedMinutes: ct.estimatedMinutes ?? (meeting ? meeting.durationMinutes : g.estimatedMinutes),
        reminderDays: g.reminderDays,
        recurrence: freqOf(rule),
        recurrenceInterval: rule.interval,
        shift: g.shift,
        start: meeting?.start,
        end: meeting ? endTime(meeting.start, meeting.durationMinutes) : undefined,
        participantIds: meeting?.participantIds,
      })
    }
  }
  return out
}

/**
 * Serie neu berechnen (nach "Serie bearbeiten"): Erledigte, abgesagte, vergangene und einzeln
 * geänderte Instanzen bleiben unverändert. Abhängige Gruppen werden mit neu berechnet.
 */
export function regenerate(tasks: Task[], cts: ClientTemplate[], groups: TaskGroup[], groupIds: string[]) {
  const affected = new Set(groupIds)
  for (let i = 0; i < 4; i++) for (const g of groups) if (g.dependency && affected.has(g.dependency.predecessorId)) affected.add(g.id)
  const keep = tasks.filter((t) => !t.templateId || !affected.has(t.templateId) || t.status !== 'open' || t.overridden || t.dueDate < TODAY)
  const keptIds = new Set(keep.map((t) => t.id))
  const generated = buildTasks(cts, groups, TODAY, HORIZON, keep, false, affected)
  const fresh = generated.filter((t) => !keptIds.has(t.id))
  const removed = tasks.length - keep.length
  return { tasks: [...keep, ...fresh], removed, created: fresh.length, locked: keep.filter((t) => t.templateId && affected.has(t.templateId) && t.overridden && t.status === 'open' && t.dueDate >= TODAY).length }
}
