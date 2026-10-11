import { z } from 'zod'

/**
 * The event catalogue. Events are the only way modules talk to each other.
 * Every payload is validated against its schema when emitted.
 */
const id = z.union([z.string(), z.number()])

export const eventSchemas = {
  'link.clicked': z.object({ linkId: id, code: z.string() }),
  'customer.registered': z.object({ customerId: id, referralCode: z.string().optional() }),
  'booking.requested': z.object({ appointmentId: id, customerId: id }),
  'booking.confirmed': z.object({ appointmentId: id, customerId: id, start: z.string() }),
  'booking.cancelled': z.object({ appointmentId: id, customerId: id, start: z.string(), staffId: id.optional() }),
  'booking.no_show': z.object({ appointmentId: id, customerId: id }),
  'booking.rescheduled': z.object({ appointmentId: id, customerId: id, start: z.string() }),
  'waitlist.offered': z.object({ waitlistId: id, customerId: id, start: z.string() }),
  'group.joined': z.object({ groupId: id, appointmentId: id, customerId: id }),
  'visit.completed': z.object({
    visitId: id,
    customerId: id,
    total: z.number().int(),
    serviceIds: z.array(id),
    staffId: id.optional(),
    isFirstVisit: z.boolean(),
  }),
  'payment.captured': z.object({ paymentId: id, kind: z.string(), amount: z.number().int(), customerId: id.optional() }),
  'gift.sent': z.object({ giftCardId: id, recipientPhone: z.string() }),
  'photo.ready': z.object({ photoTaskId: id, customerId: id, visitId: id }),
  'photo.shared': z.object({ photoTaskId: id, customerId: id }),
  'share.verified': z.object({ photoTaskId: id, customerId: id }),
  'rating.submitted': z.object({ ratingId: id, customerId: id, score: z.number().int().min(1).max(5) }),
  'referral.sent': z.object({ referralId: id, referrerId: id }),
  'referral.converted': z.object({ referralId: id, referrerId: id, inviteeId: id }),
  'reward.issued': z.object({ rewardId: id, customerId: id, kind: z.string() }),
  'reward.redeemed': z.object({ rewardId: id, customerId: id }),
  'segment.changed': z.object({ customerId: id, from: z.string().nullable(), to: z.string() }),
  'offer.launched': z.object({ offerId: id }),
  'offer.claimed': z.object({ offerId: id, customerId: id }),
  'contest.won': z.object({ contestId: id, entryId: id, customerId: id }),
  'contest.vote_cast': z.object({ contestId: id, entryId: id, voterCustomerId: id }),
  'tryon.generated': z.object({ tryOnId: id, customerId: id, ai: z.boolean() }),
  'message.sent': z.object({ messageId: id, category: z.string(), cost: z.number().int() }),
  'message.failed': z.object({ messageId: id, reason: z.string() }),
} as const

export type EventType = keyof typeof eventSchemas
export type EventPayload<E extends EventType> = z.infer<(typeof eventSchemas)[E]>

export const EVENT_TYPES = Object.keys(eventSchemas) as EventType[]

export type ActorType = 'customer' | 'staff' | 'system' | 'platform'

export interface EventEnvelope<E extends EventType = EventType> {
  /** Row id in the `events` collection; used for deduplication. */
  id: string | number
  type: E
  tenant: string | number
  actorType: ActorType
  actorId?: string | number
  payload: EventPayload<E>
  occurredAt: string
}

export const parseEvent = <E extends EventType>(type: E, payload: unknown): EventPayload<E> => eventSchemas[type].parse(payload) as EventPayload<E>
