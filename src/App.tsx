import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import TournamentsList from './pages/TournamentsList'
import TournamentDetail from './pages/TournamentDetail'
import GlobalLeaderboard from './pages/GlobalLeaderboard'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<TournamentsList />} />
              <Route path="/torneos/:id" element={<TournamentDetail />} />
              <Route path="/lideres" element={<GlobalLeaderboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
