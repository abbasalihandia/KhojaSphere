import { useEffect, useState } from 'react';
import { ai, type AIStatus } from '../api';

let cached: AIStatus | null = null;

/** Whether Ollama is driving the assistant right now (the app works either way). */
export function useAIStatus(): AIStatus | null {
  const [status, setStatus] = useState<AIStatus | null>(cached);
  useEffect(() => {
    let alive = true;
    ai.status().then((s) => { cached = s; if (alive) setStatus(s); }).catch(() => { /* leave unknown */ });
    return () => { alive = false; };
  }, []);
  return status;
}

export function aiBadge(status: AIStatus | null): string {
  if (!status) return 'Smart search';
  return status.provider === 'ollama' ? 'Powered by Ollama' : 'Smart search · AI model offline';
}
