import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-0834700c/health", (c) => {
  return c.json({ status: "ok" });
});

// ── Auth Routes ──────────────────────────────────────────────────────────────

// Sign up new user
app.post("/make-server-0834700c/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password required" }, 400);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || email.split('@')[0] },
      // Automatically confirm email since no email server configured
      email_confirm: true,
    });
    if (error) {
      console.log("[Auth] Signup error:", error.message);
      return c.json({ error: error.message }, 400);
    }
    console.log("[Auth] User created:", data.user?.id);
    return c.json({ success: true, userId: data.user?.id });
  } catch (err) {
    console.log("[Auth] Signup exception:", err);
    return c.json({ error: "Signup failed", message: String(err) }, 500);
  }
});

// ── Rhizome Lab — Folders & Rhizomes ────────────────────────────────────────

// Helper to get identity (userId from token OR deviceId from path)
async function getUserId(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
      );
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id) return `user_${user.id}`;
    } catch { /* fall through to deviceId */ }
  }
  return null;
}

// Get all folders for a user
app.get("/make-server-0834700c/rhizome/folders/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    // Try to get authenticated user ID
    const userId = await getUserId(c);
    const key = userId ? `rhizome_folders_${userId}` : `rhizome_folders_${deviceId}`;
    console.log(`[Rhizome Server] GET folders for key: ${key}`);
    const data = await kv.get(key);
    // If logged in, also check if there's device data to migrate
    let folders = data || [];
    if (userId && deviceId !== 'anonymous') {
      const deviceKey = `rhizome_folders_${deviceId}`;
      const deviceData = await kv.get(deviceKey);
      if (deviceData && Array.isArray(deviceData) && deviceData.length > 0) {
        // Merge device folders into user account (one-time migration)
        const merged = [...(folders as any[])];
        for (const df of deviceData as any[]) {
          if (!merged.find((f: any) => f.id === df.id)) merged.push(df);
        }
        folders = merged;
        await kv.set(key, merged);
        await kv.del(deviceKey); // cleanup device data after migration
        console.log(`[Rhizome Server] Migrated ${deviceData.length} device folders to user account`);
      }
    }
    return c.json({ folders });
  } catch (err) {
    console.log("[Rhizome Server] Error loading folders:", err);
    return c.json({ error: "Failed to load folders", message: String(err) }, 500);
  }
});

// Save folders for a user
app.post("/make-server-0834700c/rhizome/folders/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const userId = await getUserId(c);
    const key = userId ? `rhizome_folders_${userId}` : `rhizome_folders_${deviceId}`;
    console.log(`[Rhizome Server] POST folders for key: ${key}`);
    const body = await c.req.json();
    await kv.set(key, body.folders);
    return c.json({ success: true });
  } catch (err) {
    console.log("[Rhizome Server] Error saving folders:", err);
    return c.json({ error: "Failed to save folders", message: String(err) }, 500);
  }
});

// Get all saved rhizomes for a user
app.get("/make-server-0834700c/rhizome/saved/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const userId = await getUserId(c);
    const key = userId ? `rhizome_saved_${userId}` : `rhizome_saved_${deviceId}`;
    console.log(`[Rhizome Server] GET rhizomes for key: ${key}`);
    const data = await kv.get(key);
    return c.json({ rhizomes: data || [] });
  } catch (err) {
    console.log("[Rhizome Server] Error loading saved rhizomes:", err);
    return c.json({ error: "Failed to load saved rhizomes", message: String(err) }, 500);
  }
});

// Save rhizomes for a user
app.post("/make-server-0834700c/rhizome/saved/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const userId = await getUserId(c);
    const key = userId ? `rhizome_saved_${userId}` : `rhizome_saved_${deviceId}`;
    console.log(`[Rhizome Server] POST rhizomes for key: ${key}`);
    const body = await c.req.json();
    await kv.set(key, body.rhizomes);
    return c.json({ success: true });
  } catch (err) {
    console.log("[Rhizome Server] Error saving rhizomes:", err);
    return c.json({ error: "Failed to save rhizomes", message: String(err) }, 500);
  }
});

Deno.serve(app.fetch);