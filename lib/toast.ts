import { toast as sonner } from "sonner";

/** onClose: the toast went away, by timing out or being dismissed (it also runs after an action is used). */
type ToastOptions = { kind?: "error"; action?: { label: string; onClick: () => void }; onClose?: () => void };

/** SPEC §11.5: 3.2 s, or 6 s with an action so there's time to use it. Same shape as the mock's toast(). */
export function toast(message: string, { kind, action, onClose }: ToastOptions = {}) {
  const options = { duration: action ? 6000 : 3200, action, onAutoClose: onClose, onDismiss: onClose };
  return kind === "error" ? sonner.error(message, options) : sonner(message, options);
}
