import { Route, Routes } from 'react-router-dom'
import AppShell from './app/AppShell'
import ShareView from './app/ShareView'

const App = () => {
  return (
    <Routes>
      <Route path="/share/:token" element={<ShareView />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  )
}

export default App
