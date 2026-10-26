// Estructura común de todas las páginas: íconos, fondo, cabecera, pie, botones flotantes,
// chatbot y la animación de entrada del logo (solo en Inicio, una vez por visita).
// Cada página indica en <body> su carpeta base (data-base="" o "../") y su sección (data-pagina).
(() => {
  const body = document.body;
  const B = body.dataset.base || "";
  const pagina = body.dataset.pagina || "";
  window.YVY_BASE = B;

  // Logo con un trazo por elemento (pathLength=1) para poder animarlo dibujándose
  const logo = (clase = "") => `
    <svg class="logo-svg ${clase}" viewBox="-1 -1 50 50" aria-hidden="true">
      <rect class="t1" x="1" y="1" width="46" height="46" rx="6" pathLength="1"/>
      <path class="t2" d="M10 30.2 24 13.2l14 17" pathLength="1"/>
      <path class="t3" d="M13.6 30.4 24 18.6l10.4 11.8" pathLength="1"/>
      <path class="t4" d="M9.6 34.2h28.8" pathLength="1"/>
      <path class="t5" d="M13 37.6h22" pathLength="1"/>
    </svg>`;

  const NAV = [
    ["propiedades", "propiedades/index.html", "Propiedades"],
    ["proyectos", "proyectos/index.html", "Proyectos"],
    ["invertir", "invertir/index.html", "Invertir en Paraguay"],
    ["simulador", "simulador/index.html", "Simulador"],
    ["nosotros", "nosotros/index.html", "Nosotros"]
  ];

  const sprite = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></symbol>
      <symbol id="i-wa" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.6-.5-1-1.1-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5.3-.4v-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.6.6-.9 1.4-.9 2.2.1 1 .5 1.9 1 2.7 1.1 1.6 2.5 2.9 4.2 3.7.5.2.9.4 1.4.5.5.2 1.1.2 1.6.1.6-.1 1.2-.5 1.5-1 .2-.4.2-.8.1-1.1l-.4-.2Z"/></symbol>
      <symbol id="i-tg" viewBox="0 0 24 24"><path fill="currentColor" d="M21.9 4.3 18.7 19.5c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9L1.8 12c-1-.3-1-1 .2-1.5l18.5-7.1c.9-.3 1.6.2 1.4.9Z"/></symbol>
      <symbol id="i-chat" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M4 5h16v11H9l-5 4V5Z"/><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8 9.5h8M8 12.5h5"/></symbol>
      <symbol id="i-flecha" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    </defs></svg>`;

  // La web pública no muestra ningún acceso al login: el equipo entra por /admin (o /login, /backoffice).
  // El enlace "Mi cuenta" del menú solo aparece si ya hay una sesión abierta (js/app.js).
  // El botón principal lleva al formulario de solicitud: el de Inicio, o el de Nosotros si estás ahí.
  const CTA = pagina === "inicio" ? "#solicitar" : pagina === "nosotros" ? "#contacto" : B + "index.html#solicitar";

  const header = `
    <header class="header" id="header">
      <div class="wrap header__in">
        <a class="logo" href="${B}index.html" aria-label="YVY Capital, inicio">
          ${logo()}
          <span><span class="logo__nombre">YVY CAPITAL</span><span class="logo__desc">REAL ESTATE &amp; INVESTMENTS</span></span>
        </a>
        <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="nav">Menú</button>
        <nav class="nav" id="nav">
          ${NAV.map(([id, href, txt]) => `<a href="${B}${href}"${id === pagina ? ' aria-current="page"' : ""}>${txt}</a>`).join("")}
          <a class="nav__cliente" href="${B}cliente/index.html" id="nav-cliente" hidden><svg><use href="#i-user"/></svg><span>Mi cuenta</span></a>
          <a class="btn btn--oro" href="${CTA}">Solicitar información</a>
        </nav>
      </div>
    </header>`;

  const footer = `
    <footer class="footer">
      <div class="wrap footer__in">
        <div>
          <a class="logo" href="${B}index.html">${logo()}<span><span class="logo__nombre">YVY CAPITAL</span><span class="logo__desc">PARAGUAY · REAL ESTATE · INVESTMENT</span></span></a>
          <nav class="footer__links" aria-label="Enlaces">
            ${NAV.map(([, href, txt]) => `<a href="${B}${href}">${txt}</a>`).join("")}
          </nav>
        </div>
        <nav class="footer__legal" aria-label="Información legal">
          <a href="${B}privacidad/index.html">Política de privacidad</a>
          <a href="${B}politica-cookies/index.html">Política de cookies</a>
          <button type="button" data-abrir-galletas>Preferencias de cookies</button>
        </nav>
        <p>Marca y proyectos sobre plano ficticios con fines de demostración académica. Las residencias de San Bernardino provienen de avisos públicos recopilados por el equipo. La información fiscal y legal es orientativa y no reemplaza el asesoramiento profesional. Las rentabilidades estimadas no garantizan resultados futuros.</p>
      </div>
    </footer>`;

  const flotantes = `
    <div class="flotantes">
      <button class="fab fab--bot" id="bot-btn" aria-label="Abrir asistente" aria-expanded="false"><svg><use href="#i-chat"/></svg></button>
      <a class="fab fab--wa" id="fab-wa" href="#" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp"><svg><use href="#i-wa"/></svg></a>
    </div>
    <div class="chat" id="chat" hidden role="dialog" aria-label="Asistente YVY">
      <div class="chat__head"><div><b>Asistente YVY</b><small>Te ayudo a encontrar tu inversión</small></div><div class="chat__acc"><button id="chat-reiniciar" type="button" class="chat__reiniciar" aria-label="Reiniciar conversación" title="Reiniciar conversación"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4M4.5 4.5v4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Reiniciar</span></button><button id="chat-cerrar" type="button" aria-label="Cerrar">×</button></div></div>
      <div class="chat__log" id="chat-log" aria-live="polite"></div>
      <div class="chat__ops" id="chat-ops"></div>
      <form class="chat__input" id="chat-input" hidden><label class="sr" for="chat-txt">Tu respuesta</label><input type="text" id="chat-txt"><button class="btn btn--noche" type="submit">Enviar</button></form>
    </div>`;

  const fondo = `<div class="fondo" aria-hidden="true"><i></i><i></i><i></i></div>`;

  body.insertAdjacentHTML("afterbegin", sprite + fondo + (body.dataset.sinMenu === undefined ? header : ""));
  // Rayos de luz animados en el fondo (WebGL) y vídeos de fondo de portada y cabeceras.
  // Se cargan aparte para no frenar el resto de la página.
  const cargarScript = archivo => {
    const s = document.createElement("script");
    s.src = B + "js/" + archivo;
    s.async = true;
    document.head.appendChild(s);
  };
  if (document.querySelector("[data-video-fondo]")) cargarScript("video-fondo.js");

  // Los rayos compilan un shader WebGL (tarea pesada): se cargan recién cuando se pueden ver.
  // Si una portada con vídeo tapa la pantalla, al primer scroll; si no, cuando la página ya cargó y está libre.
  let rayosPedidos = false;
  const pedirRayos = () => { if (!rayosPedidos) { rayosPedidos = true; cargarScript("rayos.js"); } };
  const enReposo = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));
  const portadaOpaca = document.querySelector(".hc, .pagina-cab[data-video-fondo]");
  if (portadaOpaca && portadaOpaca.getBoundingClientRect().bottom >= innerHeight * 0.85) {
    addEventListener("scroll", pedirRayos, { once: true, passive: true });
  } else if (document.readyState === "complete") enReposo(pedirRayos);
  else addEventListener("load", () => enReposo(pedirRayos), { once: true });

  // Cabecera de las páginas interiores: el isotipo grande, dibujándose, en lugar de una foto
  const cab = document.querySelector(".pagina-cab");
  if (cab) cab.insertAdjacentHTML("afterbegin", `<div class="pagina-cab__marca" aria-hidden="true">${logo()}</div>`);

  const main = document.querySelector("main");
  if (body.dataset.sinMenu === undefined) {
    (main || body).insertAdjacentHTML("afterend", footer);
    body.insertAdjacentHTML("beforeend", flotantes);
  }

  /* ---------- Animación de entrada del logo ---------- */
  // YVYAlTerminarIntro(fn) corre fn cuando termina la intro, o enseguida si ya terminó
  // (sin esto, en la segunda visita el aviso llegaba antes de que cargaran los demás scripts).
  let introLista = false;
  const terminarIntro = () => {
    if (introLista) return;
    introLista = true;
    document.dispatchEvent(new Event("yvy:intro-fin"));
  };
  window.YVYAlTerminarIntro = fn => {
    if (introLista) fn();
    else document.addEventListener("yvy:intro-fin", fn, { once: true });
  };
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // La intro se ve al entrar a la web, no al volver a Inicio desde otra página del sitio.
  // Recordarlo en sessionStorage es una preferencia: solo se guarda con ese consentimiento.
  const C = window.YVYConsentimiento;
  const prefs = !!(C && C.permite("preferencias"));
  let yaVista = false;
  try { yaVista = new URL(document.referrer).origin === location.origin && location.origin !== "null"; } catch (e) { /* sin referrer */ }
  try { yaVista = yaVista || (prefs && sessionStorage.getItem("yvy_intro") === "1"); } catch (e) { /* sin almacenamiento */ }
  if (body.dataset.intro !== undefined && !quieto && !yaVista) {
    if (prefs) { try { sessionStorage.setItem("yvy_intro", "1"); } catch (e) { /* sin almacenamiento */ } }
    const letras = "YVY CAPITAL".split("").map((l, i) => `<span style="--i:${i}">${l === " " ? "&nbsp;" : l}</span>`).join("");
    body.insertAdjacentHTML("beforeend", `
      <div class="intro" id="intro" aria-hidden="true">
        <div class="intro__cortina intro__cortina--a"></div>
        <div class="intro__cortina intro__cortina--b"></div>
        <div class="intro__marca">
          ${logo("intro__logo")}
          <div class="intro__nombre">${letras}</div>
          <div class="intro__desc">Paraguay · Real Estate · Investment</div>
          <i class="intro__linea"></i>
        </div>
        <button class="intro__saltar" type="button" tabindex="-1">Saltar</button>
      </div>`);
    body.classList.add("con-intro");
    const intro = document.getElementById("intro");
    let cerrado = false;
    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      intro.classList.add("fin");
      body.classList.remove("con-intro");
      terminarIntro();
      setTimeout(() => intro.remove(), 1300);
    };
    setTimeout(cerrar, 2200); // la intro dura poco: la portada tiene que verse rápido
    intro.addEventListener("click", cerrar);
    addEventListener("keydown", cerrar, { once: true });
  } else {
    // Sin intro, la portada arranca enseguida
    setTimeout(terminarIntro, 0);
  }
})();
