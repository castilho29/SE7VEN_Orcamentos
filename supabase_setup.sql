-- ============================================================
-- SE7VEN ENERGIA - SETUP DE SEGURANÇA NO SUPABASE
-- ============================================================
-- Rode este script inteiro em: Supabase → SQL Editor → New query
-- Pode rodar quantas vezes precisar (usa "if not exists"/"or replace")
-- ============================================================

-- 1) TABELA DE PERFIS (nome + tipo de cada usuário logado)
-- Fica ligada 1-para-1 com auth.users (tabela interna e segura do Supabase)
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null,
    tipo text not null default 'pendente' check (tipo in ('admin','usuario','pendente')),
    created_at timestamptz default now()
);

-- Se a tabela já existia com a regra antiga (só admin/usuario), atualiza para aceitar "pendente":
alter table profiles drop constraint if exists profiles_tipo_check;
alter table profiles add constraint profiles_tipo_check check (tipo in ('admin','usuario','pendente'));
alter table profiles alter column tipo set default 'pendente';

alter table profiles enable row level security;

drop policy if exists "ver perfis" on profiles;
create policy "ver perfis" on profiles
    for select using (auth.role() = 'authenticated');

drop policy if exists "criar proprio perfil" on profiles;
create policy "criar proprio perfil" on profiles
    for insert with check (auth.uid() = id);

-- Só administradores podem alterar QUALQUER perfil (inclusive o próprio tipo de outros
-- usuários). Um usuário comum não tem nenhuma policy de update, então não consegue
-- se autopromover a admin nem editar ninguém — isso só é feito por quem já é admin,
-- direto na aba "Usuários" do sistema.
drop policy if exists "atualizar proprio perfil" on profiles;
drop policy if exists "admin altera qualquer perfil" on profiles;
create policy "admin altera qualquer perfil" on profiles
    for update using (
        exists (select 1 from profiles p where p.id = auth.uid() and p.tipo = 'admin')
    )
    with check (
        exists (select 1 from profiles p where p.id = auth.uid() and p.tipo = 'admin')
    );

-- 2) GARANTIR QUE AS TABELAS DE DADOS EXISTEM
-- (se já existirem no seu banco, isto não altera nada)
create table if not exists clientes (
    id text primary key,
    nome text not null,
    telefone text,
    cpf text,
    endereco text,
    email text,
    observacoes text,
    created_at timestamptz default now()
);

-- Se a tabela já existia antes desta coluna existir, garante que ela seja criada:
alter table clientes add column if not exists observacoes text;

create table if not exists produtos (
    id text primary key,
    nome text not null,
    preco numeric not null,
    tipo text,
    codigo_barras text,
    foto_url text,
    quantidade numeric,
    estoque_minimo numeric,
    descricao text,
    unidade text default 'un',
    nota_fiscal boolean default true,
    created_at timestamptz default now()
);

-- Se a tabela já existia antes destas colunas existirem, garante que sejam criadas:
alter table produtos add column if not exists codigo_barras text;
alter table produtos add column if not exists foto_url text;
alter table produtos add column if not exists quantidade numeric;
alter table produtos add column if not exists estoque_minimo numeric;
alter table produtos add column if not exists descricao text;
alter table produtos add column if not exists unidade text default 'un';
alter table produtos add column if not exists nota_fiscal boolean default true;

-- Espaço de armazenamento para as fotos dos produtos (bucket público de leitura,
-- só quem está logado pode enviar/trocar/apagar fotos).
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

drop policy if exists "leitura publica fotos produtos" on storage.objects;
create policy "leitura publica fotos produtos" on storage.objects
    for select using (bucket_id = 'produtos');

drop policy if exists "upload fotos produtos" on storage.objects;
create policy "upload fotos produtos" on storage.objects
    for insert with check (bucket_id = 'produtos' and auth.role() = 'authenticated');

drop policy if exists "atualizar fotos produtos" on storage.objects;
create policy "atualizar fotos produtos" on storage.objects
    for update using (bucket_id = 'produtos' and auth.role() = 'authenticated');

drop policy if exists "apagar fotos produtos" on storage.objects;
create policy "apagar fotos produtos" on storage.objects
    for delete using (bucket_id = 'produtos' and auth.role() = 'authenticated');

-- Configurações gerais da empresa (logo, juros de mora, multa por atraso etc.)
-- guardadas como pares chave/valor — só administradores podem alterar.
create table if not exists config_empresa (
    chave text primary key,
    valor text,
    atualizado_em timestamptz default now()
);
alter table config_empresa enable row level security;

drop policy if exists "ver config empresa" on config_empresa;
create policy "ver config empresa" on config_empresa
    for select using (auth.role() = 'authenticated');

drop policy if exists "admin altera config empresa" on config_empresa;
create policy "admin altera config empresa" on config_empresa
    for all using (
        exists (select 1 from profiles p where p.id = auth.uid() and p.tipo = 'admin')
    )
    with check (
        exists (select 1 from profiles p where p.id = auth.uid() and p.tipo = 'admin')
    );

-- Espaço de armazenamento pra logo da empresa (só admin envia/troca).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "leitura publica logos" on storage.objects;
create policy "leitura publica logos" on storage.objects
    for select using (bucket_id = 'logos');

drop policy if exists "admin envia logos" on storage.objects;
create policy "admin envia logos" on storage.objects
    for insert with check (bucket_id = 'logos' and exists (select 1 from profiles p where p.id = auth.uid() and p.tipo = 'admin'));

drop policy if exists "admin atualiza logos" on storage.objects;
create policy "admin atualiza logos" on storage.objects
    for update using (bucket_id = 'logos' and exists (select 1 from profiles p where p.id = auth.uid() and p.tipo = 'admin'));

create table if not exists ordens_servico (
    id text primary key,
    numero text,
    cliente_id text,
    cliente_nome text,
    itens jsonb,
    total numeric,
    status text,
    forma_pagamento text,
    parcelas integer,
    data_criacao timestamptz default now(),
    data_aprovacao timestamptz,
    data_inicio timestamptz,
    data_conclusao timestamptz
);
alter table ordens_servico add column if not exists forma_pagamento text;
alter table ordens_servico add column if not exists parcelas integer;
alter table ordens_servico add column if not exists crediario_num_parcelas integer;
alter table ordens_servico add column if not exists crediario_primeiro_vencimento date;
alter table ordens_servico add column if not exists crediario_intervalo_dias integer;
alter table ordens_servico add column if not exists assinatura_cliente text;
alter table ordens_servico add column if not exists assinatura_data timestamptz;

create table if not exists recibos (
    id text primary key,
    numero text,
    os_id text,
    os_numero text,
    cliente_id text,
    cliente_nome text,
    itens jsonb,
    total numeric,
    status text,
    forma_pagamento text,
    parcelas integer,
    data_emissao timestamptz default now(),
    data_pagamento timestamptz
);
alter table recibos add column if not exists forma_pagamento text;
alter table recibos add column if not exists parcelas integer;
alter table recibos add column if not exists pagamentos jsonb default '[]'::jsonb;
alter table recibos add column if not exists valor_recebido numeric default 0;
alter table recibos add column if not exists parcelas_detalhe jsonb default '[]'::jsonb;

create table if not exists logs (
    id bigserial primary key,
    data timestamptz default now(),
    usuario text,
    acao text,
    detalhes text
);

-- Despesas / contas a pagar da empresa
create table if not exists despesas (
    id text primary key,
    descricao text not null,
    categoria text,
    valor numeric not null,
    data date,
    status text default 'pendente' check (status in ('pendente','pago')),
    criado_por text,
    created_at timestamptz default now()
);

-- Agenda de visitas técnicas
create table if not exists visitas (
    id text primary key,
    cliente_id text,
    cliente_nome text,
    data_hora timestamptz not null,
    descricao text,
    status text default 'agendada' check (status in ('agendada','concluida','cancelada')),
    criado_por text,
    created_at timestamptz default now()
);

-- 3) RLS por tabela:
--    - Qualquer usuário LOGADO pode ver e inserir (cadastrar) dados.
--    - Só ADMINISTRADORES podem editar ou excluir registros já existentes.
--    Isso implementa de fato o perfil "usuário comum = vê e insere, não edita/exclui".
alter table clientes enable row level security;
alter table produtos enable row level security;
alter table ordens_servico enable row level security;
alter table recibos enable row level security;
alter table logs enable row level security;
alter table despesas enable row level security;
alter table visitas enable row level security;

-- Função auxiliar: sou administrador?
create or replace function eh_admin()
returns boolean as $$
    select exists (select 1 from profiles where id = auth.uid() and tipo = 'admin');
$$ language sql stable security definer;

-- CLIENTES
drop policy if exists "autenticados podem tudo - clientes" on clientes;
drop policy if exists "ver clientes" on clientes;
drop policy if exists "inserir clientes" on clientes;
drop policy if exists "editar clientes - admin" on clientes;
drop policy if exists "excluir clientes - admin" on clientes;
create policy "ver clientes" on clientes for select using (auth.role() = 'authenticated');
create policy "inserir clientes" on clientes for insert with check (auth.role() = 'authenticated');
create policy "editar clientes - admin" on clientes for update using (eh_admin());
create policy "excluir clientes - admin" on clientes for delete using (eh_admin());

-- PRODUTOS
drop policy if exists "autenticados podem tudo - produtos" on produtos;
drop policy if exists "ver produtos" on produtos;
drop policy if exists "inserir produtos" on produtos;
drop policy if exists "editar produtos - admin" on produtos;
drop policy if exists "excluir produtos - admin" on produtos;
create policy "ver produtos" on produtos for select using (auth.role() = 'authenticated');
create policy "inserir produtos" on produtos for insert with check (auth.role() = 'authenticated');
create policy "editar produtos - admin" on produtos for update using (eh_admin());
create policy "excluir produtos - admin" on produtos for delete using (eh_admin());

-- ORDENS DE SERVIÇO (usuário comum pode criar e também avançar o status/editar
-- itens, já que isso é parte normal do fluxo de trabalho dele; só excluir é admin)
drop policy if exists "autenticados podem tudo - os" on ordens_servico;
drop policy if exists "ver os" on ordens_servico;
drop policy if exists "inserir os" on ordens_servico;
drop policy if exists "editar os" on ordens_servico;
drop policy if exists "excluir os - admin" on ordens_servico;
create policy "ver os" on ordens_servico for select using (auth.role() = 'authenticated');
create policy "inserir os" on ordens_servico for insert with check (auth.role() = 'authenticated');
create policy "editar os" on ordens_servico for update using (auth.role() = 'authenticated');
create policy "excluir os - admin" on ordens_servico for delete using (eh_admin());

-- RECIBOS (marcar como pago também fica liberado, exclusão só admin)
drop policy if exists "autenticados podem tudo - recibos" on recibos;
drop policy if exists "ver recibos" on recibos;
drop policy if exists "inserir recibos" on recibos;
drop policy if exists "editar recibos" on recibos;
drop policy if exists "excluir recibos - admin" on recibos;
create policy "ver recibos" on recibos for select using (auth.role() = 'authenticated');
create policy "inserir recibos" on recibos for insert with check (auth.role() = 'authenticated');
create policy "editar recibos" on recibos for update using (auth.role() = 'authenticated');
create policy "excluir recibos - admin" on recibos for delete using (eh_admin());

-- LOGS (todo mundo grava e lê; só admin limpa)
drop policy if exists "autenticados podem tudo - logs" on logs;
drop policy if exists "ver logs" on logs;
drop policy if exists "inserir logs" on logs;
drop policy if exists "excluir logs - admin" on logs;
create policy "ver logs" on logs for select using (auth.role() = 'authenticated');
create policy "inserir logs" on logs for insert with check (auth.role() = 'authenticated');
create policy "excluir logs - admin" on logs for delete using (eh_admin());

-- DESPESAS (financeiro é sensível: só admin edita/exclui, mas todo mundo pode lançar e ver)
drop policy if exists "ver despesas" on despesas;
drop policy if exists "inserir despesas" on despesas;
drop policy if exists "editar despesas - admin" on despesas;
drop policy if exists "excluir despesas - admin" on despesas;
create policy "ver despesas" on despesas for select using (auth.role() = 'authenticated');
create policy "inserir despesas" on despesas for insert with check (auth.role() = 'authenticated');
create policy "editar despesas - admin" on despesas for update using (eh_admin());
create policy "excluir despesas - admin" on despesas for delete using (eh_admin());

-- AGENDA DE VISITAS
drop policy if exists "ver visitas" on visitas;
drop policy if exists "inserir visitas" on visitas;
drop policy if exists "editar visitas" on visitas;
drop policy if exists "excluir visitas - admin" on visitas;
create policy "ver visitas" on visitas for select using (auth.role() = 'authenticated');
create policy "inserir visitas" on visitas for insert with check (auth.role() = 'authenticated');
create policy "editar visitas" on visitas for update using (auth.role() = 'authenticated');
create policy "excluir visitas - admin" on visitas for delete using (eh_admin());

-- 4) (OPCIONAL, MAS RECOMENDADO) Apagar a tabela antiga de usuários
-- com senhas em texto puro, já que agora o Supabase Auth cuida do login.
-- ⚠️ Só rode esta linha depois de confirmar que o novo login está funcionando!
-- drop table if exists usuarios;
