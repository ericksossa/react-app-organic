jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({
    loop: false,
    muted: true,
    playbackRate: 1,
    pause: jest.fn(),
    play: jest.fn(),
    currentTime: 0
  }),
  VideoView: 'VideoView'
}));

import { statusLabelCopy } from '../VoiceOrbScreen';

describe('statusLabelCopy', () => {
  it('devuelve copys en español según estado', () => {
    expect(statusLabelCopy('listening' as any)).toBe('Escuchando...');
    expect(statusLabelCopy('processing' as any)).toBe('Procesando...');
    expect(statusLabelCopy('review' as any)).toBe('Revisa la transcripción');
    expect(statusLabelCopy('error' as any)).toBe('Ocurrió un error');
    expect(statusLabelCopy('idle' as any)).toBe('Listo para escucharte');
  });
});
