interface SpinnerProps {
  label?: string
}

export default function Spinner({ label }: SpinnerProps) {
  return (
    <div className="ds-card mt-6 flex flex-col items-center justify-center gap-3 p-10">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-grey-200"
        style={{ borderTopColor: '#1A73E8' }}
        aria-hidden="true"
      />
      {label && <p className="text-sm text-grey-600">{label}</p>}
    </div>
  )
}
