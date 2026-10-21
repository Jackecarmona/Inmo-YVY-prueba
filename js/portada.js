// Portada de Inicio: título y buscador.
// El vídeo de fondo lo maneja js/video-fondo.js y el logo de partículas, js/particulas.js.
(() => {
  const hc = document.getElementById("hc");
  if (!hc) return;
  const $ = (s, el = document) => el.querySelector(s);
  const B = window.YVY_BASE || "";

  // El título aparece cuando termina la intro del logo (o enseguida si ya se vio)
  if (window.YVYAlTerminarIntro) YVYAlTerminarIntro(() => hc.classList.add("listo")); else hc.classList.add("listo");

  /* ---------- Buscador ---------- */
  const form = $("#buscador");
  if (!form) return;
  const selCiudad = $("#buscador-ciudad"), selMax = $("#buscador-max");
  // Topes de presupuesto en dólares; el texto se muestra en la moneda elegida (js/moneda.js)
  const MAX = { venta: [250000, 350000, 500000, 1000000], alquiler: [500, 1000, 2000, 4000] };
  const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const pintarMax = () => {
    const op = form.elements.op.value, elegido = selMax.value;
    const texto = v => (window.YVYMoneda ? YVYMoneda.formatear(v) : "US$ " + miles(v)) + (op === "alquiler" ? " / mes" : "");
    selMax.innerHTML = `<option value="">Sin límite</option>` + MAX[op].map(v => `<option value="${v}">${texto(v)}</option>`).join("");
    if ([...selMax.options].some(o => o.value === elegido)) selMax.value = elegido;
  };
  form.addEventListener("change", e => { if (e.target.name === "op") { selMax.value = ""; pintarMax(); } });
  if (window.YVYMoneda) { pintarMax(); YVYMoneda.alCambiar(pintarMax); }

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
