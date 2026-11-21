'use strict';
// ===== Post-processing: HDR bloom, ACES grade, sun glare + lens ghosts, vignette, grain, chromatic fringe, FXAA =====
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, sunPos: { value: new T.Vector2(.5, .5) }, sunVis: { value: 0 }, aspect: { value: 1.6 }, exposure: { value: 1.18 }, vig: { value: 0.35 }, grain: { value: 0.035 }, res: { value: new T.Vector2(1920, 1080) }, tint: { value: new T.Vector3(1, 1, 1) }, sat: { value: 1.2 }, blur: { value: 0 }, rays: { value: 1 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float time,sunVis,aspect,exposure,vig,grain,sat,blur,rays;uniform vec2 sunPos,res;uniform vec3 tint;varying vec2 vUv;
vec3 aces(vec3 x){float a=2.51,b=.03,c=2.43,d=.59,e=.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 uv=vUv,dc=uv-.5;float r2=dot(dc,dc);
vec3 col;col.r=texture2D(tDiffuse,uv+dc*r2*.014).r;col.g=texture2D(tDiffuse,uv).g;col.b=texture2D(tDiffuse,uv-dc*r2*.014).b;
if(blur>.01){vec3 acc=col;for(int i=1;i<8;i++){acc+=texture2D(tDiffuse,uv-dc*blur*.06*float(i)/7.*smoothstep(.15,.8,length(dc)*1.4)).rgb;}col=mix(col,acc/8.,clamp(blur*1.5,0.,1.));}
if(sunVis>.02&&rays>.5){vec2 dir=(sunPos-uv)/26.;vec2 pp=uv;float wgt=1.;vec3 sh=vec3(0.);for(int i=0;i<26;i++){pp+=dir;vec3 s=texture2D(tDiffuse,pp).rgb;float l=dot(s,vec3(.33));sh+=s*smoothstep(1.2,3.,l)*wgt;wgt*=.95;}col+=sh*sunVis*.02*vec3(1.,.88,.7);}
vec2 a=vec2(aspect,1.);float d=distance(uv*a,sunPos*a);
col+=sunVis*vec3(1.,.82,.55)*(.16/(1.+d*22.)+.08*exp(-d*6.)+.6*exp(-d*60.));
for(int i=1;i<4;i++){vec2 g=mix(sunPos,vec2(.5)*2.-sunPos,float(i)*.42);float gd=distance(uv*a,g*a);float rad=.02+.012*float(i);col+=sunVis*vec3(.3,.55,.9)*smoothstep(rad,rad*.4,gd)*.07/float(i);}
vec2 px=1./res;vec3 nb=(texture2D(tDiffuse,uv+vec2(px.x,0.))+texture2D(tDiffuse,uv-vec2(px.x,0.))+texture2D(tDiffuse,uv+vec2(0.,px.y))+texture2D(tDiffuse,uv-vec2(0.,px.y))).rgb*.25;col+=clamp(col-nb,-.3,.3)*.5;
col*=exposure*tint;col=aces(col);col=mix(col,col*col*(3.-2.*col),.28);
float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,sat);
col=mix(col*vec3(.96,1.0,1.06),col*vec3(1.05,1.0,.94),smoothstep(.2,.8,l)); // teal shadows, warm highlights
col*=1.-vig*smoothstep(.35,1.05,length(dc)*1.3);
col+=(hash(uv*res+fract(time))-.5)*grain;
col=pow(max(col,0.),vec3(1./2.2));gl_FragColor=vec4(col,1.);}`,
};
const Post = {
  on: true, composer: null, bloom: null, grade: null, fxaa: null, _v: null,
  init(renderer, scene, camera) {
    this.renderer = renderer; this.camera = camera; this._v = new T.Vector3();
    const w = innerWidth, h = innerHeight, pr = renderer.getPixelRatio();
    const rt = new T.WebGLRenderTarget(w * pr, h * pr, { type: T.HalfFloatType, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
    this.composer = new T.EffectComposer(renderer, rt); this.composer.setPixelRatio(pr); this.composer.setSize(w, h);
    this.composer.addPass(new T.RenderPass(scene, camera));
    this.bloom = new T.UnrealBloomPass(new T.Vector2(w, h), 0.45, 0.65, 1.5); this.composer.addPass(this.bloom);
    this.grade = new T.ShaderPass(GradeShader); this.composer.addPass(this.grade);
    this.fxaa = new T.ShaderPass(T.FXAAShader); this.composer.addPass(this.fxaa); this.resize();
  },
  resize() {
    const r = this.renderer, pr = r.getPixelRatio(), w = innerWidth, h = innerHeight; this.composer.setPixelRatio(pr); this.composer.setSize(w, h);
    this.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); this.grade.uniforms.res.value.set(w * pr, h * pr); this.grade.uniforms.aspect.value = w / h;
  },
  setRes(pr) { this.renderer.setPixelRatio(pr); this.resize(); },
  toggle(v) { this.on = v === undefined ? !this.on : v; PostFlag.value = this.on ? 1 : 0; this.renderer.toneMapping = this.on ? T.NoToneMapping : T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.18; },
  render() {
    const U = this.grade.uniforms, cam = this.camera, night = G.night || 0, flash = (typeof Weather !== 'undefined' && Weather.ready) ? Weather.flash : 0, cloud = (typeof Weather !== 'undefined' && Weather.ready) ? Weather.s.cloud : 0;
    U.blur.value = lerp(U.blur.value, (P.inCar && P.car) ? clamp((Math.hypot(P.car.vx, P.car.vz) - 24) / 40, 0, 0.8) : 0, 0.08); U.time.value = G.time; U.exposure.value = 1.02 + flash * 1.6 + (G.cut ? 0.04 : 0); U.vig.value = (G.cut ? 0.6 : 0.34) + (G.tense || 0) * 0.2; U.grain.value = 0.03 + night * 0.025; U.sat.value = 1.26 - cloud * 0.12;
    // sun screen position & visibility (ray-occluded by buildings)
    const a = (G.tod / 1440) * TAU - Math.PI / 2, sd = this._v.set(Math.cos(a), Math.sin(a), 0.35).normalize(), cp = cam.position;
    const far = new T.Vector3(cp.x + sd.x * 900, cp.y + sd.y * 900, cp.z + sd.z * 900), sp = far.clone().project(cam);
    let vis = 0; if (sp.z < 1 && G.sunE > 0.0 && Math.abs(sp.x) < 1.6 && Math.abs(sp.y) < 1.6) { vis = clamp(1 - (Math.hypot(sp.x, sp.y) - 0.9) * 1.2, 0, 1) * clamp(G.sunE * 6, 0, 1) * (1 - cloud * 0.85); if (vis > 0.01 && rayHitSolid(cp.x, cp.y, cp.z, cp.x + sd.x * 160, cp.y + sd.y * 160, cp.z + sd.z * 160) >= 0) vis = 0; }
    U.sunPos.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); U.sunVis.value = vis * (this.sv = lerp(this.sv || 0, 1, 0.05));
    this.bloom.strength = lerp(0.2, 0.85, night) + flash * 0.8; this.bloom.threshold = lerp(2.6, 0.9, night); this.bloom.radius = 0.7;
    this.composer.render();
  },
};
