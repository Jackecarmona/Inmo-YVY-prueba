// Pruebas automáticas de YVY Capital. Se abren las páginas reales dentro de un iframe en modo demo
// (ver js/config.js: la bandera yvy_pruebas) y, para la capa de datos, un Supabase simulado.
(() => {
  const RAIZ = new URL("../", location.href).href;
  const $ = s => document.querySelector(s);
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const casos = [];
  const prueba = (grupo, nombre, fn) => casos.push({ grupo, nombre, fn });

  // Afirmaciones: si algo no se cumple, la prueba falla con el detalle
  function afirmar(cond, detalle) { if (!cond) throw new Error(detalle || "No se cumplió la condición"); }
  const igual = (a, b, que) => afirmar(JSON.stringify(a) === JSON.stringify(b), `${que}: se esperaba ${JSON.stringify(b)} y llegó ${JSON.stringify(a)}`);
  async function hasta(cond, que, ms = 6000) {
    const fin = Date.now() + ms;
    while (Date.now() < fin) { try { if (await cond()) return; } catch (e) { /* todavía no */ } await espera(50); }
    throw new Error("Tiempo agotado esperando: " + que);
  }

  /* ---------- Escenario: una página real en un iframe ---------- */
  let marco = null;
  async function abrir(ruta, { ancho = 1200, alto = 900 } = {}) {
    if (marco) marco.remove();
    marco = document.createElement("iframe");
    marco.id = "escenario";
    marco.style.width = ancho + "px"; marco.style.height = alto + "px";
    const cargado = new Promise(r => { marco.onload = r; });
    marco.src = RAIZ + ruta;
    document.body.appendChild(marco);
    await cargado;
    await hasta(() => marco.contentWindow.YVYDB || marco.contentDocument.readyState === "complete", "que cargue " + ruta);
    return { d: marco.contentDocument, w: marco.contentWindow };
  }
  // Espera a que el iframe navegue a otra página
  const navegar = () => new Promise(r => { marco.onload = () => r({ d: marco.contentDocument, w: marco.contentWindow }); });
  const ruta = () => marco.contentWindow.location.pathname.replace(new URL(RAIZ).pathname, "");

  // Estado limpio para cada prueba (la bandera de pruebas y el consentimiento se mantienen)
  function limpiar({ preferencias = false } = {}) {
    localStorage.clear();
    const bandera = sessionStorage.getItem("yvy_pruebas");
    sessionStorage.clear();
    if (bandera) sessionStorage.setItem("yvy_pruebas", bandera);
    localStorage.setItem("yvy_consentimiento", JSON.stringify({ v: 1, fecha: new Date().toISOString(), origen: "pruebas", categorias: { necesarias: true, preferencias } }));
  }
  const escribir = (el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  async function fotoDePrueba(color = "#c6a66b") {
    const c = document.createElement("canvas"); c.width = 320; c.height = 240;
    const g = c.getContext("2d"); g.fillStyle = color; g.fillRect(0, 0, 320, 240);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.8));
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  }
  function ponerArchivos(input, archivos) {
    const dt = new DataTransfer(); archivos.forEach(a => dt.items.add(a));
    input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /* ---------- Supabase simulado (para probar js/db.js sin la base real) ---------- */
  function crearSupabaseFalso() {
    const R = { llamadas: [], sesion: null, esEquipo: false, colgarSesion: false, colgarRpc: false, errorUpdate: null, errorInsert: null, respuestaAuth: {} };
    const anotar = (...a) => R.llamadas.push(a);
    const nunca = new Promise(() => {});
    const cliente = {
      auth: {
        getSession: () => { anotar("getSession"); return R.colgarSesion ? nunca : Promise.resolve({ data: { session: R.sesion } }); },
        signInWithPassword: async () => { anotar("signIn"); if (R.respuestaAuth.error) return R.respuestaAuth; R.sesion = { user: { id: "u1", email: "ana@x.com", user_metadata: { nombre: "Ana" } } }; return { data: { user: R.sesion.user }, error: null }; },
        signUp: async () => { anotar("signUp"); return R.respuestaAuth; },
        resend: async () => { anotar("resend"); return R.respuestaAuth; },
        resetPasswordForEmail: async (e, op) => { anotar("reset", e, op.redirectTo); return R.respuestaAuth; },
        updateUser: async u => { anotar("updateUser", u.password); return R.respuestaAuth; },
        signOut: async () => { anotar("signOut"); R.sesion = null; return {}; },
        onAuthStateChange: cb => { R.aviso = cb; return { data: { subscription: { unsubscribe() {} } } }; }
      },
      rpc: nombre => { anotar("rpc", nombre); if (R.colgarRpc) return nunca; return Promise.resolve({ data: nombre === "es_equipo" ? R.esEquipo : [], error: null }); },
      from: tabla => ({
        insert: fila => { anotar("insert", tabla, fila); const r = Promise.resolve(R.errorInsert ? { error: R.errorInsert } : { error: null }); r.select = () => ({ single: async () => (R.errorInsert ? { error: R.errorInsert } : { data: { id: "id-nuevo" }, error: null }) }); return r; },
        update: cambios => ({ eq: async (c, v) => { anotar("update", tabla, cambios, v); return { error: R.errorUpdate }; } }),
        delete: () => ({ eq: async () => ({ error: null }) }),
        select: () => ({ order: async () => ({ data: [], error: null }), eq: () => ({ order: async () => ({ data: [], error: null }) }) })
      }),
      storage: { from: () => ({
        upload: async ruta => { anotar("upload", ruta); return { error: R.errorUpload || null }; },
        remove: async rutas => { anotar("remove", rutas); return { error: null }; },
        getPublicUrl: r => ({ data: { publicUrl: "https://falso/" + r } })
      }) }
    };
    return { R, cliente };
  }
  // Carga js/db.js (y otros módulos) en un iframe aparte con el Supabase simulado
  async function moduloSimulado(scripts = ["js/db.js"], config = {}) {
    const { R, cliente } = crearSupabaseFalso();
    window.__clienteFalso = cliente;
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;width:10px;height:10px;opacity:0;pointer-events:none";
    const cfg = JSON.stringify({ supabaseUrl: "https://falso.supabase.co", supabaseAnonKey: "x", limiteMs: 300, demoEquipo: [], ...config });
    f.srcdoc = `<base href="${RAIZ}"><script>window.YVY_CONFIG=${cfg};window.supabase={createClient:()=>parent.__clienteFalso};window.fetch=()=>Promise.reject(new Error("sin red en pruebas"));<\/script>` +
      scripts.map(s => `<script src="${s}"><\/script>`).join("");
    const listo = new Promise(r => { f.onload = r; });
    document.body.appendChild(f);
    await listo;
    return { w: f.contentWindow, R, cerrar: () => f.remove() };
  }

  /* =====================================================================
     1. CAPA DE DATOS (js/db.js) con Supabase simulado
     ===================================================================== */
  prueba("Datos e inicio de sesión", "El rol se pregunta una sola vez aunque varias partes lo pidan a la vez", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.sesion = { user: { id: "u1", email: "ana@x.com", user_metadata: {} } };
    const roles = await Promise.all([w.YVYDB.rolActual(), w.YVYDB.rolActual(), w.YVYDB.rolActual()]);
    igual(roles, ["cliente", "cliente", "cliente"], "roles");
    igual(R.llamadas.filter(l => l[0] === "rpc").length, 1, "consultas es_equipo()");
    cerrar();
  });
  prueba("Datos e inicio de sesión", "Al salir se olvida el rol y al volver se vuelve a preguntar", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.sesion = { user: { id: "u1", email: "ana@x.com", user_metadata: {} } }; R.esEquipo = true;
    igual(await w.YVYDB.rolActual(), "equipo", "rol antes");
    await w.YVYDB.signOut();
    igual(await w.YVYDB.rolActual(), null, "rol después de salir");
    cerrar();
  });
  prueba("Datos e inicio de sesión", "Si la sesión no responde, se corta con un aviso en vez de quedarse pegado", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.colgarSesion = true;
    const t0 = performance.now();
    let msg = "";
    try { await w.YVYDB.rolActual(); } catch (e) { msg = e.message; }
    afirmar(/tardando en responder/.test(msg), "mensaje: " + msg);
    afirmar(performance.now() - t0 < 2000, "tardó " + Math.round(performance.now() - t0) + " ms");
    // El fallo no queda guardado: cuando el servidor vuelve, responde normal
    R.colgarSesion = false;
    igual(await w.YVYDB.rolActual(), null, "rol cuando vuelve el servidor");
    cerrar();
  });
  prueba("Datos e inicio de sesión", "Ingresar calcula el rol una vez y la página siguiente lo reutiliza", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.esEquipo = true;
    igual(await w.YVYDB.entrar("Ana@X.com ", "clave1234"), "equipo", "rol al entrar");
    igual(await w.YVYDB.rolActual(), "equipo", "rol después");
    igual(R.llamadas.filter(l => l[0] === "rpc").length, 1, "consultas es_equipo()");
    cerrar();
  });
  prueba("Datos e inicio de sesión", "Si la consulta del rol se cuelga al entrar, avisa y el siguiente intento funciona", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.colgarRpc = true;
    let msg = "";
    try { await w.YVYDB.entrar("ana@x.com", "clave1234"); } catch (e) { msg = e.message; }
    afirmar(/tardando/.test(msg), "mensaje: " + msg);
    R.colgarRpc = false;
    igual(await w.YVYDB.rolActual(), "cliente", "rol en el reintento");
    cerrar();
  });
  const ERRORES = [
    ["registro", { message: "email rate limit exceeded", status: 429 }, /demasiados emails/],
    ["registro", { message: "For security purposes, you can only request this after 44 seconds.", status: 429 }, /demasiados emails/],
    ["registro", { message: "Password should be at least 8 characters.", status: 422 }, /demasiado débil/],
    ["registro", { message: 'Email address "a@x" is invalid', status: 400 }, /no es válido/],
    ["registro", { message: "Signups not allowed for this instance", status: 422 }, /no se pueden crear cuentas/],
    ["registro", { message: "Failed to fetch", status: 0 }, /No pudimos conectar/],
    ["entrar", { message: "Invalid login credentials", status: 400 }, /Email o contraseña incorrectos/],
    ["entrar", { message: "Email not confirmed", status: 400 }, /Todavía no confirmaste/],
    ["cambio", { message: "New password should be different from the old password.", status: 422 }, /distinta de la anterior/]
  ];
  ERRORES.forEach(([donde, error, esperado]) => prueba("Mensajes de error en español", `Supabase dice «${error.message}» → mensaje claro`, async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.respuestaAuth = { data: {}, error };
    let msg = "";
    try {
      if (donde === "registro") await w.YVYDB.clienteRegistrar("Ana", "ana@x.com", "clave1234");
      else if (donde === "entrar") await w.YVYDB.entrar("ana@x.com", "clave1234");
      else await w.YVYDB.cambiarContrasena("NuevaClave1");
    } catch (e) { msg = e.message; }
    afirmar(esperado.test(msg), "mensaje: " + msg);
    cerrar();
  }));
  prueba("Mensajes de error en español", "Registrar un email que ya tiene cuenta confirmada avisa (Supabase no da error)", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.respuestaAuth = { data: { user: { identities: [] }, session: null }, error: null };
    let msg = "";
    try { await w.YVYDB.clienteRegistrar("Ana", "ana@x.com", "clave1234"); } catch (e) { msg = e.message; }
    afirmar(/Ya existe una cuenta/.test(msg), "mensaje: " + msg);
    cerrar();
  });
  prueba("Mensajes de error en español", "«Olvidé mi contraseña» manda el enlace hacia restablecer/", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.respuestaAuth = { data: {}, error: null };
    await w.YVYDB.pedirRestablecer(" Ana@X.com ");
    const l = R.llamadas.find(x => x[0] === "reset");
    afirmar(l && l[1] === "ana@x.com" && /restablecer\/index\.html$/.test(l[2]), "llamada: " + JSON.stringify(l));
    cerrar();
  });

  prueba("Propiedades (capa de datos)", "Editar: conserva el orden, quita las marcadas y agrega las nuevas al final", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    const p = { id: "p1", fotos: ["p1/a.jpg", "p1/b.jpg", "p1/c.jpg"] };
    const nuevas = [await fotoDePrueba(), await fotoDePrueba("#64756a")];
    const r = await w.YVYDB.editarPropiedad(p, { precio: 99000 }, { quitar: ["p1/b.jpg"], nuevas });
    igual(r.fallos, 0, "fallos");
    const upd = R.llamadas.find(l => l[0] === "update");
    const fotos = upd[2].fotos;
    afirmar(fotos.length === 4 && fotos[0] === "p1/a.jpg" && fotos[1] === "p1/c.jpg" && /^p1\/.+-0\.jpg$/.test(fotos[2]) && /^p1\/.+-1\.jpg$/.test(fotos[3]), "fotos: " + JSON.stringify(fotos));
    igual(upd[2].precio, 99000, "precio");
    const iUpd = R.llamadas.indexOf(upd), iRem = R.llamadas.findIndex(l => l[0] === "remove");
    afirmar(iRem > iUpd, "las fotos quitadas se borran recién después de guardar");
    igual(R.llamadas[iRem][1], ["p1/b.jpg"], "fotos borradas");
    cerrar();
  });
  prueba("Propiedades (capa de datos)", "Editar: si falla el guardado, no se pierden fotos y se limpian las subidas", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.errorUpdate = { code: "XX000", message: "algo falló" };
    const p = { id: "p1", fotos: ["p1/a.jpg", "p1/b.jpg"] };
    let msg = "";
    try { await w.YVYDB.editarPropiedad(p, { precio: 1 }, { quitar: ["p1/a.jpg"], nuevas: [await fotoDePrueba()] }); } catch (e) { msg = e.message; }
    afirmar(/No se pudo guardar/.test(msg), "mensaje: " + msg);
    const borradas = R.llamadas.filter(l => l[0] === "remove").map(l => l[1]).flat();
    afirmar(!borradas.includes("p1/a.jpg"), "no borró la foto que se iba a quitar: " + JSON.stringify(borradas));
    afirmar(borradas.length === 1 && /-0\.jpg$/.test(borradas[0]), "limpió la foto nueva: " + JSON.stringify(borradas));
    cerrar();
  });
  prueba("Propiedades (capa de datos)", "Código repetido (error 23505) → «Ya existe una propiedad con ese código»", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    R.errorInsert = { code: "23505", message: "duplicate key" };
    let msg = "";
    try { await w.YVYDB.crearPropiedad({ codigo: "YVY-1" }, []); } catch (e) { msg = e.message; }
    afirmar(/Ya existe una propiedad con ese código/.test(msg), "mensaje: " + msg);
    cerrar();
  });
  prueba("Propiedades (capa de datos)", "Las fotos se suben a la vez, no de a una", async () => {
    const { w, R, cerrar } = await moduloSimulado();
    const fotos = await Promise.all([1, 2, 3].map(() => fotoDePrueba()));
    const t0 = performance.now();
    await w.YVYDB.crearPropiedad({ codigo: "YVY-2" }, fotos);
    igual(R.llamadas.filter(l => l[0] === "upload").length, 3, "subidas");
    afirmar(performance.now() - t0 < 1500, "tardó " + Math.round(performance.now() - t0) + " ms");
    cerrar();
  });

  /* =====================================================================
     2. MODELO DE RECOMENDACIÓN Y MONEDAS
     ===================================================================== */
  prueba("Modelo y monedas", "El modelo da puntajes de 0 a 100, ordenados, para cualquier perfil", async () => {
    const { w, cerrar } = await moduloSimulado(["js/config.js", "js/scoring.js"]);
    const S = w.YVYScoring;
    const capitales = [15000, 50000, 150000, 300000, 500000];
    for (const capital of capitales) for (const riesgo of ["baja", "media", "alta"]) for (const horizonte of ["1-3", "3-5", "5-10", "10+"]) for (const objetivo of ["renta", "plusvalia", "uso", "diversificar"]) {
      const ev = S.evaluate({ capital, moneda: "USD", capital_usd: capital, riesgo, horizonte, objetivo, financiacion: "cuotas" });
      afirmar(ev.ranking.length === 4 && S.PRODUCTS[ev.top], "ranking incompleto");
      ev.ranking.forEach((k, i) => {
        const s = ev.scores[k];
        afirmar(Number.isInteger(s) && s >= 0 && s <= 100, `puntaje fuera de rango (${k}: ${s})`);
        if (i) afirmar(ev.scores[ev.ranking[i - 1]] >= s, "ranking desordenado");
      });
      igual(ev.perfil, { baja: "Conservador", media: "Moderado", alta: "Dinámico" }[riesgo], "perfil");
    }
    cerrar();
  });
  prueba("Modelo y monedas", "Escenarios: el optimista nunca gana menos que el prudente; 10+ años proyecta 10", async () => {
    const { w, cerrar } = await moduloSimulado(["js/config.js", "js/scoring.js"]);
    const S = w.YVYScoring;
    for (const horizonte of ["1-3", "3-5", "5-10", "10+"]) {
      const ev = S.evaluate({ capital: 120000, moneda: "EUR", capital_usd: S.toUsd(120000, "EUR"), riesgo: "media", horizonte, objetivo: "renta", financiacion: "contado" });
      const p = ev.proyeccion;
      afirmar(p.optimista.ganancia >= p.prudente.ganancia, `optimista < prudente con ${horizonte}`);
      if (horizonte === "10+") igual(p.years, 10, "años con 10+");
    }
    afirmar(Math.abs(S.toUsd(100, "EUR") - 110) < 0.01, "100 € → US$ " + S.toUsd(100, "EUR"));
    cerrar();
  });
  prueba("Modelo y monedas", "Conversión de monedas con las cotizaciones de respaldo", async () => {
    const { w, cerrar } = await moduloSimulado(["js/config.js", "js/moneda.js"]);
    const M = w.YVYMoneda, t = w.YVY_CONFIG.tiposDeCambio;
    igual(M.formatear(360000), "US$ 360.000", "en dólares");
    M.elegir("BRL");
    igual(M.formatear(360000), "≈ R$ " + String(Math.round(360000 * t.BRL)).replace(/\B(?=(\d{3})+(?!\d))/g, "."), "en reales");
    M.elegir("EUR");
    igual(M.formatear(900, "EUR"), "900 €", "euros que ya están en euros");
    afirmar(/^≈ US\$|^≈ /.test(M.formatear(900, "USD")), "dólares a euros lleva ≈");
    igual(M.formatear(null), "", "sin precio");
    M.elegir("XXX"); igual(M.actual(), "EUR", "una moneda inexistente se ignora");
    cerrar();
  });

  /* =====================================================================
     3. ACCESO, ROLES Y CONTRASEÑA (páginas reales en modo demo)
     ===================================================================== */
  prueba("Acceso y roles", "Crear cuenta de cliente lleva a «Mi cuenta» y «Salir» vuelve a Ingresar", async () => {
    limpiar();
    let { d } = await abrir("ingresar/index.html");
    d.getElementById("tab-crear").click();
    escribir(d.getElementById("c-nombre"), "Ana Prueba"); escribir(d.getElementById("c-email"), "ana@prueba.com"); escribir(d.getElementById("c-pass"), "clave-segura-1");
    const nav = navegar(); d.getElementById("form-crear").requestSubmit(); ({ d } = await nav);
    igual(ruta(), "cliente/index.html", "página");
    await hasta(() => !d.getElementById("vista-panel").hidden, "que se vea el panel");
    afirmar(/Ana/.test(d.getElementById("saludo").textContent), "saludo: " + d.getElementById("saludo").textContent);
    const nav2 = navegar(); d.getElementById("btn-salir").click(); await nav2;
    igual(ruta(), "ingresar/index.html", "después de salir");
  });
  prueba("Acceso y roles", "El equipo entra al Back Office; un cliente que abre el Back Office vuelve a su cuenta", async () => {
    limpiar();
    let { d, w } = await abrir("ingresar/index.html");
    escribir(d.getElementById("e-email"), "admin@yvycapital.com"); escribir(d.getElementById("e-pass"), w.YVY_CONFIG.demoAdminPass);
    let nav = navegar(); d.getElementById("form-entrar").requestSubmit(); await nav;
    igual(ruta(), "admin/index.html", "equipo");
    limpiar();
    ({ w } = await abrir("ingresar/index.html"));
    await w.YVYDB.clienteRegistrar("Cli", "cli@prueba.com", "clave-segura-1");
    nav = navegar(); w.location.href = RAIZ + "admin/index.html"; await nav; // primero carga admin…
    await hasta(() => ruta() === "cliente/index.html", "que el Back Office lo devuelva a su cuenta");
  });
  prueba("Acceso y roles", "Sin sesión, el Back Office y «Mi cuenta» mandan a Ingresar", async () => {
    limpiar();
    await abrir("admin/index.html");
    await hasta(() => ruta() === "ingresar/index.html", "redirección desde admin");
    await abrir("cliente/index.html");
    await hasta(() => ruta() === "ingresar/index.html", "redirección desde cliente");
  });
  prueba("Acceso y roles", "Contraseña equivocada: mensaje claro y el botón vuelve a estar disponible", async () => {
    limpiar();
    const { d } = await abrir("ingresar/index.html");
    escribir(d.getElementById("e-email"), "admin@yvycapital.com"); escribir(d.getElementById("e-pass"), "mala");
    d.getElementById("form-entrar").requestSubmit();
    await hasta(() => /incorrectos/.test(d.getElementById("e-error").textContent), "el mensaje");
    afirmar(!d.getElementById("btn-entrar").disabled, "el botón quedó bloqueado");
  });
  prueba("Acceso y roles", "Validaciones del registro: nombre, email y contraseña corta", async () => {
    limpiar();
    const { d } = await abrir("ingresar/index.html");
    d.getElementById("tab-crear").click();
    const f = d.getElementById("form-crear"), err = d.getElementById("c-error");
    f.requestSubmit(); afirmar(/nombre/.test(err.textContent), "sin nombre: " + err.textContent);
    escribir(d.getElementById("c-nombre"), "Ana"); escribir(d.getElementById("c-email"), "ana@"); f.requestSubmit();
    afirmar(/email válido/.test(err.textContent), "email malo: " + err.textContent);
    escribir(d.getElementById("c-email"), "ana@x.com"); escribir(d.getElementById("c-pass"), "1234"); f.requestSubmit();
    afirmar(/8 caracteres/.test(err.textContent), "clave corta: " + err.textContent);
  });
  prueba("Acceso y roles", "La página de ingreso no muestra credenciales ni el panel del equipo", async () => {
    limpiar();
    const { d, w } = await abrir("ingresar/index.html");
    const t = d.querySelector("main").textContent;
    afirmar(!t.includes(w.YVY_CONFIG.demoAdminPass) && !/admin@|Equipo YVY|panel del equipo/i.test(t), "aparece información del equipo");
  });
  prueba("Acceso y roles", "«¿Olvidaste tu contraseña?» abre el formulario y en demo explica que no hay emails", async () => {
    limpiar();
    const { d } = await abrir("ingresar/index.html");
    escribir(d.getElementById("e-email"), "ana@x.com");
    d.getElementById("btn-olvido").click();
    afirmar(!d.getElementById("form-olvido").hidden && d.getElementById("o-email").value === "ana@x.com", "formulario");
    d.getElementById("form-olvido").requestSubmit();
    await hasta(() => /modo demo/.test(d.getElementById("o-error").textContent), "aviso del modo demo");
  });
  prueba("Acceso y roles", "Restablecer: sin venir del email no deja cambiar nada", async () => {
    limpiar();
    const { d } = await abrir("restablecer/index.html");
    await hasta(() => !d.getElementById("r-invalido").hidden, "aviso de enlace inválido");
    afirmar(d.getElementById("form-nueva").hidden, "se ve el formulario");
  });

  /* =====================================================================
     4. BACK OFFICE: PROPIEDADES (alta, edición y baja)
     ===================================================================== */
  async function entrarAlBackOffice() {
    limpiar();
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.entrar("admin@yvycapital.com", w.YVY_CONFIG.demoAdminPass);
    const r = await abrir("admin/index.html");
    await hasta(() => !r.d.getElementById("vista-app").hidden, "que abra el panel");
    r.d.querySelector('[data-vista="propiedades"]').click();
    return r;
  }
  async function altaDesdeFormulario(d, datos, fotos = []) {
    d.getElementById("btn-nueva-prop").click();
    const x = d.getElementById("form-prop").elements;
    Object.entries(datos).forEach(([k, v]) => escribir(x[k], v));
    if (fotos.length) ponerArchivos(x.fotos, fotos);
    d.getElementById("form-prop").requestSubmit();
    await hasta(() => !d.getElementById("dlg-prop").open, "que se cierre el formulario");
  }
  const BASE_PROP = { codigo: "YVY-T1", metros: "120", habitaciones: "3", banos: "2", precio: "250000", ubicacion: "Zona Lago", ciudad: "San Bernardino", pais: "Paraguay" };

  prueba("Back Office · propiedades", "Alta con 2 fotos: aparece en la tabla y en la web", async () => {
    const { d } = await entrarAlBackOffice();
    await altaDesdeFormulario(d, BASE_PROP, [await fotoDePrueba(), await fotoDePrueba("#243140")]);
    await hasta(() => d.querySelectorAll("#tb-props tr[data-id]").length === 1, "la fila");
    const p = JSON.parse(localStorage.getItem("yvy_propiedades_demo"))[0];
    igual(p.fotos.length, 2, "fotos guardadas");
    const web = await abrir("propiedades/index.html");
    await hasta(() => web.d.querySelectorAll(".pr-card").length === 11, "11 tarjetas en la web");
  });
  prueba("Back Office · propiedades", "Editar: el formulario viene relleno con los datos actuales", async () => {
    const { d } = await entrarAlBackOffice();
    await altaDesdeFormulario(d, { ...BASE_PROP, descripcion: "Primera versión." }, [await fotoDePrueba()]);
    await hasta(() => d.querySelector("[data-editar]"), "botón Editar");
    d.querySelector("[data-editar]").click();
    const x = d.getElementById("form-prop").elements;
    afirmar(d.getElementById("dlg-prop").open, "se abrió el formulario");
    igual([x.codigo.value, x.metros.value, x.precio.value, x.habitaciones.value, x.ciudad.value, x.descripcion.value], ["YVY-T1", "120", "250000", "3", "San Bernardino", "Primera versión."], "campos");
    afirmar(/Editar propiedad YVY-T1/.test(d.getElementById("dlg-prop-t").textContent), "título: " + d.getElementById("dlg-prop-t").textContent);
    igual(d.querySelectorAll("#fotos-actuales .foto-actual").length, 1, "fotos actuales visibles");
    igual(d.getElementById("guardar-prop").textContent, "Guardar cambios", "botón");
  });
  prueba("Back Office · propiedades", "Editar: cambia precio, quita una foto, agrega otra y vacía la descripción", async () => {
    const { d } = await entrarAlBackOffice();
    await altaDesdeFormulario(d, { ...BASE_PROP, descripcion: "Se va a borrar." }, [await fotoDePrueba("#111111"), await fotoDePrueba("#222222")]);
    const antes = JSON.parse(localStorage.getItem("yvy_propiedades_demo"))[0];
    await hasta(() => d.querySelector("[data-editar]"), "botón Editar");
    d.querySelector("[data-editar]").click();
    const x = d.getElementById("form-prop").elements;
    escribir(x.precio, "199000"); escribir(x.descripcion, "");
    d.querySelector("#fotos-actuales .foto-actual").click(); // quitar la primera
    afirmar(d.querySelector("#fotos-actuales .foto-actual").getAttribute("aria-pressed") === "true", "la foto quedó marcada");
    ponerArchivos(x.fotos, [await fotoDePrueba("#333333")]);
    d.getElementById("form-prop").requestSubmit();
    await hasta(() => /Cambios guardados/.test(d.getElementById("props-msg").textContent), "mensaje de guardado");
    const despues = JSON.parse(localStorage.getItem("yvy_propiedades_demo"))[0];
    igual(despues.id, antes.id, "es la misma propiedad");
    igual(despues.precio, 199000, "precio");
    igual(despues.descripcion, null, "descripción vaciada");
    igual(despues.fotos.length, 2, "cantidad de fotos");
    afirmar(despues.fotos[0] === antes.fotos[1] && despues.fotos[1] !== antes.fotos[0], "orden de fotos (queda la 2.ª y se suma la nueva)");
    igual(JSON.parse(localStorage.getItem("yvy_propiedades_demo")).length, 1, "no se duplicó");
  });
  prueba("Back Office · propiedades", "Editar: no deja pasar de 6 fotos en total", async () => {
    const { d } = await entrarAlBackOffice();
    const cinco = await Promise.all([1, 2, 3, 4, 5].map(() => fotoDePrueba()));
    await altaDesdeFormulario(d, BASE_PROP, cinco);
    await hasta(() => d.querySelector("[data-editar]"), "botón Editar");
    d.querySelector("[data-editar]").click();
    ponerArchivos(d.getElementById("form-prop").elements.fotos, [await fotoDePrueba(), await fotoDePrueba()]);
    d.getElementById("form-prop").requestSubmit();
    await hasta(() => /como máximo 1 foto/.test(d.getElementById("err-prop").textContent), "aviso del máximo");
    igual(JSON.parse(localStorage.getItem("yvy_propiedades_demo"))[0].fotos.length, 5, "no se guardó nada");
  });
  prueba("Back Office · propiedades", "Editar: un código que ya usa otra propiedad se rechaza; el propio se acepta", async () => {
    const { d } = await entrarAlBackOffice();
    await altaDesdeFormulario(d, BASE_PROP);
    await altaDesdeFormulario(d, { ...BASE_PROP, codigo: "YVY-T2" });
    await hasta(() => d.querySelectorAll("[data-editar]").length === 2, "dos filas");
    const fila = [...d.querySelectorAll("#tb-props tr")].find(tr => /YVY-T2/.test(tr.textContent));
    fila.querySelector("[data-editar]").click();
    escribir(d.getElementById("form-prop").elements.codigo, "yvy-t1");
    d.getElementById("form-prop").requestSubmit();
    await hasta(() => /Ya existe una propiedad con ese código/.test(d.getElementById("err-prop").textContent), "rechazo");
    escribir(d.getElementById("form-prop").elements.codigo, "YVY-T2");
    escribir(d.getElementById("form-prop").elements.metros, "130");
    d.getElementById("form-prop").requestSubmit();
    await hasta(() => !d.getElementById("dlg-prop").open, "guardado con su propio código");
  });
  prueba("Back Office · propiedades", "Validaciones del formulario (código, m², precio, año, zona)", async () => {
    const { d } = await entrarAlBackOffice();
    d.getElementById("btn-nueva-prop").click();
    const f = d.getElementById("form-prop"), x = f.elements, err = d.getElementById("err-prop");
    const casos = [
      [{}, /código/], [{ codigo: "A" }, /superficie/], [{ codigo: "A", metros: "50", habitaciones: "2.5" }, /enteros/],
      [{ codigo: "A", metros: "50", habitaciones: "2", anio: "1700" }, /1800 y 2100/], [{ codigo: "A", metros: "50", anio: "" }, /precio/],
      [{ codigo: "A", metros: "50", precio: "100", ubicacion: "" }, /zona, la ciudad y el país/]
    ];
    for (const [datos, esperado] of casos) {
      f.reset(); Object.entries(datos).forEach(([k, v]) => escribir(x[k], v));
      if (!("ubicacion" in datos)) escribir(x.ubicacion, "Z");
      f.requestSubmit();
      afirmar(esperado.test(err.textContent), `${JSON.stringify(datos)} → «${err.textContent}»`);
    }
    igual(localStorage.getItem("yvy_propiedades_demo"), null, "no se guardó nada");
  });
  prueba("Back Office · propiedades", "Pasar a borrador la oculta de la web; Eliminar pide confirmación", async () => {
    const { d } = await entrarAlBackOffice();
    await altaDesdeFormulario(d, { ...BASE_PROP, estado: "publicada" });
    await hasta(() => d.querySelector("[data-estado]"), "selector");
    escribir(d.querySelector("[data-estado]"), "borrador");
    await hasta(() => JSON.parse(localStorage.getItem("yvy_propiedades_demo"))[0].estado === "borrador", "estado guardado");
    const b = d.querySelector("[data-borrar]");
    b.click(); afirmar(/Seguro/.test(b.textContent), "pide confirmación");
    igual(JSON.parse(localStorage.getItem("yvy_propiedades_demo")).length, 1, "todavía no borró");
    b.click();
    await hasta(() => JSON.parse(localStorage.getItem("yvy_propiedades_demo")).length === 0, "borrada");
  });

  /* =====================================================================
     5. CLIENTES: FAVORITOS
     ===================================================================== */
  prueba("Área de clientes", "Quitar favoritos actualiza la lista, el contador y lo guardado", async () => {
    limpiar();
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.clienteRegistrar("Ana", "ana@prueba.com", "clave-segura-1");
    await w.YVYDB.alternarFavorito("horizon-home"); await w.YVYDB.alternarFavorito("la-suiza");
    const { d } = await abrir("cliente/index.html");
    await hasta(() => d.querySelectorAll(".cl-fav").length === 2, "dos favoritos");
    d.querySelector('[data-quitar="horizon-home"]').click();
    await hasta(() => d.querySelectorAll(".cl-fav").length === 1, "queda uno");
    igual(JSON.parse(localStorage.getItem("yvy_favoritos_ana@prueba.com")), ["la-suiza"], "favoritos guardados");
    igual(d.querySelector("#kpis div:nth-child(2) b").textContent, "1", "contador");
  });
  prueba("Área de clientes", "Una propiedad publicada desde el Back Office también aparece en favoritos", async () => {
    limpiar();
    localStorage.setItem("yvy_propiedades_demo", JSON.stringify([{ id: "a1", codigo: "YVY-9", operacion: "venta", tipo: "Dúplex", condicion: "nuevo", metros: 90, ubicacion: "Centro", ciudad: "Asunción", pais: "Paraguay", precio: 150000, moneda: "USD", estado: "publicada", fotos: [] }]));
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.clienteRegistrar("Ana", "ana@prueba.com", "clave-segura-1");
    await w.YVYDB.alternarFavorito("p-a1");
    const { d } = await abrir("cliente/index.html");
    await hasta(() => /Dúplex en Asunción/.test(d.getElementById("lista-favs").textContent), "el favorito del Back Office");
  });

  prueba("Área de clientes", "«Hola, Ana» en el menú lleva a «Mi cuenta» sin perder la sesión", async () => {
    limpiar();
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.clienteRegistrar("Ana Prueba", "ana@prueba.com", "clave-segura-1");
    let { d } = await abrir("propiedades/index.html");
    const nav = () => d.getElementById("nav-cliente");
    await hasta(() => /cliente\/index\.html$/.test(nav().getAttribute("href")) && /Hola, Ana/.test(nav().textContent), "el enlace del menú apunta a Mi cuenta");
    let ir = navegar(); nav().click(); ({ d } = await ir);
    igual(ruta(), "cliente/index.html", "página");
    await hasta(() => !d.getElementById("vista-panel").hidden, "panel visible (sesión intacta)");
    // Desde el propio panel, tocarlo otra vez tampoco cierra la sesión
    await hasta(() => /cliente\/index\.html$/.test(nav().getAttribute("href")), "enlace dentro del panel");
    ir = navegar(); nav().click(); ({ d } = await ir);
    await hasta(() => !d.getElementById("vista-panel").hidden, "sigue en el panel");
    afirmar(localStorage.getItem("yvy_cliente_demo"), "se perdió la sesión");
  });
  prueba("Área de clientes", "Abrir Ingresar con la sesión abierta avisa y vuelve al panel", async () => {
    limpiar();
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.clienteRegistrar("Ana", "ana@prueba.com", "clave-segura-1");
    await abrir("ingresar/index.html");
    await hasta(() => ruta() === "cliente/index.html", "vuelve a Mi cuenta");
    afirmar(localStorage.getItem("yvy_cliente_demo"), "se perdió la sesión");
  });
  prueba("Favoritos en la ficha", "El botón de la ficha cambia a «Quitar de favoritos» y vuelve, sincronizado con la tarjeta", async () => {
    limpiar();
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.clienteRegistrar("Ana", "ana@prueba.com", "clave-segura-1");
    const { d } = await abrir("propiedades/index.html");
    await hasta(() => d.querySelector('.pr-card [data-abrir="horizon-home"]'), "tarjetas");
    d.querySelector('.pr-card [data-abrir="horizon-home"]').click();
    const enFicha = () => d.querySelector("#pr-info [data-fav]");
    const enTarjeta = () => d.querySelector('.pr-card [data-fav="horizon-home"]');
    igual(enFicha().textContent.trim(), "Guardar en favoritos", "texto inicial");
    enFicha().click();
    await hasta(() => enFicha().textContent.trim() === "Quitar de favoritos", "cambia a «Quitar de favoritos»");
    igual([enFicha().getAttribute("aria-pressed"), enTarjeta().getAttribute("aria-pressed")], ["true", "true"], "ficha y tarjeta marcadas");
    igual(JSON.parse(localStorage.getItem("yvy_favoritos_ana@prueba.com")), ["horizon-home"], "guardado");
    enFicha().click();
    await hasta(() => enFicha().textContent.trim() === "Guardar en favoritos", "vuelve a «Guardar en favoritos»");
    igual(enTarjeta().getAttribute("aria-pressed"), "false", "la tarjeta también se desmarca");
    igual(JSON.parse(localStorage.getItem("yvy_favoritos_ana@prueba.com")), [], "quitado");
  });
  prueba("Favoritos en la ficha", "Doble clic rápido = un solo cambio (no queda en un estado incorrecto)", async () => {
    limpiar();
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.clienteRegistrar("Ana", "ana@prueba.com", "clave-segura-1");
    const { d } = await abrir("propiedades/index.html");
    await hasta(() => d.querySelector('.pr-card [data-abrir="la-suiza"]'), "tarjetas");
    d.querySelector('.pr-card [data-abrir="la-suiza"]').click();
    const b = d.querySelector("#pr-info [data-fav]");
    b.click(); b.click(); b.click();
    await hasta(() => !b.disabled, "termina de guardar");
    igual(JSON.parse(localStorage.getItem("yvy_favoritos_ana@prueba.com")), ["la-suiza"], "favoritos");
    igual(b.getAttribute("aria-pressed"), "true", "estado del botón");
  });
  prueba("Favoritos en la ficha", "Abierta por enlace directo, la ficha muestra si ya era favorita", async () => {
    limpiar();
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.clienteRegistrar("Ana", "ana@prueba.com", "clave-segura-1");
    await w.YVYDB.alternarFavorito("vista-lago");
    const { d } = await abrir("propiedades/index.html#vista-lago");
    await hasta(() => d.querySelector("#pr-info [data-fav]") && d.querySelector("#pr-info [data-fav]").textContent.trim() === "Quitar de favoritos", "estado de la ficha");
  });
  prueba("Favoritos en la ficha", "Sin sesión, el botón de la ficha invita a ingresar y no cambia", async () => {
    limpiar();
    const { d } = await abrir("propiedades/index.html");
    await hasta(() => d.querySelector('.pr-card [data-abrir="horizon-home"]'), "tarjetas");
    d.querySelector('.pr-card [data-abrir="horizon-home"]').click();
    d.querySelector("#pr-info [data-fav]").click();
    await hasta(() => /Ingresá o creá tu cuenta/.test((d.getElementById("pr-aviso") || {}).textContent || ""), "aviso para ingresar");
    igual(d.querySelector("#pr-info [data-fav]").textContent.trim(), "Guardar en favoritos", "texto");
  });

  /* =====================================================================
     6. FORMULARIOS, SIMULADOR, PDF Y CHAT
     ===================================================================== */
  prueba("Formularios", "Contacto: exige consentimiento, ignora robots y guarda el teléfono con prefijo", async () => {
    limpiar();
    const { d } = await abrir("nosotros/index.html");
    escribir(d.getElementById("c-nombre"), "Luis"); escribir(d.getElementById("c-email"), "luis@x.com");
    d.getElementById("form-contacto").requestSubmit();
    await hasta(() => /consentimiento/.test(d.getElementById("c-error").textContent), "pide consentimiento");
    d.getElementById("c-consentimiento").checked = true;
    escribir(d.getElementById("c-web"), "spam"); d.getElementById("form-contacto").requestSubmit(); await espera(300);
    igual(JSON.parse(localStorage.getItem("yvy_leads") || "[]").length, 0, "el robot no se guarda");
    // Después de cada envío el formulario se vacía: se vuelve a completar como lo haría una persona
    escribir(d.getElementById("c-web"), "");
    escribir(d.getElementById("c-nombre"), "Luis"); escribir(d.getElementById("c-email"), "luis@x.com"); escribir(d.getElementById("c-tel"), "611 222 333");
    d.getElementById("c-consentimiento").checked = true;
    d.getElementById("form-contacto").requestSubmit();
    await hasta(() => JSON.parse(localStorage.getItem("yvy_leads") || "[]").length === 1, "solicitud guardada");
    igual(JSON.parse(localStorage.getItem("yvy_leads"))[0].telefono, "+34 611 222 333", "teléfono");
  });
  prueba("Formularios", "Simulador: test de perfil → formulario precargado → solicitud con el puntaje", async () => {
    limpiar();
    const { d } = await abrir("simulador/index.html");
    afirmar(d.getElementById("form-inversor").hidden, "arranca con el test");
    d.querySelector('[data-test-ir="q1"]').click();
    d.querySelector('[data-q="capital"] [data-v="100000"]').click(); await espera(450);
    d.querySelector('[data-q="objetivo"] [data-v="renta"]').click(); await espera(450);
    escribir(d.getElementById("test-riesgo"), "80");
    d.querySelector('[data-test-ir="q4"]').click();
    d.querySelector('[data-q="horizonte"] [data-v="10+"]').click();
    await hasta(() => !d.querySelector('[data-t="resultado"]').hidden, "resultado del test", 9000);
    d.getElementById("test-continuar").click();
    escribir(d.getElementById("nombre"), "Ana Test"); escribir(d.getElementById("email"), "ana@test.com");
    d.getElementById("consentimiento").checked = true;
    d.getElementById("form-inversor").requestSubmit();
    await hasta(() => !d.getElementById("resultado").hidden, "recomendación");
    const lead = JSON.parse(localStorage.getItem("yvy_leads"))[0];
    afirmar(lead.test_puntaje > 0 && lead.riesgo === "alta" && lead.horizonte === "10+", "solicitud: " + JSON.stringify(lead).slice(0, 160));
  });
  prueba("Formularios", "PDF: el generador no se descarga al abrir la página, sí al pedir el informe", async () => {
    limpiar();
    const { d, w } = await abrir("simulador/index.html");
    afirmar(!w.jspdf && !d.querySelector('script[src*="jspdf"]'), "jsPDF ya estaba cargado al abrir");
    const url = await w.YVYPdf.blobUrl({ nombre: "Ana", capital: 100000, moneda: "USD", capital_usd: 100000, riesgo: "media", horizonte: "5-10", objetivo: "renta", financiacion: "contado", created_at: new Date().toISOString() });
    afirmar(/^blob:/.test(url) && w.jspdf, "no generó el PDF");
  });
  prueba("Formularios", "Chat: recuerda la conversación entre páginas y «Reiniciar» la borra", async () => {
    limpiar();
    let { d } = await abrir("propiedades/index.html");
    const opcion = t => { const b = [...d.querySelectorAll("#chat-ops button")].find(x => x.textContent.startsWith(t)); afirmar(b, "falta la opción " + t); b.click(); };
    d.getElementById("bot-btn").click(); await espera(100);
    opcion("España"); await espera(450); opcion("50.000"); await espera(450);
    ({ d } = await abrir("proyectos/index.html"));
    d.getElementById("bot-btn").click(); await espera(100);
    afirmar([...d.querySelectorAll("#chat-ops button")].some(b => b.textContent === "Cobrar renta mensual"), "no siguió la conversación");
    d.getElementById("chat-reiniciar").click(); await espera(100);
    igual(d.querySelectorAll("#chat-log .msg").length, 1, "mensajes después de reiniciar");
  });

  /* =====================================================================
     7. COOKIES, MONEDA, BUSCADOR
     ===================================================================== */
  prueba("Cookies y preferencias", "Sin elección: banner visible y nada opcional guardado; Rechazar lo recuerda", async () => {
    limpiar(); localStorage.removeItem("yvy_consentimiento");
    const { d } = await abrir("propiedades/index.html");
    await hasta(() => d.querySelector(".galletas"), "banner");
    escribir(d.getElementById("casas-orden"), "precio-asc");
    afirmar(!localStorage.getItem("yvy_pref_orden"), "guardó una preferencia sin permiso");
    d.querySelector('[data-galletas="rechazar"]').click();
    igual(JSON.parse(localStorage.getItem("yvy_consentimiento")).categorias.preferencias, false, "elección");
    afirmar(!d.querySelector(".galletas"), "el banner sigue visible");
  });
  prueba("Cookies y preferencias", "Con preferencias aceptadas se recuerdan orden y moneda; al retirarlas se borran", async () => {
    limpiar({ preferencias: true });
    let { d } = await abrir("propiedades/index.html");
    escribir(d.getElementById("casas-orden"), "precio-desc");
    escribir(d.querySelector("[data-selector-moneda]"), "EUR");
    ({ d } = await abrir("propiedades/index.html"));
    igual(d.getElementById("casas-orden").value, "precio-desc", "orden recordado");
    igual(d.querySelector("[data-selector-moneda]").value, "EUR", "moneda recordada");
    d.querySelector(".footer [data-abrir-galletas]").click();
    d.querySelector('.galletas-panel [data-panel="rechazar"]').click();
    afirmar(!localStorage.getItem("yvy_pref_orden") && !localStorage.getItem("yvy_pref_divisa"), "no se borraron");
  });
  prueba("Cookies y preferencias", "Moneda: las tarjetas y la ficha muestran el precio convertido y el original", async () => {
    limpiar();
    const { d } = await abrir("propiedades/index.html");
    escribir(d.querySelector("[data-selector-moneda]"), "BRL");
    await hasta(() => /^≈ R\$/.test(d.querySelector(".pr-card__precio").textContent.trim()), "precio en reales");
    d.querySelector(".pr-card [data-abrir]").click();
    afirmar(/Precio: US\$/.test(d.getElementById("pr-modal-precio").textContent), "falta el precio original");
  });
  prueba("Cookies y preferencias", "Buscador de Inicio → Propiedades filtradas, y «Quitar búsqueda» vuelve a todas", async () => {
    limpiar();
    let { d } = await abrir("index.html");
    escribir(d.querySelector('[name="dorm"]'), "4");
    const nav = navegar(); d.getElementById("buscador").requestSubmit(); ({ d } = await nav);
    await hasta(() => d.querySelectorAll(".pr-card").length > 0, "resultados");
    const dorms = [...d.querySelectorAll(".pr-card__specs li:nth-child(2) b")].map(b => +b.textContent);
    afirmar(dorms.every(n => n >= 4), "hay casas con menos de 4 dormitorios: " + dorms);
    d.querySelector(".pr-busqueda__quitar").click();
    igual(d.querySelectorAll(".pr-card").length, 10, "todas otra vez");
  });

  /* =====================================================================
     8. SEGURIDAD BÁSICA
     ===================================================================== */
  prueba("Seguridad", "Textos maliciosos en una propiedad no se ejecutan en la web", async () => {
    limpiar();
    const ataque = '<img src=x onerror="parent.__xss=1">';
    localStorage.setItem("yvy_propiedades_demo", JSON.stringify([{ id: "x1", codigo: ataque, operacion: "venta", tipo: ataque, condicion: "nuevo", metros: 50, ubicacion: ataque, ciudad: ataque, pais: "PY", precio: 1000, moneda: "USD", estado: "publicada", descripcion: ataque, fotos: [] }]));
    window.__xss = 0;
    const { d } = await abrir("propiedades/index.html");
    await hasta(() => d.querySelectorAll(".pr-card").length === 11, "la tarjeta");
    d.querySelector('.pr-card [data-abrir="p-x1"]').click();
    await espera(300);
    igual(window.__xss, 0, "se ejecutó código");
    afirmar(!d.querySelector('img[src="x"]'), "se insertó la etiqueta");
  });
  prueba("Seguridad", "Un nombre malicioso en una solicitud se muestra como texto en el Back Office", async () => {
    limpiar();
    localStorage.setItem("yvy_leads", JSON.stringify([{ id: "l1", created_at: new Date().toISOString(), nombre: '<img src=x onerror="parent.__xss=2">', email: "a@x.com", estado: "nuevo", fuente: "contacto", consentimiento: true }]));
    window.__xss = 0;
    let { w } = await abrir("ingresar/index.html");
    await w.YVYDB.entrar("admin@yvycapital.com", w.YVY_CONFIG.demoAdminPass);
    const { d } = await abrir("admin/index.html");
    await hasta(() => d.querySelector("#tbody tr"), "la fila");
    d.querySelector("#tbody tr").click(); await espera(200);
    igual(window.__xss, 0, "se ejecutó código");
    afirmar(/<img src=x/.test(d.getElementById("detalle").textContent), "no se ve el texto literal");
  });
  prueba("Seguridad", "Las páginas privadas no se indexan en buscadores", async () => {
    const txt = await (await fetch(RAIZ + "robots.txt")).text();
    ["/admin/", "/cliente/", "/ingresar/", "/restablecer/", "/pruebas/"].forEach(p => afirmar(txt.includes("Disallow: " + p), "falta " + p));
  });

  /* ---------- Ejecución e informe ---------- */
  function guardarCopia() {
    const copia = l => Object.fromEntries(Object.keys(l).map(k => [k, l.getItem(k)]));
    return { local: copia(localStorage), sesion: copia(sessionStorage) };
  }
  function restaurar(c) {
    localStorage.clear(); sessionStorage.clear();
    Object.entries(c.local).forEach(([k, v]) => localStorage.setItem(k, v));
    Object.entries(c.sesion).forEach(([k, v]) => sessionStorage.setItem(k, v));
  }

  $("#correr").addEventListener("click", async () => {
    const btn = $("#correr"), informe = $("#informe"), resumen = $("#resumen");
    if (location.protocol === "file:") { resumen.innerHTML = '<span class="mal">Abrí esta página con Live Server (http://), no como archivo.</span>'; return; }
    btn.disabled = true; informe.innerHTML = "";
    const copia = guardarCopia();
    sessionStorage.setItem("yvy_pruebas", "demo");
    const t0 = performance.now();
    let ok = 0, mal = 0, grupoActual = null, lista = null;
    for (const c of casos) {
      if (c.grupo !== grupoActual) {
        grupoActual = c.grupo;
        const s = document.createElement("section");
        s.innerHTML = `<h2>${c.grupo}</h2><ol></ol>`;
        informe.appendChild(s); lista = s.querySelector("ol");
      }
      resumen.textContent = `Probando: ${c.nombre}…`;
      const li = document.createElement("li");
      li.textContent = c.nombre;
      try {
        await Promise.race([c.fn(), espera(30000).then(() => { throw new Error("La prueba tardó más de 30 s"); })]);
        li.className = "ok"; ok++;
      } catch (e) {
        li.className = "mal"; mal++;
        const det = document.createElement("small"); det.textContent = e.message; li.appendChild(det);
      }
      lista.appendChild(li);
    }
    if (marco) { marco.remove(); marco = null; }
    restaurar(copia);
    const seg = ((performance.now() - t0) / 1000).toFixed(1);
    resumen.innerHTML = `<span class="${mal ? "mal" : "ok"}">${ok} de ${ok + mal} pruebas correctas</span> · ${seg} s` + (mal ? ` · <span class="mal">${mal} con fallas</span>` : "");
    document.title = `${mal ? "✗" : "✓"} ${ok}/${ok + mal} · Pruebas YVY`;
    btn.disabled = false;
    window.__resultado = { ok, mal, total: ok + mal };
  });
  // Para correrlas sin tocar nada: pruebas/index.html#auto
  if (location.hash === "#auto") $("#correr").click();
})();
