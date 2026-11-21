import { customAlphabet } from "nanoid";

// No ambiguous characters (0/O, 1/l/I) so codes are easy to read aloud and type.
const lower = "23456789abcdefghijkmnpqrstuvwxyz";
const upper = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const id = customAlphabet(lower, 16);
/** Short link code for /p/{code} and /c/{code}. */
export const shareCode = customAlphabet(lower, 6);
/** Listing reference used in bot commands, e.g. "K7Q2M". */
export const listingRef = customAlphabet(upper, 5);
/** 6-char verification code sent via WhatsApp. */
export const verifyCode = customAlphabet(upper, 6);
export const token = customAlphabet(lower + upper, 40);
