const BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary';

export async function fetchWikiSummary(title) {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(title)}`, {
      headers: { 'User-Agent': 'Recall-StudyApp/1.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.extract ?? null;
  } catch {
    return null;
  }
}
