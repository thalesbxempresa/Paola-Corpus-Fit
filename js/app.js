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
const temPreco = (it) => it.preco != null;
const precisaTamanho = (it) => (it.itens ? it.itens.some((i) => item(i).tamanhos) : !!it.tamanhos);
const tamanhoPorCalca = (n) => TABELA.find((x) => x.calca.includes(Number(n)));
const faixaCalca = (x) => x.calca.join(' e ');
const kitsCom = (id) => KITS.filter((k) => k.itens.includes(id) || k.escolha?.includes(id));

// Itens de um combo agrupados ("2 Sutiãs reforçados") + a escolha, quando houver
function listaItens(k) {
  const conta = {};
  k.itens.forEach((i) => { conta[i] = (conta[i] || 0) + 1; });
  const linhas = Object.entries(conta).map(([id, n]) => (n > 1 ? `${n} ${item(id).plural}` : nomeCurto(item(id))));
  if (k.escolha) linhas.push(k.escolha.map((i) => nomeCurto(item(i))).join(' ou '));
  return linhas;
}

// Sempre um passo acima: cinta 20 → cinta 30 → combo duplo → combo de 5
const SOBE = {
  'cinta-ziper-20': ['cinta-ziper-30', 'Leve a de 30 barbatanas, a melhor'],
  'cinta-ziper-30': ['combo-duplo', 'Leve também o gel ou o sutiã'],
  'combo-duplo': ['combo-5', 'Leve o combo completo, com 5 produtos'],
};

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
  chat: svg('<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.8A8.5 8.5 0 1 1 21 11.5z"/>'),
  escudo: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  ok: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3"'),
  insta: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor"/>'),
  whats: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
};

// Foto do item (peças com 2ª foto trocam no hover)
function midia(it, lazy = true) {
  const carregar = lazy ? ' loading="lazy"' : '';
  return `<img src="${it.img}" alt=""${carregar}>${it.img2 ? `<img class="img2" src="${it.img2}" alt=""${carregar}>` : ''}`;
}

// ---------------- Topo, menu e rodapé ----------------
const MENU = [
  ['Combos', 'loja.html#kits'],
  ['Cintas', 'loja.html#cintas'],
  ['Sutiã', 'loja.html#sutias'],
  ['Tratamento', 'loja.html#tratamento'],
  ['Moda Praia', 'moda-praia.html', true],
];

function montarTopo() {
  const pagina = document.body.dataset.pagina;
  const avisos = [`${KITS[0].sub} por ${brl(KITS[0].preco)}`, 'A Paola confirma seu tamanho no WhatsApp', `Frete grátis acima de ${brl(LOJA.freteGratis)}`, `${Math.round(LOJA.pix * 100)}% off no Pix`, `Até ${LOJA.parcelas}x sem juros`, 'Moda praia chegando ☀'];
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
      <button class="menu-teste" type="button" data-teste><b>Qual o meu combo ideal?</b><span>Teste de 1 minuto com o seu tamanho →</span></button>
      <nav class="menu-links">${MENU.slice(0, 4).map(([nome, link]) => `<a href="${link}">${nome}${I.seta}</a>`).join('')}</nav>
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
  <a class="zap-flutuante" href="${LOJA.whatsapp}" target="_blank" rel="noopener" aria-label="Tirar dúvidas no WhatsApp">${I.whats}<span>Dúvidas?</span></a>
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
      <div class="rodape-base">© 2026 Paola Corpus Fit · Protótipo visual de demonstração: nenhum pedido é cobrado.</div>
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
// Cada linha: { chave, id, calca, extra, qtd } — o tamanho sai do número da calça
let sacolaMemoria = [];
function lerSacola() {
  let s = sacolaMemoria;
  try { const v = localStorage.getItem('pcf-sacola-2'); if (v) s = JSON.parse(v); } catch (e) { /* sem armazenamento */ }
  return s.filter((x) => item(x.id) && temPreco(item(x.id)));
}
function gravarSacola(s) {
  sacolaMemoria = s;
  try { localStorage.setItem('pcf-sacola-2', JSON.stringify(s)); } catch (e) { /* ok */ }
  desenharSacola();
}
function adicionar(id, op = {}, qtd = 1, s = lerSacola()) {
  const chave = [id, op.calca || '', op.extra || ''].join('|');
  const achado = s.find((x) => x.chave === chave);
  if (achado) achado.qtd += qtd;
  else s.push({ chave, id, calca: op.calca || null, extra: op.extra || null, qtd });
  gravarSacola(s);
  abrir('sacola');
}
const subtotal = (s = lerSacola()) => s.reduce((t, x) => t + item(x.id).preco * x.qtd, 0);
const nomeLinha = (x) => `${item(x.id).nome}${x.extra ? ` + ${nomeCurto(item(x.extra))}` : ''}`;
const tamLinha = (x) => (x.calca ? `Tamanho ${tamanhoPorCalca(x.calca).t} · calça ${x.calca}` : 'Tamanho único');

function desenharSacola() {
  const s = lerSacola();
  const n = s.reduce((t, x) => t + x.qtd, 0);
  const conta = $('.conta-sacola');
  conta.textContent = n;
  conta.hidden = !n;
  const corpo = $('#g-sacola .gaveta-corpo');
  const pe = $('#g-sacola .gaveta-pe');

  if (!s.length) {
    corpo.innerHTML = `<div class="sacola-vazia">${I.sacola}<b>Sua sacola está vazia</b><p style="color:var(--tinta-2)">Comece pelo combo que mais sai.</p><a class="btn btn-preto" href="produto.html?id=combo-5">Ver o Combo Adeus Pochete</a></div>`;
    pe.innerHTML = '';
    pe.hidden = true;
    return;
  }

  const sub = subtotal(s);
  const falta = Math.max(0, LOJA.freteGratis - sub);
  // Sugestão: subir um degrau (cinta 20 → 30 → combo duplo → combo de 5)
  const base = s.find((x) => SOBE[x.id] && !s.some((y) => y.id === SOBE[x.id][0]));
  const [paraId, chamada] = base ? SOBE[base.id] : [];
  const para = paraId && item(paraId);

  corpo.innerHTML = `
    <div class="frete">${falta > 0 ? `Faltam <b>${brl(falta)}</b> para o frete grátis` : '🎉 Você ganhou frete grátis'}<div class="trilho"><i style="width:${Math.min(100, (sub / LOJA.freteGratis) * 100)}%"></i></div></div>
    ${s.map((x) => {
      const it = item(x.id);
      return `<div class="item-sacola" data-chave="${x.chave}">
        <span class="mini">${midia(it)}</span>
        <div><h3>${nomeLinha(x)}</h3><div class="det">${tamLinha(x)}</div>
          <div class="qtd"><button type="button" data-q="-1" aria-label="Diminuir">−</button><span>${x.qtd}</span><button type="button" data-q="1" aria-label="Aumentar">+</button></div>
          <button class="remover" type="button">Remover</button></div>
        <span class="valor">${brl(it.preco * x.qtd)}</span>
      </div>`;
    }).join('')}
    ${para ? `<div class="sugestao"><span class="mini">${midia(para)}</span><div><small>Vale a pena</small><b>${chamada}</b><span style="font-size:13px">por + ${brl(para.preco - item(base.id).preco)}</span></div><button type="button" data-trocar="${base.chave}" aria-label="Trocar por ${para.nome}">${I.mais}</button></div>` : ''}`;

  pe.hidden = false;
  pe.innerHTML = `
    <div class="total-linha"><span>Total</span><span>${brl(sub)}</span></div>
    <div class="total-pix">ou ${brl(pix(sub))} no Pix · ${LOJA.parcelas}x de ${brl(parcela(sub))}</div>
    <button class="btn btn-preto btn-bloco" type="button" data-finalizar>${I.whats}Finalizar pelo WhatsApp</button>
    <p class="pe-nota">O resumo vai pronto para a conversa. A Paola confirma seu tamanho com você antes de enviar.</p>`;

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

// Troca a linha da sacola pelo degrau de cima, mantendo a calça
function trocar(chave) {
  const s = lerSacola();
  const x = s.find((y) => y.chave === chave);
  if (!x) return;
  abrirOpcoes(SOBE[x.id][0], { calca: x.calca, qtd: x.qtd, trocar: chave });
}

async function finalizar() {
  const s = lerSacola();
  const texto = `Oi, Paola! Quero fazer este pedido:\n${s.map((x) => `• ${x.qtd}x ${nomeLinha(x)}${x.calca ? ` · tam. ${tamanhoPorCalca(x.calca).t} (calça ${x.calca})` : ''}`).join('\n')}\nTotal: ${brl(subtotal(s))}\nPosso te mandar uma foto de frente para você confirmar o meu tamanho.`;
  try { await navigator.clipboard.writeText(texto); toast('Resumo copiado. É só colar na conversa.'); } catch (e) { /* sem permissão */ }
  setTimeout(() => window.open(LOJA.whatsapp, '_blank', 'noopener'), 600);
}

// ---------------- Tamanho pelo número da calça ----------------
function calcaHTML(sel) {
  const linha = sel && tamanhoPorCalca(sel);
  return `<div class="calca-ui">
    <div class="tamanhos calcas" role="radiogroup" aria-label="Número da calça ou short">${NUMEROS.map((n) => `<button class="chip" type="button" role="radio" data-calca="${n}" aria-checked="${n === Number(sel)}">${n}</button>`).join('')}</div>
    <div class="tam-res"${linha ? '' : ' hidden'}><span class="letra">${linha ? linha.t : ''}</span><div><b>Seu tamanho é <span data-letra>${linha ? linha.t : ''}</span></b><small>Para quem veste calça <span data-faixa>${linha ? faixaCalca(linha) : ''}</span></small></div></div>
    <p class="dica-tam">Veste menos de 36 ou mais de 52? <a href="${LOJA.whatsapp}" target="_blank" rel="noopener">Fale com a Paola</a></p>
  </div>`;
}
function ligarCalca(raiz, aoMudar) {
  $$('[data-calca]', raiz).forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.calca);
    const linha = tamanhoPorCalca(n);
    $$('[data-calca]', raiz).forEach((c) => c.setAttribute('aria-checked', c === b));
    const res = $('.tam-res', raiz);
    res.hidden = false;
    $('.letra', res).textContent = linha.t;
    $('[data-letra]', res).textContent = linha.t;
    $('[data-faixa]', res).textContent = faixaCalca(linha);
    if (aoMudar) aoMudar(n, linha);
  }));
}
const tabelaHTML = () => `<table class="tabela-mini"><thead><tr><th>Tamanho</th><th>Calça e short</th></tr></thead>
  <tbody>${TABELA.map((x) => `<tr data-linha="${x.t}"><td>${x.t}</td><td>${faixaCalca(x)}</td></tr>`).join('')}</tbody></table>`;
const confirmaHTML = () => `<div class="selo-troca">${I.chat}<span><b>Sem medo de errar:</b> depois do pedido, a Paola confirma seu tamanho com você pelo WhatsApp.</span></div>`;

function abrirTabela(aoEscolher) {
  let escolhido = null;
  const m = abrirModal(`
    <div class="modal-topo"><h2>Qual é o meu tamanho?</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <p style="color:var(--tinta-2);margin-bottom:16px">Marque o número da calça ou short que você veste. A cinta estica, então medida em centímetros não ajuda.</p>
    ${calcaHTML(null)}
    ${tabelaHTML()}
    ${confirmaHTML()}
    ${aoEscolher ? '<button class="btn btn-preto btn-bloco" type="button" data-usar style="margin-top:18px" disabled>Usar este tamanho</button>' : ''}`);
  ligarCalca(m, (n, linha) => {
    escolhido = n;
    $$('tr[data-linha]', m).forEach((tr) => tr.classList.toggle('sua', tr.dataset.linha === linha.t));
    if (aoEscolher) $('[data-usar]', m).disabled = false;
  });
  $('[data-usar]', m)?.addEventListener('click', () => { fecharTudo(); aoEscolher(escolhido); });
}

// Escolha do 2º produto (Combo Duplo: gel ou sutiã)
function escolhaHTML(it, sel) {
  return `<div class="escolha">${it.escolha.map((id) => `<button class="escolha-op" type="button" data-extra="${id}" aria-pressed="${id === sel}"><span class="mini">${midia(item(id))}</span><b>${nomeCurto(item(id))}</b></button>`).join('')}</div>`;
}
function ligarEscolha(raiz, aoMudar) {
  $$('[data-extra]', raiz).forEach((b) => b.addEventListener('click', () => {
    $$('[data-extra]', raiz).forEach((c) => c.setAttribute('aria-pressed', c === b));
    aoMudar(b.dataset.extra);
  }));
}

// Antes de ir para a sacola: pede o que faltar (escolha do combo e/ou calça)
function abrirOpcoes(id, pre = {}) {
  const it = item(id);
  const sel = { calca: pre.calca || null, extra: pre.extra || null };
  const usaTam = precisaTamanho(it);
  const pronto = () => (!usaTam || sel.calca) && (!it.escolha || sel.extra);
  const concluir = () => {
    const s = pre.trocar ? lerSacola().filter((y) => y.chave !== pre.trocar) : lerSacola();
    adicionar(id, sel, pre.qtd || 1, s);
    if (pre.trocar) toast(`Trocado por ${it.nome}`);
  };
  if (pronto()) return concluir();

  const m = abrirModal(`
    <div class="modal-topo"><h2>${it.escolha ? 'Monte seu combo' : 'Escolha o tamanho'}</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <p style="font-weight:700">${it.nome} · ${brl(it.preco)}</p>
    ${it.escolha ? `<div class="grupo"><div class="grupo-titulo">Escolha o 2º produto</div>${escolhaHTML(it, sel.extra)}</div>` : ''}
    ${usaTam ? `<div class="grupo"><div class="grupo-titulo">Número da calça ou short</div>${calcaHTML(sel.calca)}</div>` : ''}
    ${usaTam ? confirmaHTML() : ''}
    <p class="dica-tam erro" data-erro hidden></p>
    <button class="btn btn-preto btn-bloco" type="button" data-confirmar style="margin-top:16px">Adicionar à sacola</button>`);
  if (it.escolha) ligarEscolha(m, (v) => { sel.extra = v; });
  if (usaTam) ligarCalca(m, (n) => { sel.calca = n; });
  $('[data-confirmar]', m).addEventListener('click', () => {
    if (pronto()) return concluir();
    const erro = $('[data-erro]', m);
    erro.hidden = false;
    erro.textContent = it.escolha && !sel.extra ? 'Escolha o gel ou o sutiã.' : 'Marque o número da sua calça.';
  });
}

// ---------------- Teste: qual o combo e o tamanho ideais ----------------
function abrirTeste() {
  const r = { obj: null, calca: null, uso: null };
  let passo = 1;
  const m = abrirModal('');
  const opcoes = (lista, campo) => `<div class="opcoes">${lista.map((o) => `<button class="opcao" type="button" data-v="${o.id}" aria-pressed="${r[campo] === o.id}"><b>${o.nome}</b>${o.dica && campo === 'obj' ? `<small>${o.dica}</small>` : ''}</button>`).join('')}</div>`;

  const desenhar = () => {
    const topo = `<div class="modal-topo"><h2>${passo < 4 ? `Passo ${passo} de 3` : 'Sua indicação'}</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
      <div class="progresso"><i style="width:${(Math.min(passo, 3) / 3) * 100}%"></i></div>`;
    const voltar = passo > 1 ? '<button class="link-tam" type="button" data-voltar>← Voltar</button>' : '';

    if (passo === 1) m.innerHTML = `${topo}<h3 class="teste-q">O que você procura?</h3>${opcoes(OBJETIVOS, 'obj')}`;
    if (passo === 2) {
      m.innerHTML = `${topo}<h3 class="teste-q">Qual número de calça você veste?</h3><p class="teste-sub">Pode ser o número do short também.</p>${calcaHTML(r.calca)}
        <div class="teste-nav">${voltar}<button class="btn btn-preto" type="button" data-seguir ${r.calca ? '' : 'disabled'}>Continuar</button></div>`;
      ligarCalca(m, (n) => { r.calca = n; $('[data-seguir]', m).disabled = false; });
    }
    if (passo === 3) m.innerHTML = `${topo}<h3 class="teste-q">Quando você vai usar mais?</h3>${opcoes(USOS, 'uso')}<div class="teste-nav">${voltar}</div>`;
    if (passo === 4) {
      const it = item(OBJETIVOS.find((o) => o.id === r.obj).produto);
      const uso = USOS.find((u) => u.id === r.uso);
      const tam = tamanhoPorCalca(r.calca);
      m.innerHTML = `${topo}
        <div class="resultado-teste">
          <div class="rt-foto">${midia(it, false)}</div>
          <div>
            <span class="selo rosa" style="position:static;display:inline-block">Indicado para você</span>
            <h3>${it.nome}</h3>
            <p class="rt-tam">Tamanho <b>${tam.t}</b><small>pela calça ${r.calca}</small></p>
            <p class="rt-preco"><b>${brl(it.preco)}</b> · ${brl(pix(it.preco))} no Pix</p>
          </div>
        </div>
        <p class="rt-dica">💡 ${uso.dica}</p>
        ${confirmaHTML()}
        <div class="teste-acoes">
          <button class="btn btn-preto btn-bloco" type="button" data-colocar>Adicionar à sacola · ${tam.t}</button>
          <a class="btn btn-claro btn-bloco" href="produto.html?id=${it.id}&calca=${r.calca}">Ver detalhes</a>
          <button class="link-tam" type="button" data-refazer>Refazer o teste</button>
        </div>`;
      $('[data-colocar]', m).addEventListener('click', () => abrirOpcoes(it.id, { calca: r.calca }));
      $('[data-refazer]', m).addEventListener('click', () => { passo = 1; desenhar(); });
    }

    $$('.opcao', m).forEach((b) => b.addEventListener('click', () => {
      if (passo === 1) r.obj = b.dataset.v; else r.uso = b.dataset.v;
      passo += 1;
      desenhar();
    }));
    $('[data-seguir]', m)?.addEventListener('click', () => { passo = 3; desenhar(); });
    $('[data-voltar]', m)?.addEventListener('click', () => { passo -= 1; desenhar(); });
  };
  desenhar();
}

// ---------------- Com e sem (comparador) ----------------
function ligarComparadores() {
  $$('.antes-depois').forEach((comp) => {
    const controle = $('input', comp);
    controle.addEventListener('input', () => comp.style.setProperty('--pos', `${controle.value}%`));
  });
}

// ---------------- Avaliações ----------------
function avaliacoesHTML() {
  return AVALIACOES.map((a) => `<article class="avaliacao">
    ${a.foto ? `<img src="${a.foto}" alt="Foto enviada pela cliente" loading="lazy">` : ''}
    <div class="av-corpo">
      <div class="av-topo"><span class="estrelas" aria-label="5 de 5 estrelas">★★★★★</span><span class="av-exemplo">Exemplo</span></div>
      <p>“${a.texto}”</p>
      <div class="av-quem"><b>${a.nome}</b> · ${a.cidade}</div>
      <div class="av-compra">Comprou: ${a.produto} · tam. ${a.tam}</div>
    </div>
  </article>`).join('');
}

// Estimativa de entrega pelo CEP (demonstração: prazos por região)
function prazoPorCep(cep) {
  const n = Number(cep.slice(0, 2));
  if (n >= 20 && n <= 28) return [1, 3];
  if (n <= 19) return [2, 4];
  if (n <= 39) return [3, 5];
  if (n <= 65) return [5, 8];
  if (n >= 70 && n <= 76) return [4, 6];
  if (n >= 80) return [4, 7];
  return [6, 10];
}

// ---------------- Cards ----------------
function card(it) {
  const preco = temPreco(it)
    ? `<div class="precos">${it.de ? `<span class="de">${brl(it.de)}</span>` : ''}<span class="por">${brl(it.preco)}</span></div>
    <span class="parc"><b>${brl(pix(it.preco))}</b> no Pix</span>`
    : '<span class="so-combo">Vem nos combos</span>';
  return `<div class="card">
    <div class="moldura">
      <a class="img" href="produto.html?id=${it.id}" aria-label="${it.nome}">
        ${it.selo ? `<span class="selo ${it.itens ? 'rosa' : ''}">${it.selo}</span>` : ''}${midia(it)}
      </a>
      ${temPreco(it) ? `<button class="btn-add" type="button" data-add="${it.id}" aria-label="Adicionar ${it.nome} à sacola">${I.mais}</button>` : ''}
    </div>
    <a href="produto.html?id=${it.id}"><h3>${it.nome}</h3></a>
    ${preco}
  </div>`;
}

function cardKit(k) {
  return `<div class="kit">
    <a class="img" href="produto.html?id=${k.id}">${k.selo ? `<span class="selo rosa">${k.selo}</span>` : ''}${midia(k)}</a>
    <div>
      <a href="produto.html?id=${k.id}"><h3>${k.nome}</h3></a>
      <p class="itens">${listaItens(k).join(' + ')}</p>
      <div class="precos"><span class="de">${brl(k.de)}</span><span class="por">${brl(k.preco)}</span></div>
      <span class="economia">${k.gancho || `Economize ${brl(k.de - k.preco)}`}</span><br>
      <button class="btn btn-preto" type="button" data-add="${k.id}">Quero o combo</button>
    </div>
  </div>`;
}

// Combo de 5 produtos: o destaque da loja
function comboDestaque(k) {
  return `<div class="combo-top">
    <a class="img" href="produto.html?id=${k.id}"><span class="selo rosa">${k.selo}</span><img src="${k.img}" alt="${k.nome}: ${listaItens(k).join(', ')}" loading="lazy"></a>
    <div class="combo-top-txt">
      <span class="sobre">${k.sub}</span>
      <h3>${k.chamada}</h3>
      <ul class="combo-itens">${listaItens(k).map((t) => `<li>${I.ok}${t}</li>`).join('')}</ul>
      <div class="precos"><span class="de">de ${brl(k.de)}</span><span class="por">${brl(k.preco)}</span></div>
      <span class="parc">${LOJA.parcelas}x de ${brl(parcela(k.preco))} sem juros · ${brl(pix(k.preco))} no Pix</span>
      <span class="economia">Economize ${brl(k.de - k.preco)}</span>
      <button class="btn btn-rosa btn-bloco" type="button" data-add="${k.id}">Quero o combo</button>
    </div>
  </div>`;
}

// Cinta de 30 x cinta de 20, lado a lado
function cintasHTML() {
  return PRODUTOS.filter((p) => p.cat === 'cintas').map((p) => `<a class="versus-card${p.selo ? ' top' : ''}" href="produto.html?id=${p.id}">
    <span class="img"><img src="${p.img}" alt="${p.nome}" loading="lazy">${p.selo ? `<span class="selo rosa">${p.selo}</span>` : ''}</span>
    <span class="versus-num"><b>${p.barbatanas}</b>barbatanas</span>
    <span class="versus-preco"><s>${brl(p.de)}</s><b>${brl(p.preco)}</b></span>
    <span class="versus-nota">${p.selo ? 'Mais barbatanas, mais firmeza' : 'Para começar gastando menos'}</span>
  </a>`).join('');
}

// ---------------- Telas ----------------
function telaInicio() {
  const cats = [
    { nome: 'Combos', link: 'loja.html#kits', img: 'img/real-combo-5.webp' },
    { nome: 'Cintas', link: 'loja.html#cintas', img: 'img/real-cinta.webp' },
    { nome: 'Sutiã', link: 'loja.html#sutias', img: 'img/real-sutia.webp' },
    { nome: 'Tratamento', link: 'loja.html#tratamento', img: 'img/real-gel.webp' },
    { nome: 'Moda Praia', link: 'moda-praia.html', img: 'img/praia-cintura-alta.webp', praia: true },
  ];
  const [destaque, ...outros] = KITS;
  $('#combo-top').innerHTML = comboDestaque(destaque);
  $('#kits').innerHTML = outros.map(cardKit).join('');
  $('#cintas').innerHTML = cintasHTML();
  $('#categorias').innerHTML = cats.map((c) => `<a class="cat" href="${c.link}"><span class="img">${c.praia ? '<span class="novo">Novo</span>' : ''}<img src="${c.img}" alt="" loading="lazy"></span><b>${c.nome}</b></a>`).join('');
  $('#tratamento').innerHTML = PRODUTOS.filter((p) => !temPreco(p)).map(card).join('');
  $('#praia-pecas').innerHTML = PRAIA.slice(0, 3).map((p) => `<span><img src="${p.img}" alt="${p.nome}" loading="lazy"></span>`).join('');
  $('#avaliacoes').innerHTML = avaliacoesHTML();
  ligarComparadores();

  // Tamanho na própria página: marcou a calça, já leva para o combo no tamanho certo
  const caixa = $('#tam-inline');
  caixa.innerHTML = calcaHTML(null);
  ligarCalca(caixa, (n, linha) => {
    const ir = $('#tam-ir');
    ir.hidden = false;
    ir.href = `produto.html?id=${destaque.id}&calca=${n}`;
    ir.textContent = `Ver o combo no tamanho ${linha.t}`;
  });
}

function telaLoja() {
  const filtros = [['tudo', 'Tudo'], ['kits', 'Combos'], ['cintas', 'Cintas'], ['sutias', 'Sutiã'], ['tratamento', 'Tratamento']];
  const todos = [...KITS, ...PRODUTOS];
  const valor = (x) => (temPreco(x) ? x.preco : Infinity);
  let ordem = 'vendidos';

  const desenhar = () => {
    const cat = location.hash.slice(1) || 'tudo';
    let lista = cat === 'tudo' ? todos : todos.filter((x) => x.cat === cat);
    if (ordem === 'menor') lista = [...lista].sort((a, b) => valor(a) - valor(b));
    if (ordem === 'maior') lista = [...lista].sort((a, b) => (temPreco(b) ? b.preco : -1) - (temPreco(a) ? a.preco : -1));
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
  const it = item(busca.get('id')) || item('combo-5');
  const ehKit = !!it.itens;
  const vende = temPreco(it);
  const usaTam = vende && precisaTamanho(it);
  let calca = tamanhoPorCalca(busca.get('calca')) ? Number(busca.get('calca')) : null;
  let extra = it.escolha?.includes(busca.get('extra')) ? busca.get('extra') : null;
  let qtd = 1;
  document.title = `${it.nome} | Paola Corpus Fit`;

  const pecas = ehKit ? [...new Set([...it.itens, ...(it.escolha || [])])] : [];
  const fotos = ehKit
    ? [{ src: it.img }, ...pecas.map((i) => ({ src: item(i).img, txt: nomeCurto(item(i)) }))]
    : (it.galeria || [{ src: it.img }]);
  const galeria = fotos.map((f, i) => `<figure><img src="${f.src}" alt="${it.nome}"${i ? ' loading="lazy"' : ''}>${f.txt ? `<figcaption>${f.txt}</figcaption>` : ''}</figure>`).join('');
  const cat = ({ cintas: 'Cintas', sutias: 'Sutiã', tratamento: 'Tratamento', kits: 'Combos' })[it.cat];

  const versoes = it.cat === 'cintas' ? `<div class="grupo"><div class="grupo-titulo">Versão</div>
    <div class="versoes">${PRODUTOS.filter((p) => p.cat === 'cintas').map((p) => `<a href="produto.html?id=${p.id}${calca ? `&calca=${calca}` : ''}" aria-current="${p.id === it.id}"><b>${p.barbatanas} barbatanas</b><small>${p.selo ? `${p.selo} · ` : ''}${brl(p.preco)}</small></a>`).join('')}</div></div>` : '';

  const precoHTML = vende ? `<div class="preco-bloco">
      <div class="linha1">${it.de ? `<span class="de">${brl(it.de)}</span>` : ''}<span class="por">${brl(it.preco)}</span>${it.de ? `<span class="economia">-${Math.round((1 - it.preco / it.de) * 100)}%</span>` : ''}</div>
      <div class="pix">${brl(pix(it.preco))} no Pix (${Math.round(LOJA.pix * 100)}% off)</div>
      <div class="parc">ou ${LOJA.parcelas}x de ${brl(parcela(it.preco))} sem juros</div>
    </div>` : `<div class="preco-bloco"><div class="linha1"><span class="por" style="font-size:24px">Vem nos combos</span></div><div class="parc">Sai junto com a cinta. Para comprar avulso, fale com a Paola.</div></div>`;

  const conta = {};
  if (ehKit) it.itens.forEach((i) => { conta[i] = (conta[i] || 0) + 1; });
  const vemNoKit = ehKit ? `<div class="grupo"><div class="grupo-titulo">Vem no combo</div><ul class="itens-kit">${Object.entries(conta).map(([i, n]) => `<li><span class="mini">${midia(item(i))}</span>${n > 1 ? `${n} ${item(i).plural}` : item(i).nome}</li>`).join('')}${it.escolha ? `<li><span class="mini">${I.mais}</span>${it.escolha.map((i) => nomeCurto(item(i))).join(' ou ')} (você escolhe)</li>` : ''}</ul></div>` : '';

  const [sobeId, sobeTxt] = SOBE[it.id] || [];
  const sobe = sobeId && item(sobeId);
  const junto = sobe ? `<div class="junto">
      <div class="grupo-titulo" style="margin:0">Por só ${brl(sobe.preco - it.preco)} a mais</div>
      <div class="junto-pecas"><span class="mini">${midia(sobe)}</span></div>
      <b>${sobeTxt}</b>
      <div class="precos"><s>${brl(sobe.de)}</s> por <strong>${brl(sobe.preco)}</strong></div>
      <a class="btn btn-preto btn-bloco" href="produto.html?id=${sobe.id}${calca ? `&calca=${calca}` : ''}">Ver ${sobe.nome}</a>
    </div>` : '';

  $('#produto').innerHTML = `
    <nav class="migalha"><a href="index.html">Início</a> / <a href="loja.html#${it.cat}">${cat}</a> / ${nomeCurto(it)}</nav>
    <div class="prod">
      <div class="galeria ${fotos.length > 1 ? '' : 'unica'}">${galeria}</div>
      <div class="prod-info">
        ${it.selo ? `<span class="selo rosa" style="position:static;display:inline-block">${it.selo}</span>` : ''}
        <h1>${it.nome}</h1>
        ${it.frase ? `<p class="frase">${it.frase}</p>` : ''}
        ${precoHTML}
        ${vemNoKit}
        ${versoes}
        ${vende && it.escolha ? `<div class="grupo" id="escolha"><div class="grupo-titulo">Escolha o 2º produto</div>${escolhaHTML(it, extra)}</div>` : ''}
        ${usaTam ? `<div class="grupo" id="tamanho">
          <div class="grupo-titulo">Número da calça ou short <button class="link-tam" type="button" data-tabela>${I.regua}Tabela</button></div>
          ${calcaHTML(calca)}
        </div>` : ''}
        ${vende ? `<p class="dica-tam erro" id="erro-compra" hidden></p>
        <div class="compra-acoes">
          <div class="qtd"><button type="button" data-q="-1" aria-label="Diminuir">−</button><span>1</span><button type="button" data-q="1" aria-label="Aumentar">+</button></div>
          <button class="btn btn-preto" type="button" id="adicionar">Adicionar à sacola</button>
          <a class="btn btn-claro" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}Comprar pelo WhatsApp</a>
        </div>` : `<div class="grupo"><div class="grupo-titulo">Leve nos combos</div><div class="kits">${kitsCom(it.id).map(cardKit).join('')}</div></div>
        <a class="btn btn-claro btn-bloco" href="${LOJA.whatsapp}" target="_blank" rel="noopener" style="margin-top:14px">${I.whats}Perguntar no WhatsApp</a>`}
        ${usaTam ? confirmaHTML() : ''}
        ${vende ? `<form class="frete-cep" id="frete-cep">
          <label for="cep">${I.caminhao}Calcule o prazo de entrega</label>
          <div><input id="cep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="Seu CEP" maxlength="9"><button class="btn btn-claro" type="submit">OK</button></div>
          <p class="cep-resultado" aria-live="polite"></p>
        </form>` : ''}
        <div class="garantias">
          <div>${I.chat}A Paola tira suas dúvidas no WhatsApp</div>
          <div>${I.escudo}Pagamento seguro · Pix ou cartão em até ${LOJA.parcelas}x</div>
        </div>
        ${it.pontos ? `<ul class="pontos-prod">${it.pontos.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}
        ${junto}
        <div class="detalhes">
          <details open><summary>Descrição</summary><div class="conteudo">${it.desc}</div></details>
          ${it.uso ? `<details><summary>Como usar</summary><div class="conteudo">${it.uso}</div></details>` : ''}
          ${usaTam ? `<details><summary>Dobra? Marca? Machuca?</summary><div class="conteudo"><p><b>Dobra ou enrola?</b> Não. As barbatanas mantêm a cinta no lugar, mesmo sentada ou treinando.</p><p style="margin-top:10px"><b>Quantas regulagens?</b> Duas regulagens de colchete por dentro e mais o zíper por fora, na frente.</p><p style="margin-top:10px"><b>Marca na roupa?</b> Não marca por baixo da roupa.</p><p style="margin-top:10px"><b>Machuca?</b> O tecido cetinete é pós-cirúrgico e antialérgico. Comece com poucas horas por dia e aumente aos poucos.</p></div></details>` : ''}
          ${usaTam ? `<details><summary>Tabela de medidas</summary><div class="conteudo">${tabelaHTML()}<p style="margin-top:10px">A cinta estica, então o que vale é o número da calça ou short, não a medida em centímetros.</p></div></details>` : ''}
          <details><summary>Entrega e pagamento</summary><div class="conteudo">Enviamos do ${LOJA.cidade} para todo o Brasil. Pix com ${Math.round(LOJA.pix * 100)}% de desconto ou cartão em até ${LOJA.parcelas}x sem juros.</div></details>
        </div>
      </div>
    </div>`;

  // Bloco "no dia a dia" só onde tem cinta
  $('#dia-a-dia').hidden = !usaTam;
  $('#avaliacoes').innerHTML = avaliacoesHTML();
  $('#relacionados').innerHTML = [...KITS, ...PRODUTOS].filter((x) => x.id !== it.id).slice(0, 4).map(card).join('');
  if (!vende) return;

  // Prazo de entrega pelo CEP
  const campoCep = $('#cep');
  campoCep.addEventListener('input', () => {
    const d = campoCep.value.replace(/\D/g, '').slice(0, 8);
    campoCep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  });
  $('#frete-cep').addEventListener('submit', (e) => {
    e.preventDefault();
    const cep = campoCep.value.replace(/\D/g, '');
    const saida = $('.cep-resultado');
    if (cep.length !== 8) { saida.textContent = 'Digite os 8 números do CEP.'; return; }
    const [de, ate] = prazoPorCep(cep);
    const gratis = it.preco >= LOJA.freteGratis;
    saida.innerHTML = `<b>Chega em ${de} a ${ate} dias úteis</b> · ${gratis ? 'frete grátis' : `frete a partir de ${brl(19.9)}`}<small>Estimativa de demonstração</small>`;
  });

  const erro = $('#erro-compra');
  if (usaTam) {
    const caixa = $('#tamanho');
    ligarCalca(caixa, (n) => { calca = n; erro.hidden = true; });
    $('[data-tabela]', caixa).addEventListener('click', (e) => {
      e.stopPropagation();
      abrirTabela((n) => $(`[data-calca="${n}"]`, caixa).click());
    });
  }
  if (it.escolha) ligarEscolha($('#escolha'), (v) => { extra = v; erro.hidden = true; });
  $$('.compra-acoes .qtd button').forEach((b) => b.addEventListener('click', () => {
    qtd = Math.max(1, Math.min(9, qtd + Number(b.dataset.q)));
    $('.compra-acoes .qtd span').textContent = qtd;
  }));
  const comprar = () => {
    const falta = (it.escolha && !extra && ['escolha', 'Escolha o gel ou o sutiã para continuar.'])
      || (usaTam && !calca && ['tamanho', 'Marque o número da sua calça para continuar.']);
    if (falta) {
      erro.hidden = false;
      erro.textContent = falta[1];
      $(`#${falta[0]}`).scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    adicionar(it.id, { calca, extra }, qtd);
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

  // Coleção com filtro pelo que a cliente quer valorizar
  let foco = 'todos';
  const desenharColecao = () => {
    $('#filtros-praia').innerHTML = FOCOS_PRAIA.map(([id, nome]) => `<button class="filtro" type="button" data-foco="${id}" aria-pressed="${id === foco}">${nome}</button>`).join('');
    $('#colecao').innerHTML = PRAIA.filter((p) => foco === 'todos' || p.foco.includes(foco)).map((p) => `
      <div class="peca-praia">
        <div class="img">${p.selo ? `<span class="selo">${p.selo}</span>` : ''}<img src="${p.img}" alt="${p.nome}" loading="lazy"><a class="avise" href="${p.biquini ? '#monte' : '#espera'}" data-escolher="${p.biquini ? p.id : ''}">${p.biquini ? 'Montar o meu' : 'Avise-me'}</a></div>
        <h3>${p.nome}</h3>
        <div class="linha-praia"><span class="em-breve">Em breve</span><span class="cores" aria-label="Cores previstas">${p.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span></div>
      </div>`).join('');
    $$('[data-foco]').forEach((b) => b.addEventListener('click', () => { foco = b.dataset.foco; desenharColecao(); }));
    $$('[data-escolher]').forEach((a) => a.addEventListener('click', () => { if (a.dataset.escolher) montar.modelo = a.dataset.escolher; desenharMonte(); }));
  };

  // Monte seu biquíni: top e calcinha em tamanhos diferentes
  const biquinis = PRAIA.filter((p) => p.biquini);
  const montar = { modelo: biquinis[0].id, cor: 0, top: null, baixo: null };
  const desenharMonte = () => {
    const p = PRAIA.find((x) => x.id === montar.modelo);
    const chips = (parte) => TAMANHOS_PRAIA.map((t) => `<button class="chip" type="button" data-parte="${parte}" data-t="${t}" aria-checked="${montar[parte] === t}">${t}</button>`).join('');
    $('#monte-caixa').innerHTML = `
      <div class="monte-foto"><img src="${p.img}" alt="${p.nome}"><span class="selo">Prévia</span></div>
      <div class="monte-opcoes">
        <div class="grupo-titulo">1. Modelo</div>
        <div class="monte-modelos">${biquinis.map((b) => `<button type="button" data-modelo="${b.id}" aria-pressed="${b.id === montar.modelo}"><img src="${b.img}" alt=""><span>${b.nome.replace('Biquíni ', '')}</span></button>`).join('')}</div>
        <div class="grupo-titulo">2. Cor</div>
        <div class="cores-escolha">${p.cores.map((c, i) => `<button class="cor" type="button" style="background:${c}" data-cor="${i}" aria-pressed="${i === montar.cor}" aria-label="Cor ${i + 1}"></button>`).join('')}</div>
        <div class="grupo-titulo">3. Tamanho do top</div>
        <div class="tamanhos">${chips('top')}</div>
        <div class="grupo-titulo">4. Tamanho da calcinha</div>
        <div class="tamanhos">${chips('baixo')}</div>
        <p class="monte-resumo">${montar.top && montar.baixo ? `<b>${p.nome}</b>: top ${montar.top} + calcinha ${montar.baixo}` : 'Escolha o tamanho do top e da calcinha, podem ser diferentes.'}</p>
        <button class="btn btn-preto btn-bloco" type="button" id="reservar" ${montar.top && montar.baixo ? '' : 'disabled'}>Reservar para o lançamento</button>
      </div>`;
    $$('[data-modelo]').forEach((b) => b.addEventListener('click', () => { montar.modelo = b.dataset.modelo; montar.cor = 0; desenharMonte(); }));
    $$('[data-cor]').forEach((b) => b.addEventListener('click', () => { montar.cor = Number(b.dataset.cor); desenharMonte(); }));
    $$('#monte-caixa [data-parte]').forEach((b) => b.addEventListener('click', () => { montar[b.dataset.parte] = b.dataset.t; desenharMonte(); }));
    $('#reservar').addEventListener('click', () => {
      toast(`Reservado: ${p.nome}, top ${montar.top} + calcinha ${montar.baixo}`);
      $('#espera').scrollIntoView({ behavior: 'smooth' });
      $('#nome')?.focus({ preventScroll: true });
    });
  };
  desenharColecao();
  desenharMonte();

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
  const alvo = e.target.closest('[data-abrir], [data-fechar], [data-add], [data-trocar], [data-finalizar], [data-tabela], [data-teste]');
  if (e.target.classList.contains('veu')) return fecharTudo();
  if (!alvo) return;
  if (alvo.hasAttribute('data-teste')) abrirTeste();
  else if (alvo.dataset.abrir) abrir(alvo.dataset.abrir);
  else if (alvo.hasAttribute('data-fechar')) fecharTudo();
  else if (alvo.dataset.add) abrirOpcoes(alvo.dataset.add);
  else if (alvo.dataset.trocar) trocar(alvo.dataset.trocar);
  else if (alvo.hasAttribute('data-finalizar')) finalizar();
  else if (alvo.hasAttribute('data-tabela')) abrirTabela();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharTudo(); });
