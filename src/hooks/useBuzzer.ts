"use client";

import { useEffect, useRef } from "react";

/**
 * useBuzzer — plays an audio alert when newKotIds grows.
 * Uses Web Audio API as a fallback if the mp3 file is not found.
 */
export function useBuzzer(newKotCount: number) {
  const prevCount = useRef(0);

  useEffect(() => {
    if (newKotCount > prevCount.current) {
      // Prefer the bundled MP3 in /public. If the browser blocks autoplay,
      // fall back to a short WebAudio beep.
      const audio = new Audio("/buzzer.mp3");
      audio.volume = 0.75;

      const tryPlayAudio = async () => {
        try {
          // Some browsers require user gesture; try play and if it rejects,
          // fall back to WebAudio beep.
          await audio.play();
          // If play succeeds, schedule a short cleanup
          setTimeout(() => {
            try {
              audio.pause();
              audio.currentTime = 0;
            } catch {}
          }, 1500);
          return true;
        } catch {
          return false;
        }
      };

      tryPlayAudio().then((ok) => {
        if (ok) return;
        // Web Audio fallback
        try {
          const AudioCtx =
            (window as any).AudioContext || (window as any).webkitAudioContext;
          if (!AudioCtx) return;
          const ctx: AudioContext = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.45, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
          // Close context after sound
          setTimeout(() => {
            try {
              ctx.close();
            } catch {}
          }, 700);
        } catch {
          // silent failure
        }
      });
    }
    prevCount.current = newKotCount;
  }, [newKotCount]);
}
