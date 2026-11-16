export async function register() {
  // Node-only: the startup check exits the process, which the Edge runtime can't do.
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}
