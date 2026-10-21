// Apartado "Propiedades": tarjetas, filtros, favoritos y ficha completa con galería y ubicación.
(() => {
  const BASE = window.YVY_CASAS || [];
  let CASAS = BASE;
  const cfg = window.YVY_CONFIG;
  const S = window.YVYScoring;
  const DB = window.YVYDB;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Precios en la moneda que eligió el visitante (js/moneda.js); sin ese módulo, en su moneda original
  const M = window.YVYMoneda;
  const dinero = (c, n) => M ? M.formatear(n, c.moneda || "USD") : c.moneda === "EUR" ? miles(n) + " €" : "US$ " + miles(n);
  const rango = (c, a, b) => dinero(c, a) + " – " + dinero(c, b).replace(/^≈ /, "");
  const convertido = c => !!(M && c.precio && M.actual() !== (c.moneda || "USD"));
  const alquiler = c => c.operacion === "alquiler";
  const precioTxt = c => c.precio ? dinero(c, c.precio) + (alquiler(c) ? " /mes" : "") : "Consultar precio";
  const precioUsd = c => (c.moneda === "EUR" ? c.precio * (cfg.eurUsd || 1.1) : c.precio);
  const ciudad = c => c.ciudad || "San Bernardino";
  const B = window.YVY_BASE || "";
  // Las casas de la cartera inicial tienen sus fotos en assets/props/<id>/; las del Back Office traen sus URL
  const fotos = c => c.imgs || Array.from({ length: c.fotos }, (_, i) => `${B}assets/props/${c.id}/${String(i + 1).padStart(2, "0")}.jpg`);
  const SIN_FOTO = `<span class="pr-sinfoto" aria-hidden="true"><svg class="logo-svg" viewBox="-1 -1 50 50"><rect x="1" y="1" width="46" height="46" rx="6"/><path d="M10 30.2 24 13.2l14 17M13.6 30.4 24 18.6l10.4 11.8M9.6 34.2h28.8M13 37.6h22"/></svg><small>Fotos próximamente</small></span>`;
  const waLink = txt => "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(txt);
  const ETIQ = { vista: "Vista al lago", estrenar: "A estrenar", amoblada: "Amoblada", renta: "Ideal renta temporal" };
  const ICONO_FAV = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.8 1.1-1.7 2.7-2.8 4.7-2.8 3.3 0 5.7 3.1 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  const lista = $("#lista-casas");
  if (!lista) return;
  let filtro = "todas", orden = "destacadas", favs = [];
  // Orden elegido en otra visita (solo con consentimiento de preferencias)
  const ordenGuardado = window.YVYPref && YVYPref.leer("yvy_pref_orden");
  if (ordenGuardado && $(`#casas-orden option[value="${ordenGuardado}"]`)) { orden = ordenGuardado; $("#casas-orden").value = orden; }

  // Búsqueda que llega desde el buscador de la portada: ?op=venta&tipo=Casa&ciudad=…&max=…&dorm=3
  // Las casas de la cartera inicial son todas casas en venta en San Bernardino.
  const params = new URLSearchParams(location.search);
  let busqueda = {
    op: params.get("op") || "", tipo: params.get("tipo") || "", ciudad: params.get("ciudad") || "",
    max: +params.get("max") || 0, dorm: +params.get("dorm") || 0
  };
  const hayBusqueda = () => Object.values(busqueda).some(Boolean);
  const cumpleBusqueda = c => {
    const b = busqueda;
    if (b.op && (c.operacion || "venta") !== b.op) return false;
    if (b.tipo && (c.tipo || "Casa") !== b.tipo) return false;
    if (b.ciudad && ciudad(c) !== b.ciudad) return false;
    if (b.max && !(c.precio && precioUsd(c) <= b.max)) return false;
    if (b.dorm && !(c.dorm >= b.dorm)) return false;
    return true;
  };
  function pintarBusqueda() {
    let barra = $("#pr-busqueda");
    if (!hayBusqueda()) { if (barra) barra.remove(); return; }
    if (!barra) {
      barra = document.createElement("div");
      barra.id = "pr-busqueda"; barra.className = "pr-busqueda"; barra.setAttribute("role", "status");
      $(".pr-barra").insertAdjacentElement("beforebegin", barra);
    }
    const b = busqueda, partes = [
      b.op && (b.op === "alquiler" ? "En alquiler" : "En venta"), b.tipo, b.ciudad,
      b.max && "Hasta " + dinero({}, b.max) + (b.op === "alquiler" ? " / mes" : ""), b.dorm && b.dorm + "+ dormitorios"
    ].filter(Boolean);
    barra.innerHTML = `<span>Tu búsqueda:</span> ${partes.map(p => `<b>${esc(p)}</b>`).join("")} <button type="button" class="pr-busqueda__quitar">Quitar búsqueda ×</button>`;
    $(".pr-busqueda__quitar", barra).addEventListener("click", () => {
      busqueda = { op: "", tipo: "", ciudad: "", max: 0, dorm: 0 };
      try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { /* algunos visores no lo permiten */ }
      pintarBusqueda(); pintar();
    });
  }

  // Rentabilidad orientativa de alquiler temporal (supuestos visibles en la ficha)
  function numerosInversor(c) {
    if (!c.precio || alquiler(c)) return null;
    const bruto = [0.05, 0.07], gestion = 0.20, irp = 0.04;
    return {
      m2: c.precio / c.construido,
      rentaAnual: bruto.map(b => c.precio * b),
      netoPct: bruto.map(b => b * (1 - gestion) - b * irp),
      gastosCompra: [c.precio * 0.03, c.precio * 0.04]
    };
  }

  /* ---------- Tarjetas ---------- */
  function pintar() {
    let items = CASAS.filter(c => cumpleBusqueda(c) && (
      filtro === "todas" ? true :
      filtro === "hasta300" ? c.precio && !alquiler(c) && precioUsd(c) <= 300000 :
      c.etiquetas.includes(filtro)));
    if (orden === "precio-asc") items = [...items].sort((a, b) => (a.precio ? precioUsd(a) : 9e9) - (b.precio ? precioUsd(b) : 9e9));
    if (orden === "precio-desc") items = [...items].sort((a, b) => (b.precio ? precioUsd(b) : 0) - (a.precio ? precioUsd(a) : 0));
    if (orden === "superficie") items = [...items].sort((a, b) => b.construido - a.construido);
    $("#casas-cuenta").textContent = items.length + (items.length === 1 ? " propiedad" : " propiedades");
    // Aviso de conversión cuando se ven los precios en otra moneda
    let notaMoneda = $("#pr-moneda-nota");
    if (!notaMoneda) { notaMoneda = document.createElement("p"); notaMoneda.id = "pr-moneda-nota"; notaMoneda.className = "pr-fuente"; lista.insertAdjacentElement("afterend", notaMoneda); }
    notaMoneda.hidden = !M || M.actual() === "USD";
    if (M) notaMoneda.textContent = M.nota();
    // Tarjetas anchas para que la grilla de 3 columnas cierre sin huecos
    const anchas = (3 - items.length % 3) % 3;
    const esAncha = i => (anchas >= 1 && i === 0) || (anchas === 2 && i === items.length - 1);
    lista.innerHTML = items.map((c, i) => {
      const fs = fotos(c);
      const chips = [...(alquiler(c) ? ["En alquiler"] : []), ...c.etiquetas.map(t => ETIQ[t])].slice(0, 2);
      return `
      <article class="pr-card${esAncha(i) ? " pr-card--ancha" : ""}" data-id="${c.id}">
        <button class="pr-card__media" type="button" data-abrir="${c.id}" aria-label="Ver ficha de ${esc(c.nombre)}">
          ${fs.length ? `<img src="${esc(fs[0])}" alt="${esc(c.nombre)}" loading="lazy">` : SIN_FOTO}
          ${fs.length > 1 ? `<img class="alt" src="${esc(fs[1])}" alt="" loading="lazy">` : ""}
          <span class="pr-card__chips">${chips.map(t => `<span>${t}</span>`).join("")}</span>
          ${fs.length ? `<span class="pr-card__fotos">${fs.length} ${fs.length === 1 ? "foto" : "fotos"}</span>` : ""}
          <span class="pr-card__sobre">
            <span class="pr-card__zona">${esc(c.zona)}</span>
            <h3>${esc(c.nombre)}</h3>
            <span class="pr-card__precio">${precioTxt(c)}${c.precio && !alquiler(c) && c.construido ? `<small>${dinero(c, c.precio / c.construido)}/m²</small>` : ""}</span>
          </span>
        </button>
        <ul class="pr-card__specs">
          <li><b>${c.construido}</b>m² const.</li>
          <li><b>${c.dorm}</b>dormitorios</li>
          <li><b>${c.banos}</b>baños</li>
          <li><b>${c.cocheras}</b>cocheras</li>
        </ul>
        <div class="pr-card__pie">
          <button class="pr-card__ver" type="button" data-abrir="${c.id}">Ver ficha</button>
          <span class="pr-card__iconos">
            <button class="icono-btn" type="button" data-fav="${c.id}" aria-pressed="${favs.includes(c.id)}" aria-label="Guardar en favoritos">${ICONO_FAV}</button>
            <a class="icono-btn icono-btn--wa" target="_blank" rel="noopener" aria-label="Consultar por WhatsApp" href="${waLink("Hola, me interesa " + c.nombre + (c.codigo ? " (cód. " + c.codigo + ")" : "") + " (" + c.zona + ", " + ciudad(c) + "). ¿Me envían más información?")}"><svg><use href="#i-wa"/></svg></a>
          </span>
        </div>
      </article>`;
    }).join("") || `<p class="pr-vacio">No hay propiedades con ese filtro${hayBusqueda() ? ` y tu búsqueda. Probá quitando algún criterio o <a href="${waLink("Hola, busco una propiedad y no encontré lo que necesito en la web.")}" target="_blank" rel="noopener">contanos qué buscás</a>` : ""}.</p>`;
  }

  pintarBusqueda();
  // Al cambiar la moneda (o llegar las cotizaciones del día) se vuelven a pintar los precios
  if (M) M.alCambiar(() => {
    pintarBusqueda(); pintar();
    if (actual && !modal.hidden) abrir(actual.id);
  });
  // Llegando desde el buscador, se va directo a los resultados
  if (hayBusqueda() && !location.hash) requestAnimationFrame(() => $("#propiedades").scrollIntoView());
  DB.favoritos().then(f => { favs = f; pintar(); }).catch(() => pintar());
  pintar();

  // Suma las propiedades publicadas desde el Back Office, delante de la cartera inicial
  DB.propiedades().then(rows => {
    if (!rows.length) return;
    CASAS = [...rows.map(p => window.YVYCasaDesdeDB(p, r => DB.urlFoto(r))), ...BASE];
    const total = $(".pr-resumen b");
    if (total) { total.textContent = CASAS.length; total.nextElementSibling.textContent = "propiedades"; }
    pintar();
    desdeHash();
  }).catch(err => console.warn("No se pudieron cargar las propiedades de la base de datos:", err));

  $$("[data-filtro-casa]").forEach(b => b.addEventListener("click", () => {
    filtro = b.dataset.filtroCasa;
    $$("[data-filtro-casa]").forEach(x => x.setAttribute("aria-pressed", x === b));
    pintar();
  }));
  $("#casas-orden").addEventListener("change", e => {
    orden = e.target.value; pintar();
    if (window.YVYPref) YVYPref.guardar("yvy_pref_orden", orden);
  });
  lista.addEventListener("click", async e => {
    const fav = e.target.closest("[data-fav]");
    if (fav) return alternarFav(fav.dataset.fav, fav);
    const b = e.target.closest("[data-abrir]");
    if (b) abrir(b.dataset.abrir);
  });

  async function alternarFav(id, boton) {
    try {
      const puesto = await DB.alternarFavorito(id);
      favs = puesto ? [...favs, id] : favs.filter(x => x !== id);
      $$(`[data-fav="${id}"]`).forEach(x => x.setAttribute("aria-pressed", puesto));
      aviso(puesto ? "Guardada en tu área de clientes." : "Quitada de favoritos.");
    } catch (err) {
      if (err.message === "sin-sesion") aviso(`<a href="${B}ingresar/index.html">Ingresá o creá tu cuenta</a> para guardar favoritos.`);
      else aviso("No se pudo guardar. Intentá de nuevo.");
    }
  }
  function aviso(html) {
    let t = $("#pr-aviso");
    if (!t) { t = document.createElement("div"); t.id = "pr-aviso"; t.className = "pr-aviso"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = html; t.hidden = false;
    clearTimeout(aviso.t); aviso.t = setTimeout(() => (t.hidden = true), 4200);
  }

  /* ---------- Ficha completa ---------- */
  const modal = $("#pr-modal");
  let actual = null, idxFoto = 1, tabActual = "fotos", ultimoFoco = null;

  function abrir(id) {
    actual = CASAS.find(c => c.id === id);
    if (!actual) return;
    ultimoFoco = document.activeElement;
    idxFoto = 1;
    const c = actual, n = numerosInversor(c);
    const fila = (a, b) => `<div><dt>${a}</dt><dd>${b}</dd></div>`;
    $("#pr-modal-titulo").textContent = c.nombre;
    $("#pr-modal-zona").textContent = c.zona + " · " + ciudad(c);
    $("#pr-modal-precio").innerHTML = precioTxt(c) + (convertido(c) ? `<small>Precio: ${M.original(c.precio, c.moneda || "USD")}${alquiler(c) ? " /mes" : ""}</small>` : "") + (c.precioNota ? `<small>${esc(c.precioNota)}</small>` : "");
    const tags = (titulo, items) => items.length ? `<section><h4>${titulo}</h4><ul class="pr-tags">${items.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>` : "";
    const inversor = n ? `<section class="pr-inversor">
        <h4>Para el inversor</h4>
        <div class="pr-inversor__grid">
          <div><span>Precio por m²</span><b>${dinero(c, n.m2)}</b></div>
          <div><span>Alquiler temporal bruto / año</span><b>${rango(c, n.rentaAnual[0], n.rentaAnual[1])}</b></div>
          <div><span>Rentabilidad neta estimada</span><b>${S.pct(n.netoPct[0])} – ${S.pct(n.netoPct[1])}</b></div>
          <div><span>Gastos de compra (3–4 %)</span><b>${rango(c, n.gastosCompra[0], n.gastosCompra[1])}</b></div>
        </div>
        <p class="pr-nota">Supuestos: alquiler temporal del 5 % (prudente) al 7 % (optimista) del valor por año, gestión del 20 % e IRP efectivo del 4 % del alquiler. Estimación orientativa.</p>
      </section>` : alquiler(c) ? "" : `<section class="pr-inversor"><h4>Para el inversor</h4><p class="pr-nota">El precio se informa a pedido. Te enviamos el análisis de rentabilidad junto con el precio.</p></section>`;
    $("#pr-info").innerHTML = `
      <dl class="pr-datos">
        ${c.codigo ? fila("Código", esc(c.codigo)) : ""}
        ${fila("Construido", c.construido + " m²")}
        ${fila("Terreno", c.terreno ? miles(c.terreno) + " m²" : c.db ? "—" : "Condominio")}
        ${fila("Dormitorios", c.dorm)}
        ${fila("Baños", c.banos)}
        ${fila("Cocheras", c.cocheras)}
        ${c.niveles ? fila("Niveles", c.niveles) : ""}
        ${fila("Estado", esc(c.estado) + (c.anio ? " · " + c.anio : ""))}
        ${fila("Operación", alquiler(c) ? "Alquiler" : "Venta")}
      </dl>
      ${inversor}
      ${c.descripcion.length ? `<section><h4>Descripción</h4>${c.descripcion.map(p => `<p>${esc(p)}</p>`).join("")}</section>` : ""}
      ${tags("Interior", c.interior)}
      ${tags("Exterior y amenities", c.exterior)}
      <div class="pr-cta">
        <a class="btn btn--wa" target="_blank" rel="noopener" href="${waLink("Hola, quiero agendar una visita (presencial o por videollamada) a " + c.nombre + (c.codigo ? " (cód. " + c.codigo + ")" : "") + ", " + ciudad(c) + ".")}"><svg><use href="#i-wa"/></svg>Agendar visita</a>
        ${alquiler(c) ? "" : `<button class="btn btn--oro" type="button" id="pr-simular">Simular inversión</button>`}
        <button class="btn btn--linea" type="button" data-fav="${c.id}" aria-pressed="${favs.includes(c.id)}">Guardar en favoritos</button>
      </div>`;
    $("#pr-info [data-fav]").addEventListener("click", e => alternarFav(c.id, e.currentTarget));
    const sim = $("#pr-simular");
    if (sim) sim.addEventListener("click", () => window.YVYIrAlSimulador({ capital: c.precio ? Math.round(precioUsd(c)) : 300000, moneda: "USD", financiacion: "contado" }));
    $("#pr-tab-mapa").hidden = !c.mapa;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    cambiarTab("fotos");
    $("#pr-cerrar").focus();
  }

  function cerrar() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (ultimoFoco) ultimoFoco.focus();
    if (location.hash) { try { history.replaceState(null, "", location.pathname); } catch (e) { /* algunos visores no lo permiten */ } }
  }

  // Enlace directo a una ficha: propiedades/index.html#vista-lago
  const desdeHash = () => { const id = location.hash.slice(1); if (CASAS.some(c => c.id === id)) abrir(id); };
  addEventListener("hashchange", desdeHash);
  desdeHash();
  $("#pr-cerrar").addEventListener("click", cerrar);
  modal.addEventListener("click", e => { if (e.target === modal) cerrar(); });
  document.addEventListener("keydown", e => {
    if (modal.hidden) return;
    if (e.key === "Escape") cerrar();
    if (tabActual === "fotos" && e.key === "ArrowRight") verFoto(idxFoto + 1);
    if (tabActual === "fotos" && e.key === "ArrowLeft") verFoto(idxFoto - 1);
  });

  $$("[data-pr-tab]").forEach(b => b.addEventListener("click", () => cambiarTab(b.dataset.prTab)));
  function cambiarTab(t) {
    tabActual = t;
    $$("[data-pr-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.prTab === t));
    const escena = $("#pr-escena");
    if (t === "fotos") pintarGaleria();
    if (t === "mapa") escena.innerHTML = `<figure class="pr-mapa"><img src="${B}assets/props/${actual.id}/mapa.jpg" alt="Mapa con la ubicación aproximada de ${esc(actual.nombre)}"><figcaption>Ubicación aproximada · ${esc(actual.zona)}. La dirección exacta se comparte al agendar la visita.</figcaption></figure>`;
  }

  function pintarGaleria() {
    const c = actual, fs = fotos(c);
    if (!fs.length) { $("#pr-escena").innerHTML = `<div class="pr-galeria"><div class="pr-galeria__principal">${SIN_FOTO}</div></div>`; return; }
    $("#pr-escena").innerHTML = `
      <div class="pr-galeria">
        <div class="pr-galeria__principal">
          <img id="pr-foto" src="${esc(fs[idxFoto - 1])}" alt="${esc(c.nombre)}, foto ${idxFoto} de ${fs.length}">
          <button class="pr-flecha pr-flecha--izq" type="button" aria-label="Foto anterior" id="pr-ant">‹</button>
          <button class="pr-flecha pr-flecha--der" type="button" aria-label="Foto siguiente" id="pr-sig">›</button>
          <span class="pr-contador" id="pr-contador">${idxFoto} / ${fs.length}</span>
        </div>
        <div class="pr-miniaturas">
          ${fs.map((src, i) => `<button type="button" data-foto="${i + 1}" aria-label="Foto ${i + 1}" ${i + 1 === idxFoto ? 'aria-current="true"' : ""}><img src="${esc(src)}" alt="" loading="lazy"></button>`).join("")}
        </div>
      </div>`;
    $("#pr-ant").addEventListener("click", () => verFoto(idxFoto - 1));
    $("#pr-sig").addEventListener("click", () => verFoto(idxFoto + 1));
    $(".pr-miniaturas").addEventListener("click", e => { const b = e.target.closest("[data-foto]"); if (b) verFoto(+b.dataset.foto); });
    let x0 = null;
    const p = $(".pr-galeria__principal");
    p.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    p.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) verFoto(idxFoto + (dx < 0 ? 1 : -1)); x0 = null; });
  }
  function verFoto(n) {
    const c = actual, fs = fotos(c);
    if (!fs.length) return;
    idxFoto = ((n - 1 + fs.length) % fs.length) + 1;
    const img = $("#pr-foto");
    if (!img) return;
    const nueva = img.cloneNode();
    nueva.src = fs[idxFoto - 1];
    nueva.alt = `${c.nombre}, foto ${idxFoto} de ${fs.length}`;
    img.replaceWith(nueva);
    $("#pr-contador").textContent = `${idxFoto} / ${fs.length}`;
    $$(".pr-miniaturas [data-foto]").forEach(b => (+b.dataset.foto === idxFoto ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current")));
  }
})();
