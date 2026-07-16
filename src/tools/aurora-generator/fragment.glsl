#version 300 es

precision highp float;
uniform vec2 resolution;
uniform float time, seed, turbulence, organic, complexity, flowScale, ribbonWidth, softness, depth, glow, negativeSpace, exposure, saturation, grain, paletteAngle;
uniform int ribbonCount, stopCount, includeBackground, paletteMode;
uniform vec4 stops[8];
uniform vec3 backgroundColor;
out vec4 outColor;

vec4 permute(vec4 x){return mod(((x*34.0)+10.0)*x,289.0);}
vec4 invSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
float cnoise(vec3 p){
  vec3 i0=floor(p),i1=i0+1.0,f0=fract(p),f1=f0-1.0;i0=mod(i0,289.0);i1=mod(i1,289.0);
  vec4 ix=vec4(i0.x,i1.x,i0.x,i1.x),iy=vec4(i0.yy,i1.yy),z0=i0.zzzz,z1=i1.zzzz;
  vec4 ixy=permute(permute(ix)+iy),a=permute(ixy+z0),b=permute(ixy+z1);
  vec4 ax=fract(a/7.0),ay=fract(floor(a/7.0)/7.0)-.5,az=.5-abs(ax)-abs(ay),sa=step(az,vec4(0));ax-=sa*(step(0.0,ax)-.5);ay-=sa*(step(0.0,ay)-.5);
  vec4 bx=fract(b/7.0),by=fract(floor(b/7.0)/7.0)-.5,bz=.5-abs(bx)-abs(by),sb=step(bz,vec4(0));bx-=sb*(step(0.0,bx)-.5);by-=sb*(step(0.0,by)-.5);
  vec3 g000=vec3(ax.x,ay.x,az.x),g100=vec3(ax.y,ay.y,az.y),g010=vec3(ax.z,ay.z,az.z),g110=vec3(ax.w,ay.w,az.w);
  vec3 g001=vec3(bx.x,by.x,bz.x),g101=vec3(bx.y,by.y,bz.y),g011=vec3(bx.z,by.z,bz.z),g111=vec3(bx.w,by.w,bz.w);
  vec4 n0=invSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));g000*=n0.x;g010*=n0.y;g100*=n0.z;g110*=n0.w;
  vec4 n1=invSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));g001*=n1.x;g011*=n1.y;g101*=n1.z;g111*=n1.w;
  vec4 nz=mix(vec4(dot(g000,f0),dot(g100,vec3(f1.x,f0.yz)),dot(g010,vec3(f0.x,f1.y,f0.z)),dot(g110,vec3(f1.xy,f0.z))),vec4(dot(g001,vec3(f0.xy,f1.z)),dot(g101,vec3(f1.x,f0.y,f1.z)),dot(g011,vec3(f0.x,f1.yz)),dot(g111,f1)),fade(f0).z);
  vec2 ny=mix(nz.xy,nz.zw,fade(f0).y);return 2.2*mix(ny.x,ny.y,fade(f0).x);
}
vec3 palette(float t){
  vec3 color=stops[0].rgb;t=clamp(t,0.0,1.0);
  for(int i=0;i<7;i++){if(i+1>=stopCount)break;vec4 a=stops[i],b=stops[i+1];float x=smoothstep(a.a,b.a,t);if(t>=a.a)color=mix(a.rgb,b.rgb,x);}
  return color;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed)*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy/resolution;float aspect=resolution.x/resolution.y;vec2 p=(uv-.5)*vec2(aspect,1.0);
  vec3 light=vec3(0);float alpha=0.0;float scale=mix(.65,2.4,flowScale);
  for(int i=0;i<8;i++){
    if(i>=ribbonCount)break;float fi=float(i),layer=fi/max(1.0,float(ribbonCount-1));
    float z=seed*.09+fi*7.31;
    float warpA=cnoise(vec3(p*scale*.72+vec2(fi,time*.09),z));
    float warpB=cnoise(vec3(p*scale*.91+vec2(8.3,-3.7)+warpA*organic,time*.08+z));
    float n=cnoise(vec3(p.x*scale+fi*1.7+warpB*organic,time*.12+z,p.x*.18+z));
    float fine=cnoise(vec3(p.x*scale*2.1-fi+warpA,time*.19+z+9.0,z))*.22*turbulence*complexity;
    float center=mix(-.48,.48,layer)+sin(p.x*(1.05+layer*.65)+time*.16+fi)*.10;
    center+=(n*.32+fine)*turbulence;
    float distanceToWave=abs(p.y-center);
    float body=exp(-distanceToWave*distanceToWave/mix(.003,.055,ribbonWidth));
    body=pow(body,mix(1.65,.48,softness));
    float halo=exp(-distanceToWave*mix(5.2,.85,glow*softness));
    float perspective=mix(.42,1.18,pow(layer,mix(1.8,.55,depth)));
    float colorT=layer;
    if(paletteMode==1)colorT=abs(layer-.5)*2.0;
    else if(paletteMode==2)colorT=fract(layer+uv.x+paletteAngle);
    else if(paletteMode==3)colorT=max(abs(layer-.5)*2.0,abs(uv.x-.5)*2.0);
    colorT=clamp(colorT+n*.055+paletteAngle*.12,0.0,1.0);
    vec3 color=palette(colorT);
    light+=color*(body*1.35+halo*glow*.42)*perspective;
    alpha=max(alpha,body+halo*glow*.32);
  }
  float blackCut=mix(0.0,.48,negativeSpace);alpha=smoothstep(blackCut,blackCut+mix(.32,.08,softness),alpha);
  light*=alpha;float lum=dot(light,vec3(.2126,.7152,.0722));light=mix(vec3(lum),light,saturation)*exposure;
  light+=vec3((hash(floor(gl_FragCoord.xy))-0.5)*grain*.07);
  alpha=clamp(alpha,0.0,1.0);if(includeBackground==1){light=mix(backgroundColor,light,alpha);alpha=1.0;}
  outColor=vec4(clamp(light,0.0,1.0),alpha);
}
