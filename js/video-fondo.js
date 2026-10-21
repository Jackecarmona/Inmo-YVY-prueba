// Vídeos de fondo (portada de Inicio y cabeceras de las páginas interiores).
// Uso:  <header class="pagina-cab" data-video-fondo="proyectos">  → arma el vídeo con
//       assets/videos/proyectos.mp4, proyectos-movil.mp4, proyectos-poster.jpg y proyectos-poster-movil.jpg
//       Si el elemento ya trae su <video data-src> (como la portada), se usa ese.
// El vídeo se carga después de la página (primero se ve la imagen poster) y solo si conviene:
// · "reducir movimiento", ahorro de datos o conexión 2G/3G → queda la imagen fija;
// · pantalla de hasta 760 px → versión liviana (-movil.mp4).
// Se pausa cuando no se ve y tiene botón de pausa (todo lo que se mueve más de 5 s debe poder detenerse).
(() => {
  const B = window.YVY_BASE || "";
  const reducir = matchMedia("(prefers-reduced-motion: reduce)");
  const red = navigator.connection || {};
  const lenta = !!red.saveData || /^(slow-2g|2g|3g)$/.test(red.effectiveType || "");
  const movil = () => matchMedia("(max-width: 760px)").matches;

  const ICONO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pausa" d="M9 6v12M15 6v12"/><path class="i-play" d="M8 5.5v13l11-6.5z"/></svg>`;

  function armar(caja) {
    const n = caja.dataset.videoFondo, ruta = B + "assets/videos/" + n;
    caja.insertAdjacentHTML("afterbegin", `
      <div class="vf" aria-hidden="true">
        <picture>
          <source media="(max-width: 760px)" srcset="${ruta}-poster-movil.jpg">
          <img class="vf__poster" src="${ruta}-poster.jpg" alt="" width="1920" height="1080" decoding="async">
        </picture>
        <video class="vf__video" muted loop playsinline preload="none" disablepictureinpicture
          data-src="${ruta}.mp4" data-src-movil="${ruta}-movil.mp4"></video>
      </div>
      <div class="vf__velo" aria-hidden="true"></div>`);
    caja.insertAdjacentHTML("beforeend", `<button class="vf__pausa" type="button" data-video-pausa hidden>${ICONO}</button>`);
  }

  function iniciar(caja) {
    if (!caja.querySelector("video[data-src]")) armar(caja);
    const video = caja.querySelector("video[data-src]"), pausa = caja.querySelector("[data-video-pausa]");
    let pausadoPorUsuario = false, visible = true;

    const pintarBoton = () => {
      if (!pausa) return;
      pausa.setAttribute("aria-pressed", String(video.paused));
      pausa.setAttribute("aria-label", video.paused ? "Reproducir el vídeo de fondo" : "Pausar el vídeo de fondo");
    };
    const reproducir = () => {
      if (pausadoPorUsuario || !visible || document.hidden || reducir.matches || !video.src) return;
      const p = video.play();
      if (p) p.catch(() => {}); // si el navegador bloquea la reproducción automática, queda el poster
    };
    const sinVideo = () => { caja.classList.add("sin-video"); if (pausa) pausa.hidden = true; };

    function cargar() {
      if (reducir.matches || lenta) return sinVideo();
      video.muted = true; // como propiedad, además del atributo: lo exigen algunos navegadores para el autoplay
      video.src = movil() ? video.dataset.srcMovil : video.dataset.src;
      video.addEventListener("playing", () => { caja.classList.add("con-video"); if (pausa) pausa.hidden = false; pintarBoton(); }, { once: true });
      video.addEventListener("error", sinVideo);
      video.addEventListener("pause", pintarBoton);
      video.addEventListener("play", pintarBoton);
      reproducir();
    }

    if (pausa) pausa.addEventListener("click", () => {
      pausadoPorUsuario = !video.paused;
      if (pausadoPorUsuario) video.pause(); else reproducir();
    });
    if ("IntersectionObserver" in window) new IntersectionObserver(en => {
      visible = en[0].isIntersecting;
      if (visible) reproducir(); else video.pause();
    }).observe(caja);
    document.addEventListener("visibilitychange", () => (document.hidden ? video.pause() : reproducir()));
    if (reducir.addEventListener) reducir.addEventListener("change", () => { if (reducir.matches) { video.pause(); sinVideo(); } });
    if (document.readyState === "complete") cargar(); else addEventListener("load", cargar, { once: true });
  }

  document.querySelectorAll("[data-video-fondo]").forEach(iniciar);
})();
