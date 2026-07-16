# SE7VEN ENERGIA — o que mudou e o que fazer agora

## O que foi corrigido
- **Removida a chave secreta do navegador.** Agora o app usa só a chave pública, e quem
  protege os dados é o login real + as regras de acesso (RLS) no banco.
- **Login de verdade** com Supabase Auth (e-mail/senha e Google), no lugar do login
  fixo (`admin`/`admin`) e da tabela de senhas em texto puro.
- **Sincronização em tempo real**: mudanças em um dispositivo aparecem quase na hora
  nos outros (antes era só a cada 10 segundos, forçando o banco).
- **Bug do botão "+ Novo" corrigido** (tentava rolar até um elemento que não existia).
- **Funções implementadas**: WhatsApp (abre conversa com o orçamento pronto), Queda de
  Tensão, Demanda de Energia e Cálculo de Projeto Elétrico (agora com campo de potência).
- **Logs agora sincronizam** entre dispositivos (antes ficavam só no celular/PC de quem usava).

## Passo a passo no Supabase (obrigatório)

1. **Rode o `supabase_setup.sql`**: Supabase → SQL Editor → New query → cole o
   conteúdo do arquivo → Run. Isso cria as tabelas que faltarem e ativa a segurança
   (RLS) em todas elas.
2. **Ative o login por e-mail/senha** (normalmente já vem ativado):
   Authentication → Providers → Email.
3. **(Opcional) Ative o login com Google**: Authentication → Providers → Google,
   e configure o Client ID/Secret do Google Cloud Console. Sem isso, o botão
   "Entrar com Google" mostra um erro explicando que o provedor não está ativo.
4. **Decida sobre confirmação de e-mail**: Authentication → Settings →
   "Confirm email". Se deixar **ativado**, quem criar conta precisa clicar no
   link do e-mail antes de conseguir entrar. Se **desativar**, o cadastro já
   entra direto — mais prático para uma equipe pequena, mas qualquer e-mail
   (mesmo inválido) pode criar conta.
5. **Depois de confirmar que o novo login está funcionando**, você pode apagar a
   tabela antiga `usuarios` (que guardava senhas em texto puro) — a última linha
   do `supabase_setup.sql` faz isso, comentada por segurança.
6. **Primeiro administrador**: toda conta nova entra como `usuario`. Para tornar
   alguém admin, vá em Table Editor → tabela `profiles` → encontre a pessoa →
   mude a coluna `tipo` para `admin`.

## Arquivos deste pacote
- `index.html` — tela do sistema (login novo + campo de potência no projeto elétrico)
- `config.js` — só a chave pública (não tem mais segredo nenhum aqui)
- `script.js` — toda a lógica reescrita
- `supabase_setup.sql` — script para rodar no Supabase

Assim que rodar o SQL e configurar o Auth, é só subir estes três arquivos
(`index.html`, `config.js`, `script.js`) no lugar dos antigos no seu repositório
do GitHub.

## Sobre o WhatsApp
Não é possível anexar um PDF automaticamente numa conversa do WhatsApp a partir do
navegador (nenhum site consegue fazer isso, é uma limitação do WhatsApp). O botão
"PDF+Whats" baixa o PDF e abre a conversa com a mensagem pronta — falta só anexar
o arquivo manualmente.
