"use client";

export default function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="spin"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid #2c425f",
        borderTopColor: "var(--brand)",
        borderRadius: "50%",
      }}
      aria-label="Loading"
    />
  );
}
