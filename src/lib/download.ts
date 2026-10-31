/**
 * Blob download and Web Share helpers (Workstream B, SPEC K10).
 * Never sends anything anywhere: downloads use a local object URL.
 */

/** Trigger a browser download of `blob` as `name`. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.className = 'hidden';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function mimeForName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'zip') return 'application/zip';
  return 'image/jpeg';
}

/** True when the Web Share API can share these files (mostly mobile). */
export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * Share files with the native share sheet. Resolves true when shared, false when
 * the user cancelled or sharing is not possible.
 */
export async function shareFiles(files: File[], title: string): Promise<boolean> {
  if (!canShareFiles(files)) return false;
  try {
    await navigator.share({ files, title });
    return true;
  } catch {
    return false; // AbortError when the user closes the sheet
  }
}
