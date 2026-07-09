"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden",
        className,
      )}
      {...props}
    >
      {/* Flat France Tricolor Flag */}
      <div
        className="absolute inset-0 opacity-[0.22] dark:opacity-[0.14] pointer-events-none"
        style={{
          background: "linear-gradient(to right, #002395 33.33%, #ffffff 33.33%, #ffffff 66.66%, #ed2939 66.66%)"
        }}
      />

      {/* Fabric Shadow Overlay (Multiply) */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.3] mix-blend-multiply pointer-events-none animate-wave-shadow"
        style={{
          backgroundImage: `repeating-linear-gradient(
            105deg,
            #ffffff 0%,
            #eaeaea 10%,
            #b0b0b0 20%,
            #eaeaea 30%,
            #ffffff 40%
          )`,
          backgroundSize: "200% 100%",
        }}
      />

      {/* Fabric Highlight Overlay (Screen) */}
      <div
        className="absolute inset-0 opacity-[0.25] dark:opacity-[0.18] mix-blend-screen pointer-events-none animate-wave-highlight"
        style={{
          backgroundImage: `repeating-linear-gradient(
            115deg,
            #000000 0%,
            #222222 10%,
            #666666 20%,
            #222222 30%,
            #000000 40%
          )`,
          backgroundSize: "200% 100%",
        }}
      />

      {children}
    </div>
  );
};
