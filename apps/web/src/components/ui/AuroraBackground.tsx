import React from 'react';

interface AuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
  showRadialGradient?: boolean;
}

export function AuroraBackground({
  children,
  className = '',
  showRadialGradient = true,
}: AuroraBackgroundProps) {
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center bg-white dark:bg-zinc-900 text-slate-950 transition-bg ${className}`}
    >
      <div
        className={`absolute inset-0 overflow-hidden ${
          showRadialGradient
            ? '[background-image:radial-gradient(ellipse_at_100%_0%,hsl(var(--accent))_0%,transparent_50%),radial-gradient(ellipse_at_0%_100%,hsl(var(--primary))_0%,transparent_50%)]'
            : ''
        }`}
      >
        <div
          className="absolute -inset-[10px] opacity-40 blur-3xl bg-[length:200%_100%] bg-[position:0%_0%] animate-aurora bg-[linear-gradient(115deg,var(--aurora-1),var(--aurora-2),var(--aurora-3),var(--aurora-4),var(--aurora-1))]"
        />
      </div>
      <div className="relative z-10 flex h-full w-full flex-col">{children}</div>
    </div>
  );
}
