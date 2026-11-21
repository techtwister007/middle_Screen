import "dotenv/config";
import sharp from "sharp";

/**
 * Demo data for local testing / sales demos. Drives the REAL bot through the WhatsApp simulator,
 * so it exercises the same code paths as production. Requires the app running with DEV_TOOLS=true:
 *   npm run dev      (in another terminal)
 *   npm run db:seed
 * Then log in at /app/login → Developer login → phone 9800000001.
 */
const APP = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const KEY = process.env.CRON_SECRET ?? "dev-cron";
const AGENT = "919800000001";

async function wa(from: string, body: Record<string, unknown> | string) {
  const data = typeof body === "string" ? { type: "text", text: body } : body;
  const r = await fetch(`${APP}/api/dev/wa`, { method: "POST", headers: { "Content-Type": "application/json", "x-dev-key": KEY }, body: JSON.stringify({ from, ...data }) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()} — is the app running with DEV_TOOLS=true?`);
  return ((await r.json()) as { replies: string[] }).replies;
}

async function photo(label: string, color: string) {
  const svg = `<svg width="1400" height="1000" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#1c1917"/></linearGradient></defs><rect width="1400" height="1000" fill="url(#g)"/><text x="90" y="880" font-family="Arial" font-size="90" fill="white" fill-opacity="0.85">${label}</text></svg>`;
  return (await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer()).toString("base64");
}

const listings = [
  { text: "3 BHK flat in Gotri, Vadodara. 1450 sq ft, fully furnished, 5th floor of 12, lift, gym, covered parking, east facing. 95 lakh negotiable", rooms: [["Living room", "#a16207"], ["Kitchen", "#0f766e"], ["Master bedroom", "#7c3aed"], ["Balcony view", "#0369a1"]] },
  { text: "2 BHK semi furnished flat for rent in Alkapuri Vadodara, 1100 sqft, 2 bathrooms, 22k per month, deposit 60k, ready to move", rooms: [["Living room", "#be123c"], ["Bedroom", "#15803d"]] },
  { text: "4 BHK villa in Vasna Bhayli road Vadodara, 3200 sq ft, 300 sq yd plot, fully furnished, garden, 2 car parking, 2.1 cr", rooms: [["Front elevation", "#b45309"], ["Garden", "#166534"], ["Living", "#1e3a8a"]] },
  { text: "Commercial shop for sale in Akota, Vadodara, 450 sq ft, ground floor, main road, 65 lakh", rooms: [["Shop front", "#334155"]] },
];

async function main() {
  console.log("Seeding demo agent", AGENT);
  await wa(AGENT, "hi");
  await wa(AGENT, "Rakesh Sharma");
  await wa(AGENT, "Sharma Properties");
  await wa(AGENT, "skip");
  await wa(AGENT, "yes");
  const refs: string[] = [];
  for (const l of listings) {
    for (const [label, color] of l.rooms) await wa(AGENT, { type: "image", media: { base64: await photo(label, color), mime: "image/jpeg" } });
    await wa(AGENT, l.text);
    const done = (await wa(AGENT, "done")).join("\n");
    const ref = done.match(/Ref \*([A-Z0-9]{5})\*/)?.[1];
    if (ref) refs.push(ref);
    await wa(AGENT, "1");
  }
  console.log("Listings:", refs.join(", "));
  const share = await wa(AGENT, `share ${refs[0]} to Priya Patel 9876500001`);
  await wa(AGENT, `share ${refs[1]} to Amit Shah 9876500002`);
  await wa(AGENT, { type: "contact", contact: { name: "Neha Joshi", phone: "9876500003" } });
  console.log(share.join("\n"));
  console.log(`\n✔ Done. Log in: ${APP}/app/login → Developer login → phone 9800000001`);
  console.log(`  Admin: ${APP}/admin (password = ADMIN_PASSWORD)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
