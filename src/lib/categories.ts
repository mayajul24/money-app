export type CategoryId =
  | 'food'
  | 'transport'
  | 'housing'
  | 'fun'
  | 'health'
  | 'shopping'
  | 'bills'
  | 'other'
  | 'income'

export interface Category {
  id: CategoryId
  label: string
  color: string
  icon: string
  kind: 'expense' | 'income'
}

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'אוכל', color: '#f97316', icon: '🍔', kind: 'expense' },
  { id: 'transport', label: 'תחבורה', color: '#3b82f6', icon: '🚗', kind: 'expense' },
  { id: 'housing', label: 'דיור', color: '#8b5cf6', icon: '🏠', kind: 'expense' },
  { id: 'fun', label: 'בילויים', color: '#ec4899', icon: '🎉', kind: 'expense' },
  { id: 'health', label: 'בריאות', color: '#10b981', icon: '💊', kind: 'expense' },
  { id: 'shopping', label: 'קניות', color: '#f59e0b', icon: '🛍️', kind: 'expense' },
  { id: 'bills', label: 'חשבונות', color: '#64748b', icon: '🧾', kind: 'expense' },
  { id: 'other', label: 'אחר', color: '#94a3b8', icon: '📦', kind: 'expense' },
  { id: 'income', label: 'הכנסה', color: '#22c55e', icon: '💰', kind: 'income' },
]

export const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => c.kind === 'expense')

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
