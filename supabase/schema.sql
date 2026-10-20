-- YVY Capital · Base de datos (Supabase / PostgreSQL)
-- Ejecutar en Supabase → SQL Editor → New query → Run.

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
  horizonte       text,          -- 1-3 | 3-5 | 5-10
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

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_estado_idx  on public.leads (estado);

-- Seguridad: el público solo puede INSERTAR; leer, editar y borrar requiere login.
alter table public.leads enable row level security;

drop policy if exists "publico_inserta" on public.leads;
create policy "publico_inserta" on public.leads
  for insert to anon with check (consentimiento = true);

drop policy if exists "equipo_lee" on public.leads;
create policy "equipo_lee" on public.leads
  for select to authenticated using (true);

drop policy if exists "equipo_edita" on public.leads;
create policy "equipo_edita" on public.leads
  for update to authenticated using (true) with check (true);

drop policy if exists "equipo_borra" on public.leads;
create policy "equipo_borra" on public.leads
  for delete to authenticated using (true);

-- Usuarios del equipo: crearlos en Supabase → Authentication → Users → Add user.
-- Desactivar el registro público: Authentication → Providers → Email → "Allow new users to sign up" = off.
