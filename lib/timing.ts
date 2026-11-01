export interface TimingResult {
  totalWords: number;
  numScenes: number;
  numVisualActions: number;
  durationSeconds: number;
  isValid: boolean;
  message: string;
}

export function calculateScriptTiming(
  scenes: Array<{ narration?: string; visualAction?: boolean }>
): TimingResult {
  const WORDS_PER_MINUTE = 130;
  let totalWords = 0;
  let numVisualActions = 0;

  for (const scene of scenes ?? []) {
    const words = (scene?.narration ?? '').split(/\s+/).filter((w: string) => w.length > 0).length;
    totalWords += words;
    if (scene?.visualAction) numVisualActions++;
  }

  const numScenes = scenes?.length ?? 0;
  const speakingTime = (totalWords / WORDS_PER_MINUTE) * 60;
  const pauseTime = numScenes * 0.5;
  const actionTime = numVisualActions * 1.0;
  const durationSeconds = Math.round((speakingTime + pauseTime + actionTime) * 10) / 10;

  const isValid = durationSeconds >= 20 && durationSeconds <= 30;
  let message = '';
  if (durationSeconds < 20) message = 'Roteiro muito curto. Adicione mais detalhes ou pause o CTA.';
  else if (durationSeconds > 30) message = 'Roteiro muito longo. Reduza o texto da narração.';
  else message = 'Duração dentro do intervalo ideal (20-30s).';

  return { totalWords, numScenes, numVisualActions, durationSeconds, isValid, message };
}
