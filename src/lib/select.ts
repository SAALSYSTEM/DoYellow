// Abgeleitete Sichten: Status, Filter, Kennzahlen. Reine Funktionen, keine Seiteneffekte.
import type { Absence, Appointment, Filters, FollowUp, ISODate, Task } from '../types'
import type { State } from '../state/store'
import { EMPLOYEES, TEAMS } from '../data/mock'
import { TODAY, addDays, diffDays, inRange } from './dates'

export type TaskState = 'done' | 'skipped' | 'paused' | 'overdue' | 'today' | 'soon' | 'open'

export function isPaused(s: Pick<State, 'clientTemplates'>, t: Task) {
  if (!t.clientTemplateId) return false
  return s.clientTemplates.find((c) => c.id === t.clientTemplateId)?.status === 'paused'
}

export function taskState(s: Pick<State, 'clientTemplates'>, t: Task): TaskState {
  if (t.status === 'done') return 'done'
  if (t.status === 'skipped') return 'skipped'
  if (isPaused(s, t)) return 'paused'
  const n = diffDays(t.dueDate, TODAY)
  if (n < 0) return 'overdue'
  if (n === 0) return 'today'
  if (n <= 7) return 'soon'
  return 'open'
}

export const team = (id?: string) => TEAMS.find((t) => t.id === id)
export const employee = (id?: string) => EMPLOYEES.find((e) => e.id === id)
export const group = (s: Pick<State, 'groups'>, id?: string) => s.groups.find((g) => g.id === id)
export const category = (s: Pick<State, 'categories'>, id?: string) => s.categories.find((c) => c.id === id)
export const client = (s: Pick<State, 'clients'>, id?: string) => s.clients.find((c) => c.id === id)
export const initials = (id?: string) => {
  const e = employee(id)
  return e ? `${e.firstName[0]}${e.lastName[0]}` : '–'
}

// Welche Mitarbeiter betreuen einen Mandanten? (Für Abwesenheiten bei Mandantenfilter)
function staffOfClient(s: State, clientId: string) {
  const ids = new Set<string>()
  for (const t of s.tasks) if (t.clientId === clientId) {
    if (t.assigneeId) ids.add(t.assigneeId)
    if (t.substituteId) ids.add(t.substituteId)
  }
  for (const a of s.appointments) if (a.clientId === clientId) a.employeeIds.forEach((e) => ids.add(e))
  return ids
}

export function matchTask(f: Filters, t: Task) {
  if (f.type !== 'all' && f.type !== 'tasks') return false
  if (f.clientId && t.clientId !== f.clientId) return false
  if (f.categoryId && t.categoryId !== f.categoryId) return false
  if (f.teamId && t.teamId !== f.teamId && !t.visibleTeamIds?.includes(f.teamId)) return false
  if (f.employeeId && t.assigneeId !== f.employeeId && t.substituteId !== f.employeeId) return false
  return true
}
export function matchAppointment(f: Filters, a: Appointment) {
  if (f.type !== 'all' && f.type !== 'appointments') return false
  if (f.categoryId) return false
  if (f.clientId && a.clientId !== f.clientId) return false
  if (f.teamId && a.teamId !== f.teamId) return false
  if (f.employeeId && !a.employeeIds.includes(f.employeeId)) return false
  return true
}
export function matchFollowUp(f: Filters, x: FollowUp) {
  if (f.type !== 'all' && f.type !== 'followups') return false
  if (f.categoryId) return false
  if (f.clientId && x.clientId !== f.clientId) return false
  if (f.teamId && x.teamId !== f.teamId) return false
  if (f.employeeId && x.ownerId !== f.employeeId) return false
  return true
}
export function makeAbsenceMatcher(s: State) {
  const f = s.filters
  const staff = f.clientId ? staffOfClient(s, f.clientId) : null
  return (a: Absence) => {
    if (f.type !== 'all' && f.type !== 'absences') return false
    if (f.categoryId) return false
    if (staff && !staff.has(a.employeeId)) return false
    if (f.teamId && !employee(a.employeeId)?.teamIds.includes(f.teamId)) return false
    if (f.employeeId && a.employeeId !== f.employeeId) return false
    return true
  }
}

export function visible(s: State) {
  const f = s.filters
  const absenceOk = makeAbsenceMatcher(s)
  const inactiveCats = new Set(s.categories.filter((c) => !c.active).map((c) => c.id))
  return {
    tasks: s.tasks.filter((t) => matchTask(f, t) && !isPaused(s, t) && !(t.categoryId && inactiveCats.has(t.categoryId))),
    appointments: s.appointments.filter((a) => matchAppointment(f, a)),
    absences: s.absences.filter(absenceOk),
    followups: s.followups.filter((x) => matchFollowUp(f, x)),
  }
}

export function sortTasks(a: Task, b: Task) {
  return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)
}

export function counts(s: State, tasks: Task[]) {
  let overdue = 0, today = 0, soon = 0, open = 0
  for (const t of tasks) {
    const st = taskState(s, t)
    if (st === 'overdue') overdue++
    if (st === 'today') today++
    if (st === 'soon') soon++
    if (t.status === 'open' && t.dueDate <= addDays(TODAY, 30)) open++
  }
  return { overdue, today, soon, open }
}

/** Offene Aufgaben und geplanter Aufwand je Team in einem Zeitraum. Keine Auslastungsquote. */
export function teamLoad(tasks: Task[], from: ISODate, to: ISODate) {
  return TEAMS.map((tm) => {
    const list = tasks.filter((t) => t.teamId === tm.id && t.status === 'open' && inRange(t.dueDate, from, to))
    return { team: tm, count: list.length, minutes: list.reduce((n, t) => n + t.estimatedMinutes, 0) }
  })
}

export function nextOccurrence(s: State, t: Task): Task | undefined {
  if (!t.clientTemplateId) return undefined
  return s.tasks
    .filter((x) => x.clientTemplateId === t.clientTemplateId && x.id !== t.id && x.status === 'open' && x.dueDate > t.dueDate)
    .sort(sortTasks)[0]
}

export function seriesOf(s: State, t: Task) {
  if (!t.clientTemplateId) return []
  return s.tasks.filter((x) => x.clientTemplateId === t.clientTemplateId).sort(sortTasks)
}

/** Abhängige Instanzen (Nachfolger), die von dieser Instanz abgeleitet sind */
export function dependentsOf(s: Pick<State, 'tasks'>, t: Task) {
  return s.tasks.filter((x) => x.dependsOnId === t.id && x.status === 'open')
}

export function isLate(t: Task) {
  return t.status === 'done' && !!t.completedAt && t.completedAt > t.dueDate
}
