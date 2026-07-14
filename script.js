// ============================================
// CONFIGURAÇÕES DA EMPRESA
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
    formasPagamento: [
        'Pix à vista',
        'Cartão de Crédito (até 10x)',
        'Boleto Bancário'
    ],
    observacoes: [
        'Este orçamento tem validade de 30 dias.',
        'Preços sujeitos a alterações sem aviso prévio.',
        'Instalação conforme normas técnicas vigentes.'
    ],
    rodape: 'Orçamento gerado automaticamente'
};

// ============================================
// CONFIGURAÇÃO DA LOGO
// ============================================
const LOGO_URL = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26a1.png';

// ============================================
// DADOS
// ============================================
let clientes = [];
let produtos = [];

function carregarDados() {
    try {
        const clientesSalvos = localStorage.getItem('clientes');
        const produtosSalvos = localStorage.getItem('produtos');
        
        if (clientesSalvos) clientes = JSON.parse(clientesSalvos);
        if (produtosSalvos) produtos = JSON.parse(produtosSalvos);
        
        if (clientes.length === 0 && produtos.length === 0) {
            clientes = [
                { nome: 'José Castilho', email: 'jose@email.com', telefone: '(93) 98102-7290', cpf: '123.456.789-00', endereco: 'Rua Exemplo, 123 - Belém/PA' },
                { nome: 'Maria Santos', email: 'maria@email.com', telefone: '(91) 99999-2222', cpf: '987.654.321-00', endereco: 'Av. Principal, 456 - Ananindeua/PA' }
            ];
            produtos = [
                { nome: 'Kit Solar 5kWp', preco: 15000.00, tipo: 'equipamento' },
                { nome: 'Inversor 5kW', preco: 4500.00, tipo: 'equipamento' },
                { nome: 'Instalação Completa', preco: 3000.00, tipo: 'servico' },
                { nome: 'Manutenção Anual', preco: 1200.00, tipo: 'servico' },
                { nome: 'Cabo 10mm² (100m)', preco: 350.00, tipo: 'material' }
            ];
            salvarDados();
        }
    } catch (e) {
        console.log('Erro ao carregar dados:', e);
    }
}

function salvarDados() {
    try {
        localStorage.setItem('clientes', JSON.stringify(clientes));
        localStorage.setItem('produtos', JSON.stringify(produtos));
        atualizarStatus('💾 Dados salvos automaticamente!');
        return true;
    } catch (e) {
        console.log('Erro ao salvar:', e);
        return false;
    }
}

// ============================================
// BACKUP E RESTORE
// ============================================
function exportarDados() {
    const dados = {
        clientes: clientes,
        produtos: produtos,
        data: new Date().toISOString(),
        versao: '1.0',
        empresa: EMPRESA.nome
    };
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_SE7VEN_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    atualizarStatus('✅ Backup exportado com sucesso!');
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (dados.clientes && dados.produtos) {
                clientes = dados.clientes;
                produtos = dados.produtos;
                salvarDados();
                renderClientes();
                renderProdutos();
                renderSelectClientes();
                renderSelectProdutos();
                atualizarStatus('✅ Dados importados com sucesso!');
                alert('✅ Dados importados com sucesso!\n' + 
                      `Clientes: ${clientes.length}\n` +
                      `Produtos: ${produtos.length}`);
            } else {
                alert('❌ Arquivo inválido!');
            }
        } catch(err) {
            alert('❌ Erro ao ler o arquivo!');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// CÁLCULOS ELÉTRICOS
// ============================================
function dimensionarCabos() {
    const corrente = parseFloat(document.getElementById('correnteCabos').value);
    const distancia = parseFloat(document.getElementById('distanciaCabos').value) || 50;
    const tensao = parseFloat(document.getElementById('tensaoCabos').value);
    
    if (!corrente || corrente <= 0) {
        alert('⚠️ Informe a corrente em Ampères!');
        return;
    }
    
    // Tabela de capacidade de corrente (A) para cabos de cobre (PVC)
    const tabelaCabos = {
        1.5: 15.5,
        2.5: 21,
        4: 28,
        6: 36,
        10: 50,
        16: 68,
        25: 89,
        35: 111,
        50: 134,
        70: 171,
        95: 207,
        120: 239,
        150: 275,
        185: 314,
        240: 370
    };
    
    let bitolaEscolhida = null;
    for (let [bitola, capacidade] of Object.entries(tabelaCabos)) {
        if (capacidade >= corrente) {
            bitolaEscolhida = bitola;
            break;
        }
    }
    
    // Calcula queda de tensão para verificar
    const resistencia = bitolaEscolhida ? (0.0172 * 2 * distancia) / parseFloat(bitolaEscolhida) : 0;
    const quedaTensao = (resistencia * corrente / tensao) * 100;
    const quedaAceitavel = quedaTensao <= 3;
    
    let resultado = '';
    if (bitolaEscolhida) {
        resultado = `
            <strong>✅ Bitola Recomendada:</strong> ${bitolaEscolhida} mm²<br>
            <strong>Capacidade:</strong> ${tabelaCabos[bitolaEscolhida]} A<br>
            <strong>Queda de Tensão:</strong> ${quedaTensao.toFixed(2)}% ${quedaAceitavel ? '✅ OK' : '⚠️ ALTA'}<br>
            <strong>Distância Máxima:</strong> ${(tensao * 3 / (2 * 0.0172 * corrente / parseFloat(bitolaEscolhida))).toFixed(0)} m
        `;
    } else {
        resultado = '⚠️ Corrente muito alta para os cabos disponíveis. Consulte um engenheiro.';
    }
    
    document.getElementById('resultadoCabos').innerHTML = resultado;
}

function calcularQuedaTensao() {
    const corrente = parseFloat(document.getElementById('correnteQueda').value);
    const distancia = parseFloat(document.getElementById('distanciaQueda').value) || 50;
    const bitola = parseFloat(document.getElementById('bitolaQueda').value);
    const tensao = parseFloat(document.getElementById('tensaoQueda').value);
    
    if (!corrente || !bitola) {
        alert('⚠️ Preencha todos os campos!');
        return;
    }
    
    // Resistência do cobre: 0.0172 Ω·mm²/m
    const resistencia = (0.0172 * 2 * distancia) / bitola;
    const quedaTensaoV = resistencia * corrente;
    const quedaTensaoPorcentagem = (quedaTensaoV / tensao) * 100;
    const status = quedaTensaoPorcentagem <= 3 ? '✅ OK' : '⚠️ ALTA - Aumente a bitola';
    
    document.getElementById('resultadoQueda').innerHTML = `
        <strong>Queda de Tensão:</strong> ${quedaTensaoV.toFixed(2)} V<br>
        <strong>Porcentagem:</strong> ${quedaTensaoPorcentagem.toFixed(2)}%<br>
        <strong>Status:</strong> ${status}
    `;
}

function calcularDemanda() {
    const potencia = parseFloat(document.getElementById('potenciaDemanda').value);
    const tensao = parseFloat(document.getElementById('tensaoDemanda').value);
    const fp = parseFloat(document.getElementById('fpDemanda').value) || 0.92;
    
    if (!potencia || potencia <= 0) {
        alert('⚠️ Informe a potência em Watts!');
        return;
    }
    
    const corrente = potencia / (tensao * fp);
    const correnteMonofasica = potencia / tensao;
    
    document.getElementById('resultadoDemanda').innerHTML = `
        <strong>Potência:</strong> ${potencia} W (${(potencia/1000).toFixed(2)} kW)<br>
        <strong>Corrente (com FP):</strong> ${corrente.toFixed(2)} A<br>
        <strong>Corrente (sem FP):</strong> ${correnteMonofasica.toFixed(2)} A<br>
        <strong>Tensão:</strong> ${tensao} V<br>
        <strong>Fator de Potência:</strong> ${fp}
    `;
}

function calcularCorrenteNominal() {
    const potencia = parseFloat(document.getElementById('potenciaCorrente').value);
    const tensao = parseFloat(document.getElementById('tensaoCorrente').value);
    const fp = parseFloat(document.getElementById('fpCorrente').value) || 0.92;
    
    if (!potencia || potencia <= 0) {
        alert('⚠️ Informe a potência em Watts!');
        return;
    }
    
    const corrente = potencia / (tensao * fp);
    const disjuntor = Math.ceil(corrente * 1.25);
    const caboSugerido = corrente < 15 ? '2.5 mm²' : 
                          corrente < 28 ? '4 mm²' : 
                          corrente < 36 ? '6 mm²' : 
                          corrente < 50 ? '10 mm²' : 
                          corrente < 68 ? '16 mm²' : 
                          corrente < 89 ? '25 mm²' : 
                          corrente < 111 ? '35 mm²' : 
                          corrente < 134 ? '50 mm²' : '> 50 mm²';
    
    document.getElementById('resultadoCorrente').innerHTML = `
        <strong>Potência:</strong> ${potencia} W<br>
        <strong>Corrente Nominal:</strong> ${corrente.toFixed(2)} A<br>
        <strong>Disjuntor Recomendado:</strong> ${disjuntor} A<br>
        <strong>Cabo Recomendado:</strong> ${caboSugerido}<br>
        <strong>Fator de Potência:</strong> ${fp}
    `;
}

function calcularProjeto() {
    const distancia = parseFloat(document.getElementById('distancia').value) || 50;
    const tensao = parseFloat(document.getElementById('tensao').value);
    const fp = parseFloat(document.getElementById('fp').value) || 0.92;
    const quedaMax = parseFloat(document.getElementById('quedaMax').value) || 3;
    
    // Pega todos os itens do orçamento
    const itens = [];
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const nome = select.value;
        if (nome && qtd > 0) {
            itens.push({ nome, qtd });
        }
    });
    
    // Calcula potência total estimada (simplificado)
    const potTotal = itens.reduce((sum, item) => {
        const produto = produtos.find(p => p.nome === item.nome);
        return sum + (produto ? produto.preco * item.qtd * 0.1 : 0); // Estimativa
    }, 0);
    
    const corrente = potTotal / (tensao * fp);
    const caboSugerido = corrente < 15 ? '2.5 mm²' : 
                          corrente < 28 ? '4 mm²' : 
                          corrente < 36 ? '6 mm²' : 
                          corrente < 50 ? '10 mm²' : 
                          corrente < 68 ? '16 mm²' : 
                          corrente < 89 ? '25 mm²' : 
                          corrente < 111 ? '35 mm²' : '> 50 mm²';
    
    // Queda de tensão
    const bitola = parseFloat(caboSugerido.replace(' mm²', ''));
    const resistencia = (0.0172 * 2 * distancia) / (isNaN(bitola) ? 10 : bitola);
    const queda = (resistencia * corrente / tensao) * 100;
    
    document.getElementById('resultadoProjeto').innerHTML = `
        <div style="background:white;padding:10px;border-radius:4px;">
            <strong>📊 Resumo do Projeto Elétrico</strong><br><br>
            <strong>Distância:</strong> ${distancia} m<br>
            <strong>Tensão:</strong> ${tensao} V<br>
            <strong>Fator de Potência:</strong> ${fp}<br>
            <strong>Corrente Estimada:</strong> ${corrente.toFixed(2)} A<br>
            <strong>Cabo Recomendado:</strong> ${caboSugerido}<br>
            <strong>Queda de Tensão:</strong> ${queda.toFixed(2)}% ${queda <= quedaMax ? '✅ OK' : '⚠️ ALTA'}<br>
            <strong>Disjuntor:</strong> ${Math.ceil(corrente * 1.25)} A
        </div>
    `;
}

// ============================================
// FUNÇÕES DE INTERFACE - CLIENTES
// ============================================
function renderClientes() {
    if (!listaClientes) return;
    
    if (clientes.length === 0) {
        listaClientes.innerHTML = '<li class="empty-message">Nenhum cliente cadastrado</li>';
        return;
    }
    
    listaClientes.innerHTML = clientes.map((c, i) => `
        <li>
            <span>
                <strong>${c.nome}</strong>
                ${c.telefone ? `<br><small>📱 ${c.telefone}</small>` : ''}
                ${c.cpf ? `<br><small>🆔 ${c.cpf}</small>` : ''}
                ${c.endereco ? `<br><small>📍 ${c.endereco}</small>` : ''}
            </span>
            <div style="display: flex; gap: 5px;">
                <button onclick="editarCliente(${i})" class="btn-secondary" style="padding: 4px 8px;">✏️</button>
                <button onclick="excluirCliente(${i})" class="btn-secondary" style="padding: 4px 8px;">🗑️</button>
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
    
    if (!nome) {
        alert('⚠️ Nome do cliente é obrigatório');
        return;
    }
    
    clientes.push({ nome, email, telefone, cpf, endereco });
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
    if (confirm(`Tem certeza que deseja excluir o cliente "${nome}"?`)) {
        clientes.splice(index, 1);
        salvarDados();
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`🗑️ Cliente "${nome}" removido`);
    }
}

function editarCliente(index) {
    const cliente = clientes[index];
    document.getElementById('nomeCliente').value = cliente.nome;
    document.getElementById('telefoneCliente').value = cliente.telefone || '';
    document.getElementById('cpfCliente').value = cliente.cpf || '';
    document.getElementById('enderecoCliente').value = cliente.endereco || '';
    document.getElementById('emailCliente').value = cliente.email || '';
    abrirModal('modalCliente');
    
    document.getElementById('salvarCliente').onclick = function() {
        const nome = document.getElementById('nomeCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();
        const cpf = document.getElementById('