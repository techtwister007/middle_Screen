export const STATUS_TONE: Record<string, 'brand' | 'success' | 'warning' | 'danger' | 'muted'> = {
  requested: 'warning',
  confirmed: 'success',
  completed: 'muted',
  cancelled: 'danger',
  'no-show': 'danger',
}
