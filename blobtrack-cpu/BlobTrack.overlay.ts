import type { BlobTrackTrack } from "./BlobTrack.cpu";
import type { BlobTrackConfig } from "./BlobTrack.definitions";

export function drawBlobTrackOverlay(
  ctx: CanvasRenderingContext2D,
  tracks: readonly BlobTrackTrack[],
  config: BlobTrackConfig,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.font = "10px monospace";
  if (config.connections) drawConnections(ctx, tracks, config);
  if (config.trails) drawTrail(ctx, tracks, config);
  ctx.strokeStyle = config.outlineColor;
  ctx.fillStyle = config.outlineColor;
  ctx.lineWidth = config.thickness;
  for (const track of tracks) {
    if (config.brackets) drawBracket(ctx, track.minX, track.minY, track.width, track.height);
    else ctx.strokeRect(track.minX, track.minY, track.width, track.height);
    if (config.centerDots) {
      ctx.beginPath();
      ctx.arc(track.x, track.y, Math.max(2, config.thickness + 1), 0, Math.PI * 2);
      ctx.fill();
    }
    if (config.showIds) ctx.fillText(String(track.id), track.minX, Math.max(10, track.minY - 4));
  }
  if (config.showMetrics) {
    ctx.fillText("data", 10, 16);
    tracks.forEach((track, index) => {
      ctx.fillText(`${track.id} / ${(track.x / width).toFixed(2)},${(track.y / height).toFixed(2)} / ${Math.round(track.area)}`, 10, 30 + index * 12);
    });
  }
}

function drawConnections(ctx: CanvasRenderingContext2D, tracks: readonly BlobTrackTrack[], config: BlobTrackConfig): void {
  ctx.strokeStyle = config.outlineColor;
  ctx.lineWidth = Math.max(1, config.thickness * 0.55);
  for (let i = 0; i < tracks.length; i += 1) {
    for (let j = i + 1; j < tracks.length; j += 1) {
      const a = tracks[i];
      const b = tracks[j];
      if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) >= config.lineDistance) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const cx = (a.x + b.x) / 2 - (dy / distance) * distance * config.curve;
      const cy = (a.y + b.y) / 2 + (dx / distance) * distance * config.curve;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      ctx.stroke();
    }
  }
}

function drawTrail(ctx: CanvasRenderingContext2D, tracks: readonly BlobTrackTrack[], config: BlobTrackConfig): void {
  const points = [...tracks].sort((a, b) => a.x - b.x);
  if (points.length < 2) return;
  ctx.strokeStyle = config.trailColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const first = points[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous && current) ctx.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
  }
  const last = points[points.length - 1];
  if (last) ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function drawBracket(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  const length = Math.max(6, Math.min(width, height) * 0.32);
  ctx.beginPath();
  ctx.moveTo(x, y + length);
  ctx.lineTo(x, y);
  ctx.lineTo(x + length, y);
  ctx.moveTo(x + width - length, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + length);
  ctx.moveTo(x, y + height - length);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + length, y + height);
  ctx.moveTo(x + width - length, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - length);
  ctx.stroke();
}
