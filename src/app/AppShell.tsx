import AuthGate from '../features/auth/AuthGate'
import Workspace from './Workspace'

const AppShell = () => {
  return <AuthGate>{(userId) => <Workspace userId={userId} />}</AuthGate>
}

export default AppShell
