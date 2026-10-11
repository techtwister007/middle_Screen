import type { Payload, PayloadRequest, TaskConfig } from 'payload'
import { type ActorType, type EventEnvelope, type EventPayload, type EventType, parseEvent } from './events'
import { type SalonFeatureInput, isEnabled } from './features'
import type { ID, SalonModule } from './module'

export interface EmitInput<E extends EventType> {
  tenant: ID
  type: E
  payload: EventPayload<E>
  actorType?: ActorType
  actorId?: ID
}

export interface ScheduleInput {
  tenant: ID
  module: string
  step: string
  runAt: Date
  data?: Record<string, unknown>
}

export type BusMode = 'inline' | 'queue'

export interface EventBus {
  emit<E extends EventType>(payload: Payload, input: EmitInput<E>, req?: PayloadRequest): Promise<EventEnvelope<E>>
  schedule(payload: Payload, input: ScheduleInput): Promise<void>
  /** Runs a step immediately (used by tests, demo fast-forward and the queue task). */
  runStep(payload: Payload, input: Omit<ScheduleInput, 'runAt'>): Promise<void>
  tasks(): TaskConfig[]
}

const loadSalon = async (payload: Payload, tenant: ID): Promise<SalonFeatureInput | null> => {
  try {
    const salon = await payload.findByID({ collection: 'salons' as never, id: tenant, depth: 0, overrideAccess: true })
    return salon as unknown as SalonFeatureInput
  } catch {
    return null
  }
}

const moduleActive = async (payload: Payload, mod: SalonModule, tenant: ID) => {
  if (!mod.feature) return true
  const salon = await loadSalon(payload, tenant)
  return salon ? isEnabled(salon, mod.feature) : false
}

export const createEventBus = (
  modules: SalonModule[],
  options: { mode: BusMode; onError?: (err: unknown, context: string) => void },
): EventBus => {
  const byKey = new Map(modules.map((m) => [m.key, m]))
  const onError =
    options.onError ??
    ((err, context) => {
      console.error(`[events] ${context}`, err)
    })

  const runHandler = async (payload: Payload, moduleKey: string, event: EventEnvelope, req?: PayloadRequest) => {
    const mod = byKey.get(moduleKey)
    const handler = mod?.on?.[event.type] as ((a: unknown) => Promise<void>) | undefined
    if (!mod || !handler) return
    if (!(await moduleActive(payload, mod, event.tenant))) return
    await handler({ payload, event, req })
  }

  const runStep: EventBus['runStep'] = async (payload, input) => {
    const mod = byKey.get(input.module)
    const step = mod?.steps?.[input.step]
    if (!mod || !step) throw new Error(`Unknown step ${input.module}.${input.step}`)
    if (!(await moduleActive(payload, mod, input.tenant))) return
    await step({ payload, tenant: input.tenant, data: input.data ?? {} })
  }

  const bus: EventBus = {
    async emit(payload, input, req) {
      const parsed = parseEvent(input.type, input.payload)
      const row = await payload.create({
        collection: 'events' as never,
        overrideAccess: true,
        data: {
          tenant: input.tenant,
          type: input.type,
          actorType: input.actorType ?? 'system',
          actorId: input.actorId != null ? String(input.actorId) : undefined,
          payload: parsed,
        } as never,
      })
      const envelope = {
        id: (row as { id: ID }).id,
        type: input.type,
        tenant: input.tenant,
        actorType: input.actorType ?? 'system',
        actorId: input.actorId,
        payload: parsed,
        occurredAt: (row as { createdAt?: string }).createdAt ?? new Date().toISOString(),
      } as EventEnvelope<typeof input.type>

      const subscribers = modules.filter((m) => m.on?.[input.type])
      for (const mod of subscribers) {
        if (options.mode === 'inline') {
          try {
            await runHandler(payload, mod.key, envelope as EventEnvelope)
          } catch (err) {
            onError(err, `${mod.key} on ${input.type}`)
            if (process.env.EVENTS_THROW === 'true') throw err
          }
        } else {
          await payload.jobs.queue({
            task: 'dispatch-event' as never,
            input: { module: mod.key, event: envelope } as never,
          })
        }
      }
      return envelope
    },

    async schedule(payload, input) {
      await payload.jobs.queue({
        task: 'module-step' as never,
        input: { tenant: String(input.tenant), module: input.module, step: input.step, data: input.data ?? {} } as never,
        waitUntil: input.runAt,
      })
    },

    runStep,

    tasks() {
      const tasks: TaskConfig[] = [
        {
          slug: 'dispatch-event',
          retries: 3,
          inputSchema: [
            { name: 'module', type: 'text', required: true },
            { name: 'event', type: 'json', required: true },
          ],
          handler: async ({ input, req }: { input: unknown; req: PayloadRequest }) => {
            const { module, event } = input as unknown as { module: string; event: EventEnvelope }
            await runHandler(req.payload, module, event)
            return { output: {} }
          },
        } as unknown as TaskConfig,
        {
          slug: 'module-step',
          retries: 3,
          inputSchema: [
            { name: 'tenant', type: 'text', required: true },
            { name: 'module', type: 'text', required: true },
            { name: 'step', type: 'text', required: true },
            { name: 'data', type: 'json' },
          ],
          handler: async ({ input, req }: { input: unknown; req: PayloadRequest }) => {
            const i = input as unknown as { tenant: string; module: string; step: string; data?: Record<string, unknown> }
            const tenant = /^\d+$/.test(i.tenant) ? Number(i.tenant) : i.tenant
            await runStep(req.payload, { tenant, module: i.module, step: i.step, data: i.data ?? {} })
            return { output: {} }
          },
        } as unknown as TaskConfig,
      ]
      for (const mod of modules) {
        for (const r of mod.recurring ?? []) {
          tasks.push({
            slug: r.slug,
            schedule: [{ cron: r.cron, queue: 'recurring' }],
            handler: async ({ req }: { req: PayloadRequest }) => {
              await r.handler({ payload: req.payload })
              return { output: {} }
            },
          } as unknown as TaskConfig)
        }
      }
      return tasks
    },
  }
  return bus
}

/**
 * Process-wide bus used by module code. The app registers the real bus at startup;
 * modules call `emit()` / `schedule()` without importing each other.
 */
let current: EventBus | null = null

export const setEventBus = (bus: EventBus) => {
  current = bus
}

export const getEventBus = (): EventBus => {
  if (!current) throw new Error('Event bus not initialised. Call setEventBus() in payload.config.')
  return current
}

export const emit = <E extends EventType>(payload: Payload, input: EmitInput<E>, req?: PayloadRequest) =>
  getEventBus().emit(payload, input, req)

export const schedule = (payload: Payload, input: ScheduleInput) => getEventBus().schedule(payload, input)
