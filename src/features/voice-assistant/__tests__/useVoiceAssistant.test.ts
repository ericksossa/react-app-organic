import { act, renderHook } from '@testing-library/react-native';
import { useVoiceAssistant } from '../state/useVoiceAssistant';
import { VoiceClient } from '../services/VoiceClient';
import { SttProvider } from '../services/stt/types';
import { NoopTtsService } from '../services/tts/TtsService';

type MockStt = jest.Mocked<SttProvider>;

function createMockClient(sttOverrides?: Partial<MockStt>) {
  const stt: MockStt = {
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => ({ transcript: 'busca tomate organico' })),
    cancel: jest.fn(async () => undefined),
    isListening: jest.fn(() => false),
    dispose: jest.fn(async () => undefined),
    ...sttOverrides
  };

  const client = new VoiceClient(stt, new NoopTtsService(), {
    hasRecordAudioPermission: async () => true
  });

  return { client, stt };
}

describe('useVoiceAssistant', () => {
  it('flujo startListening -> stopListening -> success', async () => {
    const onSearchProducts = jest.fn();
    const { client, stt } = createMockClient({
      isListening: jest.fn(() => true),
      stop: jest.fn(async () => ({ transcript: 'busca tomate organico' }))
    });

    const { result } = renderHook(() =>
      useVoiceAssistant({
        client,
        actions: {
          onSearchProducts,
          onAddToCart: jest.fn()
        }
      })
    );

    await act(async () => {
      await result.current.beginListening();
    });

    expect(result.current.status).toBe('listening');
    expect(stt.start).toHaveBeenCalled();

    await act(async () => {
      await result.current.stopListeningAndProcess();
    });

    expect(onSearchProducts).toHaveBeenCalled();
    expect(result.current.status).toBe('success');
  });

  it('maneja permiso denegado', async () => {
    const { client } = createMockClient();
    const deniedClient = new VoiceClient(
      {
        start: jest.fn(async () => undefined),
        stop: jest.fn(async () => ({ transcript: '' })),
        cancel: jest.fn(async () => undefined),
        isListening: jest.fn(() => false),
        dispose: jest.fn(async () => undefined)
      },
      new NoopTtsService(),
      {
        hasRecordAudioPermission: async () => false
      }
    );

    const { result } = renderHook(() =>
      useVoiceAssistant({
        client: deniedClient,
        actions: {
          onSearchProducts: jest.fn(),
          onAddToCart: jest.fn()
        }
      })
    );

    await act(async () => {
      await result.current.beginListening();
    });

    expect(result.current.status).toBe('permission_denied');
    void client;
  });

  it('maneja error de STT en stop', async () => {
    const { client } = createMockClient({
      isListening: jest.fn(() => true),
      stop: jest.fn(async () => {
        throw new Error('stt_failed');
      })
    });

    const { result } = renderHook(() =>
      useVoiceAssistant({
        client,
        actions: {
          onSearchProducts: jest.fn(),
          onAddToCart: jest.fn()
        }
      })
    );

    await act(async () => {
      await result.current.beginListening();
    });

    await act(async () => {
      await result.current.stopListeningAndProcess();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();
  });

  it('permite cancelación de escucha', async () => {
    const { client, stt } = createMockClient({
      isListening: jest.fn(() => true)
    });

    const { result } = renderHook(() =>
      useVoiceAssistant({
        client,
        actions: {
          onSearchProducts: jest.fn(),
          onAddToCart: jest.fn()
        }
      })
    );

    await act(async () => {
      await result.current.beginListening();
    });

    await act(async () => {
      await result.current.cancelListening();
    });

    expect(stt.cancel).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });
});
