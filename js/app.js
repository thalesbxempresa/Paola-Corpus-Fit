// =============================================================
// Paola Corpus Fit — loja: topo, pedido, carrinho e telas
// Caminho de compra: escolher o produto → número da calça → carrinho → pagamento no site
// =============================================================
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pix = (v) => v * (1 - LOJA.pix);
const parcela = (v) => v / LOJA.parcelas;
// LOJA.parcelas é o sem juros, que a loja assume; acima dele, até parcelasMax(), a cliente paga os juros
const parcelasMax = () => Math.max(LOJA.parcelas, Number(LOJA.parcelasMax) || LOJA.parcelas);
const textoCartao = () => {
  const sj = LOJA.parcelas;
  const max = parcelasMax();
  if (max > sj) return sj > 1 ? `cartão em até ${sj}x sem juros ou em até ${max}x com juros` : `cartão em até ${max}x com juros`;
  return sj > 1 ? `cartão em até ${sj}x sem juros` : 'cartão à vista';
};
const pctPix = () => `${(LOJA.pix * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const item = (id) => PRODUTOS.find((p) => p.id === id) || KITS.find((k) => k.id === id);
const nomeCurto = (it) => it.curto || it.nome;
const temPreco = (it) => it.preco != null;
const visivel = (it) => it.ativo !== false;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const linkAcompanhar = (id) => new URL(`acompanhar.html?p=${encodeURIComponent(id)}`, location.href).href;
// No rodapé, CNPJ e CPF saem formatados mesmo que a loja tenha digitado só os números
const documentoBonito = (v) => {
  const d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 14) return `CNPJ ${d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}`;
  if (d.length === 11) return `CPF ${d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')}`;
  return String(v ?? '').trim();
};
// "R$ 30" quando é valor redondo; "R$ 30,50" quando não é
const brlLimpo = (v) => { const c = Math.round(v * 100) / 100; return Number.isInteger(c) ? `R$ ${c.toLocaleString('pt-BR')}` : brl(c); };
const precisaTamanho = (it) => (it.itens ? it.itens.some((i) => item(i).tamanhos) : !!it.tamanhos);
const tamanhoPorCalca = (n) => TABELA.find((x) => x.calca.includes(Number(n)));
const faixaCalca = (x) => x.calca.join(' e ');
const kitsCom = (id) => KITS.filter((k) => visivel(k) && (k.itens.includes(id) || k.escolha?.includes(id)));
const cintasAVenda = () => PRODUTOS.filter((x) => x.cat === 'cintas' && x.barbatanas && temPreco(x) && visivel(x));
// Estoque: a Paola conta as peças de cada tamanho no painel (sem contagem = sempre à venda).
// O combo depende de todas as peças que vão nele: se o gel acabou, o kit que leva gel também acabou
const qtdEstoque = (id, t) => {
  const v = ESTOQUE.itens[id]?.[item(id)?.tamanhos ? t : ''];
  return Number.isFinite(v) ? v : Infinity;
};
// Quantos dá para vender num tamanho. Infinity = a loja não conta essas peças
function disponivel(it, t, extra = null) {
  if (!it) return Infinity;
  const conta = {};
  [...(it.itens || [it.id]), ...(extra ? [extra] : [])].forEach((id) => { conta[id] = (conta[id] || 0) + 1; });
  return Math.min(...Object.entries(conta).map(([id, n]) => {
    const x = item(id);
    // Marcação antiga do painel ("acabou" no tamanho) continua valendo
    if (x?.tamanhos && x.esgotados?.includes(t)) return 0;
    return Math.floor(qtdEstoque(id, t) / n);
  }));
}
const pecasComTamanho = (it) => (it.itens ? [...new Set(it.itens)].map(item).filter((x) => x?.tamanhos) : (it.tamanhos ? [it] : []));
const tamanhoEsgotado = (it, t) => disponivel(it, t) <= 0;
const calcaEsgotada = (it, n) => !!(it && n) && tamanhoEsgotado(it, tamanhoPorCalca(n)?.t);
const tudoEsgotado = (it) => (pecasComTamanho(it).length ? TABELA.every((x) => tamanhoEsgotado(it, x.t)) : disponivel(it, '') <= 0);
// Só com a chave ligada no painel e quando a Paola conta essas peças. Número real, nunca inventado
const textoEstoque = (it, t, extra = null) => {
  const q = ESTOQUE.mostrar && it && t ? disponivel(it, t, extra) : Infinity;
  return Number.isFinite(q) && q > 0 ? `${q} em estoque no tamanho ${t}` : '';
};
const TAMANHO_ACABOU = 'Esse tamanho acabou nesta opção. Marque outro número ou fale com a Paola.';
// Pagamento no site pelo Mercado Pago. Desligado (padrão): a cliente fecha com a Paola no WhatsApp, como sempre
const pagaNoSite = () => Catalogo.ligado && LOJA.pagarNoSite === true;
// Conta da cliente (e-mail e senha): precisa do banco ligado
const temConta = () => Catalogo.ligado;

// Máscaras de WhatsApp e CEP enquanto a cliente digita
const mascaraTelefone = (v) => {
  const d = String(v || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  return d.length <= 2 ? d
    : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}`
      : d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
};
const mascaraCep = (v) => { const d = String(v || '').replace(/\D/g, '').slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

// ---------------- Frete ----------------
// Valor e prazo saem da tabela da loja pelo CEP (js/frete.js); o banco refaz a mesma conta ao registrar o pedido.
// O CEP que a cliente calculou fica neste aparelho e vale no produto, no carrinho e na finalização.
const freteLigado = () => Frete.ligado(LOJA);
const freteDe = (cep, produtos) => Frete.calcular(LOJA, cep, produtos);
const CEP_FRETE = 'pcf-frete-cep';
const lerCepFrete = () => lerJSON(CEP_FRETE, {});
const somaCentavos = (a, b) => Math.round((a + b) * 100) / 100;
const textoPrazo = (dias) => `chega em até ${dias} ${dias === 1 ? 'dia útil' : 'dias úteis'} depois da postagem`;
const lugarCep = (c) => (c.cidade ? `${c.cidade}/${c.uf}` : c.uf || '');
const avisarFrete = () => { desenharSacola(); document.dispatchEvent(new CustomEvent('pcf-frete')); };
// A cidade (ViaCEP) serve só para mostrar e para avisar CEP que não existe. O preço sai da faixa do CEP
function guardarCepFrete(cep) {
  const d = String(cep || '').replace(/\D/g, '');
  if (lerCepFrete().cep === d) return avisarFrete();
  const novo = { cep: d, uf: Frete.uf(d) || '', cidade: '' };
  gravarJSON(CEP_FRETE, novo);
  avisarFrete();
  fetch(`https://viacep.com.br/ws/${d}/json/`).then((x) => x.json()).then((r) => {
    if (lerCepFrete().cep !== d) return;
    gravarJSON(CEP_FRETE, r.erro ? { ...novo, invalido: true } : { ...novo, cidade: r.localidade || '' });
    avisarFrete();
  }).catch(() => { /* sem internet: segue com o estado */ });
}
// "R$ 29,80 de frete para Macaé/RJ · chega em até 6 dias úteis depois da postagem"
function freteResultadoHTML(c, produtos) {
  if (!c.cep) return '';
  if (c.invalido) return '<span class="fc-erro">Não achamos esse CEP. Confira os números.</span>';
  const fr = freteDe(c.cep, produtos);
  if (!fr) return '';
  if (fr.erro) return '<span class="fc-erro">Confira o CEP: são 8 números.</span>';
  const lugar = lugarCep(c);
  return `${fr.gratis ? '<b class="fc-gratis">Frete grátis</b>' : `<b>${brl(fr.valor)}</b> de frete`}${lugar ? ` para ${esc(lugar)}` : ''} · ${textoPrazo(fr.dias)}${fr.gratis || !Number.isFinite(LOJA.freteGratis) ? '' : `. Grátis acima de ${brlLimpo(LOJA.freteGratis)}`}`;
}
// Caixa "Frete e prazo" (produto e carrinho)
const freteCaixaHTML = (id, cep = '') => `<form class="frete-calc" data-frete-form novalidate>
    <label class="fc-rotulo" for="${id}">${I.caminhao}Frete e prazo</label>
    <div class="fc-linha"><input id="${id}" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="Seu CEP" maxlength="9" value="${esc(mascaraCep(cep))}"><button class="btn btn-claro" type="submit">Calcular</button></div>
    <p class="fc-res" data-frete-res aria-live="polite"></p>
    <a class="link-tam fc-nao-sei" href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener">Não sei meu CEP</a>
  </form>`;
// Calcula sozinho ao completar os 8 números ou no botão. aoCalcular: quem desenha o resultado
function ligarFreteCaixa(form, aoCalcular) {
  const inp = form.cep;
  const calcular = () => {
    const d = inp.value.replace(/\D/g, '');
    if (d.length !== 8) {
      $('[data-frete-res]', form).innerHTML = '<span class="fc-erro">Digite os 8 números do CEP.</span>';
      inp.focus();
      return;
    }
    guardarCepFrete(d);
    aoCalcular?.();
  };
  inp.addEventListener('input', () => {
    inp.value = mascaraCep(inp.value);
    if (inp.value.replace(/\D/g, '').length === 8) calcular();
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); calcular(); });
}

// Achar pedido sem o link nem o número: o WhatsApp e o CEP que ela usou na compra, que ela sabe de cor.
// Neste aparelho, já vêm preenchidos com o que ela digitou na última compra.
const contatoHTML = (prefixo) => `
  <div class="campo"><label for="${prefixo}-tel">WhatsApp que você usou na compra</label><input id="${prefixo}-tel" name="telefone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(21) 99999-9999" maxlength="15" required></div>
  <div class="campo"><label for="${prefixo}-cep">CEP de entrega</label><input id="${prefixo}-cep" name="cep" inputmode="numeric" placeholder="00000-000" maxlength="9" autocomplete="postal-code" required></div>`;
function ligarContato(form) {
  const ultimo = lerJSON('pcf-cliente', {});
  form.telefone.value = mascaraTelefone(ultimo.telefone);
  form.cep.value = mascaraCep(ultimo.cep);
  form.telefone.addEventListener('input', () => { form.telefone.value = mascaraTelefone(form.telefone.value); });
  form.cep.addEventListener('input', () => { form.cep.value = mascaraCep(form.cep.value); });
  return () => {
    const telefone = form.telefone.value.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    const cep = form.cep.value.replace(/\D/g, '');
    if (telefone.length < 10) { form.telefone.focus(); return { erro: 'Escreva o WhatsApp com DDD, do jeito que você usou na compra.' }; }
    if (cep.length !== 8) { form.cep.focus(); return { erro: 'Digite os 8 números do CEP de entrega.' }; }
    return { telefone, cep };
  };
}

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
  const linhas = Object.entries(conta).map(([id, n]) => (n > 1 ? `${n} ${item(id).plural || nomeCurto(item(id))}` : nomeCurto(item(id))));
  if (k.escolha) linhas.push(k.escolha.map((i) => nomeCurto(item(i))).join(' ou '));
  return linhas;
}

// As 3 opções do pedido; o kit completo vem marcado, como a Paola recomenda.
// A cinta sozinha ao lado do Combo Duplo (+R$ 30) funciona como comparação de preço.
const OPCOES = [
  { id: 'combo-5', titulo: 'Kit Completo', selo: 'Mais completo', sub: 'Cinta de 30 barbatanas + 2 sutiãs + gel + creme', nota: () => { const k = item('combo-5'); return `${k.itens.length} produtos: sai ${brl(k.preco / k.itens.length)} cada`; } },
  { id: 'combo-duplo', titulo: 'Combo Duplo', sub: 'Cinta de 30 barbatanas + gel ou sutiã, você escolhe', nota: () => { const dif = item('combo-duplo').preco - item('cinta-ziper-30').preco; return dif > 0 ? `Só ${brlLimpo(dif)} a mais que a cinta sozinha` : ''; } },
  { id: 'cinta', titulo: 'Só a cinta', sub: 'Com 30 ou 20 barbatanas' },
];

// Sempre um passo acima: cinta 20 → cinta 30 → combo duplo → combo de 5
const SOBE = {
  'cinta-ziper-20': ['cinta-ziper-30', 'Mesma cinta, com 10 barbatanas a mais', 'Mais firmeza'],
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
  pessoa: svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  cadeado: svg('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>'),
  caminhao: svg('<path d="M2.5 6.5h11v9.5h-11zM13.5 9.5h4l3 3.2V16h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
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
  const kit = item('combo-5');
  const avisos = [`${kit.sub || kit.nome} por ${brl(kit.preco)}`, pagaNoSite() ? `${pctPix()} off no Pix ou ${LOJA.parcelas}x sem juros` : 'Você só paga depois de falar com a Paola', `Frete grátis acima de ${brlLimpo(LOJA.freteGratis)}`];
  $('#topo').innerHTML = `
  <div class="aviso" aria-live="off"><span>${avisos[0]}</span></div>
  <header class="cab">
    <div class="wrap cab-in">
      <button class="ico-btn menu-btn" type="button" data-abrir="menu" aria-label="Abrir menu">${I.menu}</button>
      <a class="logo" href="index.html" aria-label="Paola Corpus Fit, página inicial"><b>Paola</b><small>Corpus Fit</small></a>
      <nav class="nav" aria-label="Menu principal">
        ${MENU.map(([nome, link, novo]) => `<a href="${link}" ${novo && pagina === 'praia' ? 'aria-current="page"' : ''}>${nome}${novo ? '<span class="novo">Em breve</span>' : ''}</a>`).join('')}
      </nav>
      <div class="cab-dir">
        <a class="zap-topo" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}WhatsApp</a>
        ${temConta() ? `<a class="ico-btn conta-btn" href="conta.html" aria-label="Minha conta">${I.pessoa}</a>` : ''}
        <button class="carrinho-btn" type="button" data-abrir="sacola" aria-label="Abrir o carrinho">${I.sacola}<span>Carrinho</span><span class="conta-sacola" hidden>0</span></button>
      </div>
    </div>
  </header>
  <div class="veu"></div>
  <aside class="gaveta esq" id="g-menu" aria-label="Menu">
    <div class="gaveta-topo"><h2>Menu</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="gaveta-corpo">
      <a class="btn btn-preto btn-bloco" href="index.html#comprar" data-fechar>Fazer meu pedido</a>
      <nav class="menu-links" style="margin-top:14px">${[...MENU.slice(1, 4), ...(temConta() ? [['Minha conta', 'conta.html']] : []), ['Acompanhar meu pedido', 'acompanhar.html']].map(([nome, link]) => `<a href="${link}" data-fechar>${nome}${I.seta}</a>`).join('')}</nav>
      <a class="menu-praia" href="moda-praia.html"><span>Em breve</span><b>Moda Praia</b><span>Ainda não está à venda. Seja avisada →</span></a>
      <div class="menu-contato">
        <a class="btn btn-claro" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}Falar com a Paola</a>
        <a class="btn btn-claro" href="${LOJA.instagram}" target="_blank" rel="noopener">${I.insta}${LOJA.arroba}</a>
      </div>
    </div>
  </aside>
  <aside class="gaveta dir" id="g-sacola" aria-label="Seu carrinho">
    <div class="gaveta-topo"><h2>Seu carrinho</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="gaveta-corpo"></div>
    <div class="gaveta-pe"></div>
  </aside>
  <div class="modal" id="modal" role="dialog" aria-modal="true"></div>
  <a class="zap-flutuante" href="${LOJA.whatsapp}" target="_blank" rel="noopener" aria-label="Tirar dúvidas no WhatsApp">${I.whats}<span>Dúvidas?</span></a>
  <div class="barra-carrinho" id="barra-carrinho"><button type="button" data-abrir="sacola" aria-label="Ver o carrinho"><span class="bc-info"><b data-b-n>0 itens</b><span data-b-t>R$ 0,00</span></span><span class="bc-ver">Ver carrinho ${I.seta}</span></button></div>
  <div class="toast" role="status" aria-live="polite"></div>`;

  let i = 0;
  setInterval(() => { i = (i + 1) % avisos.length; $('.aviso').innerHTML = `<span>${avisos[i]}</span>`; }, 4000);
  desenharSacola();
  marcarConta();
}

// O ícone da conta ganha um ponto verde quando a cliente está dentro
function marcarConta() {
  const b = $('.conta-btn');
  if (!b) return;
  const dentro = !!Catalogo.conta.atual();
  b.classList.toggle('logada', dentro);
  b.setAttribute('aria-label', dentro ? 'Minha conta' : 'Entrar ou criar conta');
}

function montarRodape() {
  $('#rodape').innerHTML = `
  <footer class="rodape">
    <div class="wrap">
      <div class="rodape-grade">
        <div>
          <span class="logo"><b>Paola</b><small>Corpus Fit</small></span>
          <p style="margin-top:14px;max-width:30ch">Cintas modeladoras e, em breve, moda praia. De ${esc(LOJA.cidade)} para todo o Brasil.</p>
        </div>
        <div><h4>Loja</h4><ul>${MENU.map(([nome, link]) => `<li><a href="${link}">${nome}</a></li>`).join('')}</ul></div>
        <div><h4>Ajuda</h4><ul>
          ${temConta() ? '<li><a href="conta.html">Minha conta</a></li>' : ''}
          <li><a href="acompanhar.html">Acompanhar meu pedido</a></li>
          <li><a href="index.html#comprar">Descobrir meu tamanho</a></li>
          <li><a href="index.html#duvidas">Dúvidas frequentes</a></li>
          <li><a href="${LOJA.whatsapp}" target="_blank" rel="noopener">Atendimento no WhatsApp</a></li>
          <li><a href="trocas.html">Trocas e devoluções</a></li>
          <li><a href="privacidade.html">Privacidade</a></li>
        </ul></div>
        <div><h4>Siga</h4><ul>
          <li><a href="${LOJA.instagram}" target="_blank" rel="noopener">Instagram ${LOJA.arroba}</a></li>
          <li><a href="${LOJA.antesDepois}" target="_blank" rel="noopener">Antes e depois de clientes</a></li>
        </ul>
          <h4 style="margin-top:22px">Pagamento</h4>
          <div class="pagamentos"><span>Pix</span><span>Crédito ${parcelasMax()}x</span>${pagaNoSite() ? '' : '<span>Boleto</span>'}</div>
        </div>
      </div>
      <div class="rodape-base">${LOJA.empresa && LOJA.documento && LOJA.enderecoLoja
        ? `© 2026 ${esc(LOJA.empresa)} · ${esc(documentoBonito(LOJA.documento))} ·${esc(LOJA.enderecoLoja)}${LOJA.email ? ` · ${esc(LOJA.email)}` : ''}${pagaNoSite() ? ' · Pagamentos pelo Mercado Pago' : ''}`
        : `© 2026 Paola Corpus Fit · ${esc(LOJA.cidade)}`}</div>
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
// O que fazer quando a tela aberta for fechada (no X, no fundo ou no Esc). A tela da conta usa para seguir a compra sem conta.
let aoFecharModal = null;
function fecharTudo() {
  $$('.gaveta.aberta, .modal.aberta').forEach((g) => g.classList.remove('aberta'));
  $('.veu')?.classList.remove('aberto');
  document.body.classList.remove('travado');
  const depois = aoFecharModal;
  aoFecharModal = null;
  depois?.();
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
// daConta: a mudança veio da conta (outro aparelho), então não precisa voltar para lá
function gravarSacola(s, { daConta = false } = {}) {
  sacolaMemoria = s;
  try { localStorage.setItem('pcf-sacola-2', JSON.stringify(s)); } catch (e) { /* ok */ }
  desenharSacola();
  if (!daConta) agendarSacolaNaConta();
}

// ---------------- Sacola salva na conta ----------------
// Com a conta aberta, a sacola vai para o banco e aparece em qualquer aparelho em que ela entrar. Vale a última mudança.
// pcf-sacola-sinc = { em: data da sacola da conta que este aparelho já tem, mudou: mudanças daqui ainda não enviadas }
const SINC_SACOLA = 'pcf-sacola-sinc';
let tempoSacolaConta;
const contaAberta = () => temConta() && !!Catalogo.conta.atual();
function agendarSacolaNaConta() {
  if (!contaAberta()) return;
  const sinc = lerJSON(SINC_SACOLA, {});
  gravarJSON(SINC_SACOLA, { ...sinc, mudou: (Number(sinc.mudou) || 0) + 1 });
  clearTimeout(tempoSacolaConta);
  tempoSacolaConta = setTimeout(enviarSacolaParaConta, 700);
}
async function enviarSacolaParaConta(saindo = false) {
  clearTimeout(tempoSacolaConta);
  const sinc = lerJSON(SINC_SACOLA, {});
  if (!sinc.mudou || !contaAberta()) return;
  try {
    const r = await Catalogo.conta.guardarSacola(lerSacola(), saindo);
    if (!r.ok) return;
    // Se ela mexeu de novo enquanto enviava, continua pendente: a próxima gravação leva
    const agora = lerJSON(SINC_SACOLA, {});
    gravarJSON(SINC_SACOLA, { em: r.em, mudou: agora.mudou === sinc.mudou ? 0 : agora.mudou });
  } catch (e) { /* sem internet: fica pendente e vai na próxima visita */ }
}
addEventListener('pagehide', () => enviarSacolaParaConta(true));

// Junta duas sacolas sem repetir linha; na mesma linha, fica a maior quantidade
function juntarSacolas(a, b) {
  const juntas = a.map((x) => ({ ...x }));
  b.forEach((x) => {
    const igual = juntas.find((y) => y.chave === x.chave);
    if (igual) igual.qtd = Math.max(Number(igual.qtd) || 1, Number(x.qtd) || 1);
    else juntas.push({ ...x });
  });
  return juntas;
}

// Ao abrir a página (e logo depois de entrar na conta): traz a sacola da conta para este aparelho
async function sincronizarSacola() {
  if (!contaAberta()) return;
  const r = await Catalogo.conta.lerSacola().catch(() => null);
  if (!r || !r.ok) return;
  const daConta = Array.isArray(r.sacola) ? r.sacola : [];
  const sinc = lerJSON(SINC_SACOLA, {});
  const mudouLa = r.em !== sinc.em;
  if (sinc.em && sinc.mudou && !mudouLa) {
    // Só este aparelho mexeu (e não conseguiu enviar): vale a daqui
    enviarSacolaParaConta();
  } else if (!sinc.em || sinc.mudou) {
    // Acabou de entrar neste aparelho, ou os dois lados mexeram: junta as duas e manda o resultado
    const juntas = juntarSacolas(daConta, lerSacola());
    gravarJSON(SINC_SACOLA, { em: r.em, mudou: 0 });
    gravarSacola(juntas, { daConta: JSON.stringify(juntas) === JSON.stringify(daConta) });
  } else if (mudouLa) {
    // Mudou em outro aparelho depois da última vez: vale a da conta
    gravarSacola(daConta, { daConta: true });
    gravarJSON(SINC_SACOLA, { em: r.em, mudou: 0 });
  }
}

// Entrou na conta neste aparelho: começa do zero a sincronia (a sacola daqui se junta à da conta)
function entrouNaConta() {
  try { localStorage.removeItem(SINC_SACOLA); } catch (e) { /* ok */ }
  marcarConta();
  return sincronizarSacola();
}
// Sair: a sacola fica guardada na conta e sai deste aparelho, para quem usar o aparelho depois não ver
async function sairDaConta() {
  await Promise.race([enviarSacolaParaConta(true), new Promise((ok) => { setTimeout(ok, 1500); })]);
  Catalogo.conta.sair();
  try { localStorage.removeItem(SINC_SACOLA); } catch (e) { /* ok */ }
  gravarSacola([], { daConta: true });
  marcarConta();
}
const chaveSacola = (id, op = {}) => [id, op.calca || '', op.extra || ''].join('|');
// "Comprar agora" leva ao carrinho para finalizar. Se o mesmo item (mesmo tamanho e escolha) já está lá, não soma outra unidade
function comprarAgora(id, op = {}) {
  if (lerSacola().some((x) => x.chave === chaveSacola(id, op))) return abrir('sacola');
  adicionar(id, op);
}
function adicionar(id, op = {}, qtd = 1, s = lerSacola(), opcoes = {}) {
  const chave = chaveSacola(id, op);
  const achado = s.find((x) => x.chave === chave);
  if (achado) achado.qtd = Math.min(9, achado.qtd + qtd);
  else s.push({ chave, id, calca: op.calca || null, extra: op.extra || null, qtd });
  gravarSacola(s);
  Catalogo.evento('sacola');
  // Adicionar ao carrinho fica na página com um aviso; "Comprar agora" e os kits abrem o carrinho para finalizar
  if (opcoes.abrir === false) return toast('Adicionado ao carrinho');
  abrir('sacola');
}
const subtotal = (s = lerSacola()) => s.reduce((t, x) => t + item(x.id).preco * x.qtd, 0);
const nomeLinha = (x) => `${item(x.id).nome}${x.extra ? ` + ${nomeCurto(item(x.extra))}` : ''}`;
const tamLinha = (x) => (x.calca ? `Tamanho ${tamanhoPorCalca(x.calca)?.t || ''} · calça ${x.calca}` : 'Tamanho único');
// O estoque pode acabar depois de a cliente colocar no pedido
const qtdLinha = (x) => disponivel(item(x.id), tamanhoPorCalca(x.calca)?.t, x.extra);
const linhaEsgotada = (x) => x.qtd > qtdLinha(x);
const avisoLinha = (x) => {
  const q = qtdLinha(x);
  if (q <= 0) return 'Acabou no estoque. Remova para continuar.';
  return x.qtd > q ? `Só tem ${q} em estoque. Diminua a quantidade.` : '';
};

// Barra do carrinho no pé da tela: aparece quando há algo no carrinho e leva até ele
function desenharBarra() {
  const barra = $('#barra-carrinho');
  if (!barra) return;
  const s = lerSacola();
  const n = s.reduce((t, x) => t + x.qtd, 0);
  barra.classList.toggle('visivel', n > 0);
  $('[data-b-n]', barra).textContent = `${n} ${n === 1 ? 'item' : 'itens'}`;
  $('[data-b-t]', barra).textContent = brl(subtotal(s));
  document.body.classList.toggle('com-carrinho', n > 0);
}

function desenharSacola() {
  const s = lerSacola();
  const n = s.reduce((t, x) => t + x.qtd, 0);
  const conta = $('.conta-sacola');
  conta.textContent = n;
  conta.hidden = !n;
  desenharBarra();
  const corpo = $('#g-sacola .gaveta-corpo');
  const pe = $('#g-sacola .gaveta-pe');

  if (!s.length) {
    const ultimo = lerPedidos()[0];
    corpo.innerHTML = `<div class="sacola-vazia">${I.sacola}<b>Seu carrinho está vazio</b><p style="color:var(--tinta-2)">Escolha o kit e o número da calça. Leva 1 minuto.</p><a class="btn btn-preto" href="index.html#comprar" data-fechar>Fazer meu pedido</a>
      ${ultimo ? `<div class="ultimo-pedido"><small>Seu último pedido</small><b>${ultimo.numero} · ${brl(ultimo.total)}</b>${ultimo.id && Catalogo.ligado ? `<a class="link-tam" href="${esc(linkAcompanhar(ultimo.id))}">Acompanhar este pedido</a>` : ''}<button class="link-tam" type="button" data-reenviar>Enviar de novo para a Paola</button></div>` : ''}</div>`;
    $('[data-reenviar]', corpo)?.addEventListener('click', () => enviarWhatsApp(textoPedido(ultimo), 'A Paola confere seu tamanho e te envia o link de pagamento', ultimo.numero, ultimo.id));
    pe.innerHTML = '';
    pe.hidden = true;
    return;
  }

  const sub = subtotal(s);
  const falta = Math.max(0, LOJA.freteGratis - sub);
  // Sugestão: subir um degrau (cinta 20 → 30 → combo duplo → combo de 5)
  const base = s.find((x) => SOBE[x.id] && item(SOBE[x.id][0]).preco > item(x.id).preco && !s.some((y) => y.id === SOBE[x.id][0]) && !calcaEsgotada(item(SOBE[x.id][0]), x.calca));
  const [paraId, chamada, rotulo] = base ? SOBE[base.id] : [];
  const para = paraId && item(paraId);
  const algumaEsgotada = s.some(linhaEsgotada);

  corpo.innerHTML = `
    <div class="frete">${falta > 0 ? `Faltam <b>${brl(falta)}</b> para o frete grátis` : '🎉 Você ganhou frete grátis'}<div class="trilho"><i style="width:${Math.min(100, (sub / LOJA.freteGratis) * 100)}%"></i></div></div>
    ${s.map((x) => {
      const it = item(x.id);
      return `<div class="item-sacola" data-chave="${x.chave}">
        <span class="mini">${midia(it)}</span>
        <div><h3>${nomeLinha(x)}</h3><div class="det">${tamLinha(x)}</div>
          ${linhaEsgotada(x) ? `<div class="det det-fora">${avisoLinha(x)}</div>` : ''}
          <div class="qtd"><button type="button" data-q="-1" aria-label="Diminuir">−</button><span>${x.qtd}</span><button type="button" data-q="1" aria-label="Aumentar">+</button></div>
          <button class="remover" type="button">Remover</button></div>
        <span class="valor">${brl(it.preco * x.qtd)}</span>
      </div>`;
    }).join('')}
    ${para ? `<div class="sugestao"><span class="mini">${midia(para)}</span><div><small>${rotulo || 'Vale a pena'}</small><b>${chamada}</b><span style="font-size:13px">por + ${brl(para.preco - item(base.id).preco)}</span></div><button type="button" data-trocar="${base.chave}" aria-label="Trocar por ${para.nome}">Trocar</button></div>` : ''}`;

  // Frete pelo CEP guardado neste aparelho. Sem CEP ainda, o total fica só com os produtos e a caixa pede o CEP
  const cepFrete = lerCepFrete();
  const fr = freteLigado() && cepFrete.cep && !cepFrete.invalido ? freteDe(cepFrete.cep, sub) : null;
  const frete = fr && !fr.erro ? fr.valor : 0;
  const total = somaCentavos(sub, frete);
  const linhaFrete = !freteLigado() ? ''
    : fr && !fr.erro && !trocandoCep
      ? `<div class="frete-linha"><span>Frete<small>${esc(lugarCep(cepFrete))} · <button class="link-tam" type="button" data-trocar-cep>trocar CEP</button></small><small>${textoPrazo(fr.dias)}</small></span><b>${fr.gratis ? '<span class="fc-gratis">Grátis</span>' : brl(fr.valor)}</b></div>`
      : freteCaixaHTML('fc-sacola', cepFrete.cep);
  pe.hidden = false;
  pe.innerHTML = `
    ${linhaFrete}
    <div class="total-linha"><span>Total</span><span>${brl(total)}</span></div>
    <div class="total-pix">ou ${brl(pix(total))} no Pix · ${LOJA.parcelas}x de ${brl(parcela(total))}</div>
    <button class="btn btn-preto btn-bloco" type="button" data-finalizar ${algumaEsgotada ? 'disabled' : ''}>${pagaNoSite() ? 'Finalizar compra' : `${I.whats}Enviar pedido pelo WhatsApp`}</button>
    <button class="link-tam pe-continuar" type="button" data-fechar>Continuar escolhendo</button>
    <p class="pe-nota">${algumaEsgotada ? 'Ajuste o item marcado para enviar o pedido.' : pagaNoSite() ? 'Pague no Pix ou no cartão aqui no site. A Paola confere seu tamanho antes de enviar.' : 'A Paola confirma seu tamanho e o pagamento com você na conversa.'}</p>`;

  $$('.item-sacola', corpo).forEach((linha) => {
    const chave = linha.dataset.chave;
    $$('.qtd button', linha).forEach((b) => b.addEventListener('click', () => {
      const s2 = lerSacola();
      const x = s2.find((y) => y.chave === chave);
      const limite = Math.min(9, Math.max(1, qtdLinha(x)));
      const quer = x.qtd + Number(b.dataset.q);
      if (quer > limite && limite < 9) toast(`Só tem ${limite} em estoque`);
      x.qtd = Math.max(1, Math.min(limite, quer));
      gravarSacola(s2);
    }));
    $('.remover', linha).addEventListener('click', () => gravarSacola(lerSacola().filter((y) => y.chave !== chave)));
  });

  const caixaFrete = $('[data-frete-form]', pe);
  if (caixaFrete) {
    $('[data-frete-res]', caixaFrete).innerHTML = freteResultadoHTML(cepFrete, sub);
    ligarFreteCaixa(caixaFrete, () => { trocandoCep = false; desenharSacola(); });
  }
  $('[data-trocar-cep]', pe)?.addEventListener('click', () => {
    trocandoCep = true;
    desenharSacola();
    $('#fc-sacola')?.select();
  });
}
let trocandoCep = false;

// Troca a linha do pedido pelo degrau de cima, mantendo a calça
function trocar(chave) {
  const x = lerSacola().find((y) => y.chave === chave);
  if (x) abrirOpcoes(SOBE[x.id][0], { calca: x.calca, qtd: x.qtd, trocar: chave });
}

// ---------------- Registro do pedido ----------------
// Provisório até ter pagamento no site: o pedido ganha número, fica salvo neste aparelho, vai para o
// painel (quando o banco está conectado) e segue organizado para a Paola no WhatsApp; ela responde com o link de pagamento.
const lerJSON = (chave, padrao) => { try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch (e) { return padrao; } };
const gravarJSON = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* ok */ } };
const lerPedidos = () => lerJSON('pcf-pedidos', []);

function registrarPedido(s, dados) {
  const agora = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  const numero = `PCF-${dois(agora.getDate())}${dois(agora.getMonth() + 1)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
  // Nome, tamanho e preço ficam guardados como estavam: o pedido não muda se o produto mudar depois
  const itens = s.map((x) => ({ ...x, nome: nomeLinha(x), tam: tamanhoPorCalca(x.calca)?.t || null, preco: item(x.id).preco }));
  // O frete vai somado no total. O banco refaz a conta pela tabela dele e, se não bater, o pedido fica para conferir
  const produtos = subtotal(s);
  const fr = freteDe(dados.cep, produtos);
  const frete = fr && !fr.erro ? fr.valor : 0;
  const pedido = { ...dados, id, numero, data: agora.toISOString(), itens, frete, total: somaCentavos(produtos, frete) };
  gravarJSON('pcf-pedidos', [pedido, ...lerPedidos()].slice(0, 10));
  Catalogo.enviarPedido(pedido);
  return pedido;
}

// Mensagem no formato que a Paola lê de uma vez (negrito do WhatsApp com *)
function textoPedido(p) {
  const itens = p.itens.map((x) => `• ${x.qtd}x ${x.nome || nomeLinha(x)}${x.calca ? `\n   Tamanho ${x.tam || tamanhoPorCalca(x.calca)?.t} (veste calça ${x.calca})` : ''}`).join('\n');
  const frete = typeof p.frete === 'number' && (p.frete > 0 || freteLigado()) ? `\n*Frete:* ${p.frete > 0 ? brl(p.frete) : 'grátis'}` : '';
  return `*Pedido ${p.numero}*\nOi, Paola! Quero finalizar este pedido:\n\n${itens}\n${frete}\n*Total:* ${brl(p.total)} (${brl(pix(p.total))} no Pix)\n\n*Meus dados*\nNome: ${p.nome}\nPagamento: ${p.pagamento}\n\n*Entrega*\n${p.rua ? `${p.rua}, ${p.num}${p.complemento ? ` - ${p.complemento}` : ''}\n${p.bairro} - ${p.cidade}/${p.uf}\n` : ''}CEP: ${p.cep}\n\nPode me mandar o link de pagamento? Se precisar, te mando uma foto de frente para confirmar o tamanho.${Catalogo.ligado && p.id ? `\n\nAcompanhar meu pedido: ${linkAcompanhar(p.id)}` : ''}`;
}

// Antes do WhatsApp: explica por que a compra fecha com uma pessoa e pede só o essencial
function finalizar() {
  const s = lerSacola();
  if (!s.length || s.some(linhaEsgotada)) return;
  Catalogo.evento('checkout');
  const cliente = lerJSON('pcf-cliente', {});
  let pagamento = cliente.pagamento || 'Pix';
  const noSite = pagaNoSite();
  const m = abrirModal(`${noSite ? `
    <div class="modal-topo"><h2>Falta só o pagamento</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="aviso-real">
      <span class="aviso-ico">${I.chat}</span>
      <p><b>Você paga aqui mesmo, no Pix ou no cartão.</b> O pagamento é protegido pelo Mercado Pago e a Paola recebe seu pedido na hora.</p>
    </div>
    <ul class="espera-lista aviso-lista">
      <li>Pix com ${pctPix()} de desconto ou ${textoCartao()}</li>
      <li>A Paola confere seu tamanho antes de enviar e, se precisar, te chama no WhatsApp</li>
      <li>Você acompanha cada etapa pelo link do pedido</li>
    </ul>` : `
    <div class="modal-topo"><h2>Você vai finalizar com a Paola</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="aviso-real">
      <span class="aviso-ico">${I.chat}</span>
      <p><b>Cinta só modela no tamanho certo.</b> Por isso, quem fecha o seu pedido é a própria Paola, pelo WhatsApp: uma pessoa de verdade, não um robô.</p>
    </div>
    <ul class="espera-lista aviso-lista">
      <li>Ela confere seu tamanho antes de enviar e, se precisar, pede uma foto de frente</li>
      <li>Você recebe dela o link de pagamento: Pix com ${pctPix()} de desconto ou ${textoCartao()}</li>
      <li>Nada é cobrado agora</li>
    </ul>`}
    <form class="checkout" id="form-checkout" novalidate>
      <div class="campo"><label for="ck-nome">Seu nome</label><input id="ck-nome" name="nome" autocomplete="name" required></div>
      <div class="campo"><label for="ck-tel">Seu WhatsApp</label><input id="ck-tel" name="telefone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(21) 99999-9999" maxlength="15" required><small class="ck-status">A Paola usa para te avisar quando o pedido for enviado.</small></div>
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
        <div class="tamanhos" role="radiogroup" aria-label="Forma de pagamento">${['Pix', 'Cartão'].map((f) => `<button class="chip" type="button" role="radio" data-pag="${f}" aria-checked="${f === pagamento}">${f === 'Pix' ? `Pix (${pctPix()} off)` : `Cartão em até ${parcelasMax()}x`}</button>`).join('')}</div>
      </div>
      <div class="ck-frete" data-ck-frete hidden></div>
      <div class="ck-total"><span>Total do pedido</span><b data-ck-total>${brl(subtotal(s))}</b></div>
      ${Catalogo.conta.atual() ? `<p class="dica-tam conta-nota">${I.pessoa}<span>Este pedido fica guardado na sua conta${Catalogo.conta.atual().email ? ` (${esc(Catalogo.conta.atual().email)})` : ''}.</span></p>` : ''}
      <p class="dica-tam erro" data-erro hidden></p>
      <button class="btn btn-preto btn-bloco btn-pedir" type="submit">${noSite ? 'Ir para o pagamento' : `${I.whats}Continuar no WhatsApp`}</button>
      <p class="pe-nota ck-politicas">Você pode desistir em até 7 dias do recebimento. Veja <a href="trocas.html" target="_blank" rel="noopener">Trocas e devoluções</a> e <a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a>.</p>
    </form>`);
  const form = $('#form-checkout', m);
  const CAMPOS = ['nome', 'telefone', 'cep', 'rua', 'num', 'complemento', 'bairro', 'cidade', 'uf'];
  CAMPOS.forEach((c) => { form[c].value = cliente[c] || ''; });
  // Frete e total pelo CEP de entrega digitado aqui (é o mesmo que vai para o pedido)
  const produtos = subtotal(s);
  const atualizarTotal = () => {
    const fr = freteDe(form.cep.value, produtos);
    const caixa = $('[data-ck-frete]', m);
    caixa.hidden = !fr;
    if (fr) {
      caixa.innerHTML = fr.erro
        ? '<span>Frete</span><small>Digite o CEP para calcular</small>'
        : `<span>Frete<small>${textoPrazo(fr.dias)}</small></span><b>${fr.gratis ? '<span class="fc-gratis">Grátis</span>' : brl(fr.valor)}</b>`;
    }
    $('[data-ck-total]', m).textContent = brl(somaCentavos(produtos, fr && !fr.erro ? fr.valor : 0));
  };
  form.cep.addEventListener('input', atualizarTotal);
  form.telefone.addEventListener('input', () => { form.telefone.value = mascaraTelefone(form.telefone.value); });
  // Rascunho: o que ela digita fica guardado neste aparelho, mesmo se fechar a tela antes de terminar
  const guardarRascunho = () => gravarJSON('pcf-cliente', { ...lerJSON('pcf-cliente', {}), ...Object.fromEntries(CAMPOS.map((c) => [c, form[c].value.trim()])), pagamento });
  form.addEventListener('input', guardarRascunho);
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
      // O carrinho passa a mostrar o frete deste CEP
      gravarJSON(CEP_FRETE, { cep: d, uf: Frete.uf(d) || r.uf || '', cidade: r.localidade || '' });
      if (freteLigado()) avisarFrete();
      (r.logradouro ? form.num : form.rua).focus();
    } catch (e) {
      status.textContent = 'Não achamos esse CEP. Preencha o endereço abaixo.';
    }
  });
  // Sem endereço guardado, vale o CEP que ela já calculou no produto ou no carrinho: o endereço se preenche sozinho
  const cepCalculado = lerCepFrete();
  if (!form.cep.value && cepCalculado.cep && !cepCalculado.invalido) {
    form.cep.value = cepCalculado.cep;
    form.cep.dispatchEvent(new Event('input', { bubbles: true }));
  }
  atualizarTotal();
  $$('[data-pag]', m).forEach((b) => b.addEventListener('click', () => {
    pagamento = b.dataset.pag;
    $$('[data-pag]', m).forEach((c) => c.setAttribute('aria-checked', c === b));
  }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(CAMPOS.map((c) => [c, form[c].value.trim()]));
    d.uf = d.uf.toUpperCase();
    const erro = $('[data-erro]', m);
    const falta = (!d.nome && ['nome', 'Escreva seu nome.'])
      || (d.telefone.replace(/\D/g, '').length < 10 && ['telefone', 'Escreva seu WhatsApp com DDD.'])
      || (d.cep.replace(/\D/g, '').length !== 8 && ['cep', 'Digite os 8 números do CEP.'])
      || (!d.rua && ['rua', 'Escreva a rua.'])
      || (!d.num && ['num', 'Escreva o número da casa ou prédio.'])
      || (!d.bairro && ['bairro', 'Escreva o bairro.'])
      || ((!d.cidade || d.uf.length !== 2) && ['cidade', 'Escreva a cidade e a UF (ex.: RJ).'])
      || (freteDe(d.cep, produtos)?.erro && ['cep', 'Confira o CEP: com ele calculamos o frete.']);
    if (falta) { erro.hidden = false; erro.textContent = falta[1]; form[falta[0]].focus(); return; }
    gravarJSON('pcf-cliente', { ...d, pagamento });
    // O pedido só é registrado aqui, uma vez: depois da conta (criada, aberta ou pulada)
    let fechando = false;
    const fechar = async (botao) => {
      if (fechando) return;
      fechando = true;
      const pedido = registrarPedido(s, { ...d, pagamento });
      // Sai da sacola só o que foi comprado: o que estava guardado na conta e não entrou neste pedido continua lá
      gravarSacola(lerSacola().filter((x) => !s.some((y) => y.chave === x.chave)));
      if (noSite) {
        if (botao) { botao.disabled = true; botao.textContent = 'Abrindo o pagamento…'; }
        else toast('Abrindo o pagamento…');
        try {
          const destino = await Catalogo.pagar(pedido);
          // O pedido já está no banco: entra na conta antes de trocar de página, sem segurar a cliente se demorar
          await Promise.race([ligarPedidosDaConta(), new Promise((ok) => { setTimeout(ok, 2500); })]);
          location.href = destino;
          return;
        } catch (ex) {
          // A venda nunca se perde: sem o link, o pedido segue pelo WhatsApp e a Paola manda o pagamento
          toast('Não deu para abrir o pagamento agora. Seu pedido foi registrado.');
        }
      }
      enviarWhatsApp(textoPedido(pedido), 'A Paola confere seu tamanho e te envia o link de pagamento', pedido.numero, pedido.id);
      setTimeout(ligarPedidosDaConta, 3000);
    };
    if (temConta() && !Catalogo.conta.atual()) pedirConta(d, noSite, fechar);
    else fechar($('.btn-pedir', form));
  });
}

// ---------------- Conta da cliente ----------------
// E-mail e senha, sem confirmação por e-mail. Serve para ela ver os pedidos em qualquer celular ou computador.
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ERROS_CONTA = {
  email: 'Confira o e-mail. Exemplo: maria@gmail.com',
  senha: 'A senha precisa ter pelo menos 6 letras ou números.',
  existe: 'Esse e-mail já tem conta. Entre com a sua senha.',
  invalido: 'E-mail ou senha não conferem.',
  cheio: 'Não deu para criar a conta agora. Tente de novo daqui a pouco.',
  codigo: 'Este link de senha nova venceu ou já foi usado. Peça outro para a Paola.',
};
const zapSenha = (email) => (LOJA.whatsappNumero
  ? `https://wa.me/${LOJA.whatsappNumero}?text=${encodeURIComponent(`Oi, Paola! Esqueci a senha da minha conta no site.${email ? ` Meu e-mail é ${email}` : ''}`)}`
  : LOJA.whatsapp);
const campoSenhaHTML = (id, rotulo, nova) => `<div class="campo"><label for="${id}">${rotulo}</label>
    <div class="conta-senha"><input id="${id}" name="senha" type="password" autocomplete="${nova ? 'new-password' : 'current-password'}" maxlength="72" required><button class="link-tam" type="button" data-ver-senha>Mostrar</button></div>
    ${nova ? '<small class="ck-status">Pelo menos 6 letras ou números. Anote para não esquecer.</small>' : ''}</div>`;
function ligarVerSenha(form) {
  $('[data-ver-senha]', form).addEventListener('click', (e) => {
    const ver = form.senha.type === 'password';
    form.senha.type = ver ? 'text' : 'password';
    e.currentTarget.textContent = ver ? 'Esconder' : 'Mostrar';
  });
}

// Desenha "criar conta" ou "entrar" dentro de `caixa` e troca de um para o outro.
// op: { modo, email, nome, telefone, topo(modo), acaoCriar, acaoEntrar, pular, aoEntrar(botao), aoPular(botao) }
function montarConta(caixa, op) {
  let modo = op.modo || 'criar';
  let emailDigitado = op.email || '';
  const desenhar = (aviso = '') => {
    const criar = modo === 'criar';
    caixa.innerHTML = `${op.topo ? op.topo(modo) : ''}
    <form class="checkout conta-form" id="form-conta" novalidate>
      <div class="campo"><label for="ct-email">Seu e-mail</label><input id="ct-email" name="email" type="email" inputmode="email" autocomplete="${criar ? 'email' : 'username'}" autocapitalize="none" spellcheck="false" placeholder="maria@gmail.com" maxlength="120" required></div>
      ${campoSenhaHTML('ct-senha', criar ? 'Crie uma senha' : 'Sua senha', criar)}
      <p class="dica-tam erro" data-erro hidden></p>
      <button class="btn btn-preto btn-bloco" type="submit">${esc(criar ? op.acaoCriar : op.acaoEntrar)}</button>
      ${op.pular ? `<button class="btn btn-claro btn-bloco" type="button" data-pular>${esc(op.pular)}</button>` : ''}
      <div class="conta-links">
        <button class="link-tam" type="button" data-modo="${criar ? 'entrar' : 'criar'}">${criar ? 'Já tenho conta: entrar' : 'Ainda não tenho conta: criar'}</button>
        ${criar ? '' : '<button class="link-tam" type="button" data-esqueci>Esqueci minha senha</button>'}
      </div>
    </form>`;
    const form = $('#form-conta', caixa);
    const erro = $('[data-erro]', form);
    const mostrarErro = (t) => { erro.hidden = false; erro.textContent = t; };
    form.email.value = emailDigitado;
    if (aviso) mostrarErro(aviso);
    ligarVerSenha(form);
    $('[data-modo]', form).addEventListener('click', (e) => {
      emailDigitado = form.email.value.trim();
      modo = e.currentTarget.dataset.modo;
      desenhar();
    });
    $('[data-esqueci]', form)?.addEventListener('click', () => window.open(zapSenha(form.email.value.trim()), '_blank', 'noopener'));
    $('[data-pular]', form)?.addEventListener('click', (e) => op.aoPular(e.currentTarget));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const senha = form.senha.value;
      if (!EMAIL_OK.test(email)) { mostrarErro(ERROS_CONTA.email); form.email.focus(); return; }
      if (criar ? senha.length < 6 : !senha) { mostrarErro(criar ? ERROS_CONTA.senha : 'Digite a sua senha.'); form.senha.focus(); return; }
      const botao = $('button[type=submit]', form);
      const texto = botao.textContent;
      botao.disabled = true;
      botao.textContent = criar ? 'Criando sua conta…' : 'Entrando…';
      try {
        const r = criar ? await Catalogo.conta.criar(email, senha, op.nome, op.telefone) : await Catalogo.conta.entrar(email, senha);
        if (r.ok) {
          // A sacola da conta chega antes de seguir, sem segurar a cliente se a internet demorar
          await Promise.race([entrouNaConta(), new Promise((ok) => { setTimeout(ok, 2500); })]);
          return op.aoEntrar(botao);
        }
        if (r.erro === 'existe') { emailDigitado = email; modo = 'entrar'; return desenhar(ERROS_CONTA.existe); }
        mostrarErro(r.erro === 'bloqueada'
          ? `Muitas tentativas. Tente de novo em ${Number(r.minutos) || 15} min ou fale com a Paola.`
          : (ERROS_CONTA[r.erro] || ERROS_CONTA.cheio));
      } catch (ex) {
        mostrarErro(op.pular
          ? 'Não deu para falar com a conta agora. Você pode continuar sem conta e criar depois.'
          : 'Não deu para falar com a conta agora. Confira a internet e tente de novo.');
      }
      botao.disabled = false;
      botao.textContent = texto;
    });
  };
  desenhar();
}

// Ao finalizar: depois dos dados de entrega e antes do pagamento, a cliente cria a conta (ou entra).
// Dá para seguir sem conta: a venda vem antes do cadastro.
function pedirConta(dados, noSite, seguir) {
  const m = abrirModal('<div data-conta></div>');
  // Fechar esta tela é o mesmo que "Agora não": a compra segue sem conta, uma vez só
  const seguirUmaVez = (botao) => { aoFecharModal = null; seguir(botao); };
  aoFecharModal = () => seguir();
  montarConta($('[data-conta]', m), {
    modo: 'criar',
    nome: dados.nome,
    telefone: dados.telefone,
    acaoCriar: noSite ? 'Criar conta e ir para o pagamento' : 'Criar conta e continuar',
    acaoEntrar: noSite ? 'Entrar e ir para o pagamento' : 'Entrar e continuar',
    pular: noSite ? 'Agora não, ir para o pagamento' : 'Agora não, continuar',
    topo: (modo) => `
    <div class="modal-topo"><h2>${modo === 'criar' ? 'Crie sua conta' : 'Entre na sua conta'}</h2><button class="ico-btn" type="button" data-fechar aria-label="Fechar">${I.fechar}</button></div>
    <div class="aviso-real">
      <span class="aviso-ico">${I.pessoa}</span>
      <p>${modo === 'criar'
    ? '<b>Sua compra fica guardada na sua conta.</b> Com e-mail e senha você entra em qualquer celular ou computador e vê o seu pedido.'
    : '<b>Entre para guardar esta compra na sua conta.</b> Ela aparece junto com os seus outros pedidos.'}</p>
    </div>
    ${modo === 'criar' ? `<ul class="espera-lista aviso-lista">
      <li>Acompanhe cada etapa: pagamento, envio e rastreio</li>
      <li>Veja suas compras e seu carrinho em qualquer aparelho</li>
      <li>É rápido: não precisa confirmar o e-mail</li>
    </ul>` : ''}`,
    aoEntrar: seguirUmaVez,
    aoPular: seguirUmaVez,
  });
}

// Liga à conta os pedidos feitos neste aparelho. Roda ao entrar e a cada visita, até o banco confirmar.
async function ligarPedidosDaConta() {
  if (!Catalogo.conta.atual()) return;
  const prontos = new Set();
  for (const p of lerPedidos()) {
    if (!p.id || p.conta) continue;
    const r = await Catalogo.conta.vincular({ p_id: p.id }).catch(() => null);
    if (!r || r.erro === 'sessao') break; // sem internet ou fora da conta: tenta na próxima visita
    // "Não achou" é pedido que ainda não chegou ao banco: tenta por 1 dia e depois desiste
    if (r.ok || r.erro === 'outra_conta' || Date.now() - new Date(p.data).getTime() > 864e5) prontos.add(p.id);
  }
  if (prontos.size) gravarJSON('pcf-pedidos', lerPedidos().map((p) => (prontos.has(p.id) ? { ...p, conta: true } : p)));
}

const ROTULO_ETAPA = { pago: 'Pagamento confirmado', preparando: 'Preparando', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
// Uma linha da lista de pedidos (Minha conta e busca por WhatsApp + CEP): leva ao acompanhamento do pedido
function linhaPedidoHTML(p) {
  const itens = (p.itens || []).map((x) => `${x.qtd || 1}x ${x.nome}`).join(', ');
  const rotulo = ROTULO_ETAPA[p.status] || (pagaNoSite() || p.link_pagamento ? 'Aguardando pagamento' : 'Pedido recebido');
  return `<a href="${esc(linkAcompanhar(p.id))}"><span><b>${esc(p.numero)}</b><small>${esc(new Date(p.criado_em).toLocaleDateString('pt-BR'))} · ${brl(Number(p.pago && p.valor != null ? p.valor : p.total))}</small><small>${esc(itens)}</small></span><em class="conta-etapa etapa-${esc(p.status)}">${rotulo}</em>${I.seta}</a>`;
}

function telaConta() {
  const caixa = $('#conta');
  if (!temConta()) {
    caixa.innerHTML = `<h1 class="titulo">Minha conta</h1><p class="acomp-cancelado">Para saber do seu pedido, fale com a Paola no WhatsApp.</p><a class="btn btn-preto btn-bloco" href="${esc(LOJA.whatsapp)}" target="_blank" rel="noopener">${I.whats}Falar com a Paola</a>`;
    return;
  }
  const busca = new URLSearchParams(location.search);
  const codigo = busca.get('nova');
  const pedidoDoLink = /^[0-9a-f-]{36}$/i.test(busca.get('pedido') || '') ? busca.get('pedido') : null;
  // O código de senha nova não fica no endereço nem no histórico do navegador
  if (codigo) history.replaceState(null, '', 'conta.html');

  async function mostrarPedidos() {
    caixa.innerHTML = '<p class="acomp-carregando">Buscando seus pedidos…</p>';
    let r;
    try {
      if (pedidoDoLink) await Catalogo.conta.vincular({ p_id: pedidoDoLink });
      await ligarPedidosDaConta();
      r = await Catalogo.conta.pedidos();
    } catch (ex) {
      caixa.innerHTML = '<h1 class="titulo">Minha conta</h1><p class="acomp-cancelado">Não conseguimos buscar seus pedidos agora. Confira a internet.</p><button class="btn btn-preto btn-bloco" type="button" data-de-novo>Tentar de novo</button>';
      $('[data-de-novo]', caixa).addEventListener('click', mostrarPedidos);
      return;
    }
    marcarConta();
    if (!r.ok) return mostrarEntrada('Sua conta foi fechada neste aparelho. Entre de novo.');
    if (pedidoDoLink) history.replaceState(null, '', 'conta.html');
    const nome = (r.cliente?.nome || '').split(' ')[0];
    caixa.innerHTML = `<span class="sobre">Minha conta</span>
      <h1 class="titulo">${nome ? `Oi, ${esc(nome)}!` : 'Seus pedidos'}</h1>
      <section class="acomp-meus conta-pedidos"><h2>${nome ? 'Seus pedidos' : 'Tudo o que você comprou'}</h2>
        ${r.pedidos.length ? r.pedidos.map(linhaPedidoHTML).join('') : '<p class="conta-vazio">Você ainda não tem pedidos nesta conta. Quando comprar, o pedido aparece aqui.</p>'}
      </section>
      ${r.pedidos.length ? '' : '<a class="btn btn-preto btn-bloco" href="index.html#comprar">Fazer meu pedido</a>'}
      <details class="conta-achar" ${r.pedidos.length ? '' : 'open'}><summary>Comprou e o pedido não aparece aqui?</summary>
        <form class="acomp-form" id="form-achar" novalidate>
          <p>Digite o WhatsApp e o CEP de entrega que você usou na compra. Os pedidos com esses dados entram na sua conta.</p>
          ${contatoHTML('ach')}
          <p class="dica-tam erro" data-erro hidden></p>
          <button class="btn btn-claro btn-bloco" type="submit">Guardar na minha conta</button>
        </form>
      </details>
      <p class="conta-pe">Conta: <b>${esc(r.cliente?.email || '')}</b></p>
      <button class="link-tam envio-copiar" type="button" data-sair>Sair da conta neste aparelho</button>`;
    $('[data-sair]', caixa).addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      await sairDaConta();
      mostrarEntrada();
    });
    const form = $('#form-achar', caixa);
    const erro = $('[data-erro]', form);
    const lerContato = ligarContato(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.hidden = false;
      const c = lerContato();
      if (c.erro) { erro.textContent = c.erro; return; }
      const botao = $('button[type=submit]', form);
      botao.disabled = true;
      try {
        const v = await Catalogo.conta.vincular({ p_telefone: c.telefone, p_cep: c.cep });
        if (v.ok) {
          const n = Number(v.n) || 1;
          toast(n > 1 ? `${n} pedidos estão na sua conta` : 'Pedido guardado na sua conta');
          return mostrarPedidos();
        }
        if (v.erro === 'sessao') return mostrarEntrada('Sua conta foi fechada neste aparelho. Entre de novo.');
        erro.textContent = v.erro === 'outra_conta'
          ? 'Os pedidos com esse WhatsApp e CEP já estão guardados em outra conta. Fale com a Paola.'
          : 'Não encontramos pedido com esse WhatsApp e CEP. Confira os dois ou fale com a Paola.';
      } catch (ex) {
        erro.textContent = 'Não conseguimos buscar agora. Confira a internet e tente de novo.';
      }
      botao.disabled = false;
    });
  }

  function mostrarEntrada(aviso = '') {
    caixa.innerHTML = `<span class="sobre">Paola Corpus Fit</span>
      <h1 class="titulo">Minha conta</h1>
      ${aviso ? `<p class="acomp-esperando">${esc(aviso)}</p>` : ''}
      <div class="acomp-form" data-conta></div>
      <a class="link-tam envio-copiar" href="acompanhar.html">Acompanhar um pedido sem entrar</a>`;
    montarConta($('[data-conta]', caixa), {
      modo: 'entrar',
      acaoCriar: 'Criar minha conta',
      acaoEntrar: 'Entrar',
      topo: (modo) => `<p>${modo === 'criar'
        ? 'Crie sua conta com e-mail e senha para ver seus pedidos e guardar sua sacola em qualquer celular ou computador. Não precisa confirmar o e-mail.'
        : 'Entre com o e-mail e a senha da sua conta para ver seus pedidos e a sua sacola.'}</p>`,
      aoEntrar: mostrarPedidos,
    });
  }

  function mostrarNovaSenha() {
    caixa.innerHTML = `<span class="sobre">Minha conta</span>
      <h1 class="titulo">Crie uma senha nova</h1>
      <form class="acomp-form" id="form-nova" novalidate>
        <p>Escolha a senha que você vai usar para entrar na sua conta daqui em diante.</p>
        ${campoSenhaHTML('ns-senha', 'Senha nova', true)}
        <p class="dica-tam erro" data-erro hidden></p>
        <button class="btn btn-preto btn-bloco" type="submit">Salvar a senha e entrar</button>
      </form>`;
    const form = $('#form-nova', caixa);
    const erro = $('[data-erro]', form);
    ligarVerSenha(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.hidden = false;
      if (form.senha.value.length < 6) { erro.textContent = ERROS_CONTA.senha; form.senha.focus(); return; }
      const botao = $('button[type=submit]', form);
      botao.disabled = true;
      try {
        const r = await Catalogo.conta.novaSenha(codigo, form.senha.value);
        if (r.ok) {
          toast('Senha trocada');
          await Promise.race([entrouNaConta(), new Promise((ok) => { setTimeout(ok, 2500); })]);
          return mostrarPedidos();
        }
        erro.textContent = ERROS_CONTA[r.erro] || ERROS_CONTA.codigo;
      } catch (ex) {
        erro.textContent = 'Não deu para trocar a senha agora. Confira a internet e tente de novo.';
      }
      botao.disabled = false;
    });
  }

  if (codigo) return mostrarNovaSenha();
  if (Catalogo.conta.atual()) return mostrarPedidos();
  mostrarEntrada();
}

function enviarWhatsApp(texto, depois, numero, idPedido) {
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
    <button class="link-tam envio-copiar" type="button" data-copiar>Copiar a mensagem de novo</button>
    ${idPedido && Catalogo.ligado ? `<a class="link-tam envio-copiar" href="${esc(linkAcompanhar(idPedido))}">Acompanhar meu pedido</a>` : ''}`);
  $('.envio-texto', m).textContent = texto;
  navigator.clipboard?.writeText(texto).then(() => {
    $('[data-copia]', m).textContent = 'Cole a mensagem na conversa e envie. Ela já está copiada.';
  }).catch(() => { /* sem permissão: o texto continua na tela para copiar */ });
  $('[data-copiar]', m).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(texto); toast('Mensagem copiada'); } catch (e) { toast('Selecione o texto e copie'); }
  });
}

// ---------------- Tamanho pelo número da calça ----------------
// Quando o tamanho acabou, mostra onde ainda tem e deixa a conversa com a Paola a um toque
function avisoEsgotado(it, n) {
  const { t } = tamanhoPorCalca(n);
  const outra = cintasAVenda().find((x) => !pecasComTamanho(it).includes(x) && !tamanhoEsgotado(x, t));
  return `<b>O tamanho ${t} acabou nesta opção.</b> ${outra ? `Ainda tem na <a href="produto.html?id=${outra.id}&calca=${n}">cinta de ${outra.barbatanas} barbatanas</a>. ` : ''}<a href="${LOJA.whatsapp}" target="_blank" rel="noopener">Falar com a Paola</a>`;
}
// it: o produto em questão, para riscar os tamanhos que acabaram. Sem ele (tabela de medidas), mostra todos
function calcaHTML(sel = lerCalca(), it = null) {
  const fora = calcaEsgotada(it, sel);
  const linha = !fora && sel && tamanhoPorCalca(sel);
  return `<div class="calca-ui">
    <div class="tamanhos calcas" role="radiogroup" aria-label="Número da calça ou short">${NUMEROS.map((n) => {
      const sem = calcaEsgotada(it, n);
      return `<button class="chip${sem ? ' esgotado' : ''}" type="button" role="radio" data-calca="${n}" aria-checked="${!sem && n === Number(sel)}"${sem ? ` aria-disabled="true" aria-label="${n}, esgotado"` : ''}>${n}</button>`;
    }).join('')}</div>
    <div class="tam-res"${linha ? '' : ' hidden'}><span class="letra">${linha ? linha.t : ''}</span><div><b>Seu tamanho é <span data-letra>${linha ? linha.t : ''}</span></b><small>Para quem veste calça <span data-faixa>${linha ? faixaCalca(linha) : ''}</span></small><small class="tam-estoque" data-estoque>${linha ? textoEstoque(it, linha.t) : ''}</small></div></div>
    <p class="tam-fora" role="status"${fora ? '' : ' hidden'}>${fora ? avisoEsgotado(it, sel) : ''}</p>
    <p class="dica-tam">Veste menos de 36 ou mais de 52? <a href="${LOJA.whatsapp}" target="_blank" rel="noopener">Fale com a Paola</a></p>
  </div>`;
}
function ligarCalca(raiz, aoMudar, it = null) {
  $$('[data-calca]', raiz).forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.calca);
    const linha = tamanhoPorCalca(n);
    const sem = calcaEsgotada(it, n);
    gravarCalca(n);
    $$('[data-calca]', raiz).forEach((c) => c.setAttribute('aria-checked', !sem && c === b));
    const res = $('.tam-res', raiz);
    const fora = $('.tam-fora', raiz);
    res.hidden = sem;
    fora.hidden = !sem;
    fora.innerHTML = sem ? avisoEsgotado(it, n) : '';
    if (!sem) {
      $('.letra', res).textContent = linha.t;
      $('[data-letra]', res).textContent = linha.t;
      $('[data-faixa]', res).textContent = faixaCalca(linha);
      const est = $('[data-estoque]', res);
      if (est) est.textContent = textoEstoque(it, linha.t);
    }
    // Número que acabou não vale para a compra, mas fica guardado: ela pode tentar em outro produto
    if (aoMudar) aoMudar(sem ? null : n, linha);
  }));
}
const tabelaHTML = () => `<table class="tabela-mini"><thead><tr><th>Tamanho</th><th>Calça e short</th></tr></thead>
  <tbody>${TABELA.map((x) => `<tr data-linha="${x.t}"><td>${x.t}</td><td>${faixaCalca(x)}</td></tr>`).join('')}</tbody></table>`;
// Reduz o risco na hora do clique: nada é cobrado no site e o tamanho é conferido antes
const notaPedido = () => `<p class="pedido-nota">${I.escudo}<span>${pagaNoSite()
  ? `Frete grátis acima de ${brlLimpo(LOJA.freteGratis)}. Pague no Pix ou no cartão aqui no site, e a Paola confere seu tamanho antes de enviar.`
  : 'Você só paga depois de falar com a Paola no WhatsApp. Ela confirma seu tamanho antes de enviar.'}</span></p>`;
// O botão fala do que a cliente ganha, não do que ela precisa fazer
const textoBotao = () => 'Comprar agora';

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
  return `<div class="escolha">${it.escolha.map((id) => {
    const fora = qtdEstoque(id, '') <= 0;
    return `<button class="escolha-op${fora ? ' esgotado' : ''}" type="button" data-extra="${id}" aria-pressed="${!fora && id === sel}"${fora ? ' aria-disabled="true"' : ''}><span class="mini">${midia(item(id))}</span><b>${nomeCurto(item(id))}</b>${fora ? '<small>Acabou</small>' : ''}</button>`;
  }).join('')}</div>`;
}
function ligarEscolha(raiz, aoMudar) {
  $$('[data-extra]', raiz).forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return toast('Esse acabou. Escolha o outro ou fale com a Paola.');
    $$('[data-extra]', raiz).forEach((c) => c.setAttribute('aria-pressed', c === b));
    aoMudar(b.dataset.extra);
  }));
}

// Atalho dos cards (+): pede só o que faltar (escolha do combo e/ou calça)
function abrirOpcoes(id, pre = {}) {
  const it = item(id);
  const salva = pre.calca || lerCalca();
  const sel = { calca: calcaEsgotada(it, salva) ? null : salva, extra: pre.extra || null };
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
    ${usaTam ? `<div class="grupo"><div class="grupo-titulo">Número da calça ou short</div>${calcaHTML(salva, it)}</div>` : ''}
    <p class="dica-tam erro" data-erro hidden></p>
    <button class="btn btn-preto btn-bloco" type="button" data-confirmar style="margin-top:16px">Adicionar ao carrinho</button>
    ${usaTam ? notaPedido() : ''}`);
  if (it.escolha) ligarEscolha(m, (v) => { sel.extra = v; });
  if (usaTam) ligarCalca(m, (n) => { sel.calca = n; }, it);
  $('[data-confirmar]', m).addEventListener('click', () => {
    if (pronto()) return concluir();
    const erro = $('[data-erro]', m);
    erro.hidden = false;
    erro.textContent = it.escolha && !sel.extra ? 'Escolha o gel ou o sutiã.' : (calcaEsgotada(it, lerCalca()) ? TAMANHO_ACABOU : 'Marque o número da sua calça.');
  });
}

// ---------------- Pedido em 2 passos (página inicial) ----------------
function montarPedido(raiz) {
  // Começa pela melhor opção que ainda tem algum tamanho
  const cintaComEstoque = cintasAVenda().find((x) => !tudoEsgotado(x));
  const opcaoComEstoque = OPCOES.find((o) => (o.id === 'cinta' ? cintaComEstoque : !tudoEsgotado(item(o.id))));
  const p = { opcao: opcaoComEstoque?.id || 'combo-5', extra: null, versao: cintaComEstoque?.id || 'cinta-ziper-30' };
  const produto = () => item(p.opcao === 'cinta' ? p.versao : p.opcao);
  const resumo = () => {
    const it = produto();
    const calca = lerCalca();
    const nome = `${OPCOES.find((o) => o.id === p.opcao).titulo}${p.opcao === 'cinta' ? ` · ${it.barbatanas} barbatanas` : ''}${p.extra ? ` + ${nomeCurto(item(p.extra))}` : ''}`;
    const tamanho = !calca ? 'Falta o número da calça'
      : calcaEsgotada(it, calca) ? `Tamanho ${tamanhoPorCalca(calca).t} acabou nesta opção`
        : `Tamanho ${tamanhoPorCalca(calca).t} · calça ${calca}`;
    const est = calca && !calcaEsgotada(it, calca) ? textoEstoque(it, tamanhoPorCalca(calca).t, p.extra) : '';
    return `<div><small>Seu pedido</small><b>${nome}</b><small>${tamanho}</small>${est ? `<small class="tam-estoque">${est}</small>` : ''}</div>
      <div class="total">${brl(it.preco)}<small>${brl(pix(it.preco))} no Pix</small></div>`;
  };
  const atualizar = () => {
    $('.pedido-resumo', raiz).innerHTML = resumo();
    $('[data-erro]', raiz).hidden = true;
  };
  // Abaixo das 3 opções: a loja inteira, para ninguém achar que só existem essas
  const todosHTML = () => {
    // Os mesmos itens que a página da loja lista (inclusive os que vêm só nos combos)
    const naLoja = [...KITS, ...PRODUTOS].filter(visivel);
    if (!naLoja.length) return '';
    // Quatro fotos juntas, começando pelo que não está nas 3 opções: mostra de cara que há mais coisa
    const dasOpcoes = (x) => ['combo-5', 'combo-duplo', ...cintasAVenda().map((c) => c.id)].includes(x.id);
    const fotos = [...naLoja.filter((x) => !dasOpcoes(x)), ...naLoja.filter(dasOpcoes)].slice(0, 4);
    return `<a class="kit-op kit-op-todos" href="loja.html">
        <span class="kit-op-foto ${fotos.length === 4 ? 'kit-op-mosaico' : ''}">${(fotos.length === 4 ? fotos : fotos.slice(0, 1)).map((x) => `<img src="${x.img}" alt="" loading="lazy">`).join('')}</span>
        <span class="kit-op-txt"><b>Ver todos os produtos</b><small>${naLoja.length >= 6 ? `São ${naLoja.length} produtos na loja.` : 'Cada produto da loja, separado.'} Veja cada um com foto e detalhes.</small></span>
        <span class="kit-op-seta" aria-hidden="true">${I.seta}</span>
      </a>`;
  };
  const subOpcao = (o) => {
    if (o.id === 'combo-duplo') return `<div class="kit-op-sub" id="pedido-escolha"><small>Qual você quer junto?</small>${escolhaHTML(item('combo-duplo'), p.extra)}</div>`;
    return `<div class="kit-op-sub"><div class="versoes">${cintasAVenda().map((x) => `<button type="button" data-versao="${x.id}" aria-pressed="${x.id === p.versao}"><b>${x.barbatanas} barbatanas</b><small>${tudoEsgotado(x) ? 'Esgotada' : `${x.selo ? `${x.selo} · ` : ''}${brl(x.preco)}`}</small></button>`).join('')}</div></div>`;
  };

  const desenhar = () => {
    raiz.innerHTML = `
      <div class="passo"><span class="passo-n">1</span><h3>O que você quer levar?</h3></div>
      <div class="kits-opcoes" role="radiogroup" aria-label="O que você quer levar">${OPCOES.map((o) => {
        const it = item(o.id === 'cinta' ? p.versao : o.id);
        const marcado = p.opcao === o.id;
        const nota = tudoEsgotado(it) ? 'Esgotado no momento' : o.nota?.();
        return `<button class="kit-op" type="button" role="radio" aria-checked="${marcado}" data-opcao="${o.id}">
          <span class="kit-op-foto"><img src="${it.img}" alt="" loading="lazy"></span>
          <span class="kit-op-txt">${o.selo ? `<span class="kit-op-selo">${o.selo}</span>` : ''}<b>${o.titulo}</b><small>${o.sub}</small>
            <span class="kit-op-preco">${it.de ? `<s>${brl(it.de)}</s> ` : ''}<strong>${brl(it.preco)}</strong></span>${nota ? `<em>${nota}</em>` : ''}</span>
          <span class="kit-op-radio" aria-hidden="true"></span>
        </button>${marcado && o.id !== 'combo-5' ? subOpcao(o) : ''}`;
      }).join('')}</div>
      ${todosHTML()}
      <div class="passo" id="passo-calca"><span class="passo-n">2</span><h3>Qual número de calça você usa?</h3></div>
      ${calcaHTML(lerCalca(), produto())}
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
    ligarCalca(raiz, atualizar, produto());
    $('[data-pedir]', raiz).addEventListener('click', () => {
      const calca = lerCalca();
      const falta = (tudoEsgotado(produto()) && ['#passo-calca', 'Esta opção está esgotada no momento. Escolha outra ou fale com a Paola.'])
        || (p.opcao === 'combo-duplo' && !p.extra && ['#pedido-escolha', 'Escolha o gel ou o sutiã.'])
        || (!calca && ['#passo-calca', 'Marque o número da sua calça.'])
        || (calcaEsgotada(produto(), calca) && ['#passo-calca', TAMANHO_ACABOU]);
      if (falta) {
        const erro = $('[data-erro]', raiz);
        erro.hidden = false;
        erro.textContent = falta[1];
        $(falta[0], raiz).scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      comprarAgora(produto().id, { calca, extra: p.extra });
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
// Sem avaliação real cadastrada, a seção da página do produto fica escondida
function mostrarAvaliacoes() {
  $('#avaliacoes').innerHTML = avaliacoesHTML();
  $$('[data-so-avaliacoes]').forEach((el) => { el.hidden = !AVALIACOES.length; });
}
function avaliacoesHTML() {
  return AVALIACOES.map((a) => `<article class="avaliacao">
    ${a.foto ? `<img src="${a.foto}" alt="Foto enviada pela cliente" loading="lazy">` : ''}
    <div class="av-corpo">
      <div class="av-topo"><span class="estrelas" aria-label="5 de 5 estrelas">★★★★★</span></div>
      <p>“${a.texto}”</p>
      <div class="av-quem"><b>${a.nome}</b> · ${a.cidade}</div>
      <div class="av-compra">Veste calça ${a.calca} · usa o ${a.tam} · comprou ${a.produto}</div>
    </div>
  </article>`).join('');
}

// ---------------- Cards ----------------
function card(it) {
  const acabou = tudoEsgotado(it);
  const preco = temPreco(it)
    ? `<div class="precos">${it.de ? `<span class="de">${brl(it.de)}</span>` : ''}<span class="por">${brl(it.preco)}</span></div>
    ${acabou ? '<span class="so-combo">Esgotado</span>' : `<span class="parc"><b>${brl(pix(it.preco))}</b> no Pix</span>`}`
    : '<span class="so-combo">Vem nos combos</span>';
  return `<div class="card">
    <div class="moldura">
      <a class="img" href="produto.html?id=${it.id}" aria-label="${it.nome}">
        ${it.selo ? `<span class="selo ${it.itens ? 'rosa' : ''}">${it.selo}</span>` : ''}${midia(it)}
      </a>
    </div>
    <a href="produto.html?id=${it.id}"><h3>${it.nome}</h3></a>
    ${preco}
    ${temPreco(it) && !acabou ? `<button class="btn-card" type="button" data-add="${it.id}">Adicionar ao carrinho</button>` : ''}
  </div>`;
}

function cardKit(k) {
  return `<div class="kit">
    <a class="img" href="produto.html?id=${k.id}">${k.selo ? `<span class="selo rosa">${k.selo}</span>` : ''}${midia(k)}</a>
    <div>
      <a href="produto.html?id=${k.id}"><h3>${k.nome}</h3></a>
      <p class="itens">${listaItens(k).join(' + ')}</p>
      <div class="precos">${k.de ? `<span class="de">${brl(k.de)}</span>` : ''}<span class="por">${brl(k.preco)}</span></div>
      ${k.gancho || k.de ? `<span class="economia">${k.gancho || `Economize ${brl(k.de - k.preco)}`}</span><br>` : ''}
      ${tudoEsgotado(k) ? '<span class="so-combo">Esgotado</span>' : `<button class="btn btn-preto" type="button" data-add="${k.id}">Adicionar ao carrinho</button>`}
    </div>
  </div>`;
}

// ---------------- Telas ----------------
function telaInicio() {
  montarPedido($('#pedido'));
  $('#praia-pecas').innerHTML = PRAIA.filter(visivel).slice(0, 3).map((p) => `<span><img src="${p.img}" alt="${p.nome}" loading="lazy"></span>`).join('');
  mostrarAvaliacoes();
  ligarComparadores();
  barraInicio();
}

function telaLoja() {
  const filtros = [['tudo', 'Tudo'], ['kits', 'Combos'], ['cintas', 'Cintas'], ['sutias', 'Sutiã'], ['tratamento', 'Gel e creme']];
  const todos = [...KITS, ...PRODUTOS].filter(visivel);
  const valor = (x) => (temPreco(x) ? x.preco : Infinity);
  let ordem = 'vendidos';

  const desenhar = () => {
    const cat = location.hash.slice(1) || 'tudo';
    let lista = cat === 'tudo' ? todos : todos.filter((x) => x.cat === cat);
    if (ordem === 'menor') lista = [...lista].sort((a, b) => valor(a) - valor(b));
    if (ordem === 'maior') lista = [...lista].sort((a, b) => (temPreco(b) ? b.preco : -1) - (temPreco(a) ? a.preco : -1));
    $('#filtros').innerHTML = filtros.map(([id, nome]) => `<a class="filtro" href="#${id}" aria-pressed="${id === cat}">${nome}</a>`).join('') + '<a class="filtro filtro-praia" href="moda-praia.html">☀ Moda Praia · em breve</a>';
    $('#total-itens').textContent = `${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}`;
    $('#grade-loja').innerHTML = lista.map(card).join('');
  };
  $('#ordem').addEventListener('change', (e) => { ordem = e.target.value; desenhar(); });
  window.addEventListener('hashchange', desenhar);
  desenhar();
}

function telaProduto() {
  const busca = new URLSearchParams(location.search);
  const pedido = item(busca.get('id'));
  const it = pedido && visivel(pedido) ? pedido : item('combo-5');
  const ehKit = !!it.itens;
  const vende = temPreco(it);
  const usaTam = vende && precisaTamanho(it);
  const acabou = usaTam && tudoEsgotado(it);
  if (tamanhoPorCalca(busca.get('calca'))) gravarCalca(Number(busca.get('calca')));
  let calca = calcaEsgotada(it, lerCalca()) ? null : lerCalca();
  let extra = it.escolha?.includes(busca.get('extra')) ? busca.get('extra') : null;
  document.title = `${it.nome} | Paola Corpus Fit`;

  const pecas = ehKit ? [...new Set([...it.itens, ...(it.escolha || [])])] : [];
  const fotos = ehKit
    ? [{ src: it.img }, ...pecas.map((i) => ({ src: item(i).img, txt: nomeCurto(item(i)) }))]
    : (it.galeria || [{ src: it.img }]);
  const galeria = fotos.map((f, i) => `<figure><img src="${f.src}" alt="${it.nome}"${i ? ' loading="lazy"' : ''}>${f.txt ? `<figcaption>${f.txt}</figcaption>` : ''}</figure>`).join('');
  const cat = ({ cintas: 'Cintas', sutias: 'Sutiã', tratamento: 'Gel e creme', kits: 'Combos' })[it.cat];

  const versoes = it.cat === 'cintas' ? `<div class="grupo"><div class="grupo-titulo">Versão</div>
    <div class="versoes">${cintasAVenda().map((p) => `<a href="produto.html?id=${p.id}" aria-current="${p.id === it.id}"><b>${p.barbatanas} barbatanas</b><small>${tudoEsgotado(p) ? 'Esgotada' : `${p.selo ? `${p.selo} · ` : ''}${brl(p.preco)}`}</small></a>`).join('')}</div></div>` : '';

  // Tudo acabou: em vez de um botão que não leva a nada, oferece o que ainda tem e a conversa com a Paola
  const outraCinta = acabou ? cintasAVenda().find((x) => !pecasComTamanho(it).includes(x) && !tudoEsgotado(x)) : null;
  const esgotadoHTML = `<div class="esgotado-bloco"><b>Esgotado no momento</b>
      <p>${outraCinta ? `Ainda tem a <a href="produto.html?id=${outraCinta.id}">cinta de ${outraCinta.barbatanas} barbatanas</a>. ` : ''}Fale com a Paola para saber quando chega.</p>
      <a class="btn btn-preto btn-bloco" href="${LOJA.whatsapp}" target="_blank" rel="noopener">${I.whats}Falar com a Paola</a></div>`;

  const precoHTML = vende ? `<div class="preco-bloco">
      <div class="linha1">${it.de ? `<span class="de">${brl(it.de)}</span>` : ''}<span class="por">${brl(it.preco)}</span>${it.de ? `<span class="economia">-${Math.round((1 - it.preco / it.de) * 100)}%</span>` : ''}</div>
      <div class="pix">${brl(pix(it.preco))} no Pix (${pctPix()} off)</div>
      <div class="parc">ou ${LOJA.parcelas}x de ${brl(parcela(it.preco))} sem juros</div>
    </div>` : `<div class="preco-bloco"><div class="linha1"><span class="por" style="font-size:24px">Vem nos combos</span></div><div class="parc">Sai junto com a cinta. Para comprar avulso, fale com a Paola.</div></div>`;

  const conta = {};
  if (ehKit) it.itens.forEach((i) => { conta[i] = (conta[i] || 0) + 1; });
  const vemNoKit = ehKit ? `<div class="grupo"><div class="grupo-titulo">Vem no combo</div><ul class="itens-kit">${Object.entries(conta).map(([i, n]) => `<li><span class="mini">${midia(item(i))}</span>${n > 1 ? `${n} ${item(i).plural || nomeCurto(item(i))}` : item(i).nome}</li>`).join('')}${it.escolha ? `<li><span class="mini">${I.mais}</span>${it.escolha.map((i) => nomeCurto(item(i))).join(' ou ')} (você escolhe)</li>` : ''}</ul></div>` : '';

  const [sobeId, sobeTxt] = SOBE[it.id] || [];
  const sobe = sobeId && item(sobeId).preco > it.preco && !tudoEsgotado(item(sobeId)) ? item(sobeId) : null;
  const junto = sobe ? `<div class="junto">
      <div class="grupo-titulo" style="margin:0">Por só ${brl(sobe.preco - it.preco)} a mais</div>
      <div class="junto-pecas"><span class="mini">${midia(sobe)}</span></div>
      <b>${sobeTxt}</b>
      <div class="precos">${sobe.de ? `<s>${brl(sobe.de)}</s> por ` : ''}<strong>${brl(sobe.preco)}</strong></div>
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
        ${usaTam && !acabou ? `<div class="grupo" id="tamanho">
          <div class="grupo-titulo">Número da calça ou short <button class="link-tam" type="button" data-tabela>${I.regua}Tabela</button></div>
          ${calcaHTML(lerCalca(), it)}
        </div>` : ''}
        ${acabou ? esgotadoHTML : vende ? `<p class="dica-tam erro" id="erro-compra" hidden></p>
        <button class="btn btn-preto btn-bloco btn-pedir" type="button" id="adicionar">${textoBotao(it)}</button>
        <button class="btn btn-claro btn-bloco" type="button" id="adicionar-so" style="margin-top:10px">Adicionar ao carrinho</button>
        ${usaTam ? notaPedido() : ''}
        ${freteLigado() ? freteCaixaHTML('fc-produto', lerCepFrete().cep) : ''}` :`<div class="grupo"><div class="grupo-titulo">Leve nos combos</div><div class="kits">${kitsCom(it.id).map(cardKit).join('')}</div></div>
        <a class="btn btn-claro btn-bloco" href="${LOJA.whatsapp}" target="_blank" rel="noopener" style="margin-top:14px">${I.whats}Perguntar no WhatsApp</a>`}
        ${it.pontos ? `<ul class="pontos-prod">${it.pontos.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}
        ${junto}
        <div class="detalhes">
          <details open><summary>Descrição</summary><div class="conteudo">${it.desc}</div></details>
          ${it.uso ? `<details><summary>Como usar</summary><div class="conteudo">${it.uso}</div></details>` : ''}
          ${usaTam ? `<details><summary>Dobra? Marca? Machuca?</summary><div class="conteudo"><p><b>Dobra ou enrola?</b> Não. As barbatanas mantêm a cinta no lugar, mesmo sentada ou treinando.</p><p style="margin-top:10px"><b>Quantas regulagens?</b> Duas regulagens de colchete por dentro e mais o zíper por fora, na frente.</p><p style="margin-top:10px"><b>Marca na roupa?</b> Não marca por baixo da roupa.</p><p style="margin-top:10px"><b>Machuca?</b> Não, no tamanho certo. É cinta no tamanho errado que machuca, por isso a Paola confere o seu antes de enviar. Comece pela regulagem mais folgada, com poucas horas por dia, e aumente aos poucos.</p></div></details>` : ''}
          ${usaTam ? `<details><summary>Tabela de medidas</summary><div class="conteudo">${tabelaHTML()}<p style="margin-top:10px">A cinta estica, então o que vale é o número da calça ou short, não a medida em centímetros.</p></div></details>` : ''}
          <details><summary>Entrega e pagamento</summary><div class="conteudo">Enviamos de ${esc(LOJA.cidade)} para todo o Brasil. Pix com ${pctPix()} de desconto ou ${textoCartao()}. ${freteLigado() ? `O frete e o prazo saem pelo seu CEP, em "Frete e prazo".${Number.isFinite(LOJA.freteGratis) ? ` Frete grátis acima de ${brlLimpo(LOJA.freteGratis)}.` : ''}` : 'O prazo de entrega a Paola confirma no WhatsApp.'} Pode desistir em até 7 dias do recebimento: veja <a href="trocas.html">Trocas e devoluções</a>.</div></details>
        </div>
      </div>
    </div>`;

  // Bloco "no dia a dia" só onde tem cinta
  $('#dia-a-dia').hidden = !usaTam;
  mostrarAvaliacoes();
  $('#relacionados').innerHTML = [...KITS, ...PRODUTOS].filter((x) => visivel(x) && x.id !== it.id).slice(0, 4).map(card).join('');
  if (!vende || acabou) return;

  // Frete deste produto (uma unidade) pelo CEP guardado ou digitado aqui
  const caixaFrete = $('#produto [data-frete-form]');
  if (caixaFrete) {
    const mostrarFrete = () => {
      const c = lerCepFrete();
      if (document.activeElement !== caixaFrete.cep && c.cep) caixaFrete.cep.value = mascaraCep(c.cep);
      $('[data-frete-res]', caixaFrete).innerHTML = freteResultadoHTML(c, it.preco);
    };
    ligarFreteCaixa(caixaFrete, mostrarFrete);
    document.addEventListener('pcf-frete', mostrarFrete);
    mostrarFrete();
  }

  const erro = $('#erro-compra');
  if (usaTam) {
    const caixa = $('#tamanho');
    ligarCalca(caixa, (n) => { calca = n; erro.hidden = true; }, it);
    $('[data-tabela]', caixa).addEventListener('click', (e) => {
      e.stopPropagation();
      abrirTabela((n) => $(`[data-calca="${n}"]`, caixa).click());
    });
  }
  if (it.escolha) ligarEscolha($('#escolha'), (v) => { extra = v; erro.hidden = true; });
  const comprar = (abrirCarrinho = true) => {
    const falta = (it.escolha && !extra && ['escolha', 'Escolha o gel ou o sutiã para continuar.'])
      || (usaTam && !calca && ['tamanho', calcaEsgotada(it, lerCalca()) ? TAMANHO_ACABOU : 'Marque o número da sua calça para continuar.']);
    if (falta) {
      erro.hidden = false;
      erro.textContent = falta[1];
      $(`#${falta[0]}`).scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const op = { calca: usaTam ? calca : null, extra };
    if (abrirCarrinho) comprarAgora(it.id, op);
    else adicionar(it.id, op, 1, lerSacola(), { abrir: false });
  };
  $('#adicionar').addEventListener('click', () => comprar(true));
  $('#adicionar-so').addEventListener('click', () => comprar(false));

  // Barra fixa no celular quando o botão principal sai da tela
  const barra = $('#barra-prod');
  barra.innerHTML = `<div><small>${nomeCurto(it)}</small><b>${brl(it.preco)}</b></div><button class="btn btn-preto" type="button">Comprar agora</button>`;
  $('button', barra).addEventListener('click', () => comprar(true));
  // Aparece sempre que o botão principal não está na tela (antes ou depois dele). Enquanto ela aparece, some a barra do carrinho
  new IntersectionObserver(([e]) => {
    barra.classList.toggle('visivel', !e.isIntersecting);
    document.body.classList.toggle('com-barra-prod', !e.isIntersecting);
  }).observe($('#adicionar'));
}

function telaPraia() {
  const pecas = PRAIA.filter(visivel);
  $('#praia-vitrine').innerHTML = pecas.slice(0, 2).map((p) => `<span><img src="${p.img}" alt="${p.nome}"></span>`).join('');

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

  // Coleção com filtro pelo que a cliente quer valorizar.
  // Ainda não está à venda: cada peça leva o cadeado "Em breve" e o botão só põe a peça na lista de espera
  let foco = 'todos';
  const desenharColecao = () => {
    $('#filtros-praia').innerHTML = FOCOS_PRAIA.map(([id, nome]) => `<button class="filtro" type="button" data-foco="${id}" aria-pressed="${id === foco}">${nome}</button>`).join('');
    $('#colecao').innerHTML = pecas.filter((p) => foco === 'todos' || p.foco.includes(foco)).map((p) => `
      <div class="peca-praia">
        <div class="img"><span class="trava">${I.cadeado}Em breve</span>${p.selo ? `<span class="selo">${p.selo}</span>` : ''}<img src="${p.img}" alt="${p.nome}" loading="lazy"><a class="avise" href="#espera" data-reserva="${esc(p.nome)}">Avise-me</a></div>
        <h3>${p.nome}</h3>
        <div class="linha-praia"><span class="em-breve">Em breve</span><span class="cores" aria-label="Cores previstas">${p.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span></div>
      </div>`).join('');
    $$('[data-foco]').forEach((b) => b.addEventListener('click', () => { foco = b.dataset.foco; desenharColecao(); }));
  };

  // Monte seu biquíni (top e calcinha em tamanhos diferentes): trancado até o lançamento.
  // A prévia aparece apagada, sem clique, com o aviso por cima
  const biquinis = pecas.filter((p) => p.biquini);
  if (!biquinis.length) $('#monte').hidden = true;
  const desenharMonte = () => {
    if (!biquinis.length) return;
    const p = biquinis[0];
    const chips = TAMANHOS_PRAIA.map((t) => `<span class="chip">${t}</span>`).join('');
    $('#monte-caixa').innerHTML = `
      <div class="monte-foto"><img src="${p.img}" alt="${p.nome}"><span class="selo">Em breve</span></div>
      <div class="monte-opcoes trancado">
        <div class="monte-previa" inert>
          <div class="grupo-titulo">1. Modelo</div>
          <div class="monte-modelos">${biquinis.map((b) => `<span class="monte-modelo"><img src="${b.img}" alt=""><span>${b.nome.replace('Biquíni ', '')}</span></span>`).join('')}</div>
          <div class="grupo-titulo">2. Cor</div>
          <div class="cores-escolha">${p.cores.map((c) => `<span class="cor" style="background:${c}"></span>`).join('')}</div>
          <div class="grupo-titulo">3. Tamanho do top</div>
          <div class="tamanhos">${chips}</div>
          <div class="grupo-titulo">4. Tamanho da calcinha</div>
          <div class="tamanhos">${chips}</div>
        </div>
        <div class="monte-trava">
          <span class="trava-ico">${I.cadeado}</span>
          <b>Disponível no lançamento</b>
          <p>A coleção ainda não está à venda. Quando chegar, você monta o seu aqui. Entre na lista e a Paola te avisa.</p>
          <a class="btn btn-preto" href="#espera">Quero ser avisada</a>
        </div>
      </div>`;
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
  // Um ouvinte só: as peças da coleção são redesenhadas a cada filtro
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-reserva]');
    if (!a) return;
    e.preventDefault();
    marcarReserva(a.dataset.reserva);
  });

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

// ---------------- Páginas de texto (trocas e privacidade) ----------------
// Empresa, documento, endereço e contatos vêm dos dados da loja no painel: mudou lá, muda aqui
function telaTexto() {
  const empresa = LOJA.empresa && LOJA.documento
    ? `${esc(LOJA.empresa)}, ${esc(documentoBonito(LOJA.documento))}${LOJA.enderecoLoja ? `, ${esc(LOJA.enderecoLoja)}` : ''}`
    : '';
  $$('[data-empresa-loja]').forEach((el) => { if (empresa) el.innerHTML = `${empresa}. É a responsável pelos dados das compras feitas aqui.`; });
  const contatos = [
    `WhatsApp: <a href="${esc(LOJA.whatsapp)}" target="_blank" rel="noopener">falar com a Paola</a>`,
    LOJA.email ? `e-mail: <a href="mailto:${esc(LOJA.email)}">${esc(LOJA.email)}</a>` : '',
  ].filter(Boolean).join(' · ');
  $$('[data-contato-loja]').forEach((el) => { el.innerHTML = `${contatos}${empresa ? `<br>${empresa}` : ''}`; });
}

// ---------------- Acompanhar pedido ----------------
// A cliente chega pelo link da mensagem, pelos pedidos guardados no aparelho ou por número + CEP.
// Os dados vêm de pedidos digitados no site: sempre passam por esc() antes de ir para a tela.
const ETAPAS = [
  ['novo', 'Pedido recebido', 'A Paola recebeu seu pedido. Ela confere seu tamanho e te envia o link de pagamento no WhatsApp.'],
  ['pago', 'Pagamento confirmado', 'Deu tudo certo com o pagamento.'],
  ['preparando', 'Preparando seu pedido', 'A Paola está separando suas peças.'],
  ['enviado', 'Pedido enviado', 'Seu pedido está a caminho.'],
  ['entregue', 'Pedido entregue', 'Chegou! Qualquer dúvida, é só chamar a Paola.'],
];
const SITE_CORREIOS = 'https://rastreamento.correios.com.br/app/index.php';
const dataEtapa = (iso) => { const d = new Date(iso); return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; };
const zapDoPedido = (numero) => (LOJA.whatsappNumero ? `https://wa.me/${LOJA.whatsappNumero}?text=${encodeURIComponent(`Oi, Paola! Quero falar sobre o pedido ${numero}.`)}` : LOJA.whatsapp);

function pedidoAcompanhadoHTML(p, volta = null) {
  const atual = ETAPAS.findIndex(([id]) => id === p.status);
  // Com o pagamento no site, ou com o pedido liberado pela loja, o botão abre a página de pagamento da própria loja.
  // O endereço é montado aqui: o que vem do banco só diz se o pedido foi liberado
  const pagar = p.status === 'novo' && (pagaNoSite() || p.link_pagamento) ? `pagamento.html?p=${encodeURIComponent(p.id)}` : null;
  const textoNovo = pagar || pagaNoSite() ? 'Recebemos seu pedido. Assim que o pagamento for aprovado, esta etapa muda sozinha.' : null;
  const cancelado = p.status === 'cancelado';
  const ehCorreios = /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(p.rastreio_codigo || '');
  const linkEntrega = /^https:\/\//.test(p.rastreio_link || '') ? p.rastreio_link : ehCorreios ? SITE_CORREIOS : '';
  const etapas = ETAPAS.map(([id, nome, texto], i) => {
    const registro = (p.historico || []).filter((h) => h.status === id).pop();
    const feita = i <= atual;
    return `<li class="${feita ? 'feita' : ''} ${i === atual ? 'atual' : ''}">
      <i>${feita ? I.ok : ''}</i>
      <div><b>${nome}</b>${feita && registro ? `<small>${esc(dataEtapa(registro.em))}</small>` : ''}${i === atual ? `<p>${id === 'novo' && textoNovo ? textoNovo : texto}</p>` : ''}</div>
    </li>`;
  }).join('');
  const rastreio = !cancelado && (p.rastreio_codigo || linkEntrega) ? `<section class="acomp-rastreio">
      <h2>Rastreio da entrega</h2>
      ${p.rastreio_codigo ? `<div class="acomp-codigo"><b>${esc(p.rastreio_codigo)}</b><button class="link-tam" type="button" data-copiar-rastreio>Copiar</button></div>` : ''}
      ${linkEntrega ? `<a class="btn btn-preto btn-bloco" href="${esc(linkEntrega)}" target="_blank" rel="noopener">${ehCorreios && !p.rastreio_link ? 'Abrir o site dos Correios' : 'Ver onde está a entrega'}</a>` : ''}
      ${ehCorreios && !p.rastreio_link ? '<p class="dica-tam">Copie o código e cole no site dos Correios.</p>' : ''}
    </section>` : '';
  // Pagamento que acabou de ser confirmado: diz na hora, sem a cliente precisar entender as etapas
  const aviso = volta === 'pago' ? `<p class="acomp-pago">${I.ok}<span><b>Pagamento aprovado!</b> A Paola já recebeu seu pedido e confere seu tamanho antes de enviar.</span></p>` : '';
  return `<span class="sobre">Pedido ${esc(p.numero)}</span>
    <h1 class="titulo">Oi, ${esc(p.primeiro_nome)}!</h1>
    ${aviso}
    ${pagar ? `<a class="btn btn-preto btn-bloco acomp-pagar" href="${esc(pagar)}">Pagar agora no Pix ou no cartão</a>` : ''}
    ${cancelado
    ? `<p class="acomp-cancelado">${p.devolvido
      ? 'Este pedido foi cancelado e o pagamento foi devolvido pelo Mercado Pago. O prazo para o valor voltar depende do seu banco ou cartão.'
      : 'Este pedido foi cancelado. Se tiver alguma dúvida, é só falar com a Paola.'}</p>`
    : `<ol class="acomp-etapas">${etapas}</ol>`}
    ${rastreio}
    <section class="acomp-resumo">
      <h2>Seu pedido</h2>
      <ul>${(p.itens || []).map((x) => `<li>${esc(x.qtd || 1)}x ${esc(x.nome)}${x.tam ? `<small>Tamanho ${esc(x.tam)}</small>` : ''}</li>`).join('')}</ul>
      ${Number(p.frete) > 0 ? `<div class="acomp-frete"><span>Frete</span><span>${brl(Number(p.frete))}</span></div>` : ''}
      <div class="acomp-total"><span>${p.pago && p.valor != null ? 'Total pago' : 'Total'}</span><b>${brl(Number(p.pago && p.valor != null ? p.valor : p.total))}</b></div>
      ${p.cidade ? `<p class="dica-tam">Entrega em ${esc(p.cidade)}/${esc(p.uf)}</p>` : ''}
    </section>
    <a class="btn btn-claro btn-bloco" href="${esc(zapDoPedido(p.numero))}" target="_blank" rel="noopener">${I.whats}Falar com a Paola sobre este pedido</a>
    ${temConta() ? (Catalogo.conta.atual()
    ? '<a class="link-tam envio-copiar" href="conta.html">Ver todos os meus pedidos</a>'
    : `<a class="link-tam envio-copiar" href="conta.html?pedido=${encodeURIComponent(p.id)}">Guardar este pedido na minha conta</a>`) : ''}
    <a class="link-tam envio-copiar" href="acompanhar.html">Ver outro pedido</a>`;
}

function telaAcompanhar() {
  const caixa = $('#acompanhar');
  // Se o aviso do Mercado Pago atrasou, a própria página pede para o servidor conferir se o pedido já foi pago
  async function conferirPagamento(p) {
    if (p.status !== 'novo' || !(pagaNoSite() || p.link_pagamento)) return;
    const s = await Catalogo.pagamento({ acao: 'situacao', id: p.id }).catch(() => ({}));
    if (!s.pago) return;
    const novo = await Catalogo.acompanhar({ p_id: p.id }).catch(() => null);
    if (novo && novo.status !== 'novo') mostrarPedido(novo, 'pago');
  }
  const mostrarPedido = (p, volta = null) => {
    history.replaceState(null, '', `acompanhar.html?p=${encodeURIComponent(p.id)}`);
    caixa.innerHTML = pedidoAcompanhadoHTML(p, volta);
    scrollTo(0, 0);
    if (!volta) conferirPagamento(p);
    $('[data-copiar-rastreio]', caixa)?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(p.rastreio_codigo); toast('Código copiado'); } catch (e) { toast('Selecione o código e copie'); }
    });
  };
  const mostrarBusca = (aviso = '') => {
    const doAparelho = lerPedidos().filter((x) => x.id).slice(0, 5);
    caixa.innerHTML = `<span class="sobre">Paola Corpus Fit</span>
      <h1 class="titulo">Acompanhar meu pedido</h1>
      ${doAparelho.length ? `<section class="acomp-meus"><h2>Seus pedidos neste aparelho</h2>
        ${doAparelho.map((x) => `<a href="${esc(linkAcompanhar(x.id))}"><span><b>${esc(x.numero)}</b><small>${esc(new Date(x.data).toLocaleDateString('pt-BR'))} · ${brl(Number(x.total))}</small></span>${I.seta}</a>`).join('')}
      </section>` : ''}
      <form class="acomp-form" id="form-acomp" novalidate>
        <p>Digite o WhatsApp e o CEP de entrega que você usou na compra. Não precisa do número do pedido.</p>
        ${contatoHTML('ac')}
        <p class="dica-tam erro" data-erro ${aviso ? '' : 'hidden'}>${esc(aviso)}</p>
        <button class="btn btn-preto btn-bloco" type="submit">Ver meu pedido</button>
      </form>
      ${temConta() ? `<a class="link-tam envio-copiar" href="conta.html">${Catalogo.conta.atual() ? 'Ver os pedidos da minha conta' : 'Tem conta? Entre para ver seus pedidos'}</a>` : ''}
      <a class="link-tam envio-copiar" href="${esc(LOJA.whatsapp)}" target="_blank" rel="noopener">Não achou? Fale com a Paola</a>`;
    const form = $('#form-acomp', caixa);
    const erro = $('[data-erro]', form);
    const lerContato = ligarContato(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.hidden = false;
      const c = lerContato();
      if (c.erro) { erro.textContent = c.erro; return; }
      const botao = $('button[type=submit]', form);
      botao.disabled = true;
      try {
        const lista = await Catalogo.buscarPedidos(c.telefone, c.cep);
        if (lista.length === 1) return mostrarPedido(lista[0]);
        if (lista.length > 1) return mostrarLista(lista);
        erro.textContent = 'Não encontramos pedido com esse WhatsApp e CEP. Confira os dois ou fale com a Paola.';
      } catch (ex) {
        erro.textContent = 'Não conseguimos buscar agora. Confira a internet e tente de novo.';
      }
      botao.disabled = false;
    });
  };
  // Mais de um pedido com o mesmo WhatsApp e CEP: ela escolhe qual quer ver
  const mostrarLista = (lista) => {
    caixa.innerHTML = `<span class="sobre">Paola Corpus Fit</span>
      <h1 class="titulo">Seus pedidos</h1>
      <section class="acomp-meus conta-pedidos"><h2>Encontramos ${lista.length} pedidos com esse WhatsApp e CEP</h2>${lista.map(linhaPedidoHTML).join('')}</section>
      <button class="link-tam envio-copiar" type="button" data-voltar>Buscar de novo</button>`;
    scrollTo(0, 0);
    $('[data-voltar]', caixa).addEventListener('click', () => mostrarBusca());
  };

  if (!Catalogo.ligado) {
    caixa.innerHTML = `<h1 class="titulo">Acompanhar meu pedido</h1><p class="acomp-cancelado">Para saber do seu pedido, fale com a Paola no WhatsApp.</p><a class="btn btn-preto btn-bloco" href="${esc(LOJA.whatsapp)}" target="_blank" rel="noopener">${I.whats}Falar com a Paola</a>`;
    return;
  }
  const busca = new URLSearchParams(location.search);
  const id = busca.get('p');
  if (!id) return mostrarBusca();
  Catalogo.acompanhar({ p_id: id })
    .then((p) => (p ? mostrarPedido(p) : mostrarBusca('Não encontramos esse pedido. Digite seu WhatsApp e o CEP.')))
    .catch(() => mostrarBusca('Não conseguimos buscar agora. Confira a internet e tente de novo.'));
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

// Valores escritos no HTML acompanham os preços editados no painel
function preencherValores() {
  const kit = item('combo-5');
  const valores = {
    'kit-de': kit.de ? brlLimpo(kit.de) : '',
    'kit-preco': brl(kit.preco),
    'kit-preco-curto': brlLimpo(kit.preco),
    'kit-parcela': `ou ${LOJA.parcelas}x de ${brl(parcela(kit.preco))}`,
    'kit-cada': `R$ ${Math.ceil(kit.preco / kit.itens.length)}`,
    'duplo-a-mais': brlLimpo(item('combo-duplo').preco - item('cinta-ziper-30').preco),
    'pix-pct': pctPix(),
    parcelas: `${LOJA.parcelas}x`,
    'parcelas-max': `${parcelasMax()}x`,
  };
  $$('[data-v]').forEach((el) => { el.textContent = valores[el.dataset.v]; });
  $$('[data-so-de]').forEach((el) => { el.hidden = !kit.de; });
  // Os textos fixos seguem o modo de pagamento: no site (o que vem escrito no HTML) ou pelo WhatsApp
  const cidade = esc(LOJA.cidade.split(',')[0]);
  const textos = pagaNoSite() ? {
    hero: `${kit.preco >= LOJA.freteGratis ? 'Frete grátis no kit. ' : ''}Pague no Pix ou no cartão aqui no site, e a Paola confere seu tamanho antes de enviar.`,
    passo2: `Paga aqui no site: Pix com ${pctPix()} de desconto ou ${textoCartao()}`,
    passo3: 'A Paola confere seu tamanho antes de enviar. Se precisar, ela te chama no WhatsApp',
    faq: `<summary>Como é o pagamento?</summary><p>Você paga aqui no site, com a proteção do Mercado Pago: no Pix (com ${pctPix()} de desconto) ou no ${textoCartao()}. Depois, a Paola confere seu tamanho e envia de ${cidade} para todo o Brasil.</p>`,
  } : {
    hero: 'Você só paga depois de falar com a Paola no WhatsApp. Ela confirma seu tamanho antes de enviar.',
    passo2: 'Envia o pedido pelo WhatsApp. Nada é cobrado no site',
    passo3: `A Paola confirma seu tamanho e você paga no Pix (${pctPix()} off) ou no cartão em até ${parcelasMax()}x`,
    faq: `<summary>Preciso pagar no site?</summary><p>Não. Você envia o pedido pelo WhatsApp e só paga depois de falar com a Paola: no Pix (com ${pctPix()} de desconto) ou no ${textoCartao()}. Ela envia de ${cidade} para todo o Brasil.</p>`,
  };
  $$('[data-texto-site]').forEach((el) => { el.innerHTML = textos[el.dataset.textoSite]; });
}

// Depois de uma atualização automática do catálogo, a página volta ao topo (e não ao ponto onde o navegador a deixou)
try {
  if (sessionStorage.getItem('pcf-recarga')) {
    sessionStorage.removeItem('pcf-recarga');
    history.scrollRestoration = 'manual';
    scrollTo(0, 0);
  }
} catch (e) { /* sem armazenamento: segue normal */ }

// ---------------- Início ----------------
Catalogo.pronto.then(() => {
  montarTopo();
  montarRodape();
  preencherValores();
  ({ inicio: telaInicio, loja: telaLoja, produto: telaProduto, praia: telaPraia, acompanhar: telaAcompanhar, conta: telaConta, pagamento: window.telaPagamento, texto: telaTexto })[document.body.dataset.pagina]?.();
  ligarMovimento();
  // Quem veio acompanhar ou pagar um pedido já comprou: não conta como visita no funil de vendas
  if (!['acompanhar', 'pagamento', 'conta'].includes(document.body.dataset.pagina)) Catalogo.evento('visita');
  // Pedido feito neste aparelho que ainda não entrou na conta (a página de Minha conta já faz isso sozinha)
  if (document.body.dataset.pagina !== 'conta') ligarPedidosDaConta();
  // Sacola de outro aparelho da mesma conta
  sincronizarSacola();
});

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
