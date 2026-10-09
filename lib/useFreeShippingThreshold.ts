'use client'

import { useEffect, useState } from 'react'
import { getStoreConfig } from '@/lib/api/config'

// Free-shipping threshold from the server (null until loaded or if unavailable).
// The backend is the single source of truth; do not hard-code the amount.
export function useFreeShippingThreshold(): number | null {
  const [threshold, setThreshold] = useState<number | null>(null)

  useEffect(() => {
    getStoreConfig()
      .then((config) => setThreshold(config.freeShippingThreshold))
      .catch(() => setThreshold(null))
  }, [])

  return threshold
}
