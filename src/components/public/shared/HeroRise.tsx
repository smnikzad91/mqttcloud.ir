import type { ReactNode } from "react";

/**
 * The hero's fade-up entrance as a CSS animation (globals.css → .hero-rise).
 * Same timing as Reveal's fadeUp, but it starts at first paint: Reveal renders
 * opacity:0 on the server and only animates in after hydration, which kept the
 * hero (the page's LCP text) invisible until the JS bundle had run. Inside
 * <ForceMotion> (.motion-always) it still animates with reduced motion on.
 */
export function HeroRise({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={className ? `hero-rise ${className}` : "hero-rise"} style={delay ? { animationDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
