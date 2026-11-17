/* Where visitor feedback goes (see feedback-worker/README.md).
   The Cloudflare Worker in feedback-worker/ serves this demo too, hence the relative path.
   Opened from disk (file://) nothing is sent: feedback stays on the device and is exported from
   Demo controls. Neither value is a secret: the Worker checks everything itself. */
window.IR_FEEDBACK = {
  endpoint: '/feedback',
  turnstileSiteKey: '0x4AAAAAAGE8jbH9cL1753gz',// Cloudflare Turnstile site key (public, safe to commit)
};
