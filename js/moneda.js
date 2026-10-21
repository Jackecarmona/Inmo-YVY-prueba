// Selector de moneda de la cabecera: muestra los precios convertidos a la moneda del visitante.
// Los precios de origen siguen en dólares (así se pactan las operaciones); la conversión es orientativa.
// Cotizaciones: open.er-api.com (diarias, sin clave). Si no responde, las de respaldo de js/config.js.
// Recordar la moneda elegida es una preferencia: solo se guarda con ese consentimiento (js/consentimiento.js).
//
// Uso desde otros scripts:
//   YVYMoneda.formatear(360000)          → "R$ 1.808.299" (si eligió reales)
//   YVYMoneda.formatear(900, "EUR")      → convierte desde euros
//   YVYMoneda.alCambiar(fn)              → vuelve a pintar precios cuando cambia la moneda o llegan cotizaciones
window.YVYMoneda = (() => {
  const cfg = window.YVY_CONFIG || {};
  const MONEDAS = {
    USD: { nombre: "Dólar estadounidense", antes: "US$ " },
    EUR: { nombre: "Euro", despues: " €" },
    BRL: { nombre: "Real brasileño", antes: "R$ " },
    ARS: { nombre: "Peso argentino", antes: "AR$ " },
    PYG: { nombre: "Guaraní paraguayo", antes: "₲ " },
    UYU: { nombre: "Peso uruguayo", antes: "$U " },
    CLP: { nombre: "Peso chileno", antes: "CLP$ " }
  };
  const CLAVE = "yvy_pref_divisa";
  const respaldo = cfg.tiposDeCambio || { fecha: "", USD: 1, EUR: 1 / (cfg.eurUsd || 1.1) };
  let tasas = { ...respaldo }, fecha = respaldo.fecha, fuente = "respaldo";
  const oyentes = [];

  const pref = () => !!(window.YVYConsentimiento && YVYConsentimiento.permite("preferencias"));
  let actual = "USD";
  try { const g = pref() && localStorage.getItem(CLAVE); if (g && MONEDAS[g]) actual = g; } catch (e) { /* sin almacenamiento */ }

  const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const convertir = (monto, desde = "USD", hacia = actual) => {
    const usd = desde === "USD" ? monto : monto / (tasas[desde] || 1);
    return usd * (tasas[hacia] || 1);
  };
  const conSimbolo = (n, m) => (MONEDAS[m].antes || "") + miles(n) + (MONEDAS[m].despues || "");
  const avisar = () => {
    oyentes.forEach(fn => { try { fn(actual); } catch (e) { console.error(e); } });
    document.dispatchEvent(new CustomEvent("yvy:moneda", { detail: actual }));
  };

  function elegir(m) {
    if (!MONEDAS[m] || m === actual) return;
    actual = m;
    if (pref()) { try { localStorage.setItem(CLAVE, m); } catch (e) { /* sin almacenamiento */ } }
    document.querySelectorAll("[data-selector-moneda]").forEach(s => { s.value = m; });
    avisar();
  }

  // Selector en la barra de la cabecera (visible también en móvil, fuera del menú desplegable)
  const ancla = document.querySelector(".header__in");
  if (ancla) {
    ancla.insertAdjacentHTML("beforeend", `
      <label class="moneda-sel">
        <span class="sr">Ver precios en</span>
        <select data-selector-moneda aria-label="Ver precios en">
          ${Object.entries(MONEDAS).map(([k, v]) => `<option value="${k}"${k === actual ? " selected" : ""} title="${v.nombre}">${k}</option>`).join("")}
        </select>
      </label>`);
    document.querySelectorAll("[data-selector-moneda]").forEach(s => s.addEventListener("change", e => elegir(e.target.value)));
  }

  // Cotizaciones del día
  fetch("https://open.er-api.com/v6/latest/USD")
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(d => {
      if (d.result !== "success") return;
      Object.keys(MONEDAS).forEach(k => { if (d.rates[k]) tasas[k] = d.rates[k]; });
      fecha = new Date(d.time_last_update_unix * 1000).toISOString().slice(0, 10);
      fuente = "en línea";
      if (actual !== "USD") avisar();
    })
    .catch(() => { /* quedan las cotizaciones de respaldo */ });

  return {
    MONEDAS,
    actual: () => actual,
    elegir,
    convertir,
    // Precio en la moneda elegida. Si la moneda de origen es otra, se marca como aproximado (≈).
    formatear(monto, desde = "USD") {
      if (monto == null || isNaN(monto)) return "";
      if (desde === actual) return conSimbolo(monto, actual);
      return "≈ " + conSimbolo(convertir(monto, desde), actual);
    },
    // El mismo monto en su moneda original (para mostrarlo como referencia)
    original: (monto, desde = "USD") => conSimbolo(monto, desde),
    nota() {
      const f = fecha ? fecha.split("-").reverse().join("/") : "";
      return `Conversión orientativa desde dólares${f ? ", con el tipo de cambio del " + f : ""}. Las operaciones se pactan en US$.`;
    },
    alCambiar: fn => oyentes.push(fn),
    info: () => ({ fecha, fuente, tasas: { ...tasas } })
  };
})();
