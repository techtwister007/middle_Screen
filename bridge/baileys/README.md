# Baileys bridge (testing only)

Connects a **spare** WhatsApp number to the app so you can test the real WhatsApp experience for free.
Production uses **Chatsync** (official API) — this bridge is not needed there.

```bash
# 1. In the app's .env:   WA_PROVIDER=baileys   BRIDGE_SECRET=<same secret as below>   WA_NUMBER=<spare number digits>
# 2. Then:
cd bridge/baileys
npm install
cp .env.example .env      # set APP_URL and BRIDGE_SECRET
npm start                 # scan the QR with the spare phone: WhatsApp → Linked devices → Link a device
```

Message the spare number from your own phone: `hi` → onboarding starts.

* Session is saved in `./auth` (git-ignored). Delete it to re-link.
* Keep the laptop on while testing; messages sent while it's off are delivered when it reconnects.
* ⚠️ Unofficial: WhatsApp may ban numbers automated this way. Low volume, spare SIM only.
