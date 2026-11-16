/** The /dev/ui component gallery: always in development, in production only with IR_DEV_UI=1 (end-to-end tests). */
export function devUiEnabled(env: { NODE_ENV?: string; IR_DEV_UI?: string } = process.env): boolean {
  return env.NODE_ENV !== "production" || env.IR_DEV_UI === "1";
}
