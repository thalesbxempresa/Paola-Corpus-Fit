// =============================================================
// Paola Corpus Fit — protótipo: topo, pedido, sacola e telas
// Caminho de compra único: escolher o kit → número da calça → WhatsApp
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

// O número da calça é perguntado uma vez só e vale para o site todo
let calcaMemoria = null;
function lerCalca() {
  let n = calcaMemoria;
  try { n = Number(localStorage.getItem('pcf-calca')) || n; } catch (e) { /* sem armazenamento */ }
  return tamanhoPorCalca(n) ? Number(n) : null;
}
function gravarCalca(n) {
  calcaMemoria = n;
  try { localStorage.setItem('pcf-calca', n); } catch (e) { /* ok */ }
}

// Itens de um combo agrupados ("2 Sutiãs reforçados") + a escolha, quando houver
function listaItens(k) {
  const conta = {};
  k.itens.forEach((i) => { conta[i] = (conta[i] || 0) + 1; });
  const linhas = Object.entries(conta).map(([id, n]) => (n > 1 ? `${n} ${item(id).plural}` : nomeCurto(item(id))));
  if (k.escolha) linhas.push(k.escolha.map((i) => nomeCurto(item(i))).join(' ou '));
  return linhas;
}

// As 3 opções do pedido; o kit completo vem marcado, como a Paola recomenda.
// A cinta sozinha ao lado do Combo Duplo (+R$ 30) funciona como comparação de preço.
const OPCOES = [
  { id: 'combo-5', titulo: 'Kit Completo', selo: 'Mais escolhido', sub: 'Cinta de 30 barbatanas + 2 sutiãs + gel + creme', nota: `5 produtos: sai ${brl(item('combo-5').preco / 5)} cada` },
  { id: 'combo-duplo', titulo: 'Combo Duplo', sub: 'Cinta de 30 barbatanas + gel ou sutiã, você escolhe', nota: 'Só R$ 30 a mais que a cinta sozinha' },
  { id: 'cinta', titulo: 'Só a cinta', sub: 'Com 30 ou 20 barbatanas' },
];

// Sempre um passo acima: cinta 20 → cinta 30 → combo duplo → combo de 5
const SOBE = {
  'cinta-ziper-20': ['cinta-ziper-30', 'Leve a de 30 barbatanas, a melhor'],
  'cinta-ziper-30': ['combo-duplo', 'Leve também o gel ou o sutiã'],
  'combo-duplo': ['combo-5', 'Leve o kit completo, com 5 produtos'],
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
  ['Comprar', 'index.html#comprar'],
  ['Como funciona', 'index.html#como-funciona'],
  ['Todos os produtos', 'loja.html'],
  ['Dúvidas', 'index.html#duvidas'],
  ['Moda Praia', 'moda-praia.html', true],
];

function montarTopo() {
  const pagina = document.body.dataset.pagina;
  const avisos = [`${KITS[0].sub} por ${brl(KITS[0].preco)}`, 'Você só paga depois de falar com a Paola', `Frete grátis acima de ${brl(LOJA.freteGratis)}`];
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
        <button class="ico-btn" type="button" data-abrir="sacola" aria-label="Abrir seu pedido">${I.sacola}<span class="conta-sacola" hidden>0</span></button>
      </div>
    </div>
  </header>
  <div class="veu"></div>
  <aside class="gaveta esq" id="g-menu" aria-label="Menu">
    <div class="gaveta-topo"><h2>Menu</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="gaveta-corpo">
      <a class="btn btn-preto btn-bloco" href="index.html#comprar" data-fechar>Fazer meu pedido</a>
      <nav class="menu-links" style="margin-top:14px">${MENU.slice(1, 4).map(([nome, link]) => `<a href="${link}" data-fechar>${nome}${I.seta}</a>`).join('')}</nav>
      <a class="menu-praia" href="moda-praia.html"><span>Lançamento</span><b>Moda Praia</b><span>Entre na lista de espera →</span></a>
      <div class="menu-contato">
        <a class="btn btn-claro" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}Falar com a Paola</a>
        <a class="btn btn-claro" href="${LOJA.instagram}" target="_blank" rel="noopener">${I.insta}${LOJA.arroba}</a>
      </div>
    </div>
  </aside>
  <aside class="gaveta dir" id="g-sacola" aria-label="Seu pedido">
    <div class="gaveta-topo"><h2>Seu pedido</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="gaveta-corpo"></div>
    <div class="gaveta-pe"></div>
  </aside>
  <div class="modal" id="modal" role="dialog" aria-modal="true"></div>
  <a class="zap-flutuante" href="${LOJA.whatsapp}" target="_blank" rel="noopener" aria-label="Tirar dúvidas no WhatsApp">${I.whats}<span>Dúvidas?</span></a>
  <div class="toast" role="status" aria-live="polite"></div>`;

  let i = 0;
  setInterval(() => { i = (i + 1) % avisos.length; $('.aviso').innerHTML = `<span>${avisos[i]}</span>`; }, 4000);
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
          <li><a href="index.html#comprar">Descobrir meu tamanho</a></li>
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

// ---------------- Sacola ("Seu pedido") ----------------
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
    const ultimo = lerPedidos()[0];
    corpo.innerHTML = `<div class="sacola-vazia">${I.sacola}<b>Seu pedido está vazio</b><p style="color:var(--tinta-2)">Escolha o kit e o número da calça. Leva 1 minuto.</p><a class="btn btn-preto" href="index.html#comprar" data-fechar>Fazer meu pedido</a>
      ${ultimo ? `<div class="ultimo-pedido"><small>Seu último pedido</small><b>${ultimo.numero} · ${brl(ultimo.total)}</b><button class="link-tam" type="button" data-reenviar>Enviar de novo para a Paola</button></div>` : ''}</div>`;
    $('[data-reenviar]', corpo)?.addEventListener('click', () => enviarWhatsApp(textoPedido(ultimo), 'A Paola confere seu tamanho e te envia o link de pagamento', ultimo.numero));
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
    <button class="btn btn-preto btn-bloco" type="button" data-finalizar>${I.whats}Enviar pedido pelo WhatsApp</button>
    <p class="pe-nota">A Paola confirma seu tamanho e o pagamento com você na conversa.</p>`;

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

// Troca a linha do pedido pelo degrau de cima, mantendo a calça
function trocar(chave) {
  const x = lerSacola().find((y) => y.chave === chave);
  if (x) abrirOpcoes(SOBE[x.id][0], { calca: x.calca, qtd: x.qtd, trocar: chave });
}

// ---------------- Registro do pedido ----------------
// Provisório até ter pagamento no site: o pedido ganha número, fica salvo neste aparelho
// e vai organizado para a Paola no WhatsApp; ela responde com o link de pagamento.
const lerJSON = (chave, padrao) => { try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch (e) { return padrao; } };
const gravarJSON = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* ok */ } };
const lerPedidos = () => lerJSON('pcf-pedidos', []);

function registrarPedido(s, dados) {
  const agora = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  const numero = `PCF-${dois(agora.getDate())}${dois(agora.getMonth() + 1)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const pedido = { ...dados, numero, data: agora.toISOString(), itens: s, total: subtotal(s) };
  gravarJSON('pcf-pedidos', [pedido, ...lerPedidos()].slice(0, 10));
  return pedido;
}

// Mensagem no formato que a Paola lê de uma vez (negrito do WhatsApp com *)
function textoPedido(p) {
  const itens = p.itens.map((x) => `• ${x.qtd}x ${nomeLinha(x)}${x.calca ? `\n   Tamanho ${tamanhoPorCalca(x.calca).t} (veste calça ${x.calca})` : ''}`).join('\n');
  return `*Pedido ${p.numero}*\nOi, Paola! Quero finalizar este pedido:\n\n${itens}\n\n*Total:* ${brl(p.total)} (${brl(pix(p.total))} no Pix)\n\n*Meus dados*\nNome: ${p.nome}\nPagamento: ${p.pagamento}\n\n*Entrega*\n${p.rua ? `${p.rua}, ${p.num}${p.complemento ? ` - ${p.complemento}` : ''}\n${p.bairro} - ${p.cidade}/${p.uf}\n` : ''}CEP: ${p.cep}\n\nPode me mandar o link de pagamento? Se precisar, te mando uma foto de frente para confirmar o tamanho.`;
}

// Antes do WhatsApp: explica por que a compra fecha com uma pessoa e pede só o essencial
function finalizar() {
  const s = lerSacola();
  if (!s.length) return;
  const cliente = lerJSON('pcf-cliente', {});
  let pagamento = cliente.pagamento || 'Pix';
  const m = abrirModal(`
    <div class="modal-topo"><h2>Você vai finalizar com a Paola</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="aviso-real">
      <span class="aviso-ico">${I.chat}</span>
      <p><b>Cinta só modela no tamanho certo.</b> Por isso, quem fecha o seu pedido é a própria Paola, pelo WhatsApp: uma pessoa de verdade, não um robô.</p>
    </div>
    <ul class="espera-lista aviso-lista">
      <li>Ela confere seu tamanho antes de enviar e, se precisar, pede uma foto de frente</li>
      <li>Você recebe dela o link de pagamento: Pix com 5% de desconto ou cartão em até ${LOJA.parcelas}x</li>
      <li>Nada é cobrado agora</li>
    </ul>
    <form class="checkout" id="form-checkout" novalidate>
      <div class="campo"><label for="ck-nome">Seu nome</label><input id="ck-nome" name="nome" autocomplete="name" required></div>
      <h3 class="ck-sub">Onde entregar</h3>
      <div class="campo"><label for="ck-cep">CEP</label><input id="ck-cep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9" required><small class="ck-status" data-status></small></div>
      <div class="campo"><label for="ck-rua">Rua</label><input id="ck-rua" name="rua" autocomplete="address-line1" required></div>
      <div class="ck-linha">
        <div class="campo"><label for="ck-num">Número</label><input id="ck-num" name="num" inputmode="numeric" required></div>
        <div class="campo"><label for="ck-comp">Complemento</label><input id="ck-comp" name="complemento" autocomplete="address-line2" placeholder="Opcional"></div>
      </div>
      <div class="campo"><label for="ck-bairro">Bairro</label><input id="ck-bairro" name="bairro" required></div>
      <div class="ck-linha ck-cidade">
        <div class="campo"><label for="ck-cidade">Cidade</label><input id="ck-cidade" name="cidade" autocomplete="address-level2" required></div>
        <div class="campo"><label for="ck-uf">UF</label><input id="ck-uf" name="uf" autocomplete="address-level1" maxlength="2" required></div>
      </div>
      <div class="campo"><span class="rotulo">Como prefere pagar?</span>
        <div class="tamanhos" role="radiogroup" aria-label="Forma de pagamento">${['Pix', 'Cartão'].map((f) => `<button class="chip" type="button" role="radio" data-pag="${f}" aria-checked="${f === pagamento}">${f === 'Pix' ? 'Pix (5% off)' : `Cartão em até ${LOJA.parcelas}x`}</button>`).join('')}</div>
      </div>
      <div class="ck-total"><span>Total do pedido</span><b>${brl(subtotal(s))}</b></div>
      <p class="dica-tam erro" data-erro hidden></p>
      <button class="btn btn-preto btn-bloco btn-pedir" type="submit">${I.whats}Continuar no WhatsApp</button>
    </form>`);
  const form = $('#form-checkout', m);
  const CAMPOS = ['nome', 'cep', 'rua', 'num', 'complemento', 'bairro', 'cidade', 'uf'];
  CAMPOS.forEach((c) => { form[c].value = cliente[c] || ''; });
  // Pelo CEP, o endereço se preenche sozinho (ViaCEP, serviço público e gratuito); se falhar, ela digita
  const status = $('[data-status]', m);
  let ultimoCep = '';
  form.cep.addEventListener('input', async () => {
    const d = form.cep.value.replace(/\D/g, '').slice(0, 8);
    form.cep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    if (d.length !== 8 || d === ultimoCep) return;
    ultimoCep = d;
    status.textContent = 'Buscando endereço…';
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`).then((x) => x.json());
      if (r.erro) throw new Error('CEP não encontrado');
      form.rua.value = r.logradouro || form.rua.value;
      form.bairro.value = r.bairro || form.bairro.value;
      form.cidade.value = r.localidade || '';
      form.uf.value = r.uf || '';
      status.textContent = '';
      (r.logradouro ? form.num : form.rua).focus();
    } catch (e) {
      status.textContent = 'Não achamos esse CEP. Preencha o endereço abaixo.';
    }
  });
  $$('[data-pag]', m).forEach((b) => b.addEventListener('click', () => {
    pagamento = b.dataset.pag;
    $$('[data-pag]', m).forEach((c) => c.setAttribute('aria-checked', c === b));
  }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(CAMPOS.map((c) => [c, form[c].value.trim()]));
    d.uf = d.uf.toUpperCase();
    const erro = $('[data-erro]', m);
    const falta = (!d.nome && ['nome', 'Escreva seu nome.'])
      || (d.cep.replace(/\D/g, '').length !== 8 && ['cep', 'Digite os 8 números do CEP.'])
      || (!d.rua && ['rua', 'Escreva a rua.'])
      || (!d.num && ['num', 'Escreva o número da casa ou prédio.'])
      || (!d.bairro && ['bairro', 'Escreva o bairro.'])
      || ((!d.cidade || d.uf.length !== 2) && ['cidade', 'Escreva a cidade e a UF (ex.: RJ).']);
    if (falta) { erro.hidden = false; erro.textContent = falta[1]; form[falta[0]].focus(); return; }
    gravarJSON('pcf-cliente', { ...d, pagamento });
    const pedido = registrarPedido(s, { ...d, pagamento });
    gravarSacola([]);
    enviarWhatsApp(textoPedido(pedido), 'A Paola confere seu tamanho e te envia o link de pagamento', pedido.numero);
  });
}

function enviarWhatsApp(texto, depois, numero) {
  if (LOJA.whatsappNumero) {
    window.open(`https://wa.me/${LOJA.whatsappNumero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    if (!numero) return;
  }
  // A tela abre na hora; a cópia vem depois (alguns navegadores demoram ou pedem permissão)
  const m = abrirModal(`
    <div class="modal-topo"><h2>${numero ? 'Pedido registrado' : 'Falta só enviar'}</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    ${numero ? `<p class="pedido-num">Nº <b>${numero}</b> · Agora é só enviar para a Paola.</p>` : ''}
    <ol class="envio-passos">
      <li><b>1</b><span>Toque em <strong>Abrir WhatsApp</strong></span></li>
      <li><b>2</b><span data-copia>Copie a mensagem abaixo, cole na conversa e envie.</span></li>
      <li><b>3</b><span>${depois}</span></li>
    </ol>
    <pre class="envio-texto"></pre>
    <a class="btn btn-preto btn-bloco" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}Abrir WhatsApp</a>
    <button class="link-tam envio-copiar" type="button" data-copiar>Copiar a mensagem de novo</button>`);
  $('.envio-texto', m).textContent = texto;
  navigator.clipboard?.writeText(texto).then(() => {
    $('[data-copia]', m).textContent = 'Cole a mensagem na conversa e envie. Ela já está copiada.';
  }).catch(() => { /* sem permissão: o texto continua na tela para copiar */ });
  $('[data-copiar]', m).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(texto); toast('Mensagem copiada'); } catch (e) { toast('Selecione o texto e copie'); }
  });
}

// ---------------- Tamanho pelo número da calça ----------------
function calcaHTML(sel = lerCalca()) {
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
    gravarCalca(n);
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
// Reduz o risco na hora do clique: nada é cobrado no site e o tamanho é conferido antes
const notaPedido = () => `<p class="pedido-nota">${I.escudo}<span>Você só paga depois de falar com a Paola no WhatsApp. Ela confirma seu tamanho antes de enviar.</span></p>`;
// O botão fala do que a cliente ganha, não do que ela precisa fazer
const textoBotao = (it) => (it.itens ? 'Quero meu kit' : 'Quero minha cinta');

function abrirTabela(aoEscolher) {
  let escolhido = null;
  const m = abrirModal(`
    <div class="modal-topo"><h2>Qual é o meu tamanho?</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <p style="color:var(--tinta-2);margin-bottom:16px">Marque o número da calça ou short que você veste. A cinta estica, então medida em centímetros não ajuda.</p>
    ${calcaHTML(null)}
    ${tabelaHTML()}
    ${notaPedido()}
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

// Atalho dos cards (+): pede só o que faltar (escolha do combo e/ou calça)
function abrirOpcoes(id, pre = {}) {
  const it = item(id);
  const sel = { calca: pre.calca || lerCalca(), extra: pre.extra || null };
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
    <p class="dica-tam erro" data-erro hidden></p>
    <button class="btn btn-preto btn-bloco" type="button" data-confirmar style="margin-top:16px">Colocar no pedido</button>
    ${usaTam ? notaPedido() : ''}`);
  if (it.escolha) ligarEscolha(m, (v) => { sel.extra = v; });
  if (usaTam) ligarCalca(m, (n) => { sel.calca = n; });
  $('[data-confirmar]', m).addEventListener('click', () => {
    if (pronto()) return concluir();
    const erro = $('[data-erro]', m);
    erro.hidden = false;
    erro.textContent = it.escolha && !sel.extra ? 'Escolha o gel ou o sutiã.' : 'Marque o número da sua calça.';
  });
}

// ---------------- Pedido em 2 passos (página inicial) ----------------
function montarPedido(raiz) {
  const p = { opcao: 'combo-5', extra: null, versao: 'cinta-ziper-30' };
  const produto = () => item(p.opcao === 'cinta' ? p.versao : p.opcao);
  const resumo = () => {
    const it = produto();
    const calca = lerCalca();
    const nome = `${OPCOES.find((o) => o.id === p.opcao).titulo}${p.opcao === 'cinta' ? ` · ${it.barbatanas} barbatanas` : ''}${p.extra ? ` + ${nomeCurto(item(p.extra))}` : ''}`;
    return `<div><small>Seu pedido</small><b>${nome}</b><small>${calca ? `Tamanho ${tamanhoPorCalca(calca).t} · calça ${calca}` : 'Falta o número da calça'}</small></div>
      <div class="total">${brl(it.preco)}<small>${brl(pix(it.preco))} no Pix</small></div>`;
  };
  const atualizar = () => {
    $('.pedido-resumo', raiz).innerHTML = resumo();
    $('[data-erro]', raiz).hidden = true;
  };
  const subOpcao = (o) => {
    if (o.id === 'combo-duplo') return `<div class="kit-op-sub" id="pedido-escolha"><small>Qual você quer junto?</small>${escolhaHTML(item('combo-duplo'), p.extra)}</div>`;
    return `<div class="kit-op-sub"><div class="versoes">${PRODUTOS.filter((x) => x.cat === 'cintas').map((x) => `<button type="button" data-versao="${x.id}" aria-pressed="${x.id === p.versao}"><b>${x.barbatanas} barbatanas</b><small>${x.selo ? `${x.selo} · ` : ''}${brl(x.preco)}</small></button>`).join('')}</div></div>`;
  };

  const desenhar = () => {
    raiz.innerHTML = `
      <div class="passo"><span class="passo-n">1</span><h3>O que você quer levar?</h3></div>
      <div class="kits-opcoes" role="radiogroup" aria-label="O que você quer levar">${OPCOES.map((o) => {
        const it = item(o.id === 'cinta' ? p.versao : o.id);
        const marcado = p.opcao === o.id;
        return `<button class="kit-op" type="button" role="radio" aria-checked="${marcado}" data-opcao="${o.id}">
          <span class="kit-op-foto"><img src="${it.img}" alt="" loading="lazy"></span>
          <span class="kit-op-txt">${o.selo ? `<span class="kit-op-selo">${o.selo}</span>` : ''}<b>${o.titulo}</b><small>${o.sub}</small>
            <span class="kit-op-preco"><s>${brl(it.de)}</s> <strong>${brl(it.preco)}</strong></span>${o.nota ? `<em>${o.nota}</em>` : ''}</span>
          <span class="kit-op-radio" aria-hidden="true"></span>
        </button>${marcado && o.id !== 'combo-5' ? subOpcao(o) : ''}`;
      }).join('')}</div>
      <div class="passo" id="passo-calca"><span class="passo-n">2</span><h3>Qual número de calça você usa?</h3></div>
      ${calcaHTML()}
      <div class="pedido-resumo">${resumo()}</div>
      <p class="dica-tam erro" data-erro hidden></p>
      <button class="btn btn-preto btn-bloco btn-pedir" type="button" data-pedir>${textoBotao(produto())}</button>
      ${notaPedido()}`;
    const foto = $('#comprar-foto');
    if (foto) foto.src = produto().img;

    $$('[data-opcao]', raiz).forEach((b) => b.addEventListener('click', () => {
      p.opcao = b.dataset.opcao;
      if (p.opcao !== 'combo-duplo') p.extra = null;
      desenhar();
    }));
    $$('[data-versao]', raiz).forEach((b) => b.addEventListener('click', () => { p.versao = b.dataset.versao; desenhar(); }));
    if (p.opcao === 'combo-duplo') ligarEscolha(raiz, (v) => { p.extra = v; atualizar(); });
    ligarCalca(raiz, atualizar);
    $('[data-pedir]', raiz).addEventListener('click', () => {
      const calca = lerCalca();
      const falta = (p.opcao === 'combo-duplo' && !p.extra && ['#pedido-escolha', 'Escolha o gel ou o sutiã.'])
        || (!calca && ['#passo-calca', 'Marque o número da sua calça.']);
      if (falta) {
        const erro = $('[data-erro]', raiz);
        erro.hidden = false;
        erro.textContent = falta[1];
        $(falta[0], raiz).scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      adicionar(produto().id, { calca, extra: p.extra });
    });
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
      <div class="av-compra">Veste calça ${a.calca} · usa o ${a.tam} · comprou ${a.produto}</div>
    </div>
  </article>`).join('');
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
      ${temPreco(it) ? `<button class="btn-add" type="button" data-add="${it.id}" aria-label="Colocar ${it.nome} no pedido">${I.mais}</button>` : ''}
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
      <button class="btn btn-preto" type="button" data-add="${k.id}">Quero este</button>
    </div>
  </div>`;
}

// ---------------- Telas ----------------
function telaInicio() {
  montarPedido($('#pedido'));
  $('#praia-pecas').innerHTML = PRAIA.slice(0, 3).map((p) => `<span><img src="${p.img}" alt="${p.nome}" loading="lazy"></span>`).join('');
  $('#avaliacoes').innerHTML = avaliacoesHTML();
  ligarComparadores();
  barraInicio();
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
  if (tamanhoPorCalca(busca.get('calca'))) gravarCalca(Number(busca.get('calca')));
  let calca = lerCalca();
  let extra = it.escolha?.includes(busca.get('extra')) ? busca.get('extra') : null;
  document.title = `${it.nome} | Paola Corpus Fit`;

  const pecas = ehKit ? [...new Set([...it.itens, ...(it.escolha || [])])] : [];
  const fotos = ehKit
    ? [{ src: it.img }, ...pecas.map((i) => ({ src: item(i).img, txt: nomeCurto(item(i)) }))]
    : (it.galeria || [{ src: it.img }]);
  const galeria = fotos.map((f, i) => `<figure><img src="${f.src}" alt="${it.nome}"${i ? ' loading="lazy"' : ''}>${f.txt ? `<figcaption>${f.txt}</figcaption>` : ''}</figure>`).join('');
  const cat = ({ cintas: 'Cintas', sutias: 'Sutiã', tratamento: 'Tratamento', kits: 'Combos' })[it.cat];

  const versoes = it.cat === 'cintas' ? `<div class="grupo"><div class="grupo-titulo">Versão</div>
    <div class="versoes">${PRODUTOS.filter((p) => p.cat === 'cintas').map((p) => `<a href="produto.html?id=${p.id}" aria-current="${p.id === it.id}"><b>${p.barbatanas} barbatanas</b><small>${p.selo ? `${p.selo} · ` : ''}${brl(p.preco)}</small></a>`).join('')}</div></div>` : '';

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
      <a class="btn btn-preto btn-bloco" href="produto.html?id=${sobe.id}">Ver ${sobe.nome}</a>
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
        ${vende && it.escolha ? `<div class="grupo" id="escolha"><div class="grupo-titulo">Qual você quer junto?</div>${escolhaHTML(it, extra)}</div>` : ''}
        ${usaTam ? `<div class="grupo" id="tamanho">
          <div class="grupo-titulo">Número da calça ou short <button class="link-tam" type="button" data-tabela>${I.regua}Tabela</button></div>
          ${calcaHTML(calca)}
        </div>` : ''}
        ${vende ? `<p class="dica-tam erro" id="erro-compra" hidden></p>
        <button class="btn btn-preto btn-bloco btn-pedir" type="button" id="adicionar">${textoBotao(it)}</button>
        ${usaTam ? notaPedido() : ''}` : `<div class="grupo"><div class="grupo-titulo">Leve nos combos</div><div class="kits">${kitsCom(it.id).map(cardKit).join('')}</div></div>
        <a class="btn btn-claro btn-bloco" href="${LOJA.whatsapp}" target="_blank" rel="noopener" style="margin-top:14px">${I.whats}Perguntar no WhatsApp</a>`}
        ${it.pontos ? `<ul class="pontos-prod">${it.pontos.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}
        ${junto}
        <div class="detalhes">
          <details open><summary>Descrição</summary><div class="conteudo">${it.desc}</div></details>
          ${it.uso ? `<details><summary>Como usar</summary><div class="conteudo">${it.uso}</div></details>` : ''}
          ${usaTam ? `<details><summary>Dobra? Marca? Machuca?</summary><div class="conteudo"><p><b>Dobra ou enrola?</b> Não. As barbatanas mantêm a cinta no lugar, mesmo sentada ou treinando.</p><p style="margin-top:10px"><b>Quantas regulagens?</b> Duas regulagens de colchete por dentro e mais o zíper por fora, na frente.</p><p style="margin-top:10px"><b>Marca na roupa?</b> Não marca por baixo da roupa.</p><p style="margin-top:10px"><b>Machuca?</b> O tecido cetinete é pós-cirúrgico e antialérgico. Comece com poucas horas por dia e aumente aos poucos.</p></div></details>` : ''}
          ${usaTam ? `<details><summary>Tabela de medidas</summary><div class="conteudo">${tabelaHTML()}<p style="margin-top:10px">A cinta estica, então o que vale é o número da calça ou short, não a medida em centímetros.</p></div></details>` : ''}
          <details><summary>Entrega e pagamento</summary><div class="conteudo">Enviamos do ${LOJA.cidade} para todo o Brasil. Pix com ${Math.round(LOJA.pix * 100)}% de desconto ou cartão em até ${LOJA.parcelas}x sem juros. O prazo de entrega a Paola confirma no WhatsApp.</div></details>
        </div>
      </div>
    </div>`;

  // Bloco "no dia a dia" só onde tem cinta
  $('#dia-a-dia').hidden = !usaTam;
  $('#avaliacoes').innerHTML = avaliacoesHTML();
  $('#relacionados').innerHTML = [...KITS, ...PRODUTOS].filter((x) => x.id !== it.id).slice(0, 4).map(card).join('');
  if (!vende) return;

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
  const comprar = () => {
    const falta = (it.escolha && !extra && ['escolha', 'Escolha o gel ou o sutiã para continuar.'])
      || (usaTam && !calca && ['tamanho', 'Marque o número da sua calça para continuar.']);
    if (falta) {
      erro.hidden = false;
      erro.textContent = falta[1];
      $(`#${falta[0]}`).scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    adicionar(it.id, { calca: usaTam ? calca : null, extra });
  };
  $('#adicionar').addEventListener('click', comprar);

  // Barra fixa no celular quando o botão principal sai da tela
  const barra = $('#barra-prod');
  barra.innerHTML = `<div><small>${nomeCurto(it)}</small><b>${brl(it.preco)}</b></div><button class="btn btn-preto" type="button">${it.itens ? 'Quero o meu' : 'Quero a minha'}</button>`;
  $('button', barra).addEventListener('click', comprar);
  new IntersectionObserver(([e]) => barra.classList.toggle('visivel', !e.isIntersecting && e.boundingClientRect.top < 0)).observe($('#adicionar'));
}

function telaPraia() {
  $('#praia-vitrine').innerHTML = PRAIA.slice(0, 2).map((p) => `<span><img src="${p.img}" alt="${p.nome}"></span>`).join('');

  // Foto fixa: conforme a página sobe, ela fica fosca e some no fundo (uma conta por quadro, só opacidade)
  const fundo = $('.praia-fundo');
  if (fundo && !semMovimento) {
    const topo = $('.praia-hero');
    let agendado = false;
    const entre = (v) => Math.min(1, Math.max(0, v));
    const atualizar = () => {
      agendado = false;
      const h = Math.max(1, topo.offsetHeight);
      // O desfoque começa já no primeiro movimento; o clareamento vem depois (texto branco legível)
      const p = entre(scrollY / (h * 0.5));
      fundo.style.setProperty('--p', entre(scrollY / h).toFixed(3));
      fundo.style.setProperty('--fosca', entre(p * 2.2).toFixed(3));
      fundo.style.setProperty('--vidro', (entre((p - 0.35) / 0.65) * 0.9).toFixed(3));
    };
    addEventListener('scroll', () => { if (!agendado) { agendado = true; requestAnimationFrame(atualizar); } }, { passive: true });
    addEventListener('resize', atualizar);
    atualizar();
  }

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
        <button class="btn btn-preto btn-bloco" type="button" id="reservar" ${montar.top && montar.baixo ? '' : 'disabled'}>Quero esse no lançamento</button>
      </div>`;
    $$('[data-modelo]').forEach((b) => b.addEventListener('click', () => { montar.modelo = b.dataset.modelo; montar.cor = 0; desenharMonte(); }));
    $$('[data-cor]').forEach((b) => b.addEventListener('click', () => { montar.cor = Number(b.dataset.cor); desenharMonte(); }));
    $$('#monte-caixa [data-parte]').forEach((b) => b.addEventListener('click', () => { montar[b.dataset.parte] = b.dataset.t; desenharMonte(); }));
    $('#reservar').addEventListener('click', () => marcarReserva(`${p.nome}, top ${montar.top} + calcinha ${montar.baixo}`, [montar.top, montar.baixo]));
  };
  desenharColecao();
  desenharMonte();

  // O que ela escolheu (biquíni montado ou Kit Verão) já vai junto na mensagem da lista
  let reserva = null;
  const marcarReserva = (txt, tamanhos = []) => {
    const aviso = $('#reserva');
    if (!aviso) return;
    reserva = txt;
    aviso.hidden = false;
    aviso.innerHTML = '<b>Você escolheu:</b> ';
    aviso.append(txt);
    $$('#espera-tam .chip').forEach((c) => { if (tamanhos.includes(c.textContent)) c.setAttribute('aria-checked', 'true'); });
    $('#espera').scrollIntoView({ behavior: 'smooth' });
    $('#nome').focus({ preventScroll: true });
  };
  $$('[data-reserva]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); marcarReserva(a.dataset.reserva); }));

  // Contagem só com data real de lançamento (urgência inventada não entra)
  const lancamento = LOJA.lancamentoPraia && new Date(LOJA.lancamentoPraia);
  if (lancamento) {
    const caixa = $('#contagem');
    caixa.hidden = false;
    const contagem = () => {
      const ms = Math.max(0, lancamento - Date.now());
      const d = Math.floor(ms / 864e5);
      const h = Math.floor(ms / 36e5) % 24;
      const m = Math.floor(ms / 6e4) % 60;
      const s = Math.floor(ms / 1e3) % 60;
      caixa.innerHTML = [[d, 'dias'], [h, 'horas'], [m, 'min'], [s, 'seg']].map(([v, r]) => `<div><b>${String(v).padStart(2, '0')}</b><small>${r}</small></div>`).join('');
    };
    contagem();
    setInterval(contagem, 1000);
  }

  $$('#espera-tam .chip').forEach((c) => c.addEventListener('click', () => {
    c.setAttribute('aria-checked', c.getAttribute('aria-checked') !== 'true');
  }));
  // Lista de espera pelo WhatsApp: só nome e tamanhos, o número ela já tem
  $('#form-espera').addEventListener('submit', (e) => {
    e.preventDefault();
    const nomeCompleto = e.target.nome.value.trim();
    const tamanhos = $$('#espera-tam .chip[aria-checked="true"]').map((c) => c.textContent);
    const texto = `Oi, Paola! Quero entrar na lista da moda praia.\nNome: ${nomeCompleto}${tamanhos.length ? `\nMeus tamanhos: ${tamanhos.join(', ')}` : ''}${reserva ? `\nQuero no lançamento: ${reserva}` : ''}`;
    enviarWhatsApp(texto, 'A Paola te avisa assim que a coleção chegar');
    $('#espera-caixa').innerHTML = `<div class="espera-ok"><span class="check">${I.ok}</span><b>Pronto, <span data-nome></span>!</b><p style="color:var(--tinta-2)">Assim que sua mensagem chegar, a Paola te coloca na lista.</p><a class="btn btn-claro" href="index.html#comprar">Enquanto isso, ver a cinta</a></div>`;
    $('[data-nome]').textContent = nomeCompleto.split(' ')[0] || 'linda';
  });
}

// ---------------- Movimento ao rolar ----------------
// Leve de propósito: só opacidade e posição, sem biblioteca. A área do pedido não se mexe.
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GRUPOS_ANIMA = [
  ['.titulo-sec, .sec-intro, .com-sem-txt, .teste-banner, .praia-banner, .dia-a-dia', 'anima'],
  ['.beneficios .benef, .vt-outras li, .vt-paola li, .avaliacao, .teste-passos li, .numeros > div, .pontos-cinta li, .corpos figure, .faq details, #relacionados .card, #grade-loja .card', 'anima'],
  ['.peca-praia, .espera-lista li, .kit-verao, .espera, .praia-cinta', 'anima'],
  ['.antes-depois, .anatomia-foto, .monte-foto', 'anima anima-zoom'],
  ['.anatomia-foto .pino', 'anima-pino'],
];

function ligarMovimento() {
  if (semMovimento || !('IntersectionObserver' in window)) return;
  // Segurança: se o navegador não avisar a rolagem (aba em segundo plano, app embutido), mostra tudo
  let respondeu = false;
  setTimeout(() => { if (!respondeu) $$('.anima, .anima-pino').forEach((el) => el.classList.add('visivel')); }, 2500);
  const olhar = new IntersectionObserver((entradas) => entradas.forEach((e) => {
    respondeu = true;
    if (!e.isIntersecting) return;
    e.target.classList.add('visivel');
    olhar.unobserve(e.target);
    if (e.target.dataset.conta) contar(e.target);
    if (e.target.classList.contains('antes-depois')) demoComparador(e.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });

  GRUPOS_ANIMA.forEach(([sel, classes]) => {
    $$(sel).forEach((el) => {
      // Itens irmãos entram em sequência
      const irmaos = [...el.parentElement.children].filter((x) => x.matches(sel));
      el.style.setProperty('--i', irmaos.indexOf(el));
      el.classList.add(...classes.split(' '));
      olhar.observe(el);
    });
  });
  $$('[data-conta]').forEach((el) => olhar.observe(el));
}

// Número sobe de 0 até o valor final (o valor certo já está no HTML, caso nada rode)
function contar(el) {
  const fim = Number(el.dataset.conta);
  el.textContent = '0';
  const t0 = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / 1100);
    el.textContent = Math.round(fim * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// O comparador mostra sozinho o "sem" e o "com" uma vez; se ela tocar, para na hora
function demoComparador(comp) {
  const controle = $('input', comp);
  const passos = [[0, 50], [900, 90], [2100, 10], [3000, 50]];
  let parar = false;
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => controle.addEventListener(ev, () => { parar = true; }, { once: true, passive: true }));
  const definir = (v) => { comp.style.setProperty('--pos', `${v}%`); controle.value = v; };
  const t0 = performance.now() + 400;
  const passo = (t) => {
    if (parar) return;
    const dt = Math.max(0, t - t0);
    const i = passos.findIndex(([ms]) => ms > dt);
    if (i === -1) return definir(50);
    const [m0, v0] = passos[i - 1];
    const [m1, v1] = passos[i];
    const k = (dt - m0) / (m1 - m0);
    definir(v0 + (v1 - v0) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// Barra "Quero meu kit" no celular: aparece depois do topo e some enquanto ela está no pedido
function barraInicio() {
  const barra = $('#barra-inicio');
  if (!barra) return;
  let passouTopo = false;
  let noPedido = false;
  const atualizar = () => {
    const mostrar = passouTopo && !noPedido;
    barra.classList.toggle('visivel', mostrar);
    document.body.classList.toggle('com-barra', mostrar);
  };
  new IntersectionObserver(([e]) => { passouTopo = !e.isIntersecting && e.boundingClientRect.top < 0; atualizar(); }).observe($('.hero-acoes'));
  new IntersectionObserver(([e]) => { noPedido = e.isIntersecting; atualizar(); }).observe($('#comprar'));
}

// ---------------- Início ----------------
montarTopo();
montarRodape();
({ inicio: telaInicio, loja: telaLoja, produto: telaProduto, praia: telaPraia })[document.body.dataset.pagina]?.();
ligarMovimento();

document.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-abrir], [data-fechar], [data-add], [data-trocar], [data-finalizar], [data-tabela]');
  if (e.target.classList.contains('veu')) return fecharTudo();
  if (!alvo) return;
  if (alvo.dataset.abrir) abrir(alvo.dataset.abrir);
  else if (alvo.hasAttribute('data-fechar')) fecharTudo();
  else if (alvo.dataset.add) abrirOpcoes(alvo.dataset.add);
  else if (alvo.dataset.trocar) trocar(alvo.dataset.trocar);
  else if (alvo.hasAttribute('data-finalizar')) finalizar();
  else if (alvo.hasAttribute('data-tabela')) abrirTabela();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharTudo(); });
