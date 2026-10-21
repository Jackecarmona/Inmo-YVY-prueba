// Nueva contraseña: se llega desde el enlace del email "Restablecer contraseña".
// Supabase lee el enlace, abre una sesión temporal y aquí se guarda la contraseña nueva.
(() => {
  const DB = window.YVYDB;
  const $ = s => document.querySelector(s);
  const DESTINO = { equipo: "../admin/index.html", cliente: "../cliente/index.html" };

  const mostrar = id => ["form-nueva", "r-ok", "r-invalido", "r-cargando"].forEach(x => { $("#" + x).hidden = x !== id; });
  const invalido = txt => { if (txt) $("#r-invalido-txt").textContent = txt; mostrar("r-invalido"); };

  // Si el enlace venció o es inválido, Supabase vuelve con el error en la dirección
  const vuelta = new URLSearchParams(location.hash.slice(1));
  if (vuelta.get("error")) {
    invalido(/expired/i.test(vuelta.get("error_code") + vuelta.get("error_description"))
      ? "El enlace venció. Por seguridad dura poco tiempo."
      : "Ese enlace no es válido.");
    try { history.replaceState(null, "", location.pathname); } catch (e) { /* algunos visores no lo permiten */ }
    return;
  }
  if (DB.mode === "demo") return invalido("En el modo demo no se envían emails, así que no hay enlaces para restablecer la contraseña.");

  DB.enRecuperacion().then(ok => {
    if (!ok) return invalido();
    mostrar("form-nueva");
    $("#r-pass").focus();
  }).catch(() => invalido());

  let guardando = false;
  $("#form-nueva").addEventListener("submit", async e => {
    e.preventDefault();
    if (guardando) return;
    const err = $("#r-error"), p1 = $("#r-pass").value, p2 = $("#r-pass2").value, btn = $("#btn-guardar");
    err.textContent = "";
    if (p1.length < 8) return (err.textContent = "La contraseña necesita al menos 8 caracteres.");
    if (p1 !== p2) return (err.textContent = "Las dos contraseñas no coinciden.");
    guardando = true; btn.disabled = true; btn.textContent = "Guardando…";
    try {
      await DB.cambiarContrasena(p1);
      mostrar("r-ok");
      const rol = await DB.rolActual().catch(() => null);
      setTimeout(() => location.replace(DESTINO[rol] || "../ingresar/index.html"), 1800);
    } catch (ex) {
      err.textContent = ex.message;
      guardando = false; btn.disabled = false; btn.textContent = "Guardar contraseña";
    }
  });
})();
