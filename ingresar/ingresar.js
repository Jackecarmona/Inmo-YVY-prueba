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
