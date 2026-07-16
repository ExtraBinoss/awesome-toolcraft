#version 300 es

precision highp float;

uniform vec2 resolution;
uniform float seed, angle, spread, warp, flowScale, detail, softness, negativeSpace;
uniform float contrast, brightness, saturation, grain, grainSize, vignette;
uniform int gradientType, stopCount, includeBackground;
uniform vec4 stops[8];
uniform vec3 backgroundColor;
out vec4 outColor;

vec4 permute(vec4 x) { return mod(((x * 34.0) + 10.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

// Classic coherent 3D Perlin noise. The third axis carries the deterministic seed.
float cnoise(vec3 p) {
  vec3 pi0 = floor(p);
  vec3 pi1 = pi0 + vec3(1.0);
  pi0 = mod(pi0, 289.0);
  pi1 = mod(pi1, 289.0);
  vec3 pf0 = fract(p);
  vec3 pf1 = pf0 - vec3(1.0);
  vec4 ix = vec4(pi0.x, pi1.x, pi0.x, pi1.x);
  vec4 iy = vec4(pi0.yy, pi1.yy);
  vec4 iz0 = pi0.zzzz;
  vec4 iz1 = pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0); vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1); vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x); vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z); vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x); vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z); vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 n0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
  g000 *= n0.x; g010 *= n0.y; g100 *= n0.z; g110 *= n0.w;
  vec4 n1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
  g001 *= n1.x; g011 *= n1.y; g101 *= n1.z; g111 *= n1.w;
  float n000 = dot(g000, pf0); float n100 = dot(g100, vec3(pf1.x, pf0.yz));
  float n010 = dot(g010, vec3(pf0.x, pf1.y, pf0.z)); float n110 = dot(g110, vec3(pf1.xy, pf0.z));
  float n001 = dot(g001, vec3(pf0.xy, pf1.z)); float n101 = dot(g101, vec3(pf1.x, pf0.y, pf1.z));
  float n011 = dot(g011, vec3(pf0.x, pf1.yz)); float n111 = dot(g111, pf1);
  vec3 f = fade(pf0);
  vec4 nz = mix(vec4(n000,n100,n010,n110), vec4(n001,n101,n011,n111), f.z);
  vec2 nyz = mix(nz.xy, nz.zw, f.y);
  return 2.2 * mix(nyz.x, nyz.y, f.x);
}

float perlinFlow(vec2 p) {
  float z = seed * 0.071;
  float broad = cnoise(vec3(p, z));
  float medium = cnoise(vec3(p * 1.93 + broad * 0.42, z + 11.7));
  float fine = cnoise(vec3(p * 3.71 + medium * 0.25, z + 23.1));
  return broad * 0.66 + medium * mix(0.10, 0.25, detail) + fine * mix(0.0, 0.09, detail);
}

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 color = stops[0].rgb;
  for (int i = 0; i < 7; i++) {
    if (i + 1 >= stopCount) break;
    vec4 left = stops[i], right = stops[i + 1];
    float local = clamp((t - left.a) / max(0.0001, right.a - left.a), 0.0, 1.0);
    float cosineBlend = 0.5 - 0.5 * cos(local * 3.14159265);
    float extraSoft = local * local * local * (local * (local * 6.0 - 15.0) + 10.0);
    local = mix(cosineBlend, extraSoft, softness);
    if (t >= left.a) color = mix(left.rgb, right.rgb, local);
  }
  return color;
}

float randomPixel(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  float frequency = mix(0.72, 2.65, flowScale);
  vec2 displacement = vec2(
    perlinFlow(p * frequency + vec2(2.1, 7.3)),
    perlinFlow(p * frequency + vec2(9.2, 1.8))
  );
  vec2 fluid = p + displacement * warp * 0.72;
  float field = perlinFlow(fluid * frequency + displacement * warp * 0.65) * 0.5 + 0.5;
  float a = radians(angle);
  vec2 direction = vec2(cos(a), sin(a));
  float structure;
  if (gradientType == 0) structure = dot(fluid, direction) * 0.55 + 0.5;
  else if (gradientType == 1) structure = length(fluid) * 0.82;
  else if (gradientType == 2) structure = fract(atan(fluid.y, fluid.x) / 6.2831853 + angle / 360.0);
  else { vec2 d = mat2(direction.x,-direction.y,direction.y,direction.x) * fluid; structure = (abs(d.x)+abs(d.y)) * 0.68; }
  float organicAmount = smoothstep(0.02, 0.58, warp);
  float t = mix(structure, field, organicAmount * 0.94);
  t = (t - 0.5) / mix(1.28, 0.72, spread) + 0.5;
  vec3 color = palette(t);
  float voidThreshold = mix(-0.12, 0.62, negativeSpace);
  float feather = mix(0.22, 0.10, softness);
  float alphaEdge = smoothstep(voidThreshold - feather, voidThreshold + feather, field);
  float alpha = mix(1.0, alphaEdge, smoothstep(0.001, 0.8, negativeSpace));
  float luminance = dot(color, vec3(0.2126,0.7152,0.0722));
  color = mix(vec3(luminance), color, saturation);
  color = (color - 0.5) * contrast + 0.5;
  color *= brightness;
  color *= 1.0 - smoothstep(0.2, 0.86, length(p)) * vignette * 0.6;
  color += (randomPixel(floor(gl_FragCoord.xy / max(1.0, grainSize))) - 0.5) * grain * 0.10;
  if (includeBackground == 1) { color = mix(backgroundColor, color, alpha); alpha = 1.0; }
  outColor = vec4(clamp(color, 0.0, 1.0), alpha);
}
