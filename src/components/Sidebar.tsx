import {
  BookOpenCheck, Building2, CalendarClock, CalendarDays, CircleHelp, FileText, Home, FolderTree, Layers,
  ListChecks, Plane, Receipt, ShieldCheck, SlidersHorizontal, StickyNote, UserRound, Users, UsersRound, X,
  type LucideIcon,
} from 'lucide-react'
import type { ViewId } from '../types'
import { useStore } from '../state/store'
import { CURRENT_USER_ID, WORKSPACE } from '../data/mock'
import { employee } from '../lib/select'
import { TODAY } from '../lib/dates'
import { Logo, cx } from './ui'

type Item = { id: ViewId; label: string; icon: LucideIcon; count?: number }

export function Sidebar() {
  const { s, d } = useStore()
  const me = employee(CURRENT_USER_ID)!
  const openMine = s.tasks.filter((t) => t.status === 'open' && t.dueDate <= TODAY && (t.assigneeId === CURRENT_USER_ID)).length
  const dueFollowUps = s.followups.filter((f) => !f.done && f.date <= TODAY).length

  const groups: { title: string; items: Item[]; admin?: boolean }[] = [
    {
      title: 'Arbeitsbereich',
      items: [
        { id: 'overview', label: 'Übersicht', icon: Home },
        { id: 'calendar', label: 'Kalender', icon: CalendarDays },
        { id: 'tasks', label: 'Aufgaben', icon: ListChecks, count: openMine || undefined },
        { id: 'appointments', label: 'Termine', icon: CalendarClock },
        { id: 'absences', label: 'Abwesenheiten', icon: Plane },
        { id: 'followups', label: 'Wiedervorlagen', icon: BookOpenCheck, count: dueFollowUps || undefined },
        { id: 'notes', label: 'Notizen', icon: StickyNote },
      ],
    },
    {
      title: 'Stammdaten',
      items: [
        { id: 'clients', label: 'Mandanten', icon: Building2, count: s.clients.length },
        { id: 'teams', label: 'Teams', icon: UsersRound },
        { id: 'employees', label: 'Mitarbeiter', icon: Users },
        { id: 'categories', label: 'Kategorien', icon: FolderTree },
        { id: 'groups', label: 'Aufgabengruppen', icon: Layers },
      ],
    },
    {
      title: 'Account',
      items: [
        { id: 'profile', label: 'Profil & Account', icon: UserRound },
        { id: 'help', label: 'Hilfe & Support', icon: CircleHelp },
      ],
    },
    {
      title: 'Administration',
      admin: true,
      items: [
        { id: 'users', label: 'Benutzer & Berechtigungen', icon: ShieldCheck },
        { id: 'rules', label: 'Regeln', icon: SlidersHorizontal },
        { id: 'billing', label: 'Vertrag & Abrechnung', icon: Receipt },
      ],
    },
  ]

  return (
    <>
      {s.navOpen && <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" onClick={() => d({ type: 'nav', open: false })} />}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col border-r border-hair bg-rail transition-transform lg:static lg:z-auto lg:translate-x-0',
          s.navOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-[72px] items-center justify-between px-5">
          <Logo />
          <button className="grid h-8 w-8 place-items-center rounded-lg text-ink2 hover:bg-well lg:hidden" aria-label="Navigation schließen" onClick={() => d({ type: 'nav', open: false })}>
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-3 scroll-thin" aria-label="Hauptnavigation">
          {groups.map((g) => (
            <div key={g.title} className={cx('pt-4', g.admin && 'mt-3 border-t border-line pt-5')}>
              <p className={cx('mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em]', g.admin ? 'text-ink2' : 'text-ink3')}>{g.title}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = s.view === it.id
                  const Icon = it.icon
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => d({ type: 'view', view: it.id })}
                        aria-current={active ? 'page' : undefined}
                        className={cx(
                          'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] transition-colors',
                          active ? 'bg-brandsoft font-semibold text-ink' : 'text-ink2 hover:bg-surface hover:text-ink',
                        )}
                      >
                        <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.count !== undefined && <span className={cx('min-w-[22px] rounded-md px-1.5 text-center text-xs tabular', active ? 'bg-surface/70' : 'bg-well text-ink2')}>{it.count}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line px-4 py-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white">{me.firstName[0]}{me.lastName[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{me.firstName} {me.lastName}</p>
              <p className="truncate text-xs text-ink3">{WORKSPACE.name}</p>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink3">
            <FileText size={12} aria-hidden="true" />
            DoYellow v1.1.1 · Vorschau mit Beispieldaten
          </p>
        </div>
      </aside>
    </>
  )
}
