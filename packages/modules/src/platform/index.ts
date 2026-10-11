import { defineModule, FEATURES, PLANS } from '@salon/core'
import type { CollectionConfig } from 'payload'
import { managersOnly, platformOnly, staffOnly } from '../_shared/access'
import { moneyField, phoneField } from '../_shared/fields'

export const THEMES = ['default', 'luxe', 'minimal', 'custom'] as const
export const LANGUAGES = ['en', 'gu', 'hi'] as const
export const HOME_SECTIONS = [
  'hero',
  'nextVisit',
  'offers',
  'newDesigns',
  'services',
  'gallery',
  'loyalty',
  'invite',
  'contest',
  'artists',
  'reviews',
  'visit',
] as const

const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** The tenant collection: one document per salon. */
export const Salons: CollectionConfig = {
  slug: 'salons',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'plan', 'status'] },
  access: {
    read: staffOnly,
    create: platformOnly,
    update: managersOnly,
    delete: platformOnly,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { description: 'Used in the link: slug.ourbrand.in' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'plan',
          type: 'select',
          required: true,
          defaultValue: 'studio',
          options: [...PLANS],
          access: { update: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin' },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'active',
          options: ['trial', 'active', 'suspended', 'demo'],
          access: { update: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin' },
        },
      ],
    },
    {
      name: 'featureOverrides',
      type: 'array',
      admin: { description: 'Switch individual features on or off for this salon' },
      access: { update: ({ req }) => (req.user as { role?: string } | null)?.role === 'platform-admin' },
      fields: [
        { name: 'feature', type: 'select', required: true, options: [...FEATURES] },
        { name: 'enabled', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Brand',
          fields: [
            { name: 'tagline', type: 'text', localized: false },
            { name: 'about', type: 'textarea' },
            { name: 'theme', type: 'select', defaultValue: 'default', options: [...THEMES] },
            {
              name: 'brand',
              type: 'group',
              fields: [
                { name: 'logo', type: 'upload', relationTo: 'media' },
                { name: 'cover', type: 'upload', relationTo: 'media' },
                {
                  type: 'row',
                  fields: [
                    { name: 'primaryColor', type: 'text', admin: { description: 'Hex, e.g. #B4637A' } },
                    { name: 'accentColor', type: 'text' },
                    { name: 'backgroundColor', type: 'text' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'headingFont', type: 'text', admin: { description: 'Google font name' } },
                    { name: 'bodyFont', type: 'text' },
                  ],
                },
              ],
            },
            {
              name: 'homeSections',
              type: 'array',
              admin: { description: 'Order and visibility of sections on the salon home page' },
              fields: [
                { name: 'section', type: 'select', required: true, options: [...HOME_SECTIONS] },
                { name: 'visible', type: 'checkbox', defaultValue: true },
              ],
            },
            { name: 'languages', type: 'select', hasMany: true, defaultValue: ['en'], options: [...LANGUAGES] },
            { name: 'seasonalHighlight', type: 'text', admin: { description: 'e.g. navratri, diwali, wedding' } },
          ],
        },
        {
          label: 'Contact',
          fields: [
            {
              name: 'contact',
              type: 'group',
              fields: [
                phoneField('phone'),
                phoneField('whatsapp'),
                { name: 'email', type: 'email' },
                { name: 'instagram', type: 'text', admin: { description: 'Handle without @' } },
                { name: 'address', type: 'textarea' },
                { name: 'area', type: 'text' },
                { name: 'city', type: 'text', defaultValue: 'Vadodara' },
                { name: 'mapUrl', type: 'text' },
                { name: 'googlePlaceId', type: 'text' },
                { name: 'parking', type: 'text' },
              ],
            },
            {
              name: 'hours',
              type: 'array',
              fields: [
                { name: 'day', type: 'select', required: true, options: weekday },
                { name: 'open', type: 'text', defaultValue: '10:00' },
                { name: 'close', type: 'text', defaultValue: '20:00' },
                { name: 'closed', type: 'checkbox', defaultValue: false },
              ],
            },
            { name: 'timezone', type: 'text', defaultValue: 'Asia/Kolkata' },
            { name: 'domains', type: 'array', fields: [{ name: 'domain', type: 'text', required: true }] },
          ],
        },
        {
          label: 'Payments & messaging',
          fields: [
            { name: 'razorpayAccountId', type: 'text', admin: { description: 'Connected Razorpay account (money settles here)' } },
            { name: 'upiVpa', type: 'text', admin: { description: 'UPI ID for the counter QR when no gateway is connected' } },
            { name: 'whatsappSender', type: 'text', admin: { description: 'Provider sender ID for the salon number, if it has its own' } },
          ],
        },
        {
          label: 'Rules',
          fields: [
            {
              name: 'settings',
              type: 'group',
              fields: [
                { name: 'autoConfirmBookings', type: 'checkbox', defaultValue: false },
                { name: 'slotStepMinutes', type: 'number', defaultValue: 15 },
                { name: 'bookingHorizonDays', type: 'number', defaultValue: 30 },
                { name: 'depositMinMinutes', type: 'number', defaultValue: 90, admin: { description: 'Services this long or longer need a deposit' } },
                { name: 'depositPercent', type: 'number', defaultValue: 20 },
                {
                  name: 'cancellationPolicy',
                  type: 'textarea',
                  defaultValue: 'Free cancellation up to 4 hours before. Deposits are refundable up to 24 hours before.',
                },
                { name: 'stampsForReward', type: 'number', defaultValue: 6 },
                { name: 'pointsPer100', type: 'number', defaultValue: 5, admin: { description: 'Points earned per ₹100 spent' } },
                { name: 'silverAfterVisits', type: 'number', defaultValue: 4 },
                { name: 'goldAfterVisits', type: 'number', defaultValue: 10 },
                { name: 'discountBudgetPercent', type: 'number', defaultValue: 5 },
                { name: 'promoPerWeek', type: 'number', defaultValue: 1 },
                { name: 'promoPerMonth', type: 'number', defaultValue: 3 },
                moneyField('firstVisitDiscount', { defaultValue: 20000 }),
                moneyField('referralFriendReward', { defaultValue: 20000 }),
                moneyField('referralReferrerReward', { defaultValue: 20000 }),
                { name: 'reviewDelayHours', type: 'number', defaultValue: 2 },
                { name: 'aftercareDays', type: 'number', defaultValue: 3 },
                { name: 'refillHeadsUpDays', type: 'number', defaultValue: 5 },
                { name: 'nudgeDays', type: 'number', defaultValue: 15 },
                { name: 'winbackDays', type: 'number', defaultValue: 30 },
                { name: 'lastChanceDays', type: 'number', defaultValue: 60 },
                { name: 'googleReviewUrl', type: 'text' },
                { name: 'dailySummaryHour', type: 'number', defaultValue: 9 },
                { name: 'aiTryOnCredits', type: 'number', defaultValue: 0 },
                { name: 'aiTryOnPerCustomer', type: 'number', defaultValue: 3 },
                { name: 'wifiName', type: 'text' },
                { name: 'wifiPassword', type: 'text' },
                { name: 'demoPhone', type: 'text', admin: { description: 'Sales demo only: the prospect’s phone' } },
                { name: 'keepDemo', type: 'checkbox', defaultValue: false, admin: { description: 'Do not expire this demo after 7 days' } },
              ],
            },
          ],
        },
      ],
    },
  ],
}

/** Staff and platform admins. Customers are NOT users; they sign in with a phone code. */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'role'] },
  auth: { tokenExpiration: 60 * 60 * 24 * 30 },
  access: {
    // Artists use the studio app; the full admin is for owners, managers and our team.
    admin: ({ req }) => ['platform-admin', 'owner', 'manager'].includes((req.user as { role?: string } | null)?.role ?? ''),
    read: staffOnly,
    create: managersOnly,
    update: ({ req, id }) => {
      const role = (req.user as { role?: string } | null)?.role
      if (role === 'platform-admin' || role === 'owner' || role === 'manager') return true
      return req.user?.id === id
    },
    delete: managersOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    phoneField('phone'),
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'artist',
      options: [
        { label: 'Platform admin', value: 'platform-admin' },
        { label: 'Owner', value: 'owner' },
        { label: 'Manager / reception', value: 'manager' },
        { label: 'Artist', value: 'artist' },
      ],
      access: {
        update: ({ req }) => {
          const role = (req.user as { role?: string } | null)?.role
          return role === 'platform-admin' || role === 'owner'
        },
      },
    },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'textarea' },
    { name: 'specialties', type: 'text', hasMany: true },
    { name: 'bookable', type: 'checkbox', defaultValue: true, admin: { description: 'Customers can choose this person when booking' } },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true, create: staffOnly, update: staffOnly, delete: managersOnly },
  upload: {
    staticDir: process.env.MEDIA_DIR ?? 'media',
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumb', width: 320, height: 320, position: 'centre' },
      { name: 'card', width: 720 },
      { name: 'large', width: 1440 },
    ],
  },
  fields: [
    { name: 'alt', type: 'text' },
    { name: 'kind', type: 'select', defaultValue: 'general', options: ['general', 'design', 'visit', 'inspiration', 'share-kit', 'try-on', 'brand'] },
  ],
}

/** Append-only log of everything important. Dashboards are queries over this table. */
export const Events: CollectionConfig = {
  slug: 'events',
  admin: { useAsTitle: 'type', defaultColumns: ['type', 'actorType', 'createdAt'] },
  access: { read: staffOnly, create: platformOnly, update: () => false, delete: platformOnly },
  indexes: [{ fields: ['tenant', 'type', 'createdAt'] }],
  fields: [
    { name: 'type', type: 'text', required: true, index: true },
    { name: 'actorType', type: 'select', options: ['customer', 'staff', 'system', 'platform'], defaultValue: 'system' },
    { name: 'actorId', type: 'text' },
    { name: 'payload', type: 'json' },
  ],
}

/** Pass-through costs (WhatsApp, SMS, AI) per salon, billed at cost. */
export const CostLedger: CollectionConfig = {
  slug: 'cost-ledger',
  admin: { defaultColumns: ['kind', 'units', 'total', 'period'] },
  access: { read: staffOnly, create: platformOnly, update: platformOnly, delete: platformOnly },
  fields: [
    { name: 'kind', type: 'select', required: true, options: ['whatsapp-utility', 'whatsapp-marketing', 'whatsapp-auth', 'sms', 'ai-image'] },
    { name: 'units', type: 'number', defaultValue: 1 },
    moneyField('unitCost'),
    moneyField('total'),
    { name: 'period', type: 'text', index: true, admin: { description: 'yyyy-MM' } },
    { name: 'reference', type: 'text' },
  ],
}

/** Our subscription with each salon. */
export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  access: { read: managersOnly, create: platformOnly, update: platformOnly, delete: platformOnly },
  fields: [
    { name: 'plan', type: 'select', options: [...PLANS], required: true },
    moneyField('monthlyPrice'),
    moneyField('setupFee'),
    { name: 'status', type: 'select', options: ['pending', 'active', 'past-due', 'cancelled'], defaultValue: 'pending' },
    { name: 'billingCycle', type: 'select', options: ['monthly', 'annual'], defaultValue: 'monthly' },
    { name: 'foundingCustomer', type: 'checkbox', defaultValue: false },
    { name: 'razorpaySubscriptionId', type: 'text' },
    { name: 'nextBillingDate', type: 'date' },
    { name: 'supportMinutesThisMonth', type: 'number', defaultValue: 0 },
  ],
}

/** Audit log for sensitive platform actions (impersonation, exports). */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  access: { read: platformOnly, create: platformOnly, update: () => false, delete: () => false },
  fields: [
    { name: 'action', type: 'text', required: true },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'details', type: 'json' },
  ],
}

export const platformModule = defineModule({
  key: 'platform',
  collections: [Salons, Users, Media, Events, CostLedger, Subscriptions, AuditLog],
  tenantCollections: ['media', 'events', 'cost-ledger', 'subscriptions'],
  recurring: [
    {
      // Sales demos expire 7 days after they are built (DEMO.md section 4.1).
      slug: 'platform-expire-demos',
      cron: '0 * * * *',
      handler: async ({ payload }) => {
        const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString()
        const old = await payload.find({
          collection: 'salons' as never,
          overrideAccess: true,
          depth: 0,
          limit: 200,
          where: { and: [{ status: { equals: 'demo' } }, { createdAt: { less_than: cutoff } }, { 'settings.keepDemo': { not_equals: true } }] },
        })
        for (const s of old.docs as { id: string | number }[])
          await payload.update({ collection: 'salons' as never, id: s.id, overrideAccess: true, data: { status: 'suspended' } as never })
      },
    },
  ],
})
