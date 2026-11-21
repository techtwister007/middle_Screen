export async function resolve(specifier, context, next) {
  if (specifier === "@whiskeysockets/baileys") return { url: new URL("./fake-baileys.mjs", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
