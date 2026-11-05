import { useEffect, useRef } from "react";
export function Case({
  opening,
  duration,
}: {
  opening: boolean;
  duration: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<{
    play: (duration: number) => void;
    reset: () => void;
    dispose: () => void;
  } | null>(null);
  useEffect(() => {
    let active = true;
    import("./case-renderer")
      .then((module) => {
        if (active && canvas.current) {
          controller.current = module.bindCase(canvas.current);
          if (opening) controller.current.play(duration);
        }
      })
      .catch(() => {
        if (canvas.current)
          canvas.current.replaceWith(
            Object.assign(document.createElement("span"), { textContent: "?" }),
          );
      });
    return () => {
      active = false;
      controller.current?.dispose();
    };
  }, []);
  useEffect(() => {
    if (opening) controller.current?.play(duration);
    else controller.current?.reset();
  }, [opening, duration]);
  return (
    <span className="mystery-box real-case">
      <canvas ref={canvas} width="320" height="320" aria-hidden="true" />
    </span>
  );
}
