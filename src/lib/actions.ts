import type { Dispatch } from 'react'
import type { Action, State } from '../state/store'
import type { Task } from '../types'
import { TODAY, fmt } from './dates'
import { client, nextOccurrence } from './select'

/** Aufgabe erledigen: Status setzen, nächste Fälligkeit der Serie im Hinweis zeigen, Rückgängig anbieten. */
export function completeTask(s: State, d: Dispatch<Action>, t: Task) {
  d({ type: 'taskStatus', id: t.id, status: 'done', completedAt: TODAY })
  const next = nextOccurrence(s, t)
  const c = client(s, t.clientId)
  d({
    type: 'toast',
    toast: {
      text: `${c ? c.number + ' · ' : ''}${t.title} erledigt`,
      sub: next ? `Nächste Fälligkeit: ${fmt.long(next.dueDate)}` : undefined,
      undo: { type: 'taskStatus', id: t.id, status: 'open' },
    },
  })
}

export function reopenTask(d: Dispatch<Action>, t: Task) {
  d({ type: 'taskStatus', id: t.id, status: 'open' })
  d({ type: 'toast', toast: { text: `${t.title} wieder geöffnet` } })
}
