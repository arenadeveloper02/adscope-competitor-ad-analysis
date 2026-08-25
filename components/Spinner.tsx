interface SpinnerProps {
  label?: string
}

export default function Spinner({ label }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-grey-200 border-t-brand" />
      {label && <p className="text-sm text-grey-600">{label}</p>}
    </div>
  )
}
