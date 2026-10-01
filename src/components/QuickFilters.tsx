import { Star } from 'lucide-react'
import { useStore } from '../state/store'
import { CURRENT_USER_ID, EMPLOYEES, TEAMS } from '../data/mock'
import type { ItemType } from '../types'
import { FilterSelect, cx } from './ui'

const TYPES: { value: ItemType; label: string }[] = [
  { value: 'tasks', label: 'Aufgaben & Prozesse' },
  { value: 'appointments', label: 'Termine' },
  { value: 'absences', label: 'Abwesenheiten' },
  { value: 'followups', label: 'Wiedervorlagen' },
]

export function ClientSelector() {
  const { s, d } = useStore()
  return (
    <FilterSelect
      id="f-client"
      label="Mandant"
      value={s.filters.clientId}
      placeholder="Alle Mandanten"
      onChange={(v) => d({ type: 'filters', patch: { clientId: v } })}
      options={s.clients.map((c) => ({
        value: c.id,
        label: `${c.number} · ${c.name}`,
        lead: <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />,
      }))}
    />
  )
}

export function TeamSelector() {
  const { s, d } = useStore()
  return (
    <FilterSelect
      id="f-team"
      label="Team"
      value={s.filters.teamId}
      placeholder="Alle Teams"
      onChange={(v) => d({ type: 'filters', patch: { teamId: v } })}
      options={TEAMS.map((t) => ({ value: t.id, label: t.name, hint: t.description }))}
    />
  )
}

function CategorySelector() {
  const { s, d } = useStore()
  return (
    <FilterSelect
      id="f-cat"
      label="Kategorie"
      value={s.filters.categoryId}
      placeholder="Alle Kategorien"
      onChange={(v) => d({ type: 'filters', patch: { categoryId: v } })}
      options={s.categories.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name, hint: `${s.groups.filter((g) => g.categoryId === c.id).length}` }))}
    />
  )
}

function EmployeeSelector() {
  const { s, d } = useStore()
  return (
    <FilterSelect
      id="f-emp"
      label="Mitarbeiter"
      value={s.filters.employeeId}
      placeholder="Alle Mitarbeiter"
      onChange={(v) => d({ type: 'filters', patch: { employeeId: v } })}
      options={EMPLOYEES.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}`, hint: e.id === CURRENT_USER_ID ? 'Ich' : undefined }))}
    />
  )
}

function TypeSelector() {
  const { s, d } = useStore()
  return (
    <FilterSelect
      id="f-type"
      label="Typ"
      value={s.filters.type === 'all' ? undefined : s.filters.type}
      placeholder="Alle Typen"
      onChange={(v) => d({ type: 'filters', patch: { type: (v as ItemType) ?? 'all' } })}
      options={TYPES}
    />
  )
}

export function QuickFilters() {
  const { s, d } = useStore()
  const f = s.filters
  const c = s.clients.find((x) => x.id === f.clientId)
  const noScope = !f.teamId && !f.employeeId && !f.categoryId && f.type === 'all'
  const views: { key: string; label: string; active: boolean; apply: () => void }[] = [
    { key: 'all', label: 'Alles', active: noScope, apply: () => d({ type: 'filters', patch: { teamId: undefined, employeeId: undefined, categoryId: undefined, type: 'all' } }) },
    ...(['t-fibu', 't-pers', 't-ctrl'] as const).map((id) => ({
      key: id,
      label: TEAMS.find((t) => t.id === id)!.name,
      active: f.teamId === id && !f.employeeId,
      apply: () => d({ type: 'filters', patch: { teamId: f.teamId === id ? undefined : id, employeeId: undefined } }),
    })),
    {
      key: 'mine',
      label: 'Meine Aufgaben',
      active: f.employeeId === CURRENT_USER_ID && !f.teamId,
      apply: () => d({ type: 'filters', patch: { employeeId: f.employeeId === CURRENT_USER_ID ? undefined : CURRENT_USER_ID, teamId: undefined } }),
    },
  ]
  const catViews = (['cat-mab', 'cat-beirat', 'cat-ber'] as const).map((id) => ({
    key: id,
    label: id === 'cat-ber' ? 'Reporting' : s.categories.find((c) => c.id === id)?.name ?? id,
    active: f.categoryId === id,
    apply: () => d({ type: 'filters', patch: { categoryId: f.categoryId === id ? undefined : id } }),
  }))
  const anyFilter = !!(f.clientId || f.teamId || f.employeeId || f.categoryId || f.type !== 'all')

  return (
    <section aria-label="Filter" className="space-y-3">
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-3 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <ClientSelector />
        <TeamSelector />
        <CategorySelector />
        <EmployeeSelector />
        <TypeSelector />
        <button
          type="button"
          onClick={() => d({ type: 'resetFilters' })}
          disabled={!anyFilter}
          className="h-9 justify-self-start whitespace-nowrap px-1 text-[13px] font-medium text-ink2 underline-offset-4 hover:text-ink hover:underline disabled:text-ink3 disabled:no-underline"
        >
          Filter zurücksetzen
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Schnellansichten">
        <span className="mr-1 inline-flex h-8 items-center gap-1.5 text-[13px] text-ink2">
          <Star size={14} aria-hidden="true" /> Ansichten
        </span>
        {c && (
          <button type="button" onClick={() => d({ type: 'drawer', drawer: { kind: 'client', id: c.id } })} title="Mandant öffnen" className="inline-flex h-8 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-semibold text-ink ring-1 ring-ink/25 hover:bg-well">
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.number} · {c.name}
          </button>
        )}
        {[...views, null, ...catViews].map((v, i) => v === null ? <span key={`sep${i}`} className="mx-1 h-5 w-px bg-line" aria-hidden="true" /> : (
          <button
            key={v.key}
            type="button"
            aria-pressed={v.active}
            onClick={v.apply}
            className={cx(
              'h-8 rounded-full px-3.5 text-[13px] transition-colors',
              v.active ? 'bg-brand font-semibold text-brandink' : 'bg-surface text-ink2 ring-1 ring-line hover:text-ink',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
    </section>
  )
}
