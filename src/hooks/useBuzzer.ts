"use client";

import { useEffect, useRef } from "react";

// Global audio context & unlock state so any user click unlocks audio permanently
let globalAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!globalAudioCtx && AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
    if (globalAudioCtx && globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }
    isAudioUnlocked = true;
  } catch {}
}

export function playKitchenChime() {
  if (typeof window === "undefined") return;

  // 1. Try playing the loud buzzer MP3
  try {
    const audio = new Audio("/buzzer.mp3");
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setTimeout(() => {
            try {
              audio.pause();
              audio.currentTime = 0;
            } catch {}
          }, 3000);
        })
        .catch(() => {
          // Fallback to Web Audio synthesiser
          playSynthesizedBeep();
        });
      return;
    }
  } catch {
    playSynthesizedBeep();
  }
}

function playSynthesizedBeep() {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx: AudioContext = globalAudioCtx || new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Play 3 loud distinct kitchen beeps (high attention)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square"; // louder & sharper than triangle
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.6, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(980, now, 0.25);
    playTone(980, now + 0.3, 0.25);
    playTone(1250, now + 0.6, 0.4);
  } catch (e) {
    console.warn("WebAudio beep failed", e);
  }
}

/**
 * useBuzzer — plays a loud alert chime when newKotCount increases.
 */
export function useBuzzer(newKotCount: number) {
  const prevCount = useRef(0);

  // Listen to any first touch/click anywhere on tablet to unlock audio context immediately
  useEffect(() => {
    const handleFirstTouch = () => {
      unlockAudio();
      window.removeEventListener("click", handleFirstTouch);
      window.removeEventListener("touchstart", handleFirstTouch);
    };
    window.addEventListener("click", handleFirstTouch);
    window.addEventListener("touchstart", handleFirstTouch);
    return () => {
      window.removeEventListener("click", handleFirstTouch);
      window.removeEventListener("touchstart", handleFirstTouch);
    };
  }, []);

  useEffect(() => {
    if (newKotCount > prevCount.current) {
      playKitchenChime();
    }
    prevCount.current = newKotCount;
  }, [newKotCount]);
}
