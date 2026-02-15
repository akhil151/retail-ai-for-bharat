import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './PixelBlast.css';

const SHAPE_MAP: Record<string, number> = { square: 0, circle: 1, triangle: 2, diamond: 3 };
const MAX_CLICKS = 10;

const VERTEX_SRC = `void main() { gl_Position = vec4(position, 1.0); }`;

const FRAGMENT_SRC = `
precision highp float;
uniform vec3 uColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform int uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform int uShapeType;
uniform vec2 uClickPos[10];
uniform float uClickTimes[10];
out vec4 fragColor;

float Bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

float hash11(float n){ return fract(sin(n)*43758.5453); }
float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0,0,0), vec3(1,57,113)));
  float n100 = hash11(dot(ip + vec3(1,0,0), vec3(1,57,113)));
  float n010 = hash11(dot(ip + vec3(0,1,0), vec3(1,57,113)));
  float n110 = hash11(dot(ip + vec3(1,1,0), vec3(1,57,113)));
  float n001 = hash11(dot(ip + vec3(0,0,1), vec3(1,57,113)));
  float n101 = hash11(dot(ip + vec3(1,0,1), vec3(1,57,113)));
  float n011 = hash11(dot(ip + vec3(0,1,1), vec3(1,57,113)));
  float n111 = hash11(dot(ip + vec3(1,1,1), vec3(1,57,113)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  return mix(mix(mix(n000, n100, w.x), mix(n010, n110, w.x), w.y), mix(mix(n001, n101, w.x), mix(n011, n111, w.x), w.y), w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float sum = 1.0;
  for (int i = 0; i < 5; ++i){
    sum += vnoise(p);
    p *= 1.25;
  }
  return sum * 0.5 + 0.5;
}

void main(){
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 cellCoord = floor(fragCoord / (8.0 * uPixelSize)) * (8.0 * uPixelSize);
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);
  float base = fbm2(uv, uTime * 0.05) * 0.5 - 0.65;
  float feed = base + (uDensity - 0.5) * 0.3;

  if (uEnableRipples == 1) {
    for (int i = 0; i < 10; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      vec2 cuv = ((pos - uResolution * .5) / uResolution) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = uRippleSpeed * t;
      float ring = exp(-pow((r - waveR) / uRippleThickness, 2.0));
      feed = max(feed, ring * exp(-t) * exp(-10.0 * r) * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float M = step(0.5, feed + bayer);

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    M *= smoothstep(0.0, uEdgeFade, edge);
  }

  vec3 srgbColor = mix(uColor * 12.92, 1.055 * pow(uColor, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, uColor));
  fragColor = vec4(srgbColor, M);
}`;

interface PixelBlastProps {
  variant?: 'square' | 'circle' | 'triangle' | 'diamond';
  pixelSize?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  patternScale?: number;
  patternDensity?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleSpeed?: number;
  rippleThickness?: number;
  rippleIntensityScale?: number;
  speed?: number;
  edgeFade?: number;
  transparent?: boolean;
}

const PixelBlast = ({
  variant = 'square',
  pixelSize = 3,
  color = '#FFD700',
  className,
  style,
  patternScale = 2,
  patternDensity = 1,
  enableRipples = true,
  rippleIntensityScale = 1,
  rippleThickness = 0.1,
  rippleSpeed = 0.3,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5
}: PixelBlastProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);
    if (transparent) renderer.setClearAlpha(0);

    const uniforms = {
      uResolution: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uClickPos: { value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)) },
      uClickTimes: { value: new Float32Array(MAX_CLICKS) },
      uShapeType: { value: SHAPE_MAP[variant] ?? 0 },
      uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
      uScale: { value: patternScale },
      uDensity: { value: patternDensity },
      uEnableRipples: { value: enableRipples ? 1 : 0 },
      uRippleSpeed: { value: rippleSpeed },
      uRippleThickness: { value: rippleThickness },
      uRippleIntensity: { value: rippleIntensityScale },
      uEdgeFade: { value: edgeFade }
    };

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SRC,
      fragmentShader: FRAGMENT_SRC,
      uniforms,
      transparent: true,
      glslVersion: THREE.GLSL3
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    const clock = new THREE.Clock();
    const setSize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
      uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();
    };
    setSize();

    const ro = new ResizeObserver(setSize);
    ro.observe(container);

    const timeOffset = Math.random() * 1000;
    let clickIx = 0;

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const scaleX = renderer.domElement.width / rect.width;
      const scaleY = renderer.domElement.height / rect.height;
      const fx = (e.clientX - rect.left) * scaleX;
      const fy = (rect.height - (e.clientY - rect.top)) * scaleY;
      uniforms.uClickPos.value[clickIx].set(fx, fy);
      uniforms.uClickTimes.value[clickIx] = uniforms.uTime.value;
      clickIx = (clickIx + 1) % MAX_CLICKS;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown as any);

    let raf = 0;
    const animate = () => {
      uniforms.uTime.value = timeOffset + clock.getElapsedTime() * speed;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    threeRef.current = { renderer, ro, raf, quad, material };

    return () => {
      const t = threeRef.current;
      if (!t) return;
      t.ro?.disconnect();
      cancelAnimationFrame(t.raf);
      t.quad?.geometry.dispose();
      t.material.dispose();
      t.renderer.dispose();
      if (t.renderer.domElement.parentElement === container) container.removeChild(t.renderer.domElement);
      threeRef.current = null;
    };
  }, [variant, pixelSize, color, patternScale, patternDensity, enableRipples, rippleIntensityScale, rippleThickness, rippleSpeed, speed, edgeFade, transparent]);

  return <div ref={containerRef} className={`pixel-blast-container ${className ?? ''}`} style={style} />;
};

export default PixelBlast;
