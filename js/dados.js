// =============================================================
// Paola Corpus Fit — dados do protótipo
// Produtos, combos, tabela de medidas, WhatsApp e Instagram são os
// da marca. Preços das peças avulsas são ilustrativos; os dos combos
// são os divulgados no Instagram. A moda praia é uma prévia de lançamento.
// =============================================================

const LOJA = {
  whatsapp: 'https://wa.me/message/KA2EJDP4FVMGD1',
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
    nome: 'Cinta de Zíper 30 Barbatanas',
    cat: 'cintas',
    preco: 229.9,
    img: 'img/cinta.webp',
    img2: 'img/cinta-detalhe.webp',
    galeria: ['img/cinta.webp', 'img/cinta-detalhe.webp', 'img/cinta-dia-a-dia.webp'],
    selo: 'Mais vendida',
    tamanhos: true,
    frase: 'Não sobra, não enrola, não machuca.',
    desc: 'A queridinha da Paola. Fecha com zíper e colchetes e tem 30 barbatanas que seguram a cinta no lugar o dia todo, sem enrolar. Modela a cintura e segura a barriga.',
    pontos: ['Zíper + 3 fileiras de colchetes', '30 barbatanas flexíveis', 'Do abaixo do busto até o quadril'],
    uso: 'Nos primeiros dias, feche na regulagem de colchetes mais externa. Quando o corpo acostumar, passe para a do meio.',
  },
  {
    id: 'sutia-reforcado',
    nome: 'Sutiã Reforçado',
    cat: 'sutias',
    preco: 139.9,
    img: 'img/sutia.webp',
    tamanhos: true,
    frase: 'Sustenta, levanta e não marca o ombro.',
    desc: 'Sustenta e levanta o busto com alças largas que não marcam o ombro. Combina com a cinta para um contorno completo.',
    pontos: ['Alças largas e acolchoadas', 'Levanta e sustenta', 'Combina com a cinta'],
    uso: 'Use junto com a cinta para o contorno ficar completo, do busto ao quadril.',
  },
  {
    id: 'gel-pimenta',
    nome: 'Gel Termo Ativo Pimenta Negra 200 g',
    curto: 'Gel Pimenta Negra',
    cat: 'tratamento',
    preco: 59.9,
    img: 'img/gel.webp',
    frase: 'Massagem que aquece antes da cinta.',
    desc: 'Gel termo ativo da Néctar. Massageie na barriga antes de colocar a cinta: aquece a região e completa a rotina de modelagem.',
    pontos: ['Aquece a região', 'Massagem antes da cinta', 'Tubo de 200 g'],
    uso: 'Aplique na barriga e nas laterais, massageie até absorver e vista a cinta em seguida.',
  },
  {
    id: 'creme-pimenta',
    nome: 'Creme de Massagem Pimenta Negra',
    curto: 'Creme Pimenta Negra',
    cat: 'tratamento',
    preco: 49.9,
    img: 'img/creme.webp',
    frase: 'O tratamento em casa, todo dia.',
    desc: 'Creme para massagem modeladora. Use com a cinta para completar o tratamento em casa.',
    pontos: ['Massagem modeladora', 'Pote de 200 g', 'Uso diário'],
    uso: 'Massageie com movimentos de baixo para cima, de preferência todos os dias.',
  },
];

const KITS = [
  {
    id: 'combo-modelagem',
    nome: 'Combo Modelagem + Tratamento',
    cat: 'kits',
    selo: 'O que mais sai',
    itens: ['cinta-ziper-30', 'sutia-reforcado', 'gel-pimenta'],
    de: 910,
    preco: 410,
    desc: 'O combo que mais sai: cinta, sutiã reforçado e o gel para a massagem.',
  },
  {
    id: 'combao',
    nome: 'Combão Completo',
    cat: 'kits',
    itens: ['cinta-ziper-30', 'sutia-reforcado', 'gel-pimenta', 'creme-pimenta'],
    de: 980,
    preco: 449,
    desc: 'Tudo para modelar e tratar: cinta, sutiã, gel e creme de massagem.',
  },
  {
    id: 'combo-duplo',
    nome: 'Combo Duplo Barriga',
    cat: 'kits',
    itens: ['cinta-ziper-30', 'gel-pimenta'],
    de: 289.8,
    preco: 259.9,
    desc: 'Cinta e gel para tratar a área abdominal.',
  },
];

// Tabela de medidas oficial (medida da cintura)
const TABELA = [
  { t: 'PP', min: 58, max: 64, calca: '34 a 36' },
  { t: 'P', min: 65, max: 72, calca: '38 a 40' },
  { t: 'M', min: 73, max: 80, calca: '40 a 42' },
  { t: 'G', min: 81, max: 88, calca: '44' },
  { t: 'GG', min: 89, max: 98, calca: '46 a 48' },
  { t: 'XG', min: 99, max: 110, calca: '50 a 52' },
  { t: 'EG', min: 111, max: 130, calca: '54 ou mais' },
];

// Prévia da coleção de moda praia (lançamento)
const PRAIA = [
  { id: 'maio-modelador', nome: 'Maiô Modelador', img: 'img/praia-maio-modelador.webp', selo: 'Destaque', cores: ['#1F1A17', '#B03A5B', '#1D6A86'] },
  { id: 'biquini-cintura-alta', nome: 'Biquíni Cintura Alta', img: 'img/praia-cintura-alta.webp', selo: 'Segura a barriga', cores: ['#7A1F33', '#1F1A17', '#1D6A86'] },
  { id: 'biquini-cortininha', nome: 'Biquíni Cortininha', img: 'img/praia-cortininha.webp', cores: ['#E9705E', '#1F1A17', '#F4A259'] },
  { id: 'maio-tomara-que-caia', nome: 'Maiô Tomara que Caia', img: 'img/praia-tomara-que-caia.webp', cores: ['#1E6B4F', '#1F1A17', '#E9705E'] },
  { id: 'biquini-hot-pant', nome: 'Biquíni Hot Pant', img: 'img/praia-hot-pant.webp', cores: ['#1F1A17', '#E8A3B4', '#F4A259'] },
  { id: 'saida-de-praia', nome: 'Saída de Praia', img: 'img/praia-saida.webp', cores: ['#D9622B', '#F7DDE3', '#1F1A17'] },
];
