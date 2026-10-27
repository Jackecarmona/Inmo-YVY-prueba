// Asistente con IA del chat de la web (función serverless de Vercel: POST /api/chat).
// Recibe la conversación, le suma las instrucciones y la cartera de casas, y la envía a OpenRouter.
// La clave vive solo en el servidor: variable de entorno OPENROUTER_API_KEY (ver README).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const MODELO = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-lightning:free";
const SITIO = process.env.SITE_URL || "https://yvy-three.vercel.app";
const MAX_MENSAJES = 16, MAX_CARACTERES = 800, LIMITE_MS = 25000;

// Cartera: los mismos archivos que usa la web (js/propiedades-data.js y js/proyectos-data.js), leídos una vez
const leerDatos = archivo => {
  const caja = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), "js", archivo), "utf8"), caja);
  return caja.window;
};
const usd = n => "US$ " + n.toLocaleString("es-PY");
let cartera = null, proyectos = null;
function leerCartera() {
  if (cartera !== null) return cartera;
  try {
    cartera = (leerDatos("propiedades-data.js").YVY_CASAS || []).map(c => [
      `- ${c.nombre} (${c.zona}, San Bernardino): ${c.precio ? usd(c.precio) : "precio a consultar"}`,
      `${c.estado || ""}, ${c.construido || "?"} m² construidos, terreno ${c.terreno || "?"} m², ${c.dorm || "?"} dormitorios, ${c.banos || "?"} baños.`,
      c.resumen || ""
    ].join(" ")).join("\n");
  } catch (e) {
    console.error("No se pudo leer la cartera:", e.message);
    cartera = "";
  }
  return cartera;
}
function leerProyectos() {
  if (proyectos !== null) return proyectos;
  const TIPO = { lote: "lote", pozo: "sobre plano", terminado: "terminado" };
  try {
    proyectos = (leerDatos("proyectos-data.js").YVY_PROYECTOS || []).map(p =>
      `- ${p.nombre} (${TIPO[p.tipo]}, ${p.loc}): precio total ${usd(p.precio)}, entrega inicial ${p.anticipo >= p.precio ? "contado" : usd(p.anticipo)} (${p.cuotas}), ` +
      `plusvalía estimada ${p.plusvalia}, estado ${p.estado === "pozo" ? "en pozo" : "listo para titular"}. ${p.specs.map(s => s.join(" ")).join(", ")}.`
    ).join("\n");
  } catch (e) {
    console.error("No se pudieron leer los proyectos:", e.message);
    proyectos = "";
  }
  return proyectos;
}

const instrucciones = () => `Sos el asistente virtual de YVY Capital, una inmobiliaria que ayuda a inversores de España, Argentina y Brasil a invertir en Paraguay.
Respondé siempre en español rioplatense (voseo), con calidez y en pocas frases: como máximo 120 palabras. Sin tablas ni encabezados.

Lo que ofrece YVY Capital (el foco está en inversores):
- Lotes y desarrollos de alta plusvalía en San Bernardino y Asunción: se entra desde el 10 % y el resto se paga en cuotas al promotor, sin banco. Plusvalía estimada: lotes 4–9 % anual; sobre plano 8–15 % a la entrega y luego 3–5 % anual; terminados 2,5–4 % anual (orientativa, no garantizada). En la portada hay una calculadora de plusvalía a 3 y 5 años.
- Compra desde el exterior en 3 pasos: elegir el lote (por videollamada, con plano y situación del título), reservar con firma a distancia y pago inicial, y escritura ante escribano público inscripta en el Registro Público a nombre del comprador (en persona o con poder notarial).
- Residencias en San Bernardino, frente al Lago Ypacaraí (la cartera está abajo).
- Datos generales: precio medio en Asunción de 1.697 US$/m² (marzo 2025); impuesto efectivo sobre el alquiler del 4 % (régimen 10-10-10); libre repatriación de ganancias; se puede comprar sin viajar, con pasaporte y poder notarial; renta temporal estimada del 8 al 12 % en dólares (orientativa, no garantizada).
- En la web hay un simulador de inversión que arma una propuesta en PDF.

Lotes y desarrollos (ejemplos de la web):
${leerProyectos() || "(no disponible: invitá a ver la página Proyectos)"}

Cartera de residencias en San Bernardino:
${leerCartera() || "(no disponible: invitá a ver la página Propiedades)"}

Reglas:
- Usá solo esta información. Si no sabés algo (disponibilidad, visitas, documentos, precios no listados), decí que un asesor lo confirma.
- No inventes propiedades, precios ni rentabilidades. Las cifras son orientativas y no constituyen asesoramiento financiero, legal ni fiscal.
- No pidas datos personales en el chat. Si la persona quiere que la contacten, ver una propiedad o recibir una propuesta, invitala a tocar el botón «Que me contacte un asesor» o a completar el formulario «Solicitar información».
- Si te preguntan algo ajeno a invertir o vivir en Paraguay, respondé brevemente que solo podés ayudar con eso.`;

// Límite simple por IP (por instancia del servidor): evita que se agote el cupo gratuito
const visitas = new Map();
function superaLimite(ip) {
  const ahora = Date.now(), ventana = 10 * 60 * 1000, max = 30;
  const lista = (visitas.get(ip) || []).filter(t => ahora - t < ventana);
  lista.push(ahora);
  visitas.set(ip, lista);
  if (visitas.size > 5000) visitas.clear();
  return lista.length > max;
}

// Solo se aceptan pedidos desde la propia web
function origenPermitido(req) {
  const origen = req.headers.origin;
  if (!origen) return true; // mismo origen en algunos navegadores
  try {
    const { host, hostname } = new URL(origen);
    return host === req.headers.host || hostname === "localhost" || hostname === "127.0.0.1";
  } catch (e) { return false; }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Método no permitido" }); }
  if (!origenPermitido(req)) return res.status(403).json({ error: "Origen no permitido" });
  if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: "El asistente no está configurado" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  if (superaLimite(ip)) return res.status(429).json({ error: "Demasiadas preguntas seguidas. Probá en unos minutos." });

  // Solo turnos de usuario y asistente, recortados: las instrucciones las pone siempre el servidor
  const recibidos = req.body && Array.isArray(req.body.messages) ? req.body.messages : null;
  if (!recibidos || !recibidos.length) return res.status(400).json({ error: "Falta el mensaje" });
  const mensajes = recibidos
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_MENSAJES)
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_CARACTERES) }));
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") return res.status(400).json({ error: "Falta el mensaje" });

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), LIMITE_MS);
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: corte.signal,
      headers: {
        "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
        "Content-Type": "application/json",
        "HTTP-Referer": SITIO,
        "X-Title": "YVY Capital"
      },
      body: JSON.stringify({
        model: MODELO,
        messages: [{ role: "system", content: instrucciones() }, ...mensajes],
        max_tokens: 2500,
        temperature: 0.4,
        // Es un modelo que "razona": con el razonamiento activo gastaba todos los tokens en pensar
        // y la respuesta llegaba vacía o cortada. Para preguntas cortas no hace falta.
        reasoning: { enabled: false, exclude: true }
      })
    });
    const datos = await r.json().catch(() => ({}));
    // "detalle" (código y mensaje de OpenRouter, sin la clave) ayuda a diagnosticar: clave inválida,
    // modelo inexistente o la opción de modelos gratuitos desactivada en openrouter.ai/settings/privacy
    const detalle = d => [r.status, d && d.error && (d.error.message || d.error)].filter(Boolean).join(" · ").slice(0, 300);
    if (!r.ok) {
      console.error("OpenRouter", r.status, datos && datos.error);
      const ocupado = r.status === 429;
      return res.status(ocupado ? 429 : 502).json({ error: ocupado ? "El asistente está muy solicitado. Probá en un momento." : "El asistente no pudo responder.", detalle: detalle(datos) });
    }
    const texto = (datos.choices && datos.choices[0] && datos.choices[0].message && datos.choices[0].message.content || "").trim();
    if (!texto) {
      console.error("OpenRouter sin texto", JSON.stringify(datos).slice(0, 500));
      return res.status(502).json({ error: "El asistente no pudo responder.", detalle: "respuesta vacía · " + ((datos.choices && datos.choices[0] && datos.choices[0].finish_reason) || "sin motivo") });
    }
    return res.status(200).json({ respuesta: texto });
  } catch (e) {
    console.error("Chat:", e.name === "AbortError" ? "tiempo agotado" : e.message);
    return res.status(504).json({ error: "El asistente tardó demasiado. Probá de nuevo." });
  } finally {
    clearTimeout(reloj);
  }
};
