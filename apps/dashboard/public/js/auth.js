/**
 * Wild Script shared authentication utilities
 */
let supabaseClientPromise = null;

async function getSupabaseClient() {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('YOUR_SUPABASE') || key.includes('YOUR_SUPABASE')) {
    return null;
  }
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm').then(
      ({ createClient }) => createClient(url, key),
    );
  }
  return supabaseClientPromise;
}

export const Auth = {
  TOKEN_KEY: 'sb_access_token',
  REFRESH_KEY: 'sb_refresh_token',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token, refreshToken) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    else localStorage.removeItem(this.TOKEN_KEY);
    if (refreshToken) localStorage.setItem(this.REFRESH_KEY, refreshToken);
  },

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  },

  captureOAuthToken() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const raw = hash.length > 1 ? hash : search;
    if (!raw || raw.length <= 1) return false;

    const params = new URLSearchParams(raw.replace(/^#/, '').replace(/^\?/, ''));
    const accessToken = params.get('access_token');
    if (accessToken) {
      this.setToken(accessToken, params.get('refresh_token') || undefined);
      history.replaceState(null, '', window.location.pathname);
      return true;
    }
    return false;
  },

  getAuthHeaders(isJson = true) {
    const headers = {};
    const token = this.getToken();
    if (isJson) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  /** Validate JWT with Supabase (primary — works even if /api/me is unavailable) */
  async validateTokenWithSupabase(token) {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return null;
    }
    return data.user;
  },

  /** Fetch profile from API (optional enrichment) */
  async fetchProfileFromApi(token, apiBase) {
    try {
      const base = apiBase || window.location.origin;
      const resp = await fetch(`${base}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok || !contentType.includes('application/json')) {
        return null;
      }
      return await resp.json();
    } catch {
      return null;
    }
  },

  async validateSession(apiBase = '') {
    const token = this.getToken();
    if (!token) return null;

    const supabaseUser = await this.validateTokenWithSupabase(token);
    const apiSession = await this.fetchProfileFromApi(token, apiBase);

    if (apiSession?.user) {
      return apiSession;
    }

    if (supabaseUser) {
      return { user: supabaseUser, profile: null };
    }

    this.clearToken();
    return null;
  },

  async requireAuth(redirectTo = '/login.html') {
    this.captureOAuthToken();
    const me = await this.validateSession();
    if (!me) {
      window.location.replace(redirectTo);
      return null;
    }
    return me;
  },

  signOut() {
    this.clearToken();
    window.location.replace('/login.html');
  },

  renderNav(container, me, options = {}) {
    if (!container) return;
    const { showDashboard = true } = options;

    if (!me) {
      container.innerHTML = `
        <a href="/login.html" class="ws-auth-link">Sign In</a>
        <a href="/register.html" class="ws-btn ws-btn-primary ws-btn-sm" style="margin-top:0;text-decoration:none">Register</a>
      `;
      return;
    }

    const email = me.user?.email || 'Account';
    container.innerHTML = `
      ${showDashboard ? `<a href="/dashboard.html" class="ws-auth-link">Dashboard</a>` : ''}
      <a href="/dashboard.html#account" class="ws-auth-link" id="navAccountLink">Account</a>
      <span style="color:var(--ws-text-muted);font-size:0.85rem;max-width:160px;overflow:hidden;text-overflow:ellipsis" title="${email}">${email}</span>
      <button type="button" class="ws-auth-logout" id="signOutBtn">Logout</button>
    `;
    container.querySelector('#signOutBtn')?.addEventListener('click', () => this.signOut());
    container.querySelector('#navAccountLink')?.addEventListener('click', (e) => {
      if (typeof window.switchTab === 'function') {
        e.preventDefault();
        window.switchTab('account');
      }
    });
  },
};

window.WildScriptAuth = Auth;
