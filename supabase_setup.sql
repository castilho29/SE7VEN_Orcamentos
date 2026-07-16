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
    tipo text not null default 'usuario' check (tipo in ('admin','usuario')),
    created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "ver perfis" on profiles;
create policy "ver perfis" on profiles
    for select using (auth.role() = 'authenticated');

drop policy if exists "criar proprio perfil" on profiles;
create policy "criar proprio perfil" on profiles
    for insert with check (auth.uid() = id);

drop policy if exists "atualizar proprio perfil" on profiles;
create policy "atualizar proprio perfil" on profiles
    for update using (auth.uid() = id);

-- 2) GARANTIR QUE AS TABELAS DE DADOS EXISTEM
-- (se já existirem no seu banco, isto não altera nada)
create table if not exists clientes (
    id text primary key,
    nome text not null,
    telefone text,
    cpf text,
    endereco text,
    email text,
    created_at timestamptz default now()
);

create table if not exists produtos (
    id text primary key,
    nome text not null,
    preco numeric not null,
    tipo text,
    created_at timestamptz default now()
);

create table if not exists ordens_servico (
    id text primary key,
    numero text,
    cliente_id text,
    cliente_nome text,
    itens jsonb,
    total numeric,
    status text,
    data_criacao timestamptz default now(),
    data_aprovacao timestamptz,
    data_inicio timestamptz,
    data_conclusao timestamptz
);

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
    data_emissao timestamptz default now(),
    data_pagamento timestamptz
);

create table if not exists logs (
    id bigserial primary key,
    data timestamptz default now(),
    usuario text,
    acao text,
    detalhes text
);

-- 3) RLS: só usuários LOGADOS (autenticados de verdade) podem ler/escrever
--    Isso substitui a antiga "chave secreta no navegador".
alter table clientes enable row level security;
alter table produtos enable row level security;
alter table ordens_servico enable row level security;
alter table recibos enable row level security;
alter table logs enable row level security;

drop policy if exists "autenticados podem tudo - clientes" on clientes;
create policy "autenticados podem tudo - clientes" on clientes
    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "autenticados podem tudo - produtos" on produtos;
create policy "autenticados podem tudo - produtos" on produtos
    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "autenticados podem tudo - os" on ordens_servico;
create policy "autenticados podem tudo - os" on ordens_servico
    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "autenticados podem tudo - recibos" on recibos;
create policy "autenticados podem tudo - recibos" on recibos
    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "autenticados podem tudo - logs" on logs;
create policy "autenticados podem tudo - logs" on logs
    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 4) (OPCIONAL, MAS RECOMENDADO) Apagar a tabela antiga de usuários
-- com senhas em texto puro, já que agora o Supabase Auth cuida do login.
-- ⚠️ Só rode esta linha depois de confirmar que o novo login está funcionando!
-- drop table if exists usuarios;
