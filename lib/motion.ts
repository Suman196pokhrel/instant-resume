/** For JS-driven motion (artificial delays, smooth scrolling); CSS motion uses the global rule in globals.css. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
