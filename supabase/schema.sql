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

-- Cualquiera (con o sin cuenta) puede enviar el formulario
drop policy if exists "publico_inserta" on public.leads;
create policy "publico_inserta" on public.leads
  for insert to anon, authenticated with check (consentimiento = true);

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
create unique index if not exists propiedades_codigo_idx on public.propiedades (lower(codigo));
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
-- Cómo dar de alta a una persona del equipo:
--   1. La persona crea su cuenta en la web (Ingresar → Crear cuenta) o se crea en
--      Authentication → Users → Add user.
--   2. Un administrador le cambia el rol en Back Office → Usuarios, o se ejecuta aquí:
--      update public.profiles set rol = 'admin' where email = 'persona@yvycapital.com';
-- Los clientes se registran solos (dejar activado
-- Authentication → Providers → Email → "Allow new users to sign up").
