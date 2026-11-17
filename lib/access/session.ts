import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

// Password lock session (SPEC §4.1). Stateless: the cookie is an expiry time signed with HMAC-SHA-256 under a key
// derived from ./data/session-secret and the scrypt hash of APP_PASSWORD, so changing the password signs everyone out.
export const SESSION_COOKIE = "ir_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // seconds

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

async function loadSecret(): Promise<Buffer> {
  const dir = join(process.cwd(), "data");
  const file = join(dir, "session-secret");
  await mkdir(dir, { recursive: true });
  // Write a temp file, then link it into place: link fails atomically if another process got there first.
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}`;
  await writeFile(tmp, randomBytes(32), { mode: 0o600 });
  try {
    await link(tmp, file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  } finally {
    await unlink(tmp);
  }
  return readFile(file);
}

type Keys = { secret: Buffer; hash: Buffer; key: Buffer };
let cached: { password: string; keys: Promise<Keys> } | undefined;

function keys(password: string): Promise<Keys> {
  if (cached?.password !== password) {
    const keys = (async () => {
      const secret = await loadSecret();
      const hash = await scryptAsync(password, secret, 64);
      return { secret, hash, key: createHmac("sha256", secret).update(hash).digest() };
    })();
    keys.catch(() => (cached = undefined));
    cached = { password, keys };
  }
  return cached.keys;
}

const mac = (key: Buffer, exp: string) => createHmac("sha256", key).update(exp).digest();

export async function signSession(now = Date.now()): Promise<string> {
  const password = process.env.APP_PASSWORD;
  if (!password) throw new Error("signSession needs APP_PASSWORD");
  const exp = String(now + SESSION_MAX_AGE * 1000);
  return `${exp}.${mac((await keys(password)).key, exp).toString("base64url")}`;
}

export async function verifySession(value: string | undefined, now = Date.now()): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  const [exp, sig, ...rest] = (value ?? "").split(".");
  if (!password || !sig || rest.length || !/^\d+$/.test(exp)) return false;
  const given = Buffer.from(sig, "base64url");
  const want = mac((await keys(password)).key, exp);
  return given.length === want.length && timingSafeEqual(given, want) && Number(exp) > now;
}

export async function checkPassword(input: string): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return false;
  const { secret, hash } = await keys(password);
  return timingSafeEqual(await scryptAsync(input, secret, 64), hash);
}

/** Cookie attributes for `response.cookies.set`; pass "" and maxAge 0 to clear it. */
export function sessionCookie(value: string, maxAge = SESSION_MAX_AGE) {
  return { name: SESSION_COOKIE, value, httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge };
}
