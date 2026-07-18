#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2 resolution;
uniform float time;
uniform float seed;
uniform int pattern;
uniform float drops;
uniform float ringCount;
uniform float ringThickness;
uniform float dropScale;
uniform float flowAngle;
uniform float turbulence;
uniform float turbulenceScale;
uniform float swirl;
uniform float combStrength;
uniform float combSpacing;
uniform float inkOpacity;
uniform float paletteMix;
uniform float paperGrain;
uniform float paperWarmth;
uniform float contrast;
uniform float brightness;
uniform float speed;
uniform float invertPalette;
uniform int includeBackground;
uniform int stopCount;
uniform vec4 stops[8];
uniform vec3 paperColor;

const int MAX_DROPS = 24;
const float PI = 3.14159265359;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += noise(p) * amplitude;
    p = p * 2.03 + 17.17;
    amplitude *= 0.5;
  }
  return value;
}

vec2 rotate2d(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec2 tileDelta(vec2 delta) {
  return delta - floor(delta + 0.5);
}

vec3 paletteAt(float position) {
  float t = clamp(position, 0.0, 1.0);
  vec3 result = stops[0].rgb;
  for (int i = 0; i < 7; i++) {
    if (i >= stopCount - 1) break;
    vec4 left = stops[i];
    vec4 right = stops[i + 1];
    float span = max(0.0001, right.a - left.a);
    float local = smoothstep(0.0, 1.0, clamp((t - left.a) / span, 0.0, 1.0));
    result = mix(result, mix(left.rgb, right.rgb, local), step(left.a, t));
  }
  if (stopCount > 0) {
    result = mix(result, stops[stopCount - 1].rgb, step(stops[stopCount - 1].a, t));
  }
  return mix(result, vec3(1.0) - result, invertPalette);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = uv - 0.5;
  p.x *= resolution.x / resolution.y;

  float animatedTime = time * (speed / 24.0);
  float angle = flowAngle * PI / 180.0;
  vec2 flow = rotate2d(p, -angle);
  float scale = 2.0 + turbulenceScale / 12.0;
  float fluid = fbm(flow * scale + vec2(seed * 0.013, -seed * 0.009) + animatedTime * 0.04);
  float turbulenceAmount = turbulence / 100.0;
  flow += vec2(
    sin(flow.y * (7.0 + scale) + seed + fluid * 4.0),
    cos(flow.x * (6.0 + scale) - seed * 0.7 + fluid * 3.0)
  ) * turbulenceAmount * 0.035;

  float comb = combStrength / 100.0;
  flow.x += sin(flow.y * (combSpacing * 0.22) + seed * 0.05 + animatedTime * 0.25) * comb * 0.17;
  flow.y += sin(flow.x * (combSpacing * 0.15) - seed * 0.03) * comb * 0.08;
  p = rotate2d(flow, angle);

  float radius = length(p);
  float swirlAmount = sin(radius * 3.6 + fluid * 2.0 + animatedTime * 0.2) * (swirl / 100.0) * 0.75;
  p = rotate2d(p, swirlAmount);

  vec3 inkColor = vec3(0.0);
  float totalWeight = 0.0;
  float ringSharpness = 0.8 + ringThickness / 14.0;
  float normalizedDrops = max(drops, 1.0);

  for (int i = 0; i < MAX_DROPS; i++) {
    if (float(i) >= drops) break;
    float fi = float(i);
    float r1 = hash21(vec2(seed + fi * 13.17, seed * 0.7 + fi * 3.11));
    float r2 = hash21(vec2(seed * 1.7 + fi * 5.71, seed + fi * 9.23));
    float phase = hash21(vec2(seed * 0.31 + fi * 4.2, fi * 12.4)) * PI * 2.0;
    vec2 center;

    if (pattern == 1) {
      float columns = max(2.0, ceil(sqrt(normalizedDrops)));
      float rows = ceil(normalizedDrops / columns);
      float column = mod(fi, columns);
      float row = floor(fi / columns);
      center = vec2(
        ((column + 0.18 + r1 * 0.64) / columns - 0.5) * 0.98,
        ((row + 0.18 + r2 * 0.64) / rows - 0.5) * 0.82
      );
    } else if (pattern == 2) {
      float bouquetLine = fi / max(normalizedDrops - 1.0, 1.0);
      center = vec2((r1 - 0.5) * 0.45, mix(-0.46, 0.46, bouquetLine));
    } else if (pattern == 3) {
      center = vec2(mix(-0.58, 0.58, fi / max(normalizedDrops - 1.0, 1.0)), (r2 - 0.5) * 0.3);
    } else {
      center = (vec2(r1, r2) - 0.5) * vec2(0.75, 0.82);
      center += vec2(sin(fi * 2.1 + seed), cos(fi * 1.7 - seed)) * 0.055;
    }

    center = rotate2d(center, angle * 0.45);
    vec2 delta = tileDelta(p - center);
    float eccentricity = 0.72 + r1 * 0.38;
    float distanceToDrop = length(delta / vec2(eccentricity, 1.0));
    float stoneScale = pattern == 1 ? 1.18 : 1.0;
    float localRings = ringCount * stoneScale * (0.72 + r2 * 0.5) / (0.72 + dropScale / 90.0);
    float ring = 0.5 + 0.5 * cos(distanceToDrop * localRings + phase + animatedTime * (0.14 + r1 * 0.12));
    ring = pow(clamp(ring, 0.0, 1.0), ringSharpness);
    float ripple = smoothstep(0.0, 0.75, distanceToDrop) * (0.78 + 0.22 * sin(distanceToDrop * 3.0 + phase));
    float weight = (0.12 + ring * 0.88) * ripple * (0.72 + 0.28 * r2);
    float colorPosition = fract((fi + r1 * 0.8) / normalizedDrops + ring * paletteMix / 240.0);
    inkColor += paletteAt(colorPosition) * weight;
    totalWeight += weight;
  }

  float coverage = clamp(totalWeight / (1.8 + normalizedDrops * 0.22) * (inkOpacity / 100.0), 0.0, 1.0);
  vec3 marbled = totalWeight > 0.0 ? inkColor / totalWeight : paperColor;
  vec3 color = includeBackground == 1 ? mix(paperColor, marbled, coverage) : marbled;
  float grain = (hash21(gl_FragCoord.xy + seed) - 0.5) * (paperGrain / 100.0) * 0.16;
  color += grain;
  color = (color - 0.5) * (contrast / 100.0) + 0.5;
  color *= brightness / 100.0;
  color = clamp(color, 0.0, 1.0);

  float edge = smoothstep(1.12, 0.22, length(p));
  color *= mix(1.0, 0.9 + edge * 0.1, paperWarmth / 100.0);
  float alpha = includeBackground == 1 ? 1.0 : coverage;
  fragColor = vec4(color, alpha);
}
