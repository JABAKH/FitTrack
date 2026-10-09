import React, { useEffect, useState } from "react";
type Props = {
  size: number;
  stroke: number;
  radius: number;
  color: string;
  progress: number;
};
// The browser uses its own SVG DOM animation; Reanimated stays on native.
export default function ProgressArc({
  size,
  stroke,
  radius,
  color,
  progress,
}: Props) {
  const [ready, setReady] = useState(false),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", update);
    };
  }, []);
  const length = 2 * Math.PI * radius;
  return (
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      stroke={color}
      strokeWidth={stroke}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={length + " " + length}
      strokeDashoffset={length * (1 - (ready ? progress : 0))}
      transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"}
      style={{
        transition: reduced
          ? "none"
          : "stroke-dashoffset 650ms cubic-bezier(0.33,1,0.68,1)",
      }}
    />
  );
}
