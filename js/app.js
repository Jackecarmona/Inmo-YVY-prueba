(() => {
  const cfg = window.YVY_CONFIG;
  const S = window.YVYScoring;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = n => Math.round(n).toLocaleString("es");
  const waLink = txt => "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(txt);

  /* ---------- Menú y canales ---------- */
  const menuBtn = $("#menu-btn"), nav = $("#nav");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("abierto");
    menuBtn.setAttribute("aria-expanded", open);
  });
  $$("#nav a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("abierto"); menuBtn.setAttribute("aria-expanded", "false"); }));

  const waNum = cfg.whatsapp.replace(/^(\d{3})(\d{3})(\d{3})(\d+)$/, "+$1 $2 $3 $4");
  $("#wa-num").textContent = waNum;
  $("#mail-txt").textContent = cfg.email;
  $("#canal-wa").href = $("#fab-wa").href = waLink("Hola YVY Capital, quiero información para invertir en Paraguay.");
  $("#canal-tg").href = cfg.telegram;

  /* ---------- Proyectos (ejemplos ficticios) ---------- */
  const render = (seed) => `
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Render ilustrativo del edificio">
      <rect width="400" height="250" fill="#1a2430"/>
      <rect y="196" width="400" height="54" fill="#64756a" opacity=".55"/>
      <path d="M0 196h400" stroke="#c6a66b" stroke-width="1.2"/>
      <g fill="none" stroke="#c6a66b" stroke-width="1.4">
        <rect x="${150 + seed}" y="40" width="${88 - seed}" height="156"/>
        <rect x="238" y="${86 + seed}" width="62" height="${110 - seed}"/>
      </g>
      <g fill="#c6a66b">
        ${Array.from({ length: 9 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<rect x="${162 + seed + c * 24}" y="${52 + r * 16}" width="14" height="8" opacity="${(r * 3 + c + seed) % 4 ? .3 : .85}"/>`).join("")).join("")}
      </g>
      <path d="M40 196c30-18 60-18 90 0M300 196c25-14 50-14 70 0" stroke="#9fb1a4" fill="none" stroke-width="1.4"/>
    </svg>`;

  const PROYECTOS = [
    { id: "lomas", tipo: "lote", nombre: "Lomas del Ypacaraí", loc: "San Bernardino · Barrio Villa Rosa", img: "assets/img/urbanizacion.jpg",
      precio: 24000, specs: [["450 m²", "Superficie"], ["15×30", "Medidas"], ["Lista", "Escritura"]],
      renta: ["Plusvalía estimada", "4–9 % anual"], anticipo: 2400, cuotas: "60 cuotas de US$ 360",
      det: { "Amenities": "Club house, acceso al lago, seguridad 24 h", "Estado": "Calles, luz y agua habilitadas", "Gastos adicionales": "3–4 % (escribanía e inscripción)", "Renta": "Sin renta hasta construir", "Impuestos": "Inmobiliario < 0,2 % anual" } },
    { id: "mburucuya", tipo: "pozo", nombre: "Torre Mburucuyá", loc: "Asunción · Villa Morra", render: 0,
      precio: 52000, specs: [["42 m²", "Superficie"], ["1", "Dormitorio"], ["2028", "Entrega"]],
      renta: ["Renta temporal estimada", "8–12 % bruto"], anticipo: 5200, cuotas: "36 cuotas de US$ 1.300",
      det: { "Amenities": "Piscina, cowork, gimnasio, lavandería", "Estado": "Obra en estructura (35 %)", "Gastos adicionales": "IVA incluido; escritura 3–4 %", "Gestión": "20 % de lo cobrado; vacancia 8–15 %", "Impuestos": "IRP efectivo 4 % del alquiler" } },
    { id: "costalago", tipo: "terminado", nombre: "Residencias Costa Lago", loc: "San Bernardino · Costanera", img: "assets/img/lago-costa.jpg",
      precio: 145000, specs: [["85 m²", "Superficie"], ["2", "Dormitorios"], ["1", "Cochera"]],
      renta: ["Renta estimada", "6–8,5 % bruto"], anticipo: 43500, cuotas: "30 % y 24 cuotas, o contado",
      det: { "Amenities": "Muelle privado, piscina, quincho", "Estado": "Terminado, listo para alquilar", "Gastos adicionales": "3–4 % (escribanía e inscripción)", "Gestión": "15 % de lo cobrado; vacancia 5–10 %", "Impuestos": "IRP efectivo 4 % del alquiler" } },
    { id: "miradores", tipo: "lote", nombre: "Miradores del Lago", loc: "San Bernardino · Ruta a Altos", img: "assets/img/avenida.jpg",
      precio: 48000, specs: [["800 m²", "Superficie"], ["Vista", "al lago"], ["Lista", "Escritura"]],
      renta: ["Plusvalía estimada", "5–9 % anual"], anticipo: 9600, cuotas: "48 cuotas de US$ 800",
      det: { "Amenities": "Barrio cerrado, senderos, área verde", "Estado": "Infraestructura 80 %", "Gastos adicionales": "3–4 % (escribanía e inscripción)", "Renta": "Sin renta hasta construir", "Impuestos": "Inmobiliario < 0,2 % anual" } },
    { id: "aurora", tipo: "pozo", nombre: "Edificio Aurora", loc: "San Bernardino · Centro", render: 14,
      precio: 46000, specs: [["36 m²", "Superficie"], ["Studio", "Tipología"], ["2027", "Entrega"]],
      renta: ["Renta temporal estimada", "8–11 % bruto"], anticipo: 4600, cuotas: "30 cuotas de US$ 1.380",
      det: { "Amenities": "Rooftop con vista al lago, piscina", "Estado": "Excavación y fundaciones", "Gastos adicionales": "IVA incluido; escritura 3–4 %", "Gestión": "20 % de lo cobrado; vacancia 10–15 %", "Impuestos": "IRP efectivo 4 % del alquiler" } },
    { id: "casalago", tipo: "terminado", nombre: "Casa Ypacaraí", loc: "San Bernardino · Barrio cerrado", img: "assets/img/lago-ypacarai.jpg",
      precio: 230000, specs: [["210 m²", "Cubiertos"], ["3", "Dormitorios"], ["2", "Cocheras"]],
      renta: ["Renta estimada", "6–8 % bruto"], anticipo: 230000, cuotas: "Contado",
      det: { "Amenities": "Piscina, jardín, acceso a playa", "Estado": "Terminada, amueblada", "Gastos adicionales": "3–4 % (escribanía e inscripción)", "Gestión": "15 % de lo cobrado; vacancia 5–10 %", "Impuestos": "IRP efectivo 4 % del alquiler" } }
  ];
  const TAG = { lote: "Lote", pozo: "Sobre plano", terminado: "Listo para rentar" };

  function pintarProyectos(filtro) {
    $("#lista-proyectos").innerHTML = PROYECTOS.filter(p => filtro === "todos" || p.tipo === filtro).map(p => `
      <article class="ficha">
        <div class="ficha__img">
          ${p.img ? `<img src="${p.img}" alt="${esc(p.nombre)}" loading="lazy">` : render(p.render)}
          <span class="ficha__tag">${TAG[p.tipo]}</span>
          <span class="ficha__render">${p.img ? "Foto de la zona" : "Render ilustrativo"}</span>
        </div>
        <div class="ficha__body">
          <div><p class="ficha__loc">${esc(p.loc)}</p><h3>${esc(p.nombre)}</h3></div>
          <p class="ficha__precio">US$ ${num(p.precio)} <small>· entrada US$ ${num(p.anticipo)}</small></p>
          <div class="specs">${p.specs.map(s => `<div><b>${s[0]}</b>${s[1]}</div>`).join("")}</div>
          <div class="renta"><span>${p.renta[0]}</span><b>${p.renta[1]}</b></div>
          <details>
            <summary>Ficha completa</summary>
            <dl>
              <dt>Financiación</dt><dd>${esc(p.cuotas)}</dd>
              ${Object.entries(p.det).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}
            </dl>
          </details>
          <div class="ficha__acciones">
            <a class="btn btn--wa" href="${waLink("Hola, me interesa " + p.nombre + " (" + p.loc + "). ¿Me envían el brochure?")}" target="_blank" rel="noopener"><svg><use href="#i-wa"/></svg>Consultar</a>
            <button class="btn btn--linea" type="button" data-simular="${p.precio}">Simular</button>
          </div>
        </div>
      </article>`).join("");
  }
  pintarProyectos("todos");
  $$(".chip").forEach(ch => ch.addEventListener("click", () => {
    $$(".chip").forEach(c => c.setAttribute("aria-pressed", c === ch));
    pintarProyectos(ch.dataset.filtro);
  }));
  $("#lista-proyectos").addEventListener("click", e => {
    const b = e.target.closest("[data-simular]");
    if (!b) return;
    setMoneda("USD");
    capital.value = Math.min(500000, Math.max(15000, +b.dataset.simular));
    pintarCapital();
    reiniciarForm();
    $("#simulador").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- Pestañas por país ---------- */
  const tabs = $$(".tab");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => { x.setAttribute("aria-selected", x === t); $("#" + x.getAttribute("aria-controls")).hidden = x !== t; });
  }));

  /* ---------- Formulario por pasos ---------- */
  const form = $("#form-inversor"), capital = $("#capital"), out = $("#capital-out");
  let moneda = "EUR", paso = 1;
  function setMoneda(m) {
    moneda = m;
    $$(".moneda button").forEach(b => b.setAttribute("aria-pressed", b.dataset.moneda === m));
    pintarCapital();
  }
  function pintarCapital() { out.textContent = moneda === "EUR" ? num(capital.value) + " €" : "US$ " + num(capital.value); }
  $$(".moneda button").forEach(b => b.addEventListener("click", () => setMoneda(b.dataset.moneda)));
  capital.addEventListener("input", pintarCapital);

  function irPaso(n) {
    paso = n;
    $$(".paso", form).forEach(f => { f.hidden = +f.dataset.paso !== n; });
    $$(".form__prog span", form).forEach((s, i) => s.classList.toggle("on", i < n));
    $("#btn-atras").hidden = n === 1;
    $("#btn-sig").hidden = n === 3;
    $("#btn-enviar").hidden = n !== 3;
    $("#form-error").textContent = "";
  }
  function reiniciarForm() { $("#resultado").hidden = true; form.hidden = false; irPaso(1); }
  $("#btn-sig").addEventListener("click", () => irPaso(Math.min(3, paso + 1)));
  $("#btn-atras").addEventListener("click", () => irPaso(Math.max(1, paso - 1)));

  function datosForm() {
    const fd = new FormData(form);
    const capitalNum = +capital.value;
    return {
      nombre: fd.get("nombre").trim(), email: fd.get("email").trim(), telefono: fd.get("telefono").trim(),
      pais: fd.get("pais"), capital: capitalNum, moneda, capital_usd: S.toUsd(capitalNum, moneda),
      objetivo: fd.get("objetivo"), riesgo: fd.get("riesgo"), horizonte: fd.get("horizonte"),
      financiacion: fd.get("financiacion"), experiencia: fd.get("experiencia"),
      mensaje: fd.get("mensaje").trim(), consentimiento: !!fd.get("consentimiento"), fuente: "formulario"
    };
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const d = datosForm(), err = $("#form-error");
    if (d.nombre.length < 2) return (err.textContent = "Escribí tu nombre para personalizar el informe.");
    if (!/^\S+@\S+\.\S+$/.test(d.email) && d.telefono.replace(/\D/g, "").length < 7) return (err.textContent = "Dejanos un email válido o un número de WhatsApp para contactarte.");
    if (!d.consentimiento) return (err.textContent = "Marcá la casilla de consentimiento para poder guardar tu solicitud.");

    const ev = S.evaluate(d);
    d.recomendacion = ev.top;
    d.score = ev.scores[ev.top];
    d.scores = ev.scores;
    d.perfil = ev.perfil;

    const btn = $("#btn-enviar");
    btn.disabled = true; btn.textContent = "Analizando…";
    let lead, guardado = true;
    try { lead = await window.YVYDB.insertLead(d); }
    catch (ex) { console.error(ex); guardado = false; lead = { ...d, created_at: new Date().toISOString() }; }
    btn.disabled = false; btn.textContent = "Ver mi recomendación";
    mostrarResultado(lead, ev, guardado);
  });

  function mostrarResultado(lead, ev, guardado) {
    const p = ev.proyeccion, res = $("#resultado");
    const fila = (t, a, b, f) => `<tr${f ? ' class="fuerte"' : ""}><td>${t}</td><td>${a}</td><td>${b}</td></tr>`;
    res.innerHTML = `
      <div class="res__top">
        <div style="min-width:0;flex:1">
          <span class="res__perfil">Perfil ${ev.perfil}</span>
          <p class="form__sub" style="margin:4px 0 0">${esc(lead.nombre)}, la inversión más adecuada para vos es:</p>
          <h4>${ev.producto.nombre}</h4>
        </div>
        <div class="res__score"><b>${ev.scores[ev.top]}</b><span>Idoneidad</span></div>
      </div>
      <p style="margin-top:12px;font-size:.94rem">${ev.producto.desc}</p>
      ${ev.motivos[ev.top].length ? `<ul class="res__motivos">${ev.motivos[ev.top].slice(0, 4).map(m => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
      <div class="barras" aria-label="Índice de idoneidad por alternativa">
        ${ev.ranking.map(k => `<div class="barra${k === ev.top ? " top" : ""}"><span>${S.PRODUCTS[k].corto}</span><i><em style="width:${ev.scores[k]}%"></em></i><b>${ev.scores[k]}</b></div>`).join("")}
      </div>
      <div class="tabla-scroll">
        <table class="escenarios">
          <thead><tr><th>A ${p.years} años · ${S.usd(ev.capital_usd)}</th><th>Prudente</th><th>Optimista</th></tr></thead>
          <tbody>
            ${fila("Valor del inmueble", S.usd(p.prudente.valorFinal), S.usd(p.optimista.valorFinal))}
            ${fila("Renta neta acumulada", S.usd(p.prudente.rentaNeta), S.usd(p.optimista.rentaNeta))}
            ${fila("Ganancia total", S.usd(p.prudente.ganancia), S.usd(p.optimista.ganancia), true)}
            ${fila("Retorno anual equivalente", S.pct(p.prudente.anual), S.pct(p.optimista.anual), true)}
          </tbody>
        </table>
      </div>
      <details class="supuestos"><summary>Ver supuestos del cálculo</summary><ul>${p.supuestos.map(s => `<li>${esc(s)}</li>`).join("")}</ul></details>
      <div class="res__acciones">
        <button class="btn btn--oro" type="button" id="btn-pdf">Descargar informe PDF</button>
        <button class="btn btn--linea" type="button" id="btn-pdf-ver">Ver el PDF aquí</button>
        <a class="btn btn--wa" target="_blank" rel="noopener" href="${waLink("Hola, soy " + lead.nombre + ". Hice el simulador y me recomendó: " + ev.producto.nombre + ". Quiero hablar con un asesor.")}"><svg><use href="#i-wa"/></svg>Hablar con un asesor</a>
        <button class="btn btn--linea" type="button" id="btn-nueva">Nueva simulación</button>
      </div>
      <p class="nota">${guardado ? (window.YVYDB.mode === "demo" ? "Solicitud guardada (modo demo: en este navegador). " : "Solicitud registrada. Un asesor te contactará en el día. ") : "No pudimos guardar tu solicitud; escribinos por WhatsApp. "}Estimación orientativa, no constituye asesoramiento financiero.</p>
      <div id="pdf-host"></div>`;
    form.hidden = true;
    res.hidden = false;
    $("#form-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#btn-pdf").addEventListener("click", () => window.YVYPdf.download(lead));
    $("#btn-pdf-ver").addEventListener("click", () => {
      $("#pdf-host").innerHTML = `<iframe class="pdf-vista" title="Informe en PDF" src="${window.YVYPdf.blobUrl(lead)}"></iframe>`;
    });
    $("#btn-nueva").addEventListener("click", () => { reiniciarForm(); });
  }

  /* ---------- Formulario de contacto ---------- */
  $("#form-contacto").addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = $("#c-nombre").value.trim(), email = $("#c-email").value.trim(), tel = $("#c-tel").value.trim();
    const err = $("#c-error");
    if (nombre.length < 2) return (err.textContent = "Escribí tu nombre.");
    if (!/^\S+@\S+\.\S+$/.test(email) && tel.replace(/\D/g, "").length < 7) return (err.textContent = "Dejanos un email válido o un WhatsApp.");
    err.textContent = "";
    try {
      await window.YVYDB.insertLead({ nombre, email, telefono: tel, fuente: "contacto", mensaje: $("#c-interes").value, consentimiento: true });
      $("#c-ok").innerHTML = `<p class="ok">Gracias, ${esc(nombre)}. Recibimos tu pedido: "${esc($("#c-interes").value)}". Te escribimos en el día.</p>`;
      e.target.reset();
    } catch (ex) {
      $("#c-ok").innerHTML = `<p class="error">No pudimos enviar el formulario. Escribinos por WhatsApp al ${esc(waNum)}.</p>`;
    }
    $("#c-ok").hidden = false;
  });

  /* ---------- Chatbot de cualificación ---------- */
  const chat = $("#chat"), log = $("#chat-log"), ops = $("#chat-ops"), inForm = $("#chat-input"), inTxt = $("#chat-txt");
  const botBtn = $("#bot-btn");
  let perfilBot = {}, esperando = null, iniciado = false;

  function decir(txt, quien = "bot") {
    const m = document.createElement("div");
    m.className = "msg msg--" + quien;
    m.innerHTML = txt;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }
  function opciones(lista) {
    inForm.hidden = true;
    ops.innerHTML = "";
    lista.forEach(([txt, fn]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = txt;
      b.addEventListener("click", () => { decir(esc(txt), "yo"); ops.innerHTML = ""; setTimeout(fn, 350); });
      ops.appendChild(b);
    });
  }
  function pedir(placeholder, fn) {
    ops.innerHTML = ""; inForm.hidden = false; inTxt.value = ""; inTxt.placeholder = placeholder; esperando = fn; inTxt.focus();
  }
  inForm.addEventListener("submit", e => {
    e.preventDefault();
    const v = inTxt.value.trim();
    if (!v || !esperando) return;
    decir(esc(v), "yo");
    const fn = esperando; esperando = null; inForm.hidden = true;
    setTimeout(() => fn(v), 350);
  });

  const flujo = {
    inicio() {
      perfilBot = { fuente: "chatbot", horizonte: "3-5", moneda: "USD", consentimiento: true };
      decir("Hola, soy el asistente de YVY Capital. Con 4 preguntas te digo qué tipo de inversión encaja con vos. ¿Desde dónde invertirías?");
      opciones(["España", "Argentina", "Brasil", "Otro país"].map(p => [p, () => { perfilBot.pais = p === "Otro país" ? "Otro" : p; flujo.capital(); }]));
    },
    capital() {
      decir("¿Qué capital tenés pensado invertir (en dólares)?");
      opciones([["Menos de 50.000", 35000], ["50.000 a 150.000", 100000], ["150.000 a 300.000", 220000], ["Más de 300.000", 400000]]
        .map(([t, v]) => [t, () => { perfilBot.capital = perfilBot.capital_usd = v; perfilBot.financiacion = v < 150000 ? "cuotas" : "contado"; flujo.objetivo(); }]));
    },
    objetivo() {
      decir("¿Qué es lo más importante para vos?");
      opciones([["Cobrar renta mensual", "renta"], ["Que se revalorice", "plusvalia"], ["Usarlo y alquilarlo", "uso"], ["Diversificar mi patrimonio", "diversificar"]]
        .map(([t, v]) => [t, () => { perfilBot.objetivo = v; flujo.riesgo(); }]));
    },
    riesgo() {
      decir("Última: ¿cuánto riesgo estás dispuesto a asumir?");
      opciones([["Poco, prefiero algo terminado", "baja"], ["Medio, puedo esperar una obra", "media"], ["Alto, busco el mayor potencial", "alta"]]
        .map(([t, v]) => [t, () => { perfilBot.riesgo = v; flujo.resultado(); }]));
    },
    resultado() {
      const ev = S.evaluate(perfilBot);
      Object.assign(perfilBot, { recomendacion: ev.top, score: ev.scores[ev.top], scores: ev.scores, perfil: ev.perfil });
      decir(`Tu perfil es <b>${ev.perfil}</b>. Lo más adecuado: <b>${ev.producto.nombre}</b>, con un índice de idoneidad de <b>${ev.scores[ev.top]}/100</b>.`);
      decir("¿Querés que un asesor te contacte con proyectos concretos?");
      opciones([["Sí, contáctenme", flujo.nombre], ["Prefiero el informe completo", flujo.simulador], ["Ahora no, gracias", flujo.fin]]);
    },
    nombre() { decir("¿Cómo te llamás?"); pedir("Tu nombre", v => { perfilBot.nombre = v; flujo.contacto(); }); },
    contacto() {
      decir("¿A qué WhatsApp o email te escribimos?");
      pedir("+34 600 000 000 o email", async v => {
        if (v.includes("@")) perfilBot.email = v; else perfilBot.telefono = v;
        try { await window.YVYDB.insertLead({ ...perfilBot }); decir(`Listo, ${esc(perfilBot.nombre)}. Un asesor te escribe en el día.`); }
        catch (e) { decir("No pude guardar tus datos. Escribinos directo por WhatsApp."); }
        opciones([["Ver el informe en PDF", flujo.simulador], ["Escribir por WhatsApp", () => { window.open(waLink("Hola, soy " + perfilBot.nombre + ", hablé con el asistente de la web."), "_blank"); flujo.fin(); }]]);
      });
    },
    simulador() {
      decir("Te llevo al simulador. Ya cargué tu perfil: solo te falta completar tus datos.");
      setMoneda("USD");
      capital.value = Math.min(500000, perfilBot.capital || 50000); pintarCapital();
      const set = (n, v) => { const r = form.querySelector(`[name="${n}"][value="${v}"]`); if (r) r.checked = true; };
      set("objetivo", perfilBot.objetivo); set("riesgo", perfilBot.riesgo);
      $("#pais").value = perfilBot.pais || "Otro"; $("#financiacion").value = perfilBot.financiacion || "cuotas";
      if (perfilBot.nombre) $("#nombre").value = perfilBot.nombre;
      reiniciarForm(); irPaso(3);
      setTimeout(() => { cerrarChat(); $("#simulador").scrollIntoView({ behavior: "smooth" }); }, 900);
    },
    fin() { decir("Perfecto. Si te surge una duda, estoy acá."); opciones([["Empezar de nuevo", flujo.inicio]]); }
  };

  function abrirChat() { chat.hidden = false; botBtn.setAttribute("aria-expanded", "true"); if (!iniciado) { iniciado = true; flujo.inicio(); } }
  function cerrarChat() { chat.hidden = true; botBtn.setAttribute("aria-expanded", "false"); }
  botBtn.addEventListener("click", () => (chat.hidden ? abrirChat() : cerrarChat()));
  $("#chat-cerrar").addEventListener("click", cerrarChat);
})();
