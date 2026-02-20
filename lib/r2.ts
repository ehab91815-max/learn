// lib/r2.ts
export function r2UrlFromKey(r2Key: string) {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL!;
  return `${base.replace(/\/+$/, "")}/${r2Key.replace(/^\/+/, "")}`;
}