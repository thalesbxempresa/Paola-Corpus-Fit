# Conectar a loja ao Supabase

Enquanto `js/config.js` estiver vazio, o painel (`admin.html`) funciona só no navegador de quem abriu. Depois destes passos, pedidos e edições passam a valer para todas as clientes.

## Passo a passo

1. **Crie o projeto na conta da cliente.** Região: São Paulo (a região não muda depois). Plano grátis pausa o projeto após 1 semana sem uso; para vender de verdade, use o Pro.
2. **Rode o banco.** Em *SQL Editor*, cole todo o `supabase/schema.sql` e clique em *Run*. Pode rodar de novo sem perder dados.
3. **Libere o endereço do painel.** Em *Authentication > URL Configuration*:
   - *Site URL*: o endereço da loja.
   - *Redirect URLs*: `https://SEU-DOMINIO/admin.html`
4. **Conecte o site.** Em *Settings > API Keys*, copie a URL do projeto e a chave **publishable** (`sb_publishable_...`) para `js/config.js`:

   ```js
   const PCF_SUPABASE = { url: 'https://xxxx.supabase.co', chave: 'sb_publishable_...' };
   ```

   Essa chave é pública por natureza: quem protege os dados são as regras do `schema.sql`. **A chave secreta (`sb_secret_...`) nunca entra no site nem no GitHub.**
5. **Publique o site** e abra `/admin.html`.
6. **Crie a conta de administrador**: clique em *Primeiro acesso? Criar conta*, use o e-mail do administrador e escolha a senha. Confirme pelo link do e-mail e entre. Na primeira entrada, o catálogo atual vai sozinho para o banco.
7. **Feche o cadastro.** Em *Authentication > Sign In / Providers*, desligue *Allow new users to sign up*. O botão de criar conta some sozinho do painel.

Se desligar a confirmação por e-mail (*Confirm email*), feche o cadastro logo depois de criar a conta: sem a confirmação, quem criar primeiro uma conta com o e-mail do administrador entra como administrador.

## Se o e-mail de confirmação não chegar

O servidor de e-mail padrão do Supabase só envia para quem faz parte da equipe do projeto, e tem limite baixo por hora. Duas saídas:

- Convide o e-mail do administrador para a equipe (*Organization > Team*) e tente de novo; ou
- Crie a conta direto no painel do Supabase: *Authentication > Users > Add user > Create new user*, escolha a senha e marque *Auto Confirm User*.

Para "esqueci a senha" funcionar para qualquer pessoa, configure um SMTP próprio em *Authentication > Emails*.

## Quem é administrador

A tabela `admins` guarda a impressão digital (SHA-256) do e-mail, porque este repositório é público. Só entra no painel quem está nela **e** confirmou o e-mail. Para incluir a Paola, rode no SQL Editor (trocando o e-mail):

```sql
insert into public.admins values (encode(sha256(convert_to(lower('email@dela.com'), 'UTF8')), 'hex'));
```

Com o cadastro fechado, crie a conta dela em *Authentication > Users > Add user > Create new user*, com *Auto Confirm User*.

## Acompanhamento do pedido

A cliente acompanha em `acompanhar.html`, pelo link que vai na mensagem do pedido ou digitando o WhatsApp e o CEP de entrega que usou na compra (função `buscar_pedidos`; não precisa do número do pedido). O WhatsApp vale com ou sem o 55 e com ou sem o 9 da frente: o banco compara o DDD e os 8 últimos números. Com mais de um pedido, ela escolhe na lista. Ela vê etapas, datas, rastreio, itens, cidade e o primeiro nome. Endereço, sobrenome e anotações internas nunca aparecem. As datas de cada etapa são registradas pelo próprio banco.

## Aviso de pedido novo

A cada pedido do site, o banco chama a função `avisar-pedido`, que manda uma notificação aos aparelhos que ligaram o aviso no painel (Início ou Loja). Não usa serviço pago nem chave para configurar: as chaves do envio são geradas pela própria função e ficam numa tabela que só o servidor lê. O aviso vai vazio de propósito, para nome, endereço e valor não passarem pelos servidores do Google e da Apple.

Para instalar em um projeto novo:

1. Em `schema.sql`, troque o endereço em `pedido_avisar` pelo do novo projeto e rode o arquivo.
2. Em *Edge Functions*, crie a função `avisar-pedido` com o conteúdo de `supabase/functions/avisar-pedido/index.ts`.
3. Nos detalhes da função, desligue *Enforce JWT verification*: quem chama é o banco, sem login.

No iPhone (iOS 16.4 ou mais novo), o aviso só funciona com o painel adicionado à tela de início: Compartilhar > Adicionar à Tela de Início, e abrir pelo ícone. Cada aparelho precisa ligar o aviso uma vez.

## Pagamento online (Mercado Pago)

Vem desligado. A Paola escolhe no painel (aba Loja) como a cliente paga: combinando no WhatsApp (como hoje), por um link que ela libera no pedido, ou no próprio site logo depois de pedir. Nos dois casos online, a cliente paga na página `pagamento.html` da loja, sem sair do site. Quem fala com o Mercado Pago é a função `pagamento-mercadopago`, pela **API de Orders** (a API de Payments, mais antiga, está sendo descontinuada).

Como fica seguro:

- O número do cartão é digitado nos campos do próprio Mercado Pago (Payment Brick). Ele não passa pelo site nem pelo banco.
- O valor cobrado sai sempre do pedido no banco. Pedido com valor que não bateu com a tabela (marcado para conferir) nunca é cobrado online.
- Pedido só vira pago depois de consultar o Mercado Pago. Aviso (webhook) sem assinatura válida é recusado.
- Cada pedido, cada aparelho e a loja têm limite de tentativas, contra teste de cartão roubado.
- CPF e e-mail de quem paga vão direto para o Mercado Pago. Não são gravados no banco nem nos registros.
- Só a página `pagamento.html` carrega o código do Mercado Pago. As regras de segurança do site estão em `vercel.json`.

Para ligar, nesta ordem:

1. Rode o `schema.sql` de novo.
2. Em *Edge Functions*, crie a função `pagamento-mercadopago` com o conteúdo de `supabase/functions/pagamento-mercadopago/index.ts` e desligue *Verify JWT* nela: quem chama é a loja e o Mercado Pago, sem login. A função confere por conta própria quem pode o quê.
3. Na conta do Mercado Pago da Paola, confira se existe uma **chave Pix cadastrada** (sem ela, o Pix não aparece). Em *Suas integrações*, crie uma aplicação do tipo **Checkout Transparente** com **API de Orders**.
4. Na aplicação, em *Configuração de webhooks*, coloque esta URL nas abas *Teste* e *Produção*, marque só o evento **Order (Mercado Pago)**, em "Outros eventos", e salve. Cada aba mostra a sua assinatura secreta.

   `https://jtqxvxghgncqiyougsgs.supabase.co/functions/v1/pagamento-mercadopago/webhook`

5. Em *Credenciais*, ative as credenciais de teste. Em *Edge Functions > Secrets* do Supabase, cadastre com os valores **de teste**: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET` e `MERCADOPAGO_AMBIENTE` com o valor `teste`. Para copiar a assinatura secreta do webhook, clique antes no olho: escondida, o campo tem só bolinhas, e são elas que vão para a área de transferência. Depois de salvar, use *Simular notificação* na aba *Teste* do webhook: tem de responder que foi enviada com sucesso.
6. No painel, aba Loja: nome, CPF ou CNPJ e endereço da loja, e escolha "Aqui no site".
7. Faça compras de teste com o cartão Mastercard 5480 8328 0103 3311, código 123, validade 11/30, CPF 12345678909 e um e-mail diferente do da conta. O nome escrito no cartão decide o resultado: `APRO` aprova, `OTHE` recusa, `APRO-CHOK` pede a confirmação do banco (3DS). Teste também um Pix. Em modo de teste, a função escreve no registro (*Logs*) o motivo quando o Mercado Pago recusa o pedido de cobrança, sem dados da cliente. Olhe também o console do navegador: se algum endereço do Mercado Pago aparecer bloqueado, ele precisa entrar em `vercel.json`.
8. Para vender de verdade, as chaves de produção ficam em três segredos próprios, ao lado dos de teste: `MERCADOPAGO_PROD_ACCESS_TOKEN`, `MERCADOPAGO_PROD_PUBLIC_KEY` e `MERCADOPAGO_PROD_WEBHOOK_SECRET` (a assinatura é a da aba *Produção* do webhook). Guardá-los não muda nada enquanto existir `MERCADOPAGO_AMBIENTE`. Na hora de vender, **apague** `MERCADOPAGO_AMBIENTE`: a função passa a usar só as chaves de produção. Para voltar a testar, crie de novo `MERCADOPAGO_AMBIENTE` com o valor `teste`. Os dois jogos nunca se misturam: sem as chaves de produção, o pagamento fica desligado em vez de usar as de teste.
9. Confira as **parcelas sem juros**. No painel (aba Loja) há dois números: *Parcelas sem juros*, que o site promete, e *Parcela no máximo em*. Quem assume os juros é a configuração *Parcelado vendedor* da conta do Mercado Pago (*Taxas e parcelas > Checkout > Por parcelamento*), e o número dela tem de ser igual ao de *Parcelas sem juros*. Acima disso, a cliente paga os juros. Se os números não baterem, a cliente pagaria juros numa parcela que o site chama de sem juros.

Já testado com as chaves de teste: cartão aprovado, Pix gerado na página e aviso simulado pelo painel do Mercado Pago. Ainda não testado: cartão recusado, confirmação do banco (3DS), Pix pago e uma venda real com as chaves de produção. Cartão de débito está desligado no formulário até ser testado.

Se o aviso do Mercado Pago atrasar, a página de pagamento e a de acompanhamento pedem para a função conferir a cobrança, então o pedido é confirmado mesmo assim enquanto a cliente estiver com a página aberta.

O site responde em `https://paolacorpusfit.com.br`. O domínio está registrado na Super Domínios e usa o DNS de lá (*Gerenciar DNS*): `@` do tipo A para `216.198.79.1` e `www` do tipo CNAME para o endereço que a Vercel mostra em *Domains*. O `www` redireciona para o endereço sem www (regra em `vercel.json`), e o endereço antigo `paolacorpusfit.vercel.app` continua funcionando.

Se o domínio mudar, atualize `SITE` e `ORIGENS` no começo da função e publique a função de novo. Sem isso, o navegador recusa o pagamento vindo do domínio novo, e o link de pagamento aponta para o endereço antigo. Atualize também *Authentication > URL Configuration* no Supabase.

Access Token e assinatura do webhook nunca entram no site nem no GitHub. A Public Key também fica no Supabase, para trocar de teste para produção sem publicar o site.

## Frete pelo CEP

Não precisa de cadastro nos Correios nem em outra transportadora. A cliente digita o CEP no produto, no carrinho ou ao finalizar, e o site mostra o frete e o prazo. O frete entra no total e é cobrado junto com o pedido. O desconto do Pix vale sobre o total, já com o frete.

- **Como calcula:** o CEP diz o estado, pelas faixas de CEP dos Correios. A distância entre a capital do estado de onde os pedidos saem e a capital do estado da cliente escolhe uma de 6 faixas: mesmo estado, até 800 km, até 1.300 km, até 2.000 km, até 2.500 km e acima disso. É o mesmo critério das tarifas nacionais dos Correios. As regras ficam em `js/frete.js`.
- **Valores:** no painel, em Loja > Frete, cada faixa tem o frete e o prazo em dias úteis, e mostra os estados que cobre. A chave "Calcular o frete pelo CEP" só liga com todas as faixas preenchidas. Desligada, a loja segue sem cobrar frete.
- **Como achar os valores:** no [simulador de preços e prazos dos Correios](https://www2.correios.com.br/sistemas/precosPrazos/), simule do CEP da loja para um CEP de cada faixa, com o peso e a caixa usados de verdade. O simulador bloqueia por um tempo quem faz muitas consultas seguidas.
- **Tabela ligada em 23/11/2026:** PAC de balcão, 1 kg, caixa 30 x 25 x 8 cm, saindo de 28740-000, para a capital de cada estado consultado. Em cada faixa, o maior valor e o maior prazo consultados:

  | Faixa | Consultado | Na tabela |
  |---|---|---|
  | Mesmo estado (RJ) | Rio R$ 29,80 (6 dias) | R$ 29,80, 6 dias |
  | Até 800 km | SP R$ 36,00 (7), SC R$ 43,40 (8) | R$ 43,40, 8 dias |
  | Até 1.300 km | BA R$ 71,00 (7) | R$ 71,00, 7 dias |
  | Até 2.000 km | PB R$ 97,20 (8) | R$ 97,20, 8 dias |
  | Até 2.500 km | PA R$ 115,30 (10) | R$ 115,30, 10 dias |
  | Acima de 2.500 km | AM R$ 115,30 (29), RR R$ 155,10 (24) | R$ 155,10, 29 dias |

  Não consultados: MG, ES, PR, DF, GO, RS, MS, SE, TO, MT, AL, PE, PI, RN, CE, MA, AP, RO e AC, nem cidades do interior. Vale conferir alguns no simulador e ajustar no painel.
- **Frete grátis:** com os produtos acima de "Frete grátis acima de", o frete é zero.
- **Quem garante o valor:** o banco refaz a conta ao registrar o pedido (`uf_do_cep` e `frete_do_pedido`), pela mesma tabela. Se o site mandou outro total, por exemplo com uma página aberta antes de a tabela mudar, o pedido entra marcado para conferir e não é cobrado online. O frete de cada pedido fica na coluna `frete` e aparece no painel e no acompanhamento.
- **Limites:** o valor é por faixa, não por peso nem por cidade. Um pedido com mais peças paga o mesmo frete, e o interior de um estado paga o mesmo que a capital. Revise a tabela quando os Correios reajustarem os preços, normalmente uma vez por ano. O prazo conta a partir da postagem.

## Gestão do pedido no painel

Cada pedido tem um próximo passo só (confirmar, preparar, enviar, entregar). O que foge disso aparece como pendência, numa fila própria em Início ("Precisam de atenção"), e o pedido com pendência fica fora de preparar, de enviar e do lote de etiquetas até alguém resolver.

- **Dinheiro devolvido (estorno):** se o pedido ainda não tinha sido enviado, a função de pagamento cancela o pedido sozinha, o estoque volta e ele sai do faturamento. Se já tinha sido enviado, o pedido continua como está, sai do faturamento e pede conferência.
- **Contestação no banco ou devolução de parte do valor:** o pedido para e pede conferência. Não é cancelado sozinho.
- **Cancelar pedido:** pede o motivo. Se a cliente tinha deixado um Pix ou cartão em aberto, a cobrança é cancelada no Mercado Pago antes, para ela não pagar um pedido cancelado. Cancelar **não devolve dinheiro**: pedido pago pelo site e cancelado fica como "Falta devolver o dinheiro" até a devolução ser feita no Mercado Pago (o aviso some sozinho) ou a loja marcar que devolveu de outro jeito.
- **Reabrir pedido:** volta para a etapa em que estava. Se o dinheiro foi devolvido, volta a esperar pagamento.
- **Editar pedido:** troca peça, tamanho e quantidade e corrige nome, WhatsApp e endereço. Em pedido já pago pelo site o valor cobrado não muda: o painel mostra a diferença para a loja acertar com a cliente. Em pedido ainda não pago, o valor é refeito e a cobrança antiga em aberto é cancelada. O banco acerta o estoque sozinho na troca.
- **Excluir pedido** e **corrigir a etapa** ficam em "Mais opções", porque são para engano, não para o dia a dia.

## Conta da cliente

Ao finalizar, depois dos dados de entrega e antes do pagamento, a cliente cria a conta (e-mail e senha) ou entra na que já tem. Dá para seguir sem conta: a venda vem antes do cadastro. Com a conta, ela abre **Minha conta** (`conta.html`, ícone no topo do site) em qualquer celular ou computador e vê os pedidos dela.

- **Login próprio da loja**, separado do login do painel: o Supabase Auth continua só para administradores e o cadastro público dele segue desligado. As contas ficam nas tabelas `clientes` e `clientes_sessoes`, que ninguém do site lê; tudo passa pelas funções `cliente_*`.
- **Sem e-mail de confirmação.** A senha fica embaralhada (bcrypt) e a sessão é um código guardado no aparelho dela; o banco guarda só a impressão digital desse código. Vale 180 dias, em até 10 aparelhos.
- **5 senhas erradas** seguidas travam a conta por 15 minutos.
- **Pedido entra na conta** quando é feito com ela aberta, quando ela entra num aparelho que já tinha pedidos, pelo link "Guardar este pedido na minha conta" na tela do pedido, ou pelo WhatsApp + CEP da compra em Minha conta (entram todos os pedidos com esses dados). Pedido que já é de uma conta não passa para outra.
- **Sacola salva na conta:** com a conta aberta, a sacola vai para o banco (`clientes.sacola`, funções `cliente_sacola` e `cliente_guardar_sacola`, até 30 linhas) e aparece em qualquer aparelho em que ela entrar. Vale a última mudança; ao entrar num aparelho, a sacola de lá se junta à da conta. Ao comprar, sai da sacola só o que foi comprado. Ao sair da conta, a sacola fica guardada na conta e sai daquele aparelho.
- **Esqueceu a senha:** hoje ela chama a Paola no WhatsApp ("Esqueci minha senha" abre a conversa). No painel, em Loja > Conta das clientes, a Paola digita o e-mail dela, gera o link e manda pelo WhatsApp. O link vale 48 horas e uma vez só.
- **Recuperação por e-mail (ainda desligada):** falta só o envio. Uma função do servidor chama `cliente_codigo_senha(e-mail)` (liberada só para o `service_role`), monta o link `conta.html?nova=<código>` e manda por um serviço de e-mail. A tela de senha nova já é a mesma.

## O que cada um pode fazer

| Quem | Pode | Não pode |
|---|---|---|
| Cliente (sem login) | Ler o catálogo, registrar pedido, somar contador do funil, acompanhar o próprio pedido | Ler a lista de pedidos, alterar preço, alterar catálogo |
| Cliente (com conta) | O mesmo, mais ver a lista dos pedidos dela (sem endereço nem telefone) | Ver pedido de outra conta, ler as tabelas de clientes |
| Administrador | Tudo no painel | - |

O total do pedido é sempre recalculado no banco com os preços de lá. Se o valor enviado pelo site não bater, o pedido entra marcado como **Conferir valor**.

## Limites que continuam valendo

- Qualquer pessoa consegue enviar um pedido falso, como em qualquer formulário público. Ele entra como *Aguardando* e não conta no faturamento até alguém marcar como pago. Se isso virar problema, a saída é um captcha.
- Pedidos guardam nome e endereço (dados pessoais). A loja é a controladora pela LGPD; exclua os que não precisar mais guardar.
