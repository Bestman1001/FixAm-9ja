const loginSettings = window.FIXAM_SUPABASE || {};
const loginClient =
  window.supabase && loginSettings.url && loginSettings.anonKey
    ? window.supabase.createClient(loginSettings.url, loginSettings.anonKey)
    : null;

const loginForm = document.querySelector("#adminLoginForm");
const loginEmail = document.querySelector("#adminLoginEmail");
const loginPassword = document.querySelector("#adminLoginPassword");
const loginNote = document.querySelector("#adminLoginNote");
const magicLinkButton = document.querySelector("#adminMagicLinkButton");

if (!loginClient) {
  setLoginNote("Supabase is not configured yet. Add the project URL and anon key first.", "error");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!loginClient) return;

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!password) {
    setLoginNote("Enter your password, or use the secure email link.", "error");
    return;
  }

  setLoginNote("Checking admin access...", "");
  const { error } = await loginClient.auth.signInWithPassword({ email, password });
  if (error) {
    setLoginNote(error.message, "error");
    return;
  }

  await continueIfAdmin();
});

magicLinkButton.addEventListener("click", async () => {
  if (!loginClient) return;

  const email = loginEmail.value.trim();
  if (!email) {
    setLoginNote("Enter your admin email first.", "error");
    return;
  }

  setLoginNote("Sending secure login link...", "");
  const { error } = await loginClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: routeUrl("/admin/login", "admin-login.html") },
  });

  if (error) {
    setLoginNote(error.message, "error");
    return;
  }

  setLoginNote("Login link sent. Open it on this device to continue.", "success");
});

if (loginClient) {
  loginClient.auth.onAuthStateChange((_event, session) => {
    if (session) continueIfAdmin();
  });

  loginClient.auth.getSession().then(({ data }) => {
    if (data.session) continueIfAdmin();
  });
}

async function continueIfAdmin() {
  const {
    data: { session },
  } = await loginClient.auth.getSession();

  if (!session) return;

  const { data, error } = await loginClient
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    await loginClient.auth.signOut();
    setLoginNote("This email is signed in, but it is not approved for FixAm admin access.", "error");
    return;
  }

  setLoginNote("Access confirmed. Opening the dashboard...", "success");
  window.location.assign(routeUrl("/admin", "admin.html"));
}

function routeUrl(cleanPath, htmlFile) {
  if (window.location.protocol === "file:" || window.location.pathname.endsWith(".html")) {
    return new URL(htmlFile, window.location.href).toString();
  }

  return `${window.location.origin}${cleanPath}`;
}

function setLoginNote(message, type) {
  loginNote.textContent = message;
  loginNote.classList.remove("success-note", "error-note");
  if (type === "success") loginNote.classList.add("success-note");
  if (type === "error") loginNote.classList.add("error-note");
}
