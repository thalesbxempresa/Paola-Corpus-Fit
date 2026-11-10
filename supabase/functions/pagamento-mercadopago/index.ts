// Pagamento pelo Mercado Pago. Toda a parte que envolve dinheiro acontece aqui, nunca no navegador.
//
// Regras de segurança desta função:
// - O valor cobrado sai sempre do pedido no banco. O que o navegador manda como valor é ignorado.
// - A chave secreta (Access Token) só existe aqui, como segredo do Supabase. Nunca vai para o site nem para o GitHub.
// - Número de cartão não passa por aqui: chega só um código de uso único, criado pelos campos do Mercado Pago.
// - Um pedido só vira pago depois de consultar o próprio Mercado Pago. Aviso (webhook) sem assinatura válida é recusado.
// - CPF, e-mail e dados do pagamento da cliente vão direto para o Mercado Pago e não são gravados nem escritos em log.
// - Cada pedido, cada aparelho e a loja têm limite de tentativas, para ninguém usar o site para testar cartão roubado.
const BASE = Deno.env.get('SUPABASE_URL')!;
const segredos = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const CHAVE: string = segredos.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '';
const PUBLIC_KEY = Deno.env.get('MERCADOPAGO_PUBLIC_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') ?? '';
const AMBIENTE_TESTE = Deno.env.get('MERCADOPAGO_AMBIENTE') === 'teste';
const MP = 'https://api.mercadopago.com';
const SITE = 'https://paolacorpusfit.vercel.app';
const ORIGENS = [SITE, 'https://thalesbxempresa.github.io'];
const NOME_NA_FATURA = 'PAOLACORPUSFIT';

type Resposta = [number, Record<string, unknown>];
type Config = { modo: string; pix: number; parcelas: number };

const texto = (v: string) => new TextEncoder().encode(v);
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const ehId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const ehPagamentoId = (v: unknown) => /^\d{1,20}$/.test(String(v ?? ''));
const arredondar = (v: number) => Math.round(v * 100) / 100;

// ---------- Banco ----------
const rest = (caminho: string, init: RequestInit = {}) => fetch(`${BASE}/rest/v1/${caminho}`, {
  ...init,
  headers: {
    apikey: CHAVE,
    ...(CHAVE.startsWith('eyJ') ? { Authorization: `Bearer ${CHAVE}` } : {}),
    'Content-Type': 'application/json',
    ...(init.headers ?? {}),
  },
});
async function lerLista(caminho: string, init?: RequestInit) {
  const r = await rest(caminho, init);
  if (!r.ok) throw new Error(`Banco respondeu ${r.status} em ${caminho.split('?')[0]}`);
  return r.json();
}
async function config(): Promise<Config> {
  const [c] = await lerLista('loja_config?id=eq.1&select=dados');
  const d = c?.dados ?? {};
  return {
    modo: d.pagamento?.modo ?? 'desligado',
    pix: Number(d.loja?.pix) || 0,
    parcelas: Math.min(12, Math.max(1, Number(d.loja?.parcelas) || 1)),
  };
}
async function lerPedido(id: string) {
  const [p] = await lerLista(`pedidos?id=eq.${id}&select=id,numero,status,nome,telefone,cep,rua,num,complemento,bairro,cidade,uf,pagamento,itens,total,valor,mercadopago,conferir`);
  return p;
}
const salvarPedido = (id: string, campos: Record<string, unknown>) => lerLista(`pedidos?id=eq.${id}`, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify(campos),
});

// Quanto cobrar. Pedido do site: preço cheio no cartão e com desconto no Pix.
// Se a loja mudou o valor à mão (frete, desconto, teste), cobra exatamente esse valor em qualquer forma.
function cobranca(p: Record<string, any>, cfg: Config) {
  const total = Number(p.total);
  const valor = Number(p.valor ?? p.total);
  const comPix = arredondar(total * (1 - cfg.pix));
  const padrao = valor === total || (p.pagamento === 'Pix' && Math.abs(valor - comPix) < 0.01);
  return padrao ? { cartao: total, pix: comPix } : { cartao: valor, pix: valor };
}
const resumoItens = (p: Record<string, any>) => (p.itens ?? [])
  .map((x: any) => `${x.qtd || 1}x ${x.nome}${x.tam ? ` (${x.tam})` : ''}`).join(', ');

// ---------- Mercado Pago ----------
const cabecalhosMP = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
  ...extra,
});
async function lerPagamento(id: string) {
  const r = await fetch(`${MP}/v1/payments/${id}`, { headers: cabecalhosMP() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status} ao consultar pagamento`);
  return r.json();
}

// Atualiza o pedido com o que o Mercado Pago informou. Pode ser chamada várias vezes para o mesmo pagamento.
async function aplicar(m: Record<string, any>): Promise<boolean> {
  const id = m.external_reference;
  if (!ehId(id)) return false;
  // Pagamento de teste nunca confirma pedido quando a loja está em produção
  if (!AMBIENTE_TESTE && m.live_mode === false) {
    console.warn('Pagamento de teste ignorado em produção');
    return false;
  }
  const p = await lerPedido(id);
  if (!p) return false;
  const mp = p.mercadopago ?? {};
  const pid = String(m.id);
  const atual = !mp.pagamento_id || mp.pagamento_id === pid;

  // Tentativa antiga (Pix trocado por cartão, cartão recusado): só importa se acabou sendo paga
  if (!atual && m.status !== 'approved') return false;
  // Duas cobranças aprovadas no mesmo pedido: nunca some sem avisar a loja
  if (mp.pago_em && !atual) {
    await salvarPedido(id, { conferir: true, mercadopago: { ...mp, duplicados: [...new Set([...(mp.duplicados ?? []), pid])] } });
    return true;
  }

  const registro = {
    ...mp,
    pagamento_id: pid,
    status: m.status,
    status_detail: m.status_detail,
    metodo: m.payment_method_id,
    tipo: m.payment_type_id,
    parcelas: m.installments,
    valor: m.transaction_amount,
    valor_cliente: m.transaction_details?.total_paid_amount,
    recebido: m.transaction_details?.net_received_amount,
    atualizado_em: new Date().toISOString(),
  };
  const campos: Record<string, unknown> = { mercadopago: registro };

  if (m.status === 'approved') {
    const esperado = Number(mp.esperado);
    const confere = m.currency_id === 'BRL' && Number.isFinite(esperado) && esperado > 0 && Number(m.transaction_amount) + 0.01 >= esperado;
    if (confere) {
      registro.pago_em = m.date_approved ?? new Date().toISOString();
      campos.valor = Number(m.transaction_amount);
      if (p.status === 'novo') campos.status = 'pago';
    } else {
      campos.conferir = true;
    }
  } else if (['refunded', 'charged_back', 'in_mediation'].includes(m.status) && mp.pago_em) {
    // Estorno, contestação ou disputa depois de pago: a loja precisa olhar antes de enviar
    campos.conferir = true;
  }
  await salvarPedido(id, campos);
  return m.status === 'approved' && !campos.conferir;
}

// Aviso do Mercado Pago. A assinatura prova que veio dele; o conteúdo do aviso não é usado, só o número do pagamento.
const iguais = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
};
async function assinaturaValida(req: Request, dataId: string) {
  if (!WEBHOOK_SECRET) return false;
  const partes = Object.fromEntries((req.headers.get('x-signature') ?? '').split(',').map((p) => p.trim().split('=', 2)));
  const pedidoId = req.headers.get('x-request-id');
  if (!partes.ts || !partes.v1 || !pedidoId || !dataId) return false;
  const idManifesto = /^\d+$/.test(dataId) ? dataId : dataId.toLowerCase();
  const manifesto = `id:${idManifesto};request-id:${pedidoId};ts:${partes.ts};`;
  const chave = await crypto.subtle.importKey('raw', texto(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return iguais(hex(await crypto.subtle.sign('HMAC', chave, texto(manifesto))), partes.v1.toLowerCase());
}
async function webhook(req: Request, url: URL): Promise<Resposta> {
  const dataId = url.searchParams.get('data.id') ?? '';
  if (!await assinaturaValida(req, dataId)) return [401, { ok: false }];
  const corpo = await req.json().catch(() => ({}));
  const tipo = url.searchParams.get('type') ?? corpo.type;
  if (tipo !== 'payment' || !ehPagamentoId(dataId)) return [200, { ok: true }];
  // Repetir o mesmo aviso não muda nada: o estado vem sempre da consulta ao Mercado Pago
  const m = await lerPagamento(dataId);
  if (m) await aplicar(m);
  return [200, { ok: true }];
}

// ---------- Ações do site ----------
async function dados(id: string): Promise<Resposta> {
  const cfg = await config();
  if (cfg.modo !== 'site' || !ACCESS_TOKEN || !PUBLIC_KEY) return [409, { ok: false, erro: 'desligado' }];
  const p = await lerPedido(id);
  if (!p) return [404, { ok: false }];
  const mp = p.mercadopago ?? {};
  if (mp.pago_em || p.status !== 'novo') return [200, { ok: true, encerrado: true, pago: !!mp.pago_em || p.status !== 'cancelado' }];
  // O banco registra o valor que o site mandou quando ele não bate com a tabela. Esse pedido nunca é cobrado online
  if (p.conferir) return [409, { ok: false, erro: 'conferir' }];
  const v = cobranca(p, cfg);
  return [200, {
    ok: true,
    publica: PUBLIC_KEY,
    numero: p.numero,
    itens: (p.itens ?? []).map((x: any) => ({ nome: x.nome, tam: x.tam, qtd: x.qtd })),
    cartao: v.cartao,
    pix: v.pix,
    parcelas: cfg.parcelas,
    aberto: ['pending', 'in_process', 'authorized'].includes(mp.status) ? { pagamento_id: mp.pagamento_id, pix: mp.metodo === 'pix' } : null,
  }];
}

// Só passa adiante o que o Mercado Pago precisa. Valor, referência e descrição nunca vêm do navegador.
function validarFormulario(f: Record<string, any>, cfg: Config) {
  const metodo = String(f.payment_method_id ?? '');
  if (!/^[a-z0-9_]{2,30}$/.test(metodo)) return null;
  const email = String(f.payer?.email ?? '').trim();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  const doc = String(f.payer?.identification?.number ?? '').replace(/\D/g, '');
  const tipoDoc = String(f.payer?.identification?.type ?? '').toUpperCase();
  const identification = (tipoDoc === 'CPF' && doc.length === 11) || (tipoDoc === 'CNPJ' && doc.length === 14) ? { type: tipoDoc, number: doc } : undefined;
  if (metodo === 'pix') return { pix: true, metodo, payer: { email, ...(identification ? { identification } : {}) } };
  const token = String(f.token ?? '');
  const parcelas = Number(f.installments);
  if (!/^[\w-]{10,120}$/.test(token) || !Number.isInteger(parcelas) || parcelas < 1 || parcelas > cfg.parcelas) return null;
  const issuer = /^\d{1,12}$/.test(String(f.issuer_id ?? '')) ? String(f.issuer_id) : undefined;
  return { pix: false, metodo, token, parcelas, issuer, payer: { email, ...(identification ? { identification } : {}) } };
}
async function reservar(id: string, req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'sem-ip';
  // O endereço de internet não é guardado: só uma impressão digital, para contar tentativas
  const ipHash = hex(await crypto.subtle.digest('SHA-256', texto(`${CHAVE.slice(0, 24)}:${ip}`)));
  return lerLista('rpc/reservar_cobranca', { method: 'POST', body: JSON.stringify({ p_id: id, p_ip: ipHash }) });
}
const liberar = (id: string) => salvarPedido(id, { cobrando_em: null }).catch(() => {});

async function pagar(corpo: Record<string, any>, req: Request): Promise<Resposta> {
  const { id, tentativa, dados: formulario, device } = corpo;
  if (!ehId(id) || !ehId(tentativa) || !formulario || typeof formulario !== 'object') return [400, { ok: false, erro: 'dados' }];
  const cfg = await config();
  if (cfg.modo !== 'site' || !ACCESS_TOKEN) return [409, { ok: false, erro: 'desligado' }];
  const f = validarFormulario(formulario, cfg);
  if (!f) return [400, { ok: false, erro: 'dados' }];

  // Trava o pedido antes de cobrar: dois cliques ou duas abas nunca geram duas cobranças ao mesmo tempo
  const reserva = await reservar(id, req);
  if (reserva !== 'ok') return [reserva === 'limite' ? 429 : 409, { ok: false, erro: reserva }];
  try {
    const p = await lerPedido(id);
    const mp = p.mercadopago ?? {};
    // Quem gerou um Pix e resolveu pagar de outro jeito: o Pix antigo é cancelado antes, para não ser pago duas vezes
    if (mp.pagamento_id && ['pending', 'in_process', 'authorized'].includes(mp.status)) {
      const c = await fetch(`${MP}/v1/payments/${mp.pagamento_id}`, {
        method: 'PUT',
        headers: cabecalhosMP({ 'X-Idempotency-Key': `cancela-${mp.pagamento_id}` }),
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!c.ok) return [409, { ok: false, erro: 'em_andamento' }];
    }
    const v = cobranca(p, cfg);
    const valor = f.pix ? v.pix : v.cartao;
    if (!(valor >= 1)) return [400, { ok: false, erro: 'valor' }];
    // Anotado antes de cobrar: o aviso do Mercado Pago pode chegar antes da resposta
    await salvarPedido(id, { mercadopago: { ...mp, esperado: valor, pagamento_id: null, status: null } });

    const partesNome = String(p.nome ?? '').trim().split(/\s+/);
    const fone = String(p.telefone ?? '').replace(/\D/g, '').slice(-11);
    const cep = String(p.cep ?? '').replace(/\D/g, '');
    const envio = { zip_code: cep, street_name: p.rua, street_number: p.num };
    const pagamento: Record<string, unknown> = {
      transaction_amount: valor,
      description: `Pedido ${p.numero}`,
      payment_method_id: f.metodo,
      external_reference: p.id,
      payer: { ...f.payer, first_name: partesNome[0], last_name: partesNome.slice(1).join(' ') || partesNome[0] },
      additional_info: {
        items: [{ id: p.numero, title: `Pedido ${p.numero}`, description: resumoItens(p).slice(0, 200), quantity: 1, unit_price: valor }],
        payer: {
          first_name: partesNome[0],
          last_name: partesNome.slice(1).join(' ') || partesNome[0],
          ...(fone.length >= 10 ? { phone: { area_code: fone.slice(0, 2), number: fone.slice(2) } } : {}),
          address: envio,
        },
        shipments: { receiver_address: { ...envio, city_name: p.cidade, state_name: p.uf } },
      },
    };
    if (f.pix) {
      // Pix vale 1 hora: um código esquecido não fica aberto para ser pago depois de o pedido mudar
      pagamento.date_of_expiration = new Date(Date.now() + 3600e3 - 3 * 3600e3).toISOString().replace('Z', '-03:00');
    } else {
      pagamento.token = f.token;
      pagamento.installments = f.parcelas;
      if (f.issuer) pagamento.issuer_id = f.issuer;
      pagamento.statement_descriptor = NOME_NA_FATURA;
      pagamento.three_d_secure_mode = 'optional';
    }
    const r = await fetch(`${MP}/v1/payments`, {
      method: 'POST',
      headers: cabecalhosMP({
        // Presa ao pedido: uma tentativa reaproveitada nunca devolve a cobrança de outro pedido
        'X-Idempotency-Key': hex(await crypto.subtle.digest('SHA-256', texto(`${id}:${tentativa}`))).slice(0, 40),
        ...(typeof device === 'string' && /^[\w-]{10,200}$/.test(device) ? { 'X-meli-session-id': device } : {}),
      }),
      body: JSON.stringify(pagamento),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      // Só o código do erro: a resposta pode repetir dados da cliente
      console.error('Mercado Pago recusou a cobrança', r.status, JSON.stringify((d.cause ?? []).map((c: any) => c.code)));
      return [502, { ok: false, erro: 'recusado' }];
    }
    await aplicar(d);
    const desafio = d.status_detail === 'pending_challenge' && d.three_ds_info
      ? { url: d.three_ds_info.external_resource_url, creq: d.three_ds_info.creq }
      : undefined;
    return [200, { ok: true, pagamento_id: String(d.id), status: d.status, status_detail: d.status_detail, pix: f.pix, desafio }];
  } finally {
    await liberar(id);
  }
}

async function situacao(id: string): Promise<Resposta> {
  const p = await lerPedido(id);
  if (!p) return [404, { ok: false }];
  const mp = p.mercadopago ?? {};
  return [200, { ok: true, pago: !!mp.pago_em, status: mp.status ?? null, status_detail: mp.status_detail ?? null }];
}

// A cliente voltou do link do Mercado Pago: consulta o pagamento, caso o aviso ainda não tenha chegado
async function confirmar(corpo: Record<string, any>): Promise<Resposta> {
  const { id, pagamento_id: pid } = corpo;
  if (!ehId(id) || !ehPagamentoId(pid)) return [400, { ok: false }];
  const m = await lerPagamento(String(pid));
  if (!m || m.external_reference !== id) return [200, { ok: true, pago: false }];
  return [200, { ok: true, pago: await aplicar(m) }];
}

// Só quem é da loja cria link de pagamento pelo painel
async function ehAdmin(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token.split('.').length !== 3) return false;
  const r = await fetch(`${BASE}/auth/v1/user`, { headers: { apikey: CHAVE, Authorization: `Bearer ${token}` } });
  if (!r.ok) return false;
  const u = await r.json();
  if (!u.email || !u.email_confirmed_at) return false;
  const hash = hex(await crypto.subtle.digest('SHA-256', texto(String(u.email).toLowerCase())));
  return (await lerLista(`admins?email_sha256=eq.${hash}&select=email_sha256`)).length > 0;
}
async function criarLink(id: string): Promise<Resposta> {
  const cfg = await config();
  if (cfg.modo === 'desligado' || !ACCESS_TOKEN) return [409, { ok: false, erro: 'pagamento desligado' }];
  const p = await lerPedido(id);
  if (!p) return [404, { ok: false }];
  const mp = p.mercadopago ?? {};
  if (mp.pago_em) return [200, { ok: true, pago: true }];
  if (p.status === 'cancelado') return [409, { ok: false, erro: 'pedido cancelado' }];
  const valor = Number(p.valor ?? p.total);
  if (!(valor >= 1)) return [400, { ok: false, erro: 'valor abaixo de R$ 1,00' }];
  // Mesmo valor e link ainda válido: devolve o mesmo, para a cliente não receber dois
  if (mp.link && mp.esperado === valor && Date.parse(mp.link_expira ?? '') > Date.now()) return [200, { ok: true, url: mp.link }];

  const expira = new Date(Date.now() + 7 * 864e5).toISOString();
  const volta = `${SITE}/acompanhar.html?p=${p.id}`;
  // O link não sabe como a cliente vai pagar: pedido com preço de Pix só aceita Pix
  const soPix = p.pagamento === 'Pix' && valor < Number(p.total);
  const r = await fetch(`${MP}/checkout/preferences`, {
    method: 'POST',
    headers: cabecalhosMP(),
    body: JSON.stringify({
      items: [{ id: p.numero, title: `Pedido ${p.numero}`, description: resumoItens(p).slice(0, 200), quantity: 1, currency_id: 'BRL', unit_price: valor }],
      external_reference: p.id,
      back_urls: { success: volta, pending: volta, failure: volta },
      auto_return: 'approved',
      statement_descriptor: NOME_NA_FATURA,
      expires: true,
      expiration_date_to: expira,
      payment_methods: {
        installments: soPix ? 1 : cfg.parcelas,
        excluded_payment_types: soPix ? [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }] : [{ id: 'ticket' }],
      },
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || typeof d.init_point !== 'string') {
    console.error('Mercado Pago recusou o link', r.status);
    return [502, { ok: false, erro: 'o Mercado Pago não criou o link' }];
  }
  await salvarPedido(p.id, { mercadopago: { ...mp, link: d.init_point, link_expira: expira, preferencia: d.id, esperado: valor } });
  return [200, { ok: true, url: d.init_point }];
}

// ---------- Entrada ----------
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const origem = req.headers.get('Origin') ?? '';
  const cors: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    Vary: 'Origin',
    ...(ORIGENS.includes(origem) ? { 'Access-Control-Allow-Origin': origem } : {}),
  };
  const responder = ([status, corpo]: Resposta) => new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (url.pathname.endsWith('/webhook')) return responder(req.method === 'POST' ? await webhook(req, url) : [405, { ok: false }]);
    if (req.method === 'GET') {
      const cfg = await config();
      return responder([200, { ok: true, modo: cfg.modo, credenciais: !!(ACCESS_TOKEN && PUBLIC_KEY), webhook: !!WEBHOOK_SECRET, teste: AMBIENTE_TESTE }]);
    }
    if (req.method !== 'POST') return responder([405, { ok: false }]);
    const corpo = await req.json().catch(() => ({}));
    if (corpo.acao === 'pagar') return responder(await pagar(corpo, req));
    if (corpo.acao === 'confirmar') return responder(await confirmar(corpo));
    if (corpo.acao === 'dados' && ehId(corpo.id)) return responder(await dados(corpo.id));
    if (corpo.acao === 'situacao' && ehId(corpo.id)) return responder(await situacao(corpo.id));
    if (corpo.acao === 'link' && ehId(corpo.id)) return responder(await ehAdmin(req) ? await criarLink(corpo.id) : [401, { ok: false }]);
    return responder([400, { ok: false }]);
  } catch (e) {
    // Nunca o erro inteiro: ele pode conter dados do pagamento
    console.error('Falha na função de pagamento', e instanceof Error ? e.message.slice(0, 120) : 'erro');
    return responder([500, { ok: false }]);
  }
});
