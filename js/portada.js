// Portada de Inicio: vídeo de fondo y buscador.
// El vídeo se carga después de la página (la imagen poster es lo primero que se ve) y solo si conviene:
// · "reducir movimiento" activado → queda la imagen fija;
// · ahorro de datos o conexión 2G/3G → queda la imagen fija;
// · pantalla chica → versión liviana (portada-movil.mp4).
(() => {
  const hc = document.getElementById("hc");
  if (!hc) return;
  const $ = (s, el = document) => el.querySelector(s);
  const B = window.YVY_BASE || "";

  /* ---------- Vídeo de fondo ---------- */
  const video = $(".hc__video", hc), pausa = $("#hc-pausa");
  const reducir = matchMedia("(prefers-reduced-motion: reduce)");
  const red = navigator.connection || {};
  const lenta = !!red.saveData || /^(slow-2g|2g|3g)$/.test(red.effectiveType || "");
  let pausadoPorUsuario = false, visible = true;

  const pintarBoton = () => {
    const parado = video.paused;
    pausa.setAttribute("aria-pressed", String(parado));
    pausa.setAttribute("aria-label", parado ? "Reproducir el vídeo de fondo" : "Pausar el vídeo de fondo");
  };
  const reproducir = () => {
    if (pausadoPorUsuario || !visible || document.hidden || reducir.matches) return;
    const p = video.play();
    // Si el navegador bloquea la reproducción automática, queda el poster
    if (p) p.catch(() => {});
  };

  function cargarVideo() {
    if (reducir.matches || lenta || !video) { hc.classList.add("sin-video"); return; }
    video.muted = true; // como propiedad, además del atributo: lo exigen algunos navegadores para el autoplay
    video.src = matchMedia("(max-width: 760px)").matches ? video.dataset.srcMovil : video.dataset.src;
    video.addEventListener("playing", () => { hc.classList.add("con-video"); pausa.hidden = false; pintarBoton(); }, { once: true });
    video.addEventListener("error", () => { hc.classList.add("sin-video"); pausa.hidden = true; });
    video.addEventListener("pause", pintarBoton);
    video.addEventListener("play", pintarBoton);
    reproducir();
  }

  if (video) {
    pausa.addEventListener("click", () => {
      pausadoPorUsuario = !video.paused;
      if (pausadoPorUsuario) video.pause(); else reproducir();
    });
    // Ahorra batería y datos: el vídeo se detiene cuando no se ve
    if ("IntersectionObserver" in window) new IntersectionObserver(en => {
      visible = en[0].isIntersecting;
      if (visible) reproducir(); else video.pause();
    }).observe(hc);
    document.addEventListener("visibilitychange", () => (document.hidden ? video.pause() : reproducir()));
    reducir.addEventListener?.("change", () => { if (reducir.matches) { video.pause(); hc.classList.add("sin-video"); pausa.hidden = true; } });
    if (document.readyState === "complete") cargarVideo(); else addEventListener("load", cargarVideo, { once: true });
  }

  // El título aparece cuando termina la intro del logo (o enseguida si ya se vio)
  if (window.YVYAlTerminarIntro) YVYAlTerminarIntro(() => hc.classList.add("listo")); else hc.classList.add("listo");

  /* ---------- Buscador ---------- */
  const form = $("#buscador");
  if (!form) return;
  const selCiudad = $("#buscador-ciudad"), selMax = $("#buscador-max");
  const MAX = {
    venta: [["", "Sin límite"], ["250000", "US$ 250.000"], ["350000", "US$ 350.000"], ["500000", "US$ 500.000"], ["1000000", "US$ 1.000.000"]],
    alquiler: [["", "Sin límite"], ["500", "US$ 500 / mes"], ["1000", "US$ 1.000 / mes"], ["2000", "US$ 2.000 / mes"], ["4000", "US$ 4.000 / mes"]]
  };
  form.addEventListener("change", e => {
    if (e.target.name !== "op") return;
    selMax.innerHTML = MAX[e.target.value].map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
  });

  // Ubicaciones reales: las de la cartera y las publicadas desde el Back Office
  const ciudades = new Set([...selCiudad.options].map(o => o.value).filter(Boolean));
  const sumar = lista => {
    lista.forEach(c => { if (c && !ciudades.has(c)) { ciudades.add(c); selCiudad.add(new Option(c, c)); } });
  };
  if (window.YVYDB) YVYDB.propiedades().then(rows => sumar(rows.map(p => p.ciudad))).catch(() => {});

  // Enviar solo los filtros elegidos (URL limpia: propiedades/index.html?op=venta&dorm=3)
  form.addEventListener("submit", e => {
    e.preventDefault();
    const q = new URLSearchParams();
    new FormData(form).forEach((v, k) => { if (v) q.set(k, v); });
    location.href = B + "propiedades/index.html?" + q.toString();
  });
})();
