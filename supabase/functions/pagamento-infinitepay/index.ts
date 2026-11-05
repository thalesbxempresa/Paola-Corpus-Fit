// Pagamento online pela InfinitePay (Checkout Integrado).
//
// criar:     monta o link de um pedido com o que está no banco (valor, cliente, endereço), nunca com o que o navegador manda.
// webhook:   a InfinitePay avisa que alguém pagou. O aviso não tem assinatura, então o pedido só vira pago
//            depois que a própria InfinitePay confirma no payment_check.
// confirmar: a cliente volta do pagamento para o site e a página pede a mesma confirmação, caso o aviso atrase.
// GET:       diz ao painel se a loja está configurada, sem mostrar a chave.
//
// Sem a chave da API, o link funciona só com a InfiniteTag. Com a chave (segredo INFINITEPAY_API_KEY no Supabase),
// o link também leva o desconto do Pix, as parcelas sem juros e vale para um único pagamento.
const BASE = Deno.env.get('SUPABASE_URL')!;
const segredos = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const CHAVE: string = segredos.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const API_KEY = Deno.env.get('INFINITEPAY_API_KEY') ?? '';
const API = 'https://api.checkout.infinitepay.io';
const SITE = 'https://paolacorpusfit.vercel.app';
const FUNCAO = `${BASE}/functions/v1/pagamento-infinitepay`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};
const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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
const ehId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const centavos = (v: unknown) => Math.round(Number(v) * 100);

type Config = { handle: string; modo: string; pix: number; parcelas: number };
async function config(): Promise<Config> {
  const [c] = await lerLista('loja_config?id=eq.1&select=dados');
  const d = c?.dados ?? {};
  return {
    handle: String(d.pagamento?.handle ?? '').replace(/^\$/, '').trim(),
    modo: d.pagamento?.modo ?? 'desligado',
    pix: Number(d.loja?.pix) || 0,
    parcelas: Math.min(12, Math.max(1, Number(d.loja?.parcelas) || 1)),
  };
}
async function lerPedido(id: string) {
  const [p] = await lerLista(`pedidos?id=eq.${id}&select=id,numero,status,nome,telefone,cep,rua,num,complemento,bairro,cidade,uf,pagamento,itens,total,valor,infinitepay`);
  return p;
}
const salvarPedido = (id: string, campos: Record<string, unknown>) => lerLista(`pedidos?id=eq.${id}`, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify(campos),
});

// Quanto cobrar. Pedido do site: preço cheio, e o desconto do Pix entra pela InfinitePay só se a cliente pagar no Pix
// (com a chave, vai no próprio link; sem ela, vale o desconto configurado no app, que deve ser o mesmo do site).
// Se a loja mudou o valor à mão (frete, desconto, teste), cobra exatamente esse valor, sem outro desconto.
function cobranca(p: Record<string, any>, cfg: Config) {
  const total = Number(p.total);
  const valor = Number(p.valor ?? p.total);
  const comPix = Math.round(total * (1 - cfg.pix) * 100) / 100;
  const doSite = valor === total || (p.pagamento === 'Pix' && Math.abs(valor - comPix) < 0.01);
  if (doSite) return { centavos: centavos(total), descontoPix: cfg.pix > 0 ? Math.round(cfg.pix * 1000) / 10 : 0 };
  return { centavos: centavos(valor), descontoPix: 0 };
}
const resumoItens = (p: Record<string, any>) => (p.itens ?? [])
  .map((x: any) => `${x.qtd || 1}x ${x.nome}${x.tam ? ` (${x.tam})` : ''}`).join(', ');

async function criar(id: string) {
  const cfg = await config();
  if (cfg.modo === 'desligado' || !cfg.handle) return responder(409, { ok: false, erro: 'pagamento desligado' });
  const p = await lerPedido(id);
  if (!p) return responder(404, { ok: false });
  if (p.infinitepay?.pago_em) return responder(200, { ok: true, pago: true });
  if (p.status === 'cancelado') return responder(409, { ok: false, erro: 'pedido cancelado' });
  const valor = cobranca(p, cfg);
  if (valor.centavos < 100) return responder(400, { ok: false, erro: 'valor abaixo de R$ 1,00' });
  // Mesmo valor de antes: devolve o mesmo link, para a cliente não receber dois
  if (p.infinitepay?.link && p.infinitepay.centavos === valor.centavos) return responder(200, { ok: true, url: p.infinitepay.link });

  const fone = String(p.telefone ?? '').replace(/\D/g, '');
  const corpo: Record<string, unknown> = {
    handle: cfg.handle,
    order_nsu: p.id,
    items: [{ quantity: 1, price: valor.centavos, description: `Pedido ${p.numero}: ${resumoItens(p)}`.slice(0, 200) }],
    redirect_url: `${SITE}/acompanhar.html?p=${p.id}`,
    webhook_url: `${FUNCAO}/webhook`,
    customer: { name: p.nome, ...(fone.length >= 10 ? { phone_number: `+55${fone.slice(-11)}` } : {}) },
    address: { cep: String(p.cep ?? '').replace(/\D/g, ''), street: p.rua, number: p.num, neighborhood: p.bairro, city: p.cidade, state: p.uf, complement: p.complemento || undefined },
  };
  if (API_KEY) {
    // Sem a chave, a InfinitePay não aceita estas opções: valem as configurações do app da loja
    corpo.options = {
      ...(valor.descontoPix ? { discounts: { pix: valor.descontoPix } } : {}),
      assured_installments: cfg.parcelas,
      single_payment: true,
      valid_until: new Date(Date.now() + 7 * 864e5).toISOString(),
    };
  }
  const r = await fetch(`${API}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}) },
    body: JSON.stringify(corpo),
  });
  const d = await r.json().catch(() => ({}));
  const url = [d.url, d.link, d.checkout_url, ...Object.values(d)]
    .find((v) => typeof v === 'string' && /^https:\/\/[^/]*infinitepay/.test(v));
  if (!r.ok || !url) {
    console.error('InfinitePay recusou o link', r.status, JSON.stringify(d).slice(0, 300));
    return responder(502, { ok: false, erro: 'a InfinitePay não criou o link' });
  }
  await salvarPedido(p.id, { infinitepay: { ...(p.infinitepay ?? {}), link: url, centavos: valor.centavos, desconto_pix: valor.descontoPix, criado_em: new Date().toISOString() } });
  return responder(200, { ok: true, url });
}

// Só a InfinitePay diz se foi pago. Depois de confirmado, o pedido vai para "Confirmado" sozinho
async function confirmar(dados: Record<string, unknown>) {
  const id = dados.order_nsu ?? dados.id;
  const { slug, transaction_nsu } = dados;
  if (!ehId(id) || typeof slug !== 'string' || typeof transaction_nsu !== 'string') return { status: 400, pago: false };
  const p = await lerPedido(id);
  if (!p) return { status: 200, pago: false };
  if (p.infinitepay?.pago_em && p.infinitepay.transaction_nsu === transaction_nsu) return { status: 200, pago: true };
  const cfg = await config();
  const r = await fetch(`${API}/payment_check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}) },
    body: JSON.stringify({ handle: cfg.handle, order_nsu: id, transaction_nsu, slug }),
  });
  if (!r.ok) throw new Error(`payment_check respondeu ${r.status}`);
  const c = await r.json();
  if (!c.success || !c.paid) return { status: 200, pago: false };

  // O valor pago com o desconto do Pix fica menor; parcelado com taxa para a cliente, maior. Abaixo do mínimo: conferir
  const esperado = Number(p.infinitepay?.centavos) || 0;
  const desconto = Number(p.infinitepay?.desconto_pix) || 0;
  const minimo = c.capture_method === 'pix' && desconto ? Math.floor(esperado * (1 - desconto / 100)) - 1 : esperado - 1;
  const confere = Number(c.amount) >= minimo;
  const info = {
    ...(p.infinitepay ?? {}),
    pago_em: new Date().toISOString(),
    slug,
    transaction_nsu,
    capture_method: c.capture_method,
    installments: c.installments,
    amount: c.amount,
    paid_amount: c.paid_amount,
    ...(typeof dados.receipt_url === 'string' && /^https:\/\//.test(dados.receipt_url) ? { receipt_url: dados.receipt_url } : {}),
  };
  const campos: Record<string, unknown> = { infinitepay: info };
  if (confere) {
    campos.valor = Number(c.amount) / 100;
    if (p.status === 'novo') campos.status = 'pago';
  } else {
    campos.conferir = true;
  }
  await salvarPedido(p.id, campos);
  return { status: 200, pago: confere };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (req.method === 'GET') {
      const cfg = await config();
      return responder(200, { ok: true, modo: cfg.modo, handle: !!cfg.handle, chave: !!API_KEY });
    }
    if (req.method !== 'POST') return responder(405, { ok: false });
    const dados = await req.json().catch(() => ({}));

    // Aviso da InfinitePay: responder rápido. Erro devolve 400 para ela tentar de novo
    if (new URL(req.url).pathname.endsWith('/webhook')) {
      const { status } = await confirmar({ ...dados, slug: dados.invoice_slug ?? dados.slug });
      return responder(status === 400 ? 400 : 200, { ok: status !== 400 });
    }
    if (dados.acao === 'criar' && ehId(dados.id)) return await criar(dados.id);
    if (dados.acao === 'confirmar') {
      const { status, pago } = await confirmar(dados);
      return responder(status, { ok: status === 200, pago });
    }
    return responder(400, { ok: false });
  } catch (e) {
    console.error(e);
    return responder(500, { ok: false });
  }
});
