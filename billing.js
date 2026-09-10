(() => {
  const config = window.FIXAM_SUPABASE || {};
  const client = window.supabase && config.url && config.anonKey
    ? window.supabase.createClient(config.url, config.anonKey) : null;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  let subscription = null;
  let busy = false;
  const money = (kobo) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(kobo / 100);
  const date = (value) => new Date(value).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
  function note(message, error = false) {
    $('billingNote').textContent = message;
    $('billingNote').className = `form-note ${error ? 'error-note' : 'success-note'}`;
  }
  async function api(body) {
    if (!client) throw new Error('Billing is unavailable. Please contact payments@fixam9ja.com.');
    const { data, error } = await client.functions.invoke('paystack-billing', { body });
    if (error) {
      let message = data?.error;
      if (!message && error.context?.json) {
        try { message = (await error.context.json()).error; } catch { /* Fall back to a useful retry message. */ }
      }
      throw new Error(message || 'Billing could not be reached. Please retry.');
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    document.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    try { await action(); } catch (error) { note(error.message, true); }
    finally { busy = false; document.querySelectorAll('button').forEach((button) => { button.disabled = false; }); }
  }
  function redirect(value, manage = false) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      (manage ? url.hostname !== 'paystack.com' || !url.pathname.startsWith('/manage/subscriptions/') : url.hostname !== 'checkout.paystack.com')) {
      throw new Error('The payment destination could not be validated.');
    }
    location.assign(url.href);
  }
  async function refresh() {
    const result = await api({ action: 'status' });
    subscription = result.subscription;
    $('billingPanel').hidden = false;
    $('billingSummary').textContent = subscription
      ? `${subscription.plan === 'biannual' ? '6 months' : subscription.plan === 'annual' ? 'Yearly' : 'Monthly'} membership · ${subscription.status.replaceAll('_', ' ')}. ${subscription.paid_through ? `${subscription.active ? 'Paid access until' : 'Paid access ended'} ${date(subscription.paid_through)}.` : 'Payment has not been confirmed yet.'}`
      : 'You do not have a paid subscription yet.';
    $('manageBilling').hidden = !subscription?.can_manage;
    $('cancelBilling').hidden = !subscription?.can_manage || ['non-renewing', 'cancelled', 'complete', 'completed'].includes(subscription.status);
    $('verifyPayment').hidden = !subscription || Boolean(subscription.paid_through);
    $('billingForm').hidden = Boolean(subscription && (subscription.active || subscription.can_manage && !['non-renewing', 'cancelled', 'complete', 'completed'].includes(subscription.status)));
    if (subscription && !subscription.can_manage) $('billingPlan').value = subscription.plan;
    $('billingPlan').disabled = Boolean(subscription && !subscription.can_manage);
    $('paymentHistory').replaceChildren();
    for (const payment of result.payments) {
      const item = document.createElement('article');
      const heading = document.createElement('strong');
      heading.textContent = `${money(payment.amount_kobo)} · ${date(payment.paid_at)}`;
      const reference = document.createElement('small');
      reference.textContent = `Reference: ${payment.reference}`;
      item.append(heading, reference);
      $('paymentHistory').append(item);
    }
    if (!result.payments.length) $('paymentHistory').textContent = 'No confirmed payments yet.';
    updateConsent();
  }
  function updateConsent() {
    const label = $('billingPlan').selectedOptions[0].textContent;
    $('billingConsentText').textContent = `I agree to ${label.toLowerCase()} and automatic renewal until I cancel.`;
  }
  async function verify(reference) {
    note('Checking your payment securely…');
    const result = await api({ action: 'verify', reference });
    await refresh();
    if (result.status === 'success') {
      const url = new URL(location.href);
      url.searchParams.delete('reference'); url.searchParams.delete('trxref');
      history.replaceState({}, '', url);
      note('Payment confirmed. Your paid membership is active. Your listing also requires identity verification and marketplace approval.');
    } else note(`Payment is ${result.status}. If you were charged, use “Check payment” again shortly; do not pay again.`, true);
  }
  $('billingPlan').addEventListener('change', () => { $('billingConsent').checked = false; updateConsent(); });
  $('billingForm').addEventListener('submit', (event) => {
    event.preventDefault();
    run(async () => {
      note('Preparing secure Paystack checkout…');
      const data = await api({ action: 'checkout', plan: $('billingPlan').value,
        application_code: params.get('application'), consent: $('billingConsent').checked });
      redirect(data.url);
    });
  });
  $('refreshBilling').addEventListener('click', () => run(async () => { await refresh(); note('Subscription status refreshed.'); }));
  $('verifyPayment').addEventListener('click', () => run(() => verify(subscription.reference)));
  $('manageBilling').addEventListener('click', () => run(async () => { redirect((await api({ action: 'manage' })).url, true); }));
  $('cancelBilling').addEventListener('click', () => $('cancelDialog').showModal());
  $('keepSubscription').addEventListener('click', () => $('cancelDialog').close());
  $('confirmCancellation').addEventListener('click', () => run(async () => {
    $('cancelDialog').close();
    await api({ action: 'cancel', confirmation: 'CANCEL' });
    await refresh(); note('Automatic renewal cancelled. Your current paid term remains available.');
  }));
  run(async () => {
    if (!client) throw new Error('Billing is unavailable. Please contact payments@fixam9ja.com.');
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) { $('billingSignIn').hidden = false; note('Sign in to your artisan account, then return here to manage billing.'); return; }
    if (['monthly', 'biannual', 'annual'].includes(params.get('plan'))) $('billingPlan').value = params.get('plan');
    const reference = params.get('reference') || params.get('trxref');
    if (reference) await verify(reference);
    else { await refresh(); note('Your billing details are up to date.'); }
  });
})();
