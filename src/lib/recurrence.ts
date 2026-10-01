// Recurrence-Engine der Vorschau, umgesetzt nach doyellow-recurrence-engine.md:
// Anker = startsOn, Intervall zählt immer vom Anker, Tag > Monatslänge = Monatsende,
// Verschiebung none/before/after über Arbeitstage (Mo–Fr ohne Feiertage NRW).
import type { Dependency, ISODate, RecurrenceRule, RefPeriodType, Shift, TaskGroup } from '../types'
import { addDays, addMonths, daysInMonth, diffDays, make, startOfWeek, weekday, ym } from './dates'

// Gesetzliche Feiertage Nordrhein-Westfalen (Workspace-Region NW)
export const HOLIDAYS_NW: Record<ISODate, string> = {
  '2026-01-01': 'Neujahr', '2026-04-03': 'Karfreitag', '2026-04-06': 'Ostermontag', '2026-05-01': 'Tag der Arbeit',
  '2026-05-14': 'Christi Himmelfahrt', '2026-05-25': 'Pfingstmontag', '2026-06-04': 'Fronleichnam',
  '2026-10-03': 'Tag der Deutschen Einheit', '2026-11-01': 'Allerheiligen', '2026-12-25': '1. Weihnachtstag', '2026-12-26': '2. Weihnachtstag',
  '2027-01-01': 'Neujahr', '2027-03-26': 'Karfreitag', '2027-03-29': 'Ostermontag', '2027-05-01': 'Tag der Arbeit',
  '2027-05-06': 'Christi Himmelfahrt', '2027-05-17': 'Pfingstmontag', '2027-05-27': 'Fronleichnam',
  '2027-10-03': 'Tag der Deutschen Einheit', '2027-11-01': 'Allerheiligen', '2027-12-25': '1. Weihnachtstag', '2027-12-26': '2. Weihnachtstag',
}

export function isWorkday(d: ISODate): boolean {
  return weekday(d) <= 5 && !HOLIDAYS_NW[d]
}

export function applyShift(d: ISODate, shift: Shift): ISODate {
  if (shift === 'none') return d
  let x = d
  for (let i = 0; i < 10 && !isWorkday(x); i++) x = addDays(x, shift === 'before' ? -1 : 1)
  return x
}

function dayIn(y: number, m: number, day: number | 'last'): ISODate {
  const dim = daysInMonth(y, m)
  return make(y, m, day === 'last' ? dim : Math.min(day, dim))
}

/** Alle Soll-Termine (nominal) zwischen from und to, gezählt ab dem Anker. */
export function addWorkdays(d: ISODate, n: number): ISODate {
  const step = n < 0 ? -1 : 1
  let x = d
  for (let left = Math.abs(n); left > 0;) {
    x = addDays(x, step)
    if (isWorkday(x)) left--
  }
  return x
}

export function applyDependency(pred: ISODate, dep: Dependency): ISODate {
  const n = dep.direction === 'after' ? dep.offset : -dep.offset
  return dep.unit === 'workdays' ? addWorkdays(pred, n) : addDays(pred, n)
}

/** Alle Soll-Termine (nominal) zwischen from und to, gezählt ab dem Anker. */
export function occurrences(rule: RecurrenceRule, anchor: ISODate, from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  const start = from > anchor ? from : anchor
  if (rule.freq === 'once') return rule.date && rule.date >= from && rule.date <= to ? [rule.date] : []
  if (rule.freq === 'week') {
    const wd = rule.weekday ?? weekday(anchor)
    const anchorWeek = startOfWeek(anchor)
    let d = addDays(anchorWeek, wd - 1)
    if (d < anchor) d = addDays(d, 7 * rule.interval)
    while (d <= to) {
      if (d >= start) out.push(d)
      d = addDays(d, 7 * rule.interval)
    }
    return out
  }
  const [ay, am] = ym(anchor)
  const step = rule.freq === 'year' ? 12 * rule.interval : rule.interval
  const baseMonth = rule.freq === 'year' || rule.interval === 3 ? (rule.month ?? am) : am
  for (let i = 0; i < 400; i++) {
    const [y, m] = addMonths(ay, baseMonth, i * step)
    const d = dayIn(y, m, rule.day ?? 'last')
    if (d > to) break
    if (d >= start) out.push(d)
  }
  return out
}

export function periodKey(rule: RecurrenceRule, nominal: ISODate): string {
  if (rule.freq === 'once') return nominal
  if (rule.freq === 'week') {
    const thu = addDays(startOfWeek(nominal), 3)
    const year = thu.slice(0, 4)
    const w = Math.floor(diffDays(thu, make(Number(year), 1, 1)) / 7) + 1
    return `${year}-W${String(w).padStart(2, '0')}`
  }
  if (rule.freq === 'year') return nominal.slice(0, 4)
  return nominal.slice(0, 7)
}

export function refPeriodKey(type: RefPeriodType, offset: number, nominal: ISODate): string | undefined {
  const [y, m] = ym(nominal)
  if (type === 'none') return undefined
  if (type === 'month') {
    const [ry, rm] = addMonths(y, m, offset)
    return `${ry}-${String(rm).padStart(2, '0')}`
  }
  if (type === 'quarter') {
    const q = Math.floor((m - 1) / 3) + offset
    const ry = y + Math.floor(q / 4)
    return `${ry}-Q${((q % 4) + 4) % 4 + 1}`
  }
  return String(y + offset)
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export function ruleLabel(rule: RecurrenceRule, refType: RefPeriodType = 'none', refOffset = 0): string {
  const wd = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
  const day = rule.day === 'last' ? 'am Monatsende' : `am ${rule.day}.`
  if (rule.freq === 'once') return rule.date ? `Einmalig am ${rule.date.slice(8)}.${rule.date.slice(5, 7)}.${rule.date.slice(0, 4)}` : 'Einmalig'
  if (rule.freq === 'week') return rule.interval === 1 ? `Wöchentlich, ${wd[rule.weekday ?? 1]}` : `Alle ${rule.interval} Wochen, ${wd[rule.weekday ?? 1]}`
  if (rule.freq === 'year') return `Jährlich ${rule.day === 'last' ? 'zum Monatsende' : `am ${rule.day}.`} ${MONTHS[(rule.month ?? 1) - 1]}`
  if (rule.interval === 3) return `Quartalsweise ${day}${refType === 'quarter' && refOffset === -1 ? ' nach Quartalsende' : ''}`
  return `Monatlich ${day}${refType === 'month' && refOffset === -1 ? ' des Folgemonats' : ''}`
}

/** Serienregel einer Aufgabengruppe in Worten, inkl. Abhängigkeit */
export function groupRuleLabel(g: TaskGroup, groups: TaskGroup[], dayOverride?: number | 'last'): string {
  if (g.dependency) {
    const p = groups.find((x) => x.id === g.dependency!.predecessorId)
    const dep = g.dependency
    const unit = dep.unit === 'workdays' ? (dep.offset === 1 ? 'Werktag' : 'Werktage') : (dep.offset === 1 ? 'Kalendertag' : 'Kalendertage')
    return `${dep.offset} ${unit} ${dep.direction === 'after' ? 'nach' : 'vor'} ${p?.short ?? 'Vorgänger'}`
  }
  return ruleLabel({ ...g.rule, day: dayOverride ?? g.rule.day }, g.refType, g.refOffset)
}

export function dependencyLabel(dep: Dependency, groups: TaskGroup[]) {
  const p = groups.find((x) => x.id === dep.predecessorId)
  const unit = dep.unit === 'workdays' ? 'Werktage' : 'Kalendertage'
  return `${dep.offset} ${unit} ${dep.direction === 'after' ? 'nach' : 'vor'} ${p ? `${p.short} · ${p.name}` : 'Vorgänger'}`
}

export function freqOf(rule: RecurrenceRule) {
  if (rule.freq === 'month' && rule.interval === 3) return 'quarter' as const
  return rule.freq
}

export const STATE_LABEL = { draft: 'Entwurf', tentative: 'Vorläufig', confirmed: 'Bestätigt', done: 'Erledigt', cancelled: 'Abgesagt' } as const
export const FREQ_LABEL = { once: 'Einmalig', week: 'Wöchentlich', month: 'Monatlich', quarter: 'Quartalsweise', year: 'Jährlich' } as const
export const SHIFT_LABEL = { none: 'Keine Verschiebung', before: 'Vorheriger Arbeitstag', after: 'Nächster Arbeitstag' } as const
