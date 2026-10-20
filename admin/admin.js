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
  $("#login-modo").textContent = DB.mode === "demo"
    ? "Modo demo: sin base de datos conectada. Contraseña de prueba en js/config.js."
    : "Ingresá con tu usuario de Supabase.";

  async function arrancar() {
    if (await DB.hasSession()) mostrarApp(); else { $("#vista-login").hidden = false; $("#vista-app").hidden = true; }
  }

  $("#form-login").addEventListener("submit", async e => {
    e.preventDefault();
    $("#login-err").textContent = "";
    try { await DB.signIn($("#l-email").value.trim(), $("#l-pass").value); mostrarApp(); }
    catch (ex) { $("#login-err").textContent = ex.message; }
  });
  $("#btn-salir").addEventListener("click", async () => { await DB.signOut(); location.reload(); });

  async function mostrarApp() {
    $("#vista-login").hidden = true;
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
    const cols = ["created_at", "nombre", "email", "telefono", "pais", "capital", "moneda", "capital_usd", "objetivo", "riesgo", "horizonte", "financiacion", "experiencia", "recomendacion", "score", "perfil", "fuente", "estado", "notas", "mensaje"];
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

  arrancar();
})();
