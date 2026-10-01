import { StoreProvider, useStore } from './state/store'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { DrawerHost, ToastHost } from './components/Drawers'
import {
  AbsencesView, AppointmentsView, CalendarView, ClientsView, EmployeesView, FollowUpsView, InfoView, NotesView,
  OverviewView, TasksView, TeamsView, CategoriesView, GroupsView,
} from './views/Views'

function Main() {
  const { s } = useStore()
  switch (s.view) {
    case 'overview': return <OverviewView />
    case 'calendar': return <CalendarView />
    case 'tasks': return <TasksView />
    case 'appointments': return <AppointmentsView />
    case 'absences': return <AbsencesView />
    case 'followups': return <FollowUpsView />
    case 'notes': return <NotesView />
    case 'clients': return <ClientsView />
    case 'teams': return <TeamsView />
    case 'employees': return <EmployeesView />
    case 'categories': return <CategoriesView />
    case 'groups': return <GroupsView />
    default: return <InfoView id={s.view} />
  }
}

export default function App() {
  return (
    <StoreProvider>
      <div className="flex h-full bg-canvas text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-w-0 flex-1 overflow-y-auto scroll-thin" id="main">
            <Main />
          </main>
        </div>
      </div>
      <DrawerHost />
      <ToastHost />
    </StoreProvider>
  )
}
