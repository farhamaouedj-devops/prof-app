import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'
import { formatDate, timeAgo } from '../../lib/utils'
import { Bell, LogOut, BookOpen } from 'lucide-react'
import ExerciseWorkspace from './ExerciseWorkspace'

export default function StudentDashboard() {
  const { profile, notifications, markNotificationsRead, signOut } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showNotifs, setShowNotifs] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('exercise_assignments')
      .select(`*, exercises(*), submissions(*)`)
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
    setAssignments(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.status === filter)
  const counts = {
    all: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    submitted: assignments.filter(a => a.status === 'submitted').length,
    corrected: assignments.filter(a => a.status === 'corrected').length
  }

  if (selectedAssignment) {
    return <ExerciseWorkspace assignment={selectedAssignment} onBack={() => { setSelectedAssignment(null); load() }} />
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 px-4 md:px-8 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ocean-100 rounded-full flex items-center justify-center font-bold text-ocean-600 text-lg">
              {profile.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-display font-bold text-navy text-lg leading-none">{profile.full_name}</h1>
              <p className="text-xs text-navy/40">Mon espace élève</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markNotificationsRead() }}
                className="relative p-2.5 rounded-xl hover:bg-amber-50 transition-colors">
                <Bell size={20} className="text-navy/60" />
                {notifications.length > 0 && (
                  <span className="badge absolute -top-1 -right-1">{notifications.length}</span>
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
                        <div key={n.id} className="px-4 py-3 hover:bg-ivory">
                          <p className="text-sm text-navy">{n.message}</p>
                          <p className="text-xs text-navy/40 mt-0.5">{timeAgo(n.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={signOut} className="p-2.5 rounded-xl hover:bg-rose-50 text-navy/40 hover:text-rose-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'À faire', count: counts.pending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Rendus', count: counts.submitted, color: 'text-ocean-600', bg: 'bg-ocean-50 border-ocean-200' },
            { label: 'Corrigés', count: counts.corrected, color: 'text-forest-600', bg: 'bg-forest-50 border-forest-200' }
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`card border ${bg} text-center py-4`}>
              <div className={`text-3xl font-display font-bold ${color}`}>{count}</div>
              <p className="text-xs text-navy/50 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white border border-amber-100 rounded-xl p-1 w-fit mb-6">
          {[['all', 'Tous'], ['pending', 'À faire'], ['submitted', 'Rendus'], ['corrected', 'Corrigés']].map(([f, l]) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-ocean-500 text-white shadow-sm' : 'text-navy/50 hover:text-navy'}`}>
              {l} {counts[f] > 0 && <span className="ml-1 opacity-70">({counts[f]})</span>}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        {loading ? (
          <div className="text-center py-16 text-navy/40">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="font-display text-xl font-bold text-navy mb-2">
              {filter === 'all' ? 'Aucun devoir' : `Aucun devoir "${['À faire', 'Rendu', 'Corrigé'][['pending', 'submitted', 'corrected'].indexOf(filter)]}"`}
            </h3>
            <p className="text-navy/50">Ta prof n'a pas encore envoyé d'exercices</p>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {filtered.map(a => (
              <AssignmentCard key={a.id} assignment={a} onClick={() => setSelectedAssignment(a)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AssignmentCard({ assignment, onClick }) {
  const ex = assignment.exercises
  const sub = assignment.submissions?.[0]
  const isNew = assignment.status === 'pending' && !sub?.text_response
  const isCorrected = assignment.status === 'corrected'

  const statusConfig = {
    pending: { label: '⏳ À faire', class: 'status-pending' },
    submitted: { label: '📬 Rendu', class: 'status-submitted' },
    corrected: { label: '✅ Corrigé', class: 'status-corrected' }
  }
  const sc = statusConfig[assignment.status]

  return (
    <button onClick={onClick} className={`card w-full text-left hover:shadow-md transition-all duration-200 group ${isCorrected ? 'border-forest-200' : isNew ? 'border-amber-300' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isCorrected ? 'bg-forest-100' : isNew ? 'bg-amber-100' : 'bg-ocean-50'}`}>
          {isCorrected ? '✅' : isNew ? '📋' : '📝'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-navy group-hover:text-amber-700 transition-colors">{ex?.title}</h3>
            <span className={`flex-shrink-0 text-xs ${sc.class} px-2 py-0.5 rounded-full`}>{sc.label}</span>
          </div>
          {ex?.description && (
            <p className="text-sm text-navy/50 mt-1 line-clamp-2">{ex.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            {ex?.deadline && (
              <span className="text-xs text-navy/40">📅 Avant le {formatDate(ex.deadline)}</span>
            )}
            {sub?.last_saved_at && sub?.text_response && (
              <span className="text-xs text-navy/30">Sauvegardé {timeAgo(sub.last_saved_at)}</span>
            )}
            {isCorrected && sub?.corrected_at && (
              <span className="text-xs text-forest-600 font-medium">Corrigé {timeAgo(sub.corrected_at)}</span>
            )}
          </div>
        </div>
        {isNew && <div className="w-2.5 h-2.5 bg-rose-500 rounded-full flex-shrink-0 mt-1 animate-pulse-soft" />}
      </div>
    </button>
  )
}
