import axios from 'axios'

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : 'http://localhost:3000',
  timeout: 30000,
})

export interface StatePayload {
  model: 'ideal_gas' | 'real'
  substance: string
  prop1: { name: string; value: number; unit: string }
  prop2: { name: string; value: number; unit: string }
  units: Record<string, string>
}

export interface StateResponse {
  state: {
    P?: number
    T?: number
    v?: number
    h?: number
    u?: number
    s?: number
    x?: number
    phase?: string
  }
  extra?: Record<string, number>
}

export async function computeState(payload: StatePayload): Promise<StateResponse> {
  const response = await api.post('/compute-state', payload)
  return response.data
}

export default api
