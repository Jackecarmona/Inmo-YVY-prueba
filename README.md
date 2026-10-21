# YVY Capital · Plataforma de inversión inmobiliaria en Paraguay

Web para atraer inversores (España, Argentina, Brasil) hacia residencias en San Bernardino, lotes y departamentos sobre plano en Asunción.
Marca y proyectos sobre plano son **ficticios** (proyecto de portfolio / demostración). Las 10 residencias de San Bernardino vienen de avisos públicos recopilados por el equipo.

## Páginas

| Página | Archivo | Qué tiene |
|---|---|---|
| Inicio | `index.html` | Animación de entrada del logo, portada con vídeo, logo de partículas y buscador de propiedades, destacadas, cifras y accesos |
| Política de cookies | `politica-cookies/index.html` | Qué se guarda en el navegador y para qué (borrador para revisión legal) |
| Política de privacidad | `privacidad/index.html` | Borrador con los datos que recoge la web; faltan las partes legales |
| Propiedades | `propiedades/index.html` | Las publicadas desde el Back Office más las 10 residencias iniciales, con filtros, favoritos y ficha (galería, mapa, números). Enlace directo a una ficha: `propiedades/index.html#vista-lago` |
| Proyectos | `proyectos/index.html` | Sobre plano y lotes (ejemplos ficticios) |
| Invertir en Paraguay | `invertir/index.html` | Cifras y fiscalidad 10-10-10, San Bernardino, comprar siendo extranjero, guía por país |
| Simulador | `simulador/index.html` | Test de perfil (4 preguntas, puntaje 0-100), formulario, recomendación con IA e informe PDF |
| Nosotros | `nosotros/index.html` | Servicios, equipo, preguntas frecuentes y contacto |
| Ingresar | `ingresar/index.html` | **Acceso único** para clientes y equipo |
| Mi cuenta | `cliente/index.html` | Panel del cliente |
| Back Office | `admin/index.html` | Panel del equipo: solicitudes y alta de propiedades con fotos |

## Estructura

```
Inmo-YVY-prueba/
├── index.html · propiedades/ · proyectos/ · invertir/ · simulador/ · nosotros/
├── politica-cookies/ · privacidad/   Páginas legales (borradores)
├── ingresar/             Acceso único (index.html + ingresar.js)
├── cliente/              Panel del cliente (index.html + cliente.js)
├── admin/                Back Office (index.html + admin.css + admin.js)
├── css/styles.css        Estilos "lujo nocturno" con la identidad de marca
├── js/
│   ├── consentimiento.js Banner y panel de cookies; se carga antes que layout.js
│   ├── layout.js         Cabecera, pie, fondo, chat e intro del logo (comunes a todas las páginas)
│   ├── portada.js        Título y buscador de Inicio
│   ├── video-fondo.js    Vídeos de fondo de Inicio y de las cabeceras
│   ├── moneda.js         Selector de moneda de la cabecera (precios convertidos desde US$)
│   ├── rayos.js          Fondo de rayos de luz (WebGL, adaptado de React Bits)
│   ├── particulas.js     Logo de partículas doradas de la portada
│   ├── config.js         ⚙️ Supabase, WhatsApp, Telegram, email, emails del equipo en modo demo
│   ├── db.js             Base de datos (Supabase o modo demo) y sesiones
│   ├── scoring.js        Modelo clasificador de IA: índice de idoneidad 0-100 + escenarios
│   ├── pdf.js            Informe PDF (jsPDF)
│   ├── app.js            Portada, proyectos, simulador, contacto, chatbot, animaciones
│   ├── propiedades-data.js  Datos de las 10 residencias
│   └── propiedades.js    Tarjetas, filtros, favoritos y ficha
├── assets/img/ · assets/props/   Fotos de San Bernardino y de cada residencia
├── assets/videos/        Vídeo y poster de la portada (licencia en CREDITOS.md)
├── supabase/schema.sql   Roles, solicitudes, favoritos, propiedades y fotos + seguridad (RLS)
└── robots.txt            Evita que Google indexe las páginas privadas
```

## Cómo verla

1. En VS Code instalá la extensión **Live Server**.
2. Clic derecho en `index.html` → **Open with Live Server**.

> Funciona sin base de datos ("modo demo"): solicitudes y cuentas se guardan en el navegador.

## Inicio de sesión: un solo acceso

Todos entran por **Ingresar** (`ingresar/index.html`). Según el email, el sistema abre un panel u otro:

| Email | Se abre |
|---|---|
| De una persona del equipo | **Back Office** (`admin/`) con todas las solicitudes |
| Cualquier otro | **Mi cuenta** (`cliente/`) con sus propuestas, el estado y sus favoritos |

- `admin/` **no tiene formulario propio**: si alguien lo abre sin sesión del equipo, vuelve a Ingresar; si es un cliente, vuelve a su cuenta.
- En la web no hay ningún botón al Back Office: el equipo usa el mismo "Ingresar" que los clientes.
- El cliente crea su cuenta con el **mismo email** que usó en el simulador y ve sus propuestas automáticamente.
- Cuando el equipo cambia el estado de una solicitud, el cliente lo ve en su panel.

**Modo demo:** el equipo entra con `admin@yvycapital.com` y la contraseña `yvy2026` (se cambian en `js/config.js` → `demoEquipo` y `demoAdminPass`). Cualquier otro email es un cliente.

## Conectar la base de datos (obligatorio para la entrega)

1. Crear un proyecto gratis en https://supabase.com
2. **SQL Editor** → pegar el contenido de `supabase/schema.sql` → **Run**.
3. **Project Settings → API** → copiar *Project URL* y *anon public key* en `js/config.js`.
4. Cada persona del equipo crea su cuenta en la web (o en **Authentication → Users → Add user**) y un administrador le pone el rol en **Back Office → Usuarios**. Al primer administrador se le da el rol con el `update public.profiles …` que está al final de `schema.sql`.
5. **Authentication → Providers → Email**: dejar activado *Allow new users to sign up* (los clientes se registran solos).

Con eso, cualquiera puede **enviar** solicitudes, cada cliente ve **solo las suyas** y únicamente el equipo puede **ver todas, editarlas o borrarlas**.

## Requisitos de la reunión → dónde están

| Requisito | Dónde |
|---|---|
| Enfoque inversión en Paraguay (proyectos a futuro, lotes y departamentos) | Propiedades, Proyectos e Invertir en Paraguay |
| Formulario interactivo (capital 50.000 € vs 300.000 €, tolerancia al riesgo) | Simulador |
| Recomendación personalizada con IA | `js/scoring.js` (modelo clasificador con pesos explicables) |
| Informe PDF con propuesta y rentabilidad | `js/pdf.js` |
| Base de datos | `supabase/schema.sql` + `js/db.js` |
| Back Office separado, sin login visible en la landing | `admin/`, al que solo se llega con una cuenta del equipo |
| Chatbot de cualificación (opcional) | Botón dorado flotante, en todas las páginas |
| WhatsApp / Telegram (opcional) | Botón verde flotante, fichas y Nosotros → Contacto |
| Presentaciones de los proyectos (opcional) | Portada tipo video, galerías por residencia y videos de YouTube |
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

- Cambiar en `js/config.js` el número de WhatsApp, el canal de Telegram, el email y los datos del equipo de demo.
- Publicar gratis con Netlify, Vercel o GitHub Pages (es un sitio estático).

## Base de datos del otro prototipo (repositorio "inmobiliaria")

`supabase/schema.sql` también sirve para el proyecto de Supabase que ya existe (`vxarztazgxfsgtcevnvq`):
completa sus tablas sin borrar nada, usa su modelo de roles (`profiles.rol`), copia sus `solicitudes` a `leads`
e impide que alguien se dé a sí mismo el rol de administrador. Pasos:

1. En ese proyecto: **Database → Backups** (copia), después **SQL Editor** → pegar `schema.sql` → **Run**.
2. Poner su *Project URL* y su clave pública en `js/config.js`.
3. Probar Ingresar, el Simulador y el Back Office.

## Vídeos de fondo y logo de partículas

- Inicio y las cabeceras de Propiedades, Proyectos, Invertir, Simulador y Nosotros tienen vídeo (atributo `data-video-fondo`; créditos en `assets/videos/CREDITOS.md`).
- Sobre el vídeo de Inicio está el logo de partículas doradas (`js/particulas.js`), que el cursor dispersa.
- `js/video-fondo.js` carga el vídeo **después** de la página. Primero se ve la imagen poster.
- Pantallas ≤ 760 px: `portada-movil.mp4`. El resto: `portada.mp4`.
- Con «reducir movimiento», ahorro de datos o conexión 2G/3G no se descarga el vídeo y queda la imagen fija.
- El vídeo se pausa cuando no se ve y tiene un botón de pausa.
- Para cambiar un vídeo: reemplazar sus 4 archivos en `assets/videos/` con los mismos nombres (ver `CREDITOS.md`).
- El buscador envía los filtros a Propiedades (`propiedades/index.html?op=venta&tipo=Casa&dorm=3`). Funciona aunque no haya JavaScript.

## Cookies y consentimiento

| Categoría | Qué guarda | Se puede desactivar |
|---|---|---|
| Necesarias | La elección de cookies, la sesión, favoritos y datos para el simulador | No |
| Preferencias | Orden de la lista de propiedades, moneda del simulador, intro ya vista | Sí |
| Analíticas / Publicidad | Nada: hoy no hay herramientas. El panel las muestra como «No se usan» | — |

- La elección se guarda en `localStorage` → `yvy_consentimiento`:
  `{ v: versión, fecha, origen, categorias: { necesarias, preferencias } }`.
- Se vuelve a preguntar a los 12 meses o si se sube `VERSION` en `js/consentimiento.js`
  (hacerlo cada vez que cambien las categorías o la política).
- Retirar un permiso borra lo que esa categoría había guardado.
- **Limitaciones de localStorage:** es por navegador y por dispositivo (no sigue a la persona).
  Se pierde al borrar los datos del sitio, y en modo incógnito dura solo la sesión.
  No sirve como prueba ante un tercero: si hiciera falta acreditar el consentimiento, hay que guardarlo también en el servidor.
- **Para añadir una herramienta opcional** (por ejemplo, analítica):
  1. Añadir sus elementos a la categoría en `CATEGORIAS`.
  2. Subir `VERSION`.
  3. Cargarla con `<script type="text/plain" data-consentimiento="analiticas" data-src="https://…">` o con `YVYConsentimiento.cuando("analiticas", fn)`.
     Así no se ejecuta sin permiso.
  4. Actualizar la Política de cookies.

## Selector de moneda

- **Monedas:** en la cabecera se elige entre US$, €, R$, AR$, ₲, $U y CLP$.
- **Cómo se convierte:** los precios se guardan en dólares (o en euros, si así se cargó la propiedad), y la web los muestra convertidos con «≈». La ficha indica además el precio original y la lista avisa que las operaciones se pactan en US$.
- **Cotizaciones:** salen de open.er-api.com, que se actualiza a diario. Si el servicio no responde, se usan las de respaldo de `js/config.js` → `tiposDeCambio`, que conviene actualizar de vez en cuando.
- **Dónde se convierte:** en las tarjetas y fichas de Propiedades, en las destacadas de Inicio, en Proyectos, en los presupuestos del buscador y en los favoritos del área de clientes.
- **Dónde no:** el Simulador y el PDF siguen en US$/€, porque calculan con esas monedas.
- **Memoria:** la moneda elegida se recuerda (`yvy_pref_divisa`) solo si el visitante acepta las cookies de preferencias.
- **Para mostrar un precio convertido en otra parte:** usar `<span data-precio-usd="360000">US$ 360.000</span>`, o `YVYMoneda.formatear(monto)` desde JavaScript.
