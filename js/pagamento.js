// =============================================================
// Paola Corpus Fit — pagamento dentro do site (Mercado Pago)
// O formulário é o componente oficial do Mercado Pago: número do cartão e código de segurança
// são digitados em campos dele e nunca passam por este código nem pelo nosso servidor.
// Quanto cobrar e se foi pago quem decide é o servidor; esta página só mostra.
// Tudo que vem de fora entra na tela por textContent, por propriedade do elemento ou por esc().
// =============================================================
window.telaPagamento = function telaPagamento() {
  const caixa = document.querySelector('#pagamento');
  const id = new URLSearchParams(location.search).get('p') || '';
  const linkPedido = `acompanhar.html?p=${encodeURIComponent(id)}`;
  // Sem juros até d.parcelas; acima disso, até d.parcelasMax, a cliente paga os juros
  const textoParcelas = (d) => {
    const sj = Number(d.parcelas) || 1;
    const max = Math.max(sj, Number(d.parcelasMax) || sj);
    if (max > sj) return sj > 1 ? `No cartão, ${sj}x sem juros ou até ${max}x` : `No cartão, em até ${max}x`;
    return sj > 1 ? `No cartão, em até ${sj}x sem juros` : 'No cartão, à vista';
  };
  const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)));

  const falha = (titulo, texto) => {
    caixa.innerHTML = `<h1 class="titulo">${titulo}</h1>
      <p class="acomp-cancelado">${texto}</p>
      <a class="btn btn-preto btn-bloco" href="${esc(LOJA.whatsapp)}" target="_blank" rel="noopener">${I.whats}Falar com a Paola</a>
      ${/^[0-9a-f-]{36}$/i.test(id) ? `<a class="link-tam envio-copiar" href="${esc(linkPedido)}">Ver meu pedido</a>` : ''}`;
  };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return falha('Pedido não encontrado', 'Confira o link do seu pedido ou fale com a Paola.');
  if (typeof MercadoPago === 'undefined') return falha('Não deu para abrir o pagamento', 'Algum bloqueador do navegador pode ter impedido o carregamento. Seu pedido está registrado: fale com a Paola para pagar.');

  const ERROS = {
    limite: 'Foram muitas tentativas neste pedido. Aguarde um pouco ou fale com a Paola.',
    em_andamento: 'Já tem um pagamento em andamento neste pedido. Aguarde alguns segundos.',
    pago: 'Este pedido já foi pago.',
    fechado: 'Este pedido não está mais aberto para pagamento.',
    conferir: 'A Paola precisa conferir este pedido antes do pagamento. Fale com ela no WhatsApp.',
    desligado: 'O pagamento pelo site não está disponível para este pedido. Fale com a Paola.',
    dados: 'Confira os dados preenchidos e tente de novo.',
    recusado: 'O pagamento não foi aceito. Confira os dados ou tente outra forma de pagamento.',
  };
  // Endereço que chega do servidor só entra na página se for https
  const https = (u) => { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch (e) { return null; } };

  const iniciar = async () => {
    const d = await Catalogo.pagamento({ acao: 'dados', id }).catch(() => ({}));
    if (d.encerrado) { location.replace(linkPedido); return; }
    if (d.erro === 'conferir') return falha('Seu pedido está registrado', 'A Paola vai conferir os valores e te chama no WhatsApp para fechar o pagamento. Se preferir, fale com ela agora.');
    if (!d.ok) return falha('Não deu para abrir o pagamento', 'Seu pedido está registrado. Fale com a Paola para pagar.');

    const mp = new MercadoPago(d.publica, { locale: 'pt-BR' });
    const bricks = mp.bricks();
    let controle = null;
    let vigia = null;
    let ouvinte = null;
    let consultando = false;

    caixa.innerHTML = `<span class="sobre">Pedido <span data-numero></span></span>
      <h1 class="titulo">Pagamento</h1>
      <ul class="pag-itens">${d.itens.map((x) => `<li>${esc(x.qtd || 1)}x ${esc(x.nome)}${x.tam ? `<small>Tamanho ${esc(x.tam)}</small>` : ''}</li>`).join('')}</ul>
      <div class="pag-valores">
        <div><small>No Pix</small><b>${brl(d.pix)}</b></div>
        <div><small>${textoParcelas(d)}</small><b>${brl(d.cartao)}</b></div>
      </div>
      <p class="dica-tam erro" data-aviso role="alert" hidden></p>
      <div id="paymentBrick_container"></div>
      <div class="pag-espera" data-espera></div>
      <p class="pag-seguro">${I.escudo}<span>Os dados do cartão vão direto para o Mercado Pago. A loja não vê nem guarda o número do seu cartão.</span></p>`;
    caixa.querySelector('[data-numero]').textContent = d.numero;
    const aviso = caixa.querySelector('[data-aviso]');
    const espera = caixa.querySelector('[data-espera]');
    const mostrarAviso = (t) => { aviso.hidden = !t; aviso.textContent = t || ''; };

    const pararEspera = () => {
      clearInterval(vigia);
      vigia = null;
      if (ouvinte) removeEventListener('message', ouvinte);
      ouvinte = null;
      espera.innerHTML = '';
    };
    const fecharFormulario = async () => {
      try { await controle?.unmount(); } catch (e) { /* já estava fechado */ }
      controle = null;
      caixa.querySelector('#paymentBrick_container').innerHTML = '';
    };

    const confirmado = () => {
      pararEspera();
      mostrarAviso('');
      espera.innerHTML = `<p class="acomp-pago">${I.ok}<span><b>Pagamento aprovado!</b> A Paola já recebeu seu pedido e confere seu tamanho antes de enviar.</span></p>
        <a class="btn btn-preto btn-bloco" href="${esc(linkPedido)}">Acompanhar meu pedido</a>`;
    };

    // O servidor é quem sabe se foi pago. Se o aviso do Mercado Pago atrasar, a própria pergunta faz o servidor conferir
    const consultar = async () => {
      if (consultando) return;
      consultando = true;
      const s = await Catalogo.pagamento({ acao: 'situacao', id }).catch(() => ({}));
      consultando = false;
      if (s.pago) return confirmado();
      if (s.status === 'rejected' || s.status === 'cancelled') {
        await abrirFormulario();
        mostrarAviso(s.status === 'cancelled' ? 'Esse pagamento venceu ou foi cancelado. Escolha de novo como quer pagar.' : 'O pagamento não foi aprovado. Tente outro cartão ou o Pix.');
      }
    };
    const vigiar = () => {
      let voltas = 0;
      clearInterval(vigia);
      vigia = setInterval(() => {
        voltas += 1;
        if (voltas > 180) { clearInterval(vigia); return; }
        consultar();
      }, 5000);
    };

    const enviar = async ({ selectedPaymentMethod, paymentMethod, formData }) => {
      mostrarAviso('');
      const r = await Catalogo.pagamento({ acao: 'pagar', id, tentativa: novoId(), metodo: selectedPaymentMethod || paymentMethod || '', dados: formData, device: window.MP_DEVICE_SESSION_ID || '' }).catch(() => ({}));
      if (!r.ok) {
        mostrarAviso(ERROS[r.erro] || 'Não deu para concluir agora. Tente de novo ou fale com a Paola.');
        if (r.erro === 'pago' || r.erro === 'fechado') location.replace(linkPedido);
        throw new Error('pagamento não concluído');
      }
      if (r.status === 'rejected') {
        mostrarAviso('O pagamento não foi aprovado. Confira os dados ou tente outro cartão ou o Pix.');
        throw new Error('pagamento recusado');
      }
      await fecharFormulario();
      mostrarEspera(r);
    };

    async function abrirFormulario() {
      pararEspera();
      if (controle) return;
      // Se o formulário não aparecer (internet ruim, Mercado Pago fora do ar), a cliente não fica olhando para o vazio
      const demora = setTimeout(() => mostrarAviso('O formulário está demorando para abrir. Atualize a página ou fale com a Paola.'), 15000);
      controle = await bricks.create('payment', 'paymentBrick_container', {
        initialization: { amount: d.cartao },
        customization: {
          // Cartão de crédito e Pix. Débito fica de fora até ser testado com a conta da loja
          paymentMethods: { creditCard: 'all', bankTransfer: ['pix'], maxInstallments: d.parcelasMax || d.parcelas },
          visual: { style: { customVariables: { baseColor: '#B03A5B' } } },
        },
        callbacks: {
          onReady: () => clearTimeout(demora),
          onError: () => { clearTimeout(demora); mostrarAviso('Não deu para carregar o formulário. Atualize a página ou fale com a Paola.'); },
          onSubmit: (dadosDoFormulario) => enviar(dadosDoFormulario),
        },
      });
    }

    // Pix: QR Code para quem está no computador e Copia e Cola para quem está no celular
    function blocoPix(qr) {
      const bloco = document.createElement('section');
      bloco.className = 'pag-pix';
      bloco.innerHTML = `<h2>Pague com Pix</h2>
        <ol class="pag-passos"><li>Abra o app do seu banco e escolha <b>Pix</b>.</li><li>Use <b>Pix Copia e Cola</b> ou leia o QR Code.</li><li>Pronto: esta página avisa quando o pagamento cair.</li></ol>
        <img class="pag-qr" alt="QR Code do Pix" width="220" height="220" hidden>
        <label for="pix-codigo">Pix Copia e Cola</label>
        <textarea class="pag-codigo" id="pix-codigo" rows="3" readonly></textarea>
        <button class="btn btn-preto btn-bloco" type="button" data-copiar-pix>Copiar código Pix</button>
        <a class="link-tam envio-copiar" data-pix-url target="_blank" rel="noopener" hidden>Abrir o QR Code em outra página</a>
        <p class="dica-tam">O código vale por 1 hora.</p>`;
      const campo = bloco.querySelector('.pag-codigo');
      campo.value = qr.codigo;
      if (typeof qr.imagem === 'string' && /^[A-Za-z0-9+/=]{20,400000}$/.test(qr.imagem)) {
        const img = bloco.querySelector('.pag-qr');
        img.src = `data:image/png;base64,${qr.imagem}`;
        img.hidden = false;
      }
      const url = qr.url && https(qr.url);
      if (url) {
        const link = bloco.querySelector('[data-pix-url]');
        link.href = url;
        link.hidden = false;
      }
      bloco.querySelector('[data-copiar-pix]').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(qr.codigo);
          toast('Código Pix copiado');
        } catch (e) {
          campo.focus();
          campo.select();
          toast('Selecione o código e copie');
        }
      });
      return bloco;
    }
    // Cartão: às vezes o banco pede uma confirmação. Ela abre aqui mesmo, numa janela do próprio banco
    function blocoBanco(endereco) {
      const bloco = document.createElement('section');
      bloco.className = 'pag-banco';
      bloco.innerHTML = `<h2>Confirme com o seu banco</h2>
        <p class="dica-tam">Seu banco pediu uma confirmação de segurança. É rápido e acontece aqui mesmo.</p>
        <iframe class="pag-banco-quadro" title="Confirmação de segurança do banco"></iframe>`;
      const quadro = bloco.querySelector('iframe');
      quadro.src = endereco;
      // O aviso da janela só adianta a consulta: quem confirma o pagamento é sempre o servidor
      ouvinte = (e) => { if (e.source === quadro.contentWindow && e.data && e.data.status === 'COMPLETE') consultar(); };
      addEventListener('message', ouvinte);
      return bloco;
    }

    function mostrarEspera(r) {
      if (r.status === 'approved') return confirmado();
      pararEspera();
      const qr = r.pix && r.qr && typeof r.qr.codigo === 'string' && r.qr.codigo ? r.qr : null;
      const banco = !qr && r.desafio ? https(r.desafio) : null;
      if (qr) espera.append(blocoPix(qr));
      else if (banco) espera.append(blocoBanco(banco));
      else espera.insertAdjacentHTML('beforeend', `<p class="acomp-esperando">${r.pix ? 'Seu Pix já foi gerado. Se você já pagou, é só aguardar.' : 'Seu pagamento está em análise.'}</p>`);
      espera.insertAdjacentHTML('beforeend', `<p class="dica-tam">Assim que o pagamento for aprovado, esta página atualiza sozinha.</p>
        <div class="pag-acoes"><button class="link-tam" type="button" data-conferir>${r.pix ? 'Já paguei' : 'Conferir agora'}</button><button class="link-tam" type="button" data-outro>Pagar de outro jeito</button></div>`);
      espera.querySelector('[data-conferir]').addEventListener('click', async (e) => {
        e.target.disabled = true;
        await consultar();
        if (e.target.isConnected) {
          e.target.disabled = false;
          toast(r.pix ? 'Ainda não caiu. Assim que cair, esta página avisa.' : 'Ainda não foi aprovado. Esta página avisa quando for.');
        }
      });
      espera.querySelector('[data-outro]').addEventListener('click', () => abrirFormulario());
      vigiar();
    }

    if (d.aberto) mostrarEspera({ status: 'pending', pix: !!d.aberto.pix, qr: { codigo: d.aberto.codigo, url: d.aberto.url } });
    else await abrirFormulario();
  };
  iniciar().catch(() => falha('Não deu para abrir o pagamento', 'Seu pedido está registrado. Fale com a Paola para pagar.'));
};
