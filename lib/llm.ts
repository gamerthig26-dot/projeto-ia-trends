export async function callLLM(prompt: string, systemPrompt?: string): Promise<string> {
  const mode = process.env.LLM_MODE || 'abacus';

  if (mode === 'ollama') {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        prompt: (systemPrompt ? systemPrompt + '\n\n' : '') + prompt,
        stream: false,
        options: { temperature: 0.4, num_predict: 2000 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = await res.json();
    return data?.response ?? '';
  }

  // Abacus AI mode
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) throw new Error('ABACUSAI_API_KEY não configurada');

  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages,
      temperature: 0.4,
      max_tokens: 3000,
    }),
  });
  if (!res.ok) throw new Error(`LLM API error: ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

export function createStreamingLLMRequest(prompt: string, systemPrompt?: string) {
  const mode = process.env.LLM_MODE || 'abacus';

  if (mode === 'ollama') {
    return {
      url: 'http://localhost:11434/api/generate',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({
          model: 'qwen2.5:3b',
          prompt: (systemPrompt ? systemPrompt + '\n\n' : '') + prompt,
          stream: true,
          options: { temperature: 0.4, num_predict: 2000 },
        }),
      },
      parseChunk: (line: string) => {
        try {
          const parsed = JSON.parse(line);
          return parsed?.response ?? '';
        } catch { return ''; }
      },
      isDone: (line: string) => {
        try { return JSON.parse(line)?.done === true; } catch { return false; }
      },
    };
  }

  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) throw new Error('ABACUSAI_API_KEY não configurada');

  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  return {
    url: 'https://apps.abacus.ai/v1/chat/completions',
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages,
        stream: true,
        temperature: 0.4,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    },
    parseChunk: (line: string) => {
      if (!line.startsWith('data: ')) return '';
      const data = line.slice(6);
      if (data === '[DONE]') return '';
      try {
        const parsed = JSON.parse(data);
        return parsed?.choices?.[0]?.delta?.content ?? '';
      } catch { return ''; }
    },
    isDone: (line: string) => {
      return line.startsWith('data: [DONE]');
    },
  };
}
