interface SpinnerProps {
  size?: 'sm' | 'md'
  className?: string
}

export default function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  const dimension = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'
  return (
    <span
      className={`inline-block ${dimension} animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
