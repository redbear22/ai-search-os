/** Parse a fetch Response body as JSON; tolerate plain-text error pages from Next.js. */
export async function parseApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 120);
    throw new Error(
      response.ok
        ? "Server returned an invalid response"
        : `Request failed (${response.status}): ${snippet || response.statusText}`
    );
  }
}
