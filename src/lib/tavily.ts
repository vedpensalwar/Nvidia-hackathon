import { ResearchSource } from './schema';

export async function fetchTavilyResearchSources(
  query: string,
  apiKey: string,
  maxResults: number = 3
): Promise<ResearchSource[]> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Tavily Blocker: TAVILY_API_KEY is not configured on the server. Please add TAVILY_API_KEY to your .env.local file or Vercel Environment Variables.'
    );
  }

  const endpoint = 'https://api.tavily.com/search';

  const payload = {
    api_key: apiKey.trim(),
    query,
    search_depth: 'advanced',
    include_raw_content: true,
    include_answer: false,
    max_results: Math.min(3, maxResults),
  };

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Tavily Timeout Blocker: Request to ${endpoint} timed out after 25 seconds.`);
    }
    throw new Error(`Tavily Network Blocker: Failed to reach ${endpoint}: ${msg}`);
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      errorDetail = await response.text();
    } catch {
      errorDetail = response.statusText;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Tavily Authentication Blocker (HTTP ${response.status}): Invalid TAVILY_API_KEY. Verify your credentials at tavily.com. Server response: ${errorDetail}`
      );
    }

    if (response.status === 429) {
      throw new Error(
        `Tavily Rate Limit Blocker (HTTP 429): Search quota exceeded. Server response: ${errorDetail}`
      );
    }

    throw new Error(
      `Tavily API Blocker (HTTP ${response.status} ${response.statusText}): ${errorDetail}`
    );
  }

  const data = await response.json();

  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.slice(0, 3).map((item: Record<string, unknown>) => ({
    title: String(item.title || 'Untitled Source').slice(0, 250),
    url: String(item.url || '').slice(0, 1000),
    snippet: String(item.content || '').slice(0, 2000),
    content: String(item.raw_content || item.content || '').slice(0, 50000),
  }));
}
