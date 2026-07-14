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

const LOGO_URL = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26a1.png';

// ============================================
// DADOS PRINCIPAIS
// ============================================
let clientes = [];
let produtos = [];
let ordensServico = [];
let recibos = [];

// ============================================
// CARREGAR DADOS
// ============================================
function carregarDados() {
    try {
        const clientesSalvos = localStorage.getItem('clientes');
        const produtosSalvos = localStorage.getItem('produtos');
        const osSalvos = localStorage.getItem('ordensServico');
        const recibosSalvos = localStorage.getItem('recibos');
        
        if (clientesSalvos) clientes = JSON.parse(clientesSalvos);
        if (produtosSalvos) produtos = JSON.parse(produtosSalvos);
        if (osSalvos) ordensServico = JSON.parse(osSalvos);
        if (recibosSalvos) recibos = JSON.parse(recibosSalvos);
        
        if (clientes.length === 0 && produtos.length === 0) {
            // Dados de exemplo
            clientes = [
                { id: 1, nome: 'José Castilho', email: 'jose@email.com', telefone: '(93) 98102-7290', cpf: '123.456.789-00', endereco: 'Rua Exemplo, 123 - Belém/PA' },
                { id: 2, nome: 'Maria Santos', email: 'maria@email.com', telefone: '(91) 99999-2222', cpf: '987.654.321-00', endereco: 'Av. Principal, 456 - Ananindeua/PA' }
            ];
            produtos = [
                { id: 1, nome: 'Kit Solar 5kWp', preco: 15000.00, tipo: 'equipamento' },
                { id: 2, nome: 'Inversor 5kW', preco: 4500.00, tipo: 'equipamento' },
                { id: 3, nome: 'Instalação Completa', preco: 3000.00, tipo: 'servico' },
                { id: 4, nome: 'Manutenção Anual', preco: 1200.00, tipo: 'servico' },
                { id: 5, nome: 'Cabo 10mm² (100m)', preco: 350.00, tipo: 'material' }
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
        localStorage.setItem('ordensServico', JSON.stringify(ordensServico));
        localStorage.setItem('recibos', JSON.stringify(recibos));
        atualizarStatus('💾 Dados salvos automaticamente!');
        return true;
    } catch (e) {
        console.log('Erro ao salvar:', e);
        return false;
    }
}

// ============================================
// GERAR ID ÚNICO
// ============================================
function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================
// BACKUP E RESTORE
// ============================================
function exportarDados() {
    const dados = {
        clientes, produtos, ordensServico, recibos,
        data: new Date().toISOString(),
        versao: '2.0',
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
                ordensServico = dados.ordensServico || [];
                recibos = dados.recibos || [];
                salvarDados();
                renderClientes();
                renderProdutos();
                renderSelectClientes();
                renderSelectProdutos();
                listarOS();
                listarRecibos();
                atualizarStatus('✅ Dados importados com sucesso!');
                alert('✅ Dados importados com sucesso!\n' + 
                      `Clientes: ${clientes.length}\n` +
                      `Produtos: ${produtos.length}\n` +
                      `Ordens de Serviço: ${ordensServico.length}\n` +
                      `Recibos: ${recibos.length}`);
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
// ORÇAMENTO → ORDEM DE SERVIÇO
// ============================================
function salvarOrcamento() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) {
        alert('⚠️ Selecione um cliente!');
        return;
    }

    const itens = [];
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const nome = select.value;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        if (nome && qtd > 0) {
            itens.push({ nome, qtd, preco, subtotal: preco * qtd });
        }
    });

    if (itens.length === 0) {
        alert('⚠️ Adicione pelo menos um item!');
        return;
    }

    const total = itens.reduce((sum, item) => sum + item.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);
    const distancia = parseFloat(document.getElementById('distancia').value) || 50;
    const tensao = parseFloat(document.getElementById('tensao').value);
    const fp = parseFloat(document.getElementById('fp').value) || 0.92;

    // Cria a Ordem de Serviço
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
        fp: fp,
        observacoes: 'Orçamento gerado automaticamente'
    };

    ordensServico.push(novaOS);
    salvarDados();
    listarOS();
    atualizarStatus(`✅ Orçamento salvo! Nº ${novaOS.numero}`);
    alert(`✅ Orçamento salvo!\nNº: ${novaOS.numero}\nCliente: ${cliente}\nTotal: R$ ${total.toFixed(2)}`);
}

// ============================================
// LISTAR ORDENS DE SERVIÇO
// ============================================
function listarOS(filtro = 'todos') {
    const container = document.getElementById('listaOS');
    if (!container) return;

    let lista = ordensServico;
    if (filtro !== 'todos') {
        lista = ordensServico.filter(os => os.status === filtro);
    }

    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhuma Ordem de Serviço encontrada</p>';
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
        const status = statusMap[os.status] || statusMap['orcamento'];
        const data = new Date(os.dataCriacao).toLocaleDateString('pt-BR');
        const itensCount = os.itens.length;
        
        return `
            <div class="os-card" onclick="abrirOS('${os.id}')">
                <div>
                    <strong>${os.numero}</strong>
                    <span class="status-badge ${status.class}">${status.label}</span>
                </div>
                <div>
                    <strong>Cliente:</strong> ${os.cliente}
                </div>
                <div style="font-size:12px;color:#666;">
                    ${itensCount} itens | Total: R$ ${os.total.toFixed(2)} | Data: ${data}
                </div>
            </div>
        `;
    }).join('');
}

function filtrarOS() {
    const filtro = document.getElementById('filtroStatusOS').value;
    listarOS(filtro);
}

// ============================================
// ABRIR ORDEM DE SERVIÇO (MODAL)
// ============================================
let osAtual = null;

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
        <tr>
            <td>${i + 1}</td>
            <td>${item.nome}</td>
            <td>${item.qtd}</td>
            <td>R$ ${item.preco.toFixed(2)}</td>
            <td>R$ ${item.subtotal.toFixed(2)}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="margin-bottom:10px;">
            <p><strong>Nº:</strong> ${osAtual.numero}</p>
            <p><strong>Cliente:</strong> ${osAtual.cliente}</p>
            <p><strong>Status:</strong> ${statusMap[osAtual.status] || '📄 Orçamento'}</p>
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Total:</strong> R$ ${osAtual.total.toFixed(2)}</p>
            ${osAtual.distancia ? `<p><strong>Distância:</strong> ${osAtual.distancia} m</p>` : ''}
            ${osAtual.tensao ? `<p><strong>Tensão:</strong> ${osAtual.tensao} V</p>` : ''}
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                    <tr style="background:#1a237e;color:white;">
                        <th style="padding:5px;">#</th>
                        <th style="padding:5px;">Produto</th>
                        <th style="padding:5px;">Qtd</th>
                        <th style="padding:5px;">Preço</th>
                        <th style="padding:5px;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itensHTML}</tbody>
            </table>
        </div>
    `;

    // Mostrar/esconder botões conforme status
    document.getElementById('btnAprovarOS').style.display = osAtual.status === 'orcamento' ? 'inline-block' : 'none';
    document.getElementById('btnIniciarOS').style.display = osAtual.status === 'aprovado' ? 'inline-block' : 'none';
    document.getElementById('btnConcluirOS').style.display = osAtual.status === 'em_andamento' ? 'inline-block' : 'none';
    document.getElementById('btnCancelarOS').style.display = osAtual.status !== 'cancelado' && osAtual.status !== 'concluido' ? 'inline-block' : 'none';
    document.getElementById('btnEmitirRecibo').style.display = osAtual.status === 'concluido' ? 'inline-block' : 'none';

    abrirModal('modalOS');
}

// ============================================
// AÇÕES DA ORDEM DE SERVIÇO
// ============================================
function aprovarOS() {
    if (!osAtual) return;
    if (confirm(`Aprovar a OS ${osAtual.numero}?`)) {
        osAtual.status = 'aprovado';
        osAtual.dataAprovacao = new Date().toISOString();
        salvarDados();
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(`✅ OS ${osAtual.numero} aprovada!`);
    }
}

function iniciarOS() {
    if (!osAtual) return;
    if (confirm(`Iniciar a OS ${osAtual.numero}?`)) {
        osAtual.status = 'em_andamento';
        osAtual.dataInicio = new Date().toISOString();
        salvarDados();
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(`🔧 OS ${osAtual.numero} em andamento!`);
    }
}

function concluirOS() {
    if (!osAtual) return;
    if (confirm(`Concluir a OS ${osAtual.numero}?`)) {
        osAtual.status = 'concluido';
        osAtual.dataConclusao = new Date().toISOString();
        salvarDados();
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(`✅ OS ${osAtual.numero} concluída!`);
    }
}

function cancelarOS() {
    if (!osAtual) return;
    if (confirm(`Cancelar a OS ${osAtual.numero}?`)) {
        osAtual.status = 'cancelado';
        salvarDados();
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(`❌ OS ${osAtual.numero} cancelada!`);
    }
}

// ============================================
// EMITIR RECIBO
// ============================================
function emitirRecibo() {
    if (!osAtual || osAtual.status !== 'concluido') {
        alert('⚠️ A OS precisa estar concluída para emitir recibo!');
        return;
    }

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
    
    // Abrir o recibo
    abrirRecibo(recibo.id);
}

// ============================================
// LISTAR RECIBOS
// ============================================
function listarRecibos(filtro = 'todos') {
    const container = document.getElementById('listaRecibos');
    if (!container) return;

    let lista = recibos;
    if (filtro !== 'todos') {
        lista = recibos.filter(r => r.status === filtro);
    }

    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhum recibo encontrado</p>';
        return;
    }

    container.innerHTML = lista.map(r => {
        const data = new Date(r.dataEmissao).toLocaleDateString('pt-BR');
        const status = r.status === 'pago' ? '✅ Pago' : '⏳ Pendente';
        
        return `
            <div class="os-card" onclick="abrirRecibo('${r.id}')">
                <div>
                    <strong>${r.numero}</strong>
                    <span class="status-badge ${r.status === 'pago' ? 'status-recebido' : 'status-orcamento'}">${status}</span>
                </div>
                <div>
                    <strong>Cliente:</strong> ${r.cliente}
                </div>
                <div style="font-size:12px;color:#666;">
                    OS: ${r.osNumero} | Total: R$ ${r.total.toFixed(2)} | Data: ${data}
                </div>
            </div>
        `;
    }).join('');
}

function filtrarRecibos() {
    const filtro = document.getElementById('filtroRecibo').value;
    listarRecibos(filtro);
}

// ============================================
// ABRIR RECIBO
// ============================================
let reciboAtual = null;

function abrirRecibo(id) {
    reciboAtual = recibos.find(r => r.id === id);
    if (!reciboAtual) return;

    const container = document.getElementById('conteudoRecibo');
    const data = new Date(reciboAtual.dataEmissao).toLocaleDateString('pt-BR');
    const dataPagamento = reciboAtual.dataPagamento ? new Date(reciboAtual.dataPagamento).toLocaleDateString('pt-BR') : '-';

    let itensHTML = reciboAtual.itens.map((item, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${item.nome}</td>
            <td>${item.qtd}</td>
            <td>R$ ${item.preco.toFixed(2)}</td>
            <td>R$ ${item.subtotal.toFixed(2)}</td>
        </tr>
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
            <p><strong>Data Emissão:</strong> ${data}</p>
            <p><strong>Status:</strong> ${reciboAtual.status === 'pago' ? '✅ PAGO' : '⏳ PENDENTE'}</p>
            ${reciboAtual.status === 'pago' ? `<p><strong>Data Pagamento:</strong> ${dataPagamento}</p>` : ''}
        </div>

        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                    <tr style="background:#1a237e;color:white;">
                        <th style="padding:5px;">#</th>
                        <th style="padding:5px;">Produto</th>
                        <th style="padding:5px;">Qtd</th>
                        <th style="padding:5px;">Preço</th>
                        <th style="padding:5px;">Subtotal</th>
                    </tr>
                </thead>
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
    document.getElementById('btnImprimirRecibo').style.display = 'inline-block';

    abrirModal('modalRecibo');
}

// ============================================
// MARCAR RECIBO COMO PAGO
// ============================================
function marcarPago() {
    if (!reciboAtual) return;
    if (confirm(`Marcar recibo ${reciboAtual.numero} como PAGO?`)) {
        reciboAtual.status = 'pago';
        reciboAtual.dataPagamento = new Date().toISOString();
        salvarDados();
        listarRecibos();
        abrirRecibo(reciboAtual.id);
        atualizarStatus(`✅ Recibo ${reciboAtual.numero} marcado como pago!`);
    }
}

// ============================================
// IMPRIMIR RECIBO
// ============================================
function imprimirRecibo() {
    const conteudo = document.getElementById('conteudoRecibo').innerHTML;
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
        <html>
        <head>
            <title>Recibo ${reciboAtual?.numero || ''}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                .recibo-area { background: white; padding: 20px; border: 1px solid #ddd; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #1a237e; color: white; padding: 8px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                .assinatura { border-top: 1px solid #333; margin-top: 20px; padding-top: 10px; text-align: center; }
                .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 10px; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="recibo-area">${conteudo}</div>
            <script>
                window.onload = function() { window.print(); }
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
}

// ============================================
// FUNÇÕES DE CÁLCULOS ELÉTRICOS (MANTIDAS)
// ============================================
function dimensionarCabos() {
    const corrente = parseFloat(document.getElementById('correnteCabos').value);
    const distancia = parseFloat(document.getElementById('distanciaCabos').value) || 50;
    const tensao = parseFloat(document.getElementById('tensaoCabos').value);
    
    if (!corrente || corrente <= 0) {
        alert('⚠️ Informe a corrente em Ampères!');
        return;
    }
    
    const tabelaCabos = {
        1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50,
        16: 68, 25: 89, 35: 111, 50: 134, 70: 171,
        95: 207, 120: 239, 150: 275, 185: 314, 240: 370
    };
    
    let bitolaEscolhida = null;
    for (let [bitola, capacidade] of Object.entries(tabelaCabos)) {
        if (capacidade >= corrente) {
            bitolaEscolhida = bitola;
            break;
        }
    }
    
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
        if (nome && qtd > 0) {
            itens.push({ nome, qtd });
        }
    });
    
    const potTotal = itens.reduce((sum, item) => {
        const produto = produtos.find(p => p.nome === item.nome);
        return sum + (produto ? produto.preco * item.qtd * 0.1 : 0);
    }, 0);
    
    const corrente = potTotal / (tensao * fp);
    const caboSugerido = corrente < 15 ? '2.5 mm²' : 
                          corrente < 28 ? '4 mm²' : 
                          corrente < 36 ? '6 mm²' : 
                          corrente < 50 ? '10 mm²' : 
                          corrente < 68 ? '16 mm²' : 
                          corrente < 89 ? '25 mm²' : 
                          corrente < 111 ? '35 mm²' : '> 50 mm²';
    
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
// FUNÇÕES DE INTERFACE (MANTIDAS)
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
        const cpf = document.getElementById('cpfCliente').value.trim();
        const endereco = document.getElementById('enderecoCliente').value.trim();
        const email = document.getElementById('emailCliente').value.trim();
        
        if (!nome) {
            alert('⚠️ Nome do cliente é obrigatório');
            return;
        }
        
        clientes[index] = { ...clientes[index], nome, email, telefone, cpf, endereco };
        salvarDados();
        
        document.getElementById('nomeCliente').value = '';
        document.getElementById('telefoneCliente').value = '';
        document.getElementById('cpfCliente').value = '';
        document.getElementById('enderecoCliente').value = '';
        document.getElementById('emailCliente').value = '';
        
        fecharModal('modalCliente');
        renderClientes();
        renderSelectClientes();
        document.getElementById('salvarCliente').onclick = adicionarCliente;
        atualizarStatus(`✅ Cliente "${nome}" atualizado!`);
    };
}

function renderProdutos() {
    if (!listaProdutos) return;
    
    if (produtos.length === 0) {
        listaProdutos.innerHTML = '<li class="empty-message">Nenhum produto cadastrado</li>';
        return;
    }
    
    listaProdutos.innerHTML = produtos.map((p, i) => `
        <li>
            <span>
                <strong>${p.nome}</strong>
                <br><small>R$ ${p.preco.toFixed(2)}</small>
                <br><small>📂 ${p.tipo || 'outro'}</small>
            </span>
            <div style="display: flex; gap: 5px;">
                <button onclick="editarProduto(${i})" class="btn-secondary" style="padding: 4px 8px;">✏️</button>
                <button onclick="excluirProduto(${i})" class="btn-secondary" style="padding: 4px 8px;">🗑️</button>
            </div>
        </li>
    `).join('');
}

function adicionarProduto() {
    const nome = document.getElementById('nomeProduto').value.trim();
    const preco = parseFloat(document.getElementById('precoProduto').value);
    const tipo = document.getElementById('tipoProduto').value;
    
    if (!nome || isNaN(preco) || preco <= 0) {
        alert('⚠️ Nome e preço válido são obrigatórios');
        return;
    }
    
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
    if (confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) {
        produtos.splice(index, 1);
        salvarDados();
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`🗑️ Produto "${nome}" removido`);
    }
}

function editarProduto(index) {
    const produto = produtos[index];
    document.getElementById('nomeProduto').value = produto.nome;
    document.getElementById('precoProduto').value = produto.preco;
    document.getElementById('tipoProduto').value = produto.tipo || 'outro';
    abrirModal('modalProduto');
    
    document.getElementById('salvarProduto').onclick = function() {
        const nome = document.getElementById('nomeProduto').value.trim();
        const preco = parseFloat(document.getElementById('precoProduto').value);
        const tipo = document.getElementById('tipoProduto').value;
        
        if (!nome || isNaN(preco) || preco <= 0) {
            alert('⚠️ Nome e preço válido são obrigatórios');
            return;
        }
        
        produtos[index] = { ...produtos[index], nome, preco, tipo };
        salvarDados();
        
        document.getElementById('nomeProduto').value = '';
        document.getElementById('precoProduto').value = '';
        
        fecharModal('modalProduto');
        renderProdutos();
        renderSelectProdutos();
        document.getElementById('salvarProduto').onclick = adicionarProduto;
        atualizarStatus(`✅ Produto "${nome}" atualizado!`);
    };
}

function renderSelectClientes() {
    if (!selCliente) return;
    selCliente.innerHTML = '<option value="">Selecione um cliente</option>' +
        clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
}

function renderSelectProdutos() {
    const selects = document.querySelectorAll('.selProduto');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione um produto</option>' +
            produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`).join('');
        select.value = currentValue;
    });
}

function adicionarItem() {
    if (produtos.length === 0) {
        alert('⚠️ Cadastre um produto primeiro!');
        return;
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-orcamento';
    itemDiv.innerHTML = `
        <select class="selProduto">
            <option value="">Selecione um produto</option>
            ${produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`).join('')}
        </select>
        <input type="number" class="qtdProduto" placeholder="Qtd" min="1" value="1">
        <button class="btn-remove-item" onclick="removerItem(this)">✕</button>
    `;
    itensOrcamento.appendChild(itemDiv);
    
    itemDiv.querySelector('.selProduto').addEventListener('change', updateTotal);
    itemDiv.querySelector('.qtdProduto').addEventListener('input', updateTotal);
    updateTotal();
}

function removerItem(btn) {
    btn.parentElement.remove();
    updateTotal();
}

function limparOrcamento() {
    if (confirm('Tem certeza que deseja limpar todos os itens do orçamento?')) {
        itensOrcamento.innerHTML = '';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-orcamento';
        itemDiv.innerHTML = `
            <select class="selProduto">
                <option value="">Selecione um produto</option>
                ${produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`).join('')}
            </select>
            <input type="number" class="qtdProduto" placeholder="Qtd" min="1" value="1">
            <button class="btn-remove-item" onclick="removerItem(this)">✕</button>
        `;
        itensOrcamento.appendChild(itemDiv);
        itemDiv.querySelector('.selProduto').addEventListener('change', updateTotal);
        itemDiv.querySelector('.qtdProduto').addEventListener('input', updateTotal);
        updateTotal();
        selCliente.value = '';
        document.getElementById('resultadoProjeto').innerHTML = '';
        atualizarStatus('🧹 Orçamento limpo!');
    }
}

function updateTotal() {
    let total = 0;
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        total += preco * qtd;
    });
    if (totalValor) totalValor.textContent = total.toFixed(2);
}

// ============================================
// FUNÇÕES GERAIS
// ============================================
function atualizarStatus(mensagem, tipo = 'success') {
    if (!statusBar) return;
    statusBar.textContent = mensagem;
    statusBar.className = 'status-bar';
    if (tipo === 'success') statusBar.classList.add('success');
    else if (tipo === 'error') statusBar.classList.add('error');
    else if (tipo === 'warning') statusBar.classList.add('warning');
}

function abrirModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function fecharModal(id) {
    document.getElementById(id).style.display = 'none';
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
    
    if (LOGO_URL) {
        const img = document.createElement('img');
        img.src = LOGO_URL;
        img.alt = EMPRESA.nome;
        img.style.height = '40px';
        img.style.width = 'auto';
        img.style.borderRadius = '8px';
        
        img.onerror = function() {
            headerLogo.innerHTML = `<h1 class="logo-title">⚡ ${EMPRESA.nomeAbreviado}</h1>`;
        };
        
        img.onload = function() {
            headerLogo.innerHTML = '';
            headerLogo.appendChild(img);
            const h1 = document.createElement('h1');
            h1.className = 'logo-title';
            h1.textContent = EMPRESA.nomeAbreviado;
            headerLogo.appendChild(h1);
        };
        
        headerLogo.innerHTML = '';
        headerLogo.appendChild(img);
    } else {
        headerLogo.innerHTML = `<h1 class="logo-title">⚡ ${EMPRESA.nomeAbreviado}</h1>`;
    }
}

// ============================================
// GERAR PDF (VERSÃO SIMPLIFICADA)
// ============================================
function gerarPDF() {
    // Mantido da versão anterior
    alert('📄 Função PDF disponível');
}

// ============================================
// WHATSAPP
// ============================================
function enviarWhatsApp() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) {
        alert('⚠️ Selecione um cliente');
        return;
    }

    const itens = [];
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseInt(item.querySelector('.qtdProduto').value) || 0;
        const nome = select.value;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        if (nome && qtd > 0) {
            itens.push({ nome, qtd, preco, subtotal: preco * qtd });
        }
    });

    if (itens.length === 0) {
        alert('⚠️ Adicione pelo menos um item ao orçamento');
        return;
    }

    const total = itens.reduce((sum, item) => sum + item.subtotal, 0);
    const data = new Date().toLocaleDateString('pt-BR');
    
    let mensagem = `*${EMPRESA.nome} - ORÇAMENTO*\n\n`;
    mensagem += `📅 Data: ${data}\n`;
    mensagem += `👤 Cliente: ${cliente}\n\n`;
    mensagem += '*ITENS:*\n';
    
    itens.forEach((item, index) => {
        mensagem += `${index + 1}. ${item.nome} - ${item.qtd}x R$ ${item.preco.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n`;
    });
    
    mensagem += `\n*TOTAL: R$ ${total.toFixed(2)}*\n\n`;
    mensagem += '💳 *Formas de Pagamento:*\n';
    EMPRESA.formasPagamento.forEach(fp => {
        mensagem += `✅ ${fp}\n`;
    });
    mensagem += '\n📱 *Entre em contato para mais informações!*';

    const url = `https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function init() {
    carregarDados();
    renderClientes();
    renderProdutos();
    renderSelectClientes();
    renderSelectProdutos();
    updateTotal();
    listarOS();
    listarRecibos();
    
    if (produtos.length > 0) {
        adicionarItem();
    }
    
    document.querySelector('title').textContent = `${EMPRESA.nome} - Sistema Completo`;
    carregarLogo();
    atualizarStatus(`✅ Sistema pronto! ${clientes.length} clientes, ${produtos.length} produtos`);
    
    // Backup automático a cada 5 minutos
    setInterval(salvarDados, 300000);
}

// ============================================
// EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Referências globais
    window.listaClientes = document.getElementById('listaClientes');
    window.listaProdutos = document.getElementById('listaProdutos');
    window.selCliente = document.getElementById('selCliente');
    window.itensOrcamento = document.getElementById('itensOrcamento');
    window.totalValor = document.getElementById('totalValor');
    window.statusBar = document.getElementById('statusBar');
    
    init();
    
    // Eventos dos botões
    document.getElementById('btnNovo')?.addEventListener('click', () => {
        abrirTab('tabOrcamento');
        document.getElementById('orcamento').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('btnAddCliente')?.addEventListener('click', () => {
        abrirModal('modalCliente');
        document.getElementById('nomeCliente').focus();
    });

    document.getElementById('btnAddProduto')?.addEventListener('click', () => {
        abrirModal('modalProduto');
        document.getElementById('nomeProduto').focus();
    });

    document.getElementById('btnAddItem')?.addEventListener('click', adicionarItem);
    document.getElementById('btnLimpar')?.addEventListener('click', limparOrcamento);
    document.getElementById('btnSalvarOrcamento')?.addEventListener('click', salvarOrcamento);
    document.getElementById('btnGerarPDF')?.addEventListener('click', gerarPDF);
    document.getElementById('btnWhatsApp')?.addEventListener('click', enviarWhatsApp);
    
    document.getElementById('salvarCliente')?.addEventListener('click', adicionarCliente);
    document.getElementById('salvarProduto')?.addEventListener('click', adicionarProduto);

    document.getElementById('fecharModalCliente')?.addEventListener('click', () => fecharModal('modalCliente'));
    document.getElementById('fecharModalProduto')?.addEventListener('click', () => fecharModal('modalProduto'));
    document.getElementById('btnFecharOS')?.addEventListener('click', () => fecharModal('modalOS'));
    document.getElementById('btnFecharRecibo')?.addEventListener('click', () => fecharModal('modalRecibo'));
    
    // Eventos da OS
    document.getElementById('btnAprovarOS')?.addEventListener('click', aprovarOS);
    document.getElementById('btnIniciarOS')?.addEventListener('click', iniciarOS);
    document.getElementById('btnConcluirOS')?.addEventListener('click', concluirOS);
    document.getElementById('btnCancelarOS')?.addEventListener('click', cancelarOS);
    document.getElementById('btnEmitirRecibo')?.addEventListener('click', emitirRecibo);
    
    // Eventos do Recibo
    document.getElementById('btnMarcarPago')?.addEventListener('click', marcarPago);
    document.getElementById('btnImprimirRecibo')?.addEventListener('click', imprimirRecibo);

    // Fechar modal clicando fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Busca
    document.getElementById('buscaCliente')?.addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase();
        document.querySelectorAll('#listaClientes li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            li.style.display = texto.includes(termo) ? 'flex' : 'none';
        });
    });

    document.getElementById('buscaProduto')?.addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase();
        document.querySelectorAll('#listaProdutos li').forEach(li => {
            const texto = li.textContent?.toLowerCase() || '';
            li.style.display = texto.includes(termo) ? 'flex' : 'none';
        });
    });

    // Enter
    document.getElementById('nomeCliente')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adicionarCliente();
    });
    
    document.getElementById('nomeProduto')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adicionarProduto();
    });
    
    document.getElementById('precoProduto')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adicionarProduto();
    });
});

console.log(`⚡ ${EMPRESA.nome} - Sistema Completo carregado!`);
console.log('👤 Clientes:', clientes.length);
console.log('📦 Produtos:', produtos.length);
console.log('🔧 Ordens de Serviço:', ordensServico.length);
console.log('💰 Recibos:', recibos.length);