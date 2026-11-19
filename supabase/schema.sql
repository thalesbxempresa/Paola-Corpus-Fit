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

-- ---------- Pagamento online (Mercado Pago) ----------
-- O que o Mercado Pago informou sobre o pagamento do pedido. Quem grava é a função pagamento-mercadopago.
-- Nunca guarda número de cartão, CPF nem e-mail de quem pagou. O modo fica em loja_config.dados.pagamento.
alter table public.pedidos add column if not exists mercadopago jsonb;
-- Trava de alguns segundos enquanto uma cobrança está em andamento, para nunca cobrar duas vezes
alter table public.pedidos add column if not exists cobrando_em timestamptz;

-- Contagem de tentativas, para ninguém usar o site para testar cartão roubado.
-- ip_hash é só uma impressão digital: o endereço de internet da pessoa não é guardado.
create table if not exists public.pagamento_tentativas (
  id bigint generated always as identity primary key,
  pedido uuid not null,
  ip_hash text not null,
  criado_em timestamptz not null default now()
);
create index if not exists pagamento_tentativas_criado_em on public.pagamento_tentativas (criado_em desc);

-- Tudo numa transação só, com o pedido travado: dois cliques nunca passam juntos
create or replace function public.reservar_cobranca(p_id uuid, p_ip text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v public.pedidos%rowtype;
begin
  select * into v from public.pedidos where id = p_id for update;
  if not found then return 'nao_encontrado'; end if;
  if v.mercadopago ->> 'pago_em' is not null then return 'pago'; end if;
  if v.status <> 'novo' then return 'fechado'; end if;
  -- Pedido com valor que não bateu com o banco nunca é cobrado online: a Paola confere antes
  if v.conferir then return 'conferir'; end if;
  if v.cobrando_em is not null and v.cobrando_em > now() - interval '90 seconds' then return 'em_andamento'; end if;
  if (select count(*) from public.pagamento_tentativas t where t.pedido = p_id and t.criado_em > now() - interval '1 hour') >= 6 then return 'limite'; end if;
  if (select count(*) from public.pagamento_tentativas t where t.ip_hash = p_ip and t.criado_em > now() - interval '10 minutes') >= 10 then return 'limite'; end if;
  if (select count(*) from public.pagamento_tentativas t where t.criado_em > now() - interval '10 minutes') >= 60 then return 'limite'; end if;
  insert into public.pagamento_tentativas (pedido, ip_hash) values (p_id, p_ip);
  update public.pedidos set cobrando_em = now() where id = p_id;
  delete from public.pagamento_tentativas t where t.criado_em < now() - interval '7 days';
  return 'ok';
end;
$$;
revoke all on function public.reservar_cobranca(uuid, text) from public, anon, authenticated;

-- ---------- Estoque ----------
-- Quantas peças a loja tem de cada item e tamanho (tam '' = item sem tamanho, como gel e creme).
-- Sem linha, a loja não conta aquele item e ele fica sempre à venda.
-- Fica fora do catálogo de propósito: salvar um produto no painel nunca desfaz a baixa de uma venda.
create table if not exists public.estoque (
  item text not null,
  tam text not null default '',
  -- Pode ficar negativo quando se vende mais do que tinha: o painel mostra a diferença e o cancelamento devolve certo
  qtd int not null check (qtd between -9999 and 9999),
  primary key (item, tam)
);
alter table public.pedidos add column if not exists estoque_baixado boolean not null default false;
-- Pedido que já estava pago antes de existir a contagem não mexe no estoque
update public.pedidos set estoque_baixado = true where status in ('pago', 'preparando', 'enviado', 'entregue') and not estoque_baixado;

-- Soma ou tira do estoque as peças de uma lista de itens de pedido (p_sinal: -1 dá baixa, 1 devolve).
-- O combo conta cada peça que vai nele (2 sutiãs = 2 peças) e a escolha da cliente (gel ou sutiã).
create or replace function public.mexer_estoque(p_itens jsonb, p_sinal int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_linha jsonb;
  v_dados jsonb;
  v_peca text;
  v_tam text;
  v_qtd int;
begin
  for v_linha in select * from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) loop
    v_qtd := least(greatest(coalesce((v_linha ->> 'qtd')::int, 1), 1), 99);
    select i.dados into v_dados from public.itens i where i.id = v_linha ->> 'id';
    for v_peca in
      select x from jsonb_array_elements_text(case when jsonb_typeof(v_dados -> 'itens') = 'array' then v_dados -> 'itens' else jsonb_build_array(v_linha ->> 'id') end) x
      union all
      select v_linha ->> 'extra' where coalesce(v_linha ->> 'extra', '') <> ''
    loop
      v_tam := case when coalesce((select (p.dados ->> 'tamanhos')::boolean from public.itens p where p.id = v_peca), false)
        then coalesce(v_linha ->> 'tam', '') else '' end;
      update public.estoque e set qtd = least(greatest(e.qtd + p_sinal * v_qtd, -9999), 9999) where e.item = v_peca and e.tam = v_tam;
    end loop;
  end loop;
end;
$$;
revoke all on function public.mexer_estoque(jsonb, int) from public, anon, authenticated;

-- Pedido pago dá baixa; cancelado (ou de volta para "novo") devolve. Uma vez só, mesmo mudando de etapa várias vezes.
-- Troca de peça ou de tamanho em pedido que já deu baixa: devolve o que tinha saído e baixa o que entra.
create or replace function public.pedido_estoque() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_baixa boolean := new.status in ('pago', 'preparando', 'enviado', 'entregue');
  v_baixado boolean := coalesce(new.estoque_baixado, false);
begin
  if tg_op = 'UPDATE' and v_baixa and v_baixado and new.itens is distinct from old.itens then
    perform public.mexer_estoque(old.itens, 1);
    perform public.mexer_estoque(new.itens, -1);
    return new;
  end if;
  if v_baixa = v_baixado then return new; end if;
  -- Ao devolver, valem os itens que tinham saído, mesmo que o pedido tenha sido editado na mesma gravação
  perform public.mexer_estoque(case when tg_op = 'UPDATE' and not v_baixa then old.itens else new.itens end, case when v_baixa then -1 else 1 end);
  new.estoque_baixado := v_baixa;
  return new;
end;
$$;
drop trigger if exists pedido_estoque on public.pedidos;
create trigger pedido_estoque before insert or update of status, itens on public.pedidos
  for each row execute function public.pedido_estoque();

-- ---------- Gestão do pedido ----------
-- Por que o pedido foi cancelado: a loja escolhe no painel, ou a função de pagamento anota quando o dinheiro é devolvido.
alter table public.pedidos add column if not exists motivo_cancelamento text;
alter table public.pedidos drop constraint if exists pedidos_motivo_cancelamento_check;
alter table public.pedidos add constraint pedidos_motivo_cancelamento_check check (motivo_cancelamento is null or length(motivo_cancelamento) <= 200);

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
  with mostra as (
    select coalesce((select (dados -> 'loja' ->> 'mostrarEstoque')::boolean from public.loja_config where id = 1), false) as sim
  )
  select jsonb_build_object(
    'loja', coalesce((select dados -> 'loja' from public.loja_config where id = 1), '{}'::jsonb),
    'tabela', coalesce((select dados -> 'tabela' from public.loja_config where id = 1), '[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(dados order by ordem) from public.itens where tipo = 'produto'), '[]'::jsonb),
    'kits', coalesce((select jsonb_agg(dados order by ordem) from public.itens where tipo = 'kit'), '[]'::jsonb),
    'praia', coalesce((select jsonb_agg(dados order by ordem) from public.itens where tipo = 'praia'), '[]'::jsonb),
    -- Com a chave desligada no painel, a loja só fica sabendo o que acabou, nunca quantas peças há
    'estoque', jsonb_build_object('itens', coalesce((
      select jsonb_object_agg(x.item, x.tams) from (
        select e.item, jsonb_object_agg(e.tam, greatest(e.qtd, 0)) as tams
        from public.estoque e
        where e.qtd <= 0 or (select sim from mostra)
        group by e.item
      ) x
    ), '{}'::jsonb))
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
    -- O que foi cobrado de fato (com o desconto do Pix) e o que aconteceu com o dinheiro
    'valor', p.valor,
    'pago', p.status in ('pago', 'preparando', 'enviado', 'entregue') or (p.mercadopago ->> 'pago_em') is not null,
    'devolvido', (p.mercadopago ->> 'pago_em') is not null and p.mercadopago ->> 'status' = 'refunded',
    'rastreio_codigo', p.rastreio_codigo,
    'rastreio_link', p.rastreio_link,
    -- Quem ainda não pagou pode voltar a pagar pela página do pedido
    'link_pagamento', case when p.status = 'novo' then p.mercadopago ->> 'link' end
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
grant select on public.admins to service_role;
grant execute on function public.reservar_cobranca(uuid, text) to service_role;
alter table public.pagamento_tentativas enable row level security;
revoke all on public.pagamento_tentativas from anon, authenticated;

-- Estoque: só o administrador lê e muda. A loja recebe pelo catálogo público só o que pode mostrar
alter table public.estoque enable row level security;
revoke all on public.estoque from anon, authenticated;
grant select, insert, update, delete on public.estoque to authenticated;
drop policy if exists admin_estoque on public.estoque;
create policy admin_estoque on public.estoque for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

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

-- ---------- Conta da cliente ----------
-- Login próprio da loja, separado do login do painel (o Supabase Auth continua só para administradores).
-- A cliente cria a conta com e-mail e senha ao finalizar e vê os pedidos dela em qualquer aparelho.
-- A senha fica embaralhada (bcrypt) e a sessão é um código longo, guardado só como impressão digital.
-- Ninguém do site lê estas tabelas: tudo passa pelas funções abaixo. Não há e-mail de confirmação.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and length(email) between 5 and 120),
  nome text not null default '' check (length(nome) <= 120),
  telefone text check (length(telefone) <= 15),
  senha_hash text not null,
  criado_em timestamptz not null default now(),
  -- 5 senhas erradas seguidas travam a conta por 15 minutos
  tentativas int not null default 0,
  bloqueada_ate timestamptz,
  -- Código para criar uma senha nova: vale 48 h e uma vez só
  senha_nova_sha256 text,
  senha_nova_ate timestamptz
);
create table if not exists public.clientes_sessoes (
  sessao_sha256 text primary key,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);
create index if not exists clientes_sessoes_cliente on public.clientes_sessoes (cliente_id);
alter table public.pedidos add column if not exists cliente_id uuid references public.clientes (id) on delete set null;
create index if not exists pedidos_cliente on public.pedidos (cliente_id) where cliente_id is not null;

create or replace function public.cliente_digital(p_texto text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(p_texto, ''), 'UTF8')), 'hex');
$$;

create or replace function public.cliente_resumo(p_cliente uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('email', c.email, 'nome', c.nome) from public.clientes c where c.id = p_cliente;
$$;

-- Abre uma sessão e devolve o código dela. O código só existe nesta resposta: o banco guarda a impressão digital.
create or replace function public.cliente_abrir_sessao(p_cliente uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  delete from public.clientes_sessoes s where s.cliente_id = p_cliente and s.expira_em < now();
  -- No máximo 10 aparelhos por conta: o mais antigo sai
  delete from public.clientes_sessoes s where s.cliente_id = p_cliente and s.sessao_sha256 in (
    select x.sessao_sha256 from public.clientes_sessoes x where x.cliente_id = p_cliente order by x.criado_em desc offset 9
  );
  insert into public.clientes_sessoes (sessao_sha256, cliente_id, expira_em)
  values (public.cliente_digital(v_codigo), p_cliente, now() + interval '180 days');
  return v_codigo;
end;
$$;

create or replace function public.cliente_da_sessao(p_sessao text) returns uuid
language sql stable security definer set search_path = '' as $$
  select s.cliente_id from public.clientes_sessoes s
  where length(coalesce(p_sessao, '')) = 64 and s.sessao_sha256 = public.cliente_digital(p_sessao) and s.expira_em > now();
$$;

create or replace function public.cliente_criar(p_email text, p_senha text, p_nome text default '', p_telefone text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  if length(v_email) > 120 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    return jsonb_build_object('ok', false, 'erro', 'email');
  end if;
  if length(coalesce(p_senha, '')) not between 6 and 72 then
    return jsonb_build_object('ok', false, 'erro', 'senha');
  end if;
  if exists (select 1 from public.clientes c where c.email = v_email) then
    return jsonb_build_object('ok', false, 'erro', 'existe');
  end if;
  -- Freio contra cadastro em massa: a compra continua sem conta e ela cria depois
  if (select count(*) from public.clientes c where c.criado_em > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('ok', false, 'erro', 'cheio');
  end if;
  insert into public.clientes (email, nome, telefone, senha_hash)
  values (
    v_email,
    left(trim(coalesce(p_nome, '')), 120),
    nullif(left(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), 15), ''),
    extensions.crypt(p_senha, extensions.gen_salt('bf', 10))
  )
  on conflict (email) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'erro', 'existe');
  end if;
  return jsonb_build_object('ok', true, 'sessao', public.cliente_abrir_sessao(v_id), 'cliente', public.cliente_resumo(v_id));
end;
$$;

create or replace function public.cliente_entrar(p_email text, p_senha text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  c public.clientes%rowtype;
begin
  select * into c from public.clientes x where x.email = v_email for update;
  if not found then
    -- Gasta o mesmo tempo de uma senha errada
    perform extensions.crypt(left(coalesce(p_senha, ''), 72), extensions.gen_salt('bf', 10));
    return jsonb_build_object('ok', false, 'erro', 'invalido');
  end if;
  if c.bloqueada_ate is not null and c.bloqueada_ate > now() then
    return jsonb_build_object('ok', false, 'erro', 'bloqueada', 'minutos', ceil(extract(epoch from c.bloqueada_ate - now()) / 60));
  end if;
  if length(coalesce(p_senha, '')) between 1 and 72 and c.senha_hash = extensions.crypt(p_senha, c.senha_hash) then
    update public.clientes set tentativas = 0, bloqueada_ate = null where id = c.id;
    return jsonb_build_object('ok', true, 'sessao', public.cliente_abrir_sessao(c.id), 'cliente', public.cliente_resumo(c.id));
  end if;
  update public.clientes
    set tentativas = case when c.tentativas >= 4 then 0 else c.tentativas + 1 end,
        bloqueada_ate = case when c.tentativas >= 4 then now() + interval '15 minutes' end
    where id = c.id;
  return jsonb_build_object('ok', false, 'erro', 'invalido');
end;
$$;

create or replace function public.cliente_sair(p_sessao text) returns void
language sql security definer set search_path = '' as $$
  delete from public.clientes_sessoes s where s.sessao_sha256 = public.cliente_digital(p_sessao);
$$;

-- Os pedidos da conta, com os mesmos dados do acompanhamento (sem endereço, sobrenome ou anotações)
create or replace function public.cliente_pedidos(p_sessao text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_cliente uuid := public.cliente_da_sessao(p_sessao);
begin
  if v_cliente is null then
    return jsonb_build_object('ok', false, 'erro', 'sessao');
  end if;
  return jsonb_build_object(
    'ok', true,
    'cliente', public.cliente_resumo(v_cliente),
    'pedidos', coalesce((
      select jsonb_agg(public.acompanhar_pedido(p.id) order by p.criado_em desc)
      from (select x.id, x.criado_em from public.pedidos x where x.cliente_id = v_cliente order by x.criado_em desc limit 50) p
    ), '[]'::jsonb)
  );
end;
$$;

-- Pedidos de quem informa o WhatsApp e o CEP usados na compra: dados que a cliente sabe de cor,
-- sem depender do número do pedido nem do link. O WhatsApp vale com ou sem o 55 e com ou sem o 9 da frente
-- (compara o DDD e os 8 últimos números).
create or replace function public.pedidos_do_contato(p_telefone text, p_cep text) returns setof uuid
language sql stable security definer set search_path = '' as $$
  with t as (
    select regexp_replace(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '^55(\d{10,11})$', '\1') as tel,
           regexp_replace(coalesce(p_cep, ''), '\D', '', 'g') as cep
  )
  select p.id
  from public.pedidos p, t
  where length(t.tel) between 10 and 11
    and length(t.cep) = 8
    and regexp_replace(coalesce(p.cep, ''), '\D', '', 'g') = t.cep
    and left(regexp_replace(regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g'), '^55(\d{10,11})$', '\1'), 2) = left(t.tel, 2)
    and right(regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g'), 8) = right(t.tel, 8)
  order by p.criado_em desc
  limit 20;
$$;

-- Acompanhar sem o link: os pedidos (até 10) do WhatsApp + CEP, com os mesmos dados do acompanhamento
create or replace function public.buscar_pedidos(p_telefone text, p_cep text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.acompanhar_pedido(x.id) order by x.criado_em desc), '[]'::jsonb)
  from (
    select p.id, p.criado_em from public.pedidos p
    where p.id in (select public.pedidos_do_contato(p_telefone, p_cep))
    order by p.criado_em desc
    limit 10
  ) x;
$$;

-- Liga pedidos à conta: pelo link do pedido (id) ou pelo WhatsApp + CEP da compra (todos os pedidos que baterem).
-- Pedido que já é de outra conta não muda de dona.
drop function if exists public.cliente_vincular(text, uuid, text, text);
create or replace function public.cliente_vincular(p_sessao text, p_id uuid default null, p_telefone text default null, p_cep text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_cliente uuid := public.cliente_da_sessao(p_sessao);
  v_achados uuid[];
  v_ligados int;
  v_outra int;
  v_ultimo uuid;
begin
  if v_cliente is null then
    return jsonb_build_object('ok', false, 'erro', 'sessao');
  end if;
  if p_id is not null then
    v_achados := array(select p.id from public.pedidos p where p.id = p_id);
  else
    v_achados := array(select public.pedidos_do_contato(p_telefone, p_cep));
  end if;
  if cardinality(v_achados) = 0 then
    return jsonb_build_object('ok', false, 'erro', 'nao_achou');
  end if;
  update public.pedidos p set cliente_id = v_cliente where p.id = any(v_achados) and p.cliente_id is null;
  select count(*) filter (where p.cliente_id = v_cliente), count(*) filter (where p.cliente_id <> v_cliente)
    into v_ligados, v_outra
    from public.pedidos p where p.id = any(v_achados);
  if v_ligados = 0 then
    return jsonb_build_object('ok', false, 'erro', 'outra_conta');
  end if;
  -- Conta criada sem nome aproveita o nome e o WhatsApp do pedido mais recente
  select p.id into v_ultimo from public.pedidos p
    where p.id = any(v_achados) and p.cliente_id = v_cliente order by p.criado_em desc limit 1;
  update public.clientes c
    set nome = case when c.nome = '' then left(p.nome, 120) else c.nome end,
        telefone = coalesce(c.telefone, left(p.telefone, 15))
    from public.pedidos p
    where c.id = v_cliente and p.id = v_ultimo and (c.nome = '' or c.telefone is null);
  return jsonb_build_object('ok', true, 'id', v_ultimo, 'n', v_ligados, 'outra_conta', v_outra);
end;
$$;

-- Senha nova. O código nasce aqui e chega à cliente por quem o pediu: hoje a Paola, pelo painel, manda o link no WhatsApp.
-- Para ligar a recuperação por e-mail depois, uma função do servidor chama cliente_codigo_senha e envia o link.
create or replace function public.cliente_codigo_senha(p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  update public.clientes
    set senha_nova_sha256 = public.cliente_digital(v_codigo), senha_nova_ate = now() + interval '48 hours'
    where email = lower(trim(coalesce(p_email, '')));
  if not found then
    return null;
  end if;
  return v_codigo;
end;
$$;

create or replace function public.cliente_link_senha(p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text;
begin
  if not public.eh_admin() then
    raise exception 'sem permissao';
  end if;
  v_codigo := public.cliente_codigo_senha(p_email);
  if v_codigo is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_achou');
  end if;
  return jsonb_build_object('ok', true, 'codigo', v_codigo,
    'nome', (select c.nome from public.clientes c where c.email = lower(trim(p_email))));
end;
$$;

create or replace function public.cliente_nova_senha(p_codigo text, p_senha text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if length(coalesce(p_senha, '')) not between 6 and 72 then
    return jsonb_build_object('ok', false, 'erro', 'senha');
  end if;
  select c.id into v_id from public.clientes c
    where length(coalesce(p_codigo, '')) = 64 and c.senha_nova_sha256 = public.cliente_digital(p_codigo) and c.senha_nova_ate > now()
    for update;
  if v_id is null then
    return jsonb_build_object('ok', false, 'erro', 'codigo');
  end if;
  update public.clientes
    set senha_hash = extensions.crypt(p_senha, extensions.gen_salt('bf', 10)),
        senha_nova_sha256 = null, senha_nova_ate = null, tentativas = 0, bloqueada_ate = null
    where id = v_id;
  -- Senha trocada: os outros aparelhos saem da conta
  delete from public.clientes_sessoes s where s.cliente_id = v_id;
  return jsonb_build_object('ok', true, 'sessao', public.cliente_abrir_sessao(v_id), 'cliente', public.cliente_resumo(v_id));
end;
$$;

alter table public.clientes enable row level security;
alter table public.clientes_sessoes enable row level security;
revoke all on public.clientes, public.clientes_sessoes from anon, authenticated;
revoke all on function public.cliente_digital(text), public.cliente_resumo(uuid), public.cliente_abrir_sessao(uuid), public.cliente_da_sessao(text),
  public.cliente_criar(text, text, text, text), public.cliente_entrar(text, text), public.cliente_sair(text), public.cliente_pedidos(text),
  public.cliente_vincular(text, uuid, text, text), public.cliente_codigo_senha(text), public.cliente_link_senha(text), public.cliente_nova_senha(text, text),
  public.pedidos_do_contato(text, text), public.buscar_pedidos(text, text)
  from public, anon, authenticated;
grant execute on function public.cliente_criar(text, text, text, text), public.cliente_entrar(text, text), public.cliente_sair(text), public.cliente_pedidos(text),
  public.cliente_vincular(text, uuid, text, text), public.cliente_nova_senha(text, text), public.buscar_pedidos(text, text) to anon, authenticated;
grant execute on function public.cliente_link_senha(text) to authenticated;
grant execute on function public.cliente_codigo_senha(text) to service_role;
