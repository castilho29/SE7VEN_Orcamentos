// ============================================
// GERAR PDF - MODELO SE7VEN ENERGIA
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

    // ============================================
    // MODELO PDF - SE7VEN ENERGIA
    // ============================================
    const conteudo = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Orçamento ${EMPRESA.nome}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: Arial, Helvetica, sans-serif; 
                padding: 40px; 
                max-width: 800px; 
                margin: 0 auto; 
                background: white; 
            }
            
            /* CABEÇALHO */
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #1a237e;
                font-size: 32px;
                font-weight: 900;
                letter-spacing: 3px;
                margin: 0;
            }
            .header .subtitle {
                color: #666;
                font-size: 14px;
                font-weight: bold;
                margin: 0;
                letter-spacing: 2px;
            }
            
            /* DATA */
            .data {
                text-align: right;
                font-size: 14px;
                margin-bottom: 20px;
            }
            
            /* CLIENTE */
            .cliente-box {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
                border-left: 4px solid #1a237e;
            }
            .cliente-box .titulo {
                color: #1a237e;
                font-size: 14px;
                text-transform: uppercase;
                font-weight: bold;
                margin-bottom: 8px;
            }
            .cliente-box p {
                margin: 3px 0;
                font-size: 14px;
            }
            .cliente-box .label {
                font-weight: bold;
            }
            
            /* TABELA */
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 14px;
            }
            table thead {
                background: #1a237e;
                color: white;
            }
            table th {
                padding: 10px 12px;
                text-align: left;
            }
            table td {
                padding: 10px 12px;
                border-bottom: 1px solid #ddd;
            }
            table tr:last-child td {
                border-bottom: none;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            /* TOTAL */
            .total-box {
                text-align: right;
                padding: 12px;
                font-size: 18px;
                font-weight: bold;
                border-top: 2px solid #1a237e;
                margin: 10px 0 30px 0;
            }
            
            /* FORMA DE PAGAMENTO */
            .pagamento {
                background: #e8f5e9;
                padding: 15px;
                border-radius: 4px;
                border-left: 4px solid #2e7d32;
                margin-top: 30px;
            }
            .pagamento .titulo {
                font-weight: bold;
                color: #1a237e;
            }
            .pagamento p {
                margin: 0;
                font-size: 14px;
            }
            
            /* RODAPÉ */
            .rodape {
                margin-top: 40px;
                text-align: center;
                color: #999;
                font-size: 11px;
                border-top: 1px solid #ddd;
                padding-top: 15px;
            }
            .rodape p {
                margin: 2px 0;
            }
            .rodape .destaque {
                color: #1a237e;
                font-weight: bold;
            }
            
            @media print {
                body { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <!-- CABEÇALHO -->
        <div class="header">
            <h1>SE7VEN ENERGIA</h1>
            <p class="subtitle">ORÇAMENTO</p>
        </div>

        <!-- DATA -->
        <div class="data">
            <strong>Data:</strong> ${dataInvertida}
        </div>

        <!-- CLIENTE -->
        <div class="cliente-box">
            <div class="titulo">CLIENTE:</div>
            <p><span class="label">Nome:</span> ${cliente}</p>
            ${clienteData?.telefone ? `<p><span class="label">Cel:</span> ${clienteData.telefone}</p>` : ''}
            ${clienteData?.cpf ? `<p><span class="label">CPF/CNPJ:</span> ${clienteData.cpf}</p>` : ''}
            ${clienteData?.endereco ? `<p><span class="label">Endereço:</span> ${clienteData.endereco}</p>` : ''}
        </div>

        <!-- TABELA -->
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

        <!-- TOTAL -->
        <div class="total-box">
            <strong>Total: R$ ${total.toFixed(2)}</strong>
        </div>

        <!-- FORMA DE PAGAMENTO -->
        <div class="pagamento">
            <p class="titulo">FORMA DE PAGAMENTO</p>
            <p>Aceitamos Pix à vista e Cartão de Crédito</p>
        </div>

        <!-- RODAPÉ -->
        <div class="rodape">
            <p><span class="destaque">SE7VEN ENERGIA</span> - Orçamento gerado automaticamente</p>
            <p>📧 contato@se7venenergia.com | 📱 (93) 98102-7290</p>
        </div>
    </body>
    </html>
    `;

    // ============================================
    // GERAR PDF
    // ============================================
    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!win) {
        alert('⚠️ Por favor, permita pop-ups para gerar o PDF');
        return;
    }

    win.document.write(conteudo);
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
                    html2canvas: { 
                        scale: 2, 
                        useCORS: true, 
                        logging: false,
                        letterRendering: true
                    },
                    jsPDF: { 
                        unit: 'in', 
                        format: 'a4', 
                        orientation: 'portrait' 
                    }
                };
                
                win.html2pdf()
                    .set(opt)
                    .from(element)
                    .save()
                    .then(() => {
                        win.close();
                        atualizarStatus('✅ PDF gerado com sucesso!');
                    })
                    .catch((err) => {
                        console.error('Erro ao gerar PDF:', err);
                        // Fallback para impressão
                        win.document.body.innerHTML += `
                            <div style="text-align:center;margin-top:20px;padding:20px;">
                                <button onclick="window.print()" style="padding:12px 24px;background:#1a237e;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;">
                                    🖨️ Salvar como PDF
                                </button>
                                <p style="margin-top:10px;color:#666;font-size:12px;">
                                    Selecione "Salvar como PDF" na impressora
                                </p>
                            </div>
                        `;
                        atualizarStatus('⚠️ Use "Imprimir" para salvar o PDF');
                    });
            };
            script.onerror = function() {
                // Fallback se a biblioteca não carregar
                win.document.body.innerHTML += `
                    <div style="text-align:center;margin-top:20px;padding:20px;">
                        <button onclick="window.print()" style="padding:12px 24px;background:#1a237e;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;">
                            🖨️ Salvar como PDF
                        </button>
                        <p style="margin-top:10px;color:#666;font-size:12px;">
                            Selecione "Salvar como PDF" na impressora
                        </p>
                    </div>
                `;
                atualizarStatus('⚠️ Use "Imprimir" para salvar o PDF');
            };
            win.document.head.appendChild(script);
        } catch(err) {
            console.error('Erro ao gerar PDF:', err);
            win.close();
            alert('❌ Erro ao gerar PDF. Tente novamente.');
        }
    }, 1500);
}