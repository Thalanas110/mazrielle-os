const CLEAR_DELAY_MS = 30_000;

let lastCopiedText: string | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export async function copySensitiveText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  lastCopiedText = text;
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => { void clearSensitiveClipboard(); }, CLEAR_DELAY_MS);
}

export async function clearSensitiveClipboard(): Promise<void> {
  if (!lastCopiedText) return;
  const copiedText = lastCopiedText;
  lastCopiedText = null;
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  try {
    if ((await navigator.clipboard.readText()) === copiedText) await navigator.clipboard.writeText('');
  } catch {
    // Clipboard read/write permissions vary by WebView and operating system.
  }
}
