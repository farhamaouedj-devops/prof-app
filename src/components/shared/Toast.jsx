export default function Toast({ message, type = 'success' }) {
  const colors = {
    success: 'bg-forest-500 text-white',
    error: 'bg-rose-500 text-white',
    info: 'bg-ocean-500 text-white',
    warning: 'bg-amber-500 text-white'
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl toast ${colors[type]}`}>
      <span className="font-bold text-lg">{icons[type]}</span>
      <span className="font-medium text-sm">{message}</span>
    </div>
  )
}
