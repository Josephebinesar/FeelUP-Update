import Image from "next/image";

type LogoProps = {
  size?: number;
  src?: string; // allow overriding the image (e.g. favicon)
};

export default function Logo({ size = 36, src = "/favicon.png" }: LogoProps) {
  const imgSize = Math.max(24, size);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="avatar" style={{ width: imgSize, height: imgSize }}>
        <span
          style={{
            color: "var(--brand-blue)",
            fontWeight: 700,
            fontSize: Math.round(imgSize / 2),
          }}
        >
          {"F"}
        </span>
      </div>
      <span className="logo-text">FeelUp</span>
    </div>
  );
}
