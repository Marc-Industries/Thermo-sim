'use client'

import { useStore } from '@/lib/store'
import React, { useEffect } from 'react'

export default function RootProvider({ children }: { children: React.ReactNode }) {
  const loadSubstances = useStore((s) => s.loadSubstances)

  useEffect(() => {
    // Load substances data on mount
    const loadData = async () => {
      try {
        const data = await fetch('/substance-data.json').then((r) => r.json())
        loadSubstances(data)
      } catch (e) {
        console.error('Failed to load substance data:', e)
      }
    }
    loadData()
  }, [loadSubstances])

  return <>{children}</>
}
