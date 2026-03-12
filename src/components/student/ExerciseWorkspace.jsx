import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'
import { uploadFile, storagePath, compressImage, timeAgo, toast } from '../../lib/utils'
import { FileViewer } from '../shared/FileUpload'
import VoiceRecorder, { VoiceMessageList } from '../shared/VoiceRecorder'
import { ArrowLeft, Save, Send, Mic, Image, CheckCircle, Clock } from 'lucide-react'

const AUTO_SAVE_DELAY = 1500 // 1.5s debounce

export default function ExerciseWorkspace({ assignment, onBack }) {
  const { profile } = useAuth()
  const exercise = assignment.exercises
  const [submission, setSubmission] = useState(null)
  const [text, setText] = useState('')
  const [schemaFile, setSchemaFile] = useState(null)
  const [schemaUrl, setSchemaUrl] = useState(null)
  const [voiceMessages, setVoiceMessages] = useState([])
  const [activeTab, setActiveTab] = useState('work') // work | correction | voice
  const [saveState, setSaveState] = useState('saved') // saved | saving | unsaved
  const [submitting, setSubmitting] = useState(false)
  const [uploadingSchema, setUploadingSchema] = useState(false)
  const autoSaveRef = useRef(null)
  const submissionIdRef = useRef(null)
  const isCorrected = assignment.status === 'corrected'

  // Load submission and voice messages
  useEffect(() => {
    const init = async () => {
      const { data: sub } = await supabase.from('submissions')
        .select('*').eq('assignment_id', assignment.id).single()
      if (sub) {
        setSubmission(sub)
        setText(sub.text_response || '')
        setSchemaUrl(sub.schema_url || null)
        submissionIdRef.current = sub.id
      }
      // Voice messages
      const { data: vm } = await supabase.from('voice_messages')
        .select(`*, sender_profile:sender_id(full_name)`)
        .eq('exercise_id', exercise.id)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at')
      setVoiceMessages(vm || [])
    }
    init()
  }, [])

  // Auto-save debounced
  const autoSave = useCallback(async (value) => {
    if (!submissionIdRef.current) return
    setSaveState('saving')
    const { error } = await supabase.from('submissions').update({
      text_response: value,
      last_saved_at: new Date().toISOString()
    }).eq('id', submissionIdRef.current)
    setSaveState(error ? 'unsaved' : 'saved')
  }, [])

  const handleTextChange = (value) => {
    setText(value)
    setSaveState('unsaved')
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => autoSave(value), AUTO_SAVE_DELAY)
  }

  useEffect(() => () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }, [])

  // Upload schema image
  const handleSchemaFile = async (file) => {
    setUploadingSchema(true)
    try {
      const compressed = await compressImage(file, 1)
      const path = storagePath.submissionSchema(profile.id, assignment.id, compressed.name || file.name)
      const url = await uploadFile(supabase, 'media', path, compressed)
      setSchemaUrl(url)
      await supabase.from('submissions').update({ schema_url: url }).eq('id', submissionIdRef.current)
      toast('Schéma ajouté ✓', 'success')
    } catch {
      toast('Erreur lors de l\'envoi du schéma', 'error')
    }
    setUploadingSchema(false)
  }

  // Final submit
  const handleSubmit = async () => {
    if (!text.trim() && !schemaUrl) return toast('Ajoute une réponse ou un schéma avant de rendre', 'error')
    setSubmitting(true)
    // Final save
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    await supabase.from('submissions').update({
      text_response: text,
      submitted_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString()
    }).eq('id', submissionIdRef.current)
    await supabase.from('exercise_assignments').update({ status: 'submitted' }).eq('id', assignment.id)
    // Notify teacher
    const { data: teacherProfile } = await supabase.from('profiles')
      .select('id').eq('id', (await supabase.from('exercises').select('teacher_id').eq('id', exercise.id).single()).data?.teacher_id).single()
    if (teacherProfile) {
      await supabase.from('notifications').insert({
        user_id: teacherProfile.id,
        type: 'submission',
        related_id: exercise.id,
        message: `${profile.full_name} a rendu : "${exercise.title}"`
      })
    }
    toast('Devoir rendu ! ✓', 'success')
    setSubmitting(false)
    onBack()
  }

  const saveIcon = {
    saved: <span className="text-forest-500 text-xs flex items-center gap-1"><CheckCircle size={11} /> Sauvegardé</span>,
    saving: <span className="text-amber-500 text-xs flex items-center gap-1"><Clock size={11} /> Sauvegarde…</span>,
    unsaved: <span className="text-navy/30 text-xs flex items-center gap-1"><Save size={11} /> Non sauvegardé</span>
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 px-4 md:px-8 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button onClick={onBack} className="p-2 hover:bg-amber-50 rounded-xl transition-colors text-navy/60 flex-shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-navy text-lg truncate">{exercise.title}</h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {saveIcon[saveState]}
            {!isCorrected && assignment.status !== 'submitted' && (
              <button onClick={handleSubmit} disabled={submitting} className="btn-student flex items-center gap-2 text-sm">
                <Send size={14} />
                {submitting ? 'Envoi…' : 'Rendre'}
              </button>
            )}
            {assignment.status === 'submitted' && (
              <span className="status-submitted">📬 Rendu</span>
            )}
            {isCorrected && (
              <span className="status-corrected">✅ Corrigé</span>
            )}
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="bg-white border-b border-amber-100 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex gap-1 py-2">
          {[
            ['work', '📝', 'Mon travail'],
            ...(isCorrected ? [['correction', '✅', 'Correction']] : []),
            ['voice', '🎙️', `Vocaux (${voiceMessages.length})`]
          ].map(([t, icon, l]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t ? 'bg-ocean-500 text-white shadow-sm' : 'text-navy/50 hover:text-navy hover:bg-ivory'}`}>
              <span>{icon}</span> {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-6">
        {/* WORK TAB */}
        {activeTab === 'work' && (
          <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
            {/* Left: Exercise */}
            <div className="space-y-4">
              <div className="card">
                <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  📋 Énoncé
                </h3>
                {exercise.description ? (
                  <p className="text-navy/80 text-sm leading-relaxed whitespace-pre-wrap">{exercise.description}</p>
                ) : (
                  <p className="text-navy/40 text-sm italic">Voir la pièce jointe ci-dessous</p>
                )}
              </div>
              {exercise.attachment_url && (
                <div className="card p-3">
                  <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-3">Document</p>
                  <FileViewer url={exercise.attachment_url} />
                </div>
              )}
            </div>

            {/* Right: Answer */}
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-ocean-600 uppercase tracking-wide">✏️ Ma réponse</h3>
                  {saveIcon[saveState]}
                </div>
                <textarea
                  className="textarea"
                  rows={10}
                  placeholder="Écris ta réponse ici…"
                  value={text}
                  onChange={e => handleTextChange(e.target.value)}
                  disabled={assignment.status === 'submitted' || isCorrected}
                />
              </div>

              {/* Schema upload */}
              <div className="card">
                <h3 className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Image size={12} /> Schéma / Brouillon
                </h3>
                {schemaUrl && (
                  <div className="mb-3">
                    <img src={schemaUrl} alt="Mon schéma" className="w-full max-h-48 object-contain rounded-xl border border-amber-100" />
                  </div>
                )}
                {assignment.status !== 'submitted' && !isCorrected && (
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 bg-ivory hover:bg-amber-50 border border-dashed border-amber-300 text-navy/60 hover:text-amber-700 text-sm font-medium px-4 py-2.5 rounded-xl cursor-pointer transition-all">
                      <Image size={14} />
                      {uploadingSchema ? 'Compression…' : schemaUrl ? 'Remplacer' : 'Ajouter une image'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) handleSchemaFile(e.target.files[0]) }} />
                    </label>
                    <label className="flex items-center gap-2 bg-ivory hover:bg-amber-50 border border-dashed border-amber-300 text-navy/60 hover:text-amber-700 text-sm font-medium px-4 py-2.5 rounded-xl cursor-pointer transition-all">
                      📷 Photo directe
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files[0]) handleSchemaFile(e.target.files[0]) }} />
                    </label>
                  </div>
                )}
              </div>

              {/* Voice from teacher */}
              {voiceMessages.filter(v => v.sender_id !== profile.id).length > 0 && (
                <div className="card bg-amber-50 border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Mic size={12} /> Messages de ta prof
                  </p>
                  <VoiceMessageList
                    messages={voiceMessages.filter(v => v.sender_id !== profile.id)}
                    currentUserId={profile.id}
                  />
                </div>
              )}

              {/* Student voice to teacher */}
              {assignment.status !== 'corrected' && (
                <div className="card">
                  <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-3">Question vocale à ta prof</p>
                  <VoiceRecorder
                    exerciseId={exercise.id}
                    senderId={profile.id}
                    receiverId={exercise.teacher_id}
                    onSent={async () => {
                      const { data: vm } = await supabase.from('voice_messages').select(`*, sender_profile:sender_id(full_name)`).eq('exercise_id', exercise.id).or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`).order('created_at')
                      setVoiceMessages(vm || [])
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* CORRECTION TAB */}
        {activeTab === 'correction' && isCorrected && (
          <div className="max-w-2xl space-y-5 animate-fade-in">
            <div className="card bg-forest-50 border-forest-200 space-y-4">
              <h3 className="font-semibold text-forest-700 flex items-center gap-2">
                <CheckCircle size={18} /> Correction de ta prof
              </h3>
              {submission?.correction_text ? (
                <div className="bg-white rounded-xl p-4 text-navy/80 text-sm leading-relaxed whitespace-pre-wrap border border-forest-100">
                  {submission.correction_text}
                </div>
              ) : (
                <p className="text-sm italic text-navy/40">Ta prof n'a pas encore laissé de commentaire écrit.</p>
              )}
            </div>
            {/* Voice from teacher in correction */}
            {voiceMessages.filter(v => v.sender_id !== profile.id).length > 0 && (
              <div className="card">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Mic size={12} /> Explications vocales
                </p>
                <VoiceMessageList messages={voiceMessages.filter(v => v.sender_id !== profile.id)} currentUserId={profile.id} />
              </div>
            )}
            {/* Your answer recap */}
            <div className="card">
              <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-3">Ta réponse</p>
              <p className="text-sm text-navy/60 whitespace-pre-wrap">{submission?.text_response || '(pas de réponse textuelle)'}</p>
              {submission?.schema_url && <div className="mt-3"><img src={submission.schema_url} alt="Mon schéma" className="w-full max-h-48 object-contain rounded-xl border border-amber-100" /></div>}
            </div>
          </div>
        )}

        {/* VOICE TAB */}
        {activeTab === 'voice' && (
          <div className="max-w-lg space-y-4 animate-fade-in">
            <div className="card">
              <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-4">Conversation vocale</p>
              <VoiceMessageList messages={voiceMessages} currentUserId={profile.id} />
              <div className="pt-4 border-t border-amber-50 mt-4">
                <VoiceRecorder
                  exerciseId={exercise.id}
                  senderId={profile.id}
                  receiverId={exercise.teacher_id}
                  onSent={async () => {
                    const { data: vm } = await supabase.from('voice_messages').select(`*, sender_profile:sender_id(full_name)`).eq('exercise_id', exercise.id).or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`).order('created_at')
                    setVoiceMessages(vm || [])
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile submit bar */}
      {!isCorrected && assignment.status !== 'submitted' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-amber-100 p-4">
          <button onClick={handleSubmit} disabled={submitting} className="btn-student w-full flex items-center justify-center gap-2">
            <Send size={16} />
            {submitting ? 'Envoi en cours…' : 'Rendre le devoir'}
          </button>
        </div>
      )}
    </div>
  )
}
