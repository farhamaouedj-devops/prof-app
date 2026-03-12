import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Send, Loader } from 'lucide-react'
import { createAudioRecorder, uploadFile, formatDuration, storagePath, toast } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

export default function VoiceRecorder({ exerciseId, senderId, receiverId, onSent }) {
  const [state, setState] = useState('idle') // idle | recording | uploading
  const [elapsed, setElapsed] = useState(0)
  const recorderRef = useRef(null)
  const timerRef = useRef(null)

  const startRecording = async () => {
    try {
      const recorder = createAudioRecorder(handleAudioBlob)
      await recorder.start()
      recorderRef.current = recorder
      setState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch {
      toast('Microphone non disponible', 'error')
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    recorderRef.current?.stop()
  }

  const handleAudioBlob = async (blob) => {
    setState('uploading')
    try {
      const filename = `${Date.now()}.webm`
      const path = storagePath.audio(senderId, exerciseId, filename)
      const url = await uploadFile(supabase, 'media', path, blob)

      await supabase.from('voice_messages').insert({
        exercise_id: exerciseId,
        sender_id: senderId,
        receiver_id: receiverId,
        audio_url: url,
        duration: elapsed
      })

      // Notification
      await supabase.from('notifications').insert({
        user_id: receiverId,
        type: 'voice_message',
        related_id: exerciseId,
        message: 'Nouveau message vocal reçu'
      })

      toast('Message vocal envoyé !', 'success')
      onSent?.()
    } catch (err) {
      toast('Erreur lors de l\'envoi', 'error')
      console.error(err)
    } finally {
      setState('idle')
      setElapsed(0)
    }
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  return (
    <div className="flex items-center gap-3">
      {state === 'idle' && (
        <button onClick={startRecording} className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-medium px-4 py-2.5 rounded-xl transition-all">
          <Mic size={16} />
          <span className="text-sm">Message vocal</span>
        </button>
      )}
      {state === 'recording' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 recording-active" />
            <span className="text-rose-600 font-mono font-medium text-sm">{formatDuration(elapsed)}</span>
          </div>
          <button onClick={stopRecording} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium px-4 py-2.5 rounded-xl transition-all">
            <Square size={14} fill="white" />
            <span className="text-sm">Arrêter & Envoyer</span>
          </button>
        </div>
      )}
      {state === 'uploading' && (
        <div className="flex items-center gap-2 text-navy/50 text-sm">
          <Loader size={14} className="animate-spin" />
          <span>Envoi en cours…</span>
        </div>
      )}
    </div>
  )
}

// ── VoiceMessageList ────────────────────────────────────────────────────────
export function VoiceMessageList({ messages, currentUserId }) {
  if (!messages?.length) return (
    <p className="text-sm text-navy/40 italic text-center py-4">Aucun message vocal</p>
  )

  return (
    <div className="space-y-3">
      {messages.map(m => {
        const isMine = m.sender_id === currentUserId
        return (
          <div key={m.id} className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-xs w-full rounded-2xl px-4 py-3 ${isMine ? 'bg-amber-100 border border-amber-200' : 'bg-ocean-50 border border-ocean-100'}`}>
              <audio src={m.audio_url} controls className="w-full h-8" style={{ height: 32 }} />
              {m.duration && (
                <p className="text-xs text-navy/40 mt-1">{formatDuration(m.duration)}</p>
              )}
            </div>
            <span className="text-xs text-navy/30 px-1">{isMine ? 'Moi' : (m.sender_profile?.full_name || 'Prof')}</span>
          </div>
        )
      })}
    </div>
  )
}
