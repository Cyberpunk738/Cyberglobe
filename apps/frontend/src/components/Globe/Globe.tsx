'use client';

import { useRef, useEffect, useCallback, memo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { latLngToVector3 } from '@/lib/geo';
import { createPostProcessing, resizePostProcessing } from './PostProcessing';

// ─── Types ────────────────────────────────────────────────
interface AttackEvent {
  id: string;
  source_lat: number;
  source_lng: number;
  target_lat: number;
  target_lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  attack_type: string;
}

interface ArcData {
  id: string;
  curve: THREE.QuadraticBezierCurve3;
  line: THREE.Line;
  progress: number;
  opacity: number;
  phase: 'growing' | 'fading';
  color: number;
  // Particle trail head
  trailHead: THREE.Mesh;
  trailParticles: THREE.Points;
  trailPositions: Float32Array;
  trailOpacities: Float32Array;
  trailIndex: number;
}

interface PulseData {
  mesh: THREE.Mesh;
  scale: number;
  opacity: number;
  // Explosion particles
  explosion: THREE.Points | null;
  explosionVelocities: THREE.Vector3[];
  explosionLife: number;
}

// ─── Constants ────────────────────────────────────────────
const GLOBE_RADIUS = 5;
const ARC_SEGMENTS = 64;
const MAX_ARCS = 30;
const MAX_TRAIL_PARTICLES = 40;
const MAX_EXPLOSION_PARTICLES = 24;

const SEVERITY_COLORS: Record<string, number> = {
  low: 0x00f0ff,
  medium: 0xffaa00,
  high: 0xff4444,
  critical: 0xff00aa,
};

// ─── Country dots (major cities/points) ───────────────────
const COUNTRY_POINTS = [
  { lat: 38, lng: -97 }, { lat: 56, lng: -106 }, { lat: 23, lng: -102 },
  { lat: -14, lng: -51 }, { lat: -38, lng: -63 }, { lat: 4, lng: -72 },
  { lat: 55, lng: -3 }, { lat: 51, lng: 9 }, { lat: 46, lng: 2 },
  { lat: 52, lng: 5 }, { lat: 60, lng: 18 }, { lat: 51, lng: 20 },
  { lat: 41, lng: 12 }, { lat: 40, lng: -4 }, { lat: 48, lng: 31 },
  { lat: 45, lng: 25 }, { lat: 61, lng: 105 }, { lat: 32, lng: 53 },
  { lat: 31, lng: 34 }, { lat: 23, lng: 45 }, { lat: 23, lng: 53 },
  { lat: 38, lng: 35 }, { lat: 35, lng: 105 }, { lat: 36, lng: 138 },
  { lat: 35, lng: 127 }, { lat: 40, lng: 127 }, { lat: 20, lng: 78 },
  { lat: 30, lng: 69 }, { lat: 14, lng: 108 }, { lat: 23, lng: 120 },
  { lat: 1, lng: 103 }, { lat: -5, lng: 120 }, { lat: 15, lng: 100 },
  { lat: 9, lng: 8 }, { lat: -30, lng: 22 }, { lat: 26, lng: 30 },
  { lat: 0, lng: 37 }, { lat: -25, lng: 133 }, { lat: -40, lng: 174 },
];

// ─── Shared geometry/material (created once) ──────────────
let _sharedPulseGeom: THREE.RingGeometry | null = null;
let _sharedDotGeom: THREE.SphereGeometry | null = null;
let _sharedTrailHeadGeom: THREE.SphereGeometry | null = null;

function getSharedPulseGeom() {
  if (!_sharedPulseGeom) _sharedPulseGeom = new THREE.RingGeometry(0.05, 0.12, 32);
  return _sharedPulseGeom;
}
function getSharedDotGeom() {
  if (!_sharedDotGeom) _sharedDotGeom = new THREE.SphereGeometry(0.04, 6, 6);
  return _sharedDotGeom;
}
function getSharedTrailHeadGeom() {
  if (!_sharedTrailHeadGeom) _sharedTrailHeadGeom = new THREE.SphereGeometry(0.06, 8, 8);
  return _sharedTrailHeadGeom;
}

// ─── Component ────────────────────────────────────────────
function GlobeInner({ attacks }: { attacks: AttackEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const arcsRef = useRef<ArcData[]>([]);
  const pulsesRef = useRef<PulseData[]>([]);
  const processedAttackIds = useRef(new Set<string>());
  const animFrameRef = useRef<number>(0);
  const ambientParticlesRef = useRef<THREE.Points | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const instancedDotsRef = useRef<THREE.InstancedMesh | null>(null);

  // ─── Create procedural earth texture ───────────────────
  const createEarthTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Dark background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 64) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Draw simplified continents
    drawContinents(ctx, canvas.width, canvas.height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // ─── Initialize Three.js scene ─────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030308);
    scene.fog = new THREE.FogExp2(0x030308, 0.012);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 14);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Post-processing
    const composer = createPostProcessing(renderer, scene, camera, width, height);
    composerRef.current = composer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 7;
    controls.maxDistance = 25;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // ─── Globe sphere ─────────────────────────────────
    const earthTexture = createEarthTexture();
    const globeGeom = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      transparent: true,
      opacity: 0.95,
      shininess: 15,
    });
    const globeMesh = new THREE.Mesh(globeGeom, globeMat);
    globeGroup.add(globeMesh);

    // ─── Multi-layer atmosphere ───────────────────────
    // Inner fresnel glow
    const atmo1Geom = new THREE.SphereGeometry(GLOBE_RADIUS * 1.012, 64, 64);
    const atmo1Mat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          float pulse = 0.9 + 0.1 * sin(uTime * 1.5);
          gl_FragColor = vec4(0.0, 0.94, 1.0, intensity * 0.5 * pulse);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmo1 = new THREE.Mesh(atmo1Geom, atmo1Mat);
    globeGroup.add(atmo1);

    // Outer halo
    const atmo2Geom = new THREE.SphereGeometry(GLOBE_RADIUS * 1.06, 64, 64);
    const atmo2Mat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
          float shimmer = 0.85 + 0.15 * sin(uTime * 0.8 + vNormal.x * 3.0);
          gl_FragColor = vec4(0.0, 0.6, 1.0, intensity * 0.2 * shimmer);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmo2 = new THREE.Mesh(atmo2Geom, atmo2Mat);
    globeGroup.add(atmo2);

    // ─── Instanced country dots (1 draw call) ────────
    const dotGeom = getSharedDotGeom();
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
    });
    const instancedDots = new THREE.InstancedMesh(dotGeom, dotMat, COUNTRY_POINTS.length);
    const dummy = new THREE.Object3D();
    COUNTRY_POINTS.forEach(({ lat, lng }, i) => {
      const [x, y, z] = latLngToVector3(lat, lng, GLOBE_RADIUS + 0.02);
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      instancedDots.setMatrixAt(i, dummy.matrix);
    });
    instancedDots.instanceMatrix.needsUpdate = true;
    globeGroup.add(instancedDots);
    instancedDotsRef.current = instancedDots;

    // ─── Lighting ────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x334466, 1.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x00f0ff, 0.6, 50);
    pointLight1.position.set(-10, 5, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00aa, 0.3, 50);
    pointLight2.position.set(10, -5, -10);
    scene.add(pointLight2);

    // ─── Twinkling star field ────────────────────────
    const starCount = 4000;
    const starsGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starOpacities = new Float32Array(starCount);
    const starSpeeds = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 250;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 250;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 250;
      starOpacities[i] = Math.random();
      starSpeeds[i] = 0.3 + Math.random() * 2.0;
    }
    starsGeom.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starsGeom, starsMat);
    scene.add(stars);
    starsRef.current = stars;

    // Store twinkle data on userData
    stars.userData.opacities = starOpacities;
    stars.userData.speeds = starSpeeds;

    // ─── Ambient floating particles ──────────────────
    const ambientCount = 600;
    const ambientGeom = new THREE.BufferGeometry();
    const ambientPos = new Float32Array(ambientCount * 3);
    const ambientVel = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = GLOBE_RADIUS * (1.2 + Math.random() * 2.5);
      ambientPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      ambientPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      ambientPos[i * 3 + 2] = r * Math.cos(phi);
      ambientVel[i * 3] = (Math.random() - 0.5) * 0.01;
      ambientVel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      ambientVel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    ambientGeom.setAttribute('position', new THREE.Float32BufferAttribute(ambientPos, 3));
    const ambientMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.04,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ambientParticles = new THREE.Points(ambientGeom, ambientMat);
    scene.add(ambientParticles);
    ambientParticlesRef.current = ambientParticles;
    ambientParticles.userData.velocities = ambientVel;

    // ─── Animation loop ──────────────────────────────
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Slow globe rotation
      globeGroup.rotation.y += 0.0008;

      // Animate atmosphere
      (atmo1.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
      (atmo2.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;

      // ── Animate instanced dots (breathing pulse) ──
      const dotScale = 1.0 + 0.25 * Math.sin(elapsed * 2.0);
      const d = new THREE.Object3D();
      COUNTRY_POINTS.forEach(({ lat, lng }, i) => {
        const [x, y, z] = latLngToVector3(lat, lng, GLOBE_RADIUS + 0.02);
        d.position.set(x, y, z);
        d.scale.setScalar(dotScale);
        d.updateMatrix();
        instancedDots.setMatrixAt(i, d.matrix);
      });
      instancedDots.instanceMatrix.needsUpdate = true;

      // ── Animate arcs ──
      const arcs = arcsRef.current;
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        if (arc.phase === 'growing') {
          arc.progress = Math.min(arc.progress + delta * 0.8, 1);
          if (arc.progress >= 1) arc.phase = 'fading';
          updateArcGeometry(arc);

          // Move trail head along curve
          const headPos = arc.curve.getPointAt(arc.progress);
          arc.trailHead.position.copy(headPos);
          arc.trailHead.visible = true;

          // Add trail particles
          const tIdx = (arc.trailIndex % MAX_TRAIL_PARTICLES) * 3;
          arc.trailPositions[tIdx] = headPos.x;
          arc.trailPositions[tIdx + 1] = headPos.y;
          arc.trailPositions[tIdx + 2] = headPos.z;
          arc.trailOpacities[arc.trailIndex % MAX_TRAIL_PARTICLES] = 1.0;
          arc.trailIndex++;
          arc.trailParticles.geometry.attributes.position.needsUpdate = true;
        } else {
          arc.opacity -= delta * 0.5;
          if (arc.opacity <= 0) {
            globeGroup.remove(arc.line);
            globeGroup.remove(arc.trailHead);
            globeGroup.remove(arc.trailParticles);
            arc.line.geometry.dispose();
            (arc.line.material as THREE.Material).dispose();
            arc.trailParticles.geometry.dispose();
            (arc.trailParticles.material as THREE.Material).dispose();
            (arc.trailHead.material as THREE.Material).dispose();
            arcs.splice(i, 1);
            continue;
          }
          (arc.line.material as THREE.LineBasicMaterial).opacity = arc.opacity;
          arc.trailHead.visible = false;
        }

        // Fade trail particles
        for (let t = 0; t < MAX_TRAIL_PARTICLES; t++) {
          arc.trailOpacities[t] = Math.max(0, arc.trailOpacities[t] - delta * 1.5);
        }
      }

      // ── Animate pulses & explosions ──
      const pulses = pulsesRef.current;
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        pulse.scale += delta * 3;
        pulse.opacity -= delta * 0.5;

        // Animate explosion particles
        if (pulse.explosion && pulse.explosionLife > 0) {
          pulse.explosionLife -= delta;
          const exPos = pulse.explosion.geometry.attributes.position;
          const posArray = exPos.array as Float32Array;
          for (let p = 0; p < pulse.explosionVelocities.length; p++) {
            posArray[p * 3] += pulse.explosionVelocities[p].x * delta;
            posArray[p * 3 + 1] += pulse.explosionVelocities[p].y * delta;
            posArray[p * 3 + 2] += pulse.explosionVelocities[p].z * delta;
          }
          exPos.needsUpdate = true;
          (pulse.explosion.material as THREE.PointsMaterial).opacity =
            Math.max(0, pulse.explosionLife / 1.5);
        }

        if (pulse.opacity <= 0) {
          globeGroup.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          (pulse.mesh.material as THREE.Material).dispose();
          if (pulse.explosion) {
            globeGroup.remove(pulse.explosion);
            pulse.explosion.geometry.dispose();
            (pulse.explosion.material as THREE.Material).dispose();
          }
          pulses.splice(i, 1);
          continue;
        }
        pulse.mesh.scale.set(pulse.scale, pulse.scale, pulse.scale);
        (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = pulse.opacity;
      }

      // ── Animate ambient particles (brownian motion) ──
      if (ambientParticles) {
        const aPos = ambientParticles.geometry.attributes.position;
        const aVel = ambientParticles.userData.velocities as Float32Array;
        const aPosArr = aPos.array as Float32Array;
        for (let i = 0; i < ambientCount; i++) {
          aPosArr[i * 3] += aVel[i * 3];
          aPosArr[i * 3 + 1] += aVel[i * 3 + 1];
          aPosArr[i * 3 + 2] += aVel[i * 3 + 2];

          // Slight random drift
          aVel[i * 3] += (Math.random() - 0.5) * 0.0004;
          aVel[i * 3 + 1] += (Math.random() - 0.5) * 0.0004;
          aVel[i * 3 + 2] += (Math.random() - 0.5) * 0.0004;

          // Constrain to globe vicinity
          const dist = Math.sqrt(
            aPosArr[i * 3] ** 2 + aPosArr[i * 3 + 1] ** 2 + aPosArr[i * 3 + 2] ** 2
          );
          if (dist > GLOBE_RADIUS * 4 || dist < GLOBE_RADIUS * 1.1) {
            aVel[i * 3] *= -0.5;
            aVel[i * 3 + 1] *= -0.5;
            aVel[i * 3 + 2] *= -0.5;
          }
        }
        aPos.needsUpdate = true;
        ambientParticles.rotation.y += 0.0003;
      }

      // ── Animate twinkling stars ──
      if (stars) {
        const sOp = stars.userData.opacities as Float32Array;
        const sSp = stars.userData.speeds as Float32Array;
        const baseSizes = stars.geometry.attributes.position.array;
        // Just modulate overall material opacity subtly (cheaper than per-particle)
        (stars.material as THREE.PointsMaterial).opacity =
          0.6 + 0.3 * Math.sin(elapsed * 0.3);
        // Slow rotation for parallax
        stars.rotation.y += 0.00005;
        stars.rotation.x += 0.00002;
      }

      controls.update();
      // Render via composer (post-processing)
      composer.render();
    };
    animate();

    // ─── Debounced Resize handler ─────────────────────
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        resizePostProcessing(composer, w, h);
      }, 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [createEarthTexture]);

  // ─── Add attack arcs when new attacks arrive ───────────
  useEffect(() => {
    if (!globeGroupRef.current) return;

    attacks.forEach((attack) => {
      if (processedAttackIds.current.has(attack.id)) return;
      processedAttackIds.current.add(attack.id);

      // Limit active arcs
      if (arcsRef.current.length >= MAX_ARCS) return;

      const color = SEVERITY_COLORS[attack.severity] || 0x00f0ff;
      addAttackArc(
        attack.source_lat, attack.source_lng,
        attack.target_lat, attack.target_lng,
        color
      );
      addPulseMarker(attack.target_lat, attack.target_lng, color);
    });

    // Trim old IDs
    if (processedAttackIds.current.size > 200) {
      const ids = Array.from(processedAttackIds.current);
      ids.slice(0, 100).forEach((id) => processedAttackIds.current.delete(id));
    }
  }, [attacks]);

  // ─── Create arc with particle trail ────────────────────
  const addAttackArc = (
    srcLat: number, srcLng: number,
    tgtLat: number, tgtLng: number,
    color: number
  ) => {
    const globeGroup = globeGroupRef.current;
    if (!globeGroup) return;

    const src = new THREE.Vector3(...latLngToVector3(srcLat, srcLng, GLOBE_RADIUS + 0.05));
    const tgt = new THREE.Vector3(...latLngToVector3(tgtLat, tgtLng, GLOBE_RADIUS + 0.05));

    // Calculate midpoint with altitude
    const mid = new THREE.Vector3().addVectors(src, tgt).multiplyScalar(0.5);
    const dist = src.distanceTo(tgt);
    mid.normalize().multiplyScalar(GLOBE_RADIUS + dist * 0.4);

    const curve = new THREE.QuadraticBezierCurve3(src, mid, tgt);

    // Pre-allocate arc buffer with drawRange
    const fullPoints = curve.getPoints(ARC_SEGMENTS);
    const positions = new Float32Array(ARC_SEGMENTS * 3 + 3);
    for (let i = 0; i < fullPoints.length; i++) {
      positions[i * 3] = fullPoints[i].x;
      positions[i * 3 + 1] = fullPoints[i].y;
      positions[i * 3 + 2] = fullPoints[i].z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 1);

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });

    const line = new THREE.Line(geometry, material);
    globeGroup.add(line);

    // Trail head (glowing sphere at leading edge)
    const trailHeadGeom = getSharedTrailHeadGeom();
    const trailHeadMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1.0,
    });
    const trailHead = new THREE.Mesh(trailHeadGeom, trailHeadMat);
    trailHead.visible = false;
    globeGroup.add(trailHead);

    // Trail particles
    const trailPositions = new Float32Array(MAX_TRAIL_PARTICLES * 3);
    const trailOpacities = new Float32Array(MAX_TRAIL_PARTICLES);
    const trailGeom = new THREE.BufferGeometry();
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trailParticles = new THREE.Points(trailGeom, trailMat);
    globeGroup.add(trailParticles);

    arcsRef.current.push({
      id: Math.random().toString(36),
      curve,
      line,
      progress: 0,
      opacity: 0.9,
      phase: 'growing',
      color,
      trailHead,
      trailParticles,
      trailPositions,
      trailOpacities,
      trailIndex: 0,
    });
  };

  // ─── Create pulse marker + explosion at target ─────────
  const addPulseMarker = (lat: number, lng: number, color: number) => {
    const globeGroup = globeGroupRef.current;
    if (!globeGroup) return;

    const [x, y, z] = latLngToVector3(lat, lng, GLOBE_RADIUS + 0.06);
    const geom = getSharedPulseGeom();
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    globeGroup.add(mesh);

    // Impact explosion particles
    const exPositions = new Float32Array(MAX_EXPLOSION_PARTICLES * 3);
    const exVelocities: THREE.Vector3[] = [];
    const normal = new THREE.Vector3(x, y, z).normalize();
    for (let i = 0; i < MAX_EXPLOSION_PARTICLES; i++) {
      exPositions[i * 3] = x;
      exPositions[i * 3 + 1] = y;
      exPositions[i * 3 + 2] = z;
      // Random velocity biased outward from globe surface
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      ).add(normal.clone().multiplyScalar(0.3 + Math.random() * 0.5));
      exVelocities.push(vel);
    }
    const exGeom = new THREE.BufferGeometry();
    exGeom.setAttribute('position', new THREE.BufferAttribute(exPositions, 3));
    const exMat = new THREE.PointsMaterial({
      color,
      size: 0.06,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const explosion = new THREE.Points(exGeom, exMat);
    globeGroup.add(explosion);

    pulsesRef.current.push({
      mesh,
      scale: 1,
      opacity: 0.9,
      explosion,
      explosionVelocities: exVelocities,
      explosionLife: 1.5,
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}

// Memoize Globe to prevent unnecessary re-renders from parent
const Globe = memo(GlobeInner);
export default Globe;

// ─── Update arc geometry via drawRange ────────────────────
function updateArcGeometry(arc: ArcData) {
  const count = Math.ceil(ARC_SEGMENTS * arc.progress);
  arc.line.geometry.setDrawRange(0, Math.max(count, 2));
}

// ─── Draw simplified continents on canvas ─────────────────
function drawContinents(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1.5;

  const toXY = (lat: number, lng: number): [number, number] => {
    const x = ((lng + 180) / 360) * w;
    const y = ((90 - lat) / 180) * h;
    return [x, y];
  };

  const drawShape = (coords: [number, number][]) => {
    ctx.beginPath();
    const [sx, sy] = toXY(coords[0][0], coords[0][1]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < coords.length; i++) {
      const [cx, cy] = toXY(coords[i][0], coords[i][1]);
      ctx.lineTo(cx, cy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // North America
  drawShape([
    [70, -165], [72, -130], [65, -60], [50, -55], [42, -65], [30, -80],
    [25, -97], [18, -100], [15, -85], [10, -80], [8, -77], [10, -73],
    [30, -115], [48, -125], [55, -130], [60, -140], [60, -165],
  ]);

  // South America
  drawShape([
    [12, -70], [5, -60], [-5, -35], [-15, -40], [-22, -40], [-35, -55],
    [-55, -65], [-55, -70], [-40, -73], [-20, -70], [-5, -80], [5, -77], [10, -73],
  ]);

  // Europe
  drawShape([
    [70, -10], [72, 30], [65, 40], [55, 28], [45, 40], [35, 25],
    [36, -5], [42, -9], [44, -1], [48, -5], [48, 2], [51, 2],
    [55, -5], [58, -3], [60, 5], [63, 10],
  ]);

  // Africa
  drawShape([
    [37, -10], [35, 10], [30, 32], [10, 42], [-2, 42], [-12, 40],
    [-25, 32], [-35, 18], [-35, 20], [-30, 30], [-20, 35],
    [-35, 25], [-34, 18], [-28, 15], [-15, 10], [-5, 8],
    [5, -5], [5, -10], [15, -17], [20, -17], [30, -10], [35, -5],
  ]);

  // Asia
  drawShape([
    [72, 30], [75, 100], [72, 130], [65, 175], [55, 160], [50, 140],
    [40, 130], [35, 140], [30, 120], [22, 115], [20, 100], [15, 100],
    [8, 80], [5, 73], [10, 60], [25, 55], [25, 45], [30, 32], [35, 25],
    [40, 45], [45, 40], [55, 28], [65, 40],
  ]);

  // Australia
  drawShape([
    [-12, 130], [-15, 140], [-25, 150], [-37, 148], [-35, 138],
    [-32, 115], [-20, 114], [-12, 130],
  ]);
}
