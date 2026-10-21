# Vídeos de fondo

Todos los vídeos son de **Pexels** y se usan bajo la [Licencia de Pexels](https://www.pexels.com/license/):
uso gratuito, también comercial, sin atribución obligatoria. La licencia no permite vender los vídeos
sin modificar, redistribuirlos en otros bancos de imágenes ni usarlos como marca. Se descargaron el 21/10/2026.

Ninguno muestra personas identificables. Las viviendas que aparecen **no son propiedades de YVY Capital**:
se usan como ambientación, no como avisos de venta.

| Página | Archivos | Clip | Autor |
|---|---|---|---|
| Inicio | `portada*` | [An Exterior Design of a Modern House](https://www.pexels.com/video/an-exterior-design-of-a-modern-house-7578541/) | Kindel Media |
| Propiedades | `propiedades*` | [Video of House Interior](https://www.pexels.com/video/video-of-house-interior-7578544/) | Kindel Media |
| Proyectos | `proyectos*` | [Modern House Interior](https://www.pexels.com/video/modern-house-interior-5744424/) | Abdullah |
| Invertir | `invertir*` | [Pool Drone Shot](https://www.pexels.com/video/pool-drone-shot-16580831/) | Ramon Martinez |
| Simulador | `simulador*` | [Showcase of Modern Home Interior](https://www.pexels.com/video/showcase-of-modern-home-interior-11630727/) | Abdullah |
| Nosotros | `nosotros*` | [Showcase of Exterior of Modern House](https://www.pexels.com/video/showcase-of-exterior-of-modern-house-10614138/) | Abdullah |

Cada página usa cuatro archivos:

| Archivo | Uso |
|---|---|
| `nombre.mp4` | Escritorio y tablet. 1920×1080, salvo `nosotros.mp4`, que es 1280×720 porque en 1080p pesa 15 MB |
| `nombre-movil.mp4` | Pantallas de hasta 760 px. 960×540 |
| `nombre-poster.jpg` | Imagen fija que se ve antes del vídeo, o en lugar del vídeo. 1920×1080 |
| `nombre-poster-movil.jpg` | Lo mismo en móviles. 900 px de ancho |

## Cambiar un vídeo

1. Reemplazar los cuatro archivos manteniendo los mismos nombres.
   El vídeo tiene que ser MP4 (H.264), horizontal 16:9, sin audio, de 10 a 25 segundos,
   y pesar como máximo ~8 MB en escritorio y ~4 MB en móvil.
2. Anotar aquí el autor, el enlace y la licencia.

Para poner un vídeo en otra página, agregar `data-video-fondo="nombre"` a su cabecera
(`<header class="pagina-cab" …>`) y guardar los cuatro archivos con ese nombre.
