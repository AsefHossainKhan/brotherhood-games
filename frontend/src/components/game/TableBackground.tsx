"use client";

import React from "react";

interface TableBackgroundProps {
  children: React.ReactNode;
}

export function TableBackground({ children }: TableBackgroundProps) {
  return (
    <div className="relative h-dvh overflow-hidden bg-[#1a1a2e]">
      {/* Wood border edge */}
      <div className="absolute inset-0 border-8 border-[#5c3a1e] rounded-[40px] shadow-inner" />
      <div className="absolute inset-1.5 border-[3px] border-[#8b6914]/40 rounded-[36px]" />

      {/* Green felt playing surface */}
      <div
        className="absolute inset-3 rounded-4xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, #2d5a27 0%, #1e4a1a 40%, #153812 70%, #0d2a0a 100%)",
        }}
      >
        {/* Felt texture overlay */}
        <div
          className="absolute inset-0 rounded-4xl opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
          }}
        />
        {/* Inner shadow for depth */}
        <div className="absolute inset-0 rounded-4xl shadow-[inset_0_0_80px_rgba(0,0,0,0.4)]" />
        {/* Subtle highlight in center */}
        <div
          className="absolute inset-0 rounded-4xl opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.1) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10 h-dvh">{children}</div>
    </div>
  );
}
