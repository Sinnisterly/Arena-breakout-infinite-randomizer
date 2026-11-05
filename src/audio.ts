import { asset } from "./catalog";
let context: AudioContext | undefined;
const buffers = new Map<string, AudioBuffer>();
const names = [
  "impactMetal_light_000",
  "impactMetal_medium_000",
  "impactMetal_heavy_000",
  "impactSoft_heavy_000",
];
let loading: Promise<void> | undefined;
export function warmAudio() {
  try {
    context ??= new AudioContext();
    void context.resume();
    loading ??= Promise.all(
      names.map(async (name) => {
        const response = await fetch(asset(`assets/${name}.ogg`));
        if (response.ok)
          buffers.set(
            name,
            await context!.decodeAudioData(await response.arrayBuffer()),
          );
      }),
    ).then(() => {});
  } catch {}
}
export function sound(
  kind: "latch" | "open" | "land" | "paper",
  volume: number,
) {
  if (!context || volume <= 0) return;
  const name =
      names[
        kind === "latch" ? 0 : kind === "open" ? 1 : kind === "land" ? 2 : 3
      ],
    buffer = buffers.get(name);
  if (!buffer) return;
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = 0.85 + Math.random() * 0.12;
  gain.gain.value = (volume / 100) * (kind === "land" ? 0.4 : 0.2);
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}
