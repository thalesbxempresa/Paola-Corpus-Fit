// =============================================================
// Paola Corpus Fit — área da parceira (parceira.html)
// Cadastro pelo link, entrada com e-mail e senha, senha nova pelo link de acesso e o painel dela:
// cupom e link de divulgação, vendas do cupom, comissões e pagamentos. Atualiza sozinho enquanto está aberto.
// Da cliente, a parceira vê só primeiro nome, inicial do sobrenome, cidade, forma de pagamento e etapa. Nunca o valor do pedido.
// Usa as peças de js/app.js ($, esc, brl, I, toast, campoSenhaHTML...) e Catalogo.parceira (js/catalogo.js)
// =============================================================
(() => {
  const P = Catalogo.parceira;
  const regrasLoja = () => ({ cadastroAberto: true, diasLiberacao: 30, diaPagamento: 10, ...(LOJA.parcerias || {}) });
  const dataBR = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const diaMes = (d) => new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const horaBR = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const zapPaola = (texto) => (LOJA.whatsappNumero ? `https://wa.me/${LOJA.whatsappNumero}?text=${encodeURIComponent(texto)}` : LOJA.whatsapp);
  const linkCupom = (cupom) => new URL(`/?cupom=${encodeURIComponent(cupom)}`, location.origin).href;
  const linkCadastro = () => new URL('/parceira?cadastro=1', location.origin).href;

  const ETAPA = { novo: 'Aguardando pagamento', pago: 'Pago', preparando: 'Preparando', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
  const situacaoTxt = (v) => ({
    aguardando: 'Aguardando o pagamento da cliente',
    a_liberar: v.libera_em ? `Libera em ${diaMes(v.libera_em)}` : 'A liberar',
    liberada: 'Disponível para o próximo pagamento',
    paga: 'Paga',
    cancelada: 'Pedido cancelado: sem comissão',
    estornar: 'Pedido devolvido: será descontada do próximo pagamento',
    estornada: 'Pedido devolvido: descontada',
  })[v.situacao] || '';

  function regrasHTML(r, d = null) {
    const dias = Number(r.diasLiberacao) || 30;
    return `<ul class="espera-lista aviso-lista pc-regras">
      <li>${d ? `Suas seguidoras ganham <b>${d.desconto}% de desconto</b> nos produtos e você ganha <b>${d.comissao}% de comissão</b>` : 'A porcentagem de desconto do cupom e a sua comissão são combinadas com a Paola na aprovação'}. A comissão é sobre o valor dos produtos já com o desconto, sem o frete.</li>
      <li>A comissão fica disponível ${dias} dias depois que a cliente paga, que é o prazo de troca e devolução.</li>
      <li>Todo dia ${Number(r.diaPagamento) || 10}, a Paola paga por Pix o que estiver disponível.</li>
      <li>Pedido cancelado ou devolvido não gera comissão. Se ela já tiver sido paga, o valor sai do próximo pagamento.</li>
      <li>Ao divulgar, não prometa emagrecimento, perda de medidas nem resultado garantido, e não use antes e depois. Fale da sua experiência: conforto, firmeza, como a cinta veste.</li>
      <li>O cupom é seu e pessoal. A Paola pode pausar o cupom se estas regras não forem seguidas.</li>
    </ul>`;
  }

  const ERROS = {
    nome: 'Escreva seu nome.',
    email: 'Confira o e-mail. Exemplo: maria@gmail.com',
    telefone: 'Escreva seu WhatsApp com DDD.',
    redes: 'Escreva seu Instagram ou TikTok. Exemplo: @seuperfil',
    senha: 'A senha precisa ter pelo menos 6 letras ou números.',
    cupom: 'O cupom pode ter só letras e números, de 3 a 20, sem espaço. Exemplo: MARIA10',
    cupom_existe: 'Esse cupom já é de outra parceira. Escolha outro.',
    existe: 'Esse e-mail já tem cadastro. Use Entrar.',
    cheio: 'Muitos cadastros agora. Tente de novo daqui a pouco.',
    fechado: 'O cadastro de parceiras está fechado no momento. Fale com a Paola.',
    invalido: 'E-mail ou senha não conferem.',
    sem_senha: 'Você ainda não criou sua senha. Peça o link de acesso para a Paola.',
    codigo: 'Este link de acesso venceu ou já foi usado. Peça outro para a Paola.',
  };

  function telaParceira() {
    const caixa = $('#parceira');
    if (!Catalogo.ligado) {
      caixa.innerHTML = '<h1 class="titulo">Área da parceira</h1><p class="acomp-cancelado">A área da parceira está indisponível no momento.</p>';
      return;
    }
    const busca = new URLSearchParams(location.search);
    const codigo = busca.get('nova');
    const querCadastro = busca.get('cadastro') === '1';
    if (codigo || querCadastro) history.replaceState(null, '', location.pathname);
    let vigia = null;
    let ultimaContagem = null;

    const pararVigia = () => { clearInterval(vigia); vigia = null; };

    // ----- Entrar e cadastrar -----
    function mostrarEntrada(modo = 'entrar', aviso = '') {
      pararVigia();
      const r = regrasLoja();
      const cadastro = modo === 'cadastro';
      caixa.innerHTML = `<span class="sobre">Paola Corpus Fit</span>
        <h1 class="titulo">${cadastro ? 'Seja parceira da Paola' : 'Área da parceira'}</h1>
        <div class="pc-abas" role="tablist">
          <button type="button" role="tab" aria-selected="${!cadastro}" data-modo="entrar">Já sou parceira</button>
          <button type="button" role="tab" aria-selected="${cadastro}" data-modo="cadastro">Quero ser parceira</button>
        </div>
        ${aviso ? `<p class="acomp-esperando">${esc(aviso)}</p>` : ''}
        ${cadastro ? (r.cadastroAberto === false ? `<p class="acomp-cancelado">${ERROS.fechado}</p><a class="btn btn-preto btn-bloco" href="${esc(zapPaola('Oi, Paola! Quero ser parceira da loja.'))}" target="_blank" rel="noopener">${I.whats}Falar com a Paola</a>` : cadastroHTML(r)) : entrarHTML()}`;
      $$('[data-modo]', caixa).forEach((b) => b.addEventListener('click', () => mostrarEntrada(b.dataset.modo)));
      const form = $('form', caixa);
      if (!form) return;
      ligarVerSenha(form);
      if (cadastro) ligarCadastro(form); else ligarEntrar(form);
    }

    const entrarHTML = () => `<form class="acomp-form" id="pc-entrar" novalidate>
        <p>Entre com o e-mail e a senha do seu cadastro para ver seu cupom, suas vendas e suas comissões.</p>
        <div class="campo"><label for="pc-email">Seu e-mail</label><input id="pc-email" name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="120" required></div>
        ${campoSenhaHTML('pc-senha', 'Sua senha', false)}
        <p class="dica-tam erro" data-erro hidden></p>
        <button class="btn btn-preto btn-bloco" type="submit">Entrar</button>
        <a class="link-tam envio-copiar" href="${esc(zapPaola('Oi, Paola! Sou parceira e esqueci a senha da área da parceira.'))}" target="_blank" rel="noopener">Esqueci a senha</a>
      </form>`;

    const cadastroHTML = (r) => `<form class="acomp-form" id="pc-cadastro" novalidate>
        <p>Divulgue a Paola Corpus Fit com o seu cupom: suas seguidoras ganham desconto e você ganha comissão em cada venda. Preencha e a Paola analisa o seu cadastro.</p>
        <div class="campo"><label for="pc-nome">Seu nome completo</label><input id="pc-nome" name="nome" autocomplete="name" maxlength="120" required></div>
        <div class="campo"><label for="pc-email">Seu e-mail</label><input id="pc-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="120" required></div>
        <div class="campo"><label for="pc-tel">Seu WhatsApp</label><input id="pc-tel" name="telefone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(21) 99999-9999" maxlength="15" required></div>
        <div class="campo"><label for="pc-redes">Seu Instagram ou TikTok</label><input id="pc-redes" name="redes" placeholder="@seuperfil" maxlength="200" autocapitalize="none" spellcheck="false" required></div>
        <div class="campo"><label for="pc-cupom">Como você quer o seu cupom? (opcional)</label><input id="pc-cupom" name="cupom" placeholder="Exemplo: MARIA10" maxlength="20" autocapitalize="characters" autocomplete="off" spellcheck="false"><small class="ck-status">Só letras e números. A Paola confirma na aprovação.</small></div>
        <div class="campo"><label for="pc-pix">Sua chave Pix, para receber as comissões (opcional)</label><input id="pc-pix" name="pix" maxlength="140" autocomplete="off"></div>
        ${campoSenhaHTML('pc-senha', 'Crie uma senha', true)}
        <details class="pc-detalhe"><summary>Como funciona a parceria</summary>${regrasHTML(r)}</details>
        <label class="pc-aceite"><input type="checkbox" name="aceite"><span>Li e aceito as regras da parceria e a <a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a>.</span></label>
        <p class="dica-tam erro" data-erro hidden></p>
        <button class="btn btn-preto btn-bloco" type="submit">Enviar meu cadastro</button>
      </form>`;

    function ligarEntrar(form) {
      const erro = $('[data-erro]', form);
      const falhar = (t, campo) => { erro.hidden = false; erro.textContent = t; campo?.focus(); };
      form.email.focus();
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.email.value.trim();
        if (!EMAIL_OK.test(email)) return falhar(ERROS.email, form.email);
        if (!form.senha.value) return falhar('Digite a sua senha.', form.senha);
        const botao = $('button[type=submit]', form);
        botao.disabled = true;
        botao.textContent = 'Entrando…';
        try {
          const r = await P.entrar(email, form.senha.value);
          if (r.ok) return mostrarPainel();
          falhar(r.erro === 'bloqueada' ? `Muitas tentativas. Tente de novo em ${Number(r.minutos) || 15} min.` : (ERROS[r.erro] || ERROS.invalido));
        } catch (ex) {
          falhar('Não deu para entrar agora. Confira a internet e tente de novo.');
        }
        botao.disabled = false;
        botao.textContent = 'Entrar';
      });
    }

    function ligarCadastro(form) {
      const erro = $('[data-erro]', form);
      const falhar = (t, campo) => { erro.hidden = false; erro.textContent = t; campo?.focus(); };
      form.telefone.addEventListener('input', () => { form.telefone.value = mascaraTelefone(form.telefone.value); });
      form.cupom.addEventListener('input', () => { form.cupom.value = form.cupom.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      form.nome.focus();
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = {
          nome: form.nome.value.trim(),
          email: form.email.value.trim(),
          telefone: form.telefone.value.replace(/\D/g, ''),
          redes: form.redes.value.trim(),
          cupom: form.cupom.value.trim(),
          pix: form.pix.value.trim(),
          senha: form.senha.value,
        };
        if (d.nome.length < 2) return falhar(ERROS.nome, form.nome);
        if (!EMAIL_OK.test(d.email)) return falhar(ERROS.email, form.email);
        if (d.telefone.length < 10) return falhar(ERROS.telefone, form.telefone);
        if (d.redes.length < 3) return falhar(ERROS.redes, form.redes);
        if (d.cupom && !/^[A-Z0-9]{3,20}$/.test(d.cupom)) return falhar(ERROS.cupom, form.cupom);
        if (d.senha.length < 6) return falhar(ERROS.senha, form.senha);
        if (!form.aceite.checked) return falhar('Leia e aceite as regras da parceria para continuar.');
        const botao = $('button[type=submit]', form);
        botao.disabled = true;
        botao.textContent = 'Enviando…';
        try {
          const r = await P.cadastrar(d);
          if (r.ok) return mostrarPainel();
          const campo = { nome: form.nome, email: form.email, existe: form.email, telefone: form.telefone, redes: form.redes, cupom: form.cupom, cupom_existe: form.cupom, senha: form.senha }[r.erro];
          falhar(ERROS[r.erro] || 'Não deu para enviar agora. Tente de novo.', campo);
        } catch (ex) {
          falhar('Não deu para enviar agora. Confira a internet e tente de novo.');
        }
        botao.disabled = false;
        botao.textContent = 'Enviar meu cadastro';
      });
    }

    // ----- Senha pelo link de acesso -----
    function mostrarNovaSenha() {
      caixa.innerHTML = `<span class="sobre">Área da parceira</span>
        <h1 class="titulo">Crie sua senha</h1>
        <form class="acomp-form" id="pc-nova" novalidate>
          <p>Escolha a senha que você vai usar para entrar na área da parceira.</p>
          ${campoSenhaHTML('pc-nova-senha', 'Sua senha', true)}
          <p class="dica-tam erro" data-erro hidden></p>
          <button class="btn btn-preto btn-bloco" type="submit">Salvar a senha e entrar</button>
        </form>`;
      const form = $('#pc-nova', caixa);
      const erro = $('[data-erro]', form);
      ligarVerSenha(form);
      form.senha.focus();
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (form.senha.value.length < 6) { erro.hidden = false; erro.textContent = ERROS.senha; return; }
        const botao = $('button[type=submit]', form);
        botao.disabled = true;
        try {
          const r = await P.novaSenha(codigo, form.senha.value);
          if (r.ok) return mostrarPainel();
          erro.hidden = false;
          erro.textContent = ERROS[r.erro] || ERROS.codigo;
        } catch (ex) {
          erro.hidden = false;
          erro.textContent = 'Não deu para salvar agora. Tente de novo.';
        }
        botao.disabled = false;
      });
    }

    // ----- Painel -----
    async function mostrarPainel(silencioso = false) {
      if (!silencioso) caixa.innerHTML = '<p class="acomp-carregando">Buscando suas vendas…</p>';
      let r;
      try {
        r = await P.painel();
      } catch (ex) {
        if (silencioso) return;
        caixa.innerHTML = '<h1 class="titulo">Área da parceira</h1><p class="acomp-cancelado">Não deu para buscar seus dados agora. Confira a internet.</p><button class="btn btn-preto btn-bloco" type="button" data-de-novo>Tentar de novo</button>';
        $('[data-de-novo]', caixa).addEventListener('click', () => mostrarPainel());
        return;
      }
      if (!r.ok) return mostrarEntrada('entrar', 'Sua sessão terminou. Entre de novo.');
      const d = r.parceira;
      const primeiro = String(d.nome || '').split(' ')[0];
      if (d.status === 'pendente' || d.status === 'recusada') {
        pararVigia();
        caixa.innerHTML = `<span class="sobre">Área da parceira</span>
          <h1 class="titulo">Oi, ${esc(primeiro)}!</h1>
          ${d.status === 'pendente'
            ? `<p class="acomp-esperando"><b>Recebemos seu cadastro.</b> A Paola vai analisar e te avisa pelo WhatsApp. Quando for aprovado, seu cupom aparece aqui.</p>`
            : '<p class="acomp-cancelado">Seu cadastro não foi aprovado desta vez. Se quiser conversar, fale com a Paola.</p>'}
          <a class="btn btn-claro btn-bloco" href="${esc(zapPaola(`Oi, Paola! Sou ${d.nome} e fiz meu cadastro de parceira.`))}" target="_blank" rel="noopener">${I.whats}Falar com a Paola</a>
          <button class="link-tam envio-copiar" type="button" data-sair>Sair</button>`;
        $('[data-sair]', caixa).addEventListener('click', sair);
        return;
      }
      const s = r.resumo || {};
      const vendas = r.vendas || [];
      if (silencioso && ultimaContagem !== null && vendas.length > ultimaContagem) toast(vendas.length - ultimaContagem > 1 ? 'Novas vendas com o seu cupom!' : 'Nova venda com o seu cupom!');
      ultimaContagem = vendas.length;
      const abertos = new Set($$('details[open][data-guardar]', caixa).map((x) => x.dataset.guardar));
      const disponivel = Number(s.comissao_disponivel || 0);
      caixa.innerHTML = `<span class="sobre">Área da parceira</span>
        <h1 class="titulo">Oi, ${esc(primeiro)}!</h1>
        ${d.status === 'pausada' ? '<p class="acomp-cancelado">Seu cupom está pausado: por enquanto ele não dá desconto. As comissões que você já tem continuam valendo. Fale com a Paola.</p>' : ''}
        <section class="pc-cupom">
          <small>Seu cupom</small>
          <b>${esc(d.cupom || '')}</b>
          <p>Suas seguidoras ganham <b>${d.desconto}% de desconto</b> nos produtos e você ganha <b>${d.comissao}% de comissão</b>.</p>
          <div class="pc-botoes">
            <button class="btn btn-preto" type="button" data-copiar="${esc(d.cupom || '')}" data-msg="Cupom copiado">Copiar cupom</button>
            <button class="btn btn-claro" type="button" data-copiar="${esc(linkCupom(d.cupom || ''))}" data-msg="Link copiado">Copiar link com desconto</button>
          </div>
          <small class="pc-link">${esc(linkCupom(d.cupom || '').replace(/^https?:\/\//, ''))}</small>
        </section>
        <div class="pc-kpis">
          <div class="pc-kpi"><small>Vendas confirmadas</small><b>${Number(s.vendas || 0)}</b><span>${Number(s.vendas_mes || 0)} neste mês</span></div>
          <div class="pc-kpi"><small>Aguardando pagamento</small><b>${Number(s.aguardando || 0)}</b><span>${Number(s.comissao_aguardando || 0) > 0 ? `${brl(Number(s.comissao_aguardando))} em comissão, se pagarem` : 'pedidos ainda não pagos'}</span></div>
          <div class="pc-kpi"><small>Comissão a liberar</small><b>${brl(Number(s.comissao_a_liberar || 0))}</b><span>no prazo de troca</span></div>
          <div class="pc-kpi pc-kpi-destaque"><small>Disponível</small><b>${disponivel < 0 ? `−${brl(-disponivel)}` : brl(disponivel)}</b><span>pagamento em ${r.proximo_pagamento ? diaMes(r.proximo_pagamento) : '—'}</span></div>
          <div class="pc-kpi pc-kpi-largo"><small>Já recebido</small><b>${brl(Number(s.comissao_recebida || 0))}</b><span>${(r.pagamentos || []).length} pagamento${(r.pagamentos || []).length === 1 ? '' : 's'}</span></div>
        </div>
        <section class="acomp-meus pc-vendas"><h2>Suas vendas</h2>
          ${vendas.length ? vendas.map((v) => `<div class="pc-venda pc-${esc(v.situacao)}">
              <div><b>${esc(v.cliente || 'Cliente')}</b><small>${esc([v.cidade, v.uf].filter(Boolean).join('/'))}${v.cidade ? ' · ' : ''}${dataBR(v.em)} às ${horaBR(v.em)}</small>
                <small>${esc(v.pagamento || '')}${v.pagamento ? ' · ' : ''}<span class="pc-etapa etapa-${esc(v.status)}">${esc(ETAPA[v.status] || v.status)}</span></small></div>
              <div class="pc-com"><b>${brl(Number(v.comissao || 0))}</b><small>${esc(situacaoTxt(v))}</small></div>
            </div>`).join('') : `<p class="conta-vazio">Ainda não há vendas com o seu cupom. Divulgue o link: cada compra aparece aqui na hora.</p>`}
        </section>
        <details class="pc-detalhe" data-guardar="pagamentos" ${abertos.has('pagamentos') ? 'open' : ''}><summary>Pagamentos recebidos</summary>
          ${(r.pagamentos || []).length ? `<div class="acomp-meus">${r.pagamentos.map((g) => `<div class="pc-venda"><div><b>${brl(Number(g.valor))}</b><small>${dataBR(g.pago_em)}${g.referencia ? ` · ${esc(g.referencia)}` : ''}</small></div><div class="pc-com"><small>${g.pedidos} venda${g.pedidos === 1 ? '' : 's'}</small></div></div>`).join('')}</div>` : '<p class="conta-vazio">Nenhum pagamento ainda.</p>'}
        </details>
        <details class="pc-detalhe" data-guardar="regras" ${abertos.has('regras') ? 'open' : ''}><summary>Como funciona a parceria</summary>${regrasHTML(r.regras || regrasLoja(), d)}</details>
        <p class="pc-atualizado">Atualizado às ${horaBR(new Date())}. A página atualiza sozinha.</p>
        <p class="conta-pe">Conta: <b>${esc(d.email)}</b>${d.pix ? ` · Pix: ${esc(d.pix)}` : ''}</p>
        <a class="link-tam envio-copiar" href="${esc(zapPaola(`Oi, Paola! Sou ${d.nome}, parceira do cupom ${d.cupom}.`))}" target="_blank" rel="noopener">Falar com a Paola</a>
        <button class="link-tam envio-copiar" type="button" data-sair>Sair</button>`;
      $$('[data-copiar]', caixa).forEach((b) => b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(b.dataset.copiar); toast(b.dataset.msg); } catch (ex) { toast('Não deu para copiar. Tente de novo.'); }
      }));
      $('[data-sair]', caixa).addEventListener('click', sair);
      // Tempo real: confere a cada 20 segundos enquanto a página está à vista
      if (!vigia) {
        vigia = setInterval(() => { if (document.visibilityState === 'visible') mostrarPainel(true); }, 20000);
      }
    }

    function sair() {
      pararVigia();
      P.sair();
      ultimaContagem = null;
      mostrarEntrada('entrar');
    }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && vigia) mostrarPainel(true); });

    if (codigo) mostrarNovaSenha();
    else if (P.atual() && !querCadastro) mostrarPainel();
    else mostrarEntrada(querCadastro ? 'cadastro' : 'entrar');
  }

  window.telaParceira = telaParceira;
  window.linkCadastroParceira = linkCadastro;
})();
