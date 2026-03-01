export class AudioRingBufferInt16 {
  private readonly buffer: Int16Array;
  private head = 0;
  private tail = 0;
  private size = 0;

  constructor(private readonly capacitySamples: number) {
    if (!Number.isFinite(capacitySamples) || capacitySamples <= 0) {
      throw new Error('AudioRingBufferInt16 capacity must be > 0');
    }
    this.buffer = new Int16Array(Math.floor(capacitySamples));
  }

  clear() {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  getCapacitySamples(): number {
    return this.buffer.length;
  }

  getAvailableSamples(): number {
    return this.size;
  }

  push(samples: Int16Array): number {
    if (!samples.length) return 0;

    if (samples.length >= this.buffer.length) {
      const keep = samples.subarray(samples.length - this.buffer.length);
      this.buffer.set(keep);
      const dropped = this.size + (samples.length - this.buffer.length);
      this.head = 0;
      this.tail = 0;
      this.size = this.buffer.length;
      return dropped;
    }

    let dropped = 0;
    const overflow = this.size + samples.length - this.buffer.length;
    if (overflow > 0) {
      this.head = (this.head + overflow) % this.buffer.length;
      this.size -= overflow;
      dropped += overflow;
    }

    const firstChunk = Math.min(samples.length, this.buffer.length - this.tail);
    this.buffer.set(samples.subarray(0, firstChunk), this.tail);
    const remaining = samples.length - firstChunk;
    if (remaining > 0) {
      this.buffer.set(samples.subarray(firstChunk), 0);
    }

    this.tail = (this.tail + samples.length) % this.buffer.length;
    this.size += samples.length;
    return dropped;
  }

  readFrame(frameLength: number): Int16Array | null {
    if (!Number.isFinite(frameLength) || frameLength <= 0) return null;
    const len = Math.floor(frameLength);
    if (this.size < len) return null;

    const out = new Int16Array(len);
    const firstChunk = Math.min(len, this.buffer.length - this.head);
    out.set(this.buffer.subarray(this.head, this.head + firstChunk), 0);
    const remaining = len - firstChunk;
    if (remaining > 0) {
      out.set(this.buffer.subarray(0, remaining), firstChunk);
    }

    this.head = (this.head + len) % this.buffer.length;
    this.size -= len;
    return out;
  }

  readFrames(frameLength: number, maxFrames: number): Int16Array[] {
    if (maxFrames <= 0) return [];
    const frames: Int16Array[] = [];
    while (frames.length < maxFrames) {
      const frame = this.readFrame(frameLength);
      if (!frame) break;
      frames.push(frame);
    }
    return frames;
  }
}

export function toInt16Pcm(frame: number[]): Int16Array {
  const out = new Int16Array(frame.length);
  for (let i = 0; i < frame.length; i += 1) {
    const value = frame[i];
    if (Number.isInteger(value) && value >= -32768 && value <= 32767) {
      out[i] = value;
      continue;
    }

    const rounded = Math.round(value);
    out[i] = rounded > 32767 ? 32767 : rounded < -32768 ? -32768 : rounded;
  }
  return out;
}
