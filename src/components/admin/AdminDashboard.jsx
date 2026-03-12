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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading profiles:', error)
      toast('Erreur chargement : ' + error.message, 'error')
      setLoading(false)
      return
    }

    const users = data || []
    setPending(users.filter(u => !u.is_validated && u.role !== 'admin'))
    setAllUsers(users.filter(u => u.role !== 'admin'))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const validate = async (uid, approved) => {
    setProcessing(uid)
    const { error } = await supabase.from('profiles').update({ is_validated: approved }).eq('id', uid)
    if (error) { toast('Erreur : ' + error.message, 'error'); setProcessing(null); return }
    if (approved) {
      await supabase.from('notifications').insert({
        user_id: uid,
        type: 'account_validated',
        message: 'Ton compte a été validé ! Tu peux maintenant accéder à l\'application.'
      })
    }
    toast(approved ? 'Compte validé ✓' : 'Compte révoqué', approved ? 'success' : 'warning')
    setProcessing(null)
    load()
  }

  const deleteUser = async (uid) => {
    if (!confirm('Supprimer définitivement ce compte ?')) return
    await supabase.from('profiles').delete().eq('id', uid)
    toast('Compte supprimé', 'info')
    load()
  }

  const roleBadgeStyle = {
    teacher: { backgroundColor: '#EBF5F0', color: '#1F5C44', border: '1px solid #C8E6D8' },
    student: { backgroundColor: '#EBF3FB', color: '#1E4D85', border: '1px solid #C7DFF5' },
    admin:   { backgroundColor: '#FFF8E7', color: '#A86A10', border: '1px solid #FDEFC7' }
  }
  const roleLabel = { teacher: 'Professeur', student: 'Élève', admin: 'Admin' }

  const displayed = tab === 'pending' ? pending : allUsers

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDFBF5' }}>
      <header className="bg-white px-6 py-4 sticky top-0 z-10" style={{ borderBottom: '1px solid #FDEFC7' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFF8E7' }}>
              <Shield size={18} style={{ color: '#F4A924' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, color: '#1C1F33', fontSize: 18 }}>Administration</h1>
              <p style={{ fontSize: 12, color: 'rgba(28,31,51,0.4)' }}>EduProf</p>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(28,31,51,0.5)' }}>
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'En attente', value: pending.length, color: '#F4A924' },
            { label: 'Total', value: allUsers.length, color: '#1C1F33' },
            { label: 'Professeurs', value: allUsers.filter(u => u.role === 'teacher').length, color: '#2A7A5B' },
            { label: 'Élèves', value: allUsers.filter(u => u.role === 'student').length, color: '#2B65A8' }
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <div style={{ fontSize: 32, fontFamily: 'Playfair Display, serif', fontWeight: 700, color }}>{value}</div>
              <p style={{ fontSize: 12, color: 'rgba(28,31,51,0.5)', marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 w-fit rounded-xl" style={{ backgroundColor: 'white', border: '1px solid #FDEFC7' }}>
          {[['pending', `En attente (${pending.length})`], ['all', 'Tous les comptes']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: tab === t ? '#F4A924' : 'transparent', color: tab === t ? 'white' : 'rgba(28,31,51,0.5)' }}>
              {l}
            </button>
          ))}
          <button onClick={load} className="p-2 rounded-lg ml-1" style={{ color: 'rgba(28,31,51,0.4)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center" style={{ color: 'rgba(28,31,51,0.4)' }}>
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />Chargement…
            </div>
          ) : displayed.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p style={{ color: 'rgba(28,31,51,0.5)' }}>{tab === 'pending' ? 'Aucun compte en attente' : 'Aucun utilisateur'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #FFF8E7' }}>
                    {['Nom', 'Email', 'Rôle', 'Code Prof', 'Inscrit le', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(28,31,51,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #FFF8E7' }}>
                      <td className="px-5 py-3.5">
                        <span style={{ fontWeight: 500, color: '#1C1F33', fontSize: 14 }}>{u.full_name}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span style={{ fontSize: 13, color: 'rgba(28,31,51,0.6)' }}>{u.email}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 10px', borderRadius: 999, ...roleBadgeStyle[u.role] }}>
                          {roleLabel[u.role]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.teacher_code
                          ? <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#A86A10', backgroundColor: '#FFF8E7', padding: '2px 8px', borderRadius: 6 }}>{u.teacher_code}</span>
                          : <span style={{ color: 'rgba(28,31,51,0.3)', fontSize: 13 }}>—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <span style={{ fontSize: 13, color: 'rgba(28,31,51,0.5)' }}>{formatDate(u.created_at)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.is_validated
                          ? <span style={{ fontSize: 12, fontWeight: 500, color: '#1F5C44', backgroundColor: '#EBF5F0', border: '1px solid #C8E6D8', padding: '2px 10px', borderRadius: 999 }}>✓ Validé</span>
                          : <span style={{ fontSize: 12, fontWeight: 500, color: '#A86A10', backgroundColor: '#FFF8E7', border: '1px solid #FDEFC7', padding: '2px 10px', borderRadius: 999 }}>⏳ En attente</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {!u.is_validated && (
                            <button onClick={() => validate(u.id, true)} disabled={processing === u.id} title="Valider" style={{ color: '#2A7A5B' }}>
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {u.is_validated && (
                            <button onClick={() => validate(u.id, false)} disabled={processing === u.id} title="Révoquer" style={{ color: '#F4A924' }}>
                              <XCircle size={18} />
                            </button>
                          )}
                          <button onClick={() => deleteUser(u.id)} title="Supprimer" style={{ color: '#E85D75' }}>
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
