import {
  recognitionTranscript,
  type RecognitionResultLike,
} from './amma-language.ts';

export type MicrophoneAccess =
  | 'unknown'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error';
type Stream = { getTracks(): Array<{ stop(): void }> };

export function microphoneError(
  error: unknown,
): Exclude<MicrophoneAccess, 'unknown' | 'requesting' | 'granted'> {
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'NotSupportedError')
    return 'unavailable';
  return 'error';
}

// Permission probes must release the microphone even if the user closes the
// dialog while the browser's permission prompt is still open.
export class MicrophonePermissionRequest {
  private version = 0;
  private settle: ((value: MicrophoneAccess | 'cancelled') => void) | null =
    null;
  cancel() {
    this.version++;
    this.settle?.('cancelled');
    this.settle = null;
  }
  request(
    capture: () => Promise<Stream>,
  ): Promise<MicrophoneAccess | 'cancelled'> {
    this.cancel();
    const token = this.version;
    return new Promise((resolve) => {
      this.settle = resolve;
      const finish = (state: MicrophoneAccess) => {
        if (token !== this.version) return;
        this.settle = null;
        resolve(state);
      };
      try {
        // Invoke capture synchronously in the button's user gesture.
        void capture().then(
          (stream) => {
            stream.getTracks().forEach((track) => track.stop());
            finish('granted');
          },
          (error) => finish(microphoneError(error)),
        );
      } catch (error) {
        finish(microphoneError(error));
      }
    });
  }
}

export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<RecognitionResultLike> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export class AmmaSpeechSession {
  private active = false;
  private heard = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private finishTimer: ReturnType<typeof setTimeout> | null = null;
  private recognition: Recognition;
  private onTranscript: (final: string, interim: string) => void;
  private onFinish: (text: string, error?: string) => void;
  private maxMs: number;
  private finishMs: number;
  constructor(
    recognition: Recognition,
    callbacks: {
      onTranscript: (final: string, interim: string) => void;
      onFinish: (text: string, error?: string) => void;
    },
    maxMs = 25000,
    finishMs = 1500,
  ) {
    this.recognition = recognition;
    this.onTranscript = callbacks.onTranscript;
    this.onFinish = callbacks.onFinish;
    this.maxMs = maxMs;
    this.finishMs = finishMs;
  }
  start(language: string) {
    this.active = true;
    const r = this.recognition;
    r.lang = language;
    // One utterance avoids repeated automatic microphone restarts on mobile.
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.onresult = (event) => {
      if (!this.active) return;
      const transcript = recognitionTranscript(event.results);
      this.heard = [transcript.final, transcript.interim]
        .filter(Boolean)
        .join(' ')
        .slice(0, 1000);
      this.onTranscript(transcript.final, transcript.interim);
    };
    r.onerror = (event) => this.finish(event.error);
    r.onend = () => this.finish();
    this.timer = setTimeout(() => this.stop(), this.maxMs);
    try {
      r.start();
    } catch {
      this.finish('start-failed');
    }
  }
  stop() {
    if (!this.active || this.finishTimer) return;
    // Some mobile engines do not deliver onend after interruption.
    this.finishTimer = setTimeout(() => this.finish(), this.finishMs);
    try {
      this.recognition.stop();
    } catch {
      this.finish();
    }
  }
  getTranscript() {
    return this.heard;
  }
  cancel() {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.finishTimer) clearTimeout(this.finishTimer);
    this.timer = this.finishTimer = null;
    this.recognition.onresult = null;
    this.recognition.onerror = null;
    this.recognition.onend = null;
    try {
      this.recognition.abort();
    } catch {
      /* Already stopped. */
    }
  }
  private finish(error?: string) {
    if (!this.active) return;
    this.cancel();
    this.onFinish(this.heard, error);
  }
}

export function speechErrorMessage(error: string): string {
  if (error === 'not-allowed' || error === 'service-not-allowed')
    return 'Microphone or speech access is blocked. Open Microphone help to allow access in your browser settings, or type below.';
  if (error === 'language-not-supported')
    return 'This browser’s speech service cannot transcribe this language. Type Malayalam or use your keyboard’s dictation microphone.';
  if (error === 'audio-capture')
    return 'The microphone is unavailable or in use. Close other calls or recording apps, then try again.';
  if (error === 'no-speech')
    return 'No words were captured. Try again, or use your keyboard’s dictation microphone.';
  if (error === 'network')
    return 'The speech service could not connect. Check your connection, or type below.';
  return 'Speech input could not start. On iPhone or iPad, try Safari and check that Siri is enabled. You can also type or use keyboard dictation.';
}
