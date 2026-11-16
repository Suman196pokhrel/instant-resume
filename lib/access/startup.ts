// Startup safety check (SPEC §4.1): never serve personal data beyond this computer without the password lock.
export const MIN_PASSWORD_LENGTH = 12;

export function isLoopback(host: string | undefined): boolean {
  const h = (host ?? "").trim().toLowerCase().replace(/^\[(.*)\]$/, "$1");
  return h === "" || h === "localhost" || h === "::1" || /^127(\.\d{1,3}){3}$/.test(h);
}

/** Returns an error message when the server must not start, or null when the setup is safe. */
export function checkStartup(env: { HOST?: string; APP_PASSWORD?: string }): string | null {
  const password = env.APP_PASSWORD;
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return `APP_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters. Choose a longer password and restart.`;
  }
  if (!isLoopback(env.HOST) && !password) {
    return `HOST is set to "${env.HOST}", which lets other devices connect, but APP_PASSWORD is not set. Set APP_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) and serve over HTTPS, or unset HOST to stay on this computer.`;
  }
  return null;
}
