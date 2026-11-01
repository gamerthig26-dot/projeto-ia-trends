import { TrendItem } from './google-trends';

const SUBREDDITS = ['brasil', 'brdev'];

export async function fetchRedditTrends(): Promise<{ data: TrendItem[]; status: string }> {
  try {
    const items: TrendItem[] = [];

    for (const sub of SUBREDDITS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
          headers: {
            'User-Agent': 'IA-Trends/1.0 (Trend Research Bot)',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) continue;

        const data = await res.json();
        const posts = data?.data?.children ?? [];
        for (const post of posts) {
          const d = post?.data;
          if (!d?.title || d?.stickied) continue;
          items.push({
            title: d.title,
            source: `Reddit r/${sub}`,
            type: 'discussão',
            url: `https://reddit.com${d?.permalink ?? ''}`,
            rawData: {
              score: d?.score ?? 0,
              num_comments: d?.num_comments ?? 0,
              subreddit: sub,
            },
          });
        }
      } catch { /* skip subreddit */ }
    }

    return { data: items.slice(0, 15), status: items.length > 0 ? 'coletado' : 'indisponível' };
  } catch {
    return { data: [], status: 'indisponível' };
  }
}
