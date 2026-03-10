export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Preferred: async Clipboard API (best-effort; may throw if blocked by browser/policy)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);

      // Optional verification when allowed (secure context + permission)
      try {
        if (window.isSecureContext && navigator.clipboard.readText) {
          const got = await navigator.clipboard.readText();
          if (got !== text) return false;
        }
      } catch {
        // If we can't read back, still consider writeText a success.
      }

      return true;
    }
  } catch {
    // Fall back to legacy approach
  }

  // Fallback #1 (often works on HTTP): use a 'copy' event handler to set clipboardData
  try {
    let copied = false;
    const onCopy = (e: ClipboardEvent) => {
      try {
        e.clipboardData?.setData("text/plain", text);
        e.preventDefault();
        copied = true;
      } catch {
        // ignore
      }
    };

    document.addEventListener("copy", onCopy);
    const ok = document.execCommand("copy");
    document.removeEventListener("copy", onCopy);

    if (ok && copied) return true;
  } catch {
    // Fall through to textarea method
  }

  // Fallback #2: use a hidden textarea + selection + execCommand('copy')
  try {
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
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);

    // If we can read back, verify (prevents false-positive "Copied")
    try {
      if (ok && window.isSecureContext && navigator.clipboard?.readText) {
        const got = await navigator.clipboard.readText();
        if (got !== text) return false;
      }
    } catch {
      // ignore verification errors
    }

    return ok;
  } catch {
    return false;
  }
}

