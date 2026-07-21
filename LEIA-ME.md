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
6. **Primeiro administrador**: toda conta nova entra como `pendente` (aguardando
   aprovação). Para o SEU primeiro acesso, vá em Table Editor → tabela `profiles`
   → encontre seu nome → mude a coluna `tipo` para `admin`. Depois disso, você já
   consegue aprovar todo mundo direto pela aba "Usuários" do sistema — não precisa
   mais voltar ao Supabase para isso.

## Google Drive para backup (opcional, mas recomendado)

Sem essa configuração, o botão "Enviar Backup para o Google Drive" avisa que não
está configurado e oferece baixar o backup localmente em vez disso. Para o envio
direto funcionar:

1. Acesse **console.cloud.google.com** → crie um projeto (ou use um existente)
2. **APIs e Serviços → Biblioteca** → ative a **Google Drive API**
3. **APIs e Serviços → Tela de consentimento OAuth** → configure como "Externo",
   preencha nome do app e e-mail, e adicione seu e-mail como usuário de teste
   (ou publique o app se quiser liberar pra qualquer conta Google)
4. **APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth**
   → tipo de aplicativo: **Aplicativo da Web**
   → em "Origens JavaScript autorizadas", adicione a URL do seu site
   (ex: `https://castilho29.github.io`)
5. Copie o **Client ID** gerado e cole em `config.js`, no campo
   `CONFIG.GOOGLE.driveClientId`
6. Suba o `config.js` atualizado no GitHub

Isso é **separado** da configuração de "Login com Google" (item 3 acima) — são
dois usos diferentes do Google, cada um com sua própria credencial.

## Aprovação de novos usuários

Quem cria conta agora entra como **⏳ Pendente** e vê uma tela avisando que precisa
de aprovação — não consegue usar o sistema ainda. Um administrador entra na aba
**👥 Usuários**, vê a pessoa pendente na lista, e escolhe o perfil dela num menu:
**Usuário** ou **Administrador**. Só administradores enxergam e usam esse menu.

## Novidades desta leva de ajustes

- **Permissões de verdade**: usuário comum (não-admin) só vê e insere dados —
  editar/excluir clientes, produtos, orçamentos e despesas agora é só para admin
  (reforçado tanto na tela quanto no banco, via regras de segurança).
- **Estoque**: produtos agora podem ter quantidade e estoque mínimo. Quando o
  estoque fica igual ou abaixo do mínimo, aparece um aviso "⚠️ baixo!" na lista
  e conta no card do Dashboard.
- **Despesas**: nova aba para lançar contas a pagar (material, combustível,
  ferramenta, aluguel, salário...), com status pendente/pago.
- **Agenda de Visitas**: nova aba para agendar visitas técnicas por cliente,
  com data/hora e status (agendada/concluída/cancelada). As próximas aparecem
  no Dashboard.
- **Dashboard**: nova aba inicial com resumo — a receber, recebido no mês,
  despesas no mês, OS em andamento, clientes cadastrados, estoque baixo e
  próximas visitas.
- **Histórico do cliente**: no ícone 📋 ao lado de cada cliente, veja tudo que
  já foi feito para ele (orçamentos, recibos, visitas) num só lugar.
- **Parcelamento**: o orçamento agora tem forma de pagamento e, se for cartão,
  número de parcelas — isso vai junto para o recibo.
- **Paginação**: listas de clientes e produtos agora carregam 20 por vez
  (com botões "Anteriores/Próximos"), pra não ficar lento com muito cadastro.
  A busca já filtra a lista inteira, não só a página visível.

Depois de rodar o `supabase_setup.sql` (cria as tabelas `despesas` e `visitas`
e ajusta as permissões), teste: Dashboard → Despesas → Agenda → histórico de
um cliente → editar/excluir como usuário comum (deve estar bloqueado) e como
admin (deve funcionar).

### O que ainda ficou de fora
Funcionamento **offline** (o app exige internet o tempo todo hoje — um "PWA"
completo com essa capacidade é um projeto à parte, me avise se quiser que eu
faça isso numa próxima rodada).


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
