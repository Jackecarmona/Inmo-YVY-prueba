// Lógica del sitio público. Cada bloque se activa solo si su sección existe en la página.
(() => {
  const cfg = window.YVY_CONFIG;
  const S = window.YVYScoring;
  const DB = window.YVYDB;
  const B = window.YVY_BASE || "";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const waLink = txt => "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(txt);
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const waNum = cfg.whatsapp.replace(/^(\d{3})(\d{3})(\d{3})(\d+)$/, "+$1 $2 $3 $4");

  // Preferencias del usuario: solo se leen o guardan con el consentimiento "preferencias" (js/consentimiento.js)
  const prefOk = () => !!(window.YVYConsentimiento && YVYConsentimiento.permite("preferencias"));
  window.YVYPref = {
    leer: k => { if (!prefOk()) return null; try { return localStorage.getItem(k); } catch (e) { return null; } },
    guardar: (k, v) => { if (prefOk()) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } } }
  };

  // Datos que otra página deja para precargar el simulador
  const PREFILL = "yvy_prefill";
  window.YVYIrAlSimulador = datos => {
    try { localStorage.setItem(PREFILL, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
    location.href = B + "simulador/index.html";
  };

  /* ---------- Menú, cabecera y canales ---------- */
  const menuBtn = $("#menu-btn"), nav = $("#nav");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => menuBtn.setAttribute("aria-expanded", nav.classList.toggle("abierto")));
    $$("#nav a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("abierto"); menuBtn.setAttribute("aria-expanded", "false"); }));
  }
  const header = $("#header");
  if (header) {
    const marcar = () => header.classList.toggle("con-fondo", scrollY > 30);
    addEventListener("scroll", marcar, { passive: true });
    marcar();
  }
  const fabWa = $("#fab-wa");
  if (fabWa) fabWa.href = waLink("Hola YVY Capital, quiero información para invertir en Paraguay.");
  if ($("#wa-num")) {
    $("#wa-num").textContent = waNum;
    $("#mail-txt").textContent = cfg.email;
    $("#canal-wa").href = waLink("Hola YVY Capital, quiero información para invertir en Paraguay.");
    $("#canal-tg").href = cfg.telegram;
  }

  /* ---------- Teléfono con prefijo de país ---------- */
  const PREFIJOS = [
    ["España", "+34"], ["Argentina", "+54"], ["Brasil", "+55"], ["Paraguay", "+595"], ["Uruguay", "+598"], ["Chile", "+56"],
    ["Bolivia", "+591"], ["Perú", "+51"], ["Colombia", "+57"], ["México", "+52"], ["Venezuela", "+58"], ["Ecuador", "+593"],
    ["Estados Unidos", "+1"], ["Canadá", "+1"], ["Portugal", "+351"], ["Italia", "+39"], ["Francia", "+33"], ["Alemania", "+49"],
    ["Reino Unido", "+44"], ["Suiza", "+41"], ["Países Bajos", "+31"], ["Bélgica", "+32"], ["Andorra", "+376"], ["Emiratos Árabes", "+971"]
  ];
  $$("[data-prefijos]").forEach(sel => {
    sel.innerHTML = PREFIJOS.map(([p, c]) => `<option value="${c}" data-pais="${p}">${p} ${c}</option>`).join("");
  });
  // Devuelve "+34 600 000 000", "" si está vacío o null si el número no es válido
  const telefonoCompleto = (pre, input) => {
    const n = input.value.trim();
    if (!n) return "";
    if (!/^[0-9 ()-]{6,18}$/.test(n)) return null;
    return pre.value + " " + n;
  };
  // Al elegir el país de residencia, el prefijo lo acompaña
  const paisSel = $("#pais"), prefijoSel = $("#prefijo");
  if (paisSel && prefijoSel) {
    const sincronizar = () => { const o = $(`option[data-pais="${paisSel.value}"]`, prefijoSel); if (o) prefijoSel.value = o.value; };
    paisSel.addEventListener("change", sincronizar);
    sincronizar();
  }

  /* ---------- Inicio: portada con el logo de partículas (js/particulas.js) ---------- */
  const hp = $("#hp");
  if (hp) YVYAlTerminarIntro(() => hp.classList.add("listo"));

  /* ---------- Portada en "video" con fotos (en pausa hasta tener fotos de mejor calidad) ---------- */
  const hv = $("#hv");
  if (hv) {
    const escenas = $$(".hv__esc", hv), barras = $$(".hv__barras button", hv);
    const cap = $("#hv-cap"), pausa = $("#hv-pausa");
    const DUR = 6000;
    let i = 0, timer = null, corriendo = !quieto;
    function ir(n) {
      i = (n + escenas.length) % escenas.length;
      escenas.forEach((e, k) => e.classList.toggle("on", k === i));
      barras.forEach((b, k) => {
        b.classList.toggle("hecha", k < i);
        b.classList.remove("on"); void b.offsetWidth; // reinicia la animación de la barra
        if (k === i) b.classList.add("on");
        b.setAttribute("aria-current", k === i ? "true" : "false");
      });
      if (cap) { cap.classList.remove("on"); void cap.offsetWidth; cap.textContent = escenas[i].dataset.cap; cap.classList.add("on"); }
      programar();
    }
    function programar() {
      clearTimeout(timer);
      if (corriendo) timer = setTimeout(() => ir(i + 1), DUR);
    }
    function alternar(seguir) {
      corriendo = seguir;
      hv.classList.toggle("pausado", !corriendo);
      pausa.setAttribute("aria-label", corriendo ? "Pausar presentación" : "Reproducir presentación");
      pausa.setAttribute("aria-pressed", String(!corriendo));
      programar();
    }
    barras.forEach((b, k) => b.addEventListener("click", () => ir(k)));
    pausa.addEventListener("click", () => alternar(!corriendo));
    document.addEventListener("visibilitychange", () => { if (document.hidden) clearTimeout(timer); else programar(); });
    if (quieto) alternar(false);
    // Arranca cuando termina la animación del logo
    YVYAlTerminarIntro(() => { hv.classList.add("listo"); ir(0); });
  }

  /* ---------- Precios en la moneda elegida (js/moneda.js) ---------- */
  // Los elementos con data-precio-usd muestran ese monto convertido; se actualizan al cambiar la moneda.
  function pintarPrecios(raiz = document) {
    if (!window.YVYMoneda) return;
    $$("[data-precio-usd]", raiz).forEach(el => { el.textContent = YVYMoneda.formatear(+el.dataset.precioUsd); });
  }
  if (window.YVYMoneda) YVYMoneda.alCambiar(() => pintarPrecios());

  /* ---------- Inicio: residencias destacadas ---------- */
  const dest = $("#destacadas");
  if (dest && window.YVY_CASAS) {
    const ids = ["horizon-home", "casa-inteligente", "la-suiza"];
    dest.innerHTML = ids.map(id => window.YVY_CASAS.find(c => c.id === id)).filter(Boolean).map((c, k) => `
      <a class="dest" href="${B}propiedades/index.html#${c.id}" style="--k:${k}">
        <span class="dest__img"><img src="${B}assets/props/${c.id}/01.jpg" alt="${esc(c.nombre)}" loading="lazy"><img class="alt" src="${B}assets/props/${c.id}/02.jpg" alt="" loading="lazy"></span>
        <span class="dest__txt">
          <small>${esc(c.zona)}</small>
          <b>${esc(c.nombre)}</b>
          <span>${c.precio ? `<span data-precio-usd="${c.precio}">US$ ${num(c.precio)}</span>` : "Consultar precio"} · ${c.construido} m² · ${c.dorm} dormitorios</span>
        </span>
      </a>`).join("");
    pintarPrecios(dest);
  }

  /* ---------- Proyectos a futuro (ejemplos ficticios) ---------- */
  const listaProy = $("#lista-proyectos");
  if (listaProy) {
    const render = seed => `
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
      listaProy.innerHTML = PROYECTOS.filter(p => filtro === "todos" || p.tipo === filtro).map(p => `
        <article class="ficha">
          <div class="ficha__img">
            ${p.img ? `<img src="${B}${p.img}" alt="${esc(p.nombre)}" loading="lazy">` : render(p.render)}
            <span class="ficha__tag">${TAG[p.tipo]}</span>
            <span class="ficha__render">${p.img ? "Foto de la zona" : "Render ilustrativo"}</span>
          </div>
          <div class="ficha__body">
            <div><p class="ficha__loc">${esc(p.loc)}</p><h3>${esc(p.nombre)}</h3></div>
            <p class="ficha__precio"><span data-precio-usd="${p.precio}">US$ ${num(p.precio)}</span> <small>· ${p.anticipo >= p.precio ? "contado" : `entrada <span data-precio-usd="${p.anticipo}">US$ ${num(p.anticipo)}</span>`}</small></p>
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
              <button class="btn btn--linea" type="button" data-simular="${p.precio}" data-tipo="${p.tipo}">Simular</button>
            </div>
          </div>
        </article>`).join("");
    }
    pintarProyectos("todos");
    pintarPrecios(listaProy);
    $$("[data-filtro]").forEach(ch => ch.addEventListener("click", () => {
      $$("[data-filtro]").forEach(c => c.setAttribute("aria-pressed", c === ch));
      pintarProyectos(ch.dataset.filtro);
      pintarPrecios(listaProy);
    }));
    listaProy.addEventListener("click", e => {
      const b = e.target.closest("[data-simular]");
      if (!b) return;
      window.YVYIrAlSimulador({ capital: +b.dataset.simular, moneda: "USD", financiacion: b.dataset.tipo === "terminado" ? "contado" : "cuotas" });
    });
  }

  /* ---------- Guía por país (pestañas) ---------- */
  const tabs = $$(".tab");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => { x.setAttribute("aria-selected", x === t); $("#" + x.getAttribute("aria-controls")).hidden = x !== t; });
  }));

  /* ---------- Simulador ---------- */
  const form = $("#form-inversor");
  let setMoneda = () => {}, pintarCapital = () => {}, reiniciarForm = () => {}, irPaso = () => {};
  if (form) {
    const capital = $("#capital"), out = $("#capital-out");
    let moneda = "EUR", paso = 1;
    setMoneda = m => {
      moneda = m;
      $$(".moneda button").forEach(b => b.setAttribute("aria-pressed", b.dataset.moneda === m));
      pintarCapital();
    };
    pintarCapital = () => { out.textContent = moneda === "EUR" ? num(capital.value) + " €" : "US$ " + num(capital.value); };
    $$(".moneda button").forEach(b => b.addEventListener("click", () => { setMoneda(b.dataset.moneda); YVYPref.guardar("yvy_pref_moneda", b.dataset.moneda); }));
    const monedaGuardada = YVYPref.leer("yvy_pref_moneda");
    if (monedaGuardada === "EUR" || monedaGuardada === "USD") setMoneda(monedaGuardada);
    capital.addEventListener("input", pintarCapital);

    irPaso = n => {
      paso = n;
      $$(".paso", form).forEach(f => { f.hidden = +f.dataset.paso !== n; });
      $$(".form__prog span", form).forEach((s, k) => s.classList.toggle("on", k < n));
      $("#btn-atras").hidden = n === 1;
      $("#btn-sig").hidden = n === 3;
      $("#btn-enviar").hidden = n !== 3;
      $("#form-error").textContent = "";
    };
    reiniciarForm = () => { $("#resultado").hidden = true; form.hidden = false; irPaso(1); };
    $("#btn-sig").addEventListener("click", () => irPaso(Math.min(3, paso + 1)));
    $("#btn-atras").addEventListener("click", () => irPaso(Math.max(1, paso - 1)));

    // Precarga desde una ficha, un proyecto o el asistente
    let pre = null;
    try { pre = JSON.parse(localStorage.getItem(PREFILL)); localStorage.removeItem(PREFILL); } catch (e) { /* sin datos */ }
    if (pre) {
      if (pre.moneda) setMoneda(pre.moneda);
      if (pre.capital) capital.value = Math.min(500000, Math.max(15000, pre.capital));
      const marcar = (n, v) => { const r = form.querySelector(`[name="${n}"][value="${v}"]`); if (r) r.checked = true; };
      if (pre.objetivo) marcar("objetivo", pre.objetivo);
      if (pre.riesgo) marcar("riesgo", pre.riesgo);
      if (pre.pais) { $("#pais").value = pre.pais; $("#pais").dispatchEvent(new Event("change")); }
      if (pre.financiacion) $("#financiacion").value = pre.financiacion;
      if (pre.nombre) $("#nombre").value = pre.nombre;
      if (pre.paso) irPaso(pre.paso);
    }
    pintarCapital();

    /* Test de perfil: 4 preguntas de a una, análisis animado y puntaje de 0 a 100.
       Al terminar precarga el formulario, que suma país, pago y datos de contacto. */
    let resultadoTest = null;
    const test = $("#test");
    if (test) {
      const CAP = { 50000: 30, 100000: 50, 200000: 75, 300000: 95 };
      const HOR = { "1-3": 25, "3-5": 50, "5-10": 75, "10+": 95 };
      const FRASE = {
        renta: "Priorizás un ingreso mensual por alquiler, cobrado en dólares.",
        plusvalia: "Apostás a que tu inversión se revalorice con el tiempo.",
        uso: "Querés disfrutar el inmueble y que se pague solo cuando no lo usás.",
        diversificar: "Buscás repartir tu patrimonio en otro país y otra moneda."
      };
      const ORDEN = ["intro", "q1", "q2", "q3", "q4", "analisis", "resultado"];
      const SIGUE = { capital: "q2", objetivo: "q3" };
      const esperar = ms => new Promise(ok => setTimeout(ok, quieto ? 0 : ms));
      const riesgoNivel = v => (v < 34 ? "baja" : v < 67 ? "media" : "alta");
      let R = {}, actual = "intro", ocupado = false;
      const reiniciarTest = () => {
        R = { capital: null, objetivo: null, riesgo: 50, horizonte: null };
        $$(".test__ops button", test).forEach(b => b.setAttribute("aria-pressed", "false"));
        $("#test-riesgo").value = 50; pintarRiesgo();
      };
      const mostrarForm = () => { test.hidden = true; form.hidden = false; };

      const ir = (id, atras) => {
        $$(".test__paso", test).forEach(p => {
          const es = p.dataset.t === id;
          p.hidden = !es;
          p.classList.remove("entra", "entra-atras");
          if (es) { void p.offsetWidth; p.classList.add(atras ? "entra-atras" : "entra"); }
        });
        actual = id;
        $("#test-barra").style.width = Math.min(100, ORDEN.indexOf(id) / 4 * 100) + "%";
        const h = $(`[data-t="${id}"] h3`, test);
        if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
      };

      $$("[data-test-ir]", test).forEach(b => b.addEventListener("click", () => ir(b.dataset.testIr)));
      $$("[data-test-atras]", test).forEach(b => b.addEventListener("click", () => ir(b.dataset.testAtras, true)));
      $$(".test__ops", test).forEach(grupo => grupo.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b || ocupado) return;
        R[grupo.dataset.q] = b.dataset.v;
        $$("button", grupo).forEach(x => x.setAttribute("aria-pressed", x === b));
        ocupado = true;
        setTimeout(() => {
          ocupado = false;
          if (SIGUE[grupo.dataset.q]) ir(SIGUE[grupo.dataset.q]); else analizar();
        }, quieto ? 0 : 320);
      }));

      const rango = $("#test-riesgo");
      function pintarRiesgo() {
        const v = +rango.value;
        R.riesgo = v;
        rango.style.setProperty("--v", v + "%");
        $("#test-riesgo-txt").textContent = v < 20 ? "Muy prudente" : v < 34 ? "Prudente" : v < 67 ? "Moderado" : v < 85 ? "Atrevido" : "Muy atrevido";
      }
      rango.addEventListener("input", pintarRiesgo);

      async function analizar() {
        ir("analisis");
        const lis = $$("#test-checks li");
        lis.forEach(l => l.classList.remove("on", "hecho"));
        for (const l of lis) {
          l.classList.add("on");
          await esperar(750);
          l.classList.replace("on", "hecho");
        }
        await esperar(350);
        resultado();
      }

      const contar = (el, hasta, ms, suf = "") => {
        if (quieto) { el.textContent = hasta + suf; return; }
        const t0 = performance.now();
        const paso = t => {
          const k = Math.min(1, (t - t0) / ms);
          el.textContent = Math.round(hasta * (1 - Math.pow(1 - k, 3))) + suf;
          if (k < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      };

      async function resultado() {
        const cap = CAP[R.capital], hor = HOR[R.horizonte];
        const puntaje = Math.round(0.4 * cap + 0.25 * R.riesgo + 0.35 * hor);
        const perfil = { baja: "Inversor conservador", media: "Inversor moderado", alta: "Inversor dinámico" }[riesgoNivel(R.riesgo)];
        resultadoTest = { test_puntaje: puntaje, test_perfil: perfil };
        $("#test-perfil").textContent = perfil;
        $("#test-frase").textContent = FRASE[R.objetivo];
        ["tb1", "tb2", "tb3"].forEach(id => { $("#" + id).style.width = "0"; });
        ir("resultado");
        await esperar(200);
        contar($("#test-puntaje"), puntaje, 1300);
        for (const [b, p, v] of [["tb1", "tp1", cap], ["tb2", "tp2", R.riesgo], ["tb3", "tp3", hor]]) {
          await esperar(220);
          $("#" + b).style.width = v + "%";
          contar($("#" + p), v, 1100, " %");
        }
      }

      // Pasa las respuestas al formulario y sigue con lo que falta
      $("#test-continuar").addEventListener("click", () => {
        setMoneda("EUR");
        capital.value = R.capital; pintarCapital();
        const marcar = (n, v) => { const r = form.querySelector(`[name="${n}"][value="${v}"]`); if (r) r.checked = true; };
        marcar("objetivo", R.objetivo);
        marcar("riesgo", riesgoNivel(R.riesgo));
        $("#horizonte").value = R.horizonte;
        const aviso = $("#test-aviso") || form.insertAdjacentElement("afterbegin", Object.assign(document.createElement("p"), { id: "test-aviso", className: "test-aviso" }));
        aviso.innerHTML = `Cargamos las respuestas de tu test: <b>${esc(resultadoTest.test_perfil)} · ${resultadoTest.test_puntaje}/100</b>. Completá tu país y la forma de pago, y revisá el resto.`;
        mostrarForm();
        irPaso(1);
        $("#form-wrap").scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
      });
      $("#test-repetir").addEventListener("click", () => { reiniciarTest(); ir("intro", true); });
      $("#test-saltar").addEventListener("click", mostrarForm);

      reiniciarTest();
      // Si llega con datos precargados (desde una ficha, un proyecto o el chat), va directo al formulario
      if (pre) mostrarForm(); else form.hidden = true;
    }

    const datosForm = () => {
      const fd = new FormData(form), capitalNum = +capital.value;
      return {
        nombre: fd.get("nombre").trim(), email: fd.get("email").trim(), telefono: fd.get("telefono").trim(),
        pais: fd.get("pais"), capital: capitalNum, moneda, capital_usd: S.toUsd(capitalNum, moneda),
        objetivo: fd.get("objetivo"), riesgo: fd.get("riesgo"), horizonte: fd.get("horizonte"),
        financiacion: fd.get("financiacion"), experiencia: fd.get("experiencia"),
        mensaje: fd.get("mensaje").trim(), consentimiento: !!fd.get("consentimiento"), fuente: "formulario"
      };
    };

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const d = datosForm(), err = $("#form-error");
      if (d.nombre.length < 2) return (err.textContent = "Escribí tu nombre para personalizar el informe.");
      const tel = telefonoCompleto($("#prefijo"), $("#telefono"));
      if (tel === null) return (err.textContent = "El WhatsApp solo puede llevar números, espacios y guiones.");
      d.telefono = tel;
      // Un robot completa el campo trampa: se le muestra el resultado pero no se guarda nada
      const robot = !!$("#web").value;
      if (!/^\S+@\S+\.\S+$/.test(d.email) && d.telefono.replace(/\D/g, "").length < 9) return (err.textContent = "Dejanos un email válido o un número de WhatsApp para contactarte.");
      if (!d.consentimiento) return (err.textContent = "Marcá la casilla de consentimiento para poder guardar tu solicitud.");
      const ev = S.evaluate(d);
      Object.assign(d, { recomendacion: ev.top, score: ev.scores[ev.top], scores: ev.scores, perfil: ev.perfil }, resultadoTest);
      const btn = $("#btn-enviar");
      btn.disabled = true; btn.textContent = "Analizando…";
      let lead, guardado = true;
      try { lead = robot ? { ...d, created_at: new Date().toISOString() } : await DB.insertLead(d); }
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
            <span class="res__perfil">Perfil ${ev.perfil}${lead.test_puntaje ? ` · Test ${lead.test_puntaje}/100` : ""}</span>
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
        <p class="nota">${guardado ? (DB.mode === "demo" ? "Solicitud guardada (modo demo: en este navegador). " : "Solicitud registrada. Un asesor te contactará en el día. ") : "No pudimos guardar tu solicitud; escribinos por WhatsApp. "}Podés verla en tu <a href="${B}ingresar/index.html">área de clientes</a> con este mismo email. Estimación orientativa, no constituye asesoramiento financiero.</p>
        <div id="pdf-host"></div>`;
      form.hidden = true;
      res.hidden = false;
      $("#form-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
      $("#btn-pdf").addEventListener("click", () => window.YVYPdf.download(lead));
      $("#btn-pdf-ver").addEventListener("click", () => {
        $("#pdf-host").innerHTML = `<iframe class="pdf-vista" title="Informe en PDF" src="${window.YVYPdf.blobUrl(lead)}"></iframe>`;
      });
      $("#btn-nueva").addEventListener("click", reiniciarForm);
    }
  }

  /* ---------- Formulario de contacto ---------- */
  const formContacto = $("#form-contacto");
  if (formContacto) formContacto.addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = $("#c-nombre").value.trim(), email = $("#c-email").value.trim(), tel = telefonoCompleto($("#c-pre"), $("#c-tel"));
    const err = $("#c-error");
    if (nombre.length < 2) return (err.textContent = "Escribí tu nombre.");
    if (tel === null) return (err.textContent = "El WhatsApp solo puede llevar números, espacios y guiones.");
    if (!/^\S+@\S+\.\S+$/.test(email) && tel.replace(/\D/g, "").length < 9) return (err.textContent = "Dejanos un email válido o un WhatsApp.");
    if (!$("#c-consentimiento").checked) return (err.textContent = "Marcá la casilla de consentimiento para poder guardar tu consulta.");
    err.textContent = "";
    try {
      // Campo trampa completo = robot: se le agradece pero no se guarda
      if (!$("#c-web").value) await DB.insertLead({ nombre, email, telefono: tel, fuente: "contacto", mensaje: $("#c-interes").value, consentimiento: true });
      $("#c-ok").innerHTML = `<p class="ok">Gracias, ${esc(nombre)}. Recibimos tu pedido: "${esc($("#c-interes").value)}". Te escribimos en el día.</p>`;
      e.target.reset();
    } catch (ex) {
      $("#c-ok").innerHTML = `<p class="error">No pudimos enviar el formulario. Escribinos por WhatsApp al ${esc(waNum)}.</p>`;
    }
    $("#c-ok").hidden = false;
  });

  /* ---------- Chatbot de cualificación (con memoria) ---------- */
  // La conversación se guarda en sessionStorage durante la visita (necesario para seguirla al cambiar de página)
  // y, si el visitante aceptó las cookies de preferencias, también en localStorage durante 30 días.
  const chat = $("#chat");
  if (chat) {
    const log = $("#chat-log"), ops = $("#chat-ops"), inForm = $("#chat-input"), inTxt = $("#chat-txt"), botBtn = $("#bot-btn");
    const CLAVE_CHAT = "yvy_chat", DIAS_CHAT = 30;
    const prefChat = () => !!(window.YVYConsentimiento && YVYConsentimiento.permite("preferencias"));
    let estado = null, esperando = null, restaurando = false;
    const nuevoEstado = () => ({ v: 1, fecha: new Date().toISOString(), mensajes: [], perfil: { fuente: "chatbot", horizonte: "3-5", moneda: "USD", consentimiento: false }, paso: "inicio" });

    const guardarChat = () => {
      estado.fecha = new Date().toISOString();
      const txt = JSON.stringify(estado);
      try { sessionStorage.setItem(CLAVE_CHAT, txt); } catch (e) { /* sin almacenamiento */ }
      if (prefChat()) { try { localStorage.setItem(CLAVE_CHAT, txt); } catch (e) { /* sin almacenamiento */ } }
    };
    const leerChat = () => {
      const leer = (almacen, caduca) => {
        try {
          const e = JSON.parse(almacen.getItem(CLAVE_CHAT));
          if (!e || e.v !== 1 || !Array.isArray(e.mensajes)) return null;
          if (caduca && Date.now() - new Date(e.fecha).getTime() > DIAS_CHAT * 864e5) { almacen.removeItem(CLAVE_CHAT); return null; }
          return e;
        } catch (err) { return null; }
      };
      return leer(sessionStorage, false) || (prefChat() ? leer(localStorage, true) : null);
    };
    const borrarChat = () => {
      try { sessionStorage.removeItem(CLAVE_CHAT); } catch (e) { /* sin almacenamiento */ }
      try { localStorage.removeItem(CLAVE_CHAT); } catch (e) { /* sin almacenamiento */ }
    };

    const pintarMensaje = (html, quien) => {
      const m = document.createElement("div");
      m.className = "msg msg--" + quien;
      m.innerHTML = html;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    };
    // Al restaurar, los mensajes del bot ya están en el historial: solo se vuelve a mostrar la pregunta
    const decir = (txt, quien = "bot") => {
      if (restaurando && quien === "bot") return;
      pintarMensaje(txt, quien);
      estado.mensajes.push({ q: quien, t: txt });
      guardarChat();
    };
    const opciones = lista => {
      inForm.hidden = true;
      ops.innerHTML = "";
      lista.forEach(([txt, fn]) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = txt;
        b.addEventListener("click", () => { decir(esc(txt), "yo"); ops.innerHTML = ""; setTimeout(fn, 350); });
        ops.appendChild(b);
      });
    };
    const pedir = (placeholder, fn) => { ops.innerHTML = ""; inForm.hidden = false; inTxt.value = ""; inTxt.placeholder = placeholder; esperando = fn; if (!restaurando) inTxt.focus(); };
    inForm.addEventListener("submit", e => {
      e.preventDefault();
      const v = inTxt.value.trim();
      if (!v || !esperando) return;
      decir(esc(v), "yo");
      const fn = esperando; esperando = null; inForm.hidden = true;
      setTimeout(() => fn(v), 350);
    });
    // Los enlaces se guardan con dirección completa para que funcionen desde cualquier página
    const enlace = ruta => new URL(B + ruta, location.href).href;

    const perfil = () => estado.perfil;
    const ir = paso => { estado.paso = paso; guardarChat(); flujo[paso](); };
    const flujo = {
      inicio() {
        decir("Hola, soy el asistente de YVY Capital. Con 4 preguntas te digo qué tipo de inversión encaja con vos. ¿Desde dónde invertirías?");
        opciones(["España", "Argentina", "Brasil", "Otro país"].map(p => [p, () => { perfil().pais = p === "Otro país" ? "Otro" : p; ir("capital"); }]));
      },
      capital() {
        decir("¿Qué capital tenés pensado invertir (en dólares)?");
        opciones([["Menos de 50.000", 35000], ["50.000 a 150.000", 100000], ["150.000 a 300.000", 220000], ["Más de 300.000", 400000]]
          .map(([t, v]) => [t, () => { Object.assign(perfil(), { capital: v, capital_usd: v, financiacion: v < 150000 ? "cuotas" : "contado" }); ir("objetivo"); }]));
      },
      objetivo() {
        decir("¿Qué es lo más importante para vos?");
        opciones([["Cobrar renta mensual", "renta"], ["Que se revalorice", "plusvalia"], ["Usarlo y alquilarlo", "uso"], ["Diversificar mi patrimonio", "diversificar"]]
          .map(([t, v]) => [t, () => { perfil().objetivo = v; ir("riesgo"); }]));
      },
      riesgo() {
        decir("Última: ¿cuánto riesgo estás dispuesto a asumir?");
        opciones([["Poco, prefiero algo terminado", "baja"], ["Medio, puedo esperar una obra", "media"], ["Alto, busco el mayor potencial", "alta"]]
          .map(([t, v]) => [t, () => { perfil().riesgo = v; ir("resultado"); }]));
      },
      resultado() {
        const ev = S.evaluate(perfil());
        Object.assign(perfil(), { recomendacion: ev.top, score: ev.scores[ev.top], scores: ev.scores, perfil: ev.perfil });
        decir(`Tu perfil es <b>${ev.perfil}</b>. Lo más adecuado: <b>${ev.producto.nombre}</b>, con un índice de idoneidad de <b>${ev.scores[ev.top]}/100</b>.`);
        decir("¿Querés que un asesor te contacte con proyectos concretos?");
        opciones([["Sí, contáctenme", () => ir("permiso")], ["Prefiero el informe completo", () => ir("simulador")], ["Ahora no, gracias", () => ir("fin")]]);
      },
      // Antes de pedir datos personales, el consentimiento explícito
      permiso() {
        decir(`Para que un asesor te escriba necesitamos guardar tu nombre y tu contacto. ¿Aceptás? <a href="${enlace("privacidad/index.html")}" target="_blank" rel="noopener">Política de privacidad</a>`);
        opciones([["Sí, acepto", () => { perfil().consentimiento = true; ir("nombre"); }], ["No, gracias", () => ir("fin")]]);
      },
      nombre() { decir("¿Cómo te llamás?"); pedir("Tu nombre", v => { perfil().nombre = v; ir("contacto"); }); },
      contacto() {
        decir("¿A qué WhatsApp o email te escribimos?");
        pedir("+34 600 000 000 o email", async v => {
          if (v.includes("@")) perfil().email = v; else perfil().telefono = v;
          try {
            const { guardado, ...lead } = perfil();
            await DB.insertLead(lead);
            perfil().guardado = true;
            decir(`Listo, ${esc(perfil().nombre)}. Guardamos tus datos y un asesor te escribe en el día.`);
          } catch (e) { console.error(e); decir("No pude guardar tus datos. Escribinos directo por WhatsApp."); }
          decir(`Si preferís, <a href="${waLink("Hola, soy " + perfil().nombre + ", hablé con el asistente de la web.")}" target="_blank" rel="noopener">escribinos por WhatsApp</a>.`);
          ir("hecho");
        });
      },
      hecho() { opciones([["Ver el informe en PDF", () => ir("simulador")], ["Terminar", () => ir("fin")]]); },
      simulador() {
        decir("Te llevo al simulador con tu perfil cargado: solo te falta completar tus datos.");
        const p = perfil();
        const datos = { capital: p.capital, moneda: "USD", objetivo: p.objetivo, riesgo: p.riesgo, pais: p.pais, financiacion: p.financiacion, nombre: p.nombre, paso: 3 };
        estado.paso = "fin"; guardarChat(); // al volver, la conversación queda cerrada
        if (!restaurando) setTimeout(() => window.YVYIrAlSimulador(datos), 900);
      },
      fin() { decir("Perfecto. Si te surge una duda, estoy acá."); opciones([["Empezar de nuevo", reiniciar]]); }
    };

    function reiniciar() {
      borrarChat();
      log.innerHTML = ""; ops.innerHTML = ""; inForm.hidden = true; esperando = null;
      estado = nuevoEstado();
      ir("inicio");
    }
    // Retoma la conversación guardada: historial + la última pregunta pendiente
    function restaurar(guardado) {
      estado = guardado;
      estado.mensajes.forEach(m => pintarMensaje(m.t, m.q));
      restaurando = true;
      try { (flujo[estado.paso] || flujo.fin)(); } finally { restaurando = false; }
    }

    const abrir = () => {
      chat.hidden = false; botBtn.setAttribute("aria-expanded", "true");
      if (!estado) { const g = leerChat(); if (g && g.mensajes.length) restaurar(g); else { estado = nuevoEstado(); ir("inicio"); } }
      log.scrollTop = log.scrollHeight;
    };
    const cerrar = () => { chat.hidden = true; botBtn.setAttribute("aria-expanded", "false"); };
    botBtn.addEventListener("click", () => (chat.hidden ? abrir() : cerrar()));
    $("#chat-cerrar").addEventListener("click", cerrar);
    const btnReiniciar = $("#chat-reiniciar");
    if (btnReiniciar) btnReiniciar.addEventListener("click", () => { if (!estado) estado = nuevoEstado(); reiniciar(); });
    // Si el visitante retira el permiso de preferencias, se borra la copia de largo plazo
    document.addEventListener("yvy:consentimiento", e => {
      if (!e.detail.preferencias) { try { localStorage.removeItem(CLAVE_CHAT); } catch (err) { /* sin almacenamiento */ } }
      else if (estado) guardarChat();
    });
  }

  /* ---------- Aparición suave de las secciones ---------- */
  const animables = $$(".pagina-cab__txt > *, .cabecera, .cifras, .diez, .sanber > *, .pr-barra, .pr-grid, .proyectos, .sim > *, .legal, .tabs, .servicios, .equipo, .faq, .contacto > *, .dest, .accesos > *, .cta-final");
  if ("IntersectionObserver" in window && !quieto) {
    const io = new IntersectionObserver(entradas => entradas.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("visto"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    animables.forEach(el => { el.classList.add("rv"); io.observe(el); });
  }

  /* ---------- Sesión: saludo en el menú y datos precargados ---------- */
  DB.rolActual().then(async rol => {
    if (!rol) return;
    const enlace = $("#nav-cliente span");
    if (rol === "equipo") { if (enlace) enlace.textContent = "Panel del equipo"; return; }
    const c = await DB.clienteActual();
    if (enlace) enlace.textContent = c && c.nombre ? "Hola, " + c.nombre.split(" ")[0] : "Mi cuenta";
    if (form && c) {
      if (!$("#nombre").value && c.nombre) $("#nombre").value = c.nombre;
      if (!$("#email").value) $("#email").value = c.email;
    }
  }).catch(() => {});
})();
