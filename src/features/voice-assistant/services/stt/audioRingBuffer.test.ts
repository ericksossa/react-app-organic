import { AudioRingBufferInt16, toInt16Pcm } from './audioRingBuffer';

describe('AudioRingBufferInt16', () => {
  it('reads exact frame after exact fill', () => {
    const ring = new AudioRingBufferInt16(8);
    ring.push(new Int16Array([1, 2, 3, 4]));

    const frame = ring.readFrame(4);

    expect(Array.from(frame ?? [])).toEqual([1, 2, 3, 4]);
    expect(ring.getAvailableSamples()).toBe(0);
  });

  it('drops oldest samples on overflow', () => {
    const ring = new AudioRingBufferInt16(6);
    ring.push(new Int16Array([1, 2, 3, 4]));
    const dropped = ring.push(new Int16Array([5, 6, 7, 8]));

    expect(dropped).toBe(2);
    expect(Array.from(ring.readFrame(6) ?? [])).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it('keeps partial data until full frame exists', () => {
    const ring = new AudioRingBufferInt16(10);
    ring.push(new Int16Array([10, 11, 12]));
    expect(ring.readFrame(4)).toBeNull();

    ring.push(new Int16Array([13]));
    expect(Array.from(ring.readFrame(4) ?? [])).toEqual([10, 11, 12, 13]);
  });
});

describe('toInt16Pcm', () => {
  it('clamps and rounds float values safely', () => {
    const pcm = toInt16Pcm([1.2, -1.7, 40000, -40000]);
    expect(Array.from(pcm)).toEqual([1, -2, 32767, -32768]);
  });

  it('keeps already-valid int16 values as is', () => {
    const pcm = toInt16Pcm([0, 1, -2, 32767, -32768]);
    expect(Array.from(pcm)).toEqual([0, 1, -2, 32767, -32768]);
  });
});
