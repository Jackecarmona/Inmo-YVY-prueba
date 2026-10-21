(() => {
  const DB = window.YVYDB, S = window.YVYScoring, cfg = window.YVY_CONFIG;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const usd = n => (n ? "US$ " + Math.round(n).toLocaleString("es") : "—");
  const fecha = d => new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });

  const ESTADOS = { nuevo: "Nuevo", contactado: "Contactado", reunion: "Reunión agendada", propuesta: "Propuesta enviada", cerrado: "Cerrado", descartado: "Descartado" };
  const RECO = { lote: "Lote", pozo: "Sobre plano", terminado: "Terminado", cartera: "Cartera mixta" };
  const FUENTE = { formulario: "Simulador", chatbot: "Chatbot", contacto: "Contacto" };
  const RIESGO = { baja: "Baja", media: "Media", alta: "Alta" };

  let leads = [], selId = null;

  /* ---------- Sesión ---------- */
  // El panel no tiene login propio: se entra por el acceso único (ingresar/),
  // que solo trae aquí a las cuentas del equipo. Una cuenta de cliente vuelve a su área.
  async function arrancar() {
    const rol = await DB.rolActual();
    if (rol === "equipo") return mostrarApp();
    location.replace(rol === "cliente" ? "../cliente/index.html" : "../ingresar/index.html");
  }

  $("#btn-salir").addEventListener("click", async () => { await DB.signOut(); location.replace("../ingresar/index.html"); });

  async function mostrarApp() {
    $("#vista-app").hidden = false;
    $("#modo").textContent = DB.mode === "demo" ? "Modo demo · datos en este navegador" : "Conectado a Supabase";
    $("#btn-demo").hidden = DB.mode !== "demo";
    await cargar();
  }

  async function cargar() {
    try { leads = await DB.listLeads(); }
    catch (ex) { leads = []; $("#vacio").textContent = "No se pudieron cargar las solicitudes: " + ex.message; }
    pintar();
  }

  /* ---------- Filtros y tabla ---------- */
  ["#f-buscar", "#f-estado", "#f-reco", "#f-fuente"].forEach(id => $(id).addEventListener("input", pintar));

  function filtrados() {
    const q = $("#f-buscar").value.toLowerCase().trim();
    const est = $("#f-estado").value, reco = $("#f-reco").value, fu = $("#f-fuente").value;
    return leads.filter(l =>
      (!est || l.estado === est) && (!reco || l.recomendacion === reco) && (!fu || l.fuente === fu) &&
      (!q || [l.nombre, l.email, l.telefono, l.pais].join(" ").toLowerCase().includes(q)));
  }

  function pintarKpis() {
    const conCap = leads.filter(l => l.capital_usd);
    const media = conCap.length ? conCap.reduce((a, l) => a + +l.capital_usd, 0) / conCap.length : 0;
    const nuevos = leads.filter(l => l.estado === "nuevo").length;
    const cnt = {}; leads.forEach(l => { if (l.recomendacion) cnt[l.recomendacion] = (cnt[l.recomendacion] || 0) + 1; });
    const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const cerrados = leads.filter(l => l.estado === "cerrado").length;
    $("#kpis").innerHTML = `
      <div class="kpi"><small>Solicitudes</small><b>${leads.length}</b><span>en total</span></div>
      <div class="kpi"><small>Sin contactar</small><b>${nuevos}</b><span>estado “Nuevo”</span></div>
      <div class="kpi"><small>Capital medio</small><b>${usd(media)}</b><span>de quienes lo indicaron</span></div>
      <div class="kpi"><small>Más recomendado</small><b>${top ? RECO[top] : "—"}</b><span>${top ? cnt[top] + " solicitudes" : "sin datos"}</span></div>
      <div class="kpi"><small>Cerrados</small><b>${cerrados}</b><span>${leads.length ? Math.round(cerrados / leads.length * 100) : 0} % de conversión</span></div>`;
  }

  function pintar() {
    pintarKpis();
    const rows = filtrados();
    $("#vacio").hidden = rows.length > 0;
    $("#tbody").innerHTML = rows.map(l => `
      <tr data-id="${esc(l.id)}" class="${l.id === selId ? "sel" : ""}">
        <td><b>${esc(l.nombre || "Sin nombre")}</b><small>${esc(l.email || l.telefono || "")} · ${FUENTE[l.fuente] || "—"}</small></td>
        <td>${esc(l.pais || "—")}</td>
        <td class="num">${usd(l.capital_usd)}</td>
        <td>${RIESGO[l.riesgo] || "—"}</td>
        <td>${RECO[l.recomendacion] || "—"}</td>
        <td class="num">${l.score ? `<span class="score"><i><em style="width:${l.score}%"></em></i>${l.score}</span>` : "—"}</td>
        <td><span class="pill pill--${esc(l.estado || "nuevo")}">${ESTADOS[l.estado] || "Nuevo"}</span></td>
        <td>${fecha(l.created_at)}</td>
      </tr>`).join("");
    if (selId && !leads.find(l => l.id === selId)) { selId = null; detalleVacio(); }
  }

  $("#tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    selId = tr.dataset.id;
    document.querySelectorAll("#tbody tr").forEach(r => r.classList.toggle("sel", r === tr));
    pintarDetalle(leads.find(l => l.id === selId));
  });

  /* ---------- Detalle ---------- */
  function detalleVacio() { $("#detalle").innerHTML = `<p class="vacio">Elegí una solicitud para ver el detalle y contactar al inversor.</p>`; }

  function pintarDetalle(l) {
    if (!l) return detalleVacio();
    const tel = String(l.telefono || "").replace(/\D/g, "");
    const reco = l.recomendacion ? S.PRODUCTS[l.recomendacion] : null;
    const msg = `Hola ${l.nombre || ""}, te escribe YVY Capital. Vimos tu solicitud${reco ? " y el modelo recomienda: " + reco.nombre : ""}. ¿Cuándo te viene bien una videollamada?`;
    const filas = [
      ["Email", l.email], ["WhatsApp", l.telefono], ["País", l.pais],
      ["Capital", l.capital ? (l.moneda === "EUR" ? Math.round(l.capital).toLocaleString("es") + " € · " : "") + usd(l.capital_usd) : null],
      ["Objetivo", l.objetivo], ["Riesgo", RIESGO[l.riesgo]], ["Horizonte", l.horizonte ? l.horizonte + " años" : null],
      ["Test de perfil", l.test_puntaje ? l.test_perfil + " · " + l.test_puntaje + "/100" : null],
      ["Pago", l.financiacion], ["Experiencia", l.experiencia], ["Origen", FUENTE[l.fuente]], ["Mensaje", l.mensaje],
      ["Fecha", new Date(l.created_at).toLocaleString("es")]
    ].filter(f => f[1]);
    $("#detalle").innerHTML = `
      <div><h2>${esc(l.nombre || "Sin nombre")}</h2><span class="pill pill--${esc(l.estado || "nuevo")}">${ESTADOS[l.estado] || "Nuevo"}</span></div>
      ${reco ? `<div class="reco">Recomendación: <b>${esc(reco.nombre)}</b><br>Perfil ${esc(l.perfil || "")} · idoneidad ${l.score}/100</div>` : ""}
      <dl>${filas.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      <div class="acc">
        ${tel ? `<a class="b b--wa" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent(msg)}">WhatsApp</a>` : ""}
        ${l.email ? `<a class="b b--linea" href="mailto:${esc(l.email)}?subject=${encodeURIComponent("Tu propuesta de inversión · YVY Capital")}&body=${encodeURIComponent(msg)}">Email</a>` : ""}
        ${reco ? `<button class="b b--linea" id="d-pdf" type="button">Descargar PDF</button>` : ""}
      </div>
      <div><label for="d-estado">Estado</label><select id="d-estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${k === (l.estado || "nuevo") ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div><label for="d-notas">Notas internas</label><textarea id="d-notas" rows="4" placeholder="Ej.: llamada el martes, interesada en Torre Mburucuyá.">${esc(l.notas || "")}</textarea></div>
      <div class="acc"><button class="b b--oro" id="d-guardar" type="button">Guardar cambios</button><button class="b b--mal" id="d-borrar" type="button">Eliminar</button></div>
      <p class="guardado" id="d-ok"></p>`;

    if (reco) $("#d-pdf").addEventListener("click", () => window.YVYPdf.download(l));
    $("#d-guardar").addEventListener("click", async () => {
      const patch = { estado: $("#d-estado").value, notas: $("#d-notas").value };
      try { await DB.updateLead(l.id, patch); Object.assign(l, patch); pintar(); pintarDetalle(l); $("#d-ok").textContent = "Cambios guardados."; }
      catch (ex) { $("#d-ok").textContent = "No se pudo guardar: " + ex.message; }
    });
    let confirmar = false;
    $("#d-borrar").addEventListener("click", async e => {
      if (!confirmar) { confirmar = true; e.target.textContent = "Confirmar eliminación"; return; }
      try { await DB.deleteLead(l.id); leads = leads.filter(x => x.id !== l.id); selId = null; pintar(); detalleVacio(); }
      catch (ex) { $("#d-ok").textContent = "No se pudo eliminar: " + ex.message; }
    });
  }

  /* ---------- Exportar CSV ---------- */
  $("#btn-csv").addEventListener("click", () => {
    const cols = ["created_at", "nombre", "email", "telefono", "pais", "capital", "moneda", "capital_usd", "objetivo", "riesgo", "horizonte", "financiacion", "experiencia", "recomendacion", "score", "perfil", "test_perfil", "test_puntaje", "fuente", "estado", "notas", "mensaje"];
    const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const csv = [cols.join(";"), ...filtrados().map(l => cols.map(c => q(l[c])).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "yvy-solicitudes-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
  });

  /* ---------- Datos de ejemplo (solo modo demo) ---------- */
  $("#btn-demo").addEventListener("click", async () => {
    const base = [
      { nombre: "Lucía Fernández (ejemplo)", email: "lucia@ejemplo.com", telefono: "+34 611 222 333", pais: "España", capital: 50000, moneda: "EUR", objetivo: "renta", riesgo: "media", horizonte: "3-5", financiacion: "cuotas", experiencia: "local", fuente: "formulario", estado: "nuevo" },
      { nombre: "Martín Gómez (ejemplo)", email: "martin@ejemplo.com", telefono: "+54 9 11 5555 0000", pais: "Argentina", capital: 300000, moneda: "USD", objetivo: "diversificar", riesgo: "baja", horizonte: "5-10", financiacion: "contado", experiencia: "exterior", fuente: "formulario", estado: "reunion" },
      { nombre: "Rafael Souza (ejemplo)", telefono: "+55 11 98888 7777", pais: "Brasil", capital: 35000, moneda: "USD", objetivo: "plusvalia", riesgo: "alta", horizonte: "5-10", financiacion: "cuotas", fuente: "chatbot", estado: "contactado" },
      { nombre: "Carmen Ruiz (ejemplo)", email: "carmen@ejemplo.com", pais: "España", capital: 150000, moneda: "EUR", objetivo: "uso", riesgo: "media", horizonte: "5-10", financiacion: "contado", experiencia: "no", fuente: "formulario", estado: "propuesta" }
    ];
    for (const b of base) {
      b.capital_usd = S.toUsd(b.capital, b.moneda);
      const ev = S.evaluate(b);
      await DB.insertLead({ ...b, consentimiento: true, recomendacion: ev.top, score: ev.scores[ev.top], scores: ev.scores, perfil: ev.perfil });
    }
    await cargar();
  });

  /* ---------- Pestañas: solicitudes y propiedades ---------- */
  let propsCargadas = false;
  document.querySelectorAll("[data-vista]").forEach(t => t.addEventListener("click", () => {
    const v = t.dataset.vista;
    document.querySelectorAll("[data-vista]").forEach(x => x.setAttribute("aria-selected", x === t));
    $("#vista-solicitudes").hidden = v !== "solicitudes";
    $("#vista-propiedades").hidden = v !== "propiedades";
    $("#vista-usuarios").hidden = v !== "usuarios";
    $("#btn-csv").hidden = v !== "solicitudes";
    $("#btn-demo").hidden = v !== "solicitudes" || DB.mode !== "demo";
    if (v === "propiedades" && !propsCargadas) { propsCargadas = true; cargarProps(); }
    if (v === "usuarios") cargarUsuarios();
  }));

  /* ---------- Usuarios y roles ---------- */
  async function cargarUsuarios() {
    const vacio = $("#usuarios-vacio");
    let us;
    try { us = await DB.usuarios(); }
    catch (ex) { us = []; vacio.textContent = "No se pudo cargar la lista. ¿Ejecutaste supabase/schema.sql?"; }
    if (us === null) {
      $("#tb-usuarios").innerHTML = "";
      vacio.hidden = false;
      vacio.textContent = "En modo demo no hay cuentas reales: el equipo se define en js/config.js (demoEquipo). Al conectar Supabase, aquí se cambian los roles.";
      return;
    }
    vacio.hidden = us.length > 0;
    if (!us.length && !vacio.textContent) vacio.textContent = "Todavía no hay cuentas.";
    $("#tb-usuarios").innerHTML = us.map(u => `
      <tr data-id="${esc(u.id)}">
        <td><b>${esc(u.nombre || "—")}</b>${u.yo ? "<small>Vos</small>" : ""}</td>
        <td>${esc(u.email)}</td>
        <td><select data-rol aria-label="Rol de ${esc(u.email)}"${u.yo ? " disabled title=\"No podés cambiar tu propio rol\"" : ""}>
          <option value="usuario"${u.rol !== "admin" ? " selected" : ""}>Cliente</option>
          <option value="admin"${u.rol === "admin" ? " selected" : ""}>Administrador</option>
        </select></td>
      </tr>`).join("");
  }
  $("#tb-usuarios").addEventListener("change", async e => {
    if (!e.target.matches("[data-rol]")) return;
    const sel = e.target, email = sel.closest("tr").children[1].textContent;
    try { await DB.cambiarRol(sel.closest("tr").dataset.id, sel.value); $("#usuarios-msg").textContent = `${email} ahora es ${sel.value === "admin" ? "administrador" : "cliente"}.`; }
    catch (ex) { sel.value = sel.value === "admin" ? "usuario" : "admin"; $("#usuarios-msg").textContent = ex.message; }
  });

  /* ---------- Propiedades (se publican en la web) ---------- */
  const MAX_FOTOS = 6;
  const dinero = (n, m) => (m === "EUR" ? Math.round(n).toLocaleString("es") + " €" : "US$ " + Math.round(n).toLocaleString("es"));
  let props = [];

  async function cargarProps() {
    try { props = await DB.propiedades(true); }
    catch (ex) { props = []; $("#props-msg").textContent = "No se pudieron cargar las propiedades. ¿Está creada la tabla «propiedades» en Supabase?"; }
    pintarProps();
  }

  function pintarProps() {
    $("#props-vacio").hidden = props.length > 0;
    $("#tb-props").innerHTML = props.map(p => `
      <tr data-id="${esc(p.id)}">
        <td>${p.fotos && p.fotos.length ? `<img src="${esc(DB.urlFoto(p.fotos[0]))}" alt="">` : `<span class="sinfoto">Sin foto</span>`}</td>
        <td><b>${esc(p.codigo || "—")}</b></td>
        <td>${esc(p.tipo)}<small>${p.operacion === "alquiler" ? "Alquiler" : "Venta"} · ${p.condicion === "nuevo" ? "A estrenar" : "Usado"}</small></td>
        <td>${esc(p.ubicacion)}<small>${esc(p.ciudad)}, ${esc(p.pais)}</small></td>
        <td class="num">${Number(p.metros).toLocaleString("es")} m²</td>
        <td class="num">${dinero(p.precio, p.moneda)}${p.operacion === "alquiler" ? " /mes" : ""}</td>
        <td><select data-estado aria-label="Publicación de ${esc(p.codigo || p.tipo)}">
          <option value="publicada"${p.estado === "publicada" ? " selected" : ""}>Publicada</option>
          <option value="borrador"${p.estado !== "publicada" ? " selected" : ""}>Borrador</option>
        </select></td>
        <td><button class="b b--mal" type="button" data-borrar>Eliminar</button></td>
      </tr>`).join("");
  }

  $("#tb-props").addEventListener("change", async e => {
    if (!e.target.matches("[data-estado]")) return;
    const p = props.find(x => x.id === e.target.closest("tr").dataset.id);
    try { await DB.actualizarPropiedad(p.id, { estado: e.target.value }); p.estado = e.target.value; $("#props-msg").textContent = e.target.value === "publicada" ? "Publicada: ya se ve en la web." : "Pasó a borrador: ya no se ve en la web."; }
    catch (ex) { e.target.value = p.estado; $("#props-msg").textContent = "No se pudo cambiar el estado."; }
  });
  $("#tb-props").addEventListener("click", async e => {
    const b = e.target.closest("[data-borrar]");
    if (!b) return;
    const p = props.find(x => x.id === b.closest("tr").dataset.id);
    if (b.dataset.confirmar !== "1") { b.dataset.confirmar = "1"; b.textContent = "¿Seguro?"; return; }
    try { await DB.borrarPropiedad(p); props = props.filter(x => x !== p); pintarProps(); $("#props-msg").textContent = "Propiedad eliminada."; }
    catch (ex) { $("#props-msg").textContent = "No se pudo eliminar."; }
  });

  // Reduce cada foto antes de subirla (más rápido y no llena el almacenamiento)
  function reducir(file, lado) {
    return new Promise((ok, ko) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, lado / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => (b ? ok(b) : ko(new Error("No se pudo procesar la imagen."))), "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); ko(new Error("No se pudo leer una de las imágenes.")); };
      img.src = url;
    });
  }

  const dlg = $("#dlg-prop"), fp = $("#form-prop"), errProp = $("#err-prop");
  $("#btn-nueva-prop").addEventListener("click", () => { fp.reset(); $("#prev-fotos").textContent = ""; errProp.textContent = ""; $("#lbl-precio").textContent = "Precio"; dlg.showModal(); });
  $("#cancelar-prop").addEventListener("click", () => dlg.close());
  fp.elements.operacion.addEventListener("change", e => { $("#lbl-precio").textContent = e.target.value === "alquiler" ? "Alquiler por mes" : "Precio"; });
  fp.elements.fotos.addEventListener("change", () => {
    const fs = [...fp.elements.fotos.files];
    errProp.textContent = fs.length > MAX_FOTOS ? `Podés subir como máximo ${MAX_FOTOS} fotos.` : "";
    $("#prev-fotos").innerHTML = "";
    fs.slice(0, MAX_FOTOS).forEach(f => { const im = document.createElement("img"); im.alt = ""; im.src = URL.createObjectURL(f); im.onload = () => URL.revokeObjectURL(im.src); $("#prev-fotos").appendChild(im); });
  });

  fp.addEventListener("submit", async e => {
    e.preventDefault();
    const x = fp.elements, n = v => (v === "" ? null : Number(v));
    const d = {
      codigo: x.codigo.value.trim(), operacion: x.operacion.value, tipo: x.tipo.value, condicion: x.condicion.value,
      metros: Number(x.metros.value), anio_construccion: n(x.anio.value.trim()),
      habitaciones: n(x.habitaciones.value) ?? 0, banos: n(x.banos.value) ?? 0,
      garaje: x.garaje.value === "si", trastero: x.trastero.value === "si",
      ubicacion: x.ubicacion.value.trim(), ciudad: x.ciudad.value.trim(), pais: x.pais.value.trim(),
      precio: Number(x.precio.value), moneda: x.moneda.value, estado: x.estado.value, descripcion: x.descripcion.value.trim()
    };
    if (!d.descripcion) delete d.descripcion;
    const fallo = t => { errProp.textContent = t; };
    if (!d.codigo) return fallo("Escribí el código del inmueble (por ejemplo YVY-011).");
    if (!(d.metros > 0)) return fallo("Indicá la superficie en m².");
    if (![d.habitaciones, d.banos].every(v => Number.isInteger(v) && v >= 0 && v <= 50)) return fallo("Dormitorios y baños tienen que ser números enteros.");
    if (d.anio_construccion !== null && !(Number.isInteger(d.anio_construccion) && d.anio_construccion >= 1800 && d.anio_construccion <= 2100)) return fallo("El año de construcción tiene que estar entre 1800 y 2100.");
    if (x.precio.value === "" || !(d.precio >= 0)) return fallo("Indicá un precio válido.");
    if (!d.ubicacion || !d.ciudad || !d.pais) return fallo("Completá la zona, la ciudad y el país.");
    const files = [...x.fotos.files];
    if (files.length > MAX_FOTOS) return fallo(`Podés subir como máximo ${MAX_FOTOS} fotos.`);
    const btn = $("#guardar-prop");
    btn.disabled = true; btn.textContent = "Guardando…"; errProp.textContent = "";
    try {
      // En modo demo las fotos quedan en el navegador: se guardan más chicas
      const blobs = await Promise.all(files.map(f => reducir(f, DB.mode === "demo" ? 1000 : 1600)));
      const r = await DB.crearPropiedad(d, blobs);
      dlg.close();
      await cargarProps();
      $("#props-msg").textContent = r.fallos ? `Propiedad guardada, pero ${r.fallos} foto(s) no se pudieron subir.` : d.estado === "publicada" ? "Propiedad publicada: ya aparece en la web." : "Guardada como borrador.";
    } catch (ex) { fallo(ex.message); }
    btn.disabled = false; btn.textContent = "Guardar";
  });

  arrancar();
})();
