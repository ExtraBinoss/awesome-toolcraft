export interface BlobTrackBlob {
  x: number;
  y: number;
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface BlobTrackTrack extends BlobTrackBlob {
  id: number;
  vx: number;
  vy: number;
  age: number;
}

export interface BlobTrackTrackerConfig {
  minArea: number;
  maxArea: number;
  maxBlobs: number;
  motionSmoothing: number;
  matchDistance: number;
}

export class BlobTrackCpuTracker {
  private width: number;
  private height: number;
  private nextId = 1;
  private tracks: BlobTrackTrack[] = [];
  private binary: Uint8Array;
  private labels: Int32Array;
  private stack: Int32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.binary = new Uint8Array(width * height);
    this.labels = new Int32Array(width * height);
    this.stack = new Int32Array(width * height);
  }

  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.binary = new Uint8Array(width * height);
    this.labels = new Int32Array(width * height);
    this.stack = new Int32Array(width * height);
    this.tracks = [];
  }

  reset(): void {
    this.tracks = [];
    this.nextId = 1;
    this.labels.fill(0);
    this.binary.fill(0);
  }

  detect(pixels: Uint8Array, config: BlobTrackTrackerConfig): readonly BlobTrackTrack[] {
    this.labels.fill(0);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const pixel = pixels[(y * this.width + x) * 4] ?? 0;
        this.binary[y * this.width + x] = pixel > 127 ? 1 : 0;
      }
    }

    const detections: BlobTrackBlob[] = [];
    let label = 1;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = y * this.width + x;
        if (!this.binary[index] || this.labels[index]) continue;
        const blob = this.flood(index, label);
        label += 1;
        if (blob.area >= config.minArea && blob.area <= config.maxArea) detections.push(blob);
      }
    }

    detections.sort((a, b) => b.area - a.area);
    this.updateTracks(detections.slice(0, config.maxBlobs), config);
    return this.tracks;
  }

  getTracks(): readonly BlobTrackTrack[] {
    return this.tracks;
  }

  private flood(start: number, label: number): BlobTrackBlob {
    let pointer = 0;
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = this.width;
    let minY = this.height;
    let maxX = 0;
    let maxY = 0;
    this.labels[start] = label;
    this.stack[pointer] = start;
    pointer += 1;

    while (pointer > 0) {
      pointer -= 1;
      const index = this.stack[pointer] ?? 0;
      const x = index % this.width;
      const y = Math.floor(index / this.width);
      area += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      pointer = this.pushNeighbor(index - 1, x > 0, label, pointer);
      pointer = this.pushNeighbor(index + 1, x + 1 < this.width, label, pointer);
      pointer = this.pushNeighbor(index - this.width, y > 0, label, pointer);
      pointer = this.pushNeighbor(index + this.width, y + 1 < this.height, label, pointer);
    }

    return {
      x: sumX / area,
      y: sumY / area,
      area,
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  private pushNeighbor(index: number, inside: boolean, label: number, pointer: number): number {
    if (!inside || !this.binary[index] || this.labels[index]) return pointer;
    this.labels[index] = label;
    this.stack[pointer] = index;
    return pointer + 1;
  }

  private updateTracks(detections: BlobTrackBlob[], config: BlobTrackTrackerConfig): void {
    const used = new Set<number>();
    const next: BlobTrackTrack[] = [];
    const smoothing = config.motionSmoothing;
    for (const detection of detections) {
      let best = -1;
      let bestDistance = Infinity;
      for (let index = 0; index < this.tracks.length; index += 1) {
        if (used.has(index)) continue;
        const track = this.tracks[index];
        if (!track) continue;
        const distance = Math.hypot(detection.x - track.x - track.vx, detection.y - track.y - track.vy);
        if (distance < bestDistance && distance < config.matchDistance) {
          best = index;
          bestDistance = distance;
        }
      }

      const previous = best >= 0 ? this.tracks[best] : undefined;
      if (!previous) {
        next.push({ ...detection, id: this.nextId, vx: 0, vy: 0, age: 0 });
        this.nextId += 1;
        continue;
      }

      used.add(best);
      const blend = 1 - smoothing;
      const x = previous.x * smoothing + detection.x * blend;
      const y = previous.y * smoothing + detection.y * blend;
      next.push({
        ...detection,
        id: previous.id,
        x,
        y,
        vx: x - previous.x,
        vy: y - previous.y,
        minX: previous.minX * smoothing + detection.minX * blend,
        maxX: previous.maxX * smoothing + detection.maxX * blend,
        minY: previous.minY * smoothing + detection.minY * blend,
        maxY: previous.maxY * smoothing + detection.maxY * blend,
        width: previous.width * smoothing + detection.width * blend,
        height: previous.height * smoothing + detection.height * blend,
        age: previous.age + 1,
      });
    }
    this.tracks = next;
  }
}
