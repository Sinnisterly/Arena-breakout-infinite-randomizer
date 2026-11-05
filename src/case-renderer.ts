import * as THREE from "three";
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(320, 320);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
const scene = new THREE.Scene(),
  camera = new THREE.OrthographicCamera(-1.45, 1.45, 1.45, -1.45, 0.1, 30);
camera.position.set(2.7, 2.2, 3.9);
camera.lookAt(0, 0.83, 0);
scene.add(new THREE.HemisphereLight(0xe4e9dc, 0x202b1b, 2.1));
const key = new THREE.DirectionalLight(0xffe7c6, 3.2);
key.position.set(-3, 5, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xc9dcdf, 2);
rim.position.set(3, 3, -3);
scene.add(rim);
const textureCanvas = document.createElement("canvas");
textureCanvas.width = textureCanvas.height = 256;
const tc = textureCanvas.getContext("2d")!;
tc.fillStyle = "#515442";
tc.fillRect(0, 0, 256, 256);
let seed = 71829;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
for (let i = 0; i < 18000; i++) {
  const v = random();
  tc.fillStyle = v > 0.72 ? "rgba(164,157,127,.18)" : "rgba(18,26,17,.15)";
  tc.fillRect(
    random() * 256,
    random() * 256,
    1 + random() * 2,
    1 + random() * 2,
  );
}
for (let i = 0; i < 230; i++) {
  tc.strokeStyle = i % 3 ? "rgba(196,188,158,.22)" : "rgba(31,33,25,.5)";
  const x = random() * 256,
    y = random() * 256;
  tc.beginPath();
  tc.moveTo(x, y);
  tc.lineTo(x + random() * 25 - 8, y + random() * 5);
  tc.stroke();
}
const wear = new THREE.CanvasTexture(textureCanvas);
wear.colorSpace = THREE.SRGBColorSpace;
wear.wrapS = wear.wrapT = THREE.RepeatWrapping;
const paint = new THREE.MeshStandardMaterial({
    map: wear,
    metalness: 0.4,
    roughness: 0.72,
  }),
  edge = new THREE.MeshStandardMaterial({
    color: 0x777766,
    metalness: 0.82,
    roughness: 0.49,
  }),
  steel = new THREE.MeshStandardMaterial({
    color: 0xa1a092,
    metalness: 0.85,
    roughness: 0.38,
  }),
  foam = new THREE.MeshStandardMaterial({
    color: 0x101411,
    roughness: 1,
    metalness: 0,
  });
const caseGroup = new THREE.Group();
scene.add(caseGroup);
caseGroup.scale.setScalar(1.15);
function box(
  parent: THREE.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  material = paint,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
box(caseGroup, 1.78, 0.1, 1.07, 0, 0.055, 0);
box(caseGroup, 1.78, 0.62, 0.065, 0, 0.39, 0.5);
box(caseGroup, 1.78, 0.62, 0.065, 0, 0.39, -0.5);
box(caseGroup, 0.065, 0.62, 0.97, -0.857, 0.39, 0);
box(caseGroup, 0.065, 0.62, 0.97, 0.857, 0.39, 0);
box(caseGroup, 1.64, 0.055, 0.91, 0, 0.135, 0, foam);
for (const z of [-0.529, 0.529]) {
  box(caseGroup, 1.79, 0.045, 0.028, 0, 0.108, z, edge);
  box(caseGroup, 1.79, 0.04, 0.03, 0, 0.69, z, edge);
  for (const x of [-0.79, -0.31, 0.31, 0.79])
    box(caseGroup, 0.055, 0.47, 0.023, x, 0.39, z);
}
for (const x of [-0.88, 0.88]) {
  box(caseGroup, 0.025, 0.045, 1.07, x, 0.11, 0, edge);
  box(caseGroup, 0.025, 0.04, 1.07, x, 0.69, 0, edge);
}
const lid = new THREE.Group();
lid.position.set(0, 0.715, -0.53);
caseGroup.add(lid);
box(lid, 1.8, 0.09, 1.08, 0, 0.035, 0.53);
box(lid, 1.64, 0.024, 0.91, 0, -0.02, 0.53, foam);
for (const z of [0.09, 0.38, 0.68, 0.97])
  box(lid, 1.53, 0.026, 0.036, 0, 0.094, z);
for (const x of [-0.88, 0.88])
  box(lid, 0.026, 0.056, 1.07, x, 0.045, 0.53, edge);
for (const z of [0.005, 1.055]) box(lid, 1.78, 0.055, 0.026, 0, 0.045, z, edge);
for (const x of [-0.57, 0.57]) {
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.25, 12),
    steel,
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(x, 0.715, -0.54);
  caseGroup.add(hinge);
}
const latches: THREE.Group[] = [];
for (const x of [-0.58, 0.58]) {
  box(caseGroup, 0.19, 0.21, 0.025, x, 0.58, 0.547, edge);
  const latch = new THREE.Group();
  latch.position.set(x, 0.645, 0.57);
  caseGroup.add(latch);
  box(latch, 0.12, 0.18, 0.028, 0, -0.062, 0, steel);
  box(latch, 0.145, 0.026, 0.035, 0, -0.14, 0.012, edge);
  latches.push(latch);
  for (const y of [0.51, 0.63]) {
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), steel);
    rivet.position.set(x + 0.066, y, 0.568);
    caseGroup.add(rivet);
  }
}
const handle = new THREE.Mesh(
  new THREE.TorusGeometry(0.13, 0.025, 8, 18, Math.PI),
  steel,
);
handle.rotation.z = Math.PI;
handle.scale.set(1.45, 0.65, 1);
handle.position.set(0, 0.405, 0.57);
caseGroup.add(handle);
for (const x of [-0.19, 0.19])
  box(caseGroup, 0.05, 0.08, 0.055, x, 0.41, 0.55, edge);
for (const x of [-0.84, 0.84])
  for (const z of [-0.49, 0.49])
    box(caseGroup, 0.12, 0.13, 0.1, x, 0.12, z, edge);
for (let i = 0; i < 21; i++)
  for (let j = 0; j < 10; j++) {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.027, 5, 4), foam);
    bump.scale.y = 0.5;
    bump.position.set(-0.75 + i * 0.075, -0.035, 0.14 + j * 0.085);
    lid.add(bump);
  }

type Instance = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  start: number;
  duration: number;
  active: boolean;
};
const instances = new Set<Instance>();
let running = false;
function draw(instance: Instance, progress: number) {
  const latchT = Math.min(1, progress / 0.24),
    lidT = Math.min(1, Math.max(0, (progress - 0.22) / 0.68));
  lid.rotation.x = -1.91 * lidT * lidT * (3 - 2 * lidT);
  latches.forEach((l) => (l.rotation.x = 0.7 * latchT));
  renderer.render(scene, camera);
  instance.context.clearRect(0, 0, 320, 320);
  instance.context.drawImage(renderer.domElement, 0, 0);
}
function frame(time: number) {
  let active = false;
  for (const instance of instances) {
    if (!instance.active) continue;
    const t = Math.min(1, (time - instance.start) / instance.duration);
    draw(instance, t);
    if (t >= 1) instance.active = false;
    else active = true;
  }
  if (!active) {
    renderer.setAnimationLoop(null);
    running = false;
  }
}
export function bindCase(canvas: HTMLCanvasElement) {
  const instance: Instance = {
    canvas,
    context: canvas.getContext("2d")!,
    start: 0,
    duration: 1800,
    active: false,
  };
  instances.add(instance);
  draw(instance, 0);
  return {
    play(duration: number) {
      instance.start = performance.now();
      instance.duration = duration;
      instance.active = true;
      draw(instance, 0);
      if (!running) {
        running = true;
        renderer.setAnimationLoop(frame);
      }
    },
    reset() {
      instance.active = false;
      draw(instance, 0);
    },
    dispose() {
      instances.delete(instance);
    },
  };
}
