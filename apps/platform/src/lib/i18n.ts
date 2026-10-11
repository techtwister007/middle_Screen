export type Lang = 'en' | 'hi' | 'gu'

const dict = {
  home: { en: 'Home', hi: 'होम', gu: 'હોમ' },
  designs: { en: 'Designs', hi: 'डिज़ाइन', gu: 'ડિઝાઇન' },
  book: { en: 'Book', hi: 'बुक करें', gu: 'બુક કરો' },
  myNails: { en: 'My nails', hi: 'मेरे नाखून', gu: 'મારા નખ' },
  rewards: { en: 'Rewards', hi: 'इनाम', gu: 'ઇનામ' },
  bookThisLook: { en: 'Book this look', hi: 'यह लुक बुक करें', gu: 'આ લુક બુક કરો' },
  tryOnMyHand: { en: 'Try on my hand', hi: 'मेरे हाथ पर देखें', gu: 'મારા હાથ પર જુઓ' },
  menu: { en: 'Menu & prices', hi: 'सेवाएँ और कीमतें', gu: 'સેવાઓ અને કિંમતો' },
  inviteFriend: { en: 'Gift a friend', hi: 'दोस्त को तोहफ़ा दें', gu: 'મિત્રને ભેટ આપો' },
  hello: { en: 'Hi', hi: 'नमस्ते', gu: 'નમસ્તે' },
  welcome: { en: 'Welcome', hi: 'स्वागत है', gu: 'સ્વાગત છે' },
  from: { en: 'from', hi: 'से', gu: 'થી' },
  login: { en: 'Log in', hi: 'लॉग इन', gu: 'લૉગ ઇન' },
  newThisMonth: { en: 'New this month', hi: 'इस महीने नया', gu: 'આ મહિને નવું' },
  offers: { en: 'Offers for you', hi: 'आपके लिए ऑफ़र', gu: 'તમારા માટે ઓફર' },
  nextVisit: { en: 'Your next visit', hi: 'आपकी अगली विज़िट', gu: 'તમારી આગલી મુલાકાત' },
  refillIn: { en: 'Refill due', hi: 'रिफिल', gu: 'રિફિલ' },
  repeatLast: { en: 'Repeat my last design', hi: 'पिछला डिज़ाइन दोहराएँ', gu: 'છેલ્લી ડિઝાઇન ફરી કરાવો' },
  visitUs: { en: 'Visit us', hi: 'हमसे मिलें', gu: 'અમારી મુલાકાત લો' },
  ourArtists: { en: 'Our artists', hi: 'हमारे आर्टिस्ट', gu: 'અમારા આર્ટિસ્ટ' },
  lovedBy: { en: 'Loved by our clients', hi: 'ग्राहकों को पसंद', gu: 'ગ્રાહકોને ગમ્યું' },
  language: { en: 'Language', hi: 'भाषा', gu: 'ભાષા' },
} satisfies Record<string, Record<Lang, string>>

export type DictKey = keyof typeof dict

export const t = (lang: string | undefined | null, key: DictKey) => {
  const l = (lang === 'hi' || lang === 'gu' ? lang : 'en') as Lang
  return dict[key][l]
}

export const LANG_LABELS: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી' }
