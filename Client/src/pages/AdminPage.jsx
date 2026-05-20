import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import AdminDashboard from '@/pages/admin/AdminDashboard.jsx'
import HomeNav from '@/pages/home/HomeNav.jsx'
import './admin.css'
import './home.css'

/** 어드민 전용 — `user_type === 'admin'`이 아니면 홈으로 */
export default function AdminPage() {
  const navigate = useNavigate()
  const { isAdmin, isInitializing } = useAuthProfile()

  useEffect(() => {
    if (isInitializing) return
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, isInitializing, navigate])

  if (!isInitializing && !isAdmin) return null

  return (
    <div className="admin-page">
      <HomeNav />

      <main className="admin-page__main">
        {isInitializing ? (
          <p className="admin-page__checking" role="status">
            권한 확인 중…
          </p>
        ) : (
          <AdminDashboard />
        )}
      </main>
    </div>
  )
}
