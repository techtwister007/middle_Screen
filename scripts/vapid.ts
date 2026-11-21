import webpush from "web-push";

/** Generates keys for free browser push notifications. Paste into .env / Vercel env. */
const k = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}`);
