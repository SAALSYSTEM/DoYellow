import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type { Absence, Appointment, Category, Client, ClientTemplate, Filters, FollowUp, ISODate, Note, ProcessStatus, Task, TaskGroup, ViewId } from '../types'
import { ABSENCES, APPOINTMENTS, CATEGORIES, CLIENTS, CLIENT_TEMPLATES, FOLLOWUPS, GROUPS, NOTES, TASKS } from '../data/mock'
import { regenerate } from '../lib/generate'
import { TODAY, ym } from '../lib/dates'

export type CalendarMode = 'year' | 'month' | 'week' | 'day'

export type Drawer =
  | { kind: 'task'; id: string }
  | { kind: 'client'; id: string; tab?: ClientTab }
  | { kind: 'new'; what: 'task' | 'appointment' | 'followup'; date?: ISODate }
  | { kind: 'group'; id?: string; edit?: boolean; categoryId?: string }
  | { kind: 'day'; date: ISODate }
  | null

export type ClientTab = 'overview' | 'tasks' | 'appointments' | 'notes'

export interface Toast {
  id: number
  text: string
  sub?: string
  undo?: Action
}

export interface State {
  categories: Category[]
  groups: TaskGroup[]
  clients: Client[]
  clientTemplates: ClientTemplate[]
  tasks: Task[]
  appointments: Appointment[]
  absences: Absence[]
  followups: FollowUp[]
  notes: Note[]
  filters: Filters
  view: ViewId
  cal: { year: number; month: number; mode: CalendarMode; selected: ISODate }
  drawer: Drawer
  toast: Toast | null
  navOpen: boolean
}

export type Action =
  | { type: 'view'; view: ViewId }
  | { type: 'filters'; patch: Partial<Filters> }
  | { type: 'resetFilters' }
  | { type: 'calMonth'; delta: number }
  | { type: 'calToday' }
  | { type: 'calMode'; mode: CalendarMode }
  | { type: 'select'; date: ISODate }
  | { type: 'drawer'; drawer: Drawer }
  | { type: 'taskStatus'; id: string; status: Task['status']; completedAt?: ISODate }
  | { type: 'taskPatch'; id: string; patch: Partial<Task> }
  | { type: 'taskState'; id: string; state: ProcessStatus }
  | { type: 'moveTask'; id: string; date: ISODate }
  | { type: 'resetTask'; id: string }
  | { type: 'saveGroup'; group: TaskGroup; clientIds: (string | undefined)[] }
  | { type: 'saveCategory'; category: Category }
  | { type: 'addTasks'; tasks: Task[] }
  | { type: 'addAppointment'; item: Appointment }
  | { type: 'addFollowUp'; item: FollowUp }
  | { type: 'followUpDone'; id: string; done: boolean }
  | { type: 'addNote'; item: Note }
  | { type: 'addAbsence'; item: Absence }
  | { type: 'clientPatch'; id: string; patch: Partial<Client> }
  | { type: 'toast'; toast: Omit<Toast, 'id'> | null }
  | { type: 'nav'; open: boolean }

const [ty, tm] = ym(TODAY)

const initial: State = {
  categories: CATEGORIES,
  groups: GROUPS,
  clients: CLIENTS,
  clientTemplates: CLIENT_TEMPLATES,
  tasks: TASKS,
  appointments: APPOINTMENTS,
  absences: ABSENCES,
  followups: FOLLOWUPS,
  notes: NOTES,
  filters: { type: 'all' },
  view: 'calendar',
  cal: { year: ty, month: tm, mode: 'year', selected: TODAY },
  drawer: null,
  toast: null,
  navOpen: false,
}

let toastId = 1

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'view':
      return { ...s, view: a.view, drawer: null, navOpen: false }
    case 'filters':
      return { ...s, filters: { ...s.filters, ...a.patch } }
    case 'resetFilters':
      return { ...s, filters: { type: 'all' } }
    case 'calMonth': {
      const t = s.cal.year * 12 + (s.cal.month - 1) + a.delta
      return { ...s, cal: { ...s.cal, year: Math.floor(t / 12), month: (t % 12) + 1 } }
    }
    case 'calToday':
      return { ...s, cal: { ...s.cal, year: ty, month: tm, selected: TODAY } }
    case 'calMode':
      return { ...s, cal: { ...s.cal, mode: a.mode } }
    case 'select': {
      const [y, m] = ym(a.date)
      return { ...s, cal: { ...s.cal, selected: a.date, year: y, month: m } }
    }
    case 'drawer':
      return { ...s, drawer: a.drawer }
    case 'taskStatus':
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === a.id ? {
          ...t,
          status: a.status,
          state: a.status === 'done' ? 'done' : a.status === 'skipped' ? 'cancelled' : t.state === 'done' || t.state === 'cancelled' ? 'confirmed' : t.state,
          completedAt: a.status === 'done' ? a.completedAt ?? TODAY : undefined,
        } : t)),
      }
    case 'taskState':
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === a.id ? {
          ...t,
          state: a.state,
          status: a.state === 'done' ? 'done' : a.state === 'cancelled' ? 'skipped' : 'open',
          completedAt: a.state === 'done' ? t.completedAt ?? TODAY : undefined,
        } : t)),
      }
    case 'moveTask':
      return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, dueDate: a.date, overridden: a.date !== t.plannedDate } : t)) }
    case 'resetTask':
      return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, dueDate: t.plannedDate, overridden: false } : t)) }
    case 'saveGroup': {
      const exists = s.groups.some((g) => g.id === a.group.id)
      const groups = exists ? s.groups.map((g) => (g.id === a.group.id ? a.group : g)) : [...s.groups, a.group]
      // Mandantenzuordnungen abgleichen; Tagesabweichungen entfallen, die Serie gilt einheitlich
      const old = s.clientTemplates.filter((c) => c.templateId === a.group.id)
      const keepCts = old.filter((c) => a.clientIds.includes(c.clientId)).map((c) => ({ ...c, day: undefined }))
      const added = a.clientIds
        .filter((cid) => !old.some((c) => c.clientId === cid))
        .map((cid): ClientTemplate => ({ id: `ct-${cid ?? 'int'}-${a.group.id}-${Date.now() % 100000}`, clientId: cid, templateId: a.group.id, startsOn: '2026-01-01', status: 'active' }))
      const removedIds = new Set(old.filter((c) => !a.clientIds.includes(c.clientId)).map((c) => c.id))
      const clientTemplates = [...s.clientTemplates.filter((c) => c.templateId !== a.group.id), ...keepCts, ...added]
      const base = s.tasks.filter((t) => !(t.clientTemplateId && removedIds.has(t.clientTemplateId) && t.status === 'open' && t.dueDate >= TODAY))
      // Snapshot-Felder offener, nicht gesperrter Instanzen aktualisieren
      const synced = base.map((t) => (t.templateId === a.group.id && t.status === 'open' && !t.overridden && t.dueDate >= TODAY
        ? { ...t, title: a.group.name, short: a.group.short, categoryId: a.group.categoryId, teamId: a.group.teamId, visibleTeamIds: a.group.visibleTeamIds, description: a.group.description }
        : t))
      const r = regenerate(synced, clientTemplates, groups, [a.group.id])
      return { ...s, groups, clientTemplates, tasks: r.tasks }
    }
    case 'saveCategory': {
      const exists = s.categories.some((c) => c.id === a.category.id)
      return { ...s, categories: exists ? s.categories.map((c) => (c.id === a.category.id ? a.category : c)) : [...s.categories, a.category] }
    }
    case 'taskPatch':
      return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) }
    case 'addTasks':
      return { ...s, tasks: [...s.tasks, ...a.tasks] }
    case 'addAppointment':
      return { ...s, appointments: [...s.appointments, a.item] }
    case 'addFollowUp':
      return { ...s, followups: [...s.followups, a.item] }
    case 'followUpDone':
      return { ...s, followups: s.followups.map((f) => (f.id === a.id ? { ...f, done: a.done } : f)) }
    case 'addNote':
      return { ...s, notes: [a.item, ...s.notes] }
    case 'addAbsence':
      return { ...s, absences: [...s.absences, a.item] }
    case 'clientPatch':
      return { ...s, clients: s.clients.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) }
    case 'toast':
      return { ...s, toast: a.toast ? { ...a.toast, id: toastId++ } : null }
    case 'nav':
      return { ...s, navOpen: a.open }
  }
}

const Ctx = createContext<{ s: State; d: Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, initial)
  const value = useMemo(() => ({ s, d }), [s])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider fehlt')
  return v
}
