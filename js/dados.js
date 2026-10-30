// =============================================================
// Paola Corpus Fit — dados do protótipo
// Produtos, preços e combos passados pela Paola (áudios de 29/10/2026).
// Sutiã, gel e creme ainda não têm preço avulso: aparecem só nos combos.
// A moda praia é uma prévia de lançamento.
// =============================================================

const LOJA = {
  whatsapp: 'https://wa.me/message/KA2EJDP4FVMGD1',
  // Com o número da Paola (só dígitos, ex.: 5521999999999) o pedido já abre escrito na conversa
  whatsappNumero: '',
  instagram: 'https://www.instagram.com/paolacorpusfit/',
  antesDepois: 'https://www.instagram.com/stories/highlights/18047489036211417/',
  arroba: '@paolacorpusfit',
  cidade: 'Rio de Janeiro, RJ',
  freteGratis: 299,
  pix: 0.05,
  parcelas: 6,
};

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
    selo: 'A melhor',
    tamanhos: true,
    frase: 'Não dobra, não enrola, não machuca.',
    desc: 'Feita para a maior reclamação de quem usa cinta: dobrar e enrolar. São 30 barbatanas na frente e nas laterais que seguram a cinta no lugar, mesmo quando você senta. Modela a cintura, segura a barriga e melhora a postura. Tecido cetinete pós-cirúrgico e antialérgico, 4 camadas, zíper na frente e 2 regulagens de colchete por dentro.',
    pontos: ['30 barbatanas: não dobra, não enrola', 'Modela a cintura e melhora a postura', 'Ajuda no pós-parto e no pós-procedimento', 'Tecido cetinete pós-cirúrgico e antialérgico'],
    uso: 'Use no dia a dia e na atividade física. Comece pela regulagem mais folgada e passe para a mais justa quando o corpo acostumar.',
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
    frase: 'A mesma cinta, com 20 barbatanas.',
    desc: 'A mesma cinta da Paola, para quem quer começar gastando menos. Mesma modelagem, mesmo tecido cetinete pós-cirúrgico e antialérgico, zíper na frente e 2 regulagens de colchete por dentro. A única diferença: 20 barbatanas em vez de 30, então segura um pouco menos firme.',
    pontos: ['20 barbatanas: não dobra, não enrola', 'Modela a cintura e melhora a postura', 'Ajuda no pós-parto e no pós-procedimento', 'Tecido cetinete pós-cirúrgico e antialérgico'],
    uso: 'Use no dia a dia e na atividade física. Comece pela regulagem mais folgada e passe para a mais justa quando o corpo acostumar.',
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
    img: 'img/real-gel.webp',
    frase: 'Auxilia na redução de medidas e celulite.',
    desc: 'Gel termoativo de pimenta negra da Néctar, de rápida absorção. Auxilia na redução de medidas e celulite e é perfeito para usar junto com a cinta.',
    pontos: ['Tubo de 200 g', 'Rápida absorção', 'Para usar com a cinta'],
    uso: 'Aplique na barriga e nas laterais, massageie até absorver e vista a cinta em seguida.',
  },
  {
    id: 'creme-pimenta',
    nome: 'Creme para Massagem Pimenta Negra',
    curto: 'Creme de massagem',
    cat: 'tratamento',
    preco: null,
    img: 'img/real-creme.webp',
    frase: 'A massagem modeladora em casa.',
    desc: 'Creme para massagem de pimenta negra da Rhenuks, de uso profissional. Vem no Kit Completo.',
    pontos: ['Rhenuks, uso profissional', 'Massagem modeladora', 'Vem no Kit Completo'],
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
    selo: 'O que mais sai',
    img: 'img/real-combo-5.webp',
    itens: ['cinta-ziper-30', 'sutia-reforcado', 'sutia-reforcado', 'gel-pimenta', 'creme-pimenta'],
    de: 1089,
    preco: 479,
    frase: 'O combo mais completo da Paola.',
    desc: 'O combo que mais sai: a cinta de 30 barbatanas, 2 sutiãs reforçados, o gel termoativo e o creme para massagem.',
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

// Avaliações de EXEMPLO: o espaço será preenchido com os antes e depois reais das clientes
const AVALIACOES = [
  { foto: 'img/cliente-1.webp', nome: 'Cliente de exemplo', cidade: 'Niterói, RJ', tam: 'G', calca: 44, produto: 'Cinta 30 Barbatanas', texto: 'Uso o dia todo e ninguém percebe. Não enrola quando eu sento, que era o que me incomodava nas outras.' },
  { foto: 'img/cliente-2.webp', nome: 'Cliente de exemplo', cidade: 'São Paulo, SP', tam: 'M', calca: 40, produto: 'Kit Completo', texto: 'Escolhi pelo número da calça e a Paola confirmou comigo no WhatsApp. Veio certinho.' },
  { foto: null, nome: 'Cliente de exemplo', cidade: 'Belo Horizonte, MG', tam: 'GG', calca: 46, produto: 'Combo Duplo', texto: 'Peguei com o gel por só R$ 30 a mais. A cinta não dobra nem quando pego meu filho no colo.' },
];
