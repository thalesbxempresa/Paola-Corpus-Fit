// =============================================================
// Paola Corpus Fit — dados de reserva da loja (o catálogo que vale vem do banco)
// Produtos, preços e combos passados pela Paola (áudios de 29/10/2026).
// Sutiã, gel e creme ainda não têm preço avulso: aparecem só nos combos.
// A moda praia é uma prévia de lançamento.
// =============================================================

const LOJA = {
  whatsapp: 'https://wa.me/message/KA2EJDP4FVMGD1',
  // Com o número da Paola (só dígitos, ex.: 5521999999999) o pedido já abre escrito na conversa
  whatsappNumero: '',
  // Data real do lançamento da moda praia (ex.: '2026-12-01T10:00:00-03:00'). Vazia: a contagem não aparece
  lancamentoPraia: '',
  instagram: 'https://www.instagram.com/paolacorpusfit/',
  antesDepois: 'https://www.instagram.com/stories/highlights/18047489036211417/',
  arroba: '@paolacorpusfit',
  cidade: 'Conceição de Macabu, RJ',
  freteGratis: 299,
  pix: 0.05,
  // Sem juros (a loja assume, igual ao "parcelado vendedor" do Mercado Pago) e o máximo no cartão, com juros para a cliente acima disso
  parcelas: 2,
  parcelasMax: 6,
  // Pagamento no site pelo Mercado Pago: liga pelo painel (aba Loja). Desligado, a Paola manda o link no WhatsApp
  pagarNoSite: true,
  // Mostrar para a cliente quantas peças há no tamanho escolhido (liga no painel, em Produtos > Estoque)
  mostrarEstoque: false,
  // Frete pelo CEP (painel > Loja > Frete; regras em js/frete.js). O que vale é a tabela do banco; esta é só a de reserva.
  // PAC de balcão dos Correios, 1 kg, caixa 30 x 25 x 8 cm, do CEP 28740-000, consultas de 23/11/2026.
  // Em cada faixa, o maior valor e o maior prazo consultados (capitais: RJ; SP e SC; BA; PB; PA; AM e RR)
  frete: {
    ligado: false,
    cepOrigem: '28740000',
    faixas: [
      { valor: 29.8, dias: 6, ufs: ['RJ'] },
      { valor: 43.4, dias: 8, ufs: ['MG', 'SP', 'ES', 'PR', 'SC'] },
      { valor: 71, dias: 7, ufs: ['DF', 'GO', 'RS', 'BA', 'MS'] },
      { valor: 97.2, dias: 8, ufs: ['SE', 'TO', 'MT', 'AL', 'PE', 'PB', 'PI'] },
      { valor: 115.3, dias: 10, ufs: ['RN', 'CE', 'MA', 'PA'] },
      { valor: 155.1, dias: 29, ufs: ['AP', 'RO', 'AM', 'AC', 'RR'] },
    ],
  },
};

// Estoque que o banco libera para a loja. Item que não está aqui não é contado e fica sempre à venda
const ESTOQUE = { mostrar: false, itens: {} };

const PRODUTOS = [
  {
    id: 'cinta-ziper-30',
    nome: 'Cinta Faixa de Zíper 30 Barbatanas',
    curto: 'Cinta 30 Barbatanas',
    cat: 'cintas',
    barbatanas: 30,
    de: 650,
    preco: 369.99,
    img: 'img/real-cinta.webp',
    img2: 'img/real-cinta-costas.webp',
    galeria: [
      { src: 'img/real-cinta.webp', txt: 'Zíper na frente' },
      { src: 'img/real-cinta-detalhe.webp', txt: 'Zíper + 2 regulagens de colchete por dentro' },
      { src: 'img/real-cinta-curvas.webp', txt: 'Barbatanas na frente e nas laterais' },
      { src: 'img/real-cinta-costas.webp', txt: 'Não dobra e não enrola' },
      { src: 'img/real-cinta-fechando.webp', txt: 'Fecha em segundos' },
    ],
    selo: 'Mais firmeza',
    tamanhos: true,
    frase: 'Não dobra, não enrola, não machuca.',
    desc: 'Fechou o zíper, a cintura aparece na hora. São 30 barbatanas na frente e nas laterais segurando a cinta no lugar o dia inteiro: você senta, se abaixa e treina, e ela não dobra nem enrola. Alta nas costas, com tecido cetinete de 4 camadas, zíper na frente e 2 regulagens de colchete por dentro.',
    pontos: ['30 barbatanas: não dobra, não enrola', 'Afina a cintura na hora', 'Alta nas costas, com sensação de apoio', 'Tecido cetinete de 4 camadas', 'Zíper na frente e 2 regulagens por dentro'],
    uso: 'Use no dia a dia e na atividade física. Comece pela regulagem mais folgada e passe para a mais justa quando o corpo acostumar. No pós-parto, use com a liberação do seu médico.',
  },
  {
    id: 'cinta-ziper-20',
    nome: 'Cinta Faixa de Zíper 20 Barbatanas',
    curto: 'Cinta 20 Barbatanas',
    cat: 'cintas',
    barbatanas: 20,
    de: 500,
    preco: 279.99,
    img: 'img/real-cinta-20.webp',
    img2: 'img/real-cinta-detalhe.webp',
    galeria: [
      { src: 'img/real-cinta-20.webp', txt: 'Mesma modelagem da cinta de 30' },
      { src: 'img/real-cinta-detalhe.webp', txt: 'Zíper + 2 regulagens de colchete por dentro' },
      { src: 'img/real-cinta-costas.webp', txt: 'Não dobra e não enrola' },
    ],
    tamanhos: true,
    frase: 'A mesma cinta, com 20 barbatanas: não dobra, não enrola.',
    desc: 'Fechou o zíper, a cintura aparece na hora. É a mesma cinta da Paola, com 20 barbatanas segurando no lugar e um preço menor. Mesma modelagem, alta nas costas, tecido cetinete de 4 camadas, zíper na frente e 2 regulagens de colchete por dentro. Se quiser ainda mais firmeza na frente e nas laterais, tem a de 30.',
    pontos: ['20 barbatanas: não dobra, não enrola', 'Afina a cintura na hora', 'Alta nas costas, com sensação de apoio', 'Tecido cetinete de 4 camadas', 'Zíper na frente e 2 regulagens por dentro'],
    uso: 'Use no dia a dia e na atividade física. Comece pela regulagem mais folgada e passe para a mais justa quando o corpo acostumar. No pós-parto, use com a liberação do seu médico.',
  },
  {
    id: 'sutia-reforcado',
    nome: 'Sutiã Reforçado',
    curto: 'Sutiã reforçado',
    plural: 'Sutiãs reforçados',
    cat: 'sutias',
    preco: null,
    img: 'img/real-sutia.webp',
    galeria: [
      { src: 'img/real-sutia.webp' },
      { src: 'img/real-sutia-detalhe.webp', txt: 'Fechamento na frente' },
    ],
    frase: 'Sustenta o busto e completa o contorno.',
    desc: 'Sutiã reforçado com fechamento na frente. Completa o contorno junto com a cinta e vem nos combos.',
    pontos: ['Fechamento na frente', '2 unidades no Kit Completo', 'Opção no Combo Duplo'],
  },
  {
    id: 'gel-pimenta',
    nome: 'Gel Termoativo Pimenta Negra 200 g',
    curto: 'Gel termoativo',
    cat: 'tratamento',
    preco: null,
    img: 'img/produto-gel.webp',
    frase: 'Esquenta na pele, absorve rápido e já pode vestir a cinta.',
    desc: 'Gel termoativo de pimenta negra da Néctar: você sente esquentar na pele, ele absorve rápido e você já veste a cinta.',
    pontos: ['Termoativo: esquenta na pele', 'Rápida absorção', 'Tubo de 200 g'],
    uso: 'Aplique na barriga e nas laterais, massageie até absorver e vista a cinta em seguida.',
  },
  {
    id: 'creme-pimenta',
    nome: 'Creme para Massagem Pimenta Negra',
    curto: 'Creme de massagem',
    cat: 'tratamento',
    preco: null,
    img: 'img/produto-creme.webp',
    frase: 'A massagem de uso profissional, agora em casa.',
    desc: 'Creme para massagem de pimenta negra da Rhenuks, de uso profissional. Vem no Kit Completo.',
    pontos: ['Rhenuks, uso profissional', 'Pimenta negra', 'Vem no Kit Completo'],
  },
];

// Combos: o de 5 produtos é o que mais sai e fica sempre em destaque
const KITS = [
  {
    id: 'combo-5',
    nome: 'Kit Completo Adeus Pochete',
    chamada: 'Adeus, pochete!',
    sub: 'Leve 5 produtos',
    cat: 'kits',
    selo: 'Mais completo',
    img: 'img/real-combo-5.webp',
    itens: ['cinta-ziper-30', 'sutia-reforcado', 'sutia-reforcado', 'gel-pimenta', 'creme-pimenta'],
    de: 1089,
    preco: 479.99,
    frase: 'Cinta de 30, 2 sutiãs, gel e creme, com frete grátis.',
    desc: 'Tudo para usar a cinta todo dia: a cinta de 30 barbatanas, 2 sutiãs reforçados (ninguém merece ter um sutiã só), o gel termoativo e o creme de massagem. E chega com frete grátis.',
  },
  {
    id: 'combo-duplo',
    nome: 'Combo Duplo',
    sub: 'Você escolhe: gel ou sutiã',
    cat: 'kits',
    selo: 'Você escolhe',
    img: 'img/real-combo-duplo.webp',
    itens: ['cinta-ziper-30'],
    escolha: ['gel-pimenta', 'sutia-reforcado'],
    de: 750,
    preco: 399.99,
    frase: 'Só R$ 30 a mais que a cinta sozinha.',
    gancho: 'Só R$ 30 a mais que a cinta sozinha',
    desc: 'A cinta de 30 barbatanas + o gel termoativo ou o sutiã reforçado, você escolhe. Sai só R$ 30 a mais que a cinta sozinha.',
  },
];

// Tamanho pelo número de calça/short (a cinta estica, então medida em cm não ajuda).
// Faixas montadas a partir dos exemplos da Paola (P veste 38/40, G veste 42/44, XGG até 52):
// confirmar a tabela oficial com ela.
const TABELA = [
  { t: 'P', calca: [36, 38] },
  { t: 'M', calca: [40] },
  { t: 'G', calca: [42, 44] },
  { t: 'GG', calca: [46] },
  { t: 'XG', calca: [48] },
  { t: 'XGG', calca: [50, 52] },
];
const NUMEROS = TABELA.flatMap((x) => x.calca);

// Prévia da coleção de moda praia (lançamento)
// foco = o que a peça resolve (usado nos filtros); biquini = entra no "monte seu biquíni"
const PRAIA = [
  { id: 'maio-modelador', nome: 'Maiô Modelador', img: 'img/praia-maio-modelador.webp', selo: 'Destaque', foco: ['barriga'], cores: ['#1F1A17', '#B03A5B', '#1D6A86'] },
  { id: 'biquini-cintura-alta', nome: 'Biquíni Cintura Alta', img: 'img/praia-cintura-alta.webp', selo: 'Segura a barriga', foco: ['barriga'], biquini: true, cores: ['#7A1F33', '#1F1A17', '#1D6A86'] },
  { id: 'biquini-sustenta', nome: 'Biquíni Sustenta Busto', img: 'img/praia-busto.webp', selo: 'Busto grande', foco: ['busto'], biquini: true, cores: ['#1F2F55', '#1F1A17', '#7A1F33'] },
  { id: 'biquini-asa-delta', nome: 'Biquíni Asa Delta', img: 'img/praia-asa-delta.webp', foco: ['bumbum'], biquini: true, cores: ['#E9705E', '#1F1A17', '#F4A259'] },
  { id: 'maio-tomara-que-caia', nome: 'Maiô Tomara que Caia', img: 'img/praia-tomara-que-caia.webp', foco: ['barriga'], cores: ['#1E6B4F', '#1F1A17', '#E9705E'] },
  { id: 'biquini-hot-pant', nome: 'Biquíni Hot Pant', img: 'img/praia-hot-pant.webp', foco: ['barriga', 'bumbum'], biquini: true, cores: ['#1F1A17', '#E8A3B4', '#F4A259'] },
  { id: 'biquini-cortininha', nome: 'Biquíni Cortininha', img: 'img/praia-cortininha.webp', foco: ['bumbum'], biquini: true, cores: ['#E9705E', '#1F1A17', '#F4A259'] },
  { id: 'saida-de-praia', nome: 'Saída de Praia', img: 'img/praia-saida.webp', foco: [], cores: ['#D9622B', '#F7DDE3', '#1F1A17'] },
];
const FOCOS_PRAIA = [['todos', 'Todos'], ['barriga', 'Segura a barriga'], ['busto', 'Sustenta o busto'], ['bumbum', 'Valoriza o bumbum']];
const TAMANHOS_PRAIA = TABELA.map((x) => x.t);

// Avaliações reais das clientes (com autorização). Vazio: o site mostra só o convite para ver as clientes no Instagram
// Formato: { foto: 'img/...', nome, cidade, tam, calca, produto, texto }
const AVALIACOES = [];
