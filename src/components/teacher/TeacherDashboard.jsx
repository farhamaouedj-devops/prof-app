import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'
import { toast, formatDate } from '../../lib/utils'
import { Users, PlusCircle, BookOpen, LogOut, Bell, Copy, CheckCheck, ChevronRight, MessageCircle } from 'lucide-react'
import CreateExercise from './CreateExercise'
import ExerciseCorrection from './ExerciseCorrection'

export default function TeacherDashboard() {
  const { profile, notifications, markNotificationsRead, signOut } = useAuth()
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
      supabase.from('exercises').select(`*, exercise_assignments(count)`).eq('teacher_id', profile.id).order('created_at', { ascending: false })
    ])
    setStudents(sts || [])
    setExercises(exs || [])
  }

  useEffect(() => { load() }, [])

  const copyCode = () => {
    navigator.clipboard.writeText(profile.teacher_code || '')
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
    <div className="min-h-screen bg-ivory flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-amber-100 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 mb-6 mt-2">
          <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center text-xl">👩‍🏫</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-sm truncate">{profile.full_name}</p>
            <p className="text-xs text-navy/40">Professeure</p>
          </div>
        </div>

        {/* Teacher code */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
          <p className="text-xs text-amber-700 font-medium mb-1.5">🔑 Ton code élève</p>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg text-amber-800 tracking-widest">{profile.teacher_code}</span>
            <button onClick={copyCode} className="ml-auto text-amber-500 hover:text-amber-700 transition-colors">
              {codeCopied ? <CheckCheck size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map(({ key, icon: Icon, label, count }) => (
            <button key={key} onClick={() => setTab(key)} className={`sidebar-item w-full ${tab === key ? 'active' : ''}`}>
              <Icon size={18} />
              <span className="flex-1 text-left text-sm">{label}</span>
              {count > 0 && <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">{count}</span>}
            </button>
          ))}
        </nav>

        <button onClick={signOut} className="sidebar-item w-full text-rose-400 hover:text-rose-500 hover:bg-rose-50 mt-2">
          <LogOut size={16} />
          <span className="text-sm">Déconnexion</span>
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-amber-100 px-4 md:px-8 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-navy text-xl">
              {tab === 'exercises' ? 'Mes Exercices' : 'Mes Élèves'}
            </h2>
            <p className="text-xs text-navy/40 hidden md:block">
              {tab === 'exercises' ? `${exercises.length} exercice(s) créé(s)` : `${students.length} élève(s) inscrit(s)`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifications bell */}
            <div className="relative">
              <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markNotificationsRead() }}
                className="relative p-2 rounded-xl hover:bg-amber-50 transition-colors">
                <Bell size={20} className="text-navy/60" />
                {notifications.length > 0 && (
                  <span className="badge absolute -top-1 -right-1 text-xs">{notifications.length}</span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-12 w-72 bg-white border border-amber-100 rounded-2xl shadow-xl z-20 overflow-hidden animate-slide-up">
                  <div className="px-4 py-3 border-b border-amber-50">
                    <p className="font-semibold text-navy text-sm">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-center text-navy/40 text-sm py-6">Aucune notification</p>
                  ) : (
                    <div className="divide-y divide-amber-50 max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className="px-4 py-3 hover:bg-ivory transition-colors">
                          <p className="text-sm text-navy">{n.message}</p>
                          <p className="text-xs text-navy/40 mt-0.5">{formatDate(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
          {/* EXERCISES TAB */}
          {tab === 'exercises' && (
            <div className="space-y-4 animate-fade-in">
              {exercises.length === 0 ? (
                <div className="card text-center py-16">
                  <div className="text-5xl mb-4">📝</div>
                  <h3 className="font-display text-xl font-bold text-navy mb-2">Aucun exercice</h3>
                  <p className="text-navy/50 mb-6">Crée ton premier exercice pour tes élèves</p>
                  <button onClick={() => setShowCreate(true)} className="btn-teacher">Créer un exercice</button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {exercises.map(ex => (
                    <ExerciseCard key={ex.id} exercise={ex} onCorrect={() => setSelectedExercise(ex)} onDelete={() => deleteExercise(ex.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STUDENTS TAB */}
          {tab === 'students' && (
            <div className="animate-fade-in space-y-4">
              {students.length === 0 ? (
                <div className="card text-center py-16">
                  <div className="text-5xl mb-4">🎓</div>
                  <h3 className="font-display text-xl font-bold text-navy mb-2">Aucun élève</h3>
                  <p className="text-navy/50 mb-4">Tes élèves doivent entrer ton code pour s'inscrire</p>
                  <div className="inline-flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                    <span className="text-sm text-amber-700">Ton code :</span>
                    <span className="font-mono font-bold text-xl text-amber-800 tracking-widest">{profile.teacher_code}</span>
                    <button onClick={copyCode} className="text-amber-500 hover:text-amber-700">
                      {codeCopied ? <CheckCheck size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {students.map(st => <StudentCard key={st.id} student={st} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-amber-100 flex">
          {navItems.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${tab === key ? 'text-amber-600' : 'text-navy/40'}`}>
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

function ExerciseCard({ exercise, onCorrect, onDelete }) {
  const count = exercise.exercise_assignments?.[0]?.count || 0
  return (
    <div className="card hover:shadow-md transition-all duration-200 animate-slide-up cursor-pointer group" onClick={onCorrect}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📋</div>
        <span className="text-xs text-navy/40">{formatDate(exercise.created_at)}</span>
      </div>
      <h3 className="font-semibold text-navy mb-1 line-clamp-2">{exercise.title}</h3>
      {exercise.description && (
        <p className="text-sm text-navy/50 line-clamp-2 mb-3">{exercise.description}</p>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-amber-50">
        <span className="text-xs text-navy/40">
          {count} élève{count !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-xs text-rose-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
            Supprimer
          </button>
          <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  )
}

function StudentCard({ student }) {
  return (
    <div className="card animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-ocean-100 rounded-full flex items-center justify-center text-lg font-bold text-ocean-600 flex-shrink-0">
          {student.full_name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy truncate">{student.full_name}</p>
          <p className="text-xs text-navy/40 truncate">{student.email}</p>
        </div>
        {student.is_validated
          ? <span className="text-xs text-forest-600 bg-forest-50 border border-forest-100 px-2 py-0.5 rounded-full whitespace-nowrap">Actif</span>
          : <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">En attente</span>
        }
      </div>
      <p className="text-xs text-navy/30 mt-3">Inscrit le {formatDate(student.created_at)}</p>
    </div>
  )
}
