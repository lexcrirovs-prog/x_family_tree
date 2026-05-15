import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  lang?: string;
  onResult: (text: string) => void;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { isFinal: boolean; [key: number]: { transcript: string } }[] & { length: number } }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionClass(): (new () => SpeechRecognitionInstance) | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
      .webkitSpeechRecognition
  );
}

export function useSpeechToText({ lang = 'ru-RU', onResult }: Options) {
  const RecognitionClass = getRecognitionClass();
  const supported = Boolean(RecognitionClass);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const start = useCallback(() => {
    if (!RecognitionClass) return;
    const rec = new RecognitionClass();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          text += result[0]?.transcript ?? '';
        }
      }
      if (text.trim()) onResultRef.current(text.trim());
    };
    rec.onerror = (err) => {
      console.warn('SpeechRecognition error', err);
      setIsRecording(false);
    };
    rec.onend = () => {
      setIsRecording(false);
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('SpeechRecognition start failed', err);
    }
  }, [RecognitionClass, lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, isRecording, start, stop };
}
