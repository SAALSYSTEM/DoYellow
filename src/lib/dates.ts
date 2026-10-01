import type { ISODate } from '../types'

// Demo-Datum der Vorschau: Donnerstag, 1. Oktober 2026.
export const TODAY: ISODate = '2026-10-01'

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function parse(d: ISODate): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}
export function iso(d: Date): ISODate {
  return d.toISOString().slice(0, 10)
}
export function make(y: number, m: number, d: number): ISODate {
  return iso(new Date(Date.UTC(y, m - 1, d)))
}
export function addDays(d: ISODate, n: number): ISODate {
  const x = parse(d)
  x.setUTCDate(x.getUTCDate() + n)
  return iso(x)
}
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
export function addMonths(y: number, m: number, n: number): [number, number] {
  const t = y * 12 + (m - 1) + n
  return [Math.floor(t / 12), (t % 12) + 1]
}
/** 1 = Montag … 7 = Sonntag */
export function weekday(d: ISODate): number {
  const w = parse(d).getUTCDay()
  return w === 0 ? 7 : w
}
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000)
}
export function isoWeek(d: ISODate): number {
  const x = parse(d)
  const day = x.getUTCDay() || 7
  x.setUTCDate(x.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1))
  return Math.ceil(((x.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
export function startOfWeek(d: ISODate): ISODate {
  return addDays(d, 1 - weekday(d))
}
export function ym(d: ISODate): [number, number] {
  return [Number(d.slice(0, 4)), Number(d.slice(5, 7))]
}
export function inRange(d: ISODate, from: ISODate, to: ISODate) {
  return d >= from && d <= to
}

export const fmt = {
  monthYear: (y: number, m: number) => `${MONTHS[m - 1]} ${y}`,
  month: (m: number) => MONTHS[m - 1],
  monthShort: (m: number) => MONTHS_SHORT[m - 1],
  weekdayShort: (i: number) => WEEKDAYS_SHORT[i - 1],
  dayMonth: (d: ISODate) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`,
  date: (d: ISODate) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`,
  long: (d: ISODate) => {
    const x = parse(d)
    return `${WEEKDAYS[weekday(d) - 1]}, ${x.getUTCDate()}. ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`
  },
  medium: (d: ISODate) => {
    const x = parse(d)
    return `${WEEKDAYS_SHORT[weekday(d) - 1]}, ${x.getUTCDate()}. ${MONTHS[x.getUTCMonth()]}`
  },
  short: (d: ISODate) => {
    const x = parse(d)
    return `${WEEKDAYS_SHORT[weekday(d) - 1]} ${x.getUTCDate()}. ${MONTHS_SHORT[x.getUTCMonth()]}`
  },
  /** 'heute', 'morgen', 'in 3 Tagen', 'seit 2 Tagen' */
  relative: (d: ISODate, today: ISODate = TODAY) => {
    const n = diffDays(d, today)
    if (n === 0) return 'heute'
    if (n === 1) return 'morgen'
    if (n === -1) return 'gestern'
    if (n > 1) return `in ${n} Tagen`
    return `vor ${-n} Tagen`
  },
  refPeriod: (key?: string) => {
    if (!key) return ''
    if (/^\d{4}-Q\d$/.test(key)) return `${key.slice(5)} ${key.slice(0, 4)}`
    if (/^\d{4}-\d{2}$/.test(key)) return `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`
    return `Geschäftsjahr ${key}`
  },
  minutes: (min: number) => {
    if (min < 60) return `${min} Min.`
    const h = min / 60
    return `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} Std.`
  },
  hours: (min: number) => {
    const h = Math.round((min / 60) * 10) / 10
    return `${String(h).replace('.', ',')} h`
  },
}
