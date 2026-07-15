// ============================================
// SISTEMA SE7VEN ENERGIA - COMPLETO
// ============================================

console.log('⚡ Carregando sistema...');

// ============================================
// CONFIGURAÇÕES
// ============================================
let CONFIG = {};

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
    try { localStorage.setItem('usuarios', JSON.stringify(USUARIOS)); } catch(e) {}
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
// SINCRONIZAÇÃO
// ============================================
async function sincronizarDados() {
    const statusElement = document.getElementById('syncStatus');
    const progressElement = document.getElementById('syncProgress');
    const ultimaSyncElement = document.getElementById('ultimaSync');
    
    if (!statusElement) {
        console.warn('Elementos de sincronização não encontrados');
        return;
    }
    
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
            progressElement.textContent = '📥 Mesclando dados...';
            const timestampLocal = parseInt(localStorage.getItem('ultimaSyncTimestamp') || '0');
            const timestampRemoto = dadosRemotos.timestamp ? new Date(dadosRemotos.timestamp).getTime() : 0;
            
            if (timestampRemoto > timestampLocal) {
                clientes = dadosRemotos.clientes || [];
                produtos = dadosRemotos.produtos || [];
                ordensServico = dadosRemotos.ordensServico || [];
                recibos = dadosRemotos.recibos || [];
                if (dadosRemotos.logs) logs = dadosRemotos.logs;
                if (dadosRemotos.usuarios) USUARIOS = { ...USUARIOS, ...dadosRemotos.usuarios };
                
                salvarDados();
                try { localStorage.setItem('logs', JSON.stringify(logs)); } catch(e) {}
                salvarUsuarios();
                renderizarTudo();
                
                ultimaSync = new Date();
                localStorage.setItem('ultimaSyncTimestamp', ultimaSync.getTime());
                if (ultimaSyncElement) ultimaSyncElement.textContent = `Última: ${ultimaSync.toLocaleString('pt-BR')}`;
                
                atualizarStatus('🔄 Dados baixados do GitHub!');
                registrarLog('SINCRONIZACAO', 'Dados baixados do GitHub');
            } else {
                progressElement.textContent = '📤 Enviando dados...';
                await enviarDadosGitHub();
                ultimaSync = new Date();
                localStorage.setItem('ultimaSyncTimestamp', ultimaSync.getTime());
                if (ultimaSyncElement) ultimaSyncElement.textContent = `Última: ${ultimaSync.toLocaleString('pt-BR')}`;
                atualizarStatus('📤 Dados enviados para o GitHub!');
                registrarLog('SINCRONIZACAO', 'Dados enviados para o GitHub');
            }
        } else {
            progressElement.textContent = '📤 Enviando dados iniciais...';
            await enviarDadosGitHub();
            ultimaSync = new Date();
            localStorage.setItem('ultimaSyncTimestamp', ultimaSync.getTime());
            if (ultimaSyncElement) ultimaSyncElement.textContent = `Última: ${ultimaSync.toLocaleString('pt-BR')}`;
            atualizarStatus('📤 Dados iniciais enviados!');
            registrarLog('SINCRONIZACAO', 'Dados iniciais enviados');
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

async function enviarDadosGitHub() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.usuario}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.arquivo}`;
        let sha = null;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
            }
        } catch(e) {}
        
        const dados = {
            clientes, produtos, ordensServico, recibos, logs,
            usuarios: USUARIOS,
            timestamp: new Date().toISOString(),
            versao: '2.0',
            empresa: EMPRESA.nome,
            atualizadoPor: usuarioAtual?.nome || 'Sistema'
        };
        
        const conteudo = btoa(unescape(encodeURIComponent(JSON.stringify(dados, null, 2))));
        const body = {
            message: `Atualização - ${new Date().toLocaleString('pt-BR')}`,
            content: conteudo,
            branch: GITHUB_CONFIG.branch
        };
        if (sha) body.sha = sha;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`HTTP ${response.status}: ${error.message}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro ao enviar:', error);
        throw error;
    }
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
    const c = clientes[index];
    document.getElementById('nomeCliente').value = c.nome;
    document.getElementById('telefoneCliente').value = c.telefone || '';
    document.getElementById('cpfCliente').value = c.cpf || '';
    document.getElementById('enderecoCliente').value = c.endereco || '';
    document.getElementById('emailCliente').value = c.email || '';
    
    document.querySelector('#modalCliente h3').textContent = '✏️ Editar Cliente';
    const btn = document.getElementById('salvarCliente');
    btn.textContent = '💾 Atualizar';
    btn.style.background = '#f39c12';
    btn.dataset.index = index;
    
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    
    novoBtn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.index);
        const nome = document.getElementById('nomeCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();
        const cpf = document.getElementById('cpfCliente').value.trim();
        const endereco = document.getElementById('enderecoCliente').value.trim();
        const email = document.getElementById('emailCliente').value.trim();
        if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
        
        clientes[idx] = { ...clientes[idx], nome, email, telefone, cpf, endereco };
        salvarDados();
        document.getElementById('nomeCliente').value = '';
        document.getElementById('telefoneCliente').value = '';
        document.getElementById('cpfCliente').value = '';
        document.getElementById('enderecoCliente').value = '';
        document.getElementById('emailCliente').value = '';
        
        document.querySelector('#modalCliente h3').textContent = '👤 Novo Cliente';
        this.textContent = 'Salvar';
        this.style.background = '#1a237e';
        this.dataset.index = '';
        
        fecharModal('modalCliente');
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`✅ Cliente "${nome}" atualizado!`);
        registrarLog('CLIENTE_EDITADO', `Cliente "${nome}" editado por ${usuarioAtual?.nome}`);
    });
    
    abrirModal('modalCliente');
    document.getElementById('nomeCliente').focus();
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
    lista.innerHTML = produtos.map((p, i) => `
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

function adicionarProduto() {
    const nome = document.getElementById('nomeProduto').value.trim();
    const preco = parseFloat(document.getElementById('precoProduto').value);
    const tipo = document.getElementById('tipoProduto').value;
    if (!nome || isNaN(preco) || preco <= 0) { alert('⚠️ Nome e preço válido são obrigatórios'); return; }
    produtos.push({ id: gerarId(), nome, preco, tipo });
    salvarDados();
    document.getElementById('nomeProduto').value = '';
    document.getElementById('precoProduto').value = '';
    fecharModal('modalProduto');
    renderProdutos();
    renderSelectProdutos();
    atualizarStatus(`✅ Produto "${nome}" cadastrado!`);
    registrarLog('PRODUTO_ADICIONADO', `Produto "${nome}" adicionado por ${usuarioAtual?.nome}`);
}

function excluirProduto(index) {
    const nome = produtos[index].nome;
    if (confirm(`Excluir "${nome}"?`)) {
        produtos.splice(index, 1);
        salvarDados();
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`🗑️ Produto "${nome}" removido`);
        registrarLog('PRODUTO_EXCLUIDO', `Produto "${nome}" excluído por ${usuarioAtual?.nome}`);
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
    btn.style.background = '#f39c12';
    btn.dataset.index = index;
    
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    
    novoBtn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.index);
        const nome = document.getElementById('nomeProduto').value.trim();
        const preco = parseFloat(document.getElementById('precoProduto').value);
        const tipo = document.getElementById('tipoProduto').value;
        if (!nome || isNaN(preco) || preco <= 0) { alert('⚠️ Nome e preço válido são obrigatórios'); return; }
        
        produtos[idx] = { ...produtos[idx], nome, preco, tipo };
        salvarDados();
        document.getElementById('nomeProduto').value = '';
        document.getElementById('precoProduto').value = '';
        
        document.querySelector('#modalProduto h3').textContent = '📦 Novo Produto';
        this.textContent = 'Salvar';
        this.style.background = '#1a237e';
        this.dataset.index = '';
        
        fecharModal('modalProduto');
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`✅ Produto "${nome}" atualizado!`);
        registrarLog('PRODUTO_EDITADO', `Produto "${nome}" editado por ${usuarioAtual?.nome}`);
    });
    
    abrirModal('modalProduto');
    document.getElementById('nomeProduto').focus();
}

function renderSelectProdutos() {
    document.querySelectorAll('.selProduto').forEach(select => {
        const current = select.value;
        select.innerHTML = '<option value="">Selecione um produto</option>' +
            produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`).join('');
        select.value = current;
    });
}

// ============================================
// ORÇAMENTO
// ============================================
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

// ============================================
// SALVAR ORÇAMENTO
// ============================================
function salvarOrcamento() {
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
    const distancia = parseFloat(document.getElementById('distancia').value) || 50;
    const tensao = parseFloat(document.getElementById('tensao').value);
    const fp = parseFloat(document.getElementById('fp').value) || 0.92;

    const novaOS = {
        id: gerarId(),
        numero: 'OS-' + (ordensServico.length + 1).toString().padStart(4, '0'),
        cliente: cliente,
        clienteData: clienteData,
        itens: itens,
        total: total,
        status: 'orcamento',
        dataCriacao: new Date().toISOString(),
        dataAprovacao: null,
        dataInicio: null,
        dataConclusao: null,
        distancia: distancia,
        tensao: tensao,
        fp: fp
    };

    ordensServico.push(novaOS);
    salvarDados();
    listarOS();
    atualizarStatus(`✅ Orçamento salvo! Nº ${novaOS.numero}`);
    registrarLog('OS_CRIADA', `OS ${novaOS.numero} criada para ${cliente} por ${usuarioAtual?.nome}`);
    alert(`✅ Orçamento salvo!\nNº: ${novaOS.numero}\nCliente: ${cliente}\nTotal: R$ ${total.toFixed(2)}`);
    abrirTab('tabOS');
}

// ============================================
// ORDENS DE SERVIÇO
// ============================================
function listarOS(filtro = 'todos') {
    const container = document.getElementById('listaOS');
    if (!container) return;
    let lista = filtro !== 'todos' ? ordensServico.filter(os => os.status === filtro) : ordensServico;
    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhuma OS encontrada</p>';
        return;
    }
    const statusMap = {
        'orcamento': { label: '📄 Orçamento', class: 'status-orcamento' },
        'aprovado': { label: '✅ Aprovado', class: 'status-os' },
        'em_andamento': { label: '🔧 Em Andamento', class: 'status-os' },
        'concluido': { label: '✅ Concluído', class: 'status-recebido' },
        'cancelado': { label: '❌ Cancelado', class: 'status-cancelado' }
    };
    container.innerHTML = lista.map(os => {
        const st = statusMap[os.status] || statusMap['orcamento'];
        const data = new Date(os.dataCriacao).toLocaleDateString('pt-BR');
        const podeEditar = os.status === 'orcamento' || os.status === 'aprovado';
        return `
            <div class="os-card">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div><strong>${os.numero}</strong> <span class="status-badge ${st.class}">${st.label}</span></div>
                    <div style="display:flex;gap:5px;">
                        ${podeEditar ? `<button onclick="editarOS('${os.id}')" class="btn-secondary" style="padding:4px 8px;font-size:12px;">✏️ Editar</button>` : ''}
                        <button onclick="abrirOS('${os.id}')" class="btn-primary" style="padding:4px 8px;font-size:12px;">👁️ Ver</button>
                    </div>
                </div>
                <div><strong>Cliente:</strong> ${os.cliente}</div>
                <div style="font-size:12px;color:#666;">${os.itens.length} itens | Total: R$ ${os.total.toFixed(2)} | ${data}</div>
            </div>
        `;
    }).join('');
}

function filtrarOS() { listarOS(document.getElementById('filtroStatusOS').value); }

function abrirOS(id) {
    osAtual = ordensServico.find(os => os.id === id);
    if (!osAtual) return;
    const container = document.getElementById('detalhesOS');
    const data = new Date(osAtual.dataCriacao).toLocaleDateString('pt-BR');
    const statusMap = {
        'orcamento': '📄 Orçamento',
        'aprovado': '✅ Aprovado',
        'em_andamento': '🔧 Em Andamento',
        'concluido': '✅ Concluído',
        'cancelado': '❌ Cancelado'
    };
    let itensHTML = osAtual.itens.map((item, i) => `
        <tr><td>${i+1}</td><td>${item.nome}</td><td>${item.qtd}</td><td>R$ ${item.preco.toFixed(2)}</td><td>R$ ${item.subtotal.toFixed(2)}</td></tr>
    `).join('');
    container.innerHTML = `
        <div style="margin-bottom:10px;">
            <p><strong>Nº:</strong> ${osAtual.numero}</p>
            <p><strong>Cliente:</strong> ${osAtual.cliente}</p>
            <p><strong>Status:</strong> ${statusMap[osAtual.status] || '📄 Orçamento'}</p>
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Total:</strong> R$ ${osAtual.total.toFixed(2)}</p>
            ${osAtual.distancia ? `<p><strong>Distância:</strong> ${osAtual.distancia} m</p>` : ''}
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="background:#1a237e;color:white;"><th style="padding:5px;">#</th><th style="padding:5px;">Produto</th><th style="padding:5px;">Qtd</th><th style="padding:5px;">Preço</th><th style="padding:5px;">Subtotal</th></tr></thead>
                <tbody>${itensHTML}</tbody>
            </table>
        </div>
    `;
    document.getElementById('btnAprovarOS').style.display = osAtual.status === 'orcamento' ? 'inline-block' : 'none';
    document.getElementById('btnIniciarOS').style.display = osAtual.status === 'aprovado' ? 'inline-block' : 'none';
    document.getElementById('btnConcluirOS').style.display = osAtual.status === 'em_andamento' ? 'inline-block' : 'none';
    document.getElementById('btnCancelarOS').style.display = osAtual.status !== 'cancelado' && osAtual.status !== 'concluido' ? 'inline-block' : 'none';
    document.getElementById('btnEmitirRecibo').style.display = osAtual.status === 'concluido' ? 'inline-block' : 'none';
    abrirModal('modalOS');
}

function aprovarOS() {
    if (!osAtual || !confirm(`Aprovar OS ${osAtual.numero}?`)) return;
    osAtual.status = 'aprovado';
    osAtual.dataAprovacao = new Date().toISOString();
    salvarDados();
    listarOS();
    fecharModal('modalOS');
    atualizarStatus(`✅ OS ${osAtual.numero} aprovada!`);
    registrarLog('OS_APROVADA', `OS ${osAtual.numero} aprovada por ${usuarioAtual?.nome}`);
}

function iniciarOS() {
    if (!osAtual || !confirm(`Iniciar OS ${osAtual.numero}?`)) return;
    osAtual.status = 'em_andamento';
    osAtual.dataInicio = new Date().toISOString();
    salvarDados();
    listarOS();
    fecharModal('modalOS');
    atualizarStatus(`🔧 OS ${osAtual.numero} em andamento!`);
    registrarLog('OS_INICIADA', `OS ${osAtual.numero} iniciada por ${usuarioAtual?.nome}`);
}

function concluirOS() {
    if (!osAtual || !confirm(`Concluir OS ${osAtual.numero}?`)) return;
    osAtual.status = 'concluido';
    osAtual.dataConclusao = new Date().toISOString();
    salvarDados();
    listarOS();
    fecharModal('modalOS');
    atualizarStatus(`✅ OS ${osAtual.numero} concluída!`);
    registrarLog('OS_CONCLUIDA', `OS ${osAtual.numero} concluída por ${usuarioAtual?.nome}`);
}

function cancelarOS() {
    if (!osAtual || !confirm(`Cancelar OS ${osAtual.numero}?`)) return;
    osAtual.status = 'cancelado';
    salvarDados();
    listarOS();
    fecharModal('modalOS');
    atualizarStatus(`❌ OS ${osAtual.numero} cancelada!`);
    registrarLog('OS_CANCELADA', `OS ${osAtual.numero} cancelada por ${usuarioAtual?.nome}`);
}

function editarOS(id) {
    alert('✏️ Editar OS em desenvolvimento');
}

function emitirRecibo() {
    if (!osAtual || osAtual.status !== 'concluido') { alert('⚠️ A OS precisa estar concluída!'); return; }
    const recibo = {
        id: gerarId(),
        numero: 'REC-' + (recibos.length + 1).toString().padStart(4, '0'),
        osId: osAtual.id,
        osNumero: osAtual.numero,
        cliente: osAtual.cliente,
        clienteData: osAtual.clienteData,
        itens: osAtual.itens,
        total: osAtual.total,
        status: 'pendente',
        dataEmissao: new Date().toISOString(),
        dataPagamento: null
    };
    recibos.push(recibo);
    salvarDados();
    listarRecibos();
    fecharModal('modalOS');
    atualizarStatus(`💰 Recibo ${recibo.numero} emitido!`);
    registrarLog('RECIBO_EMITIDO', `Recibo ${recibo.numero} emitido para ${osAtual.cliente} por ${usuarioAtual?.nome}`);
    abrirRecibo(recibo.id);
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
        const data = new Date(r.dataEmissao).toLocaleDateString('pt-BR');
        const status = r.status === 'pago' ? '✅ Pago' : '⏳ Pendente';
        return `
            <div class="os-card" onclick="abrirRecibo('${r.id}')">
                <div><strong>${r.numero}</strong> <span class="status-badge ${r.status === 'pago' ? 'status-recebido' : 'status-orcamento'}">${status}</span></div>
                <div><strong>Cliente:</strong> ${r.cliente}</div>
                <div style="font-size:12px;color:#666;">OS: ${r.osNumero} | Total: R$ ${r.total.toFixed(2)} | ${data}</div>
            </div>
        `;
    }).join('');
}

function filtrarRecibos() { listarRecibos(document.getElementById('filtroRecibo').value); }

function abrirRecibo(id) {
    reciboAtual = recibos.find(r => r.id === id);
    if (!reciboAtual) return;
    const container = document.getElementById('conteudoRecibo');
    const data = new Date(reciboAtual.dataEmissao).toLocaleDateString('pt-BR');
    let itensHTML = reciboAtual.itens.map((item, i) => `
        <tr><td>${i+1}</td><td>${item.nome}</td><td>${item.qtd}</td><td>R$ ${item.preco.toFixed(2)}</td><td>R$ ${item.subtotal.toFixed(2)}</td></tr>
    `).join('');
    container.innerHTML = `
        <div style="text-align:center;border-bottom:2px solid #1a237e;padding-bottom:10px;margin-bottom:15px;">
            <h2 style="color:#1a237e;">${EMPRESA.nome}</h2>
            <p style="color:#666;font-size:12px;">${EMPRESA.cnpj} | ${EMPRESA.endereco}</p>
            <h3>RECIBO</h3>
        </div>
        <div style="margin-bottom:10px;">
            <p><strong>Nº:</strong> ${reciboAtual.numero}</p>
            <p><strong>OS:</strong> ${reciboAtual.osNumero}</p>
            <p><strong>Cliente:</strong> ${reciboAtual.cliente}</p>
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Status:</strong> ${reciboAtual.status === 'pago' ? '✅ PAGO' : '⏳ PENDENTE'}</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="background:#1a237e;color:white;"><th style="padding:5px;">#</th><th style="padding:5px;">Produto</th><th style="padding:5px;">Qtd</th><th style="padding:5px;">Preço</th><th style="padding:5px;">Subtotal</th></tr></thead>
                <tbody>${itensHTML}</tbody>
            </table>
        </div>
        <div style="text-align:right;padding:10px;font-size:18px;font-weight:bold;border-top:2px solid #1a237e;margin-top:10px;">
            TOTAL: R$ ${reciboAtual.total.toFixed(2)}
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

function marcarPago() {
    if (!reciboAtual || !confirm(`Marcar recibo ${reciboAtual.numero} como PAGO?`)) return;
    reciboAtual.status = 'pago';
    reciboAtual.dataPagamento = new Date().toISOString();
    salvarDados();
    listarRecibos();
    abrirRecibo(reciboAtual.id);
    atualizarStatus(`✅ Recibo ${reciboAtual.numero} pago!`);
    registrarLog('RECIBO_PAGO', `Recibo ${reciboAtual.numero} marcado como pago por ${usuarioAtual?.nome}`);
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
// PDF
// ============================================
function gerarPDF() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente'); return; }
    
    const itens = [];
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const nome = select.value;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        if (nome && qtd > 0) itens.push({ nome, qtd, preco, subtotal: preco * qtd });
    });
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item'); return; }
    
    alert('📄 Função PDF em desenvolvimento');
}

// ============================================
// WHATSAPP
// ============================================
function enviarWhatsApp() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente'); return; }
    alert('💬 Função WhatsApp em desenvolvimento');
}

function enviarPDFWhatsApp() {
    alert('📤 Função PDF+WhatsApp em desenvolvimento');
}

// ============================================
// BACKUP
// ============================================
function exportarDados() {
    const dados = { clientes, produtos, ordensServico, recibos, logs, usuarios: USUARIOS, data: new Date().toISOString() };
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
                if (dados.usuarios) USUARIOS = { ...USUARIOS, ...dados.usuarios };
                salvarDados();
                try { localStorage.setItem('logs', JSON.stringify(logs)); } catch(e) {}
                salvarUsuarios();
                renderizarTudo();
                atualizarStatus('✅ Dados importados!');
                registrarLog('IMPORTAR', 'Dados importados do JSON');
                alert('✅ Dados importados com sucesso!');
            }
        } catch(err) { alert('❌ Arquivo inválido!'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function backupGit() {
    const dados = { clientes, produtos, ordensServico, recibos, logs, usuarios: USUARIOS, data: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(dados, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_git_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    atualizarStatus('📤 Backup Git baixado!');
    registrarLog('BACKUP_GIT', 'Backup Git manual realizado');
}

// ============================================
// CÁLCULOS ELÉTRICOS
// ============================================
function dimensionarCabos() {
    const corrente = parseFloat(document.getElementById('correnteCabos').value);
    const distancia = parseFloat(document.getElementById('distanciaCabos').value) || 50;
    const tensao = parseFloat(document.getElementById('tensaoCabos').value);
    if (!corrente || corrente <= 0) { alert('⚠️ Informe a corrente!'); return; }
    
    const tabela = {1.5:15.5,2.5:21,4:28,6:36,10:50,16:68,25:89,35:111,50:134,70:171,95:207,120:239,150:275,185:314,240:370};
    let bitola = null;
    for (let [b, cap] of Object.entries(tabela)) {
        if (cap >= corrente) { bitola = b; break; }
    }
    if (!bitola) { document.getElementById('resultadoCabos').innerHTML = '⚠️ Corrente muito alta!'; return; }
    
    const resistencia = (0.0172 * 2 * distancia) / parseFloat(bitola);
    const queda = (resistencia * corrente / tensao) * 100;
    document.getElementById('resultadoCabos').innerHTML = `
        <strong>✅ Bitola:</strong> ${bitola} mm²<br>
        <strong>Capacidade:</strong> ${tabela[bitola]} A<br>
        <strong>Queda:</strong> ${queda.toFixed(2)}% ${queda <= 3 ? '✅ OK' : '⚠️ ALTA'}<br>
        <strong>Distância Máxima:</strong> ${(tensao * 3 / (2 * 0.0172 * corrente / parseFloat(bitola))).toFixed(0)} m
    `;
}

function calcularQuedaTensao() {
    const corrente = parseFloat(document.getElementById('correnteQueda').value);
    const distancia = parseFloat(document.getElementById('distanciaQueda').value) || 50;
    const bitola = parseFloat(document.getElementById('bitolaQueda').value);
    const tensao = parseFloat(document.getElementById('tensaoQueda').value);
    if (!corrente || !bitola) { alert('⚠️ Preencha todos os campos!'); return; }
    
    const resistencia = (0.0172 * 2 * distancia) / bitola;
    const quedaV = resistencia * corrente;
    const quedaP = (quedaV / tensao) * 100;
    document.getElementById('resultadoQueda').innerHTML = `
        <strong>Queda:</strong> ${quedaV.toFixed(2)} V<br>
        <strong>Porcentagem:</strong> ${quedaP.toFixed(2)}%<br>
        <strong>Status:</strong> ${quedaP <= 3 ? '✅ OK' : '⚠️ ALTA - Aumente a bitola'}
    `;
}

function calcularDemanda() {
    const potencia = parseFloat(document.getElementById('potenciaDemanda').value);
    const tensao = parseFloat(document.getElementById('tensaoDemanda').value);
    const fp = parseFloat(document.getElementById('fpDemanda').value) || 0.92;
    if (!potencia || potencia <= 0) { alert('⚠️ Informe a potência!'); return; }
    
    const corrente = potencia / (tensao * fp);
    document.getElementById('resultadoDemanda').innerHTML = `
        <strong>Potência:</strong> ${potencia} W (${(potencia/1000).toFixed(2)} kW)<br>
        <strong>Corrente:</strong> ${corrente.toFixed(2)} A<br>
        <strong>Tensão:</strong> ${tensao} V<br>
        <strong>Fator de Potência:</strong> ${fp}
    `;
}

function calcularProjeto() {
    const distancia = parseFloat(document.getElementById('distancia').value) || 50;
    const tensao = parseFloat(document.getElementById('tensao').value);
    const fp = parseFloat(document.getElementById('fp').value) || 0.92;
    const quedaMax = parseFloat(document.getElementById('quedaMax').value) || 3;
    
    const itens = [];
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const nome = select.value;
        if (nome && qtd > 0) itens.push({ nome, qtd });
    });
    
    const potTotal = itens.reduce((sum, item) => {
        const p = produtos.find(prod => prod.nome === item.nome);
        return sum + (p ? p.preco * item.qtd * 0.1 : 0);
    }, 0);
    
    const corrente = potTotal / (tensao * fp);
    const caboSugerido = corrente < 15 ? '2.5 mm²' : corrente < 28 ? '4 mm²' : corrente < 36 ? '6 mm²' : 
                         corrente < 50 ? '10 mm²' : corrente < 68 ? '16 mm²' : corrente < 89 ? '25 mm²' : 
                         corrente < 111 ? '35 mm²' : '> 50 mm²';
    
    const bitola = parseFloat(caboSugerido.replace(' mm²', ''));
    const resistencia = (0.0172 * 2 * distancia) / (isNaN(bitola) ? 10 : bitola);
    const queda = (resistencia * corrente / tensao) * 100;
    
    document.getElementById('resultadoProjeto').innerHTML = `
        <div style="background:white;padding:10px;border-radius:4px;">
            <strong>📊 Resumo do Projeto</strong><br>
            <strong>Distância:</strong> ${distancia} m<br>
            <strong>Tensão:</strong> ${tensao} V<br>
            <strong>Corrente:</strong> ${corrente.toFixed(2)} A<br>
            <strong>Cabo:</strong> ${caboSugerido}<br>
            <strong>Queda:</strong> ${queda.toFixed(2)}% ${queda <= quedaMax ? '✅ OK' : '⚠️ ALTA'}<br>
            <strong>Disjuntor:</strong> ${Math.ceil(corrente * 1.25)} A
        </div>
    `;
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function init() {
    console.log('🚀 Inicializando sistema...');
    carregarDados();
    renderClientes();
    renderProdutos();
    renderSelectClientes();
    renderSelectProdutos();
    updateTotal();
    listarOS();
    listarRecibos();
    renderizarLogs();
    listarUsuarios();
    if (produtos.length > 0) adicionarItem();
    carregarLogo();
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
    
    // Enter
    document.getElementById('loginUsuario')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('loginSenha').focus();
    });
    document.getElementById('loginSenha')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') fazerLogin();
    });
    
    // Botões principais
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
    
    document.getElementById('btnAprovarOS')?.addEventListener('click', aprovarOS);
    document.getElementById('btnIniciarOS')?.addEventListener('click', iniciarOS);
    document.getElementById('btnConcluirOS')?.addEventListener('click', concluirOS);
    document.getElementById('btnCancelarOS')?.addEventListener('click', cancelarOS);
    document.getElementById('btnEmitirRecibo')?.addEventListener('click', emitirRecibo);
    
    document.getElementById('btnMarcarPago')?.addEventListener('click', marcarPago);
    document.getElementById('btnImprimirRecibo')?.addEventListener('click', imprimirRecibo);
    
    // Fechar modal clicando fora
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Busca
    document.getElementById('buscaCliente')?.addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#listaClientes li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            li.style.display = texto.includes(termo) ? 'flex' : 'none';
        });
    });
    
    document.getElementById('buscaProduto')?.addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#listaProdutos li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            const nomeProduto = texto.split('R$')[0].trim();
            li.style.display = nomeProduto.includes(termo) ? 'flex' : 'none';
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
console.log('📊 Clientes:', clientes.length);
console.log('📦 Produtos:', produtos.length);
console.log('🔧 OS:', ordensServico.length);
console.log('💰 Recibos:', recibos.length);