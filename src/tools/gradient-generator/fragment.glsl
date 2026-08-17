#version 300 es

precision highp float;

uniform vec2 resolution;
uniform float time, seed, angle, spread, scale, density, distortion, detail, softness, negativeSpace, motionAmount, gradientBlur;
uniform float contrast, brightness, saturation, grain, grainSize, vignette;
uniform int gradientType, stopCount, includeBackground;
uniform int contentMode;
uniform vec4 stops[8];
uniform vec3 backgroundColor;
uniform sampler2D textMask;
uniform sampler2D imageTexture;
uniform vec2 imageSize, imageOffset;
uniform float imageOpacity, imageScale, imageFit, imageBlend;
uniform float textRelief, textBevel, textDepth, textLightAngle, textShadow, textShine;
uniform vec3 textTint;
uniform float textOpacity;
uniform int textFillEnabled, textFillMode, textFillType, textFillStopCount;
uniform float textFillAngle;
uniform vec3 textFillColor;
uniform vec4 textFillStops[8];
out vec4 outColor;

// Simplex 3D noise. The third axis carries the deterministic seed, so the
// result stays reproducible while still giving the field a volumetric feel.
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m *= m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// This is the same layered flow as the reference shader. `time` lives in the
// third noise coordinate, so the field moves without a Three.js scene.
float organicFlow(vec2 p) {
  vec2 orbit = vec2(cos(time), sin(time)) * motionAmount;
  vec2 counterOrbit = vec2(cos(time * 2.0), -sin(time * 2.0)) * motionAmount;
  float n1 = snoise(vec3(p * density + orbit * 0.72, seed));
  float n2 = snoise(vec3(p * density * 0.50 + n1 * distortion + counterOrbit * 0.38, seed * 2.0));
  return mix((n1 + n2) * 0.5, n2, detail * 0.28);
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

vec3 textPalette(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 color = textFillStops[0].rgb;
  for (int i = 0; i < 7; i++) {
    if (i + 1 >= textFillStopCount) break;
    vec4 left = textFillStops[i], right = textFillStops[i + 1];
    float local = clamp((t - left.a) / max(0.0001, right.a - left.a), 0.0, 1.0);
    local = local * local * (3.0 - 2.0 * local);
    if (t >= left.a) color = mix(left.rgb, right.rgb, local);
  }
  return color;
}

vec3 independentTextFill(vec2 uv) {
  if (textFillMode == 0) return textFillColor;
  vec2 p = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  mat2 rotation = mat2(cos(textFillAngle), -sin(textFillAngle), sin(textFillAngle), cos(textFillAngle));
  vec2 rotated = rotation * p;
  float coordinate;
  if (textFillType == 0) coordinate = rotated.x * 0.72 + 0.5;
  else if (textFillType == 1) coordinate = length(rotated) * 1.15;
  else if (textFillType == 2) coordinate = fract(atan(rotated.y, rotated.x) / 6.2831853 + textFillAngle / 6.2831853);
  else coordinate = (abs(rotated.x) + abs(rotated.y)) * 0.82;
  return textPalette(coordinate);
}

float randomPixel(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453);
}

vec2 gradientSample(vec2 fluid) {
  float field = organicFlow(fluid * scale) * 0.5 + 0.5;
  float secondary = organicFlow((fluid + vec2(1.7, -2.3)) * scale * 0.72) * 0.5 + 0.5;
  field = mix(field, secondary, distortion * 0.18);

  float structure;
  if (gradientType == 0) structure = fluid.x * 0.55 + 0.5;
  else if (gradientType == 1) structure = length(fluid) * 0.82;
  else if (gradientType == 2) structure = fract(atan(fluid.y, fluid.x) / 6.2831853 + angle / 6.2831853);
  else structure = (abs(fluid.x) + abs(fluid.y)) * 0.68;

  float coordinate = mix(structure, field, 0.88 + distortion * 0.12);
  coordinate = (coordinate - 0.5) / mix(1.28, 0.72, spread) + 0.5;
  float voidThreshold = mix(-0.12, 0.62, negativeSpace);
  float feather = mix(0.22, 0.10, softness);
  float alphaEdge = smoothstep(voidThreshold - feather, voidThreshold + feather, field);
  float sampleAlpha = mix(1.0, alphaEdge, smoothstep(0.001, 0.8, negativeSpace));
  return vec2(coordinate, sampleAlpha);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  float a = angle;
  mat2 rotation = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 fluid = rotation * p;
  vec2 centerSample = gradientSample(fluid);
  vec3 color = palette(centerSample.x);
  float alpha = centerSample.y;

  // A real spatial blur of the procedural result. Keep the zero-blur path at
  // one sample, and use a rotated 4-tap kernel only when blur is requested.
  if (gradientBlur > 0.001) {
    float radius = pow(gradientBlur, 1.35) * 0.12;
    vec2 axisA = vec2(radius, 0.0);
    vec2 axisB = vec2(0.0, radius);
    vec2 sampleA = gradientSample(fluid + axisA);
    vec2 sampleB = gradientSample(fluid - axisA);
    vec2 sampleC = gradientSample(fluid + axisB);
    vec2 sampleD = gradientSample(fluid - axisB);
    // Center-weighted cross kernel: unlike replacing the center with distant
    // samples, this preserves the original field and only diffuses its edges.
    vec3 blurredColor = (
      color * 4.0 +
      palette(sampleA.x) + palette(sampleB.x) +
      palette(sampleC.x) + palette(sampleD.x)
    ) * 0.125;
    float blurredAlpha = (
      alpha * 4.0 + sampleA.y + sampleB.y + sampleC.y + sampleD.y
    ) * 0.125;
    float blurMix = smoothstep(0.0, 0.72, gradientBlur);
    color = mix(color, blurredColor, blurMix);
    alpha = mix(alpha, blurredAlpha, blurMix);
  }
  float luminance = dot(color, vec3(0.2126,0.7152,0.0722));
  color = mix(vec3(luminance), color, saturation);
  color = (color - 0.5) * contrast + 0.5;
  color *= brightness;
  color *= 1.0 - smoothstep(0.2, 0.86, length(p)) * vignette * 0.6;
  color += (randomPixel(floor(gl_FragCoord.xy / max(1.0, grainSize))) - 0.5) * grain * 0.10;
  if (contentMode == 2) {
    vec2 imageUv = (uv - 0.5 - imageOffset) / max(imageScale, 0.001) + 0.5;
    float sourceAspect = imageSize.x / max(imageSize.y, 1.0);
    float viewportAspect = resolution.x / max(resolution.y, 1.0);
    if (imageFit < 0.5) {
      if (sourceAspect > viewportAspect) imageUv.y = (imageUv.y - 0.5) * sourceAspect / viewportAspect + 0.5;
      else imageUv.x = (imageUv.x - 0.5) * viewportAspect / sourceAspect + 0.5;
    } else if (imageFit < 1.5) {
      if (sourceAspect > viewportAspect) imageUv.x = (imageUv.x - 0.5) * viewportAspect / sourceAspect + 0.5;
      else imageUv.y = (imageUv.y - 0.5) * sourceAspect / viewportAspect + 0.5;
    }
    float imageInside = step(0.0, imageUv.x) * step(imageUv.x, 1.0) * step(0.0, imageUv.y) * step(imageUv.y, 1.0);
    vec4 imageSample = texture(imageTexture, clamp(imageUv, 0.0, 1.0));
    vec3 blended = imageSample.rgb;
    if (imageBlend > 0.5 && imageBlend < 1.5) blended = 1.0 - (1.0 - color) * (1.0 - imageSample.rgb);
    else if (imageBlend > 1.5 && imageBlend < 2.5) blended = color * imageSample.rgb;
    else if (imageBlend > 2.5) blended = mix(2.0 * color * imageSample.rgb, 1.0 - 2.0 * (1.0 - color) * (1.0 - imageSample.rgb), step(0.5, color));
    float imageAlpha = imageSample.a * imageOpacity * imageInside;
    color = mix(color, blended, imageAlpha);
    alpha = max(alpha, imageAlpha);
  }
  if (contentMode == 1) {
    float mask = texture(textMask, uv).r;
    vec2 texel = 1.0 / resolution;
    vec2 lightDirection = vec2(cos(textLightAngle), sin(textLightAngle));
    float bevelRadius = mix(1.0, 7.0, textBevel);
    float towardLight = texture(textMask, uv + lightDirection * texel * bevelRadius).r;
    float awayFromLight = texture(textMask, uv - lightDirection * texel * bevelRadius).r;
    float reliefLight = (towardLight - awayFromLight) * textRelief;
    float highlight = pow(max(reliefLight, 0.0), 1.6) * textShine * 2.2;
    vec3 textBase = textFillEnabled == 1 ? independentTextFill(uv) : color * mix(vec3(1.0), textTint, 0.32);
    vec3 textSurface = textBase * (1.0 + reliefLight * 0.72) + highlight;

    vec2 extrusionOffset = -lightDirection * texel * mix(2.0, 42.0, textDepth);
    float extrusion = texture(textMask, uv + extrusionOffset).r;
    float depthOnly = max(extrusion - mask, 0.0);
    vec3 depthColor = mix(backgroundColor, textBase * 0.22, 0.3);
    color = mix(color, depthColor, depthOnly * textShadow * textOpacity);
    color = mix(color, textSurface, mask * textOpacity);
    alpha = max(alpha, max(mask, depthOnly * textShadow) * textOpacity);
  }
  if (includeBackground == 1) { color = mix(backgroundColor, color, alpha); alpha = 1.0; }
  outColor = vec4(clamp(color, 0.0, 1.0), alpha);
}
