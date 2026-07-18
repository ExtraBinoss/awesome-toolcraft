export const BLOB_TRACK_VERTEX = `#version 300 es
in vec2 a_position; out vec2 v_uv;
void main(){ v_uv=a_position*.5+.5; gl_Position=vec4(a_position,0.,1.); }`;

export const BLOB_TRACK_MASK_FRAGMENT = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 outColor;
uniform sampler2D uTexture; uniform vec2 uSourceSize; uniform vec2 uOutputSize;
uniform int uMode; uniform vec3 uKeyColor; uniform float uKeyTolerance; uniform float uBackgroundGain;
vec2 coverUv(){ float sa=uSourceSize.x/uSourceSize.y, oa=uOutputSize.x/uOutputSize.y; vec2 uv=v_uv; if(sa>oa) uv.x=.5+(uv.x-.5)*oa/sa; else uv.y=.5+(uv.y-.5)*sa/oa; return uv; }
void main(){ vec3 c=texture(uTexture,coverUv()).rgb; float luma=dot(c,vec3(.299,.587,.114)); float dark=1.-luma; float key=(1.-smoothstep(uKeyTolerance*.55,uKeyTolerance,distance(c,uKeyColor))); float background=clamp(length(c-vec3(.08,.08,.08))*uBackgroundGain,0.,1.); float mask=uMode==1?dark:(uMode==2?key:(uMode==3?background:luma)); outColor=vec4(mask,luma,key,background); }`;

export const BLOB_TRACK_BLUR_FRAGMENT = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 outColor; uniform sampler2D uInput; uniform vec2 uTexel; uniform vec2 uDirection; uniform int uRadius;
void main(){ float sum=0.,total=0.; for(int i=-8;i<=8;i++){ if(abs(i)<=uRadius){ float x=float(i),w=exp(-(x*x)/(2.*max(float(uRadius),1.))); sum+=texture(uInput,v_uv+uDirection*uTexel*x).r*w; total+=w; }} float v=sum/max(total,.0001); outColor=vec4(v,v,v,1.); }`;

export const BLOB_TRACK_FIELD_FRAGMENT = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 outColor; uniform sampler2D uInput; uniform float uThreshold; uniform float uSoftness;
void main(){ float v=texture(uInput,v_uv).r; float m=smoothstep(uThreshold-uSoftness,uThreshold+uSoftness,v); outColor=vec4(m,m,m,1.); }`;

export const BLOB_TRACK_EDGE_FRAGMENT = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 outColor; uniform sampler2D uInput; uniform vec2 uTexel; uniform float uGain;
float s(vec2 o){return texture(uInput,v_uv+o*uTexel).r;} void main(){float tl=s(vec2(-1)),t=s(vec2(0,-1)),tr=s(vec2(1,-1)),l=s(vec2(-1,0)),r=s(vec2(1,0)),bl=s(vec2(-1,1)),b=s(vec2(0,1)),br=s(vec2(1)); float gx=-tl-2.*l-bl+tr+2.*r+br,gy=-tl-2.*t-tr+bl+2.*b+br,e=clamp(length(vec2(gx,gy))*uGain,0.,1.);outColor=vec4(e,e,e,1.);}`;

export const BLOB_TRACK_FINAL_FRAGMENT = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 outColor; uniform sampler2D uTexture,uMask,uEdge,uBlur,uField,uOverlay; uniform vec2 uSourceSize,uOutputSize; uniform int uView; uniform float uMix;
vec2 coverUv(){float sa=uSourceSize.x/uSourceSize.y,oa=uOutputSize.x/uOutputSize.y;vec2 uv=v_uv;if(sa>oa)uv.x=.5+(uv.x-.5)*oa/sa;else uv.y=.5+(uv.y-.5)*sa/oa;return uv;}
void main(){vec4 original=texture(uTexture,coverUv()),overlay=texture(uOverlay,v_uv);float value=uView==2?texture(uEdge,v_uv).r:(uView==3?texture(uBlur,v_uv).r:(uView==4?texture(uMask,v_uv).r:texture(uField,v_uv).r));vec4 debug=vec4(vec3(value),1.);vec4 effected=uView==0?vec4(mix(original.rgb,overlay.rgb,overlay.a),original.a):(uView==1?original:debug);outColor=mix(original,effected,clamp(uMix,0.,1.));}`;
