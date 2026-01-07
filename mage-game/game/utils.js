export function clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t){
  return a + (b - a) * t;
}

export function length(x, y){
  return Math.hypot(x, y);
}

export function normalize(x, y){
  const len = Math.hypot(x, y);
  if(len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

export function dist2(ax, ay, bx, by){
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by){
  return Math.hypot(ax - bx, ay - by);
}

// Deterministic RNG for stable world layouts and spawns.
// https://stackoverflow.com/a/47593316
export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng, min, max){
  return min + (max - min) * rng();
}

export function randInt(rng, minInclusive, maxInclusive){
  return Math.floor(randRange(rng, minInclusive, maxInclusive + 1));
}

export function pick(rng, arr){
  return arr[Math.floor(rng() * arr.length)];
}
