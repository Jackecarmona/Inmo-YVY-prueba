// Acceso privado del equipo al Back Office. Los clientes ya no tienen cuenta: dejan sus datos
// en el formulario, el simulador o el chat. Si entra una cuenta de cliente antigua, se cierra.
// Las credenciales de demostración del equipo están en js/config.js y en el README, no en la página.
(() => {
  const DB = window.YVYDB;
  const $ = s => document.querySelector(s);
  const emailOk = e => /^\S+@\S+\.\S+$/.test(e);
  const PANEL = "../admin/index.html";
  const SOLO_EQUIPO = "Este acceso es solo para el equipo. Para consultar por una propiedad, completá el formulario de la página de inicio.";

  // Con la sesión del equipo abierta se va directo al panel; mientras tanto se avisa,
  // en vez de mostrar el formulario como si no hubiera sesión.
  DB.rolActual().then(async rol => {
    if (!rol) return;
    if (rol !== "equipo") { await DB.clienteSalir(); return; }
    const aviso = document.createElement("div");
    aviso.className = "sesion-activa"; aviso.setAttribute("role", "status");
    aviso.innerHTML = `<p>Ya tenés la sesión iniciada.</p><a class="btn btn--oro" href="${PANEL}">Ir al panel</a>`;
    const caja = $(".cl-acceso .form");
    if (caja) { [...caja.children].forEach(el => { el.hidden = true; }); caja.prepend(aviso); }
    location.replace(PANEL);
  }).catch(() => {});

  // Botón "Reenviar email de confirmación", con una espera entre envíos (Supabase limita los emails por hora)
  function ofrecerReenvio(junto, email) {
    let b = junto.parentElement.querySelector(".reenviar");
    if (!b) {
      b = document.createElement("button");
      b.type = "button"; b.className = "reenviar";
      junto.insertAdjacentElement("afterend", b);
    }
    const listo = () => { b.disabled = false; b.textContent = "Reenviar el email de confirmación"; };
    const esperar = (seg, aviso) => {
      b.disabled = true;
      const t = setInterval(() => {
        b.textContent = `${aviso} · podés reenviar en ${seg} s`;
        if (--seg < 0) { clearInterval(t); listo(); }
      }, 1000);
    };
    b.onclick = async () => {
      b.disabled = true; b.textContent = "Enviando…";
      try { await DB.reenviarConfirmacion(email); esperar(60, "Email reenviado"); }
      catch (ex) { junto.textContent = ex.message; listo(); }
    };
    listo();
  }

  // Si el enlace del email venció o es inválido, Supabase vuelve con el error en la dirección
  const vuelta = new URLSearchParams(location.hash.slice(1));
  if (vuelta.get("error")) {
    $("#e-error").textContent = /expired/i.test(vuelta.get("error_code") || vuelta.get("error_description") || "")
      ? "El enlace de confirmación venció. Ingresá tu email y contraseña para pedir uno nuevo."
      : "No pudimos confirmar tu email con ese enlace. Probá pedir uno nuevo.";
    try { history.replaceState(null, "", location.pathname); } catch (e) { /* algunos visores no lo permiten */ }
  }

  $("#form-entrar").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#e-error"), email = $("#e-email").value.trim(), pass = $("#e-pass").value, btn = $("#btn-entrar");
    err.textContent = "";
    if (!emailOk(email)) return (err.textContent = "Escribí un email válido.");
    if (!pass) return (err.textContent = "Escribí tu contraseña.");
    btn.disabled = true; btn.textContent = "Ingresando…";
    try {
      if (await DB.entrar(email, pass) === "equipo") return location.replace(PANEL);
      await DB.clienteSalir();
      err.textContent = SOLO_EQUIPO; btn.disabled = false; btn.textContent = "Ingresar";
    } catch (ex) {
      err.textContent = ex.message; btn.disabled = false; btn.textContent = "Ingresar";
      if (ex.sinConfirmar) ofrecerReenvio(err, email);
    }
  });

  /* ---------- Contraseña olvidada ---------- */
  const fOlvido = $("#form-olvido"), fEntrar = $("#form-entrar");
  const verOlvido = mostrar => {
    fOlvido.hidden = !mostrar; fEntrar.hidden = mostrar;
    if (mostrar) {
      $("#o-email").value = $("#e-email").value.trim();
      $("#o-error").textContent = ""; $("#o-ok").hidden = true;
      $("#olvido-t").focus();
    } else $("#e-email").focus();
  };
  $("#btn-olvido").addEventListener("click", () => verOlvido(true));
  $("#btn-olvido-volver").addEventListener("click", () => verOlvido(false));
  let enviandoOlvido = false;
  fOlvido.addEventListener("submit", async e => {
    e.preventDefault();
    if (enviandoOlvido) return;
    const err = $("#o-error"), ok = $("#o-ok"), email = $("#o-email").value.trim(), btn = $("#btn-olvido-enviar");
    err.textContent = ""; ok.hidden = true;
    if (!emailOk(email)) return (err.textContent = "Escribí un email válido.");
    enviandoOlvido = true; btn.disabled = true; btn.textContent = "Enviando…";
    try {
      await DB.pedirRestablecer(email);
      ok.hidden = false;
      ok.textContent = `Si hay una cuenta con ${email}, te llegará un email con el enlace para elegir una contraseña nueva. Revisá también el correo no deseado.`;
      // Espera antes de permitir otro envío (Supabase limita los emails por hora)
      let seg = 60;
      const t = setInterval(() => {
        btn.textContent = `Podés pedir otro en ${seg} s`;
        if (--seg < 0) { clearInterval(t); enviandoOlvido = false; btn.disabled = false; btn.textContent = "Enviar otro enlace"; }
      }, 1000);
    } catch (ex) {
      err.textContent = ex.message;
      enviandoOlvido = false; btn.disabled = false; btn.textContent = "Enviarme el enlace";
    }
  });
})();
