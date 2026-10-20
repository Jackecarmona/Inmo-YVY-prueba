// Capa de datos: Supabase (Postgres) si está configurado, si no localStorage (demo).
window.YVYDB = (() => {
  const cfg = window.YVY_CONFIG || {};
  const KEY = "yvy_leads";
  const SESSION = "yvy_admin_demo";
  let sb = null;

  if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
  }
  function writeLocal(rows) {
    try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch (e) { /* almacenamiento bloqueado */ }
  }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  return {
    mode: sb ? "supabase" : "demo",

    async insertLead(lead) {
      const row = { id: uid(), created_at: new Date().toISOString(), estado: "nuevo", notas: "", ...lead };
      if (sb) {
        // La política RLS solo permite INSERT al público: no se pide el registro de vuelta.
        const { error } = await sb.from("leads").insert(row);
        if (error) throw error;
        return row;
      }
      const rows = readLocal();
      rows.unshift(row);
      writeLocal(rows);
      return row;
    },

    async listLeads() {
      if (sb) {
        const { data, error } = await sb.from("leads").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      }
      return readLocal();
    },

    async updateLead(id, patch) {
      if (sb) {
        const { error } = await sb.from("leads").update(patch).eq("id", id);
        if (error) throw error;
        return;
      }
      writeLocal(readLocal().map(r => (r.id === id ? { ...r, ...patch } : r)));
    },

    async deleteLead(id) {
      if (sb) {
        const { error } = await sb.from("leads").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      writeLocal(readLocal().filter(r => r.id !== id));
    },

    async signIn(email, password) {
      if (sb) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Email o contraseña incorrectos.");
        return true;
      }
      if (password !== cfg.demoAdminPass) throw new Error("Contraseña incorrecta.");
      try { sessionStorage.setItem(SESSION, "1"); } catch (e) { /* sin almacenamiento */ }
      this._demoSession = true;
      return true;
    },

    async hasSession() {
      if (sb) {
        const { data } = await sb.auth.getSession();
        return !!(data && data.session);
      }
      try { return sessionStorage.getItem(SESSION) === "1" || !!this._demoSession; } catch (e) { return !!this._demoSession; }
    },

    async signOut() {
      if (sb) { await sb.auth.signOut(); return; }
      this._demoSession = false;
      try { sessionStorage.removeItem(SESSION); } catch (e) { /* sin almacenamiento */ }
    }
  };
})();
