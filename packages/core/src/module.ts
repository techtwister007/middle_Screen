import type { CollectionConfig, Payload, PayloadRequest } from 'payload'
import type { EventEnvelope, EventType } from './events'
import type { FeatureKey } from './features'

export type ID = string | number

export interface EventHandlerArgs<E extends EventType> {
  payload: Payload
  event: EventEnvelope<E>
  req?: PayloadRequest
}

export type EventHandler<E extends EventType> = (args: EventHandlerArgs<E>) => Promise<void>

export interface StepHandlerArgs {
  payload: Payload
  tenant: ID
  data: Record<string, unknown>
}

export type StepHandler = (args: StepHandlerArgs) => Promise<void>

export interface RecurringTask {
  /** Unique slug, e.g. `customers.nightly-segments` */
  slug: string
  /** Cron expression in UTC */
  cron: string
  handler: (args: { payload: Payload }) => Promise<void>
}

export interface SalonModule {
  /** Unique key, also the folder name */
  key: string
  /** When set, the module's handlers and steps run only for salons with this feature enabled */
  feature?: FeatureKey
  collections?: CollectionConfig[]
  /** Collections whose documents belong to one salon. Registered with the multi-tenant plugin. */
  tenantCollections?: string[]
  /** Event subscriptions */
  on?: { [E in EventType]?: EventHandler<E> }
  /** Named delayed steps that can be scheduled with `schedule()` */
  steps?: Record<string, StepHandler>
  /** Recurring tasks run by the jobs queue */
  recurring?: RecurringTask[]
}

export const defineModule = <M extends SalonModule>(module: M): M => module
