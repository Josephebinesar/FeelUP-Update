"use client";

import { useEffect, useRef, useState } from "react";

const IMAGES = ["/s1.png", "/s2.png", "/s3.png"];

export default function HeroStack({
  width = 360,
  height = 420,
}: {
  width?: number;
  height?: number;
}) {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    start();
    return stop;
     
  }, []);

  function start() {
    stop();
    intervalRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, 3000);
  }

  function stop() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // positions for back, middle, front
  const positions = [
    { left: 44, top: 28, rotate: -6, scale: 0.96, z: 10 },
    { left: 22, top: 12, rotate: 4, scale: 0.98, z: 20 },
    { left: -6, top: 0, rotate: 0, scale: 1, z: 30 },
  ];

  // build ordering: images assigned to back,middle,front
  const ordered = [0, 1, 2].map((pos) => IMAGES[(index + pos) % IMAGES.length]);

  return (
    <div
      ref={containerRef}
      className="relative group"
      style={{ width: width + 60, height }}
      onMouseEnter={() => stop()}
      onMouseLeave={() => start()}
    >
      <div style={{ width, height }} className="relative mx-auto surface-card">
        {ordered.map((src, i) => {
          const p = positions[i];
          const style: React.CSSProperties = {
            position: "absolute",
            left: p.left,
            top: p.top,
            width,
            height,
            borderRadius: 16,
            boxShadow:
              getComputedStyle(document.documentElement).getPropertyValue(
                "--shadow-soft",
              ) || "0 12px 30px rgba(2,6,23,0.12)",
            transform: `translateZ(0) rotate(${p.rotate}deg) scale(${p.scale})`,
            transition:
              "transform 420ms cubic-bezier(.2,.9,.2,1), left 420ms, top 420ms, opacity 420ms",
            zIndex: p.z,
            objectFit: "cover",
          };

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`hero-${i}`} style={style} />
          );
        })}
      </div>
    </div>
  );
}
