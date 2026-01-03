import type { NextRequest } from 'next/server';

export function getBaseUrl(request: NextRequest): string {
  // Prefer explicit config when provided
  const configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (configured && configured.trim()) {
    return configured.replace(/\/+$/, '');
  }

  // Fall back to request headers (works on Vercel/proxies)
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');

  const host = forwardedHost || request.headers.get('host');
  if (!host) {
    return 'http://localhost:3000';
  }

  const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : 'https';
  return `${proto}://${host}`;
}
