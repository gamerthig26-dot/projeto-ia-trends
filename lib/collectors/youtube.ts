import { TrendItem } from './google-trends';

export async function fetchYouTubeTrends(): Promise<{ data: TrendItem[]; status: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      'https://www.youtube.com/feeds/videos.xml?chart=mostpopular&regionCode=BR&hl=pt&gl=BR',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/xml, text/xml, */*',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return { data: [], status: 'indisponível' };

    const xml = await res.text();
    const items: TrendItem[] = [];

    const entryRegex = /<entry>(.*?)<\/entry>/gs;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const titleMatch = block.match(/<title>(.*?)<\/title>/);
      const linkMatch = block.match(/<link[^>]*href="(.*?)"/); 
      const authorMatch = block.match(/<name>(.*?)<\/name>/);
      const title = titleMatch?.[1] ?? '';
      if (title) {
        items.push({
          title,
          source: 'YouTube',
          type: 'vídeo viral',
          url: linkMatch?.[1] ?? '',
          rawData: { autor: authorMatch?.[1] ?? '' },
        });
      }
      if (items.length >= 15) break;
    }

    return { data: items, status: items.length > 0 ? 'coletado' : 'parcial' };
  } catch {
    return { data: [], status: 'indisponível' };
  }
}
