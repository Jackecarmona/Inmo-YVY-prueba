// Cartera de casas en San Bernardino (datos tomados de los avisos recopilados por el equipo).
// precio: null = "Consultar". fotos: cantidad de fotos en assets/props/<id>/01.jpg, 02.jpg…
window.YVY_CASAS = [
  {
    id: "horizon-home", nombre: "Horizon Home", zona: "Zona Anfiteatro", precio: 360000,
    estado: "A estrenar", anio: 2024, construido: 314, terreno: 600, dorm: 4, banos: 4, cocheras: 2, niveles: 2,
    fotos: 6, mapa: true, etiquetas: ["vista", "estrenar"],
    resumen: "Casa de dos niveles con vista imponente al Lago Ypacaraí, piscina con cascada y domótica.",
    descripcion: [
      "Una oportunidad de tener tu casa en SanBer, en un barrio ideal para la familia y amigos. 314 m² construidos en 2 niveles sobre un terreno de 600 m², con vista imponente al Lago Ypacaraí.",
      "4 habitaciones, 2 de ellas principales con placares y baño en suite. Cocina moderna integrada con quincho y comedor. Terraza en planta baja hacia el jardín con paisajismo iluminado, piscina con cascada y terraza en planta alta con vista y estar íntimo.",
      "Domótica integrada, portón eléctrico, área de servicio con dormitorio, baño y lavadero con entrada independiente, y tanque de agua de 2.500 litros con motor auxiliar. Barrio seguro cerca del Súper Seis (24 h), farmacias y la Av. Guillermo Naumann."
    ],
    interior: ["Baño en suite", "Cocina integral", "Domótica", "Vista panorámica", "Inmueble de lujo", "Área de servicio"],
    exterior: ["Piscina con cascada", "Quincho", "Jardín iluminado", "Terraza", "Cochera", "Zona residencial"]
  },
  {
    id: "casa-pueblo", nombre: "Casa Pueblo Home", zona: "Centro de San Bernardino", precio: 330000,
    estado: "A estrenar", anio: 2024, construido: 270, terreno: 600, dorm: 4, banos: 4, cocheras: 2, niveles: 2,
    fotos: 6, mapa: true, etiquetas: ["estrenar"],
    resumen: "A 150 m del Súper Seis: piscina con cascada, fogón, quincho y domótica en 270 m².",
    descripcion: [
      "Casa de 270 m² construidos en 2 niveles, sobre un terreno de 600 m², en un barrio ideal para la familia y amigos.",
      "4 habitaciones, la principal amplia con placares y baño en suite. Cocina moderna integrada con quincho y comedor, terraza hacia el jardín con paisajismo iluminado, piscina con cascada y fogón, y terraza en planta alta con estar íntimo.",
      "Domótica integrada, aire acondicionado, portón eléctrico y área de servicio independiente. Barrio seguro en el centro, a 150 m del Súper Seis (24 h), farmacia y la Av. Guillermo Naumann."
    ],
    interior: ["Aire acondicionado", "Baño en suite", "Cocina integral", "Domótica", "Habitación de servicio"],
    exterior: ["Piscina con cascada", "Fogón", "Quincho y parrilla", "Bosque nativo", "Jardín", "Terraza"]
  },
  {
    id: "casa-equipada", nombre: "Casa full equipada", zona: "A una cuadra de la avenida principal", precio: 280000,
    estado: "Usada, como nueva", anio: null, construido: 370, terreno: 586, dorm: 4, banos: 7, cocheras: 4, niveles: 2,
    fotos: 7, mapa: false, etiquetas: ["amoblada", "renta"],
    resumen: "Se vende totalmente amoblada y equipada: 4 suites, sala de juegos, chimenea y piscina.",
    descripcion: [
      "Casa moderna en San Bernardino, a una cuadra de la avenida principal. En planta alta, 4 suites climatizadas con camas Queen y Twin, cortinas, ropa de cama y baño, más estar íntimo y sala con mesa de billar.",
      "Planta baja con amplia sala con chimenea, comedor, baño social, parrilla con mesada y barra, y puertas de vidrio templado. Cocina amoblada y equipada con barra desayunador y electrodomésticos completos.",
      "Amplio jardín, piscina con cascada y baño de piscina, área de servicio completa y garaje para 4 o 5 vehículos. Se vende con mobiliario, electrodomésticos y ropa blanca. Título listo para transferir."
    ],
    interior: ["4 suites", "Chimenea", "Sala de juegos", "Barra americana", "Lavandería", "Admite mascotas"],
    exterior: ["Piscina con cascada", "Quincho y parrilla", "Jardín", "Terraza", "Garaje para 4"]
  },
  {
    id: "la-suiza", nombre: "Casa con vista en La Suiza", zona: "La Suiza · Anfiteatro", precio: 330000,
    estado: "Usada", anio: null, construido: 590, terreno: 811, dorm: 3, banos: 5, cocheras: 6, niveles: 2,
    fotos: 6, mapa: true, etiquetas: ["vista", "amoblada"],
    resumen: "590 m² en esquina con balcón y vista panorámica, quincho, piscina y lugar para 6 autos.",
    descripcion: [
      "Casa en una de las zonas con mejor vista de SanBer: 811 m² de terreno en esquina y 590 m² construidos en dos plantas, en una zona residencial tranquila y segura.",
      "Amplia sala y comedor con balcón y vista panorámica, cocina equipada, habitación de servicio con baño, lavandería y depósito. 3 dormitorios y 5 baños.",
      "Jardín y patio con quincho y parrilla, piscina y zonas verdes. Espacio para todos los vehículos de residentes y visitantes."
    ],
    interior: ["Aire acondicionado", "Balcón", "Cocina equipada", "Amoblado", "Vista panorámica", "Depósito"],
    exterior: ["Piscina", "Quincho y parrilla", "Jardín y patio", "Esquina", "6 cocheras"]
  },
  {
    id: "casa-4-dorm", nombre: "Casa amoblada de 4 dormitorios", zona: "San Bernardino", precio: 230000,
    estado: "Usada", anio: null, construido: 196, terreno: 468, dorm: 4, banos: 4, cocheras: 2, niveles: 1,
    fotos: 5, mapa: false, etiquetas: ["amoblada", "renta"],
    resumen: "La opción de entrada: amoblada, en una planta, con piscina, quincho y sala de juegos.",
    descripcion: [
      "Amplia casa amoblada en San Bernardino, en una sola planta. 4 dormitorios: dos en suite y dos que comparten un baño familiar.",
      "Área de servicio completa, jardín, piscina, quincho y garaje para 2 vehículos. Un buen punto de partida para alquiler temporal de verano."
    ],
    interior: ["Amoblada", "Aire acondicionado", "Armarios empotrados", "Cocina equipada", "Habitación de servicio"],
    exterior: ["Piscina", "Quincho y parrilla", "Jardín", "Garaje"]
  },
  {
    id: "casa-inteligente", nombre: "Casa inteligente de alta gama", zona: "Barrio Yvy Anguy Primera · Ruta Sanber–Altos", precio: 280000,
    estado: "A estrenar", anio: null, construido: 297, terreno: 592, dorm: 3, banos: 3, cocheras: 4, niveles: 1,
    fotos: 7, mapa: false, etiquetas: ["estrenar", "amoblada"],
    resumen: "Domótica con Alexa, quincho climatizado con isla Neolith, piscina con solárium y deck.",
    descripcion: [
      "Residencia amoblada a estrenar, diseñada para disfrutar todo el año: 592,5 m² de terreno y 297 m² construidos, con acceso rápido por la ruta Sanber–Altos.",
      "3 dormitorios con principal en suite. Living, comedor y cocina integrados con isla. Quincho climatizado con parrilla e isla Neolith, piscina con solárium y deck, estacionamiento para 4 vehículos y área de servicio independiente.",
      "Muebles de alta gama y electrodomésticos Samsung. Casa inteligente con Alexa: iluminación, cortinas y aire acondicionado domotizados, wifi, cámaras de seguridad y alarma Prosegur."
    ],
    interior: ["Domótica con Alexa", "Cocina con isla", "Aire acondicionado", "Amoblada", "Alarma y cámaras"],
    exterior: ["Piscina", "Solárium y deck", "Quincho climatizado", "Jardín", "4 cocheras"]
  },
  {
    id: "casa-quinta", nombre: "Casa quinta exclusiva", zona: "San Bernardino", precio: null,
    estado: "Excelente estado", anio: null, construido: 364, terreno: 726, dorm: 6, banos: 5, cocheras: 1, niveles: 2,
    fotos: 6, mapa: true, etiquetas: ["amoblada", "renta"],
    resumen: "6 dormitorios, terraza de 96 m² y piscina nueva de 9 × 5 m: pensada para familias e inversores.",
    descripcion: [
      "Casa quinta de 364 m² en dos plantas sobre un terreno de 726 m², con una terraza de 96 m² con vistas panorámicas del entorno.",
      "6 habitaciones, varias con baño privado, y 5 baños completos. Sala de estar, cocina principal de diseño, comedor formal, cocina exterior equipada, bar y quincho. Lavandería y depósito.",
      "Piscina nueva de 9 × 5 m. Acceso inmediato a supermercados, comercios y restaurantes, con buenas conexiones hacia Asunción y el Aeropuerto Silvio Pettirossi."
    ],
    interior: ["6 dormitorios", "Calefacción", "Aire acondicionado", "Amueblada", "Agua caliente central"],
    exterior: ["Piscina 9 × 5 m", "Terraza de 96 m²", "Quincho y bar", "Cocina exterior", "Parrillero"]
  },
  {
    id: "residencia-estrenar", nombre: "Residencia a estrenar", zona: "Detrás del Súper Seis · Av. Guillermo Naumann", precio: 250000,
    precioNota: "US$ 265.000 con muebles",
    estado: "A estrenar", anio: null, construido: 245, terreno: 525, dorm: 4, banos: 3, cocheras: 4, niveles: 2,
    fotos: 6, mapa: true, etiquetas: ["estrenar", "renta"],
    resumen: "Lote de 15 × 35 m, piscina con cascada, fogón, quincho y domótica. Con o sin muebles.",
    descripcion: [
      "Residencia a estrenar sobre terreno de 525 m² (15 × 35) y 245 m² de construcción, detrás del Súper Seis de la Av. Guillermo Naumann.",
      "Planta baja: living comedor, sala de TV, cocina amoblada, baño social, patio, piscina con cascada, fogón, quincho, área de servicio completa, área de cuidador y estacionamiento para 4 vehículos. Domótica y aire acondicionado en todos los ambientes; tanque de 5.000 litros.",
      "Planta alta: 4 dormitorios (1 en suite), estar familiar, baño familiar y terraza."
    ],
    interior: ["Domótica", "Aire acondicionado", "Vestidor", "Sala de TV", "Cocina amoblada"],
    exterior: ["Piscina con cascada", "Fogón", "Quincho", "Solárium", "4 cocheras"]
  },
  {
    id: "residencia-amoblada", nombre: "Residencia amoblada · Súper Seis", zona: "Zona Súper Seis", precio: null,
    estado: "Excelente estado", anio: null, construido: 280, terreno: 1156, dorm: 4, banos: 3, cocheras: 7, niveles: 2,
    fotos: 6, mapa: true, etiquetas: ["amoblada"],
    resumen: "Terreno de 1.156 m² con piscina y quincho. Incluye el 100 % de los muebles y equipos.",
    descripcion: [
      "Residencia amoblada sobre un terreno de 1.156 m² con 280 m² construidos.",
      "Master suite amplia con baño privado, 2 habitaciones que comparten baño, cuarta habitación de huéspedes o escritorio en la segunda planta, baño social con ducha, habitación de servicio y depósito.",
      "Piscina, quincho, portón eléctrico, cerco perimetral, alarma y rejas en cada ventana. Incluye el 100 % de los muebles, electrodomésticos y aires acondicionados."
    ],
    interior: ["Master suite", "Escritorio", "Aire acondicionado", "Calefacción", "Amoblada al 100 %"],
    exterior: ["Piscina", "Quincho y parrilla", "Terraza", "Cerco y alarma", "7 cocheras"]
  },
  {
    id: "vista-lago", nombre: "Residencia de lujo con vista al lago", zona: "Barrio cerrado de 16 residencias", precio: 350000,
    precioNota: "Financiación propia hasta 24 meses",
    estado: "A estrenar", anio: null, construido: 200, terreno: null, dorm: 4, banos: 4, cocheras: 2, niveles: 3,
    fotos: 6, mapa: true, etiquetas: ["vista", "estrenar"],
    resumen: "En altura, con vistas abiertas al Ypacaraí. Condominio con piscina infinita, gimnasio y pádel.",
    descripcion: [
      "Casa de verano en uno de los barrios cerrados más selectos de San Bernardino, con solo 16 residencias. En posición elevada, con vistas abiertas y permanentes al Lago Ypacaraí, lejos del ruido de las zonas costeras.",
      "Tres niveles: planta baja con dormitorios para la familia e invitados; primer piso con sala, comedor y cocina integrados, ventanales al lago, terraza con parrilla y piscina privada; última planta con master suite exclusiva.",
      "Amenities del condominio: piscina infinita con vista panorámica, gimnasio, quincho climatizado y abierto, cancha de pádel y seguridad 24 horas. Acepta permuta."
    ],
    interior: ["Master suite en altura", "Vestidor", "Gimnasio", "Aire acondicionado", "Ventanales al lago"],
    exterior: ["Piscina privada", "Piscina infinita común", "Cancha de pádel", "Seguridad 24 h", "Terraza con parrilla"]
  }
];

// Propiedades que el equipo da de alta en el Back Office (tabla "propiedades"):
// se convierten al mismo formato que las casas de arriba para usar las mismas tarjetas y ficha.
window.YVYCasaDesdeDB = (p, urlFoto) => ({
  id: "p-" + p.id, db: true, tipo: p.tipo,
  nombre: p.tipo + " en " + p.ciudad, zona: p.ubicacion, ciudad: p.ciudad, pais: p.pais,
  precio: +p.precio || null, moneda: p.moneda || "USD", operacion: p.operacion || "venta", codigo: p.codigo,
  estado: p.condicion === "nuevo" ? "A estrenar" : "Usado", anio: p.anio_construccion,
  construido: +p.metros, terreno: null, dorm: p.habitaciones || 0, banos: p.banos || 0, cocheras: p.garaje ? 1 : 0, niveles: null,
  imgs: (p.fotos || []).map(urlFoto), mapa: false,
  etiquetas: p.condicion === "nuevo" ? ["estrenar"] : [],
  descripcion: p.descripcion ? String(p.descripcion).split(/\n+/).filter(Boolean) : [],
  interior: [], exterior: [p.garaje && "Garaje", p.trastero && "Trastero"].filter(Boolean)
});
