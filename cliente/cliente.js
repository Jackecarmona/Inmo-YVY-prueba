// Panel del cliente: propuestas, estado de la solicitud y favoritos.
// Sin sesión → página de acceso. Con cuenta del equipo → panel del equipo.
(() => {
  const DB = window.YVYDB, S = window.YVYScoring, cfg = window.YVY_CONFIG;
  const CASAS = window.YVY_CASAS || [];
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const waLink = txt => "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(txt);

  // Estados del back office traducidos para el cliente, en orden de avance
  const ESTADOS = {
    nuevo: ["Recibida", 1], contactado: ["Asesor asignado", 2], reunion: ["Reunión agendada", 3],
    propuesta: ["Propuesta enviada", 4], cerrado: ["Operación cerrada", 5], descartado: ["Archivada", 0]
  };
  const FUENTE = { formulario: "Simulador", chatbot: "Asistente", contacto: "Pedido de información" };

  $("#btn-salir").addEventListener("click", async () => { await DB.clienteSalir(); location.replace("../ingresar/index.html"); });

  async function mostrarPanel() {
    const rol = await DB.rolActual();
    if (rol === "equipo") return location.replace("../admin/index.html");
    const c = rol && (await DB.clienteActual());
    if (!c) return location.replace("../ingresar/index.html");

    $("#vista-panel").hidden = false;
    $("#saludo").innerHTML = "Hola" + (c.nombre ? ", <em>" + esc(c.nombre.split(" ")[0]) + "</em>" : "");

    let sols = [], favs = [];
    try { sols = await DB.misSolicitudes(c.email); } catch (ex) { console.error(ex); }
    try { favs = await DB.favoritos(); } catch (ex) { console.error(ex); }

    const activa = sols.find(s => s.estado !== "descartado");
    $("#kpis").innerHTML = `
      <div><b>${sols.length}</b><span>${sols.length === 1 ? "propuesta guardada" : "propuestas guardadas"}</span></div>
      <div><b>${favs.length}</b><span>residencias favoritas</span></div>
      <div><b style="font-size:1.4rem;padding-top:8px">${activa ? ESTADOS[activa.estado || "nuevo"][0] : "Sin solicitudes"}</b><span>estado de tu última solicitud</span></div>`;

    $("#lista-sol").innerHTML = sols.length ? sols.map((s, i) => {
      const [txt, paso] = ESTADOS[s.estado || "nuevo"] || ESTADOS.nuevo;
      const prod = s.recomendacion && S.PRODUCTS[s.recomendacion];
      const fecha = new Date(s.created_at).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
      return `
        <article class="cl-sol">
          <div>
            <span class="cl-estado cl-estado--${esc(s.estado || "nuevo")}">${txt}</span>
            <h3>${prod ? esc(prod.nombre) : esc(FUENTE[s.fuente] || "Solicitud")}</h3>
            <p>${fecha} · ${esc(FUENTE[s.fuente] || "")}${s.capital_usd ? " · Capital US$ " + miles(s.capital_usd) : ""}${s.score ? " · Idoneidad " + s.score + "/100" : ""}</p>
            ${paso ? `<div class="cl-pasos" aria-label="Avance: ${txt}">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= paso ? "on" : ""}"></i>`).join("")}</div>` : ""}
          </div>
          <div class="cl-sol__acc">
            ${prod && s.objetivo && s.riesgo ? `<button class="btn btn--oro" type="button" data-pdf="${i}">Descargar PDF</button>` : ""}
            <a class="btn btn--linea" target="_blank" rel="noopener" href="${waLink("Hola, soy " + (c.nombre || c.email) + ". Quiero consultar por mi propuesta" + (prod ? " (" + prod.nombre + ")" : "") + ".")}">Hablar con mi asesor</a>
          </div>
        </article>`;
    }).join("") : `
      <div class="cl-vacio">
        <p>Todavía no hay propuestas con el email <b>${esc(c.email)}</b>. Hacé una simulación y va a aparecer acá, con su informe en PDF.</p>
        <a class="btn btn--oro" href="../simulador/index.html">Hacer mi primera simulación</a>
      </div>`;
    $$("[data-pdf]").forEach(b => b.addEventListener("click", () => window.YVYPdf.download(sols[+b.dataset.pdf])));

    const casas = CASAS.filter(x => favs.includes(x.id));
    $("#lista-favs").innerHTML = casas.length
      ? `<div class="cl-favs">${casas.map(x => `
          <a class="cl-fav" href="../propiedades/index.html#${x.id}">
            <img src="../assets/props/${x.id}/01.jpg" alt="${esc(x.nombre)}" loading="lazy">
            <div><b>${esc(x.nombre)}</b><span>${x.precio ? `<span data-precio-usd="${x.precio}">${window.YVYMoneda ? YVYMoneda.formatear(x.precio) : "US$ " + miles(x.precio)}</span>` : "Consultar precio"}</span></div>
          </a>`).join("")}</div>`
      : `<div class="cl-vacio"><p>Tocá el corazón en cualquier residencia para guardarla acá.</p><a class="btn btn--linea" href="../propiedades/index.html">Ver residencias</a></div>`;
  }

  mostrarPanel();
})();
