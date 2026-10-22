// Consentimiento de cookies y almacenamiento local (banner, panel de preferencias y control real).
// Se carga en todas las páginas públicas ANTES de layout.js, para que nada opcional se guarde sin permiso.
//
// Cómo usarlo desde otros scripts:
//   YVYConsentimiento.permite("preferencias")  → true / false
//   YVYConsentimiento.cuando("analiticas", fn)  → ejecuta fn solo cuando (y si) esa categoría se autoriza
//   YVYConsentimiento.abrirPanel()              → abre el panel (lo usa el enlace del pie de página)
// Scripts de terceros futuros: <script type="text/plain" data-consentimiento="analiticas" data-src="https://…"></script>
// no se ejecutan hasta que el usuario acepta esa categoría.
window.YVYConsentimiento = (() => {
  // Subir VERSION cuando cambien de forma relevante la política o las categorías: se vuelve a pedir el consentimiento.
  const VERSION = 1;
  const CLAVE = "yvy_consentimiento";
  const CADUCA_MESES = 12; // pasado este plazo se vuelve a preguntar
  const B = document.body ? document.body.dataset.base || "" : "";

  // Inventario real de lo que guarda la web. Una categoría opcional sin "items" no se ofrece:
  // hoy la web NO usa analítica ni publicidad. Si se incorpora una herramienta, se añade aquí,
  // se sube VERSION y se actualiza la Política de cookies.
  const CATEGORIAS = [
    { id: "necesarias", nombre: "Necesarias", fija: true,
      desc: "Hacen funcionar la web: recordar tu elección sobre cookies, mantener tu sesión, guardar tus favoritos, pasar los datos de una ficha al simulador y seguir la conversación con el asistente mientras navegás. No se pueden desactivar.",
      items: ["yvy_consentimiento", "sb-…-auth-token", "yvy_cliente_demo · yvy_admin_demo", "yvy_favoritos_…", "yvy_prefill", "yvy_chat (durante la visita)"] },
    { id: "preferencias", nombre: "Preferencias",
      desc: "Recuerdan elecciones tuyas para no repetírtelas: la moneda en la que ves los precios, tu conversación con el asistente para retomarla otro día, el orden de la lista de propiedades, la moneda del simulador y que ya viste la animación de entrada en esta visita.",
      items: ["yvy_pref_divisa", "yvy_pref_orden", "yvy_pref_moneda", "yvy_intro", "yvy_chat (30 días)"],
      borrar: () => { quitar(localStorage, "yvy_chat"); quitar(localStorage, "yvy_pref_divisa"); quitar(localStorage, "yvy_pref_orden"); quitar(localStorage, "yvy_pref_moneda"); quitar(sessionStorage, "yvy_intro"); } },
    { id: "analiticas", nombre: "Analíticas",
      desc: "Medirían cómo se usa la web (páginas vistas, clics) para mejorarla.", items: [] },
    { id: "marketing", nombre: "Publicidad y marketing",
      desc: "Permitirían mostrarte publicidad relacionada fuera de esta web y medir campañas.", items: [] }
  ];
  const OPCIONALES = CATEGORIAS.filter(c => !c.fija && c.items.length);

  const quitar = (almacen, k) => { try { almacen.removeItem(k); } catch (e) { /* sin almacenamiento */ } };
  const oyentes = [];
  let estado = leer();

  function leer() {
    try {
      const e = JSON.parse(localStorage.getItem(CLAVE));
      if (!e || e.v !== VERSION || !e.fecha) return null;
      if (Date.now() - new Date(e.fecha).getTime() > CADUCA_MESES * 30.5 * 864e5) return null;
      return e;
    } catch (err) { return null; }
  }

  function guardar(cats, origen) {
    const antes = estado ? estado.categorias : {};
    estado = { v: VERSION, fecha: new Date().toISOString(), origen, categorias: { necesarias: true, ...cats } };
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* bloqueado: vale solo para esta página */ }
    // Al retirar un permiso se borra lo que esa categoría había guardado
    CATEGORIAS.forEach(c => { if (antes[c.id] && !estado.categorias[c.id] && c.borrar) c.borrar(); });
    activarScripts();
    oyentes.forEach(fn => { try { fn(estado.categorias); } catch (e) { console.error(e); } });
    document.dispatchEvent(new CustomEvent("yvy:consentimiento", { detail: estado.categorias }));
    ocultarBanner();
  }

  const permite = cat => cat === "necesarias" || !!(estado && estado.categorias[cat]);
  const todas = valor => Object.fromEntries(OPCIONALES.map(c => [c.id, valor]));

  // Activa los <script type="text/plain" data-consentimiento="…"> autorizados
  function activarScripts() {
    document.querySelectorAll('script[type="text/plain"][data-consentimiento]').forEach(s => {
      if (!permite(s.dataset.consentimiento)) return;
      const n = document.createElement("script");
      [...s.attributes].forEach(a => { if (!["type", "data-consentimiento", "data-src"].includes(a.name)) n.setAttribute(a.name, a.value); });
      if (s.dataset.src) n.src = s.dataset.src; else n.textContent = s.textContent;
      s.replaceWith(n);
    });
  }

  /* ---------- Banner (primera capa) ---------- */
  let banner = null;
  function crearBanner() {
    banner = document.createElement("section");
    banner.className = "galletas";
    banner.setAttribute("aria-labelledby", "galletas-t");
    banner.innerHTML = `
      <div class="wrap galletas__in">
        <div class="galletas__txt">
          <h2 id="galletas-t">Tu privacidad</h2>
          <p>Usamos almacenamiento propio, necesario para que la web funcione y, si aceptás, para recordar tus preferencias. <strong>Sin analítica ni publicidad.</strong>
            <span class="galletas__links"><a href="${B}politica-cookies/index.html">Política de cookies</a> · <a href="${B}privacidad/index.html">Política de privacidad</a></span></p>
        </div>
        <div class="galletas__btns">
          <button type="button" class="btn galletas__btn" data-galletas="aceptar">Aceptar todas</button>
          <button type="button" class="btn galletas__btn" data-galletas="rechazar">Rechazar opcionales</button>
          <button type="button" class="btn btn--linea" data-galletas="configurar">Configurar cookies</button>
        </div>
      </div>`;
    banner.addEventListener("click", e => {
      const b = e.target.closest("[data-galletas]");
      if (!b) return;
      if (b.dataset.galletas === "aceptar") guardar(todas(true), "banner");
      if (b.dataset.galletas === "rechazar") guardar(todas(false), "banner");
      if (b.dataset.galletas === "configurar") abrirPanel(b);
    });
    document.body.appendChild(banner);
    // Reserva su alto para que no tape el final de la página, el buscador ni los botones flotantes
    const medir = () => document.documentElement.style.setProperty("--galletas-alto", banner.offsetHeight + "px");
    medir();
    if ("ResizeObserver" in window) new ResizeObserver(medir).observe(banner);
    document.documentElement.classList.add("con-galletas");
  }
  function ocultarBanner() {
    if (!banner) return;
    banner.remove();
    banner = null;
    document.documentElement.classList.remove("con-galletas");
    document.documentElement.style.removeProperty("--galletas-alto");
  }

  /* ---------- Panel de configuración (segunda capa, modal) ---------- */
  let dlg = null, origenFoco = null;
  function crearPanel() {
    dlg = document.createElement("dialog");
    dlg.className = "galletas-panel";
    dlg.setAttribute("aria-labelledby", "galletas-panel-t");
    const fila = c => `
      <div class="galletas-cat">
        <div class="galletas-cat__cab">
          <h3 id="gc-${c.id}">${c.nombre}</h3>
          ${c.fija
            ? `<span class="galletas-cat__fija">Siempre activas</span>`
            : c.items.length
              ? `<label class="interruptor"><input type="checkbox" role="switch" data-cat="${c.id}" aria-labelledby="gc-${c.id}" aria-describedby="gd-${c.id}"><span aria-hidden="true"></span></label>`
              : `<span class="galletas-cat__fija galletas-cat__fija--no">No se usan</span>`}
        </div>
        <p id="gd-${c.id}">${c.desc}${!c.fija && !c.items.length ? " <strong>Hoy no usamos ninguna herramienta de este tipo;</strong> si se incorpora, te pediremos permiso antes de activarla." : ""}</p>
        ${c.items.length ? `<details><summary>Qué se guarda</summary><p class="galletas-cat__items">${c.items.map(i => `<code>${i}</code>`).join(" ")}</p><p>Detalle de cada elemento y su duración en la <a href="${B}politica-cookies/index.html">Política de cookies</a>.</p></details>` : ""}
      </div>`;
    dlg.innerHTML = `
      <form method="dialog" class="galletas-panel__caja">
        <header class="galletas-panel__cab">
          <h2 id="galletas-panel-t">Preferencias de cookies</h2>
          <button type="button" class="galletas-panel__cerrar" data-panel="cerrar" aria-label="Cerrar sin guardar">×</button>
        </header>
        <p class="galletas-panel__intro">Elegí qué permitís. Las necesarias hacen funcionar la web; el resto es opcional y podés cambiarlo cuando quieras.</p>
        <div class="galletas-panel__cats">${CATEGORIAS.map(fila).join("")}</div>
        <footer class="galletas-panel__pie">
          <button type="button" class="btn galletas__btn" data-panel="rechazar">Rechazar opcionales</button>
          <button type="button" class="btn galletas__btn" data-panel="aceptar">Aceptar todas</button>
          <button type="button" class="btn btn--oro" data-panel="guardar">Guardar preferencias</button>
        </footer>
      </form>`;
    dlg.addEventListener("click", e => {
      if (e.target === dlg) return cerrarPanel(); // clic fuera de la caja
      const b = e.target.closest("[data-panel]");
      if (!b) return;
      const accion = b.dataset.panel;
      if (accion === "cerrar") return cerrarPanel();
      if (accion === "aceptar") guardar(todas(true), "panel");
      if (accion === "rechazar") guardar(todas(false), "panel");
      if (accion === "guardar") {
        const cats = {};
        dlg.querySelectorAll("[data-cat]").forEach(i => { cats[i.dataset.cat] = i.checked; });
        guardar(cats, "panel");
      }
      cerrarPanel();
    });
    dlg.addEventListener("close", () => { if (origenFoco && origenFoco.isConnected) origenFoco.focus(); });
    document.body.appendChild(dlg);
  }
  function abrirPanel(desde) {
    if (!dlg) crearPanel();
    origenFoco = desde || document.activeElement;
    // Refleja la elección actual (sin elección, todo opcional desactivado)
    dlg.querySelectorAll("[data-cat]").forEach(i => { i.checked = permite(i.dataset.cat); });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    const primero = dlg.querySelector("[data-cat]") || dlg.querySelector("[data-panel='guardar']");
    if (primero) primero.focus();
  }
  function cerrarPanel() { if (dlg && dlg.open) dlg.close(); }

  /* ---------- Arranque ---------- */
  function iniciar() {
    activarScripts();
    // Enlaces "Preferencias de cookies" (pie de página y políticas)
    document.addEventListener("click", e => {
      const a = e.target.closest("[data-abrir-galletas]");
      if (a) { e.preventDefault(); abrirPanel(a); }
    });
    // El <head> de cada página ya reservó lugar para el banner si no hay una elección válida
    // (misma regla que leer(): versión y 12 meses). Si hay elección, se libera ese lugar.
    if (estado) { document.documentElement.classList.remove("con-galletas"); return; }
    // En Inicio, el banner aparece cuando termina la animación del logo, para no taparla
    if (window.YVYAlTerminarIntro) YVYAlTerminarIntro(crearBanner); else crearBanner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();

  return {
    VERSION, CATEGORIAS,
    permite,
    estado: () => (estado ? { ...estado.categorias } : null),
    cuando(cat, fn) {
      if (permite(cat)) { fn(); return; }
      const oir = cats => { if (cats[cat]) { oyentes.splice(oyentes.indexOf(oir), 1); fn(); } };
      oyentes.push(oir);
    },
    alCambiar: fn => oyentes.push(fn),
    abrirPanel,
    // Solo para pruebas: olvida la elección y vuelve a mostrar el banner
    reiniciar() { quitar(localStorage, CLAVE); estado = null; if (!banner) crearBanner(); }
  };
})();
