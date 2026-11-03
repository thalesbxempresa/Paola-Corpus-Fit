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
  voltar: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  cima: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  baixo: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  alerta: svg('<path d="M12 4l9 16H3zM12 10v4M12 17.2v.1"/>'),
  relogio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  ok: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  caminhao: svg('<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3.5 3.5v3h-7.5"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>'),
  caixa: svg('<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5L12 12l8.5-4.5M12 12v9"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
};

// ---------------- Tabelas fixas ----------------
const STATUS = {
  novo: ['Aguardando', I.relogio],
  pago: ['Pago', I.ok],
  enviado: ['Enviado', I.caminhao],
  entregue: ['Entregue', I.caixa],
  cancelado: ['Cancelado', I.x],
};
const VENDA = new Set(['pago', 'enviado', 'entregue']); // Faturamento conta só o que foi pago de verdade
const CATEGORIAS = [['cintas', 'Cintas'], ['sutias', 'Sutiã'], ['tratamento', 'Tratamento']];
const FOCOS = [['barriga', 'Segura a barriga'], ['busto', 'Sustenta o busto'], ['bumbum', 'Valoriza o bumbum']];

const estado = { catalogo: null, pedidos: [], eventos: [], periodo: 30, busca: '', filtro: 'todos', segmento: 'produtos', editor: null, avisoValores: null };

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
  const TRADUCOES = {
    'Invalid login credentials': 'E-mail ou senha incorretos. Ainda não criou sua conta? Use o botão abaixo.',
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
  const paginaAtual = () => location.origin + location.pathname;
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
    async esqueci(email) { checar(await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: paginaAtual() })); },
    async sair() { await sb.auth.signOut(); },
    async trocarSenha(senha) { checar(await sb.auth.updateUser({ password: senha })); },
    async pedidos() {
      const lista = checar(await sb.from('pedidos').select('*').order('criado_em', { ascending: false }).limit(3000));
      return lista.map((p) => ({ ...p, data: p.criado_em }));
    },
    async alterarPedido(id, campos) { checar(await sb.from('pedidos').update(campos).eq('id', id)); },
    async excluirPedido(id) { checar(await sb.from('pedidos').delete().eq('id', id)); },
    async eventos() { return checar(await sb.from('eventos_dia').select('*').limit(4000)); },
    async catalogo() {
      const doc = checar(await sb.rpc('catalogo_publico'));
      if (Catalogo.valido(doc)) return { ...doc, loja: { ...Catalogo.doc().loja, ...doc.loja } };
      // Banco recém-criado: leva o catálogo atual do site na primeira entrada
      const atual = Catalogo.doc();
      await this.salvarCatalogo(atual);
      return atual;
    },
    async salvarCatalogo(doc) {
      const linhas = [
        ...doc.produtos.map((x, i) => linha(x, 'produto', i)),
        ...doc.kits.map((x, i) => linha(x, 'kit', i)),
        ...doc.praia.map((x, i) => linha(x, 'praia', i)),
      ];
      checar(await sb.from('loja_config').upsert({ id: 1, dados: { loja: doc.loja, tabela: doc.tabela } }));
      checar(await sb.from('itens').upsert(linhas));
      checar(await sb.from('itens').delete().not('id', 'in', `(${linhas.map((l) => l.id).join(',')})`));
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
  tempoToast = setTimeout(() => t.classList.remove('ver'), 2600);
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
  <div class="ad-senha"><input id="ac-${nome}" name="${nome}" type="password" autocomplete="${auto}" minlength="8" required><button type="button" data-ver-senha>Mostrar</button></div></div>`;

function telaAcesso(modo, aviso = '') {
  const local = Banco.modo === 'local';
  const TEXTOS = {
    criar: ['Criar a conta de administrador', 'A senha é você quem escolhe agora, com pelo menos 8 caracteres.', 'Criar conta'],
    entrar: ['Entrar no painel', 'Métricas, pedidos e produtos da loja.', 'Entrar'],
    'nova-senha': ['Escolher nova senha', 'Depois disso você já entra no painel.', 'Salvar nova senha'],
  };
  const [titulo, sub, botao] = TEXTOS[modo];
  $('#painel').innerHTML = `
    <main class="ad-acesso">
      <form class="ad-acesso-caixa" id="form-acesso" novalidate>
        <span class="logo"><b>Paola</b><small>Corpus Fit</small></span>
        <h1>${titulo}</h1>
        <p>${sub}</p>
        ${aviso ? `<p class="ad-ok-msg">${esc(aviso)}</p>` : ''}
        ${modo === 'nova-senha' ? '' : '<div class="campo"><label for="ac-email">E-mail</label><input id="ac-email" name="email" type="email" inputmode="email" autocomplete="username" required></div>'}
        ${modo === 'entrar' ? campoSenha('senha', 'Senha', 'current-password') : campoSenha('senha', modo === 'criar' ? 'Escolha uma senha' : 'Nova senha', 'new-password')}
        ${modo === 'entrar' ? '' : campoSenha('repete', 'Repita a senha', 'new-password')}
        <p class="dica-tam erro" data-erro hidden></p>
        <button class="btn btn-preto btn-bloco" type="submit">${botao}</button>
        ${modo === 'entrar' ? '<button class="ad-link" type="button" data-esqueci>Esqueci a senha</button>' : ''}
        ${!local && modo === 'entrar' ? '<button class="btn btn-claro btn-bloco" type="button" data-ir="criar">Primeiro acesso? Criar conta</button>' : ''}
        ${!local && modo === 'criar' ? '<button class="ad-link" type="button" data-ir="entrar">Já tenho conta</button><p class="ad-nota">Depois de criar, abra o link de confirmação que chega no seu e-mail.</p>' : ''}
        ${local && modo === 'criar' ? '<p class="ad-nota">Sem o banco conectado, a conta vale só neste navegador e a senha fica guardada aqui de forma embaralhada, nunca em texto. A proteção de verdade entra com o Supabase.</p>' : ''}
      </form>
    </main>`;
  const form = $('#form-acesso');
  const erro = $('[data-erro]', form);
  const falhar = (msg, campo) => { erro.hidden = false; erro.textContent = msg; campo?.focus(); };
  (form.email || form.senha).focus();

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
  resumo: { nome: 'Resumo', ico: I.resumo, abrir: abaResumo },
  pedidos: { nome: 'Pedidos', ico: I.pedidos, abrir: abaPedidos },
  produtos: { nome: 'Produtos', ico: I.produtos, abrir: abaProdutos },
  loja: { nome: 'Loja', ico: I.loja, abrir: abaLoja },
};

function montarPainel() {
  $('#painel').innerHTML = `
    <div class="ad">
      <header class="ad-topo">
        <span class="logo"><b>Paola</b><small>Corpus Fit</small></span>
        <div class="ad-topo-dir"><a class="ad-link" href="index.html" target="_blank" rel="noopener">Ver a loja</a><button class="ad-ico" type="button" data-sair aria-label="Sair">${I.sair}</button></div>
      </header>
      <nav class="ad-nav" aria-label="Seções do painel">
        <span class="logo ad-nav-logo"><b>Paola</b><small>Corpus Fit</small></span>
        ${Object.entries(ABAS).map(([id, a]) => `<a href="#${id}">${a.ico}<span>${a.nome}</span></a>`).join('')}
        <div class="ad-nav-pe"><a href="index.html" target="_blank" rel="noopener">Ver a loja</a><button type="button" data-sair>${I.sair}Sair</button></div>
      </nav>
      <main class="ad-main">
        ${Banco.modo === 'local' ? '<p class="ad-modo"><b>Modo neste navegador.</b> Só você vê estas alterações. As clientes continuam vendo os dados atuais do site até o Supabase ser conectado. <a href="#loja">Como conectar</a></p>' : ''}
        <div id="aba"></div>
      </main>
    </div>`;
  $$('[data-sair]').forEach((b) => b.addEventListener('click', async () => {
    await Banco.sair();
    location.hash = '';
    telaAcesso('entrar');
  }));
  // Evita perder o que foi digitado no produto ao trocar de aba
  $('.ad-nav').addEventListener('click', (e) => {
    if (e.target.closest('a[href^="#"]') && estado.editor?.sujo && !confirm('Sair sem salvar as alterações deste produto?')) e.preventDefault();
  });
  abrirAba();
}

function abrirAba() {
  if (!$('#aba')) return;
  const pedido = location.hash.slice(1);
  const id = ABAS[pedido] ? pedido : 'resumo';
  estado.editor = null;
  $$('.ad-nav a[href^="#"]').forEach((a) => {
    if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  scrollTo(0, 0);
  esconderDica();
  const alvo = $('#aba');
  Promise.resolve(ABAS[id].abrir(alvo)).catch((e) => {
    alvo.innerHTML = `<section class="ad-card"><h2>Não deu para carregar</h2><p class="ad-texto">${esc(e.message)}</p><button class="btn btn-claro" type="button" data-de-novo>Tentar de novo</button></section>`;
    $('[data-de-novo]', alvo).addEventListener('click', abrirAba);
  });
}
addEventListener('hashchange', abrirAba);

async function abrirPainel() {
  const usuario = await Banco.sessao();
  if (!usuario) return telaAcesso(Banco.temConta() ? 'entrar' : 'criar');
  if (!(await Banco.ehAdmin())) {
    await Banco.sair();
    return telaAcesso('entrar', 'Esta conta não é de administrador da loja.');
  }
  estado.catalogo = await Banco.catalogo();
  montarPainel();
}

const carregarDados = async () => { [estado.pedidos, estado.eventos] = await Promise.all([Banco.pedidos(), Banco.eventos()]); };
const temExemplos = () => Banco.modo === 'local' && !!lerJSON(EXEMPLOS, null);
const avisoExemplos = () => (temExemplos() ? `<p class="ad-exemplo">${I.alerta}<span><b>Dados de exemplo ligados.</b> Estes números são fictícios, só para visualizar o painel.</span><button class="ad-link" type="button" data-tirar-exemplos>Remover</button></p>` : '');
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

  const grade = [0, 0.5, 1].map((k) => `<line class="ad-grade" x1="${esq}" x2="${L - 2}" y1="${f1(Y(teto * k))}" y2="${f1(Y(teto * k))}"/>
    ${todos ? '' : `<text class="ad-eixo" x="${esq - 8}" y="${f1(Y(teto * k) + 4)}" text-anchor="end">${esc(fmtEixo(teto * k))}</text>`}`).join('');
  const colunas = pontos.map((p, i) => {
    if (!p.valor) return '';
    const x = f1(X(i));
    const y = f1(Y(p.valor));
    const r = Math.min(4, w / 2, y0 - y);
    return `<path class="ad-col" data-i="${i}" d="M${x} ${y0}V${f1(y + r)}Q${x} ${y} ${f1(x + r)} ${y}H${f1(x + w - r)}Q${f1(x + w)} ${y} ${f1(x + w)} ${f1(y + r)}V${y0}Z"/>`;
  }).join('');
  const meio = (i) => f1(X(i) + w / 2);
  const indices = todos ? pontos.map((_, i) => i) : [...new Set([0, Math.floor((pontos.length - 1) / 2), pontos.length - 1])];
  const rotulos = indices.map((i) => {
    const ancora = todos || (i !== 0 && i !== pontos.length - 1) ? 'middle' : i === 0 ? 'start' : 'end';
    const x = ancora === 'start' ? f1(X(i)) : ancora === 'end' ? f1(X(i) + w) : meio(i);
    return `<text class="ad-eixo" x="${x}" y="${altura - 6}" text-anchor="${ancora}">${esc(pontos[i].rotulo)}</text>`;
  }).join('');
  // Rótulo só onde importa: todas as colunas quando são poucas, o pico quando são muitas
  const marcados = todos ? pontos.map((_, i) => i) : maior > 0 ? [pontos.findIndex((p) => p.valor === maior)] : [];
  const valores = marcados.filter((i) => pontos[i].valor > 0).map((i) => {
    const x = Math.max(esq + 24, Math.min(L - 26, meio(i)));
    return `<text class="ad-valor" x="${f1(x)}" y="${f1(Y(pontos[i].valor) - 6)}" text-anchor="middle">${esc(todos ? fmt(pontos[i].valor) : fmtEixo(pontos[i].valor))}</text>`;
  }).join('');

  el.innerHTML = `<svg class="ad-grafico" width="${L}" height="${altura}" viewBox="0 0 ${L} ${altura}" role="img" aria-label="${esc(descricao)}" tabindex="0">${grade}${colunas}${valores}${rotulos}</svg>`;

  const grafico = $('svg', el);
  let atual = -1;
  const marcar = (i) => {
    atual = i;
    $$('.ad-col', grafico).forEach((c) => c.classList.toggle('ativa', Number(c.dataset.i) === i));
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
  return `<div class="ad-barras">${linhas.map((l) => `<div class="ad-b" tabindex="0" data-dica-v="${esc(l.dicaV || l.txt)}" data-dica-r="${esc(l.dicaR || l.nome)}">
    <div class="ad-b-txt"><span>${esc(l.nome)}${l.sub ? `<small>${esc(l.sub)}</small>` : ''}</span><b>${esc(l.txt)}</b></div>
    <div class="ad-b-linha"><i style="width:${l.valor > 0 ? Math.max(1.5, (l.valor / maior) * 100) : 0}%"></i></div>
  </div>`).join('')}</div>`;
}

// ---------------- Aba Resumo ----------------
const VAZIO_GRAFICO = (txt) => `<p class="ad-vazio">${txt}</p>`;

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
  const vendas = lista.filter((p) => VENDA.has(p.status));
  const faturamento = vendas.reduce((t, p) => t + Number(p.total), 0);
  const aguardando = lista.filter((p) => p.status === 'novo');
  return {
    registrados: lista.length,
    vendas,
    faturamento,
    ticket: vendas.length ? faturamento / vendas.length : 0,
    taxa: lista.length ? vendas.length / lista.length : 0,
    aguardando: aguardando.length,
    aguardandoValor: aguardando.reduce((t, p) => t + Number(p.total), 0),
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
    if (b) { b.valor += Number(p.total); b.n += 1; }
  });
  return pontos;
}

const nomeDoItem = (x) => [...estado.catalogo.kits, ...estado.catalogo.produtos].find((i) => i.id === x.id)?.nome || x.nome || x.id;
const tamanhoDoItem = (x) => x.tam || estado.catalogo.tabela.find((t) => t.calca.includes(Number(x.calca)))?.t || null;

function deltaHTML(atual, antes, rotulo, pontosPct = false) {
  if (!antes) return ''; // Sem período anterior não há comparação honesta a mostrar
  const dif = pontosPct ? (atual - antes) * 100 : ((atual - antes) / antes) * 100;
  const n = Math.round(Math.abs(dif));
  if (!n) return `<span class="ad-delta">Igual a ${rotulo}</span>`;
  return `<span class="ad-delta ${dif > 0 ? 'sobe' : 'desce'}">${dif > 0 ? '▲' : '▼'} ${n}${pontosPct ? ' p.p.' : '%'} <i>vs. ${rotulo}</i></span>`;
}

async function abaResumo(alvo) {
  await carregarDados();
  desenharResumo(alvo);
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
    <div class="ad-filtros" role="radiogroup" aria-label="Período">
      ${[[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], [0, 'Tudo']].map(([d, n]) => `<button class="chip" type="button" role="radio" data-periodo="${d}" aria-checked="${d === estado.periodo}">${n}</button>`).join('')}
    </div>
    ${semNada ? `<section class="ad-card ad-comeco"><h2>Ainda não há pedidos</h2>
      <p class="ad-texto">${Banco.modo === 'local' ? 'Sem o Supabase, aparecem aqui só os pedidos feitos neste navegador. Para ver como o painel fica com movimento, ligue os dados de exemplo (números fictícios, sempre marcados).' : 'Os pedidos aparecem aqui assim que as clientes finalizarem pelo site.'}</p>
      ${Banco.modo === 'local' ? '<button class="btn btn-claro" type="button" data-por-exemplos>Ver com dados de exemplo</button>' : ''}</section>` : ''}
    <section class="ad-heroi">
      <div class="ad-card ad-heroi-valor">
        <span class="ad-rotulo">Faturamento</span>
        <strong>${brl(m.faturamento)}</strong>
        ${deltaHTML(m.faturamento, ma?.faturamento, rotuloAntes)}
        <small>Soma dos pedidos pagos, enviados e entregues. Pedido só registrado não conta.</small>
      </div>
      <div class="ad-kpis">
        <div class="ad-card ad-kpi"><span class="ad-rotulo">Pedidos registrados</span><strong>${num(m.registrados)}</strong>${deltaHTML(m.registrados, ma?.registrados, rotuloAntes)}</div>
        <div class="ad-card ad-kpi"><span class="ad-rotulo">Fechamento</span><strong>${Math.round(m.taxa * 100)}%</strong><small>${num(m.vendas.length)} de ${num(m.registrados)} pagaram</small></div>
        <div class="ad-card ad-kpi"><span class="ad-rotulo">Ticket médio</span><strong>${brl(m.ticket)}</strong>${deltaHTML(m.ticket, ma?.ticket, rotuloAntes)}</div>
        <a class="ad-card ad-kpi ad-kpi-link" href="#pedidos" data-ver-novos><span class="ad-rotulo">Aguardando pagamento</span><strong>${num(m.aguardando)}</strong><small>${brl(m.aguardandoValor)} em aberto</small></a>
      </div>
    </section>
    <section class="ad-card">
      <h2>Faturamento no período</h2>
      <div id="g-faturamento">${m.vendas.length ? '' : VAZIO_GRAFICO('Nenhuma venda paga neste período.')}</div>
      ${linhasTabela.length ? `<details class="ad-tabela"><summary>Ver em tabela</summary><table>
        <thead><tr><th>Período</th><th>Vendas</th><th>Valor</th></tr></thead>
        <tbody>${linhasTabela.map((p) => `<tr><td>${esc(p.dica)}</td><td>${num(p.n)}</td><td>${brl(p.valor)}</td></tr>`).join('')}</tbody>
      </table></details>` : ''}
    </section>
    <div class="ad-grade-2">
      <section class="ad-card"><h2>Do clique ao pagamento</h2>${etapas[0][1] || m.registrados ? barrasHTML(funil) : VAZIO_GRAFICO('Sem movimento neste período.')}
        ${Banco.modo === 'local' ? '<p class="ad-nota">Sem o Supabase, as visitas contam só este navegador.</p>' : ''}</section>
      <section class="ad-card"><h2>Mais vendidos</h2>${ranking.length ? barrasHTML(ranking) : VAZIO_GRAFICO('Aparece quando houver venda paga.')}</section>
      <section class="ad-card"><h2>Tamanhos mais pedidos</h2><div id="g-tamanhos">${validos.length ? '' : VAZIO_GRAFICO('Sem pedidos neste período.')}</div><p class="ad-nota">Ajuda a decidir o que repor. Pedidos cancelados não entram.</p></section>
      <section class="ad-card"><h2>Forma de pagamento</h2>
        ${totalPag ? `<div class="ad-pilha" role="img" aria-label="Pix ${pct(pix)}%, cartão ${pct(cartao)}%">${pix ? `<i style="flex:${pix};background:var(--serie-1)"></i>` : ''}${cartao ? `<i style="flex:${cartao};background:var(--serie-2)"></i>` : ''}</div>
        <ul class="ad-legenda"><li><i style="background:var(--serie-1)"></i>Pix<b>${pct(pix)}%</b><small>${num(pix)} pedidos</small></li><li><i style="background:var(--serie-2)"></i>Cartão<b>${pct(cartao)}%</b><small>${num(cartao)} pedidos</small></li></ul>` : VAZIO_GRAFICO('Sem pedidos neste período.')}
        <h2 class="ad-h2-2">De onde vêm os pedidos</h2>
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
  ligarExemplos(alvo);
}

let tempoResize;
addEventListener('resize', () => {
  clearTimeout(tempoResize);
  tempoResize = setTimeout(() => { if ($('#g-faturamento')) estado.redesenhar?.(); }, 150);
});

// ---------------- Aba Pedidos ----------------
const etiquetaStatus = (s) => `<span class="ad-st ad-st-${esc(s)}">${(STATUS[s] || STATUS.novo)[1]}${(STATUS[s] || STATUS.novo)[0]}</span>`;
const enderecoDe = (p) => [p.rua && `${p.rua}, ${p.num}${p.complemento ? ` - ${p.complemento}` : ''}`, p.bairro && `${p.bairro} - ${p.cidade}/${p.uf}`, p.cep && `CEP ${p.cep}`].filter(Boolean).join('\n');

function cartaoPedido(p) {
  const resumo = (p.itens || []).map((x) => `${x.qtd || 1}x ${nomeDoItem(x)}`).join(', ');
  return `<details class="ad-ped" data-id="${esc(p.id)}">
    <summary>
      <div class="ad-ped-l1"><b>${esc(p.numero)}</b>${etiquetaStatus(p.status)}${p.conferir ? `<span class="ad-st ad-st-conferir">${I.alerta}Conferir valor</span>` : ''}</div>
      <div class="ad-ped-l2"><span>${esc(p.nome)}</span><b>${brl(p.total)}</b></div>
      <div class="ad-ped-l3">${esc(resumo)} · ${dataHora(p.data)}</div>
    </summary>
    <div class="ad-ped-corpo">
      <div class="campo"><label for="st-${esc(p.id)}">Situação do pedido</label>
        <select id="st-${esc(p.id)}" data-status>${Object.entries(STATUS).map(([id, [nome]]) => `<option value="${id}" ${id === p.status ? 'selected' : ''}>${nome}</option>`).join('')}</select>
      </div>
      <div><h3>Itens</h3><ul class="ad-ped-itens">${(p.itens || []).map((x) => {
        const tam = tamanhoDoItem(x);
        return `<li><span>${x.qtd || 1}x ${esc(nomeDoItem(x))}${x.extra ? ` + ${esc(nomeDoItem({ id: x.extra }))}` : ''}${tam ? `<small>Tamanho ${esc(tam)} · veste calça ${esc(x.calca)}</small>` : ''}</span>${x.preco != null ? `<b>${brl(x.preco * (x.qtd || 1))}</b>` : ''}</li>`;
      }).join('')}</ul></div>
      ${p.conferir ? '<p class="ad-exemplo">O valor enviado pelo site não bateu com o preço do banco. Confira antes de mandar o link de pagamento.</p>' : ''}
      <div><h3>Pagamento</h3><p>${esc(p.pagamento || 'Não informado')}</p></div>
      <div><h3>Entrega</h3><p class="ad-endereco">${esc(enderecoDe(p)) || 'Não informado'}</p>${enderecoDe(p) ? '<button class="ad-link" type="button" data-copiar>Copiar endereço</button>' : ''}</div>
      <div class="campo"><label for="nt-${esc(p.id)}">Anotação interna</label><textarea id="nt-${esc(p.id)}" data-nota rows="2" placeholder="Só aparece aqui no painel">${esc(p.nota || '')}</textarea></div>
      <button class="ad-link ad-perigo" type="button" data-excluir>Excluir pedido</button>
    </div>
  </details>`;
}

function exportarCSV(lista) {
  // Campo escrito por cliente não pode virar fórmula ao abrir no Excel
  const celula = (v) => { const t = String(v ?? '').replace(/"/g, '""'); return `"${/^[=+\-@]/.test(t) ? `'${t}` : t}"`; };
  const linhas = [['Número', 'Data', 'Situação', 'Nome', 'Cidade', 'UF', 'Pagamento', 'Itens', 'Total']];
  lista.forEach((p) => linhas.push([p.numero, dataHora(p.data), (STATUS[p.status] || STATUS.novo)[0], p.nome, p.cidade, p.uf, p.pagamento,
    (p.itens || []).map((x) => `${x.qtd || 1}x ${nomeDoItem(x)}${tamanhoDoItem(x) ? ` (${tamanhoDoItem(x)})` : ''}`).join(' | '), Number(p.total).toFixed(2).replace('.', ',')]));
  baixar(`pedidos-${new Date().toLocaleDateString('en-CA')}.csv`, `﻿${linhas.map((l) => l.map(celula).join(';')).join('\r\n')}`, 'text/csv;charset=utf-8');
}
function baixar(nome, conteudo, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function abaPedidos(alvo) {
  await carregarDados();
  const conta = (s) => estado.pedidos.filter((p) => s === 'todos' || p.status === s).length;
  alvo.innerHTML = `
    ${avisoExemplos()}
    <div class="ad-cab"><h1 class="ad-h1">Pedidos</h1><button class="btn btn-claro ad-btn-p" type="button" data-csv>Baixar planilha</button></div>
    <div class="ad-filtros" role="radiogroup" aria-label="Situação">
      ${[['todos', 'Todos'], ...Object.entries(STATUS).map(([id, [nome]]) => [id, nome])].map(([id, nome]) => `<button class="chip" type="button" role="radio" data-filtro="${id}" aria-checked="${id === estado.filtro}">${nome} <small>${conta(id)}</small></button>`).join('')}
    </div>
    <div class="campo ad-busca"><label for="busca">Buscar por número, nome ou cidade</label><input id="busca" type="search" value="${esc(estado.busca)}" placeholder="Ex.: PCF-0311 ou Maria"></div>
    <div id="lista-pedidos"></div>`;

  const filtrados = () => {
    const termo = estado.busca.trim().toLowerCase();
    return estado.pedidos.filter((p) => (estado.filtro === 'todos' || p.status === estado.filtro)
      && (!termo || `${p.numero} ${p.nome} ${p.cidade}`.toLowerCase().includes(termo)));
  };
  const desenhar = () => {
    const lista = filtrados();
    $('#lista-pedidos').innerHTML = lista.length
      ? lista.slice(0, 200).map(cartaoPedido).join('') + (lista.length > 200 ? `<p class="ad-nota">Mostrando os 200 mais recentes de ${num(lista.length)}. Use a busca ou baixe a planilha.</p>` : '')
      : `<section class="ad-card ad-comeco"><h2>${estado.pedidos.length ? 'Nada encontrado' : 'Ainda não há pedidos'}</h2>
        <p class="ad-texto">${estado.pedidos.length ? 'Tente outra busca ou outra situação.' : Banco.modo === 'local' ? 'Sem o Supabase, aparecem aqui só os pedidos feitos neste navegador. Depois de conectar, chegam os de todas as clientes.' : 'Os pedidos aparecem aqui assim que as clientes finalizarem pelo site.'}</p></section>`;
  };
  desenhar();

  $$('[data-filtro]', alvo).forEach((b) => b.addEventListener('click', () => {
    estado.filtro = b.dataset.filtro;
    $$('[data-filtro]', alvo).forEach((c) => c.setAttribute('aria-checked', c === b));
    desenhar();
  }));
  $('#busca').addEventListener('input', (e) => { estado.busca = e.target.value; desenhar(); });
  $('[data-csv]', alvo).addEventListener('click', () => exportarCSV(filtrados()));
  ligarExemplos(alvo);

  const lista = $('#lista-pedidos');
  const pedidoDe = (el) => estado.pedidos.find((p) => String(p.id) === el.closest('.ad-ped').dataset.id);
  lista.addEventListener('change', async (e) => {
    const p = pedidoDe(e.target);
    try {
      if (e.target.matches('[data-status]')) {
        const novo = e.target.value;
        await Banco.alterarPedido(p.id, { status: novo });
        p.status = novo;
        const cartao = e.target.closest('.ad-ped');
        $('.ad-ped-l1 .ad-st', cartao).outerHTML = etiquetaStatus(novo);
        toast(`Pedido marcado como ${STATUS[novo][0].toLowerCase()}`);
      } else if (e.target.matches('[data-nota]')) {
        await Banco.alterarPedido(p.id, { nota: e.target.value.trim() });
        p.nota = e.target.value.trim();
        toast('Anotação salva');
      }
    } catch (ex) { toast(`Não salvou: ${ex.message}`); }
  });
  lista.addEventListener('click', async (e) => {
    if (e.target.matches('[data-copiar]')) {
      const p = pedidoDe(e.target);
      try { await navigator.clipboard.writeText(`${p.nome}\n${enderecoDe(p)}`); toast('Endereço copiado'); } catch (ex) { toast('Selecione o texto e copie'); }
    }
    if (e.target.matches('[data-excluir]')) {
      const p = pedidoDe(e.target);
      if (!confirm(`Excluir o pedido ${p.numero} de ${p.nome}? Isso não pode ser desfeito.`)) return;
      try {
        await Banco.excluirPedido(p.id);
        estado.pedidos = estado.pedidos.filter((x) => x !== p);
        desenhar();
        toast('Pedido excluído');
      } catch (ex) { toast(`Não excluiu: ${ex.message}`); }
    }
  });
}

// ---------------- Aba Produtos ----------------
const SEGMENTOS = { produtos: ['Produtos', 'Novo produto'], kits: ['Combos', 'Novo combo'], praia: ['Moda praia', 'Nova peça'] };
const precoTxt = (v) => (v == null || Number.isNaN(v) ? '' : String(v).replace('.', ','));
function lerPreco(txt) {
  let t = String(txt ?? '').replace(/[R$\s]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}
const usadoEmKits = (id) => estado.catalogo.kits.filter((k) => k.itens?.includes(id) || k.escolha?.includes(id)).map((k) => k.nome);
const textoItem = (x) => (x.preco == null ? 'Só nos combos' : `${x.de ? `<s>${brl(x.de)}</s> ` : ''}${brl(x.preco)}`);

function abaProdutos(alvo) {
  const seg = estado.segmento;
  const lista = estado.catalogo[seg];
  alvo.innerHTML = `
    <div class="ad-cab"><h1 class="ad-h1">Produtos</h1><button class="btn btn-preto ad-btn-p" type="button" data-novo>${I.mais}${SEGMENTOS[seg][1]}</button></div>
    <div class="ad-filtros" role="radiogroup" aria-label="Tipo">
      ${Object.entries(SEGMENTOS).map(([id, [nome]]) => `<button class="chip" type="button" role="radio" data-seg="${id}" aria-checked="${id === seg}">${nome}</button>`).join('')}
    </div>
    ${estado.avisoValores ? `<p class="ad-exemplo">${I.alerta}<span><b>Confira estes textos:</b> eles citam valores e não mudam sozinhos quando o preço muda. ${esc(estado.avisoValores.join('; '))}.</span><button class="ad-link" type="button" data-ok-aviso>Entendi</button></p>` : ''}
    <section class="ad-itens">${lista.map((x, i) => `
      <article class="ad-item ${x.ativo === false ? 'oculto' : ''}">
        <button class="ad-item-abre" type="button" data-editar="${esc(x.id)}">
          <img src="${esc(x.img)}" alt="" loading="lazy">
          <span class="ad-item-txt"><b>${esc(x.nome)}</b><span>${seg === 'praia' ? 'Prévia de lançamento' : textoItem(x)}</span>${x.ativo === false ? '<em>Oculto na loja</em>' : ''}</span>
        </button>
        <div class="ad-item-ordem">
          <button class="ad-ico" type="button" data-mover="-1" data-i="${i}" aria-label="Subir ${esc(x.nome)}" ${i === 0 ? 'disabled' : ''}>${I.cima}</button>
          <button class="ad-ico" type="button" data-mover="1" data-i="${i}" aria-label="Descer ${esc(x.nome)}" ${i === lista.length - 1 ? 'disabled' : ''}>${I.baixo}</button>
        </div>
      </article>`).join('')}
    </section>`;

  $$('[data-seg]', alvo).forEach((b) => b.addEventListener('click', () => { estado.segmento = b.dataset.seg; abaProdutos(alvo); }));
  $('[data-novo]', alvo).addEventListener('click', () => abrirEditor(seg, null));
  $('[data-ok-aviso]', alvo)?.addEventListener('click', () => { estado.avisoValores = null; abaProdutos(alvo); });
  $$('[data-editar]', alvo).forEach((b) => b.addEventListener('click', () => abrirEditor(seg, b.dataset.editar)));
  $$('[data-mover]', alvo).forEach((b) => b.addEventListener('click', async () => {
    const i = Number(b.dataset.i);
    const j = i + Number(b.dataset.mover);
    [lista[i], lista[j]] = [lista[j], lista[i]];
    await salvarCatalogo('Ordem salva');
    abaProdutos(alvo);
  }));
}

async function salvarCatalogo(msg) {
  try {
    await Banco.salvarCatalogo(estado.catalogo);
    toast(msg);
    return true;
  } catch (e) {
    estado.catalogo = await Banco.catalogo();
    toast(`Não salvou: ${e.message}`);
    return false;
  }
}

const NOVOS = {
  produtos: () => ({ id: '', nome: '', cat: 'tratamento', preco: null, img: '', frase: '', desc: '', pontos: [], ativo: true }),
  kits: () => ({ id: '', nome: '', cat: 'kits', img: '', itens: [], de: null, preco: null, frase: '', desc: '', ativo: true }),
  praia: () => ({ id: '', nome: '', img: '', foco: [], cores: ['#1F1A17', '#B03A5B', '#1D6A86'], ativo: true }),
};

function abrirEditor(seg, id) {
  const r = id ? copia(estado.catalogo[seg].find((x) => x.id === id)) : NOVOS[seg]();
  estado.editor = { seg, id, r, sujo: false };
  desenharEditor();
  scrollTo(0, 0);
}

// Campos do formulário
const ajuda = (t) => (t ? `<small class="ad-ajuda">${t}</small>` : '');
const campo = (rotulo, nome, valor, op = {}) => `<div class="campo"><label for="f-${nome}">${rotulo}</label><input id="f-${nome}" name="${nome}" type="${op.tipo || 'text'}" value="${esc(valor ?? '')}" ${op.attrs || ''}>${ajuda(op.ajuda)}</div>`;
const area = (rotulo, nome, valor, op = {}) => `<div class="campo"><label for="f-${nome}">${rotulo}</label><textarea id="f-${nome}" name="${nome}" rows="${op.linhas || 3}">${esc(valor ?? '')}</textarea>${ajuda(op.ajuda)}</div>`;
const seletor = (rotulo, nome, valor, opcoes, op = {}) => `<div class="campo"><label for="f-${nome}">${rotulo}</label><select id="f-${nome}" name="${nome}" ${op.attrs || ''}>${opcoes.map(([v, n]) => `<option value="${v}" ${v === valor ? 'selected' : ''}>${n}</option>`).join('')}</select>${ajuda(op.ajuda)}</div>`;
const chave = (rotulo, nome, marcado, op = {}) => `<label class="ad-chave"><input type="checkbox" name="${nome}" value="${op.valor || '1'}" ${marcado ? 'checked' : ''} ${op.attrs || ''}><span>${rotulo}${op.ajuda ? `<small>${op.ajuda}</small>` : ''}</span></label>`;
const fotoBloco = (rotulo, nome, valor, op = {}) => `<div class="ad-foto" data-foto="${nome}">
    ${valor ? `<img src="${esc(valor)}" alt="">` : '<span class="ad-foto-vazia">Sem foto</span>'}
    <div><b>${rotulo}</b>${ajuda(op.ajuda)}
      <div class="ad-foto-acoes"><label class="ad-link">${valor ? 'Trocar foto' : 'Escolher foto'}<input type="file" accept="image/*" hidden></label>
      ${valor && op.opcional ? '<button class="ad-link ad-perigo" type="button" data-tirar-foto>Tirar</button>' : ''}</div>
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

function secaoProduto(r) {
  const fixo = Catalogo.FIXOS.includes(r.id);
  const ehCinta = r.cat === 'cintas';
  return `
    <section class="ad-card"><h2>Fotos</h2>
      ${fotoBloco('Foto principal', 'img', r.img)}
      ${fotoBloco('Segunda foto', 'img2', r.img2, { opcional: true, ajuda: 'Aparece quando a cliente passa o mouse no card.' })}
      <h3 class="ad-sub">Galeria da página do produto</h3>
      ${(r.galeria || []).map((g, i) => `<div class="ad-gal"><img src="${esc(g.src)}" alt=""><input name="g-${i}" value="${esc(g.txt || '')}" placeholder="Legenda (opcional)" aria-label="Legenda da foto ${i + 1}"><button class="ad-link ad-perigo" type="button" data-tirar-gal="${i}">Tirar</button></div>`).join('')}
      <label class="ad-link ad-add">Adicionar foto à galeria<input type="file" accept="image/*" data-gal hidden></label>
    </section>
    <section class="ad-card"><h2>Identificação</h2>
      ${campo('Nome', 'nome', r.nome, { attrs: 'required' })}
      <div class="ad-2">
        ${campo('Nome curto', 'curto', r.curto, { ajuda: 'Usado no pedido e nos combos.' })}
        ${campo('Plural', 'plural', r.plural, { ajuda: 'Se vier 2 no combo. Ex.: Sutiãs reforçados.' })}
      </div>
      <div class="ad-2">
        ${seletor('Categoria', 'cat', r.cat, CATEGORIAS, fixo ? { attrs: 'disabled', ajuda: 'Fixa: este item é base do caminho de compra.' } : {})}
        ${ehCinta ? campo('Barbatanas', 'barbatanas', r.barbatanas, { tipo: 'number', attrs: 'inputmode="numeric" min="1"' }) : campo('Selo', 'selo', r.selo, { ajuda: 'Etiqueta na foto. Ex.: A melhor.' })}
      </div>
      ${ehCinta ? campo('Selo', 'selo', r.selo, { ajuda: 'Etiqueta na foto. Ex.: A melhor.' }) : ''}
    </section>
    ${secaoPreco(r, !fixo)}
    <section class="ad-card"><h2>Textos</h2>
      ${campo('Frase de destaque', 'frase', r.frase)}
      ${area('Descrição', 'desc', r.desc, { linhas: 5 })}
      ${area('Pontos principais', 'pontos', (r.pontos || []).join('\n'), { linhas: 4, ajuda: 'Um por linha.' })}
      ${area('Como usar', 'uso', r.uso)}
    </section>
    <section class="ad-card"><h2>Opções</h2>
      ${chave('Pede o número da calça', 'tamanhos', r.tamanhos, { ajuda: 'A cliente escolhe o tamanho antes de comprar.' })}
      ${chaveVisivel(r, fixo)}
    </section>`;
}

function secaoPreco(r, podeSemPreco) {
  const ed = estado.editor;
  if (ed.semPreco === undefined) ed.semPreco = r.preco == null && podeSemPreco && ed.seg === 'produtos';
  const sem = ed.semPreco;
  return `<section class="ad-card"><h2>Preço</h2>
    <div class="ad-2">
      ${campo('De (riscado)', 'de', precoTxt(r.de), { attrs: 'inputmode="decimal" placeholder="Opcional"', ajuda: 'Só use com comprovação do preço anterior.' })}
      ${campo('Por', 'preco', precoTxt(r.preco), { attrs: `inputmode="decimal" ${sem ? 'disabled' : ''}` })}
    </div>
    ${podeSemPreco && estado.editor.seg === 'produtos' ? chave('Sem preço: vem só nos combos', 'semPreco', sem) : ''}
    <p class="ad-previa" id="previa-preco"></p>
  </section>`;
}

const chaveVisivel = (r, fixo) => chave('Visível na loja', 'ativo', r.ativo !== false, fixo
  ? { attrs: 'disabled', ajuda: 'Este item é base do caminho de compra e não pode ser ocultado.' }
  : { ajuda: 'Desligado, some da loja sem apagar.' });

function secaoKit(r) {
  const fixo = Catalogo.FIXOS.includes(r.id);
  const conta = (id) => (r.itens || []).filter((i) => i === id).length;
  return `
    <section class="ad-card"><h2>Fotos</h2>
      ${fotoBloco('Foto principal', 'img', r.img)}
      ${fotoBloco('Segunda foto', 'img2', r.img2, { opcional: true })}
    </section>
    <section class="ad-card"><h2>Identificação</h2>
      ${campo('Nome', 'nome', r.nome, { attrs: 'required' })}
      <div class="ad-2">
        ${campo('Subtítulo', 'sub', r.sub, { ajuda: 'Ex.: Leve 5 produtos.' })}
        ${campo('Selo', 'selo', r.selo, { ajuda: 'Ex.: O que mais sai.' })}
      </div>
      ${campo('Chamada do card', 'gancho', r.gancho, { ajuda: 'Vazia: mostra quanto economiza.' })}
    </section>
    ${secaoPreco(r, false)}
    <section class="ad-card"><h2>O que vem no combo</h2>
      <ul class="ad-compoe">${estado.catalogo.produtos.map((p) => `<li><img src="${esc(p.img)}" alt=""><span>${esc(p.curto || p.nome)}</span>
        <div class="qtd"><button type="button" data-kit="${esc(p.id)}" data-d="-1" aria-label="Menos ${esc(p.nome)}">−</button><span>${conta(p.id)}</span><button type="button" data-kit="${esc(p.id)}" data-d="1" aria-label="Mais ${esc(p.nome)}">+</button></div></li>`).join('')}</ul>
      <h3 class="ad-sub">A cliente escolhe um destes (opcional)</h3>
      ${estado.catalogo.produtos.map((p) => chave(esc(p.curto || p.nome), 'escolha', r.escolha?.includes(p.id), { valor: esc(p.id) })).join('')}
    </section>
    <section class="ad-card"><h2>Textos</h2>
      ${campo('Frase de destaque', 'frase', r.frase)}
      ${area('Descrição', 'desc', r.desc, { linhas: 4 })}
    </section>
    <section class="ad-card"><h2>Opções</h2>${chaveVisivel(r, fixo)}</section>`;
}

function secaoPraia(r) {
  return `
    <section class="ad-card"><h2>Foto e nome</h2>
      ${fotoBloco('Foto', 'img', r.img)}
      ${campo('Nome', 'nome', r.nome, { attrs: 'required' })}
      ${campo('Selo', 'selo', r.selo, { ajuda: 'Ex.: Destaque.' })}
    </section>
    <section class="ad-card"><h2>O que a peça resolve</h2>
      ${FOCOS.map(([id, nome]) => chave(nome, 'foco', r.foco?.includes(id), { valor: id })).join('')}
      ${chave('Entra no "Monte seu biquíni"', 'biquini', r.biquini, { ajuda: 'Top e calcinha em tamanhos diferentes.' })}
    </section>
    <section class="ad-card"><h2>Cores previstas</h2>
      <div class="ad-cores">${(r.cores || []).map((c, i) => `<div><input type="color" name="cor" value="${esc(c)}" aria-label="Cor ${i + 1}">${r.cores.length > 1 ? `<button class="ad-link ad-perigo" type="button" data-tirar-cor="${i}">Tirar</button>` : ''}</div>`).join('')}</div>
      ${(r.cores || []).length < 5 ? '<button class="ad-link ad-add" type="button" data-nova-cor>Adicionar cor</button>' : ''}
    </section>
    <section class="ad-card"><h2>Opções</h2>${chaveVisivel(r, false)}</section>`;
}

function desenharEditor() {
  const { seg, id, r } = estado.editor;
  const alvo = $('#aba');
  const secoes = { produtos: secaoProduto, kits: secaoKit, praia: secaoPraia }[seg];
  const bloqueio = !id ? null : Catalogo.FIXOS.includes(id) ? 'Este item é base do caminho de compra: dá para editar, não para excluir.'
    : seg !== 'praia' && usadoEmKits(id).length ? `Faz parte de: ${usadoEmKits(id).join(', ')}. Tire do combo antes de excluir.` : null;
  alvo.innerHTML = `
    <button class="ad-voltar" type="button" data-voltar>${I.voltar}Voltar para a lista</button>
    <div class="ad-cab"><h1 class="ad-h1">${id ? esc(r.nome) : SEGMENTOS[seg][1]}</h1>${id && seg !== 'praia' ? `<a class="ad-link" href="produto.html?id=${esc(id)}" target="_blank" rel="noopener">Ver na loja</a>` : ''}</div>
    <form id="editor" class="ad-form" novalidate>
      ${secoes(r)}
      ${id ? `<section class="ad-card ad-zona"><h2>Excluir</h2>${bloqueio ? `<p class="ad-texto">${esc(bloqueio)}</p>` : '<button class="ad-link ad-perigo" type="button" data-excluir-item>Excluir este item da loja</button>'}</section>` : ''}
      <div class="ad-salvar"><p class="dica-tam erro" data-erro hidden></p><button class="btn btn-preto btn-bloco" type="submit">Salvar</button></div>
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
  if (el.ativo && !el.ativo.disabled) r.ativo = el.ativo.checked;
  if (seg === 'praia') {
    r.foco = marcados('foco');
    if (el.biquini.checked) r.biquini = true; else delete r.biquini;
    r.cores = $$('[name="cor"]', f).map((x) => x.value);
    return;
  }
  ['frase', 'desc'].forEach(opcional);
  const de = lerPreco(valor('de'));
  if (de === null) delete r.de; else r.de = de;
  if (el.semPreco) estado.editor.semPreco = el.semPreco.checked;
  r.preco = estado.editor.semPreco ? null : lerPreco(valor('preco'));
  if (seg === 'kits') {
    ['sub', 'gancho'].forEach(opcional);
    const escolha = marcados('escolha');
    if (escolha.length) r.escolha = escolha; else delete r.escolha;
    return;
  }
  ['curto', 'plural', 'uso'].forEach(opcional);
  if (el.cat && !el.cat.disabled) r.cat = el.cat.value;
  if (el.barbatanas) { if (valor('barbatanas')) r.barbatanas = Number(valor('barbatanas')); else delete r.barbatanas; }
  r.pontos = valor('pontos').split('\n').map((x) => x.trim()).filter(Boolean);
  if (!r.pontos.length) delete r.pontos;
  if (el.tamanhos.checked) r.tamanhos = true; else delete r.tamanhos;
  (r.galeria || []).forEach((g, i) => { const t = valor(`g-${i}`); if (t) g.txt = t; else delete g.txt; });
}

function validarEditor() {
  const { seg, id, r } = estado.editor;
  const fixo = Catalogo.FIXOS.includes(id);
  if (!r.nome) return 'Escreva o nome.';
  if (!r.img) return 'Escolha a foto principal.';
  if (seg === 'praia') return r.cores?.length ? null : 'Deixe pelo menos uma cor.';
  if (!r.desc) return 'Escreva a descrição.';
  if (Number.isNaN(r.de)) return 'O preço "de" não parece um número. Ex.: 650 ou 369,99.';
  if (Number.isNaN(r.preco)) return 'O preço "por" não parece um número. Ex.: 650 ou 369,99.';
  if ((seg === 'kits' || fixo) && !r.preco) return 'Este item precisa de preço.';
  if (seg === 'produtos' && !estado.editor.semPreco && r.preco == null) return 'Escreva o preço ou marque "Sem preço".';
  if (r.preco != null && r.preco <= 0) return 'O preço precisa ser maior que zero.';
  if (r.de && r.preco && r.de <= r.preco) return 'O preço "de" precisa ser maior que o "por", ou fique vazio.';
  if (seg === 'kits' && !r.itens?.length) return 'Coloque pelo menos um produto no combo.';
  if (id === 'combo-duplo' && !r.escolha?.length) return 'O Combo Duplo precisa de pelo menos uma opção para a cliente escolher.';
  if (seg === 'produtos' && r.cat === 'cintas' && r.preco != null && !r.barbatanas) return 'Informe quantas barbatanas a cinta tem.';
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
    const onde = [['frase', x.frase], ['chamada', x.gancho], ['descrição', x.desc], ['subtítulo', x.sub], ...(x.pontos || []).map((p) => ['pontos', p])]
      .filter(([, t]) => t && /R\$\s?\d/.test(t)).map(([n]) => n);
    if (onde.length) achados.push(`${x.nome} (${[...new Set(onde)].join(', ')})`);
  });
  return achados;
}

function ligarEditor(alvo) {
  const form = $('#editor');
  const ed = estado.editor;
  const { seg, id } = ed;
  const redesenhar = () => { lerEditor(); ed.sujo = true; desenharEditor(); };

  form.addEventListener('input', () => { ed.sujo = true; });
  $('[data-voltar]', alvo).addEventListener('click', () => {
    if (ed.sujo && !confirm('Sair sem salvar as alterações?')) return;
    estado.editor = null;
    abaProdutos(alvo);
    scrollTo(0, 0);
  });
  form.elements.cat?.addEventListener('change', redesenhar);
  form.elements.semPreco?.addEventListener('change', redesenhar);

  // Conta do Pix e das parcelas ao digitar o preço
  const previa = $('#previa-preco', form);
  const atualizarPrevia = () => {
    if (!previa) return;
    const p = lerPreco(form.elements.preco.value);
    const { pix, parcelas } = estado.catalogo.loja;
    previa.textContent = p > 0 ? `A cliente vê: ${brl(p * (1 - pix))} no Pix · ${parcelas}x de ${brl(p / parcelas)}` : '';
  };
  form.elements.preco?.addEventListener('input', atualizarPrevia);
  atualizarPrevia();

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
    if (inp.files[0]) enviarFoto(inp.files[0], (url) => { ed.r[nome] = url; });
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
      erro.hidden = false;
      erro.textContent = problema;
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
    if (await salvarCatalogo(id ? 'Alterações salvas' : 'Item criado')) {
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

// ---------------- Aba Loja ----------------
function abaLoja(alvo) {
  const l = estado.catalogo.loja;
  const local = Banco.modo === 'local';
  alvo.innerHTML = `
    <div class="ad-cab"><h1 class="ad-h1">Loja</h1></div>
    <form id="form-loja" class="ad-form" novalidate>
      <section class="ad-card"><h2>Contato</h2>
        ${campo('Número do WhatsApp', 'whatsappNumero', l.whatsappNumero, { attrs: 'inputmode="numeric" placeholder="5521999999999"', ajuda: 'Só números, com 55 e DDD. Com ele, o pedido já abre escrito na conversa.' })}
        ${campo('Link do WhatsApp', 'whatsapp', l.whatsapp, { tipo: 'url' })}
        <div class="ad-2">
          ${campo('Instagram (link)', 'instagram', l.instagram, { tipo: 'url' })}
          ${campo('Instagram (arroba)', 'arroba', l.arroba)}
        </div>
        ${campo('Link dos antes e depois', 'antesDepois', l.antesDepois, { tipo: 'url' })}
        ${campo('Cidade de envio', 'cidade', l.cidade)}
      </section>
      <section class="ad-card"><h2>Vendas</h2>
        <div class="ad-3">
          ${campo('Frete grátis acima de', 'freteGratis', precoTxt(l.freteGratis), { attrs: 'inputmode="decimal"' })}
          ${campo('Desconto no Pix (%)', 'pixPct', precoTxt(Math.round(l.pix * 1000) / 10), { attrs: 'inputmode="decimal"' })}
          ${campo('Parcelas sem juros', 'parcelas', l.parcelas, { tipo: 'number', attrs: 'inputmode="numeric" min="1" max="24"' })}
        </div>
        ${campo('Lançamento da moda praia', 'lancamentoPraia', (l.lancamentoPraia || '').slice(0, 16), { tipo: 'datetime-local', ajuda: 'Vazio: a contagem regressiva não aparece. Só use data real.' })}
      </section>
      <section class="ad-card"><h2>Tabela de tamanhos</h2>
        <p class="ad-texto">O número de calça que cada tamanho veste. Vale para toda a loja.</p>
        <div id="tabela-tam">${estado.catalogo.tabela.map(linhaTamanho).join('')}</div>
        <button class="ad-link ad-add" type="button" data-novo-tam>Adicionar tamanho</button>
      </section>
      <div class="ad-salvar"><p class="dica-tam erro" data-erro hidden></p><button class="btn btn-preto btn-bloco" type="submit">Salvar dados da loja</button></div>
    </form>

    <section class="ad-card ad-espaco"><h2>Conexão com o banco</h2>
      ${local ? `<p class="ad-texto"><b>Ainda não conectado.</b> O painel está funcionando só neste navegador. Depois de conectar, os pedidos de todas as clientes chegam aqui e as edições passam a valer na loja. Os produtos que você já ajustou aqui são levados para o banco na primeira entrada.</p>
      <ol class="ad-passos">
        <li>Na conta da cliente, crie o projeto no Supabase, região São Paulo.</li>
        <li>No SQL Editor, cole o arquivo <code>supabase/schema.sql</code> e clique em Run.</li>
        <li>Coloque a URL e a chave pública em <code>js/config.js</code> e publique o site.</li>
        <li>Volte aqui e crie sua conta. O passo a passo completo está em <code>supabase/LEIA-ME.md</code>.</li>
      </ol>` : '<p class="ad-texto"><b>Conectado ao Supabase.</b> Pedidos, produtos e dados da loja estão salvos no banco.</p>'}
    </section>

    <section class="ad-card ad-espaco"><h2>Sua conta</h2>
      <form id="form-senha" class="ad-form-mini" novalidate>
        <div class="campo"><label for="nova-senha">Nova senha</label><input id="nova-senha" type="password" autocomplete="new-password" minlength="8"></div>
        <button class="btn btn-claro" type="submit">Trocar senha</button>
      </form>
    </section>

    <section class="ad-card ad-espaco"><h2>Dados</h2>
      <div class="ad-acoes">
        <button class="btn btn-claro ad-btn-p" type="button" data-baixar-cat>Baixar cópia do catálogo</button>
        ${local && !temExemplos() ? '<button class="btn btn-claro ad-btn-p" type="button" data-por-exemplos>Ver com dados de exemplo</button>' : ''}
        ${local && temExemplos() ? '<button class="btn btn-claro ad-btn-p" type="button" data-tirar-exemplos>Remover dados de exemplo</button>' : ''}
        ${local ? '<button class="ad-link ad-perigo" type="button" data-restaurar>Desfazer todas as edições deste navegador</button>' : ''}
      </div>
    </section>`;

  const form = $('#form-loja');
  const tabela = $('#tabela-tam', form);
  $('[data-novo-tam]', form).addEventListener('click', () => tabela.insertAdjacentHTML('beforeend', linhaTamanho({ t: '', calca: [] })));
  tabela.addEventListener('click', (e) => { if (e.target.matches('[data-tirar-tam]')) e.target.closest('.ad-tam').remove(); });

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
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) return falhar('As parcelas precisam ficar entre 1 e 24.');
    const linhas = $$('.ad-tam', form).map((d) => ({
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
      pix: pixPct / 100,
      parcelas,
      lancamentoPraia: dataPraia ? `${dataPraia}:00-03:00` : '',
    };
    estado.catalogo.tabela = linhas;
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
const linhaTamanho = (x) => `<div class="ad-tam"><input data-t value="${esc(x.t)}" placeholder="P" aria-label="Tamanho"><input data-c value="${esc(x.calca.join(', '))}" inputmode="numeric" placeholder="36, 38" aria-label="Números de calça"><button class="ad-link ad-perigo" type="button" data-tirar-tam>Tirar</button></div>`;

// ---------------- Início ----------------
(async () => {
  try {
    if (!crypto?.subtle) throw new Error('Abra o painel por um endereço seguro (https).');
    await Banco.iniciar();
    await abrirPainel();
  } catch (e) {
    $('#painel').innerHTML = `<main class="ad-acesso"><div class="ad-acesso-caixa"><span class="logo"><b>Paola</b><small>Corpus Fit</small></span><h1>Não deu para abrir o painel</h1><p>${esc(e.message)}</p><button class="btn btn-preto btn-bloco" type="button" onclick="location.reload()">Tentar de novo</button></div></main>`;
  }
})();
