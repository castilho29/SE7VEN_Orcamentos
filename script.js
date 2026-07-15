// ============================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================

// Carrega as configurações do config.js
let CONFIG = {};

try {
    if (typeof window.CONFIG !== 'undefined') {
        CONFIG = window.CONFIG;
        console.log('✅ Configurações carregadas!');
    }
} catch(e) {
    console.warn('⚠️ config.js não encontrado');
}

// ============================================
// EMPRESA
// ============================================
const EMPRESA = CONFIG.EMPRESA || {
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
    token: CONFIG.GITHUB_TOKEN || '',
    usuario: CONFIG.GITHUB_USUARIO || 'castilho29',
    repo: CONFIG.GITHUB_REPO || 'SE7VEN_Orcamentos',
    arquivo: CONFIG.GITHUB_ARQUIVO || 'dados.json',
    intervaloAuto: CONFIG.INTERVALO_SYNC || 300000,
    branch: CONFIG.BRANCH || 'main'
};

// ============================================
// FIREBASE CONFIG (LOGIN GOOGLE)
// ============================================
// Verifica se o Firebase está disponível
let auth = null;
let firebaseApp = null;

try {
    if (typeof firebase !== 'undefined' && CONFIG.FIREBASE_CONFIG) {
        firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        auth = firebase.auth();
        console.log('✅ Firebase inicializado!');
    }
} catch(e) {
    console.warn('⚠️ Firebase não disponível');
}

// ============================================
// USUÁRIOS
// ============================================
let USUARIOS = {};

try {
    if (CONFIG.USUARIOS) {
        USUARIOS = CONFIG.USUARIOS;
        console.log('✅ Usuários carregados do config.js');
    } else {
        // Usuários padrão
        USUARIOS = {
            admin: { senha: 'admin', nome: 'Administrador', tipo: 'admin' },
            usuario: { senha: '123456', nome: 'Usuário Padrão', tipo: 'usuario' }
        };
        console.log('ℹ️ Usuários padrão carregados');
    }
} catch(e) {
    USUARIOS = {
        admin: { senha: 'admin', nome: 'Administrador', tipo: 'admin' },
        usuario: { senha: '123456', nome: 'Usuário Padrão', tipo: 'usuario' }
    };
}

console.log('📋 Usuários disponíveis:', Object.keys(USUARIOS));

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
let syncAutomaticaAtiva = true;
let ultimaSync = null;

// ============================================
// FUNÇÃO DE LOGIN
// ============================================
function fazerLogin() {
    console.log('🔑 Função fazerLogin chamada!');
    
    const userInput = document.getElementById('loginUsuario');
    const senhaInput = document.getElementById('loginSenha');
    const error = document.getElementById('loginError');
    
    if (!userInput || !senhaInput) {
        console.error('❌ Campos de login não encontrados!');
        alert('Erro: Campos de login não encontrados!');
        return;
    }
    
    const user = userInput.value.trim();
    const senha = senhaInput.value.trim();
    
    console.log('🔑 Tentando login:', user);
    console.log('📋 Usuários disponíveis:', Object.keys(USUARIOS));
    
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
        console.error('❌ Senha incorreta para:', user);
        error.textContent = '❌ Senha incorreta!';
        error.style.display = 'block';
        return;
    }
    
    console.log('✅ Login bem sucedido!', user);
    
    usuarioAtual = { 
        login: user, 
        nome: USUARIOS[user].nome,
        tipo: USUARIOS[user].tipo || 'usuario'
    };
    
    try {
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioAtual));
        console.log('💾 Usuário salvo no localStorage');
    } catch(e) {
        console.warn('⚠️ Não foi possível salvar no localStorage:', e);
    }
    
    // Mostra o sistema
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sistemaScreen').style.display = 'block';
    document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
    
    error.style.display = 'none';
    userInput.value = '';
    senhaInput.value = '';
    
    atualizarStatus(`✅ Bem-vindo, ${usuarioAtual.nome}!`);
    registrarLog('LOGIN', `${usuarioAtual.nome} entrou no sistema`);
    
    init();
    setTimeout(sincronizarDados, 3000);
}

// ============================================
// FUNÇÃO DE LOGOUT
// ============================================
function fazerLogout() {
    console.log('🔓 Fazendo logout');
    registrarLog('LOGOUT', `${usuarioAtual?.nome || 'Usuário'} saiu do sistema`);
    usuarioAtual = null;
    localStorage.removeItem('usuarioLogado');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('sistemaScreen').style.display = 'none';
    document.getElementById('loginUsuario').value = '';
    document.getElementById('loginSenha').value = '';
    if (syncTimeout) { clearInterval(syncTimeout); syncTimeout = null; }
}

// ============================================
// LOGIN COM GOOGLE
// ============================================
function loginGoogle() {
    if (!auth) {
        alert('⚠️ Login Google não disponível. Configure o Firebase.');
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log('✅ Login Google bem sucedido!', user);
            // ... resto da função
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
    document.getElementById('modalCadastroUsuario').style.display = 'flex';
    document.getElementById('novoUsuarioNome').focus();
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
    registrarLog('USUARIO_CADASTRADO', `Usuário "${nome}" (${login}) cadastrado`);
    alert(`✅ Usuário "${nome}" cadastrado com sucesso!`);
}

// ============================================
// LISTAR USUÁRIOS
// ============================================
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
        registrarLog('USUARIO_EXCLUIDO', `Usuário "${login}" excluído`);
    }
}

function salvarUsuarios() {
    try {
        localStorage.setItem('usuarios', JSON.stringify(USUARIOS));
        // Atualiza também no CONFIG
        if (window.CONFIG) {
            window.CONFIG.USUARIOS = USUARIOS;
        }
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
        console.log('🔍 Verificando login salvo:', salvo);
        
        if (!salvo) {
            console.log('ℹ️ Nenhum login salvo encontrado');
            return false;
        }
        
        const data = JSON.parse(salvo);
        console.log('📋 Dados salvos:', data);
        
        // Verifica se o usuário ainda existe
        if (!USUARIOS[data.login] && data.tipo !== 'google') {
            console.warn('⚠️ Usuário não existe mais:', data.login);
            localStorage.removeItem('usuarioLogado');
            return false;
        }
        
        usuarioAtual = data;
        console.log('✅ Sessão restaurada para:', usuarioAtual.nome);
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('sistemaScreen').style.display = 'block';
        document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
        
        init();
        atualizarStatus(`✅ Bem-vindo de volta, ${usuarioAtual.nome}!`);
        return true;
        
    } catch(e) {
        console.error('❌ Erro ao verificar login:', e);
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
    salvarLogs();
    renderizarLogs();
}

function salvarLogs() {
    try { localStorage.setItem('logs', JSON.stringify(logs)); } catch(e) {}
}

function carregarLogs() {
    try {
        const saved = localStorage.getItem('logs');
        if (saved) logs = JSON.parse(saved);
    } catch(e) {}
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

function limparLogs() {
    if (confirm('Limpar todos os logs?')) {
        logs = [];
        salvarLogs();
        renderizarLogs();
        atualizarStatus('🗑️ Logs limpos!');
        registrarLog('LOGS_LIMPADOS', 'Logs limpos');
    }
}

// ============================================
// DADOS LOCAIS
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
        
        if (clientes.length === 0 && produtos.length === 0) {
            clientes = [
                { id: '1', nome: 'José Castilho', email: 'jose@email.com', telefone: '(93) 98102-7290', cpf: '123.456.789-00', endereco: 'Rua Exemplo, 123 - Belém/PA' },
                { id: '2', nome: 'Maria Santos', email: 'maria@email.com', telefone: '(91) 99999-2222', cpf: '987.654.321-00', endereco: 'Av. Principal, 456 - Ananindeua/PA' }
            ];
            produtos = [
                { id: '1', nome: 'Kit Solar 5kWp', preco: 15000.00, tipo: 'equipamento' },
                { id: '2', nome: 'Inversor 5kW', preco: 4500.00, tipo: 'equipamento' },
                { id: '3', nome: 'Instalação Completa', preco: 3000.00, tipo: 'servico' },
                { id: '4', nome: 'Manutenção Anual', preco: 1200.00, tipo: 'servico' }
            ];
            salvarDados();
        }
    } catch(e) { console.log('Erro ao carregar:', e); }
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
// SINCRONIZAÇÃO
// ============================================
async function sincronizarDados() {
    const statusElement = document.getElementById('syncStatus');
    const progressElement = document.getElementById('syncProgress');
    const ultimaSyncElement = document.getElementById('ultimaSync');
    
    if (!statusElement) return;
    
    try {
        statusElement.textContent = '🔄 Sincronizando...';
        statusElement.className = 'status sincronizando';
        progressElement.style.display = 'block';
        progressElement.textContent = '⏳ Conectando ao GitHub...';
        
        if (!GITHUB_CONFIG.token) {
            throw new Error('Token não configurado! Verifique o config.js');
        }
        
        const testResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!testResponse.ok) {
            throw new Error(`Token inválido: ${testResponse.status}`);
        }
        
        progressElement.textContent = '📥 Baixando dados...';
        const dadosRemotos = await baixarDadosGitHub();
        
        if (dadosRemotos) {
            // ... resto da sincronização
        }
        
        statusElement.textContent = '✅ Sincronizado!';
        statusElement.className = 'status online';
        progressElement.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        statusElement.textContent = '❌ Erro: ' + error.message;
        statusElement.className = 'status offline';
        progressElement.textContent = '❌ ' + error.message;
        progressElement.style.display = 'block';
        atualizarStatus('❌ ' + error.message, 'error');
    }
}

async function baixarDadosGitHub() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.usuario}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.arquivo}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const conteudo = atob(data.content);
        const dados = JSON.parse(conteudo);
        dados.timestamp = data.committer?.date || null;
        return dados;
    } catch (error) {
        console.error('Erro ao baixar:', error);
        throw error;
    }
}

// ============================================
// FUNÇÕES DE CLIENTES
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
    registrarLog('CLIENTE_ADICIONADO', `Cliente "${nome}" adicionado por ${usuarioAtual?.nome}`);
}

function excluirCliente(index) {
    const nome = clientes[index].nome;
    if (confirm(`Excluir "${nome}"?`)) {
        clientes.splice(index, 1);
        salvarDados();
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`🗑️ Cliente "${nome}" removido`);
        registrarLog('CLIENTE_EXCLUIDO', `Cliente "${nome}" excluído por ${usuarioAtual?.nome}`);
    }
}

function editarCliente(index) {
    // Implementação simplificada
    alert('Função editar cliente em desenvolvimento');
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function init() {
    console.log('🚀 Inicializando sistema...');
    carregarDados();
    carregarLogs();
    renderClientes();
    renderSelectClientes();
    listarUsuarios();
    atualizarStatus(`✅ Sistema pronto! ${clientes.length} clientes, ${produtos.length} produtos`);
    console.log('✅ Sistema inicializado!');
}

function renderSelectClientes() {
    const sel = document.getElementById('selCliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione um cliente</option>' +
        clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
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
    
    // Evento Enter no login
    document.getElementById('loginUsuario')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('loginSenha').focus();
    });
    document.getElementById('loginSenha')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') fazerLogin();
    });
    
    // Botão cadastro usuário
    document.getElementById('salvarNovoUsuario')?.addEventListener('click', salvarNovoUsuario);
    
    console.log('✅ Eventos configurados!');
});

console.log('⚡ SE7VEN ENERGIA - Sistema carregado!');