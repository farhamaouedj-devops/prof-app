import { useRef } from 'react'
import { Upload, Camera, FileText, Image, X } from 'lucide-react'
import { compressImage } from '../../lib/utils'

export default function FileUpload({ onFile, accept = 'image/*,application/pdf', label = 'Ajouter un fichier', allowCamera = false, currentFile = null, onRemove }) {
  const inputRef = useRef()
  const cameraRef = useRef()

  const handleChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const processed = await compressImage(file)
    onFile(processed)
    e.target.value = '' // reset input
  }

  const isImage = currentFile?.type?.startsWith('image/') || (typeof currentFile === 'string' && /\.(jpg|jpeg|png|gif|webp)$/i.test(currentFile))
  const isPDF = currentFile?.type === 'application/pdf' || (typeof currentFile === 'string' && currentFile.includes('.pdf'))
  const displayName = typeof currentFile === 'string' ? currentFile.split('/').pop()?.split('?')[0] : currentFile?.name

  return (
    <div className="space-y-2">
      {/* Current file preview */}
      {currentFile && (
        <div className="relative rounded-xl overflow-hidden border border-amber-200 bg-ivory">
          {isImage && typeof currentFile === 'string' && (
            <img src={currentFile} alt="Pièce jointe" className="w-full max-h-48 object-contain" />
          )}
          {isImage && currentFile instanceof File && (
            <img src={URL.createObjectURL(currentFile)} alt="Aperçu" className="w-full max-h-48 object-contain" />
          )}
          {isPDF && (
            <div className="flex items-center gap-3 p-3">
              <FileText size={20} className="text-rose-500" />
              <span className="text-sm text-navy/70 truncate flex-1">{displayName}</span>
            </div>
          )}
          {onRemove && (
            <button onClick={onRemove} className="absolute top-2 right-2 w-6 h-6 bg-navy/70 hover:bg-rose-500 text-white rounded-full flex items-center justify-center transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Upload buttons */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 bg-ivory hover:bg-amber-50 border border-dashed border-amber-300 text-navy/60 hover:text-amber-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
          <Upload size={15} />
          <span>{label}</span>
        </button>
        {allowCamera && (
          <button type="button" onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-2 bg-ivory hover:bg-amber-50 border border-dashed border-amber-300 text-navy/60 hover:text-amber-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
            <Camera size={15} />
            <span>Prendre une photo</span>
          </button>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      {allowCamera && (
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />
      )}
    </div>
  )
}

// ── FileViewer ─────────────────────────────────────────────────────────────
export function FileViewer({ url, filename }) {
  if (!url) return null
  const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
  const isPDF = /\.pdf$/i.test(url) || url.includes('.pdf')

  return (
    <div className="rounded-xl overflow-hidden border border-amber-100">
      {isImg && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={filename || 'Pièce jointe'} className="w-full max-h-96 object-contain bg-gray-50 hover:opacity-90 transition-opacity" />
        </a>
      )}
      {isPDF && (
        <div className="bg-gray-50">
          <iframe src={url} title={filename || 'PDF'} className="w-full h-80 border-0" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 text-sm text-ocean-600 hover:text-ocean-700 font-medium border-t border-gray-200">
            <FileText size={14} />
            Ouvrir le PDF complet
          </a>
        </div>
      )}
    </div>
  )
}
