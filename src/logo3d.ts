import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type HeroSceneHandle = {
  destroy: () => void;
  resize: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function metal(color: number, roughness: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1,
    roughness,
    clearcoat: 0.22,
    clearcoatRoughness: 0.18,
    reflectivity: 1,
    envMapIntensity: 1.35,
  });
}

function spurShape(teeth: number, pitch: number, bore: number): THREE.Shape {
  const module = (2 * pitch) / teeth;
  const addendum = module * 0.9;
  const dedendum = module * 1.15;
  const outer = pitch + addendum;
  const inner = pitch - dedendum;
  const rootFillet = module * 0.18;
  const shape = new THREE.Shape();

  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const da = (Math.PI * 2) / teeth;
    const polar = (ang: number, r: number): [number, number] => [Math.cos(ang) * r, Math.sin(ang) * r];

    const rootA = a0;
    const riseA = a0 + da * 0.18;
    const tipA0 = a0 + da * 0.28;
    const tipA1 = a0 + da * 0.42;
    const fallA = a0 + da * 0.52;
    const rootB = a0 + da * 0.7;

    const p0 = polar(rootA, inner + rootFillet * 0.2);
    if (i === 0) shape.moveTo(p0[0], p0[1]);
    else shape.lineTo(p0[0], p0[1]);

    const pRise = polar(riseA, inner);
    const pTip0 = polar(tipA0, outer);
    shape.quadraticCurveTo(pRise[0], pRise[1], pTip0[0], pTip0[1]);
    shape.lineTo(...polar(tipA1, outer));
    const pFall = polar(fallA, inner);
    const pRoot = polar(rootB, inner + rootFillet * 0.2);
    shape.quadraticCurveTo(pFall[0], pFall[1], pRoot[0], pRoot[1]);
    shape.lineTo(...polar(a0 + da * 0.98, inner + rootFillet * 0.2));
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const pocketR = pitch * 0.38;
  const pocketSize = pitch * 0.13;
  for (let i = 0; i < 6; i++) {
    const pocket = new THREE.Path();
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pocket.absarc(Math.cos(ang) * pocketR, Math.sin(ang) * pocketR, pocketSize, 0, Math.PI * 2, true);
    shape.holes.push(pocket);
  }
  return shape;
}

function makePrecisionGear(): THREE.Group {
  const group = new THREE.Group();
  const teeth = 28;
  const pitch = 1.08;
  const thickness = 0.26;
  const bore = 0.17;

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(spurShape(teeth, pitch, bore), {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 3,
      curveSegments: 10,
    }),
    metal(0xd7dee8, 0.22),
  );
  body.geometry.center();
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, thickness + 0.08, 48), metal(0xe6ebf2, 0.14));
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  group.add(hub);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(pitch * 0.78, 0.018, 12, 64), metal(0x7dd3fc, 0.28));
  (rim.material as THREE.MeshPhysicalMaterial).metalness = 0.85;
  (rim.material as THREE.MeshPhysicalMaterial).emissive = new THREE.Color(0x0284c7);
  (rim.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.12;
  group.add(rim);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.35, 48), metal(0xf1f5f9, 0.1));
  shaft.rotation.x = Math.PI / 2;
  shaft.castShadow = true;
  group.add(shaft);

  const collar = (z: number) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 32), metal(0xcbd5e1, 0.18));
    c.rotation.x = Math.PI / 2;
    c.position.z = z;
    group.add(c);
  };
  collar(0.28);
  collar(-0.28);

  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.07, 6), metal(0xf59e0b, 0.32));
  (nut.material as THREE.MeshPhysicalMaterial).metalness = 0.85;
  nut.rotation.x = Math.PI / 2;
  nut.rotation.z = Math.PI / 12;
  nut.position.z = 0.42;
  group.add(nut);

  const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32), metal(0x94a3b8, 0.25));
  washer.rotation.x = Math.PI / 2;
  washer.position.z = 0.37;
  group.add(washer);

  return group;
}

export function mountHeroScene(canvas: HTMLCanvasElement): HeroSceneHandle | null {
  const gl =
    canvas.getContext("webgl2", { antialias: true, alpha: true, powerPreference: "high-performance" }) ||
    canvas.getContext("webgl", { antialias: true, alpha: true });
  if (!gl) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl as WebGLRenderingContext,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  pmrem.dispose();

  const scene = new THREE.Scene();
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(1.15, 0.72, 3.55);
  camera.lookAt(0, 0.02, 0);

  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(2.6, 3.4, 2.8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x38bdf8, 0.85);
  rim.position.set(-2.8, 0.8, -1.2);
  scene.add(rim);
  const warm = new THREE.PointLight(0xf59e0b, 6, 8, 2);
  warm.position.set(1.4, -0.2, 1.2);
  scene.add(warm);

  const gear = makePrecisionGear();
  gear.scale.setScalar(0.7);
  gear.rotation.x = 0.12;
  gear.rotation.y = 0.42;
  scene.add(gear);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.33, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.55,
      roughness: 0.28,
      transparent: true,
      opacity: 0.28,
      envMapIntensity: 0.8,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.74;
  ground.receiveShadow = true;
  scene.add(ground);

  let raf = 0;
  let running = true;
  const reduce = prefersReducedMotion();
  const clock = new THREE.Clock();

  const io = new IntersectionObserver(
    (entries) => {
      running = entries.some((e) => e.isIntersecting);
    },
    { threshold: 0.08 },
  );
  io.observe(canvas);

  const resize = () => {
    const parent = canvas.parentElement ?? canvas;
    const w = Math.max(240, parent.clientWidth);
    const h = Math.max(240, parent.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  const pointer = { x: 0, y: 0 };
  const onMove = (ev: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
  };
  canvas.addEventListener("pointermove", onMove, { passive: true });

  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!running) return;
    const t = clock.getElapsedTime();
    const spin = reduce ? 0 : t * 0.42;
    gear.rotation.z = spin;
    gear.rotation.y = 0.42 + pointer.x * 0.22;
    gear.rotation.x = 0.12 + pointer.y * 0.1;
    camera.position.x = 1.15 + pointer.x * 0.12;
    camera.position.y = 0.72 + pointer.y * 0.08;
    camera.lookAt(0, 0.02, 0);
    renderer.render(scene, camera);
  };
  tick();

  return {
    resize,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      env.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
    },
  };
}
