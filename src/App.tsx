import { useAuthStore } from '@/store/authStore'
import { LoginPage } from '@/pages/LoginPage'
import { AppPage } from '@/pages/AppPage'

export default function App() {
  const { session, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  return session ? <AppPage /> : <LoginPage />
}
