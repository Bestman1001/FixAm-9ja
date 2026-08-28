import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  // This endpoint is called from both the apex and www production domains.
  // Access is still enforced below with a valid Supabase JWT and application ownership check.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type VerificationResult = {
  status: "pending" | "verified" | "failed";
  reference: string;
  message: string;
  verificationUrl?: string;
  sdkSessionToken?: string;
  providerResponse?: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const applicationCode = String(body.application_code || "").trim();
    const applicantEmail = String(body.applicant_email || "").trim().toLowerCase();
    const fullName = String(body.full_name || "").trim();
    const phone = String(body.phone || "").trim();
    const nin = String(body.nin || "").trim();
    const consent = body.consent === true;
    const livenessConsent = body.liveness_consent === true;
    const selfieMediaPaths = Array.isArray(body.selfie_media_paths)
      ? body.selfie_media_paths.map((path) => String(path || "").trim()).filter(Boolean).slice(0, 2)
      : [];

    if (!applicationCode || !applicantEmail || !fullName || !phone) {
      return json({ error: "Application code, email, name, and phone are required." }, 400);
    }

    if (!/^\d{11}$/.test(nin)) {
      return json({ error: "NIN must be 11 digits." }, 400);
    }

    if (!consent) {
      return json({ error: "Identity verification consent is required." }, 400);
    }

    if (!livenessConsent) {
      return json({ error: "Liveness verification consent is required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Supabase service credentials are not configured." }, 500);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Session is invalid or expired." }, 401);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: ownedApplication, error: ownershipError } = await supabaseAdmin
      .from("artisan_applications")
      .select("application_code, applicant_email, applicant_user_id")
      .eq("application_code", applicationCode)
      .eq("applicant_user_id", userData.user.id)
      .maybeSingle();
    if (ownershipError) {
      return json({ error: "The application ownership check could not be completed." }, 500);
    }
    if (!ownedApplication || ownedApplication.applicant_email?.toLowerCase() !== applicantEmail) {
      return json({ error: "This application is not linked to your signed-in account." }, 403);
    }

    const result = await verifyWithProvider({
      applicationCode,
      applicantUserId: userData.user.id,
      nin,
      fullName,
      phone,
      applicantEmail,
      selfieMediaPaths,
    });
    const now = new Date().toISOString();

    const updatePayload = {
      nin_last4: nin.slice(-4),
      nin_consent: true,
      nin_consent_at: now,
      liveness_consent: true,
      liveness_consent_at: now,
      verification_media_count: selfieMediaPaths.length,
      identity_verification_status: result.status,
      identity_verification_reference: result.reference,
    };

    const { data, error } = await supabaseAdmin
      .from("artisan_applications")
      .update(updatePayload)
      .eq("application_code", applicationCode)
      .eq("applicant_email", applicantEmail)
      .select(
        "application_code, applicant_email, identity_verification_status, identity_verification_reference",
      )
      .single();

    if (error) {
      return json({ error: error.message }, 500);
    }

    await supabaseAdmin.from("identity_verification_attempts").insert({
      application_code: applicationCode,
      applicant_email: applicantEmail,
      nin_last4: nin.slice(-4),
      liveness_media_count: selfieMediaPaths.length,
      provider: providerName(),
      provider_reference: result.reference,
      status: result.status,
      message: result.message,
      response_summary: summarizeProviderResponse(result.providerResponse),
    });

    return json({
      application: data,
      status: result.status,
      reference: result.reference,
      message: result.message,
      verification_url: result.verificationUrl || "",
      sdk_session_token: result.sdkSessionToken || "",
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Verification failed." }, 500);
  }
});

async function verifyWithProvider(input: {
  applicationCode: string;
  applicantUserId: string;
  nin: string;
  fullName: string;
  phone: string;
  applicantEmail: string;
  selfieMediaPaths: string[];
}): Promise<VerificationResult> {
  const mode = Deno.env.get("NIN_PROVIDER_MODE") || Deno.env.get("IDENTITY_PROVIDER_MODE") || "pending";
  const reference = `identity-${crypto.randomUUID()}`;

  if (mode === "mock") {
    if (Deno.env.get("ALLOW_MOCK_IDENTITY") !== "true") {
      return { status: "failed", reference, message: "Mock identity verification is disabled." };
    }
    return {
      status: "verified",
      reference,
      message: "Mock NIN + selfie/liveness verification passed. Replace mock mode before production launch.",
    };
  }

  if (providerName() === "qoreid" || Deno.env.get("QOREID_CLIENT_ID")) {
    return createQoreIdCollectionSession(input, reference);
  }

  const providerUrl = Deno.env.get("NIN_PROVIDER_URL") || Deno.env.get("IDENTITY_PROVIDER_URL");
  const providerKey = Deno.env.get("NIN_PROVIDER_API_KEY") || Deno.env.get("IDENTITY_PROVIDER_API_KEY");
  const authHeader = Deno.env.get("NIN_PROVIDER_AUTH_HEADER") || Deno.env.get("IDENTITY_PROVIDER_AUTH_HEADER") || "Authorization";

  if (!providerUrl || !providerKey) {
    return {
      status: "pending",
      reference,
      message: "Identity provider is not configured yet.",
    };
  }

  const response = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [authHeader]: authHeader.toLowerCase() === "authorization" ? `Bearer ${providerKey}` : providerKey,
    },
    body: JSON.stringify({
      nin: input.nin,
      full_name: input.fullName,
      phone: input.phone,
      email: input.applicantEmail,
      selfie_media_paths: input.selfieMediaPaths,
      liveness_consent: true,
      consent: true,
    }),
  });

  const providerResponse = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      status: "failed",
      reference,
      message: `Provider request failed with HTTP ${response.status}.`,
      providerResponse,
    };
  }

  const normalized = normalizeProviderResponse(providerResponse);
  return {
    status: normalized.status,
    reference: normalized.reference || reference,
    message: normalized.message,
    providerResponse,
  };
}

async function createQoreIdCollectionSession(
  input: {
    applicationCode: string;
    applicantUserId: string;
    nin: string;
    fullName: string;
    phone: string;
    applicantEmail: string;
    selfieMediaPaths: string[];
  },
  fallbackReference: string,
): Promise<VerificationResult> {
  const clientId = Deno.env.get("QOREID_CLIENT_ID");
  const clientSecret = Deno.env.get("QOREID_CLIENT_SECRET");
  const productCode = Deno.env.get("QOREID_PRODUCT_CODE") || "liveness_nin";
  const baseUrl = Deno.env.get("QOREID_BASE_URL") || "https://api.qoreid.com";

  if (!clientId || !clientSecret) {
    return {
      status: "pending",
      reference: fallbackReference,
      message: "QoreID client credentials are not configured yet.",
    };
  }

  if (productCode !== "liveness_nin" && productCode !== "face_verification_nin") {
    return {
      status: "failed",
      reference: fallbackReference,
      message: "QoreID product code must be liveness_nin or face_verification_nin.",
    };
  }

  const basicToken = btoa(`${clientId}:${clientSecret}`);
  const sessionReference = input.applicationCode;
  const sessionPayload = {
    type: "collection",
    productCode,
    reference: sessionReference,
    subjectRef: await pseudonymousSubjectRef(input.applicantUserId),
    ttlSeconds: 600,
    maxAttempts: 3,
  };

  const sessionResponse = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${basicToken}`,
    },
    body: JSON.stringify(sessionPayload),
  });

  const providerResponse = await parseProviderJson(sessionResponse);
  const providerReference = extractSessionReference(providerResponse) || sessionReference;
  const verificationUrl = extractVerificationUrl(providerResponse);
  const sdkSessionToken = extractSdkSessionToken(providerResponse);

  if (!sessionResponse.ok) {
    const detail = providerMessage(providerResponse);
    return {
      status: "failed",
      reference: providerReference,
      message: detail
        ? `QoreID Collection session failed with HTTP ${sessionResponse.status}: ${detail}`
        : `QoreID Collection session failed with HTTP ${sessionResponse.status}.`,
      providerResponse,
    };
  }

  if (!sdkSessionToken && !verificationUrl) {
    return {
      status: "failed",
      reference: providerReference,
      message: "QoreID Collection session did not return an SDK token or verification URL.",
      providerResponse,
    };
  }

  return {
    status: "pending",
    reference: providerReference,
    verificationUrl,
    sdkSessionToken,
    message: sdkSessionToken
      ? "QoreID NIN-liveness Collection session is ready. Start the secure identity check to continue."
      : "QoreID NIN-liveness Collection session is ready. Open the secure verification link to continue.",
    providerResponse,
  };
}

async function pseudonymousSubjectRef(userId: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`fixam:${userId}`));
  return `fixam_${Array.from(new Uint8Array(digest)).slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function parseProviderJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text.slice(0, 500) };
  }
}

function extractSessionReference(response: unknown) {
  if (!response || typeof response !== "object") return "";

  const source = response as Record<string, unknown>;
  const data = typeof source.data === "object" && source.data
    ? source.data as Record<string, unknown>
    : {};

  return String(
    source.reference ||
      source.customerReference ||
      source.customer_reference ||
      source.sessionId ||
      source.session_id ||
      source.id ||
      data.reference ||
      data.customerReference ||
      data.customer_reference ||
      data.sessionId ||
      data.session_id ||
      data.id ||
      "",
  );
}

function extractVerificationUrl(response: unknown) {
  if (!response || typeof response !== "object") return "";

  const source = response as Record<string, unknown>;
  const data = typeof source.data === "object" && source.data
    ? source.data as Record<string, unknown>
    : {};

  return String(
    source.url ||
      source.link ||
      source.verificationUrl ||
      source.verification_url ||
      source.redirectUrl ||
      source.redirect_url ||
      data.url ||
      data.link ||
      data.verificationUrl ||
      data.verification_url ||
      data.redirectUrl ||
      data.redirect_url ||
      "",
  );
}

function extractSdkSessionToken(response: unknown) {
  if (!response || typeof response !== "object") return "";

  const source = response as Record<string, unknown>;
  const data = typeof source.data === "object" && source.data
    ? source.data as Record<string, unknown>
    : {};

  return String(
    source.sdkSessionToken ||
      source.sdk_session_token ||
      source.sessionToken ||
      source.session_token ||
      data.sdkSessionToken ||
      data.sdk_session_token ||
      data.sessionToken ||
      data.session_token ||
      "",
  );
}

function providerMessage(response: unknown) {
  if (!response || typeof response !== "object") return "";

  const source = response as Record<string, unknown>;
  const status = typeof source.status === "object" && source.status
    ? source.status as Record<string, unknown>
    : {};
  const data = typeof source.data === "object" && source.data
    ? source.data as Record<string, unknown>
    : {};

  return String(
    source.message ||
      source.error ||
      source.description ||
      source.statusMessage ||
      source.raw ||
      status.message ||
      status.description ||
      data.message ||
      data.error ||
      "",
  );
}

function normalizeProviderResponse(response: Record<string, unknown>) {
  const nestedStatus = typeof response.status === "object" && response.status
    ? (response.status as Record<string, unknown>)
    : {};
  const faceCheck = typeof response.summary === "object" && response.summary
    ? (response.summary as Record<string, unknown>).face_verification_check
    : null;
  const faceMatch = typeof faceCheck === "object" && faceCheck
    ? (faceCheck as Record<string, unknown>).match
    : null;
  const statusValue = String(
    response.status ||
      response.verification_status ||
      nestedStatus.status ||
      nestedStatus.state ||
      "",
  ).toLowerCase();
  const verified =
    response.verified === true ||
    response.success === true ||
    faceMatch === true ||
    statusValue === "verified" ||
    statusValue === "success" ||
    statusValue === "complete" ||
    statusValue === "matched";

  const failed =
    response.verified === false ||
    faceMatch === false ||
    statusValue === "failed" ||
    statusValue === "rejected" ||
    statusValue === "not_found";

  const reference = String(response.reference || response.request_id || response.transaction_id || response.id || "");
  const message = String(response.message || response.description || "");

  return {
    status: verified ? "verified" : failed ? "failed" : "pending",
    reference,
    message: message || (verified ? "Identity verification passed." : failed ? "Identity verification failed." : "Identity verification is pending."),
  } as VerificationResult;
}

function summarizeProviderResponse(response: unknown) {
  if (!response || typeof response !== "object") return {};

  const source = response as Record<string, unknown>;
  const status = typeof source.status === "object" && source.status
    ? (source.status as Record<string, unknown>)
    : {};
  const summary = typeof source.summary === "object" && source.summary
    ? (source.summary as Record<string, unknown>)
    : {};
  const faceCheck = typeof summary.face_verification_check === "object" && summary.face_verification_check
    ? (summary.face_verification_check as Record<string, unknown>)
    : {};

  return {
    status: status.status || status.state || source.status || source.verification_status || null,
    verified: source.verified ?? source.success ?? null,
    face_match: faceCheck.match ?? null,
    match_score: faceCheck.match_score ?? null,
    reference: source.reference || source.request_id || source.transaction_id || source.sessionId || source.id || null,
    session_id: source.sessionId || source.session_id || null,
    product_code: source.productCode || source.product_code || null,
    message: source.message || source.description || null,
  };
}

function providerName() {
  if (Deno.env.get("NIN_PROVIDER_MODE") === "mock" || Deno.env.get("IDENTITY_PROVIDER_MODE") === "mock") return "mock";
  return Deno.env.get("NIN_PROVIDER_NAME") || Deno.env.get("IDENTITY_PROVIDER_NAME") || "configured_provider";
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
