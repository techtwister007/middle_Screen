import { defineModule, emit, forTenant, type ID, idOf } from '@salon/core'
import type { CollectionConfig, Payload } from 'payload'
import { managersOnly, salonConfig, salonData, staffOnly } from '../_shared/access'

export const Contests: CollectionConfig = {
  slug: 'contests',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'endsAt'] },
  access: salonConfig,
  fields: [
    { name: 'title', type: 'text', required: true, defaultValue: 'Nail of the Month' },
    { name: 'theme', type: 'text', admin: { description: 'e.g. Navratri special' } },
    { name: 'prize', type: 'text', defaultValue: 'A free nail set' },
    { name: 'startsAt', type: 'date', required: true },
    { name: 'endsAt', type: 'date', required: true },
    { name: 'status', type: 'select', defaultValue: 'open', options: ['open', 'closed'] },
    {
      name: 'terms',
      type: 'textarea',
      defaultValue:
        'One vote per phone number. Winner is the entry with the most votes when voting closes. This contest is run by the salon and is not sponsored, endorsed or administered by Instagram or Meta.',
    },
    { name: 'winner', type: 'relationship', relationTo: 'contest-entries' },
  ],
}

export const ContestEntries: CollectionConfig = {
  slug: 'contest-entries',
  access: salonData,
  fields: [
    { name: 'contest', type: 'relationship', relationTo: 'contests', required: true, index: true },
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true },
    { name: 'photo', type: 'upload', relationTo: 'media', required: true },
    { name: 'designName', type: 'text' },
    { name: 'visit', type: 'relationship', relationTo: 'visits' },
    { name: 'votes', type: 'number', defaultValue: 0, index: true },
    { name: 'approved', type: 'checkbox', defaultValue: true },
  ],
}

export const ContestVotes: CollectionConfig = {
  slug: 'contest-votes',
  access: { read: staffOnly, create: managersOnly, update: () => false, delete: managersOnly },
  indexes: [{ fields: ['tenant', 'contest', 'voterPhone'], unique: true }],
  fields: [
    { name: 'contest', type: 'relationship', relationTo: 'contests', required: true },
    { name: 'entry', type: 'relationship', relationTo: 'contest-entries', required: true },
    { name: 'voterPhone', type: 'text', required: true },
    { name: 'voter', type: 'relationship', relationTo: 'customers' },
  ],
}

interface ContestDoc {
  id: ID
  status: string
  startsAt: string
  endsAt: string
}

export const currentContest = async (payload: Payload, tenant: ID) => {
  const now = new Date().toISOString()
  return forTenant(payload, tenant).findOne<ContestDoc & { title: string; prize?: string; theme?: string; terms?: string }>('contests', {
    and: [{ status: { equals: 'open' } }, { startsAt: { less_than_equal: now } }, { endsAt: { greater_than: now } }],
  })
}

export const enterContest = async (payload: Payload, tenant: ID, input: { contestId: ID; customerId: ID; photoId: ID; designName?: string; visitId?: ID }) => {
  const repo = forTenant(payload, tenant)
  const existing = await repo.findOne<{ id: ID }>('contest-entries', {
    and: [{ contest: { equals: input.contestId } }, { customer: { equals: input.customerId } }],
  })
  if (existing) return existing
  return repo.create('contest-entries', {
    contest: input.contestId,
    customer: input.customerId,
    photo: input.photoId,
    designName: input.designName,
    visit: input.visitId,
    votes: 0,
  })
}

export class VoteError extends Error {}

/** One vote per phone per contest. The voter (with consent) becomes a lead for the salon. */
export const castVote = async (payload: Payload, tenant: ID, input: { contestId: ID; entryId: ID; voterPhone: string; voterCustomerId: ID }) => {
  const repo = forTenant(payload, tenant)
  const contest = await repo.findByID<ContestDoc>('contests', input.contestId)
  if (contest?.status !== 'open' || new Date(contest.endsAt) < new Date()) throw new VoteError('Voting has closed')
  const entry = await repo.findByID<{ id: ID; contest: ID | { id: ID }; votes: number }>('contest-entries', input.entryId)
  if (!entry || String(idOf(entry.contest)) !== String(input.contestId)) throw new VoteError('Entry not found')
  const already = await repo.count('contest-votes', {
    and: [{ contest: { equals: input.contestId } }, { voterPhone: { equals: input.voterPhone } }],
  })
  if (already) throw new VoteError('You have already voted in this contest')
  await repo.create('contest-votes', {
    contest: input.contestId,
    entry: input.entryId,
    voterPhone: input.voterPhone,
    voter: input.voterCustomerId,
  })
  await repo.update('contest-entries', entry.id, { votes: entry.votes + 1 })
  await emit(payload, {
    tenant,
    type: 'contest.vote_cast',
    payload: { contestId: input.contestId, entryId: input.entryId, voterCustomerId: input.voterCustomerId },
    actorType: 'customer',
    actorId: input.voterCustomerId,
  })
}

export const closeContest = async (payload: Payload, tenant: ID, contestId: ID) => {
  const repo = forTenant(payload, tenant)
  const top = await repo.find<{ id: ID; customer: ID | { id: ID }; votes: number }>('contest-entries', {
    where: { contest: { equals: contestId } },
    sort: '-votes',
    limit: 1,
  })
  const winner = top.docs[0]
  await repo.update('contests', contestId, { status: 'closed', winner: winner?.id })
  if (winner && winner.votes > 0)
    await emit(payload, {
      tenant,
      type: 'contest.won',
      payload: { contestId, entryId: winner.id, customerId: idOf(winner.customer) as ID },
    })
  return winner ?? null
}

export const contestsModule = defineModule({
  key: 'contests',
  feature: 'contests',
  collections: [Contests, ContestEntries, ContestVotes],
  tenantCollections: ['contests', 'contest-entries', 'contest-votes'],
  recurring: [
    {
      slug: 'contests-close-ended',
      cron: '45 * * * *',
      handler: async ({ payload }) => {
        const ended = await payload.find({
          collection: 'contests' as never,
          overrideAccess: true,
          depth: 0,
          limit: 500,
          where: { and: [{ status: { equals: 'open' } }, { endsAt: { less_than: new Date().toISOString() } }] },
        })
        for (const c of ended.docs as { id: ID; tenant: ID | { id: ID } }[]) await closeContest(payload, idOf(c.tenant) as ID, c.id)
      },
    },
  ],
})
