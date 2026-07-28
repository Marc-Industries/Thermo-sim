import axios from 'axios'

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : 'http://localhost:3000',
  timeout: 30000,
})

export type ThermoModel = 'ideal_gas' | 'ideal_gas_cp_t' | 'real'

export interface StatePayload {
  model: ThermoModel
  substance: string
  prop1: { name: string; value: number; unit: string }
  prop2: { name: string; value: number; unit: string }
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
  extra?: Record<string, number | string>
}

export async function computeState(payload: StatePayload): Promise<StateResponse> {
  const response = await api.post('/api/compute-state', payload)
  return response.data
}

export default api
