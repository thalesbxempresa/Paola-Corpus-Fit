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

A cliente acompanha em `acompanhar.html`, pelo link que vai na mensagem do pedido ou digitando o número do pedido e o CEP. Ela vê etapas, datas, rastreio, itens, cidade e o primeiro nome. Endereço, sobrenome e anotações internas nunca aparecem. As datas de cada etapa são registradas pelo próprio banco.

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

## O que cada um pode fazer

| Quem | Pode | Não pode |
|---|---|---|
| Cliente (sem login) | Ler o catálogo, registrar pedido, somar contador do funil, acompanhar o próprio pedido | Ler a lista de pedidos, alterar preço, alterar catálogo |
| Administrador | Tudo no painel | - |

O total do pedido é sempre recalculado no banco com os preços de lá. Se o valor enviado pelo site não bater, o pedido entra marcado como **Conferir valor**.

## Limites que continuam valendo

- Qualquer pessoa consegue enviar um pedido falso, como em qualquer formulário público. Ele entra como *Aguardando* e não conta no faturamento até alguém marcar como pago. Se isso virar problema, a saída é um captcha.
- Pedidos guardam nome e endereço (dados pessoais). A loja é a controladora pela LGPD; exclua os que não precisar mais guardar.
