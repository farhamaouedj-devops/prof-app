import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'
import { formatDate, toast } from '../../lib/utils'
import { CheckCircle, XCircle, Users, Shield, LogOut, RefreshCw, Clock } from 'lucide-react'

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const [pending, setPending] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    const users = data || []
    setPending(users.filter(u => !u.is_validated && u.role !== 'admin'))
    setAllUsers(users.filter(u => u.role !== 'admin'))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const validate = async (uid, approved) => {
    setProcessing(uid)
    await supabase.from('profiles').update({ is_validated: approved }).eq('id', uid)
    if (approved) {
      // Notify user
      await supabase.from('notifications').insert({
        user_id: uid,
        type: 'account_validated',
        message: 'Ton compte a été validé ! Tu peux maintenant accéder à l\'application.'
      })
    }
    toast(approved ? 'Compte validé ✓' : 'Compte refusé', approved ? 'success' : 'warning')
    setProcessing(null)
    load()
  }

  const deleteUser = async (uid) => {
    if (!confirm('Supprimer définitivement ce compte ?')) return
    await supabase.from('profiles').delete().eq('id', uid)
    toast('Compte supprimé', 'info')
    load()
  }

  const roleLabel = { teacher: 'Professeur', student: 'Élève', admin: 'Admin' }
  const roleBadge = {
    teacher: 'bg-forest-50 text-forest-600 border border-forest-100',
    student: 'bg-ocean-50 text-ocean-600 border border-ocean-100',
    admin: 'bg-amber-50 text-amber-700 border border-amber-200'
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="font-display font-bold text-navy text-lg leading-none">Administration</h1>
              <p className="text-xs text-navy/40">EduProf</p>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-2 text-sm text-navy/50 hover:text-navy transition-colors">
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'En attente', value: pending.length, icon: Clock, color: 'amber' },
            { label: 'Total utilisateurs', value: allUsers.length, icon: Users, color: 'navy' },
            { label: 'Professeurs', value: allUsers.filter(u => u.role === 'teacher').length, icon: Shield, color: 'forest' },
            { label: 'Élèves', value: allUsers.filter(u => u.role === 'student').length, icon: Users, color: 'ocean' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card text-center">
              <div className={`text-3xl font-display font-bold ${color === 'amber' ? 'text-amber-500' : color === 'forest' ? 'text-forest-500' : color === 'ocean' ? 'text-ocean-500' : 'text-navy'}`}>
                {value}
              </div>
              <p className="text-xs text-navy/50 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-amber-100 rounded-xl p-1 w-fit">
          {[['pending', `En attente (${pending.length})`], ['all', 'Tous les comptes']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-amber-500 text-white shadow-sm' : 'text-navy/50 hover:text-navy'}`}>
              {l}
            </button>
          ))}
          <button onClick={load} className="ml-1 p-2 text-navy/40 hover:text-navy transition-colors rounded-lg hover:bg-amber-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-navy/40">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              Chargement…
            </div>
          ) : (tab === 'pending' ? pending : allUsers).length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-navy/50">{tab === 'pending' ? 'Aucun compte en attente' : 'Aucun utilisateur'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-50">
                  {['Nom', 'Email', 'Rôle', 'Inscrit le', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-navy/40 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {(tab === 'pending' ? pending : allUsers).map(u => (
                  <tr key={u.id} className="hover:bg-ivory transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-navy text-sm">{u.full_name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-navy/60">{u.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleBadge[u.role] || ''}`}>
                        {roleLabel[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-navy/50">{formatDate(u.created_at)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.is_validated
                        ? <span className="text-xs font-medium text-forest-600 bg-forest-50 border border-forest-100 px-2.5 py-1 rounded-full">✓ Validé</span>
                        : <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">⏳ En attente</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {!u.is_validated && (
                          <button onClick={() => validate(u.id, true)} disabled={processing === u.id}
                            className="text-forest-600 hover:text-forest-700 transition-colors" title="Valider">
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {u.is_validated && (
                          <button onClick={() => validate(u.id, false)} disabled={processing === u.id}
                            className="text-amber-500 hover:text-amber-600 transition-colors" title="Révoquer">
                            <XCircle size={18} />
                          </button>
                        )}
                        <button onClick={() => deleteUser(u.id)} className="text-rose-400 hover:text-rose-500 transition-colors" title="Supprimer">
                          <XCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
