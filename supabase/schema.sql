-- =============================================================
-- Paola Corpus Fit — banco da loja no Supabase
-- Cole tudo no SQL Editor do projeto e clique em Run. Pode rodar de novo sem perder dados.
--
-- Quem pode o quê:
--   cliente (sem login)  lê o catálogo, registra pedido e soma contador. Não lê pedido de ninguém.
--   administrador        lê e altera tudo. Precisa de e-mail confirmado e estar na tabela admins.
-- =============================================================

-- ---------- Administradores ----------
-- Guarda a impressão digital (SHA-256) do e-mail: este arquivo é público e o endereço não fica exposto.
-- Para incluir outra pessoa, rode no SQL Editor (troque o e-mail):
--   insert into public.admins values (encode(sha256(convert_to(lower('email@dela.com'), 'UTF8')), 'hex'));
create table if not exists public.admins (
  email_sha256 text primary key
);
insert into public.admins values ('c75ac29fe42b03543ff9d464250e51ce4f666fa129062d9cf7c3e3c1e2cb26b0')
  on conflict do nothing;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email_sha256 = encode(sha256(convert_to(lower(u.email), 'UTF8')), 'hex')
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

-- ---------- Catálogo ----------
create table if not exists public.loja_config (
  id int primary key default 1 check (id = 1),
  dados jsonb not null
);

create table if not exists public.itens (
  id text primary key,
  tipo text not null check (tipo in ('produto', 'kit', 'praia')),
  preco numeric(10, 2),
  ativo boolean not null default true,
  ordem int not null default 0,
  dados jsonb not null
);

-- ---------- Pedidos ----------
create table if not exists public.pedidos (
  id uuid primary key,
  numero text not null,
  criado_em timestamptz not null default now(),
  status text not null default 'novo' check (status in ('novo', 'pago', 'enviado', 'entregue', 'cancelado')),
  nome text not null,
  cep text, rua text, num text, complemento text, bairro text, cidade text, uf text,
  pagamento text,
  itens jsonb not null,
  total numeric(10, 2) not null,
  conferir boolean not null default false, -- o valor enviado pelo site não bateu com o do banco
  nota text
);
create index if not exists pedidos_criado_em on public.pedidos (criado_em desc);

-- ---------- Contadores do funil (por dia, sem dado pessoal) ----------
create table if not exists public.eventos_dia (
  dia date not null,
  tipo text not null check (tipo in ('visita', 'sacola', 'checkout')),
  total int not null default 0,
  primary key (dia, tipo)
);

-- ---------- O que a loja pode chamar sem login ----------
create or replace function public.catalogo_publico() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'loja', coalesce((select dados -> 'loja' from public.loja_config where id = 1), '{}'::jsonb),
    'tabela', coalesce((select dados -> 'tabela' from public.loja_config where id = 1), '[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(dados order by ordem) from public.itens where tipo = 'produto'), '[]'::jsonb),
    'kits', coalesce((select jsonb_agg(dados order by ordem) from public.itens where tipo = 'kit'), '[]'::jsonb),
    'praia', coalesce((select jsonb_agg(dados order by ordem) from public.itens where tipo = 'praia'), '[]'::jsonb)
  );
$$;

-- O total sai sempre dos preços do banco: quem mexer no navegador não muda o valor do pedido.
-- Item sem preço no banco ou valor diferente do site: o pedido entra marcado para conferir, nunca se perde.
create or replace function public.registrar_pedido(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_itens jsonb := coalesce(p -> 'itens', '[]'::jsonb);
  v_item jsonb;
  v_limpos jsonb := '[]'::jsonb;
  v_preco numeric;
  v_qtd int;
  v_total numeric := 0;
  v_informado numeric := coalesce((p ->> 'total')::numeric, 0);
  v_conferir boolean := false;
begin
  if pg_column_size(p) > 20000 or jsonb_typeof(v_itens) <> 'array' or jsonb_array_length(v_itens) not between 1 and 20 then
    raise exception 'pedido invalido';
  end if;
  if coalesce(trim(p ->> 'nome'), '') = '' or coalesce(p ->> 'numero', '') = '' then
    raise exception 'pedido invalido';
  end if;

  for v_item in select * from jsonb_array_elements(v_itens) loop
    v_qtd := least(greatest(coalesce((v_item ->> 'qtd')::int, 1), 1), 9);
    select i.preco into v_preco from public.itens i where i.id = v_item ->> 'id';
    if v_preco is null then
      v_conferir := true;
    else
      v_total := v_total + v_preco * v_qtd;
    end if;
    v_limpos := v_limpos || jsonb_build_object(
      'id', left(v_item ->> 'id', 80),
      'nome', left(v_item ->> 'nome', 200),
      'calca', left(v_item ->> 'calca', 8),
      'tam', left(v_item ->> 'tam', 8),
      'extra', left(v_item ->> 'extra', 80),
      'qtd', v_qtd,
      'preco', v_preco
    );
  end loop;

  if v_conferir then
    v_total := greatest(v_informado, 0);
  elsif abs(v_total - v_informado) > 0.01 then
    v_conferir := true;
  end if;

  insert into public.pedidos (id, numero, nome, cep, rua, num, complemento, bairro, cidade, uf, pagamento, itens, total, conferir)
  values (
    (p ->> 'id')::uuid,
    left(p ->> 'numero', 30),
    left(trim(p ->> 'nome'), 120),
    left(p ->> 'cep', 10), left(p ->> 'rua', 160), left(p ->> 'num', 20), left(p ->> 'complemento', 80),
    left(p ->> 'bairro', 80), left(p ->> 'cidade', 80), upper(left(p ->> 'uf', 2)), left(p ->> 'pagamento', 20),
    v_limpos, v_total, v_conferir
  )
  on conflict (id) do nothing;
end;
$$;

create or replace function public.registrar_evento(p_tipo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_tipo not in ('visita', 'sacola', 'checkout') then
    raise exception 'evento invalido';
  end if;
  insert into public.eventos_dia as e (dia, tipo, total)
  values ((now() at time zone 'America/Sao_Paulo')::date, p_tipo, 1)
  on conflict (dia, tipo) do update set total = e.total + 1;
end;
$$;

-- ---------- Regras de acesso ----------
alter table public.admins enable row level security;
alter table public.loja_config enable row level security;
alter table public.itens enable row level security;
alter table public.pedidos enable row level security;
alter table public.eventos_dia enable row level security;

revoke all on public.admins, public.loja_config, public.itens, public.pedidos, public.eventos_dia from anon, authenticated;
grant select, insert, update, delete on public.loja_config, public.itens to authenticated;
grant select, update, delete on public.pedidos to authenticated;
grant select on public.eventos_dia to authenticated;

drop policy if exists admin_config on public.loja_config;
create policy admin_config on public.loja_config for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists admin_itens on public.itens;
create policy admin_itens on public.itens for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists admin_pedidos on public.pedidos;
create policy admin_pedidos on public.pedidos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists admin_eventos on public.eventos_dia;
create policy admin_eventos on public.eventos_dia for select to authenticated using (public.eh_admin());

revoke all on function public.eh_admin(), public.catalogo_publico(), public.registrar_pedido(jsonb), public.registrar_evento(text) from public, anon, authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.catalogo_publico(), public.registrar_pedido(jsonb), public.registrar_evento(text) to anon, authenticated;

-- ---------- Fotos dos produtos ----------
-- Qualquer pessoa vê (são as fotos da loja); só o administrador envia, troca ou apaga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists imagens_admin_envia on storage.objects;
create policy imagens_admin_envia on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and public.eh_admin());
drop policy if exists imagens_admin_troca on storage.objects;
create policy imagens_admin_troca on storage.objects for update to authenticated
  using (bucket_id = 'imagens' and public.eh_admin());
drop policy if exists imagens_admin_apaga on storage.objects;
create policy imagens_admin_apaga on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and public.eh_admin());
