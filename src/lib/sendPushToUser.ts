/**
 * sendPushToUser — helper to send a push notification to a user
 * Called from existing notification routes (like, comment, follow, repost)
 * Uses the internal PUT /api/notifications/push endpoint.
 */

export async function sendPushToUser(params: {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}): Promise<void> {
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!serviceKey) return;

  try {
    await fetch(`${appUrl}/api/notifications/push`, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(params),
    });
  } catch {
    // Push is fire-and-forget — never break the calling route
  }
}
