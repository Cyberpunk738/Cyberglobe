import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ─── Custom Vignette + Chromatic Aberration Shader ─────────
const VignetteChromaticShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.45 },
    uAberration: { value: 0.003 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uAberration;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5);
      float dist = distance(uv, center);

      // Chromatic aberration — stronger at edges
      float aberr = uAberration * dist * dist;
      float r = texture2D(tDiffuse, uv + vec2(aberr, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(aberr, 0.0)).b;

      vec3 color = vec3(r, g, b);

      // Vignette
      float vignette = 1.0 - dist * uIntensity * 1.8;
      vignette = clamp(vignette, 0.0, 1.0);
      vignette = smoothstep(0.0, 1.0, vignette);
      color *= vignette;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// ─── Setup Post-Processing Pipeline ───────────────────────
export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number
): EffectComposer {
  const composer = new EffectComposer(renderer);

  // 1. Render pass — renders the scene normally
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Bloom pass — HDR glow on bright elements (arcs, pulses, atmosphere)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.8,   // strength
    0.4,   // radius
    0.7    // threshold
  );
  composer.addPass(bloomPass);

  // 3. Vignette + Chromatic aberration
  const vignettePass = new ShaderPass(VignetteChromaticShader);
  composer.addPass(vignettePass);

  // 4. Output pass — tone mapping + color space conversion
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return composer;
}

export function resizePostProcessing(
  composer: EffectComposer,
  width: number,
  height: number
) {
  composer.setSize(width, height);
}
