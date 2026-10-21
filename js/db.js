// Capa de datos: Supabase (Postgres) si está configurado, si no localStorage (demo).
// Dos tipos de cuenta: clientes (área de clientes) y equipo (back office).
// En Supabase, el equipo se distingue porque su usuario figura en la tabla "equipo".
window.YVYDB = (() => {
  const cfg = window.YVY_CONFIG || {};
  const KEY = "yvy_leads";
  const SESSION = "yvy_admin_demo";
  const CLIENTES = "yvy_clientes_demo";
  const CLIENTE_SESION = "yvy_cliente_demo";
  const FAVS = "yvy_favoritos_";
  const PROPS = "yvy_propiedades_demo";
  const BUCKET = "propiedades-fotos";
  let sb = null;

  if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento bloqueado */ } };
  const readLocal = () => leer(KEY, []);
  const writeLocal = rows => guardar(KEY, rows);
  const norm = e => String(e || "").trim().toLowerCase();
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  // Solo para el modo demo: evita guardar la contraseña en texto plano en el navegador
  async function huella(txt) {
    if (!(window.crypto && crypto.subtle)) return "p:" + txt.length + ":" + btoa(unescape(encodeURIComponent(txt))).slice(-6);
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("yvy|" + txt));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  const aDataUrl = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
  // Equipo = rol "admin" en profiles (o miembro de la tabla equipo); lo decide la base de datos
  async function esEquipo() {
    const { data, error } = await sb.rpc("es_equipo");
    return !error && data === true;
  }

  return {
    mode: sb ? "supabase" : "demo",

    /* ---------- Solicitudes ---------- */
    async insertLead(lead) {
      const row = { id: uid(), created_at: new Date().toISOString(), estado: "nuevo", notas: "", ...lead };
      if (row.email) row.email = norm(row.email);
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

    /* ---------- Propiedades cargadas desde el Back Office ---------- */
    // Mismas columnas que la tabla "propiedades" de Supabase. El público solo ve las publicadas
    // (función propiedades_publicadas); el equipo ve también los borradores.
    async propiedades(todas = false) {
      if (sb) {
        const { data, error } = todas
          ? await sb.from("propiedades").select("*").order("created_at", { ascending: false })
          : await sb.rpc("propiedades_publicadas");
        if (error) throw error;
        return data || [];
      }
      const rows = leer(PROPS, []);
      return todas ? rows : rows.filter(p => p.estado === "publicada");
    },

    // En Supabase las fotos son rutas del bucket; en modo demo ya vienen como data: URL
    urlFoto(ruta) {
      if (/^(data:|https?:)/.test(ruta) || !sb) return ruta;
      return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
    },

    // fotos: Blobs JPEG ya reducidos. Devuelve cuántas fotos no se pudieron subir.
    async crearPropiedad(datos, fotos = []) {
      if (sb) {
        let r = await sb.from("propiedades").insert(datos).select("id").single();
        // Si la tabla todavía no tiene la columna "descripcion", se guarda sin ella
        if (r.error && r.error.code === "PGRST204" && "descripcion" in datos) {
          const { descripcion, ...resto } = datos;
          r = await sb.from("propiedades").insert(resto).select("id").single();
        }
        if (r.error) throw new Error(r.error.code === "23505" ? "Ya existe una propiedad con ese código." : "No se pudo guardar. Revisá los datos e intentá de nuevo.");
        const rutas = [];
        let fallos = 0;
        for (let i = 0; i < fotos.length; i++) {
          const ruta = r.data.id + "/" + Date.now() + "-" + i + ".jpg";
          const up = await sb.storage.from(BUCKET).upload(ruta, fotos[i], { contentType: "image/jpeg", upsert: false });
          if (up.error) fallos++; else rutas.push(ruta);
        }
        if (rutas.length) {
          const u = await sb.from("propiedades").update({ fotos: rutas }).eq("id", r.data.id);
          if (u.error) fallos += rutas.length;
        }
        return { id: r.data.id, fallos };
      }
      const rows = leer(PROPS, []);
      if (datos.codigo && rows.some(p => norm(p.codigo) === norm(datos.codigo))) throw new Error("Ya existe una propiedad con ese código.");
      const row = { id: uid(), created_at: new Date().toISOString(), ...datos, fotos: await Promise.all(fotos.map(aDataUrl)) };
      try { localStorage.setItem(PROPS, JSON.stringify([row, ...rows])); }
      catch (e) { throw new Error("En modo demo las fotos se guardan en el navegador y ya no hay espacio. Probá con menos fotos."); }
      return { id: row.id, fallos: 0 };
    },

    async actualizarPropiedad(id, patch) {
      if (sb) {
        const { error } = await sb.from("propiedades").update(patch).eq("id", id);
        if (error) throw error;
        return;
      }
      guardar(PROPS, leer(PROPS, []).map(p => (p.id === id ? { ...p, ...patch } : p)));
    },

    async borrarPropiedad(p) {
      if (sb) {
        const { error } = await sb.from("propiedades").delete().eq("id", p.id);
        if (error) throw error;
        if (p.fotos && p.fotos.length) await sb.storage.from(BUCKET).remove(p.fotos);
        return;
      }
      guardar(PROPS, leer(PROPS, []).filter(x => x.id !== p.id));
    },

    /* ---------- Usuarios y roles (solo con Supabase) ---------- */
    async usuarios() {
      if (!sb) return null;
      const { data, error } = await sb.from("profiles").select("id,nombre,email,rol").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: s } = await sb.auth.getSession();
      return (data || []).map(u => ({ ...u, yo: !!(s && s.session && s.session.user.id === u.id) }));
    },

    async cambiarRol(id, rol) {
      const { error } = await sb.from("profiles").update({ rol }).eq("id", id);
      if (error) throw new Error(/propio/.test(error.message) ? "No podés cambiar tu propio rol." : "No se pudo cambiar el rol.");
    },

    /* ---------- Equipo (back office) ---------- */
    async hasSession() {
      if (sb) {
        const { data } = await sb.auth.getSession();
        return !!(data && data.session) && (await esEquipo());
      }
      try { return sessionStorage.getItem(SESSION) === "1" || !!this._demoSession; } catch (e) { return !!this._demoSession; }
    },

    async signOut() {
      if (sb) { await sb.auth.signOut(); return; }
      this._demoSession = false;
      try { sessionStorage.removeItem(SESSION); } catch (e) { /* sin almacenamiento */ }
    },

    /* ---------- Acceso único ---------- */
    // Un solo formulario para todos: devuelve "equipo" o "cliente" según el email.
    async entrar(email, password) {
      email = norm(email);
      if (sb) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(/confirm/i.test(error.message) ? "Confirmá tu email con el enlace que te enviamos y volvé a intentar." : "Email o contraseña incorrectos.");
        return (await esEquipo()) ? "equipo" : "cliente";
      }
      if ((cfg.demoEquipo || []).map(norm).includes(email)) {
        if (password !== cfg.demoAdminPass) throw new Error("Email o contraseña incorrectos.");
        try { localStorage.removeItem(CLIENTE_SESION); sessionStorage.setItem(SESSION, "1"); } catch (e) { /* sin almacenamiento */ }
        this._demoSession = true;
        return "equipo";
      }
      await this.clienteEntrar(email, password);
      try { sessionStorage.removeItem(SESSION); } catch (e) { /* sin almacenamiento */ }
      return "cliente";
    },

    // "equipo", "cliente" o null si no hay sesión
    async rolActual() {
      if (sb) {
        const { data } = await sb.auth.getSession();
        if (!(data && data.session)) return null;
        return (await esEquipo()) ? "equipo" : "cliente";
      }
      if (await this.hasSession()) return "equipo";
      return leer(CLIENTE_SESION, null) ? "cliente" : null;
    },

    /* ---------- Clientes (área de clientes) ---------- */
    async clienteRegistrar(nombre, email, password) {
      email = norm(email);
      if (sb) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nombre } } });
        if (error) throw new Error(error.message.includes("registered") ? "Ya existe una cuenta con ese email. Ingresá con tu contraseña." : error.message);
        return { nombre, email, confirmar: !data.session };
      }
      if ((cfg.demoEquipo || []).map(norm).includes(email)) throw new Error("Ese email pertenece al equipo. Usá la pestaña Ingresar.");
      const cuentas = leer(CLIENTES, {});
      if (cuentas[email]) throw new Error("Ya existe una cuenta con ese email. Ingresá con tu contraseña.");
      cuentas[email] = { nombre, clave: await huella(password), creado: new Date().toISOString() };
      guardar(CLIENTES, cuentas);
      guardar(CLIENTE_SESION, { email, nombre });
      return { nombre, email, confirmar: false };
    },

    async clienteEntrar(email, password) {
      email = norm(email);
      if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(/confirm/i.test(error.message) ? "Confirmá tu email con el enlace que te enviamos y volvé a intentar." : "Email o contraseña incorrectos.");
        return { email, nombre: data.user.user_metadata?.nombre || "" };
      }
      const c = leer(CLIENTES, {})[email];
      if (!c || c.clave !== (await huella(password))) throw new Error("Email o contraseña incorrectos.");
      guardar(CLIENTE_SESION, { email, nombre: c.nombre });
      return { email, nombre: c.nombre };
    },

    async clienteActual() {
      if (sb) {
        const { data } = await sb.auth.getSession();
        const u = data && data.session && data.session.user;
        return u ? { email: norm(u.email), nombre: u.user_metadata?.nombre || "", id: u.id } : null;
      }
      return leer(CLIENTE_SESION, null);
    },

    async clienteSalir() {
      if (sb) { await sb.auth.signOut(); return; }
      try { localStorage.removeItem(CLIENTE_SESION); } catch (e) { /* sin almacenamiento */ }
    },

    // Con Supabase, la política RLS solo devuelve las solicitudes con el email del cliente
    async misSolicitudes(email) {
      email = norm(email);
      if (sb) {
        const { data, error } = await sb.from("leads").select("*").eq("email", email).order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      }
      return readLocal().filter(r => norm(r.email) === email);
    },

    async favoritos() {
      const c = await this.clienteActual();
      if (!c) return [];
      if (sb) {
        const { data } = await sb.from("favoritos").select("casa_id");
        return (data || []).map(r => r.casa_id);
      }
      return leer(FAVS + c.email, []);
    },

    async alternarFavorito(casaId) {
      const c = await this.clienteActual();
      if (!c) throw new Error("sin-sesion");
      const actuales = await this.favoritos();
      const quitar = actuales.includes(casaId);
      if (sb) {
        const q = quitar
          ? sb.from("favoritos").delete().eq("casa_id", casaId)
          : sb.from("favoritos").insert({ user_id: c.id, casa_id: casaId });
        const { error } = await q;
        if (error) throw error;
      } else {
        guardar(FAVS + c.email, quitar ? actuales.filter(x => x !== casaId) : [...actuales, casaId]);
      }
      return !quitar;
    }
  };
})();
