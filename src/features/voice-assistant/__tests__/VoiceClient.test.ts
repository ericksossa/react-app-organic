import { VoiceClient } from '../services/VoiceClient';
import { NoopTtsService } from '../services/tts/TtsService';
import { SttProvider } from '../services/stt/types';

const mockRequestMicPermission = jest.fn<Promise<boolean>, any[]>();

jest.mock('../services/permissions', () => ({
  requestMicPermission: (...args: any[]) => mockRequestMicPermission(...args)
}));

function createSttProvider(overrides?: Partial<jest.Mocked<SttProvider>>): jest.Mocked<SttProvider> {
  return {
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => ({ transcript: 'ok' })),
    cancel: jest.fn(async () => undefined),
    isListening: jest.fn(() => false),
    dispose: jest.fn(async () => undefined),
    ...overrides
  };
}

describe('VoiceClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestMicPermission.mockResolvedValue(true);
  });

  it('allows starting again after a completed start/stop cycle', async () => {
    const listening = { value: false };
    const stt = createSttProvider({
      isListening: jest.fn(() => listening.value),
      start: jest.fn(async () => {
        listening.value = true;
      }),
      stop: jest.fn(async () => {
        listening.value = false;
        return { transcript: 'hola' };
      })
    });

    const client = new VoiceClient(stt, new NoopTtsService(), {
      hasRecordAudioPermission: async () => true
    });

    await expect(client.startListening()).resolves.toEqual({ ok: true });
    await expect(client.stopListening()).resolves.toEqual(
      expect.objectContaining({ transcript: 'hola' })
    );
    await expect(client.startListening()).resolves.toEqual({ ok: true });

    expect(stt.start).toHaveBeenCalledTimes(2);
    expect(stt.stop).toHaveBeenCalledTimes(1);
  });

  it('resets internal start lock when permission probe throws, allowing retry', async () => {
    const stt = createSttProvider();
    const client = new VoiceClient(stt, new NoopTtsService(), {
      hasRecordAudioPermission: async () => true
    });

    mockRequestMicPermission
      .mockRejectedValueOnce(new Error('permission_probe_failed'))
      .mockResolvedValueOnce(true);

    await expect(client.startListening()).resolves.toEqual({ ok: false, reason: 'init_error' });
    await expect(client.startListening()).resolves.toEqual({ ok: true });

    expect(stt.start).toHaveBeenCalledTimes(1);
  });
});

