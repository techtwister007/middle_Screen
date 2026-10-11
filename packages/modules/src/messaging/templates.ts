import type { MessageCategory } from '@salon/integrations'

export type Lang = 'en' | 'hi' | 'gu'

export interface TemplateDef {
  category: MessageCategory
  /** Who receives it */
  audience: 'customer' | 'owner'
  text: Record<Lang, string>
}

/**
 * Default WhatsApp templates. Salons can override the wording per language in the
 * `message-templates` collection. Hindi and Gujarati are first drafts: have a native
 * speaker review them before submitting templates to Meta for approval.
 * Variables: {{name}} {{salon}} {{date}} {{time}} {{artist}} {{link}} {{code}} {{amount}}
 * {{design}} {{reward}} {{expiry}} {{count}} {{score}} {{summary}}
 */
export const TEMPLATES = {
  otp: {
    category: 'authentication',
    audience: 'customer',
    text: {
      en: '{{code}} is your {{salon}} login code. It expires in 5 minutes. Do not share it.',
      hi: '{{code}} आपका {{salon}} लॉगिन कोड है। यह 5 मिनट में समाप्त हो जाएगा। इसे किसी से साझा न करें।',
      gu: '{{code}} તમારો {{salon}} લૉગિન કોડ છે. તે 5 મિનિટમાં સમાપ્ત થશે. કોઈ સાથે શેર કરશો નહીં.',
    },
  },
  booking_received: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Hi {{name}}, we got your request for {{date}} at {{time}}. {{salon}} will confirm shortly. {{link}}',
      hi: 'नमस्ते {{name}}, {{date}} को {{time}} बजे के लिए आपका अनुरोध मिल गया है। {{salon}} जल्द ही पुष्टि करेगा। {{link}}',
      gu: 'નમસ્તે {{name}}, {{date}} ના {{time}} માટે તમારી વિનંતી મળી ગઈ છે. {{salon}} ટૂંક સમયમાં પુષ્ટિ કરશે. {{link}}',
    },
  },
  booking_confirmed: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'You are booked, {{name}}! {{date}} at {{time}} with {{artist}} at {{salon}}. Details and directions: {{link}}',
      hi: 'आपकी बुकिंग हो गई, {{name}}! {{date}} को {{time}} बजे, {{artist}} के साथ, {{salon}} में। जानकारी और रास्ता: {{link}}',
      gu: 'તમારું બુકિંગ થઈ ગયું, {{name}}! {{date}} ના {{time}} વાગ્યે, {{artist}} સાથે, {{salon}} માં. વિગતો અને રસ્તો: {{link}}',
    },
  },
  booking_reminder: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Reminder: your {{salon}} appointment is {{date}} at {{time}}. Need to change it? {{link}}',
      hi: 'याद दिला दें: {{salon}} में आपका अपॉइंटमेंट {{date}} को {{time}} बजे है। बदलना है? {{link}}',
      gu: 'યાદ અપાવીએ: {{salon}} માં તમારી એપોઇન્ટમેન્ટ {{date}} ના {{time}} વાગ્યે છે. બદલવી છે? {{link}}',
    },
  },
  receipt: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Thank you for visiting {{salon}}, {{name}}! Paid {{amount}} for {{design}}. Your bill and aftercare tips: {{link}}',
      hi: '{{salon}} आने के लिए धन्यवाद, {{name}}! {{design}} के लिए {{amount}} का भुगतान हुआ। बिल और देखभाल टिप्स: {{link}}',
      gu: '{{salon}} ની મુલાકાત બદલ આભાર, {{name}}! {{design}} માટે {{amount}} ચૂકવ્યા. બિલ અને કાળજીની ટિપ્સ: {{link}}',
    },
  },
  running_late: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Hi {{name}}, {{salon}} is running about {{count}} minutes behind today. Your {{time}} slot will start a little late, sorry! Need to change it? {{link}}',
      hi: 'नमस्ते {{name}}, {{salon}} आज लगभग {{count}} मिनट देर से चल रहा है। आपका {{time}} का स्लॉट थोड़ा देर से शुरू होगा, माफ़ कीजिए! बदलना है? {{link}}',
      gu: 'નમસ્તે {{name}}, {{salon}} આજે લગભગ {{count}} મિનિટ મોડું ચાલે છે. તમારો {{time}} નો સ્લોટ થોડો મોડો શરૂ થશે, માફ કરશો! બદલવો છે? {{link}}',
    },
  },
  booking_cancelled: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Your {{salon}} appointment on {{date}} has been cancelled. Book again anytime: {{link}}',
      hi: '{{date}} का आपका {{salon}} अपॉइंटमेंट रद्द कर दिया गया है। कभी भी फिर से बुक करें: {{link}}',
      gu: '{{date}} ની તમારી {{salon}} એપોઇન્ટમેન્ટ રદ કરવામાં આવી છે. ગમે ત્યારે ફરી બુક કરો: {{link}}',
    },
  },
  waitlist_offer: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Good news {{name}}! A slot opened at {{salon}} on {{date}} at {{time}}. Grab it before someone else does: {{link}}',
      hi: 'खुशखबरी {{name}}! {{salon}} में {{date}} को {{time}} बजे जगह खाली हुई है। जल्दी बुक करें: {{link}}',
      gu: 'ખુશખબર {{name}}! {{salon}} માં {{date}} ના {{time}} વાગ્યે જગ્યા ખાલી થઈ છે. જલદી બુક કરો: {{link}}',
    },
  },
  nails_ready: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: '✨ Your {{design}} photos are ready, {{name}}! See them and share with friends: {{link}}',
      hi: '✨ आपकी {{design}} की तस्वीरें तैयार हैं, {{name}}! देखें और दोस्तों के साथ शेयर करें: {{link}}',
      gu: '✨ તમારા {{design}} ના ફોટા તૈયાર છે, {{name}}! જુઓ અને મિત્રો સાથે શેર કરો: {{link}}',
    },
  },
  rating_request: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'How did you like your visit to {{salon}} today, {{name}}? Tap to rate in 5 seconds: {{link}}',
      hi: '{{name}}, आज {{salon}} में आपका अनुभव कैसा रहा? 5 सेकंड में रेटिंग दें: {{link}}',
      gu: '{{name}}, આજે {{salon}} માં તમારો અનુભવ કેવો રહ્યો? 5 સેકન્ડમાં રેટિંગ આપો: {{link}}',
    },
  },
  thanks_review: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Thank you {{name}}! If you have a moment, a Google review helps {{salon}} a lot: {{link}}',
      hi: 'धन्यवाद {{name}}! अगर समय हो तो Google पर एक रिव्यू {{salon}} की बहुत मदद करेगा: {{link}}',
      gu: 'આભાર {{name}}! સમય હોય તો Google પર એક રિવ્યુ {{salon}} ને ઘણી મદદ કરશે: {{link}}',
    },
  },
  aftercare: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Hi {{name}}, how are your nails? Any lifting or chipping, {{salon}} will fix it free within 7 days. Care tips: {{link}}',
      hi: 'नमस्ते {{name}}, आपके नाखून कैसे हैं? कोई उखड़ना या टूटना हो तो {{salon}} 7 दिन में मुफ्त ठीक करेगा। देखभाल के टिप्स: {{link}}',
      gu: 'નમસ્તે {{name}}, તમારા નખ કેવા છે? કંઈ ઉખડે કે તૂટે તો {{salon}} 7 દિવસમાં મફત ઠીક કરશે. સંભાળની ટિપ્સ: {{link}}',
    },
  },
  refill_heads_up: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Hi {{name}}, your refill is due on {{date}}. {{artist}} has slots that week. Book in one tap: {{link}}',
      hi: 'नमस्ते {{name}}, आपका रिफिल {{date}} को है। उस हफ्ते {{artist}} के पास समय है। एक टैप में बुक करें: {{link}}',
      gu: 'નમસ્તે {{name}}, તમારું રિફિલ {{date}} ના છે. તે અઠવાડિયે {{artist}} પાસે સમય છે. એક ટેપમાં બુક કરો: {{link}}',
    },
  },
  refill_due: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Your nails are due for a refill today, {{name}}. {{reward}} Book your slot: {{link}}',
      hi: '{{name}}, आज आपके नाखूनों का रिफिल है। {{reward}} अपना स्लॉट बुक करें: {{link}}',
      gu: '{{name}}, આજે તમારા નખનું રિફિલ છે. {{reward}} તમારો સ્લોટ બુક કરો: {{link}}',
    },
  },
  nudge_new_designs: {
    category: 'marketing',
    audience: 'customer',
    text: {
      en: 'New designs just landed at {{salon}}, {{name}} 💅 Take a look: {{link}}',
      hi: '{{salon}} में नए डिज़ाइन आ गए हैं, {{name}} 💅 देखिए: {{link}}',
      gu: '{{salon}} માં નવી ડિઝાઇન આવી ગઈ છે, {{name}} 💅 જુઓ: {{link}}',
    },
  },
  winback: {
    category: 'marketing',
    audience: 'customer',
    text: {
      en: 'We miss you, {{name}}! {{artist}} saved a little something for you: {{reward}} Book here: {{link}}',
      hi: 'हमें आपकी याद आ रही है, {{name}}! {{artist}} ने आपके लिए कुछ खास रखा है: {{reward}} यहाँ बुक करें: {{link}}',
      gu: 'અમને તમારી યાદ આવે છે, {{name}}! {{artist}} એ તમારા માટે કંઈક ખાસ રાખ્યું છે: {{reward}} અહીં બુક કરો: {{link}}',
    },
  },
  last_chance_survey: {
    category: 'marketing',
    audience: 'customer',
    text: {
      en: 'Hi {{name}}, it has been a while. Could you tell {{salon}} why in one tap? It really helps: {{link}}',
      hi: 'नमस्ते {{name}}, काफ़ी समय हो गया। क्या आप एक टैप में {{salon}} को कारण बता सकती हैं? इससे बहुत मदद मिलेगी: {{link}}',
      gu: 'નમસ્તે {{name}}, ઘણો સમય થઈ ગયો. શું તમે એક ટેપમાં {{salon}} ને કારણ જણાવશો? તેનાથી ઘણી મદદ મળશે: {{link}}',
    },
  },
  reward_issued: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: '🎁 {{name}}, you earned {{reward}} at {{salon}}. Valid till {{expiry}}. {{link}}',
      hi: '🎁 {{name}}, आपको {{salon}} में {{reward}} मिला है। {{expiry}} तक मान्य। {{link}}',
      gu: '🎁 {{name}}, તમને {{salon}} માં {{reward}} મળ્યું છે. {{expiry}} સુધી માન્ય. {{link}}',
    },
  },
  referral_converted: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: 'Your friend just visited {{salon}} 🎉 Your thank-you reward is waiting: {{link}}',
      hi: 'आपकी दोस्त अभी {{salon}} आई थीं 🎉 आपका धन्यवाद इनाम तैयार है: {{link}}',
      gu: 'તમારી મિત્ર હમણાં {{salon}} આવી હતી 🎉 તમારું આભાર ઇનામ તૈયાર છે: {{link}}',
    },
  },
  gift_received: {
    category: 'utility',
    audience: 'customer',
    text: {
      en: '🎁 Someone sent you a {{amount}} gift from {{salon}}! Open it here: {{link}}',
      hi: '🎁 किसी ने आपको {{salon}} की ओर से {{amount}} का तोहफ़ा भेजा है! यहाँ खोलें: {{link}}',
      gu: '🎁 કોઈએ તમને {{salon}} તરફથી {{amount}} ની ભેટ મોકલી છે! અહીં ખોલો: {{link}}',
    },
  },
  offer: {
    category: 'marketing',
    audience: 'customer',
    text: {
      en: '{{name}}, {{reward}} at {{salon}}. {{link}}',
      hi: '{{name}}, {{salon}} में {{reward}}। {{link}}',
      gu: '{{name}}, {{salon}} માં {{reward}}. {{link}}',
    },
  },
  owner_new_booking: {
    category: 'utility',
    audience: 'owner',
    text: {
      en: 'New booking request: {{name}} on {{date}} at {{time}}. Confirm: {{link}}',
      hi: 'नई बुकिंग: {{name}}, {{date}} को {{time}} बजे। पुष्टि करें: {{link}}',
      gu: 'નવું બુકિંગ: {{name}}, {{date}} ના {{time}} વાગ્યે. પુષ્ટિ કરો: {{link}}',
    },
  },
  owner_low_rating: {
    category: 'utility',
    audience: 'owner',
    text: {
      en: '⚠️ {{name}} rated their visit {{score}}/5. A quick call today can win them back: {{link}}',
      hi: '⚠️ {{name}} ने अपनी विज़िट को {{score}}/5 रेटिंग दी। आज एक फ़ोन कॉल उन्हें वापस ला सकता है: {{link}}',
      gu: '⚠️ {{name}} એ તેમની મુલાકાતને {{score}}/5 રેટિંગ આપ્યું. આજે એક ફોન તેમને પાછા લાવી શકે: {{link}}',
    },
  },
  owner_daily_summary: {
    category: 'utility',
    audience: 'owner',
    text: {
      en: 'Good morning! {{summary}} Open today: {{link}}',
      hi: 'सुप्रभात! {{summary}} आज की सूची: {{link}}',
      gu: 'સુપ્રભાત! {{summary}} આજની યાદી: {{link}}',
    },
  },
  owner_monthly_report: {
    category: 'utility',
    audience: 'owner',
    text: {
      en: '📊 Your {{date}} report for {{salon}}: {{summary}} Full report: {{link}}',
      hi: '📊 {{salon}} की {{date}} रिपोर्ट: {{summary}} पूरी रिपोर्ट: {{link}}',
      gu: '📊 {{salon}} નો {{date}} રિપોર્ટ: {{summary}} પૂરો રિપોર્ટ: {{link}}',
    },
  },
  owner_cancellation: {
    category: 'utility',
    audience: 'owner',
    text: {
      en: '{{name}} cancelled {{date}} at {{time}}. {{summary}} {{link}}',
      hi: '{{name}} ने {{date}} {{time}} की बुकिंग रद्द की। {{summary}} {{link}}',
      gu: '{{name}} એ {{date}} {{time}} નું બુકિંગ રદ કર્યું. {{summary}} {{link}}',
    },
  },
  owner_collage_ready: {
    category: 'utility',
    audience: 'owner',
    text: {
      en: "✨ This week's nail collage is ready ({{count}} sets). Post it to Instagram: {{link}}",
      hi: '✨ इस हफ़्ते का नेल कोलाज तैयार है ({{count}} सेट)। Instagram पर पोस्ट करें: {{link}}',
      gu: '✨ આ અઠવાડિયાનો નેઇલ કોલાજ તૈયાર છે ({{count}} સેટ). Instagram પર પોસ્ટ કરો: {{link}}',
    },
  },
  owner_photo_approval: {
    category: 'utility',
    audience: 'owner',
    text: {
      en: '{{name}} is happy for their nails to be in your gallery. Approve in one tap: {{link}}',
      hi: '{{name}} चाहती हैं कि उनके नाखून आपकी गैलरी में दिखें। एक टैप में मंज़ूरी दें: {{link}}',
      gu: '{{name}} ઇચ્છે છે કે તેમના નખ તમારી ગેલેરીમાં દેખાય. એક ટેપમાં મંજૂર કરો: {{link}}',
    },
  },
} satisfies Record<string, TemplateDef>

export type TemplateKey = keyof typeof TEMPLATES

export const render = (text: string, vars: Record<string, string | number | undefined | null>) =>
  text
    .replace(/\{\{(\w+)\}\}/g, (_, k: string) => (vars[k] == null ? '' : String(vars[k])))
    .replace(/\s{2,}/g, ' ')
    .trim()
