import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../state/store'
import { employee } from '../lib/select'
import { Avatar } from './ui'

export function Head({ children, eyebrow }: { children: ReactNode; eyebrow?: ReactNode }) {
  const { d } = useStore()
  return (
    <div className="flex items-start gap-3 border-b border-hair px-6 pb-4 pt-5">
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
        {children}
      </div>
      <button type="button" aria-label="Schließen" onClick={() => d({ type: 'drawer', drawer: null })} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink2 hover:bg-well hover:text-ink"><X size={18} /></button>
    </div>
  )
}

export function Dl({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[132px_minmax(0,1fr)] gap-x-4 gap-y-3 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink2">{k}</dt>
          <dd className="min-w-0">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Person({ id }: { id?: string }) {
  const e = employee(id)
  if (!e) return <span className="text-ink3">–</span>
  return <span className="inline-flex items-center gap-2"><Avatar id={id} size={22} />{e.firstName} {e.lastName}</span>
}

