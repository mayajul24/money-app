import { useLiveQuery } from 'dexie-react-hooks'
import { db, PROFILE_ID, type Profile } from '../lib/db'

const DEFAULT_PROFILE: Profile = {
  id: PROFILE_ID,
  monthlySalary: 0,
  currentBalance: 0,
  balanceAsOf: new Date().toISOString().slice(0, 10),
}

export function useProfile(): Profile {
  return useLiveQuery(() => db.profile.get(PROFILE_ID), []) ?? DEFAULT_PROFILE
}

export async function saveProfile(input: { monthlySalary: number; currentBalance: number }) {
  await db.profile.put({
    id: PROFILE_ID,
    monthlySalary: input.monthlySalary,
    currentBalance: input.currentBalance,
    balanceAsOf: new Date().toISOString().slice(0, 10),
  })
}
