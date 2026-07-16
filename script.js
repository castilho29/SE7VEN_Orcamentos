// ============================================
// SISTEMA SE7VEN ENERGIA - COM SUPABASE
// ============================================

console.log('⚡ Carregando sistema...');

// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://se7ven-energia.supabase.co';
const SUPABASE_KEY = 'sb_publishable_23NQo9Pd7-hvhyhNQQrpHw_WP_o7DzM';

// Inicializa Supabase
let supabaseClient = null;

try {
    supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase conectado!');
} catch(e) {
    console.warn('⚠️ Erro ao conectar Supabase:', e);
}

// ============================================
// USUÁRIOS
// ============================================
let USUARIOS = {
    admin: { senha: 'admin', nome: 'Administrador', tipo: 'admin' }
};

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;
let clientes = [];
let produtos = [];
let ordensServico = [];
let recibos = [];
let logs = [];
let syncTimeout = null;
let osAtual = null;
let reciboAtual = null;
let sincronizando = false;

// ============================================
// DADOS DA EMPRESA
// ============================================
const EMPRESA = {
    nome: 'SE7VEN SOLUÇÕES ENERGÉTICAS',
    nomeAbreviado: 'SE7VEN',
    telefone: '(93) 98102-7290',
    whatsapp: '5593981027290',
    email: 'contato@se7venenergia.com',
    site: 'www.se7venenergia.com',
    cnpj: '62.008.856/0001-60',
    endereco: 'Novo Progresso/PA',
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
// FUNÇÕES DE LOGIN
// ============================================
function fazerLogin() {
    const user = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const error = document.getElementById('loginError');
    
    if (!user || !senha) {
        error.textContent = '❌ Preencha todos os campos!';
        error.style.display = 'block';
        return;
    }
    
    // Carrega usuários do Supabase primeiro
    carregarUsuariosSupabase().then(() => {
        if (!USUARIOS[user]) {
            error.textContent = '❌ Usuário não encontrado!';
            error.style.display = 'block';
            return;
        }
        
        if (USUARIOS[user].senha !== senha) {
            error.textContent = '❌ Senha incorreta!';
            error.style.display = 'block';
            return;
        }
        
        usuarioAtual = { 
            login: user, 
            nome: USUARIOS[user].nome,
            tipo: USUARIOS[user].tipo || 'usuario'
        };
        
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioAtual));
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('sistemaScreen').style.display = 'block';
        document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
        
        error.style.display = 'none';
        document.getElementById('loginUsuario').value = '';
        document.getElementById('loginSenha').value = '';
        
        atualizarStatus(`✅ Bem-vindo, ${usuarioAtual.nome}!`);
        registrarLog('LOGIN', `${usuarioAtual.nome} entrou no sistema`);
        init();
    });
}

function fazerLogout() {
    usuarioAtual = null;
    localStorage.removeItem('usuarioLogado');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('sistemaScreen').style.display = 'none';
    document.getElementById('loginUsuario').value = '';
    document.getElementById('loginSenha').value = '';
    if (syncTimeout) { clearInterval(syncTimeout); syncTimeout = null; }
}

function verificarLogin() {
    try {
        const salvo = localStorage.getItem('usuarioLogado');
        if (!salvo) return false;
        const data = JSON.parse(salvo);
        // Verifica no Supabase
        carregarUsuariosSupabase().then(() => {
            if (!USUARIOS[data.login]) {
                localStorage.removeItem('usuarioLogado');
                return false;
            }
            usuarioAtual = data;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('sistemaScreen').style.display = 'block';
            document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
            atualizarStatus(`✅ Bem-vindo de volta, ${usuarioAtual.nome}!`);
            init();
            return true;
        });
        return false;
    } catch(e) { return false; }
}

function loginGoogle() {
    alert('🔑 Login Google em desenvolvimento');
}

// ============================================
// FUNÇÕES SUPABASE - CRUD
// ============================================

// ----- USUÁRIOS -----
async function carregarUsuariosSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*');
        
        if (error) throw error;
        if (data) {
            data.forEach(u => {
                USUARIOS[u.login] = {
                    senha: u.senha,
                    nome: u.nome,
                    tipo: u.tipo
                };
            });
            console.log(`✅ ${Object.keys(USUARIOS).length} usuários carregados do Supabase`);
            return true;
        }
    } catch(e) {
        console.error('❌ Erro ao carregar usuários:', e);
        return false;
    }
}

async function salvarUsuarioSupabase(login, data) {
    try {
        const { error } = await supabaseClient
            .from('usuarios')
            .upsert({
                id: login,
                login: login,
                senha: data.senha,
                nome: data.nome,
                tipo: data.tipo || 'usuario'
            }, { onConflict: 'id' });
        
        if (error) throw error;
        console.log('✅ Usuário salvo no Supabase:', login);
        return true;
    } catch(e) {
        console.error('❌ Erro ao salvar usuário:', e);
        return false;
    }
}

// ----- CLIENTES -----
async function carregarClientesSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('clientes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) {
            clientes = data;
            console.log(`✅ ${clientes.length} clientes carregados do Supabase`);
            renderClientes();
            renderSelectClientes();
            return true;
        }
    } catch(e) {
        console.error('❌ Erro ao carregar clientes:', e);
        return false;
    }
}

async function salvarClienteSupabase(cliente) {
    try {
        const { error } = await supabaseClient
            .from('clientes')
            .upsert(cliente, { onConflict: 'id' });
        
        if (error) throw error;
        console.log('✅ Cliente salvo no Supabase:', cliente.nome);
        return true;
    } catch(e) {
        console.error('❌ Erro ao salvar cliente:', e);
        return false;
    }
}

async function excluirClienteSupabase(id) {
    try {
        const { error } = await supabaseClient
            .from('clientes')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Cliente excluído do Supabase');
        return true;
    } catch(e) {
        console.error('❌ Erro ao excluir cliente:', e);
        return false;
    }
}

// ----- PRODUTOS -----
async function carregarProdutosSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('produtos')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) {
            produtos = data;
            console.log(`✅ ${produtos.length} produtos carregados do Supabase`);
            renderProdutos();
            renderSelectProdutos();
            return true;
        }
    } catch(e) {
        console.error('❌ Erro ao carregar produtos:', e);
        return false;
    }
}

async function salvarProdutoSupabase(produto) {
    try {
        const { error } = await supabaseClient
            .from('produtos')
            .upsert(produto, { onConflict: 'id' });
        
        if (error) throw error;
        console.log('✅ Produto salvo no Supabase:', produto.nome);
        return true;
    } catch(e) {
        console.error('❌ Erro ao salvar produto:', e);
        return false;
    }
}

async function excluirProdutoSupabase(id) {
    try {
        const { error } = await supabaseClient
            .from('produtos')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Produto excluído do Supabase');
        return true;
    } catch(e) {
        console.error('❌ Erro ao excluir produto:', e);
        return false;
    }
}

// ----- ORDENS DE SERVIÇO -----
async function carregarOSSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('ordens_servico')
            .select('*')
            .order('data_criacao', { ascending: false });
        
        if (error) throw error;
        if (data) {
            ordensServico = data;
            console.log(`✅ ${ordensServico.length} OS carregadas do Supabase`);
            listarOS();
            return true;
        }
    } catch(e) {
        console.error('❌ Erro ao carregar OS:', e);
        return false;
    }
}

async function salvarOSSupabase(os) {
    try {
        const { error } = await supabaseClient
            .from('ordens_servico')
            .upsert(os, { onConflict: 'id' });
        
        if (error) throw error;
        console.log('✅ OS salva no Supabase:', os.numero);
        return true;
    } catch(e) {
        console.error('❌ Erro ao salvar OS:', e);
        return false;
    }
}

// ----- RECIBOS -----
async function carregarRecibosSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('recibos')
            .select('*')
            .order('data_emissao', { ascending: false });
        
        if (error) throw error;
        if (data) {
            recibos = data;
            console.log(`✅ ${recibos.length} recibos carregados do Supabase`);
            listarRecibos();
            return true;
        }
    } catch(e) {
        console.error('❌ Erro ao carregar recibos:', e);
        return false;
    }
}

// ============================================
// SINCRONIZAÇÃO
// ============================================

async function sincronizarDados() {
    if (sincronizando) {
        console.log('⏳ Sincronização em andamento...');
        return;
    }
    
    sincronizando = true;
    const statusElement = document.getElementById('syncStatus');
    const progressElement = document.getElementById('syncProgress');
    const ultimaSyncElement = document.getElementById('ultimaSync');
    
    try {
        statusElement.textContent = '🔄 Sincronizando...';
        statusElement.className = 'status sincronizando';
        progressElement.style.display = 'block';
        progressElement.textContent = '⏳ Conectando ao banco de dados...';
        
        await carregarClientesSupabase();
        await carregarProdutosSupabase();
        await carregarOSSupabase();
        await carregarRecibosSupabase();
        await carregarUsuariosSupabase();
        
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
        atualizarStatus('❌ Erro na sincronização', 'error');
    } finally {
        sincronizando = false;
    }
}

function iniciarSincronizacaoAutomatica() {
    if (syncTimeout) {
        clearInterval(syncTimeout);
        syncTimeout = null;
    }
    
    setTimeout(() => {
        sincronizarDados();
    }, 3000);
    
    syncTimeout = setInterval(() => {
        sincronizarDados();
    }, 10000); // 10 segundos
    
    console.log('✅ Sincronização automática ativada (10 segundos)');
}

// ============================================
// FUNÇÕES CRUD (MODIFICADAS COM SUPABASE)
// ============================================

// ----- USUÁRIOS -----
function carregarUsuarios() {
    carregarUsuariosSupabase();
}

function salvarUsuarios() {
    // Salva localmente também
    try { localStorage.setItem('usuarios', JSON.stringify(USUARIOS)); } catch(e) {}
}

function listarUsuarios() {
    const container = document.getElementById('listaUsuarios');
    if (!container) return;
    container.innerHTML = Object.entries(USUARIOS).map(([login, data]) => `
        <div class="user-item">
            <span><strong>${data.nome}</strong> (${login})</span>
            <div>
                <span class="role">${data.tipo || 'usuario'}</span>
                ${login !== 'admin' ? `<button onclick="excluirUsuario('${login}')" class="btn-danger" style="padding:2px 8px;font-size:10px;margin-left:5px;">🗑️</button>` : ''}
            </div>
        </div>
    `).join('');
}

function mostrarCadastroUsuario() {
    if (!usuarioAtual || usuarioAtual.tipo !== 'admin') {
        alert('⚠️ Apenas administradores podem cadastrar usuários!');
        return;
    }
    document.getElementById('modalCadastroUsuario').style.display = 'flex';
}

async function salvarNovoUsuario() {
    if (!usuarioAtual || usuarioAtual.tipo !== 'admin') {
        alert('⚠️ Apenas administradores podem cadastrar usuários!');
        return;
    }
    const nome = document.getElementById('novoUsuarioNome').value.trim();
    const login = document.getElementById('novoUsuarioLogin').value.trim();
    const senha = document.getElementById('novoUsuarioSenha').value.trim();
    const tipo = document.getElementById('novoUsuarioTipo').value;
    if (!nome || !login || !senha) { alert('⚠️ Preencha todos os campos!'); return; }
    if (USUARIOS[login]) { alert('⚠️ Este login já existe!'); return; }
    
    USUARIOS[login] = { senha, nome, tipo };
    salvarUsuarios();
    await salvarUsuarioSupabase(login, { senha, nome, tipo });
    
    listarUsuarios();
    fecharModal('modalCadastroUsuario');
    document.getElementById('novoUsuarioNome').value = '';
    document.getElementById('novoUsuarioLogin').value = '';
    document.getElementById('novoUsuarioSenha').value = '';
    atualizarStatus(`✅ Usuário "${nome}" cadastrado!`);
    registrarLog('USUARIO_CADASTRADO', `Usuário "${nome}" (${login}) cadastrado`);
    alert(`✅ Usuário "${nome}" cadastrado com sucesso!`);
}

async function excluirUsuario(login) {
    if (login === 'admin') { alert('⚠️ Não é possível excluir o usuário admin!'); return; }
    if (confirm(`Excluir usuário "${login}"?`)) {
        delete USUARIOS[login];
        salvarUsuarios();
        // Exclui do Supabase
        try {
            await supabaseClient.from('usuarios').delete().eq('login', login);
        } catch(e) {}
        listarUsuarios();
        atualizarStatus(`🗑️ Usuário "${login}" removido`);
        registrarLog('USUARIO_EXCLUIDO', `Usuário "${login}" excluído`);
    }
}

// ----- CLIENTES -----
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
        id: gerarId(), 
        nome, 
        telefone,
        email: document.getElementById('emailCliente').value.trim() || '',
        cpf: document.getElementById('cpfCliente').value.trim() || '',
        endereco: document.getElementById('enderecoCliente').value.trim() || ''
    };
    
    const salvou = await salvarClienteSupabase(novoCliente);
    if (salvou) {
        clientes.push(novoCliente);
        salvarDados();
        document.getElementById('nomeCliente').value = '';
        document.getElementById('telefoneCliente').value = '';
        document.getElementById('cpfCliente').value = '';
        document.getElementById('enderecoCliente').value = '';
        document.getElementById('emailCliente').value = '';
        fecharModal('modalCliente');
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`✅ Cliente "${nome}" cadastrado!`);
        registrarLog('CLIENTE_ADICIONADO', `Cliente "${nome}" adicionado`);
    }
}

async function excluirCliente(index) {
    const cliente = clientes[index];
    if (!cliente) return;
    if (confirm(`Excluir "${cliente.nome}"?`)) {
        const excluiu = await excluirClienteSupabase(cliente.id);
        if (excluiu) {
            clientes.splice(index, 1);
            salvarDados();
            renderClientes();
            renderSelectClientes();
            atualizarStatus(`🗑️ Cliente "${cliente.nome}" removido`);
            registrarLog('CLIENTE_EXCLUIDO', `Cliente "${cliente.nome}" excluído`);
        }
    }
}

function editarCliente(index) {
    const c = clientes[index];
    document.getElementById('nomeCliente').value = c.nome;
    document.getElementById('telefoneCliente').value = c.telefone || '';
    document.getElementById('cpfCliente').value = c.cpf || '';
    document.getElementById('enderecoCliente').value = c.endereco || '';
    document.getElementById('emailCliente').value = c.email || '';
    document.querySelector('#modalCliente h3').textContent = '✏️ Editar Cliente';
    const btn = document.getElementById('salvarCliente');
    btn.textContent = '💾 Atualizar';
    btn.dataset.index = index;
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener('click', async function() {
        const idx = parseInt(this.dataset.index);
        const nome = document.getElementById('nomeCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();
        const cpf = document.getElementById('cpfCliente').value.trim();
        const endereco = document.getElementById('enderecoCliente').value.trim();
        const email = document.getElementById('emailCliente').value.trim();
        if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
        
        const clienteAtualizado = { ...clientes[idx], nome, telefone, cpf, endereco, email };
        const salvou = await salvarClienteSupabase(clienteAtualizado);
        if (salvou) {
            clientes[idx] = clienteAtualizado;
            salvarDados();
            document.getElementById('nomeCliente').value = '';
            document.getElementById('telefoneCliente').value = '';
            document.getElementById('cpfCliente').value = '';
            document.getElementById('enderecoCliente').value = '';
            document.getElementById('emailCliente').value = '';
            document.querySelector('#modalCliente h3').textContent = '👤 Novo Cliente';
            this.textContent = 'Salvar';
            this.dataset.index = '';
            fecharModal('modalCliente');
            renderClientes();
            renderSelectClientes();
            atualizarStatus(`✅ Cliente "${nome}" atualizado!`);
            registrarLog('CLIENTE_EDITADO', `Cliente "${nome}" editado`);
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

// ----- PRODUTOS -----
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
                <br><small>R$ ${p.preco.toFixed(2)}</small>
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
    const salvou = await salvarProdutoSupabase(novoProduto);
    if (salvou) {
        produtos.push(novoProduto);
        salvarDados();
        document.getElementById('nomeProduto').value = '';
        document.getElementById('precoProduto').value = '';
        fecharModal('modalProduto');
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`✅ Produto "${nome}" cadastrado!`);
        registrarLog('PRODUTO_ADICIONADO', `Produto "${nome}" adicionado`);
    }
}

async function excluirProduto(index) {
    const produto = produtos[index];
    if (!produto) return;
    if (confirm(`Excluir "${produto.nome}"?`)) {
        const excluiu = await excluirProdutoSupabase(produto.id);
        if (excluiu) {
            produtos.splice(index, 1);
            salvarDados();
            renderProdutos();
            renderSelectProdutos();
            atualizarStatus(`🗑️ Produto "${produto.nome}" removido`);
            registrarLog('PRODUTO_EXCLUIDO', `Produto "${produto.nome}" excluído`);
        }
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
    novoBtn.addEventListener('click', async function() {
        const idx = parseInt(this.dataset.index);
        const nome = document.getElementById('nomeProduto').value.trim();
        const preco = parseFloat(document.getElementById('precoProduto').value);
        const tipo = document.getElementById('tipoProduto').value;
        if (!nome || isNaN(preco) || preco <= 0) { alert('⚠️ Nome e preço válido são obrigatórios'); return; }
        
        const produtoAtualizado = { ...produtos[idx], nome, preco, tipo };
        const salvou = await salvarProdutoSupabase(produtoAtualizado);
        if (salvou) {
            produtos[idx] = produtoAtualizado;
            salvarDados();
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
        }
    });
    abrirModal('modalProduto');
}

function renderSelectProdutos() {
    document.querySelectorAll('.selProduto').forEach(select => {
        const current = select.value;
        select.innerHTML = '<option value="">Selecione um produto</option>' +
            produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`).join('');
        select.value = current;
    });
}

// ----- ORÇAMENTO -----
function adicionarItem() {
    if (produtos.length === 0) { alert('⚠️ Cadastre um produto primeiro!'); return; }
    const div = document.createElement('div');
    div.className = 'item-orcamento';
    div.innerHTML = `
        <select class="selProduto">
            <option value="">Selecione um produto</option>
            ${produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`).join('')}
        </select>
        <input type="number" class="qtdProduto" placeholder="Qtd" min="1" value="1">
        <button class="btn-remove-item" onclick="removerItem(this)">✕</button>
    `;
    document.getElementById('itensOrcamento').appendChild(div);
    div.querySelector('.selProduto').addEventListener('change', updateTotal);
    div.querySelector('.qtdProduto').addEventListener('input', updateTotal);
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

function limparOrcamento() {
    if (!confirm('Limpar todos os itens?')) return;
    document.getElementById('itensOrcamento').innerHTML = '';
    const div = document.createElement('div');
    div.className = 'item-orcamento';
    div.innerHTML = `
        <select class="selProduto"><option value="">Selecione um produto</option>${produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`).join('')}</select>
        <input type="number" class="qtdProduto" placeholder="Qtd" min="1" value="1">
        <button class="btn-remove-item" onclick="removerItem(this)">✕</button>
    `;
    document.getElementById('itensOrcamento').appendChild(div);
    div.querySelector('.selProduto').addEventListener('change', updateTotal);
    div.querySelector('.qtdProduto').addEventListener('input', updateTotal);
    updateTotal();
    document.getElementById('selCliente').value = '';
    document.getElementById('resultadoProjeto').innerHTML = '';
    atualizarStatus('🧹 Orçamento limpo!');
}

async function salvarOrcamento() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente!'); return; }
    const itens = [];
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const nome = select.value;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        if (nome && qtd > 0) itens.push({ nome, qtd, preco, subtotal: preco * qtd });
    });
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item!'); return; }
    const total = itens.reduce((sum, item) => sum + item.subtotal, 0);
    
    const clienteData = clientes.find(c => c.nome === cliente);
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
    
    const salvou = await salvarOSSupabase(novaOS);
    if (salvou) {
        ordensServico.push(novaOS);
        salvarDados();
        listarOS();
        atualizarStatus(`✅ Orçamento salvo! Nº ${novaOS.numero}`);
        registrarLog('OS_CRIADA', `OS ${novaOS.numero} criada para ${cliente}`);
        alert(`✅ Orçamento salvo!\nNº: ${novaOS.numero}\nCliente: ${cliente}\nTotal: R$ ${total.toFixed(2)}`);
        abrirTab('tabOS');
    }
}

function editarOS(id) {
    alert('✏️ Editar OS em desenvolvimento');
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
    container.innerHTML = lista.map(os => `
        <div class="os-card" onclick="abrirOS('${os.id}')">
            <div><strong>${os.numero}</strong> <span class="status-badge status-orcamento">📄 Orçamento</span></div>
            <div><strong>Cliente:</strong> ${os.cliente_nome}</div>
            <div style="font-size:12px;color:#666;">${os.itens?.length || 0} itens | Total: R$ ${os.total?.toFixed(2) || '0,00'}</div>
        </div>
    `).join('');
}

function filtrarOS() { listarOS(document.getElementById('filtroStatusOS').value); }

function abrirOS(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;
    const data = new Date(os.data_criacao).toLocaleDateString('pt-BR');
    let itensHTML = os.itens?.map((item, i) => `
        <tr><td>${i+1}</td><td>${item.nome}</td><td>${item.qtd}</td><td>R$ ${item.preco.toFixed(2)}</td><td>R$ ${item.subtotal.toFixed(2)}</td></tr>
    `).join('') || '';
    document.getElementById('detalhesOS').innerHTML = `
        <div style="margin-bottom:10px;">
            <p><strong>Nº:</strong> ${os.numero}</p>
            <p><strong>Cliente:</strong> ${os.cliente_nome}</p>
            <p><strong>Status:</strong> 📄 Orçamento</p>
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Total:</strong> R$ ${os.total?.toFixed(2) || '0,00'}</p>
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

async function aprovarOS() {
    if (!osAtual || !confirm(`Aprovar OS ${osAtual.numero}?`)) return;
    osAtual.status = 'aprovado';
    osAtual.data_aprovacao = new Date().toISOString();
    const salvou = await salvarOSSupabase(osAtual);
    if (salvou) {
        salvarDados();
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(`✅ OS ${osAtual.numero} aprovada!`);
        registrarLog('OS_APROVADA', `OS ${osAtual.numero} aprovada`);
    }
}

async function iniciarOS() {
    if (!osAtual || !confirm(`Iniciar OS ${osAtual.numero}?`)) return;
    osAtual.status = 'em_andamento';
    osAtual.data_inicio = new Date().toISOString();
    const salvou = await salvarOSSupabase(osAtual);
    if (salvou) {
        salvarDados();
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(`🔧 OS ${osAtual.numero} em andamento!`);
        registrarLog('OS_INICIADA', `OS ${osAtual.numero} iniciada`);
    }
}

async function concluirOS() {
    if (!osAtual || !confirm(`Concluir OS ${osAtual.numero}?`)) return;
    osAtual.status = 'concluido';
    osAtual.data_conclusao = new Date().toISOString();
    const salvou = await salvarOSSupabase(osAtual);
    if (salvou) {
        salvarDados();
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(`✅ OS ${osAtual.numero} concluída!`);
        registrarLog('OS_CONCLUIDA', `OS ${osAtual.numero} concluída`);
    }
}

async function cancelarOS() {
    if (!osAtual || !confirm(`Cancelar OS ${osAtual.numero}?`)) return;
    osAtual.status = 'cancelado';
    const salvou = await salvarOSSupabase(osAtual);
    if (salvou) {
        salvarDados();
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(`❌ OS ${osAtual.numero} cancelada!`);
        registrarLog('OS_CANCELADA', `OS ${osAtual.numero} cancelada`);
    }
}

async function emitirRecibo() {
    if (!osAtual || osAtual.status !== 'concluido') { alert('⚠️ A OS precisa estar concluída!'); return; }
    const recibo = {
        id: gerarId(),
        numero: 'REC-' + (recibos.length + 1).toString().padStart(4, '0'),
        os_id: osAtual.id,
        os_numero: osAtual.numero,
        cliente_id: osAtual.cliente_id,
        cliente_nome: osAtual.cliente_nome,
        itens: osAtual.itens,
        total: osAtual.total,
        status: 'pendente',
        data_emissao: new Date().toISOString(),
        data_pagamento: null
    };
    
    try {
        const { error } = await supabaseClient.from('recibos').insert(recibo);
        if (error) throw error;
        recibos.push(recibo);
        salvarDados();
        listarRecibos();
        fecharModal('modalOS');
        atualizarStatus(`💰 Recibo ${recibo.numero} emitido!`);
        registrarLog('RECIBO_EMITIDO', `Recibo ${recibo.numero} emitido para ${osAtual.cliente_nome}`);
        abrirRecibo(recibo.id);
    } catch(e) {
        console.error('❌ Erro ao emitir recibo:', e);
        alert('❌ Erro ao emitir recibo!');
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
                <div style="font-size:12px;color:#666;">OS: ${r.os_numero} | Total: R$ ${r.total?.toFixed(2) || '0,00'} | ${data}</div>
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
        <tr><td>${i+1}</td><td>${item.nome}</td><td>${item.qtd}</td><td>R$ ${item.preco.toFixed(2)}</td><td>R$ ${item.subtotal.toFixed(2)}</td></tr>
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
            TOTAL: R$ ${reciboAtual.total?.toFixed(2) || '0,00'}
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
    reciboAtual.status = 'pago';
    reciboAtual.data_pagamento = new Date().toISOString();
    try {
        const { error } = await supabaseClient
            .from('recibos')
            .update({ status: 'pago', data_pagamento: reciboAtual.data_pagamento })
            .eq('id', reciboAtual.id);
        if (error) throw error;
        salvarDados();
        listarRecibos();
        abrirRecibo(reciboAtual.id);
        atualizarStatus(`✅ Recibo ${reciboAtual.numero} pago!`);
        registrarLog('RECIBO_PAGO', `Recibo ${reciboAtual.numero} marcado como pago`);
    } catch(e) {
        console.error('❌ Erro ao marcar pago:', e);
        alert('❌ Erro ao marcar como pago!');
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
// CÁLCULOS
// ============================================
function dimensionarCabos() {
    const corrente = parseFloat(document.getElementById('correnteCabos').value);
    if (!corrente || corrente <= 0) { alert('⚠️ Informe a corrente!'); return; }
    const tabela = {1.5:15.5,2.5:21,4:28,6:36,10:50,16:68,25:89,35:111,50:134,70:171,95:207,120:239,150:275,185:314,240:370};
    let bitola = null;
    for (let [b, cap] of Object.entries(tabela)) {
        if (cap >= corrente) { bitola = b; break; }
    }
    document.getElementById('resultadoCabos').innerHTML = bitola ? 
        `✅ Bitola recomendada: ${bitola} mm²` : 
        '⚠️ Corrente muito alta!';
}

function calcularQuedaTensao() {
    alert('📉 Função Queda de Tensão em desenvolvimento');
}

function calcularDemanda() {
    alert('💡 Função Demanda de Energia em desenvolvimento');
}

function calcularProjeto() {
    alert('📊 Função Projeto Elétrico em desenvolvimento');
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
// LOGS
// ============================================
function registrarLog(acao, detalhes) {
    const entry = {
        data: new Date().toISOString(),
        usuario: usuarioAtual?.nome || 'Sistema',
        acao: acao,
        detalhes: detalhes
    };
    logs.unshift(entry);
    if (logs.length > 500) logs = logs.slice(0, 500);
    try { localStorage.setItem('logs', JSON.stringify(logs)); } catch(e) {}
    renderizarLogs();
}

function renderizarLogs() {
    const container = document.getElementById('logList');
    if (!container) return;
    if (logs.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:10px;">Nenhum registro</p>';
        return;
    }
    container.innerHTML = logs.slice(0, 100).map(log => `
        <div class="entry">
            <span>${log.acao}: ${log.detalhes}</span>
            <span class="time">${new Date(log.data).toLocaleString('pt-BR')} - ${log.usuario}</span>
        </div>
    `).join('');
}

function limparLogs() {
    if (confirm('Limpar todos os logs?')) {
        logs = [];
        try { localStorage.setItem('logs', JSON.stringify(logs)); } catch(e) {}
        renderizarLogs();
        atualizarStatus('🗑️ Logs limpos!');
    }
}

// ============================================
// GERAR PRODUTOS
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

// ============================================
// CARREGAR DADOS (LOCAL)
// ============================================
function carregarDados() {
    try {
        const c = localStorage.getItem('clientes');
        const p = localStorage.getItem('produtos');
        const o = localStorage.getItem('ordensServico');
        const r = localStorage.getItem('recibos');
        if (c) clientes = JSON.parse(c);
        if (p) {
            produtos = JSON.parse(p);
        } else {
            produtos = gerarProdutos();
            localStorage.setItem('produtos', JSON.stringify(produtos));
            console.log(`📦 ${produtos.length} produtos criados!`);
        }
        if (o) ordensServico = JSON.parse(o);
        if (r) recibos = JSON.parse(r);
        if (clientes.length === 0) {
            clientes = [
                { id: '1', nome: 'José Castilho', email: 'jose@email.com', telefone: '(93) 98102-7290', cpf: '123.456.789-00', endereco: 'Rua Exemplo, 123 - Belém/PA' }
            ];
            localStorage.setItem('clientes', JSON.stringify(clientes));
        }
    } catch(e) { console.log('Erro ao carregar dados:', e); }
}

function salvarDados() {
    try {
        localStorage.setItem('clientes', JSON.stringify(clientes));
        localStorage.setItem('produtos', JSON.stringify(produtos));
        localStorage.setItem('ordensServico', JSON.stringify(ordensServico));
        localStorage.setItem('recibos', JSON.stringify(recibos));
        return true;
    } catch(e) { console.log('Erro ao salvar:', e); return false; }
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================
// FUNÇÕES VAZIAS (PARA EVITAR ERROS)
// ============================================
function gerarPDF() { alert('📄 PDF em desenvolvimento'); }
function enviarWhatsApp() { alert('💬 WhatsApp em desenvolvimento'); }
function enviarPDFWhatsApp() { alert('📤 PDF+WhatsApp em desenvolvimento'); }

// ============================================
// BACKUP
// ============================================
function exportarDados() {
    const dados = { clientes, produtos, ordensServico, recibos, logs, data: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(dados, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    atualizarStatus('✅ Backup exportado!');
    registrarLog('EXPORTAR', 'Dados exportados');
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (dados.clientes) {
                clientes = dados.clientes;
                produtos = dados.produtos || [];
                ordensServico = dados.ordensServico || [];
                recibos = dados.recibos || [];
                if (dados.logs) logs = dados.logs;
                salvarDados();
                try { localStorage.setItem('logs', JSON.stringify(logs)); } catch(e) {}
                renderizarTudo();
                atualizarStatus('✅ Dados importados!');
                registrarLog('IMPORTAR', 'Dados importados do JSON');
                alert('✅ Dados importados com sucesso!');
            } else { alert('❌ Arquivo inválido!'); }
        } catch(err) { alert('❌ Erro ao ler o arquivo!'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function backupGit() {
    exportarDados();
}

function renderizarTudo() {
    renderClientes();
    renderProdutos();
    renderSelectClientes();
    renderSelectProdutos();
    listarOS();
    listarRecibos();
    renderizarLogs();
    updateTotal();
    listarUsuarios();
    atualizarEstatisticas();
}

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
    } catch(e) {}
}

function limparDados() {
    if (!confirm('⚠️ ATENÇÃO: Isso vai apagar TODOS os dados!\n\nContinuar?')) return;
    localStorage.clear();
    USUARIOS = { admin: { senha: 'admin', nome: 'Administrador', tipo: 'admin' } };
    localStorage.setItem('usuarios', JSON.stringify(USUARIOS));
    clientes = [];
    produtos = [];
    ordensServico = [];
    recibos = [];
    logs = [];
    atualizarStatus('🗑️ Todos os dados foram apagados!');
    alert('✅ Dados apagados! A página será recarregada.');
    location.reload();
}

function recarregarDados() {
    carregarDados();
    renderizarTudo();
    atualizarStatus('🔄 Dados recarregados!');
}

// ============================================
// CONFIGURAÇÕES
// ============================================
function carregarConfiguracoes() {
    try {
        const config = localStorage.getItem('system_config');
        if (config) {
            const parsed = JSON.parse(config);
            if (parsed.gitToken) {
                GITHUB_CONFIG.token = parsed.gitToken;
                GITHUB_CONFIG.usuario = parsed.gitUsuario || 'castilho29';
                GITHUB_CONFIG.repo = parsed.gitRepo || 'SE7VEN_Orcamentos';
                GITHUB_CONFIG.intervaloAuto = parseInt(parsed.syncInterval) || 300000;
            }
        }
        atualizarEstatisticas();
    } catch(e) { console.log('Erro ao carregar configurações:', e); }
}

function salvarConfiguracoesGit() {
    const token = document.getElementById('inputGitToken')?.value.trim() || '';
    const usuario = document.getElementById('inputGitUsuario')?.value.trim() || 'castilho29';
    const repo = document.getElementById('inputGitRepo')?.value.trim() || 'SE7VEN_Orcamentos';
    const intervalo = document.getElementById('inputSyncInterval')?.value || '300000';
    if (!token || token.length < 10) {
        alert('⚠️ Digite um token válido do GitHub!');
        return;
    }
    const config = { gitToken: token, gitUsuario: usuario, gitRepo: repo, syncInterval: intervalo };
    localStorage.setItem('system_config', JSON.stringify(config));
    GITHUB_CONFIG.token = token;
    GITHUB_CONFIG.usuario = usuario;
    GITHUB_CONFIG.repo = repo;
    GITHUB_CONFIG.intervaloAuto = parseInt(intervalo) || 300000;
    atualizarStatus('✅ Configurações do Git salvas!');
    registrarLog('CONFIG_GIT', 'Configurações do Git atualizadas');
    alert('✅ Configurações salvas com sucesso!');
    if (parseInt(intervalo) > 0) {
        iniciarSincronizacaoAutomatica();
    } else {
        if (syncTimeout) { clearInterval(syncTimeout); syncTimeout = null; }
    }
}

function toggleGit() {
    const statusLabel = document.getElementById('gitStatusLabel');
    const btn = document.getElementById('btnToggleGit');
    const token = document.getElementById('inputGitToken')?.value.trim() || GITHUB_CONFIG.token;
    if (!statusLabel || !btn) return;
    if (statusLabel.textContent.includes('Ativo')) {
        statusLabel.textContent = '❌ Desativado';
        statusLabel.style.background = '#e74c3c';
        btn.textContent = '✅ Ativar';
        btn.className = 'btn-success';
        if (syncTimeout) { clearInterval(syncTimeout); syncTimeout = null; }
        GITHUB_CONFIG.token = '';
        localStorage.setItem('git_ativado', 'false');
        atualizarStatus('⏸️ Backup Git desativado');
        registrarLog('CONFIG_GIT', 'Backup Git desativado');
    } else {
        if (!token || token.length < 10) {
            alert('⚠️ Configure o token do GitHub primeiro!');
            return;
        }
        statusLabel.textContent = '✅ Ativo';
        statusLabel.style.background = '#27ae60';
        btn.textContent = '❌ Desativar';
        btn.className = 'btn-danger';
        GITHUB_CONFIG.token = token;
        localStorage.setItem('git_ativado', 'true');
        atualizarStatus('✅ Backup Git ativado');
        registrarLog('CONFIG_GIT', 'Backup Git ativado');
        iniciarSincronizacaoAutomatica();
        setTimeout(sincronizarDados, 2000);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function init() {
    console.log('🚀 Inicializando sistema...');
    carregarDados();
    carregarUsuarios();
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
    carregarConfiguracoes();
    if (produtos.length > 0) adicionarItem();
    iniciarSincronizacaoAutomatica();
    atualizarStatus(`✅ Sistema pronto! ${clientes.length} clientes, ${produtos.length} produtos`);
    console.log('✅ Sistema inicializado!');
}

// ============================================
// EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM carregado!');
    
    if (!verificarLogin()) {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('sistemaScreen').style.display = 'none';
    }
    
    // Eventos de Login
    document.getElementById('loginUsuario')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('loginSenha').focus();
    });
    document.getElementById('loginSenha')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') fazerLogin();
    });
    
    // Eventos dos Botões
    document.getElementById('btnNovo')?.addEventListener('click', function() {
        abrirTab('tabOrcamento');
        document.getElementById('orcamento').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('btnAddCliente')?.addEventListener('click', function() {
        abrirModal('modalCliente');
        document.getElementById('nomeCliente').focus();
    });
    document.getElementById('btnAddProduto')?.addEventListener('click', function() {
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
    document.getElementById('salvarNovoUsuario')?.addEventListener('click', salvarNovoUsuario);
    document.getElementById('fecharModalCliente')?.addEventListener('click', function() {
        fecharModal('modalCliente');
    });
    document.getElementById('fecharModalProduto')?.addEventListener('click', function() {
        fecharModal('modalProduto');
    });
    document.getElementById('btnFecharOS')?.addEventListener('click', function() {
        fecharModal('modalOS');
    });
    document.getElementById('btnFecharRecibo')?.addEventListener('click', function() {
        fecharModal('modalRecibo');
    });
    
    // Eventos da OS
    document.getElementById('btnAprovarOS')?.addEventListener('click', aprovarOS);
    document.getElementById('btnIniciarOS')?.addEventListener('click', iniciarOS);
    document.getElementById('btnConcluirOS')?.addEventListener('click', concluirOS);
    document.getElementById('btnCancelarOS')?.addEventListener('click', cancelarOS);
    document.getElementById('btnEmitirRecibo')?.addEventListener('click', emitirRecibo);
    
    // Eventos do Recibo
    document.getElementById('btnMarcarPago')?.addEventListener('click', marcarPago);
    document.getElementById('btnImprimirRecibo')?.addEventListener('click', imprimirRecibo);
    
    // Eventos de Configuração
    document.getElementById('btnSalvarConfigGit')?.addEventListener('click', salvarConfiguracoesGit);
    document.getElementById('btnToggleGit')?.addEventListener('click', toggleGit);
    document.getElementById('btnSalvarToken')?.addEventListener('click', function() {
        const token = document.getElementById('inputGitToken')?.value.trim();
        if (token && token.length > 10) {
            const config = JSON.parse(localStorage.getItem('system_config') || '{}');
            config.gitToken = token;
            localStorage.setItem('system_config', JSON.stringify(config));
            GITHUB_CONFIG.token = token;
            atualizarStatus('✅ Token salvo!');
            registrarLog('CONFIG_TOKEN', 'Token do GitHub atualizado');
            alert('✅ Token salvo com sucesso!');
        } else {
            alert('⚠️ Token inválido!');
        }
    });
    
    // Fechar modal clicando fora
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Busca Clientes
    document.getElementById('buscaCliente')?.addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#listaClientes li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            li.style.display = texto.includes(termo) ? 'flex' : 'none';
        });
    });
    
    // Busca Produtos
    document.getElementById('buscaProduto')?.addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#listaProdutos li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            const nome = texto.split('R$')[0].trim();
            li.style.display = nome.includes(termo) ? 'flex' : 'none';
        });
    });
    
    // Enter nos modais
    document.getElementById('nomeCliente')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') adicionarCliente();
    });
    document.getElementById('nomeProduto')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') adicionarProduto();
    });
    document.getElementById('precoProduto')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') adicionarProduto();
    });
    
    console.log('✅ Eventos configurados!');
});

console.log('⚡ SE7VEN ENERGIA - Sistema carregado!');
console.log('☁️ Supabase conectado!');