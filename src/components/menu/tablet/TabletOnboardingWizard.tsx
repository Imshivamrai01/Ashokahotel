"use client";

import { useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type TargetAndTransition,
} from "framer-motion";
import { ChevronRight, X, Hand, ListChecks, BellRing } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STORAGE_KEY = "ashoka-tablet-onboarded";

interface Step {
  Icon: LucideIcon;
  iconAnim: TargetAndTransition;
  title: string;
  desc: string;
  hint: string;
}

const STEPS: Step[] = [
  {
    Icon: Hand,
    iconAnim: {
      x: [0, 18, -18, 18, 0],
      transition: { duration: 1.4, repeat: Infinity, repeatDelay: 1 },
    },
    title: "Swipe to Explore",
    desc: "Drag or tap the page corners to flip through our menu — just like a real book.",
    hint: "← → arrow keys also work",
  },
  {
    Icon: ListChecks,
    iconAnim: {
      scale: [1, 1.15, 1],
      transition: { duration: 1.2, repeat: Infinity, repeatDelay: 1 },
    },
    title: "Jump to Any Section",
    desc: "Tap a category on the index page to instantly jump to that section of the menu.",
    hint: "Look for the index on page 2",
  },
  {
    Icon: BellRing,
    iconAnim: {
      rotate: [0, 18, -18, 14, -10, 0],
      transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1.5 },
    },
    title: "Need Help? Call Your Captain",
    desc: "Tap the bell button on the left side of the screen to instantly alert your captain.",
    hint: "Your captain will be with you shortly",
  },
];

interface Props {
  /** When true, forcefully shows the wizard (staff triggered it for a new user) */
  forceShow?: boolean;
  onClose?: () => void;
}

export default function TabletOnboardingWizard({ forceShow, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const [autoVisible, setAutoVisible] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);

  const visible = forceShow || autoVisible;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* */
    }
    setAutoVisible(false);
    onClose?.();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else dismiss();
  };

  const current = STEPS[step];
  const StepIcon = current.Icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="wizard-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 32, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="relative w-80 rounded-3xl p-8 flex flex-col items-center text-center gap-5 select-none"
              style={{
                background: "linear-gradient(160deg, #1a1410 60%, #0f0f0f)",
                border: "1px solid var(--menu-accent-border)",
                boxShadow:
                  "0 0 60px color-mix(in srgb, var(--menu-accent) 12%, transparent), 0 24px 48px rgba(0,0,0,0.6)",
              }}
            >
              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full opacity-50 hover:opacity-90 transition-opacity cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/70"
                aria-label="Skip tutorial"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Accent line top */}
              <div
                className="w-12 h-0.5 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--menu-accent), transparent)",
                }}
              />

              {/* Animated icon */}
              <motion.span
                className="leading-none"
                style={{ color: "var(--menu-accent)" }}
                animate={reduceMotion ? undefined : current.iconAnim}
              >
                <StepIcon className="w-14 h-14" strokeWidth={1.5} />
              </motion.span>

              {/* Step dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width: i === step ? 20 : 6,
                      opacity: i === step ? 1 : 0.3,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="h-1.5 rounded-full"
                    style={{ background: "var(--menu-accent)" }}
                  />
                ))}
              </div>

              {/* Text */}
              <div className="flex flex-col gap-2">
                <h2
                  className="text-xl font-bold tracking-wide font-playfair"
                  style={{ color: "var(--menu-accent)" }}
                >
                  {current.title}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {current.desc}
                </p>
                <p className="text-xs" style={{ color: "var(--menu-accent-dim)" }}>
                  {current.hint}
                </p>
              </div>

              {/* Accent line bottom */}
              <div
                className="w-12 h-0.5 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--menu-accent), transparent)",
                }}
              />

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.03 }}
                onClick={next}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]"
                style={{
                  background: "var(--menu-accent)",
                  color: "var(--menu-on-accent)",
                  boxShadow: "0 4px 20px var(--menu-accent-glow)",
                }}
              >
                {step < STEPS.length - 1 ? (
                  <>
                    Next <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Let&apos;s Explore <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {step < STEPS.length - 1 && (
                <button
                  onClick={dismiss}
                  className="text-xs min-h-9 px-2 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:underline"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Skip tutorial
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
