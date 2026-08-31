import { createClient } from "npm:@supabase/supabase-js@2";

const SUPER_ADMIN_EMAIL = "bestman@obaxinnovationslimited.com";
const allowedOrigin = Deno.env.get("APP_ORIGIN") || "https://www.fixam9ja.com";
const headers = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return respond({ error: "Service configuration is incomplete" }, 500);

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  const caller = callerData.user;
  if (callerError || !caller) return respond({ error: "Session is invalid or expired" }, 401);
  if (caller.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) return respond({ error: "Super-admin access required" }, 403);

  const admin = createClient(url, serviceKey);
  const { data: callerAdmin } = await admin.from("admin_profiles").select("user_id").eq("user_id", caller.id).maybeSingle();
  if (!callerAdmin) return respond({ error: "Administrator profile is required" }, 403);

  const body = await request.json().catch(() => ({}));
  if (body.action === "create") return createUser(admin, caller.id, body);
  if (body.action === "delete") return deleteUser(admin, caller.id, body);
  return respond({ error: "Unsupported action" }, 400);
});

async function createUser(admin: ReturnType<typeof createClient>, callerId: string, body: Record<string, unknown>) {
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.full_name || "").trim();
  const phone = String(body.phone || "").trim();
  const role = body.role === "artisan" ? "artisan" : "customer";
  if (!email.includes("@") || !fullName) return respond({ error: "A valid email and full name are required" }, 400);

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, phone, role },
    redirectTo: "https://www.fixam9ja.com/account.html",
  });
  if (error || !data.user) return respond({ error: error?.message || "User invitation failed" }, 400);

  const profile = { user_id: data.user.id, email, full_name: fullName, phone, role, account_status: "active" };
  const { error: profileError } = await admin.from("user_profiles").upsert(profile, { onConflict: "user_id" });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return respond({ error: profileError.message }, 500);
  }

  await audit(admin, callerId, "user_invited", data.user.id, String(body.reason || "Super-admin created user"), { email, role });
  return respond({ created: true, user: profile });
}

async function deleteUser(admin: ReturnType<typeof createClient>, callerId: string, body: Record<string, unknown>) {
  const userId = String(body.user_id || "");
  const reason = String(body.reason || "").trim();
  if (!userId || body.confirmation !== "DELETE" || !reason) {
    return respond({ error: "User, reason, and DELETE confirmation are required" }, 400);
  }
  if (userId === callerId) return respond({ error: "The super-admin account cannot be deleted" }, 403);

  const { data: targetAdmin } = await admin.from("admin_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (targetAdmin) return respond({ error: "Administrator accounts cannot be deleted here" }, 403);

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
  if (targetError || !targetData.user) return respond({ error: "User was not found" }, 404);

  const { data: media } = await admin.from("media_uploads").select("bucket, storage_path").eq("uploaded_by_user_id", userId);
  for (const bucket of [...new Set((media || []).map((item) => item.bucket))]) {
    const paths = (media || []).filter((item) => item.bucket === bucket).map((item) => item.storage_path);
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }

  const cleanup = await Promise.all([
    admin.from("quote_requests").update({ customer_name: "Deleted customer", customer_phone: "deleted", job_location: "Location removed", job_details: "Details removed following account deletion", customer_user_id: null, review_token: null }).eq("customer_user_id", userId),
    admin.from("artisan_applications").update({ full_name: "Deleted applicant", phone: "deleted", applicant_email: null, applicant_user_id: null, nin_last4: null, nin_consent: false, nin_consent_at: null, liveness_consent: false, liveness_consent_at: null, identity_verification_reference: null }).eq("applicant_user_id", userId),
    admin.from("subscription_requests").update({ applicant_user_id: null, applicant_email: null, applicant_name: "Deleted applicant", applicant_phone: "deleted", payment_reference: null }).eq("applicant_user_id", userId),
    admin.from("artisan_reviews").update({ customer_name: "Deleted customer", customer_user_id: null }).eq("customer_user_id", userId),
    admin.from("artisans").update({ owner_user_id: null, profile_status: "paused" }).eq("owner_user_id", userId).eq("profile_status", "active"),
    admin.from("media_uploads").delete().eq("uploaded_by_user_id", userId),
  ]);
  const cleanupError = cleanup.find((result) => result.error)?.error;
  if (cleanupError) return respond({ error: `Account cleanup failed: ${cleanupError.message}` }, 500);
  await audit(admin, callerId, "user_deleted", userId, reason, { email: targetData.user.email || "" });

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return respond({ error: deleteError.message }, 500);
  return respond({ deleted: true });
}

async function audit(admin: ReturnType<typeof createClient>, callerId: string, action: string, entityId: string, reason: string, newData: Record<string, unknown>) {
  await admin.from("admin_audit_events").insert({ actor_user_id: callerId, actor_type: "admin", action, entity_type: "user_profiles", entity_id: entityId, reason, new_data: newData });
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}
