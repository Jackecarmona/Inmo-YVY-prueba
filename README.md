# YVY Capital · Plataforma de inversión inmobiliaria en Paraguay

Web para atraer inversores (España, Argentina, Brasil) hacia lotes en San Bernardino y departamentos sobre plano en Asunción.
Marca, proyectos y precios son **ficticios** (proyecto de portfolio / demostración).

## Estructura

```
Inmo YVY/
├── index.html            Página pública (landing)
├── css/styles.css        Estilos con la identidad de marca (azul noche, dorado, marfil, verde)
├── js/
│   ├── config.js         ⚙️ Configuración: Supabase, WhatsApp, Telegram, email
│   ├── db.js             Conexión a la base de datos (Supabase o modo demo)
│   ├── scoring.js        Modelo clasificador de IA: índice de idoneidad 0-100 + escenarios
│   ├── pdf.js            Generación del informe PDF (jsPDF)
│   └── app.js            Lógica de la landing: fichas, formulario, chatbot
├── admin/                🔒 Back Office (separado, sin enlaces desde la landing)
│   ├── index.html
│   ├── admin.css
│   └── admin.js
├── supabase/schema.sql   Tabla `leads` + seguridad (RLS)
├── assets/img/           Fotos de San Bernardino
└── robots.txt            Evita que Google indexe /admin/
```

## Cómo verla

1. En VS Code instalá la extensión **Live Server**.
2. Clic derecho en `index.html` → **Open with Live Server**.
3. Back Office: abrí `http://127.0.0.1:5500/admin/` (en modo demo la contraseña es `yvy2026`, cualquier email).

> Funciona sin base de datos ("modo demo"): las solicitudes se guardan en el navegador.
> En el Back Office hay un botón **Cargar datos de ejemplo** para probarlo.

## Conectar la base de datos (obligatorio para la entrega)

1. Crear un proyecto gratis en https://supabase.com
2. **SQL Editor** → pegar el contenido de `supabase/schema.sql` → **Run**.
3. **Project Settings → API** → copiar *Project URL* y *anon public key* en `js/config.js`.
4. **Authentication → Users → Add user**: crear un usuario por cada miembro del equipo.
5. **Authentication → Providers → Email**: desactivar *Allow new users to sign up*.

Con eso, la landing solo puede **insertar** solicitudes y únicamente el equipo logueado puede **verlas, editarlas o borrarlas**.

## Requisitos de la reunión → dónde están

| Requisito | Dónde |
|---|---|
| Enfoque inversión en Paraguay (proyectos a futuro, lotes y departamentos) | `index.html`: secciones Por qué Paraguay, San Bernardino, Proyectos |
| Formulario interactivo (capital 50.000 € vs 300.000 €, tolerancia al riesgo) | Simulador de 3 pasos en `index.html` + `app.js` |
| Recomendación personalizada con IA | `js/scoring.js` (modelo clasificador con pesos explicables) |
| Informe PDF con propuesta y rentabilidad | `js/pdf.js` (2 páginas: perfil, recomendación, escenarios, pasos legales) |
| Base de datos | `supabase/schema.sql` + `js/db.js` |
| Back Office separado, sin login visible en la landing | Carpeta `admin/` |
| Chatbot de cualificación (opcional) | Botón dorado flotante, en `app.js` |
| WhatsApp / Telegram (opcional) | Botón verde flotante, fichas y sección Contacto |
| Renders / presentaciones (opcional) | Fichas con render ilustrativo y videos de YouTube |
| Clasificador más barato que un LLM (opcional) | `scoring.js` puntúa sin llamar a ninguna API |

## Cómo funciona el modelo de IA

`scoring.js` compara el perfil con 4 alternativas (lote, sobre plano, terminado, cartera mixta) y suma puntos:

- Capital frente al ticket típico de cada producto: 35 pts
- Objetivo (renta, plusvalía, uso, diversificar): 25 pts
- Tolerancia al riesgo: 20 pts
- Horizonte: 12 pts
- Forma de pago: 8 pts

Gana la de mayor puntaje y se proyectan dos escenarios (prudente y optimista) con supuestos visibles:
gastos de compra 3,5 %, IRP efectivo 4 % del alquiler, vacancia, gestión y plusvalía.
Como mejora futura se puede entrenar un clasificador real (por ejemplo, un árbol de decisión) con los datos que se vayan guardando en Supabase.

## Antes de publicar

- Cambiar en `js/config.js` el número de WhatsApp, el canal de Telegram y el email.
- Opcional: renombrar la carpeta `admin/` por un nombre difícil de adivinar.
- Publicar gratis con Netlify, Vercel o GitHub Pages (es un sitio estático).
