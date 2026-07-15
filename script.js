// ============================================
// SISTEMA SE7VEN ENERGIA - VERSÃO SIMPLIFICADA
// ============================================

console.log('⚡ Carregando sistema...');

// ============================================
// USUÁRIOS - DIRETO NO CÓDIGO (FUNCIONAL)
// ============================================
const USUARIOS = {
    admin: { senha: 'admin', nome: 'Administrador', tipo: 'admin' }
};

// Tenta carregar usuários do localStorage
try {
    const saved = localStorage.getItem('usuarios');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(USUARIOS, parsed);
        console.log('✅ Usuários carregados:', Object.keys(USUARIOS));
    } else {
        localStorage.setItem('usuarios', JSON.stringify(USUARIOS));
        console.log('👤 Usuário admin criado');
    }
} catch(e) {
    console.warn('⚠️ Erro ao carregar usuários');
}

console.log('📋 Usuários:', Object.keys(USUARIOS));

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
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;
let clientes = [];
let produtos = [];
let ordensServico = [];
let recibos = [];
let logs = [];

// ============================================
// FUNÇÃO DE LOGIN (MAIS SIMPLES)
// ============================================
function fazerLogin() {
    console.log('🔑 Tentando login...');
    
    const user = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const error = document.getElementById('loginError');
    
    console.log('👤 Usuário:', user);
    console.log('📋 Usuários disponíveis:', Object.keys(USUARIOS));
    
    if (!user || !senha) {
        error.textContent = '❌ Preencha todos os campos!';
        error.style.display = 'block';
        return;
    }
    
    if (!USUARIOS[user]) {
        error.textContent = '❌ Usuário não encontrado!';
        error.style.display = 'block';
        console.log('❌ Usuário não existe:', user);
        return;
    }
    
    if (USUARIOS[user].senha !== senha) {
        error.textContent = '❌ Senha incorreta!';
        error.style.display = 'block';
        console.log('❌ Senha incorreta para:', user);
        return;
    }
    
    console.log('✅ Login bem sucedido!', user);
    
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
    document.getElementById('loginUsuario').value = '';
    document.getElementById('loginSenha').value = '';
    
    document.getElementById('statusBar').textContent = `✅ Bem-vindo, ${usuarioAtual.nome}!`;
    document.getElementById('statusBar').className = 'status-bar success';
    
    init();
}

// ============================================
// FUNÇÃO DE LOGOUT
// ============================================
function fazerLogout() {
    usuarioAtual = null;
    localStorage.removeItem('usuarioLogado');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('sistemaScreen').style.display = 'none';
    document.getElementById('loginUsuario').value = '';
    document.getElementById('loginSenha').value = '';
}

// ============================================
// VERIFICAR LOGIN SALVO
// ============================================
function verificarLogin() {
    try {
        const salvo = localStorage.getItem('usuarioLogado');
        if (!salvo) return false;
        
        const data = JSON.parse(salvo);
        if (!USUARIOS[data.login]) {
            localStorage.removeItem('usuarioLogado');
            return false;
        }
        
        usuarioAtual = data;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('sistemaScreen').style.display = 'block';
        document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
        document.getElementById('statusBar').textContent = `✅ Bem-vindo de volta, ${usuarioAtual.nome}!`;
        document.getElementById('statusBar').className = 'status-bar success';
        
        init();
        return true;
        
    } catch(e) {
        console.error('Erro ao verificar login:', e);
        return false;
    }
}

// ============================================
// GERAR PRODUTOS
// ============================================
function gerarProdutos() {
    const lista = [
        // Materiais
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
        // Equipamentos
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
        // Serviços
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
    return lista.map(item => ({
        id: String(id++),
        nome: item.nome,
        preco: item.preco,
        tipo: item.tipo
    }));
}

// ============================================
// CARREGAR DADOS
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
    } catch(e) { console.log('Erro ao salvar:', e); }
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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
        <h1 class="logo-title">SE7VEN ENERGIA</h1>
    `;
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
    if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
    clientes.push({ id: gerarId(), nome, telefone });
    salvarDados();
    document.getElementById('nomeCliente').value = '';
    document.getElementById('telefoneCliente').value = '';
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
    const c = clientes[index];
    document.getElementById('nomeCliente').value = c.nome;
    document.getElementById('telefoneCliente').value = c.telefone || '';
    document.querySelector('#modalCliente h3').textContent = '✏️ Editar Cliente';
    const btn = document.getElementById('salvarCliente');
    btn.textContent = '💾 Atualizar';
    btn.dataset.index = index;
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.index);
        const nome = document.getElementById('nomeCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();
        if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
        clientes[idx] = { ...clientes[idx], nome, telefone };
        salvarDados();
        document.getElementById('nomeCliente').value = '';
        document.getElementById('telefoneCliente').value = '';
        document.querySelector('#modalCliente h3').textContent = '👤 Novo Cliente';
        this.textContent = 'Salvar';
        this.dataset.index = '';
        fecharModal('modalCliente');
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`✅ Cliente "${nome}" atualizado!`);
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
}

function excluirProduto(index) {
    const nome = produtos[index].nome;
    if (confirm(`Excluir "${nome}"?`)) {
        produtos.splice(index, 1);
        salvarDados();
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`🗑️ Produto "${nome}" removido`);
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
        this.dataset.index = '';
        fecharModal('modalProduto');
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`✅ Produto "${nome}" atualizado!`);
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
    const novaOS = {
        id: gerarId(),
        numero: 'OS-' + (ordensServico.length + 1).toString().padStart(4, '0'),
        cliente: cliente,
        itens: itens,
        total: total,
        status: 'orcamento',
        dataCriacao: new Date().toISOString()
    };
    ordensServico.push(novaOS);
    salvarDados();
    listarOS();
    atualizarStatus(`✅ Orçamento salvo! Nº ${novaOS.numero}`);
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
    container.innerHTML = lista.map(os => `
        <div class="os-card" onclick="abrirOS('${os.id}')">
            <div><strong>${os.numero}</strong> <span class="status-badge status-orcamento">📄 Orçamento</span></div>
            <div><strong>Cliente:</strong> ${os.cliente}</div>
            <div style="font-size:12px;color:#666;">${os.itens.length} itens | Total: R$ ${os.total.toFixed(2)}</div>
        </div>
    `).join('');
}

function filtrarOS() { listarOS(document.getElementById('filtroStatusOS').value); }

function abrirOS(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;
    alert(`📄 OS ${os.numero}\nCliente: ${os.cliente}\nTotal: R$ ${os.total.toFixed(2)}`);
}

// ============================================
// FUNÇÕES DE CÁLCULOS
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
    alert('📉 Função em desenvolvimento');
}

function calcularDemanda() {
    alert('💡 Função em desenvolvimento');
}

function calcularProjeto() {
    alert('📊 Função em desenvolvimento');
}

// ============================================
// BACKUP
// ============================================
function exportarDados() {
    const dados = { clientes, produtos, ordensServico, recibos, data: new Date().toISOString() };
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
                renderizarTudo();
                alert('✅ Dados importados com sucesso!');
            }
        } catch(err) { alert('❌ Arquivo inválido!'); }
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
    updateTotal();
}

// ============================================
// FUNÇÕES VAZIAS (PARA EVITAR ERROS)
// ============================================
function sincronizarDados() { console.log('🔄 Sincronização em desenvolvimento'); }
function loginGoogle() { alert('🔑 Login Google em desenvolvimento'); }
function mostrarCadastroUsuario() { alert('👤 Cadastro de usuário em desenvolvimento'); }
function salvarNovoUsuario() { alert('👤 Cadastro de usuário em desenvolvimento'); }
function listarUsuarios() { }
function excluirUsuario() { }
function gerarPDF() { alert('📄 PDF em desenvolvimento'); }
function enviarWhatsApp() { alert('💬 WhatsApp em desenvolvimento'); }
function enviarPDFWhatsApp() { alert('📤 PDF+WhatsApp em desenvolvimento'); }
function editarOS() { alert('✏️ Editar OS em desenvolvimento'); }
function aprovarOS() { alert('✅ Aprovar OS em desenvolvimento'); }
function iniciarOS() { alert('🔧 Iniciar OS em desenvolvimento'); }
function concluirOS() { alert('✅ Concluir OS em desenvolvimento'); }
function cancelarOS() { alert('❌ Cancelar OS em desenvolvimento'); }
function emitirRecibo() { alert('💰 Emitir recibo em desenvolvimento'); }
function listarRecibos() { }
function filtrarRecibos() { }
function abrirRecibo() { }
function marcarPago() { }
function imprimirRecibo() { }

// ============================================
// INICIALIZAÇÃO// ============================================
function init() {
    console.log('🚀 Inicializando sistema...');
    carregarDados();
    renderClientes();
    renderProdutos();
    renderSelectClientes();
    renderSelectProdutos();
    updateTotal();
    listarOS();
    carregarLogo();
    if (produtos.length > 0) adicionarItem();
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
    
    document.getElementById('loginUsuario')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('loginSenha').focus();
    });
    document.getElementById('loginSenha')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') fazerLogin();
    });
    
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
    document.getElementById('fecharModalCliente')?.addEventListener('click', function() {
        fecharModal('modalCliente');
    });
    document.getElementById('fecharModalProduto')?.addEventListener('click', function() {
        fecharModal('modalProduto');
    });
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    document.getElementById('buscaCliente')?.addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#listaClientes li').forEach(li => {
            li.style.display = li.textContent?.toLowerCase().includes(termo) ? 'flex' : 'none';
        });
    });
    
    document.getElementById('buscaProduto')?.addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#listaProdutos li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            const nome = texto.split('R$')[0].trim();
            li.style.display = nome.includes(termo) ? 'flex' : 'none';
        });
    });
    
    console.log('✅ Eventos configurados!');
});

console.log('⚡ SE7VEN ENERGIA - Sistema carregado!');