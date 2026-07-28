'use client'

import { useStore } from '@/lib/store'
import React, { useEffect } from 'react'
import { loadWasmCore, hasWasmCore } from '@/lib/wasm-loader'

export default function RootProvider({ children }: { children: React.ReactNode }) {
  const loadSubstances = useStore((s) => s.loadSubstances)
  const importSnapshot = useStore((s) => (s as any).importSnapshot)

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

    // Best-effort: try to load the Rust/WASM core. If unavailable (no binary in
    // public/wasm/, no toolchain), this is a no-op and the TS engine is used.
    loadWasmCore().then((core) => {
      if (core) {
        // Expose for ad-hoc evaluation so the engine can hot-swap later.
        ;(window as any).__THERMO_WASM__ = core
        console.info('WASM core loaded; TypeScript engine remains the default.')
      }
    })

    // Load session snapshot from sessionStorage (if present)
    try {
      const snap = sessionStorage.getItem('thermo-session')
      if (snap && importSnapshot) {
        importSnapshot(snap)
      }
    } catch (e) {
      // ignore
    }

    // Auto-save snapshot on unload
    const save = () => {
      try {
        const exportSnapshot = (window as any)?.__THERMO_EXPORT__
        // prefer explicit export if available, else use store export via window hook
        if (exportSnapshot) {
          const s = exportSnapshot()
          sessionStorage.setItem('thermo-session', s)
        }
      } catch (e) {
        // ignore
      }
    }
    window.addEventListener('beforeunload', save)
    return () => window.removeEventListener('beforeunload', save)
  }, [loadSubstances, importSnapshot])

  return <>{children}</>
}
