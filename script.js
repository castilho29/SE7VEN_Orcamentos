// ============================================
// SISTEMA SE7VEN ENERGIA - VERSÃO SIMPLIFICADA
// ============================================

console.log('⚡ Carregando sistema...');

// ============================================
// CONFIGURAÇÕES
// ============================================
let CONFIG = {};

// Tenta carregar do config.js
try {
    if (typeof window.CONFIG !== 'undefined' && window.CONFIG) {
        CONFIG = window.CONFIG;
        console.log('✅ Configurações carregadas do config.js');
    } else {
        console.warn('⚠️ config.js não encontrado, usando padrão');
    }
} catch(e) {
    console.warn('⚠️ Erro ao carregar config.js');
}

// ============================================
// DADOS DA EMPRESA
// ============================================
const EMPRESA = {
    nome: 'SE7VEN ENERGIA',
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
// GITHUB CONFIG
// ============================================
const GITHUB_CONFIG = {
    token: CONFIG?.GITHUB_TOKEN || '',
    usuario: CONFIG?.GITHUB_USUARIO || 'castilho29',
    repo: CONFIG?.GITHUB_REPO || 'SE7VEN_Orcamentos',
    arquivo: CONFIG?.GITHUB_ARQUIVO || 'dados.json',
    intervaloAuto: CONFIG?.INTERVALO_SYNC || 300000,
    branch: CONFIG?.BRANCH || 'main'
};

console.log('🔑 Token:', GITHUB_CONFIG.token ? '✅ Configurado' : '❌ Não configurado');

// ============================================
// FIREBASE (Login Google)
// ============================================
let auth = null;

try {
    if (typeof firebase !== 'undefined' && CONFIG?.FIREBASE_CONFIG) {
        firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        auth = firebase.auth();
        console.log('✅ Firebase inicializado!');
    } else {
        console.log('ℹ️ Firebase não disponível');
    }
} catch(e) {
    console.warn('⚠️ Firebase não inicializado:', e.message);
}

// ============================================
// USUÁRIOS
// ============================================
let USUARIOS = {
    admin: { senha: 'admin', nome: 'Administrador', tipo: 'admin' },
    usuario: { senha: '123456', nome: 'Usuário Padrão', tipo: 'usuario' }
};

// Tenta carregar do config.js
if (CONFIG?.USUARIOS) {
    USUARIOS = { ...USUARIOS, ...CONFIG.USUARIOS };
    console.log('✅ Usuários carregados do config.js');
}

console.log('📋 Usuários:', Object.keys(USUARIOS).join(', '));

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;
let clientes = [];
let produtos = [];
let ordensServico = [];
let recibos = [];
let logs = [];
let osAtual = null;
let reciboAtual = null;
let syncTimeout = null;

// ============================================
// FUNÇÕES DE LOGIN
// ============================================

// Função de Login (chamada pelo botão)
function fazerLogin() {
    console.log('🔑 Função fazerLogin chamada!');
    
    const userInput = document.getElementById('loginUsuario');
    const senhaInput = document.getElementById('loginSenha');
    const error = document.getElementById('loginError');
    
    if (!userInput || !senhaInput) {
        console.error('❌ Campos de login não encontrados');
        alert('Erro: Campos de login não encontrados!');
        return;
    }
    
    const user = userInput.value.trim();
    const senha = senhaInput.value.trim();
    
    console.log('👤 Tentando login:', user);
    
    if (!user || !senha) {
        error.textContent = '❌ Preencha todos os campos!';
        error.style.display = 'block';
        return;
    }
    
    if (!USUARIOS[user]) {
        console.error('❌ Usuário não encontrado:', user);
        error.textContent = '❌ Usuário não encontrado!';
        error.style.display = 'block';
        return;
    }
    
    if (USUARIOS[user].senha !== senha) {
        console.error('❌ Senha incorreta');
        error.textContent = '❌ Senha incorreta!';
        error.style.display = 'block';
        return;
    }
    
    console.log('✅ Login bem sucedido!');
    
    usuarioAtual = { 
        login: user, 
        nome: USUARIOS[user].nome,
        tipo: USUARIOS[user].tipo || 'usuario'
    };
    
    localStorage.setItem('usuarioLogado', JSON.stringify(usuarioAtual));
    
    // Entra no sistema
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sistemaScreen').style.display = 'block';
    document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
    
    error.style.display = 'none';
    userInput.value = '';
    senhaInput.value = '';
    
    atualizarStatus(`✅ Bem-vindo, ${usuarioAtual.nome}!`);
    registrarLog('LOGIN', `${usuarioAtual.nome} entrou no sistema`);
    
    init();
}

// Função de Logout
function fazerLogout() {
    console.log('🔓 Fazendo logout');
    usuarioAtual = null;
    localStorage.removeItem('usuarioLogado');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('sistemaScreen').style.display = 'none';
    document.getElementById('loginUsuario').value = '';
    document.getElementById('loginSenha').value = '';
    if (syncTimeout) { clearInterval(syncTimeout); syncTimeout = null; }
}

// ============================================
// LOGIN GOOGLE
// ============================================
function loginGoogle() {
    console.log('🔑 Login Google chamado');
    
    if (!auth) {
        alert('⚠️ Login Google não disponível. Configure o Firebase.');
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log('✅ Login Google bem sucedido:', user.displayName);
            
            usuarioAtual = {
                login: user.email,
                nome: user.displayName || user.email,
                email: user.email,
                tipo: 'google',
                avatar: user.photoURL || null
            };
            
            localStorage.setItem('usuarioLogado', JSON.stringify(usuarioAtual));
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('sistemaScreen').style.display = 'block';
            document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
            
            if (user.photoURL) {
                document.getElementById('userAvatar').style.display = 'inline-block';
                document.getElementById('avatarImg').src = user.photoURL;
            }
            
            init();
            atualizarStatus(`✅ Bem-vindo, ${usuarioAtual.nome}!`);
        })
        .catch((error) => {
            console.error('❌ Erro no login Google:', error);
            document.getElementById('loginError').textContent = '❌ Erro no login: ' + error.message;
            document.getElementById('loginError').style.display = 'block';
        });
}

// ============================================
// CADASTRO DE USUÁRIO
// ============================================
function mostrarCadastroUsuario() {
    console.log('📝 Abrindo cadastro de usuário');
    const modal = document.getElementById('modalCadastroUsuario');
    if (modal) modal.style.display = 'flex';
}

function salvarNovoUsuario() {
    const nome = document.getElementById('novoUsuarioNome').value.trim();
    const login = document.getElementById('novoUsuarioLogin').value.trim();
    const senha = document.getElementById('novoUsuarioSenha').value.trim();
    const tipo = document.getElementById('novoUsuarioTipo').value;
    
    if (!nome || !login || !senha) {
        alert('⚠️ Preencha todos os campos!');
        return;
    }
    
    if (USUARIOS[login]) {
        alert('⚠️ Este login já existe!');
        return;
    }
    
    USUARIOS[login] = { senha, nome, tipo };
    salvarUsuarios();
    listarUsuarios();
    fecharModal('modalCadastroUsuario');
    
    document.getElementById('novoUsuarioNome').value = '';
    document.getElementById('novoUsuarioLogin').value = '';
    document.getElementById('novoUsuarioSenha').value = '';
    
    atualizarStatus(`✅ Usuário "${nome}" cadastrado!`);
    alert(`✅ Usuário "${nome}" cadastrado com sucesso!`);
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

function excluirUsuario(login) {
    if (login === 'admin') {
        alert('⚠️ Não é possível excluir o usuário admin!');
        return;
    }
    if (confirm(`Excluir usuário "${login}"?`)) {
        delete USUARIOS[login];
        salvarUsuarios();
        listarUsuarios();
        atualizarStatus(`🗑️ Usuário "${login}" removido`);
    }
}

function salvarUsuarios() {
    try {
        localStorage.setItem('usuarios', JSON.stringify(USUARIOS));
    } catch(e) {}
}

function carregarUsuarios() {
    try {
        const saved = localStorage.getItem('usuarios');
        if (saved) {
            const parsed = JSON.parse(saved);
            USUARIOS = { ...USUARIOS, ...parsed };
        }
    } catch(e) {}
}

// ============================================
// VERIFICAR LOGIN SALVO
// ============================================
function verificarLogin() {
    try {
        const salvo = localStorage.getItem('usuarioLogado');
        if (!salvo) return false;
        
        const data = JSON.parse(salvo);
        if (!USUARIOS[data.login] && data.tipo !== 'google') {
            localStorage.removeItem('usuarioLogado');
            return false;
        }
        
        usuarioAtual = data;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('sistemaScreen').style.display = 'block';
        document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
        
        if (usuarioAtual.avatar) {
            document.getElementById('userAvatar').style.display = 'inline-block';
            document.getElementById('avatarImg').src = usuarioAtual.avatar;
        }
        
        init();
        atualizarStatus(`✅ Bem-vindo de volta, ${usuarioAtual.nome}!`);
        return true;
        
    } catch(e) {
        console.error('Erro ao verificar login:', e);
        return false;
    }
}

// ============================================
// FUNÇÕES DE LOG
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
// DADOS
// ============================================
function carregarDados() {
    try {
        const c = localStorage.getItem('clientes');
        const p = localStorage.getItem('produtos');
        const o = localStorage.getItem('ordensServico');
        const r = localStorage.getItem('recibos');
        if (c) clientes = JSON.parse(c);
        if (p) produtos = JSON.parse(p);
        if (o) ordensServico = JSON.parse(o);
        if (r) recibos = JSON.parse(r);
    } catch(e) { console.log('Erro ao carregar dados:', e); }
}

function salvarDados() {
    try {
        localStorage.setItem('clientes', JSON.stringify(clientes));
        localStorage.setItem('produtos', JSON.stringify(produtos));
        localStorage.setItem('ordensServico', JSON.stringify(ordensServico));
        localStorage.setItem('recibos', JSON.stringify(recibos));
    } catch(e) { console.log('Erro ao salvar:', e); }
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================
// FUNÇÕES GERAIS
// ============================================
function atualizarStatus(msg, tipo = 'success') {
    const bar = document.getElementById('statusBar');
    if (!bar) return;
    bar.textContent = msg;
    bar.className = 'status-bar';
    if (tipo === 'success') bar.classList.add('success');
    else if (tipo === 'error') bar.classList.add('error');
    else if (tipo === 'warning') bar.classList.add('warning');
}

function abrirModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function fecharModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function abrirTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-btn[onclick="abrirTab('${tabId}')"]`)?.classList.add('active');
}

function carregarLogo() {
    const headerLogo = document.getElementById('headerLogo');
    if (!headerLogo) return;
    headerLogo.innerHTML = `<h1 class="logo-title">⚡ ${EMPRESA.nomeAbreviado}</h1>`;
}

// ============================================
// CLIENTES (CRUD BÁSICO)
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
                ${c.cpf ? `<br><small>🆔 ${c.cpf}</small>` : ''}
                ${c.endereco ? `<br><small>📍 ${c.endereco}</small>` : ''}
            </span>
            <div style="display:flex;gap:5px;">
                <button onclick="editarCliente(${i})" class="btn-secondary" style="padding:4px 8px;">✏️</button>
                <button onclick="excluirCliente(${i})" class="btn-secondary" style="padding:4px 8px;">🗑️</button>
            </div>
        </li>
    `).join('');
}

function adicionarCliente() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    const cpf = document.getElementById('cpfCliente').value.trim();
    const endereco = document.getElementById('enderecoCliente').value.trim();
    const email = document.getElementById('emailCliente').value.trim();
    if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
    clientes.push({ id: gerarId(), nome, email, telefone, cpf, endereco });
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
}

function excluirCliente(index) {
    const nome = clientes[index].nome;
    if (confirm(`Excluir "${nome}"?`)) {
        clientes.splice(index, 1);
        salvarDados();
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`🗑️ Cliente "${nome}" removido`);
    }
}

function editarCliente(index) {
    alert('✏️ Editar cliente em desenvolvimento');
}

function renderSelectClientes() {
    const sel = document.getElementById('selCliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione um cliente</option>' +
        clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
}

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
                salvarDados();
                renderClientes();
                renderSelectClientes();
                atualizarStatus('✅ Dados importados!');
                alert('✅ Dados importados com sucesso!');
            }
        } catch(err) { alert('❌ Arquivo inválido!'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function init() {
    console.log('🚀 Inicializando sistema...');
    carregarDados();
    renderClientes();
    renderSelectClientes();
    listarUsuarios();
    carregarLogo();
    atualizarStatus(`✅ Sistema pronto! ${clientes.length} clientes`);
    console.log('✅ Sistema inicializado!');
}

// ============================================
// EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM carregado!');
    
    // Verifica login
    if (!verificarLogin()) {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('sistemaScreen').style.display = 'none';
    }
    
    // Evento Enter
    document.getElementById('loginUsuario')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('loginSenha').focus();
    });
    document.getElementById('loginSenha')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') fazerLogin();
    });
    
    // Botões
    document.getElementById('btnAddCliente')?.addEventListener('click', function() {
        abrirModal('modalCliente');
        document.getElementById('nomeCliente').focus();
    });
    
    document.getElementById('salvarCliente')?.addEventListener('click', adicionarCliente);
    document.getElementById('fecharModalCliente')?.addEventListener('click', function() {
        fecharModal('modalCliente');
    });
    
    document.getElementById('salvarNovoUsuario')?.addEventListener('click', salvarNovoUsuario);
    
    console.log('✅ Eventos configurados!');
});

console.log('⚡ SE7VEN ENERGIA - Sistema carregado!');