import imageCompression from 'browser-image-compression'

export const ADMIN_EMAIL = 'farha.maouedj@proton.me'

// ── Image compression ──────────────────────────────────────────────────────
export async function compressImage(file, maxSizeMB = 0.8) {
  if (!file.type.startsWith('image/')) return file
  try {
    return await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp'
    })
  } catch {
    return file // fallback: send original
  }
}

// ── Audio compression via MediaRecorder (already compressed by browser) ───
// Returns a Blob of compressed audio (WebM/Opus ~6kbps)
export function createAudioRecorder(onStop) {
  let mediaRecorder = null
  let chunks = []

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 32000 }
      : { audioBitsPerSecond: 32000 }
    mediaRecorder = new MediaRecorder(stream, options)
    chunks = []
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' })
      stream.getTracks().forEach(t => t.stop())
      onStop(blob)
    }
    mediaRecorder.start(200) // collect every 200ms
    return mediaRecorder
  }

  const stop = () => { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop() }

  return { start, stop }
}

// ── Storage paths ──────────────────────────────────────────────────────────
export const storagePath = {
  exerciseAttachment: (teacherId, exerciseId, filename) =>
    `exercises/${teacherId}/${exerciseId}/${filename}`,
  submissionSchema: (studentId, assignmentId, filename) =>
    `submissions/${studentId}/${assignmentId}/schema-${filename}`,
  correctionFile: (teacherId, submissionId, filename) =>
    `corrections/${teacherId}/${submissionId}/${filename}`,
  audio: (senderId, type, filename) =>
    `audio/${senderId}/${type}-${filename}`
}

// ── Date formatting ────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return formatDate(dateStr)
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Generate teacher code ──────────────────────────────────────────────────
export function generateTeacherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── File type utils ────────────────────────────────────────────────────────
export function isImageFile(url) {
  if (!url) return false
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.includes('image/')
}

export function isPDFFile(url) {
  if (!url) return false
  return /\.pdf$/i.test(url) || url.includes('.pdf')
}

// ── Sanitize filename (remove accents, spaces, special chars) ─────────────
export function sanitizeFilename(name) {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/[^a-zA-Z0-9._-]/g, "_")                  // replace special chars
    .replace(/_+/g, "_")                                // collapse underscores
    .toLowerCase()
}

// ── Upload file to Supabase Storage ───────────────────────────────────────
export async function uploadFile(supabase, bucket, path, file) {
  // Sanitize the filename part of the path
  const parts = path.split("/")
  parts[parts.length - 1] = sanitizeFilename(parts[parts.length - 1])
  const cleanPath = parts.join("/")
  
  const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, file, {
    upsert: true,
    contentType: file.type
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(cleanPath)
  return publicUrl
}

// ── Toast store (lightweight) ──────────────────────────────────────────────
let toastCallback = null
export function setToastHandler(fn) { toastCallback = fn }
export function toast(message, type = 'success') {
  if (toastCallback) toastCallback(message, type)
}
