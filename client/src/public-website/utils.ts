export function isPreviewMode(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/website-preview');
}

export const isPreviewModeStatic = typeof window !== 'undefined' && window.location.pathname.startsWith('/website-preview');

export function getApiUrl(path: string): string {
  if (isPreviewMode()) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}preview=true`;
  }
  return path;
}
