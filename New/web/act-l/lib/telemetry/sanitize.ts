export function sanitizeString(input: string): string {
  return input
    .replace(/[A-Z]:\\Users\\[^\\]+/gi, '<USER>')
    .replace(/\/Users\/[^/]+/g, '<USER>')
    .replace(/\/home\/[^/]+/g, '<USER>')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<EMAIL>')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <TOKEN>');
}

export function sanitizeProperties(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (/password|token|secret|authorization|email/i.test(key)) continue;
    if (typeof value === 'string') {
      out[key] = sanitizeString(value).slice(0, 500);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 20).map((v) =>
        typeof v === 'string' ? sanitizeString(v).slice(0, 200) : v
      );
    }
  }
  return out;
}
