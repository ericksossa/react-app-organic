export type SttStartOptions = {
  onPartial?: (text: string) => void;
};

export type SttResult = {
  transcript: string;
  noFrames?: boolean;
  noFramesReason?: string;
  finalRhinoIntent?: string;
  finalRhinoUnderstood?: boolean;
  finalRhinoSlots?: Record<string, string>;
  debug?: Record<string, unknown>;
};

export interface SttProvider {
  start(options?: SttStartOptions): Promise<void>;
  stop(): Promise<SttResult>;
  cancel(): Promise<void>;
  isListening(): boolean;
  dispose(): Promise<void>;
}
