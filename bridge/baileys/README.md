# WhatsApp bridge (Baileys) — testing & pilot on your laptop

Connects a WhatsApp number to the app through **Linked devices** (like WhatsApp Web). Free, but unofficial —
so it is built to keep the login saved and behave like a careful human to avoid blocks.
Production can switch to **Chatsync** (official API) any time with one env var; no code changes.

## 1. Get a number ready (most important for not getting blocked)
* Use a **dedicated SIM**, not your personal number. Put it in a phone with the **WhatsApp Business** app.
* Set a **business name, profile photo and description** ("PropPulse assistant for property agents").
* **Warm it up 3–5 days**: use it normally — chat with a few people who save the number, join no groups, no bulk messages.
* Keep that phone **charged and online** sometimes; the bridge is a linked device of it.

## 2. Install & link (once)
```powershell
cd bridge\baileys
npm install
copy .env.example .env        # APP_URL and BRIDGE_SECRET (same as the app's .env)
node index.mjs                # scan the QR: WhatsApp Business → Settings → Linked devices → Link a device
```
In the app's `.env`: `WA_PROVIDER=baileys`, `WA_NUMBER=<this number, digits, e.g. 9198xxxxxxxx>`, same `BRIDGE_SECRET`.

The login is saved in `./auth`. Next starts reconnect **without a QR**. A backup is kept in `./auth-backup`
(every 12 h). Never share or commit these folders — they are the WhatsApp login.

## 3. Keep it running (auto-start with Windows)
```powershell
npm install -g pm2 pm2-windows-startup
pm2-startup install
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs proppulse-bridge      # watch it
```
Or just double-click `start-bridge.bat`. Windows: Settings → Power → *Sleep: Never* (when plugged in).

## Built-in protection
| Risk | What the bridge does |
|---|---|
| Logging in again and again | Session saved to disk + backup; reconnects with back-off (2 s → 60 s), no QR needed |
| Two copies running | Lock file — second copy refuses to start; "session replaced" → stops instead of fighting |
| Cold / bulk messaging (top ban reason) | Only replies to people who messaged in the last **24 h**; everything else is refused & logged |
| Bot-like speed | Marks messages read, shows *typing…* (1–4 s by length), ≥1.5 s between messages to one chat |
| Volume spikes | Caps: 12/min, 150/h, 600/day (edit `.env`); excess waits in queue, never dropped |
| Burst after laptop sleep | Ignores messages older than 12 h; replies to the rest at the paced rate |
| Duplicate sends | App hands each message out once (claimed atomically); unacked messages retried after 3 min |
| Decryption retries | Recent sent messages kept for WhatsApp's re-send requests |

## Do / don't
* ✅ Let agents message the bot first (landing page "Start on WhatsApp" link does this).
* ✅ Keep volume organic; raise limits slowly after weeks of clean use.
* ❌ Don't add the bot to groups, don't broadcast, don't message numbers that never wrote to you.
* ❌ Don't run the bridge on two computers with the same `./auth`.
* If WhatsApp ever shows a warning on the phone, stop the bridge for a day and lower the limits.

## Troubleshooting
| Message | Fix |
|---|---|
| `logged this device out` | Delete `./auth`, run again, scan QR. (Or restore `./auth-backup` → `./auth` if it was a crash.) |
| `Another bridge … is already running` | `pm2 list` / close the other window. If none, delete `auth/.bridge.lock`. |
| `inbound → 401` | `BRIDGE_SECRET` differs between app and bridge. |
| Replies don't arrive | App must run with `WA_PROVIDER=baileys`; check `pm2 logs`. |
