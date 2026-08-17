import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

import { toolcraftStateWithoutViewportMatches, useToolcraftEvaluatedValues, useToolcraftSelector } from "@/toolcraft/runtime/react/app-shell/use-toolcraft";
import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime/state/types";

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform float uTime; uniform float uEffect; uniform float uA; uniform float uB; uniform float uC;
  uniform vec3 uColorA; uniform vec3 uColorB;
  varying vec3 vNormal; varying vec3 vWorldPosition; varying vec2 vUv;
  float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) { vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p) { float v=0.0,a=.5; for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.02+17.1;a*=.5;} return v; }
  vec3 heatPalette(float t) { vec3 c0=uColorA,c1=vec3(.12,.48,.98),c2=vec3(.1,.95,.9),c3=vec3(1,.88,.25),c4=uColorB; return t<.25?mix(c0,c1,t*4.):t<.5?mix(c1,c2,(t-.25)*4.):t<.75?mix(c2,c3,(t-.5)*4.):mix(c3,c4,(t-.75)*4.); }
  void main() {
    vec3 normal=normalize(vNormal), viewDir=normalize(cameraPosition-vWorldPosition);
    float facing=max(dot(normal,viewDir),0.0), fresnel=pow(1.0-facing,2.4);
    vec2 uv=vUv*(2.0+uB*.045); vec3 color;
    if(uEffect<.5){ float light=dot(normal,normalize(vec3(-.45,.8,1.)))*.5+.5; float cell=max(1.,uA); float dither=hash21(floor(gl_FragCoord.xy/cell)); float tone=step(.5+(dither-.5)*.22,clamp((light-.5)*(1.+uB*.018)+.5,0.,1.)); color=mix(uColorB,uColorA,tone); color+=vec3(fresnel*.16); }
    else if(uEffect<1.5){ vec2 p=uv+uTime*vec2(.035,-.026); float n=noise(p)*.68+noise(p*2.03+7.1)*.32; float contour=smoothstep(.34-uB*.002,.68+uB*.002,n+facing*.28); float bands=abs(fract((n+facing*.2)*(3.+uA*.08))-.5); color=heatPalette(contour); color+=vec3(1.,.56,.18)*(1.-smoothstep(0.,.08,bands))*uC*.018; color*=.75+fresnel*(.25+uC*.012); }
    else if(uEffect<2.5){ vec2 p=uv+uTime*vec2(.05,-.035); float n=noise(p)*.72+noise(p*2.01+11.3)*.28; float bands=sin((n*4.+vWorldPosition.y*2.+uTime*(.4+uA*.018))*(1.+uA*.008)); float reflection=pow(max(0.,bands*.5+.5),2.+uC*.035); color=mix(vec3(.055,.09,.12),uColorA,reflection*(.7+uB*.004)); color=mix(color,uColorB,fresnel*.76); color+=vec3(.8,.92,1.)*reflection*(1.-uC*.006); }
    else { float n=fbm(uv*1.15-uTime*.035); float smoke=n*(.55+uA*.008); float gem=smoothstep(.12,.9,smoke+fresnel*.4); vec3 iri=.5+.5*cos(vec3(0.,2.1,4.2)+(n+fresnel)*(3.+uB*.035)); color=mix(uColorB,uColorA,gem*.7); color=mix(color,iri,(.25+uB*.007)*(.5+fresnel)); color+=vec3(1.)*(fresnel*fresnel*fresnel)*(.2+uC*.014); }
    float edge=smoothstep(0.,.18,facing); gl_FragColor=vec4(color*(.82+edge*.3),1.);
  }
`;

function numberValue(values: Record<string, unknown>, target: string, fallback: number): number {
  const value = values[target]; return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(values: Record<string, unknown>, target: string, fallback: string): string {
  const value = values[target]; return typeof value === "string" ? value : fallback;
}

function selectedModel(state: ToolcraftState): ToolcraftMediaAsset | undefined {
  return state.mediaAssets.find((asset) => asset.sourceTarget === "model.source");
}

async function parseModel(asset: ToolcraftMediaAsset): Promise<THREE.Object3D> {
  const extension = asset.fileName.split(".").pop()?.toLowerCase();
  if (extension === "obj") return new OBJLoader().loadAsync(asset.dataUrl);
  if (extension === "stl") {
    const geometry = await new STLLoader().loadAsync(asset.dataUrl);
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#b9bec4" }));
  }
  return (await new GLTFLoader().loadAsync(asset.dataUrl)).scene;
}

function disposeModel(object: THREE.Object3D, keepMaterial?: THREE.Material): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => { if (material !== keepMaterial && !(material instanceof THREE.ShaderMaterial)) material.dispose(); });
  });
}

function FrameScheduler({ active, fps }: { active: boolean; fps: number }): null {
  const invalidate = useThree((root) => root.invalidate);
  React.useEffect(() => {
    invalidate();
    if (!active) return;
    let frame = 0;
    let previous = 0;
    const interval = 1000 / Math.max(1, fps);
    const tick = (now: number) => {
      if (now - previous >= interval) { previous = now; invalidate(); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, fps, invalidate]);
  return null;
}

function Scene({ model, values, rotation }: { model: THREE.Object3D | null; values: Record<string, unknown>; rotation: React.MutableRefObject<[number, number]> }): React.JSX.Element {
  const group = React.useRef<THREE.Group>(null);
  const invalidate = useThree((root) => root.invalidate);
  const material = React.useMemo(() => new THREE.ShaderMaterial({ vertexShader, fragmentShader, side: THREE.DoubleSide, toneMapped: false, uniforms: { uTime: { value: 0 }, uEffect: { value: 0 }, uA: { value: 1 }, uB: { value: 1 }, uC: { value: 1 }, uColorA: { value: new THREE.Color("#F5D500") }, uColorB: { value: new THREE.Color("#111116") } } }), []);

  React.useEffect(() => () => material.dispose(), [material]);
  React.useEffect(() => {
    if (!model) return;
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((current) => { if (current !== material) current.dispose(); });
      child.material = material;
    });
    const box = new THREE.Box3().setFromObject(model); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
    model.position.sub(center); model.scale.setScalar(2.45 / Math.max(size.x, size.y, size.z, .001));
    invalidate();
  }, [invalidate, material, model]);

  React.useEffect(() => {
    const effect = stringValue(values, "effect.mode", "dither");
    const index = ["dither", "heatmap", "liquid-metal", "gem-smoke"].indexOf(effect);
    const targets = effect === "heatmap" ? ["heatmap.contour", "heatmap.noise", "heatmap.glow", "heatmap.cold", "heatmap.hot"] : effect === "liquid-metal" ? ["metal.flow", "metal.reflectivity", "metal.roughness", "metal.tint", "metal.shadow"] : effect === "gem-smoke" ? ["gem.smoke", "gem.iridescence", "gem.bloom", "gem.inner", "gem.outer"] : ["dither.pixelSize", "dither.contrast", "dither.motion", "dither.light", "dither.dark"];
    const fallbacks = effect === "dither" ? [4, 72, 24] : effect === "heatmap" ? [48, 34, 64] : effect === "liquid-metal" ? [62, 82, 22] : [56, 78, 48];
    material.uniforms.uEffect.value = index;
    material.uniforms.uA.value = numberValue(values, targets[0], fallbacks[0]); material.uniforms.uB.value = numberValue(values, targets[1], fallbacks[1]); material.uniforms.uC.value = numberValue(values, targets[2], fallbacks[2]);
    material.uniforms.uColorA.value.set(stringValue(values, targets[3], "#F5D500")); material.uniforms.uColorB.value.set(stringValue(values, targets[4], "#111116"));
    invalidate();
  }, [invalidate, material, values]);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (values["motion.autoRotate"] !== false) rotation.current[1] += delta * numberValue(values, "motion.speed", 42) * .01;
    group.current.rotation.x = rotation.current[0]; group.current.rotation.y = rotation.current[1];
    if (values["motion.animateMaterial"] === true) material.uniforms.uTime.value += delta;
  });

  const objectScale = numberValue(values, "model.scale", 100) / 100;
  return (
    <group ref={group} scale={objectScale}>
      {model ? <primitive object={model} /> : <mesh material={material} rotation={[.22, .2, 0]}><torusKnotGeometry args={[1.05, .36, 128, 24, 2, 3]} /></mesh>}
      {values["scene.ground"] !== false ? <mesh position={[0, -1.85, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.8, 64]} /><meshBasicMaterial color="#09090c" transparent opacity={.46} /></mesh> : null}
    </group>
  );
}

export function Artistic3DRenderer(): React.JSX.Element {
  const committedState = useToolcraftSelector(React.useCallback((snapshot) => snapshot, []), toolcraftStateWithoutViewportMatches);
  const evaluatedValues = useToolcraftEvaluatedValues();
  const state = React.useMemo(
    () => ({ ...committedState, values: evaluatedValues }),
    [committedState, evaluatedValues],
  );
  const source = selectedModel(state);
  const [model, setModel] = React.useState<THREE.Object3D | null>(null);
  const modelRef = React.useRef<THREE.Object3D | null>(null);
  const [status, setStatus] = React.useState("");
  const rotation = React.useRef<[number, number]>([.12, .3]);
  const dragging = React.useRef(false);
  const previous = React.useRef<[number, number]>([0, 0]);
  const invalidateRef = React.useRef<() => void>(() => undefined);

  React.useEffect(() => {
    let active = true;
    if (!source) { setModel((current) => { if (current) disposeModel(current); return null; }); setStatus(""); return; }
    setStatus("Loading 3D object…");
    void parseModel(source).then((next) => {
      if (!active) { disposeModel(next); return; }
      setModel((current) => { if (current) disposeModel(current); return next; }); setStatus("");
    }).catch((error) => { if (active) setStatus(error instanceof Error ? error.message : "The 3D file could not be loaded."); });
    return () => { active = false; };
  }, [source?.dataUrl, source?.fileName]);

  React.useEffect(() => {
    modelRef.current = model;
  }, [model]);
  React.useEffect(() => { rotation.current = [.12, .3]; invalidateRef.current(); }, [state.values["view.resetNonce"]]);
  React.useEffect(() => () => { if (modelRef.current) disposeModel(modelRef.current); }, []);

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => { dragging.current = true; previous.current = [event.clientX, event.clientY]; event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => { if (!dragging.current) return; const [x, y] = previous.current; rotation.current = [rotation.current[0] + (event.clientY - y) * .008, rotation.current[1] + (event.clientX - x) * .008]; previous.current = [event.clientX, event.clientY]; invalidateRef.current(); };
  const pointerUp = () => { dragging.current = false; };

  return (
    <div className="absolute inset-0" data-toolcraft-artistic-3d-output="true" data-toolcraft-product-output onPointerCancel={pointerUp} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
      <Canvas camera={{ position: [0, .15, 5.5], fov: 38 }} dpr={numberValue(state.values, "canvas.renderScale", 1)} frameloop="demand" gl={{ alpha: true, antialias: state.values["performance.antialias"] === true, powerPreference: "high-performance", preserveDrawingBuffer: true }} key={state.values["performance.antialias"] === true ? "aa" : "no-aa"} onCreated={(root) => { invalidateRef.current = root.invalidate; root.invalidate(); }}>
        <color attach="background" args={[stringValue(state.values, "scene.background", "#101014")]} />
        <ambientLight intensity={.4} />
        <FrameScheduler active={state.values["motion.autoRotate"] !== false || state.values["motion.animateMaterial"] === true} fps={Number(stringValue(state.values, "performance.fps", "30")) || 30} />
        <Scene model={model} rotation={rotation} values={state.values} />
      </Canvas>
      <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white/60">Drag to rotate · GLB / GLTF / OBJ / STL</div>
      {status ? <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/75 px-3 py-1.5 text-xs text-white">{status}</div> : null}
    </div>
  );
}
