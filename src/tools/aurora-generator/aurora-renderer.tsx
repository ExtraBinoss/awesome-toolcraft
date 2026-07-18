import * as React from "react";
import { createToolcraftPngExportCanvas, shouldIncludeToolcraftPreviewBackground, type ToolcraftState } from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";
import fragment from "./fragment.glsl?raw";
import styles from "./aurora-renderer.module.css";
import vertex from "./vertex.glsl?raw";

type Stop={color:string;position:string|number}; type Palette={angle?:number;gradientType?:"linear"|"radial"|"angular"|"diamond";stops:Stop[]};
let visibleTime=0;
const fallback:Palette={stops:[{color:"#57F5FF",position:"0%"},{color:"#5D63FF",position:"34%"},{color:"#B839FF",position:"68%"},{color:"#FF4FA3",position:"100%"}]};
const num=(s:ToolcraftState,k:string,d:number)=>typeof s.values[k]==="number"?s.values[k] as number:d;
const palette=(s:ToolcraftState)=>{const v=s.values["aurora.palette"];return v&&typeof v==="object"&&"stops" in v?v as Palette:fallback;};
const pos=(s:Stop)=>Math.max(0,Math.min(1,(typeof s.position==="number"?s.position:parseFloat(s.position))/100));
function rgb(value:string):[number,number,number]{const v=value.replace("#","");const x=v.length===3?v.split("").map(c=>c+c).join(""):v.padEnd(6,"0").slice(0,6);return [0,2,4].map(i=>parseInt(x.slice(i,i+2),16)/255) as [number,number,number];}
function shader(gl:WebGL2RenderingContext,type:number,source:string){const s=gl.createShader(type);if(!s)throw Error("Shader unavailable");gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)??"Shader error");return s;}
const renderers=new WeakMap<HTMLCanvasElement,{gl:WebGL2RenderingContext;program:WebGLProgram}>();
function renderer(canvas:HTMLCanvasElement){const cached=renderers.get(canvas);if(cached)return cached;const gl=canvas.getContext("webgl2",{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw Error("WebGL 2 required");const program=gl.createProgram();if(!program)throw Error("Program unavailable");gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??"Program link error");gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,"position");gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);const value={gl,program};renderers.set(canvas,value);return value;}
function draw(canvas:HTMLCanvasElement,state:ToolcraftState,time:number,include:boolean){
  const {gl,program}=renderer(canvas);gl.useProgram(program);
  const f=(k:string,v:number)=>gl.uniform1f(gl.getUniformLocation(program,k),v);gl.uniform2f(gl.getUniformLocation(program,"resolution"),canvas.width,canvas.height);f("time",time);f("seed",num(state,"aurora.seed",23));f("turbulence",num(state,"aurora.turbulence",52)/100);f("organic",num(state,"aurora.organic",68)/100);f("complexity",num(state,"aurora.complexity",38)/100);f("flowScale",num(state,"aurora.scale",48)/100);f("ribbonWidth",num(state,"aurora.width",42)/100);f("softness",num(state,"aurora.softness",76)/100);f("depth",num(state,"aurora.depth",64)/100);f("glow",num(state,"aurora.glow",78)/100);f("negativeSpace",num(state,"aurora.negativeSpace",58)/100);f("exposure",num(state,"tone.exposure",108)/100);f("saturation",num(state,"tone.saturation",112)/100);f("grain",num(state,"tone.grain",2)/100);
  gl.uniform1i(gl.getUniformLocation(program,"ribbonCount"),num(state,"aurora.ribbons",5));gl.uniform1i(gl.getUniformLocation(program,"includeBackground"),include?1:0);const bg=rgb(String(state.values["appearance.background"]??"#03040A"));gl.uniform3f(gl.getUniformLocation(program,"backgroundColor"),...bg);
  const paletteValue=palette(state),modes={linear:0,radial:1,angular:2,diamond:3};f("paletteAngle",(paletteValue.angle??90)/360);gl.uniform1i(gl.getUniformLocation(program,"paletteMode"),modes[paletteValue.gradientType??"linear"]);const stops=[...paletteValue.stops].sort((x,y)=>pos(x)-pos(y)).slice(0,8),data=new Float32Array(32);stops.forEach((s,i)=>data.set([...rgb(s.color),pos(s)],i*4));gl.uniform1i(gl.getUniformLocation(program,"stopCount"),stops.length);gl.uniform4fv(gl.getUniformLocation(program,"stops[0]"),data);gl.viewport(0,0,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,3);
}
export function AuroraRenderer(){
  const {state}=useToolcraft();
  const include=shouldIncludeToolcraftPreviewBackground({state});

  return (
    <InnerAuroraRenderer
      values={state.values}
      includeBackground={include}
    />
  );
}

const InnerAuroraRenderer = React.memo(function InnerAuroraRenderer({
  values,
  includeBackground,
}: {
  values: Record<string, unknown>;
  includeBackground: boolean;
}) {
  const ref=React.useRef<HTMLCanvasElement>(null);
  const state = React.useMemo(() => ({ values } as ToolcraftState), [values]);

  const stateRef = React.useRef(state);
  const includeRef = React.useRef(includeBackground);

  React.useEffect(() => {
    stateRef.current = state;
    includeRef.current = includeBackground;
  }, [state, includeBackground]);

  React.useEffect(() => {
    const canvas = ref.current;
    if (canvas && values["motion.animate"] === false) {
      draw(canvas, state, visibleTime, includeBackground);
    }
  }, [state, includeBackground, values]);

  React.useEffect(()=>{
    const canvas=ref.current;
    if(!canvas)return;
    let frame=0,last=performance.now();

    const updateSize = (rect: DOMRectReadOnly | Omit<DOMRect, "toJSON">) => {
      const dpr=Math.min(2,devicePixelRatio||1);
      const w=Math.max(1,Math.round(rect.width*dpr));
      const h=Math.max(1,Math.round(rect.height*dpr));
      if(canvas.width!==w||canvas.height!==h){
        canvas.width=w;
        canvas.height=h;
      }
    };

    const render=(now:number)=>{
      const currentState = stateRef.current;
      if(currentState.values["motion.animate"]!==false)visibleTime+=(now-last)/1000*(num(currentState,"motion.speed",32)/32);
      last=now;
      draw(canvas,currentState,visibleTime,includeRef.current);
      frame=requestAnimationFrame(render);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateSize(entry.contentRect);
        cancelAnimationFrame(frame);
        frame=requestAnimationFrame(render);
      }
    });
    observer.observe(canvas);

    return()=>{
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  },[]);

  return <div className={styles.output} data-toolcraft-product-output><canvas className={styles.canvas} ref={ref}/></div>;
});
export async function exportAurora(state:ToolcraftState){const include=state.values["export.includeBackground"]!==false,resolution=String(state.values["export.image.resolution"]??"4k"),format=String(state.values["export.image.format"]??"png");const canvas=createToolcraftPngExportCanvas({background:String(state.values["appearance.background"]??"#03040A"),includeBackground:include,resolution,state,render:({context})=>{const output=document.createElement("canvas");output.width=context.canvas.width;output.height=context.canvas.height;draw(output,state,visibleTime,include);context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,context.canvas.width,context.canvas.height);context.drawImage(output,0,0);}});const mime=format==="jpg"?"image/jpeg":"image/png",blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error("Export failed")),mime,.96));const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`aurora-generator.${format==="jpg"?"jpg":"png"}`;link.click();URL.revokeObjectURL(url);}
