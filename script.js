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
        'Preços sujeitos a alterações sem aviso prévio.'
    ],
    rodape: 'Orçamento gerado automaticamente'
};

// ============================================
// CONFIGURAÇÃO DA LOGO
// ============================================
// Use esta opção (ícone emoji) - FUNCIONA SEMPRE
const LOGO_URL = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26a1.png';

// OU use logo local (coloque logo.png na pasta)
// const LOGO_URL = 'logo.png';

// ============================================
// DADOS
// ============================================
let clientes = [];
let produtos = [];

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
            { nome: 'Kit Solar 5kWp', preco: 15000.00 },
            { nome: 'Inversor 5kW', preco: 4500.00 },
            { nome: 'Instalação Completa', preco: 3000.00 },
            { nome: 'Manutenção Anual', preco: 1200.00 }
        ];
        salvarDados();
    }
} catch (e) {
    console.log('Erro ao carregar dados:', e);
}

function salvarDados() {
    try {
        localStorage.setItem('clientes', JSON.stringify(clientes));
        localStorage.setItem('produtos', JSON.stringify(produtos));
        return true;
    } catch (e) {
        console.log('Erro ao salvar:', e);
        return false;
    }
}

// ============================================
// REFERÊNCIAS DOM
// ============================================
const listaClientes = document.getElementById('listaClientes');
const listaProdutos = document.getElementById('listaProdutos');
const selCliente = document.getElementById('selCliente');
const itensOrcamento = document.getElementById('itensOrcamento');
const totalValor = document.getElementById('totalValor');
const statusBar = document.getElementById('statusBar');

function atualizarStatus(mensagem, tipo = 'success') {
    if (!statusBar) return;
    statusBar.textContent = mensagem;
    statusBar.className = 'status-bar';
    if (tipo === 'success') statusBar.classList.add('success');
    else if (tipo === 'error') statusBar.classList.add('error');
    else if (tipo === 'warning') statusBar.classList.add('warning');
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function init() {
    renderClientes();
    renderProdutos();
    renderSelectClientes();
    renderSelectProdutos();
    updateTotal();
    
    if (produtos.length > 0) {
        adicionarItem();
    }
    
    document.querySelector('title').textContent = `${EMPRESA.nome} - Orçamentos`;
    carregarLogo();
    atualizarStatus(`✅ Sistema pronto! ${clientes.length} clientes, ${produtos.length} produtos`);
}

// ============================================
// CARREGAR LOGO
// ============================================
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
            console.warn('⚠️ Logo não encontrada, usando texto');
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
// CLIENTES
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
        const cpf = document.getElementById('cpfCliente').value.trim();
        const endereco = document.getElementById('enderecoCliente').value.trim();
        const email = document.getElementById('emailCliente').value.trim();
        
        if (!nome) {
            alert('⚠️ Nome do cliente é obrigatório');
            return;
        }
        
        clientes[index] = { nome, email, telefone, cpf, endereco };
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

// ============================================
// PRODUTOS
// ============================================
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
    
    if (!nome || isNaN(preco) || preco <= 0) {
        alert('⚠️ Nome e preço válido são obrigatórios');
        return;
    }
    
    produtos.push({ nome, preco });
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
    abrirModal('modalProduto');
    
    document.getElementById('salvarProduto').onclick = function() {
        const nome = document.getElementById('nomeProduto').value.trim();
        const preco = parseFloat(document.getElementById('precoProduto').value);
        
        if (!nome || isNaN(preco) || preco <= 0) {
            alert('⚠️ Nome e preço válido são obrigatórios');
            return;
        }
        
        produtos[index] = { nome, preco };
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

// ============================================
// ORÇAMENTO
// ============================================
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
// PDF
// ============================================
function gerarPDF() {
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
    const data = new Date();
    const dataFormatada = data.toLocaleDateString('pt-BR');
    const dataInvertida = data.getDate().toString().padStart(2, '0') + '/' + 
                          (data.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                          data.getFullYear();
    
    const clienteData = clientes.find(c => c.nome === cliente);
    const numeroOrcamento = 'ORC-' + Date.now().toString().slice(-6);

    let pagamentoHTML = EMPRESA.formasPagamento.map(fp => `✅ ${fp}`).join('<br>');
    let observacoesHTML = EMPRESA.observacoes.map(obs => `• ${obs}`).join('<br>');

    let logoPDF = '';
    if (LOGO_URL) {
        logoPDF = `<img src="${LOGO_URL}" alt="${EMPRESA.nome}" style="max-height:60px; margin-bottom:10px;">`;
    }

    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; }
            .header { text-align: center; border-bottom: 3px solid ${EMPRESA.corPrimaria}; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: ${EMPRESA.corPrimaria}; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 0; }
            .header .subtitle { color: #666; font-size: 14px; font-weight: bold; margin: 5px 0 0 0; }
            .data { text-align: right; font-size: 14px; margin-bottom: 20px; }
            .cliente-box { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid ${EMPRESA.corPrimaria}; }
            .cliente-box h3 { color: ${EMPRESA.corPrimaria}; font-size: 14px; text-transform: uppercase; margin: 0 0 10px 0; }
            .cliente-box p { margin: 3px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
            table thead { background: ${EMPRESA.corPrimaria}; color: white; }
            table th { padding: 8px 10px; text-align: left; }
            table td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .total-box { text-align: right; padding: 10px; font-size: 18px; font-weight: bold; border-top: 2px solid ${EMPRESA.corPrimaria}; margin: 10px 0 20px 0; }
            .pagamento { background: #e8f5e9; padding: 15px; border-radius: 4px; border-left: 4px solid #2e7d32; margin-top: 20px; }
            .pagamento p { margin: 0; font-size: 14px; }
            .pagamento .titulo { font-weight: bold; color: ${EMPRESA.corPrimaria}; }
            .observacoes { background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; margin-top: 15px; }
            .observacoes .titulo { font-weight: bold; color: #856404; }
            .observacoes p { margin: 3px 0; font-size: 13px; color: #856404; }
            .rodape { margin-top: 40px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #ddd; padding-top: 15px; }
            .rodape p { margin: 2px 0; }
            .rodape .destaque { color: ${EMPRESA.corPrimaria}; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            ${logoPDF}
            <h1>${EMPRESA.nome}</h1>
            <p class="subtitle">ORÇAMENTO</p>
            <p style="color:#999;font-size:12px;margin-top:5px;">${EMPRESA.cnpj} | ${EMPRESA.endereco} | ${EMPRESA.telefone}</p>
        </div>

        <div class="data">
            <strong>Nº:</strong> ${numeroOrcamento} &nbsp;|&nbsp; <strong>Data:</strong> ${dataInvertida}
        </div>

        <div class="cliente-box">
            <h3>CLIENTE:</h3>
            <p><strong>Nome:</strong> ${cliente}</p>
            ${clienteData?.telefone ? `<p><strong>Cel:</strong> ${clienteData.telefone}</p>` : ''}
            ${clienteData?.cpf ? `<p><strong>CPF/CNPJ:</strong> ${clienteData.cpf}</p>` : ''}
            ${clienteData?.endereco ? `<p><strong>Endereço:</strong> ${clienteData.endereco}</p>` : ''}
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width:8%;">Nº</th>
                    <th style="width:42%;">Descrição</th>
                    <th style="width:15%;text-align:right;">Preço</th>
                    <th style="width:10%;text-align:center;">Qt.</th>
                    <th style="width:25%;text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itens.map((item, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${item.nome}</td>
                        <td class="text-right">R$ ${item.preco.toFixed(2)}</td>
                        <td class="text-center">${item.qtd}</td>
                        <td class="text-right"><strong>R$ ${item.subtotal.toFixed(2)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="total-box">
            <strong>TOTAL: R$ ${total.toFixed(2)}</strong>
        </div>

        <div class="pagamento">
            <p class="titulo">FORMA DE PAGAMENTO</p>
            <p>${pagamentoHTML}</p>
        </div>

        ${EMPRESA.observacoes.length > 0 ? `
        <div class="observacoes">
            <p class="titulo">📌 OBSERVAÇÕES</p>
            <p>${observacoesHTML}</p>
        </div>
        ` : ''}

        <div class="rodape">
            <p><span class="destaque">${EMPRESA.nome}</span> - ${EMPRESA.rodape}</p>
            <p>📧 ${EMPRESA.email} | 📱 ${EMPRESA.telefone} | 🌐 ${EMPRESA.site}</p>
        </div>
    </body>
    </html>
    `;

    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
        alert('⚠️ Por favor, permita pop-ups para gerar o PDF');
        return;
    }

    win.document.write(htmlContent);
    win.document.close();

    setTimeout(() => {
        try {
            const script = win.document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = function() {
                const element = win.document.body;
                const opt = {
                    margin: 0.5,
                    filename: `Orcamento_${EMPRESA.nomeAbreviado}_${cliente.replace(/\s/g, '_')}_${dataFormatada.replace(/\//g, '-')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                win.html2pdf().set(opt).from(element).save().then(() => {
                    win.close();
                    atualizarStatus('✅ PDF gerado com sucesso!');
                }).catch((err) => {
                    console.error('Erro:', err);
                    win.close();
                    alert('❌ Erro ao gerar PDF.');
                });
            };
            win.document.head.appendChild(script);
        } catch (err) {
            console.error('Erro:', err);
            win.close();
            alert('❌ Erro ao gerar PDF.');
        }
    }, 1000);
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
// MODAIS
// ============================================
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// ============================================
// EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    init();

    document.getElementById('btnNovo')?.addEventListener('click', () => {
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
    document.getElementById('btnGerarPDF')?.addEventListener('click', gerarPDF);
    document.getElementById('btnLimpar')?.addEventListener('click', limparOrcamento);
    document.getElementById('btnWhatsApp')?.addEventListener('click', enviarWhatsApp);

    document.getElementById('salvarCliente')?.addEventListener('click', adicionarCliente);
    document.getElementById('salvarProduto')?.addEventListener('click', adicionarProduto);

    document.getElementById('fecharModalCliente')?.addEventListener('click', () => {
        fecharModal('modalCliente');
    });

    document.getElementById('fecharModalProduto')?.addEventListener('click', () => {
        fecharModal('modalProduto');
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

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

console.log(`⚡ ${EMPRESA.nome} - Sistema carregado!`);
console.log('👤 Clientes:', clientes.length);
console.log('📦 Produtos:', produtos.length);
