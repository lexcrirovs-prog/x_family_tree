export function getAuthRedirectUrl(origin: string, basePath = import.meta.env.BASE_URL): string {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return new URL(normalizedBase, origin).toString();
}
