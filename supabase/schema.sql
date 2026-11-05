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
  status text not null default 'novo',
  nome text not null,
  cep text, rua text, num text, complemento text, bairro text, cidade text, uf text,
  pagamento text,
  itens jsonb not null,
  total numeric(10, 2) not null,
  conferir boolean not null default false, -- o valor enviado pelo site não bateu com o do banco
  nota text
);
create index if not exists pedidos_criado_em on public.pedidos (criado_em desc);

-- ---------- Acompanhamento do pedido ----------
-- Etapas: novo (recebido) > pago (confirmado) > preparando > enviado > entregue, ou cancelado.
alter table public.pedidos add column if not exists historico jsonb not null default '[]'::jsonb;
alter table public.pedidos add column if not exists rastreio_codigo text;
alter table public.pedidos add column if not exists rastreio_link text;
alter table public.pedidos drop constraint if exists pedidos_status_check;
alter table public.pedidos add constraint pedidos_status_check check (status in ('novo', 'pago', 'preparando', 'enviado', 'entregue', 'cancelado'));
alter table public.pedidos drop constraint if exists pedidos_rastreio_link_check;
alter table public.pedidos add constraint pedidos_rastreio_link_check check (rastreio_link is null or rastreio_link like 'https://%');

-- A data de cada etapa é registrada pelo banco, ninguém precisa preencher
create or replace function public.pedido_historico() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.historico := jsonb_build_array(jsonb_build_object('status', new.status, 'em', now()));
  elsif new.status is distinct from old.status then
    new.historico := coalesce(old.historico, '[]'::jsonb) || jsonb_build_object('status', new.status, 'em', now());
  end if;
  return new;
end;
$$;
revoke all on function public.pedido_historico() from public, anon, authenticated;
drop trigger if exists pedido_historico on public.pedidos;
create trigger pedido_historico before insert or update of status on public.pedidos
  for each row execute function public.pedido_historico();

-- Pedidos anteriores a este recurso começam o histórico pela situação atual
update public.pedidos
  set historico = jsonb_build_array(jsonb_build_object('status', status, 'em', criado_em))
  where historico = '[]'::jsonb;

-- ---------- Rotina da loja ----------
-- telefone: para avisar a cliente. valor: o que cobrar de fato (com desconto do Pix, ou ajustado com frete).
-- origem: 'site' ou 'manual', quando a Paola registra uma venda feita fora do site.
alter table public.pedidos add column if not exists telefone text;
alter table public.pedidos add column if not exists valor numeric(10, 2);
alter table public.pedidos add column if not exists origem text not null default 'site';
update public.pedidos set valor = total where valor is null;

-- ---------- Aviso de pedido novo ----------
-- Cada aparelho que ligou o aviso no painel. O endereço só serve para mandar a notificação a ele.
create table if not exists public.push_assinaturas (
  endpoint text primary key check (endpoint like 'https://%'),
  aparelho text,
  criado_em timestamptz not null default now()
);
-- Chaves do envio: a função avisar-pedido gera na primeira vez. Ninguém do site lê, só o servidor.
create table if not exists public.push_chaves (
  id int primary key default 1 check (id = 1),
  publica text not null,
  privada jsonb not null
);
-- Evita avisar duas vezes o mesmo pedido
alter table public.pedidos add column if not exists avisado_em timestamptz;

-- Sem pg_net o banco continua funcionando, só não avisa o celular
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net indisponivel: o aviso no celular fica desligado';
end;
$$;

-- ---------- Pagamento online (InfinitePay) ----------
-- Link de pagamento do pedido e, depois de pago, o que a InfinitePay confirmou (método, parcelas, comprovante).
-- Quem grava é a função pagamento-infinitepay. A InfiniteTag e o modo ficam em loja_config.dados.pagamento.
alter table public.pedidos add column if not exists infinitepay jsonb;

-- Só pedido do site avisa: venda registrada à mão foi a própria loja que fez.
-- Em projeto novo, troque o endereço pelo do novo projeto (veja LEIA-ME.md).
create or replace function public.pedido_avisar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://jtqxvxghgncqiyougsgs.supabase.co/functions/v1/avisar-pedido',
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 5000
  );
  return null;
exception when others then
  return null; -- O aviso nunca pode impedir um pedido de entrar
end;
$$;
revoke all on function public.pedido_avisar() from public, anon, authenticated;
drop trigger if exists pedido_avisar on public.pedidos;
create trigger pedido_avisar after insert on public.pedidos
  for each row when (new.origem = 'site') execute function public.pedido_avisar();

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
  v_pix numeric := coalesce((select (c.dados -> 'loja' ->> 'pix')::numeric from public.loja_config c where c.id = 1), 0);
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

  insert into public.pedidos (id, numero, nome, telefone, cep, rua, num, complemento, bairro, cidade, uf, pagamento, itens, total, valor, conferir)
  values (
    (p ->> 'id')::uuid,
    left(p ->> 'numero', 30),
    left(trim(p ->> 'nome'), 120),
    nullif(left(regexp_replace(coalesce(p ->> 'telefone', ''), '\D', '', 'g'), 15), ''),
    left(p ->> 'cep', 10), left(p ->> 'rua', 160), left(p ->> 'num', 20), left(p ->> 'complemento', 80),
    left(p ->> 'bairro', 80), left(p ->> 'cidade', 80), upper(left(p ->> 'uf', 2)), left(p ->> 'pagamento', 20),
    v_limpos, v_total,
    case when p ->> 'pagamento' = 'Pix' then round(v_total * (1 - v_pix), 2) else v_total end,
    v_conferir
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

-- O que a cliente vê ao acompanhar: pelo link do pedido ou pelo número + CEP.
-- Só o necessário: sem endereço, sobrenome ou anotações internas.
create or replace function public.acompanhar_pedido(p_id uuid default null, p_numero text default null, p_cep text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id,
    'numero', p.numero,
    'status', p.status,
    'criado_em', p.criado_em,
    'historico', p.historico,
    'primeiro_nome', split_part(p.nome, ' ', 1),
    'cidade', p.cidade,
    'uf', p.uf,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('nome', i ->> 'nome', 'tam', i ->> 'tam', 'qtd', i -> 'qtd')) from jsonb_array_elements(p.itens) i), '[]'::jsonb),
    'total', p.total,
    'rastreio_codigo', p.rastreio_codigo,
    'rastreio_link', p.rastreio_link,
    -- Quem ainda não pagou pode voltar a pagar pela página do pedido
    'link_pagamento', case when p.status = 'novo' then p.infinitepay ->> 'link' end
  )
  from public.pedidos p
  where p.id = p_id
    or (
      length(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g')) = 8
      and upper(p.numero) = upper(trim(p_numero))
      and regexp_replace(coalesce(p.cep, ''), '\D', '', 'g') = regexp_replace(p_cep, '\D', '', 'g')
    )
  order by p.criado_em desc
  limit 1;
$$;

-- ---------- Regras de acesso ----------
alter table public.admins enable row level security;
alter table public.loja_config enable row level security;
alter table public.itens enable row level security;
alter table public.pedidos enable row level security;
alter table public.eventos_dia enable row level security;
alter table public.push_assinaturas enable row level security;
alter table public.push_chaves enable row level security;

revoke all on public.admins, public.loja_config, public.itens, public.pedidos, public.eventos_dia, public.push_assinaturas, public.push_chaves from anon, authenticated;
grant select, insert, update, delete on public.loja_config, public.itens to authenticated;
grant select, insert, update, delete on public.pedidos to authenticated;
grant select on public.eventos_dia to authenticated;
grant select, insert, update, delete on public.push_assinaturas to authenticated;
-- A função do aviso entra como service_role: tabela nova neste projeto não nasce liberada para ninguém
grant select, insert, delete on public.push_assinaturas, public.push_chaves to service_role;
grant select, update on public.pedidos to service_role;
grant select on public.loja_config to service_role;

drop policy if exists admin_push on public.push_assinaturas;
create policy admin_push on public.push_assinaturas for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists admin_config on public.loja_config;
create policy admin_config on public.loja_config for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists admin_itens on public.itens;
create policy admin_itens on public.itens for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists admin_pedidos on public.pedidos;
create policy admin_pedidos on public.pedidos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists admin_eventos on public.eventos_dia;
create policy admin_eventos on public.eventos_dia for select to authenticated using (public.eh_admin());

revoke all on function public.eh_admin(), public.catalogo_publico(), public.registrar_pedido(jsonb), public.registrar_evento(text), public.acompanhar_pedido(uuid, text, text) from public, anon, authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.catalogo_publico(), public.registrar_pedido(jsonb), public.registrar_evento(text), public.acompanhar_pedido(uuid, text, text) to anon, authenticated;

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
