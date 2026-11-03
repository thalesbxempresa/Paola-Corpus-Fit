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

## O que cada um pode fazer

| Quem | Pode | Não pode |
|---|---|---|
| Cliente (sem login) | Ler o catálogo, registrar pedido, somar contador do funil | Ler pedidos, alterar preço, alterar catálogo |
| Administrador | Tudo no painel | - |

O total do pedido é sempre recalculado no banco com os preços de lá. Se o valor enviado pelo site não bater, o pedido entra marcado como **Conferir valor**.

## Limites que continuam valendo

- Qualquer pessoa consegue enviar um pedido falso, como em qualquer formulário público. Ele entra como *Aguardando* e não conta no faturamento até alguém marcar como pago. Se isso virar problema, a saída é um captcha.
- Pedidos guardam nome e endereço (dados pessoais). A loja é a controladora pela LGPD; exclua os que não precisar mais guardar.
