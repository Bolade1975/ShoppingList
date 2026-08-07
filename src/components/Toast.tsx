type ToastProps = {
  message: string
  actionLabel?: string
  onAction?: () => void
}

/** A brief, dismissable status line — used for "Item deleted [Undo]" style confirmations right after an action. */
export function Toast({ message, actionLabel, onAction }: ToastProps) {
  return (
    <div className="toast" role="status">
      <span>{message}</span>
      {actionLabel && onAction && (
        <button type="button" className="toast__undo" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
