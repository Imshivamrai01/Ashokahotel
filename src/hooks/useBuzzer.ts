"use client";

import { useEffect, useSyncExternalStore } from "react";

// Global audio context & unlock state so any user click unlocks audio permanently
let globalAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;
let currentChimeAudio: HTMLAudioElement | null = null;
// True while the looping order alarm owns currentChimeAudio (vs. a short preview).
let alarmLooping = false;
const KITCHEN_ALARM = "/kitchen.mp3";

// Browsers refuse to play sound until the user has tapped the page once (e.g.
// after a reload). Track that so the UI can ask for the tap instead of the
// alarm failing silently.
let audioBlocked = false;
const blockedListeners = new Set<() => void>();
function setAudioBlocked(value: boolean) {
  if (audioBlocked === value) return;
  audioBlocked = value;
  blockedListeners.forEach((l) => l());
}
function subscribeBlocked(listener: () => void) {
  blockedListeners.add(listener);
  return () => {
    blockedListeners.delete(listener);
  };
}
/** True while the browser is refusing to play the alarm. */
export function useAudioBlocked(): boolean {
  return useSyncExternalStore(
    subscribeBlocked,
    () => audioBlocked,
    () => false,
  );
}

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

export function stopKitchenChime() {
  if (currentChimeAudio) {
    try {
      currentChimeAudio.pause();
      currentChimeAudio.currentTime = 0;
    } catch {}
    currentChimeAudio = null;
  }
  alarmLooping = false;
}

/**
 * Start the order alarm: the kitchen tune on a loop until stopKitchenChime().
 * Safe to call repeatedly — it does nothing while the alarm is already sounding.
 */
export function startKitchenAlarm() {
  if (typeof window === "undefined") return;
  if (alarmLooping && currentChimeAudio && !currentChimeAudio.paused) return;
  try {
    stopKitchenChime();
    const audio = new Audio(KITCHEN_ALARM);
    audio.loop = true;
    audio.volume = 1.0;
    currentChimeAudio = audio;
    alarmLooping = true;
    audio
      .play()
      .then(() => setAudioBlocked(false))
      .catch((err: unknown) => {
        if (currentChimeAudio === audio) {
          currentChimeAudio = null;
          alarmLooping = false;
        }
        if ((err as { name?: string })?.name === "NotAllowedError") setAudioBlocked(true);
        // Fallback to Web Audio synthesiser
        playSynthesizedBeep();
      });
  } catch {
    playSynthesizedBeep();
  }
}

/** Short preview of the alarm tune (the Sound ON button). */
export function playKitchenChime() {
  if (typeof window === "undefined") return;
  if (alarmLooping) return; // the real alarm is already sounding

  try {
    stopKitchenChime();
    const audio = new Audio(KITCHEN_ALARM);
    currentChimeAudio = audio;
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setAudioBlocked(false);
          setTimeout(() => {
            try {
              if (currentChimeAudio === audio) {
                audio.pause();
                audio.currentTime = 0;
                currentChimeAudio = null;
              }
            } catch {}
          }, 2500);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === "NotAllowedError") setAudioBlocked(true);
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
      ctx.resume().catch(() => {});
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
 * useBuzzer — plays the kitchen alarm on a loop for as long as pendingKotCount > 0,
 * and stops immediately once order preparation starts (pendingKotCount === 0).
 */
export function useBuzzer(pendingKotCount: number, enabled: boolean = true) {
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

  // Depends on "is anything pending", not the count, so the tune keeps playing
  // through instead of restarting each time another order arrives.
  const active = enabled && pendingKotCount > 0;
  useEffect(() => {
    if (!active) {
      stopKitchenChime();
      return;
    }

    startKitchenAlarm();

    // Watchdog: if the browser blocked or dropped the sound, start it again.
    const interval = setInterval(startKitchenAlarm, 3500);

    return () => {
      clearInterval(interval);
      stopKitchenChime();
    };
  }, [active]);
}

