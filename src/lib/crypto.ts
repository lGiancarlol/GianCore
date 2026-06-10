/**
 * AES-256-GCM encryption for provider credentials.
 * Key is derived from PROVIDER_SECRETS_KEY env var (must be 32 bytes hex or base64).
 */

const ALG = "AES-GCM";
const KEY_ENV = "PROVIDER_SECRETS_KEY";

function getKeyMaterial(): string {
  const k = process.env[KEY_ENV];
  if (!k) throw new Error(`[crypto] ${KEY_ENV} is not set`);
  return k;
}

async function importKey(raw: string): Promise<CryptoKey> {
  // Accept hex (64 chars) or base64 (44 chars) — pad/trim to 32 bytes
  let bytes: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    bytes = new Uint8Array(raw.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  } else {
    const bin = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    bytes = bytes.slice(0, 32);
  }
  return crypto.subtle.importKey("raw", bytes, ALG, false, ["encrypt", "decrypt"]);
}

export async function encryptCredentials(plain: Record<string, string>): Promise<string> {
  const key = await importKey(getKeyMaterial());
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(JSON.stringify(plain));
  const ct  = await crypto.subtle.encrypt({ name: ALG, iv }, key, enc);
  // Store as base64(iv):base64(ciphertext)
  const toB64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
  return `${toB64(iv.buffer)}:${toB64(ct)}`;
}

export async function decryptCredentials(cipher: string): Promise<Record<string, string>> {
  const [ivB64, ctB64] = cipher.split(":");
  const fromB64 = (s: string) => {
    const bin = atob(s);
    const b   = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  };
  const key = await importKey(getKeyMaterial());
  const pt  = await crypto.subtle.decrypt(
    { name: ALG, iv: fromB64(ivB64) },
    key,
    fromB64(ctB64),
  );
  return JSON.parse(new TextDecoder().decode(pt));
}
