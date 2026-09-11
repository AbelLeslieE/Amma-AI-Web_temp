export type AudioPort = Pick<
  HTMLAudioElement,
  | 'src'
  | 'playbackRate'
  | 'currentTime'
  | 'onended'
  | 'onerror'
  | 'play'
  | 'pause'
  | 'load'
>;
export type PlaybackResult =
  | 'ended'
  | 'cancelled'
  | 'blocked'
  | 'error'
  | 'timeout';
// One owner for playback, including replay/stop/reset races and rejected play promises.
export class AmmaAudioPlayer {
  private settle: ((result: PlaybackResult) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private version = 0;
  private readonly element: AudioPort;
  private readonly timeoutMs: number;
  constructor(element: AudioPort, timeoutMs = 60000) {
    this.element = element;
    this.timeoutMs = timeoutMs;
  }
  stop() {
    this.version++;
    this.element.onended = null;
    this.element.onerror = null;
    this.element.pause();
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const settle = this.settle;
    this.settle = null;
    settle?.('cancelled');
  }
  play(src: string, speed: number): Promise<PlaybackResult> {
    this.stop();
    const version = this.version;
    return new Promise((resolve) => {
      this.settle = resolve;
      const finish = (result: PlaybackResult) => {
        if (version !== this.version) return;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.element.onended = null;
        this.element.onerror = null;
        if (result !== 'ended') this.element.pause();
        this.settle = null;
        resolve(result);
      };
      this.element.onended = () => finish('ended');
      this.element.onerror = () => finish('error');
      this.element.src = src;
      this.element.playbackRate = Math.min(1.25, Math.max(0.75, speed));
      this.timer = setTimeout(() => finish('timeout'), this.timeoutMs);
      try {
        this.element.load();
        void this.element
          .play()
          .catch((e) =>
            finish(e?.name === 'NotAllowedError' ? 'blocked' : 'error'),
          );
      } catch {
        finish('error');
      }
    });
  }
}
