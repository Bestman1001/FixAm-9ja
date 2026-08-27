import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("APP_ORIGIN") || "https://bestman1001.github.io";
const headers = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return response({ error: "Authentication required" }, 401);

  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== "DELETE") return response({ error: "Deletion confirmation is required" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return response({ error: "Service configuration is incomplete" }, 500);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return response({ error: "Session is invalid or expired" }, 401);

  const admin = createClient(url, serviceKey);
  const { data: media } = await admin
    .from("media_uploads")
    .select("bucket, storage_path")
    .eq("uploaded_by_user_id", userData.user.id);

  for (const bucket of [...new Set((media || []).map((item) => item.bucket))]) {
    const paths = (media || []).filter((item) => item.bucket === bucket).map((item) => item.storage_path);
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }

  const { data: receiptId, error: cleanupError } = await userClient.rpc("fixam_prepare_account_deletion");
  if (cleanupError) return response({ error: cleanupError.message }, 500);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    await admin.from("account_deletion_receipts").update({ status: "failed" }).eq("id", receiptId);
    return response({ error: deleteError.message, receipt_id: receiptId }, 500);
  }
  await admin
    .from("account_deletion_receipts")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", receiptId);
  return response({ deleted: true, receipt_id: receiptId });
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}
