import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'
import { toast, uploadFile, storagePath, formatDate, timeAgo } from '../../lib/utils'
import { FileViewer } from '../shared/FileUpload'
import VoiceRecorder, { VoiceMessageList } from '../shared/VoiceRecorder'
import { ArrowLeft, CheckCircle, MessageSquare, Mic, Image } from 'lucide-react'

export default function ExerciseCorrection({ exercise, students, onBack }) {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [selected, setSelected] = useState(null) // selected assignment
  const [submission, setSubmission] = useState(null)
  const [voiceMessages, setVoiceMessages] = useState([])
  const [correction, setCorrection] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('response') // response | voice

  const load = async () => {
    const { data } = await supabase.from('exercise_assignments')
      .select(`*, profiles:student_id(*), submissions(*)`)
      .eq('exercise_id', exercise.id)
      .order('created_at')
    setAssignments(data || [])
    if (data?.length > 0 && !selected) selectAssignment(data[0])
  }

  const selectAssignment = async (a) => {
    setSelected(a)
    const sub = a.submissions?.[0] || null
    setSubmission(sub)
    setCorrection(sub?.correction_text || '')
    // Load voice messages
    const { data: vm } = await supabase.from('voice_messages')
      .select(`*, sender_profile:sender_id(full_name)`)
      .eq('exercise_id', exercise.id)
      .or(`sender_id.eq.${a.student_id},receiver_id.eq.${a.student_id}`)
      .order('created_at')
    setVoiceMessages(vm || [])
  }

  useEffect(() => { load() }, [])

  const saveCorrection = async () => {
    if (!submission) return
    setSaving(true)
    await supabase.from('submissions').update({
      correction_text: correction,
      corrected_at: new Date().toISOString()
    }).eq('id', submission.id)
    await supabase.from('exercise_assignments').update({ status: 'corrected' }).eq('id', selected.id)
    // Notify student
    await supabase.from('notifications').insert({
      user_id: selected.student_id,
      type: 'correction',
      related_id: exercise.id,
      message: `Ta copie a été corrigée : "${exercise.title}"`
    })
    toast('Correction sauvegardée ✓', 'success')
    setSaving(false)
    load()
  }

  const statusColors = { pending: 'status-pending', submitted: 'status-submitted', corrected: 'status-corrected' }
  const statusLabels = { pending: '⏳ En attente', submitted: '📬 Rendu', corrected: '✅ Corrigé' }

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 px-4 md:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-amber-50 rounded-xl transition-colors text-navy/60">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-navy text-lg truncate">{exercise.title}</h2>
            <p className="text-xs text-navy/40">{assignments.length} élève(s) assigné(s)</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Student list sidebar */}
        <aside className="w-full max-w-xs border-r border-amber-100 bg-white overflow-y-auto hidden md:block">
          <div className="p-4 border-b border-amber-50">
            <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide">Élèves</p>
          </div>
          <div className="divide-y divide-amber-50">
            {assignments.map(a => (
              <button key={a.id} onClick={() => selectAssignment(a)}
                className={`w-full text-left px-4 py-3.5 hover:bg-ivory transition-colors ${selected?.id === a.id ? 'bg-amber-50 border-r-2 border-amber-400' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-ocean-100 rounded-full flex items-center justify-center text-sm font-bold text-ocean-600 flex-shrink-0">
                    {a.profiles?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy text-sm truncate">{a.profiles?.full_name}</p>
                    <span className={`text-xs ${statusColors[a.status]} px-1.5 py-0.5 rounded-full`}>
                      {statusLabels[a.status]}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Correction panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {!selected ? (
            <div className="text-center py-20 text-navy/40">Sélectionne un élève</div>
          ) : (
            <>
              {/* Student info bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ocean-100 rounded-full flex items-center justify-center font-bold text-ocean-600">
                    {selected.profiles?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-navy">{selected.profiles?.full_name}</p>
                    <span className={`text-xs ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</span>
                  </div>
                </div>
                {submission?.submitted_at && (
                  <p className="text-xs text-navy/40 hidden sm:block">Rendu {timeAgo(submission.submitted_at)}</p>
                )}
              </div>

              {/* Exercise reminder */}
              {exercise.description && (
                <div className="card bg-amber-50 border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Énoncé</p>
                  <p className="text-sm text-navy/70 whitespace-pre-wrap">{exercise.description}</p>
                  {exercise.attachment_url && <div className="mt-3"><FileViewer url={exercise.attachment_url} /></div>}
                </div>
              )}

              {/* Tabs: Response / Voice */}
              <div className="flex gap-1 bg-white border border-amber-100 rounded-xl p-1 w-fit">
                {[['response', MessageSquare, 'Réponse'], ['voice', Mic, `Vocaux (${voiceMessages.length})`]].map(([t, Icon, l]) => (
                  <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-amber-500 text-white shadow-sm' : 'text-navy/50'}`}>
                    <Icon size={14} /> {l}
                  </button>
                ))}
              </div>

              {tab === 'response' && (
                <>
                  {/* Student text response */}
                  <div className="card">
                    <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-3">Réponse de l'élève</p>
                    {submission?.text_response ? (
                      <div className="bg-ivory rounded-xl p-4 text-navy/80 text-sm whitespace-pre-wrap leading-relaxed">
                        {submission.text_response}
                      </div>
                    ) : (
                      <p className="text-sm italic text-navy/30 py-4 text-center">Aucune réponse textuelle</p>
                    )}
                    {submission?.schema_url && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Image size={12} /> Schéma / Brouillon
                        </p>
                        <FileViewer url={submission.schema_url} />
                      </div>
                    )}
                  </div>

                  {/* Correction zone */}
                  <div className="card space-y-3">
                    <p className="text-xs font-semibold text-forest-600 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle size={13} /> Zone de correction
                    </p>
                    <textarea
                      className="textarea"
                      rows={6}
                      placeholder="Écris ici ta correction et tes remarques…"
                      value={correction}
                      onChange={e => setCorrection(e.target.value)}
                    />
                    <div className="flex items-center gap-3">
                      <VoiceRecorder
                        exerciseId={exercise.id}
                        senderId={profile.id}
                        receiverId={selected.student_id}
                        onSent={() => selectAssignment(selected)}
                      />
                      <button onClick={saveCorrection} disabled={saving} className="btn-teacher ml-auto flex items-center gap-2">
                        <CheckCircle size={15} />
                        {saving ? 'Sauvegarde…' : 'Valider la correction'}
                      </button>
                    </div>
                  </div>

                  {/* Previous correction */}
                  {submission?.corrected_at && (
                    <div className="card bg-forest-50 border-forest-100 space-y-2 animate-fade-in">
                      <p className="text-xs font-semibold text-forest-600 uppercase tracking-wide">Correction précédente — {formatDate(submission.corrected_at)}</p>
                      <p className="text-sm text-navy/70 whitespace-pre-wrap">{submission.correction_text}</p>
                    </div>
                  )}
                </>
              )}

              {tab === 'voice' && (
                <div className="card space-y-4">
                  <VoiceMessageList messages={voiceMessages} currentUserId={profile.id} />
                  <div className="pt-3 border-t border-amber-50">
                    <VoiceRecorder
                      exerciseId={exercise.id}
                      senderId={profile.id}
                      receiverId={selected.student_id}
                      onSent={() => selectAssignment(selected)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
