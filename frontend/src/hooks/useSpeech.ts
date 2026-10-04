import { useCallback, useRef, useState } from 'react';

// Browser speech recognition (Chrome/Edge/Safari). The mic button is hidden where it is unsupported.
type Recognition = {
  lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void;
};
const Ctor: (new () => Recognition) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
       (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition)
    : undefined;

export function useSpeech(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const supported = Boolean(Ctor);

  const toggle = useCallback(() => {
    if (!Ctor) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new Ctor();
    r.lang = 'en-IN';
    r.interimResults = false;
    r.onresult = (e) => onText(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }, [listening, onText]);

  return { supported, listening, toggle };
}
