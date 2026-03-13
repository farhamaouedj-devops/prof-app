import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { compressImage, uploadFile, storagePath, sanitizeFilename, toast } from '../../lib/utils'
import FileUpload from '../shared/FileUpload'
import { ArrowLeft, Send, UserCheck } from 'lucide-react'

export default function CreateExercise({ students, teacherId, onBack }) {
  const [form, setForm] = useState({ title: '', description: '', deadline: '' })
  const [attachment, setAttachment] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const toggleStudent = (id) => setSelectedStudents(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const selectAll = () => setSelectedStudents(students.map(s => s.id))
  const selectNone = () => setSelectedStudents([])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast('Le titre est requis', 'error')
    if (selectedStudents.length === 0) return toast('Sélectionne au moins un élève', 'error')

    setLoading(true)
    try {
      // Create exercise
      const { data: exercise, error: exErr } = await supabase.from('exercises').insert({
        teacher_id: teacherId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        deadline: form.deadline || null
      }).select().single()
      if (exErr) throw exErr

      // Upload attachment
      if (attachment) {
        const compressed = await compressImage(attachment)
        const path = storagePath.exerciseAttachment(teacherId, exercise.id, sanitizeFilename(compressed.name || attachment.name))
        const url = await uploadFile(supabase, 'media', path, compressed)
        await supabase.from('exercises').update({
          attachment_url: url,
          attachment_type: attachment.type.includes('pdf') ? 'pdf' : 'image'
        }).eq('id', exercise.id)
      }

      // Create assignments
      const assignments = selectedStudents.map(sid => ({
        exercise_id: exercise.id,
        student_id: sid,
        status: 'pending'
      }))
      await supabase.from('exercise_assignments').insert(assignments)

      // Create submissions placeholders + notifications
      const subs = selectedStudents.map(sid => ({
        assignment_id: null, // will update below
        student_id: sid,
        text_response: ''
      }))

      // Get assignment ids
      const { data: assignData } = await supabase.from('exercise_assignments')
        .select('id, student_id').eq('exercise_id', exercise.id)

      const subsWithIds = assignData.map(a => ({
        assignment_id: a.id,
        student_id: a.student_id,
        text_response: ''
      }))
      await supabase.from('submissions').insert(subsWithIds)

      // Notifications for each student
      const notifs = selectedStudents.map(sid => ({
        user_id: sid,
        type: 'new_exercise',
        related_id: exercise.id,
        message: `Nouvel exercice : "${form.title.trim()}"`
      }))
      await supabase.from('notifications').insert(notifs)

      toast('Exercice créé et envoyé !', 'success')
      onBack()
    } catch (err) {
      toast(err.message || 'Erreur lors de la création', 'error')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-white border-b border-amber-100 px-4 md:px-8 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-amber-50 rounded-xl transition-colors text-navy/60 hover:text-navy">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-display font-bold text-navy text-xl">Nouvel exercice</h2>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Exercise details */}
        <div className="card space-y-5">
          <h3 className="font-semibold text-navy flex items-center gap-2">
            <span className="text-lg">📝</span> Contenu de l'exercice
          </h3>
          <div>
            <label className="block text-sm font-medium text-navy/70 mb-1.5">Titre *</label>
            <input className="input" type="text" placeholder="Ex: Exercice de conjugaison — Passé composé" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy/70 mb-1.5">Énoncé / Description</label>
            <textarea className="textarea" rows={5} placeholder="Écris l'énoncé complet de l'exercice ici…" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy/70 mb-2">Pièce jointe (PDF ou Image)</label>
            <FileUpload
              onFile={setAttachment}
              accept="image/*,application/pdf"
              label="Ajouter PDF ou image"
              currentFile={attachment}
              onRemove={() => setAttachment(null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy/70 mb-1.5">Date limite (optionnel)</label>
            <input className="input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
          </div>
        </div>

        {/* Student selection */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy flex items-center gap-2">
              <UserCheck size={18} className="text-forest-500" />
              Assigner aux élèves *
            </h3>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={selectAll} className="text-ocean-600 hover:underline">Tous</button>
              <span className="text-navy/30">·</span>
              <button type="button" onClick={selectNone} className="text-navy/50 hover:underline">Aucun</button>
            </div>
          </div>
          {students.length === 0 ? (
            <p className="text-sm text-navy/50 italic py-4 text-center">Aucun élève inscrit pour le moment</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {students.map(st => {
                const selected = selectedStudents.includes(st.id)
                return (
                  <label key={st.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-ocean-400 bg-ocean-50' : 'border-amber-100 bg-ivory hover:border-amber-200'}`}>
                    <input type="checkbox" className="hidden" checked={selected} onChange={() => toggleStudent(st.id)} />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-ocean-500 border-ocean-500' : 'border-gray-300'}`}>
                      {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-navy text-sm truncate">{st.full_name}</p>
                      <p className="text-xs text-navy/40 truncate">{st.email}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
          {selectedStudents.length > 0 && (
            <p className="text-xs text-ocean-600 font-medium animate-fade-in">
              ✓ {selectedStudents.length} élève{selectedStudents.length > 1 ? 's' : ''} sélectionné{selectedStudents.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={onBack} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={loading} className="btn-teacher flex-1 flex items-center justify-center gap-2">
            <Send size={16} />
            {loading ? 'Envoi en cours…' : 'Créer & Envoyer'}
          </button>
        </div>
      </form>
    </div>
  )
}
