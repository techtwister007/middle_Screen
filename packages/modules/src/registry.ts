import type { SalonModule } from '@salon/core'
import { bookingModule } from './booking'
import { campaignsModule } from './campaigns'
import { catalogModule } from './catalog'
import { contentEngineModule } from './content-engine'
import { contestsModule } from './contests'
import { customersModule } from './customers'
import { discoveryModule } from './discovery'
import { galleryModule } from './gallery'
import { loyaltyModule } from './loyalty'
import { messagingModule } from './messaging'
import { paymentsModule } from './payments'
import { platformModule } from './platform'
import { referralsModule } from './referrals'
import { reportsModule } from './reports'
import { reviewsModule } from './reviews'
import { tryOnModule } from './try-on'
import { visitsModule } from './visits'

/**
 * The module registry. Adding or removing a feature module is a one-line change here:
 * collections, tenant scoping, event handlers and jobs are all generated from this list.
 * Order matters only for inline event handling: modules that update customer stats run first.
 */
export const modules: SalonModule[] = [
  platformModule,
  catalogModule,
  galleryModule,
  customersModule,
  bookingModule,
  visitsModule,
  paymentsModule,
  loyaltyModule,
  referralsModule,
  reviewsModule,
  campaignsModule,
  contestsModule,
  contentEngineModule,
  messagingModule,
  reportsModule,
  tryOnModule,
  discoveryModule,
]

export const allCollections = () => modules.flatMap((m) => m.collections ?? [])
export const tenantCollections = () => modules.flatMap((m) => m.tenantCollections ?? [])
