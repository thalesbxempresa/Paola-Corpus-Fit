// =============================================================
// Paola Corpus Fit — frete pelo CEP, sem cadastro em transportadora
// O CEP diz o estado (faixas de CEP dos Correios). A distância entre a capital do estado de origem
// e a do estado da cliente escolhe a faixa, como os Correios fazem nas tarifas nacionais.
// Valor e prazo de cada faixa ficam no painel (Loja > Frete). O painel grava em cada faixa os estados
// que ela cobre, e o banco usa essa mesma lista ao registrar o pedido (uf_do_cep e frete_do_pedido em schema.sql).
// Mudou alguma faixa de CEP aqui? Mude também em uf_do_cep.
// =============================================================
const Frete = (() => {
  // [primeiros 5 dígitos do CEP: de, até, estado]
  const CEPS = [
    [1000, 19999, 'SP'], [20000, 28999, 'RJ'], [29000, 29999, 'ES'], [30000, 39999, 'MG'],
    [40000, 48999, 'BA'], [49000, 49999, 'SE'], [50000, 56999, 'PE'], [57000, 57999, 'AL'],
    [58000, 58999, 'PB'], [59000, 59999, 'RN'], [60000, 63999, 'CE'], [64000, 64999, 'PI'],
    [65000, 65999, 'MA'], [66000, 68899, 'PA'], [68900, 68999, 'AP'], [69000, 69299, 'AM'],
    [69300, 69399, 'RR'], [69400, 69899, 'AM'], [69900, 69999, 'AC'], [70000, 72799, 'DF'],
    [72800, 72999, 'GO'], [73000, 73699, 'DF'], [73700, 76799, 'GO'], [76800, 76999, 'RO'],
    [77000, 77999, 'TO'], [78000, 78899, 'MT'], [79000, 79999, 'MS'], [80000, 87999, 'PR'],
    [88000, 89999, 'SC'], [90000, 99999, 'RS'],
  ];
  // Capital de cada estado (latitude, longitude)
  const CAPITAIS = {
    AC: [-9.97, -67.81], AL: [-9.67, -35.74], AP: [0.03, -51.07], AM: [-3.12, -60.02], BA: [-12.97, -38.5],
    CE: [-3.73, -38.52], DF: [-15.79, -47.88], ES: [-20.32, -40.34], GO: [-16.68, -49.25], MA: [-2.53, -44.3],
    MT: [-15.6, -56.1], MS: [-20.47, -54.62], MG: [-19.92, -43.94], PA: [-1.46, -48.5], PB: [-7.12, -34.86],
    PR: [-25.43, -49.27], PE: [-8.05, -34.88], PI: [-5.09, -42.8], RJ: [-22.91, -43.17], RN: [-5.79, -35.21],
    RS: [-30.03, -51.23], RO: [-8.76, -63.9], RR: [2.82, -60.67], SC: [-27.6, -48.55], SP: [-23.55, -46.63],
    SE: [-10.91, -37.07], TO: [-10.18, -48.33],
  };
  // Limite de cada faixa em km. 0 = mesmo estado; null = acima da faixa anterior
  const LIMITES = [0, 800, 1300, 2000, 2500, null];

  const digitos = (cep) => String(cep ?? '').replace(/\D/g, '');
  const uf = (cep) => {
    const d = digitos(cep);
    if (d.length !== 8) return null;
    const n = Number(d.slice(0, 5));
    return CEPS.find(([de, ate]) => n >= de && n <= ate)?.[2] || null;
  };
  const km = (a, b) => {
    const [la1, lo1] = CAPITAIS[a];
    const [la2, lo2] = CAPITAIS[b];
    const r = (g) => (g * Math.PI) / 180;
    const h = Math.sin(r(la2 - la1) / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(r(lo2 - lo1) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  };
  // Os estados de cada faixa, saindo do estado do CEP de origem (o painel grava isso nas faixas)
  const estadosPorFaixa = (cepOrigem) => {
    const origem = uf(cepOrigem);
    const faixas = LIMITES.map(() => []);
    if (!origem) return faixas;
    Object.keys(CAPITAIS)
      .map((e) => [e, e === origem ? 0 : km(origem, e)])
      .sort((a, b) => a[1] - b[1])
      .forEach(([e, d]) => {
        const i = e === origem ? 0 : LIMITES.findIndex((l, j) => j > 0 && (l === null || d <= l));
        faixas[i].push(e);
      });
    return faixas;
  };
  const nomeFaixa = (i, origem) => (i === 0 ? `No mesmo estado${origem ? ` (${origem})` : ''}`
    : LIMITES[i] === null ? `Acima de ${LIMITES[i - 1].toLocaleString('pt-BR')} km` : `Até ${LIMITES[i].toLocaleString('pt-BR')} km`);

  // Frete ligado só com todas as faixas preenchidas: nunca cobra um valor que a loja não definiu
  const ligado = (loja) => {
    const f = loja?.frete;
    return f?.ligado === true && Array.isArray(f.faixas) && f.faixas.length > 0
      && f.faixas.every((x) => Number.isFinite(x.valor) && x.valor >= 0 && Number.isInteger(x.dias) && x.dias > 0 && Array.isArray(x.ufs));
  };
  // Mesma conta do banco (frete_do_pedido). null: frete desligado, a loja segue como antes.
  // { erro: 'cep' } quando o CEP não tem 8 números ou não é do Brasil
  const calcular = (loja, cep, produtos) => {
    if (!ligado(loja)) return null;
    const e = uf(cep);
    if (!e) return { erro: 'cep' };
    const faixa = loja.frete.faixas.find((x) => x.ufs.includes(e));
    if (!faixa) return { erro: 'cep' };
    const gratis = Number.isFinite(loja.freteGratis) && produtos >= loja.freteGratis;
    return { uf: e, valor: gratis ? 0 : Math.round(faixa.valor * 100) / 100, cheio: faixa.valor, dias: faixa.dias, gratis };
  };

  return { uf, km, LIMITES, estadosPorFaixa, nomeFaixa, ligado, calcular };
})();
