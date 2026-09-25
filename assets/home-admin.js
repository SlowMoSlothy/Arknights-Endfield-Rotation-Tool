// Navigation visibility only. Map access is enforced separately by Supabase RLS.
(() => {
  const card = document.getElementById('zzz-admin-card');
  const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
  if (!card || !client) return;
  let revision = 0;
  async function refresh() {
    const request = ++revision;
    card.hidden = true;
    try {
      const { data, error } = await client.auth.getUser();
      if (request !== revision || error || !data?.user) return;
      const result = await client.rpc('is_app_admin');
      if (request === revision && !result.error && result.data === true) card.hidden = false;
    } catch { /* Failed checks keep admin navigation hidden. */ }
  }
  client.auth.onAuthStateChange(() => {
    ++revision;
    card.hidden = true;
    // Run outside the auth callback to avoid waiting on its session lock.
    setTimeout(refresh, 0);
  });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  refresh();
})();
