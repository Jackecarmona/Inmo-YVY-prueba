// Capa de datos: Supabase (Postgres) si está configurado, si no localStorage (demo).
// Dos tipos de cuenta: clientes (área de clientes) y equipo (back office).
// En Supabase, el equipo es quien tiene rol "admin" en profiles (lo responde la función es_equipo()).
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

  // ¿Se llegó desde el enlace de "restablecer contraseña"? Se mira antes de que Supabase limpie la dirección
  const vinoDeRecuperacion = /type=recovery/.test(location.hash + location.search);
  // Bloqueo de la sesión solo dentro de esta pestaña. El de Supabase (navigator.locks) coordina todas las
  // pestañas y puede quedarse esperando para siempre si otra, en segundo plano, está renovando la sesión:
  // esa era la causa de que "Ingresar" se quedara pegado. Las llamadas de esta pestaña siguen en fila.
  const colas = {};
  // El rol se pregunta una vez por página: varias partes de la web lo piden al mismo tiempo
  let rolGuardado = null;
  const bloqueoLocal = async (nombre, _espera, fn) => {
    const anterior = colas[nombre] || Promise.resolve();
    let soltar;
    colas[nombre] = new Promise(r => { soltar = r; });
    await anterior.catch(() => {});
    try { return await fn(); } finally { soltar(); }
  };
  if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { lock: bloqueoLocal } });
    // Cualquier cambio de sesión invalida el rol guardado (sin llamar a Supabase dentro del aviso)
    sb.auth.onAuthStateChange(evento => { if (evento !== "INITIAL_SESSION" && evento !== "TOKEN_REFRESHED") rolGuardado = null; });
  }

  // Ninguna llamada de sesión puede dejar la página esperando para siempre
  const LIMITE_MS = cfg.limiteMs || 15000; // las pruebas lo acortan
  const conLimite = (promesa, ms = LIMITE_MS) => {
    let reloj;
    const limite = new Promise((_, no) => { reloj = setTimeout(() => no(new Error("El servidor está tardando en responder. Revisá tu conexión e intentá de nuevo.")), ms); });
    return Promise.race([promesa, limite]).finally(() => clearTimeout(reloj));
  };
  const sesion = async () => {
    const { data } = await conLimite(sb.auth.getSession());
    return (data && data.session) || null;
  };

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
  /* ---------- Ayudas para las propiedades del Back Office ---------- */
  // Sube las fotos a la vez (antes iban de a una) y devuelve las rutas guardadas
  async function subirFotos(id, fotos) {
    const res = await Promise.all(fotos.map((f, i) => {
      const ruta = id + "/" + Date.now() + "-" + i + ".jpg";
      return sb.storage.from(BUCKET).upload(ruta, f, { contentType: "image/jpeg", upsert: false })
        .then(up => (up.error ? null : ruta), () => null);
    }));
    const rutas = res.filter(Boolean);
    return { rutas, fallos: fotos.length - rutas.length };
  }
  const errorPropiedad = e => new Error(e && e.code === "23505"
    ? "Ya existe una propiedad con ese código."
    : "No se pudo guardar. Revisá los datos e intentá de nuevo.");
  const codigoRepetido = (rows, codigo, salvoId) => !!codigo && rows.some(x => x.id !== salvoId && norm(x.codigo) === norm(codigo));
  const guardarPropsDemo = rows => {
    try { localStorage.setItem(PROPS, JSON.stringify(rows)); }
    catch (e) { throw new Error("En modo demo las fotos se guardan en el navegador y ya no hay espacio. Probá con menos fotos."); }
  };

  // Mensajes de Supabase Auth traducidos a algo que el visitante entienda
  function errorAcceso(error, contexto) {
    const m = String((error && error.message) || ""), status = error && error.status;
    if (status === 429 || /rate limit|too many|security purposes/i.test(m))
      return new Error("Se enviaron demasiados emails en poco tiempo. Esperá unos minutos y probá de nuevo, o escribinos por WhatsApp y te ayudamos.");
    if (/not confirmed|confirm/i.test(m)) {
      const e = new Error("Todavía no confirmaste tu email. Buscá el enlace que te enviamos (revisá también el correo no deseado).");
      e.sinConfirmar = true;
      return e;
    }
    if (/already registered|already been registered|user already exists/i.test(m)) return new Error("Ya existe una cuenta con ese email. Ingresá con tu contraseña.");
    if (/signups? not allowed|signup is disabled/i.test(m)) return new Error("Por ahora no se pueden crear cuentas nuevas. Escribinos y te damos de alta.");
    if (/password/i.test(m) && /weak|short|least|characters/i.test(m)) return new Error("La contraseña es demasiado débil: usá al menos 8 caracteres, mezclando letras y números.");
    if (/invalid.*email|email.*invalid/i.test(m)) return new Error("Ese email no es válido. Revisalo y volvé a intentar.");
    if (/fetch|network|failed to fetch/i.test(m)) return new Error("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
    if (/different from the old|same password/i.test(m)) return new Error("La nueva contraseña tiene que ser distinta de la anterior.");
    if (contexto === "cambio" && /session|jwt|expired|token/i.test(m)) return new Error("El enlace venció o ya se usó. Pedí uno nuevo desde «¿Olvidaste tu contraseña?».");
    return new Error({
      entrar: "Email o contraseña incorrectos.",
      cambio: "No pudimos cambiar la contraseña. Pedí un enlace nuevo e intentá otra vez.",
      olvido: "No pudimos enviar el email. Intentá de nuevo en unos minutos."
    }[contexto] || "No pudimos completar el registro. Intentá de nuevo en unos minutos.");
  }
  // Adónde vuelve el visitante al tocar el enlace del email de confirmación
  const paginaAcceso = () => new URL((window.YVY_BASE || "") + "ingresar/index.html", document.baseURI).href;

  // Equipo = rol "admin" en profiles (o miembro de la tabla equipo); lo decide la base de datos
  async function esEquipo() {
    const { data, error } = await conLimite(sb.rpc("es_equipo"));
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
        if (r.error) throw errorPropiedad(r.error);
        const { rutas, fallos } = await subirFotos(r.data.id, fotos);
        let fallidas = fallos;
        if (rutas.length) {
          const u = await sb.from("propiedades").update({ fotos: rutas }).eq("id", r.data.id);
          if (u.error) fallidas += rutas.length;
        }
        return { id: r.data.id, fallos: fallidas };
      }
      const rows = leer(PROPS, []);
      if (codigoRepetido(rows, datos.codigo)) throw new Error("Ya existe una propiedad con ese código.");
      const row = { id: uid(), created_at: new Date().toISOString(), ...datos, fotos: await Promise.all(fotos.map(aDataUrl)) };
      guardarPropsDemo([row, ...rows]);
      return { id: row.id, fallos: 0 };
    },

    // Edita una propiedad: datos nuevos, fotos que se quitan (rutas actuales) y fotos nuevas (Blobs).
    // El orden final de las fotos es: las que quedan, en su orden, y después las nuevas.
    async editarPropiedad(p, datos, { quitar = [], nuevas = [] } = {}) {
      const quedan = (p.fotos || []).filter(f => !quitar.includes(f));
      if (sb) {
        const { rutas, fallos } = await subirFotos(p.id, nuevas);
        const cambios = { ...datos, fotos: [...quedan, ...rutas] };
        let r = await sb.from("propiedades").update(cambios).eq("id", p.id);
        if (r.error && r.error.code === "PGRST204" && "descripcion" in cambios) {
          const { descripcion, ...resto } = cambios;
          r = await sb.from("propiedades").update(resto).eq("id", p.id);
        }
        if (r.error) {
          if (rutas.length) await sb.storage.from(BUCKET).remove(rutas); // no dejar fotos huérfanas
          throw errorPropiedad(r.error);
        }
        // Las fotos quitadas se borran del almacenamiento recién cuando el cambio quedó guardado
        if (quitar.length) await sb.storage.from(BUCKET).remove(quitar);
        return { fallos };
      }
      const rows = leer(PROPS, []);
      if (codigoRepetido(rows, datos.codigo, p.id)) throw new Error("Ya existe una propiedad con ese código.");
      const agregadas = await Promise.all(nuevas.map(aDataUrl));
      guardarPropsDemo(rows.map(x => (x.id === p.id ? { ...x, ...datos, fotos: [...quedan, ...agregadas] } : x)));
      return { fallos: 0 };
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
      const s = await sesion();
      return (data || []).map(u => ({ ...u, yo: !!(s && s.user.id === u.id) }));
    },

    async cambiarRol(id, rol) {
      const { error } = await sb.from("profiles").update({ rol }).eq("id", id);
      if (error) throw new Error(/propio/.test(error.message) ? "No podés cambiar tu propio rol." : "No se pudo cambiar el rol.");
    },

    /* ---------- Equipo (back office) ---------- */
    async hasSession() {
      if (sb) return (await this.rolActual()) === "equipo";
      try { return sessionStorage.getItem(SESSION) === "1" || !!this._demoSession; } catch (e) { return !!this._demoSession; }
    },

    async signOut() {
      rolGuardado = null;
      if (sb) { await conLimite(sb.auth.signOut()).catch(() => {}); return; }
      this._demoSession = false;
      try { sessionStorage.removeItem(SESSION); } catch (e) { /* sin almacenamiento */ }
    },

    /* ---------- Acceso único ---------- */
    // Un solo formulario para todos: devuelve "equipo" o "cliente" según el email.
    async entrar(email, password) {
      email = norm(email);
      if (sb) {
        rolGuardado = null;
        const { error } = await conLimite(sb.auth.signInWithPassword({ email, password }));
        if (error) throw errorAcceso(error, "entrar");
        // El rol que se calcula aquí lo reutiliza la página de destino sin volver a preguntar
        const rol = esEquipo().then(e => (e ? "equipo" : "cliente"));
        rolGuardado = rol;
        rol.catch(() => { if (rolGuardado === rol) rolGuardado = null; }); // un fallo no queda guardado
        return rol;
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
    rolActual() {
      if (sb) {
        if (!rolGuardado) {
          const rol = (async () => ((await sesion()) ? ((await esEquipo()) ? "equipo" : "cliente") : null))();
          rolGuardado = rol;
          rol.catch(() => { if (rolGuardado === rol) rolGuardado = null; }); // si falló, la próxima vez se vuelve a preguntar
        }
        return rolGuardado;
      }
      return this._rolDemo();
    },
    async _rolDemo() {
      if (await this.hasSession()) return "equipo";
      return leer(CLIENTE_SESION, null) ? "cliente" : null;
    },

    /* ---------- Contraseña olvidada ---------- */
    // Envía el enlace para elegir una contraseña nueva. Por seguridad, Supabase no avisa si el email
    // no tiene cuenta: la respuesta es la misma en los dos casos.
    async pedirRestablecer(email) {
      if (!sb) throw new Error("En el modo demo no se envían emails: creá una cuenta nueva con otro email.");
      const destino = new URL((window.YVY_BASE || "") + "restablecer/index.html", document.baseURI).href;
      const { error } = await conLimite(sb.auth.resetPasswordForEmail(norm(email), { redirectTo: destino }));
      if (error) throw errorAcceso(error, "olvido");
    },

    // true si esta página se abrió desde el enlace del email y Supabase dio una sesión para cambiar la contraseña
    async enRecuperacion() {
      if (!sb) return false;
      return !!(await sesion()) && vinoDeRecuperacion;
    },

    async cambiarContrasena(password) {
      if (!sb) throw new Error("En el modo demo no se puede cambiar la contraseña.");
      const { error } = await conLimite(sb.auth.updateUser({ password }));
      if (error) throw errorAcceso(error, "cambio");
    },

    /* ---------- Clientes (área de clientes) ---------- */
    // Vuelve a enviar el email de confirmación (Supabase también limita cuántos se envían por hora)
    async reenviarConfirmacion(email) {
      if (!sb) return;
      const { error } = await conLimite(sb.auth.resend({ type: "signup", email: norm(email), options: { emailRedirectTo: paginaAcceso() } }));
      if (error) throw errorAcceso(error, "registro");
    },

    async clienteRegistrar(nombre, email, password) {
      email = norm(email);
      if (sb) {
        rolGuardado = null;
        const { data, error } = await conLimite(sb.auth.signUp({ email, password, options: { data: { nombre }, emailRedirectTo: paginaAcceso() } }));
        if (error) throw errorAcceso(error, "registro");
        // Email ya registrado y confirmado: Supabase no da error (para no revelar qué emails existen),
        // devuelve un usuario sin identidades y no envía ningún correo
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
          throw new Error("Ya existe una cuenta con ese email. Ingresá con tu contraseña.");
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
        rolGuardado = null;
        const { data, error } = await conLimite(sb.auth.signInWithPassword({ email, password }));
        if (error) throw errorAcceso(error, "entrar");
        return { email, nombre: data.user.user_metadata?.nombre || "" };
      }
      const c = leer(CLIENTES, {})[email];
      if (!c || c.clave !== (await huella(password))) throw new Error("Email o contraseña incorrectos.");
      guardar(CLIENTE_SESION, { email, nombre: c.nombre });
      return { email, nombre: c.nombre };
    },

    async clienteActual() {
      if (sb) {
        const s = await sesion();
        const u = s && s.user;
        return u ? { email: norm(u.email), nombre: u.user_metadata?.nombre || "", id: u.id } : null;
      }
      return leer(CLIENTE_SESION, null);
    },

    async clienteSalir() {
      rolGuardado = null;
      if (sb) { await conLimite(sb.auth.signOut()).catch(() => {}); return; }
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
