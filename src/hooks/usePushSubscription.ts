"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface UsePushSubscription {
  permission: PushPermission;
  enable: () => Promise<void>; // call from a user gesture
  disable: () => Promise<void>; // call on logout
}

export function usePushSubscription(): UsePushSubscription {
  const [permission, setPermission] = useState<PushPermission>("default");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY;

  const subscribeAndUpload = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration) return;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
    });
  }, []);

  // Mount: register the SW. Subscribe ONLY if permission was already granted —
  // never call Notification.requestPermission() here. Prompting outside a user
  // gesture is ignored/denied by many browsers and is poor UX.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported) {
        if (!cancelled) setPermission("unsupported");
        return;
      }
      if (!cancelled) setPermission(Notification.permission as PushPermission);
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        registration.update().catch(() => {});
        await navigator.serviceWorker.ready;
        registrationRef.current = registration;
        if (Notification.permission === "granted") {
          await subscribeAndUpload();
        }
      } catch (err) {
        console.warn("[Push] Setup failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, subscribeAndUpload]);

  // Call from a click handler — prompts permission, then subscribes.
  const enable = useCallback(async () => {
    if (!supported) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      if (result === "granted") await subscribeAndUpload();
    } catch (err) {
      console.warn("[Push] Enable failed:", err);
    }
  }, [supported, subscribeAndUpload]);

  // Call on logout — unsubscribe locally and remove the server record so the
  // device stops receiving captain-call pushes after sign-out.
  const disable = useCallback(async () => {
    try {
      const registration = registrationRef.current;
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push-subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe().catch(() => {});
      }
    } catch (err) {
      console.warn("[Push] Disable failed:", err);
    }
  }, []);

  return { permission, enable, disable };
}
