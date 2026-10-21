// Modelo clasificador de idoneidad (sin LLM): puntúa 4 tipos de inversión
// según el perfil del inversor y proyecta escenarios prudente / optimista.
// Es rápido, gratuito y explicable: cada punto tiene un motivo visible.
window.YVYScoring = (() => {
  const PRODUCTS = {
    lote: {
      nombre: "Lote en urbanización · San Bernardino",
      corto: "Lote en urbanización",
      desc: "Terreno en un desarrollo residencial cerca del Lago Ypacaraí, pagado en cuotas. Apuesta a la plusvalía de la zona, sin renta mientras no se construya.",
      ticket: [15000, 60000],
      supuestos: { rentaP: 0, rentaO: 0, plusP: 0.04, plusO: 0.09, gestion: 0, vacP: 0, vacO: 0, compra: 0.035, anual: 0.002, obra: 0 }
    },
    pozo: {
      nombre: "Departamento sobre plano · Asunción",
      corto: "Departamento sobre plano",
      desc: "Unidad en pozo con 10 % de entrada y cuotas al promotor. Gana plusvalía durante la obra y luego renta en alquiler temporal en dólares.",
      ticket: [45000, 130000],
      supuestos: { rentaP: 0.06, rentaO: 0.10, plusP: 0.03, plusO: 0.05, plusObraP: 0.08, plusObraO: 0.15, gestion: 0.20, vacP: 0.15, vacO: 0.08, compra: 0.035, anual: 0.002, obra: 2 }
    },
    terminado: {
      nombre: "Departamento terminado para renta",
      corto: "Departamento terminado",
      desc: "Propiedad lista para alquilar en Asunción o San Bernardino. Renta desde el primer mes, menor riesgo de ejecución.",
      ticket: [110000, 300000],
      supuestos: { rentaP: 0.06, rentaO: 0.085, plusP: 0.025, plusO: 0.04, gestion: 0.15, vacP: 0.10, vacO: 0.05, compra: 0.035, anual: 0.002, obra: 0 }
    },
    cartera: {
      nombre: "Cartera mixta · departamento + lote",
      corto: "Cartera mixta",
      desc: "Combina un departamento que renta (60 % del capital) con un lote en San Bernardino (40 %). Diversifica entre flujo de caja y plusvalía.",
      ticket: [180000, 1000000],
      supuestos: null
    }
  };

  const HORIZON_YEARS = { "1-3": 3, "3-5": 5, "5-10": 8, "10+": 10 };

  function toUsd(capital, moneda) {
    const rate = (window.YVY_CONFIG && window.YVY_CONFIG.eurUsd) || 1.1;
    return Math.round(moneda === "EUR" ? capital * rate : capital);
  }

  function inRange(x, [lo, hi]) {
    if (x >= lo && x <= hi) return 1;
    const d = x < lo ? (lo - x) / lo : (x - hi) / hi;
    return Math.max(0, 1 - d * 1.6);
  }

  // Devuelve { scores: {lote, pozo, ...} 0-100, ranking, perfil, motivos }
  function classify(input) {
    const usd = input.capital_usd || toUsd(+input.capital || 0, input.moneda);
    const r = { lote: 0, pozo: 0, terminado: 0, cartera: 0 };
    const why = { lote: [], pozo: [], terminado: [], cartera: [] };
    const add = (k, pts, motivo) => { r[k] += pts; if (motivo && pts > 0) why[k].push(motivo); };

    // 1. Capital frente al ticket típico (peso 35)
    for (const k of Object.keys(PRODUCTS)) {
      const fit = inRange(usd, PRODUCTS[k].ticket);
      add(k, 35 * fit, fit > 0.8 ? "Tu capital encaja con el ticket habitual" : null);
    }

    // 2. Objetivo (peso 25)
    const obj = {
      renta: { terminado: 25, pozo: 17, cartera: 18, lote: 2 },
      plusvalia: { lote: 25, pozo: 20, cartera: 15, terminado: 8 },
      uso: { terminado: 18, lote: 20, cartera: 14, pozo: 10 },
      diversificar: { cartera: 25, pozo: 14, terminado: 14, lote: 12 }
    }[input.objetivo] || {};
    const objTxt = { renta: "Prioriza renta", plusvalia: "Prioriza plusvalía", uso: "Combina disfrute y renta", diversificar: "Busca diversificar" }[input.objetivo];
    for (const k in obj) add(k, obj[k], objTxt ? objTxt + " (" + PRODUCTS[k].corto.toLowerCase() + " responde bien)" : null);

    // 3. Tolerancia al riesgo (peso 20)
    const risk = {
      baja: { terminado: 20, cartera: 14, pozo: 6, lote: 5 },
      media: { pozo: 18, cartera: 16, terminado: 14, lote: 12 },
      alta: { lote: 20, pozo: 18, cartera: 10, terminado: 6 }
    }[input.riesgo] || {};
    for (const k in risk) add(k, risk[k], risk[k] >= 16 ? "Acorde a tu tolerancia al riesgo " + input.riesgo : null);

    // 4. Horizonte (peso 12)
    const hz = {
      "1-3": { terminado: 12, pozo: 6, cartera: 7, lote: 2 },
      "3-5": { pozo: 12, terminado: 10, cartera: 10, lote: 8 },
      "5-10": { lote: 12, cartera: 12, pozo: 10, terminado: 9 },
      "10+": { lote: 12, cartera: 11, pozo: 8, terminado: 9 }
    }[input.horizonte] || {};
    for (const k in hz) add(k, hz[k], hz[k] >= 10 ? "Coincide con tu horizonte de " + (input.horizonte === "10+" ? "más de 10" : input.horizonte) + " años" : null);

    // 5. Forma de pago (peso 8)
    if (input.financiacion === "cuotas") { add("lote", 8, "Se paga en cuotas sin banco"); add("pozo", 8, "10 % de entrada y cuotas al promotor"); add("cartera", 3); }
    else { add("terminado", 8, "Compra al contado, renta inmediata"); add("cartera", 6); add("pozo", 3); add("lote", 3); }

    const scores = {};
    for (const k in r) scores[k] = Math.max(5, Math.min(99, Math.round(r[k])));
    const ranking = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);

    const perfil = input.riesgo === "baja" ? "Conservador" : input.riesgo === "alta" ? "Dinámico" : "Moderado";
    return { scores, ranking, top: ranking[0], perfil, capital_usd: usd, motivos: why };
  }

  // Proyección simple año a año, con supuestos visibles.
  function project(key, capitalUsd, horizonte) {
    const years = HORIZON_YEARS[horizonte] || 5;
    if (key === "cartera") {
      const a = project("terminado", capitalUsd * 0.6, horizonte);
      const b = project("lote", capitalUsd * 0.4, horizonte);
      const mix = s => ({
        valorFinal: a[s].valorFinal + b[s].valorFinal,
        rentaNeta: a[s].rentaNeta + b[s].rentaNeta,
        ganancia: a[s].ganancia + b[s].ganancia,
        roi: (a[s].ganancia + b[s].ganancia) / capitalUsd,
        anual: Math.pow(1 + (a[s].ganancia + b[s].ganancia) / capitalUsd, 1 / years) - 1
      });
      return { years, prudente: mix("prudente"), optimista: mix("optimista"), supuestos: ["60 % en departamento terminado y 40 % en lote, con los supuestos de cada uno."] };
    }
    const s = PRODUCTS[key].supuestos;
    const costoCompra = capitalUsd * s.compra;
    const valorInicial = capitalUsd - costoCompra;
    const run = (renta, plus, vac, plusObra) => {
      let valor = valorInicial, rentaNeta = 0;
      for (let y = 1; y <= years; y++) {
        const enObra = y <= s.obra;
        if (enObra) {
          if (y === s.obra) valor *= 1 + (plusObra || 0);
        } else {
          const bruta = valor * renta * (1 - vac);
          const neta = bruta * (1 - s.gestion) - bruta * 0.04; // IRP efectivo aprox. 4 % del alquiler
          rentaNeta += neta;
          valor *= 1 + plus;
        }
        rentaNeta -= valor * s.anual; // impuesto inmobiliario + tasas
      }
      const ganancia = valor + rentaNeta - capitalUsd;
      return { valorFinal: valor, rentaNeta, ganancia, roi: ganancia / capitalUsd, anual: Math.pow(Math.max(0.01, 1 + ganancia / capitalUsd), 1 / years) - 1 };
    };
    const pct = x => (x * 100).toLocaleString("es", { maximumFractionDigits: 1 }) + " %";
    const supuestos = [
      "Gastos de compra (escribanía e inscripción): " + pct(s.compra) + " del valor.",
      s.rentaP ? "Renta bruta anual: " + pct(s.rentaP) + " (prudente) a " + pct(s.rentaO) + " (optimista)." : "Sin renta: el lote no se alquila.",
      "Plusvalía anual: " + pct(s.plusP) + " a " + pct(s.plusO) + ".",
      s.obra ? "Obra de " + s.obra + " años; revalorización a la entrega de " + pct(s.plusObraP) + " a " + pct(s.plusObraO) + "." : null,
      s.gestion ? "Gestión del alquiler: " + pct(s.gestion) + " de lo cobrado; vacancia " + pct(s.vacO) + " a " + pct(s.vacP) + "." : null,
      s.rentaP ? "IRP efectivo aprox. 4 % del alquiler bruto (8 % sobre una base presunta del 50 %)." : null,
      "Impuesto inmobiliario y tasas: " + pct(s.anual) + " anual."
    ].filter(Boolean);
    return {
      years,
      prudente: run(s.rentaP, s.plusP, s.vacP, s.plusObraP),
      optimista: run(s.rentaO, s.plusO, s.vacO, s.plusObraO),
      supuestos
    };
  }

  function evaluate(input) {
    const c = classify(input);
    return { ...c, producto: PRODUCTS[c.top], proyeccion: project(c.top, c.capital_usd, input.horizonte) };
  }

  const usd = n => "US$ " + Math.round(n).toLocaleString("es");
  const pct = x => (x * 100).toLocaleString("es", { maximumFractionDigits: 1 }) + " %";

  return { PRODUCTS, classify, project, evaluate, toUsd, usd, pct };
})();
