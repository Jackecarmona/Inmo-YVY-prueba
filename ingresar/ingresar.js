// Acceso único: el mismo formulario lleva al área de clientes o al panel del equipo según el email.
// La página no explica la existencia del panel del equipo: eso lo sabe solo el equipo.
(() => {
  const DB = window.YVYDB;
  const $ = s => document.querySelector(s);
  const emailOk = e => /^\S+@\S+\.\S+$/.test(e);
  const DESTINO = { equipo: "../admin/index.html", cliente: "../cliente/index.html" };
  const ir = rol => location.replace(DESTINO[rol]);

  // Si ya hay una sesión abierta, se va directo a su panel
  DB.rolActual().then(rol => { if (rol) ir(rol); }).catch(() => {});

  // Las credenciales de demostración del equipo están en js/config.js y en el README, no en la página
  $("#modo-ayuda").textContent = DB.mode === "demo"
    ? "Modo demo: la cuenta se guarda solo en este navegador."
    : "Te enviaremos un email para confirmar la cuenta.";

  const tabs = [...document.querySelectorAll(".cl-tabs [role=tab]")];
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => { x.setAttribute("aria-selected", x === t); $("#" + x.getAttribute("aria-controls")).hidden = x !== t; });
  }));

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
    try { ir(await DB.entrar(email, pass)); }
    catch (ex) {
      err.textContent = ex.message; btn.disabled = false; btn.textContent = "Ingresar";
      if (ex.sinConfirmar) ofrecerReenvio(err, email);
    }
  });

  /* ---------- Contraseña olvidada ---------- */
  const fOlvido = $("#form-olvido"), fEntrar = $("#form-entrar"), pestanas = $(".cl-tabs");
  const verOlvido = mostrar => {
    fOlvido.hidden = !mostrar; fEntrar.hidden = mostrar; pestanas.hidden = mostrar;
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

  let creando = false;
  $("#form-crear").addEventListener("submit", async e => {
    e.preventDefault();
    if (creando) return;
    const err = $("#c-error"), nombre = $("#c-nombre").value.trim(), email = $("#c-email").value.trim(), pass = $("#c-pass").value;
    const btn = e.target.querySelector("button[type=submit]");
    err.textContent = "";
    if (nombre.length < 2) return (err.textContent = "Escribí tu nombre.");
    if (!emailOk(email)) return (err.textContent = "Escribí un email válido.");
    if (pass.length < 8) return (err.textContent = "La contraseña necesita al menos 8 caracteres.");
    // Un solo envío a la vez: cada intento repetido gasta uno de los pocos emails por hora
    creando = true; btn.disabled = true; btn.textContent = "Creando cuenta…";
    try {
      const r = await DB.clienteRegistrar(nombre, email, pass);
      if (r.confirmar) {
        const ayuda = $("#modo-ayuda");
        ayuda.textContent = `Listo. Te enviamos un email a ${email} para confirmar la cuenta. Revisá también el correo no deseado.`;
        btn.textContent = "Cuenta creada";
        ofrecerReenvio(ayuda, email);
        return;
      }
      ir("cliente");
    } catch (ex) {
      err.textContent = ex.message;
      creando = false; btn.disabled = false; btn.textContent = "Crear cuenta";
    }
  });
})();
