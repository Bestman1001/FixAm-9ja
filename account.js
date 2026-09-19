const settings = window.FIXAM_SUPABASE || {};
const productionAccountUrl = "https://www.fixam9ja.com/account.html";
const supabaseClient =
  window.supabase && settings.url && settings.anonKey
    ? window.supabase.createClient(settings.url, settings.anonKey)
    : null;

const authPanel = document.querySelector("#authPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const authForm = document.querySelector("#authForm");
const profileForm = document.querySelector("#profileForm");
const artisanProfileForm = document.querySelector("#artisanProfileForm");
const authNote = document.querySelector("#authNote");
const dashboardNote = document.querySelector("#dashboardNote");
const sessionEmail = document.querySelector("#sessionEmail");
const subscriptionLink = document.querySelector("#subscriptionLink");
const adminPortalLink = document.querySelector("#adminPortalLink");
const signOutButton = document.querySelector("#signOutButton");
const magicLinkButton = document.querySelector("#magicLinkButton");
const googleSignInButton = document.querySelector("#googleSignInButton");
const googleSignInLabel = document.querySelector("#googleSignInLabel");
const accountRoleChoices = document.querySelector("#accountRoleChoices");
const accountRoleInput = document.querySelector("#accountRole");
const accountRoleGuidance = document.querySelector("#accountRoleGuidance");
const authRoleEyebrow = document.querySelector("#authRoleEyebrow");
const authRoleTitle = document.querySelector("#authRoleTitle");
const authRoleDescription = document.querySelector("#authRoleDescription");
const refreshButton = document.querySelector("#refreshButton");
const claimProfileButton = document.querySelector("#claimProfileButton");
const portfolioUploadButton = document.querySelector("#portfolioUploadButton");
const profilePhotoUploadButton = document.querySelector("#profilePhotoUploadButton");
const profilePhotoPreview = document.querySelector("#profilePhotoPreview");
const quoteList = document.querySelector("#quoteList");
const quoteLeadList = document.querySelector("#quoteLeadList");
const quoteLeadBadge = document.querySelector("#quoteLeadBadge");
const applicationList = document.querySelector("#applicationList");
const artisanNextStep = document.querySelector("#artisanNextStep");
const artisanOnboardingGuide = document.querySelector("#artisanOnboardingGuide");
const artisanOnboardingWelcome = document.querySelector("#artisanOnboardingWelcome");
const artisanOnboardingSummary = document.querySelector("#artisanOnboardingSummary");
const artisanOnboardingProgress = document.querySelector("#artisanOnboardingProgress");
const artisanOnboardingChecklist = document.querySelector("#artisanOnboardingChecklist");
const artisanOnboardingContinue = document.querySelector("#artisanOnboardingContinue");
const artisanOnboardingHint = document.querySelector("#artisanOnboardingHint");
const artisanLiveActions = document.querySelector("#artisanLiveActions");
const artisanProfile = document.querySelector("#artisanProfile");
const artisanProfileEditor = document.querySelector("#artisanProfileEditor");
const profilePhotoEditor = document.querySelector("#profilePhotoEditor");
const profilePhotoEditorSummary = document.querySelector("#profilePhotoEditorSummary");
const profilePhotoDescription = document.querySelector("#profilePhotoDescription");
const accountRoleBadge = document.querySelector("#accountRoleBadge");
const accountRoleSummary = document.querySelector("#accountRoleSummary");
const mediaList = document.querySelector("#mediaList");
const notificationList = document.querySelector("#notificationList");
const notificationBadge = document.querySelector("#notificationBadge");
const saveNotificationPreferencesButton = document.querySelector("#saveNotificationPreferences");
const deleteAccountDialog = document.querySelector("#deleteAccountDialog");
const deleteAccountNote = document.querySelector("#deleteAccountNote");
const quoteDialog = document.querySelector("#quoteDialog");
const quoteDialogType = document.querySelector("#quoteDialogType");
const quoteDialogTitle = document.querySelector("#quoteDialogTitle");
const quoteDialogBody = document.querySelector("#quoteDialogBody");
const quoteDialogClose = document.querySelector("#quoteDialogClose");
const locationDirectory = window.FIXAM_LOCATIONS || { states: [] };

let currentUser = null;
let currentProfile = null;
let ownedArtisan = null;
let quoteRecords = new Map();
const googleAuthIntentKey = "fixam9ja.googleAuthIntent";
const homeGoogleJoinIntentKey = "fixam9ja.googleJoinIntent";
const artisanOnboardingIntentKey = "fixam9ja.artisanOnboardingIntent";
const initialReviewPublished = new URL(window.location.href).searchParams.get("review") === "published";
let onboardingArrivalHandled = false;
let quoteArrivalHandled = false;
let verificationRefreshTimer = null;
let verificationRefreshCount = 0;
let accountRoleMismatch = null;

if (!supabaseClient) {
  setNote(authNote, "Supabase is not configured yet. Accounts cannot be used.", "error");
}

initializeAccountEntry();

accountRoleChoices?.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-account-role]");
  if (!choice) return;
  selectAccountRole(choice.dataset.accountRole, { updateUrl: true });
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return;

  const mode = document.querySelector("#authMode").value;
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  const fullName = document.querySelector("#fullName").value.trim() || email.split("@")[0];
  const phone = document.querySelector("#phone").value.trim();
  const role = document.querySelector("#accountRole").value;

  if (role === "artisan") rememberArtisanOnboarding("password");
  else clearArtisanOnboardingIntent();

  if (!password) {
    await sendEmailSignInLink();
    return;
  }

  setNote(authNote, mode === "signup" ? "Creating account..." : "Signing in...", "");

  const result =
    mode === "signup"
      ? await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: accountRedirectUrl(role, "password"),
            data: { full_name: fullName, phone, role },
          },
        })
      : await supabaseClient.auth.signInWithPassword({ email, password });

  if (result.error) {
    setNote(authNote, result.error.message, "error");
    return;
  }

  currentUser = result.data.session?.user || null;
  if (currentUser) {
    if (mode === "signup") {
      await saveUserProfile({ email, fullName, phone, role });
    }
    await loadDashboard();
  } else {
    setNote(authNote, "Check your email to confirm this account, then sign in.", "success");
  }
});

magicLinkButton.addEventListener("click", async () => {
  await sendEmailSignInLink();
});

googleSignInButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  const role = document.querySelector("#accountRole").value;
  if (role === "artisan") rememberArtisanOnboarding("google");
  else clearArtisanOnboardingIntent();
  sessionStorage.setItem(googleAuthIntentKey, JSON.stringify({
    role,
    fullName: document.querySelector("#fullName").value.trim(),
    phone: document.querySelector("#phone").value.trim(),
  }));
  googleSignInButton.disabled = true;
  setNote(authNote, "Opening Google sign-in...", "");
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: accountRedirectUrl(role, "google") },
  });
  if (error) {
    googleSignInButton.disabled = false;
    setNote(authNote, `Google sign-in could not start: ${error.message}`, "error");
  }
});

async function sendEmailSignInLink() {
  if (!supabaseClient) return;

  const email = document.querySelector("#email").value.trim();
  if (!email) {
    setNote(authNote, "Enter your email first.", "error");
    return;
  }

  const fullName = document.querySelector("#fullName").value.trim() || email.split("@")[0];
  const phone = document.querySelector("#phone").value.trim();
  const role = document.querySelector("#accountRole").value;
  if (role === "artisan") rememberArtisanOnboarding("email");
  else clearArtisanOnboardingIntent();

  setNote(authNote, "Sending your secure sign-in link...", "");
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: accountRedirectUrl(role, "email"),
      data: { full_name: fullName, phone, role },
    },
  });

  setNote(
    authNote,
    error ? error.message : "Sign-in link sent. Open your email on this device and tap the link.",
    error ? "error" : "success",
  );
}

signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  setSignedOut();
});

refreshButton.addEventListener("click", loadDashboard);
quoteDialogClose.addEventListener("click", () => quoteDialog.close());
quoteDialog.addEventListener("click", (event) => {
  if (event.target === quoteDialog) quoteDialog.close();
});

document.querySelector("#openDeleteAccount").addEventListener("click", () => {
  document.querySelector("#deleteAccountConfirmation").value = "";
  document.querySelector("#deleteAccountAcknowledgement").checked = false;
  setNote(deleteAccountNote, "", "");
  deleteAccountDialog.showModal();
});
document.querySelector("#closeDeleteAccount").addEventListener("click", () => deleteAccountDialog.close());
deleteAccountDialog.addEventListener("click", (event) => {
  if (event.target === deleteAccountDialog) deleteAccountDialog.close();
});
document.querySelector("#confirmDeleteAccount").addEventListener("click", deleteCurrentAccount);
saveNotificationPreferencesButton.addEventListener("click", saveNotificationPreferences);
notificationList.addEventListener("click", markNotificationRead);

quoteList.addEventListener("click", handleQuoteClick);
quoteLeadList.addEventListener("click", handleQuoteClick);
quoteList.addEventListener("keydown", handleQuoteKeydown);
quoteLeadList.addEventListener("keydown", handleQuoteKeydown);
quoteDialogBody.addEventListener("click", handleQuoteAction);
quoteDialogBody.addEventListener("click", handleQuoteOfferResponse);
quoteDialogBody.addEventListener("click", handleQuoteCompletionResponse);
quoteDialogBody.addEventListener("submit", handleQuoteOfferSubmit);

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const selectedRole = document.querySelector("#profileRole").value;
  if (selectedRole === "artisan") rememberArtisanOnboarding("account");
  else clearArtisanOnboardingIntent();

  await saveUserProfile({
    email: currentUser.email,
    fullName: document.querySelector("#profileName").value.trim(),
    phone: document.querySelector("#profilePhone").value.trim(),
    role: selectedRole,
  });
  await loadDashboard({ message: "Personal details saved.", type: "success" });
});

artisanProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!ownedArtisan) return;

  const payload = {
    business_name: document.querySelector("#artisanBusinessName").value.trim(),
    category: document.querySelector("#artisanCategory").value.trim(),
    area: document.querySelector("#artisanArea").value.trim(),
    lga: document.querySelector("#artisanArea").value.trim(),
    town: document.querySelector("#artisanTown").value.trim(),
    availability: document.querySelector("#artisanAvailability").value,
    service_radius: Number(document.querySelector("#artisanServiceRadius").value) || ownedArtisan.service_radius || 10,
    bio: document.querySelector("#artisanBio").value.trim(),
    updated_at: new Date().toISOString(),
  };

  setNote(dashboardNote, "Saving artisan profile...", "");
  let { error } = await supabaseClient.from("artisans").update(payload).eq("id", ownedArtisan.id);
  if (error && isMissingLocationColumn(error)) {
    delete payload.lga;
    delete payload.town;
    ({ error } = await supabaseClient.from("artisans").update(payload).eq("id", ownedArtisan.id));
  }
  await loadDashboard({
    message: error ? error.message : "Artisan profile saved.",
    type: error ? "error" : "success",
  });
});

claimProfileButton.addEventListener("click", async () => {
  if (!currentUser || !currentProfile?.phone) return;

  setNote(dashboardNote, "Claiming matching artisan profile...", "");
  if (currentProfile.role !== "artisan") {
    setNote(dashboardNote, "Change your account role to Artisan and save your profile before claiming.", "error");
    return;
  }

  const profilePhoneKey = phoneKey(currentProfile.phone);
  if (!profilePhoneKey) {
    setNote(dashboardNote, "Add your artisan phone number, save your profile, then claim again.", "error");
    return;
  }

  const { data: possibleMatches, error: matchError } = await supabaseClient
    .from("artisans")
    .select("id, business_name, phone, owner_user_id, profile_status")
    .eq("profile_status", "active");

  if (matchError) {
    setNote(dashboardNote, matchError.message, "error");
    return;
  }

  const matchedArtisan = (possibleMatches || []).find((artisan) => phoneKey(artisan.phone) === profilePhoneKey);
  if (!matchedArtisan) {
    setNote(
      dashboardNote,
      "No live artisan profile matches this phone number yet. Check the number in Admin > Artisan profiles.",
      "error",
    );
    return;
  }

  const { data, error } = await supabaseClient
    .from("artisans")
    .update({ owner_user_id: currentUser.id, updated_at: new Date().toISOString() })
    .eq("id", matchedArtisan.id)
    .select();

  if (error) {
    setNote(dashboardNote, error.message, "error");
    return;
  }

  await loadDashboard({
    message: data?.length
      ? `${data[0].business_name} is now connected to your account.`
      : "The profile matched, but the account claim was blocked. Ask an administrator to check the database claim policy.",
    type: data?.length ? "success" : "error",
  });
});

portfolioUploadButton.addEventListener("click", async () => {
  if (!ownedArtisan) {
    setNote(dashboardNote, "Claim or create an artisan profile before uploading portfolio media.", "error");
    return;
  }

  const files = selectedFiles("#portfolioMedia");
  if (!files.length) {
    setNote(dashboardNote, "Choose image or video files first.", "error");
    return;
  }

  setNote(dashboardNote, "Uploading portfolio media...", "");
  const result = await uploadMediaFiles({
    files,
    folder: `artisan-profiles/${ownedArtisan.id}`,
    entityType: "artisan_profile",
    entityId: String(ownedArtisan.id),
    role: "artisan",
  });

  setNote(
    dashboardNote,
    result.error ? `Upload needs retry: ${result.error}` : `${result.count} portfolio file${result.count === 1 ? "" : "s"} uploaded.`,
    result.error ? "error" : "success",
  );
  await loadDashboard({
    message: result.error ? `Upload needs retry: ${result.error}` : "Portfolio updated.",
    type: result.error ? "error" : "success",
  });
});

profilePhotoUploadButton.addEventListener("click", async () => {
  if (!ownedArtisan) {
    setNote(dashboardNote, "Complete NIN face matching before adding your public profile photograph.", "error");
    return;
  }

  const file = selectedFiles("#profilePhoto")[0];
  if (!file) {
    setNote(dashboardNote, "Take or choose a profile photograph first.", "error");
    return;
  }
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
    setNote(dashboardNote, "Choose a JPG, PNG, HEIC or other image up to 10 MB.", "error");
    return;
  }

  profilePhotoUploadButton.disabled = true;
  setNote(dashboardNote, "Saving your public profile photograph...", "");
  const result = await uploadMediaFiles({
    files: [file],
    folder: `artisan-profiles/${ownedArtisan.id}/profile-photo`,
    entityType: "artisan_profile",
    entityId: String(ownedArtisan.id),
    role: "artisan",
  });
  const publicUrl = result.uploads?.[0]?.publicUrl;
  if (result.error || !publicUrl) {
    profilePhotoUploadButton.disabled = false;
    setNote(dashboardNote, `Profile photograph upload needs retry: ${result.error || "No public image URL was returned."}`, "error");
    return;
  }

  const { error } = await supabaseClient
    .from("artisans")
    .update({ profile_image_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", ownedArtisan.id)
    .eq("owner_user_id", currentUser.id);
  profilePhotoUploadButton.disabled = false;
  if (error) {
    setNote(dashboardNote, `The photograph uploaded but could not be connected to your profile: ${error.message}`, "error");
    return;
  }

  document.querySelector("#profilePhoto").value = "";
  await loadDashboard({ message: "Public profile photograph saved.", type: "success" });
});

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      currentUser = session.user;
      loadDashboard();
    } else {
      setSignedOut();
    }
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      currentUser = data.session.user;
      loadDashboard();
    } else {
      setSignedOut();
    }
  });
}

async function loadDashboard(note = null) {
  if (!supabaseClient || !currentUser) return;

  const { data: adminProfile, error: adminProfileError } = await supabaseClient
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  const isAdministrator = !adminProfileError && Boolean(adminProfile);
  if (adminPortalLink) {
    adminPortalLink.hidden = !isAdministrator;
    if (isAdministrator) adminPortalLink.href = adminDashboardUrl();
  }

  authPanel.hidden = true;
  dashboardPanel.hidden = false;
  signOutButton.hidden = false;
  document.body.classList.add("is-signed-in");
  sessionEmail.textContent = currentUser.email || "Signed in";

  setNote(dashboardNote, "Loading account...", "");
  currentProfile = await loadProfile();
  if (currentProfile?.account_status === "suspended") {
    await supabaseClient.auth.signOut();
    setSignedOut();
    setNote(authNote, `This account is suspended. ${currentProfile.status_reason || "Contact support@fixam9ja.com for assistance."}`, "error");
    return;
  }
  fillProfileForm();
  applyAccountRoleView();
  if (currentProfile?.account_status === "restricted") {
    setNote(dashboardNote, `Account access is restricted. ${currentProfile.status_reason || "Contact support@fixam9ja.com."}`, "error");
  }

  const [quotesResult, applicationsResult, artisansResult, mediaResult, notificationsResult, preferencesResult] = await Promise.all([
    supabaseClient
      .from("quote_requests")
      .select(
        "id, request_code, review_token, artisan_id, artisan_name, artisan_phone, artisan_category, artisan_state, artisan_area, job_location, urgency, job_details, status, media_count, agreed_amount, customer_completed_at, artisan_completion_status, artisan_completion_note, artisan_completion_responded_at, created_at",
      )
      .eq("customer_user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(20),
      supabaseClient
        .from("artisan_applications")
        .select("*")
      .eq("applicant_user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseClient
      .from("artisans")
      .select("*")
      .eq("owner_user_id", currentUser.id)
      .limit(5),
    supabaseClient
      .from("media_uploads")
      .select("file_name, public_url, entity_type, created_at")
      .eq("uploaded_by_user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseClient
      .from("user_notifications")
      .select("id, title, message, category, action_url, read_at, created_at")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabaseClient
      .from("notification_preferences")
      .select("in_app_enabled, email_enabled, push_enabled")
      .eq("user_id", currentUser.id)
      .maybeSingle(),
  ]);

  ownedArtisan = artisansResult.data?.[0] || null;
  renderProfilePhoto(ownedArtisan);
  const quoteLeadsResult = ownedArtisan
    ? await supabaseClient
        .from("quote_requests")
        .select(
          "id, request_code, customer_name, customer_phone, artisan_name, artisan_phone, artisan_category, job_location, urgency, job_details, status, media_count, agreed_amount, customer_completed_at, artisan_completion_status, artisan_completion_note, artisan_completion_responded_at, created_at",
          { count: "exact" },
        )
        .eq("artisan_id", ownedArtisan.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [], count: 0, error: null };

  quoteRecords = new Map();
  renderQuotes(quotesResult.data || []);
  renderQuoteLeads(quoteLeadsResult.data || [], quoteLeadsResult.count || 0);
  openRequestedQuoteFromUrl();
  renderApplications(applicationsResult.data || []);
  renderArtisanProfile(artisansResult.data || [], applicationsResult.data || []);
  renderArtisanNextStep(applicationsResult.data || [], artisansResult.data || []);
  renderArtisanOnboardingGuide(applicationsResult.data || [], artisansResult.data || []);
  fillArtisanProfileForm();
  renderMedia(mediaResult.data || []);
  renderNotifications(notificationsResult.data || []);
  fillNotificationPreferences(preferencesResult.data);

  const firstError =
    quotesResult.error || applicationsResult.error || artisansResult.error || mediaResult.error ||
    notificationsResult.error || preferencesResult.error || quoteLeadsResult.error;
  if (firstError) {
    setNote(dashboardNote, `${firstError.message}. Ask an administrator to check that the latest database setup has been applied.`, "error");
    return;
  }

  if (currentProfile?.account_status === "restricted") {
    setNote(dashboardNote, `Account access is restricted. ${currentProfile.status_reason || "Contact support@fixam9ja.com."}`, "error");
  } else {
    const arrivalNote = accountArrivalNote();
    setNote(dashboardNote, note?.message || arrivalNote?.message || "", note?.type || arrivalNote?.type || "");
  }
}

async function loadProfile() {
  const { data } = await supabaseClient.from("user_profiles").select("*").eq("user_id", currentUser.id).maybeSingle();
  const wantsArtisan = isArtisanOnboardingRequested();
  const googleIntent = readGoogleAuthIntent();
  const requestedRole = requestedAccountRole(googleIntent);
  if (data) {
    const hasSavedRole = data.role === "customer" || data.role === "artisan";
    const savedRole = hasSavedRole ? data.role : (requestedRole || "customer");
    if (hasSavedRole && requestedRole && requestedRole !== savedRole) {
      accountRoleMismatch = { requestedRole, savedRole };
      clearArtisanOnboardingIntent();
    }
    const updatedProfile = {
      ...data,
      full_name: data.full_name || googleIntent.fullName || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name,
      phone: data.phone || googleIntent.phone || currentUser.user_metadata?.phone || "",
      role: savedRole,
    };
    if (
      updatedProfile.role !== data.role ||
      updatedProfile.full_name !== data.full_name ||
      updatedProfile.phone !== data.phone
    ) {
      await saveUserProfile({
        email: data.email || currentUser.email,
        fullName: updatedProfile.full_name,
        phone: updatedProfile.phone,
        role: updatedProfile.role,
      });
    }
    sessionStorage.removeItem(googleAuthIntentKey);
    sessionStorage.removeItem(homeGoogleJoinIntentKey);
    return updatedProfile;
  }

  const fallback = {
    email: currentUser.email,
    full_name: googleIntent.fullName || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "FixAm user",
    phone: googleIntent.phone || currentUser.user_metadata?.phone || "",
    role: requestedRole || (wantsArtisan || googleIntent.role === "artisan" ? "artisan" : (currentUser.user_metadata?.role || "customer")),
  };
  await saveUserProfile({
    email: fallback.email,
    fullName: fallback.full_name,
    phone: fallback.phone,
    role: fallback.role,
  });
  sessionStorage.removeItem(googleAuthIntentKey);
  sessionStorage.removeItem(homeGoogleJoinIntentKey);
  return { user_id: currentUser.id, ...fallback };
}

function readGoogleAuthIntent() {
  try {
    const intent = JSON.parse(
      sessionStorage.getItem(googleAuthIntentKey) || sessionStorage.getItem(homeGoogleJoinIntentKey) || "{}",
    );
    return intent && typeof intent === "object" ? intent : {};
  } catch (_error) {
    return {};
  }
}

function requestedAccountRole(intent = readGoogleAuthIntent()) {
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get("role");
  if (urlRole === "customer" || urlRole === "artisan") return urlRole;
  if (params.get("onboarding") === "artisan") return "artisan";
  if (intent?.role === "customer" || intent?.role === "artisan") return intent.role;
  return null;
}

function initializeAccountEntry() {
  const params = new URLSearchParams(window.location.search);
  const role = requestedAccountRole({}) || "customer";
  selectAccountRole(role, { updateUrl: false });
  if (params.get("intent") === "signup") {
    const authMode = document.querySelector("#authMode");
    if (authMode) authMode.value = "signup";
  }
}

function selectAccountRole(role, { updateUrl = false } = {}) {
  const selectedRole = role === "artisan" ? "artisan" : "customer";
  if (accountRoleInput) accountRoleInput.value = selectedRole;
  accountRoleChoices?.querySelectorAll("[data-account-role]").forEach((choice) => {
    choice.setAttribute("aria-pressed", String(choice.dataset.accountRole === selectedRole));
  });

  const artisan = selectedRole === "artisan";
  if (authRoleEyebrow) authRoleEyebrow.textContent = artisan ? "Artisan account" : "Customer account";
  if (authRoleTitle) authRoleTitle.textContent = artisan ? "Join as an artisan" : "Join as a customer";
  if (authRoleDescription) {
    authRoleDescription.textContent = artisan
      ? "Advertise your skills, complete verification, and receive customer enquiries."
      : "Find trusted artisans, request quotes, and manage your jobs.";
  }
  if (accountRoleGuidance) {
    accountRoleGuidance.textContent = artisan
      ? "You are creating or signing in to an artisan account for offering skilled services."
      : "You are creating or signing in to a customer account for hiring skilled workers.";
  }
  const article = artisan ? "an" : "a";
  const roleLabel = artisan ? "artisan" : "customer";
  if (googleSignInLabel) googleSignInLabel.textContent = `Continue with Google as ${article} ${roleLabel}`;
  if (magicLinkButton) magicLinkButton.textContent = `Email me ${article} ${roleLabel} sign-in link`;

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("role", selectedRole);
    history.replaceState({}, "", url);
  }
}

function onboardingRequest() {
  const params = new URLSearchParams(window.location.search);
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(artisanOnboardingIntentKey) || "{}");
  } catch (_error) {
    stored = {};
  }
  return {
    active: params.get("onboarding") === "artisan" || stored.active === true,
    source: params.get("source") || stored.source || "account",
    arrivedNow: params.get("onboarding") === "artisan",
  };
}

function isArtisanOnboardingRequested() {
  return onboardingRequest().active;
}

function rememberArtisanOnboarding(source = "account") {
  try {
    localStorage.setItem(artisanOnboardingIntentKey, JSON.stringify({
      active: true,
      source,
      updatedAt: new Date().toISOString(),
    }));
  } catch (_error) {
    // The database milestones still preserve progress when browser storage is unavailable.
  }
}

function clearArtisanOnboardingIntent() {
  try {
    localStorage.removeItem(artisanOnboardingIntentKey);
  } catch (_error) {
    // Storage may be unavailable in strict privacy modes.
  }
}

async function saveUserProfile({ email, fullName, phone, role }) {
  const payload = {
    user_id: currentUser.id,
    email,
    full_name: fullName || email,
    phone,
    role,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseClient.from("user_profiles").upsert(payload);
  setNote(dashboardNote, error ? error.message : "Profile saved.", error ? "error" : "success");
}

function fillProfileForm() {
  document.querySelector("#profileName").value = currentProfile?.full_name || "";
  document.querySelector("#profilePhone").value = currentProfile?.phone || "";
  document.querySelector("#profileRole").value = currentProfile?.role || "customer";
  const roleLabel = currentProfile?.role === "artisan" ? "Artisan" : "Customer";
  if (accountRoleBadge) accountRoleBadge.textContent = roleLabel;
  if (accountRoleSummary) accountRoleSummary.textContent = `${roleLabel} account · ${currentProfile?.email || currentUser?.email || "Signed in"}`;
  document.querySelector("#dashboardTitle").textContent = `Welcome, ${currentProfile?.full_name || "FixAm user"}`;
}

function renderQuotes(items) {
  items.forEach((item) => quoteRecords.set(`customer:${item.id}`, { ...item, viewType: "customer" }));
  quoteList.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="quote-item" role="button" tabindex="0" data-quote-key="customer:${escapeHtml(item.id)}">
              <strong>${escapeHtml(item.request_code)} - ${escapeHtml(item.artisan_name)}</strong>
              <small>${escapeHtml(item.artisan_category)} at ${escapeHtml(item.job_location)}</small>
              <small>${escapeHtml(item.status)}${item.agreed_amount ? ` - agreed ${formatNaira(item.agreed_amount)}` : ""} - ${item.media_count || 0} media - open details</small>
            </article>
          `,
        )
        .join("")
    : `<article><span>No quote requests linked to this account yet.</span></article>`;
}

function renderQuoteLeads(items, total) {
  quoteLeadBadge.textContent = String(total);
  quoteLeadBadge.classList.toggle("is-empty", total === 0);
  items.forEach((item) => quoteRecords.set(`lead:${item.id}`, { ...item, viewType: "lead" }));

  quoteLeadList.innerHTML = ownedArtisan
    ? items.length
      ? items
          .map(
            (item) => `
              <article class="quote-item" role="button" tabindex="0" data-quote-key="lead:${escapeHtml(item.id)}">
                <strong>${escapeHtml(item.request_code)} - ${escapeHtml(item.customer_name)}</strong>
                <small>${escapeHtml(item.job_location)} - ${escapeHtml(item.urgency)} - ${escapeHtml(item.status)}</small>
                <small>${item.agreed_amount ? `Agreed ${formatNaira(item.agreed_amount)} - ` : ""}${item.media_count || 0} media - open details</small>
              </article>
            `,
          )
          .join("")
      : `<article><span>No customer quote leads have arrived for your artisan profile yet.</span></article>`
    : `<article><span>Claim an artisan profile to see customer quote leads here.</span></article>`;
}

function openRequestedQuoteFromUrl() {
  if (quoteArrivalHandled) return;
  const url = new URL(window.location.href);
  const quoteId = url.searchParams.get("quote");
  if (!quoteId) return;
  const entry = [...quoteRecords.entries()].find(([, quote]) => quote.id === quoteId);
  if (!entry) return;
  quoteArrivalHandled = true;
  requestAnimationFrame(() => openQuoteDetails(entry[0]));
  url.searchParams.delete("quote");
  history.replaceState({}, "", url);
}

function accountArrivalNote() {
  if (accountRoleMismatch) {
    const savedLabel = accountRoleMismatch.savedRole === "artisan" ? "Artisan" : "Customer";
    accountRoleMismatch = null;
    const url = new URL(window.location.href);
    url.searchParams.delete("role");
    url.searchParams.delete("onboarding");
    url.searchParams.delete("source");
    history.replaceState({}, "", url);
    return {
      message: `You signed in to an existing ${savedLabel} account. We kept its saved account type unchanged. Contact support if you need to add a different type of access.`,
      type: "success",
    };
  }
  if (!initialReviewPublished) return null;
  return { message: "Thank you. Your review was published successfully.", type: "success" };
}

function handleQuoteClick(event) {
  const item = event.target.closest(".quote-item");
  if (!item) return;
  openQuoteDetails(item.dataset.quoteKey);
}

function handleQuoteKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const item = event.target.closest(".quote-item");
  if (!item) return;
  event.preventDefault();
  openQuoteDetails(item.dataset.quoteKey);
}

async function openQuoteDetails(quoteKey) {
  const quote = quoteRecords.get(quoteKey);
  if (!quote) return;

  quoteDialogType.textContent = quote.viewType === "lead" ? "Quote lead" : "Your quote request";
  quoteDialogTitle.textContent = `${quote.request_code} - ${
    quote.viewType === "lead" ? quote.customer_name : quote.artisan_name
  }`;
  quoteDialogBody.innerHTML = renderQuoteDetails(quote, [], []);
  if (!quoteDialog.open) quoteDialog.showModal();

  const [mediaResult, offersResult] = await Promise.all([
    supabaseClient
      .from("media_uploads")
      .select("file_name, public_url, bucket, storage_path, mime_type, created_at")
      .eq("entity_type", "quote_request")
      .in("entity_id", [String(quote.id), quote.request_code])
      .order("created_at", { ascending: false }),
    supabaseClient
      .from("quote_offers")
      .select("id, offered_by, amount, note, status, created_at, responded_at")
      .eq("quote_request_id", quote.id)
      .order("created_at", { ascending: false }),
  ]);

  const mediaItems = mediaResult.error ? [] : await resolvePrivateMediaUrls(mediaResult.data || []);
  quoteDialogBody.innerHTML = renderQuoteDetails(
    quote,
    mediaItems,
    offersResult.error ? [] : offersResult.data || [],
    mediaResult.error?.message || "",
    offersResult.error?.message || "",
  );
}

async function resolvePrivateMediaUrls(items) {
  return Promise.all(items.map(async (item) => {
    if (item.public_url || !item.bucket || !item.storage_path) return item;
    const { data, error } = await supabaseClient.storage.from(item.bucket).createSignedUrl(item.storage_path, 600);
    return { ...item, public_url: error ? "" : data.signedUrl };
  }));
}

function renderQuoteDetails(quote, mediaItems, offers = [], mediaError = "", offerError = "") {
  const detailName = quote.viewType === "lead" ? quote.customer_name : quote.artisan_name;
  const phoneBlock =
    quote.viewType === "lead"
      ? `<article><span>Customer contact</span>${renderPhoneLink(quote.customer_phone, "Call customer")}</article>`
      : `<article><span>Artisan contact</span>${renderPhoneLink(quote.artisan_phone, "Call artisan")}</article>`;
  const actionBlock = quote.viewType === "lead" ? renderQuoteActions(quote) : "";
  const customerActionBlock = quote.viewType === "customer" ? renderCustomerQuoteActions(quote) : "";

  return `
    ${actionBlock}
    ${customerActionBlock}
    ${renderQuoteNegotiation(quote, offers, offerError)}
    <div class="quote-detail-grid">
      <article><span>Name</span>${escapeHtml(detailName)}</article>
      <article><span>Location</span>${escapeHtml(quote.job_location)}</article>
      <article><span>Urgency</span>${escapeHtml(quote.urgency || "Not specified")}</article>
      <article><span>Status</span>${escapeHtml(quote.status)}</article>
      ${phoneBlock}
      <article><span>Trade</span>${escapeHtml(quote.artisan_category)}</article>
      <article><span>Media count</span>${quote.media_count || 0}</article>
    </div>
    <div class="quote-details-text">
      <span>Job details</span>
      <p>${escapeHtml(quote.job_details || "No job details supplied.")}</p>
    </div>
    <div>
      <h3>Attached photos/videos</h3>
      ${
        mediaError
          ? `<p class="form-note error-note">${escapeHtml(mediaError)}</p>`
          : renderQuoteMedia(mediaItems)
      }
    </div>
  `;
}

function renderPhoneLink(phone, label) {
  const display = String(phone || "").trim();
  const callable = display.replace(/[^+\d]/g, "").replace(/(?!^)\+/g, "");
  if (!callable) return "<span>Contact number unavailable</span>";
  return `<a class="quote-phone-link" href="tel:${escapeHtml(callable)}">${escapeHtml(label)} · ${escapeHtml(display)}</a>`;
}

function renderQuoteNegotiation(quote, offers, offerError = "") {
  const active = !["completed", "cancelled", "declined"].includes(quote.status);
  const viewerParty = quote.viewType === "lead" ? "artisan" : "customer";
  const pendingOffer = offers.find((offer) => offer.status === "pending") || null;
  const acceptedOffer = offers.find((offer) => offer.status === "accepted") || null;
  const agreedAmount = Number(quote.agreed_amount || acceptedOffer?.amount || 0);
  const incomingOffer = pendingOffer && pendingOffer.offered_by !== viewerParty;
  const offerLabel = pendingOffer?.offered_by === "artisan" ? "Artisan offer" : "Customer offer";
  const history = offers.length
    ? `<div class="offer-history">${offers.slice(0, 6).map((offer) => `
        <article>
          <div><strong>${offer.offered_by === "artisan" ? "Artisan" : "Customer"} · ${formatNaira(offer.amount)}</strong><span class="offer-status is-${escapeHtml(offer.status)}">${escapeHtml(offer.status)}</span></div>
          ${offer.note ? `<p>${escapeHtml(offer.note)}</p>` : ""}
          <small>${new Date(offer.created_at).toLocaleString("en-NG")}</small>
        </article>`).join("")}</div>`
    : `<p class="form-note">No price has been proposed yet. Discuss the work, then record the amount here.</p>`;

  return `
    <section class="quote-negotiation" data-quote-id="${escapeHtml(quote.id)}">
      <div class="card-title-row">
        <div><span class="section-label">Price agreement</span><h3>${agreedAmount ? `Agreed price: ${formatNaira(agreedAmount)}` : "Agree the cost of work"}</h3></div>
      </div>
      ${offerError ? `<p class="form-note error-note">Price negotiation is temporarily unavailable: ${escapeHtml(offerError)}</p>` : ""}
      ${pendingOffer ? `<div class="current-offer"><span>${escapeHtml(offerLabel)}</span><strong>${formatNaira(pendingOffer.amount)}</strong>${pendingOffer.note ? `<p>${escapeHtml(pendingOffer.note)}</p>` : ""}</div>` : ""}
      ${incomingOffer && active ? `<div class="quote-action-buttons offer-response-buttons">
        <button class="primary-action" type="button" data-offer-response="accepted" data-offer-id="${escapeHtml(pendingOffer.id)}">Accept price</button>
        <button class="danger-action" type="button" data-offer-response="declined" data-offer-id="${escapeHtml(pendingOffer.id)}">Decline offer</button>
      </div>` : ""}
      ${pendingOffer && !incomingOffer ? `<p class="form-note">Waiting for the ${viewerParty === "artisan" ? "customer" : "artisan"} to respond. You can revise it below.</p>` : ""}
      ${active && !agreedAmount ? `<form class="quote-offer-form" data-quote-offer-form data-quote-id="${escapeHtml(quote.id)}">
        <label><span>${pendingOffer ? "Counter or revise price (NGN)" : "Proposed price (NGN)"}</span><input name="amount" type="number" min="100" max="100000000" step="100" inputmode="numeric" placeholder="e.g. 15000" required /></label>
        <label><span>Short note (optional)</span><textarea name="note" rows="2" maxlength="500" placeholder="What the price covers"></textarea></label>
        <button class="secondary-action" type="submit">${pendingOffer ? "Send counteroffer" : "Send price offer"}</button>
      </form>` : ""}
      <details class="offer-history-disclosure" ${offers.length ? "" : "hidden"}><summary>Price history</summary>${history}</details>
    </section>`;
}

function renderCustomerQuoteActions(quote) {
  const canCancel = ["new", "contacted"].includes(quote.status);
  const canComplete = ["contacted", "accepted"].includes(quote.status);
  const reviewUrl = quote.status === "completed" ? reviewLinkForQuote(quote) : "";
  const statusText =
    quote.status === "completed"
      ? quote.artisan_completion_status === "confirmed"
        ? "The artisan confirmed completion. You can review the service below."
        : quote.artisan_completion_status === "disputed"
          ? "The artisan reported an issue with completion. Call them to resolve the outstanding point."
          : "You marked this job complete. The artisan has been asked to confirm it."
      : quote.status === "cancelled"
        ? "You cancelled this request. It remains here for your records."
        : quote.status === "declined"
          ? "The artisan declined this request. You can choose another artisan from the marketplace."
          : quote.status === "accepted"
            ? "The artisan accepted your job. Mark it completed after the work is done."
            : quote.status === "contacted"
              ? "The artisan has contacted you. You can cancel or mark complete after the work is done."
              : "Your request is waiting for the artisan to respond.";

  return `
    <section class="quote-actions customer-quote-actions" data-quote-id="${escapeHtml(quote.id)}">
      <div>
        <span>Customer action</span>
        <strong>${escapeHtml(statusText)}</strong>
      </div>
      <div class="quote-action-buttons">
        ${
          canComplete
            ? `<button class="primary-action" type="button" data-quote-action="completed">Mark completed</button>`
            : ""
        }
        ${
          reviewUrl
            ? `<a class="primary-action quote-review-link" href="${escapeHtml(reviewUrl)}">Leave review</a>`
            : ""
        }
        ${
          canCancel
            ? `<button class="danger-action" type="button" data-quote-action="cancelled">Cancel request</button>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderQuoteActions(quote) {
  const canRespond = ["new", "contacted"].includes(quote.status);
  const completionPending = quote.status === "completed" && (quote.artisan_completion_status || "pending") === "pending";
  const statusText =
    quote.status === "completed"
      ? quote.artisan_completion_status === "confirmed"
        ? "You confirmed that this job is complete. It now counts in your completed work."
        : quote.artisan_completion_status === "disputed"
          ? `You reported an issue with completion${quote.artisan_completion_note ? `: ${quote.artisan_completion_note}` : "."}`
          : "The customer marked this job complete. Confirm it or report an issue below."
      : quote.status === "accepted"
      ? "You accepted this job. Contact the customer to agree price, timing, and next steps."
      : quote.status === "declined"
        ? "You declined this quote. It will stay in your history for reference."
        : quote.status === "contacted"
          ? "You marked this customer as contacted. Accept the job when you are ready to proceed."
          : "Choose what you want to do with this customer request.";

  return `
    <section class="quote-actions" data-quote-id="${escapeHtml(quote.id)}">
      <div>
        <span>Artisan response</span>
        <strong>${escapeHtml(statusText)}</strong>
      </div>
      <div class="quote-action-buttons">
        ${canRespond ? `<button class="primary-action" type="button" data-quote-action="accepted">Accept job</button>` : ""}
        ${quote.status === "new" ? `<button class="secondary-action" type="button" data-quote-action="contacted">Mark contacted</button>` : ""}
        ${canRespond ? `<button class="danger-action" type="button" data-quote-action="declined">Decline</button>` : ""}
      </div>
      ${completionPending ? `<div class="completion-response">
        <label><span>Completion note (optional)</span><textarea data-completion-note rows="2" maxlength="500" placeholder="Add a short note if something remains unresolved"></textarea></label>
        <div class="quote-action-buttons">
          <button class="primary-action" type="button" data-quote-completion="confirmed">Confirm completed</button>
          <button class="danger-action" type="button" data-quote-completion="disputed">Report an issue</button>
        </div>
      </div>` : ""}
    </section>
  `;
}

async function handleQuoteAction(event) {
  const button = event.target.closest("[data-quote-action]");
  if (!button) return;

  const actionPanel = button.closest("[data-quote-id]");
  const quote = [...quoteRecords.values()].find((item) => item.id === actionPanel?.dataset.quoteId);
  if (!quote) return;

  const nextStatus = button.dataset.quoteAction;
  const originalText = button.textContent;
  button.textContent = "Saving...";
  button.disabled = true;

  const rpcName = quote.viewType === "lead" ? "update_quote_request_status" : "update_customer_quote_status";
  const { data, error } = await supabaseClient.rpc(rpcName, {
    p_quote_id: quote.id,
    p_status: nextStatus,
  });

  if (error) {
    button.textContent = originalText;
    button.disabled = false;
    setNote(dashboardNote, `Could not update quote: ${error.message}`, "error");
    quoteDialogBody.insertAdjacentHTML(
      "afterbegin",
      `<p class="form-note error-note">${escapeHtml(error.message)}</p>`,
    );
    return;
  }

  const updatedQuote = Array.isArray(data) ? data[0] : data;
  if (updatedQuote) Object.assign(quote, updatedQuote);
  quote.status = updatedQuote?.status || nextStatus;
  const quoteKey = `${quote.viewType}:${quote.id}`;
  quoteRecords.set(quoteKey, quote);
  await loadDashboard({ message: `${quote.request_code} updated to ${nextStatus}.`, type: "success" });
  await openQuoteDetails(quoteKey);
}

async function handleQuoteOfferSubmit(event) {
  const form = event.target.closest("[data-quote-offer-form]");
  if (!form) return;
  event.preventDefault();
  const quoteId = form.dataset.quoteId;
  const quote = [...quoteRecords.values()].find((item) => item.id === quoteId);
  if (!quote) return;

  const amount = Math.round(Number(new FormData(form).get("amount")));
  const note = String(new FormData(form).get("note") || "").trim();
  const button = form.querySelector("button[type='submit']");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Sending...";

  const { error } = await supabaseClient.rpc("make_quote_offer", {
    p_quote_id: quote.id,
    p_amount: amount,
    p_note: note || null,
  });
  if (error) {
    button.disabled = false;
    button.textContent = originalText;
    showQuoteDialogError(`Could not send price: ${error.message}`);
    return;
  }

  await refreshOpenQuote(quote, `${quote.request_code}: price offer sent.`);
}

async function handleQuoteOfferResponse(event) {
  const button = event.target.closest("[data-offer-response]");
  if (!button) return;
  const actionPanel = button.closest("[data-quote-id]");
  const quote = [...quoteRecords.values()].find((item) => item.id === actionPanel?.dataset.quoteId);
  if (!quote) return;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Saving...";

  const { error } = await supabaseClient.rpc("respond_to_quote_offer", {
    p_offer_id: button.dataset.offerId,
    p_response: button.dataset.offerResponse,
  });
  if (error) {
    button.disabled = false;
    button.textContent = originalText;
    showQuoteDialogError(`Could not update the price offer: ${error.message}`);
    return;
  }

  const message = button.dataset.offerResponse === "accepted" ? "Price accepted." : "Price offer declined.";
  await refreshOpenQuote(quote, `${quote.request_code}: ${message}`);
}

async function handleQuoteCompletionResponse(event) {
  const button = event.target.closest("[data-quote-completion]");
  if (!button) return;
  const actionPanel = button.closest("[data-quote-id]");
  const quote = [...quoteRecords.values()].find((item) => item.id === actionPanel?.dataset.quoteId);
  if (!quote) return;
  const note = actionPanel.querySelector("[data-completion-note]")?.value.trim() || "";
  if (button.dataset.quoteCompletion === "disputed" && !note) {
    showQuoteDialogError("Add a short note explaining what remains unresolved.");
    return;
  }
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Saving...";

  const { error } = await supabaseClient.rpc("respond_to_quote_completion", {
    p_quote_id: quote.id,
    p_response: button.dataset.quoteCompletion,
    p_note: note || null,
  });
  if (error) {
    button.disabled = false;
    button.textContent = originalText;
    showQuoteDialogError(`Could not save your completion response: ${error.message}`);
    return;
  }

  await refreshOpenQuote(
    quote,
    button.dataset.quoteCompletion === "confirmed"
      ? `${quote.request_code}: completion confirmed.`
      : `${quote.request_code}: completion issue recorded.`,
  );
}

async function refreshOpenQuote(quote, message) {
  const quoteKey = `${quote.viewType}:${quote.id}`;
  await loadDashboard({ message, type: "success" });
  await openQuoteDetails(quoteKey);
}

function showQuoteDialogError(message) {
  quoteDialogBody.insertAdjacentHTML("afterbegin", `<p class="form-note error-note">${escapeHtml(message)}</p>`);
}

function reviewLinkForQuote(quote) {
  if (!quote.review_token || !quote.artisan_id) return "";

  const url = new URL("review.html", window.location.href);
  url.searchParams.set("token", quote.review_token);
  url.searchParams.set("quote_id", quote.id);
  url.searchParams.set("artisan_id", quote.artisan_id);
  url.searchParams.set("artisan_name", quote.artisan_name || "this artisan");
  url.searchParams.set("artisan_category", quote.artisan_category || "Artisan");
  url.searchParams.set("artisan_state", quote.artisan_state || "");
  url.searchParams.set("artisan_area", quote.artisan_area || "");
  return url.toString();
}

function renderQuoteMedia(items) {
  if (!items.length) {
    return `<p class="form-note">No photos or videos attached to this quote.</p>`;
  }

  return `
    <div class="quote-media-grid">
      ${items
        .map((item) => {
          const media =
            item.mime_type?.startsWith("image/")
              ? `<a href="${escapeHtml(item.public_url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(
                  item.public_url,
                )}" alt="${escapeHtml(item.file_name)}" /></a>`
              : item.mime_type?.startsWith("video/")
                ? `<video src="${escapeHtml(item.public_url)}" controls></video>`
                : `<a href="${escapeHtml(item.public_url)}" target="_blank" rel="noreferrer">Open file</a>`;

          return `
            <article class="quote-media-item">
              ${media}
              <a href="${escapeHtml(item.public_url)}" target="_blank" rel="noreferrer">${escapeHtml(item.file_name)}</a>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderApplications(items) {
  applicationList.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article>
              <strong>${escapeHtml(item.application_code)} - ${escapeHtml(item.trade)}</strong>
              <small>${escapeHtml(item.applicant_email || currentUser.email || "No login email")}</small>
              <small>${escapeHtml([item.town, item.lga || item.area].filter(Boolean).join(", "))}, ${escapeHtml(item.state)}</small>
              <small>${escapeHtml(item.status)} - ${item.media_count || 0} portfolio media - ${item.verification_media_count || 0} identity proof</small>
              <small>NIN ${escapeHtml(item.identity_verification_status || "pending")} - Subscription ${escapeHtml(
                item.subscription_status || "pending",
              )} - ${formatNaira(item.subscription_amount)}</small>
            </article>
          `,
        )
        .join("")
    : `<article><span>No artisan applications linked to this account yet.</span></article>`;
}

function renderArtisanNextStep(applications, artisans) {
  artisanNextStep.hidden = currentProfile?.role !== "artisan";
  if (artisanNextStep.hidden) return;
  const application = applications[0];
  const artisan = artisans[0];
  if (!application && !artisan) {
    artisanNextStep.innerHTML = '<h3>Start your artisan application</h3><p>Complete your business details and identity check to set up your membership.</p><a class="primary-action" href="index.html#join">Apply as an artisan</a>';
    artisanNextStep.hidden = true;
    return;
  }
  const identity = application?.identity_verification_status || artisan?.identity_verification_status;
  if (identity !== "verified") {
    artisanNextStep.innerHTML = `<h3>${identity === "failed" ? "Identity verification needs attention" : "Waiting for your verification result"}</h3><p>${identity === "failed" ? "Contact verification support to review your existing check." : "Your application is linked to this account. If you completed QoreID, use Refresh to check for the result. You do not need to claim a profile or repeat a paid identity check."}</p><p>Subscription checkout becomes available once FixAm confirms your identity.</p><a href="mailto:verification@fixam9ja.com">Contact verification support</a>`;
    artisanNextStep.hidden = true;
    return;
  }
  if (!artisan) {
    artisanNextStep.innerHTML = '<h3>Identity verified — preparing your artisan profile</h3><p>Your face match has passed. Use Refresh shortly so FixAm can finish connecting your profile before you add its public photograph.</p>';
    artisanNextStep.hidden = true;
    return;
  }
  if (!safePublicImageUrl(artisan.profile_image_url)) {
    artisanNextStep.innerHTML = '<h3>Add your public profile photograph</h3><p>Your NIN face match has passed. Take or choose the photograph customers should see before you continue to membership and payment.</p><a class="primary-action" href="#profilePhotoCard">Add profile photograph</a>';
    artisanNextStep.hidden = true;
    return;
  }
  const url = new URL("billing.html", window.location.href);
  if (application) url.searchParams.set("application", application.application_code);
  url.searchParams.set("plan", application?.subscription_plan || artisan?.subscription_plan || "monthly");
  artisanNextStep.innerHTML = `<h3>Your profile is ready for membership</h3><p>Choose your subscription and preferred Paystack payment method. Your verified application and public photograph are already linked to your account.</p><a class="primary-action" href="${escapeHtml(url.href)}">Continue to subscription & payments</a>`;
  artisanNextStep.hidden = true;
}

function artisanOnboardingState(applications, artisans) {
  const application = applications[0] || null;
  const artisan = artisans[0] || null;
  const identityStatuses = [application?.identity_verification_status, artisan?.identity_verification_status]
    .filter(Boolean)
    .map((status) => String(status).toLowerCase());
  const identity = identityStatuses.includes("verified")
    ? "verified"
    : identityStatuses.includes("failed")
      ? "failed"
      : "pending";
  const hasPhoto = Boolean(safePublicImageUrl(artisan?.profile_image_url));
  const subscriptionStatuses = [artisan?.subscription_status, application?.subscription_status]
    .filter(Boolean)
    .map((status) => String(status).toLowerCase());
  const hasMembership = subscriptionStatuses.some((status) => ["active", "founding", "free_trial"].includes(status));
  const complete = [true, Boolean(application || artisan), identity === "verified", hasPhoto, hasMembership];
  const currentIndex = complete.findIndex((item) => !item);
  return { application, artisan, identity, hasPhoto, hasMembership, complete, currentIndex };
}

function renderArtisanOnboardingGuide(applications, artisans) {
  if (!artisanOnboardingGuide) return;
  const isArtisan = currentProfile?.role === "artisan";
  artisanOnboardingGuide.hidden = !isArtisan;
  if (!isArtisan) return;

  const state = artisanOnboardingState(applications, artisans);
  const completedCount = state.complete.filter(Boolean).length;
  const firstName = String(currentProfile?.full_name || "Artisan").trim().split(/\s+/)[0];
  const request = onboardingRequest();
  const isComplete = completedCount === state.complete.length;
  artisanOnboardingGuide.classList.toggle("is-live", isComplete);
  artisanOnboardingChecklist.hidden = isComplete;
  if (artisanLiveActions) artisanLiveActions.hidden = !isComplete;
  if (!isComplete) rememberArtisanOnboarding(request.source);
  else clearArtisanOnboardingIntent();

  const sourceLabel = request.source === "google"
    ? "Your Google account is connected."
    : request.source === "email"
      ? "Your email is verified and your account is connected."
      : "Your FixAm 9ja account is connected.";
  artisanOnboardingWelcome.textContent = isComplete
    ? `Your artisan profile is live, ${firstName}`
    : `Welcome, ${firstName} — let’s finish your artisan profile`;
  artisanOnboardingSummary.textContent = isComplete
    ? "Customers can now find and contact you. Use this workspace to manage quote leads, availability, photographs, and membership."
    : `${sourceLabel} Continue from the highlighted step below; you will not need to repeat completed steps.`;
  artisanOnboardingProgress.textContent = isComplete ? "Live" : `${completedCount} of ${state.complete.length} complete`;

  const steps = [
    ["Account connected", "Your secure FixAm 9ja sign-in is ready."],
    ["Application details", "Tell customers about your trade, location, and experience."],
    ["NIN face match", "Confirm that your selfie matches your NIN identity photograph."],
    ["Public profile photograph", "Choose the clear photograph customers will see."],
    ["Membership and payment", "Activate your listing with your preferred payment method."],
  ];
  artisanOnboardingChecklist.innerHTML = steps.map(([title, description], index) => {
    const status = state.complete[index] ? "complete" : index === state.currentIndex ? "current" : "upcoming";
    const stateLabel = status === "complete" ? "Done" : status === "current" ? "Next" : "Later";
    return `<li class="is-${status}">
      <span class="onboarding-step-icon" aria-hidden="true">${status === "complete" ? "✓" : index + 1}</span>
      <span class="onboarding-step-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span>
      <span class="onboarding-step-state">${stateLabel}</span>
    </li>`;
  }).join("");

  const action = artisanOnboardingAction(state);
  artisanOnboardingContinue.textContent = action.label;
  artisanOnboardingContinue.href = action.url;
  artisanOnboardingHint.textContent = request.source === "verification" && state.identity === "pending"
    ? "FixAm 9ja is confirming the completed QoreID result automatically. Keep this page open; you do not need to repeat the check."
    : action.hint;
  scheduleVerificationStatusRefresh(state, request);

  if (request.arrivedNow && !onboardingArrivalHandled) {
    onboardingArrivalHandled = true;
    requestAnimationFrame(() => {
      artisanOnboardingGuide.scrollIntoView({ behavior: "smooth", block: "start" });
      artisanOnboardingGuide.focus({ preventScroll: true });
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("onboarding");
      cleanUrl.searchParams.delete("source");
      cleanUrl.searchParams.delete("application");
      history.replaceState({}, "", cleanUrl);
    });
  }
}

function scheduleVerificationStatusRefresh(state, request) {
  if (verificationRefreshTimer) {
    window.clearTimeout(verificationRefreshTimer);
    verificationRefreshTimer = null;
  }
  if (request.source !== "verification" || state.identity !== "pending" || verificationRefreshCount >= 8) return;

  verificationRefreshTimer = window.setTimeout(() => {
    verificationRefreshTimer = null;
    verificationRefreshCount += 1;
    loadDashboard({
      message: `Confirming your QoreID result (${verificationRefreshCount}/8)...`,
      type: "",
    });
  }, 2500);
}

function artisanOnboardingAction(state) {
  if (!state.application && !state.artisan) {
    return {
      label: "Continue artisan registration",
      url: "index.html?resume=artisan#join",
      hint: "Next: add your business, location, plan, and identity details.",
    };
  }
  if (state.identity === "failed") {
    return {
      label: "Get verification help",
      url: "mailto:verification@fixam9ja.com?subject=FixAm%209ja%20identity%20verification%20help",
      hint: "Your existing application is saved. Support can help without creating a duplicate application.",
    };
  }
  if (state.identity !== "verified") {
    return {
      label: "Refresh verification status",
      url: "account.html?onboarding=artisan&source=resume",
      hint: "Your application is saved. You do not need to submit or pay for another identity check.",
    };
  }
  if (!state.artisan) {
    return {
      label: "Refresh profile status",
      url: "account.html?onboarding=artisan&source=resume",
      hint: "Your identity passed. FixAm 9ja is connecting your artisan profile.",
    };
  }
  if (!state.hasPhoto) {
    return {
      label: "Add public profile photograph",
      url: "#profilePhotoCard",
      hint: "Use a clear, front-facing photograph that customers can recognise.",
    };
  }
  if (!state.hasMembership) {
    const url = new URL("billing.html", window.location.href);
    if (state.application?.application_code) url.searchParams.set("application", state.application.application_code);
    url.searchParams.set("plan", state.application?.subscription_plan || state.application?.preferred_plan || state.artisan?.subscription_plan || "monthly");
    return {
      label: "Choose payment and activate membership",
      url: url.href,
      hint: "Paystack will show the payment methods available for your selected plan.",
    };
  }
  return {
    label: "View artisan marketplace",
    url: "index.html#marketplace",
    hint: "Your listing is active. New customer requests will appear under Quote leads below.",
  };
}

function renderProfilePhoto(artisan) {
  const imageUrl = safePublicImageUrl(artisan?.profile_image_url);
  profilePhotoPreview.classList.toggle("has-photo", Boolean(imageUrl));
  profilePhotoPreview.innerHTML = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="Your public artisan profile photograph" />`
    : "<span>Add your photograph</span>";
  profilePhotoUploadButton.disabled = !artisan;
  if (profilePhotoEditor) profilePhotoEditor.open = !imageUrl;
  if (profilePhotoEditorSummary) profilePhotoEditorSummary.textContent = imageUrl ? "Change photograph" : "Add photograph";
  if (profilePhotoDescription) {
    profilePhotoDescription.textContent = imageUrl
      ? "This is the photograph customers see on your live artisan profile."
      : "Add a clear, front-facing photograph that customers can recognise.";
  }
  document.querySelector("#profilePhotoCard")?.classList.toggle("has-saved-photo", Boolean(imageUrl));
}

function renderArtisanProfile(items, applications = []) {
  artisanProfile.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="connected-profile">
              <strong>${escapeHtml(item.business_name)}</strong>
              <small>${escapeHtml(item.category)} in ${escapeHtml([item.town, item.lga || item.area].filter(Boolean).join(", "))}, ${escapeHtml(item.state)}</small>
              <div class="profile-status-list">
                <span>${String(item.profile_status || "pending").toLowerCase() === "active" ? "Live in marketplace" : escapeHtml(item.profile_status || "Profile pending")}</span>
                <span>NIN ${escapeHtml(item.identity_verification_status || "pending")}</span>
                <span>Membership ${escapeHtml(item.subscription_status || "pending")}</span>
              </div>
              <small>${escapeHtml(item.availability || "Taking scheduled jobs")} - ${item.service_radius || 10} mile radius</small>
              <a href="billing.html">Manage subscription & payments</a>
            </article>
          `,
        )
        .join("")
    : `<article><span>${applications.length ? "Your application is linked to this account. Your artisan profile will appear after verification is confirmed." : "No artisan profile linked yet. Start an application above, or claim an existing listed profile."}</span></article>`;

  claimProfileButton.hidden = items.length > 0 || applications.length > 0;
  if (artisanProfileEditor) artisanProfileEditor.hidden = !items.length;
}

function fillArtisanProfileForm() {
  if (!ownedArtisan) {
    artisanProfileForm.reset();
    return;
  }

  document.querySelector("#artisanBusinessName").value = ownedArtisan.business_name || "";
  document.querySelector("#artisanCategory").value = ownedArtisan.category || "";
  const lgaSelect = document.querySelector("#artisanArea");
  const state = locationDirectory.states.find((item) => item.name === ownedArtisan.state);
  const storedLga = ownedArtisan.lga || ownedArtisan.area || "";
  const currentLga = locationDirectory.normalizeLga?.(ownedArtisan.state, storedLga) || storedLga;
  lgaSelect.innerHTML = "";
  (state?.lgas || [currentLga]).filter(Boolean).forEach((lga) => lgaSelect.add(new Option(lga, lga)));
  lgaSelect.value = currentLga;
  document.querySelector("#artisanTown").value = ownedArtisan.town || "";
  document.querySelector("#artisanAvailability").value = ownedArtisan.availability || "Taking scheduled jobs";
  document.querySelector("#artisanServiceRadius").value = ownedArtisan.service_radius || 10;
  document.querySelector("#artisanBio").value = ownedArtisan.bio || "";
}

function applyAccountRoleView() {
  const role = currentProfile?.role === "artisan" ? "artisan" : "customer";
  document.body.dataset.accountRole = role;
  if (subscriptionLink) subscriptionLink.hidden = role !== "artisan";
  document.querySelectorAll("[data-account-view]").forEach((section) => {
    section.hidden = section.dataset.accountView !== role;
  });
  document.querySelector("#dashboardTitle").textContent = `${role === "artisan" ? "Artisan workspace" : "Customer workspace"} — ${
    currentProfile?.full_name || "FixAm user"
  }`;
}

function isMissingLocationColumn(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("column 'lga'") || message.includes("column 'town'") || message.includes("schema cache");
}

function renderMedia(items) {
  mediaList.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article>
              <a href="${escapeHtml(item.public_url)}" target="_blank" rel="noreferrer">${escapeHtml(item.file_name)}</a>
              <small>${escapeHtml(item.entity_type)}</small>
            </article>
          `,
        )
        .join("")
    : `<article><span>No media uploaded from this account yet.</span></article>`;
}

function renderNotifications(items) {
  const unread = items.filter((item) => !item.read_at).length;
  notificationBadge.textContent = String(unread);
  notificationBadge.classList.toggle("is-empty", unread === 0);
  notificationList.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="${item.read_at ? "" : "unread-notification"}">
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.message)}</small>
              <small>${new Date(item.created_at).toLocaleString("en-NG")}</small>
              ${item.action_url ? `<a href="${escapeHtml(item.action_url)}">View update</a>` : ""}
              ${item.read_at ? "" : `<button class="secondary-action" type="button" data-read-notification="${escapeHtml(item.id)}">Mark as read</button>`}
            </article>`,
        )
        .join("")
    : `<article><span>No notifications yet.</span></article>`;
}

function fillNotificationPreferences(preferences) {
  document.querySelector("#notifyInApp").checked = preferences?.in_app_enabled !== false;
  document.querySelector("#notifyEmail").checked = preferences?.email_enabled !== false;
  document.querySelector("#notifyPush").checked = preferences?.push_enabled === true;
}

async function saveNotificationPreferences() {
  if (!currentUser) return;
  const payload = {
    user_id: currentUser.id,
    in_app_enabled: document.querySelector("#notifyInApp").checked,
    email_enabled: document.querySelector("#notifyEmail").checked,
    push_enabled: document.querySelector("#notifyPush").checked,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseClient.from("notification_preferences").upsert(payload);
  setNote(dashboardNote, error ? error.message : "Notification preferences saved.", error ? "error" : "success");
}

async function markNotificationRead(event) {
  const button = event.target.closest("[data-read-notification]");
  if (!button || !currentUser) return;
  const { error } = await supabaseClient
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", button.dataset.readNotification)
    .eq("user_id", currentUser.id);
  if (error) setNote(dashboardNote, error.message, "error");
  else await loadDashboard({ message: "Notification marked as read.", type: "success" });
}

async function deleteCurrentAccount() {
  if (!currentUser) return;
  const confirmation = document.querySelector("#deleteAccountConfirmation").value.trim();
  const acknowledged = document.querySelector("#deleteAccountAcknowledgement").checked;
  if (confirmation !== "DELETE" || !acknowledged) {
    setNote(deleteAccountNote, "Type DELETE and confirm that you understand the deletion is permanent.", "error");
    return;
  }

  const button = document.querySelector("#confirmDeleteAccount");
  button.disabled = true;
  setNote(deleteAccountNote, "Deleting and anonymising your account data...", "");
  const { error } = await supabaseClient.functions.invoke("delete-account", { body: { confirmation: "DELETE" } });
  button.disabled = false;
  if (error) {
    setNote(deleteAccountNote, `${error.message}. If this continues, email privacy@fixam9ja.com from your account address.`, "error");
    return;
  }

  await supabaseClient.auth.signOut({ scope: "local" });
  window.location.assign("account-deletion.html?deleted=1");
}

function setSignedOut() {
  if (verificationRefreshTimer) {
    window.clearTimeout(verificationRefreshTimer);
    verificationRefreshTimer = null;
  }
  authPanel.hidden = false;
  dashboardPanel.hidden = true;
  signOutButton.hidden = true;
  document.body.classList.remove("is-signed-in");
  sessionEmail.textContent = "Signed out";
  if (subscriptionLink) subscriptionLink.hidden = true;
  if (adminPortalLink) adminPortalLink.hidden = true;
  currentUser = null;
  currentProfile = null;
  ownedArtisan = null;
  if (artisanOnboardingGuide) artisanOnboardingGuide.hidden = true;
  renderProfilePhoto(null);
}

function setNote(element, message, type) {
  element.textContent = message;
  element.hidden = !message;
  element.classList.remove("success-note", "error-note");
  if (type === "success") element.classList.add("success-note");
  if (type === "error") element.classList.add("error-note");
}

function selectedFiles(selector) {
  const input = document.querySelector(selector);
  return input ? [...input.files].slice(0, 6) : [];
}

async function uploadMediaFiles({ files, folder, entityType, entityId, role }) {
  if (!supabaseClient || !files.length) return { count: 0, uploads: [] };

  let count = 0;
  const uploads = [];
  for (const file of files) {
    if (!isAllowedMedia(file)) {
      return { count, error: `${file.name} is too large or not a supported image/video type.` };
    }

    const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from("fixam-media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) return { count, error: uploadError.message };

    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("fixam-media").getPublicUrl(path);

    const { error: metadataError } = await supabaseClient.from("media_uploads").insert({
      bucket: "fixam-media",
      storage_path: path,
      public_url: publicUrl,
      entity_type: entityType,
      entity_id: entityId,
      uploaded_by_role: role,
      uploaded_by_user_id: currentUser.id,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      visibility: "public",
    });

    if (metadataError) return { count, error: metadataError.message };
    count += 1;
    uploads.push({ publicUrl, path });
  }

  return { count, uploads };
}

function isAllowedMedia(file) {
  const validType = file.type.startsWith("image/") || file.type.startsWith("video/");
  return validType && file.size <= 50 * 1024 * 1024;
}

function safeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function phoneKey(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234") && digits.length >= 13) return digits.slice(-10);
  if (digits.startsWith("0") && digits.length >= 11) return digits.slice(-10);
  return digits.slice(-10);
}

function accountRedirectUrl(role = "customer", source = "account") {
  const url = new URL(productionAccountUrl);
  url.searchParams.set("role", role === "artisan" ? "artisan" : "customer");
  url.searchParams.set("source", source);
  if (role === "artisan") {
    url.searchParams.set("onboarding", "artisan");
  }
  return url.href;
}

function safePublicImageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "https:" ? url.href : "";
  } catch (_error) {
    return "";
  }
}

function adminDashboardUrl() {
  if (window.location.hostname === "www.fixam9ja.com" || window.location.hostname === "fixam9ja.com") {
    return `${window.location.origin}/admin`;
  }

  return new URL("admin.html", window.location.href).href;
}

function formatNaira(value) {
  return `NGN ${Number(value || 0).toLocaleString("en-NG")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
