// Pagamento pelo Mercado Pago (API de Orders). Toda a parte que envolve dinheiro acontece aqui, nunca no navegador.
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
const AMBIENTE_TESTE = Deno.env.get('MERCADOPAGO_AMBIENTE') === 'teste';
// Os dois jogos de chaves ficam guardados lado a lado e nunca se misturam:
// em teste (MERCADOPAGO_AMBIENTE = teste) valem MERCADOPAGO_...; sem esse segredo valem as de produção, MERCADOPAGO_PROD_...
// Para vender de verdade basta apagar MERCADOPAGO_AMBIENTE. Sem as chaves de produção, o pagamento fica desligado.
const chaveMP = (nome: string, producao = !AMBIENTE_TESTE) => (Deno.env.get(`MERCADOPAGO_${producao ? 'PROD_' : ''}${nome}`) ?? '').trim();
const ACCESS_TOKEN = chaveMP('ACCESS_TOKEN');
const PUBLIC_KEY = chaveMP('PUBLIC_KEY');
const WEBHOOK_SECRET = chaveMP('WEBHOOK_SECRET');
// Só para o painel saber se a loja já pode sair do teste. Diz se existem, nunca o conteúdo
const PRODUCAO_PRONTA = ['ACCESS_TOKEN', 'PUBLIC_KEY', 'WEBHOOK_SECRET'].every((nome) => !!chaveMP(nome, true));
const MP = 'https://api.mercadopago.com';
const SITE = 'https://paolacorpusfit.com.br';
// O www e o endereço antigo da Vercel continuam aceitos: links e pedidos já enviados ainda abrem por eles
const ORIGENS = [SITE, 'https://www.paolacorpusfit.com.br', 'https://paolacorpusfit.vercel.app', 'https://thalesbxempresa.github.io'];
const NOME_NA_FATURA = 'PAOLACORPUSFIT';
// Situações em que ainda pode entrar dinheiro: antes de cobrar de novo, a cobrança antiga é cancelada
const ABERTOS = ['pending', 'in_process'];

type Resposta = [number, Record<string, unknown>];
type Config = { modo: string; pix: number; parcelas: number; parcelasMax: number };

const texto = (v: string) => new TextEncoder().encode(v);
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const ehId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
// No Mercado Pago, cada cobrança é uma "order", com código do tipo ORD01ABC...
const ehOrdemId = (v: unknown) => /^ORD[0-9A-Z]{8,60}$/i.test(String(v ?? ''));
const arredondar = (v: number) => Math.round(v * 100) / 100;
const dinheiro = (v: number) => v.toFixed(2);
const enderecoSeguro = (v: unknown) => (typeof v === 'string' && /^https:\/\/[^\s"'<>]{1,2000}$/.test(v) ? v : null);
const semVazios = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ''));
const agora = () => new Date().toISOString();

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
  // parcelas: sem juros, a loja assume (igual ao "parcelado vendedor" da conta). parcelasMax: acima delas, a cliente paga os juros
  const parcelas = Math.min(12, Math.max(1, Number(d.loja?.parcelas) || 1));
  return {
    modo: d.pagamento?.modo ?? 'desligado',
    pix: Number(d.loja?.pix) || 0,
    parcelas,
    parcelasMax: Math.min(12, Math.max(parcelas, Number(d.loja?.parcelasMax) || parcelas)),
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
// "No site": a cliente paga logo depois de pedir. "Link": só depois que a loja confere e libera o pedido
const liberado = (cfg: Config, mp: Record<string, any>) => cfg.modo === 'site' || (cfg.modo === 'link' && !!mp.link);

// ---------- Mercado Pago ----------
const cabecalhosMP = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
  ...extra,
});
const chaveUnica = async (semente: string) => hex(await crypto.subtle.digest('SHA-256', texto(semente))).slice(0, 40);
async function lerOrdem(id: string) {
  const r = await fetch(`${MP}/v1/orders/${String(id).toUpperCase()}`, { headers: cabecalhosMP() });
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status} ao consultar a cobrança`);
  return r.json();
}
// Traduz a situação da cobrança no Mercado Pago para poucas palavras que o site e o painel entendem.
// Só "processed" com "accredited" é dinheiro na conta. Qualquer situação desconhecida conta como "em análise", nunca como paga
function situacaoDaOrdem(o: Record<string, any>) {
  const s = String(o?.status ?? '');
  const d = String(o?.status_detail ?? '');
  // Devolução de só uma parte não é estorno: a venda continua valendo, a loja só confere o valor
  if (s === 'processed') return d === 'accredited' ? 'approved' : d === 'partially_refunded' ? 'partially_refunded' : 'in_process';
  if (s === 'action_required') return 'pending';
  if (s === 'failed') return 'rejected';
  if (['canceled', 'cancelled', 'expired'].includes(s)) return 'cancelled';
  if (s === 'refunded') return 'refunded';
  if (s === 'charged_back') return 'charged_back';
  return 'in_process';
}
// A mensagem de erro pode repetir dados da cliente: só sai o código, e em teste o texto sem e-mail nem números longos
function erroParaLog(d: Record<string, any>) {
  const erros = Array.isArray(d?.errors) ? d.errors : [];
  const codigos = [...erros.map((e: any) => e?.code), d?.code, d?.error].filter((c) => typeof c === 'string').slice(0, 6);
  if (!AMBIENTE_TESTE) return JSON.stringify(codigos);
  const limpar = (t: unknown) => String(t ?? '').replace(/[\w.+-]+@[\w.-]+/g, '(e-mail)').replace(/[A-Za-z0-9_-]{20,}/g, '(código)').replace(/\d{6,}/g, '(número)').slice(0, 160);
  return JSON.stringify({ codigos, textos: erros.slice(0, 4).map((e: any) => limpar(`${e?.message ?? ''} ${typeof e?.details === 'string' ? e.details : JSON.stringify(e?.details ?? '')}`)) });
}

// Atualiza o pedido com o que o Mercado Pago informou. Pode ser chamada várias vezes para a mesma cobrança.
// adotar: a função acabou de criar esta cobrança, então ela passa a ser a atual do pedido.
async function aplicar(o: Record<string, any>, adotar = false): Promise<boolean> {
  const id = o?.external_reference;
  if (!ehId(id) || !ehOrdemId(o.id)) return false;
  // Cobrança de teste nunca confirma pedido quando a loja está em produção
  if (!AMBIENTE_TESTE && o.live_mode === false) {
    console.warn('Cobrança de teste ignorada em produção');
    return false;
  }
  const p = await lerPedido(id);
  if (!p) return false;
  const mp = p.mercadopago ?? {};
  const oid = String(o.id).toUpperCase();
  const st = situacaoDaOrdem(o);
  const atual = adotar || !mp.ordem_id || mp.ordem_id === oid;

  // Tentativa antiga (Pix trocado por cartão, cartão recusado): só importa se acabou sendo paga
  if (!atual && st !== 'approved') return false;
  // Duas cobranças aprovadas no mesmo pedido: nunca some sem avisar a loja
  if (mp.pago_em && !atual) {
    await salvarPedido(id, { conferir: true, mercadopago: { ...mp, duplicados: [...new Set([...(mp.duplicados ?? []), oid])] } });
    return true;
  }

  const pg = o.transactions?.payments?.[0] ?? {};
  const metodo = pg.payment_method ?? {};
  const pixAberto = ABERTOS.includes(st) && metodo.id === 'pix';
  const registro: Record<string, any> = {
    ...mp,
    ordem_id: oid,
    pagamento_id: typeof pg.id === 'string' ? pg.id : null,
    status: st,
    status_mp: o.status ?? null,
    status_detail: o.status_detail ?? null,
    metodo: metodo.id ?? null,
    tipo: metodo.type ?? null,
    parcelas: metodo.installments ?? null,
    valor: Number(o.total_amount),
    valor_cliente: Number(o.total_paid_amount ?? pg.paid_amount) || null,
    atualizado_em: agora(),
    // O código do Pix só fica guardado enquanto ainda dá para pagar
    pix_codigo: pixAberto ? (typeof metodo.qr_code === 'string' ? metodo.qr_code : mp.pix_codigo ?? null) : null,
    pix_url: pixAberto ? (enderecoSeguro(metodo.ticket_url) ?? mp.pix_url ?? null) : null,
  };
  const campos: Record<string, unknown> = { mercadopago: registro };

  if (st === 'approved') {
    const esperado = Number(mp.esperado);
    const cobrado = Number(o.total_amount);
    const pago = Number(o.total_paid_amount ?? pg.paid_amount);
    const emReais = (o.currency ?? 'BRL') === 'BRL' && (o.country_code ?? 'BRA') === 'BRA';
    const confere = emReais && Number.isFinite(esperado) && esperado > 0 && cobrado + 0.01 >= esperado && pago + 0.01 >= esperado;
    if (confere) {
      registro.pago_em = mp.pago_em ?? agora();
      campos.valor = cobrado;
      if (p.status === 'novo') campos.status = 'pago';
    } else {
      campos.conferir = true;
    }
  } else if (st === 'refunded' && mp.pago_em) {
    registro.estornado_em = mp.estornado_em ?? agora();
    if (['novo', 'pago', 'preparando'].includes(p.status)) {
      // Dinheiro devolvido antes do envio: o pedido é cancelado sozinho, e o banco devolve as peças ao estoque
      campos.status = 'cancelado';
      campos.conferir = false;
      campos.motivo_cancelamento = 'Pagamento devolvido pelo Mercado Pago';
    } else if (p.status !== 'cancelado' && !mp.estornado_em) {
      // Já tinha saído: a loja decide o que fazer. Avisa uma vez só, para o "Já conferi" não ser desfeito por aviso repetido
      campos.conferir = true;
    }
  } else if (['partially_refunded', 'charged_back'].includes(st) && mp.pago_em && mp.status !== st) {
    // Devolução parcial ou contestação no banco: a loja precisa olhar. Também avisa uma vez só
    campos.conferir = true;
  }
  await salvarPedido(id, campos);
  return st === 'approved' && !campos.conferir;
}

// Aviso do Mercado Pago. A assinatura prova que veio dele; o conteúdo do aviso não é usado, só o código da cobrança.
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
  const chave = await crypto.subtle.importKey('raw', texto(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const recebida = partes.v1.toLowerCase();
  // A documentação pede o código em minúsculas na conta; o programa oficial usa como veio. As duas formas exigem o segredo
  let valida = false;
  for (const idNaConta of new Set([dataId, dataId.toLowerCase()])) {
    const manifesto = `id:${idNaConta};request-id:${pedidoId};ts:${partes.ts};`;
    if (iguais(hex(await crypto.subtle.sign('HMAC', chave, texto(manifesto))), recebida)) valida = true;
  }
  return valida;
}
async function webhook(req: Request, url: URL): Promise<Resposta> {
  const dataId = url.searchParams.get('data.id') ?? '';
  if (!await assinaturaValida(req, dataId)) return [401, { ok: false }];
  const corpo = await req.json().catch(() => ({}));
  const tipo = url.searchParams.get('type') ?? corpo.type;
  if (tipo !== 'order' || !ehOrdemId(dataId)) return [200, { ok: true }];
  if (!AMBIENTE_TESTE && corpo.live_mode === false) {
    console.warn('Aviso de teste ignorado em produção');
    return [200, { ok: true }];
  }
  // Repetir o mesmo aviso não muda nada: o estado vem sempre da consulta ao Mercado Pago
  const o = await lerOrdem(dataId);
  if (o) await aplicar(o);
  return [200, { ok: true }];
}

// ---------- Ações do site ----------
async function dados(id: string): Promise<Resposta> {
  const cfg = await config();
  if (cfg.modo === 'desligado' || !ACCESS_TOKEN || !PUBLIC_KEY) return [409, { ok: false, erro: 'desligado' }];
  const p = await lerPedido(id);
  if (!p) return [404, { ok: false }];
  const mp = p.mercadopago ?? {};
  if (mp.pago_em || p.status !== 'novo') return [200, { ok: true, encerrado: true, pago: !!mp.pago_em || p.status !== 'cancelado' }];
  if (!liberado(cfg, mp)) return [409, { ok: false, erro: 'desligado' }];
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
    parcelasMax: cfg.parcelasMax,
    aberto: ABERTOS.includes(mp.status) ? { pix: mp.metodo === 'pix', codigo: mp.pix_codigo ?? null, url: mp.pix_url ?? null } : null,
  }];
}

// Só passa adiante o que o Mercado Pago precisa. Valor, referência e descrição nunca vêm do navegador.
function validarFormulario(f: Record<string, any>, cfg: Config, tipoInformado: unknown) {
  const metodo = String(f.payment_method_id ?? '');
  if (!/^[a-z0-9_]{2,30}$/.test(metodo)) return null;
  const email = String(f.payer?.email ?? '').trim();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  const doc = String(f.payer?.identification?.number ?? '').replace(/\D/g, '');
  const tipoDoc = String(f.payer?.identification?.type ?? '').toUpperCase();
  const identification = (tipoDoc === 'CPF' && doc.length === 11) || (tipoDoc === 'CNPJ' && doc.length === 14) ? { type: tipoDoc, number: doc } : undefined;
  const payer = { email, ...(identification ? { identification } : {}) };
  if (metodo === 'pix') return { pix: true, metodo, tipo: 'bank_transfer', payer };
  const token = String(f.token ?? '');
  const parcelas = Number(f.installments);
  if (!/^[\w-]{10,120}$/.test(token) || !Number.isInteger(parcelas) || parcelas < 1 || parcelas > cfg.parcelasMax) return null;
  const debito = tipoInformado === 'debit_card' || metodo.startsWith('deb');
  if (debito && parcelas !== 1) return null;
  return { pix: false, metodo, tipo: debito ? 'debit_card' : 'credit_card', token, parcelas, payer };
}
async function reservar(id: string, req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'sem-ip';
  // O endereço de internet não é guardado: só uma impressão digital, para contar tentativas
  const ipHash = hex(await crypto.subtle.digest('SHA-256', texto(`${CHAVE.slice(0, 24)}:${ip}`)));
  return lerLista('rpc/reservar_cobranca', { method: 'POST', body: JSON.stringify({ p_id: id, p_ip: ipHash }) });
}
const liberar = (id: string) => salvarPedido(id, { cobrando_em: null }).catch(() => {});

// Quem gerou um Pix e resolveu pagar de outro jeito: a cobrança antiga é cancelada antes, para não ser paga duas vezes.
// Devolve true se o caminho ficou livre, 'pago' se a cobrança antiga já tinha sido paga e false se ainda está em andamento
async function cancelarOrdem(ordemId: string, pedidoId: string, tentativa: string): Promise<boolean | 'pago'> {
  const c = await fetch(`${MP}/v1/orders/${ordemId}/cancel`, {
    method: 'POST',
    headers: cabecalhosMP({ 'X-Idempotency-Key': await chaveUnica(`cancela:${ordemId}:${tentativa}`) }),
  });
  if (c.ok) return true;
  // Não cancelou: pode já ter sido paga, ter vencido ou estar em análise. Vale o estado real no Mercado Pago
  const o = await lerOrdem(ordemId).catch(() => null);
  if (!o || o.external_reference !== pedidoId) return false;
  if (await aplicar(o)) return 'pago';
  return ['cancelled', 'rejected'].includes(situacaoDaOrdem(o));
}

async function pagar(corpo: Record<string, any>, req: Request): Promise<Resposta> {
  const { id, tentativa, dados: formulario, device } = corpo;
  if (!ehId(id) || !ehId(tentativa) || !formulario || typeof formulario !== 'object') return [400, { ok: false, erro: 'dados' }];
  const cfg = await config();
  if (cfg.modo === 'desligado' || !ACCESS_TOKEN) return [409, { ok: false, erro: 'desligado' }];
  const f = validarFormulario(formulario, cfg, corpo.metodo);
  if (!f) return [400, { ok: false, erro: 'dados' }];

  // Trava o pedido antes de cobrar: dois cliques ou duas abas nunca geram duas cobranças ao mesmo tempo
  const reserva = await reservar(id, req);
  if (reserva !== 'ok') return [reserva === 'limite' ? 429 : 409, { ok: false, erro: reserva }];
  try {
    const p = await lerPedido(id);
    const mp = p.mercadopago ?? {};
    if (!liberado(cfg, mp)) return [409, { ok: false, erro: 'desligado' }];
    if (mp.ordem_id && ABERTOS.includes(mp.status)) {
      const livre = await cancelarOrdem(mp.ordem_id, id, tentativa);
      if (livre === 'pago') return [409, { ok: false, erro: 'pago' }];
      if (!livre) return [409, { ok: false, erro: 'em_andamento' }];
    }
    const v = cobranca(p, cfg);
    const valor = f.pix ? v.pix : v.cartao;
    if (!(valor >= 1)) return [400, { ok: false, erro: 'valor' }];
    // Anotado antes de cobrar: o aviso do Mercado Pago pode chegar antes da resposta
    const anotado = { ...mp, esperado: valor, ordem_id: null, pagamento_id: null, status: null, status_mp: null, status_detail: null, pix_codigo: null, pix_url: null };
    await salvarPedido(id, { mercadopago: anotado });

    const partesNome = String(p.nome ?? '').trim().split(/\s+/);
    const fone = String(p.telefone ?? '').replace(/\D/g, '').slice(-11);
    const cep = String(p.cep ?? '').replace(/\D/g, '');
    const total = dinheiro(valor);
    const ordem: Record<string, unknown> = {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: total,
      external_reference: p.id,
      description: `Pedido ${p.numero}`,
      // Os dados de quem compra saem do pedido no banco e ajudam o antifraude do Mercado Pago
      payer: {
        ...f.payer,
        first_name: partesNome[0],
        last_name: partesNome.slice(1).join(' ') || partesNome[0],
        ...(fone.length >= 10 ? { phone: { area_code: fone.slice(0, 2), number: fone.slice(2) } } : {}),
        ...(cep.length === 8 && p.rua ? { address: semVazios({ zip_code: `${cep.slice(0, 5)}-${cep.slice(5)}`, street_name: p.rua, street_number: String(p.num ?? ''), neighborhood: p.bairro, city: p.cidade, state: p.uf }) } : {}),
      },
      items: [{ title: `Pedido ${p.numero}`, description: resumoItens(p).slice(0, 200) || `Pedido ${p.numero}`, external_code: p.numero, quantity: 1, unit_price: total }],
      transactions: {
        payments: [f.pix
          // Pix vale 1 hora: um código esquecido não fica aberto para ser pago depois de o pedido mudar
          ? { amount: total, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT1H' }
          : { amount: total, payment_method: { id: f.metodo, type: f.tipo, token: f.token, installments: f.parcelas, statement_descriptor: NOME_NA_FATURA } }],
      },
      // Cartão: o banco pode pedir uma confirmação extra (3DS) quando o Mercado Pago vê risco
      ...(f.pix ? {} : { config: { online: { transaction_security: { validation: 'on_fraud_risk', liability_shift: 'required' } } } }),
    };
    const r = await fetch(`${MP}/v1/orders`, {
      method: 'POST',
      headers: cabecalhosMP({
        // Presa ao pedido: uma tentativa reaproveitada nunca devolve a cobrança de outro pedido
        'X-Idempotency-Key': await chaveUnica(`${id}:${tentativa}`),
        ...(typeof device === 'string' && /^[\w-]{10,200}$/.test(device) ? { 'X-meli-session-id': device } : {}),
      }),
      body: JSON.stringify(ordem),
    });
    const d = await r.json().catch(() => ({}));
    const criada = ehOrdemId(d?.id) ? d : ehOrdemId(d?.data?.id) ? d.data : null;
    const nossa = criada && criada.external_reference === id ? criada : null;
    // 402: o Mercado Pago criou a cobrança, mas o cartão não passou
    if (r.status === 402 || (r.ok && nossa && situacaoDaOrdem(nossa) === 'rejected')) {
      if (nossa) await aplicar(nossa, true);
      else await salvarPedido(id, { mercadopago: { ...anotado, status: 'rejected', atualizado_em: agora() } });
      return [200, { ok: true, status: 'rejected' }];
    }
    if (!r.ok || !nossa) {
      console.error('Mercado Pago recusou a cobrança', r.status, erroParaLog(d));
      return [502, { ok: false, erro: 'recusado' }];
    }
    await aplicar(nossa, true);
    const metodo = nossa.transactions?.payments?.[0]?.payment_method ?? {};
    const desafio = nossa.status_detail === 'pending_challenge' ? enderecoSeguro(metodo.transaction_security?.url) : null;
    return [200, {
      ok: true,
      status: situacaoDaOrdem(nossa),
      status_detail: nossa.status_detail ?? null,
      pix: f.pix,
      ...(f.pix ? { qr: { codigo: typeof metodo.qr_code === 'string' ? metodo.qr_code : null, imagem: typeof metodo.qr_code_base64 === 'string' ? metodo.qr_code_base64 : null, url: enderecoSeguro(metodo.ticket_url) } } : {}),
      ...(desafio ? { desafio } : {}),
    }];
  } finally {
    await liberar(id);
  }
}

// A página de pagamento pergunta de tempos em tempos se já foi pago. Se o aviso do Mercado Pago atrasar,
// a própria pergunta consulta o Mercado Pago, no máximo uma vez a cada 8 segundos por pedido
async function situacao(id: string): Promise<Resposta> {
  let p = await lerPedido(id);
  if (!p) return [404, { ok: false }];
  let mp = p.mercadopago ?? {};
  const parado = Date.now() - (Date.parse(mp.atualizado_em ?? '') || 0) > 8000;
  if (ACCESS_TOKEN && mp.ordem_id && ABERTOS.includes(mp.status) && parado) {
    await salvarPedido(id, { mercadopago: { ...mp, atualizado_em: agora() } });
    const o = await lerOrdem(mp.ordem_id).catch(() => null);
    if (o && o.external_reference === id) {
      await aplicar(o);
      p = await lerPedido(id);
      mp = p.mercadopago ?? {};
    }
  }
  return [200, { ok: true, pago: !!mp.pago_em, status: mp.status ?? null, status_detail: mp.status_detail ?? null }];
}

// Só quem é da loja libera o pagamento de um pedido pelo painel
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
// O link de pagamento leva para a página de pagamento da própria loja. O valor é sempre o do pedido na hora de pagar
async function criarLink(id: string): Promise<Resposta> {
  const cfg = await config();
  if (cfg.modo === 'desligado' || !ACCESS_TOKEN || !PUBLIC_KEY) return [409, { ok: false, erro: 'pagamento desligado' }];
  const p = await lerPedido(id);
  if (!p) return [404, { ok: false }];
  const mp = p.mercadopago ?? {};
  if (mp.pago_em) return [200, { ok: true, pago: true }];
  if (p.status !== 'novo') return [409, { ok: false, erro: 'este pedido não está mais esperando pagamento' }];
  if (p.conferir) return [409, { ok: false, erro: 'confira o valor a cobrar e toque em "Já conferi" antes de mandar o link' }];
  if (!(Number(p.valor ?? p.total) >= 1)) return [400, { ok: false, erro: 'valor abaixo de R$ 1,00' }];
  const link = `${SITE}/pagamento.html?p=${p.id}`;
  if (mp.link !== link) await salvarPedido(p.id, { mercadopago: { ...mp, link } });
  return [200, { ok: true, url: link }];
}

// A loja cancelou o pedido ou mudou o valor: o Pix ou cartão que a cliente deixou em aberto é cancelado no Mercado Pago,
// para ela não pagar um pedido cancelado nem um valor antigo. Se ela pagou nesse meio-tempo, o pedido fica pago
async function cancelarCobranca(id: string): Promise<Resposta> {
  const p = await lerPedido(id);
  if (!p) return [404, { ok: false }];
  const mp = p.mercadopago ?? {};
  if (mp.pago_em) return [200, { ok: true, cancelada: false, pago: true }];
  if (!ACCESS_TOKEN || !mp.ordem_id || !ABERTOS.includes(mp.status)) return [200, { ok: true, cancelada: false }];
  const r = await cancelarOrdem(mp.ordem_id, id, 'loja');
  if (r === 'pago') return [200, { ok: true, cancelada: false, pago: true }];
  if (r === true) {
    const atual = (await lerPedido(id))?.mercadopago ?? mp;
    await salvarPedido(id, { mercadopago: { ...atual, status: 'cancelled', pix_codigo: null, pix_url: null, atualizado_em: agora() } });
  }
  return [200, { ok: true, cancelada: r === true }];
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
      return responder([200, { ok: true, modo: cfg.modo, credenciais: !!(ACCESS_TOKEN && PUBLIC_KEY), webhook: !!WEBHOOK_SECRET, teste: AMBIENTE_TESTE, producao: PRODUCAO_PRONTA }]);
    }
    if (req.method !== 'POST') return responder([405, { ok: false }]);
    const corpo = await req.json().catch(() => ({}));
    if (corpo.acao === 'pagar') return responder(await pagar(corpo, req));
    if (corpo.acao === 'dados' && ehId(corpo.id)) return responder(await dados(corpo.id));
    if (corpo.acao === 'situacao' && ehId(corpo.id)) return responder(await situacao(corpo.id));
    if (corpo.acao === 'link' && ehId(corpo.id)) return responder(await ehAdmin(req) ? await criarLink(corpo.id) : [401, { ok: false }]);
    if (corpo.acao === 'cancelar' && ehId(corpo.id)) return responder(await ehAdmin(req) ? await cancelarCobranca(corpo.id) : [401, { ok: false }]);
    return responder([400, { ok: false }]);
  } catch (e) {
    // Nunca o erro inteiro: ele pode conter dados do pagamento
    console.error('Falha na função de pagamento', e instanceof Error ? e.message.slice(0, 120) : 'erro');
    return responder([500, { ok: false }]);
  }
});
