// Acceso privado del equipo al Back Office. Los clientes no tienen cuenta: dejan sus datos
// en el formulario, el simulador o el chat. Si entra una cuenta de cliente antigua, se cierra.
// Las credenciales de demostración del equipo están en js/config.js y en el README, no en la página.
(() => {
  const DB = window.YVYDB;
  const $ = s => document.querySelector(s);
  const emailOk = e => /^\S+@\S+\.\S+$/.test(e);
  const PANEL = "../admin/index.html";

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
      err.textContent = "Este acceso es solo para el equipo.";
    } catch (ex) {
      err.textContent = ex.message;
    }
    btn.disabled = false; btn.textContent = "Ingresar";
  });
})();
