// Configuración general de YVY Capital.
// Para conectar la base de datos real, completar supabaseUrl y supabaseAnonKey
// (Supabase → Project Settings → API). Si quedan vacíos, la web funciona en
// "modo demo" y guarda los formularios en el navegador (localStorage).
window.YVY_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",

  // Canales de contacto (número y canal de ejemplo: reemplazar por los reales)
  whatsapp: "595981000000",
  telegram: "https://t.me/yvycapital_demo",
  email: "contacto@yvycapital.example",

  // Tipo de cambio usado para normalizar el capital a USD
  eurUsd: 1.10,

  // SOLO para el modo demo (sin Supabase): emails del equipo y su contraseña.
  // Al ingresar con uno de estos emails se abre el panel del equipo; cualquier otro, el de cliente.
  // Con Supabase, el equipo se define en la tabla "equipo" (ver supabase/schema.sql).
  demoEquipo: ["admin@yvycapital.com"],
  demoAdminPass: "yvy2026"
};
