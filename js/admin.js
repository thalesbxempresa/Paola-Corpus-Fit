// =============================================================
// Paola Corpus Fit — painel da loja
// Funciona de dois jeitos: só neste navegador (sem banco) ou com o Supabase da loja (js/config.js).
// O que vem de pedido é escrito por clientes: sempre passa por esc() antes de ir para a tela.
// =============================================================
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCurto = (v) => (v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`);
const num = (v) => Number(v || 0).toLocaleString('pt-BR');
const copia = (v) => JSON.parse(JSON.stringify(v));
const lerJSON = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch (e) { return padrao; } };
const gravarJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const dataCurta = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const dataHora = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const inicioDoDia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  resumo: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  pedidos: svg('<path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-2.5 2-2.5-2-2.5 2L6 19l-1 .7V4a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6"/>'),
  produtos: svg('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.4"/>'),
  loja: svg('<path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-5h4v5"/>'),
  sair: svg('<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/>'),
  parceiras: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2a4.5 4.5 0 0 1 5 4.3"/>'),
  copiar: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  voltar: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  cima: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  baixo: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  alerta: svg('<path d="M12 4l9 16H3zM12 10v4M12 17.2v.1"/>'),
  relogio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  ok: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  caminhao: svg('<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3.5 3.5v3h-7.5"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>'),
  caixa: svg('<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5L12 12l8.5-4.5M12 12v9"/>'),
  casa: svg('<path d="M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-5.5h4V20"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  baixar: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  imprimir: svg('<path d="M7 8V3.5h10V8M7 17H4.5v-7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7H17"/><path d="M7 14h10v6.5H7z"/>'),
  sino: svg('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21a2.2 2.2 0 0 0 4 0"/>'),
  whats: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
};

// ---------------- Tabelas fixas ----------------
const STATUS = {
  novo: ['Aguardando', I.relogio],
  pago: ['Confirmado', I.ok],
  preparando: ['Preparando', I.caixa],
  enviado: ['Enviado', I.caminhao],
  entregue: ['Entregue', I.casa],
  cancelado: ['Cancelado', I.x],
};
const VENDA = new Set(['pago', 'preparando', 'enviado', 'entregue']); // Faturamento conta só o que foi pago de verdade
// Caminho do pedido: a próxima etapa é sempre um botão só
const ETAPAS = [['novo', 'Pedido recebido'], ['pago', 'Pagamento confirmado'], ['preparando', 'Preparando'], ['enviado', 'Enviado'], ['entregue', 'Entregue']];
const PROXIMA = { novo: ['pago', 'Confirmar pagamento'], pago: ['preparando', 'Começar a preparar'], preparando: ['enviado', 'Marcar como enviado'], enviado: ['entregue', 'Marcar como entregue'] };
const valorDe = (p) => Number(p.valor ?? p.total ?? 0); // O que foi cobrado de fato: com desconto do Pix ou ajustado à mão
// Pagamento pelo site: o que o Mercado Pago informou sobre o dinheiro deste pedido
const pagoOnline = (p) => !!p.mercadopago?.pago_em;
const estornado = (p) => pagoOnline(p) && p.mercadopago.status === 'refunded';
const cobrancaAberta = (p) => !pagoOnline(p) && !!p.mercadopago?.ordem_id && ['pending', 'in_process'].includes(p.mercadopago.status);
// Cancelado depois de pago pelo site e ainda sem o dinheiro devolvido
const faltaDevolver = (p) => p.status === 'cancelado' && pagoOnline(p) && p.mercadopago.status === 'approved' && !p.mercadopago.devolvido_por_fora;
// Pendência: valor que não bateu, estorno, contestação ou dinheiro a devolver.
// Enquanto existir, o pedido fica fora de preparar, de enviar e do lote de etiquetas
const precisaAtencao = (p) => !!p.conferir || faltaDevolver(p);
function seloPendencia(p) {
  const st = p.mercadopago?.status;
  if (faltaDevolver(p)) return ['Falta devolver o dinheiro', 'alerta'];
  if (estornado(p)) return p.status === 'cancelado' ? ['Dinheiro devolvido', 'info'] : ['Estornado', 'alerta'];
  if (pagoOnline(p) && st === 'charged_back') return ['Contestado no banco', 'alerta'];
  if (pagoOnline(p) && st === 'partially_refunded') return ['Devolução parcial', p.conferir ? 'alerta' : 'info'];
  if (p.conferir) return ['Conferir valor', 'alerta'];
  return null;
}
// O que a Paola precisa fazer: cada fila abre os pedidos daquela etapa
const FILTROS = {
  abertos: ['Em aberto', (p) => ['novo', 'pago', 'preparando'].includes(p.status) || precisaAtencao(p)],
  atencao: ['Atenção', precisaAtencao],
  novo: ['Aguardando', (p) => p.status === 'novo' && !precisaAtencao(p)],
  pago: ['Confirmado', (p) => p.status === 'pago' && !precisaAtencao(p)],
  preparando: ['Preparando', (p) => p.status === 'preparando' && !precisaAtencao(p)],
  enviado: ['Enviado', (p) => p.status === 'enviado'],
  semrastreio: ['Sem código', (p) => p.status === 'enviado' && !p.rastreio_codigo && !p.rastreio_link],
  entregue: ['Entregue', (p) => p.status === 'entregue'],
  cancelado: ['Cancelado', (p) => p.status === 'cancelado'],
  todos: ['Todos', () => true],
};
const FILAS_A_FAZER = new Set(['abertos', 'atencao', 'novo', 'pago', 'preparando', 'semrastreio']);
const FILAS = [
  ['atencao', 'Precisam de atenção', 'Estorno, contestação ou valor a conferir'],
  ['novo', 'Aguardando pagamento', 'A cliente ainda não pagou'],
  ['pago', 'Para preparar', 'Pagamento já confirmado'],
  ['preparando', 'Para enviar', 'Imprima a etiqueta e poste'],
  ['semrastreio', 'Enviados sem código', 'Coloque o rastreio'],
];
const CATEGORIAS = [['cintas', 'Cintas'], ['sutias', 'Sutiã'], ['tratamento', 'Tratamento']];
const FOCOS = [['barriga', 'Segura a barriga'], ['busto', 'Sustenta o busto'], ['bumbum', 'Valoriza o bumbum']];

const estado = { catalogo: null, pedidos: [], eventos: [], periodo: 30, busca: '', filtro: 'abertos', segmento: 'produtos', editor: null, avisoValores: null, cancelando: null };

// ---------------- Conta: ajudantes de criptografia ----------------
const ITERACOES = 210000;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const bytes = (s) => new TextEncoder().encode(s);
const hashEmail = async (email) => hex(await crypto.subtle.digest('SHA-256', bytes(email.trim().toLowerCase())));
async function derivarSenha(senha, salHex, iteracoes) {
  const base = await crypto.subtle.importKey('raw', bytes(senha), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(salHex.match(/../g), (h) => parseInt(h, 16));
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iteracoes }, base, 256));
}

// ---------------- Banco: sem Supabase, tudo fica neste navegador ----------------
const CONTA = 'pcf-admin-conta';
const EXTRAS = 'pcf-admin-extras';
const EXEMPLOS = 'pcf-admin-exemplos';

const Local = {
  modo: 'local',
  temConta: () => !!lerJSON(CONTA, null),
  async iniciar() {},
  async sessao() {
    try { return sessionStorage.getItem('pcf-admin-sessao') ? { email: lerJSON(CONTA, {}).email } : null; } catch (e) { return null; }
  },
  async ehAdmin() { return true; },
  async criarConta(email, senha) {
    if ((await hashEmail(email)) !== PCF_ADMIN_HASH) throw new Error('Este e-mail não é o do administrador da loja.');
    const sal = hex(crypto.getRandomValues(new Uint8Array(16)));
    gravarJSON(CONTA, { email: email.trim().toLowerCase(), sal, iteracoes: ITERACOES, hash: await derivarSenha(senha, sal, ITERACOES) });
    sessionStorage.setItem('pcf-admin-sessao', '1');
    return { entrou: true };
  },
  async entrar(email, senha) {
    const c = lerJSON(CONTA, null);
    if (!c || c.email !== email.trim().toLowerCase() || (await derivarSenha(senha, c.sal, c.iteracoes)) !== c.hash) throw new Error('E-mail ou senha incorretos.');
    sessionStorage.setItem('pcf-admin-sessao', '1');
  },
  async sair() { sessionStorage.removeItem('pcf-admin-sessao'); },
  async trocarSenha(senha) {
    const c = lerJSON(CONTA, {});
    const sal = hex(crypto.getRandomValues(new Uint8Array(16)));
    gravarJSON(CONTA, { ...c, sal, iteracoes: ITERACOES, hash: await derivarSenha(senha, sal, ITERACOES) });
  },
  async pedidos() {
    const extras = lerJSON(EXTRAS, {});
    const ex = lerJSON(EXEMPLOS, null);
    return [...lerJSON('pcf-pedidos', []), ...(ex ? ex.pedidos : [])]
      .map((p) => ({ status: 'novo', ...p, id: p.id || p.numero }))
      .filter((p) => !extras[p.id]?.excluido)
      .map((p) => ({ ...p, ...extras[p.id] }))
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  },
  async alterarPedido(id, campos) {
    const extras = lerJSON(EXTRAS, {});
    gravarJSON(EXTRAS, { ...extras, [id]: { ...extras[id], ...campos } });
  },
  async excluirPedido(id) { await this.alterarPedido(id, { excluido: true }); },
  async criarPedido(p) {
    gravarJSON('pcf-pedidos', [{ ...p, data: new Date().toISOString() }, ...lerJSON('pcf-pedidos', [])].slice(0, 50));
  },
  async pedidosRecentes() { return (await this.pedidos()).slice(0, 5); },
  async situacaoPagamento() { return { instalada: false }; },
  async criarLinkPagamento() { throw new Error('conecte o Supabase primeiro'); },
  async cancelarCobranca() { return { cancelada: false }; },
  async linkSenhaCliente() { throw new Error('conecte o Supabase primeiro'); },
  async parceiras() { throw new Error('o programa de parceiras precisa do banco conectado'); },
  async parceiraVendas() { return []; },
  async salvarParceira() { throw new Error('conecte o Supabase primeiro'); },
  async linkParceira() { throw new Error('conecte o Supabase primeiro'); },
  async pagarParceira() { throw new Error('conecte o Supabase primeiro'); },
  async desfazerPagamentoParceira() { throw new Error('conecte o Supabase primeiro'); },
  async excluirParceira() { throw new Error('conecte o Supabase primeiro'); },
  // Sem banco, o estoque fica no catálogo salvo neste navegador
  async lerEstoque() { return JSON.parse(JSON.stringify(estado.catalogo?.estoque?.itens || {})); },
  async salvarEstoque(id, tam, qtd) {
    const itens = { ...(estado.catalogo.estoque?.itens || {}) };
    const linha = { ...(itens[id] || {}) };
    if (qtd === null) delete linha[tam]; else linha[tam] = qtd;
    if (Object.keys(linha).length) itens[id] = linha; else delete itens[id];
    estado.catalogo.estoque = { itens };
    await this.salvarCatalogo(estado.catalogo);
  },
  async eventos() {
    const proprios = Object.entries(lerJSON('pcf-eventos', {})).flatMap(([dia, t]) => Object.entries(t).map(([tipo, total]) => ({ dia, tipo, total })));
    const ex = lerJSON(EXEMPLOS, null);
    return [...proprios, ...(ex ? ex.eventos : [])];
  },
  async catalogo() { return Catalogo.doc(); },
  async salvarCatalogo(doc) {
    if (!Catalogo.salvarLocal(doc)) throw new Error('Sem espaço neste navegador. Use menos fotos ou fotos menores.');
  },
  // Sem banco de fotos, a imagem fica dentro do próprio catálogo salvo no navegador
  async subirFoto(blob) {
    return new Promise((ok, erro) => {
      const leitor = new FileReader();
      leitor.onload = () => ok(leitor.result);
      leitor.onerror = () => erro(new Error('Não deu para ler a foto.'));
      leitor.readAsDataURL(blob);
    });
  },
};

// ---------------- Banco: com o Supabase da loja ----------------
const Nuvem = (() => {
  // Versão fixa e conferida: se o arquivo do CDN mudar, o navegador recusa
  const BIBLIOTECA = {
    src: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js',
    integrity: 'sha384-TcHRA3zBbn+Lexh5n+Oil4guNPOS3rjNDpGRAN46u/s/mB2IZ50ceC6TYDU2yvgK',
  };
  let sb = null;
  // Retrato do catálogo no banco quando o painel o leu. Se outro aparelho (ou outra aba) mudar algo depois,
  // o painel não grava a cópia velha por cima: avisa e recarrega
  let impressao = null;
  const TRADUCOES = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Signups not allowed for this instance': 'O cadastro de novas contas está desligado. Se você já tem conta, use Entrar.',
    'email rate limit exceeded': 'O Supabase já enviou muitos e-mails na última hora. Aguarde um pouco e tente de novo, ou veja a saída em supabase/LEIA-ME.md.',
    'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
    'User already registered': 'Esta conta já existe. Use Entrar.',
    'Email address not authorized': 'O Supabase não enviou o e-mail: o servidor padrão só envia para quem é da equipe do projeto. Veja o passo a passo em supabase/LEIA-ME.md.',
    'New password should be different from the old password.': 'A nova senha precisa ser diferente da atual.',
  };
  const checar = ({ data, error }) => {
    if (error) throw new Error(TRADUCOES[error.message] || error.message);
    return data;
  };
  const carregar = () => new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = BIBLIOTECA.src;
    s.integrity = BIBLIOTECA.integrity;
    s.crossOrigin = 'anonymous';
    s.onload = ok;
    s.onerror = () => erro(new Error('Não deu para carregar a conexão com o banco. Confira a internet.'));
    document.head.append(s);
  });
  // Sempre admin.html, mesmo aberto por /admin ou /painel: é o endereço liberado no Supabase para os links de e-mail
  const paginaAtual = () => new URL('admin.html', location.href).href;
  const linha = (x, tipo, ordem) => ({ id: x.id, tipo, preco: x.preco ?? null, ativo: x.ativo !== false, ordem, dados: x });

  return {
    modo: 'supabase',
    temConta: () => true,
    async iniciar() {
      if (sb) return;
      await carregar();
      sb = supabase.createClient(PCF_SUPABASE.url, PCF_SUPABASE.chave);
      // Volta do link de "esqueci a senha"
      sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') telaAcesso('nova-senha'); });
    },
    async sessao() { return checar(await sb.auth.getSession()).session?.user || null; },
    async ehAdmin() { return checar(await sb.rpc('eh_admin')) === true; },
    async criarConta(email, senha) {
      const d = checar(await sb.auth.signUp({ email: email.trim().toLowerCase(), password: senha, options: { emailRedirectTo: paginaAtual() } }));
      return { entrou: !!d.session };
    },
    async entrar(email, senha) { checar(await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })); },
    async cadastroAberto() {
      try {
        const r = await fetch(`${PCF_SUPABASE.url}/auth/v1/settings`, { headers: { apikey: PCF_SUPABASE.chave } });
        return !(await r.json()).disable_signup;
      } catch (e) { return false; }
    },
    async esqueci(email) { checar(await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: paginaAtual() })); },
    async sair() { await sb.auth.signOut(); },
    async trocarSenha(senha) { checar(await sb.auth.updateUser({ password: senha })); },
    async pedidos() {
      const lista = checar(await sb.from('pedidos').select('*').order('criado_em', { ascending: false }).limit(3000));
      return lista.map((p) => ({ ...p, data: p.criado_em }));
    },
    async alterarPedido(id, campos) { return checar(await sb.from('pedidos').update(campos).eq('id', id).select('*').single()); },
    async excluirPedido(id) { checar(await sb.from('pedidos').delete().eq('id', id)); },
    async criarPedido(p) { checar(await sb.from('pedidos').insert(p)); },
    // Consulta leve, para checar de tempos em tempos se chegou pedido
    async pedidosRecentes() {
      const lista = checar(await sb.from('pedidos').select('id,numero,nome,valor,total,origem,criado_em').order('criado_em', { ascending: false }).limit(5));
      return lista.map((p) => ({ ...p, data: p.criado_em }));
    },
    async salvarAviso(endpoint, aparelho) { checar(await sb.from('push_assinaturas').upsert({ endpoint, aparelho })); },
    async tirarAviso(endpoint) { checar(await sb.from('push_assinaturas').delete().eq('endpoint', endpoint)); },
    async aparelhosComAviso() { return checar(await sb.from('push_assinaturas').select('aparelho').order('criado_em')).map((a) => a.aparelho || 'Aparelho'); },
    // Estoque fica numa tabela só dele: a baixa do pedido pago acontece no banco, e salvar produto não a desfaz
    async lerEstoque() {
      return checar(await sb.from('estoque').select('item,tam,qtd')).reduce((m, l) => { (m[l.item] ||= {})[l.tam] = l.qtd; return m; }, {});
    },
    async salvarEstoque(id, tam, qtd) {
      if (qtd === null) checar(await sb.from('estoque').delete().eq('item', id).eq('tam', tam));
      else checar(await sb.from('estoque').upsert({ item: id, tam, qtd }));
    },
    // Pagamento online: a função no servidor fala com o Mercado Pago; o painel só pede e mostra
    async situacaoPagamento() {
      const r = await fetch(`${PCF_SUPABASE.url}/functions/v1/pagamento-mercadopago`).catch(() => null);
      if (!r || r.status === 404) return { instalada: false };
      // 401: a função existe, mas o Supabase ainda exige login para chamá-la
      if (r.status === 401) return { instalada: false, bloqueada: true };
      return { instalada: r.ok, ...(await r.json().catch(() => ({}))) };
    },
    async criarLinkPagamento(id) {
      // Criar link é coisa da loja: a função confere o login de quem pediu
      const { data } = await sb.auth.getSession();
      const r = await fetch(`${PCF_SUPABASE.url}/functions/v1/pagamento-mercadopago`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify({ acao: 'link', id }) });
      const d = await r.json().catch(() => ({}));
      if (d.pago) throw new Error('Este pedido já foi pago.');
      if (!r.ok || !d.url) throw new Error(d.erro || 'o Mercado Pago não respondeu');
      return d.url;
    },
    // A loja cancelou ou mudou o valor do pedido: o Pix ou cartão que estava em aberto é cancelado no Mercado Pago
    async cancelarCobranca(id) {
      const { data } = await sb.auth.getSession();
      const r = await fetch(`${PCF_SUPABASE.url}/functions/v1/pagamento-mercadopago`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify({ acao: 'cancelar', id }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || 'o Mercado Pago não respondeu');
      return d;
    },
    // A cliente esqueceu a senha da conta dela na loja: o banco devolve o código do link de senha nova
    async linkSenhaCliente(email) { return checar(await sb.rpc('cliente_link_senha', { p_email: email })); },
    // Programa de parceiras: tudo passa por funções do banco que conferem se é administrador
    async parceiras() { return checar(await sb.rpc('admin_parceiras')); },
    async parceiraVendas(id) { return checar(await sb.rpc('admin_parceira_vendas', { p_parceira: id })); },
    async salvarParceira(dados) { return checar(await sb.rpc('admin_parceira_salvar', { p: dados })); },
    async linkParceira(id) { return checar(await sb.rpc('admin_parceira_link', { p_parceira: id })); },
    async pagarParceira(id, referencia, observacao) { return checar(await sb.rpc('admin_parceira_pagar', { p_parceira: id, p_referencia: referencia, p_observacao: observacao })); },
    async desfazerPagamentoParceira(id) { return checar(await sb.rpc('admin_parceira_desfazer', { p_pagamento: id })); },
    async excluirParceira(id) { return checar(await sb.rpc('admin_parceira_excluir', { p_parceira: id })); },
    async eventos() { return checar(await sb.from('eventos_dia').select('*').limit(4000)); },
    async lerBanco() {
      const itens = checar(await sb.from('itens').select('*').order('id'));
      const cfg = checar(await sb.from('loja_config').select('dados').eq('id', 1).maybeSingle());
      return { impressao: JSON.stringify([itens, cfg?.dados ?? null]), dados: cfg?.dados || {}, temItens: itens.length > 0 };
    },
    async catalogo() {
      const doc = checar(await sb.rpc('catalogo_publico'));
      const banco = await this.lerBanco();
      if (Catalogo.valido(doc)) {
        impressao = banco.impressao;
        // O endereço de quem envia é privado: não vem no catálogo público
        return { ...doc, loja: { ...Catalogo.doc().loja, ...doc.loja }, remetente: banco.dados.remetente || {}, pagamento: banco.dados.pagamento || {} };
      }
      // Banco recém-criado: leva o catálogo atual do site na primeira entrada. Com produtos no banco, nunca grava por cima
      if (banco.temItens) throw new Error('Não deu para ler o catálogo do banco. Recarregue a página.');
      const atual = Catalogo.doc();
      impressao = null;
      await this.salvarCatalogo(atual);
      return atual;
    },
    async salvarCatalogo(doc) {
      if (impressao !== null && (await this.lerBanco()).impressao !== impressao) {
        throw new Error('o catálogo mudou em outro aparelho ou aba. A tela foi atualizada: faça a mudança de novo.');
      }
      const linhas = [
        ...doc.produtos.map((x, i) => linha(x, 'produto', i)),
        ...doc.kits.map((x, i) => linha(x, 'kit', i)),
        ...doc.praia.map((x, i) => linha(x, 'praia', i)),
      ];
      checar(await sb.from('loja_config').upsert({ id: 1, dados: { loja: doc.loja, tabela: doc.tabela, remetente: doc.remetente || {}, pagamento: doc.pagamento || {} } }));
      checar(await sb.from('itens').upsert(linhas));
      checar(await sb.from('itens').delete().not('id', 'in', `(${linhas.map((l) => l.id).join(',')})`));
      impressao = (await this.lerBanco()).impressao;
    },
    async subirFoto(blob) {
      const nome = `produtos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      checar(await sb.storage.from('imagens').upload(nome, blob, { contentType: 'image/webp', cacheControl: '31536000' }));
      return sb.storage.from('imagens').getPublicUrl(nome).data.publicUrl;
    },
  };
})();

const Banco = Catalogo.ligado ? Nuvem : Local;

// ---------------- Avisos e dica dos gráficos ----------------
let tempoToast;
function toast(msg) {
  const t = $('.toast');
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(tempoToast);
  // Aviso longo fica mais tempo na tela, para dar tempo de ler
  tempoToast = setTimeout(() => t.classList.remove('ver'), Math.max(2600, msg.length * 55));
}

let tempoDica;
function mostrarDica(valor, rotulo, x, y) {
  const d = $('#dica');
  clearTimeout(tempoDica);
  d.replaceChildren();
  const b = document.createElement('b');
  b.textContent = valor;
  const s = document.createElement('span');
  s.textContent = rotulo;
  d.append(b, s);
  d.hidden = false;
  const larg = d.offsetWidth;
  d.style.left = `${Math.max(8, Math.min(innerWidth - larg - 8, x - larg / 2))}px`;
  d.style.top = `${Math.max(8, y - d.offsetHeight - 14)}px`;
}
const esconderDica = (atraso = 0) => {
  clearTimeout(tempoDica);
  tempoDica = setTimeout(() => { $('#dica').hidden = true; }, atraso);
};

// Linhas de barra: o valor está sempre escrito; a dica só acrescenta o detalhe
document.addEventListener('pointerover', (e) => {
  const alvo = e.target.closest('[data-dica-v]');
  if (alvo) mostrarDica(alvo.dataset.dicaV, alvo.dataset.dicaR, e.clientX, alvo.getBoundingClientRect().top);
});
document.addEventListener('pointerout', (e) => {
  if (e.target.closest('[data-dica-v]')) esconderDica(e.pointerType === 'touch' ? 1800 : 0);
});
document.addEventListener('focusin', (e) => {
  const alvo = e.target.closest('[data-dica-v]');
  if (!alvo) return;
  const r = alvo.getBoundingClientRect();
  mostrarDica(alvo.dataset.dicaV, alvo.dataset.dicaR, r.left + r.width / 2, r.top);
});
document.addEventListener('focusout', (e) => { if (e.target.closest('[data-dica-v]')) esconderDica(); });

// ---------------- Entrar e criar conta ----------------
const campoSenha = (nome, rotulo, auto) => `<div class="campo"><label for="ac-${nome}">${rotulo}</label>
  <div class="pn-senha"><input id="ac-${nome}" name="${nome}" type="password" autocomplete="${auto}" minlength="8" required><button type="button" data-ver-senha>Mostrar</button></div></div>`;

function telaAcesso(modo, aviso = '') {
  const local = Banco.modo === 'local';
  const TEXTOS = {
    criar: ['Criar a conta de administrador', 'A senha é você quem escolhe agora, com pelo menos 8 caracteres.', 'Criar conta'],
    entrar: ['Entrar no painel', 'Métricas, pedidos e produtos da loja.', 'Entrar'],
    'nova-senha': ['Escolher nova senha', 'Depois disso você já entra no painel.', 'Salvar nova senha'],
  };
  const [titulo, sub, botao] = TEXTOS[modo];
  $('#painel').innerHTML = `
    <main class="pn-acesso">
      <form class="pn-acesso-caixa" id="form-acesso" novalidate>
        <span class="logo"><b>Paola</b><small>Corpus Fit</small></span>
        <h1>${titulo}</h1>
        <p>${sub}</p>
        ${aviso ? `<p class="pn-ok-msg">${esc(aviso)}</p>` : ''}
        ${modo === 'nova-senha' ? '' : '<div class="campo"><label for="ac-email">E-mail</label><input id="ac-email" name="email" type="email" inputmode="email" autocomplete="username" required></div>'}
        ${modo === 'entrar' ? campoSenha('senha', 'Senha', 'current-password') : campoSenha('senha', modo === 'criar' ? 'Escolha uma senha' : 'Nova senha', 'new-password')}
        ${modo === 'entrar' ? '' : campoSenha('repete', 'Repita a senha', 'new-password')}
        <p class="dica-tam erro" data-erro hidden></p>
        <button class="btn btn-preto btn-bloco" type="submit">${botao}</button>
        ${modo === 'entrar' ? '<button class="pn-link" type="button" data-esqueci>Esqueci a senha</button>' : ''}
        ${!local && modo === 'entrar' ? '<button class="btn btn-claro btn-bloco" type="button" data-ir="criar" hidden>Primeiro acesso? Criar conta</button>' : ''}
        ${!local && modo === 'criar' ? '<button class="pn-link" type="button" data-ir="entrar">Já tenho conta</button>' : ''}
        ${local && modo === 'criar' ? '<p class="pn-nota">Sem o banco conectado, a conta vale só neste navegador e a senha fica guardada aqui de forma embaralhada, nunca em texto. A proteção de verdade entra com o Supabase.</p>' : ''}
        ${modo === 'nova-senha' || instalado() ? '' : `<button class="btn btn-claro btn-bloco pn-acesso-instalar" type="button" data-instalar>${I.baixar}Baixar o painel como app</button>`}
      </form>
    </main>`;
  const form = $('#form-acesso');
  const erro = $('[data-erro]', form);
  const falhar = (msg, campo) => { erro.hidden = false; erro.textContent = msg; campo?.focus(); };
  (form.email || form.senha).focus();
  // Com o cadastro desligado no Supabase, a opção de criar conta nem aparece
  if (!local && modo === 'entrar') Banco.cadastroAberto().then((aberto) => { const b = $('[data-ir="criar"]', form); if (b) b.hidden = !aberto; });

  $$('[data-ver-senha]', form).forEach((b) => b.addEventListener('click', () => {
    const input = $('input', b.parentElement);
    input.type = input.type === 'password' ? 'text' : 'password';
    b.textContent = input.type === 'password' ? 'Mostrar' : 'Ocultar';
  }));
  $$('[data-ir]', form).forEach((b) => b.addEventListener('click', () => {
    const digitado = form.email.value;
    telaAcesso(b.dataset.ir);
    $('#form-acesso').email.value = digitado;
  }));
  $('[data-esqueci]', form)?.addEventListener('click', async () => {
    if (local) {
      if (!confirm('Sem o banco conectado não há como recuperar a senha. Apagar a conta deste navegador e criar outra? Produtos e pedidos salvos aqui continuam.')) return;
      localStorage.removeItem(CONTA);
      telaAcesso('criar');
      return;
    }
    if (!form.email.value.trim()) return falhar('Escreva seu e-mail para receber o link.', form.email);
    try {
      await Banco.esqueci(form.email.value);
      telaAcesso('entrar', 'Se este e-mail tiver conta, o link para trocar a senha chega em instantes.');
    } catch (e) { falhar(e.message); }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const email = form.email?.value.trim() || '';
    const senha = form.senha.value;
    if (form.email && !/^\S+@\S+\.\S+$/.test(email)) return falhar('Escreva um e-mail válido.', form.email);
    if (senha.length < 8 && modo !== 'entrar') return falhar('A senha precisa ter pelo menos 8 caracteres.', form.senha);
    if (form.repete && senha !== form.repete.value) return falhar('As duas senhas estão diferentes.', form.repete);
    const botaoEl = $('button[type=submit]', form);
    botaoEl.disabled = true;
    try {
      if (modo === 'criar') {
        const { entrou } = await Banco.criarConta(email, senha);
        if (!entrou) return telaAcesso('entrar', 'Conta criada. Enviamos um link para o seu e-mail: confirme e volte aqui para entrar.');
      } else if (modo === 'entrar') {
        await Banco.entrar(email, senha);
      } else {
        await Banco.trocarSenha(senha);
      }
      await abrirPainel();
    } catch (ex) {
      botaoEl.disabled = false;
      falhar(ex.message);
    }
  });
}

// ---------------- Estrutura do painel ----------------
const ABAS = {
  resumo: { nome: 'Início', ico: I.resumo, abrir: abaResumo },
  pedidos: { nome: 'Pedidos', ico: I.pedidos, abrir: abaPedidos },
  produtos: { nome: 'Produtos', ico: I.produtos, abrir: abaProdutos },
  parceiras: { nome: 'Parceiras', ico: I.parceiras, abrir: abaParceiras },
  loja: { nome: 'Loja', ico: I.loja, abrir: abaLoja },
};

function montarPainel() {
  $('#painel').innerHTML = `
    <div class="pn-app">
      <header class="pn-topo">
        <span class="logo"><b>Paola</b><small>Corpus Fit</small></span>
        <div class="pn-topo-dir"><a class="pn-link" href="index.html" target="_blank" rel="noopener">Ver a loja</a>${instalado() ? '' : `<button class="pn-ico" type="button" data-instalar aria-label="Baixar o painel como app">${I.baixar}</button>`}<button class="pn-ico" type="button" data-sair aria-label="Sair">${I.sair}</button></div>
      </header>
      <nav class="pn-nav" aria-label="Seções do painel">
        <span class="logo pn-nav-logo"><b>Paola</b><small>Corpus Fit</small></span>
        ${Object.entries(ABAS).map(([id, a]) => `<a href="#${id}">${a.ico}<span>${a.nome}</span></a>`).join('')}
        <div class="pn-nav-pe">${instalado() ? '' : `<button type="button" data-instalar>${I.baixar}Baixar como app</button>`}<a href="index.html" target="_blank" rel="noopener">Ver a loja</a><button type="button" data-sair>${I.sair}Sair</button></div>
      </nav>
      <main class="pn-main">
        ${Banco.modo === 'local' ? '<p class="pn-modo"><b>Modo neste navegador.</b> Só você vê estas alterações. As clientes continuam vendo os dados atuais do site até o Supabase ser conectado. <a href="#loja">Como conectar</a></p>' : ''}
        <div class="pn-faixa" id="faixa-pedido" role="status" aria-live="polite" hidden></div>
        ${faixaInstalar()}
        <div id="aba"></div>
      </main>
    </div>`;
  $$('[data-sair]').forEach((b) => b.addEventListener('click', async () => {
    marcarAdminNaLoja(false);
    await Banco.sair();
    location.hash = '';
    telaAcesso('entrar');
  }));
  // Evita perder o que foi digitado no produto ao trocar de aba
  $('.pn-nav').addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link && estado.editor?.sujo && !confirm('Sair sem salvar as alterações deste produto?')) { e.preventDefault(); return; }
    if (link && link.getAttribute('href') === '#parceiras' && location.hash === '#parceiras') { estado.parceiraAberta = null; abrirAba(); }
  });
  abrirAba();
  iniciarVigiaDePedidos();
  manterAviso().catch(() => {});
}

function abrirAba() {
  if (!$('#aba')) return;
  const pedido = location.hash.slice(1);
  const id = ABAS[pedido] ? pedido : 'resumo';
  if (id !== 'parceiras') estado.parceiraAberta = null;
  estado.editor = null;
  estado.novoAberto = false;
  $$('.pn-nav a[href^="#"]').forEach((a) => {
    if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  scrollTo(0, 0);
  esconderDica();
  const alvo = $('#aba');
  Promise.resolve(ABAS[id].abrir(alvo)).catch((e) => {
    alvo.innerHTML = `<section class="pn-card"><h2>Não deu para carregar</h2><p class="pn-texto">${esc(e.message)}</p><button class="btn btn-claro" type="button" data-de-novo>Tentar de novo</button></section>`;
    $('[data-de-novo]', alvo).addEventListener('click', abrirAba);
  });
}
addEventListener('hashchange', () => {
  if (location.hash === '#pedidos') limparFaixaPedido();
  abrirAba();
});

async function abrirPainel() {
  const usuario = await Banco.sessao();
  if (!usuario) return telaAcesso(Banco.temConta() ? 'entrar' : 'criar');
  if (!(await Banco.ehAdmin())) {
    marcarAdminNaLoja(false);
    await Banco.sair();
    return telaAcesso('entrar', 'Esta conta não é de administrador da loja.');
  }
  marcarAdminNaLoja(true);
  estado.catalogo = await Banco.catalogo();
  estado.estoque = await Banco.lerEstoque().catch(() => ({}));
  montarPainel();
  // Quem abre direto em Produtos ou Loja também vê quantos pedidos estão esperando
  if (['produtos', 'loja'].includes(location.hash.slice(1))) carregarDados().catch(() => {});
}

let ultimaCarga = 0;
let pedidoMaisNovo = 0; // Data do pedido mais recente já visto, para perceber quando chega outro
const carregarDados = async () => {
  [estado.pedidos, estado.eventos] = await Promise.all([Banco.pedidos(), Banco.eventos()]);
  ultimaCarga = Date.now();
  estado.pedidos.forEach((p) => { pedidoMaisNovo = Math.max(pedidoMaisNovo, new Date(p.data).getTime()); });
  atualizarSelo();
};
// Número ao lado de Pedidos: quantos estão esperando alguma ação
function atualizarSelo() {
  const link = $('.pn-nav a[href="#pedidos"]');
  if (!link) return;
  const n = estado.pedidos.filter(FILTROS.abertos[1]).length;
  let selo = $('.pn-selo', link);
  if (!n) { selo?.remove(); return; }
  if (!selo) {
    selo = document.createElement('em');
    selo.className = 'pn-selo';
    link.append(selo);
  }
  selo.textContent = n;
}
// Redesenha a tela com os pedidos novos, sem atrapalhar quem está mexendo em algo
function atualizarTelaSeLivre() {
  if (estado.editor || estado.novoAberto || estado.enviando || $('.pn-ped[open]') || document.activeElement?.matches('input, textarea, select')) return;
  if (['', 'resumo', 'pedidos'].includes(location.hash.slice(1))) abrirAba();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !$('#aba')) return;
  checarPedidosNovos();
  if (Date.now() - ultimaCarga >= 60000) atualizarTelaSeLivre();
});

// ---------------- Aviso de pedido novo ----------------
// Com o painel aberto: faixa na tela, som e número no título. Com o painel fechado: notificação no aparelho.
let novosAvisados = [];
let checando = false;
let vigia = null;
let somAviso = null;
const TITULO_PAINEL = document.title;

function limparFaixaPedido() {
  novosAvisados = [];
  const faixa = $('#faixa-pedido');
  if (faixa) faixa.hidden = true;
  document.title = TITULO_PAINEL;
}
function mostrarFaixaPedido(novos) {
  const faixa = $('#faixa-pedido');
  if (!faixa) return;
  novosAvisados = [...novos, ...novosAvisados];
  const n = novosAvisados.length;
  const [p] = novosAvisados;
  faixa.hidden = false;
  faixa.innerHTML = `${I.sino}<span>${n === 1 ? `<b>Chegou pedido novo:</b> ${esc(p.numero)} · ${esc(primeiroNome(p))} · ${brl(valorDe(p))}` : `<b>Chegaram ${n} pedidos novos</b>`}</span>
    <button class="btn pn-btn-p" type="button" data-ver-novo>${n === 1 ? 'Ver pedido' : 'Ver pedidos'}</button>
    <button class="pn-ico" type="button" data-fechar-faixa aria-label="Fechar aviso">${I.x}</button>`;
  document.title = `(${n}) Pedido novo | ${TITULO_PAINEL}`;
  $('[data-fechar-faixa]', faixa).addEventListener('click', limparFaixaPedido);
  $('[data-ver-novo]', faixa).addEventListener('click', () => {
    if (estado.editor?.sujo && !confirm('Sair sem salvar as alterações deste produto?')) return;
    estado.abrirPedido = n === 1 ? p.id : null;
    estado.filtro = 'abertos';
    estado.busca = '';
    limparFaixaPedido();
    if (location.hash === '#pedidos') abrirAba(); else location.hash = 'pedidos';
  });
}
// Dois toques curtos, gerados aqui mesmo. O navegador só libera som depois do primeiro clique na página
function tocarAviso() {
  try {
    if (!somAviso || somAviso.state !== 'running') return;
    [[880, 0], [1175, 0.2]].forEach(([freq, quando]) => {
      const nota = somAviso.createOscillator();
      const volume = somAviso.createGain();
      const t = somAviso.currentTime + quando;
      nota.frequency.value = freq;
      volume.gain.setValueAtTime(0.0001, t);
      volume.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      nota.connect(volume).connect(somAviso.destination);
      nota.start(t);
      nota.stop(t + 0.36);
    });
  } catch (e) { /* sem som: a faixa e o título continuam avisando */ }
}
addEventListener('pointerdown', () => {
  try {
    const Som = window.AudioContext || window.webkitAudioContext;
    somAviso = somAviso || new Som();
    somAviso.resume();
  } catch (e) { /* navegador sem som */ }
}, { passive: true });

async function checarPedidosNovos() {
  if (checando || !$('#aba') || !ultimaCarga) return;
  checando = true;
  try {
    const novos = (await Banco.pedidosRecentes()).filter((p) => new Date(p.data).getTime() > pedidoMaisNovo);
    if (!novos.length) return;
    await carregarDados();
    // Venda registrada à mão foi a própria loja que fez: não precisa de aviso
    const doSite = novos.filter((p) => p.origem !== 'manual');
    if (!doSite.length) return;
    mostrarFaixaPedido(doSite);
    tocarAviso();
    atualizarTelaSeLivre();
  } catch (e) { /* sem internet ou sessão encerrada: tenta de novo na próxima */ } finally {
    checando = false;
  }
}
function iniciarVigiaDePedidos() {
  if (vigia) return;
  vigia = setInterval(checarPedidosNovos, 45000);
  navigator.serviceWorker?.addEventListener('message', (e) => {
    if (e.data?.tipo === 'pedido-novo') checarPedidosNovos();
    if (e.data?.tipo === 'abrir-pedidos' && !estado.editor?.sujo) { limparFaixaPedido(); location.hash = 'pedidos'; }
  });
}

// Notificação no aparelho. Cada aparelho liga uma vez e o endereço dele fica no banco
const funcaoAviso = () => `${PCF_SUPABASE.url}/functions/v1/avisar-pedido`;
const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const recebeAviso = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const nomeDoAparelho = () => (ehIphone() ? 'iPhone' : /android/i.test(navigator.userAgent) ? 'Android' : 'Computador');
const chaveEmBytes = (t) => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(t.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

// ---------------- Baixar o painel como app ----------------
// Android e computador (Chrome, Edge): o navegador oferece instalar. iPhone: só pelo Compartilhar > Adicionar à Tela de Início.
// Instalado, o painel ganha ícone próprio e abre direto nos pedidos, sem a barra do navegador (painel.webmanifest)
let pedidoInstalar = null;
const ehCelular = () => ehIphone() || /android/i.test(navigator.userAgent);
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pedidoInstalar = e;
  $$('[data-instalar-agora]').forEach((b) => { b.hidden = false; });
});
addEventListener('appinstalled', () => {
  pedidoInstalar = null;
  $('.pn-dialogo')?.close();
  $$('[data-instalar], .pn-instalar-faixa').forEach((el) => el.remove());
  toast('Painel instalado. Abra pelo ícone Painel Paola.');
});
// O navegador só deixa pedir a instalação uma vez por aviso
async function instalarAgora() {
  const p = pedidoInstalar;
  pedidoInstalar = null;
  await p.prompt();
  return (await p.userChoice.catch(() => null))?.outcome === 'accepted';
}
function comoInstalar() {
  const android = /android/i.test(navigator.userAgent);
  const passos = ehIphone()
    ? [
      'Abra este painel no Safari (no Chrome do iPhone também funciona).',
      'Toque em Compartilhar, o quadrado com a seta para cima. No Safari fica na barra de baixo; no Chrome, no alto da tela.',
      'Role a lista e toque em <b>Adicionar à Tela de Início</b>.',
      'Toque em <b>Adicionar</b>. O ícone Painel Paola aparece junto com os seus apps.',
    ]
    : android
      ? [
        'Abra este painel no Chrome.',
        'Toque nos três pontinhos, no alto à direita.',
        'Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>) e confirme.',
        'O ícone Painel Paola aparece junto com os seus apps.',
      ]
      : [
        'No Chrome ou no Edge, clique no ícone de instalar, no canto direito da barra de endereço.',
        'Se não aparecer, abra o menu de três pontinhos e procure <b>Instalar</b> (no Chrome, em Transmitir, salvar e compartilhar).',
        'Para o celular, abra paolacorpusfit.com.br/admin nele e toque em Baixar o painel como app.',
      ];
  $('.pn-dialogo')?.close();
  const d = document.createElement('dialog');
  d.className = 'pn-dialogo';
  d.innerHTML = `<div class="pn-dialogo-topo"><h2>Baixar o painel como app</h2><button class="pn-ico" type="button" data-fechar-dialogo aria-label="Fechar">${I.x}</button></div>
    <p class="pn-texto">Fica um ícone no celular, como um app: abre direto nos pedidos, sem a barra do navegador.</p>
    <button class="btn btn-preto btn-bloco" type="button" data-instalar-agora ${pedidoInstalar ? '' : 'hidden'}>${I.baixar}Instalar agora</button>
    <ol class="pn-passos">${passos.map((p) => `<li>${p}</li>`).join('')}</ol>
    <p class="pn-nota">Depois, abra pelo ícone e entre uma vez com o seu e-mail e senha. Lá dentro, em Início, ligue o aviso de pedido novo.</p>`;
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  $('[data-fechar-dialogo]', d).addEventListener('click', () => d.close());
  $('[data-instalar-agora]', d).addEventListener('click', async (e) => {
    e.currentTarget.hidden = true;
    if (pedidoInstalar && (await instalarAgora())) d.close();
  });
  d.showModal();
}
// Com o aviso do navegador pronto (Android, computador), instala direto; sem ele, mostra o passo a passo
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-dispensar-instalar]')) {
    try { localStorage.setItem('pcf-painel-sem-app', '1'); } catch (ex) { /* ok */ }
    $('.pn-instalar-faixa')?.remove();
    return;
  }
  if (!e.target.closest('[data-instalar]')) return;
  if (pedidoInstalar) instalarAgora().catch(comoInstalar);
  else comoInstalar();
});
const faixaInstalar = () => {
  let dispensou = false;
  try { dispensou = localStorage.getItem('pcf-painel-sem-app') === '1'; } catch (e) { /* ok */ }
  return instalado() || dispensou || !ehCelular() ? '' : `<div class="pn-instalar-faixa">${I.baixar}<span><b>Use o painel como app</b>Ícone no celular, abre direto nos pedidos.</span><button class="btn btn-preto" type="button" data-instalar>Baixar</button><button class="pn-ico" type="button" data-dispensar-instalar aria-label="Agora não">${I.x}</button></div>`;
};
// Marca neste aparelho que é da administração: a loja mostra o atalho do painel (js/app.js, ehAdminLoja)
const marcarAdminNaLoja = (sim) => { try { if (sim) localStorage.setItem('pcf-painel', '1'); else localStorage.removeItem('pcf-painel'); } catch (e) { /* ok */ } };

async function assinaturaAtual() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}
async function situacaoAviso() {
  if (Banco.modo === 'local') return 'indisponivel';
  if (!recebeAviso()) return ehIphone() && !instalado() ? 'iphone' : 'indisponivel';
  if (Notification.permission === 'denied') return 'bloqueado';
  return Notification.permission === 'granted' && (await assinaturaAtual()) ? 'ligado' : 'desligado';
}
async function testarAviso() {
  const s = await assinaturaAtual();
  const r = await fetch(funcaoAviso(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teste: s.endpoint }) });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error('o teste não saiu');
}
async function ligarAvisos() {
  const permissao = await Notification.requestPermission();
  if (permissao === 'denied') throw new Error('Os avisos foram bloqueados neste navegador.');
  if (permissao !== 'granted') throw new Error('Os avisos ficaram desligados.');
  const r = await fetch(funcaoAviso());
  if (!r.ok) throw new Error('Não deu para ligar os avisos agora. Tente de novo.');
  const { publica } = await r.json();
  await navigator.serviceWorker.register('aviso-sw.js', { scope: './admin' });
  const reg = await navigator.serviceWorker.ready;
  const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(publica) });
  await Banco.salvarAviso(s.endpoint, nomeDoAparelho());
}
async function desligarAvisos() {
  const s = await assinaturaAtual();
  if (!s) return;
  await Banco.tirarAviso(s.endpoint);
  await s.unsubscribe();
}
// O endereço do aparelho pode mudar sem aviso: a cada abertura do painel, confirma o atual no banco
async function manterAviso() {
  if (Banco.modo === 'local' || !recebeAviso() || Notification.permission !== 'granted') return;
  const s = await assinaturaAtual();
  if (s) await Banco.salvarAviso(s.endpoint, nomeDoAparelho());
}

const TEXTO_AVISO = {
  desligado: 'O aparelho avisa na hora que chega pedido, mesmo com o painel fechado.',
  iphone: 'No iPhone, o aviso só funciona com o painel na tela de início. Toque em Compartilhar, depois em Adicionar à Tela de Início, e abra o painel pelo ícone novo.',
  bloqueado: 'Os avisos estão bloqueados neste navegador. Libere as notificações deste site nas configurações do navegador e volte aqui.',
  indisponivel: 'Este navegador não recebe avisos. Abra o painel no Chrome ou, no iPhone, pela tela de início.',
  ligado: 'Ligado neste aparelho. Ele avisa na hora que chega pedido, mesmo com o painel fechado.',
};
// Mesmo cartão no Início (some quando já está ligado ou se ela dispensar) e na aba Loja (sempre visível)
async function desenharAviso(caixa, noInicio = false) {
  if (!caixa) return;
  const s = await situacaoAviso();
  if (!caixa.isConnected) return;
  if (noInicio && (s === 'ligado' || s === 'indisponivel' || lerJSON('pcf-aviso-dispensado', false))) {
    caixa.innerHTML = '';
    return;
  }
  const aparelhos = noInicio ? [] : await Banco.aparelhosComAviso().catch(() => []);
  if (!caixa.isConnected) return;
  caixa.innerHTML = `<div class="pn-aviso">${I.sino}<div>
      <b>${noInicio ? 'Receba um aviso quando chegar pedido' : 'Aviso de pedido novo'}</b>
      <p>${TEXTO_AVISO[s]}</p>
      ${aparelhos.length ? `<p class="pn-aviso-lista">Recebem aviso: ${esc(aparelhos.join(', '))}</p>` : ''}
      <div class="pn-acoes">
        ${s === 'desligado' ? '<button class="btn btn-preto pn-btn-p" type="button" data-ligar-aviso>Ligar avisos neste aparelho</button>' : ''}
        ${s === 'ligado' ? '<button class="btn btn-claro pn-btn-p" type="button" data-testar-aviso>Enviar aviso de teste</button><button class="pn-link pn-perigo" type="button" data-desligar-aviso>Desligar neste aparelho</button>' : ''}
        ${noInicio ? '<button class="pn-link" type="button" data-dispensar-aviso>Agora não</button>' : ''}
      </div>
    </div></div>`;
  const redesenhar = () => desenharAviso(caixa, noInicio);
  const testar = async () => {
    try {
      await testarAviso();
      toast('Aviso de teste enviado. Nenhum pedido foi criado.');
    } catch (e) { toast('Não deu para enviar o aviso de teste. Tente de novo.'); }
  };
  $('[data-ligar-aviso]', caixa)?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await ligarAvisos();
      await testar();
    } catch (ex) {
      console.error(ex);
      toast(/avisos/i.test(ex.message) ? ex.message : 'Não deu para ligar os avisos agora. Tente de novo.');
    }
    redesenhar();
  });
  $('[data-testar-aviso]', caixa)?.addEventListener('click', testar);
  $('[data-desligar-aviso]', caixa)?.addEventListener('click', async () => {
    try {
      await desligarAvisos();
      toast('Avisos desligados neste aparelho');
    } catch (ex) { toast('Não deu para desligar agora. Tente de novo.'); }
    redesenhar();
  });
  $('[data-dispensar-aviso]', caixa)?.addEventListener('click', () => {
    gravarJSON('pcf-aviso-dispensado', true);
    caixa.innerHTML = '';
    toast('Você pode ligar depois, na aba Loja');
  });
}
const temExemplos = () => Banco.modo === 'local' && !!lerJSON(EXEMPLOS, null);
const avisoExemplos = () => (temExemplos() ? `<p class="pn-exemplo">${I.alerta}<span><b>Dados de exemplo ligados.</b> Estes números são fictícios, só para visualizar o painel.</span><button class="pn-link" type="button" data-tirar-exemplos>Remover</button></p>` : '');
function ligarExemplos(alvo) {
  $('[data-tirar-exemplos]', alvo)?.addEventListener('click', () => {
    const extras = lerJSON(EXTRAS, {});
    gravarJSON(EXTRAS, Object.fromEntries(Object.entries(extras).filter(([id]) => !id.startsWith('ex-'))));
    localStorage.removeItem(EXEMPLOS);
    abrirAba();
  });
  $('[data-por-exemplos]', alvo)?.addEventListener('click', () => {
    gravarJSON(EXEMPLOS, gerarExemplos(estado.catalogo));
    location.hash = 'resumo';
    abrirAba();
  });
}

// Pedidos fictícios para ver o painel preenchido: sempre marcados e só no modo local
function gerarExemplos(doc) {
  let s = 4242;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const sorteia = (pesos) => { let x = r() * pesos.reduce((t, [, p]) => t + p, 0); return pesos.find(([, p]) => (x -= p) <= 0)[0]; };
  const CIDADES = [[['Rio de Janeiro', 'RJ'], 34], [['Niterói', 'RJ'], 10], [['São Paulo', 'SP'], 22], [['Belo Horizonte', 'MG'], 12], [['Salvador', 'BA'], 8], [['Curitiba', 'PR'], 6], [['Recife', 'PE'], 5], [['Brasília', 'DF'], 3]];
  const VENDIDOS = [['combo-5', 50], ['combo-duplo', 24], ['cinta-ziper-30', 16], ['cinta-ziper-20', 10]];
  const CALCAS = [[38, 8], [40, 14], [42, 22], [44, 22], [46, 16], [48, 10], [50, 6], [52, 2]];
  const todos = [...doc.kits, ...doc.produtos];
  const faixa = (c) => doc.tabela.find((x) => x.calca.includes(c))?.t;
  const pedidos = [];
  const eventos = [];
  for (let idade = 89; idade >= 0; idade--) {
    const dia = new Date();
    dia.setDate(dia.getDate() - idade);
    const qtd = r() < 0.4 ? 0 : r() < 0.68 ? 1 : r() < 0.9 ? 2 : 3;
    for (let n = 0; n < qtd; n++) {
      const idItem = sorteia(VENDIDOS);
      const it = todos.find((x) => x.id === idItem);
      const calca = sorteia(CALCAS);
      const [cidade, uf] = sorteia(CIDADES);
      const quando = new Date(dia);
      quando.setHours(9 + Math.floor(r() * 12), Math.floor(r() * 60));
      if (quando > new Date()) quando.setTime(Date.now() - 3600000);
      const status = r() < 0.12 ? 'cancelado'
        : idade < 2 ? sorteia([['novo', 70], ['pago', 30]])
          : idade < 6 ? sorteia([['novo', 15], ['pago', 45], ['enviado', 40]])
            : idade < 14 ? sorteia([['enviado', 60], ['entregue', 40]]) : 'entregue';
      pedidos.push({
        id: `ex-${pedidos.length + 1}`,
        numero: `EXEMPLO-${String(pedidos.length + 1).padStart(3, '0')}`,
        exemplo: true,
        data: quando.toISOString(),
        status,
        nome: `Cliente de exemplo ${pedidos.length + 1}`,
        cep: '00000-000', rua: 'Rua de exemplo', num: '100', complemento: '', bairro: 'Centro', cidade, uf,
        pagamento: r() < 0.64 ? 'Pix' : 'Cartão',
        itens: [{ id: it.id, nome: it.nome, calca, tam: faixa(calca), extra: null, qtd: 1, preco: it.preco }],
        total: it.preco,
      });
    }
    const chave = dia.toLocaleDateString('en-CA');
    const checkout = qtd + Math.floor(r() * 4);
    const sacola = checkout + Math.floor(r() * 7);
    eventos.push({ dia: chave, tipo: 'checkout', total: checkout }, { dia: chave, tipo: 'sacola', total: sacola }, { dia: chave, tipo: 'visita', total: sacola + 18 + Math.floor(r() * 46) });
  }
  return { pedidos, eventos };
}

// ---------------- Gráfico de colunas (SVG sem biblioteca) ----------------
function tetoRedondo(v) {
  if (v <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(v));
  return [1, 1.5, 2, 3, 4, 5, 6, 8, 10].find((n) => v / base <= n) * base;
}

function desenharColunas(el, pontos, { fmt = num, fmtEixo = fmt, todos = false, altura = 200, descricao = '' } = {}) {
  const L = Math.max(240, el.clientWidth || 320);
  const esq = todos ? 2 : 52;
  const topo = 22;
  const base = 24;
  const alt = altura - topo - base;
  const y0 = topo + alt;
  const maior = Math.max(0, ...pontos.map((p) => p.valor));
  const teto = tetoRedondo(maior);
  const faixa = (L - esq - 2) / pontos.length;
  const w = Math.min(24, Math.max(2, faixa - 2));
  const X = (i) => esq + faixa * i + (faixa - w) / 2;
  const Y = (v) => y0 - (v / teto) * alt;
  const f1 = (v) => Math.round(v * 10) / 10;

  const grade = [0, 0.5, 1].map((k) => `<line class="pn-grade" x1="${esq}" x2="${L - 2}" y1="${f1(Y(teto * k))}" y2="${f1(Y(teto * k))}"/>
    ${todos ? '' : `<text class="pn-eixo" x="${esq - 8}" y="${f1(Y(teto * k) + 4)}" text-anchor="end">${esc(fmtEixo(teto * k))}</text>`}`).join('');
  const colunas = pontos.map((p, i) => {
    if (!p.valor) return '';
    const x = f1(X(i));
    const y = f1(Y(p.valor));
    const r = Math.min(4, w / 2, y0 - y);
    return `<path class="pn-col" data-i="${i}" d="M${x} ${y0}V${f1(y + r)}Q${x} ${y} ${f1(x + r)} ${y}H${f1(x + w - r)}Q${f1(x + w)} ${y} ${f1(x + w)} ${f1(y + r)}V${y0}Z"/>`;
  }).join('');
  const meio = (i) => f1(X(i) + w / 2);
  const indices = todos ? pontos.map((_, i) => i) : [...new Set([0, Math.floor((pontos.length - 1) / 2), pontos.length - 1])];
  const rotulos = indices.map((i) => {
    const ancora = todos || (i !== 0 && i !== pontos.length - 1) ? 'middle' : i === 0 ? 'start' : 'end';
    const x = ancora === 'start' ? f1(X(i)) : ancora === 'end' ? f1(X(i) + w) : meio(i);
    return `<text class="pn-eixo" x="${x}" y="${altura - 6}" text-anchor="${ancora}">${esc(pontos[i].rotulo)}</text>`;
  }).join('');
  // Rótulo só onde importa: todas as colunas quando são poucas, o pico quando são muitas
  const marcados = todos ? pontos.map((_, i) => i) : maior > 0 ? [pontos.findIndex((p) => p.valor === maior)] : [];
  const valores = marcados.filter((i) => pontos[i].valor > 0).map((i) => {
    const x = Math.max(esq + 24, Math.min(L - 26, meio(i)));
    return `<text class="pn-valor" x="${f1(x)}" y="${f1(Y(pontos[i].valor) - 6)}" text-anchor="middle">${esc(todos ? fmt(pontos[i].valor) : fmtEixo(pontos[i].valor))}</text>`;
  }).join('');

  el.innerHTML = `<svg class="pn-grafico" width="${L}" height="${altura}" viewBox="0 0 ${L} ${altura}" role="img" aria-label="${esc(descricao)}" tabindex="0">${grade}${colunas}${valores}${rotulos}</svg>`;

  const grafico = $('svg', el);
  let atual = -1;
  const marcar = (i) => {
    atual = i;
    $$('.pn-col', grafico).forEach((c) => c.classList.toggle('ativa', Number(c.dataset.i) === i));
  };
  const posicao = (ev) => Math.max(0, Math.min(pontos.length - 1, Math.floor((ev.clientX - grafico.getBoundingClientRect().left - esq) / faixa)));
  grafico.addEventListener('pointermove', (ev) => {
    const i = posicao(ev);
    marcar(i);
    mostrarDica(fmt(pontos[i].valor), pontos[i].dica || pontos[i].rotulo, ev.clientX, grafico.getBoundingClientRect().top + Y(pontos[i].valor));
  });
  grafico.addEventListener('pointerdown', (ev) => {
    const i = posicao(ev);
    marcar(i);
    mostrarDica(fmt(pontos[i].valor), pontos[i].dica || pontos[i].rotulo, ev.clientX, grafico.getBoundingClientRect().top + Y(pontos[i].valor));
  });
  grafico.addEventListener('pointerleave', (ev) => { marcar(-1); esconderDica(ev.pointerType === 'touch' ? 1800 : 0); });
  // Teclado: as setas fazem o mesmo que o mouse
  const peloTeclado = (i) => {
    marcar(i);
    const r = grafico.getBoundingClientRect();
    mostrarDica(fmt(pontos[i].valor), pontos[i].dica || pontos[i].rotulo, r.left + X(i) + w / 2, r.top + Y(pontos[i].valor));
  };
  grafico.addEventListener('focus', () => { if (grafico.matches(':focus-visible')) peloTeclado(atual < 0 ? pontos.length - 1 : atual); });
  grafico.addEventListener('blur', () => { marcar(-1); esconderDica(); });
  grafico.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    peloTeclado(Math.max(0, Math.min(pontos.length - 1, (atual < 0 ? pontos.length - 1 : atual) + (ev.key === 'ArrowLeft' ? -1 : 1))));
  });
}

// Barras deitadas: nome e valor escritos, largura mostra a proporção
function barrasHTML(linhas) {
  const maior = Math.max(1, ...linhas.map((l) => l.valor));
  return `<div class="pn-barras">${linhas.map((l) => `<div class="pn-b" tabindex="0" data-dica-v="${esc(l.dicaV || l.txt)}" data-dica-r="${esc(l.dicaR || l.nome)}">
    <div class="pn-b-txt"><span>${esc(l.nome)}${l.sub ? `<small>${esc(l.sub)}</small>` : ''}</span><b>${esc(l.txt)}</b></div>
    <div class="pn-b-linha"><i style="width:${l.valor > 0 ? Math.max(1.5, (l.valor / maior) * 100) : 0}%"></i></div>
  </div>`).join('')}</div>`;
}

// ---------------- Aba Resumo ----------------
const VAZIO_GRAFICO = (txt) => `<p class="pn-vazio">${txt}</p>`;

function recorte(dias) {
  const fim = new Date();
  if (!dias) {
    const primeiro = estado.pedidos.length ? Math.min(...estado.pedidos.map((p) => +new Date(p.data))) : fim;
    return { ini: inicioDoDia(primeiro), fim, iniAntes: null };
  }
  const ini = inicioDoDia(fim);
  ini.setDate(ini.getDate() - (dias - 1));
  const iniAntes = new Date(ini);
  iniAntes.setDate(ini.getDate() - dias);
  return { ini, fim, iniAntes };
}

function medir(lista) {
  const vendas = lista.filter((p) => VENDA.has(p.status) && !estornado(p)); // Dinheiro devolvido não é venda
  const faturamento = vendas.reduce((t, p) => t + valorDe(p), 0);
  const aguardando = lista.filter((p) => p.status === 'novo');
  return {
    registrados: lista.length,
    vendas,
    faturamento,
    ticket: vendas.length ? faturamento / vendas.length : 0,
    taxa: lista.length ? vendas.length / lista.length : 0,
    aguardando: aguardando.length,
    aguardandoValor: aguardando.reduce((t, p) => t + valorDe(p), 0),
  };
}

function serieFaturamento(vendas, ini, fim) {
  const dias = Math.round((inicioDoDia(fim) - ini) / 864e5) + 1;
  const passo = dias <= 31 ? 1 : dias <= 120 ? 7 : 0; // Muitos dias viram semanas ou meses, para as colunas não sumirem no celular
  const pontos = [];
  for (const t = new Date(ini); t <= fim;) {
    const de = new Date(t);
    if (passo) t.setDate(t.getDate() + passo);
    else { t.setDate(1); t.setMonth(t.getMonth() + 1); }
    const ate = new Date(t);
    const nome = passo === 1 ? de.toLocaleDateString('pt-BR') : passo === 7 ? `Semana de ${dataCurta(de)}` : de.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    pontos.push({ de, ate, rotulo: passo ? dataCurta(de) : de.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de ', '/'), dica: nome, valor: 0, n: 0 });
  }
  vendas.forEach((p) => {
    const d = new Date(p.data);
    const b = pontos.find((x) => d >= x.de && d < x.ate);
    if (b) { b.valor += valorDe(p); b.n += 1; }
  });
  return pontos;
}

const nomeDoItem = (x) => [...estado.catalogo.kits, ...estado.catalogo.produtos].find((i) => i.id === x.id)?.nome || x.nome || x.id;
const tamanhoDoItem = (x) => x.tam || estado.catalogo.tabela.find((t) => t.calca.includes(Number(x.calca)))?.t || null;

function deltaHTML(atual, antes, rotulo, pontosPct = false) {
  if (!antes) return ''; // Sem período anterior não há comparação honesta a mostrar
  const dif = pontosPct ? (atual - antes) * 100 : ((atual - antes) / antes) * 100;
  const n = Math.round(Math.abs(dif));
  if (!n) return `<span class="pn-delta">Igual a ${rotulo}</span>`;
  return `<span class="pn-delta ${dif > 0 ? 'sobe' : 'desce'}">${dif > 0 ? '▲' : '▼'} ${n}${pontosPct ? ' p.p.' : '%'} <i>vs. ${rotulo}</i></span>`;
}

async function abaResumo(alvo) {
  await carregarDados();
  desenharResumo(alvo);
}

// Primeira coisa ao abrir o painel: o que está esperando por ela, antes dos números
function fazerHTML() {
  const filas = FILAS.map(([id, nome, dica]) => ({ id, nome, dica, n: estado.pedidos.filter(FILTROS[id][1]).length })).filter((f) => f.id !== 'atencao' || f.n);
  const tem = filas.some((f) => f.n);
  return `<section class="pn-fazer">
    <h1 class="pn-h1">O que fazer agora</h1>
    ${tem ? '' : `<p class="pn-em-dia">${I.ok}<span>${estado.pedidos.length ? 'Tudo em dia: nenhum pedido esperando por você.' : 'Nenhum pedido ainda. Eles aparecem aqui assim que chegarem.'}</span></p>`}
    ${estado.pedidos.length ? `<div class="pn-filas">${filas.map((f) => `<a class="pn-fila ${f.n ? 'tem' : ''} ${f.id === 'atencao' ? 'alerta' : ''}" href="#pedidos" data-fila="${f.id}"><strong>${num(f.n)}</strong><span>${f.nome}</span><small>${f.dica}</small></a>`).join('')}</div>` : ''}
    <a class="pn-link" href="#pedidos" data-registrar-venda>Registrar uma venda feita fora do site</a>
    <div class="pn-aviso-caixa" id="aviso-inicio"></div>
  </section>
  <h2 class="pn-titulo-secao">Como estão as vendas</h2>`;
}

function desenharResumo(alvo) {
  const { ini, fim, iniAntes } = recorte(estado.periodo);
  const entre = (a, b) => (p) => { const d = new Date(p.data); return d >= a && d <= b; };
  const noPeriodo = estado.pedidos.filter(entre(ini, fim));
  const m = medir(noPeriodo);
  const ma = iniAntes ? medir(estado.pedidos.filter((p) => { const d = new Date(p.data); return d >= iniAntes && d < ini; })) : null;
  const rotuloAntes = `${estado.periodo} dias anteriores`;
  const validos = noPeriodo.filter((p) => p.status !== 'cancelado');

  // Funil: visitas e etapas vêm dos contadores; pedido e pagamento, dos próprios pedidos
  const iniDia = ini.toLocaleDateString('en-CA');
  const somar = (tipo) => estado.eventos.filter((e) => e.tipo === tipo && e.dia >= iniDia).reduce((t, e) => t + Number(e.total), 0);
  const etapas = [['Visitas', somar('visita')], ['Escolheram um produto', somar('sacola')], ['Abriram a finalização', somar('checkout')], ['Registraram o pedido', m.registrados], ['Pagaram', m.vendas.length]];
  const funil = etapas.map(([nome, valor], i) => {
    const antes = i ? etapas[i - 1][1] : 0;
    const pct = antes ? Math.min(100, Math.round((valor / antes) * 100)) : null;
    return { nome, valor, txt: num(valor), sub: pct == null ? '' : `${pct}% da etapa anterior`, dicaR: pct == null ? 'no período' : `${nome}: ${pct}% da etapa anterior` };
  });

  // Mais vendidos: só o que foi pago
  const porItem = {};
  m.vendas.forEach((p) => (p.itens || []).forEach((x) => {
    const nome = nomeDoItem(x);
    porItem[nome] = porItem[nome] || { qtd: 0, valor: 0 };
    porItem[nome].qtd += Number(x.qtd || 1);
    porItem[nome].valor += Number(x.preco || 0) * Number(x.qtd || 1);
  }));
  const ranking = Object.entries(porItem).sort((a, b) => b[1].qtd - a[1].qtd).map(([nome, v]) => ({
    nome, valor: v.qtd, txt: `${num(v.qtd)} un.`, dicaV: brl(v.valor), dicaR: `${nome}: ${num(v.qtd)} un.`,
  }));

  // Tamanhos: todo pedido não cancelado, para ajudar na hora de repor estoque
  const porTam = {};
  validos.forEach((p) => (p.itens || []).forEach((x) => {
    const t = tamanhoDoItem(x);
    if (t) porTam[t] = (porTam[t] || 0) + Number(x.qtd || 1);
  }));
  const tamanhos = estado.catalogo.tabela.map((t) => ({ rotulo: t.t, dica: `Tamanho ${t.t} (calça ${t.calca.join(' e ')})`, valor: porTam[t.t] || 0 }));

  // Estados: os 5 maiores e o resto em "Outros"
  const porUF = {};
  validos.forEach((p) => { if (p.uf) porUF[p.uf] = (porUF[p.uf] || 0) + 1; });
  const ufs = Object.entries(porUF).sort((a, b) => b[1] - a[1]);
  const estados = [...ufs.slice(0, 5), ...(ufs.length > 5 ? [['Outros', ufs.slice(5).reduce((t, [, n]) => t + n, 0)]] : [])]
    .map(([uf, n]) => ({ nome: uf, valor: n, txt: num(n), dicaR: `${uf}: ${Math.round((n / validos.length) * 100)}% dos pedidos` }));

  const pix = validos.filter((p) => p.pagamento === 'Pix').length;
  const cartao = validos.filter((p) => p.pagamento === 'Cartão').length;
  const totalPag = pix + cartao;
  const pct = (n) => Math.round((n / totalPag) * 100);

  const serie = serieFaturamento(m.vendas, ini, fim);
  const linhasTabela = serie.filter((p) => p.valor > 0).reverse();
  const semNada = !estado.pedidos.length && !etapas[0][1];

  alvo.innerHTML = `
    ${avisoExemplos()}
    ${fazerHTML()}
    <div class="pn-filtros" role="radiogroup" aria-label="Período">
      ${[[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], [0, 'Tudo']].map(([d, n]) => `<button class="chip" type="button" role="radio" data-periodo="${d}" aria-checked="${d === estado.periodo}">${n}</button>`).join('')}
    </div>
    ${semNada ? `<section class="pn-card pn-comeco"><h2>Ainda não há pedidos</h2>
      <p class="pn-texto">${Banco.modo === 'local' ? 'Sem o Supabase, aparecem aqui só os pedidos feitos neste navegador. Para ver como o painel fica com movimento, ligue os dados de exemplo (números fictícios, sempre marcados).' : 'Os pedidos aparecem aqui assim que as clientes finalizarem pelo site.'}</p>
      ${Banco.modo === 'local' ? '<button class="btn btn-claro" type="button" data-por-exemplos>Ver com dados de exemplo</button>' : ''}</section>` : ''}
    <section class="pn-heroi">
      <div class="pn-card pn-heroi-valor">
        <span class="pn-rotulo">Faturamento</span>
        <strong>${brl(m.faturamento)}</strong>
        ${deltaHTML(m.faturamento, ma?.faturamento, rotuloAntes)}
        <small>Soma do valor cobrado nos pedidos com pagamento confirmado. Pedido só registrado não conta.</small>
      </div>
      <div class="pn-kpis">
        <div class="pn-card pn-kpi"><span class="pn-rotulo">Pedidos registrados</span><strong>${num(m.registrados)}</strong>${deltaHTML(m.registrados, ma?.registrados, rotuloAntes)}</div>
        <div class="pn-card pn-kpi"><span class="pn-rotulo">Fechamento</span><strong>${Math.round(m.taxa * 100)}%</strong><small>${num(m.vendas.length)} de ${num(m.registrados)} pagaram</small></div>
        <div class="pn-card pn-kpi"><span class="pn-rotulo">Ticket médio</span><strong>${brl(m.ticket)}</strong>${deltaHTML(m.ticket, ma?.ticket, rotuloAntes)}</div>
        <a class="pn-card pn-kpi pn-kpi-link" href="#pedidos" data-ver-novos><span class="pn-rotulo">Aguardando pagamento</span><strong>${num(m.aguardando)}</strong><small>${brl(m.aguardandoValor)} em aberto</small></a>
      </div>
    </section>
    <section class="pn-card">
      <h2>Faturamento no período</h2>
      <div id="g-faturamento">${m.vendas.length ? '' : VAZIO_GRAFICO('Nenhuma venda paga neste período.')}</div>
      ${linhasTabela.length ? `<details class="pn-tabela"><summary>Ver em tabela</summary><table>
        <thead><tr><th>Período</th><th>Vendas</th><th>Valor</th></tr></thead>
        <tbody>${linhasTabela.map((p) => `<tr><td>${esc(p.dica)}</td><td>${num(p.n)}</td><td>${brl(p.valor)}</td></tr>`).join('')}</tbody>
      </table></details>` : ''}
    </section>
    <div class="pn-grade-2">
      <section class="pn-card"><h2>Do clique ao pagamento</h2>${etapas[0][1] || m.registrados ? barrasHTML(funil) : VAZIO_GRAFICO('Sem movimento neste período.')}
        ${Banco.modo === 'local' ? '<p class="pn-nota">Sem o Supabase, as visitas contam só este navegador.</p>' : ''}</section>
      <section class="pn-card"><h2>Mais vendidos</h2>${ranking.length ? barrasHTML(ranking) : VAZIO_GRAFICO('Aparece quando houver venda paga.')}</section>
      <section class="pn-card"><h2>Tamanhos mais pedidos</h2><div id="g-tamanhos">${validos.length ? '' : VAZIO_GRAFICO('Sem pedidos neste período.')}</div><p class="pn-nota">Ajuda a decidir o que repor. Pedidos cancelados não entram.</p></section>
      <section class="pn-card"><h2>Forma de pagamento</h2>
        ${totalPag ? `<div class="pn-pilha" role="img" aria-label="Pix ${pct(pix)}%, cartão ${pct(cartao)}%">${pix ? `<i style="flex:${pix};background:var(--serie-1)"></i>` : ''}${cartao ? `<i style="flex:${cartao};background:var(--serie-2)"></i>` : ''}</div>
        <ul class="pn-legenda"><li><i style="background:var(--serie-1)"></i>Pix<b>${pct(pix)}%</b><small>${num(pix)} pedidos</small></li><li><i style="background:var(--serie-2)"></i>Cartão<b>${pct(cartao)}%</b><small>${num(cartao)} pedidos</small></li></ul>` : VAZIO_GRAFICO('Sem pedidos neste período.')}
        <h2 class="pn-h2-2">De onde vêm os pedidos</h2>
        ${estados.length ? barrasHTML(estados) : VAZIO_GRAFICO('Sem pedidos neste período.')}
      </section>
    </div>`;

  const desenharGraficos = () => {
    const gf = $('#g-faturamento', alvo);
    if (gf && m.vendas.length) desenharColunas(gf, serie, { fmt: brl, fmtEixo: brlCurto, descricao: `Faturamento no período: ${brl(m.faturamento)}. A tabela abaixo traz os valores.` });
    const gt = $('#g-tamanhos', alvo);
    if (gt && validos.length) desenharColunas(gt, tamanhos, { todos: true, altura: 170, descricao: `Pedidos por tamanho: ${tamanhos.map((t) => `${t.rotulo} ${t.valor}`).join(', ')}` });
  };
  desenharGraficos();
  estado.redesenhar = desenharGraficos;

  $$('[data-periodo]', alvo).forEach((b) => b.addEventListener('click', () => { estado.periodo = Number(b.dataset.periodo); desenharResumo(alvo); }));
  $('[data-ver-novos]', alvo)?.addEventListener('click', () => { estado.filtro = 'novo'; });
  $$('[data-fila]', alvo).forEach((a) => a.addEventListener('click', () => { estado.filtro = a.dataset.fila; estado.busca = ''; }));
  $('[data-registrar-venda]', alvo)?.addEventListener('click', () => { estado.abrirNovo = true; });
  desenharAviso($('#aviso-inicio', alvo), true);
  ligarExemplos(alvo);
}

let tempoResize;
addEventListener('resize', () => {
  clearTimeout(tempoResize);
  tempoResize = setTimeout(() => { if ($('#g-faturamento')) estado.redesenhar?.(); }, 150);
});

// ---------------- Aba Pedidos ----------------
const etiquetaStatus = (s) => `<span class="pn-st pn-st-${esc(s)}">${(STATUS[s] || STATUS.novo)[1]}${(STATUS[s] || STATUS.novo)[0]}</span>`;
const enderecoDe = (p) => [p.rua && `${p.rua}, ${p.num}${p.complemento ? ` - ${p.complemento}` : ''}`, p.bairro && `${p.bairro} - ${p.cidade}/${p.uf}`, p.cep && `CEP ${p.cep}`].filter(Boolean).join('\n');
const linkAcompanhar = (p) => new URL(`acompanhar.html?p=${encodeURIComponent(p.id)}`, location.href).href;
const primeiroNome = (p) => String(p.nome || '').trim().split(/\s+/)[0];
const soNumeros = (t) => String(t || '').replace(/\D/g, '');
function telefoneBonito(t) {
  const d = soNumeros(t);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}
const itemCurto = (x) => {
  const tam = tamanhoDoItem(x);
  return `${x.qtd || 1}x ${nomeDoItem(x)}${x.extra ? ` + ${nomeDoItem({ id: x.extra })}` : ''}${tam ? ` · ${tam}` : ''}`;
};

function etapasHTML(p) {
  if (p.status === 'cancelado') {
    const quando = (p.historico || []).filter((h) => h.status === 'cancelado').pop()?.em;
    return `<p class="pn-etapa-cancelada">Pedido cancelado${quando ? ` em ${dataHora(quando)}` : ''}.${p.motivo_cancelamento ? ` Motivo: ${esc(p.motivo_cancelamento)}.` : ''}${estornado(p) ? ' O dinheiro foi devolvido pelo Mercado Pago.' : ''}</p>`;
  }
  const atual = ETAPAS.findIndex(([id]) => id === p.status);
  return `<ol class="pn-etapas">${ETAPAS.map(([id, nome], i) => {
    const registro = (p.historico || []).filter((h) => h.status === id).pop();
    const quando = registro?.em || (id === 'novo' ? p.data : null);
    return `<li class="${i <= atual ? 'feita' : ''} ${i === atual ? 'atual' : ''}"><i>${i <= atual ? I.ok : ''}</i><span>${nome}${quando && i <= atual ? `<small>${dataHora(quando)}</small>` : ''}</span></li>`;
  }).join('')}</ol>`;
}

function rastreioHTML(p) {
  const ehEnvio = !['enviado', 'entregue'].includes(p.status);
  if (estado.enviando === p.id) {
    return `<div class="pn-envio">
      <div class="campo"><label for="rc-${esc(p.id)}">Código de rastreio</label><input id="rc-${esc(p.id)}" data-rastreio-codigo value="${esc(p.rastreio_codigo || '')}" placeholder="Ex.: AB123456789BR" autocapitalize="characters"><small class="pn-ajuda">Opcional, mas ajuda a cliente. Pode colocar depois.</small></div>
      <div class="campo"><label for="rl-${esc(p.id)}">Link de rastreio</label><input id="rl-${esc(p.id)}" data-rastreio-link type="url" inputmode="url" value="${esc(p.rastreio_link || '')}" placeholder="https://"><small class="pn-ajuda">Opcional. Só se a transportadora passar um link.</small></div>
      <button class="btn btn-preto btn-bloco" type="button" data-salvar-envio>${ehEnvio ? 'Confirmar envio' : 'Salvar rastreio'}</button>
      <button class="pn-link" type="button" data-cancelar-envio>Voltar</button>
    </div>`;
  }
  if (ehEnvio) return '';
  return `<div class="pn-rastreio-info"><h3>Rastreio</h3>${p.rastreio_codigo ? `<p class="pn-endereco">${esc(p.rastreio_codigo)}</p>` : '<p class="pn-nota">Ainda sem código.</p>'}${p.rastreio_link ? `<a class="pn-link" href="${esc(p.rastreio_link)}" target="_blank" rel="noopener">Abrir link de rastreio</a>` : ''}
    <button class="pn-link" type="button" data-editar-rastreio>${p.rastreio_codigo || p.rastreio_link ? 'Corrigir rastreio' : 'Colocar código de rastreio'}</button></div>`;
}

// Onde a cliente paga este pedido. Com o pagamento no site, é a página do próprio pedido;
// no modo link (ou em venda registrada à mão), só depois que a loja libera
function linkDePagamento(p) {
  if (p.status !== 'novo' || pagoOnline(p) || p.conferir) return null;
  const modo = modoPagamento();
  if (modo === 'desligado') return null;
  if (modo === 'site' && p.origem !== 'manual') return new URL(`pagamento.html?p=${encodeURIComponent(p.id)}`, location.href).href;
  return p.mercadopago?.link || null;
}

// Mensagem pronta para a cliente, de acordo com a etapa do pedido
function avisoCliente(p) {
  const n = p.numero;
  const modo = modoPagamento();
  const linkPagar = linkDePagamento(p);
  const textos = {
    novo: linkPagar
      ? `Seu pedido ${n} está esperando o pagamento. Para pagar no Pix ou no cartão, é só usar este link:\n${linkPagar}`
      : modo === 'link' ? `Recebi seu pedido ${n}. Vou conferir seu tamanho e te mandar o link de pagamento.` : `Recebi seu pedido ${n}. Vou conferir seu tamanho e combinar o pagamento com você.`,
    pago: `Pagamento confirmado! Seu pedido ${n} já está garantido.`,
    preparando: `Estou preparando seu pedido ${n}.`,
    enviado: `Seu pedido ${n} foi enviado!${p.rastreio_codigo ? `\nCódigo de rastreio: ${p.rastreio_codigo}` : ''}`,
    entregue: `Seu pedido ${n} consta como entregue. Qualquer dúvida, é só me chamar!`,
    cancelado: estornado(p)
      ? `Seu pedido ${n} foi cancelado e o pagamento foi devolvido pelo Mercado Pago. O prazo para o valor voltar depende do seu banco ou cartão.`
      : `Seu pedido ${n} foi cancelado. Qualquer dúvida, é só me chamar.`,
  };
  const link = Banco.modo === 'supabase' && p.status !== 'cancelado' ? `\n\nAcompanhe por aqui: ${linkAcompanhar(p)}` : '';
  return `Oi, ${primeiroNome(p)}! ${textos[p.status] || textos.novo}${link}`;
}
function zapCliente(p) {
  const d = soNumeros(p.telefone);
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}?text=${encodeURIComponent(avisoCliente(p))}`;
}

// Pagamento pelo Mercado Pago dentro do cartão do pedido: gerar o link, mandar e ver o que foi pago
const modoPagamento = () => (Banco.modo === 'supabase' ? estado.catalogo.pagamento?.modo || 'desligado' : 'desligado');
const comoPagou = (m) => (m.metodo === 'pix' ? 'Pix' : m.tipo === 'debit_card' ? 'débito' : `cartão${m.parcelas > 1 ? ` em ${m.parcelas}x` : ''}`);
// O que aconteceu com o dinheiro depois de pago. O que fazer com isso aparece no aviso do alto do pedido
const DEPOIS_DE_PAGO = { refunded: 'O dinheiro foi devolvido.', partially_refunded: 'Parte do valor foi devolvida.', charged_back: 'A cliente contestou no banco.', in_mediation: 'Em disputa no Mercado Pago.' };
const ANDAMENTO_PAGAMENTO = { pending: 'Pagamento em andamento.', in_process: 'Pagamento em análise no Mercado Pago.', rejected: 'O último cartão foi recusado. A cliente pode tentar de novo.' };
function pagamentoOnlineHTML(p) {
  const m = p.mercadopago || {};
  if (m.pago_em) {
    const depois = DEPOIS_DE_PAGO[m.status];
    return `<p class="pn-pago-online ${depois ? 'pn-pago-problema' : ''}">${depois ? I.alerta : I.ok}<span>Pago pelo Mercado Pago no ${comoPagou(m)}, em ${dataHora(m.pago_em)}.${depois ? ` <b>${depois}</b>` : ''}</span></p>`;
  }
  if (modoPagamento() === 'desligado' || p.status !== 'novo') return '';
  const andamento = m.status === 'pending' && m.metodo === 'pix' ? 'Pix gerado, esperando a cliente pagar.' : ANDAMENTO_PAGAMENTO[m.status];
  const situacao = andamento ? `<p class="pn-nota">${andamento}</p>` : '';
  // O link abre a página de pagamento da loja e cobra sempre o valor que estiver no pedido na hora
  const link = linkDePagamento(p);
  if (link) {
    return `${situacao}<div class="pn-link-pagamento"><small>Link de pagamento</small><span>${esc(link)}</span>
      <div class="pn-acoes-linha"><button class="pn-link" type="button" data-copiar-pagamento>Copiar link</button></div></div>`;
  }
  return `${situacao}<button class="btn btn-claro pn-btn-p" type="button" data-gerar-pagamento>Gerar link de pagamento</button>`;
}

// Quanto tempo o pedido está parado na etapa atual, para o que está atrasado aparecer
function tempoNaEtapa(p) {
  if (!FILTROS.abertos[1](p)) return '';
  const desde = (p.historico || []).at(-1)?.em || p.data;
  const dias = Math.floor((inicioDoDia(new Date()) - inicioDoDia(desde)) / 864e5);
  if (dias < 1) return '';
  return `<span class="pn-parado">${dias === 1 ? 'Nesta etapa desde ontem' : `Nesta etapa há ${dias} dias`}</span>`;
}

const MOTIVOS_CANCELAR = ['A cliente desistiu', 'A cliente não pagou', 'Sem a peça ou o tamanho', 'Pedido repetido ou de teste', 'Outro motivo'];
const LINK_MP = '<a class="pn-link" href="https://www.mercadopago.com.br/activities" target="_blank" rel="noopener">Abrir o Mercado Pago</a>';

// Aviso no alto do pedido: o que aconteceu com o dinheiro e o que fazer agora
function pendenciaHTML(p) {
  const m = p.mercadopago || {};
  const caixa = (texto, acoes) => `<div class="pn-pendencia" role="alert">${I.alerta}<div><p>${texto}</p><div class="pn-acoes-linha">${acoes}</div></div></div>`;
  const conferi = '<button class="pn-link" type="button" data-conferido>Já conferi</button>';
  if (faltaDevolver(p)) {
    return caixa(`<b>Falta devolver ${brl(m.valor_cliente || valorDe(p))} para a cliente.</b> Este pedido foi pago pelo site e está cancelado. No Mercado Pago, abra a venda e toque em "Devolver dinheiro". Quando a devolução for feita, este aviso some sozinho.`,
      `${LINK_MP}<button class="pn-link" type="button" data-devolvi-fora>Já devolvi de outro jeito</button>`);
  }
  if (!p.conferir) return '';
  if (estornado(p)) {
    return ['enviado', 'entregue'].includes(p.status)
      ? caixa('<b>O dinheiro deste pedido foi devolvido depois do envio.</b> Combine com a cliente a volta do produto. O pedido já saiu do faturamento.', `${LINK_MP}${conferi}`)
      : caixa('<b>O dinheiro deste pedido foi devolvido.</b> Não envie. Cancele o pedido para as peças voltarem ao estoque.', '<button class="pn-link" type="button" data-cancelar>Cancelar pedido</button>');
  }
  if (pagoOnline(p) && m.status === 'charged_back') return caixa('<b>A cliente contestou esta compra no banco.</b> Não envie antes de resolver. A resposta à contestação é feita na conta do Mercado Pago.', `${LINK_MP}${conferi}`);
  if (pagoOnline(p) && m.status === 'partially_refunded') return caixa('<b>Parte do valor deste pedido foi devolvida.</b> Confira se o valor cobrado, logo abaixo, está certo.', `${LINK_MP}${conferi}`);
  if (pagoOnline(p)) return caixa('<b>O Mercado Pago avisou de algo fora do normal neste pagamento</b>, como valor diferente ou cobrança repetida. Confira na conta do Mercado Pago antes de enviar.', `${LINK_MP}${conferi}`);
  return caixa('<b>O valor enviado pelo site não bateu com o preço da loja.</b> Enquanto estiver assim, este pedido não pode ser pago pelo site. Acerte o valor a cobrar, logo abaixo, e avise que conferiu.', conferi);
}

// Cancelar pede o motivo e avisa do dinheiro antes: cancelar aqui nunca devolve pagamento sozinho
function cancelarHTML(p) {
  const m = p.mercadopago || {};
  const id = esc(p.id);
  const aviso = pagoOnline(p) && !estornado(p)
    ? `<p class="pn-cancelar-aviso"><b>Este pedido foi pago pelo site (${brl(m.valor_cliente || valorDe(p))}).</b> Cancelar aqui não devolve o dinheiro: depois de cancelar, faça a devolução no Mercado Pago.</p>`
    : cobrancaAberta(p) ? '<p class="pn-cancelar-aviso">O Pix ou cartão que a cliente deixou em aberto também é cancelado, para ela não pagar por engano.</p>'
      : VENDA.has(p.status) && !estornado(p) ? '<p class="pn-cancelar-aviso">Se ela já pagou, combine a devolução do dinheiro com ela.</p>' : '';
  return `<div class="pn-cancelar">
    <h3>Cancelar este pedido?</h3>
    ${aviso}
    <div class="campo"><label for="mc-${id}">Motivo</label><select id="mc-${id}" data-motivo>${MOTIVOS_CANCELAR.map((t) => `<option>${t}</option>`).join('')}</select></div>
    <div class="campo"><label for="mo-${id}">Observação</label><input id="mo-${id}" data-motivo-obs maxlength="120" placeholder="Opcional"></div>
    <p class="pn-nota">O pedido sai do faturamento e as peças voltam para o estoque. Dá para reabrir depois.</p>
    <button class="btn btn-preto btn-bloco" type="button" data-confirmar-cancelar>Cancelar o pedido</button>
    <button class="pn-link" type="button" data-desistir-cancelar>Voltar sem cancelar</button>
  </div>`;
}

// O próximo passo é sempre um botão só. Pedido com pendência não avança antes de resolver
function proximoPassoHTML(p) {
  if (estado.cancelando === p.id) return cancelarHTML(p);
  if (p.status === 'cancelado') return '<button class="btn btn-claro pn-btn-p" type="button" data-reabrir>Reabrir pedido</button>';
  if (estado.enviando === p.id) return '';
  if (precisaAtencao(p)) return '<p class="pn-nota">Resolva o aviso acima para continuar com este pedido.</p>';
  const proxima = PROXIMA[p.status];
  if (!proxima) return '';
  // Pedido do site que ainda não foi pago: a confirmação chega sozinha. Confirmar à mão é só para quem recebeu por fora
  if (p.status === 'novo' && linkDePagamento(p)) {
    return `<p class="pn-espera">${I.relogio}<span>${cobrancaAberta(p) ? 'A cliente abriu o pagamento e ainda não concluiu.' : 'Esperando a cliente pagar pelo site.'} Quando ela pagar, o pedido passa sozinho para Confirmado.</span></p>
        <button class="pn-link" type="button" data-avancar="pago">Recebi de outro jeito: confirmar pagamento</button>`;
  }
  return `<button class="btn btn-preto btn-bloco" type="button" data-avancar="${proxima[0]}">${proxima[1]}</button>
        ${p.status === 'pago' ? '<button class="pn-link" type="button" data-avancar="enviado">Já enviei: pular para enviado</button>' : ''}`;
}

function cartaoPedido(p, aberto = false) {
  const zap = zapCliente(p);
  const comDesconto = p.pagamento === 'Pix' && valorDe(p) < Number(p.total);
  const selo = seloPendencia(p);
  const pago = pagoOnline(p);
  const cancelado = p.status === 'cancelado';
  // Pedido cancelado ou parado por pendência não ganha etiqueta: não é para postar
  const semEtiqueta = cancelado || (precisaAtencao(p) && !['enviado', 'entregue'].includes(p.status));
  return `<details class="pn-ped ${precisaAtencao(p) ? 'pn-ped-atencao' : ''}" data-id="${esc(p.id)}" ${aberto ? 'open' : ''}>
    <summary>
      <div class="pn-ped-l1"><b>${esc(p.numero)}</b>${etiquetaStatus(p.status)}${selo ? `<span class="pn-st pn-st-${selo[1]}">${selo[1] === 'alerta' ? I.alerta : ''}${selo[0]}</span>` : ''}</div>
      <div class="pn-ped-l2"><span>${esc(p.nome)}</span><b>${brl(valorDe(p))}</b></div>
      <div class="pn-ped-itens-resumo">${(p.itens || []).map((x) => `<span>${esc(itemCurto(x))}</span>`).join('')}</div>
      <div class="pn-ped-l3">${dataHora(p.data)}${p.origem === 'manual' ? ' · Venda fora do site' : ''}${p.cupom ? ` · Cupom ${esc(p.cupom)}` : ''}${tempoNaEtapa(p)}</div>
    </summary>
    <div class="pn-ped-corpo">
      ${pendenciaHTML(p)}
      <div class="pn-andamento">
        ${etapasHTML(p)}
        ${proximoPassoHTML(p)}
        ${rastreioHTML(p)}
      </div>
      <div class="pn-aviso-cliente"><h3>Avisar a cliente</h3>
        ${p.telefone ? `<p>${esc(telefoneBonito(p.telefone))}</p>` : ''}
        ${zap ? `<a class="btn btn-claro pn-btn-p" href="${esc(zap)}" target="_blank" rel="noopener">${I.whats}Avisar ${esc(primeiroNome(p))} no WhatsApp</a><p class="pn-nota">Abre a conversa com a mensagem desta etapa já escrita.</p>` : '<p class="pn-nota">Copie e cole na conversa dela no WhatsApp.</p>'}
        <button class="${zap ? 'pn-link' : 'btn btn-claro pn-btn-p'}" type="button" data-copiar-aviso>Copiar aviso desta etapa</button>
        ${Banco.modo === 'supabase' ? '<button class="pn-link" type="button" data-copiar-link>Copiar só o link de acompanhamento</button>' : ''}
      </div>
      <div class="pn-cobranca"><h3>Pagamento: ${esc(p.pagamento || 'não informado')}</h3>
        <div class="campo"><label for="vl-${esc(p.id)}">${pago ? 'Valor cobrado' : 'Valor a cobrar'}</label><input id="vl-${esc(p.id)}" data-valor inputmode="decimal" value="${esc(precoTxt(valorDe(p)))}"></div>
        <small class="pn-ajuda">${pago
          ? 'Pago pelo site. Só mude se devolveu parte do valor: é este número que entra no faturamento.'
          : `${comDesconto ? `Já com o desconto do Pix (preço cheio: ${brl(p.total)}). ` : ''}Mude se somar frete ou der outro desconto. É este valor que entra no faturamento.`}</small>
        ${pagamentoOnlineHTML(p)}
      </div>
      <div><h3>Itens</h3><ul class="pn-ped-itens">${(p.itens || []).map((x) => {
        const tam = tamanhoDoItem(x);
        return `<li><span>${x.qtd || 1}x ${esc(nomeDoItem(x))}${x.extra ? ` + ${esc(nomeDoItem({ id: x.extra }))}` : ''}${tam ? `<small>Tamanho ${esc(tam)}${x.calca ? ` · veste calça ${esc(x.calca)}` : ''}</small>` : ''}</span>${x.preco != null ? `<b>${brl(x.preco * (x.qtd || 1))}</b>` : ''}</li>`;
      }).join('')}${p.cupom ? `<li><span>Cupom ${esc(p.cupom)}<small>${num(p.cupom_pct)}% de desconto · comissão da parceira: ${brl(p.comissao)}</small></span><b>−${brl(p.desconto_cupom)}</b></li>` : ''}${Number(p.frete) > 0 ? `<li><span>Frete${p.uf ? `<small>Para ${esc(p.uf)}, já somado no valor</small>` : ''}</span><b>${brl(Number(p.frete))}</b></li>` : ''}</ul></div>
      <div><h3>Entrega</h3><p class="pn-endereco">${esc(enderecoDe(p)) || 'Sem endereço no pedido'}</p>
        <div class="pn-acoes-linha">${enderecoDe(p) ? `<button class="pn-link" type="button" data-copiar>Copiar endereço</button>${semEtiqueta ? '' : `<button class="pn-link" type="button" data-imprimir>${I.imprimir}Imprimir etiqueta</button>`}` : ''}</div>
      </div>
      <div class="campo"><label for="nt-${esc(p.id)}">Anotação interna</label><textarea id="nt-${esc(p.id)}" data-nota rows="2" placeholder="Só aparece aqui no painel">${esc(p.nota || '')}</textarea></div>
      ${cancelado ? '' : `<div class="pn-gerir">
        <button class="btn btn-claro pn-btn-p" type="button" data-editar-pedido>Editar pedido</button>
        ${estado.cancelando === p.id ? '' : '<button class="pn-link pn-perigo" type="button" data-cancelar>Cancelar pedido</button>'}
      </div>`}
      <details class="pn-mais"><summary>Mais opções</summary>
        ${cancelado ? '' : `<div class="campo"><label for="st-${esc(p.id)}">Corrigir a etapa</label>
          <select id="st-${esc(p.id)}" data-status>${Object.entries(STATUS).filter(([id]) => id !== 'cancelado').map(([id, [nome]]) => `<option value="${id}" ${id === p.status ? 'selected' : ''}>${nome}</option>`).join('')}</select>
          <small class="pn-ajuda">Só para quando uma etapa foi marcada por engano.</small>
        </div>`}
        <button class="pn-link pn-perigo" type="button" data-excluir>Excluir pedido</button>
        <small class="pn-ajuda">Excluir apaga o pedido de vez. Para venda desfeita, prefira cancelar.</small>
      </details>
    </div>
  </details>`;
}

function exportarCSV(lista) {
  // Campo escrito por cliente não pode virar fórmula ao abrir no Excel
  const celula = (v) => { const t = String(v ?? '').replace(/"/g, '""'); return `"${/^[=+\-@]/.test(t) ? `'${t}` : t}"`; };
  const linhas = [['Número', 'Data', 'Situação', 'Nome', 'WhatsApp', 'Cidade', 'UF', 'Pagamento', 'Itens', 'Valor cobrado', 'Rastreio']];
  lista.forEach((p) => linhas.push([p.numero, dataHora(p.data), (STATUS[p.status] || STATUS.novo)[0], p.nome, telefoneBonito(p.telefone), p.cidade, p.uf, p.pagamento,
    (p.itens || []).map(itemCurto).join(' | '), valorDe(p).toFixed(2).replace('.', ','), p.rastreio_codigo]));
  baixar(`pedidos-${new Date().toLocaleDateString('en-CA')}.csv`, `﻿${linhas.map((l) => l.map(celula).join(';')).join('\r\n')}`, 'text/csv;charset=utf-8');
}
function baixar(nome, conteudo, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Etiqueta: a parte de cima vai colada na caixa (sem dizer o que tem dentro); a de baixo fica para conferir
function etiquetaHTML(p) {
  const r = estado.catalogo.remetente || {};
  const remetente = [r.nome || 'Paola Corpus Fit', r.rua && `${r.rua}, ${r.num || 's/n'}${r.complemento ? ` - ${r.complemento}` : ''}`, r.bairro && `${r.bairro} - ${r.cidade}/${r.uf}`, r.cep && `CEP ${r.cep}`, r.telefone && `Tel. ${telefoneBonito(r.telefone)}`].filter(Boolean);
  return `<article class="etq">
    <div class="etq-cola">
      <small>Para</small>
      <b>${esc(p.nome)}</b>
      <p>${esc(enderecoDe(p)) || 'Entrega a combinar'}</p>
      ${p.telefone ? `<p>Tel. ${esc(telefoneBonito(p.telefone))}</p>` : ''}
      <small class="etq-de">De</small>
      <p class="etq-remetente">${remetente.map(esc).join('<br>')}</p>
    </div>
    <div class="etq-confere">
      <small>Conferir antes de fechar (não colar)</small>
      <b>${esc(p.numero)}</b>
      <ul>${(p.itens || []).map((x) => `<li>${esc(itemCurto(x))}</li>`).join('')}</ul>
      ${p.nota ? `<p>${esc(p.nota)}</p>` : ''}
    </div>
  </article>`;
}
function imprimirEtiquetas(lista) {
  if (!estado.catalogo.remetente?.rua) toast('Falta o seu endereço na etiqueta: preencha em Loja, "Endereço de envio".');
  let caixa = $('#impressao');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'impressao';
    document.body.append(caixa);
  }
  caixa.innerHTML = lista.map(etiquetaHTML).join('');
  window.print();
}

async function abaPedidos(alvo) {
  estado.cancelando = null; // Quem saiu da tela no meio de um cancelamento começa de novo
  await carregarDados();
  if (estado.abrirNovo) {
    estado.abrirNovo = false;
    abrirNovoPedido(alvo);
    return;
  }
  const conta = (f) => estado.pedidos.filter(FILTROS[f][1]).length;
  const paraEnviar = () => estado.pedidos.filter((p) => p.status === 'preparando' && enderecoDe(p) && !precisaAtencao(p));
  const chips = () => Object.entries(FILTROS)
    .filter(([id]) => !['semrastreio', 'atencao'].includes(id) || conta(id) > 0 || estado.filtro === id)
    .map(([id, [nome]]) => `<button class="chip" type="button" role="radio" data-filtro="${id}" aria-checked="${id === estado.filtro}">${nome} <small>${conta(id)}</small></button>`).join('');
  alvo.innerHTML = `
    ${avisoExemplos()}
    <div class="pn-cab"><h1 class="pn-h1">Pedidos</h1><button class="btn btn-preto pn-btn-p" type="button" data-novo-pedido>${I.mais}Novo pedido</button></div>
    <div class="pn-filtros" id="filtros-pedidos" role="radiogroup" aria-label="Situação">${chips()}</div>
    <div class="campo pn-busca"><label for="busca">Buscar por número, nome ou cidade</label><input id="busca" type="search" value="${esc(estado.busca)}" placeholder="Ex.: PCF-0411 ou Maria"></div>
    <div id="lista-pedidos"></div>
    <div class="pn-acoes-linha pn-pe-pedidos">
      <button class="pn-link" type="button" data-imprimir-todos></button>
      <button class="pn-link" type="button" data-csv>Baixar planilha</button>
    </div>`;

  const filtrados = () => {
    const termo = estado.busca.trim().toLowerCase();
    const lista = estado.pedidos.filter((p) => FILTROS[estado.filtro][1](p)
      && (!termo || `${p.numero} ${p.nome} ${p.cidade}`.toLowerCase().includes(termo)));
    // No que ainda precisa de ação, o mais antigo vem primeiro
    return FILAS_A_FAZER.has(estado.filtro) ? [...lista].sort((a, b) => new Date(a.data) - new Date(b.data)) : lista;
  };
  const atualizarAcoes = () => {
    const b = $('[data-imprimir-todos]', alvo);
    const n = paraEnviar().length;
    b.hidden = !n;
    b.innerHTML = `${I.imprimir}Imprimir etiquetas dos pedidos para enviar (${n})`;
    atualizarSelo();
  };
  const desenhar = () => {
    const lista = filtrados();
    const vazioAberto = estado.filtro === 'abertos' && !estado.busca.trim() && estado.pedidos.length;
    $('#lista-pedidos').innerHTML = lista.length
      ? lista.slice(0, 200).map((p) => cartaoPedido(p, p.id === estado.abrirPedido)).join('') + (lista.length > 200 ? `<p class="pn-nota">Mostrando 200 de ${num(lista.length)}. Use a busca ou baixe a planilha.</p>` : '')
      : `<section class="pn-card pn-comeco"><h2>${vazioAberto ? 'Tudo em dia' : estado.pedidos.length ? 'Nada encontrado' : 'Ainda não há pedidos'}</h2>
        <p class="pn-texto">${vazioAberto ? 'Nenhum pedido esperando por você agora.' : estado.pedidos.length ? 'Tente outra busca ou outra situação.' : Banco.modo === 'local' ? 'Sem o Supabase, aparecem aqui só os pedidos feitos neste navegador. Depois de conectar, chegam os de todas as clientes.' : 'Os pedidos do site aparecem aqui sozinhos. Vendeu pelo Instagram ou WhatsApp? Use o botão Novo pedido.'}</p></section>`;
    const foco = estado.abrirPedido;
    estado.abrirPedido = null;
    atualizarAcoes();
    if (foco) $('.pn-ped[open]')?.scrollIntoView({ block: 'center' });
  };
  desenhar();

  $('#filtros-pedidos', alvo).addEventListener('click', (e) => {
    const b = e.target.closest('[data-filtro]');
    if (!b) return;
    estado.filtro = b.dataset.filtro;
    $('#filtros-pedidos', alvo).innerHTML = chips();
    desenhar();
  });
  $('#busca').addEventListener('input', (e) => { estado.busca = e.target.value; desenhar(); });
  $('[data-novo-pedido]', alvo).addEventListener('click', () => abrirNovoPedido(alvo));
  $('[data-csv]', alvo).addEventListener('click', () => exportarCSV(filtrados()));
  $('[data-imprimir-todos]', alvo).addEventListener('click', () => imprimirEtiquetas(paraEnviar()));
  ligarExemplos(alvo);

  const lista = $('#lista-pedidos');
  const pedidoDe = (el) => estado.pedidos.find((p) => String(p.id) === el.closest('.pn-ped').dataset.id);
  const redesenharCartao = (p, el) => {
    el.closest('.pn-ped').outerHTML = cartaoPedido(p, true);
    $('#filtros-pedidos', alvo).innerHTML = chips();
    atualizarAcoes();
  };
  // O banco devolve o pedido já com a data da etapa nova
  const atualizar = async (p, el, campos, mensagem) => {
    try {
      const novo = await Banco.alterarPedido(p.id, campos);
      Object.assign(p, novo || campos);
      estado.enviando = null;
      redesenharCartao(p, el);
      toast(mensagem);
    } catch (ex) { toast(`Não salvou: ${ex.message}`); }
  };
  const copiar = async (texto, mensagem) => {
    try { await navigator.clipboard.writeText(texto); toast(mensagem); } catch (ex) { toast('Não deu para copiar. Tente de novo.'); }
  };
  lista.addEventListener('change', async (e) => {
    const p = pedidoDe(e.target);
    if (e.target.matches('[data-status]')) {
      const novo = e.target.value;
      await atualizar(p, e.target, { status: novo }, `Etapa corrigida para ${STATUS[novo][0].toLowerCase()}. Avise a cliente.`);
    } else if (e.target.matches('[data-valor]')) {
      const valor = lerPreco(e.target.value);
      if (!valor) {
        toast('O valor não parece um número. Ex.: 479,00');
        e.target.value = precoTxt(valorDe(p));
        return;
      }
      await atualizar(p, e.target, { valor }, 'Valor salvo');
    } else if (e.target.matches('[data-nota]')) {
      try {
        await Banco.alterarPedido(p.id, { nota: e.target.value.trim() });
        p.nota = e.target.value.trim();
        toast('Anotação salva');
      } catch (ex) { toast(`Não salvou: ${ex.message}`); }
    }
  });
  lista.addEventListener('click', async (e) => {
    const botao = e.target.closest('button');
    if (!botao) return;
    if (botao.dataset.avancar) {
      const p = pedidoDe(botao);
      if (botao.dataset.avancar === 'enviado') {
        estado.enviando = p.id;
        redesenharCartao(p, botao);
        return;
      }
      const novo = botao.dataset.avancar;
      await atualizar(p, botao, { status: novo }, `Pedido em "${STATUS[novo][0]}". Avise a cliente.`);
      return;
    }
    if (botao.matches('[data-gerar-pagamento]')) {
      const p = pedidoDe(botao);
      botao.disabled = true;
      try {
        const url = await Banco.criarLinkPagamento(p.id);
        p.mercadopago = { ...(p.mercadopago || {}), link: url };
        redesenharCartao(p, botao);
        await copiar(url, 'Link copiado. Mande para a cliente.');
      } catch (ex) {
        botao.disabled = false;
        toast(`Não criou o link: ${ex.message}`);
      }
      return;
    }
    if (botao.matches('[data-conferido]')) {
      const p = pedidoDe(botao);
      await atualizar(p, botao, { conferir: false }, 'Conferência anotada');
      return;
    }
    if (botao.matches('[data-copiar-pagamento]')) {
      await copiar(linkDePagamento(pedidoDe(botao)), 'Link de pagamento copiado');
      return;
    }
    if (botao.matches('[data-editar-rastreio]')) {
      const p = pedidoDe(botao);
      estado.enviando = p.id;
      redesenharCartao(p, botao);
      return;
    }
    if (botao.matches('[data-cancelar-envio]')) {
      const p = pedidoDe(botao);
      estado.enviando = null;
      redesenharCartao(p, botao);
      return;
    }
    if (botao.matches('[data-salvar-envio]')) {
      const p = pedidoDe(botao);
      const caixa = botao.closest('.pn-envio');
      const codigo = $('[data-rastreio-codigo]', caixa).value.trim().toUpperCase();
      const link = $('[data-rastreio-link]', caixa).value.trim();
      if (link && !/^https:\/\/\S+$/.test(link)) {
        toast('O link precisa começar com https://');
        return;
      }
      const jaEnviado = ['enviado', 'entregue'].includes(p.status);
      await atualizar(p, botao, { ...(jaEnviado ? {} : { status: 'enviado' }), rastreio_codigo: codigo || null, rastreio_link: link || null }, jaEnviado ? 'Rastreio salvo. Avise a cliente.' : 'Pedido enviado. Avise a cliente.');
      return;
    }
    if (botao.matches('[data-copiar-aviso]')) {
      await copiar(avisoCliente(pedidoDe(botao)), 'Aviso copiado. Cole na conversa dela.');
      return;
    }
    if (botao.matches('[data-copiar-link]')) {
      await copiar(linkAcompanhar(pedidoDe(botao)), 'Link copiado');
      return;
    }
    if (botao.matches('[data-imprimir]')) {
      imprimirEtiquetas([pedidoDe(botao)]);
      return;
    }
    if (botao.matches('[data-copiar]')) {
      const p = pedidoDe(botao);
      await copiar(`${p.nome}\n${enderecoDe(p)}`, 'Endereço copiado');
      return;
    }
    if (botao.matches('[data-cancelar]')) {
      const p = pedidoDe(botao);
      estado.cancelando = p.id;
      redesenharCartao(p, botao);
      $('.pn-cancelar', lista)?.scrollIntoView({ block: 'center' });
      return;
    }
    if (botao.matches('[data-desistir-cancelar]')) {
      const p = pedidoDe(botao);
      estado.cancelando = null;
      redesenharCartao(p, botao);
      return;
    }
    if (botao.matches('[data-confirmar-cancelar]')) {
      const p = pedidoDe(botao);
      const caixa = botao.closest('.pn-cancelar');
      const motivo = [$('[data-motivo]', caixa).value, $('[data-motivo-obs]', caixa).value.trim()].filter(Boolean).join(': ').slice(0, 200);
      botao.disabled = true;
      // Pix ou cartão ainda em aberto: a cobrança é cancelada antes, para a cliente não pagar um pedido cancelado
      if (cobrancaAberta(p)) {
        const r = await Banco.cancelarCobranca(p.id).catch(() => null);
        if (r?.pago) {
          estado.cancelando = null;
          estado.abrirPedido = p.id;
          await carregarDados();
          $('#filtros-pedidos', alvo).innerHTML = chips();
          desenhar();
          toast('Esta cliente acabou de pagar. O pedido não foi cancelado.');
          return;
        }
      }
      const devolver = pagoOnline(p) && !estornado(p);
      estado.cancelando = null;
      await atualizar(p, botao, { status: 'cancelado', motivo_cancelamento: motivo || null, ...(estornado(p) ? { conferir: false } : {}) },
        devolver ? 'Pedido cancelado. Falta devolver o dinheiro no Mercado Pago.' : 'Pedido cancelado. Avise a cliente.');
      if (botao.isConnected) { estado.cancelando = p.id; botao.disabled = false; }
      return;
    }
    if (botao.matches('[data-reabrir]')) {
      const p = pedidoDe(botao);
      // Volta para a etapa em que estava. Se o dinheiro foi devolvido, volta a esperar pagamento
      const anterior = (p.historico || []).filter((h) => h.status !== 'cancelado').pop()?.status || 'novo';
      const volta = estornado(p) ? 'novo' : anterior;
      await atualizar(p, botao, { status: volta, motivo_cancelamento: null }, `Pedido reaberto em "${STATUS[volta][0]}".`);
      return;
    }
    if (botao.matches('[data-devolvi-fora]')) {
      const p = pedidoDe(botao);
      await atualizar(p, botao, { mercadopago: { ...p.mercadopago, devolvido_por_fora: true } }, 'Anotado: dinheiro devolvido.');
      return;
    }
    if (botao.matches('[data-editar-pedido]')) {
      abrirNovoPedido(alvo, pedidoDe(botao));
      scrollTo(0, 0);
      return;
    }
    if (botao.matches('[data-excluir]')) {
      const p = pedidoDe(botao);
      if (!confirm(`Excluir o pedido ${p.numero} de ${p.nome}? Isso não pode ser desfeito. Para venda desfeita, prefira cancelar.`)) return;
      try {
        await Banco.excluirPedido(p.id);
        estado.pedidos = estado.pedidos.filter((x) => x !== p);
        $('#filtros-pedidos', alvo).innerHTML = chips();
        desenhar();
        toast('Pedido excluído');
      } catch (ex) { toast(`Não excluiu: ${ex.message}`); }
    }
  });
}

// Venda feita fora do site (Instagram, WhatsApp, pessoalmente): entra igual às outras nas etapas e no faturamento.
// O mesmo formulário edita um pedido que já existe: trocar tamanho ou peça, corrigir nome, WhatsApp e endereço
function abrirNovoPedido(alvo, existente = null) {
  const todos = [...estado.catalogo.kits, ...estado.catalogo.produtos];
  const acha = (id) => todos.find((x) => x.id === id);
  // Na edição, o que já está no pedido continua na lista mesmo se saiu da loja
  const noPedido = new Set((existente?.itens || []).map((x) => x.id));
  const vendaveis = todos.filter((x) => x.ativo !== false || noPedido.has(x.id));
  const pedeTamanho = (it) => (it.itens ? it.itens.some((i) => acha(i)?.tamanhos) : !!it.tamanhos);
  const tamDaCalca = (c) => estado.catalogo.tabela.find((t) => t.calca.includes(Number(c)))?.t || null;
  // Pedido do site pode ter só a letra do tamanho: o formulário escolhe pela calça, então entra a primeira calça daquela letra
  const calcaInicial = (x) => String(x.calca || estado.catalogo.tabela.find((t) => t.t === x.tam)?.calca[0] || '');
  // Pago pelo site: o valor cobrado não muda aqui, só o que vai na caixa
  const jaPago = !!existente && pagoOnline(existente);
  // O frete que o pedido do site pagou continua no valor quando os itens mudam (venda manual: sem frete)
  const freteDoPedido = Number(existente?.frete) || 0;
  const np = existente
    ? { itens: (existente.itens || []).map((x) => ({ id: x.id, calca: calcaInicial(x), extra: x.extra || '', qtd: x.qtd || 1, original: x })), pagamento: existente.pagamento || 'Pix', valorManual: true, mudou: false }
    : { itens: [{ id: vendaveis[0].id, calca: '', extra: '', qtd: 1 }], pagamento: 'Pix', valorManual: false, mudou: false };
  estado.novoAberto = true;
  // Peça que não mudou continua com o preço que tinha no pedido; peça nova ou trocada usa o preço de hoje
  const precoDe = (x) => (x.original && x.original.id === x.id && x.original.preco != null ? Number(x.original.preco) : acha(x.id)?.preco || 0);

  const linhaItem = (x, i) => {
    const it = acha(x.id);
    const tirar = np.itens.length > 1 ? '<button class="pn-link pn-perigo" type="button" data-np-tirar>Tirar este item</button>' : '';
    // Item que não existe mais no catálogo fica como está: só dá para mudar a quantidade ou tirar
    if (!it) {
      return `<div class="pn-np-item" data-i="${i}">
        <p class="pn-np-fixo"><b>${esc(x.original?.nome || x.id)}</b><small>Este item não está mais no catálogo.</small></p>
        ${campo('Quantidade', `np-qtd-${i}`, x.qtd, { tipo: 'number', attrs: 'data-np="qtd" inputmode="numeric" min="1" max="99"' })}
        ${tirar}
      </div>`;
    }
    // Tamanho esgotado só ganha um aviso: quem vende aqui é a própria dona, ela sabe se ainda tem
    const fora = tamanhosEsgotados(it);
    const calcas = estado.catalogo.tabela.flatMap((t) => t.calca.map((c) => [String(c), `${c} (tamanho ${t.t}${fora.includes(t.t) ? ', esgotado' : ''})`]));
    return `<div class="pn-np-item" data-i="${i}">
      ${seletor('Produto', `np-id-${i}`, x.id, vendaveis.map((v) => [v.id, `${esc(v.nome)}${v.preco != null ? ` · ${brl(v.preco)}` : ''}`]), { attrs: 'data-np="id"' })}
      <div class="pn-2">
        ${pedeTamanho(it) ? seletor('Número da calça', `np-calca-${i}`, x.calca, [['', 'Escolha'], ...calcas], { attrs: 'data-np="calca"' }) : ''}
        ${it.escolha ? seletor('Item à escolha', `np-extra-${i}`, x.extra, [['', 'Escolha'], ...it.escolha.map((e) => [e, esc(acha(e)?.curto || acha(e)?.nome || e)])], { attrs: 'data-np="extra"' }) : ''}
        ${campo('Quantidade', `np-qtd-${i}`, x.qtd, { tipo: 'number', attrs: 'data-np="qtd" inputmode="numeric" min="1" max="99"' })}
      </div>
      ${tirar}
    </div>`;
  };

  const ex = existente || {};
  alvo.innerHTML = `
    <button class="pn-voltar" type="button" data-voltar>${I.voltar}Voltar para os pedidos</button>
    <div class="pn-cab"><h1 class="pn-h1">${existente ? `Editar pedido ${esc(existente.numero)}` : 'Novo pedido'}</h1></div>
    <p class="pn-nota pn-dica-lista">${existente ? 'Troque o tamanho ou a peça, ou corrija os dados da cliente. A etapa do pedido não muda.' : 'Para vendas feitas no Instagram, no WhatsApp ou pessoalmente.'}</p>
    <form id="form-novo" class="pn-form" novalidate>
      <section class="pn-card"><h2>Cliente</h2>
        ${campo('Nome', 'nome', ex.nome || '', { attrs: 'autocomplete="off" required' })}
        ${campo('WhatsApp', 'telefone', ex.telefone ? telefoneBonito(ex.telefone) : '', { tipo: 'tel', attrs: 'inputmode="tel" placeholder="(21) 99999-9999" autocomplete="off"', ajuda: 'Opcional, mas com ele você avisa a cliente em um toque.' })}
      </section>
      <section class="pn-card"><h2>${existente ? 'Itens do pedido' : 'O que ela comprou'}</h2>
        <div id="np-itens" class="pn-np-itens"></div>
        <button class="pn-link pn-add" type="button" data-np-add>Adicionar outro item</button>
      </section>
      <section class="pn-card"><h2>Pagamento</h2>
        ${jaPago
          ? `<p class="pn-pago-online">${I.ok}<span>Pago pelo site: ${brl(valorDe(existente))}. O valor pago não muda aqui.</span></p>
             <p class="pn-nota" data-diferenca hidden></p>`
          : `${seletor('Forma de pagamento', 'pagamento', np.pagamento, [['Pix', 'Pix'], ['Cartão', 'Cartão'], ['Dinheiro', 'Dinheiro']])}
             ${campo('Valor a cobrar', 'valor', existente ? precoTxt(valorDe(existente)) : '', { attrs: 'inputmode="decimal"', ajuda: existente ? `Se trocar os itens, o valor é refeito pelos preços da loja${freteDoPedido ? `, com os ${brl(freteDoPedido)} de frete do pedido` : ''}${existente?.cupom && Number(existente.cupom_pct) ? ` e o desconto de ${num(existente.cupom_pct)}% do cupom ${esc(existente.cupom)}` : ''}. Pode mudar à vontade.` : 'Calculado pelos preços da loja. Pode mudar à vontade.' })}
             ${existente ? '' : chave('Já está pago', 'pago', false, { ajuda: 'Marque se ela já pagou. O pedido entra como confirmado.' })}`}
      </section>
      <section class="pn-card"><h2>Entrega</h2>
        <p class="pn-nota">Deixe vazio se a entrega for em mãos.</p>
        ${campo('CEP', 'cep', ex.cep || '', { attrs: 'inputmode="numeric" placeholder="00000-000" maxlength="9"' })}
        ${campo('Rua', 'rua', ex.rua || '')}
        <div class="pn-2">${campo('Número', 'num', ex.num || '')}${campo('Complemento', 'complemento', ex.complemento || '')}</div>
        ${campo('Bairro', 'bairro', ex.bairro || '')}
        <div class="pn-2">${campo('Cidade', 'cidade', ex.cidade || '')}${campo('UF', 'uf', ex.uf || '', { attrs: 'maxlength="2" autocapitalize="characters"' })}</div>
      </section>
      <section class="pn-card"><h2>Anotação</h2>
        ${area('Só aparece aqui no painel', 'nota', ex.nota || '', { linhas: 2 })}
      </section>
      <div class="pn-salvar"><p class="dica-tam erro" data-erro hidden></p><button class="btn btn-preto btn-bloco" type="submit">${existente ? 'Salvar alterações' : 'Salvar pedido'}</button></div>
    </form>`;

  const form = $('#form-novo', alvo);
  const caixaItens = $('#np-itens', form);
  const somaItens =() => np.itens.reduce((t, x) => t + precoDe(x) * (Number(x.qtd) || 1), 0);
  // Pedido com cupom de parceira: o desconto (mesma conta do banco) continua valendo quando as peças mudam
  const cupomPct = existente?.cupom ? Number(existente.cupom_pct) || 0 : 0;
  const descontoDoCupom = (soma) => (cupomPct > 0 ? Math.round((Math.round(soma * 100) * cupomPct) / 100) / 100 : 0);
  const comFrete = (soma) => Math.round((soma - descontoDoCupom(soma) + freteDoPedido) * 100) / 100;
  const comPix = (soma, forma) => Math.round(soma * (1 - (forma === 'Pix' ? estado.catalogo.loja.pix : 0)) * 100) / 100;
  const sugerirValor = () => {
    const soma = comFrete(somaItens());
    if (jaPago) {
      // Troca em pedido já pago: mostra a diferença para a loja acertar com a cliente
      const aviso = $('[data-diferenca]', form);
      const novoValor = comPix(soma, existente.pagamento);
      const dif = Math.round((novoValor - valorDe(existente)) * 100) / 100;
      aviso.hidden = !np.mudou || Math.abs(dif) < 0.01;
      aviso.textContent = dif > 0
        ? `Com a troca, o pedido passa a valer ${brl(novoValor)}. Faltam ${brl(dif)}: combine com a cliente.`
        : `Com a troca, o pedido passa a valer ${brl(novoValor)}. Sobram ${brl(-dif)} para devolver à cliente.`;
      return;
    }
    if (np.valorManual) return;
    form.elements.valor.value = soma ? precoTxt(comPix(soma, form.elements.pagamento.value)) : '';
  };
  // Na edição, o valor só é refeito quando os itens mudam
  const itensMudaram = () => {
    np.mudou = true;
    if (existente && !jaPago) np.valorManual = false;
  };
  const desenharItens = () => {
    caixaItens.innerHTML = np.itens.map(linhaItem).join('');
    sugerirValor();
  };
  desenharItens();
  if (!existente) form.elements.nome.focus();

  caixaItens.addEventListener('change', (e) => {
    const qual = e.target.dataset.np;
    if (!qual) return;
    const x = np.itens[Number(e.target.closest('.pn-np-item').dataset.i)];
    x[qual] = e.target.value;
    if (qual !== 'calca' && qual !== 'extra') itensMudaram();
    if (qual === 'id') { x.calca = ''; x.extra = ''; desenharItens(); } else sugerirValor();
  });
  caixaItens.addEventListener('click', (e) => {
    if (!e.target.matches('[data-np-tirar]')) return;
    np.itens.splice(Number(e.target.closest('.pn-np-item').dataset.i), 1);
    itensMudaram();
    desenharItens();
  });
  $('[data-np-add]', form).addEventListener('click', () => {
    np.itens.push({ id: vendaveis[0].id, calca: '', extra: '', qtd: 1 });
    itensMudaram();
    desenharItens();
  });
  form.elements.pagamento?.addEventListener('change', sugerirValor);
  form.elements.valor?.addEventListener('input', () => { np.valorManual = true; });
  form.elements.telefone.addEventListener('input', (e) => { e.target.value = mascaraTelefone(e.target.value); });
  ligarBuscaCep(form.elements.cep, form);
  $('[data-voltar]', alvo).addEventListener('click', () => {
    estado.novoAberto = false;
    if (existente) estado.abrirPedido = existente.id;
    abaPedidos(alvo);
    scrollTo(0, 0);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const el = form.elements;
    const erro = $('[data-erro]', form);
    const falhar = (msg, campoAlvo) => { erro.hidden = false; erro.textContent = msg; campoAlvo?.focus(); };
    const nome = el.nome.value.trim();
    const valor = jaPago ? valorDe(existente) : lerPreco(el.valor.value);
    const tel = soNumeros(el.telefone.value);
    if (!nome) return falhar('Escreva o nome da cliente.', el.nome);
    if (tel && tel.length < 10) return falhar('O WhatsApp precisa ter DDD e número.', el.telefone);
    if (!valor) return falhar('Escreva o valor a cobrar. Ex.: 479,00.', el.valor);
    const semEscolha = np.itens.find((x) => acha(x.id)?.escolha && !x.extra);
    if (semEscolha) return falhar('Escolha o item do combo.');
    erro.hidden = true;
    const itens = np.itens.map((x) => {
      const it = acha(x.id);
      const o = x.original;
      const qtd = Number(x.qtd) || 1;
      if (!it) return { ...o, qtd };
      const calca = x.calca ? Number(x.calca) : null;
      const base = { id: x.id, nome: it.nome, calca, tam: tamDaCalca(calca), extra: x.extra || null, qtd, preco: it.preco ?? null };
      if (!o || o.id !== x.id) return base;
      // Mesma peça: se o tamanho não mudou, ficam a calça e o preço que já estavam no pedido
      const mesmoTam = !pedeTamanho(it) || (tamanhoDoItem(o) || null) === base.tam;
      return { ...o, extra: base.extra, qtd, ...(mesmoTam ? {} : { calca, tam: base.tam }) };
    });
    const dados = {
      nome,
      telefone: tel || null,
      cep: el.cep.value.trim() || null,
      rua: el.rua.value.trim() || null,
      num: el.num.value.trim() || null,
      complemento: el.complemento.value.trim() || null,
      bairro: el.bairro.value.trim() || null,
      cidade: el.cidade.value.trim() || null,
      uf: el.uf.value.trim().toUpperCase() || null,
      itens,
      nota: el.nota.value.trim() || null,
    };
    const botao = $('button[type=submit]', form);
    botao.disabled = true;

    if (existente) {
      try {
        // O valor mudou e a cliente tinha deixado um Pix ou cartão em aberto com o valor antigo: essa cobrança é cancelada
        if (!jaPago && cobrancaAberta(existente) && valor !== valorDe(existente)) {
          const r = await Banco.cancelarCobranca(existente.id).catch(() => null);
          if (r?.pago) {
            botao.disabled = false;
            return falhar('Esta cliente acabou de pagar o valor antigo. Volte para os pedidos e abra de novo antes de editar.');
          }
        }
        await Banco.alterarPedido(existente.id, { ...dados, total: somaItens() ? comFrete(somaItens()) : existente.total, ...(cupomPct && somaItens() ? { desconto_cupom: descontoDoCupom(somaItens()) } : {}), ...(jaPago ? {} : { pagamento: el.pagamento.value, valor }) });
        estado.novoAberto = false;
        estado.abrirPedido = existente.id;
        await abaPedidos(alvo);
        scrollTo(0, 0);
        toast('Pedido atualizado');
      } catch (ex2) {
        botao.disabled = false;
        falhar(`Não salvou: ${ex2.message}`);
      }
      return;
    }

    const agora = new Date();
    const dois = (n) => String(n).padStart(2, '0');
    const novo = {
      id: crypto.randomUUID(),
      numero: `PCF-${dois(agora.getDate())}${dois(agora.getMonth() + 1)}-${Math.floor(1000 + Math.random() * 9000)}`,
      ...dados,
      pagamento: el.pagamento.value,
      total: somaItens() || valor,
      valor,
      status: el.pago.checked ? 'pago' : 'novo',
      origem: 'manual',
    };
    try {
      await Banco.criarPedido(novo);
      estado.novoAberto = false;
      estado.filtro = 'abertos';
      estado.abrirPedido = novo.id;
      await abaPedidos(alvo);
      scrollTo(0, 0);
      toast('Pedido criado');
    } catch (ex2) {
      botao.disabled = false;
      falhar(`Não salvou: ${ex2.message}`);
    }
  });
}

const mascaraTelefone = (v) => {
  const d = soNumeros(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
};
// Pelo CEP, o endereço se preenche sozinho (ViaCEP, serviço público e gratuito); se falhar, é só digitar
function ligarBuscaCep(cep, form, nomes = { rua: 'rua', bairro: 'bairro', cidade: 'cidade', uf: 'uf', num: 'num' }) {
  let ultimo = '';
  cep.addEventListener('input', async () => {
    const d = soNumeros(cep.value).slice(0, 8);
    cep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    if (d.length !== 8 || d === ultimo) return;
    ultimo = d;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`).then((x) => x.json());
      if (r.erro) return;
      const el = form.elements;
      el[nomes.rua].value = r.logradouro || el[nomes.rua].value;
      el[nomes.bairro].value = r.bairro || el[nomes.bairro].value;
      el[nomes.cidade].value = r.localidade || '';
      el[nomes.uf].value = r.uf || '';
      el[nomes.num].focus();
    } catch (e) { /* sem internet ou CEP fora do ar: digita à mão */ }
  });
}

// ---------------- Aba Produtos ----------------
// Feita para a dona da loja: o que mais se usa fica à vista (foto, nome, preço, se está na loja); o resto vai em "Mais opções".
const SEGMENTOS = { produtos: ['Produtos', 'Novo produto'], kits: ['Combos', 'Novo combo'], praia: ['Moda praia', 'Nova peça'] };
const precoTxt = (v) => (v == null || Number.isNaN(+v) ? '' : (Number.isInteger(+v) ? String(+v) : (+v).toFixed(2)).replace('.', ','));
function lerPreco(txt) {
  let t = String(txt ?? '').replace(/[R$\s]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}
const usadoEmKits = (id) => estado.catalogo.kits.filter((k) => k.itens?.includes(id) || k.escolha?.includes(id)).map((k) => k.nome);
const eFixo = (id) => Catalogo.FIXOS.includes(id);
const salvoNaLoja = () => (Banco.modo === 'local' ? 'Salvo neste navegador' : 'Salvo. Já está na loja.');

// Tamanhos que acabaram, na ordem da tabela. O combo acaba quando acaba qualquer peça que vai nele
function tamanhosEsgotados(x) {
  if (!x || (!x.itens && !x.tamanhos)) return [];
  const est = estado.estoque || {};
  const pecas = (x.itens || [x.id]).map((i) => estado.catalogo.produtos.find((p) => p.id === i)).filter(Boolean);
  const acabou = (p, t) => (p.tamanhos ? p.esgotados?.includes(t) || est[p.id]?.[t] <= 0 : est[p.id]?.[''] <= 0);
  return estado.catalogo.tabela.map((t) => t.t).filter((t) => pecas.some((p) => acabou(p, t)));
}
const textoDaLinha = (x, seg) => {
  if (seg === 'praia') return 'Em breve';
  const fora = tamanhosEsgotados(x);
  return `${x.preco == null ? 'Vende só nos combos' : `No Pix: ${brl(x.preco * (1 - estado.catalogo.loja.pix))}`}${fora.length ? ` · Acabou: ${fora.join(', ')}` : ''}`;
};

// A caixa inteira é rótulo do campo: clicar no "R$" ou na borda também põe o cursor lá dentro
const campoDaLinha = (x, qual, rotulo, extra = '') => `<div class="pn-lin-campo"><label class="pn-lin-rotulo" for="l-${qual}-${esc(x.id)}">${rotulo}</label><label class="pn-rs" for="l-${qual}-${esc(x.id)}"><i>R$</i><input id="l-${qual}-${esc(x.id)}" data-lin-preco="${qual}" type="text" inputmode="decimal" autocomplete="off" placeholder="—" value="${esc(precoTxt(x[qual]))}" ${extra}></label></div>`;

function linhaItem(x, i, total, seg) {
  const naLoja = x.ativo !== false;
  const nome = `<div class="pn-lin-nome">
      <button class="pn-lin-foto" type="button" data-editar="${esc(x.id)}" tabindex="-1" aria-hidden="true"><img src="${esc(x.img)}" alt="" loading="lazy"></button>
      <div><button class="pn-lin-titulo" type="button" data-editar="${esc(x.id)}">${esc(x.nome)}</button><small data-lin-msg role="status">${esc(textoDaLinha(x, seg))}</small></div>
    </div>`;
  if (estado.ordenando) {
    return `<article class="pn-lin pn-lin-ordem ${naLoja ? '' : 'oculto'}">${nome}<div class="pn-item-ordem">
        <button class="pn-ico" type="button" data-mover="-1" data-i="${i}" aria-label="Subir ${esc(x.nome)}" ${i === 0 ? 'disabled' : ''}>${I.cima}</button>
        <button class="pn-ico" type="button" data-mover="1" data-i="${i}" aria-label="Descer ${esc(x.nome)}" ${i === total - 1 ? 'disabled' : ''}>${I.baixo}</button>
      </div></article>`;
  }
  const precos = seg === 'praia' ? '' : campoDaLinha(x, 'preco', 'Preço') + campoDaLinha(x, 'de', 'Preço antigo', x.preco == null ? 'disabled' : '');
  const loja = eFixo(x.id)
    ? '<span class="pn-lin-fixo">Sempre na loja</span>'
    : `<label class="pn-sw"><input type="checkbox" data-na-loja="${esc(x.id)}" ${naLoja ? 'checked' : ''}><i aria-hidden="true"></i><span>${naLoja ? 'Na loja' : 'Fora da loja'}</span></label>`;
  return `<article class="pn-lin ${seg === 'praia' ? 'pn-lin-curta' : ''} ${eFixo(x.id) ? 'pn-lin-fixa' : ''} ${naLoja ? '' : 'oculto'}" data-id="${esc(x.id)}">
    ${nome}${precos}${loja}
    <button class="btn btn-claro pn-btn-p pn-lin-editar" type="button" data-editar="${esc(x.id)}" aria-label="Editar ${esc(x.nome)}">Editar</button>
  </article>`;
}

function mostrarAvisoValores(alvo) {
  const caixa = $('#aviso-valores', alvo);
  if (!caixa) return;
  caixa.innerHTML = estado.avisoValores ? `<p class="pn-exemplo">${I.alerta}<span><b>Você mudou um preço.</b> Estes textos citam valores e não mudam sozinhos: ${esc(estado.avisoValores.join('; '))}.</span><button class="pn-link" type="button" data-ok-aviso>Entendi</button></p>` : '';
  $('[data-ok-aviso]', caixa)?.addEventListener('click', () => { estado.avisoValores = null; caixa.innerHTML = ''; });
}

// Mesmas regras na lista e no editor. Devolve [mensagem, campo que precisa de atenção]
function problemaPreco(x, seg, preco, de) {
  if (Number.isNaN(preco)) return ['O preço não parece um número. Ex.: 369,99.', 'preco'];
  if (Number.isNaN(de)) return ['O preço antigo não parece um número. Ex.: 650.', 'de'];
  if (preco === 0 || (preco === null && (seg === 'kits' || eFixo(x.id)))) return ['Escreva o preço de venda.', 'preco'];
  if (de && preco && de <= preco) return ['O preço antigo precisa ser maior que o de venda. Se não houver, deixe vazio.', 'de'];
  if (seg === 'produtos' && x.cat === 'cintas' && preco != null && !x.barbatanas) return ['Informe quantas barbatanas a cinta tem.', 'barbatanas'];
  return null;
}

// Preço na própria lista: salva ao sair do campo e não redesenha, para não tirar quem está digitando do lugar
async function mudarPrecoNaLinha(inp, seg, alvo) {
  const linha = inp.closest('.pn-lin');
  const x = estado.catalogo[seg].find((i) => i.id === linha.dataset.id);
  const campos = { preco: $('[data-lin-preco="preco"]', linha), de: $('[data-lin-preco="de"]', linha) };
  const msg = $('[data-lin-msg]', linha);
  const preco = lerPreco(campos.preco.value);
  const lidoDe = lerPreco(campos.de.value);
  const de = lidoDe === 0 || preco === null ? null : lidoDe;
  Object.values(campos).forEach((c) => c.parentElement.classList.remove('salvo', 'erro'));
  const problema = problemaPreco(x, seg, preco, de);
  if (problema) {
    msg.className = 'erro';
    msg.textContent = problema[0];
    campos[problema[1]]?.parentElement.classList.add('erro');
    return;
  }
  msg.className = '';
  if ((x.preco ?? null) === preco && (x.de ?? null) === de) {
    msg.textContent = textoDaLinha(x, seg);
    return;
  }
  x.preco = preco;
  if (de === null) delete x.de; else x.de = de;
  campos.preco.value = precoTxt(preco);
  campos.de.value = precoTxt(de);
  campos.de.disabled = preco === null;
  msg.textContent = 'Salvando…';
  const salvou = await salvarCatalogo(salvoNaLoja());
  const naLista = !estado.editor && location.hash.slice(1) === 'produtos';
  if (!salvou) {
    if (naLista) abaProdutos(alvo);
    return;
  }
  const achados = textosComValor(estado.catalogo);
  estado.avisoValores = achados.length ? achados : null;
  if (!naLista || !linha.isConnected) return;
  inp.parentElement.classList.add('salvo');
  msg.className = 'ok';
  msg.textContent = `Salvo. ${textoDaLinha(x, seg)}`;
  mostrarAvisoValores(alvo);
}

// Abas de cima: os três tipos de item e o estoque
const filtrosProdutos = (seg) => `<div class="pn-filtros pn-filtros-justo" role="radiogroup" aria-label="O que ver">
    ${[...Object.entries(SEGMENTOS), ['estoque', ['Estoque']]].map(([id, [nome]]) => `<button class="chip" type="button" role="radio" data-seg="${id}" aria-checked="${id === seg}">${nome}</button>`).join('')}
  </div>`;
const ligarFiltrosProdutos = (alvo) => $$('[data-seg]', alvo).forEach((b) => b.addEventListener('click', () => { estado.segmento = b.dataset.seg; estado.ordenando = false; abaProdutos(alvo); }));

// Estoque: quantas peças a Paola tem de cada tamanho. Em branco, a loja não conta e o item fica sempre à venda.
// Salva ao sair do campo, como o preço na lista. A baixa do pedido pago acontece sozinha, no banco
const tamsEstoque = (x) => (x.tamanhos ? estado.catalogo.tabela.map((l) => l.t) : ['']);
function valorEstoque(x, t) {
  const q = estado.estoque?.[x.id]?.[t];
  if (Number.isInteger(q)) return String(q);
  // Marcação antiga de "acabou" aparece como zero
  return x.tamanhos && x.esgotados?.includes(t) ? '0' : '';
}
function resumoEstoque(x) {
  const vals = tamsEstoque(x).map((t) => valorEstoque(x, t));
  if (vals.every((v) => v === '')) return 'Sem contagem: fica sempre à venda';
  const total = vals.reduce((s, v) => s + Math.max(0, Number(v) || 0), 0);
  const fora = tamsEstoque(x).filter((t, i) => vals[i] !== '' && Number(vals[i]) <= 0);
  const amais = vals.reduce((s, v) => s + Math.max(0, -(Number(v) || 0)), 0);
  const acabou = !fora.length ? '' : x.tamanhos ? ` · Acabou: ${fora.join(', ')}` : ' · Acabou';
  return `${total} ${total === 1 ? 'peça' : 'peças'}${acabou}${amais ? ` · Vendeu ${amais} a mais do que tinha` : ''}`;
}
function campoEstoque(x, t, calca) {
  const v = valorEstoque(x, t);
  const rotulo = t ? `Tamanho ${t}, calça ${calca.join(' e ')}` : `Quantidade de ${x.nome}`;
  return `<label class="pn-est-campo${t ? '' : ' unico'}${v !== '' && Number(v) <= 0 ? ' fora' : ''}"><b>${t ? esc(t) : 'Peças'}</b>
    <input type="text" inputmode="numeric" maxlength="5" autocomplete="off" value="${esc(v)}" placeholder="—" data-est-tam="${esc(t)}" aria-label="${esc(rotulo)}"></label>`;
}
async function telaEstoque(alvo) {
  const { produtos, tabela, loja } = estado.catalogo;
  const topo = `<div class="pn-cab"><h1 class="pn-h1">Produtos</h1></div>${filtrosProdutos('estoque')}`;
  alvo.innerHTML = `${topo}<p class="pn-texto">Conferindo o estoque…</p>`;
  ligarFiltrosProdutos(alvo);
  // Sempre do banco na hora: pode ter tido venda paga desde a última vez
  try {
    estado.estoque = await Banco.lerEstoque();
  } catch (ex) {
    $('.pn-texto', alvo).textContent = `Não deu para abrir o estoque: ${ex.message}`;
    return;
  }
  if (estado.segmento !== 'estoque' || !alvo.isConnected) return;
  alvo.innerHTML = `${topo}
    <section class="pn-card pn-est-mostrar">${chave('Mostrar a quantidade no site', 'mostrarEstoque', loja.mostrarEstoque === true, { ajuda: 'Ligado, a cliente vê quantas peças tem no tamanho que escolheu. Desligado, ela só vê o que acabou.' })}</section>
    <p class="pn-nota pn-dica-lista"><b>Escreva quantas peças você tem</b> e saia do campo, que já salva. Quando um pedido vira <b>Pago</b>, o estoque baixa sozinho; se for cancelado, as peças voltam. Deixe em branco o que você não quer contar.</p>
    <section class="pn-itens" id="estoque">${produtos.map((x) => `<article class="pn-est" data-id="${esc(x.id)}">
      <div class="pn-est-nome"><img src="${esc(x.img)}" alt="" loading="lazy"><div><b>${esc(x.nome)}</b><small data-est-resumo role="status">${esc(resumoEstoque(x))}</small></div></div>
      <div class="pn-est-tam" role="group" aria-label="Estoque de ${esc(x.nome)}">${x.tamanhos ? tabela.map((l) => campoEstoque(x, l.t, l.calca)).join('') : campoEstoque(x, '', [])}</div>
    </article>`).join('')}</section>
    <p class="pn-nota pn-est-nota">Os combos seguem as peças que vão neles: se acabar o gel, o combo que leva gel sai da loja até você colocar mais.</p>`;
  ligarFiltrosProdutos(alvo);

  $('[name=mostrarEstoque]', alvo).addEventListener('change', async (e) => {
    loja.mostrarEstoque = e.target.checked;
    await salvarCatalogo(e.target.checked ? 'A quantidade aparece no site' : 'A quantidade não aparece mais no site');
  });
  $('#estoque', alvo).addEventListener('focusin', (e) => { if (e.target.matches('[data-est-tam]')) e.target.select(); });
  $('#estoque', alvo).addEventListener('change', async (e) => {
    const inp = e.target.closest('[data-est-tam]');
    if (!inp) return;
    const linha = inp.closest('.pn-est');
    const x = produtos.find((p) => p.id === linha.dataset.id);
    const t = inp.dataset.estTam;
    const txt = inp.value.trim();
    if (txt !== '' && !/^\d{1,4}$/.test(txt)) {
      toast('Escreva só o número de peças, de 0 a 9999. Ex.: 5');
      inp.value = valorEstoque(x, t);
      return;
    }
    const qtd = txt === '' ? null : Number(txt);
    if (txt === valorEstoque(x, t)) return;
    inp.disabled = true;
    try {
      await Banco.salvarEstoque(x.id, t, qtd);
      const doItem = { ...(estado.estoque[x.id] || {}) };
      if (qtd === null) delete doItem[t]; else doItem[t] = qtd;
      if (Object.keys(doItem).length) estado.estoque[x.id] = doItem; else delete estado.estoque[x.id];
      // A contagem nova substitui a marcação antiga de "acabou"
      if (x.esgotados?.includes(t)) {
        x.esgotados = x.esgotados.filter((n) => n !== t);
        if (!x.esgotados.length) delete x.esgotados;
        await salvarCatalogo('Estoque salvo');
      } else {
        toast(qtd === null ? 'Esse tamanho não é mais contado' : 'Estoque salvo');
      }
    } catch (ex) {
      toast(`Não salvou: ${ex.message}`);
    }
    inp.disabled = false;
    inp.value = valorEstoque(x, t);
    inp.closest('.pn-est-campo').classList.toggle('fora', inp.value !== '' && Number(inp.value) <= 0);
    $('[data-est-resumo]', linha).textContent = resumoEstoque(x);
  });
}

function abaProdutos(alvo) {
  if (estado.segmento === 'estoque') return telaEstoque(alvo);
  const seg = estado.segmento;
  const lista = estado.catalogo[seg];
  const comPreco = seg !== 'praia';
  const nota = comPreco
    ? '<b>O preço muda aqui mesmo:</b> escreva o valor e saia do campo, que já salva. O preço antigo aparece riscado; só preencha se já foi cobrado de verdade.'
    : 'As peças aparecem na loja como "Em breve", ainda sem preço.';
  alvo.innerHTML = `
    <div class="pn-cab"><h1 class="pn-h1">Produtos</h1><button class="btn btn-preto pn-btn-p" type="button" data-novo>${I.mais}${SEGMENTOS[seg][1]}</button></div>
    ${filtrosProdutos(seg)}
    <div id="aviso-valores"></div>
    ${estado.ordenando ? '' : `<p class="pn-nota pn-dica-lista">${nota}</p>
    <div class="pn-lin-cab ${comPreco ? '' : 'pn-lin-curta'}" aria-hidden="true"><span>Produto</span>${comPreco ? '<span>Preço</span><span>Preço antigo</span>' : ''}<span>Na loja</span><span></span></div>`}
    <section class="pn-itens">${lista.map((x, i) => linhaItem(x, i, lista.length, seg)).join('')}</section>
    ${lista.length > 1 ? `<button class="pn-link pn-ordem" type="button" data-ordenar>${estado.ordenando ? 'Pronto, terminei de ordenar' : 'Mudar a ordem na loja'}</button>` : ''}`;
  mostrarAvisoValores(alvo);

  ligarFiltrosProdutos(alvo);
  $('[data-novo]', alvo).addEventListener('click', () => abrirEditor(seg, null));
  $('[data-ordenar]', alvo)?.addEventListener('click', () => { estado.ordenando = !estado.ordenando; abaProdutos(alvo); });
  $$('[data-editar]', alvo).forEach((b) => b.addEventListener('click', () => abrirEditor(seg, b.dataset.editar)));
  $$('[data-lin-preco]', alvo).forEach((inp) => {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
    inp.addEventListener('change', () => mudarPrecoNaLinha(inp, seg, alvo));
    // Libera o preço antigo já ao digitar: a tecla Tab precisa conseguir ir para ele
    if (inp.dataset.linPreco === 'preco') inp.addEventListener('input', () => { $('[data-lin-preco="de"]', inp.closest('.pn-lin')).disabled = !inp.value.trim(); });
  });
  $$('[data-na-loja]', alvo).forEach((c) => c.addEventListener('change', async () => {
    lista.find((x) => x.id === c.dataset.naLoja).ativo = c.checked;
    await salvarCatalogo(c.checked ? 'Voltou para a loja' : 'Saiu da loja');
    abaProdutos(alvo);
  }));
  $$('[data-mover]', alvo).forEach((b) => b.addEventListener('click', async () => {
    const i = Number(b.dataset.i);
    const j = i + Number(b.dataset.mover);
    [lista[i], lista[j]] = [lista[j], lista[i]];
    await salvarCatalogo('Ordem salva');
    abaProdutos(alvo);
  }));
}

// Uma gravação por vez: dois preços salvos em sequência não podem chegar fora de ordem
let filaCatalogo = Promise.resolve();
async function salvarCatalogo(msg) {
  try {
    const vez = filaCatalogo.then(() => Banco.salvarCatalogo(estado.catalogo));
    filaCatalogo = vez.catch(() => {});
    await vez;
    toast(msg);
    return true;
  } catch (e) {
    // Volta a tela para o que está no banco, para a próxima mudança partir do catálogo certo
    try { estado.catalogo = await Banco.catalogo(); } catch (ex) { /* sem internet: fica a cópia da tela */ }
    toast(`Não salvou: ${e.message}`);
    return false;
  }
}

const NOVOS = {
  produtos: () => ({ id: '', nome: '', cat: 'tratamento', preco: null, img: '', desc: '', ativo: true }),
  kits: () => ({ id: '', nome: '', cat: 'kits', img: '', itens: [], de: null, preco: null, desc: '', ativo: true }),
  praia: () => ({ id: '', nome: '', img: '', foco: [], cores: ['#1F1A17', '#B03A5B', '#1D6A86'], ativo: true }),
};

function abrirEditor(seg, id) {
  const r = id ? copia(estado.catalogo[seg].find((x) => x.id === id)) : NOVOS[seg]();
  estado.ordenando = false;
  estado.editor = { seg, id, r, sujo: false, aba: 'principal' };
  desenharEditor();
  scrollTo(0, 0);
}

// Campos do formulário
const ajuda = (t) => (t ? `<small class="pn-ajuda">${t}</small>` : '');
const campo = (rotulo, nome, valor, op = {}) => `<div class="campo"><label for="f-${nome}">${rotulo}</label><input id="f-${nome}" name="${nome}" type="${op.tipo || 'text'}" value="${esc(valor ?? '')}" ${op.attrs || ''}>${ajuda(op.ajuda)}</div>`;
const area = (rotulo, nome, valor, op = {}) => `<div class="campo"><label for="f-${nome}">${rotulo}</label><textarea id="f-${nome}" name="${nome}" rows="${op.linhas || 3}">${esc(valor ?? '')}</textarea>${ajuda(op.ajuda)}</div>`;
const seletor = (rotulo, nome, valor, opcoes, op = {}) => `<div class="campo"><label for="f-${nome}">${rotulo}</label><select id="f-${nome}" name="${nome}" ${op.attrs || ''}>${opcoes.map(([v, n]) => `<option value="${v}" ${v === valor ? 'selected' : ''}>${n}</option>`).join('')}</select>${ajuda(op.ajuda)}</div>`;
const chave = (rotulo, nome, marcado, op = {}) => `<label class="pn-chave"><input type="checkbox" name="${nome}" value="${op.valor || '1'}" ${marcado ? 'checked' : ''} ${op.attrs || ''}><span>${rotulo}${op.ajuda ? `<small>${op.ajuda}</small>` : ''}</span></label>`;
const fotoBloco = (rotulo, nome, valor, op = {}) => `<div class="pn-foto ${op.grande ? 'grande' : ''}" data-foto="${nome}">
    ${valor ? `<img src="${esc(valor)}" alt="">` : '<span class="pn-foto-vazia">Sem foto</span>'}
    <div><b>${rotulo}</b>${ajuda(op.ajuda)}
      <div class="pn-foto-acoes"><label class="btn btn-claro pn-btn-p pn-btn-foto">${valor ? 'Trocar foto' : 'Escolher foto'}<input class="pn-oculto" type="file" accept="image/*"></label>
      ${valor && op.opcional ? '<button class="pn-link pn-perigo" type="button" data-tirar-foto>Tirar</button>' : ''}</div>
    </div>
  </div>`;

// Foto do celular chega enorme: reduz e converte antes de guardar
async function prepararFoto(arquivo) {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  const bitmap = await createImageBitmap(arquivo);
  const limite = Banco.modo === 'local' ? 900 : 1400;
  const k = Math.min(1, limite / Math.max(bitmap.width, bitmap.height));
  const tela = document.createElement('canvas');
  tela.width = Math.round(bitmap.width * k);
  tela.height = Math.round(bitmap.height * k);
  tela.getContext('2d').drawImage(bitmap, 0, 0, tela.width, tela.height);
  return new Promise((ok, erro) => tela.toBlob((b) => (b ? ok(b) : erro(new Error('Não deu para converter a foto.'))), 'image/webp', 0.82));
}

const ETIQUETA = (r, exemplo) => campo('Etiqueta na foto', 'selo', r.selo, { ajuda: `Opcional. Ex.: ${exemplo}.` });
const chaveNaLoja = (r) => (eFixo(r.id) ? '' : chave('Mostrar na loja', 'ativo', r.ativo !== false, { ajuda: 'Desligue quando acabar o estoque. Nada é apagado.' }));

// O editor é dividido em partes: cada uma cabe na tela, sem rolar atrás das coisas.
// A foto fica junto da prévia: o que se troca é o que a cliente vê.
function capaDoItem(r, seg) {
  return `<aside class="pn-capa" data-foto="img">
    <small class="pn-previa-rotulo">Como aparece na loja</small>
    <div class="pn-previa-cartao">
      <span class="pn-previa-foto">${r.img ? `<img src="${esc(r.img)}" alt="">` : '<span class="pn-foto-vazia">Sem foto</span>'}</span>
      <div class="pn-previa-txt" id="previa-loja">${textoPrevia(r, seg)}</div>
    </div>
    <label class="btn btn-claro pn-btn-p pn-btn-foto">${r.img ? 'Trocar foto' : 'Escolher foto'}<input class="pn-oculto" type="file" accept="image/*"></label>
  </aside>`;
}

const parteCampos = (r, seg, exemplo, miolo, fim = '') => `<div class="pn-principal">
    ${capaDoItem(r, seg)}
    <section class="pn-card">
      ${campo('Nome', 'nome', r.nome, { attrs: `required placeholder="Ex.: ${exemplo}"` })}
      ${miolo}
      ${chaveNaLoja(r)}
      ${fim}
    </section>
  </div>`;

const camposPreco = (r, podeSemPreco) => `<div class="pn-precos">
      ${campo('Preço de venda', 'preco', precoTxt(r.preco), { attrs: 'inputmode="decimal" placeholder="Ex.: 369,99"', ajuda: podeSemPreco ? 'Deixe vazio se vende só nos combos.' : '' })}
      ${campo('Preço antigo', 'de', precoTxt(r.de), { attrs: 'inputmode="decimal" placeholder="Opcional"', ajuda: 'Aparece riscado. Só preencha se já foi cobrado de verdade.' })}
    </div>
    <p class="pn-previa-preco" id="previa-preco"></p>`;

function blocoExcluir(seg, id) {
  if (!id || eFixo(id)) return '';
  const combos = seg === 'produtos' ? usadoEmKits(id) : [];
  return `<div class="pn-excluir"><h3 class="pn-sub">Excluir</h3>${combos.length
    ? `<p class="pn-nota">Este produto faz parte de: ${esc(combos.join(', '))}. Tire do combo antes de excluir.</p>`
    : '<button class="pn-link pn-perigo" type="button" data-excluir-item>Excluir este item da loja</button>'}</div>`;
}

const campoBarbatanas = (r) => campo('Quantas barbatanas?', 'barbatanas', r.barbatanas, { tipo: 'number', attrs: 'inputmode="numeric" min="1"' });

// Cada parte: [identificador, nome na aba, conteúdo]
function partesProduto(r) {
  const { id } = estado.editor;
  const fixo = eFixo(id);
  return [
    ['principal', 'Preço e foto', parteCampos(r, 'produtos', 'Cinta Modeladora', `
      ${!id ? seletor('Tipo de produto', 'cat', r.cat, CATEGORIAS) : ''}
      ${!id && r.cat === 'cintas' ? campoBarbatanas(r) : ''}
      ${camposPreco(r, !fixo)}
      ${area('Descrição', 'desc', r.desc, { linhas: 4 })}`)],
    ['textos', 'Textos', `<section class="pn-card pn-duas">
      ${area('Principais vantagens', 'pontos', (r.pontos || []).join('\n'), { linhas: 5, ajuda: 'Uma em cada linha. Aparecem em lista na página do produto.' })}
      ${area('Como usar', 'uso', r.uso, { linhas: 5, ajuda: 'Opcional.' })}
      ${campo('Frase curta abaixo do nome', 'frase', r.frase, { ajuda: 'Opcional.' })}
      ${ETIQUETA(r, 'Mais firmeza')}
    </section>`],
    ['fotos', 'Mais fotos', `<section class="pn-card">
      <h2>Fotos da página do produto</h2>
      <div class="pn-fotos">
        ${(r.galeria || []).map((g, i) => `<div class="pn-fotos-item"><img src="${esc(g.src)}" alt=""><input name="g-${i}" value="${esc(g.txt || '')}" placeholder="Legenda (opcional)" aria-label="Legenda da foto ${i + 1}"><button class="pn-link pn-perigo" type="button" data-tirar-gal="${i}">Tirar</button></div>`).join('')}
        <label class="pn-foto-nova pn-btn-foto">Adicionar foto<input class="pn-oculto" type="file" accept="image/*" data-gal></label>
      </div>
      <h3 class="pn-sub">Segunda foto na vitrine</h3>
      ${fotoBloco('Segunda foto', 'img2', r.img2, { opcional: true, ajuda: 'Aparece ao passar o mouse, no computador.' })}
    </section>`],
    ['detalhes', 'Detalhes', `<section class="pn-card pn-duas">
      ${chave('A cliente escolhe o tamanho pela calça', 'tamanhos', r.tamanhos)}
      ${id && !fixo ? seletor('Tipo de produto', 'cat', r.cat, CATEGORIAS) : ''}
      ${id && r.cat === 'cintas' ? campoBarbatanas(r) : ''}
      ${campo('Nome curto', 'curto', r.curto, { ajuda: 'Opcional. Usado no pedido e nos combos. Vazio: usa o nome.' })}
      ${campo('Nome no plural', 'plural', r.plural, { ajuda: 'Opcional. Usado quando vêm 2 no combo. Ex.: Sutiãs reforçados.' })}
      ${blocoExcluir('produtos', id)}
    </section>`],
  ];
}

function resumoCombo(r) {
  const conta = {};
  (r.itens || []).forEach((i) => { conta[i] = (conta[i] || 0) + 1; });
  const nomes = Object.entries(conta).map(([i, n]) => {
    const p = estado.catalogo.produtos.find((x) => x.id === i);
    const nome = p?.curto || p?.nome || i;
    return n > 1 ? `${n} ${p?.plural || nome}` : nome;
  });
  return nomes.length ? `Vem: ${nomes.join(' + ')}` : 'Ainda não tem nenhum produto no combo.';
}

function partesKit(r) {
  const { id } = estado.editor;
  const conta = (p) => (r.itens || []).filter((i) => i === p).length;
  return [
    ['principal', 'Preço e foto', parteCampos(r, 'kits', 'Kit Completo', `
      ${camposPreco(r, false)}
      ${area('Descrição', 'desc', r.desc, { linhas: 4 })}`)],
    ['vem', 'O que vem', `<section class="pn-card pn-duas">
      <div class="pn-bloco"><h2>O que vem no combo</h2>
        <ul class="pn-compoe">${estado.catalogo.produtos.map((p) => `<li><img src="${esc(p.img)}" alt=""><span>${esc(p.curto || p.nome)}</span>
          <div class="qtd"><button type="button" data-kit="${esc(p.id)}" data-d="-1" aria-label="Menos ${esc(p.nome)}">−</button><span>${conta(p.id)}</span><button type="button" data-kit="${esc(p.id)}" data-d="1" aria-label="Mais ${esc(p.nome)}">+</button></div></li>`).join('')}</ul>
        <p class="pn-previa-preco">${esc(resumoCombo(r))}</p>
      </div>
      <div class="pn-bloco"><h2>A cliente escolhe mais um item?</h2>
        <p class="pn-nota">Opcional. Marque as opções; ela escolhe uma na hora de comprar.</p>
        ${estado.catalogo.produtos.map((p) => chave(esc(p.curto || p.nome), 'escolha', r.escolha?.includes(p.id), { valor: esc(p.id) })).join('')}
      </div>
    </section>`],
    ['mais', 'Mais opções', `<section class="pn-card pn-duas">
      ${ETIQUETA(r, 'Mais completo')}
      ${campo('Frase curta abaixo do nome', 'frase', r.frase, { ajuda: 'Opcional.' })}
      ${campo('Destaque na vitrine', 'gancho', r.gancho, { ajuda: 'Opcional. Vazio: mostra quanto a cliente economiza.' })}
      ${campo('Resumo do combo', 'sub', r.sub, { ajuda: 'Opcional. Ex.: Leve 5 produtos.' })}
      ${fotoBloco('Segunda foto na vitrine', 'img2', r.img2, { opcional: true, ajuda: 'Aparece ao passar o mouse, no computador.' })}
      ${blocoExcluir('kits', id)}
    </section>`],
  ];
}

function partesPraia(r) {
  const { id } = estado.editor;
  return [['principal', 'Peça', parteCampos(r, 'praia', 'Biquíni Cintura Alta', `
      <div class="pn-duas">
        <div class="pn-bloco"><h3 class="pn-sub">O que a peça valoriza</h3>
          ${FOCOS.map(([f, nome]) => chave(nome, 'foco', r.foco?.includes(f), { valor: f })).join('')}
          ${chave('É biquíni: entra no "Monte seu biquíni"', 'biquini', r.biquini, { ajuda: 'Top e calcinha em tamanhos diferentes.' })}
        </div>
        <div class="pn-bloco"><h3 class="pn-sub">Cores previstas</h3>
          <div class="pn-cores">${(r.cores || []).map((c, i) => `<div><input type="color" name="cor" value="${esc(c)}" aria-label="Cor ${i + 1}">${r.cores.length > 1 ? `<button class="pn-link pn-perigo" type="button" data-tirar-cor="${i}">Tirar</button>` : ''}</div>`).join('')}</div>
          ${(r.cores || []).length < 5 ? '<button class="pn-link pn-add" type="button" data-nova-cor>Adicionar cor</button>' : ''}
        </div>
      </div>
      ${ETIQUETA(r, 'Destaque')}`, blocoExcluir('praia', id))]];
}

// O que a cliente vai ver, atualizado enquanto se digita
function textoPrevia(r, seg) {
  const preco = Number.isFinite(r.preco) && r.preco > 0 ? r.preco : null;
  const falta = seg === 'produtos' && !eFixo(estado.editor.id) ? 'Vende só nos combos' : 'Falta o preço';
  const valores = seg === 'praia' ? '<span>Em breve</span>'
    : preco ? `${r.de > preco ? `<s>${brl(r.de)}</s>` : ''}<b>${brl(preco)}</b><small>${brl(preco * (1 - estado.catalogo.loja.pix))} no Pix</small>`
      : `<span>${falta}</span>`;
  return `${r.selo ? `<em>${esc(r.selo)}</em>` : ''}<h3>${esc(r.nome) || 'Nome do produto'}</h3>${valores}`;
}

function desenharEditor() {
  const ed = estado.editor;
  const { seg, id, r } = ed;
  const alvo = $('#aba');
  const partes = { produtos: partesProduto, kits: partesKit, praia: partesPraia }[seg](r);
  alvo.innerHTML = `
    <form id="editor" class="pn-form pn-form-produto" novalidate>
      <div class="pn-ed-topo">
        <button class="pn-voltar" type="button" data-voltar>${I.voltar}Voltar</button>
        <h1 class="pn-h1 pn-ed-nome">${id ? esc(r.nome) : SEGMENTOS[seg][1]}</h1>
        ${id && seg !== 'praia' ? `<a class="pn-link" href="produto.html?id=${esc(id)}" target="_blank" rel="noopener">Ver na loja</a>` : ''}
        <div class="pn-ed-salvar"><button class="btn btn-preto" type="submit">Salvar alterações</button></div>
        <p class="dica-tam erro pn-ed-erro" data-erro hidden></p>
      </div>
      ${partes.length > 1 ? `<div class="pn-filtros pn-filtros-justo" role="radiogroup" aria-label="Partes do produto">${partes.map(([a, nome]) => `<button class="chip" type="button" role="radio" data-parte="${a}" aria-checked="${a === ed.aba}">${nome}</button>`).join('')}</div>` : ''}
      ${partes.map(([a, , html]) => `<div class="pn-parte" data-painel="${a}" ${a === ed.aba ? '' : 'hidden'}>${html}</div>`).join('')}
    </form>`;
  ligarEditor(alvo);
}

function lerEditor() {
  const { seg, r } = estado.editor;
  const f = $('#editor');
  if (!f) return;
  const el = f.elements;
  const valor = (n) => el[n]?.value.trim() ?? '';
  const opcional = (k) => { if (el[k]) { if (valor(k)) r[k] = valor(k); else delete r[k]; } };
  const marcados = (n) => $$(`[name="${n}"]:checked`, f).map((x) => x.value);
  r.nome = valor('nome');
  opcional('selo');
  if (el.ativo) r.ativo = el.ativo.checked;
  if (seg === 'praia') {
    r.foco = marcados('foco');
    if (el.biquini.checked) r.biquini = true; else delete r.biquini;
    r.cores = $$('[name="cor"]', f).map((x) => x.value);
    return;
  }
  ['frase', 'desc'].forEach(opcional);
  r.preco = lerPreco(valor('preco'));
  const de = lerPreco(valor('de'));
  if (de === null || de === 0 || r.preco === null) delete r.de; else r.de = de;
  if (seg === 'kits') {
    ['sub', 'gancho'].forEach(opcional);
    const escolha = marcados('escolha');
    if (escolha.length) r.escolha = escolha; else delete r.escolha;
    return;
  }
  ['curto', 'plural', 'uso'].forEach(opcional);
  if (el.cat) r.cat = el.cat.value;
  if (el.barbatanas) { if (valor('barbatanas')) r.barbatanas = Number(valor('barbatanas')); else delete r.barbatanas; }
  r.pontos = valor('pontos').split('\n').map((x) => x.trim()).filter(Boolean);
  if (!r.pontos.length) delete r.pontos;
  if (el.tamanhos) { if (el.tamanhos.checked) r.tamanhos = true; else delete r.tamanhos; }
  (r.galeria || []).forEach((g, i) => { const t = valor(`g-${i}`); if (t) g.txt = t; else delete g.txt; });
}

// Devolve [mensagem, campo que precisa de atenção, parte do editor quando o problema não é num campo]
function validarEditor() {
  const { seg, id, r } = estado.editor;
  if (!r.nome) return ['Escreva o nome.', 'nome'];
  if (!r.img) return ['Escolha a foto principal.', null, 'principal'];
  if (seg === 'praia') return r.cores?.length ? null : ['Deixe pelo menos uma cor.'];
  const preco = problemaPreco(r, seg, r.preco, r.de ?? null);
  if (preco) return preco;
  if (!r.desc) return ['Escreva a descrição.', 'desc'];
  if (seg === 'kits' && !r.itens?.length) return ['Coloque pelo menos um produto no combo.', null, 'vem'];
  if (id === 'combo-duplo' && !r.escolha?.length) return ['O Combo Duplo precisa de pelo menos uma opção para a cliente escolher.', null, 'vem'];
  return null;
}

const paraId = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'item';
function idNovo(nome) {
  const usados = new Set([...estado.catalogo.produtos, ...estado.catalogo.kits, ...estado.catalogo.praia].map((x) => x.id));
  const base = paraId(nome);
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  return id;
}

// Preço não reescreve texto corrido: avisa quais textos citam valor para a pessoa conferir
function textosComValor(doc) {
  const achados = [];
  [...doc.produtos, ...doc.kits].forEach((x) => {
    const onde = [['frase', x.frase], ['destaque', x.gancho], ['descrição', x.desc], ['resumo', x.sub], ...(x.pontos || []).map((p) => ['vantagens', p])]
      .filter(([, t]) => t && /R\$\s?\d/.test(t)).map(([n]) => n);
    if (onde.length) achados.push(`${x.nome} (${[...new Set(onde)].join(', ')})`);
  });
  return achados;
}

function ligarEditor(alvo) {
  const form = $('#editor');
  const ed = estado.editor;
  const { seg, id } = ed;

  const irParaParte = (a) => {
    ed.aba = a;
    $$('[data-parte]', form).forEach((b) => b.setAttribute('aria-checked', b.dataset.parte === a));
    $$('[data-painel]', form).forEach((p) => { p.hidden = p.dataset.painel !== a; });
  };
  $$('[data-parte]', form).forEach((b) => b.addEventListener('click', () => irParaParte(b.dataset.parte)));

  // Conta do Pix, das parcelas e do desconto; e o cartão de como fica na loja
  const previaPreco = $('#previa-preco', form);
  const atualizarPrevias = () => {
    $('#previa-loja', form).innerHTML = textoPrevia(ed.r, seg);
    if (!previaPreco) return;
    const p = lerPreco(form.elements.preco.value);
    const de = lerPreco(form.elements.de.value);
    const { pix, parcelas } = estado.catalogo.loja;
    previaPreco.textContent = p > 0 ? `No Pix: ${brl(p * (1 - pix))} · Em até ${parcelas}x de ${brl(p / parcelas)}${de > p ? ` · ${Math.round((1 - p / de) * 100)}% de desconto` : ''}` : '';
  };
  atualizarPrevias();

  form.addEventListener('input', () => {
    ed.sujo = true;
    $('[data-erro]', form).hidden = true;
    lerEditor();
    atualizarPrevias();
  });
  $('[data-voltar]', alvo).addEventListener('click', () => {
    if (ed.sujo && !confirm('Sair sem salvar as alterações?')) return;
    estado.editor = null;
    abaProdutos(alvo);
    scrollTo(0, 0);
  });
  form.elements.cat?.addEventListener('change', () => {
    lerEditor();
    if (ed.r.cat === 'cintas') ed.r.tamanhos = true; else delete ed.r.tamanhos;
    ed.sujo = true;
    desenharEditor();
  });

  // Fotos
  const enviarFoto = async (arquivo, aoPronto) => {
    toast('Preparando a foto…');
    try {
      const url = await Banco.subirFoto(await prepararFoto(arquivo));
      lerEditor();
      aoPronto(url);
      ed.sujo = true;
      desenharEditor();
      toast('Foto pronta. Falta salvar.');
    } catch (e) { toast(`Não deu certo: ${e.message}`); }
  };
  $$('[data-foto] input[type=file]', form).forEach((inp) => inp.addEventListener('change', () => {
    const nome = inp.closest('[data-foto]').dataset.foto;
    if (!inp.files[0]) return;
    enviarFoto(inp.files[0], (url) => {
      // A página do produto abre pela galeria: a foto principal nova precisa aparecer lá também
      if (nome === 'img' && ed.r.galeria?.[0]?.src === ed.r.img) ed.r.galeria[0].src = url;
      ed.r[nome] = url;
    });
  }));
  $$('[data-tirar-foto]', form).forEach((b) => b.addEventListener('click', () => {
    lerEditor();
    delete ed.r[b.closest('[data-foto]').dataset.foto];
    ed.sujo = true;
    desenharEditor();
  }));
  $('[data-gal]', form)?.addEventListener('change', (e) => {
    if (e.target.files[0]) enviarFoto(e.target.files[0], (url) => { ed.r.galeria = [...(ed.r.galeria || []), { src: url }]; });
  });
  $$('[data-tirar-gal]', form).forEach((b) => b.addEventListener('click', () => {
    lerEditor();
    ed.r.galeria.splice(Number(b.dataset.tirarGal), 1);
    if (!ed.r.galeria.length) delete ed.r.galeria;
    ed.sujo = true;
    desenharEditor();
  }));

  // Combo: quantidade de cada produto
  $$('[data-kit]', form).forEach((b) => b.addEventListener('click', () => {
    lerEditor();
    const itens = ed.r.itens || [];
    if (Number(b.dataset.d) > 0) itens.push(b.dataset.kit);
    else if (itens.includes(b.dataset.kit)) itens.splice(itens.lastIndexOf(b.dataset.kit), 1);
    ed.r.itens = itens;
    ed.sujo = true;
    desenharEditor();
    $(`[data-kit="${b.dataset.kit}"][data-d="${b.dataset.d}"]`)?.focus();
  }));

  // Moda praia: cores
  $$('[data-tirar-cor]', form).forEach((b) => b.addEventListener('click', () => {
    lerEditor();
    ed.r.cores.splice(Number(b.dataset.tirarCor), 1);
    ed.sujo = true;
    desenharEditor();
  }));
  $('[data-nova-cor]', form)?.addEventListener('click', () => {
    lerEditor();
    ed.r.cores.push('#1F1A17');
    ed.sujo = true;
    desenharEditor();
  });

  $('[data-excluir-item]', form)?.addEventListener('click', async () => {
    if (!confirm(`Excluir "${ed.r.nome}" da loja? Isso não pode ser desfeito.`)) return;
    estado.catalogo[seg] = estado.catalogo[seg].filter((x) => x.id !== id);
    if (await salvarCatalogo('Item excluído')) {
      estado.editor = null;
      abaProdutos(alvo);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    lerEditor();
    const erro = $('[data-erro]', form);
    const problema = validarEditor();
    if (problema) {
      const [msg, nomeCampo, parte] = problema;
      erro.hidden = false;
      erro.textContent = msg;
      toast(msg);
      // O problema pode estar em outra parte do editor: leva a pessoa até ele
      const alvoCampo = nomeCampo && form.elements[nomeCampo];
      const destino = alvoCampo?.closest('[data-painel]')?.dataset.painel || parte;
      if (destino) irParaParte(destino);
      alvoCampo?.focus();
      return;
    }
    erro.hidden = true;
    const botao = $('button[type=submit]', form);
    botao.disabled = true;
    const lista = estado.catalogo[seg];
    const antes = id ? lista.find((x) => x.id === id) : null;
    const precoMudou = antes && (antes.preco !== ed.r.preco || antes.de !== ed.r.de);
    if (id) lista[lista.indexOf(antes)] = ed.r;
    else { ed.r.id = idNovo(ed.r.nome); lista.push(ed.r); }
    if (await salvarCatalogo(id ? salvoNaLoja() : 'Item criado')) {
      if (precoMudou) {
        const achados = textosComValor(estado.catalogo);
        estado.avisoValores = achados.length ? achados : null;
      }
      estado.editor = null;
      abaProdutos(alvo);
      scrollTo(0, 0);
    } else {
      botao.disabled = false;
    }
  });
}

// ---------------- Parceiras (cupons de influenciadoras) ----------------
// A cliente ganha desconto com o cupom e a parceira ganha comissão. A conta (desconto, comissão, quando libera,
// pagamento do mês) é toda do banco (seção Parcerias em schema.sql); aqui a Paola vê, aprova, edita e registra os pagamentos.
const STATUS_PARCEIRA = { pendente: ['Para aprovar', 'novo'], ativa: ['Ativa', 'pago'], pausada: ['Pausada', 'info'], recusada: ['Recusada', 'cancelado'] };
const etiquetaParceira = (s) => `<span class="pn-st pn-st-${(STATUS_PARCEIRA[s] || [])[1] || 'info'}">${esc((STATUS_PARCEIRA[s] || [s])[0])}</span>`;
const SITUACAO_COMISSAO = {
  aguardando: ['Aguardando pagamento', 'novo'], a_liberar: ['A liberar', 'enviado'], liberada: ['Liberada', 'pago'], paga: ['Paga', 'info'],
  cancelada: ['Cancelada', 'cancelado'], estornar: ['Descontar', 'alerta'], estornada: ['Descontada', 'info'],
};
const etiquetaComissao = (s) => `<span class="pn-st pn-st-${(SITUACAO_COMISSAO[s] || [])[1] || 'info'}">${esc((SITUACAO_COMISSAO[s] || [s])[0])}</span>`;
const ERROS_PARCEIRA = {
  nome: 'Escreva o nome.', email: 'Confira o e-mail.', cupom: 'O cupom pode ter só letras e números, de 3 a 20, sem espaço.',
  cupom_existe: 'Esse cupom já é de outra parceira.', existe: 'Esse e-mail já é de outra parceira.', sem_cupom: 'Para ativar, defina o cupom dela.',
  pct: 'Desconto e comissão vão de 0 a 50%.', status: 'Situação inválida.', nao_achou: 'Parceira não encontrada.',
};
const urlSite = (caminho) => new URL(caminho, location.origin).href;
const linkCadastroParceiras = () => urlSite('/parceira?cadastro=1');
const linkCupomParceira = (cupom) => urlSite(`/?cupom=${encodeURIComponent(cupom || '')}`);
const zapParaNumero = (tel, texto) => { const d = soNumeros(tel); return `https://wa.me/${d.length <= 11 ? `55${d}` : d}?text=${encodeURIComponent(texto)}`; };
const zapCompartilhar = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;
const diaDaData = (d) => new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const mesReferencia = () => { const t = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
async function copiarTexto(texto, aviso) {
  try { await navigator.clipboard.writeText(texto); toast(aviso); } catch (e) { toast('Não deu para copiar. Tente de novo.'); }
}
const brlSinal = (v) => (Number(v) < 0 ? `−${brl(-Number(v))}` : brl(v));

async function abaParceiras(alvo) {
  alvo.innerHTML = '<p class="pn-texto">Carregando as parceiras…</p>';
  let dados;
  try {
    dados = await Banco.parceiras();
  } catch (e) {
    alvo.innerHTML = `<div class="pn-cab"><h1 class="pn-h1">Parceiras</h1></div><section class="pn-card"><p class="pn-texto">Não deu para carregar: ${esc(e.message)}</p><button class="btn btn-claro pn-btn-p" type="button" data-de-novo>Tentar de novo</button></section>`;
    $('[data-de-novo]', alvo)?.addEventListener('click', () => abaParceiras(alvo));
    return;
  }
  estado.parceirasDados = dados;
  if (estado.parceiraAberta === 'nova') return editorParceira(alvo, null);
  const aberta = estado.parceiraAberta && dados.parceiras.find((x) => x.id === estado.parceiraAberta);
  if (aberta) return detalheParceira(alvo, aberta);
  estado.parceiraAberta = null;
  listaParceiras(alvo, dados);
}
const abrirParceira = (alvo, id) => { estado.parceiraAberta = id; scrollTo(0, 0); abaParceiras(alvo); };

function listaParceiras(alvo, dados) {
  const lista = dados.parceiras || [];
  const cfg = dados.config || {};
  const soma = (f) => lista.reduce((t, x) => t + Number(x.resumo?.[f] || 0), 0);
  const aPagar = lista.reduce((t, x) => t + Math.max(0, Number(x.resumo?.comissao_disponivel || 0)), 0);
  const quemAPagar = lista.filter((x) => Number(x.resumo?.comissao_disponivel || 0) > 0).length;
  const pendentes = lista.filter((x) => x.status === 'pendente');
  const outras = lista.filter((x) => x.status !== 'pendente');
  const ativas = lista.filter((x) => x.status === 'ativa').length;
  const prox = dados.proximo_pagamento ? diaDaData(dados.proximo_pagamento) : '—';
  const textoConvite = `Oi! Quer ser parceira da Paola Corpus Fit? Você ganha um cupom de desconto para as suas seguidoras e comissão em cada venda. Faça seu cadastro aqui: ${linkCadastroParceiras()}`;

  alvo.innerHTML = `
    <div class="pn-cab"><h1 class="pn-h1">Parceiras</h1><button class="btn btn-preto pn-btn-p" type="button" data-nova-parceira>${I.mais}Adicionar parceira</button></div>
    <p class="pn-nota pn-dica-lista">Cada parceira tem um cupom: a cliente ganha desconto e a parceira ganha comissão. Ela acompanha as vendas dela em ${esc(urlSite('/parceira').replace(/^https?:\/\//, ''))}.</p>
    <div class="pn-kpis">
      <div class="pn-card pn-kpi"><span class="pn-rotulo">Vendas com cupom</span><strong>${num(soma('vendas'))}</strong><small>${num(soma('vendas_mes'))} neste mês · ${num(soma('aguardando'))} aguardando pagamento</small></div>
      <div class="pn-card pn-kpi"><span class="pn-rotulo">Vendido pelas parceiras</span><strong>${brl(soma('vendido'))}</strong><small>produtos com desconto, sem frete</small></div>
      <div class="pn-card pn-kpi pn-kpi-pagar"><span class="pn-rotulo">A pagar agora</span><strong>${brl(aPagar)}</strong><small>${quemAPagar ? `${num(quemAPagar)} parceira${quemAPagar === 1 ? '' : 's'} · pagamento dia ${prox}` : `nada liberado · próximo dia ${prox}`}</small></div>
      <div class="pn-card pn-kpi"><span class="pn-rotulo">A liberar</span><strong>${brl(soma('comissao_a_liberar'))}</strong><small>${num(cfg.diasLiberacao ?? 30)} dias depois do pagamento</small></div>
      <div class="pn-card pn-kpi"><span class="pn-rotulo">Já pago às parceiras</span><strong>${brl(soma('comissao_recebida'))}</strong><small>${num((dados.pagamentos || []).length)} pagamento${(dados.pagamentos || []).length === 1 ? '' : 's'}</small></div>
      <div class="pn-card pn-kpi"><span class="pn-rotulo">Parceiras ativas</span><strong>${num(ativas)}</strong><small>${pendentes.length ? `${num(pendentes.length)} para aprovar` : 'nenhum cadastro esperando'}</small></div>
    </div>

    ${pendentes.length ? `<section class="pn-card pn-pc-pendentes"><h2>Cadastros para aprovar</h2>
      ${pendentes.map((x) => `<button class="pn-pc-linha" type="button" data-abrir-parceira="${esc(x.id)}">
        <span><b>${esc(x.nome)}</b><small>${esc(x.redes || '')}${x.telefone ? ` · ${esc(telefoneBonito(x.telefone))}` : ''}</small><small>Cadastro em ${dataCurta(x.criado_em)}${x.cupom ? ` · quer o cupom ${esc(x.cupom)}` : ''}</small></span>
        <span class="pn-pc-num">${etiquetaParceira(x.status)}<small>Ver e aprovar</small></span>
      </button>`).join('')}
    </section>` : ''}

    <section class="pn-card"><h2>Todas as parceiras</h2>
      ${outras.length ? outras.map((x) => {
        const r = x.resumo || {};
        const disp = Number(r.comissao_disponivel || 0);
        return `<button class="pn-pc-linha" type="button" data-abrir-parceira="${esc(x.id)}">
          <span><b>${esc(x.nome)} ${etiquetaParceira(x.status)}</b><small>Cupom ${esc(x.cupom || '—')} · ${x.desconto}% de desconto · ${x.comissao}% de comissão</small>
            <small>${num(r.vendas)} venda${Number(r.vendas) === 1 ? '' : 's'} · ${brl(r.vendido)} vendido${Number(r.aguardando) ? ` · ${num(r.aguardando)} aguardando` : ''}</small></span>
          <span class="pn-pc-num"><b class="${disp > 0 ? 'pn-pc-pagar' : ''}">${brlSinal(disp)}</b><small>a pagar · ${brl(r.comissao_a_liberar)} a liberar</small></span>
        </button>`;
      }).join('') : '<p class="pn-texto">Nenhuma parceira ainda. Adicione uma ou mande o link de cadastro.</p>'}
    </section>

    <section class="pn-card"><h2>Link de cadastro</h2>
      <p class="pn-texto">Mande para quem você quer convidar. Ela preenche os dados, cria a senha e o cadastro aparece aqui para você aprovar.</p>
      <p class="pn-pc-url">${esc(linkCadastroParceiras())}</p>
      <div class="pn-acoes">
        <button class="btn btn-claro pn-btn-p" type="button" data-copiar-cadastro>${I.copiar}Copiar link</button>
        <a class="btn btn-claro pn-btn-p" href="${esc(zapCompartilhar(textoConvite))}" target="_blank" rel="noopener">${I.whats}Enviar no WhatsApp</a>
      </div>
      ${cfg.cadastroAberto === false ? '<p class="pn-nota">O cadastro pelo link está <b>fechado</b>. Abra nas regras, logo abaixo.</p>' : ''}
    </section>

    <section class="pn-card"><h2>Pagamentos registrados</h2>
      ${(dados.pagamentos || []).length ? `<div class="pn-pc-pags">${dados.pagamentos.slice(0, 30).map((g) => `<div class="pn-pc-pag">
          <span><b>${esc(g.nome)}</b><small>${dataHora(g.pago_em)}${g.referencia ? ` · ${esc(g.referencia)}` : ''} · ${num(g.pedidos)} venda${g.pedidos === 1 ? '' : 's'}</small></span>
          <span class="pn-pc-num"><b>${brl(g.valor)}</b><button class="pn-link" type="button" data-desfazer="${esc(g.id)}" data-valor="${esc(g.valor)}" data-nome="${esc(g.nome)}">Desfazer</button></span>
        </div>`).join('')}</div>` : '<p class="pn-texto">Nenhum pagamento registrado ainda.</p>'}
    </section>

    <form class="pn-card pn-form" id="form-regras-parceiras" novalidate><h2>Regras do programa</h2>
      ${chave('Cadastro pelo link aberto', 'cadastroAberto', cfg.cadastroAberto !== false, { ajuda: 'Fechado, o link mostra que o cadastro está fechado. Você ainda pode adicionar parceiras aqui.' })}
      <div class="pn-2">
        ${campo('Comissão liberada depois de (dias)', 'diasLiberacao', cfg.diasLiberacao ?? 30, { tipo: 'number', attrs: 'inputmode="numeric" min="0" max="90"', ajuda: 'Conta do dia em que a cliente paga. Cubra o prazo de entrega e os 7 dias de arrependimento.' })}
        ${campo('Dia do pagamento no mês', 'diaPagamento', cfg.diaPagamento ?? 10, { tipo: 'number', attrs: 'inputmode="numeric" min="1" max="28"', ajuda: 'De 1 a 28. Aparece para as parceiras.' })}
      </div>
      <div class="pn-2">
        ${campo('Desconto padrão do cupom (%)', 'descontoPadrao', cfg.descontoPadrao ?? 10, { tipo: 'number', attrs: 'inputmode="numeric" min="0" max="50"', ajuda: 'Vale para quem se cadastra pelo link. Você muda para cada parceira.' })}
        ${campo('Comissão padrão (%)', 'comissaoPadrao', cfg.comissaoPadrao ?? 10, { tipo: 'number', attrs: 'inputmode="numeric" min="0" max="50"', ajuda: 'Sobre os produtos com desconto, sem o frete.' })}
      </div>
      <p class="dica-tam erro" data-erro hidden></p>
      <button class="btn btn-preto pn-btn-p" type="submit">Salvar regras</button>
    </form>`;

  $('[data-nova-parceira]', alvo).addEventListener('click', () => abrirParceira(alvo, 'nova'));
  $$('[data-abrir-parceira]', alvo).forEach((b) => b.addEventListener('click', () => abrirParceira(alvo, b.dataset.abrirParceira)));
  $('[data-copiar-cadastro]', alvo).addEventListener('click', () => copiarTexto(linkCadastroParceiras(), 'Link de cadastro copiado'));
  $$('[data-desfazer]', alvo).forEach((b) => b.addEventListener('click', () => desfazerPagamento(alvo, b)));
  const form = $('#form-regras-parceiras', alvo);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const el = form.elements;
    const erro = $('[data-erro]', form);
    const inteiro = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };
    const regras = {
      cadastroAberto: el.cadastroAberto.checked,
      diasLiberacao: inteiro(el.diasLiberacao.value, 0, 90),
      diaPagamento: inteiro(el.diaPagamento.value, 1, 28),
      descontoPadrao: inteiro(el.descontoPadrao.value, 0, 50),
      comissaoPadrao: inteiro(el.comissaoPadrao.value, 0, 50),
    };
    const falta = Object.entries(regras).find(([, v]) => v === null);
    if (falta) { erro.hidden = false; erro.textContent = 'Dias de 0 a 90, dia do pagamento de 1 a 28 e porcentagens de 0 a 50.'; return; }
    erro.hidden = true;
    estado.catalogo.loja = { ...estado.catalogo.loja, parcerias: regras };
    if (await salvarCatalogo('Regras das parceiras salvas')) abaParceiras(alvo);
  });
}

async function desfazerPagamento(alvo, botao) {
  if (!confirm(`Desfazer o pagamento de ${brl(botao.dataset.valor)} para ${botao.dataset.nome}? As vendas voltam para "liberada". Use só se registrou por engano.`)) return;
  botao.disabled = true;
  try {
    const r = await Banco.desfazerPagamentoParceira(botao.dataset.desfazer);
    toast(r.ok ? 'Pagamento desfeito' : 'Esse pagamento não existe mais');
    abaParceiras(alvo);
  } catch (e) {
    botao.disabled = false;
    toast(`Não desfez: ${e.message}`);
  }
}

function formParceiraHTML(x, cfg) {
  const novo = !x;
  const p = x || { status: 'ativa', desconto: cfg.descontoPadrao ?? 10, comissao: cfg.comissaoPadrao ?? 10 };
  const status = p.status === 'pendente' ? 'ativa' : p.status;
  return `<form class="pn-card pn-form" id="form-parceira" novalidate><h2>${novo ? 'Dados da parceira' : 'Dados e cupom'}</h2>
    <div class="pn-2">${campo('Nome', 'nome', p.nome || '', { attrs: 'autocomplete="off" maxlength="120" required' })}${campo('E-mail', 'email', p.email || '', { tipo: 'email', attrs: 'autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="120" required', ajuda: novo ? 'É o login dela na área da parceira.' : '' })}</div>
    <div class="pn-2">${campo('WhatsApp', 'telefone', p.telefone ? telefoneBonito(p.telefone) : '', { tipo: 'tel', attrs: 'inputmode="tel" placeholder="(21) 99999-9999" autocomplete="off"' })}${campo('Instagram ou TikTok', 'redes', p.redes || '', { attrs: 'placeholder="@perfil" maxlength="200" autocomplete="off"' })}</div>
    ${campo('Chave Pix (para pagar as comissões)', 'pix', p.pix || '', { attrs: 'maxlength="140" autocomplete="off"' })}
    <div class="pn-3">
      ${campo('Cupom', 'cupom', p.cupom || '', { attrs: 'maxlength="20" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="MARIA10"', ajuda: 'Só letras e números.' })}
      ${campo('Desconto da cliente (%)', 'desconto', p.desconto, { tipo: 'number', attrs: 'inputmode="numeric" min="0" max="50"' })}
      ${campo('Comissão dela (%)', 'comissao', p.comissao, { tipo: 'number', attrs: 'inputmode="numeric" min="0" max="50"', ajuda: 'Sobre os produtos com desconto, sem frete.' })}
    </div>
    ${seletor('Situação', 'status', status, [['ativa', 'Ativa: o cupom dá desconto'], ['pausada', 'Pausada: o cupom não dá desconto'], ['pendente', 'Para aprovar'], ['recusada', 'Recusada']], { ajuda: 'Mudar desconto ou comissão vale para as próximas vendas. As vendas já feitas ficam como foram.' })}
    ${area('Anotação (só aparece aqui)', 'observacao', p.observacao || '', { linhas: 2 })}
    <p class="dica-tam erro" data-erro hidden></p>
    <div class="pn-acoes"><button class="btn btn-preto pn-btn-p" type="submit">${novo ? 'Adicionar parceira' : x.status === 'pendente' ? 'Aprovar com estes dados' : 'Salvar'}</button>
      ${x && x.status === 'pendente' ? '<button class="pn-link pn-perigo" type="button" data-recusar>Recusar cadastro</button>' : ''}</div>
  </form>`;
}

function ligarFormParceira(alvo, x) {
  const form = $('#form-parceira', alvo);
  const el = form.elements;
  el.telefone.addEventListener('input', () => { el.telefone.value = mascaraTelefone(el.telefone.value); });
  el.cupom.addEventListener('input', () => { el.cupom.value = el.cupom.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  const salvar = async (status, botao) => {
    const erro = $('[data-erro]', form);
    const dados = {
      id: x?.id || null,
      nome: el.nome.value.trim(), email: el.email.value.trim(), telefone: soNumeros(el.telefone.value), redes: el.redes.value.trim(),
      pix: el.pix.value.trim(), cupom: el.cupom.value.trim(), desconto: Number(el.desconto.value), comissao: Number(el.comissao.value),
      status, observacao: el.observacao.value.trim(),
    };
    if (!Number.isInteger(dados.desconto) || !Number.isInteger(dados.comissao)) { erro.hidden = false; erro.textContent = ERROS_PARCEIRA.pct; return; }
    botao.disabled = true;
    try {
      const r = await Banco.salvarParceira(dados);
      if (!r.ok) { erro.hidden = false; erro.textContent = ERROS_PARCEIRA[r.erro] || 'Não salvou. Confira os dados.'; botao.disabled = false; return; }
      toast(x ? (x.status === 'pendente' && status === 'ativa' ? 'Parceira aprovada' : 'Parceira salva') : 'Parceira adicionada');
      abrirParceira(alvo, r.id);
    } catch (e) {
      botao.disabled = false;
      erro.hidden = false;
      erro.textContent = `Não salvou: ${e.message}`;
    }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); salvar(el.status.value, $('button[type=submit]', form)); });
  $('[data-recusar]', form)?.addEventListener('click', (e) => { if (confirm('Recusar este cadastro? Ela vê que não foi aprovado.')) salvar('recusada', e.currentTarget); });
}

function editorParceira(alvo, x) {
  const cfg = estado.parceirasDados?.config || {};
  alvo.innerHTML = `<button class="pn-voltar" type="button" data-voltar>${I.voltar}Voltar para as parceiras</button>
    <div class="pn-cab"><h1 class="pn-h1">Nova parceira</h1></div>
    <p class="pn-nota pn-dica-lista">Depois de adicionar, gere o link de acesso e mande para ela criar a senha da área da parceira.</p>
    ${formParceiraHTML(x, cfg)}`;
  $('[data-voltar]', alvo).addEventListener('click', () => abrirParceira(alvo, null));
  ligarFormParceira(alvo, x);
  $('#f-nome', alvo).focus();
}

async function detalheParceira(alvo, x) {
  const cfg = estado.parceirasDados?.config || {};
  const r = x.resumo || {};
  const disp = Number(r.comissao_disponivel || 0);
  const prox = estado.parceirasDados?.proximo_pagamento ? diaDaData(estado.parceirasDados.proximo_pagamento) : '—';
  const pags = (estado.parceirasDados?.pagamentos || []).filter((g) => g.parceira_id === x.id);
  alvo.innerHTML = `<button class="pn-voltar" type="button" data-voltar>${I.voltar}Voltar para as parceiras</button>
    <div class="pn-cab"><h1 class="pn-h1">${esc(x.nome)}</h1>${etiquetaParceira(x.status)}</div>
    <p class="pn-nota pn-dica-lista">${esc(x.redes || '')}${x.telefone ? ` · ${esc(telefoneBonito(x.telefone))}` : ''} · ${esc(x.email)} · ${x.origem === 'manual' ? 'adicionada por você' : 'cadastro pelo link'} em ${dataCurta(x.criado_em)}</p>
    ${x.status === 'pendente' ? '<p class="pn-modo"><b>Cadastro esperando você.</b> Confira o perfil dela, defina o cupom, o desconto e a comissão, e aprove no fim da página.</p>' : ''}

    ${x.status !== 'pendente' ? `<div class="pn-kpis">
      <div class="pn-card pn-kpi"><span class="pn-rotulo">Vendas confirmadas</span><strong>${num(r.vendas)}</strong><small>${num(r.vendas_mes)} neste mês · ${num(r.aguardando)} aguardando · ${num(r.canceladas)} cancelada${Number(r.canceladas) === 1 ? '' : 's'}</small></div>
      <div class="pn-card pn-kpi"><span class="pn-rotulo">Vendido com o cupom</span><strong>${brl(r.vendido)}</strong><small>produtos com desconto, sem frete</small></div>
      <div class="pn-card pn-kpi pn-kpi-pagar"><span class="pn-rotulo">A pagar agora</span><strong>${brlSinal(disp)}</strong><small>${Number(r.comissao_estornar) > 0 ? `já descontados ${brl(r.comissao_estornar)} de devoluções` : `pagamento dia ${prox}`}</small></div>
      <div class="pn-card pn-kpi"><span class="pn-rotulo">A liberar</span><strong>${brl(r.comissao_a_liberar)}</strong><small>+ ${brl(r.comissao_aguardando)} se os pedidos em aberto forem pagos</small></div>
      <div class="pn-card pn-kpi"><span class="pn-rotulo">Já recebeu</span><strong>${brl(r.comissao_recebida)}</strong><small>${num(pags.length)} pagamento${pags.length === 1 ? '' : 's'}</small></div>
    </div>

    <section class="pn-card"><h2>Pagamento do mês</h2>
      ${disp > 0 ? `<p class="pn-texto">Faça o Pix de <b>${brl(disp)}</b> para ${esc(x.nome.split(' ')[0])} e depois registre aqui. As vendas liberadas passam para "paga" e ela vê o pagamento na área dela.</p>
        ${x.pix ? `<p class="pn-pc-url">Pix: ${esc(x.pix)}</p>` : '<p class="pn-nota">Ela ainda não informou a chave Pix. Peça para ela, ou anote nos dados abaixo.</p>'}
        <div class="pn-acoes">${x.pix ? `<button class="btn btn-claro pn-btn-p" type="button" data-copiar-pix>${I.copiar}Copiar Pix</button>` : ''}<button class="btn btn-preto pn-btn-p" type="button" data-pagar>Registrar pagamento de ${brl(disp)}</button></div>`
        : disp < 0 ? `<p class="pn-texto">Há ${brl(-disp)} a descontar de vendas devolvidas depois de pagas. Sai do próximo pagamento, quando houver comissão liberada.</p>`
          : `<p class="pn-texto">Nada liberado para pagar agora. ${Number(r.comissao_a_liberar) > 0 ? `${brl(r.comissao_a_liberar)} ainda estão no prazo de troca e liberam ${num(cfg.diasLiberacao ?? 30)} dias depois de cada pagamento.` : ''}</p>`}
    </section>` : ''}

    <section class="pn-card"><h2>Acesso e divulgação</h2>
      <p class="pn-texto">${x.tem_senha ? 'Ela já tem senha da área da parceira.' : '<b>Ela ainda não criou a senha.</b> Gere o link de acesso e mande para ela.'} Se ela esquecer a senha, gere um link novo: vale 7 dias e funciona uma vez.</p>
      <div class="pn-acoes"><button class="btn btn-claro pn-btn-p" type="button" data-gerar-link>Gerar link de acesso</button>
        ${x.cupom ? `<button class="btn btn-claro pn-btn-p" type="button" data-copiar-divulgacao>${I.copiar}Copiar link de divulgação</button>` : ''}</div>
      <div id="link-acesso-parceira" class="pn-link-senha" hidden></div>
      ${x.cupom ? `<p class="pn-nota">Link de divulgação dela: ${esc(linkCupomParceira(x.cupom).replace(/^https?:\/\//, ''))}. Quem abre por ele já entra com o cupom.</p>` : ''}
    </section>

    ${x.status !== 'pendente' ? `<section class="pn-card"><h2>Vendas com o cupom</h2><div id="vendas-parceira"><p class="pn-texto">Carregando as vendas…</p></div></section>` : ''}

    ${pags.length ? `<section class="pn-card"><h2>Pagamentos</h2><div class="pn-pc-pags">${pags.map((g) => `<div class="pn-pc-pag">
        <span><b>${brl(g.valor)}</b><small>${dataHora(g.pago_em)}${g.referencia ? ` · ${esc(g.referencia)}` : ''} · ${num(g.pedidos)} venda${g.pedidos === 1 ? '' : 's'}</small></span>
        <span class="pn-pc-num"><button class="pn-link" type="button" data-desfazer="${esc(g.id)}" data-valor="${esc(g.valor)}" data-nome="${esc(x.nome)}">Desfazer</button></span>
      </div>`).join('')}</div></section>` : ''}

    ${formParceiraHTML(x, cfg)}
    ${Number(r.vendas) + Number(r.aguardando) + Number(r.canceladas) === 0 && !pags.length ? '<div class="pn-acoes pn-espaco"><button class="pn-link pn-perigo" type="button" data-excluir-parceira>Excluir parceira</button></div>' : ''}`;

  $('[data-voltar]', alvo).addEventListener('click', () => abrirParceira(alvo, null));
  ligarFormParceira(alvo, x);
  $$('[data-desfazer]', alvo).forEach((b) => b.addEventListener('click', () => desfazerPagamento(alvo, b)));
  $('[data-copiar-pix]', alvo)?.addEventListener('click', () => copiarTexto(x.pix, 'Chave Pix copiada'));
  $('[data-copiar-divulgacao]', alvo)?.addEventListener('click', () => copiarTexto(linkCupomParceira(x.cupom), 'Link de divulgação copiado'));
  $('[data-pagar]', alvo)?.addEventListener('click', async (e) => {
    const ref = prompt('Referência do pagamento (ela vê na área dela):', mesReferencia());
    if (ref === null) return;
    if (!confirm(`Confirma que já fez o Pix de ${brl(disp)} para ${x.nome}?`)) return;
    const botao = e.currentTarget;
    botao.disabled = true;
    try {
      const res = await Banco.pagarParceira(x.id, ref.trim(), null);
      if (!res.ok) {
        botao.disabled = false;
        toast(res.erro === 'negativo' ? 'As devoluções são maiores que o liberado. Nada a pagar agora.' : res.erro === 'nada' ? 'Nada liberado para pagar.' : 'Não registrou.');
        return abaParceiras(alvo);
      }
      toast(`Pagamento de ${brl(res.valor)} registrado`);
      abaParceiras(alvo);
    } catch (ex) {
      botao.disabled = false;
      toast(`Não registrou: ${ex.message}`);
    }
  });
  $('[data-gerar-link]', alvo).addEventListener('click', async (e) => {
    const botao = e.currentTarget;
    botao.disabled = true;
    try {
      const res = await Banco.linkParceira(x.id);
      if (!res.ok) throw new Error('parceira não encontrada');
      const link = urlSite(`/parceira?nova=${res.codigo}`);
      const texto = `Oi, ${x.nome.split(' ')[0]}! Este é o seu acesso à área de parceira da Paola Corpus Fit. Crie sua senha por este link (vale 7 dias): ${link}`;
      const caixa = $('#link-acesso-parceira', alvo);
      caixa.hidden = false;
      caixa.innerHTML = `<p class="pn-nota">Link criado. Vale 7 dias e funciona uma vez.</p><p class="pn-pc-url">${esc(link)}</p>
        <div class="pn-acoes"><button class="btn btn-claro pn-btn-p" type="button" data-copiar-acesso>${I.copiar}Copiar mensagem</button>
        ${x.telefone ? `<a class="btn btn-preto pn-btn-p" href="${esc(zapParaNumero(x.telefone, texto))}" target="_blank" rel="noopener">${I.whats}Mandar no WhatsApp dela</a>` : ''}</div>`;
      $('[data-copiar-acesso]', caixa).addEventListener('click', () => copiarTexto(texto, 'Mensagem copiada'));
    } catch (ex) {
      toast(`Não gerou o link: ${ex.message}`);
    }
    botao.disabled = false;
  });
  $('[data-excluir-parceira]', alvo)?.addEventListener('click', async () => {
    if (!confirm(`Excluir ${x.nome}? Ela perde o acesso e o cupom deixa de existir.`)) return;
    try {
      const res = await Banco.excluirParceira(x.id);
      if (!res.ok) { toast('Ela já tem vendas ou pagamentos: em vez de excluir, pause.'); return; }
      toast('Parceira excluída');
      abrirParceira(alvo, null);
    } catch (ex) { toast(`Não excluiu: ${ex.message}`); }
  });

  const caixaVendas = $('#vendas-parceira', alvo);
  if (!caixaVendas) return;
  try {
    const vendas = await Banco.parceiraVendas(x.id);
    if (!caixaVendas.isConnected) return;
    caixaVendas.innerHTML = vendas.length ? `<div class="pn-pc-pags">${vendas.map((v) => `<div class="pn-pc-pag">
        <span><b><button class="pn-link" type="button" data-ir-pedido="${esc(v.id)}">${esc(v.numero)}</button> · ${esc(v.nome)}</b>
          <small>${dataHora(v.em)} · ${esc([v.cidade, v.uf].filter(Boolean).join('/'))} · ${esc(v.pagamento || '')} · ${esc((STATUS[v.status] || [v.status])[0])}</small>
          <small>Produtos ${brl(v.produtos)}${Number(v.desconto) > 0 ? ` (desconto ${brl(v.desconto)})` : ''}${v.situacao === 'a_liberar' && v.libera_em ? ` · libera ${dataCurta(v.libera_em)}` : ''}</small></span>
        <span class="pn-pc-num"><b>${brl(v.comissao)}</b>${etiquetaComissao(v.situacao)}</span>
      </div>`).join('')}</div>` : '<p class="pn-texto">Nenhuma venda com o cupom ainda.</p>';
    $$('[data-ir-pedido]', caixaVendas).forEach((b) => b.addEventListener('click', () => {
      estado.abrirPedido = b.dataset.irPedido;
      estado.filtro = 'todos';
      location.hash = '#pedidos';
    }));
  } catch (e) {
    caixaVendas.innerHTML = `<p class="pn-texto">Não deu para carregar as vendas: ${esc(e.message)}</p>`;
  }
}

// ---------------- Frete pelo CEP ----------------
// Sem cadastro em transportadora: a cliente digita o CEP e o site mostra o valor e o prazo da faixa dela.
// As faixas vão pela distância entre a capital do estado de onde os pedidos saem e a do estado da cliente (js/frete.js)
const freteDaLoja = (l) => {
  const f = l.frete || {};
  const faixas = Frete.LIMITES.map((_, i) => ({ valor: null, dias: null, ...(f.faixas?.[i] || {}) }));
  return { ligado: f.ligado === true, cepOrigem: f.cepOrigem || '', faixas };
};
const linhaFaixa = (fx, i, estados, origem) => `<div class="pn-frete-faixa" data-faixa="${i}">
    <p class="pn-frete-nome"><b>${Frete.nomeFaixa(i, origem)}</b><small data-estados>${estados.length ? estados.join(', ') : 'Nenhum estado'}</small></p>
    <div class="pn-2">
      ${campo('Frete (R$)', `freteValor${i}`, precoTxt(fx.valor), { attrs: 'inputmode="decimal" autocomplete="off" placeholder="Ex.: 29,80"' })}
      ${campo('Prazo (dias úteis)', `freteDias${i}`, fx.dias ?? '', { tipo: 'number', attrs: 'inputmode="numeric" min="1" max="60" placeholder="Ex.: 6"' })}
    </div>
  </div>`;
function secaoFrete(l) {
  const f = freteDaLoja(l);
  const estados = Frete.estadosPorFaixa(f.cepOrigem);
  const origem = Frete.uf(f.cepOrigem);
  return `<section class="pn-card" id="secao-frete"><h2>Frete</h2>
      <p class="pn-texto">A cliente digita o CEP no produto, no carrinho ou ao finalizar, e o site mostra o frete e o prazo. Não precisa de cadastro nos Correios: o valor sai desta tabela, pela distância entre o seu estado e o dela. O frete entra no total e é cobrado junto com o pedido. Acima de "Frete grátis acima de", ela não paga frete.</p>
      ${chave('Calcular o frete pelo CEP', 'freteLigado', f.ligado, { ajuda: 'Só liga com todas as faixas preenchidas. Desligado, a loja segue como antes, sem cobrar frete.' })}
      ${campo('CEP de onde os pedidos saem', 'freteCep', f.cepOrigem ? `${f.cepOrigem.slice(0, 5)}-${f.cepOrigem.slice(5)}` : '', { attrs: 'inputmode="numeric" placeholder="00000-000" maxlength="9"' })}
      ${campo('Prazo para postar (dias úteis depois do pagamento)', 'prazoPostagem', Number.isInteger(l.prazoPostagem) ? l.prazoPostagem : '', { tipo: 'number', attrs: 'inputmode="numeric" min="0" max="15" placeholder="Ex.: 2"', ajuda: 'Aparece para a cliente e soma no prazo de entrega: "chega em até X dias úteis depois do pagamento". Vazio: o site mostra o prazo só depois da postagem.' })}
      <p class="pn-nota">Como preencher: no <a href="https://www2.correios.com.br/sistemas/precosPrazos/" target="_blank" rel="noopener">simulador de preços e prazos dos Correios</a>, simule do seu CEP para um CEP de cada faixa, com o peso e a caixa que você usa. Use o valor e o prazo que aparecem. O prazo conta a partir da postagem.</p>
      <div id="faixas-frete">${f.faixas.map((fx, i) => linhaFaixa(fx, i, estados[i], origem)).join('')}</div>
    </section>`;
}
// Ao trocar o CEP de origem, cada faixa mostra na hora os estados que passa a cobrir
function ligarSecaoFrete(form) {
  const cep = form.elements.freteCep;
  cep.addEventListener('input', () => {
    const d = soNumeros(cep.value).slice(0, 8);
    cep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    const estados = Frete.estadosPorFaixa(d);
    const origem = Frete.uf(d);
    $$('[data-faixa]', form).forEach((linha, i) => {
      $('.pn-frete-nome b', linha).textContent = Frete.nomeFaixa(i, origem);
      $('[data-estados]', linha).textContent = estados[i].length ? estados[i].join(', ') : 'Nenhum estado';
    });
  });
}
// Lê a seção. Devolve { frete } ou { erro }
function lerSecaoFrete(form) {
  const el = form.elements;
  const ligado = el.freteLigado.checked;
  const cepOrigem = soNumeros(el.freteCep.value);
  const estados = Frete.estadosPorFaixa(cepOrigem);
  const faixas = Frete.LIMITES.map((_, i) => {
    const valor = lerPreco(el[`freteValor${i}`].value);
    const dias = el[`freteDias${i}`].value.trim() === '' ? null : Number(el[`freteDias${i}`].value);
    return { valor: valor === null || Number.isNaN(valor) ? null : valor, dias: Number.isInteger(dias) && dias > 0 ? dias : null, ufs: estados[i] };
  });
  if (cepOrigem && !Frete.uf(cepOrigem)) return { erro: 'Confira o CEP de onde os pedidos saem: são 8 números.' };
  if (ligado) {
    if (!Frete.uf(cepOrigem)) return { erro: 'Para calcular o frete, preencha o CEP de onde os pedidos saem.' };
    const falta = faixas.findIndex((x, i) => estados[i].length && (x.valor === null || x.dias === null));
    if (falta >= 0) return { erro: `Para calcular o frete, preencha o frete e o prazo da faixa "${Frete.nomeFaixa(falta, Frete.uf(cepOrigem))}".` };
  }
  // Faixa sem nenhum estado não é usada: fica com zero para a tabela valer inteira
  return { frete: { ligado, cepOrigem, faixas: faixas.map((x) => (x.ufs.length ? x : { ...x, valor: x.valor ?? 0, dias: x.dias ?? 1 })) } };
}

// ---------------- Aba Loja ----------------
function abaLoja(alvo) {
  const l = estado.catalogo.loja;
  const rem = estado.catalogo.remetente || {};
  const pg = estado.catalogo.pagamento || {};
  const local = Banco.modo === 'local';
  alvo.innerHTML = `
    <div class="pn-cab"><h1 class="pn-h1">Loja</h1></div>
    ${local ? '' : '<div class="pn-aviso-caixa pn-espaco" id="aviso-loja"></div>'}
    <form id="form-loja" class="pn-form" novalidate>
      <section class="pn-card"><h2>Contato</h2>
        ${campo('Número do WhatsApp', 'whatsappNumero', l.whatsappNumero, { attrs: 'inputmode="numeric" placeholder="5521999999999"', ajuda: 'Só números, com 55 e DDD. Com ele, o pedido já abre escrito na conversa.' })}
        ${campo('Link do WhatsApp', 'whatsapp', l.whatsapp, { tipo: 'url' })}
        <div class="pn-2">
          ${campo('Instagram (link)', 'instagram', l.instagram, { tipo: 'url' })}
          ${campo('Instagram (arroba)', 'arroba', l.arroba)}
        </div>
        ${campo('Link dos antes e depois', 'antesDepois', l.antesDepois, { tipo: 'url' })}
        ${campo('Cidade de envio', 'cidade', l.cidade)}
      </section>
      <section class="pn-card"><h2>Vendas</h2>
        <div class="pn-2">
          ${campo('Frete grátis acima de', 'freteGratis', precoTxt(l.freteGratis), { attrs: 'inputmode="decimal"' })}
          ${campo('Desconto no Pix (%)', 'pixPct', precoTxt(Math.round(l.pix * 1000) / 10), { attrs: 'inputmode="decimal"' })}
        </div>
        <div class="pn-2">
          ${campo('Parcelas sem juros', 'parcelas', l.parcelas, { tipo: 'number', attrs: 'inputmode="numeric" min="1" max="24"', ajuda: 'Você paga os juros. Use o mesmo número do "parcelado vendedor" do Mercado Pago.' })}
          ${campo('Parcela no máximo em', 'parcelasMax', Math.max(l.parcelas, Number(l.parcelasMax) || l.parcelas), { tipo: 'number', attrs: 'inputmode="numeric" min="1" max="24"', ajuda: 'Acima das parcelas sem juros, a cliente paga os juros.' })}
        </div>
        ${campo('Lançamento da moda praia', 'lancamentoPraia', (l.lancamentoPraia || '').slice(0, 16), { tipo: 'datetime-local', ajuda: 'Vazio: a contagem regressiva não aparece. Só use data real.' })}
      </section>
      ${secaoFrete(l)}
      ${local ? '' : `<section class="pn-card"><h2>Pagamento online (Mercado Pago)</h2>
        <p class="pn-texto" id="situacao-pagamento">Conferindo a ligação com o Mercado Pago…</p>
        ${seletor('Como a cliente paga', 'pgModo', pg.modo || 'desligado', [
          ['desligado', 'Combinando com você no WhatsApp, como hoje'],
          ['link', 'Pelo link que você gera no pedido e manda no WhatsApp'],
          ['site', 'Aqui no site, logo depois de fazer o pedido'],
        ])}
        <h3 class="pn-sub">Dados da loja no rodapé do site</h3>
        <p class="pn-nota">Para vender pela internet, a lei pede nome, CPF ou CNPJ e endereço à vista no site (Decreto 7.962/2013). Obrigatório para cobrar no site.</p>
        ${campo('Nome ou razão social', 'empresa', l.empresa)}
        <div class="pn-2">${campo('CNPJ ou CPF', 'documento', l.documento, { attrs: 'inputmode="numeric"' })}${campo('E-mail de contato', 'email', l.email, { tipo: 'email' })}</div>
        ${campo('Endereço que aparece no site', 'enderecoLoja', l.enderecoLoja, { ajuda: 'Pode ser o endereço comercial. Aparece para qualquer pessoa.' })}
      </section>`}
      <section class="pn-card"><h2>Endereço de envio</h2>
        <p class="pn-texto">De onde saem os pedidos. Aparece só na etiqueta impressa, nunca na loja.</p>
        ${campo('Nome de quem envia', 'remNome', rem.nome || 'Paola Corpus Fit')}
        ${campo('CEP', 'remCep', rem.cep, { attrs: 'inputmode="numeric" placeholder="00000-000" maxlength="9"' })}
        ${campo('Rua', 'remRua', rem.rua)}
        <div class="pn-2">${campo('Número', 'remNum', rem.num)}${campo('Complemento', 'remComplemento', rem.complemento)}</div>
        ${campo('Bairro', 'remBairro', rem.bairro)}
        <div class="pn-2">${campo('Cidade', 'remCidade', rem.cidade)}${campo('UF', 'remUf', rem.uf, { attrs: 'maxlength="2" autocapitalize="characters"' })}</div>
        ${campo('Telefone', 'remTelefone', rem.telefone ? telefoneBonito(rem.telefone) : '', { tipo: 'tel', attrs: 'inputmode="tel" placeholder="(21) 99999-9999"', ajuda: 'Opcional.' })}
      </section>
      <section class="pn-card"><h2>Tabela de tamanhos</h2>
        <p class="pn-texto">O número de calça que cada tamanho veste. Vale para toda a loja.</p>
        <div id="tabela-tam">${estado.catalogo.tabela.map(linhaTamanho).join('')}</div>
        <button class="pn-link pn-add" type="button" data-novo-tam>Adicionar tamanho</button>
      </section>
      <div class="pn-salvar"><p class="dica-tam erro" data-erro hidden></p><button class="btn btn-preto btn-bloco" type="submit">Salvar dados da loja</button></div>
    </form>

    <section class="pn-card pn-espaco"><h2>Conexão com o banco</h2>
      ${local ? `<p class="pn-texto"><b>Ainda não conectado.</b> O painel está funcionando só neste navegador. Depois de conectar, os pedidos de todas as clientes chegam aqui e as edições passam a valer na loja. Os produtos que você já ajustou aqui são levados para o banco na primeira entrada.</p>
      <ol class="pn-passos">
        <li>Na conta da cliente, crie o projeto no Supabase, região São Paulo.</li>
        <li>No SQL Editor, cole o arquivo <code>supabase/schema.sql</code> e clique em Run.</li>
        <li>Coloque a URL e a chave pública em <code>js/config.js</code> e publique o site.</li>
        <li>Volte aqui e crie sua conta. O passo a passo completo está em <code>supabase/LEIA-ME.md</code>.</li>
      </ol>` : '<p class="pn-texto"><b>Conectado ao Supabase.</b> Pedidos, produtos e dados da loja estão salvos no banco.</p>'}
    </section>

    ${local ? '' : `<section class="pn-card pn-espaco"><h2>Conta das clientes</h2>
      <p class="pn-texto">A cliente cria a conta dela ao finalizar a compra, com e-mail e senha, e vê os pedidos em qualquer aparelho. <b>Ela esqueceu a senha?</b> Digite o e-mail dela, gere o link e mande pelo WhatsApp: por ele, ela cria uma senha nova. O link vale 48 horas e funciona uma vez só.</p>
      <form id="form-senha-cliente" class="pn-form-mini" novalidate>
        <div class="campo"><label for="email-cliente">E-mail da cliente</label><input id="email-cliente" type="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="maria@gmail.com"></div>
        <button class="btn btn-claro" type="submit">Gerar link de senha nova</button>
      </form>
      <div id="link-senha-cliente" class="pn-link-senha" hidden></div>
    </section>`}

    <section class="pn-card pn-espaco"><h2>Sua conta</h2>
      <form id="form-senha" class="pn-form-mini" novalidate>
        <div class="campo"><label for="nova-senha">Nova senha</label><input id="nova-senha" type="password" autocomplete="new-password" minlength="8"></div>
        <button class="btn btn-claro" type="submit">Trocar senha</button>
      </form>
    </section>

    <section class="pn-card pn-espaco"><h2>Dados</h2>
      <div class="pn-acoes">
        <button class="btn btn-claro pn-btn-p" type="button" data-baixar-cat>Baixar cópia do catálogo</button>
        ${local && !temExemplos() ? '<button class="btn btn-claro pn-btn-p" type="button" data-por-exemplos>Ver com dados de exemplo</button>' : ''}
        ${local && temExemplos() ? '<button class="btn btn-claro pn-btn-p" type="button" data-tirar-exemplos>Remover dados de exemplo</button>' : ''}
        ${local ? '<button class="pn-link pn-perigo" type="button" data-restaurar>Desfazer todas as edições deste navegador</button>' : ''}
      </div>
    </section>`;

  desenharAviso($('#aviso-loja', alvo));
  mostrarSituacaoPagamento($('#situacao-pagamento', alvo));
  const form = $('#form-loja');
  const tabela = $('#tabela-tam', form);
  ligarSecaoFrete(form);
  ligarBuscaCep(form.elements.remCep, form, { rua: 'remRua', bairro: 'remBairro', cidade: 'remCidade', uf: 'remUf', num: 'remNum' });
  form.elements.remTelefone.addEventListener('input', (e) => { e.target.value = mascaraTelefone(e.target.value); });
  $('[data-novo-tam]', form).addEventListener('click', () => tabela.insertAdjacentHTML('beforeend', linhaTamanho({ t: '', calca: [] })));
  tabela.addEventListener('click', (e) => { if (e.target.matches('[data-tirar-tam]')) e.target.closest('.pn-tam').remove(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erro = $('[data-erro]', form);
    const falhar = (msg) => { erro.hidden = false; erro.textContent = msg; };
    const el = form.elements;
    const frete = lerPreco(el.freteGratis.value);
    const pixPct = lerPreco(el.pixPct.value);
    const parcelas = Number(el.parcelas.value);
    const zap = el.whatsappNumero.value.replace(/\D/g, '');
    if (zap && zap.length < 12) return falhar('O WhatsApp precisa ter 55, DDD e número. Ex.: 5521999999999.');
    if (frete === null || Number.isNaN(frete)) return falhar('O frete grátis precisa ser um valor. Ex.: 299.');
    if (pixPct === null || Number.isNaN(pixPct) || pixPct > 50) return falhar('O desconto no Pix precisa ficar entre 0 e 50%.');
    const lidoFrete = lerSecaoFrete(form);
    if (lidoFrete.erro) return falhar(lidoFrete.erro);
    const postagemTxt = el.prazoPostagem.value.trim();
    const prazoPostagem = postagemTxt === '' ? null : Number(postagemTxt);
    if (prazoPostagem !== null && (!Number.isInteger(prazoPostagem) || prazoPostagem < 0 || prazoPostagem > 15)) return falhar('O prazo para postar precisa ser um número de dias úteis, de 0 a 15.');
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) return falhar('As parcelas precisam ficar entre 1 e 24.');
    const parcelasMax = Number(el.parcelasMax.value);
    if (!Number.isInteger(parcelasMax) || parcelasMax < parcelas || parcelasMax > 24) return falhar('O máximo de parcelas precisa ser igual ou maior que as parcelas sem juros, até 24.');
    const pgModo = el.pgModo?.value || 'desligado';
    if (pgModo !== 'desligado' && parcelasMax > 12) return falhar('O Mercado Pago parcela em até 12x. Ajuste o máximo de parcelas.');
    if (pgModo === 'site' && (!el.empresa.value.trim() || soNumeros(el.documento.value).length < 11 || !el.enderecoLoja.value.trim())) {
      return falhar('Para cobrar no site, preencha nome, CPF ou CNPJ e endereço da loja.');
    }
    // Ligar sem as chaves deixaria a cliente numa tela quebrada: só liga com tudo pronto
    if (pgModo !== 'desligado' && pgModo !== estado.catalogo.pagamento?.modo) {
      const s = await Banco.situacaoPagamento().catch(() => ({}));
      if (!s.instalada || !s.credenciais || !s.webhook) return falhar('Ainda não dá para ligar: falta terminar a ligação com o Mercado Pago. Veja o aviso no alto desta seção.');
    }
    if (pgModo === 'site' && estado.catalogo.pagamento?.modo !== 'site'
      && !confirm('A loja vai passar a cobrar no site, logo depois do pedido. Já fez o teste com o cartão de teste do Mercado Pago?')) return;
    const linhas = $$('.pn-tam', form).map((d) => ({
      t: $('[data-t]', d).value.trim().toUpperCase(),
      calca: $('[data-c]', d).value.split(/[^\d]+/).filter(Boolean).map(Number),
    }));
    if (!linhas.length || linhas.some((x) => !x.t || !x.calca.length)) return falhar('Na tabela, cada tamanho precisa da letra e de pelo menos um número de calça.');
    const numeros = linhas.flatMap((x) => x.calca);
    if (new Set(numeros).size !== numeros.length) return falhar('Na tabela, um número de calça não pode aparecer em dois tamanhos.');
    erro.hidden = true;
    const dataPraia = el.lancamentoPraia.value;
    estado.catalogo.loja = {
      ...estado.catalogo.loja,
      whatsappNumero: zap,
      whatsapp: el.whatsapp.value.trim(),
      instagram: el.instagram.value.trim(),
      arroba: el.arroba.value.trim(),
      antesDepois: el.antesDepois.value.trim(),
      cidade: el.cidade.value.trim(),
      freteGratis: frete,
      frete: lidoFrete.frete,
      prazoPostagem,
      pix: pixPct / 100,
      parcelas,
      parcelasMax,
      lancamentoPraia: dataPraia ? `${dataPraia}:00-03:00` : '',
      ...(el.pgModo ? {
        pagarNoSite: pgModo === 'site',
        empresa: el.empresa.value.trim(),
        documento: el.documento.value.trim(),
        email: el.email.value.trim(),
        enderecoLoja: el.enderecoLoja.value.trim(),
      } : {}),
    };
    if (el.pgModo) estado.catalogo.pagamento = { modo: pgModo };
    estado.catalogo.tabela = linhas;
    estado.catalogo.remetente = {
      nome: el.remNome.value.trim(),
      cep: el.remCep.value.trim(),
      rua: el.remRua.value.trim(),
      num: el.remNum.value.trim(),
      complemento: el.remComplemento.value.trim(),
      bairro: el.remBairro.value.trim(),
      cidade: el.remCidade.value.trim(),
      uf: el.remUf.value.trim().toUpperCase(),
      telefone: soNumeros(el.remTelefone.value),
    };
    await salvarCatalogo('Dados da loja salvos');
  });

  $('#form-senha').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inp = $('#nova-senha');
    if (inp.value.length < 8) return toast('A senha precisa ter pelo menos 8 caracteres');
    try {
      await Banco.trocarSenha(inp.value);
      inp.value = '';
      toast('Senha trocada');
    } catch (ex) { toast(`Não trocou: ${ex.message}`); }
  });
  $('#form-senha-cliente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email-cliente').value.trim();
    const caixa = $('#link-senha-cliente');
    caixa.hidden = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return toast('Digite o e-mail da cliente');
    const botao = $('button[type=submit]', e.currentTarget);
    botao.disabled = true;
    try {
      const r = await Banco.linkSenhaCliente(email);
      if (!r?.ok) return toast('Não existe conta com esse e-mail');
      const link = new URL(`conta.html?nova=${encodeURIComponent(r.codigo)}`, location.href).href;
      const nome = (r.nome || '').split(' ')[0];
      const mensagem = `Oi${nome ? `, ${nome}` : ''}! Aqui está o link para você criar uma senha nova na loja:\n${link}\nEle vale por 48 horas.`;
      const copiar = async (texto, aviso) => {
        try { await navigator.clipboard.writeText(texto); toast(aviso); } catch (ex) { toast('Não deu para copiar. Tente de novo.'); }
      };
      caixa.hidden = false;
      caixa.innerHTML = `<p class="pn-texto"><b>Link pronto${nome ? ` para ${esc(nome)}` : ''}.</b> Mande para ela pelo WhatsApp. Se gerar outro, este para de valer.</p>
        <div class="pn-acoes"><button class="btn btn-preto pn-btn-p" type="button" data-copiar-msg>Copiar mensagem com o link</button><button class="btn btn-claro pn-btn-p" type="button" data-copiar-link>Copiar só o link</button></div>`;
      $('[data-copiar-msg]', caixa).addEventListener('click', () => copiar(mensagem, 'Mensagem copiada'));
      $('[data-copiar-link]', caixa).addEventListener('click', () => copiar(link, 'Link copiado'));
    } catch (ex) {
      toast(`Não gerou o link: ${ex.message}`);
    } finally {
      botao.disabled = false;
    }
  });
  $('[data-baixar-cat]', alvo).addEventListener('click', () => baixar(`catalogo-${new Date().toLocaleDateString('en-CA')}.json`, JSON.stringify(estado.catalogo, null, 2), 'application/json'));
  $('[data-restaurar]', alvo)?.addEventListener('click', () => {
    if (!confirm('Voltar produtos e dados da loja para o que está publicado no site? As edições feitas neste navegador serão perdidas.')) return;
    Catalogo.restaurar();
    estado.catalogo = Catalogo.doc();
    toast('Edições desfeitas');
    abaLoja(alvo);
  });
  ligarExemplos(alvo);
}
// O que falta para o Mercado Pago funcionar, dito em uma frase
async function mostrarSituacaoPagamento(caixa) {
  if (!caixa) return;
  const s = await Banco.situacaoPagamento().catch(() => ({ instalada: false }));
  if (!caixa.isConnected) return;
  const pg = estado.catalogo.pagamento || {};
  caixa.innerHTML = s.bloqueada
    ? '<b>Ainda não está ligado.</b> A função de pagamento já está no Supabase, mas falta desligar "Verify JWT" nos ajustes dela.'
    : !s.instalada
      ? '<b>Ainda não está ligado.</b> Falta instalar a função de pagamento no Supabase (veja supabase/LEIA-ME.md).'
    : !s.credenciais ? '<b>Falta conectar a conta.</b> Coloque a Public Key e o Access Token do Mercado Pago nos segredos do Supabase (veja supabase/LEIA-ME.md).'
      : !s.webhook ? '<b>Falta o aviso de pagamento.</b> Configure o webhook no Mercado Pago e coloque a assinatura secreta nos segredos do Supabase.'
        : !pg.modo || pg.modo === 'desligado' ? '<b>Tudo pronto, mas desligado.</b> Escolha como a cliente paga para ligar.'
          : s.teste ? '<b>Ligado em modo de teste.</b> Nenhuma cobrança é de verdade.'
            : '<b>Ligado.</b> As cobranças são de verdade e caem na conta do Mercado Pago.';
}

const linhaTamanho = (x) => `<div class="pn-tam"><input data-t value="${esc(x.t)}" placeholder="P" aria-label="Tamanho"><input data-c value="${esc(x.calca.join(', '))}" inputmode="numeric" placeholder="36, 38" aria-label="Números de calça"><button class="pn-link pn-perigo" type="button" data-tirar-tam>Tirar</button></div>`;

// ---------------- Início ----------------
(async () => {
  try {
    if (!crypto?.subtle) throw new Error('Abra o painel por um endereço seguro (https).');
    await Banco.iniciar();
    // O mesmo arquivo do aviso de pedido novo: com ele registrado, o Chrome oferece instalar o painel como app
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('aviso-sw.js', { scope: './admin' }).catch(() => {});
    await abrirPainel();
    // Vindo do atalho da loja "Baixar o painel como app"
    if (new URLSearchParams(location.search).get('instalar') === '1') {
      history.replaceState(null, '', `admin.html${location.hash}`);
      if (!instalado()) comoInstalar();
    }
  } catch (e) {
    $('#painel').innerHTML = `<main class="pn-acesso"><div class="pn-acesso-caixa"><span class="logo"><b>Paola</b><small>Corpus Fit</small></span><h1>Não deu para abrir o painel</h1><p>${esc(e.message)}</p><button class="btn btn-preto btn-bloco" type="button" data-recarregar>Tentar de novo</button></div></main>`;
    $('[data-recarregar]').addEventListener('click', () => location.reload());
  }
})();
