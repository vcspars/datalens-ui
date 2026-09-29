/**
 * Legacy copy via a hidden textarea. The textarea is mounted inside the
 * currently focused element's container (e.g. a Radix dialog) so focus traps
 * don't steal focus and break execCommand('copy').
 */
function legacyCopy(text: string): boolean {
  const active = document.activeElement as HTMLElement | null;
  const host: HTMLElement =
    (active?.closest?.('[role="dialog"], [data-radix-focus-guard]') as HTMLElement | null) ??
    document.body;

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.width = "1px";
  ta.style.height = "1px";
  ta.style.opacity = "0";
  ta.style.pointerEvents = "none";
  host.appendChild(ta);

  try {
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    host.removeChild(ta);
    try {
      active?.focus?.({ preventScroll: true });
    } catch {
      // ignore
    }
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Without a secure context the async API is unavailable; run the legacy copy
  // synchronously so the user-gesture is still valid.
  if (!window.isSecureContext || !navigator.clipboard?.writeText) {
    return legacyCopy(text);
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Permission / focus issue — fall back to the legacy approach.
    return legacyCopy(text);
  }
}
