export interface TtsService {
  speak(text: string): Promise<void>;
  stop(): Promise<void>;
}

export class NoopTtsService implements TtsService {
  async speak(): Promise<void> {
    return;
  }

  async stop(): Promise<void> {
    return;
  }
}
