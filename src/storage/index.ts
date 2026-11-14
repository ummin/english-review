import { createSampleStorage } from './sample'
import type { AppStorage } from './types'

export type { AppStorage }
export const storage: AppStorage = createSampleStorage()
