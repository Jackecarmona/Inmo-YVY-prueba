-- YVY Capital · Base de datos (Supabase / PostgreSQL)
-- Ejecutar en Supabase → SQL Editor → New query → Run.
--
-- Se puede ejecutar varias veces sin romper nada y sirve para dos casos:
--   · un proyecto de Supabase nuevo, vacío;
--   · el proyecto que ya armó el otro prototipo (repositorio "inmobiliaria"), que tiene
--     profiles / is_admin() / propiedades / solicitudes: esas tablas se completan, no se borran.
-- Antes de ejecutarlo sobre una base con datos, hacé una copia (Database → Backups).

-- ---------------------------------------------------------------------------
-- 1. Cuentas y roles (modelo del otro prototipo: profiles.rol = 'usuario' | 'admin')
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text,
  email      text,
  rol        text not null default 'usuario',
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists nombre     text;
alter table public.profiles add column if not exists email      text;
alter table public.profiles add column if not exists rol        text not null default 'usuario';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles enable row level security;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin') $$;

-- Equipo antiguo de esta web (se mantiene para no perder a quien ya estaba dado de alta)
create table if not exists public.equipo (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nombre     text,
  created_at timestamptz not null default now()
);
alter table public.equipo enable row level security;
drop policy if exists "equipo_se_ve" on public.equipo;
create policy "equipo_se_ve" on public.equipo
  for select to authenticated using (user_id = auth.uid());

-- La web pregunta siempre por es_equipo(): admin en profiles o miembro de la tabla equipo
create or replace function public.es_equipo() returns boolean
  language sql stable security definer set search_path = public
  as $$ select public.is_admin() or exists (select 1 from public.equipo where user_id = auth.uid()) $$;
grant execute on function public.es_equipo() to authenticated;

-- Cada cuenta nueva recibe su perfil de "usuario"
create or replace function public.crear_perfil() returns trigger
  language plpgsql security definer set search_path = public
  as $$ begin
    insert into public.profiles (id, email, nombre) values (new.id, new.email, new.raw_user_meta_data ->> 'nombre')
      on conflict (id) do nothing;
    return new;
  end $$;
drop trigger if exists yvy_crear_perfil on auth.users;
create trigger yvy_crear_perfil after insert on auth.users
  for each row execute function public.crear_perfil();
-- Perfiles para las cuentas que ya existían
insert into public.profiles (id, email, nombre)
  select id, email, raw_user_meta_data ->> 'nombre' from auth.users
  on conflict (id) do nothing;

-- SEGURIDAD: nadie puede darse a sí mismo el rol "admin". Solo un admin cambia roles
-- (o el SQL Editor, donde auth.uid() es nulo). Vale aunque existan otras políticas.
create or replace function public.proteger_rol() returns trigger
  language plpgsql security definer set search_path = public
  as $$ begin
    if auth.uid() is not null and not public.is_admin() then
      if tg_op = 'INSERT' then new.rol := 'usuario';
      elsif new.rol is distinct from old.rol then raise exception 'Solo un administrador puede cambiar roles';
      end if;
    end if;
    if tg_op = 'UPDATE' and new.id = auth.uid() and new.rol is distinct from old.rol then
      raise exception 'No podés cambiar tu propio rol';
    end if;
    return new;
  end $$;
drop trigger if exists yvy_proteger_rol on public.profiles;
create trigger yvy_proteger_rol before insert or update on public.profiles
  for each row execute function public.proteger_rol();

drop policy if exists "perfil_propio_o_admin" on public.profiles;
create policy "perfil_propio_o_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "admin_cambia_roles" on public.profiles;
create policy "admin_cambia_roles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Solicitudes de inversores (simulador, chatbot y contacto)
create table if not exists public.leads (
  id              text primary key,
  created_at      timestamptz not null default now(),
  -- Datos de contacto
  nombre          text,
  email           text,
  telefono        text,
  pais            text,
  -- Perfil del inversor
  capital         numeric,
  moneda          text check (moneda in ('EUR', 'USD')),
  capital_usd     numeric,
  objetivo        text,          -- renta | plusvalia | uso | diversificar
  riesgo          text,          -- baja | media | alta
  horizonte       text,          -- 1-3 | 3-5 | 5-10 | 10+
  financiacion    text,          -- cuotas | contado
  experiencia     text,
  mensaje         text,
  consentimiento  boolean default false,
  -- Resultado del modelo clasificador
  recomendacion   text,          -- lote | pozo | terminado | cartera
  score           int,
  scores          jsonb,
  perfil          text,          -- Conservador | Moderado | Dinámico
  -- Gestión interna (Back Office)
  fuente          text,          -- formulario | chatbot | contacto
  estado          text not null default 'nuevo',
  notas           text default ''
);
-- Resultado del test "Descubrí tu perfil de inversión" (simulador)
alter table public.leads add column if not exists test_puntaje int;
alter table public.leads add column if not exists test_perfil  text;

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_estado_idx  on public.leads (estado);

alter table public.leads enable row level security;

-- Cualquiera (con o sin cuenta) puede enviar el formulario, siempre con su consentimiento.
-- La solicitud entra como "nuevo" y sin notas: el estado y las notas internas solo los cambia el equipo.
drop policy if exists "publico_inserta" on public.leads;
create policy "publico_inserta" on public.leads
  for insert to anon, authenticated
  with check (consentimiento = true and estado = 'nuevo' and coalesce(notas, '') = '');

-- El cliente solo ve las solicitudes hechas con su email
drop policy if exists "cliente_lee_propias" on public.leads;
create policy "cliente_lee_propias" on public.leads
  for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));

-- El equipo ve, edita y borra todo
drop policy if exists "equipo_lee" on public.leads;
create policy "equipo_lee" on public.leads
  for select to authenticated using (public.es_equipo());

drop policy if exists "equipo_edita" on public.leads;
create policy "equipo_edita" on public.leads
  for update to authenticated using (public.es_equipo()) with check (public.es_equipo());

drop policy if exists "equipo_borra" on public.leads;
create policy "equipo_borra" on public.leads
  for delete to authenticated using (public.es_equipo());

-- Si existe la tabla "solicitudes" del otro prototipo, sus filas se copian a "leads"
-- (una sola vez: el id se deriva del contenido). La tabla original no se toca.
do $$ begin
  if to_regclass('public.solicitudes') is not null then
    execute $q$
      insert into public.leads (id, created_at, nombre, email, telefono, pais, mensaje, fuente, consentimiento, notas)
      select 'sol-' || md5(j::text),
             coalesce((j ->> 'created_at')::timestamptz, now()),
             j ->> 'nombre', lower(j ->> 'email'), j ->> 'telefono', j ->> 'pais',
             concat_ws(' · ', nullif(j ->> 'presupuesto', ''), nullif(j ->> 'mensaje', '')),
             'contacto', true, 'Importada de la tabla solicitudes'
      from (select to_jsonb(s) as j from public.solicitudes s) t
      on conflict (id) do nothing $q$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Favoritos de cada cliente (corazón en las residencias)
create table if not exists public.favoritos (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  casa_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, casa_id)
);
alter table public.favoritos enable row level security;
drop policy if exists "favoritos_propios" on public.favoritos;
create policy "favoritos_propios" on public.favoritos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Propiedades que el equipo carga desde el Back Office (pestaña "Propiedades")
create table if not exists public.propiedades (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo       text not null,
  metros     numeric not null check (metros > 0),
  ubicacion  text not null,
  ciudad     text not null,
  pais       text not null,
  precio     numeric not null check (precio >= 0),
  moneda     text not null default 'USD' check (moneda in ('EUR', 'USD')),
  estado     text not null default 'borrador' check (estado in ('borrador', 'publicada'))
);
-- Columnas que usa el Back Office (la tabla del otro prototipo no las tenía todas)
alter table public.propiedades add column if not exists codigo            text;
alter table public.propiedades add column if not exists operacion         text not null default 'venta';
alter table public.propiedades add column if not exists condicion         text;
alter table public.propiedades add column if not exists anio_construccion int;
alter table public.propiedades add column if not exists habitaciones      int default 0;
alter table public.propiedades add column if not exists banos             int default 0;
alter table public.propiedades add column if not exists garaje            boolean default false;
alter table public.propiedades add column if not exists trastero          boolean default false;
alter table public.propiedades add column if not exists descripcion       text;
alter table public.propiedades add column if not exists fotos             text[] default '{}';
-- Campos de la ficha completa (los usan las 10 residencias de la cartera inicial)
alter table public.propiedades add column if not exists slug              text;   -- id fijo para enlaces y favoritos (ej. "horizon-home")
alter table public.propiedades add column if not exists nombre            text;   -- nombre comercial (ej. "Horizon Home")
alter table public.propiedades add column if not exists estado_texto      text;   -- "Excelente estado", "Usada, como nueva"…
alter table public.propiedades add column if not exists terreno           numeric;
alter table public.propiedades add column if not exists condominio        boolean default false;
alter table public.propiedades add column if not exists cocheras          int;
alter table public.propiedades add column if not exists niveles           int;
alter table public.propiedades add column if not exists etiquetas         text[] default '{}'; -- vista, estrenar, amoblada, renta
alter table public.propiedades add column if not exists interior          text[] default '{}';
alter table public.propiedades add column if not exists exterior          text[] default '{}';
alter table public.propiedades add column if not exists mapa              text;
alter table public.propiedades add column if not exists precio_nota       text;
alter table public.propiedades add column if not exists resumen           text;
-- Sin precio = "Consultar precio"
alter table public.propiedades alter column precio drop not null;
create unique index if not exists propiedades_codigo_idx on public.propiedades (lower(codigo));
create unique index if not exists propiedades_slug_idx on public.propiedades (slug);
-- El otro prototipo limitaba "tipo" a Piso/Casa/Local/Terreno/Otro; el Back Office usa más tipos
alter table public.propiedades drop constraint if exists propiedades_tipo_check;
alter table public.propiedades enable row level security;

-- Solo el equipo ve los borradores, carga, edita y borra
drop policy if exists "equipo_gestiona_propiedades" on public.propiedades;
create policy "equipo_gestiona_propiedades" on public.propiedades
  for all to authenticated using (public.es_equipo()) with check (public.es_equipo());
grant select, insert, update, delete on public.propiedades to authenticated;

-- El público solo recibe las publicadas
drop function if exists public.propiedades_publicadas();
create function public.propiedades_publicadas()
  returns setof public.propiedades
  language sql stable security definer set search_path = public
  as $$ select * from public.propiedades where estado = 'publicada' order by created_at desc $$;
grant execute on function public.propiedades_publicadas() to anon, authenticated;

-- ¿Ya están en la base las 10 residencias de la cartera inicial? La web lo pregunta para no mostrar
-- la copia que trae en el código (js/propiedades-data.js) cuando el equipo ya las administra desde aquí.
create or replace function public.cartera_en_base() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.propiedades where slug is not null) $$;
grant execute on function public.cartera_en_base() to anon, authenticated;

-- Fotos: bucket público de lectura; solo el equipo sube y borra
insert into storage.buckets (id, name, public) values ('propiedades-fotos', 'propiedades-fotos', true)
  on conflict (id) do nothing;
drop policy if exists "equipo_sube_fotos" on storage.objects;
create policy "equipo_sube_fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'propiedades-fotos' and public.es_equipo());
drop policy if exists "equipo_borra_fotos" on storage.objects;
create policy "equipo_borra_fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'propiedades-fotos' and public.es_equipo());

-- ---------------------------------------------------------------------------
-- 5. Cartera inicial: las 10 residencias de San Bernardino pasan a la base para administrarlas
--    desde el Back Office. Generado desde js/propiedades-data.js (YVYCarteraComoFilas).
--    "on conflict do nothing": volver a ejecutar este archivo NO pisa lo que se edite después.
insert into public.propiedades (slug, codigo, nombre, operacion, tipo, condicion, estado_texto, metros, terreno, condominio, anio_construccion, habitaciones, banos, cocheras, niveles, garaje, trastero, ubicacion, ciudad, pais, precio, moneda, precio_nota, estado, resumen, descripcion, etiquetas, interior, exterior, fotos, mapa, created_at) values
  ('horizon-home', 'SB-01', 'Horizon Home', 'venta', 'Casa', 'nuevo', 'A estrenar', 314, 600, false, 2024, 4, 4, 2, 2, true, false, 'Zona Anfiteatro', 'San Bernardino', 'Paraguay', 360000, 'USD', null, 'publicada', 'Casa de dos niveles con vista imponente al Lago Ypacaraí, piscina con cascada y domótica.', 'Una oportunidad de tener tu casa en SanBer, en un barrio ideal para la familia y amigos. 314 m² construidos en 2 niveles sobre un terreno de 600 m², con vista imponente al Lago Ypacaraí.

4 habitaciones, 2 de ellas principales con placares y baño en suite. Cocina moderna integrada con quincho y comedor. Terraza en planta baja hacia el jardín con paisajismo iluminado, piscina con cascada y terraza en planta alta con vista y estar íntimo.

Domótica integrada, portón eléctrico, área de servicio con dormitorio, baño y lavadero con entrada independiente, y tanque de agua de 2.500 litros con motor auxiliar. Barrio seguro cerca del Súper Seis (24 h), farmacias y la Av. Guillermo Naumann.', array['vista', 'estrenar']::text[], array['Baño en suite', 'Cocina integral', 'Domótica', 'Vista panorámica', 'Inmueble de lujo', 'Área de servicio']::text[], array['Piscina con cascada', 'Quincho', 'Jardín iluminado', 'Terraza', 'Cochera', 'Zona residencial']::text[], array['assets/props/horizon-home/01.jpg', 'assets/props/horizon-home/02.jpg', 'assets/props/horizon-home/03.jpg', 'assets/props/horizon-home/04.jpg', 'assets/props/horizon-home/05.jpg', 'assets/props/horizon-home/06.jpg']::text[], 'assets/props/horizon-home/mapa.jpg', '2026-01-01T00:00:00.000Z'),
  ('casa-pueblo', 'SB-02', 'Casa Pueblo Home', 'venta', 'Casa', 'nuevo', 'A estrenar', 270, 600, false, 2024, 4, 4, 2, 2, true, false, 'Centro de San Bernardino', 'San Bernardino', 'Paraguay', 330000, 'USD', null, 'publicada', 'A 150 m del Súper Seis: piscina con cascada, fogón, quincho y domótica en 270 m².', 'Casa de 270 m² construidos en 2 niveles, sobre un terreno de 600 m², en un barrio ideal para la familia y amigos.

4 habitaciones, la principal amplia con placares y baño en suite. Cocina moderna integrada con quincho y comedor, terraza hacia el jardín con paisajismo iluminado, piscina con cascada y fogón, y terraza en planta alta con estar íntimo.

Domótica integrada, aire acondicionado, portón eléctrico y área de servicio independiente. Barrio seguro en el centro, a 150 m del Súper Seis (24 h), farmacia y la Av. Guillermo Naumann.', array['estrenar']::text[], array['Aire acondicionado', 'Baño en suite', 'Cocina integral', 'Domótica', 'Habitación de servicio']::text[], array['Piscina con cascada', 'Fogón', 'Quincho y parrilla', 'Bosque nativo', 'Jardín', 'Terraza']::text[], array['assets/props/casa-pueblo/01.jpg', 'assets/props/casa-pueblo/02.jpg', 'assets/props/casa-pueblo/03.jpg', 'assets/props/casa-pueblo/04.jpg', 'assets/props/casa-pueblo/05.jpg', 'assets/props/casa-pueblo/06.jpg']::text[], 'assets/props/casa-pueblo/mapa.jpg', '2025-12-31T23:59:00.000Z'),
  ('casa-equipada', 'SB-03', 'Casa full equipada', 'venta', 'Casa', 'usado', 'Usada, como nueva', 370, 586, false, null, 4, 7, 4, 2, true, false, 'A una cuadra de la avenida principal', 'San Bernardino', 'Paraguay', 280000, 'USD', null, 'publicada', 'Se vende totalmente amoblada y equipada: 4 suites, sala de juegos, chimenea y piscina.', 'Casa moderna en San Bernardino, a una cuadra de la avenida principal. En planta alta, 4 suites climatizadas con camas Queen y Twin, cortinas, ropa de cama y baño, más estar íntimo y sala con mesa de billar.

Planta baja con amplia sala con chimenea, comedor, baño social, parrilla con mesada y barra, y puertas de vidrio templado. Cocina amoblada y equipada con barra desayunador y electrodomésticos completos.

Amplio jardín, piscina con cascada y baño de piscina, área de servicio completa y garaje para 4 o 5 vehículos. Se vende con mobiliario, electrodomésticos y ropa blanca. Título listo para transferir.', array['amoblada', 'renta']::text[], array['4 suites', 'Chimenea', 'Sala de juegos', 'Barra americana', 'Lavandería', 'Admite mascotas']::text[], array['Piscina con cascada', 'Quincho y parrilla', 'Jardín', 'Terraza', 'Garaje para 4']::text[], array['assets/props/casa-equipada/01.jpg', 'assets/props/casa-equipada/02.jpg', 'assets/props/casa-equipada/03.jpg', 'assets/props/casa-equipada/04.jpg', 'assets/props/casa-equipada/05.jpg', 'assets/props/casa-equipada/06.jpg', 'assets/props/casa-equipada/07.jpg']::text[], null, '2025-12-31T23:58:00.000Z'),
  ('la-suiza', 'SB-04', 'Casa con vista en La Suiza', 'venta', 'Casa', 'usado', 'Usada', 590, 811, false, null, 3, 5, 6, 2, true, false, 'La Suiza · Anfiteatro', 'San Bernardino', 'Paraguay', 330000, 'USD', null, 'publicada', '590 m² en esquina con balcón y vista panorámica, quincho, piscina y lugar para 6 autos.', 'Casa en una de las zonas con mejor vista de SanBer: 811 m² de terreno en esquina y 590 m² construidos en dos plantas, en una zona residencial tranquila y segura.

Amplia sala y comedor con balcón y vista panorámica, cocina equipada, habitación de servicio con baño, lavandería y depósito. 3 dormitorios y 5 baños.

Jardín y patio con quincho y parrilla, piscina y zonas verdes. Espacio para todos los vehículos de residentes y visitantes.', array['vista', 'amoblada']::text[], array['Aire acondicionado', 'Balcón', 'Cocina equipada', 'Amoblado', 'Vista panorámica', 'Depósito']::text[], array['Piscina', 'Quincho y parrilla', 'Jardín y patio', 'Esquina', '6 cocheras']::text[], array['assets/props/la-suiza/01.jpg', 'assets/props/la-suiza/02.jpg', 'assets/props/la-suiza/03.jpg', 'assets/props/la-suiza/04.jpg', 'assets/props/la-suiza/05.jpg', 'assets/props/la-suiza/06.jpg']::text[], 'assets/props/la-suiza/mapa.jpg', '2025-12-31T23:57:00.000Z'),
  ('casa-4-dorm', 'SB-05', 'Casa amoblada de 4 dormitorios', 'venta', 'Casa', 'usado', 'Usada', 196, 468, false, null, 4, 4, 2, 1, true, false, 'San Bernardino', 'San Bernardino', 'Paraguay', 230000, 'USD', null, 'publicada', 'La opción de entrada: amoblada, en una planta, con piscina, quincho y sala de juegos.', 'Amplia casa amoblada en San Bernardino, en una sola planta. 4 dormitorios: dos en suite y dos que comparten un baño familiar.

Área de servicio completa, jardín, piscina, quincho y garaje para 2 vehículos. Un buen punto de partida para alquiler temporal de verano.', array['amoblada', 'renta']::text[], array['Amoblada', 'Aire acondicionado', 'Armarios empotrados', 'Cocina equipada', 'Habitación de servicio']::text[], array['Piscina', 'Quincho y parrilla', 'Jardín', 'Garaje']::text[], array['assets/props/casa-4-dorm/01.jpg', 'assets/props/casa-4-dorm/02.jpg', 'assets/props/casa-4-dorm/03.jpg', 'assets/props/casa-4-dorm/04.jpg', 'assets/props/casa-4-dorm/05.jpg']::text[], null, '2025-12-31T23:56:00.000Z'),
  ('casa-inteligente', 'SB-06', 'Casa inteligente de alta gama', 'venta', 'Casa', 'nuevo', 'A estrenar', 297, 592, false, null, 3, 3, 4, 1, true, false, 'Barrio Yvy Anguy Primera · Ruta Sanber–Altos', 'San Bernardino', 'Paraguay', 280000, 'USD', null, 'publicada', 'Domótica con Alexa, quincho climatizado con isla Neolith, piscina con solárium y deck.', 'Residencia amoblada a estrenar, diseñada para disfrutar todo el año: 592,5 m² de terreno y 297 m² construidos, con acceso rápido por la ruta Sanber–Altos.

3 dormitorios con principal en suite. Living, comedor y cocina integrados con isla. Quincho climatizado con parrilla e isla Neolith, piscina con solárium y deck, estacionamiento para 4 vehículos y área de servicio independiente.

Muebles de alta gama y electrodomésticos Samsung. Casa inteligente con Alexa: iluminación, cortinas y aire acondicionado domotizados, wifi, cámaras de seguridad y alarma Prosegur.', array['estrenar', 'amoblada']::text[], array['Domótica con Alexa', 'Cocina con isla', 'Aire acondicionado', 'Amoblada', 'Alarma y cámaras']::text[], array['Piscina', 'Solárium y deck', 'Quincho climatizado', 'Jardín', '4 cocheras']::text[], array['assets/props/casa-inteligente/01.jpg', 'assets/props/casa-inteligente/02.jpg', 'assets/props/casa-inteligente/03.jpg', 'assets/props/casa-inteligente/04.jpg', 'assets/props/casa-inteligente/05.jpg', 'assets/props/casa-inteligente/06.jpg', 'assets/props/casa-inteligente/07.jpg']::text[], null, '2025-12-31T23:55:00.000Z'),
  ('casa-quinta', 'SB-07', 'Casa quinta exclusiva', 'venta', 'Casa', 'usado', 'Excelente estado', 364, 726, false, null, 6, 5, 1, 2, true, false, 'San Bernardino', 'San Bernardino', 'Paraguay', null, 'USD', null, 'publicada', '6 dormitorios, terraza de 96 m² y piscina nueva de 9 × 5 m: pensada para familias e inversores.', 'Casa quinta de 364 m² en dos plantas sobre un terreno de 726 m², con una terraza de 96 m² con vistas panorámicas del entorno.

6 habitaciones, varias con baño privado, y 5 baños completos. Sala de estar, cocina principal de diseño, comedor formal, cocina exterior equipada, bar y quincho. Lavandería y depósito.

Piscina nueva de 9 × 5 m. Acceso inmediato a supermercados, comercios y restaurantes, con buenas conexiones hacia Asunción y el Aeropuerto Silvio Pettirossi.', array['amoblada', 'renta']::text[], array['6 dormitorios', 'Calefacción', 'Aire acondicionado', 'Amueblada', 'Agua caliente central']::text[], array['Piscina 9 × 5 m', 'Terraza de 96 m²', 'Quincho y bar', 'Cocina exterior', 'Parrillero']::text[], array['assets/props/casa-quinta/01.jpg', 'assets/props/casa-quinta/02.jpg', 'assets/props/casa-quinta/03.jpg', 'assets/props/casa-quinta/04.jpg', 'assets/props/casa-quinta/05.jpg', 'assets/props/casa-quinta/06.jpg']::text[], 'assets/props/casa-quinta/mapa.jpg', '2025-12-31T23:54:00.000Z'),
  ('residencia-estrenar', 'SB-08', 'Residencia a estrenar', 'venta', 'Casa', 'nuevo', 'A estrenar', 245, 525, false, null, 4, 3, 4, 2, true, false, 'Detrás del Súper Seis · Av. Guillermo Naumann', 'San Bernardino', 'Paraguay', 250000, 'USD', 'US$ 265.000 con muebles', 'publicada', 'Lote de 15 × 35 m, piscina con cascada, fogón, quincho y domótica. Con o sin muebles.', 'Residencia a estrenar sobre terreno de 525 m² (15 × 35) y 245 m² de construcción, detrás del Súper Seis de la Av. Guillermo Naumann.

Planta baja: living comedor, sala de TV, cocina amoblada, baño social, patio, piscina con cascada, fogón, quincho, área de servicio completa, área de cuidador y estacionamiento para 4 vehículos. Domótica y aire acondicionado en todos los ambientes; tanque de 5.000 litros.

Planta alta: 4 dormitorios (1 en suite), estar familiar, baño familiar y terraza.', array['estrenar', 'renta']::text[], array['Domótica', 'Aire acondicionado', 'Vestidor', 'Sala de TV', 'Cocina amoblada']::text[], array['Piscina con cascada', 'Fogón', 'Quincho', 'Solárium', '4 cocheras']::text[], array['assets/props/residencia-estrenar/01.jpg', 'assets/props/residencia-estrenar/02.jpg', 'assets/props/residencia-estrenar/03.jpg', 'assets/props/residencia-estrenar/04.jpg', 'assets/props/residencia-estrenar/05.jpg', 'assets/props/residencia-estrenar/06.jpg']::text[], 'assets/props/residencia-estrenar/mapa.jpg', '2025-12-31T23:53:00.000Z'),
  ('residencia-amoblada', 'SB-09', 'Residencia amoblada · Súper Seis', 'venta', 'Casa', 'usado', 'Excelente estado', 280, 1156, false, null, 4, 3, 7, 2, true, false, 'Zona Súper Seis', 'San Bernardino', 'Paraguay', null, 'USD', null, 'publicada', 'Terreno de 1.156 m² con piscina y quincho. Incluye el 100 % de los muebles y equipos.', 'Residencia amoblada sobre un terreno de 1.156 m² con 280 m² construidos.

Master suite amplia con baño privado, 2 habitaciones que comparten baño, cuarta habitación de huéspedes o escritorio en la segunda planta, baño social con ducha, habitación de servicio y depósito.

Piscina, quincho, portón eléctrico, cerco perimetral, alarma y rejas en cada ventana. Incluye el 100 % de los muebles, electrodomésticos y aires acondicionados.', array['amoblada']::text[], array['Master suite', 'Escritorio', 'Aire acondicionado', 'Calefacción', 'Amoblada al 100 %']::text[], array['Piscina', 'Quincho y parrilla', 'Terraza', 'Cerco y alarma', '7 cocheras']::text[], array['assets/props/residencia-amoblada/01.jpg', 'assets/props/residencia-amoblada/02.jpg', 'assets/props/residencia-amoblada/03.jpg', 'assets/props/residencia-amoblada/04.jpg', 'assets/props/residencia-amoblada/05.jpg', 'assets/props/residencia-amoblada/06.jpg']::text[], 'assets/props/residencia-amoblada/mapa.jpg', '2025-12-31T23:52:00.000Z'),
  ('vista-lago', 'SB-10', 'Residencia de lujo con vista al lago', 'venta', 'Casa', 'nuevo', 'A estrenar', 200, null, true, null, 4, 4, 2, 3, true, false, 'Barrio cerrado de 16 residencias', 'San Bernardino', 'Paraguay', 350000, 'USD', 'Financiación propia hasta 24 meses', 'publicada', 'En altura, con vistas abiertas al Ypacaraí. Condominio con piscina infinita, gimnasio y pádel.', 'Casa de verano en uno de los barrios cerrados más selectos de San Bernardino, con solo 16 residencias. En posición elevada, con vistas abiertas y permanentes al Lago Ypacaraí, lejos del ruido de las zonas costeras.

Tres niveles: planta baja con dormitorios para la familia e invitados; primer piso con sala, comedor y cocina integrados, ventanales al lago, terraza con parrilla y piscina privada; última planta con master suite exclusiva.

Amenities del condominio: piscina infinita con vista panorámica, gimnasio, quincho climatizado y abierto, cancha de pádel y seguridad 24 horas. Acepta permuta.', array['vista', 'estrenar']::text[], array['Master suite en altura', 'Vestidor', 'Gimnasio', 'Aire acondicionado', 'Ventanales al lago']::text[], array['Piscina privada', 'Piscina infinita común', 'Cancha de pádel', 'Seguridad 24 h', 'Terraza con parrilla']::text[], array['assets/props/vista-lago/01.jpg', 'assets/props/vista-lago/02.jpg', 'assets/props/vista-lago/03.jpg', 'assets/props/vista-lago/04.jpg', 'assets/props/vista-lago/05.jpg', 'assets/props/vista-lago/06.jpg']::text[], 'assets/props/vista-lago/mapa.jpg', '2025-12-31T23:51:00.000Z')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Cómo dar de alta a una persona del equipo:
--   1. La persona crea su cuenta en la web (Ingresar → Crear cuenta) o se crea en
--      Authentication → Users → Add user.
--   2. Un administrador le cambia el rol en Back Office → Usuarios, o se ejecuta aquí:
--      update public.profiles set rol = 'admin' where email = 'persona@yvycapital.com';
-- Los clientes se registran solos (dejar activado
-- Authentication → Providers → Email → "Allow new users to sign up").
