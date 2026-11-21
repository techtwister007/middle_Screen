/** Greeting cards agents send to their contacts. Lunar dates are for ordering only and can shift by a day. */
export type Motif = "diya" | "colours" | "kite" | "garba" | "crescent" | "star" | "sparkle" | "tricolour" | "flower" | "coins" | "home";
export type Festival = { id: string; name: string; title: string; line: string; motif: Motif; dates: string[] };

export const FESTIVALS: Festival[] = [
  { id: "new-year", name: "New Year", title: "Happy New Year", line: "May this year bring you the home you have been dreaming of.", motif: "sparkle", dates: ["2026-01-01", "2027-01-01", "2028-01-01"] },
  { id: "uttarayan", name: "Uttarayan / Makar Sankranti", title: "Happy Uttarayan", line: "May your hopes fly as high as your kites.", motif: "kite", dates: ["2026-01-14", "2027-01-14", "2028-01-14"] },
  { id: "republic-day", name: "Republic Day", title: "Happy Republic Day", line: "Proud to help families find their place in India.", motif: "tricolour", dates: ["2026-01-26", "2027-01-26", "2028-01-26"] },
  { id: "holi", name: "Holi", title: "Happy Holi", line: "Wishing you a life as colourful as Holi.", motif: "colours", dates: ["2026-03-04", "2027-03-22"] },
  { id: "eid", name: "Eid al-Fitr", title: "Eid Mubarak", line: "May peace and happiness fill your home.", motif: "crescent", dates: ["2026-03-20", "2027-03-10"] },
  { id: "akshaya-tritiya", name: "Akshaya Tritiya", title: "Happy Akshaya Tritiya", line: "An auspicious day to begin something new, like a new home.", motif: "home", dates: ["2026-04-20", "2027-05-09"] },
  { id: "independence-day", name: "Independence Day", title: "Happy Independence Day", line: "Freedom begins with a place to call your own.", motif: "tricolour", dates: ["2026-08-15", "2027-08-15"] },
  { id: "ganesh-chaturthi", name: "Ganesh Chaturthi", title: "Happy Ganesh Chaturthi", line: "May Bappa bless your home with joy and new beginnings.", motif: "flower", dates: ["2026-09-14", "2027-09-04"] },
  { id: "navratri", name: "Navratri", title: "Happy Navratri", line: "Nine nights of joy. Wishing you and your family the very best.", motif: "garba", dates: ["2026-10-11", "2027-09-30"] },
  { id: "dussehra", name: "Dussehra", title: "Happy Dussehra", line: "May goodness win and every new step bring success.", motif: "star", dates: ["2026-10-20", "2027-10-09"] },
  { id: "dhanteras", name: "Dhanteras", title: "Happy Dhanteras", line: "A great day to invest in gold, and in a home.", motif: "coins", dates: ["2026-11-06", "2027-10-27"] },
  { id: "diwali", name: "Diwali", title: "Happy Diwali", line: "May your new home be filled with light.", motif: "diya", dates: ["2026-11-08", "2027-10-29"] },
  { id: "christmas", name: "Christmas", title: "Merry Christmas", line: "Warm wishes to you and everyone at home.", motif: "star", dates: ["2026-12-25", "2027-12-25"] },
  { id: "thank-you", name: "Thank you (any day)", title: "Thank you", line: "For trusting me with one of life's biggest decisions.", motif: "home", dates: [] },
];

export const festivalById = (id: string) => FESTIVALS.find((f) => f.id === id);

/** Festivals ordered by how soon they come, with days left. Undated cards go last. Ones from the last 2 days still count as "today". */
export function upcomingFestivals(now: Date = new Date()) {
  const today = new Date(now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00Z").getTime();
  return FESTIVALS.map((f) => {
    const next = f.dates.map((d) => new Date(d + "T00:00:00Z").getTime()).find((t) => t >= today - 2 * 86400000);
    return { ...f, days: next == null ? null : Math.max(0, Math.round((next - today) / 86400000)), date: next == null ? null : new Date(next) };
  }).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
}
