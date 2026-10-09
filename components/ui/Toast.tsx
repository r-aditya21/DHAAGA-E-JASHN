'use client'

import { useEffect, useRef, useState } from 'react'

export default function Toast() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<string>

      setMessage(customEvent.detail)
      setVisible(true)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        setVisible(false)
      }, 2400)
    }

    window.addEventListener('dhaaga:toast', handleToast)

    return () => {
      window.removeEventListener('dhaaga:toast', handleToast)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return (
    <div
      className={`toast-msg ${visible ? 'show' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
