"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useInView } from "framer-motion";
import { useReducedMotionSafe } from "./motion";

/**
 * Runs `callback` every `ms`, but only while `ref` is on screen, the tab is
 * visible, and the viewer hasn't asked for reduced motion (unless
 * `forceMotion`). The landing page has a dozen decorative "live" simulators;
 * without this they'd all keep re-rendering off-screen and drain phone
 * batteries for nothing.
 */
export function useLiveInterval(
  callback: () => void,
  ms: number,
  ref: RefObject<Element | null>,
  { forceMotion = false }: { forceMotion?: boolean } = {},
) {
  const inView = useInView(ref);
  const reduceMotion = useReducedMotionSafe();
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (!inView || (reduceMotion && !forceMotion)) return;

    let id: number | undefined;
    const start = () => {
      if (id === undefined) id = window.setInterval(() => saved.current(), ms);
    };
    const stop = () => {
      if (id !== undefined) window.clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [inView, reduceMotion, forceMotion, ms]);
}

/** `setTimeout` that's automatically cancelled on unmount — for the simulators' multi-step button animations. */
export function useTimeouts() {
  const ids = useRef<number[]>([]);

  useEffect(() => {
    const pending = ids.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  return useCallback((fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms));
  }, []);
}
