// =============================================================
// Paola Corpus Fit — pagamento dentro do site (Mercado Pago)
// O formulário é o componente oficial do Mercado Pago: número do cartão e código de segurança
// são digitados em campos dele e nunca passam por este código nem pelo nosso servidor.
// Quanto cobrar e se foi pago quem decide é o servidor; esta página só mostra.
// Tudo que vem de fora entra na tela por textContent ou esc().
// =============================================================
window.telaPagamento = function telaPagamento() {
  const caixa = document.querySelector('#pagamento');
  const id = new URLSearchParams(location.search).get('p') || '';
  const linkPedido = `acompanhar.html?p=${encodeURIComponent(id)}`;
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
    dados: 'Confira os dados preenchidos e tente de novo.',
    recusado: 'O pagamento não foi aceito. Confira os dados ou tente outra forma de pagamento.',
  };

  const iniciar = async () => {
    const d = await Catalogo.pagamento({ acao: 'dados', id }).catch(() => ({}));
    if (d.encerrado) { location.replace(linkPedido); return; }
    if (d.erro === 'conferir') return falha('Seu pedido está registrado', 'A Paola vai conferir os valores e te chama no WhatsApp para fechar o pagamento. Se preferir, fale com ela agora.');
    if (!d.ok) return falha('Não deu para abrir o pagamento', 'Seu pedido está registrado. Fale com a Paola para pagar.');

    const mp = new MercadoPago(d.publica, { locale: 'pt-BR' });
    const bricks = mp.bricks();
    let controle = null;
    let controleStatus = null;
    let vigia = null;

    caixa.innerHTML = `<span class="sobre">Pedido <span data-numero></span></span>
      <h1 class="titulo">Pagamento</h1>
      <ul class="pag-itens">${d.itens.map((x) => `<li>${esc(x.qtd || 1)}x ${esc(x.nome)}${x.tam ? `<small>Tamanho ${esc(x.tam)}</small>` : ''}</li>`).join('')}</ul>
      <div class="pag-valores">
        <div><small>No Pix</small><b>${brl(d.pix)}</b></div>
        <div><small>No cartão, em até ${esc(d.parcelas)}x</small><b>${brl(d.cartao)}</b></div>
      </div>
      <p class="dica-tam erro" data-aviso hidden></p>
      <div id="paymentBrick_container"></div>
      <div id="statusScreenBrick_container"></div>
      <div data-depois></div>
      <p class="pag-seguro">${I.escudo}<span>Os dados do cartão vão direto para o Mercado Pago. A loja não vê nem guarda o número do seu cartão.</span></p>`;
    caixa.querySelector('[data-numero]').textContent = d.numero;
    const aviso = caixa.querySelector('[data-aviso]');
    const depois = caixa.querySelector('[data-depois]');
    const mostrarAviso = (t) => { aviso.hidden = !t; aviso.textContent = t || ''; };

    const fecharFormulario = async () => {
      try { await controle?.unmount(); } catch (e) { /* já estava fechado */ }
      controle = null;
      caixa.querySelector('#paymentBrick_container').innerHTML = '';
    };

    const enviar = async (formData) => {
      mostrarAviso('');
      const r = await Catalogo.pagamento({ acao: 'pagar', id, tentativa: novoId(), dados: formData, device: window.MP_DEVICE_SESSION_ID || '' }).catch(() => ({}));
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
      mostrarStatus(r);
    };

    const fecharStatus = async () => {
      clearInterval(vigia);
      try { await controleStatus?.unmount(); } catch (e) { /* já estava fechado */ }
      controleStatus = null;
      caixa.querySelector('#statusScreenBrick_container').innerHTML = '';
    };

    const abrirFormulario = async () => {
      depois.innerHTML = '';
      await fecharStatus();
      // Se o formulário não aparecer (internet ruim, Mercado Pago fora do ar), a cliente não fica olhando para o vazio
      const demora = setTimeout(() => mostrarAviso('O formulário está demorando para abrir. Atualize a página ou fale com a Paola.'), 15000);
      controle = await bricks.create('payment', 'paymentBrick_container', {
        initialization: { amount: d.cartao },
        customization: {
          paymentMethods: { creditCard: 'all', debitCard: 'all', bankTransfer: ['pix'], maxInstallments: d.parcelas },
          visual: { style: { customVariables: { baseColor: '#B03A5B' } } },
        },
        callbacks: {
          onReady: () => clearTimeout(demora),
          onError: () => { clearTimeout(demora); mostrarAviso('Não deu para carregar o formulário. Atualize a página ou fale com a Paola.'); },
          onSubmit: ({ formData }) => enviar(formData),
        },
      });
    };

    const confirmado = async () => {
      await fecharStatus();
      depois.innerHTML = `<p class="acomp-pago">${I.ok}<span><b>Pagamento aprovado!</b> A Paola já recebeu seu pedido e confere seu tamanho antes de enviar.</span></p>
        <a class="btn btn-preto btn-bloco" href="${esc(linkPedido)}">Acompanhar meu pedido</a>`;
    };

    async function mostrarStatus(r) {
      if (r.status === 'approved') return confirmado();
      controleStatus = await bricks.create('statusScreen', 'statusScreenBrick_container', {
        initialization: {
          paymentId: r.pagamento_id,
          ...(r.desafio ? { additionalInfo: { externalResourceURL: r.desafio.url, creq: r.desafio.creq } } : {}),
        },
        callbacks: { onReady: () => {}, onError: () => {} },
      });
      depois.innerHTML = `<p class="dica-tam">Assim que o pagamento for aprovado, esta página atualiza sozinha.</p>
        ${r.pix ? '<button class="link-tam envio-copiar" type="button" data-outro>Pagar de outro jeito</button>' : ''}`;
      depois.querySelector('[data-outro]')?.addEventListener('click', abrirFormulario);
      let voltas = 0;
      clearInterval(vigia);
      vigia = setInterval(async () => {
        voltas += 1;
        if (voltas > 180) return clearInterval(vigia);
        const s = await Catalogo.pagamento({ acao: 'situacao', id }).catch(() => ({}));
        if (s.pago) return confirmado();
        // Cartão em análise que acabou recusado, ou Pix cancelado: volta para o formulário
        if (s.status === 'rejected' || s.status === 'cancelled') {
          await abrirFormulario();
          mostrarAviso('O pagamento não foi aprovado. Tente outro cartão ou o Pix.');
        }
      }, 5000);
    }

    if (d.aberto?.pagamento_id) mostrarStatus({ pagamento_id: d.aberto.pagamento_id, status: 'pending', pix: d.aberto.pix });
    else await abrirFormulario();
  };
  iniciar().catch(() => falha('Não deu para abrir o pagamento', 'Seu pedido está registrado. Fale com a Paola para pagar.'));
};
