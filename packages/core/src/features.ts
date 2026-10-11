/**
 * Feature switches. A salon's plan sets its defaults; the platform console and
 * owner settings can override them. `isEnabled` is the ONE place features are checked.
 */
export const FEATURES = [
  'catalog',
  'gallery',
  'booking',
  'deposits',
  'customers',
  'visits',
  'payments',
  'wallet',
  'giftCards',
  'messaging',
  'loyalty',
  'tiers',
  'walletPass',
  'referrals',
  'reviews',
  'campaigns',
  'festivalPacks',
  'contests',
  'contentEngine',
  'reports',
  'tryOn',
  'aiTryOn',
  'discovery',
  'groupBooking',
  'multiBranch',
  'customTheme',
] as const

export type FeatureKey = (typeof FEATURES)[number]

export const PLANS = ['starter', 'studio', 'growth'] as const
export type Plan = (typeof PLANS)[number]

const STARTER: FeatureKey[] = ['catalog', 'gallery', 'booking', 'customers', 'visits', 'loyalty', 'reports', 'tryOn']

const STUDIO: FeatureKey[] = [
  ...STARTER,
  'deposits',
  'payments',
  'wallet',
  'giftCards',
  'messaging',
  'tiers',
  'walletPass',
  'referrals',
  'reviews',
  'campaigns',
  'festivalPacks',
  'contests',
  'contentEngine',
  'groupBooking',
]

const GROWTH: FeatureKey[] = [...STUDIO, 'multiBranch', 'customTheme']

/** Off by default on every plan; switched on per salon. */
export const OPT_IN_FEATURES: FeatureKey[] = ['aiTryOn', 'discovery']

export const PLAN_FEATURES: Record<Plan, FeatureKey[]> = {
  starter: STARTER,
  studio: STUDIO,
  growth: GROWTH,
}

export interface FeatureOverride {
  feature: FeatureKey
  enabled: boolean
}

export interface SalonFeatureInput {
  plan: Plan
  featureOverrides?: FeatureOverride[] | null
}

export const enabledFeatures = (salon: SalonFeatureInput): Set<FeatureKey> => {
  const set = new Set<FeatureKey>(PLAN_FEATURES[salon.plan] ?? [])
  for (const o of salon.featureOverrides ?? []) {
    if (o.enabled) set.add(o.feature)
    else set.delete(o.feature)
  }
  return set
}

export const isEnabled = (salon: SalonFeatureInput, feature: FeatureKey): boolean =>
  enabledFeatures(salon).has(feature)
