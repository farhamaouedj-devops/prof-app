import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { setToastHandler } from './lib/utils'
import AuthPage from './components/auth/AuthPage'
import AdminDashboard from './components/admin/AdminDashboard'
import TeacherDashboard from './components/teacher/TeacherDashboard'
import StudentDashboard from './components/student/StudentDashboard'
import Toast from './components/shared/Toast'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDFBF5' }}>
      <div className="text-center">
        <div className="text-5xl mb-4">📚</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: '#1C1F33' }}>EduProf</h1>
        <div className="mt-4 flex gap-1.5 justify-center">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: '#F4C55A', animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onSignOut }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FDFBF5' }}>
      <div className="card max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: '#1C1F33', marginBottom: 8 }}>
          Problème de connexion
        </h2>
        <p style={{ color: 'rgba(28,31,51,0.6)', marginBottom: 8, fontSize: 14 }}>{message}</p>
        <p style={{ color: 'rgba(28,31,51,0.4)', marginBottom: 24, fontSize: 12 }}>
          Déconnecte-toi, supprime ton compte dans Supabase → Authentication → Users, puis réinscris-toi.
        </p>
        <button onClick={onSignOut} className="btn-secondary w-full">Se déconnecter</button>
      </div>
    </div>
  )
}

function PendingValidation({ onSignOut }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FDFBF5' }}>
      <div className="card max-w-md w-full text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: '#1C1F33', marginBottom: 8 }}>
          Compte en attente
        </h2>
        <p style={{ color: 'rgba(28,31,51,0.6)', marginBottom: 24, fontSize: 14 }}>
          Ton compte a bien été créé. L'administratrice doit valider ton accès. Tu seras notifié(e) par email.
        </p>
        <button onClick={onSignOut} className="btn-secondary w-full">Se déconnecter</button>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    setToastHandler((msg, type) => {
      setToast({ msg, type, id: Date.now() })
      setTimeout(() => setToast(null), 3500)
    })
  }, [])

  const loadProfile = async (uid) => {
    setProfileError(null)
    for (let i = 0; i < 3; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single()
        if (data) { setProfile(data); return data }
        if (error) {
          console.error(`Profile attempt ${i+1}:`, error.message, error.code)
          if (error.code === 'PGRST116') {
            setProfileError('Profil introuvable. Réinscris-toi.')
            return null
          }
        }
      } catch (e) { console.error(e) }
      if (i < 2) await new Promise(r => setTimeout(r, 1500))
    }
    setProfileError('Erreur serveur (500). Vérifie les policies RLS dans Supabase.')
    return null
  }

  const loadNotifications = async (uid) => {
    try {
      const { data } = await supabase.from('notifications')
        .select('*').eq('user_id', uid).eq('is_read', false)
      setNotifications(data || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadProfile(u.id).then(() => loadNotifications(u.id)).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadProfile(u.id).then(() => loadNotifications(u.id))
      } else {
        setProfile(null); setProfileError(null); setNotifications([])
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev => [payload.new, ...prev])
      ).subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setProfileError(null)
  }

  const markNotificationsRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications([])
  }

  const refreshProfile = () => user && loadProfile(user.id)

  if (loading) return <LoadingScreen />

  const ctx = { user, profile, notifications, refreshProfile, markNotificationsRead, signOut, loadNotifications: () => user && loadNotifications(user.id) }

  return (
    <AuthContext.Provider value={ctx}>
      {toast && <Toast message={toast.msg} type={toast.type} />}
      <Routes>
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />
        <Route path="/*" element={
          !user ? <Navigate to="/auth" replace />
          : profileError ? <ErrorScreen message={profileError} onSignOut={signOut} />
          : !profile ? <LoadingScreen />
          : false // validation désactivée pour les élèves ? <PendingValidation onSignOut={signOut} />
          : profile.role === 'admin' ? <AdminDashboard />
          : profile.role === 'teacher' ? <TeacherDashboard />
          : <StudentDashboard />
        } />
      </Routes>
    </AuthContext.Provider>
  )
}
