/**
 * push.ts — Client-side helpers for Web Push subscriptions
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Convert a base64url VAPID public key to a Uint8Array for PushManager */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission, register SW, subscribe to push,
 * and persist the subscription to the server.
 * Returns "granted" | "denied" | "unsupported" | "error"
 */
export async function subscribeToPush(userId: string): Promise<"granted" | "denied" | "unsupported" | "error"> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "error";

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    let sub = existing;

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Save subscription to server
    await fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, subscription: sub.toJSON() }),
    });

    return "granted";
  } catch (err) {
    console.error("[push] subscribeToPush error:", err);
    return "error";
  }
}

/**
 * Unsubscribe from push and remove from server.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch("/api/notifications/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, endpoint: sub.endpoint }),
      });
    }
  } catch (err) {
    console.error("[push] unsubscribeFromPush error:", err);
  }
}

/**
 * Returns current push permission status without prompting.
 */
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
