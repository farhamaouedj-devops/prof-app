import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'
import { toast, formatDate } from '../../lib/utils'
import { Users, PlusCircle, BookOpen, LogOut, Bell, Copy, CheckCheck, ChevronRight } from 'lucide-react'
import CreateExercise from './CreateExercise'
import ExerciseCorrection from './ExerciseCorrection'

export default function TeacherDashboard() {
  const { profile, notifications, markNotificationsRead, signOut, refreshProfile } = useAuth()
  const [tab, setTab] = useState('exercises')
  const [students, setStudents] = useState([])
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)

  const load = async () => {
    const [{ data: sts }, { data: exs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('teacher_id', profile.id).eq('role', 'student').order('full_name'),
      supabase.from('exercises').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false })
    ])
    setStudents(sts || [])
    setExercises(exs || [])
  }

  useEffect(() => { load() }, [])

  // Refresh profile to get teacher_code if missing
  useEffect(() => {
    if (!profile.teacher_code) refreshProfile()
  }, [])

  const copyCode = () => {
    if (!profile.teacher_code) return toast('Code non disponible', 'error')
    navigator.clipboard.writeText(profile.teacher_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
    toast('Code copié !', 'success')
  }

  const deleteExercise = async (id) => {
    if (!confirm('Supprimer cet exercice ?')) return
    await supabase.from('exercises').delete().eq('id', id)
    toast('Exercice supprimé', 'info')
    load()
  }

  const navItems = [
    { key: 'exercises', icon: BookOpen, label: 'Exercices', count: exercises.length },
    { key: 'students', icon: Users, label: 'Mes élèves', count: students.length },
  ]

  if (selectedExercise) {
    return <ExerciseCorrection exercise={selectedExercise} students={students} onBack={() => { setSelectedExercise(null); load() }} />
  }
  if (showCreate) {
    return <CreateExercise students={students} teacherId={profile.id} onBack={() => { setShowCreate(false); load() }} />
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FDFBF5' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white p-4 sticky top-0 h-screen" style={{ borderRight: '1px solid #FDEFC7' }}>
        <div className="flex items-center gap-3 px-2 mb-6 mt-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: '#EBF5F0' }}>👩‍🏫</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ color: '#1C1F33', fontSize: 14 }}>{profile.full_name}</p>
            <p style={{ fontSize: 12, color: 'rgba(28,31,51,0.4)' }}>Professeure</p>
          </div>
        </div>

        {/* Teacher code — très visible */}
        <div className="rounded-xl p-3 mb-5" style={{ backgroundColor: '#FFF8E7', border: '1px solid #FDEFC7' }}>
          <p style={{ fontSize: 11, color: '#A86A10', fontWeight: 600, marginBottom: 6 }}>🔑 Code à donner à tes élèves</p>
          {profile.teacher_code ? (
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 22, color: '#A86A10', letterSpacing: '0.15em' }}>
                {profile.teacher_code}
              </span>
              <button onClick={copyCode} className="ml-auto" style={{ color: '#F4A924' }}>
                {codeCopied ? <CheckCheck size={16} /> : <Copy size={16} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 13, color: 'rgba(28,31,51,0.4)', fontStyle: 'italic' }}>Génération…</span>
              <button onClick={refreshProfile} style={{ fontSize: 11, color: '#F4A924' }}>Rafraîchir</button>
            </div>
          )}
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map(({ key, icon: Icon, label, count }) => (
            <button key={key} onClick={() => setTab(key)} className={`sidebar-item w-full ${tab === key ? 'active' : ''}`}>
              <Icon size={18} />
              <span className="flex-1 text-left text-sm">{label}</span>
              {count > 0 && (
                <span style={{ fontSize: 12, backgroundColor: '#FFF8E7', color: '#A86A10', fontWeight: 500, padding: '1px 8px', borderRadius: 999 }}>{count}</span>
              )}
            </button>
          ))}
        </nav>

        <button onClick={signOut} className="sidebar-item w-full mt-2" style={{ color: '#E85D75' }}>
          <LogOut size={16} />
          <span className="text-sm">Déconnexion</span>
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="bg-white px-4 md:px-8 py-4 sticky top-0 z-10 flex items-center justify-between" style={{ borderBottom: '1px solid #FDEFC7' }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, color: '#1C1F33', fontSize: 20 }}>
              {tab === 'exercises' ? 'Mes Exercices' : 'Mes Élèves'}
            </h2>
            <p className="text-xs hidden md:block" style={{ color: 'rgba(28,31,51,0.4)' }}>
              {tab === 'exercises' ? `${exercises.length} exercice(s)` : `${students.length} élève(s)`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Code visible aussi dans le header sur mobile */}
            {profile.teacher_code && (
              <button onClick={copyCode} className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: '#FFF8E7', border: '1px solid #FDEFC7' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#A86A10' }}>{profile.teacher_code}</span>
                {codeCopied ? <CheckCheck size={13} style={{ color: '#2A7A5B' }} /> : <Copy size={13} style={{ color: '#F4A924' }} />}
              </button>
            )}

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markNotificationsRead() }}
                className="relative p-2 rounded-xl" style={{ ':hover': { backgroundColor: '#FFF8E7' } }}>
                <Bell size={20} style={{ color: 'rgba(28,31,51,0.6)' }} />
                {notifications.length > 0 && (
                  <span className="badge absolute -top-1 -right-1">{notifications.length}</span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl z-20 overflow-hidden" style={{ border: '1px solid #FDEFC7' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #FFF8E7' }}>
                    <p className="font-semibold text-sm" style={{ color: '#1C1F33' }}>Notifications</p>
                  </div>
                  {notifications.length === 0
                    ? <p className="text-center text-sm py-6" style={{ color: 'rgba(28,31,51,0.4)' }}>Aucune notification</p>
                    : <div className="divide-y max-h-72 overflow-y-auto" style={{ '--tw-divide-opacity': 1 }}>
                        {notifications.map(n => (
                          <div key={n.id} className="px-4 py-3">
                            <p className="text-sm" style={{ color: '#1C1F33' }}>{n.message}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(28,31,51,0.4)' }}>{formatDate(n.created_at)}</p>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>

            {tab === 'exercises' && (
              <button onClick={() => setShowCreate(true)} className="btn-teacher flex items-center gap-2 text-sm">
                <PlusCircle size={16} />
                <span className="hidden sm:inline">Nouvel exercice</span>
                <span className="sm:hidden">+</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-4 md:p-8">
          {tab === 'exercises' && (
            <div className="animate-fade-in">
              {exercises.length === 0 ? (
                <div className="card text-center py-16">
                  <div className="text-5xl mb-4">📝</div>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, color: '#1C1F33', marginBottom: 8 }}>Aucun exercice</h3>
                  <p style={{ color: 'rgba(28,31,51,0.5)', marginBottom: 24 }}>Crée ton premier exercice pour tes élèves</p>
                  <button onClick={() => setShowCreate(true)} className="btn-teacher">Créer un exercice</button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {exercises.map(ex => (
                    <div key={ex.id} className="card hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedExercise(ex)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: '#FFF8E7' }}>📋</div>
                        <span style={{ fontSize: 12, color: 'rgba(28,31,51,0.4)' }}>{formatDate(ex.created_at)}</span>
                      </div>
                      <h3 className="font-semibold mb-1 line-clamp-2" style={{ color: '#1C1F33' }}>{ex.title}</h3>
                      {ex.description && <p className="text-sm line-clamp-2 mb-3" style={{ color: 'rgba(28,31,51,0.5)' }}>{ex.description}</p>}
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #FFF8E7' }}>
                        <button onClick={e => { e.stopPropagation(); deleteExercise(ex.id) }}
                          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#E85D75' }}>
                          Supprimer
                        </button>
                        <ChevronRight size={16} style={{ color: '#F4C55A' }} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'students' && (
            <div className="animate-fade-in">
              {students.length === 0 ? (
                <div className="card text-center py-16">
                  <div className="text-5xl mb-4">🎓</div>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, color: '#1C1F33', marginBottom: 8 }}>Aucun élève</h3>
                  <p style={{ color: 'rgba(28,31,51,0.5)', marginBottom: 16 }}>Tes élèves doivent entrer ce code à l'inscription :</p>
                  {profile.teacher_code && (
                    <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl" style={{ backgroundColor: '#FFF8E7', border: '1px solid #FDEFC7' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 24, color: '#A86A10', letterSpacing: '0.15em' }}>{profile.teacher_code}</span>
                      <button onClick={copyCode} style={{ color: '#F4A924' }}>
                        {codeCopied ? <CheckCheck size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {students.map(st => (
                    <div key={st.id} className="card">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                          style={{ backgroundColor: '#EBF3FB', color: '#2B65A8' }}>
                          {st.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" style={{ color: '#1C1F33' }}>{st.full_name}</p>
                          <p className="text-xs truncate" style={{ color: 'rgba(28,31,51,0.4)' }}>{st.email}</p>
                        </div>
                        {st.is_validated
                          ? <span style={{ fontSize: 11, color: '#1F5C44', backgroundColor: '#EBF5F0', border: '1px solid #C8E6D8', padding: '2px 8px', borderRadius: 999 }}>Actif</span>
                          : <span style={{ fontSize: 11, color: '#A86A10', backgroundColor: '#FFF8E7', border: '1px solid #FDEFC7', padding: '2px 8px', borderRadius: 999 }}>En attente</span>
                        }
                      </div>
                      <p className="text-xs mt-3" style={{ color: 'rgba(28,31,51,0.3)' }}>Inscrit le {formatDate(st.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white flex" style={{ borderTop: '1px solid #FDEFC7' }}>
          {navItems.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)} className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
              style={{ color: tab === key ? '#F4A924' : 'rgba(28,31,51,0.4)' }}>
              <Icon size={20} />{label}
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
