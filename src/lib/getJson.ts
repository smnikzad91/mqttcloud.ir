// Client-side GET that never throws: resolves to null on a network error or
// any non-2xx response, so a failing endpoint shows an error state instead of
// crashing the page on `undefined.someField`.
export async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
