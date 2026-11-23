import { useEffect } from 'react'
import { useUi } from '@/store/ui'

export function Toast() {
  const toast = useUi((s) => s.toast)
  const dismiss = useUi((s) => s.dismissToast)
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(dismiss, toast.ttl)
    return () => window.clearTimeout(id)
  }, [toast, dismiss])
  if (!toast) return null
  return (
    <div className="toast" role="status">
      <span>{toast.text}</span>
      {toast.action && (
        <button
          className="ghost"
          onClick={() => {
            toast.action?.()
            dismiss()
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  )
}
