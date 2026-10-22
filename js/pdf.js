// Genera el informe personalizado en PDF con jsPDF.
window.YVYPdf = (() => {
  const NOCHE = [17, 24, 32], DORADO = [198, 166, 107], MARFIL = [243, 240, 232], VERDE = [100, 117, 106], TINTA = [40, 46, 54];
  const S = window.YVYScoring;

  const LABELS = {
    objetivo: { renta: "Renta mensual", plusvalia: "Plusvalía", uso: "Uso personal y renta", diversificar: "Diversificar patrimonio" },
    riesgo: { baja: "Baja", media: "Media", alta: "Alta" },
    financiacion: { contado: "Contado", cuotas: "Entrada y cuotas" }
  };

  function build(lead) {
    const { jsPDF } = window.jspdf;
    const ev = S.evaluate(lead);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 18;
    let y = 0;

    // Cabecera
    doc.setFillColor(...NOCHE); doc.rect(0, 0, W, 38, "F");
    doc.setDrawColor(...DORADO); doc.setLineWidth(0.6);
    doc.rect(M, 10, 18, 18);
    doc.line(M + 3, 23, M + 15, 23); doc.line(M + 5, 25.5, M + 13, 25.5);
    doc.line(M + 3.5, 23, M + 9, 15); doc.line(M + 9, 15, M + 14.5, 23);
    doc.line(M + 11, 21, M + 11, 12.5); doc.line(M + 11, 12.5, M + 14, 12.5); doc.line(M + 14, 12.5, M + 14, 23);
    doc.setTextColor(...DORADO); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
    doc.text("YVY CAPITAL", M + 24, 19);
    doc.setTextColor(...MARFIL); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text("REAL ESTATE & INVESTMENTS  ·  PARAGUAY", M + 24, 25);
    doc.text("Informe de inversión personalizado", W - M, 19, { align: "right" });
    doc.text(new Date(lead.created_at || Date.now()).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }), W - M, 25, { align: "right" });

    y = 50;
    doc.setTextColor(...TINTA); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("Hola " + (lead.nombre || "inversor") + ", esta es tu propuesta", M, y);
    y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(90, 96, 104);
    doc.text(doc.splitTextToSize("Preparada a partir de las respuestas de tu formulario. Las cifras son estimaciones con supuestos visibles, no una promesa de rentabilidad.", W - 2 * M), M, y);

    // Perfil
    y += 14;
    const capTxt = (lead.moneda === "EUR" ? Math.round(+lead.capital).toLocaleString("es") + " € (aprox. " + S.usd(ev.capital_usd) + ")" : S.usd(ev.capital_usd));
    const rows = [
      ["País de residencia", lead.pais || "—"],
      ["Capital disponible", capTxt],
      ["Objetivo", LABELS.objetivo[lead.objetivo] || "—"],
      ["Tolerancia al riesgo", LABELS.riesgo[lead.riesgo] || "—"],
      ["Horizonte", (lead.horizonte || "—") + " años"],
      ["Forma de pago", LABELS.financiacion[lead.financiacion] || "—"]
    ];
    doc.setFillColor(...MARFIL); doc.rect(M, y - 5, W - 2 * M, 44, "F");
    doc.setFontSize(8); doc.setTextColor(...VERDE); doc.setFont("helvetica", "bold");
    doc.text("TU PERFIL  ·  " + ev.perfil.toUpperCase() + (lead.test_puntaje ? "  ·  TEST DE INVERSOR: " + String(lead.test_perfil || "").toUpperCase() + " " + lead.test_puntaje + "/100" : ""), M + 5, y + 1);
    doc.setFontSize(9.5);
    rows.forEach((r, i) => {
      const cx = M + 5 + (i % 2) * 88, cy = y + 10 + Math.floor(i / 2) * 10;
      doc.setFont("helvetica", "normal"); doc.setTextColor(110, 116, 124); doc.text(r[0], cx, cy);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...TINTA); doc.text(String(r[1]), cx, cy + 4.5);
    });

    // Recomendación
    y += 52;
    doc.setFontSize(8); doc.setTextColor(...VERDE); doc.text("INVERSIÓN RECOMENDADA", M, y);
    y += 7;
    doc.setFontSize(14); doc.setTextColor(...TINTA); doc.text(ev.producto.nombre, M, y);
    doc.setFillColor(...DORADO); doc.roundedRect(W - M - 36, y - 6, 36, 9, 1.5, 1.5, "F");
    doc.setTextColor(...NOCHE); doc.setFontSize(9.5); doc.text("Idoneidad " + ev.scores[ev.top] + "/100", W - M - 18, y - 0.4, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...TINTA);
    const d = doc.splitTextToSize(ev.producto.desc, W - 2 * M); doc.text(d, M, y); y += d.length * 4.6 + 2;
    const mot = (ev.motivos[ev.top] || []).slice(0, 4);
    mot.forEach(m => { doc.setTextColor(...DORADO); doc.text("•", M, y); doc.setTextColor(...TINTA); doc.text(m, M + 4, y); y += 5; });

    // Ranking de alternativas
    y += 4;
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...VERDE); doc.text("ÍNDICE DE IDONEIDAD POR ALTERNATIVA", M, y); y += 6;
    ev.ranking.forEach(k => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...TINTA);
      doc.text(S.PRODUCTS[k].corto, M, y);
      doc.setFillColor(228, 224, 214); doc.rect(M + 55, y - 3, 100, 3.6, "F");
      doc.setFillColor(...(k === ev.top ? DORADO : VERDE)); doc.rect(M + 55, y - 3, ev.scores[k], 3.6, "F");
      doc.text(String(ev.scores[k]), M + 160, y);
      y += 6.5;
    });

    // Escenarios
    y += 4;
    const p = ev.proyeccion;
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...VERDE);
    doc.text("EVALUACIÓN DE RENTABILIDAD A " + p.years + " AÑOS", M, y); y += 4;
    const cols = [M, M + 62, M + 118];
    doc.setFillColor(...NOCHE); doc.rect(M, y, W - 2 * M, 8, "F");
    doc.setTextColor(...MARFIL); doc.setFontSize(8.5);
    doc.text("Concepto", cols[0] + 3, y + 5.4); doc.text("Escenario prudente", cols[1], y + 5.4); doc.text("Escenario optimista", cols[2], y + 5.4);
    y += 8;
    const lines = [
      ["Valor estimado del inmueble", S.usd(p.prudente.valorFinal), S.usd(p.optimista.valorFinal)],
      ["Renta neta acumulada", S.usd(p.prudente.rentaNeta), S.usd(p.optimista.rentaNeta)],
      ["Ganancia total", S.usd(p.prudente.ganancia), S.usd(p.optimista.ganancia)],
      ["Retorno total", S.pct(p.prudente.roi), S.pct(p.optimista.roi)],
      ["Retorno anual equivalente", S.pct(p.prudente.anual), S.pct(p.optimista.anual)]
    ];
    lines.forEach((l, i) => {
      if (i % 2 === 0) { doc.setFillColor(...MARFIL); doc.rect(M, y, W - 2 * M, 7, "F"); }
      doc.setTextColor(...TINTA); doc.setFont("helvetica", i >= 3 ? "bold" : "normal");
      doc.text(l[0], cols[0] + 3, y + 4.8); doc.text(l[1], cols[1], y + 4.8); doc.text(l[2], cols[2], y + 4.8);
      y += 7;
    });

    y += 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...VERDE); doc.text("SUPUESTOS DEL CÁLCULO", M, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...TINTA);
    p.supuestos.forEach(t => { const s = doc.splitTextToSize("· " + t, W - 2 * M); doc.text(s, M, y); y += s.length * 4.2; });

    // Página 2: próximos pasos
    doc.addPage();
    doc.setFillColor(...NOCHE); doc.rect(0, 0, W, 16, "F");
    doc.setTextColor(...DORADO); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("YVY CAPITAL", M, 10.5);
    y = 32;
    doc.setTextColor(...TINTA); doc.setFontSize(14); doc.text("Comprar en Paraguay siendo extranjero", M, y); y += 9;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    [
      "Los extranjeros pueden comprar y escriturar a su nombre sin residencia ni cédula paraguaya.",
      "Solo se necesita pasaporte vigente o el documento de identidad del país de origen.",
      "No es obligatorio viajar: se puede firmar a distancia con un poder notarial apostillado.",
      "Hay que acreditar el origen lícito de los fondos.",
      "Gastos de escribanía e inscripción: entre el 3 % y el 4 % del valor. IVA de obra nueva: 10 %.",
      "Libre ingreso de capitales y libre repatriación de ganancias, sin restricciones cambiarias.",
      "Fiscalidad 10-10-10: sociedades, renta personal e IVA al 10 %. El alquiler tributa un 4 % efectivo."
    ].forEach(t => { const s = doc.splitTextToSize(t, W - 2 * M - 6); doc.setTextColor(...DORADO); doc.text("•", M, y); doc.setTextColor(...TINTA); doc.text(s, M + 5, y); y += s.length * 4.8 + 1.5; });

    y += 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Próximos pasos", M, y); y += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    ["Videollamada de 30 minutos con nuestro analista de inversiones.", "Selección de 2 o 3 proyectos que encajan con tu perfil, con planos y números.", "Revisión legal y notarial antes de reservar.", "Reserva, firma y seguimiento de la obra o del alquiler."]
      .forEach((t, i) => { doc.setFillColor(...DORADO); doc.circle(M + 2.5, y - 1.3, 2.6, "F"); doc.setTextColor(...NOCHE); doc.setFontSize(8); doc.text(String(i + 1), M + 2.5, y - 0.2, { align: "center" }); doc.setTextColor(...TINTA); doc.setFontSize(9.5); doc.text(t, M + 8, y); y += 8; });

    y += 6;
    const cfg = window.YVY_CONFIG || {};
    doc.setFillColor(...MARFIL); doc.rect(M, y, W - 2 * M, 18, "F");
    doc.setFont("helvetica", "bold"); doc.text("Hablemos", M + 5, y + 7);
    doc.setFont("helvetica", "normal"); doc.text("WhatsApp: +" + cfg.whatsapp + "   ·   Email: " + cfg.email, M + 5, y + 13);

    doc.setFontSize(7.5); doc.setTextColor(120, 124, 130);
    doc.text(doc.splitTextToSize("Aviso: informe orientativo generado automáticamente por un modelo de puntuación. No constituye asesoramiento financiero, fiscal ni legal. Proyectos y precios de ejemplo (ficticios) con fines de demostración. Rentabilidades pasadas o estimadas no garantizan resultados futuros.", W - 2 * M), M, 280);

    return doc;
  }

  function fileName(lead) {
    return "YVY-Capital-informe-" + String(lead.nombre || "inversor").toLowerCase().replace(/[^a-z0-9]+/gi, "-") + ".pdf";
  }

  // jsPDF (~360 KB) se descarga recién cuando hace falta, no al abrir la página.
  // preparar() lo adelanta en segundo plano (por ejemplo, cuando aparece el botón del PDF).
  const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  let carga = null;
  function preparar() {
    if (window.jspdf) return Promise.resolve();
    if (!carga) {
      carga = new Promise((ok, ko) => {
        const s = document.createElement("script");
        s.src = JSPDF_URL; s.async = true;
        s.onload = () => (window.jspdf ? ok() : ko(new Error("No se pudo preparar el PDF.")));
        s.onerror = () => { carga = null; s.remove(); ko(new Error("No se pudo descargar el generador de PDF. Revisá tu conexión e intentá de nuevo.")); };
        document.head.appendChild(s);
      });
    }
    return carga;
  }

  return {
    preparar,
    async download(lead) { await preparar(); build(lead).save(fileName(lead)); },
    async blobUrl(lead) { await preparar(); return build(lead).output("bloburl"); }
  };
})();
