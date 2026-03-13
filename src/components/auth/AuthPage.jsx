import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ADMIN_EMAIL, generateTeacherCode, toast } from '../../lib/utils'
import { Eye, EyeOff, BookOpen, GraduationCap, Shield } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '', teacherCode: '' })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password
    })
    if (error) toast(
      error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : error.message, 'error'
    )
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim()) return toast('Le nom complet est requis', 'error')
    if (form.password.length < 6) return toast('Le mot de passe doit faire au moins 6 caractères', 'error')

    const emailLower = form.email.trim().toLowerCase()
    const isAdmin = emailLower === ADMIN_EMAIL
    setLoading(true)

    try {
      // Vérifier le code prof pour les élèves
      let teacherId = null
      if (role === 'student' && !isAdmin) {
        if (!form.teacherCode.trim()) {
          setLoading(false)
          return toast('Le code de la prof est requis', 'error')
        }
        const { data: teacherRows } = await supabase.rpc('get_teacher_by_code', { code: form.teacherCode.trim() })
        const teacher = teacherRows?.[0]
        if (!teacher) {
          setLoading(false)
          return toast('Code prof invalide. Vérifie avec ta professeure.', 'error')
        }
        teacherId = teacher.id
      }

      // Générer le code prof si nécessaire
      const newTeacherCode = (role === 'teacher' && !isAdmin) ? generateTeacherCode() : null

      // Inscription avec métadonnées — le trigger SQL les récupère automatiquement
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: emailLower,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            role: isAdmin ? 'admin' : role,
            teacher_code: newTeacherCode,
            teacher_id: teacherId,
            is_validated: isAdmin || role === 'teacher' ? true : false
          }
        }
      })
      if (authErr) throw authErr

      const uid = authData.user?.id
      if (!uid) throw new Error('Erreur lors de la création du compte')

      // Mettre à jour le profil créé par le trigger avec les champs manquants
      await supabase.from('profiles').update({
        full_name: form.fullName.trim(),
        role: isAdmin ? 'admin' : role,
        teacher_code: newTeacherCode,
        teacher_id: teacherId,
        is_validated: isAdmin || role === 'teacher'
      }).eq('id', uid)

      if (role === 'teacher' && !isAdmin) {
        toast(`Compte créé ! Ton code prof : ${newTeacherCode}`, 'success')
      } else if (isAdmin) {
        toast('Compte administrateur créé !', 'success')
      } else {
        toast('Compte créé ! En attente de validation.', 'info')
      }
    } catch (err) {
      toast(err.message || 'Erreur lors de l\'inscription', 'error')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FDFBF5' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-40" style={{ backgroundColor: '#FDEFC7', filter: 'blur(80px)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-40" style={{ backgroundColor: '#C8E6D8', filter: 'blur(80px)' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📚</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontWeight: 700, color: '#1C1F33' }}>EduProf</h1>
          <p style={{ color: 'rgba(28,31,51,0.5)', marginTop: 4, fontSize: 14 }}>Espace élève — professeure particulière</p>
        </div>

        <div className="card shadow-lg">
          {/* Mode toggle */}
          <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ backgroundColor: '#FDFBF5' }}>
            {[['login', 'Connexion'], ['register', 'Inscription']].map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === m ? 'bg-white shadow text-navy' : ''}`}
                style={{ color: mode === m ? '#1C1F33' : 'rgba(28,31,51,0.5)' }}>
                {l}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(28,31,51,0.7)' }}>Email</label>
                <input className="input" type="email" placeholder="ton@email.fr" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(28,31,51,0.7)' }}>Mot de passe</label>
                <div className="relative">
                  <input className="input pr-10" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(28,31,51,0.4)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(28,31,51,0.7)' }}>Je suis…</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { r: 'student', icon: <GraduationCap size={18} />, label: 'Élève' },
                    { r: 'teacher', icon: <BookOpen size={18} />, label: 'Professeur(e)' }
                  ].map(({ r, icon, label }) => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className="flex items-center gap-2 p-3 rounded-xl border-2 transition-all font-medium text-sm"
                      style={{
                        borderColor: role === r ? (r === 'teacher' ? '#4CAF82' : '#5B97D4') : '#FDEFC7',
                        backgroundColor: role === r ? (r === 'teacher' ? '#EBF5F0' : '#EBF3FB') : '#FDFBF5',
                        color: role === r ? (r === 'teacher' ? '#1F5C44' : '#1E4D85') : 'rgba(28,31,51,0.5)'
                      }}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(28,31,51,0.7)' }}>Nom complet</label>
                <input className="input" type="text" placeholder="Marie Dupont" value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(28,31,51,0.7)' }}>Email</label>
                <input className="input" type="email" placeholder="ton@email.fr" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(28,31,51,0.7)' }}>Mot de passe</label>
                <div className="relative">
                  <input className="input pr-10" type={showPassword ? 'text' : 'password'} placeholder="6 caractères minimum" value={form.password} onChange={e => set('password', e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(28,31,51,0.4)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {role === 'student' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(28,31,51,0.7)' }}>Code de ta professeure</label>
                  <input className="input font-mono tracking-widest text-center text-lg uppercase"
                    type="text" placeholder="ABC123" maxLength={6}
                    value={form.teacherCode} onChange={e => set('teacherCode', e.target.value)} required />
                  <p className="text-xs mt-1" style={{ color: 'rgba(28,31,51,0.4)' }}>Demande ce code à ta professeure</p>
                </div>
              )}

              {form.email.trim().toLowerCase() === ADMIN_EMAIL && (
                <div className="flex items-center gap-2 text-xs rounded-xl p-3" style={{ color: '#A86A10', backgroundColor: '#FFF8E7', border: '1px solid #FDEFC7' }}>
                  <Shield size={14} /> Compte administrateur détecté
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Création…' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs mt-6" style={{ color: 'rgba(28,31,51,0.3)' }}>EduProf — Gratuit et sécurisé</p>
      </div>
    </div>
  )
}
