'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type State<T> = { key: string; data?: T; error?: string }

/**
 * Loads data and re-loads whenever `deps` change (or `reload()` is called).
 * Keeps showing the previous data while the next request is in flight, so
 * tables don't flash empty when paging or filtering.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [tick, setTick] = useState(0)
  const [state, setState] = useState<State<T>>({ key: '' })

  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const requestKey = `${JSON.stringify(deps)}#${tick}`

  useEffect(() => {
    let cancelled = false

    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ key: requestKey, data })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState((prev) => ({
            key: requestKey,
            data: prev.data,
            error: err instanceof Error ? err.message : 'Something went wrong',
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return {
    data: state.data,
    error: state.key === requestKey ? state.error : undefined,
    loading: state.key !== requestKey,
    reload,
  }
}
