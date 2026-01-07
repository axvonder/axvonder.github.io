import { clamp, dist2 } from './utils.js';

// Circle-circle overlap test (squared).
export function circlesOverlap(a, b){
  const r = a.r + b.r;
  return dist2(a.x, a.y, b.x, b.y) < (r * r);
}

// Keep a circle inside world bounds.
export function clampCircleToBounds(entity, width, height){
  entity.x = clamp(entity.x, entity.r, width - entity.r);
  entity.y = clamp(entity.y, entity.r, height - entity.r);
}

// Push entity circle out of an obstacle circle if overlapping.
export function resolveCircleVsCircle(entity, obstacle){
  const dx = entity.x - obstacle.x;
  const dy = entity.y - obstacle.y;

  const minDist = entity.r + obstacle.r;
  const d2 = dx * dx + dy * dy;

  if(d2 === 0){
    // Exact overlap. Nudge deterministically.
    entity.x += 0.01;
    return true;
  }

  if(d2 >= minDist * minDist) return false;

  const d = Math.sqrt(d2);
  const overlap = minDist - d;

  const nx = dx / d;
  const ny = dy / d;

  entity.x += nx * overlap;
  entity.y += ny * overlap;

  return true;
}
