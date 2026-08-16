import * as React from "react";
import { Dithering } from "@paper-design/shaders-react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import {
  useToolcraftEvaluatedValues,
  useToolcraftPlayhead,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime/state/types";

const ASCII_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ASCII_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform sampler2D uFontAtlas;
  uniform sampler2D uCharset;
  uniform vec2 uResolution;
  uniform vec2 uSourceSize;
  uniform float uTime;
  uniform float uMode;
  uniform float uCellSize;
  uniform float uDirection;
  uniform float uSpeed;
  uniform float uColorMode;
  uniform vec3 uFgColor;
  uniform vec3 uBgColor;
  uniform float uInvert;
  uniform float uContrast;
  uniform float uBrightness;
  uniform float uDepthStrength;
  uniform float uDepthContrast;
  uniform float uCharCount;
  uniform float uJitter;
  uniform float uInkMix;
  uniform float uSourceIsModel;
  uniform float uFit;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }

  float hash21(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float atlasGlyph(float index, vec2 uv, float energy) {
    float safeCount = max(uCharCount, 1.0);
    float glyphIndex = floor(clamp(index, 0.0, safeCount - 1.0));
    float atlasIndex = texture2D(uCharset, vec2((glyphIndex + 0.5) / safeCount, 0.5)).r * 255.0;
    vec2 atlasCell = vec2(mod(atlasIndex, 16.0), floor(atlasIndex / 16.0));
    vec2 atlasUv = (atlasCell + clamp(uv, vec2(0.0), vec2(1.0))) / 16.0;
    float glyph = texture2D(uFontAtlas, atlasUv).r;
    return smoothstep(0.16, mix(0.72, 0.34, clamp(energy, 0.0, 1.0)), glyph);
  }

  float fieldDepth(vec2 localUv, vec2 cellId, float time) {
    vec2 p = localUv * 2.0 - 1.0;
    float waveCoord = p.x;
    float crossCoord = p.y;
    float flowTime = -time;
    if (uDirection > 0.5 && uDirection < 1.5) {
      flowTime = time;
    } else if (uDirection > 1.5 && uDirection < 2.5) {
      waveCoord = p.y;
      crossCoord = p.x;
    } else if (uDirection > 2.5 && uDirection < 3.5) {
      waveCoord = p.y;
      crossCoord = p.x;
      flowTime = time;
    } else if (uDirection > 3.5 && uDirection < 4.5) {
      waveCoord = (p.x + p.y) * 0.7071;
      crossCoord = (p.x - p.y) * 0.7071;
    } else if (uDirection > 4.5 && uDirection < 5.5) {
      waveCoord = (-p.x + p.y) * 0.7071;
      crossCoord = (p.x + p.y) * 0.7071;
    } else if (uDirection > 5.5 && uDirection < 6.5) {
      waveCoord = (p.x - p.y) * 0.7071;
      crossCoord = (p.x + p.y) * 0.7071;
    } else if (uDirection > 6.5 && uDirection < 7.5) {
      waveCoord = (p.x + p.y) * 0.7071;
      crossCoord = (p.x - p.y) * 0.7071;
      flowTime = time;
    } else if (uDirection > 7.5 && uDirection < 9.5) {
      waveCoord = atan(p.y, p.x) / 3.14159;
      crossCoord = length(p) * 1.4;
      flowTime = uDirection < 8.5 ? -time : time;
    } else if (uDirection > 9.5) {
      waveCoord = length(p) * 1.4;
      crossCoord = atan(p.y, p.x) / 3.14159;
      flowTime = uDirection < 10.5 ? -time : time;
    }
    float waves = sin((waveCoord * 2.2 + flowTime) * 3.14159) * cos((crossCoord * 1.7 - flowTime * 0.73) * 3.14159);
    float radial = 1.0 - smoothstep(0.0, 1.35, length(p));
    float grain = hash21(cellId + floor(time * 8.0)) * 0.18;
    return clamp(0.45 + waves * 0.22 + radial * 0.35 + grain, 0.0, 1.0);
  }

  vec2 fittedUv(vec2 uv) {
    float sourceAspect = max(uSourceSize.x / max(uSourceSize.y, 0.001), 0.001);
    float viewportAspect = max(uResolution.x / max(uResolution.y, 0.001), 0.001);
    vec2 result = uv;
    if (uFit < 0.5) {
      if (sourceAspect > viewportAspect) {
        result.y = (uv.y - 0.5) * sourceAspect / viewportAspect + 0.5;
      } else {
        result.x = (uv.x - 0.5) * viewportAspect / sourceAspect + 0.5;
      }
    } else if (sourceAspect > viewportAspect) {
      result.x = (uv.x - 0.5) * viewportAspect / sourceAspect + 0.5;
    } else {
      result.y = (uv.y - 0.5) * sourceAspect / viewportAspect + 0.5;
    }
    return clamp(result, vec2(0.0), vec2(1.0));
  }

  float fitInside(vec2 uv) {
    float sourceAspect = max(uSourceSize.x / max(uSourceSize.y, 0.001), 0.001);
    float viewportAspect = max(uResolution.x / max(uResolution.y, 0.001), 0.001);
    vec2 result = fittedUv(uv);
    if (uFit < 0.5) {
      if (sourceAspect > viewportAspect) {
        result = vec2(uv.x, (uv.y - 0.5) * sourceAspect / viewportAspect + 0.5);
      } else {
        result = vec2((uv.x - 0.5) * viewportAspect / sourceAspect + 0.5, uv.y);
      }
    }
    return step(0.0, result.x) * step(result.x, 1.0) * step(0.0, result.y) * step(result.y, 1.0);
  }

  void main() {
    float inside = uSourceIsModel > 0.5 ? 1.0 : fitInside(vUv);
    vec2 sourceUv = fittedUv(vUv);
    vec4 sampled = texture2D(uTexture, sourceUv);
    vec3 sourceColor = mix(uBgColor, sampled.rgb, inside);
    float tone = luma(sourceColor);
    float depth = fieldDepth(vUv, floor(gl_FragCoord.xy / max(uCellSize, 1.0)), uTime * uSpeed);

    if (uSourceIsModel > 0.5) {
      vec3 lightDirection = normalize(vec3(-0.45, 0.8, 1.0));
      float lighting = max(dot(normalize(vNormal), lightDirection), 0.0);
      float modelDepth = clamp(0.55 + vWorldPosition.z * 0.18 + normalize(vNormal).z * 0.22, 0.0, 1.0);
      tone = clamp(0.18 + lighting * 0.82, 0.0, 1.0);
      depth = mix(modelDepth, depth, 0.24);
      sourceColor = mix(vec3(0.06, 0.08, 0.12), vec3(0.76, 0.9, 1.0), tone);
    }

    tone = clamp((tone - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
    depth = clamp((depth - 0.5) * uDepthContrast + 0.5, 0.0, 1.0);
    float mapped = uMode < 0.5 ? tone : (uMode < 1.5 ? depth : mix(tone, depth, uDepthStrength));
    if (uInvert > 0.5) mapped = 1.0 - mapped;

    vec2 cellSize = vec2(uCellSize, uCellSize * 1.52);
    vec2 cellId = floor(gl_FragCoord.xy / cellSize);
    vec2 cellLocalUv = fract(gl_FragCoord.xy / cellSize);
    float jitter = (hash21(cellId) - 0.5) * uJitter;
    float charIndex = floor(clamp(mapped * (uCharCount - 0.25) + jitter * uDepthStrength, 0.0, max(uCharCount - 1.0, 0.0)));
    vec2 glyphUv = vec2(cellLocalUv.x, 1.0 - cellLocalUv.y);
    float glyph = atlasGlyph(charIndex, glyphUv, mapped);
    glyph *= 0.9 + 0.1 * sin(cellId.y * 0.8 + uTime * uSpeed * 4.0);

    vec3 foreground = sourceColor;
    if (uColorMode > 0.5 && uColorMode < 1.5) {
      foreground = uFgColor;
    } else if (uColorMode > 1.5) {
      foreground = mix(uFgColor, vec3(1.0, 0.16, 0.58), mapped * 0.72);
    }
    vec3 background = uColorMode < 0.5 ? sourceColor * 0.06 : uBgColor;
    vec3 asciiColor = mix(background, foreground, glyph);
    gl_FragColor = vec4(mix(sourceColor, asciiColor, uInkMix), 1.0);
  }
`;

type SourceSize = [number, number];

function numberValue(values: Record<string, unknown>, target: string, fallback: number): number {
  const value = values[target];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(values: Record<string, unknown>, target: string, fallback: string): string {
  const value = values[target];
  return typeof value === "string" ? value : fallback;
}

function parseHexColor(value: string, fallback: [number, number, number]): [number, number, number] {
  const clean = value.replace("#", "");
  const normalized = clean.length === 3
    ? clean.split("").map((part) => `${part}${part}`).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const channels = [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
  return channels.every(Number.isFinite) ? channels as [number, number, number] : fallback;
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ];
}

function clampValue(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function asciiHash(x: number, y: number, time: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + time * 0.017) * 43758.5453123;
  return value - Math.floor(value);
}

function renderAsciiImage(
  canvas: HTMLCanvasElement,
  buffer: HTMLCanvasElement,
  image: HTMLImageElement,
  values: Record<string, unknown>,
  timestamp: number,
): void {
  const renderScale = numberValue(values, "canvas.renderScale", 1);
  const width = Math.max(1, Math.round(1280 * renderScale));
  const height = Math.max(1, Math.round(720 * renderScale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    buffer.width = width;
    buffer.height = height;
  }

  const context = canvas.getContext("2d");
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  if (!context || !bufferContext) {
    return;
  }

  const background = parseHexColor(stringValue(values, "ascii.background", "#050609"), [5, 6, 9]);
  context.fillStyle = `rgb(${background.join(",")})`;
  context.fillRect(0, 0, width, height);
  bufferContext.clearRect(0, 0, width, height);

  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const sourceAspect = sourceWidth / sourceHeight;
  const canvasAspect = width / height;
  const fit = stringValue(values, "ascii.fit", "contain");
  let drawWidth = width;
  let drawHeight = height;
  if ((fit === "contain" && sourceAspect > canvasAspect) || (fit === "cover" && sourceAspect < canvasAspect)) {
    drawHeight = width / sourceAspect;
  } else {
    drawWidth = height * sourceAspect;
  }
  bufferContext.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);

  const pixels = bufferContext.getImageData(0, 0, width, height).data;
  const characters = Array.from(stringValue(values, "ascii.charset", " .,:;irsXA253hMHGS#9B&@"));
  const charset = characters.length > 0 ? characters : [" "];
  const cellWidth = Math.max(4, numberValue(values, "ascii.cellSize", 12) * renderScale);
  const cellHeight = cellWidth * 1.52;
  const columns = Math.ceil(width / cellWidth);
  const rows = Math.ceil(height / cellHeight);
  const contrast = numberValue(values, "ascii.contrast", 1.2);
  const brightness = numberValue(values, "ascii.brightness", 0);
  const depthStrength = numberValue(values, "ascii.depthStrength", 65) / 100;
  const depthContrast = numberValue(values, "ascii.depthContrast", 1.3);
  const jitter = numberValue(values, "ascii.jitter", 18) / 100;
  const mode = stringValue(values, "ascii.mode", "hybrid");
  const direction = stringValue(values, "ascii.direction", "right");
  const colorMode = stringValue(values, "ascii.colorMode", "source");
  const foreground = parseHexColor(stringValue(values, "ascii.foreground", "#D8FF65"), [216, 255, 101]);
  const motion = numberValue(values, "ascii.motion", 18) / 100;
  const time = timestamp * 0.001;

  context.font = `700 ${Math.max(8, Math.round(cellHeight * 0.78))}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = Math.min(width - 1, Math.round(column * cellWidth + cellWidth * 0.5));
      const y = Math.min(height - 1, Math.round(row * cellHeight + cellHeight * 0.5));
      const pixelIndex = (y * width + x) * 4;
      const alpha = pixels[pixelIndex + 3] / 255;
      if (alpha < 0.04) {
        continue;
      }
      const sourceColor: [number, number, number] = [pixels[pixelIndex], pixels[pixelIndex + 1], pixels[pixelIndex + 2]];
      const luminance = (sourceColor[0] * 0.299 + sourceColor[1] * 0.587 + sourceColor[2] * 0.114) / 255;
      const localX = column / Math.max(1, columns - 1) - 0.5;
      const localY = row / Math.max(1, rows - 1) - 0.5;
      let waveCoordinate = localX;
      let crossCoordinate = localY;
      let flowTime = -time * motion;
      if (direction === "left" || direction === "horizontal") {
        flowTime = time * motion;
      } else if (direction === "up") {
        waveCoordinate = localY;
        crossCoordinate = localX;
      } else if (direction === "down" || direction === "vertical") {
        waveCoordinate = localY;
        crossCoordinate = localX;
        flowTime = time * motion;
      } else if (direction === "up-right") {
        waveCoordinate = (localX + localY) * 0.7071;
        crossCoordinate = (localX - localY) * 0.7071;
      } else if (direction === "up-left") {
        waveCoordinate = (-localX + localY) * 0.7071;
        crossCoordinate = (localX + localY) * 0.7071;
      } else if (direction === "down-right") {
        waveCoordinate = (localX - localY) * 0.7071;
        crossCoordinate = (localX + localY) * 0.7071;
      } else if (direction === "down-left" || direction === "diagonal") {
        waveCoordinate = (localX + localY) * 0.7071;
        crossCoordinate = (localX - localY) * 0.7071;
        flowTime = time * motion;
      } else if (direction === "clockwise" || direction === "counter-clockwise") {
        waveCoordinate = Math.atan2(localY, localX) / Math.PI;
        crossCoordinate = Math.hypot(localX, localY) * 1.4;
        flowTime = (direction === "clockwise" ? -1 : 1) * time * motion;
      } else if (direction === "radial-out" || direction === "radial-in" || direction === "radial") {
        waveCoordinate = Math.hypot(localX, localY) * 1.4;
        crossCoordinate = Math.atan2(localY, localX) / Math.PI;
        flowTime = (direction === "radial-in" ? 1 : -1) * time * motion;
      }
      const wave = Math.sin((waveCoordinate * 2.2 + flowTime) * Math.PI) * Math.cos((crossCoordinate * 1.7 - flowTime * 0.73) * Math.PI);
      const radial = 1 - Math.min(1, Math.hypot(localX, localY) / 0.9);
      let depth = clampValue(0.45 + wave * 0.22 + radial * 0.35 + asciiHash(column, row, time * motion) * 0.18);
      depth = clampValue((depth - 0.5) * depthContrast + 0.5);
      const tone = clampValue((luminance - 0.5) * contrast + 0.5 + brightness);
      let mapped = mode === "depth" ? depth : mode === "hybrid" ? tone * (1 - depthStrength) + depth * depthStrength : tone;
      if (values["ascii.invert"] === true) {
        mapped = 1 - mapped;
      }
      const jittered = clampValue(mapped + (asciiHash(column, row, 0) - 0.5) * jitter * 0.45);
      const character = charset[Math.min(charset.length - 1, Math.floor(jittered * charset.length))] ?? " ";
      let ink = sourceColor;
      if (colorMode === "custom") {
        ink = foreground;
      } else if (colorMode === "gradient") {
        ink = mixRgb(foreground, [255, 40, 150], mapped * 0.72);
      }
      context.fillStyle = `rgb(${ink.map((channel) => Math.round(channel)).join(",")})`;
      context.fillText(character, column * cellWidth + cellWidth * 0.5, row * cellHeight + cellHeight * 0.5);
    }
  }
}

function AsciiImageCanvas({
  asset,
  playheadSeconds,
  values,
}: {
  asset: ToolcraftMediaAsset;
  playheadSeconds: number;
  values: Record<string, unknown>;
}): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [buffer] = React.useState(() => document.createElement("canvas"));
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const valuesRef = React.useRef(values);
  const playheadRef = React.useRef(playheadSeconds);
  const renderRef = React.useRef<((timestamp: number) => void) | null>(null);
  React.useEffect(() => {
    playheadRef.current = playheadSeconds;
  }, [playheadSeconds]);
  React.useEffect(() => {
    valuesRef.current = values;
    renderRef.current = (timestamp) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (canvas && image) {
        renderAsciiImage(canvas, buffer, image, valuesRef.current, timestamp);
      }
    };
  }, [buffer, values]);

  React.useEffect(() => {
    const image = new Image();
    image.addEventListener("load", () => {
      imageRef.current = image;
      renderRef.current?.(playheadRef.current * 1_000);
    }, { once: true });
    image.src = asset.dataUrl;
    return () => {
      imageRef.current = null;
    };
  }, [asset.dataUrl]);

  React.useEffect(() => {
    renderRef.current?.(playheadSeconds * 1_000);
  }, [playheadSeconds, values]);

  return <canvas className="absolute inset-0 h-full w-full" data-toolcraft-ascii-lab-canvas="true" ref={canvasRef} />;
}

function sourceAsset(state: ToolcraftState): ToolcraftMediaAsset | undefined {
  return (
    state.mediaAssets.find((asset) => asset.sourceTarget === "ascii.source") ??
    state.mediaAssets.find((asset) => asset.assetKind === "image" || asset.mimeType.startsWith("image/"))
  );
}

function isModelAsset(asset: ToolcraftMediaAsset | undefined): boolean {
  return Boolean(asset && /\.(glb|gltf|obj|stl)$/i.test(asset.fileName));
}

function createCharsetTextures(charsetValue: string): {
  atlas: THREE.CanvasTexture;
  charset: THREE.DataTexture;
  count: number;
} {
  const characters = Array.from(charsetValue).filter(Boolean).slice(0, 96);
  const safeCharacters = characters.length > 0 ? characters : [" "];
  const cellSize = 48;
  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = cellSize * 16;
  atlasCanvas.height = cellSize * 16;
  const atlasContext = atlasCanvas.getContext("2d");

  if (!atlasContext) {
    throw new Error("ASCII atlas could not be created.");
  }

  atlasContext.fillStyle = "#000";
  atlasContext.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height);
  atlasContext.fillStyle = "#fff";
  atlasContext.font = `700 ${Math.round(cellSize * 0.76)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  atlasContext.textAlign = "center";
  atlasContext.textBaseline = "middle";

  safeCharacters.forEach((character, index) => {
    const x = (index % 16) * cellSize + cellSize / 2;
    const y = Math.floor(index / 16) * cellSize + cellSize / 2;
    atlasContext.fillText(character, x, y + cellSize * 0.02);
  });

  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.minFilter = THREE.NearestFilter;
  atlas.magFilter = THREE.NearestFilter;
  atlas.wrapS = THREE.ClampToEdgeWrapping;
  atlas.wrapT = THREE.ClampToEdgeWrapping;
  atlas.colorSpace = THREE.NoColorSpace;

  const charsetPixels = new Uint8Array(safeCharacters.length * 4);
  safeCharacters.forEach((_, index) => {
    charsetPixels[index * 4] = index;
    charsetPixels[index * 4 + 3] = 255;
  });
  const charset = new THREE.DataTexture(
    charsetPixels,
    safeCharacters.length,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  charset.minFilter = THREE.NearestFilter;
  charset.magFilter = THREE.NearestFilter;
  charset.wrapS = THREE.ClampToEdgeWrapping;
  charset.wrapT = THREE.ClampToEdgeWrapping;
  charset.needsUpdate = true;

  return { atlas, charset, count: safeCharacters.length };
}

function createWhiteTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    THREE.RGBAFormat,
  );
  texture.needsUpdate = true;
  return texture;
}

async function loadImageTexture(asset: ToolcraftMediaAsset): Promise<{
  size: SourceSize;
  texture: THREE.Texture;
}> {
  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("The image could not be decoded.")), { once: true });
    image.src = asset.dataUrl;
  });
  if (typeof image.decode === "function") {
    await image.decode().catch(() => undefined);
  }
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return { size: [image.naturalWidth || 1, image.naturalHeight || 1], texture };
}

async function loadModel(asset: ToolcraftMediaAsset): Promise<THREE.Object3D> {
  const extension = asset.fileName.split(".").pop()?.toLowerCase();
  if (extension === "obj") {
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    return new OBJLoader().loadAsync(asset.dataUrl);
  }
  if (extension === "stl") {
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    return new THREE.Mesh(await new STLLoader().loadAsync(asset.dataUrl));
  }
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  return (await new GLTFLoader().loadAsync(asset.dataUrl)).scene;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.ShaderMaterial)) {
        material.dispose();
      }
    });
  });
}

function colorModeValue(value: string): number {
  return value === "custom" ? 1 : value === "gradient" ? 2 : 0;
}

function modeValue(value: string): number {
  return value === "depth" ? 1 : value === "hybrid" ? 2 : 0;
}

function directionValue(value: string): number {
  const directions: Record<string, number> = {
    "counter-clockwise": 9,
    "down-left": 7,
    "down-right": 6,
    "radial-in": 11,
    "radial-out": 10,
    "up-left": 5,
    "up-right": 4,
    clockwise: 8,
    diagonal: 7,
    down: 3,
    horizontal: 1,
    left: 1,
    radial: 10,
    right: 0,
    up: 2,
    vertical: 3,
  };

  return directions[value] ?? 0;
}

function makeMaterial(
  fontAtlas: THREE.Texture,
  charset: THREE.Texture,
  sourceTexture: THREE.Texture,
  sourceIsModel: boolean,
  charCount: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    fragmentShader: ASCII_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
    uniforms: {
      uBgColor: { value: new THREE.Color("#050609") },
      uBrightness: { value: 0 },
      uCellSize: { value: 12 },
      uCharCount: { value: charCount },
      uCharset: { value: charset },
      uColorMode: { value: 0 },
      uContrast: { value: 1.2 },
      uDepthContrast: { value: 1.3 },
      uDepthStrength: { value: 0.65 },
      uDirection: { value: 2 },
      uFgColor: { value: new THREE.Color("#D8FF65") },
      uFontAtlas: { value: fontAtlas },
      uFit: { value: 0 },
      uInkMix: { value: 0.92 },
      uInvert: { value: 0 },
      uJitter: { value: 0.18 },
      uMode: { value: 2 },
      uResolution: { value: new THREE.Vector2(1280, 720) },
      uSourceIsModel: { value: sourceIsModel ? 1 : 0 },
      uSourceSize: { value: new THREE.Vector2(1280, 720) },
      uTexture: { value: sourceTexture },
      uTime: { value: 0 },
      uSpeed: { value: 0.18 },
    },
    vertexShader: ASCII_VERTEX_SHADER,
  });
}

function FrameScheduler({ active, fps }: { active: boolean; fps: number }): null {
  const invalidate = useThree((root) => root.invalidate);

  React.useEffect(() => {
    invalidate();

    if (!active) {
      return undefined;
    }

    let frame = 0;
    let previous = 0;
    const interval = 1000 / Math.max(1, fps);
    const tick = (now: number) => {
      if (now - previous >= interval) {
        previous = now;
        invalidate();
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, fps, invalidate]);

  return null;
}

function AsciiScene({
  charsetTextures,
  imageTexture,
  isPlaying,
  model,
  playheadSeconds,
  rotation,
  sourceSize,
  values,
}: {
  charsetTextures: { atlas: THREE.CanvasTexture; charset: THREE.DataTexture; count: number };
  imageTexture: THREE.Texture | null;
  isPlaying: boolean;
  model: THREE.Object3D | null;
  playheadSeconds: number;
  rotation: React.MutableRefObject<[number, number]>;
  sourceSize: SourceSize;
  values: Record<string, unknown>;
}): React.JSX.Element {
  const group = React.useRef<THREE.Group>(null);
  const invalidate = useThree((root) => root.invalidate);
  const gl = useThree((root) => root.gl);
  const whiteTexture = React.useMemo(() => createWhiteTexture(), []);
  const imageMaterial = React.useMemo(
    () => makeMaterial(charsetTextures.atlas, charsetTextures.charset, imageTexture ?? whiteTexture, false, charsetTextures.count),
    [charsetTextures, imageTexture, whiteTexture],
  );
  const modelMaterial = React.useMemo(
    () => makeMaterial(charsetTextures.atlas, charsetTextures.charset, whiteTexture, true, charsetTextures.count),
    [charsetTextures, whiteTexture],
  );
  const resolution = React.useMemo(() => new THREE.Vector2(1280, 720), []);

  React.useEffect(() => {
    return () => {
      imageMaterial.dispose();
      modelMaterial.dispose();
      whiteTexture.dispose();
    };
  }, [imageMaterial, modelMaterial, whiteTexture]);

  React.useEffect(() => {
    const materials = [imageMaterial, modelMaterial];
    const foreground = stringValue(values, "ascii.foreground", "#D8FF65");
    const background = stringValue(values, "ascii.background", "#050609");
    const sourceTexture = imageTexture ?? whiteTexture;
    const cellSize = numberValue(values, "ascii.cellSize", 12) * gl.getPixelRatio();

    materials.forEach((material) => {
      material.uniforms.uTexture.value = material === imageMaterial ? sourceTexture : whiteTexture;
      material.uniforms.uSourceSize.value.set(sourceSize[0], sourceSize[1]);
      material.uniforms.uCellSize.value = cellSize;
      material.uniforms.uMode.value = modeValue(stringValue(values, "ascii.mode", "hybrid"));
      material.uniforms.uDirection.value = directionValue(stringValue(values, "ascii.direction", "right"));
      material.uniforms.uColorMode.value = colorModeValue(stringValue(values, "ascii.colorMode", "source"));
      material.uniforms.uFgColor.value.set(foreground);
      material.uniforms.uBgColor.value.set(background);
      material.uniforms.uContrast.value = numberValue(values, "ascii.contrast", 1.2);
      material.uniforms.uBrightness.value = numberValue(values, "ascii.brightness", 0);
      material.uniforms.uDepthStrength.value = numberValue(values, "ascii.depthStrength", 65) / 100;
      material.uniforms.uDepthContrast.value = numberValue(values, "ascii.depthContrast", 1.3);
      material.uniforms.uInvert.value = values["ascii.invert"] === true ? 1 : 0;
      material.uniforms.uJitter.value = numberValue(values, "ascii.jitter", 18) / 100;
      material.uniforms.uInkMix.value = numberValue(values, "ascii.inkMix", 100) / 100;
      material.uniforms.uFit.value = stringValue(values, "ascii.fit", "contain") === "cover" ? 1 : 0;
      material.uniforms.uSpeed.value = numberValue(values, "ascii.motion", 18) / 100;
    });
    invalidate();
  }, [gl, imageMaterial, imageTexture, modelMaterial, sourceSize, values, whiteTexture, invalidate]);

  React.useEffect(() => {
    if (!model) {
      return undefined;
    }

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const previousMaterials = Array.isArray(child.material) ? child.material : [child.material];
      previousMaterials.forEach((material) => {
        if (material !== modelMaterial && !(material instanceof THREE.ShaderMaterial)) {
          material.dispose();
        }
      });
      child.material = modelMaterial;
    });

    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    model.position.sub(center);
    model.scale.setScalar(2.15 / Math.max(size.x, size.y, size.z, 0.001));
    invalidate();

    return undefined;
  }, [invalidate, model, modelMaterial]);

  useFrame((_, delta) => {
    const drawingBufferSize = gl.getDrawingBufferSize(resolution);
    imageMaterial.uniforms.uResolution.value.copy(drawingBufferSize);
    modelMaterial.uniforms.uResolution.value.copy(drawingBufferSize);

    if (!group.current) {
      return;
    }

    if (isPlaying && values["motion.autoRotate"] !== false) {
      rotation.current[1] += delta * numberValue(values, "motion.rotationSpeed", 24) * 0.012;
    }
    group.current.rotation.x = rotation.current[0];
    group.current.rotation.y = rotation.current[1];
    if (values["motion.animate"] !== false) {
      imageMaterial.uniforms.uTime.value = playheadSeconds;
      modelMaterial.uniforms.uTime.value = playheadSeconds;
    }
  });

  return (
    <group ref={group}>
      {model ? (
        <primitive object={model} />
      ) : (
        <mesh material={imageMaterial}>
          <planeGeometry args={[2, 2]} />
        </mesh>
      )}
    </group>
  );
}

export function AsciiLabRenderer(): React.JSX.Element {
  const committedState = useToolcraftSelector(React.useCallback((snapshot) => snapshot, []));
  const evaluatedValues = useToolcraftEvaluatedValues();
  const playheadSeconds = useToolcraftPlayhead();
  const isPlaying = useToolcraftSelector(
    React.useCallback((snapshot) => snapshot.timeline.isPlaying, []),
  );
  const state = React.useMemo(
    () => ({ ...committedState, values: evaluatedValues }),
    [committedState, evaluatedValues],
  );
  const source = sourceAsset(state);
  const values = state.values;
  const isModel = isModelAsset(source);
  const [model, setModel] = React.useState<THREE.Object3D | null>(null);
  const [imageTexture, setImageTexture] = React.useState<THREE.Texture | null>(null);
  const [sourceSize, setSourceSize] = React.useState<SourceSize>([1280, 720]);
  const [status, setStatus] = React.useState("");
  const rotation = React.useRef<[number, number]>([0.12, 0.32]);
  const modelRef = React.useRef<THREE.Object3D | null>(null);
  const textureRef = React.useRef<THREE.Texture | null>(null);
  const invalidateRef = React.useRef<() => void>(() => undefined);
  const dragging = React.useRef(false);
  const previousPointer = React.useRef<[number, number]>([0, 0]);

  const charsetTextures = React.useMemo(
    () => createCharsetTextures(stringValue(values, "ascii.charset", " .,:;irsXA253hMHGS#9B&@")),
    [values["ascii.charset"]],
  );

  React.useEffect(() => {
    return () => {
      charsetTextures.atlas.dispose();
      charsetTextures.charset.dispose();
    };
  }, [charsetTextures]);

  React.useEffect(() => {
    let active = true;
    const previousModel = modelRef.current;
    const previousTexture = textureRef.current;
    modelRef.current = null;
    textureRef.current = null;
    setModel(null);
    setImageTexture(null);
    if (previousModel) {
      disposeObject(previousModel);
    }
    previousTexture?.dispose();
    rotation.current = [0.12, 0.32];

    if (!source) {
      setStatus("Drop an image or 3D model to start.");
      return () => {
        active = false;
      };
    }

    setStatus(isModel ? "Loading model…" : "Loading image…");
    if (isModel) {
      void loadModel(source).then((nextModel) => {
        if (!active) {
          disposeObject(nextModel);
          return;
        }
        modelRef.current = nextModel;
        setModel(nextModel);
        setSourceSize([1280, 720]);
        setStatus("");
        invalidateRef.current();
      }).catch((error: unknown) => {
        if (active) {
          setStatus(error instanceof Error ? error.message : "The 3D model could not be loaded.");
        }
      });
    } else {
      void loadImageTexture(source).then(({ size, texture }) => {
        if (!active) {
          texture.dispose();
          return;
        }
        textureRef.current = texture;
        setSourceSize(size);
        setImageTexture(texture);
        setStatus("");
        invalidateRef.current();
      }).catch(() => {
        if (active) {
          setStatus("The image could not be loaded.");
        }
      });
    }

    return () => {
      active = false;
    };
  }, [isModel, source?.dataUrl, source?.fileName, source?.mimeType]);

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    previousPointer.current = [event.clientX, event.clientY];
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !isModel) {
      return;
    }
    const [x, y] = previousPointer.current;
    rotation.current = [
      rotation.current[0] + (event.clientY - y) * 0.008,
      rotation.current[1] + (event.clientX - x) * 0.008,
    ];
    previousPointer.current = [event.clientX, event.clientY];
    invalidateRef.current();
  };
  const pointerUp = () => {
    dragging.current = false;
  };

  const paperAmbient = values["paper.ambient"] === true;
  const paperSpeed = numberValue(values, "ascii.motion", 18) / 100;
  const paperForeground = stringValue(values, "ascii.foreground", "#D8FF65");
  const paperBackground = stringValue(values, "scene.background", "#020307");

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      data-toolcraft-ascii-lab-output="true"
      data-toolcraft-product-output
      onPointerCancel={pointerUp}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      style={{ touchAction: "none" }}
    >
      {paperAmbient ? (
        <Dithering
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          colorBack={paperBackground}
          colorFront={paperForeground}
          fit="cover"
          shape="wave"
          size={5}
          speed={isPlaying ? paperSpeed : 0}
          type="4x4"
        />
      ) : null}
      {!isModel && source ? (
        <AsciiImageCanvas
          asset={source}
          playheadSeconds={playheadSeconds}
          values={values}
        />
      ) : (
        <Canvas
          camera={{ position: [0, 0, 5], zoom: 1 }}
          dpr={numberValue(values, "canvas.renderScale", 1)}
          frameloop="demand"
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
          onCreated={(root) => {
            root.gl.setClearColor(paperBackground, paperAmbient ? 0 : 1);
            root.gl.domElement.dataset.toolcraftAsciiLabCanvas = "true";
            invalidateRef.current = root.invalidate;
            root.invalidate();
          }}
          orthographic
        >
          {paperAmbient ? null : <color attach="background" args={[paperBackground]} />}
          <FrameScheduler
            active={
              isPlaying &&
              (values["motion.autoRotate"] !== false || values["motion.animate"] !== false)
            }
            fps={Number(stringValue(values, "performance.fps", "30")) || 30}
          />
          <AsciiScene
            charsetTextures={charsetTextures}
            imageTexture={imageTexture}
            isPlaying={isPlaying}
            model={model}
            playheadSeconds={playheadSeconds}
            rotation={rotation}
            sourceSize={sourceSize}
            values={values}
          />
        </Canvas>
      )}
      <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] tracking-wide text-white/70">
        {isModel ? "DRAG TO ROTATE · ASCII 3D" : "ASCII IMAGE FIELD"}
      </div>
      {status ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/75 px-3 py-1.5 text-xs text-white">
          {status}
        </div>
      ) : null}
    </div>
  );
}
