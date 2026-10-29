// =============================================================
// Paola Corpus Fit — protótipo: topo, sacola, vitrines e telas
// =============================================================
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pix = (v) => v * (1 - LOJA.pix);
const parcela = (v) => v / LOJA.parcelas;
const item = (id) => PRODUTOS.find((p) => p.id === id) || KITS.find((k) => k.id === id);
const nomeCurto = (it) => it.curto || it.nome;
const precisaTamanho = (it) => (it.itens ? it.itens.some((i) => item(i).tamanhos) : !!it.tamanhos);
const tamanhoPorCintura = (cm) => (TABELA.find((x) => cm >= x.min && cm <= x.max) || (cm > 110 ? TABELA[6] : TABELA[0]));

// ---------------- Ícones ----------------
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const I = {
  menu: svg('<path d="M4 7h16M4 12h16M4 17h10"/>'),
  sacola: svg('<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>'),
  fechar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  seta: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  regua: svg('<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4"/>'),
  caminhao: svg('<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>'),
  ziper: svg('<path d="M12 3v18"/><path d="M9.5 6h2.5M12 9h2.5M9.5 12h2.5M12 15h2.5"/><rect x="9" y="17" width="6" height="4" rx="1"/>'),
  barbatana: svg('<path d="M6 4v16M10 4v16M14 4v16M18 4v16"/>'),
  coracao: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  chat: svg('<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.8A8.5 8.5 0 1 1 21 11.5z"/>'),
  escudo: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  ok: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3"'),
  sol: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  agua: svg('<path d="M2.5 15c2.4 0 2.4-2 4.75-2s2.4 2 4.75 2 2.4-2 4.75-2 2.4 2 4.75 2M2.5 19.5c2.4 0 2.4-2 4.75-2s2.4 2 4.75 2 2.4-2 4.75-2 2.4 2 4.75 2"/><path d="M12 3c2.5 3 4 5 4 6.5a4 4 0 0 1-8 0C8 8 9.5 6 12 3z"/>'),
  insta: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor"/>'),
  whats: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
};

// Foto do item (kits usam a foto do kit; peças com 2ª foto trocam no hover)
function midia(it, lazy = true) {
  const carregar = lazy ? ' loading="lazy"' : '';
  if (it.itens) return `<img src="img/kit.webp" alt=""${carregar}>`;
  return `<img src="${it.img}" alt=""${carregar}>${it.img2 ? `<img class="img2" src="${it.img2}" alt=""${carregar}>` : ''}`;
}

// ---------------- Topo, menu e rodapé ----------------
const MENU = [
  ['Cintas', 'loja.html#cintas'],
  ['Sutiãs', 'loja.html#sutias'],
  ['Tratamento', 'loja.html#tratamento'],
  ['Kits', 'loja.html#kits'],
  ['Moda Praia', 'moda-praia.html', true],
];

function montarTopo() {
  const pagina = document.body.dataset.pagina;
  const avisos = [`Frete grátis acima de ${brl(LOJA.freteGratis)}`, `${Math.round(LOJA.pix * 100)}% off no Pix`, `Até ${LOJA.parcelas}x sem juros`, 'Moda praia chegando ☀'];
  $('#topo').innerHTML = `
  <div class="aviso" aria-live="off"><span>${avisos[0]}</span></div>
  <header class="cab">
    <div class="wrap cab-in">
      <button class="ico-btn menu-btn" type="button" data-abrir="menu" aria-label="Abrir menu">${I.menu}</button>
      <a class="logo" href="index.html" aria-label="Paola Corpus Fit, página inicial"><b>Paola</b><small>Corpus Fit</small></a>
      <nav class="nav" aria-label="Menu principal">
        ${MENU.map(([nome, link, novo]) => `<a href="${link}" ${novo && pagina === 'praia' ? 'aria-current="page"' : ''}>${nome}${novo ? '<span class="novo">Novo</span>' : ''}</a>`).join('')}
      </nav>
      <div class="cab-dir">
        <a class="zap-topo" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}WhatsApp</a>
        <button class="ico-btn" type="button" data-abrir="sacola" aria-label="Abrir sacola">${I.sacola}<span class="conta-sacola" hidden>0</span></button>
      </div>
    </div>
  </header>
  <div class="veu"></div>
  <aside class="gaveta esq" id="g-menu" aria-label="Menu">
    <div class="gaveta-topo"><h2>Menu</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="gaveta-corpo">
      <a class="menu-praia" href="moda-praia.html"><span>Lançamento</span><b>Moda Praia</b><span>Entre na lista de espera →</span></a>
      <nav class="menu-links">${MENU.slice(0, 4).map(([nome, link]) => `<a href="${link}">${nome}${I.seta}</a>`).join('')}<a href="index.html#tamanho">Meu tamanho${I.seta}</a></nav>
      <div class="menu-contato">
        <a class="btn btn-preto" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}Falar no WhatsApp</a>
        <a class="btn btn-claro" href="${LOJA.instagram}" target="_blank" rel="noopener">${I.insta}${LOJA.arroba}</a>
      </div>
    </div>
  </aside>
  <aside class="gaveta dir" id="g-sacola" aria-label="Sacola">
    <div class="gaveta-topo"><h2>Sua sacola</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="gaveta-corpo"></div>
    <div class="gaveta-pe"></div>
  </aside>
  <div class="modal" id="modal" role="dialog" aria-modal="true"></div>
  <div class="toast" role="status" aria-live="polite"></div>`;

  let i = 0;
  setInterval(() => { i = (i + 1) % avisos.length; $('.aviso').innerHTML = `<span>${avisos[i]}</span>`; }, 3500);
  desenharSacola();
}

function montarRodape() {
  $('#rodape').innerHTML = `
  <footer class="rodape">
    <div class="wrap">
      <div class="rodape-grade">
        <div>
          <span class="logo"><b>Paola</b><small>Corpus Fit</small></span>
          <p style="margin-top:14px;max-width:30ch">Cintas modeladoras e, em breve, moda praia. Do ${LOJA.cidade} para todo o Brasil.</p>
        </div>
        <div><h4>Loja</h4><ul>${MENU.map(([nome, link]) => `<li><a href="${link}">${nome}</a></li>`).join('')}</ul></div>
        <div><h4>Ajuda</h4><ul>
          <li><a href="index.html#tamanho">Descobrir meu tamanho</a></li>
          <li><a href="index.html#duvidas">Dúvidas frequentes</a></li>
          <li><a href="${LOJA.whatsapp}" target="_blank" rel="noopener">Atendimento no WhatsApp</a></li>
        </ul></div>
        <div><h4>Siga</h4><ul>
          <li><a href="${LOJA.instagram}" target="_blank" rel="noopener">Instagram ${LOJA.arroba}</a></li>
          <li><a href="${LOJA.antesDepois}" target="_blank" rel="noopener">Antes e depois de clientes</a></li>
        </ul>
          <h4 style="margin-top:22px">Pagamento</h4>
          <div class="pagamentos"><span>Pix</span><span>Crédito ${LOJA.parcelas}x</span><span>Boleto</span></div>
        </div>
      </div>
      <div class="rodape-base">© 2026 Paola Corpus Fit · Protótipo visual de demonstração: preços avulsos ilustrativos e nenhum pedido é cobrado.</div>
    </div>
  </footer>`;
}

// ---------------- Gavetas e modal ----------------
function abrir(qual) {
  fecharTudo();
  $(`#g-${qual}`).classList.add('aberta');
  $('.veu').classList.add('aberto');
  document.body.classList.add('travado');
}
function abrirModal(html) {
  fecharTudo();
  const m = $('#modal');
  m.innerHTML = html;
  m.classList.add('aberta');
  $('.veu').classList.add('aberto');
  document.body.classList.add('travado');
  return m;
}
function fecharTudo() {
  $$('.gaveta.aberta, .modal.aberta').forEach((g) => g.classList.remove('aberta'));
  $('.veu')?.classList.remove('aberto');
  document.body.classList.remove('travado');
}

let tempoToast;
function toast(msg) {
  const t = $('.toast');
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(tempoToast);
  tempoToast = setTimeout(() => t.classList.remove('ver'), 2400);
}

// ---------------- Sacola ----------------
let sacolaMemoria = [];
function lerSacola() {
  try { const v = localStorage.getItem('pcf-sacola'); if (v) return JSON.parse(v); } catch (e) { /* sem armazenamento */ }
  return sacolaMemoria;
}
function gravarSacola(s) {
  sacolaMemoria = s;
  try { localStorage.setItem('pcf-sacola', JSON.stringify(s)); } catch (e) { /* ok */ }
  desenharSacola();
}
function adicionar(id, tam = null, qtd = 1) {
  const s = lerSacola();
  const chave = `${id}|${tam || ''}`;
  const achado = s.find((x) => x.chave === chave);
  if (achado) achado.qtd += qtd;
  else s.push({ chave, id, tam, qtd });
  gravarSacola(s);
  abrir('sacola');
}
const subtotal = (s = lerSacola()) => s.reduce((t, x) => t + item(x.id).preco * x.qtd, 0);

function desenharSacola() {
  const s = lerSacola();
  const n = s.reduce((t, x) => t + x.qtd, 0);
  const conta = $('.conta-sacola');
  conta.textContent = n;
  conta.hidden = !n;
  const corpo = $('#g-sacola .gaveta-corpo');
  const pe = $('#g-sacola .gaveta-pe');

  if (!s.length) {
    corpo.innerHTML = `<div class="sacola-vazia">${I.sacola}<b>Sua sacola está vazia</b><p style="color:var(--tinta-2)">Comece pela queridinha da Paola.</p><a class="btn btn-preto" href="produto.html?id=cinta-ziper-30">Ver a Cinta 30 Barbatanas</a></div>`;
    pe.innerHTML = '';
    pe.hidden = true;
    return;
  }

  const sub = subtotal(s);
  const falta = Math.max(0, LOJA.freteGratis - sub);
  // Sugestão de "compre junto": o primeiro complemento que ainda não está na sacola
  const sugestao = ['gel-pimenta', 'sutia-reforcado', 'creme-pimenta'].map(item).find((p) => !s.some((x) => x.id === p.id || item(x.id).itens?.includes(p.id)));

  corpo.innerHTML = `
    <div class="frete">${falta > 0 ? `Faltam <b>${brl(falta)}</b> para o frete grátis` : '🎉 Você ganhou frete grátis'}<div class="trilho"><i style="width:${Math.min(100, (sub / LOJA.freteGratis) * 100)}%"></i></div></div>
    ${s.map((x) => {
      const it = item(x.id);
      return `<div class="item-sacola" data-chave="${x.chave}">
        <span class="mini">${midia(it)}</span>
        <div><h3>${it.nome}</h3><div class="det">${x.tam ? `Tamanho ${x.tam}` : 'Tamanho único'}</div>
          <div class="qtd"><button type="button" data-q="-1" aria-label="Diminuir">−</button><span>${x.qtd}</span><button type="button" data-q="1" aria-label="Aumentar">+</button></div>
          <button class="remover" type="button">Remover</button></div>
        <span class="valor">${brl(it.preco * x.qtd)}</span>
      </div>`;
    }).join('')}
    ${sugestao ? `<div class="sugestao"><span class="mini">${midia(sugestao)}</span><div><small>Compre junto</small><b>${nomeCurto(sugestao)}</b><span style="font-size:13px">${brl(sugestao.preco)}</span></div><button type="button" data-sugestao="${sugestao.id}" aria-label="Adicionar ${nomeCurto(sugestao)}">${I.mais}</button></div>` : ''}`;

  pe.hidden = false;
  pe.innerHTML = `
    <div class="total-linha"><span>Total</span><span>${brl(sub)}</span></div>
    <div class="total-pix">ou ${brl(pix(sub))} no Pix · ${LOJA.parcelas}x de ${brl(parcela(sub))}</div>
    <button class="btn btn-preto btn-bloco" type="button" data-finalizar>${I.whats}Finalizar pelo WhatsApp</button>
    <p class="pe-nota">O resumo do pedido vai pronto para a conversa com a Paola.</p>`;

  $$('.item-sacola', corpo).forEach((linha) => {
    const chave = linha.dataset.chave;
    $$('.qtd button', linha).forEach((b) => b.addEventListener('click', () => {
      const s2 = lerSacola();
      const x = s2.find((y) => y.chave === chave);
      x.qtd = Math.max(1, Math.min(9, x.qtd + Number(b.dataset.q)));
      gravarSacola(s2);
    }));
    $('.remover', linha).addEventListener('click', () => gravarSacola(lerSacola().filter((y) => y.chave !== chave)));
  });
}

async function finalizar() {
  const s = lerSacola();
  const texto = `Oi, Paola! Quero fazer este pedido:\n${s.map((x) => `• ${x.qtd}x ${item(x.id).nome}${x.tam ? ` (tam. ${x.tam})` : ''}`).join('\n')}\nTotal: ${brl(subtotal(s))}`;
  try { await navigator.clipboard.writeText(texto); toast('Resumo copiado. É só colar na conversa.'); } catch (e) { /* sem permissão */ }
  setTimeout(() => window.open(LOJA.whatsapp, '_blank', 'noopener'), 600);
}

// Escolher tamanho rápido (a partir do botão + dos cards)
function escolherTamanho(id) {
  const it = item(id);
  const m = abrirModal(`
    <div class="modal-topo"><h2>Escolha o tamanho</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <p style="font-weight:700;margin-bottom:14px">${it.nome} · ${brl(it.preco)}</p>
    <div class="tamanhos">${TABELA.map((x) => `<button class="chip" type="button" data-t="${x.t}">${x.t}</button>`).join('')}</div>
    <p class="dica-tam">Pela cintura: PP 58–64 cm até EG 111–130 cm.</p>
    <button class="link-tam" type="button" data-medidor style="margin-top:14px">${I.regua}Não sei meu tamanho</button>`);
  $$('.chip', m).forEach((b) => b.addEventListener('click', () => adicionar(id, b.dataset.t)));
  $('[data-medidor]', m).addEventListener('click', (e) => { e.stopPropagation(); abrirMedidor((t) => adicionar(id, t)); });
}

// ---------------- Medidor de tamanho ----------------
function medidorHTML() {
  return `<div class="medida-ui">
    <div class="medida-valor"><span data-cm>76</span> <small>cm de cintura</small></div>
    <div class="fita"><span class="fita-ponteiro"></span></div>
    <input class="regua" type="range" min="58" max="130" value="76" aria-label="Medida da cintura em centímetros">
    <div class="resultado-tam"><span class="letra" data-tam>M</span><div><b>Seu tamanho é <span data-tam>M</span></b><small data-calca></small></div></div>
  </div>`;
}
function ligarMedidor(raiz, aoMudar) {
  const regua = $('.regua', raiz);
  const atualizar = () => {
    const cm = Number(regua.value);
    const linha = tamanhoPorCintura(cm);
    $('[data-cm]', raiz).textContent = cm;
    $$('[data-tam]', raiz).forEach((el) => { el.textContent = linha.t; });
    $('[data-calca]', raiz).textContent = `Costuma vestir calça ${linha.calca}`;
    $('.fita-ponteiro', raiz).style.left = `${((cm - 58) / (130 - 58)) * 100}%`;
    if (aoMudar) aoMudar(linha);
  };
  regua.addEventListener('input', atualizar);
  atualizar();
}
function abrirMedidor(aoEscolher) {
  const m = abrirModal(`
    <div class="modal-topo"><h2>Descubra seu tamanho</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <p style="color:var(--tinta-2);margin-bottom:16px">Passe a fita métrica na parte mais fina da cintura e arraste até a sua medida.</p>
    ${medidorHTML()}
    <table class="tabela-mini"><thead><tr><th>Tamanho</th><th>Cintura</th><th>Calça</th></tr></thead>
      <tbody>${TABELA.map((x) => `<tr data-linha="${x.t}"><td>${x.t}</td><td>${x.min} a ${x.max} cm</td><td>${x.calca}</td></tr>`).join('')}</tbody></table>
    <button class="btn btn-preto btn-bloco" type="button" data-usar style="margin-top:18px">Usar este tamanho</button>`);
  let escolhido = 'M';
  ligarMedidor(m, (linha) => {
    escolhido = linha.t;
    $$('tr[data-linha]', m).forEach((tr) => tr.classList.toggle('sua', tr.dataset.linha === linha.t));
  });
  $('[data-usar]', m).addEventListener('click', () => { fecharTudo(); if (aoEscolher) aoEscolher(escolhido); });
}

// ---------------- Cards ----------------
function card(it) {
  return `<div class="card">
    <div class="moldura">
      <a class="img" href="produto.html?id=${it.id}" aria-label="${it.nome}">
        ${it.selo ? `<span class="selo ${it.itens ? 'rosa' : ''}">${it.selo}</span>` : ''}${midia(it)}
      </a>
      <button class="btn-add" type="button" data-add="${it.id}" aria-label="Adicionar ${it.nome} à sacola">${I.mais}</button>
    </div>
    <a href="produto.html?id=${it.id}"><h3>${it.nome}</h3></a>
    <div class="precos">${it.de ? `<span class="de">${brl(it.de)}</span>` : ''}<span class="por">${brl(it.preco)}</span></div>
    <span class="parc"><b>${brl(pix(it.preco))}</b> no Pix</span>
  </div>`;
}

function cardKit(k) {
  return `<div class="kit">
    <a class="img" href="produto.html?id=${k.id}">${k.selo ? `<span class="selo rosa">${k.selo}</span>` : ''}${midia(k)}</a>
    <div>
      <a href="produto.html?id=${k.id}"><h3>${k.nome}</h3></a>
      <p class="itens">${k.itens.map((i) => nomeCurto(item(i))).join(' + ')}</p>
      <div class="precos"><span class="de">${brl(k.de)}</span><span class="por">${brl(k.preco)}</span></div>
      <span class="economia">Economize ${brl(k.de - k.preco)}</span><br>
      <button class="btn btn-preto" type="button" data-add="${k.id}">Quero o kit</button>
    </div>
  </div>`;
}

// ---------------- Telas ----------------
function telaInicio() {
  const cats = [
    { nome: 'Cintas', link: 'loja.html#cintas', img: 'img/cinta.webp' },
    { nome: 'Sutiãs', link: 'loja.html#sutias', img: 'img/sutia.webp' },
    { nome: 'Tratamento', link: 'loja.html#tratamento', img: 'img/gel.webp' },
    { nome: 'Kits', link: 'loja.html#kits', img: 'img/kit.webp' },
    { nome: 'Moda Praia', link: 'moda-praia.html', img: 'img/praia-cintura-alta.webp', praia: true },
  ];
  $('#categorias').innerHTML = cats.map((c) => `<a class="cat" href="${c.link}"><span class="img">${c.praia ? '<span class="novo">Novo</span>' : ''}<img src="${c.img}" alt="" loading="lazy"></span><b>${c.nome}</b></a>`).join('');
  $('#mais-vendidos').innerHTML = PRODUTOS.map(card).join('');
  $('#kits').innerHTML = KITS.map(cardKit).join('');
  $('#praia-pecas').innerHTML = PRAIA.slice(0, 3).map((p) => `<span><img src="${p.img}" alt="${p.nome}" loading="lazy"></span>`).join('');

  const med = $('#medidor-home');
  med.innerHTML = medidorHTML();
  ligarMedidor(med, (linha) => {
    $('#comprar-tamanho').href = `produto.html?id=cinta-ziper-30&tam=${linha.t}`;
    $('#comprar-tamanho').textContent = `Ver a cinta no tamanho ${linha.t}`;
  });
}

function telaLoja() {
  const filtros = [['tudo', 'Tudo'], ['cintas', 'Cintas'], ['sutias', 'Sutiãs'], ['tratamento', 'Tratamento'], ['kits', 'Kits']];
  const todos = [...PRODUTOS, ...KITS];
  let ordem = 'vendidos';

  const desenhar = () => {
    const cat = location.hash.slice(1) || 'tudo';
    let lista = cat === 'tudo' ? todos : todos.filter((x) => x.cat === cat);
    if (ordem === 'menor') lista = [...lista].sort((a, b) => a.preco - b.preco);
    if (ordem === 'maior') lista = [...lista].sort((a, b) => b.preco - a.preco);
    $('#filtros').innerHTML = filtros.map(([id, nome]) => `<a class="filtro" href="#${id}" aria-pressed="${id === cat}">${nome}</a>`).join('') + '<a class="filtro filtro-praia" href="moda-praia.html">☀ Moda Praia</a>';
    $('#total-itens').textContent = `${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}`;
    $('#grade-loja').innerHTML = lista.map(card).join('');
  };
  $('#ordem').addEventListener('change', (e) => { ordem = e.target.value; desenhar(); });
  window.addEventListener('hashchange', desenhar);
  desenhar();
}

function telaProduto() {
  const busca = new URLSearchParams(location.search);
  const it = item(busca.get('id')) || item('cinta-ziper-30');
  const ehKit = !!it.itens;
  const usaTam = precisaTamanho(it);
  let tamanho = busca.get('tam');
  let qtd = 1;
  document.title = `${it.nome} | Paola Corpus Fit`;

  const fotos = ehKit ? ['img/kit.webp', ...it.itens.map((i) => item(i).img)] : (it.galeria || [it.img]);
  const galeria = fotos.map((f) => `<figure><img src="${f}" alt="${it.nome}"></figure>`).join('');
  const kitJunto = ehKit ? null : KITS.find((k) => k.itens.includes(it.id));

  $('#produto').innerHTML = `
    <nav class="migalha"><a href="index.html">Início</a> / <a href="loja.html#${it.cat}">${({ cintas: 'Cintas', sutias: 'Sutiãs', tratamento: 'Tratamento', kits: 'Kits' })[it.cat]}</a> / ${nomeCurto(it)}</nav>
    <div class="prod">
      <div class="galeria ${fotos.length > 1 ? '' : 'unica'}">${galeria}</div>
      <div class="prod-info">
        ${it.selo ? `<span class="selo rosa" style="position:static;display:inline-block">${it.selo}</span>` : ''}
        <h1>${it.nome}</h1>
        ${it.frase ? `<p class="frase">${it.frase}</p>` : ''}
        <div class="preco-bloco">
          <div class="linha1">${it.de ? `<span class="de">${brl(it.de)}</span>` : ''}<span class="por">${brl(it.preco)}</span>${it.de ? `<span class="economia">-${Math.round((1 - it.preco / it.de) * 100)}%</span>` : ''}</div>
          <div class="pix">${brl(pix(it.preco))} no Pix (${Math.round(LOJA.pix * 100)}% off)</div>
          <div class="parc">ou ${LOJA.parcelas}x de ${brl(parcela(it.preco))} sem juros</div>
        </div>
        ${ehKit ? `<div class="grupo"><div class="grupo-titulo">Vem no kit</div><ul class="itens-kit">${it.itens.map((i) => `<li><span class="mini">${midia(item(i))}</span>${item(i).nome}</li>`).join('')}</ul></div>` : ''}
        ${usaTam ? `<div class="grupo" id="tamanho">
          <div class="grupo-titulo">Tamanho <button class="link-tam" type="button" data-medidor>${I.regua}Descobrir meu tamanho</button></div>
          <div class="tamanhos" role="radiogroup" aria-label="Tamanho">${TABELA.map((x) => `<button class="chip" type="button" role="radio" data-t="${x.t}" aria-checked="${x.t === tamanho}">${x.t}</button>`).join('')}</div>
          <p class="dica-tam">${tamanho ? `Tamanho ${tamanho}: cintura de ${TABELA.find((x) => x.t === tamanho).min} a ${TABELA.find((x) => x.t === tamanho).max} cm.` : 'Escolha pela medida da cintura, não pelo número da calça.'}</p>
        </div>` : ''}
        <div class="compra-acoes">
          <div class="qtd"><button type="button" data-q="-1" aria-label="Diminuir">−</button><span>1</span><button type="button" data-q="1" aria-label="Aumentar">+</button></div>
          <button class="btn btn-preto" type="button" id="adicionar">Adicionar à sacola</button>
          <a class="btn btn-claro" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}Comprar pelo WhatsApp</a>
        </div>
        <div class="garantias">
          <div>${I.caminhao}Frete grátis acima de ${brl(LOJA.freteGratis)} · envio para todo o Brasil</div>
          <div>${I.chat}A Paola tira suas dúvidas no WhatsApp</div>
        </div>
        ${it.pontos ? `<ul class="pontos-prod">${it.pontos.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}
        ${kitJunto ? `<div class="junto">
          <div class="grupo-titulo" style="margin:0">Compre junto e economize</div>
          <div class="junto-pecas">${kitJunto.itens.map((i) => `<span class="mini">${midia(item(i))}</span>`).join('<i>+</i>')}</div>
          <b>${kitJunto.nome}</b>
          <div class="precos"><s>${brl(kitJunto.de)}</s> por <strong>${brl(kitJunto.preco)}</strong></div>
          <a class="btn btn-preto btn-bloco" href="produto.html?id=${kitJunto.id}">Ver o kit</a>
        </div>` : ''}
        <div class="detalhes">
          <details open><summary>Descrição</summary><div class="conteudo">${it.desc}</div></details>
          ${it.uso ? `<details><summary>Como usar</summary><div class="conteudo">${it.uso}</div></details>` : ''}
          ${usaTam ? `<details><summary>Tabela de medidas</summary><div class="conteudo"><table class="tabela-mini" style="margin:0"><thead><tr><th>Tam.</th><th>Cintura</th><th>Calça</th></tr></thead><tbody>${TABELA.map((x) => `<tr><td>${x.t}</td><td>${x.min} a ${x.max} cm</td><td>${x.calca}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
          <details><summary>Entrega e pagamento</summary><div class="conteudo">Enviamos do ${LOJA.cidade} para todo o Brasil. Pix com ${Math.round(LOJA.pix * 100)}% de desconto ou cartão em até ${LOJA.parcelas}x sem juros.</div></details>
        </div>
      </div>
    </div>`;

  // Bloco "no dia a dia" só nas peças de vestir
  $('#dia-a-dia').hidden = !usaTam;
  $('#relacionados').innerHTML = [...PRODUTOS, ...KITS].filter((x) => x.id !== it.id).slice(0, 4).map(card).join('');

  const marcar = (t) => {
    tamanho = t;
    $$('.tamanhos .chip').forEach((c) => c.setAttribute('aria-checked', c.dataset.t === t));
    const linha = TABELA.find((x) => x.t === t);
    const dica = $('.dica-tam');
    dica.classList.remove('erro');
    dica.textContent = `Tamanho ${t}: cintura de ${linha.min} a ${linha.max} cm.`;
  };
  $$('.tamanhos .chip').forEach((c) => c.addEventListener('click', () => marcar(c.dataset.t)));
  $('[data-medidor]')?.addEventListener('click', (e) => { e.stopPropagation(); abrirMedidor(marcar); });
  $$('.compra-acoes .qtd button').forEach((b) => b.addEventListener('click', () => {
    qtd = Math.max(1, Math.min(9, qtd + Number(b.dataset.q)));
    $('.compra-acoes .qtd span').textContent = qtd;
  }));
  const comprar = () => {
    if (usaTam && !tamanho) {
      const dica = $('.dica-tam');
      dica.textContent = 'Escolha um tamanho para continuar.';
      dica.classList.add('erro');
      $('#tamanho').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    adicionar(it.id, usaTam ? tamanho : null, qtd);
  };
  $('#adicionar').addEventListener('click', comprar);

  // Barra fixa no celular quando o botão principal sai da tela
  const barra = $('#barra-prod');
  barra.innerHTML = `<div><small>${nomeCurto(it)}</small><b>${brl(it.preco)}</b></div><button class="btn btn-preto" type="button">Comprar</button>`;
  $('button', barra).addEventListener('click', comprar);
  new IntersectionObserver(([e]) => barra.classList.toggle('visivel', !e.isIntersecting && e.boundingClientRect.top < 0)).observe($('#adicionar'));
}

function telaPraia() {
  $('#praia-vitrine').innerHTML = PRAIA.slice(0, 2).map((p) => `<span><img src="${p.img}" alt="${p.nome}"></span>`).join('');
  $('#colecao').innerHTML = PRAIA.map((p) => `
    <div class="peca-praia">
      <div class="img">${p.selo ? `<span class="selo">${p.selo}</span>` : ''}<img src="${p.img}" alt="${p.nome}" loading="lazy"><a class="avise" href="#espera">Avise-me</a></div>
      <h3>${p.nome}</h3>
      <div class="linha-praia"><span class="em-breve">Em breve</span><span class="cores" aria-label="Cores previstas">${p.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span></div>
    </div>`).join('');

  // Contagem ilustrativa até o lançamento (data de exemplo)
  const lancamento = new Date('2026-12-01T10:00:00-03:00');
  const contar = () => {
    const ms = Math.max(0, lancamento - Date.now());
    const d = Math.floor(ms / 864e5);
    const h = Math.floor(ms / 36e5) % 24;
    const m = Math.floor(ms / 6e4) % 60;
    const s = Math.floor(ms / 1e3) % 60;
    $('#contagem').innerHTML = [[d, 'dias'], [h, 'horas'], [m, 'min'], [s, 'seg']].map(([v, r]) => `<div><b>${String(v).padStart(2, '0')}</b><small>${r}</small></div>`).join('');
  };
  contar();
  setInterval(contar, 1000);

  $$('#espera-tam .chip').forEach((c) => c.addEventListener('click', () => {
    c.setAttribute('aria-checked', c.getAttribute('aria-checked') !== 'true');
  }));
  $('#form-espera').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = e.target.nome.value.trim().split(' ')[0] || 'linda';
    $('#espera-caixa').innerHTML = `<div class="espera-ok"><span class="check">${I.ok}</span><b>Pronto, ${nome}!</b><p style="color:var(--tinta-2)">Você vai receber a coleção no WhatsApp antes de todo mundo.</p><a class="btn btn-claro" href="loja.html">Enquanto isso, ver as cintas</a></div>`;
  });
}

// ---------------- Início ----------------
montarTopo();
montarRodape();
({ inicio: telaInicio, loja: telaLoja, produto: telaProduto, praia: telaPraia })[document.body.dataset.pagina]?.();

document.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-abrir], [data-fechar], [data-add], [data-sugestao], [data-finalizar], [data-medidor]');
  if (e.target.classList.contains('veu')) return fecharTudo();
  if (!alvo) return;
  if (alvo.dataset.abrir) abrir(alvo.dataset.abrir);
  else if (alvo.hasAttribute('data-fechar')) fecharTudo();
  else if (alvo.dataset.add) {
    const it = item(alvo.dataset.add);
    if (precisaTamanho(it)) escolherTamanho(it.id);
    else adicionar(it.id);
  } else if (alvo.dataset.sugestao) {
    const it = item(alvo.dataset.sugestao);
    if (precisaTamanho(it)) escolherTamanho(it.id);
    else { adicionar(it.id); toast(`${nomeCurto(it)} adicionado`); }
  } else if (alvo.hasAttribute('data-finalizar')) finalizar();
  else if (alvo.hasAttribute('data-medidor') && document.body.dataset.pagina !== 'produto') abrirMedidor();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharTudo(); });
