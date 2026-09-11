const resetNote = document.querySelector("#resetNote");
const requestForm = document.querySelector("#requestForm");
const passwordForm = document.querySelector("#passwordForm");
const resetSettings = window.FIXAM_SUPABASE || {};
const resetClient = window.supabase && resetSettings.url && resetSettings.anonKey
  ? window.supabase.createClient(resetSettings.url, resetSettings.anonKey) : null;

function showResetSession(session) {
  passwordForm.hidden = !session;
  requestForm.hidden = !!session;
  document.querySelector("#resetIdentity").textContent = session ? `Account: ${session.user.email}` : "";
  resetNote.textContent = session ? "Choose a new password of at least 8 characters." : "Enter your email to request a fresh reset link.";
}

if (resetClient) {
  resetClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") showResetSession(session);
  });
  resetClient.auth.getSession().then(({ data, error }) => {
    showResetSession(data?.session);
    if (error) resetNote.textContent = "This reset link could not be verified. Request a fresh link below.";
    history.replaceState(null, "", window.location.pathname);
  }).catch(() => {
    showResetSession(null);
    resetNote.textContent = "Unable to check your reset link. Please try again.";
  });
} else {
  resetNote.textContent = "Password recovery is unavailable. Please reload and try again.";
}

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!resetClient) return;
  const button = requestForm.querySelector("button");
  button.disabled = true;
  try {
    // The site root is already an allowed redirect; its recovery handler forwards the fragment.
    const { error } = await resetClient.auth.resetPasswordForEmail(document.querySelector("#resetEmail").value.trim(), {
      redirectTo: `${window.location.origin}/`,
    });
    resetNote.textContent = error ? error.message : "If this email has an account, a reset link has been sent. Open the newest email link.";
  } catch {
    resetNote.textContent = "Unable to send the reset link. Please try again.";
  } finally { button.disabled = false; }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#newPassword").value;
  if (password.length < 8 || password !== document.querySelector("#confirmPassword").value) {
    resetNote.textContent = "Use at least 8 characters and make sure both passwords match.";
    return;
  }
  const button = passwordForm.querySelector("button");
  button.disabled = true;
  try {
    const { error } = await resetClient.auth.updateUser({ password });
    if (error) { resetNote.textContent = error.message; return; }
    passwordForm.reset();
    passwordForm.hidden = true;
    resetNote.textContent = "Password updated. You can now return to sign in with your new password.";
    await resetClient.auth.signOut({ scope: "local" });
  } catch {
    resetNote.textContent = "Unable to update your password. Please try again.";
  } finally { button.disabled = false; }
});
