export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          border: '2px solid rgba(6,34,60,0.15)',
          borderTopColor: '#C99A3D',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span className="sr-only">Loading</span>
    </div>
  )
}
