// Portada: el logo de YVY Capital formado por partículas doradas.
// Al cargar, las partículas vuelan y arman el logo; el cursor (o el dedo) las dispersa
// y vuelven a su lugar como limaduras de oro atraídas por un imán.
// Uso: <canvas id="particulas"></canvas> dentro de un contenedor con tamaño.
(() => {
  const canvas = document.getElementById("particulas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ORO = ["#c6a66b", "#e3cb98", "#9a7d47", "#f3e2b8"];

  // Trazos del logo (viewBox 0 0 48 48), los mismos del isotipo
  const TRAZOS = ["M10 30.2 24 13.2l14 17", "M13.6 30.4 24 18.6l10.4 11.8", "M9.6 34.2h28.8", "M13 37.6h22"];

  let W = 0, H = 0, dpr = 1, puntos = [], parts = [], armado = false, vivo = true, visible = true;
  const mouse = { x: -9999, y: -9999, activo: false };

  // Dibuja el logo en un lienzo oculto y toma una muestra de sus píxeles como destinos
  function muestrear() {
    const ancho = W >= 900;
    let lado, cx, cy;
    // Portada con vídeo y buscador (Inicio): el logo va a la derecha del título, entre la cabecera y el buscador;
    // en móvil, arriba y centrado, en el espacio que deja libre el título.
    const buscar = zona.querySelector(".hc__buscar"), cab = 96;
    if (buscar) {
      const libre = buscar.offsetTop - cab - 24;
      lado = ancho ? Math.min(W * 0.27, libre, 400) : Math.min(W * 0.5, 190);
      cx = ancho ? W * 0.76 : W / 2;
      cy = ancho ? cab + libre / 2 : cab + 12 + lado / 2;
    } else {
      lado = Math.min(ancho ? W * 0.3 : W * 0.78, H * (ancho ? 0.62 : 0.5), 460);
      cx = ancho ? W * 0.77 : W / 2; cy = ancho ? H * 0.45 : H * 0.3;
    }
    // Posición para la pista "Mové el cursor · dispersalo", debajo del logo
    zona.style.setProperty("--logo-x", cx + "px");
    zona.style.setProperty("--logo-y", cy + lado / 2 + 18 + "px");
    const off = document.createElement("canvas");
    off.width = Math.ceil(W); off.height = Math.ceil(H);
    const o = off.getContext("2d");
    const s = lado / 48;
    o.save();
    o.translate(cx - lado / 2, cy - lado / 2);
    o.scale(s, s);
    o.strokeStyle = "#fff"; o.lineCap = "round"; o.lineJoin = "round";
    o.lineWidth = 1.5;
    o.beginPath();
    if (o.roundRect) o.roundRect(1, 1, 46, 46, 6); else o.rect(1, 1, 46, 46);
    o.stroke();
    o.lineWidth = 1.7;
    TRAZOS.forEach(d => o.stroke(new Path2D(d)));
    o.restore();
    const paso = Math.max(4, Math.round(lado / 105));
    const datos = o.getImageData(0, 0, off.width, off.height).data;
    const res = [];
    for (let y = 0; y < off.height; y += paso)
      for (let x = 0; x < off.width; x += paso)
        if (datos[(y * off.width + x) * 4 + 3] > 120) res.push([x + (Math.random() - .5) * paso * .6, y + (Math.random() - .5) * paso * .6]);
    return res;
  }

  function crear() {
    puntos = muestrear();
    const previas = parts;
    parts = puntos.map(([tx, ty], i) => {
      const p = previas[i];
      const ang = Math.random() * Math.PI * 2, r = Math.max(W, H) * (0.4 + Math.random() * 0.6);
      return {
        x: p ? p.x : (armado || quieto ? tx : W / 2 + Math.cos(ang) * r),
        y: p ? p.y : (armado || quieto ? ty : H / 2 + Math.sin(ang) * r),
        vx: 0, vy: 0, tx, ty,
        tam: Math.random() < 0.12 ? 1.9 : 0.9 + Math.random() * 0.8,
        color: ORO[(Math.random() * ORO.length) | 0],
        fase: Math.random() * Math.PI * 2,
        retraso: Math.random() * 0.9
      };
    });
    // Polvo de oro suelto que flota alrededor
    const extra = Math.round((W * H) / 26000);
    for (let i = 0; i < extra; i++) {
      parts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, tx: null, ty: null, tam: 0.6 + Math.random() * 0.9,
        color: ORO[(Math.random() * ORO.length) | 0], fase: Math.random() * 6.28, deriva: (Math.random() - .5) * 0.15, retraso: 0 });
    }
  }

  function ajustar() {
    const r = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    crear();
    if (quieto) dibujar(0);
  }

  let inicio = 0, previo = 0;
  function paso() {
    if (!vivo) return;
    requestAnimationFrame(paso);
    const t = performance.now();
    // Física por tiempo real (no por cuadro): igual de fluida a 30 o a 120 fps
    const dt = previo ? Math.min(3, (t - previo) / 16.67) : 1;
    previo = t;
    if (!visible) return;
    const seg = inicio ? (t - inicio) / 1000 : 0;
    const roce = Math.pow(0.86, dt);
    const R = Math.min(W, H) * 0.14, R2 = R * R;
    for (const p of parts) {
      if (p.tx === null) { // polvo libre
        p.x += p.deriva * dt; p.y -= 0.12 * dt;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      } else if (armado && seg > p.retraso) {
        // resorte hacia su lugar en el logo
        p.vx += (p.tx - p.x) * 0.018 * dt; p.vy += (p.ty - p.y) * 0.018 * dt;
      }
      if (mouse.activo) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const f = (1 - d2 / R2) * 5.5, d = Math.sqrt(d2);
          p.vx += (dx / d) * f * dt; p.vy += (dy / d) * f * dt;
        }
      }
      p.vx *= roce; p.vy *= roce;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    dibujar(t);
  }

  function dibujar(t) {
    ctx.clearRect(0, 0, W, H);
    const brillo = (t / 1000) * 0.9;
    // Reflejo que recorre el logo en diagonal, como luz sobre metal
    const barrido = ((t / 1000) % 6) / 6 * (W + H) * 1.4 - H;
    for (const p of parts) {
      const tw = 0.55 + 0.45 * Math.sin(p.fase + brillo * 2);
      const cerca = p.tx !== null ? Math.max(0, 1 - Math.abs((p.x + p.y) - barrido) / 90) : 0;
      ctx.globalAlpha = (p.tx === null ? 0.35 : 0.75) * tw + cerca * 0.6;
      ctx.fillStyle = cerca > 0.5 ? "#fff6dd" : p.color;
      // Cuadrados diminutos: a este tamaño se ven como puntos y se dibujan mucho más rápido que arcos
      const s = (p.tam + cerca * 0.6) * 1.6;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // Cursor y dedo dispersan las partículas
  const zona = canvas.parentElement;
  const mover = e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.activo = true;
  };
  zona.addEventListener("pointermove", mover, { passive: true });
  zona.addEventListener("pointerdown", mover, { passive: true });
  zona.addEventListener("pointerleave", () => { mouse.activo = false; });
  zona.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") mouse.activo = false; });

  // Pausa cuando la portada no se ve o la pestaña está oculta
  if ("IntersectionObserver" in window) new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(zona);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

  let tiempo;
  addEventListener("resize", () => { clearTimeout(tiempo); tiempo = setTimeout(ajustar, 150); });

  const arrancar = () => {
    ajustar();
    if (quieto) return;
    // Las partículas se arman cuando termina la intro del logo
    const armar = () => { armado = true; inicio = performance.now(); };
    if (window.YVYAlTerminarIntro) YVYAlTerminarIntro(armar); else setTimeout(armar, 200);
    requestAnimationFrame(paso);
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(arrancar); else arrancar();
})();
