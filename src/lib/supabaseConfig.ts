export function getAuthRedirectUrl(configuredRedirectUrl: string | undefined, origin: string | undefined): string | undefined {
  const configured = configuredRedirectUrl?.trim();
  if (configured) return configured;

  const currentOrigin = origin?.trim();
  return currentOrigin || undefined;
}
