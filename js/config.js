// Configuración general de YVY Capital.
// Para conectar la base de datos real, completar supabaseUrl y supabaseAnonKey
// (Supabase → Project Settings → API). Si quedan vacíos, la web funciona en
// "modo demo" y guarda los formularios en el navegador (localStorage).
window.YVY_CONFIG = {
  // Proyecto de Supabase compartido con el otro prototipo (clave pública: se puede ver en el navegador;
  // la seguridad la dan las reglas RLS de supabase/schema.sql). Nunca poner aquí la clave "service_role".
  supabaseUrl: "https://vxarztazgxfsgtcevnvq.supabase.co",
  supabaseAnonKey: "sb_publishable_2O0PdHW9UxqHPkVKUY770w_FgPYPYEf",

  // Canales de contacto (número y canal de ejemplo: reemplazar por los reales)
  whatsapp: "595981000000",
  telegram: "https://t.me/yvycapital_demo",
  email: "contacto@yvycapital.example",

  // Tipo de cambio usado para normalizar el capital a USD
  eurUsd: 1.10,

  // Selector de moneda: cotizaciones de respaldo (unidades por 1 US$) si no responde el servicio en línea
  // (open.er-api.com, se actualiza a diario). Actualizar de vez en cuando.
  tiposDeCambio: { fecha: "2026-10-21", USD: 1, EUR: 0.89075, BRL: 5.023053, ARS: 1524.8401, PYG: 5744.2889, UYU: 40.144606, CLP: 981.251342 },

  // SOLO para el modo demo (sin Supabase): emails del equipo y su contraseña.
  // Al ingresar con uno de estos emails se abre el panel del equipo; cualquier otro, el de cliente.
  // Con Supabase, el equipo se define en la tabla "equipo" (ver supabase/schema.sql).
  demoEquipo: ["admin@yvycapital.com"],
  demoAdminPass: "yvy2026"
};

// Pruebas automáticas (pruebas/index.html): mientras corren, ESA pestaña usa el modo demo
// para no crear cuentas ni solicitudes en la base real. No afecta a ningún otro visitante.
try {
  if (sessionStorage.getItem("yvy_pruebas") === "demo") { window.YVY_CONFIG.supabaseUrl = ""; window.YVY_CONFIG.supabaseAnonKey = ""; }
} catch (e) { /* sin almacenamiento */ }
