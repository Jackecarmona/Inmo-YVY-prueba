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
│   ├── pdf.js            Informe PDF (jsPDF se descarga recién al generar el informe)
│   ├── app.js            Portada, proyectos, simulador, contacto, chatbot, animaciones
│   ├── propiedades-data.js  Las 10 residencias (copia de respaldo y origen de la carga inicial en la base)
│   └── propiedades.js    Tarjetas, filtros, favoritos y ficha
├── assets/img/ · assets/props/   Fotos de San Bernardino y de cada residencia
├── assets/videos/        Vídeo y poster de la portada (licencia en CREDITOS.md)
├── supabase/schema.sql   Roles, solicitudes, favoritos, propiedades y fotos + seguridad (RLS)
├── pruebas/              Pruebas automáticas (abrir pruebas/index.html con Live Server)
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

## Portada para inversores

La portada está orientada a inversores en lotes y desarrollos:

- **Título y propuesta de valor**: «Hacé crecer tu capital con lotes y desarrollos de alta plusvalía en Paraguay» · entrada desde el 10 % · plusvalía estimada en USD · título de propiedad a tu nombre. Se evitan promesas («garantizada», «multiplicá») que la empresa no puede asegurar.
- **Por qué invertir en Paraguay**: cuatro tarjetas con ícono (estabilidad, 10/10/10, crecimiento urbano, repatriación según la Ley 117/91).
- **Lotes y desarrollos**: fichas con plusvalía estimada, precio total, entrega inicial y estado («En pozo» / «Listo para titular»). Los datos están en `js/proyectos-data.js` y los usan la portada, la página Proyectos, el formulario de Inicio y el asistente con IA.
- **Calculadora de plusvalía**: tipo de inversión y monto → valor a 3 y 5 años, escenario prudente y optimista. Usa `YVYScoring.apreciacion()`, con los mismos supuestos que el simulador (`js/scoring.js`).
- **3 pasos para el inversor extranjero**: elegir el lote, firma a distancia y pago inicial, titulación ante escribano e inscripción en el Registro Público.
- Después vienen las 10 residencias de San Bernardino, los accesos y el formulario «Solicitar información».

## Asistente con IA (OpenRouter)

El chat del botón dorado combina dos cosas:

- **Preguntas guiadas** (país, capital, objetivo, riesgo) que dan la recomendación de `scoring.js` y, con permiso, guardan la consulta en el panel (origen «Chatbot»). No usan IA.
- **Preguntas libres**: lo que la persona escribe fuera de esas preguntas lo responde un modelo de lenguaje por medio de la función serverless `api/chat.js` (Vercel), que llama a OpenRouter.

`api/chat.js` agrega siempre las instrucciones y la cartera de `js/propiedades-data.js`, recorta el historial (16 mensajes, 800 caracteres cada uno), solo acepta pedidos de la propia web y limita a 30 preguntas cada 10 minutos por IP. A la IA solo se le envía la charla libre: nunca el nombre ni el contacto del flujo guiado. Si la IA falla, el chat ofrece WhatsApp.

Configuración (una vez):

1. En [openrouter.ai/keys](https://openrouter.ai/keys), crear una clave (`sk-or-v1-…`).
2. En Vercel → el proyecto → **Settings → Environment Variables**, agregar `OPENROUTER_API_KEY` con esa clave, marcando Production, Preview y Development.
3. Volver a desplegar (Deployments → ⋯ → Redeploy): las variables nuevas no se aplican a despliegues anteriores.

Opcionales: `OPENROUTER_MODEL` (por defecto `nvidia/nemotron-3.5-lightning:free`) y `SITE_URL` (cabecera `HTTP-Referer`). Para probarlo en la computadora: copiar `.env.example` como `.env` (no se sube a GitHub) y usar `vercel dev`; con el servidor estático simple el chat muestra el aviso de WhatsApp.

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

## Pruebas automáticas

Hay 68 pruebas. Para correrlas, abrí `pruebas/index.html` con Live Server y tocá **Ejecutar todas las pruebas** (tardan unos 15 segundos).

- **Qué cubren:**
  - el inicio de sesión y los roles, incluidos los cortes por tiempo y la memoria del rol
  - los mensajes de error de Supabase en español
  - alta, edición y baja de propiedades con fotos
  - favoritos, el simulador, el PDF, el chat, las cookies, la moneda y el buscador
  - seguridad: textos maliciosos y páginas privadas
- **No tocan la base real:** mientras corren, esa pestaña usa el modo demo (bandera `yvy_pruebas` en `js/config.js`). Para la capa de datos se usa un Supabase simulado.
- **No pierden tus datos:** lo que la web tenía guardado en el navegador se respalda antes y se restaura al terminar.
- **Para sumar una prueba:** `prueba("Grupo", "Qué comprueba", async () => { … })` en `pruebas/pruebas.js`.

## Back Office: editar propiedades

En la pestaña **Propiedades**, el botón **Editar** abre el mismo formulario del alta, relleno con los datos actuales.

- **Fotos actuales:** cada una se puede marcar para quitarla, y se pueden sumar nuevas hasta tener 6 en total. Las nuevas van al final.
- **Al guardar:** primero se suben las fotos nuevas y después se actualiza la propiedad. Las fotos quitadas se borran del almacenamiento recién cuando el cambio quedó guardado. Si algo falla, no se pierde ninguna foto.

## Todas las propiedades se administran desde el Back Office

Las 10 residencias de San Bernardino ya no están solo en el código: `supabase/schema.sql` las carga en la tabla `propiedades` (sección 5).
Desde **Back Office → Propiedades** se editan, se ocultan (Borrador) o se eliminan igual que las demás.

- **Enlaces y favoritos:** cada casa conserva su id de siempre en la columna `slug` (por ejemplo `horizon-home`), así no se rompen.
- **Volver a ejecutar `schema.sql`** no pisa lo editado: la carga usa `on conflict do nothing`.
- **Mientras no se ejecute**, la web sigue mostrando la copia de `js/propiedades-data.js`.
- **Campos de la ficha completa:**
  - nombre comercial, estado en texto, terreno y condominio
  - cocheras, niveles, etiquetas, interior y exterior
  - nota del precio, y precio vacío = «Consultar precio»
- **Fotos:** hasta 10 por propiedad. Las de la web (`assets/…`) se pueden quitar de una ficha, pero nunca se borran del almacenamiento.

## Rendimiento

- **Supabase a demanda:** la librería se descarga solo al ingresar o si ya hay una sesión. Un visitante sin cuenta ve las propiedades y envía formularios con pedidos HTTP directos.
- **jsPDF:** se descarga solo al generar el informe.
- **Fondo de rayos (WebGL):** se carga cuando se puede ver (al hacer scroll o con el navegador libre).
- **Vídeos de fondo:** empiezan con la primera interacción o a los 4 s de cargada la página. Antes se ve la imagen poster, en WebP (45–60 % más liviana que el JPEG, que queda de respaldo).
- **Tipografías:** se alojan en la propia web (`assets/fuentes/`, licencia OFL) y no en Google Fonts. Son 3 archivos woff2 precargados.
- **Sin desplazamientos (CLS):**
  - la cabecera es fija y su lugar ya está reservado;
  - el `<head>` de cada página decide antes del primer pintado si va a aparecer el banner de cookies.
- **Partículas del logo:** se arman cuando el navegador queda libre.
- **Intro del logo:** dura 2,2 s.
