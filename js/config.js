// =============================================================
// Conexão da loja com o Supabase
// Vazio: o painel funciona só neste navegador e a loja usa os dados de js/dados.js.
// "chave" é a chave pública (sb_publishable_...), feita para ficar no site: quem protege
// os dados são as regras do banco (supabase/schema.sql).
// Nunca coloque aqui a chave secreta (sb_secret_...) nem senhas.
// =============================================================
const PCF_SUPABASE = { url: '', chave: '' };

// Impressão digital (SHA-256) do e-mail do administrador: o código do site é público e o e-mail não fica exposto
const PCF_ADMIN_HASH = 'c75ac29fe42b03543ff9d464250e51ce4f666fa129062d9cf7c3e3c1e2cb26b0';
