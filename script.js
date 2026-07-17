// ============================================
// SISTEMA SE7VEN ENERGIA - COMPLETO
// ============================================

console.log('⚡ Carregando sistema...');

// ============================================
// CARREGAR CONFIGURAÇÕES
// ============================================
const CFG = window.CONFIG || {};
if (!CFG.SUPABASE) {
    CFG.SUPABASE = { url: 'https://aqxrogqjeaxbckfxwbtt.supabase.co', publicKey: '' };
}

const SUPABASE_URL = CFG.SUPABASE.url;
const SUPABASE_PUBLIC_KEY = CFG.SUPABASE.publicKey;

// ============================================
// CLIENTE ÚNICO DO SUPABASE (só chave pública)
// A segurança agora vem do login real (Supabase Auth) + regras RLS no banco,
// não de uma chave secreta escondida no navegador (isso nunca foi seguro).
// ============================================
let sb = null;
try {
    if (SUPABASE_PUBLIC_KEY) {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
        console.log('✅ Supabase conectado!');
    } else {
        console.warn('⚠️ Chave pública do Supabase não configurada em config.js!');
    }
} catch (e) {
    console.warn('⚠️ Erro ao conectar Supabase:', e.message);
}

// ============================================
// DADOS DA EMPRESA
// ============================================
const EMPRESA = {
    nome: 'SE7VEN SOLUÇÕES ENERGÉTICAS',
    nomeAbreviado: 'SE7VEN',
    telefone: '(93) 98102-7290',
    whatsapp: '5593981027290',
    email: 'se7venenergia@gmail.com',
    instagram: '@se7venenergia',
    cnpj: '62.008.856/0001-60',
    endereco: 'Rua Dourados, 626 - Novo Progresso/PA',
    corPrimaria: '#1a237e',
    formasPagamento: ['Pix à vista', 'Cartão de Crédito (até 10x)', 'Boleto Bancário'],
    observacoes: [
        'Este orçamento tem validade de 30 dias.',
        'Preços sujeitos a alterações sem aviso prévio.',
        'Instalação conforme normas técnicas vigentes.'
    ],
    rodape: 'Orçamento gerado automaticamente'
};

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;      // { id, nome, tipo, email }
let modoCadastro = false;     // tela de login: false = entrar, true = criar conta
let clientes = [];
let produtos = [];
let ordensServico = [];
let recibos = [];
let logs = [];
let perfis = [];              // lista de usuários (tabela profiles)
let syncTimeout = null;
let realtimeChannel = null;
let osAtual = null;
let reciboAtual = null;
let editandoOSId = null;
let sincronizando = false;
let ultimaSync = null;

// Tabela de ampacidade de cabos de cobre (A) por bitola (mm²) - referência prática
const TABELA_AMPACIDADE = {1.5:15.5,2.5:21,4:28,6:36,10:50,16:68,25:89,35:111,50:134,70:171,95:207,120:239,150:275,185:314,240:370};
const RESISTIVIDADE_COBRE = 0.0178; // Ω·mm²/m (aprox., referência prática)

// ============================================
// AUTENTICAÇÃO (SUPABASE AUTH)
// ============================================

function alternarModoCadastro() {
    modoCadastro = !modoCadastro;
    document.getElementById('loginNome').style.display = modoCadastro ? 'block' : 'none';
    document.getElementById('btnEntrar').textContent = modoCadastro ? '✨ Criar conta' : '🔑 Entrar';
    document.getElementById('btnAlternarCadastro').textContent = modoCadastro ? 'Já tenho conta, entrar' : 'Não tem conta? Criar uma agora';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginSucesso').style.display = 'none';
}

async function fazerLogin() {
    if (!sb) { alert('⚠️ Supabase não está configurado (veja config.js).'); return; }
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const nome = document.getElementById('loginNome').value.trim();
    const errorEl = document.getElementById('loginError');
    const sucessoEl = document.getElementById('loginSucesso');
    errorEl.style.display = 'none';
    sucessoEl.style.display = 'none';

    if (!email || !senha) { errorEl.textContent = '❌ Preencha e-mail e senha!'; errorEl.style.display = 'block'; return; }
    if (modoCadastro && !nome) { errorEl.textContent = '❌ Informe seu nome!'; errorEl.style.display = 'block'; return; }

    if (modoCadastro) {
        const { data, error } = await sb.auth.signUp({
            email, password: senha, options: { data: { nome } }
        });
        if (error) { errorEl.textContent = '❌ ' + error.message; errorEl.style.display = 'block'; return; }
        if (data.session) {
            // Login automático (confirmação de e-mail desativada no projeto)
            await entrarNoSistema(data.user);
        } else {
            // Volta para o modo "login" manualmente, sem apagar a mensagem de sucesso
            modoCadastro = false;
            document.getElementById('loginNome').style.display = 'none';
            document.getElementById('btnEntrar').textContent = '🔑 Entrar';
            document.getElementById('btnAlternarCadastro').textContent = 'Não tem conta? Criar uma agora';
            sucessoEl.textContent = '✅ Conta criada! Verifique seu e-mail para confirmar e depois faça login.';
            sucessoEl.style.display = 'block';
        }
        return;
    }

    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
        errorEl.textContent = '❌ E-mail ou senha incorretos!';
        errorEl.style.display = 'block';
    }
    // Sucesso: onAuthStateChange cuida de entrar no sistema
}

async function loginGoogle() {
    if (!sb) { alert('⚠️ Supabase não está configurado.'); return; }
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
    });
    if (error) alert('❌ Erro ao entrar com Google: ' + error.message +
        '\n\n(Verifique se o provedor Google está habilitado em Supabase → Authentication → Providers)');
}

async function fazerLogout() {
    if (syncTimeout) { clearInterval(syncTimeout); syncTimeout = null; }
    if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
    if (sb) await sb.auth.signOut();
    usuarioAtual = null;
    mostrarTelaLogin();
}

function mostrarTelaLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('sistemaScreen').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginSenha').value = '';
}

async function garantirPerfil(user) {
    // Cria a linha em "profiles" na primeira vez que o usuário loga de verdade
    const { data: existente } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (existente) return existente;
    const nome = user.user_metadata?.nome || user.email;
    const { data: criado, error } = await sb.from('profiles')
        .insert({ id: user.id, nome, tipo: 'usuario' })
        .select().single();
    if (error) { console.warn('Não foi possível criar o perfil:', error.message); return { id: user.id, nome, tipo: 'usuario' }; }
    return criado;
}

async function entrarNoSistema(user) {
    const perfil = await garantirPerfil(user);
    usuarioAtual = { id: user.id, email: user.email, nome: perfil.nome, tipo: perfil.tipo };
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sistemaScreen').style.display = 'block';
    document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
    atualizarStatus(`✅ Bem-vindo, ${usuarioAtual.nome}!`);
    registrarLog('LOGIN', `${usuarioAtual.nome} entrou no sistema`);
    init();
}

// ============================================
// SINCRONIZAÇÃO
// ============================================

async function carregarClientesSupabase() {
    const { data, error } = await sb.from('clientes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    clientes = data || [];
    renderClientes();
    renderSelectClientes();
}

async function carregarProdutosSupabase() {
    const { data, error } = await sb.from('produtos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    produtos = data || [];
    renderProdutos();
    renderSelectProdutos();
}

async function carregarOSSupabase() {
    const { data, error } = await sb.from('ordens_servico').select('*').order('data_criacao', { ascending: false });
    if (error) throw error;
    ordensServico = data || [];
    listarOS();
}

async function carregarRecibosSupabase() {
    const { data, error } = await sb.from('recibos').select('*').order('data_emissao', { ascending: false });
    if (error) throw error;
    recibos = data || [];
    listarRecibos();
}

async function carregarPerfisSupabase() {
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    perfis = data || [];
    listarUsuarios();
}

async function carregarLogsSupabase() {
    const { data, error } = await sb.from('logs').select('*').order('data', { ascending: false }).limit(200);
    if (error) throw error;
    logs = data || [];
    renderizarLogs();
}

async function sincronizarDados() {
    if (!sb) return;
    if (sincronizando) { console.log('⏳ Sincronização em andamento...'); return; }
    sincronizando = true;
    const statusElement = document.getElementById('syncStatus');
    const progressElement = document.getElementById('syncProgress');
    const ultimaSyncElement = document.getElementById('ultimaSync');
    try {
        statusElement.textContent = '🔄 Sincronizando...';
        statusElement.className = 'status sincronizando';
        progressElement.style.display = 'block';
        progressElement.textContent = '⏳ Conectando ao banco de dados...';

        await Promise.all([
            carregarClientesSupabase(),
            carregarProdutosSupabase(),
            carregarOSSupabase(),
            carregarRecibosSupabase(),
            carregarPerfisSupabase(),
            carregarLogsSupabase()
        ]);

        await semearProdutosPadrao();

        ultimaSync = new Date();
        ultimaSyncElement.textContent = `Última: ${ultimaSync.toLocaleString('pt-BR')}`;
        statusElement.textContent = '✅ Sincronizado';
        statusElement.className = 'status online';
        progressElement.style.display = 'none';
        atualizarEstatisticas();
        console.log('✅ Sincronização completa!');
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        statusElement.textContent = '❌ Erro: ' + error.message;
        statusElement.className = 'status offline';
        progressElement.textContent = '❌ ' + error.message;
        progressElement.style.display = 'block';
    } finally {
        sincronizando = false;
    }
}

function iniciarSincronizacaoAutomatica() {
    if (!sb) return;
    sincronizarDados();

    // Sincronização em tempo real: qualquer alteração feita em outro dispositivo
    // chega aqui na hora, sem precisar recarregar a página.
    realtimeChannel = sb.channel('se7ven-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recibos' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, () => sincronizarDados())
        .subscribe();

    // Rede de segurança: sincroniza a cada 60s mesmo que o realtime perca algum evento
    if (syncTimeout) clearInterval(syncTimeout);
    syncTimeout = setInterval(sincronizarDados, 60000);
    console.log('✅ Sincronização automática (tempo real + reforço a cada 60s) ativada');
}

async function semearProdutosPadrao() {
    // Só roda uma vez: se a tabela de produtos estiver vazia, cadastra o catálogo padrão.
    // Usa IDs fixos (1,2,3...) então rodar de novo nunca duplica.
    if (produtos.length > 0) return;
    const catalogo = gerarProdutos();
    try {
        const { error } = await sb.from('produtos').upsert(catalogo, { onConflict: 'id' });
        if (error) throw error;
        await carregarProdutosSupabase();
        console.log(`📦 ${catalogo.length} produtos padrão cadastrados!`);
    } catch (e) {
        console.warn('Não foi possível semear produtos padrão:', e.message);
    }
}

// ============================================
// BUSCA DE CNPJ (dados públicos da Receita Federal via BrasilAPI)
// Só funciona para CNPJ. CPF não tem base pública/legal para consulta
// de nome e endereço — dado pessoal protegido pela LGPD.
// ============================================

async function buscarCNPJ() {
    const valor = document.getElementById('cpfCliente').value.replace(/\D/g, '');
    if (valor.length !== 14) {
        alert('⚠️ Digite um CNPJ completo (14 números) nesse campo para buscar.\n\nBusca automática só funciona para CNPJ — não existe base pública para consultar nome/endereço por CPF.');
        return;
    }
    atualizarStatus('🔍 Buscando dados do CNPJ...');
    try {
        const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${valor}`);
        if (!resp.ok) throw new Error('CNPJ não encontrado');
        const dados = await resp.json();

        const nomeAtual = document.getElementById('nomeCliente').value.trim();
        const nomeEncontrado = dados.razao_social || dados.nome_fantasia || '';
        if (nomeEncontrado && (!nomeAtual || confirm(`Preencher nome como "${nomeEncontrado}"?`))) {
            document.getElementById('nomeCliente').value = nomeEncontrado;
        }

        const partesEndereco = [dados.logradouro, dados.numero, dados.bairro].filter(Boolean).join(', ');
        const cidadeUf = dados.municipio ? ` - ${dados.municipio}/${dados.uf}` : '';
        document.getElementById('enderecoCliente').value = (partesEndereco + cidadeUf).trim();

        if (dados.ddd_telefone_1 && !document.getElementById('telefoneCliente').value.trim()) {
            document.getElementById('telefoneCliente').value = dados.ddd_telefone_1;
        }
        if (dados.email && !document.getElementById('emailCliente').value.trim()) {
            document.getElementById('emailCliente').value = dados.email;
        }
        atualizarStatus('✅ Dados do CNPJ preenchidos!');
    } catch (e) {
        atualizarStatus('❌ CNPJ não encontrado', 'error');
        alert('❌ Não encontramos esse CNPJ na Receita Federal. Confira os números e tente de novo.');
    }
}

// ============================================
// CLIENTES
// ============================================

function renderClientes() {
    const lista = document.getElementById('listaClientes');
    if (!lista) return;
    if (clientes.length === 0) {
        lista.innerHTML = '<li style="color:#999;text-align:center;padding:20px;">Nenhum cliente cadastrado</li>';
        return;
    }
    lista.innerHTML = clientes.map((c, i) => `
        <li>
            <span>
                <strong>${c.nome}</strong>
                ${c.telefone ? `<br><small>📱 ${c.telefone}</small>` : ''}
                ${c.email ? `<br><small>✉️ ${c.email}</small>` : ''}
                ${c.observacoes ? `<br><small>📝 ${c.observacoes}</small>` : ''}
            </span>
            <div style="display:flex;gap:5px;">
                <button onclick="editarCliente(${i})" class="btn-secondary" style="padding:4px 8px;">✏️</button>
                <button onclick="excluirCliente(${i})" class="btn-secondary" style="padding:4px 8px;">🗑️</button>
            </div>
        </li>
    `).join('');
}

async function adicionarCliente() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
    const novoCliente = {
        id: gerarId(), nome, telefone,
        email: document.getElementById('emailCliente').value.trim() || '',
        cpf: document.getElementById('cpfCliente').value.trim() || '',
        endereco: document.getElementById('enderecoCliente').value.trim() || '',
        observacoes: document.getElementById('observacoesCliente').value.trim() || ''
    };
    try {
        const { error } = await sb.from('clientes').upsert(novoCliente, { onConflict: 'id' });
        if (error) throw error;
        clientes.push(novoCliente);
        document.getElementById('nomeCliente').value = '';
        document.getElementById('telefoneCliente').value = '';
        document.getElementById('cpfCliente').value = '';
        document.getElementById('enderecoCliente').value = '';
        document.getElementById('emailCliente').value = '';
        document.getElementById('observacoesCliente').value = '';
        fecharModal('modalCliente');
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`✅ Cliente "${nome}" cadastrado!`);
        registrarLog('CLIENTE_ADICIONADO', `Cliente "${nome}" adicionado`);
    } catch (e) {
        alert('❌ Erro ao salvar cliente: ' + e.message);
    }
}

async function excluirCliente(index) {
    const cliente = clientes[index];
    if (!cliente) return;
    if (!confirm(`Excluir "${cliente.nome}"?`)) return;
    try {
        const { error } = await sb.from('clientes').delete().eq('id', cliente.id);
        if (error) throw error;
        clientes.splice(index, 1);
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`🗑️ Cliente "${cliente.nome}" removido`);
        registrarLog('CLIENTE_EXCLUIDO', `Cliente "${cliente.nome}" excluído`);
    } catch (e) {
        alert('❌ Erro ao excluir cliente: ' + e.message);
    }
}

function editarCliente(index) {
    const c = clientes[index];
    document.getElementById('nomeCliente').value = c.nome;
    document.getElementById('telefoneCliente').value = c.telefone || '';
    document.getElementById('cpfCliente').value = c.cpf || '';
    document.getElementById('enderecoCliente').value = c.endereco || '';
    document.getElementById('emailCliente').value = c.email || '';
    document.getElementById('observacoesCliente').value = c.observacoes || '';
    document.querySelector('#modalCliente h3').textContent = '✏️ Editar Cliente';
    const btn = document.getElementById('salvarCliente');
    btn.textContent = '💾 Atualizar';
    btn.dataset.index = index;
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener('click', async function () {
        const idx = parseInt(this.dataset.index);
        const nome = document.getElementById('nomeCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();
        const cpf = document.getElementById('cpfCliente').value.trim();
        const endereco = document.getElementById('enderecoCliente').value.trim();
        const email = document.getElementById('emailCliente').value.trim();
        const observacoes = document.getElementById('observacoesCliente').value.trim();
        if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
        const clienteAtualizado = { ...clientes[idx], nome, telefone, cpf, endereco, email, observacoes };
        try {
            const { error } = await sb.from('clientes').upsert(clienteAtualizado, { onConflict: 'id' });
            if (error) throw error;
            clientes[idx] = clienteAtualizado;
            document.getElementById('nomeCliente').value = '';
            document.getElementById('telefoneCliente').value = '';
            document.getElementById('cpfCliente').value = '';
            document.getElementById('enderecoCliente').value = '';
            document.getElementById('emailCliente').value = '';
            document.getElementById('observacoesCliente').value = '';
            document.querySelector('#modalCliente h3').textContent = '👤 Novo Cliente';
            this.textContent = 'Salvar';
            this.dataset.index = '';
            fecharModal('modalCliente');
            renderClientes();
            renderSelectClientes();
            atualizarStatus(`✅ Cliente "${nome}" atualizado!`);
            registrarLog('CLIENTE_EDITADO', `Cliente "${nome}" editado`);
        } catch (e) {
            alert('❌ Erro ao atualizar cliente: ' + e.message);
        }
    });
    abrirModal('modalCliente');
}

function renderSelectClientes() {
    const sel = document.getElementById('selCliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione um cliente</option>' +
        clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
}

// ============================================
// PRODUTOS
// ============================================

function renderProdutos() {
    const lista = document.getElementById('listaProdutos');
    if (!lista) return;
    if (produtos.length === 0) {
        lista.innerHTML = '<li style="color:#999;text-align:center;padding:20px;">Nenhum produto cadastrado</li>';
        return;
    }
    lista.innerHTML = produtos.slice(0, 50).map((p, i) => `
        <li>
            <span>
                <strong>${p.nome}</strong>
                <br><small>R$ ${Number(p.preco).toFixed(2)}</small>
                <br><small>📂 ${p.tipo || 'outro'}</small>
            </span>
            <div style="display:flex;gap:5px;">
                <button onclick="editarProduto(${i})" class="btn-secondary" style="padding:4px 8px;">✏️</button>
                <button onclick="excluirProduto(${i})" class="btn-secondary" style="padding:4px 8px;">🗑️</button>
            </div>
        </li>
    `).join('');
}

async function adicionarProduto() {
    const nome = document.getElementById('nomeProduto').value.trim();
    const preco = parseFloat(document.getElementById('precoProduto').value);
    const tipo = document.getElementById('tipoProduto').value;
    if (!nome || isNaN(preco) || preco <= 0) { alert('⚠️ Nome e preço válido são obrigatórios'); return; }
    const novoProduto = { id: gerarId(), nome, preco, tipo };
    try {
        const { error } = await sb.from('produtos').upsert(novoProduto, { onConflict: 'id' });
        if (error) throw error;
        produtos.push(novoProduto);
        document.getElementById('nomeProduto').value = '';
        document.getElementById('precoProduto').value = '';
        fecharModal('modalProduto');
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`✅ Produto "${nome}" cadastrado!`);
        registrarLog('PRODUTO_ADICIONADO', `Produto "${nome}" adicionado`);
    } catch (e) {
        alert('❌ Erro ao salvar produto: ' + e.message);
    }
}

async function excluirProduto(index) {
    const produto = produtos[index];
    if (!produto) return;
    if (!confirm(`Excluir "${produto.nome}"?`)) return;
    try {
        const { error } = await sb.from('produtos').delete().eq('id', produto.id);
        if (error) throw error;
        produtos.splice(index, 1);
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`🗑️ Produto "${produto.nome}" removido`);
        registrarLog('PRODUTO_EXCLUIDO', `Produto "${produto.nome}" excluído`);
    } catch (e) {
        alert('❌ Erro ao excluir produto: ' + e.message);
    }
}

function editarProduto(index) {
    const p = produtos[index];
    document.getElementById('nomeProduto').value = p.nome;
    document.getElementById('precoProduto').value = p.preco;
    document.getElementById('tipoProduto').value = p.tipo || 'outro';
    document.querySelector('#modalProduto h3').textContent = '✏️ Editar Produto';
    const btn = document.getElementById('salvarProduto');
    btn.textContent = '💾 Atualizar';
    btn.dataset.index = index;
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener('click', async function () {
        const idx = parseInt(this.dataset.index);
        const nome = document.getElementById('nomeProduto').value.trim();
        const preco = parseFloat(document.getElementById('precoProduto').value);
        const tipo = document.getElementById('tipoProduto').value;
        if (!nome || isNaN(preco) || preco <= 0) { alert('⚠️ Nome e preço válido são obrigatórios'); return; }
        const produtoAtualizado = { ...produtos[idx], nome, preco, tipo };
        try {
            const { error } = await sb.from('produtos').upsert(produtoAtualizado, { onConflict: 'id' });
            if (error) throw error;
            produtos[idx] = produtoAtualizado;
            document.getElementById('nomeProduto').value = '';
            document.getElementById('precoProduto').value = '';
            document.querySelector('#modalProduto h3').textContent = '📦 Novo Produto';
            this.textContent = 'Salvar';
            this.dataset.index = '';
            fecharModal('modalProduto');
            renderProdutos();
            renderSelectProdutos();
            atualizarStatus(`✅ Produto "${nome}" atualizado!`);
            registrarLog('PRODUTO_EDITADO', `Produto "${nome}" editado`);
        } catch (e) {
            alert('❌ Erro ao atualizar produto: ' + e.message);
        }
    });
    abrirModal('modalProduto');
}

function renderSelectProdutos() {
    document.querySelectorAll('.selProduto').forEach(select => {
        const current = select.value;
        select.innerHTML = '<option value="">Selecione um produto</option>' +
            produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${Number(p.preco).toFixed(2)}</option>`).join('');
        select.value = current;
    });
}

// ============================================
// ORÇAMENTO
// ============================================

function criarLinhaItem(nomeSelecionado = '', qtd = 1) {
    const div = document.createElement('div');
    div.className = 'item-orcamento';
    div.innerHTML = `
        <select class="selProduto">
            <option value="">Selecione um produto</option>
            ${produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${Number(p.preco).toFixed(2)}</option>`).join('')}
        </select>
        <input type="number" class="qtdProduto" placeholder="Qtd" min="1" value="${qtd}">
        <button class="btn-remove-item" onclick="removerItem(this)">✕</button>
    `;
    if (nomeSelecionado) div.querySelector('.selProduto').value = nomeSelecionado;
    div.querySelector('.selProduto').addEventListener('change', updateTotal);
    div.querySelector('.qtdProduto').addEventListener('input', updateTotal);
    return div;
}

function adicionarItem() {
    if (produtos.length === 0) { alert('⚠️ Cadastre um produto primeiro!'); return; }
    document.getElementById('itensOrcamento').appendChild(criarLinhaItem());
    updateTotal();
}

function removerItem(btn) { btn.parentElement.remove(); updateTotal(); }

function updateTotal() {
    let total = 0;
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        total += preco * qtd;
    });
    document.getElementById('totalValor').textContent = total.toFixed(2);
}

function pegarItensOrcamentoAtual() {
    const itens = [];
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const nome = select.value;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        if (nome && qtd > 0) itens.push({ nome, qtd, preco, subtotal: preco * qtd });
    });
    return itens;
}

function limparOrcamento() {
    if (!confirm('Limpar todos os itens?')) return;
    document.getElementById('itensOrcamento').innerHTML = '';
    document.getElementById('itensOrcamento').appendChild(criarLinhaItem());
    updateTotal();
    document.getElementById('selCliente').value = '';
    document.getElementById('resultadoProjeto').innerHTML = '';
    editandoOSId = null;
    atualizarStatus('🧹 Orçamento limpo!');
}

async function salvarOrcamento() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente!'); return; }
    const itens = pegarItensOrcamentoAtual();
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item!'); return; }
    const total = itens.reduce((sum, item) => sum + item.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);

    // Editando um orçamento já existente: atualiza em vez de criar um novo
    if (editandoOSId) {
        const osExistente = ordensServico.find(o => o.id === editandoOSId);
        if (!osExistente) { alert('⚠️ Não encontrei esse orçamento — talvez tenha sido removido.'); editandoOSId = null; return; }
        const osAtualizada = { ...osExistente, cliente_id: clienteData?.id || '', cliente_nome: cliente, itens, total };
        try {
            const { error } = await sb.from('ordens_servico').upsert(osAtualizada, { onConflict: 'id' });
            if (error) throw error;
            const idx = ordensServico.findIndex(o => o.id === editandoOSId);
            if (idx >= 0) ordensServico[idx] = osAtualizada;
            listarOS();
            atualizarStatus(`✅ Orçamento ${osAtualizada.numero} atualizado!`);
            registrarLog('OS_EDITADA', `OS ${osAtualizada.numero} editada`);
            alert(`✅ Orçamento ${osAtualizada.numero} atualizado!\nCliente: ${cliente}\nTotal: R$ ${total.toFixed(2)}`);
            editandoOSId = null;
            limparOrcamento();
            abrirTab('tabOS');
        } catch (e) {
            alert('❌ Erro ao atualizar orçamento: ' + e.message);
        }
        return;
    }

    const novaOS = {
        id: gerarId(),
        numero: 'OS-' + (ordensServico.length + 1).toString().padStart(4, '0'),
        cliente_id: clienteData?.id || '',
        cliente_nome: cliente,
        itens: itens,
        total: total,
        status: 'orcamento',
        data_criacao: new Date().toISOString()
    };
    try {
        const { error } = await sb.from('ordens_servico').upsert(novaOS, { onConflict: 'id' });
        if (error) throw error;
        ordensServico.push(novaOS);
        listarOS();
        atualizarStatus(`✅ Orçamento salvo! Nº ${novaOS.numero}`);
        registrarLog('OS_CRIADA', `OS ${novaOS.numero} criada para ${cliente}`);
        alert(`✅ Orçamento salvo!\nNº: ${novaOS.numero}\nCliente: ${cliente}\nTotal: R$ ${total.toFixed(2)}`);
        abrirTab('tabOS');
    } catch (e) {
        alert('❌ Erro ao salvar orçamento: ' + e.message);
    }
}

// ============================================
// ORDEM DE SERVIÇO
// ============================================

function listarOS(filtro = 'todos') {
    const container = document.getElementById('listaOS');
    if (!container) return;
    let lista = filtro !== 'todos' ? ordensServico.filter(os => os.status === filtro) : ordensServico;
    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhuma OS encontrada</p>';
        return;
    }
    const badges = {
        orcamento: '📄 Orçamento', aprovado: '✅ Aprovado', em_andamento: '🔧 Em Andamento',
        concluido: '✅ Concluído', cancelado: '❌ Cancelado'
    };
    container.innerHTML = lista.map(os => `
        <div class="os-card" onclick="abrirOS('${os.id}')">
            <div><strong>${os.numero}</strong> <span class="status-badge status-orcamento">${badges[os.status] || os.status}</span></div>
            <div><strong>Cliente:</strong> ${os.cliente_nome}</div>
            <div style="font-size:12px;color:#666;">${os.itens?.length || 0} itens | Total: R$ ${Number(os.total || 0).toFixed(2)}</div>
        </div>
    `).join('');
}

function filtrarOS() { listarOS(document.getElementById('filtroStatusOS').value); }

function abrirOS(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;
    const data = new Date(os.data_criacao).toLocaleDateString('pt-BR');
    let itensHTML = os.itens?.map((item, i) => `
        <tr><td>${i + 1}</td><td>${item.nome}</td><td>${item.qtd}</td><td>R$ ${Number(item.preco).toFixed(2)}</td><td>R$ ${Number(item.subtotal).toFixed(2)}</td></tr>
    `).join('') || '';
    document.getElementById('detalhesOS').innerHTML = `
        <div style="margin-bottom:10px;">
            <p><strong>Nº:</strong> ${os.numero}</p>
            <p><strong>Cliente:</strong> ${os.cliente_nome}</p>
            <p><strong>Status:</strong> ${os.status}</p>
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Total:</strong> R$ ${Number(os.total || 0).toFixed(2)}</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="background:#1a237e;color:white;">
                    <th style="padding:5px;">#</th><th style="padding:5px;">Produto</th>
                    <th style="padding:5px;">Qtd</th><th style="padding:5px;">Preço</th>
                    <th style="padding:5px;">Subtotal</th>
                </tr></thead>
                <tbody>${itensHTML}</tbody>
            </table>
        </div>
    `;
    document.getElementById('btnAprovarOS').style.display = os.status === 'orcamento' ? 'inline-block' : 'none';
    document.getElementById('btnIniciarOS').style.display = os.status === 'aprovado' ? 'inline-block' : 'none';
    document.getElementById('btnConcluirOS').style.display = os.status === 'em_andamento' ? 'inline-block' : 'none';
    document.getElementById('btnCancelarOS').style.display = os.status !== 'cancelado' && os.status !== 'concluido' ? 'inline-block' : 'none';
    document.getElementById('btnEmitirRecibo').style.display = os.status === 'concluido' ? 'inline-block' : 'none';
    osAtual = os;
    abrirModal('modalOS');
}

function editarOS(id) {
    const os = ordensServico.find(o => o.id === id) || osAtual;
    if (!os) return;
    editandoOSId = os.id;
    document.getElementById('selCliente').value = os.cliente_nome;
    const container = document.getElementById('itensOrcamento');
    container.innerHTML = '';
    (os.itens && os.itens.length ? os.itens : [{ nome: '', qtd: 1 }]).forEach(item => {
        container.appendChild(criarLinhaItem(item.nome, item.qtd));
    });
    updateTotal();
    fecharModal('modalOS');
    abrirTab('tabOrcamento');
    atualizarStatus(`✏️ Editando orçamento ${os.numero} — altere os itens e clique em Salvar`);
}

function reimprimirOS(id) {
    const os = ordensServico.find(o => o.id === id) || osAtual;
    if (!os) return;
    const clienteData = clientes.find(c => c.nome === os.cliente_nome);
    const { conteudo } = montarConteudoOrcamentoPDF(os.cliente_nome, os.itens || [], os.total || 0, clienteData);
    const nomeArquivo = `Orcamento_${EMPRESA.nomeAbreviado}_${os.numero}_${os.cliente_nome.replace(/\s/g, '_')}.pdf`;
    fecharModal('modalOS');
    baixarPDFDoConteudo(conteudo, nomeArquivo);
}

async function atualizarStatusOS(novoStatus, mensagem, acao) {
    if (!osAtual) return;
    const osAtualizada = { ...osAtual, status: novoStatus };
    if (novoStatus === 'aprovado') osAtualizada.data_aprovacao = new Date().toISOString();
    if (novoStatus === 'em_andamento') osAtualizada.data_inicio = new Date().toISOString();
    if (novoStatus === 'concluido') osAtualizada.data_conclusao = new Date().toISOString();
    try {
        const { error } = await sb.from('ordens_servico').upsert(osAtualizada, { onConflict: 'id' });
        if (error) throw error;
        const idx = ordensServico.findIndex(o => o.id === osAtualizada.id);
        if (idx >= 0) ordensServico[idx] = osAtualizada;
        osAtual = osAtualizada;
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(mensagem);
        registrarLog(acao, `OS ${osAtualizada.numero}: ${mensagem}`);
    } catch (e) {
        alert('❌ Erro ao atualizar OS: ' + e.message);
    }
}

async function aprovarOS() {
    if (!osAtual || !confirm(`Aprovar OS ${osAtual.numero}?`)) return;
    await atualizarStatusOS('aprovado', `✅ OS ${osAtual.numero} aprovada!`, 'OS_APROVADA');
}
async function iniciarOS() {
    if (!osAtual || !confirm(`Iniciar OS ${osAtual.numero}?`)) return;
    await atualizarStatusOS('em_andamento', `🔧 OS ${osAtual.numero} em andamento!`, 'OS_INICIADA');
}
async function concluirOS() {
    if (!osAtual || !confirm(`Concluir OS ${osAtual.numero}?`)) return;
    await atualizarStatusOS('concluido', `✅ OS ${osAtual.numero} concluída!`, 'OS_CONCLUIDA');
}
async function cancelarOS() {
    if (!osAtual || !confirm(`Cancelar OS ${osAtual.numero}?`)) return;
    await atualizarStatusOS('cancelado', `❌ OS ${osAtual.numero} cancelada!`, 'OS_CANCELADA');
}

async function emitirRecibo() {
    if (!osAtual || osAtual.status !== 'concluido') { alert('⚠️ A OS precisa estar concluída!'); return; }
    const recibo = {
        id: gerarId(),
        numero: 'REC-' + (recibos.length + 1).toString().padStart(4, '0'),
        os_id: osAtual.id, os_numero: osAtual.numero,
        cliente_id: osAtual.cliente_id, cliente_nome: osAtual.cliente_nome,
        itens: osAtual.itens, total: osAtual.total,
        status: 'pendente', data_emissao: new Date().toISOString(), data_pagamento: null
    };
    try {
        const { error } = await sb.from('recibos').upsert(recibo, { onConflict: 'id' });
        if (error) throw error;
        recibos.push(recibo);
        listarRecibos();
        fecharModal('modalOS');
        atualizarStatus(`💰 Recibo ${recibo.numero} emitido!`);
        registrarLog('RECIBO_EMITIDO', `Recibo ${recibo.numero} emitido para ${osAtual.cliente_nome}`);
        abrirRecibo(recibo.id);
    } catch (e) {
        alert('❌ Erro ao emitir recibo: ' + e.message);
    }
}

// ============================================
// RECIBOS
// ============================================

function listarRecibos(filtro = 'todos') {
    const container = document.getElementById('listaRecibos');
    if (!container) return;
    let lista = filtro !== 'todos' ? recibos.filter(r => r.status === filtro) : recibos;
    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhum recibo encontrado</p>';
        return;
    }
    container.innerHTML = lista.map(r => {
        const data = new Date(r.data_emissao).toLocaleDateString('pt-BR');
        const status = r.status === 'pago' ? '✅ Pago' : '⏳ Pendente';
        return `
            <div class="os-card" onclick="abrirRecibo('${r.id}')">
                <div><strong>${r.numero}</strong> <span class="status-badge ${r.status === 'pago' ? 'status-recebido' : 'status-orcamento'}">${status}</span></div>
                <div><strong>Cliente:</strong> ${r.cliente_nome}</div>
                <div style="font-size:12px;color:#666;">OS: ${r.os_numero} | Total: R$ ${Number(r.total || 0).toFixed(2)} | ${data}</div>
            </div>
        `;
    }).join('');
}

function filtrarRecibos() { listarRecibos(document.getElementById('filtroRecibo').value); }

function abrirRecibo(id) {
    reciboAtual = recibos.find(r => r.id === id);
    if (!reciboAtual) return;
    const data = new Date(reciboAtual.data_emissao).toLocaleDateString('pt-BR');
    let itensHTML = reciboAtual.itens?.map((item, i) => `
        <tr><td>${i + 1}</td><td>${item.nome}</td><td>${item.qtd}</td><td>R$ ${Number(item.preco).toFixed(2)}</td><td>R$ ${Number(item.subtotal).toFixed(2)}</td></tr>
    `).join('') || '';
    document.getElementById('conteudoRecibo').innerHTML = `
        <div style="text-align:center;border-bottom:2px solid #1a237e;padding-bottom:10px;margin-bottom:15px;">
            <h2 style="color:#1a237e;">${EMPRESA.nome}</h2>
            <p style="color:#666;font-size:12px;">${EMPRESA.cnpj} | ${EMPRESA.endereco}</p>
            <h3>RECIBO</h3>
        </div>
        <div style="margin-bottom:10px;">
            <p><strong>Nº:</strong> ${reciboAtual.numero}</p>
            <p><strong>OS:</strong> ${reciboAtual.os_numero}</p>
            <p><strong>Cliente:</strong> ${reciboAtual.cliente_nome}</p>
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Status:</strong> ${reciboAtual.status === 'pago' ? '✅ PAGO' : '⏳ PENDENTE'}</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="background:#1a237e;color:white;">
                    <th style="padding:5px;">#</th><th style="padding:5px;">Produto</th>
                    <th style="padding:5px;">Qtd</th><th style="padding:5px;">Preço</th>
                    <th style="padding:5px;">Subtotal</th>
                </tr></thead>
                <tbody>${itensHTML}</tbody>
            </table>
        </div>
        <div style="text-align:right;padding:10px;font-size:18px;font-weight:bold;border-top:2px solid #1a237e;margin-top:10px;">
            TOTAL: R$ ${Number(reciboAtual.total || 0).toFixed(2)}
        </div>
        <div class="assinatura">
            <p>Assinatura do Cliente</p>
            <div style="height:40px;"></div>
            <p>_________________________</p>
        </div>
    `;
    document.getElementById('btnMarcarPago').style.display = reciboAtual.status === 'pendente' ? 'inline-block' : 'none';
    abrirModal('modalRecibo');
}

async function marcarPago() {
    if (!reciboAtual || !confirm(`Marcar recibo ${reciboAtual.numero} como PAGO?`)) return;
    try {
        const dataPagamento = new Date().toISOString();
        const { error } = await sb.from('recibos')
            .update({ status: 'pago', data_pagamento: dataPagamento }).eq('id', reciboAtual.id);
        if (error) throw error;
        reciboAtual.status = 'pago';
        reciboAtual.data_pagamento = dataPagamento;
        const idx = recibos.findIndex(r => r.id === reciboAtual.id);
        if (idx >= 0) recibos[idx] = reciboAtual;
        listarRecibos();
        abrirRecibo(reciboAtual.id);
        atualizarStatus(`✅ Recibo ${reciboAtual.numero} pago!`);
        registrarLog('RECIBO_PAGO', `Recibo ${reciboAtual.numero} marcado como pago`);
    } catch (e) {
        alert('❌ Erro ao marcar como pago: ' + e.message);
    }
}

function imprimirRecibo() {
    if (!reciboAtual) return;
    const conteudo = document.getElementById('conteudoRecibo').innerHTML;
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
        <html><head><title>Recibo ${reciboAtual.numero}</title>
        <style>body{font-family:Arial;padding:40px;max-width:800px;margin:0 auto;}
        .recibo-area{background:white;padding:20px;border:1px solid #ddd;}
        table{width:100%;border-collapse:collapse;}th{background:#1a237e;color:white;padding:8px;text-align:left;}
        td{padding:8px;border-bottom:1px solid #ddd;}.assinatura{border-top:1px solid #333;margin-top:20px;padding-top:10px;text-align:center;}
        .total{text-align:right;font-size:18px;font-weight:bold;margin-top:10px;}
        @media print{.no-print{display:none;}}</style>
        </head><body><div class="recibo-area">${conteudo}</div>
        <script>window.onload=function(){window.print();}<\/script></body></html>
    `);
    win.document.close();
}

// ============================================
// GERAR PDF - MODELO SE7VEN ENERGIA
// ============================================

function montarConteudoOrcamentoPDF(cliente, itens, total, clienteData) {
    const data = new Date();
    const dataFormatada = data.toLocaleDateString('pt-BR');
    const dataInvertida = data.getDate().toString().padStart(2, '0') + '/' +
        (data.getMonth() + 1).toString().padStart(2, '0') + '/' + data.getFullYear();
    const numeroOrcamento = 'ORC-' + Date.now().toString().slice(-6);
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

    const conteudo = `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Orçamento ${EMPRESA.nome}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a237e; padding-bottom: 15px; margin-bottom: 15px; }
            .header .marca { display: flex; align-items: center; gap: 12px; }
            .header img { height: 55px; width: auto; border-radius: 8px; object-fit: contain; }
            .header h1 { color: #1a237e; font-size: 22px; font-weight: 900; letter-spacing: 1px; margin: 0; }
            .header .subtitle { color: #666; font-size: 11px; font-weight: bold; margin: 2px 0 0 0; letter-spacing: 1px; }
            .header .doc-info { text-align: right; font-size: 12px; color: #444; }
            .header .doc-info .tag { display: inline-block; background: #1a237e; color: white; font-weight: bold; font-size: 13px; padding: 4px 10px; border-radius: 4px; margin-bottom: 6px; }
            .empresa-dados { font-size: 11px; color: #555; margin-bottom: 20px; line-height: 1.5; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
            .empresa-dados strong { color: #1a237e; }
            .cliente-box { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #1a237e; }
            .cliente-box .titulo { color: #1a237e; font-size: 14px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; }
            .cliente-box p { margin: 3px 0; font-size: 14px; }
            .cliente-box .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
            table thead { background: #1a237e; color: white; }
            table th { padding: 10px 12px; text-align: left; }
            table td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
            table tr:last-child td { border-bottom: none; }
            .text-center { text-align: center; } .text-right { text-align: right; }
            .total-box { text-align: right; padding: 12px; font-size: 18px; font-weight: bold; border-top: 2px solid #1a237e; margin: 10px 0 30px 0; }
            .pagamento { background: #e8f5e9; padding: 15px; border-radius: 4px; border-left: 4px solid #2e7d32; margin-top: 20px; }
            .pagamento .titulo { font-weight: bold; color: #1a237e; }
            .pagamento p { margin: 0; font-size: 14px; }
            .observacoes { margin-top: 15px; font-size: 11px; color: #666; }
            .observacoes li { margin: 3px 0 3px 15px; }
            .rodape { margin-top: 30px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #ddd; padding-top: 15px; }
            .rodape p { margin: 2px 0; } .rodape .destaque { color: #1a237e; font-weight: bold; }
            @media print { body { padding: 20px; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="marca">
                <img src="${baseUrl}logo.png" alt="${EMPRESA.nomeAbreviado}" onerror="this.style.display='none'">
                <div>
                    <h1>${EMPRESA.nome}</h1>
                    <p class="subtitle">ORÇAMENTO DE SERVIÇOS ELÉTRICOS</p>
                </div>
            </div>
            <div class="doc-info">
                <span class="tag">Nº ${numeroOrcamento}</span><br>
                Data: ${dataInvertida}
            </div>
        </div>
        <div class="empresa-dados">
            <strong>${EMPRESA.nome}</strong> — CNPJ: ${EMPRESA.cnpj}<br>
            ${EMPRESA.endereco} &nbsp;|&nbsp; 📞 ${EMPRESA.telefone} &nbsp;|&nbsp; 📧 ${EMPRESA.email} &nbsp;|&nbsp; 📷 ${EMPRESA.instagram}
        </div>
        <div class="cliente-box">
            <div class="titulo">CLIENTE:</div>
            <p><span class="label">Nome:</span> ${cliente}</p>
            ${clienteData?.telefone ? `<p><span class="label">Cel:</span> ${clienteData.telefone}</p>` : ''}
            ${clienteData?.cpf ? `<p><span class="label">CPF/CNPJ:</span> ${clienteData.cpf}</p>` : ''}
            ${clienteData?.endereco ? `<p><span class="label">Endereço:</span> ${clienteData.endereco}</p>` : ''}
        </div>
        <table>
            <thead><tr><th style="width:8%;">Nº</th><th style="width:42%;">Descrição</th><th style="width:15%;text-align:right;">Preço</th><th style="width:10%;text-align:center;">Qt.</th><th style="width:25%;text-align:right;">Total</th></tr></thead>
            <tbody>
                ${itens.map((item, index) => `
                    <tr><td class="text-center">${index + 1}</td><td>${item.nome}</td><td class="text-right">R$ ${item.preco.toFixed(2)}</td><td class="text-center">${item.qtd}</td><td class="text-right"><strong>R$ ${item.subtotal.toFixed(2)}</strong></td></tr>
                `).join('')}
            </tbody>
        </table>
        <div class="total-box"><strong>Total: R$ ${total.toFixed(2)}</strong></div>
        <div class="pagamento"><p class="titulo">FORMA DE PAGAMENTO</p><p>${EMPRESA.formasPagamento.join(' • ')}</p></div>
        <ul class="observacoes">
            ${EMPRESA.observacoes.map(obs => `<li>${obs}</li>`).join('')}
        </ul>
        <div class="rodape"><p><span class="destaque">${EMPRESA.nome}</span> — CNPJ ${EMPRESA.cnpj}</p><p>📧 ${EMPRESA.email} | 📱 ${EMPRESA.telefone} | 📷 ${EMPRESA.instagram}</p></div>
    </body></html>
    `;

    return { conteudo, dataFormatada, numeroOrcamento };
}

function baixarPDFDoConteudo(conteudo, nomeArquivo) {
    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!win) { alert('⚠️ Por favor, permita pop-ups para gerar o PDF'); return; }
    win.document.write(conteudo);
    win.document.close();

    setTimeout(() => {
        try {
            const script = win.document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = function () {
                const element = win.document.body;
                const opt = {
                    margin: 0.5,
                    filename: nomeArquivo,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                win.html2pdf().set(opt).from(element).save().then(() => {
                    win.close();
                    atualizarStatus('✅ PDF gerado com sucesso!');
                }).catch(() => {
                    win.document.body.innerHTML += `<div style="text-align:center;margin-top:20px;padding:20px;"><button onclick="window.print()" style="padding:12px 24px;background:#1a237e;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;">🖨️ Salvar como PDF</button></div>`;
                    atualizarStatus('⚠️ Use "Imprimir" para salvar o PDF');
                });
            };
            script.onerror = function () {
                win.document.body.innerHTML += `<div style="text-align:center;margin-top:20px;padding:20px;"><button onclick="window.print()" style="padding:12px 24px;background:#1a237e;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;">🖨️ Salvar como PDF</button></div>`;
                atualizarStatus('⚠️ Use "Imprimir" para salvar o PDF');
            };
            win.document.head.appendChild(script);
        } catch (err) {
            win.close();
            alert('❌ Erro ao gerar PDF. Tente novamente.');
        }
    }, 1500);
}

function gerarPDF() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente'); return; }
    const itens = pegarItensOrcamentoAtual();
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item ao orçamento'); return; }

    const total = itens.reduce((sum, item) => sum + item.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);
    const { conteudo, dataFormatada } = montarConteudoOrcamentoPDF(cliente, itens, total, clienteData);
    const nomeArquivo = `Orcamento_${EMPRESA.nomeAbreviado}_${cliente.replace(/\s/g, '_')}_${dataFormatada.replace(/\//g, '-')}.pdf`;
    baixarPDFDoConteudo(conteudo, nomeArquivo);
}

// ============================================
// WHATSAPP
// ============================================

function formatarTelefoneWhatsApp(telefone) {
    let digitos = (telefone || '').replace(/\D/g, '');
    if (!digitos) return null;
    if (digitos.length <= 11) digitos = '55' + digitos; // adiciona DDI Brasil se não tiver
    return digitos;
}

function montarMensagemOrcamento(cliente, itens, total) {
    const data = new Date();
    const dataFormatada = data.getDate().toString().padStart(2, '0') + '/' +
        (data.getMonth() + 1).toString().padStart(2, '0') + '/' + data.getFullYear();

    let msg = `*${EMPRESA.nomeAbreviado} ENERGIA - ORÇAMENTO*\n\n`;
    msg += `📅 Data: ${dataFormatada}\n`;
    msg += `👤 Cliente: ${cliente}\n\n`;
    msg += `*ITENS:*\n`;
    itens.forEach((item, i) => {
        msg += `${i + 1}. ${item.nome} - ${item.qtd}x R$ ${item.preco.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n`;
    });
    msg += `\n*TOTAL: R$ ${total.toFixed(2)}*\n\n`;
    msg += `💳 *Formas de Pagamento:*\n`;
    EMPRESA.formasPagamento.forEach(fp => { msg += `✅ ${fp}\n`; });
    msg += `\n📱 *Entre em contato para mais informações!*`;
    return msg;
}

function enviarWhatsApp() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente'); return; }
    const itens = pegarItensOrcamentoAtual();
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item ao orçamento'); return; }
    const total = itens.reduce((s, i) => s + i.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);
    const numero = formatarTelefoneWhatsApp(clienteData?.telefone) || EMPRESA.whatsapp;
    if (!clienteData?.telefone) alert('ℹ️ Esse cliente não tem celular cadastrado — a mensagem vai abrir para o número da própria empresa.');
    const mensagem = montarMensagemOrcamento(cliente, itens, total);
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
    registrarLog('WHATSAPP_ENVIADO', `Orçamento para ${cliente} aberto no WhatsApp`);
}

async function enviarPDFWhatsApp() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente'); return; }
    const itens = pegarItensOrcamentoAtual();
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item ao orçamento'); return; }
    const total = itens.reduce((s, i) => s + i.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);
    const { conteudo, dataFormatada } = montarConteudoOrcamentoPDF(cliente, itens, total, clienteData);
    const mensagem = montarMensagemOrcamento(cliente, itens, total);
    const nomeArquivo = `Orcamento_${EMPRESA.nomeAbreviado}_${cliente.replace(/\s/g, '_')}_${dataFormatada.replace(/\//g, '-')}.pdf`;

    atualizarStatus('⏳ Gerando PDF para compartilhar...');

    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!win) { alert('⚠️ Por favor, permita pop-ups para gerar o PDF'); return; }
    win.document.write(conteudo);
    win.document.close();

    setTimeout(() => {
        const script = win.document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = async function () {
            try {
                const opt = {
                    margin: 0.5,
                    filename: nomeArquivo,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                const blob = await win.html2pdf().set(opt).from(win.document.body).outputPdf('blob');
                win.close();

                // Tenta o compartilhamento nativo do celular (anexa o PDF direto na conversa).
                // Só existe em navegadores mobile modernos (Android/iOS); no computador cai no plano B.
                const arquivo = new File([blob], nomeArquivo, { type: 'application/pdf' });
                if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
                    try {
                        await navigator.share({ files: [arquivo], title: `Orçamento ${cliente}`, text: mensagem });
                        atualizarStatus('✅ PDF enviado para compartilhar!');
                        registrarLog('WHATSAPP_ENVIADO', `Orçamento (PDF) para ${cliente} compartilhado`);
                        return;
                    } catch (e) {
                        if (e.name === 'AbortError') { atualizarStatus('Envio cancelado'); return; } // usuário cancelou o compartilhamento
                    }
                }

                // Plano B (computador ou navegador sem suporte a compartilhar arquivos):
                // baixa o PDF e abre o WhatsApp com a mensagem — falta só anexar o arquivo na mão.
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = nomeArquivo; a.click();
                URL.revokeObjectURL(url);
                alert('📄 Seu navegador baixou o PDF, mas não consegue anexá-lo automaticamente ao WhatsApp. Vou abrir a conversa com a mensagem pronta — é só anexar o arquivo que acabou de baixar.');
                window.open(`https://wa.me/${formatarTelefoneWhatsApp(clienteData?.telefone) || EMPRESA.whatsapp}?text=${encodeURIComponent(mensagem)}`, '_blank');
                registrarLog('WHATSAPP_ENVIADO', `Orçamento para ${cliente}: PDF baixado + WhatsApp aberto`);
            } catch (err) {
                win.close();
                alert('❌ Erro ao gerar o PDF para envio. Tente novamente.');
            }
        };
        script.onerror = function () {
            win.close();
            alert('❌ Não foi possível carregar o gerador de PDF. Verifique sua internet e tente de novo.');
        };
        win.document.head.appendChild(script);
    }, 1500);
}

// ============================================
// CÁLCULOS ELÉTRICOS
// ============================================

function bitolaMinimaPorAmpacidade(corrente) {
    for (const [b, cap] of Object.entries(TABELA_AMPACIDADE)) {
        if (cap >= corrente) return parseFloat(b);
    }
    return null;
}

function calcularQuedaPercentual(corrente, distancia, bitola, tensao, fases) {
    const fator = fases === 3 ? Math.sqrt(3) : 2;
    const quedaVolts = (fator * distancia * corrente * RESISTIVIDADE_COBRE) / bitola;
    return (quedaVolts / tensao) * 100;
}

function dimensionarCabos() {
    const corrente = parseFloat(document.getElementById('correnteCabos').value);
    if (!corrente || corrente <= 0) { alert('⚠️ Informe a corrente!'); return; }
    const bitola = bitolaMinimaPorAmpacidade(corrente);
    document.getElementById('resultadoCabos').innerHTML = bitola ?
        `✅ Bitola recomendada: ${bitola} mm²` : '⚠️ Corrente muito alta! Consulte um projeto específico.';
}

function calcularQuedaTensao() {
    const corrente = parseFloat(document.getElementById('correnteQueda').value);
    const distancia = parseFloat(document.getElementById('distanciaQueda').value);
    const bitola = parseFloat(document.getElementById('bitolaQueda').value);
    const tensao = parseFloat(document.getElementById('tensaoQueda').value);
    if (!corrente || !distancia || !bitola || !tensao) { alert('⚠️ Preencha todos os campos!'); return; }
    const fases = tensao === 380 ? 3 : 1;
    const quedaPercentual = calcularQuedaPercentual(corrente, distancia, bitola, tensao, fases);
    const status = quedaPercentual <= 3 ? '✅ Dentro do recomendado (≤3%)'
        : quedaPercentual <= 5 ? '⚠️ Aceitável, mas no limite (até 5%)'
        : '❌ Acima do recomendado — considere um cabo mais grosso ou menor distância';
    document.getElementById('resultadoQueda').innerHTML =
        `📉 Queda de tensão: <strong>${quedaPercentual.toFixed(2)}%</strong><br>${status}`;
}

function calcularDemanda() {
    const potencia = parseFloat(document.getElementById('potenciaDemanda').value);
    const tensao = parseFloat(document.getElementById('tensaoDemanda').value);
    const fp = parseFloat(document.getElementById('fpDemanda').value) || 0.92;
    if (!potencia || !tensao) { alert('⚠️ Preencha potência e tensão!'); return; }
    const fases = tensao === 380 ? 3 : 1;
    const corrente = fases === 3 ? potencia / (Math.sqrt(3) * tensao * fp) : potencia / (tensao * fp);
    const demandaKVA = potencia / (1000 * fp);
    document.getElementById('resultadoDemanda').innerHTML =
        `💡 Corrente estimada: <strong>${corrente.toFixed(2)} A</strong><br>Demanda: <strong>${demandaKVA.toFixed(2)} kVA</strong>`;
}

function calcularProjeto() {
    const potencia = parseFloat(document.getElementById('potenciaProjeto').value);
    const distancia = parseFloat(document.getElementById('distancia').value);
    const tensao = parseFloat(document.getElementById('tensao').value);
    const fp = parseFloat(document.getElementById('fp').value) || 0.92;
    const quedaMax = parseFloat(document.getElementById('quedaMax').value) || 3;
    if (!potencia || !distancia || !tensao) { alert('⚠️ Preencha ao menos a potência, distância e tensão!'); return; }

    const fases = tensao === 380 ? 3 : 1;
    const corrente = fases === 3 ? potencia / (Math.sqrt(3) * tensao * fp) : potencia / (tensao * fp);

    let bitolaEscolhida = bitolaMinimaPorAmpacidade(corrente);
    if (!bitolaEscolhida) {
        document.getElementById('resultadoProjeto').innerHTML = '❌ Corrente muito alta para a tabela padrão — consulte um projeto específico.';
        return;
    }
    // Sobe de bitola até a queda de tensão ficar dentro do limite escolhido
    let quedaFinal = calcularQuedaPercentual(corrente, distancia, bitolaEscolhida, tensao, fases);
    const bitolasOrdenadas = Object.keys(TABELA_AMPACIDADE).map(Number).sort((a, b) => a - b);
    let i = bitolasOrdenadas.indexOf(bitolaEscolhida);
    while (quedaFinal > quedaMax && i < bitolasOrdenadas.length - 1) {
        i++;
        bitolaEscolhida = bitolasOrdenadas[i];
        quedaFinal = calcularQuedaPercentual(corrente, distancia, bitolaEscolhida, tensao, fases);
    }

    const statusQueda = quedaFinal <= quedaMax ? '✅ dentro do limite definido' : '⚠️ acima do limite — considere reduzir a distância';
    document.getElementById('resultadoProjeto').innerHTML = `
        ⚡ Corrente estimada: <strong>${corrente.toFixed(2)} A</strong><br>
        📏 Bitola recomendada: <strong>${bitolaEscolhida} mm²</strong><br>
        📉 Queda de tensão resultante: <strong>${quedaFinal.toFixed(2)}%</strong> (${statusQueda})
    `;
}

// ============================================
// FUNÇÕES DE INTERFACE
// ============================================

function atualizarStatus(msg, tipo = 'success') {
    const bar = document.getElementById('statusBar');
    if (!bar) return;
    bar.textContent = msg;
    bar.className = 'status-bar';
    if (tipo === 'success') bar.classList.add('success');
    else if (tipo === 'error') bar.classList.add('error');
}

function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

function abrirTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

function carregarLogo() {
    const header = document.getElementById('headerLogo');
    if (!header) return;
    header.innerHTML = `
        <img src="logo.png" alt="SE7VEN" style="height:35px; width:auto; border-radius:8px; object-fit:contain; margin-right:10px;" onerror="this.style.display='none'">
        <h1 class="logo-title">SE7VEN SOLUÇÕES ENERGÉTICAS</h1>
    `;
}

// ============================================
// USUÁRIOS (somente leitura - contas reais do Supabase Auth)
// ============================================

function listarUsuarios() {
    const container = document.getElementById('listaUsuarios');
    if (!container) return;
    if (!perfis.length) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:10px;">Nenhum usuário encontrado</p>';
        return;
    }
    container.innerHTML = perfis.map(p => `
        <div class="user-item">
            <span><strong>${p.nome}</strong></span>
            <span class="role">${p.tipo}</span>
        </div>
    `).join('');
}

// ============================================
// LOGS (sincronizados com o Supabase)
// ============================================

async function registrarLog(acao, detalhes) {
    const entry = { data: new Date().toISOString(), usuario: usuarioAtual?.nome || 'Sistema', acao, detalhes };
    logs.unshift(entry);
    renderizarLogs();
    if (!sb) return;
    try {
        const { error } = await sb.from('logs').insert(entry);
        if (error) console.warn('Não foi possível gravar o log:', error.message);
    } catch (e) { console.warn('Não foi possível gravar o log:', e.message); }
}

function renderizarLogs() {
    const container = document.getElementById('logList');
    if (!container) return;
    if (logs.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:10px;">Nenhum registro de atividade</p>';
        return;
    }
    container.innerHTML = logs.slice(0, 100).map(log => `
        <div class="entry">
            <span>${log.acao}: ${log.detalhes}</span>
            <span class="time">${new Date(log.data).toLocaleString('pt-BR')} - ${log.usuario}</span>
        </div>
    `).join('');
}

async function limparLogs() {
    if (!confirm('Limpar todos os logs (de todos os dispositivos)?')) return;
    try {
        await sb.from('logs').delete().neq('id', 0);
        logs = [];
        renderizarLogs();
        atualizarStatus('🗑️ Logs limpos!');
    } catch (e) {
        alert('❌ Erro ao limpar logs: ' + e.message);
    }
}

// ============================================
// CATÁLOGO PADRÃO DE PRODUTOS
// ============================================

function gerarProdutos() {
    const lista = [
        { nome: 'Cabo de Cobre 1,5mm² (100m)', preco: 180.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 2,5mm² (100m)', preco: 280.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 4mm² (100m)', preco: 420.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 6mm² (100m)', preco: 580.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 10mm² (100m)', preco: 890.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 20mm (3m)', preco: 15.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 25mm (3m)', preco: 20.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 32mm (3m)', preco: 28.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 10A', preco: 25.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 16A', preco: 28.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 20A', preco: 30.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 10A', preco: 45.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 16A', preco: 50.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 10A', preco: 65.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 16A', preco: 75.00, tipo: 'material' },
        { nome: 'Interruptor Simples Branco', preco: 8.00, tipo: 'material' },
        { nome: 'Interruptor Duplo Branco', preco: 14.00, tipo: 'material' },
        { nome: 'Tomada 10A 2P+T Branca', preco: 12.00, tipo: 'material' },
        { nome: 'Tomada 20A 2P+T Branca', preco: 18.00, tipo: 'material' },
        { nome: 'Tomada com USB Branca', preco: 65.00, tipo: 'material' },
        { nome: 'Lâmpada LED 9W Branca', preco: 15.00, tipo: 'material' },
        { nome: 'Lâmpada LED 12W Branca', preco: 20.00, tipo: 'material' },
        { nome: 'Lâmpada LED 15W Branca', preco: 28.00, tipo: 'material' },
        { nome: 'Lâmpada LED 20W Branca', preco: 38.00, tipo: 'material' },
        { nome: 'Lâmpada LED 30W Branca', preco: 55.00, tipo: 'material' },
        { nome: 'Lâmpada LED 50W Branca', preco: 85.00, tipo: 'material' },
        { nome: 'Refletor LED 50W', preco: 120.00, tipo: 'material' },
        { nome: 'Refletor LED 100W', preco: 200.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 4 Caminhos', preco: 120.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 6 Caminhos', preco: 160.00, tipo: 'material' },
        { nome: 'Fita Isolante 19mm x 20m', preco: 8.00, tipo: 'material' },
        { nome: 'Fita Isolante 19mm x 50m', preco: 18.00, tipo: 'material' },
        { nome: 'DR 40A 30mA', preco: 250.00, tipo: 'material' },
        { nome: 'DR 63A 30mA', preco: 320.00, tipo: 'material' },
        { nome: 'Inversor Solar 1kW', preco: 1200.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 3kW', preco: 2800.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 5kW', preco: 4200.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 1kW', preco: 3500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 3kW', preco: 9500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 5kW', preco: 15500.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 300W', preco: 800.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 450W', preco: 1200.00, tipo: 'equipamento' },
        { nome: 'Transformador 1kVA', preco: 800.00, tipo: 'equipamento' },
        { nome: 'Transformador 5kVA', preco: 2200.00, tipo: 'equipamento' },
        { nome: 'Instalação Elétrica Residencial (por m²)', preco: 120.00, tipo: 'servico' },
        { nome: 'Instalação Elétrica Comercial (por m²)', preco: 150.00, tipo: 'servico' },
        { nome: 'Instalação de Quadro de Distribuição', preco: 500.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema Solar (por kWp)', preco: 600.00, tipo: 'servico' },
        { nome: 'Instalação de Tomadas (por ponto)', preco: 80.00, tipo: 'servico' },
        { nome: 'Instalação de Interruptores (por ponto)', preco: 70.00, tipo: 'servico' },
        { nome: 'Instalação de Lâmpadas (por ponto)', preco: 60.00, tipo: 'servico' },
        { nome: 'Manutenção Preventiva Elétrica', preco: 80.00, tipo: 'servico' },
        { nome: 'Manutenção Corretiva Elétrica (por hora)', preco: 120.00, tipo: 'servico' },
        { nome: 'Projeto Elétrico Residencial', preco: 800.00, tipo: 'servico' },
        { nome: 'Projeto Elétrico Comercial', preco: 1200.00, tipo: 'servico' },
        { nome: 'Projeto de Energia Solar', preco: 3000.00, tipo: 'servico' },
        { nome: 'Laudo Técnico Elétrico', preco: 800.00, tipo: 'servico' },
        { nome: 'Inspeção Técnica Elétrica', preco: 600.00, tipo: 'servico' }
    ];
    let id = 1;
    return lista.map(item => ({ id: String(id++), nome: item.nome, preco: item.preco, tipo: item.tipo }));
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================
// BACKUP (JSON local — continua útil como cópia de segurança extra)
// ============================================

function exportarDados() {
    const dados = { clientes, produtos, ordensServico, recibos, logs, data: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    atualizarStatus('✅ Backup exportado!');
    registrarLog('EXPORTAR', 'Dados exportados');
}

async function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (!dados.clientes) { alert('❌ Arquivo inválido!'); return; }
            if (!confirm('Isso vai enviar os dados do backup para o Supabase (mesclando com o que já existe). Continuar?')) return;
            if (dados.clientes?.length) await sb.from('clientes').upsert(dados.clientes, { onConflict: 'id' });
            if (dados.produtos?.length) await sb.from('produtos').upsert(dados.produtos, { onConflict: 'id' });
            if (dados.ordensServico?.length) await sb.from('ordens_servico').upsert(dados.ordensServico, { onConflict: 'id' });
            if (dados.recibos?.length) await sb.from('recibos').upsert(dados.recibos, { onConflict: 'id' });
            await sincronizarDados();
            atualizarStatus('✅ Dados importados!');
            registrarLog('IMPORTAR', 'Dados importados do JSON');
            alert('✅ Dados importados com sucesso!');
        } catch (err) {
            alert('❌ Erro ao importar: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function backupGit() { exportarDados(); }

function backupGoogleDrive() {
    exportarDados();
    setTimeout(() => { alert('📤 Backup criado!\n\nSalve o arquivo no Google Drive para ter seu backup na nuvem.'); }, 1000);
}

function restaurarGoogleDrive() { document.getElementById('fileInput').click(); }

function atualizarEstatisticas() {
    try {
        const el1 = document.getElementById('statsClientes');
        const el2 = document.getElementById('statsProdutos');
        const el3 = document.getElementById('statsOS');
        const el4 = document.getElementById('statsRecibos');
        if (el1) el1.textContent = `Clientes: ${clientes.length}`;
        if (el2) el2.textContent = `Produtos: ${produtos.length}`;
        if (el3) el3.textContent = `Ordens de Serviço: ${ordensServico.length}`;
        if (el4) el4.textContent = `Recibos: ${recibos.length}`;
    } catch (e) {}
}

function limparDadosLocais() {
    if (!confirm('Isso limpa apenas o cache local deste navegador (os dados no Supabase continuam intactos). Continuar?')) return;
    try {
        localStorage.clear();
        atualizarStatus('🗑️ Cache local limpo! Recarregando...');
        setTimeout(() => location.reload(), 800);
    } catch (e) {}
}

function recarregarDados() {
    sincronizarDados();
    atualizarStatus('🔄 Dados recarregados!');
}

// ============================================
// INICIALIZAÇÃO
// ============================================

function init() {
    console.log('🚀 Inicializando sistema...');
    renderClientes();
    renderProdutos();
    renderSelectClientes();
    renderSelectProdutos();
    updateTotal();
    listarOS();
    listarRecibos();
    renderizarLogs();
    listarUsuarios();
    carregarLogo();
    iniciarSincronizacaoAutomatica();
    atualizarStatus(`✅ Sistema pronto!`);
    console.log('✅ Sistema inicializado!');
}

// ============================================
// EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('📄 DOM carregado!');

    if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            await entrarNoSistema(session.user);
        } else {
            mostrarTelaLogin();
        }
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && !usuarioAtual) entrarNoSistema(session.user);
            if (event === 'SIGNED_OUT') mostrarTelaLogin();
        });
    } else {
        mostrarTelaLogin();
    }

    // Eventos de Login
    document.getElementById('loginEmail')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') document.getElementById('loginSenha').focus();
    });
    document.getElementById('loginSenha')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') fazerLogin();
    });

    // Eventos dos Botões
    document.getElementById('btnNovo')?.addEventListener('click', function () {
        abrirTab('tabOrcamento');
        document.getElementById('tabOrcamento')?.scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('btnAddCliente')?.addEventListener('click', function () {
        abrirModal('modalCliente');
        document.getElementById('nomeCliente').focus();
    });
    document.getElementById('btnAddProduto')?.addEventListener('click', function () {
        abrirModal('modalProduto');
        document.getElementById('nomeProduto').focus();
    });
    document.getElementById('btnAddItem')?.addEventListener('click', adicionarItem);
    document.getElementById('btnLimpar')?.addEventListener('click', limparOrcamento);
    document.getElementById('btnSalvarOrcamento')?.addEventListener('click', salvarOrcamento);
    document.getElementById('btnGerarPDF')?.addEventListener('click', gerarPDF);
    document.getElementById('btnEnviarPDF')?.addEventListener('click', enviarPDFWhatsApp);
    document.getElementById('btnWhatsApp')?.addEventListener('click', enviarWhatsApp);
    document.getElementById('salvarCliente')?.addEventListener('click', adicionarCliente);
    document.getElementById('salvarProduto')?.addEventListener('click', adicionarProduto);
    document.getElementById('btnBuscarCNPJ')?.addEventListener('click', buscarCNPJ);
    document.getElementById('fecharModalCliente')?.addEventListener('click', function () { fecharModal('modalCliente'); });
    document.getElementById('fecharModalProduto')?.addEventListener('click', function () { fecharModal('modalProduto'); });
    document.getElementById('btnFecharOS')?.addEventListener('click', function () { fecharModal('modalOS'); });
    document.getElementById('btnFecharRecibo')?.addEventListener('click', function () { fecharModal('modalRecibo'); });

    // Eventos da OS
    document.getElementById('btnEditarOS')?.addEventListener('click', () => editarOS(osAtual?.id));
    document.getElementById('btnReimprimirOS')?.addEventListener('click', () => reimprimirOS(osAtual?.id));
    document.getElementById('btnAprovarOS')?.addEventListener('click', aprovarOS);
    document.getElementById('btnIniciarOS')?.addEventListener('click', iniciarOS);
    document.getElementById('btnConcluirOS')?.addEventListener('click', concluirOS);
    document.getElementById('btnCancelarOS')?.addEventListener('click', cancelarOS);
    document.getElementById('btnEmitirRecibo')?.addEventListener('click', emitirRecibo);

    // Eventos do Recibo
    document.getElementById('btnMarcarPago')?.addEventListener('click', marcarPago);
    document.getElementById('btnImprimirRecibo')?.addEventListener('click', imprimirRecibo);

    // Fechar modal clicando fora
    window.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    });

    // Busca Clientes
    document.getElementById('buscaCliente')?.addEventListener('input', function (e) {
        const termo = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#listaClientes li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            li.style.display = texto.includes(termo) ? 'flex' : 'none';
        });
    });

    // Busca Produtos
    document.getElementById('buscaProduto')?.addEventListener('input', function (e) {
        const termo = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#listaProdutos li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            const nome = texto.split('R$')[0].trim();
            li.style.display = nome.includes(termo) ? 'flex' : 'none';
        });
    });

    // Enter nos modais
    document.getElementById('nomeCliente')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') adicionarCliente(); });
    document.getElementById('nomeProduto')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') adicionarProduto(); });
    document.getElementById('precoProduto')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') adicionarProduto(); });

    console.log('✅ Eventos configurados!');
});

console.log('⚡ SE7VEN ENERGIA - Sistema carregado!');
