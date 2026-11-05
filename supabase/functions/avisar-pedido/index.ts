// Avisa nos aparelhos da loja que chegou pedido novo, por Web Push (sem serviço pago e sem chave para configurar).
//
// O aviso vai vazio de propósito: nome, endereço e valor não passam pelos servidores do Google e da Apple.
// O aparelho mostra um texto fixo e o painel traz os detalhes.
//
// Não pede login, porque quem chama é o banco. Mesmo chamada por qualquer pessoa, ela não faz estrago:
// só avisa uma vez por pedido que existe, e o teste só chega a um aparelho já cadastrado.
const BASE = Deno.env.get('SUPABASE_URL')!;
const segredos = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const CHAVE: string = segredos.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE = 'https://paolacorpusfit.vercel.app';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};
const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Banco pela API, com a chave do servidor. A chave nova vai só no apikey; a antiga (JWT) também no Authorization.
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

const texto = (v: string) => new TextEncoder().encode(v);
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const CURVA = { name: 'ECDSA', namedCurve: 'P-256' };

// Chaves do envio: geradas aqui na primeira vez e guardadas numa tabela que só o servidor lê
async function chaves() {
  const ler = async () => (await lerLista('push_chaves?id=eq.1&select=publica,privada'))[0];
  const salvas = await ler();
  if (salvas) return salvas;
  const par = await crypto.subtle.generateKey(CURVA, true, ['sign', 'verify']) as CryptoKeyPair;
  await rest('push_chaves?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      id: 1,
      publica: b64url(await crypto.subtle.exportKey('raw', par.publicKey)),
      privada: await crypto.subtle.exportKey('jwk', par.privateKey),
    }),
  });
  // Se duas chamadas gerarem ao mesmo tempo, vale a que foi gravada primeiro
  return ler();
}

async function assinar(endpoint: string, c: { publica: string; privada: JsonWebKey }) {
  const cabecalho = b64url(texto(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = b64url(texto(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: SITE,
  })));
  const chave = await crypto.subtle.importKey('jwk', c.privada, CURVA, false, ['sign']);
  const assinatura = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, texto(`${cabecalho}.${corpo}`));
  return `vapid t=${cabecalho}.${corpo}.${b64url(assinatura)}, k=${c.publica}`;
}

async function empurrar(endpoint: string, c: { publica: string; privada: JsonWebKey }) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: await assinar(endpoint, c), TTL: '86400', Urgency: 'high' },
  });
  // 404 ou 410: o aparelho desligou o aviso ou trocou de endereço. Sai da lista
  if (r.status === 404 || r.status === 410) await rest(`push_assinaturas?endpoint=eq.${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
  return r.status;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const c = await chaves();
    if (req.method === 'GET') return responder(200, { publica: c.publica });
    if (req.method !== 'POST') return responder(405, { ok: false });
    const { id, teste } = await req.json().catch(() => ({}));

    // Botão de teste do painel: só para o aparelho que pediu
    if (typeof teste === 'string') {
      const achado = await lerLista(`push_assinaturas?endpoint=eq.${encodeURIComponent(teste)}&select=endpoint`);
      if (!achado.length) return responder(404, { ok: false });
      const status = await empurrar(teste, c);
      return responder(200, { ok: status >= 200 && status < 300, status });
    }

    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return responder(400, { ok: false });
    // Marca antes de enviar: se a mesma chamada chegar duas vezes, só a primeira avisa
    const marcado = await lerLista(`pedidos?id=eq.${id}&avisado_em=is.null&select=id`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ avisado_em: new Date().toISOString() }),
    });
    if (!marcado.length) return responder(200, { ok: true, enviados: 0 });
    const aparelhos: { endpoint: string }[] = await lerLista('push_assinaturas?select=endpoint');
    const resultados = await Promise.all(aparelhos.map((a) => empurrar(a.endpoint, c).catch(() => 0)));
    return responder(200, { ok: true, enviados: resultados.filter((s) => s >= 200 && s < 300).length, aparelhos: aparelhos.length });
  } catch (e) {
    console.error(e);
    return responder(500, { ok: false });
  }
});
