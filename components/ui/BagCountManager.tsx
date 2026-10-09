'use client'

import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function BagCountManager() {
  const { cartCount, refreshCart } = useAuth()

  useEffect(() => {
    const handleAddToBag = () => {
      refreshCart()
    }

    window.addEventListener('dhaaga:addtobag', handleAddToBag)

    return () => {
      window.removeEventListener('dhaaga:addtobag', handleAddToBag)
    }
  }, [refreshCart])

  return null
}
