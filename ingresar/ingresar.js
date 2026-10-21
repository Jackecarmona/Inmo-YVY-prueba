// Acceso único: el mismo formulario lleva al área de clientes o al panel del equipo según el email.
(() => {
  const DB = window.YVYDB, cfg = window.YVY_CONFIG;
  const $ = s => document.querySelector(s);
  const emailOk = e => /^\S+@\S+\.\S+$/.test(e);
  const DESTINO = { equipo: "../admin/index.html", cliente: "../cliente/index.html" };
  const ir = rol => location.replace(DESTINO[rol]);

  // Si ya hay una sesión abierta, se va directo a su panel
  DB.rolActual().then(rol => { if (rol) ir(rol); }).catch(() => {});

  if (DB.mode === "demo") {
    const n = $("#demo-nota");
    n.hidden = false;
    n.innerHTML = `Modo demo (sin base de datos): el equipo entra con <code>${(cfg.demoEquipo || [])[0] || ""}</code> y la contraseña <code>${cfg.demoAdminPass}</code>. Cualquier otro email es una cuenta de cliente.`;
    $("#modo-ayuda").textContent = "Modo demo: la cuenta se guarda solo en este navegador.";
  } else {
    $("#modo-ayuda").textContent = "Te enviaremos un email para confirmar la cuenta.";
  }

  const tabs = [...document.querySelectorAll(".cl-tabs [role=tab]")];
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => { x.setAttribute("aria-selected", x === t); $("#" + x.getAttribute("aria-controls")).hidden = x !== t; });
  }));

  $("#form-entrar").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#e-error"), email = $("#e-email").value.trim(), pass = $("#e-pass").value, btn = $("#btn-entrar");
    err.textContent = "";
    if (!emailOk(email)) return (err.textContent = "Escribí un email válido.");
    if (!pass) return (err.textContent = "Escribí tu contraseña.");
    btn.disabled = true; btn.textContent = "Ingresando…";
    try { ir(await DB.entrar(email, pass)); }
    catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = "Ingresar"; }
  });

  $("#form-crear").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#c-error"), nombre = $("#c-nombre").value.trim(), email = $("#c-email").value.trim(), pass = $("#c-pass").value;
    err.textContent = "";
    if (nombre.length < 2) return (err.textContent = "Escribí tu nombre.");
    if (!emailOk(email)) return (err.textContent = "Escribí un email válido.");
    if (pass.length < 8) return (err.textContent = "La contraseña necesita al menos 8 caracteres.");
    try {
      const r = await DB.clienteRegistrar(nombre, email, pass);
      if (r.confirmar) { $("#modo-ayuda").textContent = "Listo. Revisá tu email y confirmá la cuenta para ingresar."; return; }
      ir("cliente");
    } catch (ex) { err.textContent = ex.message; }
  });
})();
