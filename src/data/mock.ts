// Zentrale Beispieldaten der Vorschau. Alles, was die Oberfläche zeigt, kommt von hier.
import type { Absence, Appointment, Category, Client, ClientTemplate, Employee, FollowUp, Note, Task, TaskGroup, Team } from '../types'
import { TODAY, diffDays } from '../lib/dates'
import { HISTORY_FROM, HORIZON, buildTasks } from '../lib/generate'

// Feste Mandantenpalette: 10 Töne, ohne Gelb, Rot, Amber und Koralle (die wirken wie Status).
export const CLIENT_PALETTE: { name: string; hex: string }[] = [
  { name: 'Grün', hex: '#2F9E5B' },
  { name: 'Blau', hex: '#3B7BE8' },
  { name: 'Violett', hex: '#9250D0' },
  { name: 'Orange', hex: '#DD7A1F' },
  { name: 'Petrol', hex: '#149C8A' },
  { name: 'Cyan', hex: '#1A94B8' },
  { name: 'Indigo', hex: '#6467E8' },
  { name: 'Magenta', hex: '#C7439E' },
  { name: 'Lind', hex: '#5E9E2F' },
  { name: 'Schiefer', hex: '#6B7A90' },
]

export const WORKSPACE = { name: 'Muster-Workspace', region: 'Nordrhein-Westfalen', timezone: 'Europe/Berlin' }
export const CURRENT_USER_ID = 'e-muster1'

export const TEAMS: Team[] = [
  { id: 't-fibu', name: 'FiBu', description: 'Finanzbuchhaltung, Abschlüsse, Bank' },
  { id: 't-stwa', name: 'St/Wa', description: 'Steuern und Warenwirtschaft' },
  { id: 't-pers', name: 'Personal', description: 'Lohn und Personalthemen' },
  { id: 't-ctrl', name: 'Controlling', description: 'Reporting und Planung' },
]

// Muster-Daten: bewusst klein gehalten, eigene Daten werden in der App angelegt.
export const EMPLOYEES: Employee[] = [
  { id: 'e-muster1', firstName: 'Benutzer', lastName: 'Muster1', teamIds: ['t-fibu'], role: 'Admin' },
  { id: 'e-muster2', firstName: 'Benutzer', lastName: 'Muster2', teamIds: ['t-stwa', 't-ctrl'], role: 'Mitarbeiter' },
]

export const CLIENTS: Client[] = [
  { id: 'c-101', number: '101', name: 'Muster1 GmbH', color: '#2F9E5B', teamIds: ['t-fibu', 't-stwa', 't-ctrl'], contact: 'Ansprechpartner Muster1', address: 'Musterstraße 1, 12345 Musterstadt', active: true },
  { id: 'c-102', number: '102', name: 'Muster2 GmbH', color: '#3B7BE8', teamIds: ['t-fibu', 't-stwa'], contact: 'Ansprechpartner Muster2', address: 'Musterweg 2, 12345 Musterstadt', active: true },
]

export const CATEGORIES: Category[] = [
  { id: 'cat-mab', name: 'Monatsabschluss', description: 'Mini-Prozess als Beispiel', active: true, teamIds: ['t-fibu', 't-stwa', 't-ctrl'], clientIds: ['c-101', 'c-102'] },
  { id: 'cat-jab', name: 'Jahresabschluss', description: 'Noch leer, eigene Aufgabengruppen anlegen', active: true, teamIds: ['t-fibu', 't-stwa', 't-ctrl'], clientIds: [] },
  { id: 'cat-ber', name: 'Berichtswesen', description: 'Noch leer, eigene Aufgabengruppen anlegen', active: true, teamIds: ['t-ctrl', 't-fibu'], clientIds: [] },
  { id: 'cat-beirat', name: 'Beirat', description: 'Noch leer, eigene Aufgabengruppen anlegen', active: true, teamIds: ['t-ctrl'], clientIds: [] },
]

// Mini-Prozess Monatsabschluss: LF/KA → (2 Werktage) → WR/ST, dazu FI/KR und eine Abschlussbesprechung.
// Regeln "des Folgemonats" = Bezugsperiode Vormonat.
export const TEMPLATES: TaskGroup[] = [
  { id: 'g-lfka', name: 'Lager-/Fakturaabschluss', short: 'LF/KA', categoryId: 'cat-mab', teamId: 't-fibu', visibleTeamIds: ['t-fibu', 't-ctrl'], rule: { freq: 'month', interval: 1, day: 5 }, shift: 'before', refType: 'month', refOffset: -1, reminderDays: 2, estimatedMinutes: 90, status: 'active', description: 'Lagerbuchungen und Fakturierung des Vormonats abschließen. Startpunkt für den Warenabschluss.' },
  { id: 'g-wrst', name: 'Waren-/Streckenabschluss', short: 'WR/ST', categoryId: 'cat-mab', teamId: 't-stwa', visibleTeamIds: ['t-stwa', 't-fibu', 't-ctrl'], rule: { freq: 'month', interval: 1, day: 7 }, shift: 'none', refType: 'month', refOffset: -1, reminderDays: 1, estimatedMinutes: 120, status: 'active', dependency: { predecessorId: 'g-lfka', offset: 2, unit: 'workdays', direction: 'after' }, description: 'Waren- und Streckengeschäfte abgrenzen, sobald Lager und Faktura stehen.' },
  { id: 'g-fikr', name: 'FiBu-/Kreditorenabschluss', short: 'FI/KR', categoryId: 'cat-mab', teamId: 't-fibu', visibleTeamIds: ['t-fibu', 't-ctrl'], rule: { freq: 'month', interval: 1, day: 10 }, shift: 'before', refType: 'month', refOffset: -1, reminderDays: 3, estimatedMinutes: 180, status: 'active', description: 'Kreditoren abstimmen, Abgrenzungen buchen.' },
  { id: 'g-mab', name: 'Monatsabschlussbesprechung', short: 'MAB', categoryId: 'cat-mab', teamId: 't-ctrl', visibleTeamIds: ['t-fibu', 't-stwa', 't-ctrl'], rule: { freq: 'month', interval: 1, day: 22 }, shift: 'before', refType: 'month', refOffset: -1, reminderDays: 2, estimatedMinutes: 120, status: 'active', meeting: { start: '10:00', durationMinutes: 120, participantIds: ['e-muster1', 'e-muster2'] }, description: 'Ergebnisse des Monatsabschlusses besprechen.' },
]
export const GROUPS = TEMPLATES

const Q = '2026-01-01' // Anker für Monats- und Quartalsregeln
const a = (id: string, clientId: string | undefined, templateId: string, extra: Partial<ClientTemplate> = {}): ClientTemplate => ({ id, clientId, templateId, startsOn: Q, status: 'active', ...extra })

export const CLIENT_TEMPLATES: ClientTemplate[] = [
  a('ct-101-lfka', 'c-101', 'g-lfka', { assigneeId: 'e-muster1', substituteId: 'e-muster2' }),
  a('ct-101-wrst', 'c-101', 'g-wrst', { assigneeId: 'e-muster2' }),
  a('ct-101-fikr', 'c-101', 'g-fikr', { assigneeId: 'e-muster1' }),
  a('ct-101-mab', 'c-101', 'g-mab'),
  a('ct-102-lfka', 'c-102', 'g-lfka', { day: 6, assigneeId: 'e-muster1' }),
  a('ct-102-wrst', 'c-102', 'g-wrst', { assigneeId: 'e-muster2' }),
  a('ct-102-fikr', 'c-102', 'g-fikr', { day: 12, assigneeId: 'e-muster1', substituteId: 'e-muster2' }),
]

export const TASKS: Task[] = buildTasks(CLIENT_TEMPLATES, TEMPLATES, HISTORY_FROM, HORIZON, [], true)

// Leer: Termine, Abwesenheiten, Wiedervorlagen und Notizen legst du in der App selbst an.
export const APPOINTMENTS: Appointment[] = []
export const ABSENCES: Absence[] = []
export const FOLLOWUPS: FollowUp[] = []
export const NOTES: Note[] = []

export const daysUntil = (d: string) => diffDays(d, TODAY)
