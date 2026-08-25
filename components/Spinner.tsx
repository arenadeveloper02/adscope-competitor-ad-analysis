export default function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2"
      style={{ borderColor: '#E4E5E8', borderTopColor: '#1A73E8' }}
      role="status"
      aria-label="Loading"
    />
  )
}
