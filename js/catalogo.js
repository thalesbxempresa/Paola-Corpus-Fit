// =============================================================
// Paola Corpus Fit — catálogo e envio de pedidos
// Junta js/dados.js com o que foi editado no painel, antes de a loja desenhar a tela.
// Sem Supabase, as edições valem só no navegador de quem editou.
// Sem biblioteca: a loja só faz chamadas simples, para continuar leve no celular.
// =============================================================
const Catalogo = (() => {
  const CHAVE = 'pcf-catalogo';
  const FILA = 'pcf-fila';
  const { url, chave } = PCF_SUPABASE;
  const ligado = !!(url && chave);
  const copia = (v) => JSON.parse(JSON.stringify(v));
  const padrao = copia({ loja: LOJA, tabela: TABELA, produtos: PRODUTOS, kits: KITS, praia: PRAIA });
  // O caminho de compra do site é montado em cima destes itens: dá para editar, não para apagar ou esconder
  const FIXOS = ['combo-5', 'combo-duplo', 'cinta-ziper-30', 'cinta-ziper-20'];

  const ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const parse = (txt) => { try { return JSON.parse(txt); } catch (e) { return null; } };

  // O texto do painel entra no HTML da loja: sem isso, um " ou < quebraria a página
  const seguro = (v) => {
    if (typeof v === 'string') return v.replace(/[<>"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    if (Array.isArray(v)) return v.map(seguro);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, seguro(x)]));
    return v;
  };

  // Um catálogo incompleto nunca chega na loja: nesse caso ela segue com o que já tem
  const valido = (d) => {
    if (!d || ![d.produtos, d.kits, d.praia, d.tabela].every(Array.isArray) || !d.tabela.length) return false;
    const ids = new Set([...d.produtos, ...d.kits].map((x) => x.id));
    return FIXOS.every((id) => ids.has(id)) && d.kits.every((k) => [...(k.itens || []), ...(k.escolha || [])].every((i) => ids.has(i)));
  };

  const trocar = (lista, novos) => { lista.length = 0; lista.push(...novos); };
  const aplicar = (doc) => {
    const d = seguro(doc);
    Object.assign(LOJA, d.loja);
    trocar(TABELA, d.tabela);
    trocar(PRODUTOS, d.produtos);
    trocar(KITS, d.kits);
    trocar(PRAIA, d.praia);
    trocar(NUMEROS, TABELA.flatMap((x) => x.calca));
    trocar(TAMANHOS_PRAIA, TABELA.map((x) => x.t));
    // Do estoque, a loja só recebe o que o banco libera: o que acabou ou, com a chave ligada, as quantidades
    ESTOQUE.itens = d.estoque?.itens && typeof d.estoque.itens === 'object' ? d.estoque.itens : {};
    ESTOQUE.mostrar = LOJA.mostrarEstoque === true;
  };

  // Chave pública só no cabeçalho apikey: é o que o Supabase pede para as chaves sb_publishable
  const rpc = (nome, corpo, extra) => fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: { apikey: chave, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo || {}),
    ...extra,
  });

  const cacheTxt = ler(CHAVE);
  const cache = parse(cacheTxt);
  const temCache = valido(cache);
  if (temCache) aplicar(cache);

  // Quem já visitou vê a última versão na hora e a nova chega por trás; só a 1ª visita espera (no máximo 1,5 s).
  // Se o banco estiver fora do ar, a loja continua vendendo com o que tem.
  const pronto = (() => {
    if (!ligado || document.body.dataset.pagina === 'admin') return Promise.resolve();
    const inicio = Date.now();
    const buscar = rpc('catalogo_publico').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!valido(d)) return;
      const txt = JSON.stringify(d);
      if (txt === cacheTxt) return;
      const guardou = gravar(CHAVE, txt);
      aplicar(d);
      // Preço mudou: atualiza a tela logo no início, nunca com a cliente já mexendo na página
      if (temCache && guardou && Date.now() - inicio < 2500) { try { sessionStorage.setItem('pcf-recarga', '1'); } catch (e) { /* ok */ } location.reload(); }
    }).catch(() => {});
    return temCache ? Promise.resolve() : Promise.race([buscar, new Promise((ok) => { setTimeout(ok, 1500); })]);
  })();

  // Contadores por dia, sem nada que identifique a pessoa. Cada etapa conta uma vez por sessão.
  function evento(tipo) {
    try {
      if (sessionStorage.getItem(`pcf-ev-${tipo}`)) return;
      sessionStorage.setItem(`pcf-ev-${tipo}`, '1');
    } catch (e) { /* sem armazenamento: conta do mesmo jeito */ }
    if (ligado) {
      rpc('registrar_evento', { p_tipo: tipo }, { keepalive: true }).catch(() => {});
      return;
    }
    if (!ler('pcf-admin-conta')) return; // Sem banco, só faz sentido contar no navegador do admin
    const dia = new Date().toLocaleDateString('en-CA');
    const ev = parse(ler('pcf-eventos')) || {};
    ev[dia] = ev[dia] || {};
    ev[dia][tipo] = (ev[dia][tipo] || 0) + 1;
    gravar('pcf-eventos', JSON.stringify(ev));
  }

  // O pedido fica numa fila até o banco confirmar: se a internet cair, vai na próxima visita.
  // O WhatsApp não depende disso: a venda continua mesmo com o banco fora do ar.
  function enviar(p) {
    rpc('registrar_pedido', { p }, { keepalive: true }).then((r) => {
      if (!r.ok && r.status !== 400) return; // 400 = recusado pelo banco: tentar de novo não adianta
      const resto = (parse(ler(FILA)) || []).filter((x) => x.id !== p.id);
      gravar(FILA, JSON.stringify(resto));
    }).catch(() => {});
  }
  function enviarPedido(p) {
    if (!ligado) return;
    gravar(FILA, JSON.stringify([...(parse(ler(FILA)) || []), p].slice(-20)));
    enviar(p);
  }
  if (ligado && document.body.dataset.pagina !== 'admin') (parse(ler(FILA)) || []).forEach(enviar);

  // Acompanhamento pelo link do pedido ({ p_id })
  async function acompanhar(filtro) {
    const r = await rpc('acompanhar_pedido', filtro);
    if (r.status === 400) return null; // Link adulterado: mesmo caso de não encontrar
    if (!r.ok) throw new Error('Acompanhamento indisponível');
    return r.json();
  }
  // Sem o link: os pedidos do WhatsApp + CEP usados na compra (lista, do mais novo para o mais antigo)
  async function buscarPedidos(telefone, cep) {
    const r = await rpc('buscar_pedidos', { p_telefone: telefone, p_cep: cep });
    if (!r.ok) throw new Error('Acompanhamento indisponível');
    const lista = await r.json();
    return Array.isArray(lista) ? lista : [];
  }

  // Pagamento no site. O pedido precisa estar no banco antes de abrir o pagamento: o servidor cobra com o que está lá
  const funcaoPagamento = (corpo) => fetch(`${url}/functions/v1/pagamento-mercadopago`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  }).then(async (r) => ({ ...(await r.json().catch(() => ({}))), ok: r.ok }));
  async function pagar(p) {
    const r = await rpc('registrar_pedido', { p });
    if (!r.ok) throw new Error('Pedido não registrado');
    gravar(FILA, JSON.stringify((parse(ler(FILA)) || []).filter((x) => x.id !== p.id)));
    return `pagamento.html?p=${encodeURIComponent(p.id)}`;
  }

  // Conta da cliente: login próprio da loja (e-mail e senha), para ela ver os pedidos em qualquer aparelho.
  // A sessão é um código que fica neste aparelho; o banco guarda só a impressão digital dele.
  const conta = (() => {
    const CONTA = 'pcf-conta';
    const atual = () => {
      const c = parse(ler(CONTA));
      return ligado && c && typeof c.sessao === 'string' && c.sessao.length === 64 ? c : null;
    };
    const esquecer = () => { try { localStorage.removeItem(CONTA); } catch (e) { /* ok */ } };
    const guardar = (r) => {
      // admin: o e-mail desta conta é da administração da loja (só mostra o atalho do painel)
      if (r && r.ok && r.sessao) gravar(CONTA, JSON.stringify({ sessao: r.sessao, email: r.cliente?.email || '', nome: r.cliente?.nome || '', admin: r.cliente?.admin === true }));
      return r;
    };
    const chamar = async (nome, corpo, extra) => {
      const r = await rpc(nome, corpo, extra);
      if (!r.ok) throw new Error('Conta indisponível');
      return r.json();
    };
    // Com a sessão: se o banco disser que ela não vale mais, o aparelho sai da conta
    const comSessao = async (nome, corpo, extra) => {
      const c = atual();
      if (!c) return { ok: false, erro: 'sessao' };
      const r = await chamar(nome, { p_sessao: c.sessao, ...corpo }, extra);
      if (r && r.erro === 'sessao') esquecer();
      return r;
    };
    return {
      atual,
      criar: (email, senha, nome, telefone) => chamar('cliente_criar', { p_email: email, p_senha: senha, p_nome: nome || '', p_telefone: telefone || '' }).then(guardar),
      entrar: (email, senha) => chamar('cliente_entrar', { p_email: email, p_senha: senha }).then(guardar),
      novaSenha: (codigo, senha) => chamar('cliente_nova_senha', { p_codigo: codigo, p_senha: senha }).then(guardar),
      async pedidos() {
        const r = await comSessao('cliente_pedidos');
        const c = atual();
        if (r.ok && c && r.cliente) gravar(CONTA, JSON.stringify({ ...c, email: r.cliente.email || c.email, nome: r.cliente.nome || c.nome, admin: r.cliente.admin === true }));
        return r;
      },
      // Liga pedidos à conta: { p_id } pelo link do pedido ou { p_telefone, p_cep } da compra
      vincular: (filtro) => comSessao('cliente_vincular', filtro),
      // Sacola salva na conta: { ok, sacola, em }. Ao sair da página, a gravação vai com keepalive
      lerSacola: () => comSessao('cliente_sacola'),
      guardarSacola: (itens, saindo = false) => comSessao('cliente_guardar_sacola', { p_sacola: itens }, saindo ? { keepalive: true } : undefined),
      sair() {
        const c = atual();
        esquecer();
        if (c) rpc('cliente_sair', { p_sessao: c.sessao }, { keepalive: true }).catch(() => {});
      },
    };
  })();

  // Cupom de parceira: o banco diz se vale (só parceira ativa) e quanto é o desconto
  async function validarCupom(codigo) {
    if (!ligado) return { ok: false };
    const r = await rpc('cupom_validar', { p_codigo: String(codigo || '').trim() });
    if (!r.ok) throw new Error('Cupom indisponível');
    return r.json();
  }

  // Área da parceira (parceira.html): login próprio, separado do painel e da conta das clientes
  const parceira = (() => {
    const CHAVE_P = 'pcf-parceira';
    const atual = () => {
      const c = parse(ler(CHAVE_P));
      return ligado && c && typeof c.sessao === 'string' && c.sessao.length === 64 ? c : null;
    };
    const esquecer = () => { try { localStorage.removeItem(CHAVE_P); } catch (e) { /* ok */ } };
    const guardar = (r) => {
      if (r && r.ok && r.sessao) gravar(CHAVE_P, JSON.stringify({ sessao: r.sessao, nome: r.parceira?.nome || '' }));
      return r;
    };
    const chamar = async (nome, corpo) => {
      const r = await rpc(nome, corpo);
      if (!r.ok) throw new Error('Área da parceira indisponível');
      return r.json();
    };
    return {
      atual,
      cadastrar: (dados) => chamar('parceira_cadastrar', { p: dados }).then(guardar),
      entrar: (email, senha) => chamar('parceira_entrar', { p_email: email, p_senha: senha }).then(guardar),
      novaSenha: (codigo, senha) => chamar('parceira_nova_senha', { p_codigo: codigo, p_senha: senha }).then(guardar),
      async painel() {
        const c = atual();
        if (!c) return { ok: false, erro: 'sessao' };
        const r = await chamar('parceira_painel', { p_sessao: c.sessao });
        if (r && r.erro === 'sessao') esquecer();
        return r;
      },
      sair() {
        const c = atual();
        esquecer();
        if (c) rpc('parceira_sair', { p_sessao: c.sessao }, { keepalive: true }).catch(() => {});
      },
    };
  })();

  // Versão crua para o painel (sem o tratamento de HTML da loja)
  const doc = () => {
    const salvo = parse(ler(CHAVE));
    return valido(salvo) ? { ...copia(salvo), loja: { ...padrao.loja, ...salvo.loja } } : copia(padrao);
  };
  const salvarLocal = (d) => {
    if (!gravar(CHAVE, JSON.stringify(d))) return false;
    aplicar(d);
    return true;
  };
  const restaurar = () => {
    try { localStorage.removeItem(CHAVE); } catch (e) { /* ok */ }
    aplicar(padrao);
  };

  return { ligado, FIXOS, pronto, doc, valido, salvarLocal, restaurar, evento, enviarPedido, acompanhar, buscarPedidos, pagar, pagamento: funcaoPagamento, conta, validarCupom, parceira };
})();
