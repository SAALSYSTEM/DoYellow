// Datenmodell der Vorschau. Feldnamen folgen der Recurrence-Spezifikation,
// damit die Typen später 1:1 auf Supabase-Tabellen abgebildet werden können.

export type ISODate = string // 'YYYY-MM-DD'

export interface Team {
  id: string
  name: string // 'FiBu'
  description: string
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  teamIds: string[]
  role: 'Admin' | 'Mitarbeiter'
}

export interface Client {
  id: string
  number: string // Mandantennummer, z. B. '515'
  name: string
  color: string // Hex aus CLIENT_PALETTE
  teamIds: string[]
  contact?: string
  address?: string
  active: boolean
}

export type Freq = 'once' | 'week' | 'month' | 'quarter' | 'year'
export type Shift = 'none' | 'before' | 'after'
export type RefPeriodType = 'none' | 'month' | 'quarter' | 'year'

export interface RecurrenceRule {
  freq: 'once' | 'week' | 'month' | 'year'
  interval: number // Woche: 1 oder 2, Monat: 1, Quartal = month/3, Jahr: 1
  day?: number | 'last' // Monat/Jahr
  weekday?: number // 1 = Montag … 7 = Sonntag
  month?: number // Jahr: Monat 1–12; Quartal: Startmonat 1–3
  date?: ISODate // einmalig
}

// ——— Prozessstruktur (v1.1.1): Kategorie → Aufgabengruppe → Instanz ———

/** Planungszustand einer Instanz. Unabhängig von der Dringlichkeit (überfällig/heute). */
export type ProcessStatus = 'draft' | 'tentative' | 'confirmed' | 'done' | 'cancelled'

export interface Category {
  id: string
  name: string
  description?: string
  active: boolean
  teamIds: string[] // sichtbar für
  clientIds: string[] // leer = global bzw. intern
}

export interface Dependency {
  predecessorId: string // Aufgabengruppe
  offset: number
  unit: 'workdays' | 'calendar'
  direction: 'after' | 'before'
}

export interface MeetingSpec {
  start: string // 'HH:MM'
  durationMinutes: number
  participantIds: string[]
}

/** Aufgabengruppe: definiert eine Serie. Ersetzt die frühere "Aufgabenvorlage". */
export interface TaskGroup {
  id: string
  name: string
  short: string // Kürzel, z. B. 'LF/KA'
  categoryId: string
  teamId: string // verantwortliches Team
  visibleTeamIds: string[] // sichtbar für
  rule: RecurrenceRule
  shift: Shift
  refType: RefPeriodType
  refOffset: number
  reminderDays: number
  estimatedMinutes: number
  status: 'active' | 'inactive'
  description?: string
  dependency?: Dependency
  meeting?: MeetingSpec // gekoppelter Termin (z. B. Monatsabschlussbesprechung)
}
/** Alter Name aus v1.1.0 */
export type TaskTemplate = TaskGroup

// Zuordnung einer Aufgabengruppe zu einem Mandanten (oder intern ohne Mandant)
export interface ClientTemplate {
  id: string
  clientId?: string
  templateId: string // Aufgabengruppe
  startsOn: ISODate // Recurrence-Anker
  day?: number | 'last' // abweichender Tag
  weekday?: number
  assigneeId?: string
  substituteId?: string
  estimatedMinutes?: number
  status: 'active' | 'paused'
}

export type TaskStatus = 'open' | 'done' | 'skipped'

/** Konkrete Instanz einer Serie (ProcessInstance) oder Einzelaufgabe. */
export interface Task {
  id: string
  clientId?: string
  teamId: string // verantwortliches Team
  visibleTeamIds?: string[]
  categoryId?: string
  templateId?: string // Aufgabengruppe
  clientTemplateId?: string // Serie (Gruppe × Mandant); leer bei Einmalaufgabe
  title: string // Snapshot
  short?: string // Kürzel der Gruppe (Snapshot)
  description?: string
  periodKey?: string
  refPeriodKey?: string // '2026-09', '2026-Q3', '2026'
  nominalDate: ISODate
  plannedDate: ISODate // Termin laut Serie (nach Wochenend-/Feiertagsregel bzw. Abhängigkeit)
  dueDate: ISODate // tatsächlicher Termin, ggf. einzeln verschoben
  overridden?: boolean // Sync-Sperre: einzeln geändert, Serie schreibt nicht mehr darüber
  dependsOnId?: string // Instanz des Vorgängers
  status: TaskStatus
  state: ProcessStatus
  completedAt?: ISODate
  assigneeId?: string
  substituteId?: string
  estimatedMinutes: number
  reminderDays?: number
  recurrence: Freq
  recurrenceInterval?: number
  shift: Shift
  start?: string // gekoppelter Termin
  end?: string
  participantIds?: string[]
}
export type ProcessInstance = Task

export interface Appointment {
  id: string
  title: string
  date: ISODate
  start: string // 'HH:MM'
  end: string
  clientId?: string
  teamId?: string
  employeeIds: string[]
  location?: string
}

export type AbsenceType = 'Urlaub' | 'Krank' | 'Sonstiges'

export interface Absence {
  id: string
  employeeId: string
  from: ISODate
  to: ISODate
  type: AbsenceType
  note?: string
}

export interface FollowUp {
  id: string
  clientId?: string
  teamId?: string
  ownerId: string
  title: string
  note: string
  date: ISODate
  done: boolean
}

export interface Note {
  id: string
  clientId?: string
  employeeId?: string
  taskId?: string
  title: string
  body: string
  date: ISODate
  authorId: string
}

export type ItemType = 'all' | 'tasks' | 'appointments' | 'absences' | 'followups'

export interface Filters {
  clientId?: string
  teamId?: string
  categoryId?: string
  employeeId?: string
  type: ItemType
}

export type ViewId =
  | 'overview' | 'calendar' | 'tasks' | 'appointments' | 'absences' | 'followups' | 'notes'
  | 'clients' | 'teams' | 'employees' | 'categories' | 'groups'
  | 'profile' | 'help' | 'users' | 'rules' | 'billing'
