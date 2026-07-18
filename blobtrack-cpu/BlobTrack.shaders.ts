export const BLOB_TRACK_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const LOCAL_SAMPLING = `
uniform sampler2D uTexture;
uniform mat3 uLocalToWorld;
uniform vec2 uResolution;
uniform vec2 uViewportCenter;
uniform vec2 uLocalSize;
uniform vec2 uRenderOriginPx;
uniform vec2 uTextureUvScale;
uniform float uPixelsPerWorldUnit;
uniform float uHasBounds;
in vec2 v_uv;
vec2 sourceUv() {
  if (uHasBounds < 0.5) return v_uv * uTextureUvScale;
  vec2 local = v_uv * uLocalSize;
  vec2 world = (uLocalToWorld * vec3(local, 1.0)).xy;
  return ((world - uViewportCenter) * uPixelsPerWorldUnit + uResolution * 0.5 - uRenderOriginPx) / max(vec2(1.0), vec2(textureSize(uTexture, 0)));
}
`;

export const BLOB_TRACK_SOURCE_FRAGMENT = `#version 300 es
precision highp float;
${LOCAL_SAMPLING}
uniform sampler2D uBackground;
uniform int uMode;
uniform vec3 uKeyColor;
uniform float uKeyTolerance;
uniform float uBackgroundGain;
uniform float uHasBackground;
out vec4 outColor;
void main() {
  vec4 sampleColor = texture(uTexture, sourceUv());
  vec3 c = sampleColor.rgb;
  float alpha = sampleColor.a;
  float luma = dot(c, vec3(0.299, 0.587, 0.114)) * alpha;
  float dark = (1.0 - dot(c, vec3(0.299, 0.587, 0.114))) * alpha;
  float key = (1.0 - smoothstep(uKeyTolerance * 0.55, uKeyTolerance, distance(c, uKeyColor))) * alpha;
  vec3 bgColor = texture(uBackground, v_uv).rgb;
  float background = uHasBackground > 0.5 ? clamp(dot(abs(c - bgColor), vec3(0.299, 0.587, 0.114)) * uBackgroundGain, 0.0, 1.0) * alpha : luma;
  float mask = uMode == 1 ? dark : (uMode == 2 ? key : (uMode == 3 ? background : luma));
  outColor = vec4(mask, luma, key, background);
}
`;

export const BLOB_TRACK_EDGE_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uInput;
uniform vec2 uTexel;
uniform float uGain;
uniform int uSource;
in vec2 v_uv;
out vec4 outColor;
float channel(vec4 c) { return uSource == 1 ? c.g : (uSource == 2 ? c.b : (uSource == 3 ? c.a : c.r)); }
float s(vec2 o) { return channel(texture(uInput, v_uv + o * uTexel)); }
void main() {
  float tl = s(vec2(-1.0, -1.0)), t = s(vec2(0.0, -1.0)), tr = s(vec2(1.0, -1.0));
  float l = s(vec2(-1.0, 0.0)), r = s(vec2(1.0, 0.0));
  float bl = s(vec2(-1.0, 1.0)), b = s(vec2(0.0, 1.0)), br = s(vec2(1.0, 1.0));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float e = clamp(length(vec2(gx, gy)) * uGain, 0.0, 1.0);
  outColor = vec4(e, e, e, 1.0);
}
`;

export const BLOB_TRACK_MIX_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uEdge;
uniform float uAmount;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float v = max(texture(uSource, v_uv).r * (1.0 - uAmount), texture(uEdge, v_uv).r * uAmount);
  outColor = vec4(v, v, v, 1.0);
}
`;

export const BLOB_TRACK_BLUR_FRAGMENT = `#version 300 es
precision highp float;
#define MAX_R 8
uniform sampler2D uInput;
uniform vec2 uTexel;
uniform vec2 uDirection;
uniform int uRadius;
in vec2 v_uv;
out vec4 outColor;
void main() {
  if (uRadius <= 0) {
    float v = texture(uInput, v_uv).r;
    outColor = vec4(v, v, v, 1.0);
    return;
  }
  float sum = 0.0;
  float total = 0.0;
  for (int i = -MAX_R; i <= MAX_R; i += 1) {
    if (abs(i) <= uRadius) {
      float x = float(i);
      float w = exp(-(x * x) / (2.0 * max(float(uRadius), 1.0)));
      sum += texture(uInput, v_uv + uDirection * uTexel * x).r * w;
      total += w;
    }
  }
  float v = sum / max(total, 0.0001);
  outColor = vec4(v, v, v, 1.0);
}
`;

export const BLOB_TRACK_FIELD_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uInput;
uniform float uThreshold;
uniform float uSoftness;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float v = texture(uInput, v_uv).r;
  float m = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, v);
  outColor = vec4(m, m, m, 1.0);
}
`;

export const BLOB_TRACK_COPY_FRAGMENT = `#version 300 es
precision highp float;
${LOCAL_SAMPLING}
out vec4 outColor;
void main() {
  outColor = texture(uTexture, sourceUv());
}
`;

export const BLOB_TRACK_FINAL_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform sampler2D uSourceDebug;
uniform sampler2D uEdge;
uniform sampler2D uBlur;
uniform sampler2D uField;
uniform sampler2D uOverlay;
uniform mat3 uWorldToLocal;
uniform vec2 uResolution;
uniform vec2 uViewportCenter;
uniform vec2 uLocalSize;
uniform vec2 uRenderOriginPx;
uniform vec2 uTextureUvScale;
uniform float uPixelsPerWorldUnit;
uniform float uHasBounds;
uniform int uView;
uniform float uMix;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec4 original = texture(uTexture, v_uv * uTextureUvScale);
  vec2 world = uViewportCenter + (gl_FragCoord.xy + uRenderOriginPx - uResolution * 0.5) / max(uPixelsPerWorldUnit, 0.0001);
  vec2 local = (uWorldToLocal * vec3(world, 1.0)).xy;
  vec2 localUv = uHasBounds > 0.5 ? local / max(uLocalSize, vec2(0.0001)) : v_uv;
  vec4 overlay = texture(uOverlay, localUv);
  vec4 effected = vec4(mix(original.rgb, overlay.rgb, overlay.a), original.a);
  if (uView > 0) {
    float value = uView == 1 ? texture(uSourceDebug, localUv).r : (uView == 2 ? texture(uEdge, localUv).r : (uView == 3 ? texture(uBlur, localUv).r : texture(uField, localUv).r));
    effected = vec4(vec3(value), original.a);
  }
  vec2 inside = step(vec2(0.0), localUv) * step(localUv, vec2(1.0));
  float bounded = uHasBounds > 0.5 ? inside.x * inside.y : 1.0;
  outColor = mix(original, effected, clamp(uMix, 0.0, 1.0) * bounded);
}
`;
