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
let USUARIOS = {};

// Carrega usuários do localStorage
function carregarUsuarios() {
    try {
        const saved = localStorage.getItem('usuarios');
        if (saved) {
            USUARIOS = JSON.parse(saved);
            console.log('✅ Usuários carregados do localStorage');
        } else {
            // Usuário admin padrão
            USUARIOS = {
                admin: { senha: 'admin', nome: 'Administrador', tipo: 'admin' }
            };
            salvarUsuarios();
            console.log('👤 Usuário admin criado');
        }
    } catch(e) {
        USUARIOS = {
            admin: { senha: 'admin', nome: 'Administrador', tipo: 'admin' }
        };
        salvarUsuarios();
    }
    console.log('📋 Usuários:', Object.keys(USUARIOS).join(', '));
}

function salvarUsuarios() {
    try {
        localStorage.setItem('usuarios', JSON.stringify(USUARIOS));
        // Atualiza no config.js se disponível
        if (window.CONFIG) {
            window.CONFIG.USUARIOS = USUARIOS;
        }
    } catch(e) {}
}

// ============================================
// GERAR 1000 PRODUTOS ELÉTRICOS (PARÁ)
// ============================================
function gerarProdutosPara() {
    const produtos = [];
    let id = 1;
    
    // ===== MATERIAIS ELÉTRICOS =====
    const materiais = [
        // Cabos e Fios
        { nome: 'Cabo de Cobre 1,5mm² (100m)', preco: 180.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 2,5mm² (100m)', preco: 280.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 4mm² (100m)', preco: 420.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 6mm² (100m)', preco: 580.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 10mm² (100m)', preco: 890.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 16mm² (100m)', preco: 1350.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 25mm² (100m)', preco: 2100.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 35mm² (100m)', preco: 2850.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 50mm² (100m)', preco: 3900.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 70mm² (100m)', preco: 5300.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 95mm² (100m)', preco: 7200.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 120mm² (100m)', preco: 8900.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 150mm² (100m)', preco: 11000.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 185mm² (100m)', preco: 13500.00, tipo: 'material' },
        { nome: 'Cabo de Cobre 240mm² (100m)', preco: 17500.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 10mm² (100m)', preco: 250.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 16mm² (100m)', preco: 380.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 25mm² (100m)', preco: 580.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 35mm² (100m)', preco: 780.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 50mm² (100m)', preco: 1050.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 70mm² (100m)', preco: 1450.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 95mm² (100m)', preco: 1950.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 120mm² (100m)', preco: 2450.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 150mm² (100m)', preco: 3050.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 185mm² (100m)', preco: 3750.00, tipo: 'material' },
        { nome: 'Cabo de Alumínio 240mm² (100m)', preco: 4850.00, tipo: 'material' },
        { nome: 'Cabo Flexível 1,5mm² (100m)', preco: 200.00, tipo: 'material' },
        { nome: 'Cabo Flexível 2,5mm² (100m)', preco: 310.00, tipo: 'material' },
        { nome: 'Cabo Flexível 4mm² (100m)', preco: 460.00, tipo: 'material' },
        { nome: 'Cabo Flexível 6mm² (100m)', preco: 640.00, tipo: 'material' },
        { nome: 'Cabo Flexível 10mm² (100m)', preco: 980.00, tipo: 'material' },
        { nome: 'Cabo Flexível 16mm² (100m)', preco: 1480.00, tipo: 'material' },
        { nome: 'Cabo Flexível 25mm² (100m)', preco: 2300.00, tipo: 'material' },
        { nome: 'Cabo Flexível 35mm² (100m)', preco: 3100.00, tipo: 'material' },
        { nome: 'Cabo Flexível 50mm² (100m)', preco: 4300.00, tipo: 'material' },
        
        // Eletrodutos
        { nome: 'Eletroduto PVC 20mm (3m)', preco: 15.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 25mm (3m)', preco: 20.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 32mm (3m)', preco: 28.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 40mm (3m)', preco: 38.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 50mm (3m)', preco: 52.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 60mm (3m)', preco: 70.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 75mm (3m)', preco: 95.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 85mm (3m)', preco: 120.00, tipo: 'material' },
        { nome: 'Eletroduto PVC 110mm (3m)', preco: 160.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 20mm (3m)', preco: 35.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 25mm (3m)', preco: 45.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 32mm (3m)', preco: 60.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 40mm (3m)', preco: 80.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 50mm (3m)', preco: 105.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 60mm (3m)', preco: 140.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 75mm (3m)', preco: 185.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 85mm (3m)', preco: 235.00, tipo: 'material' },
        { nome: 'Eletroduto Metálico 110mm (3m)', preco: 310.00, tipo: 'material' },
        
        // Disjuntores
        { nome: 'Disjuntor Monofásico 10A', preco: 25.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 16A', preco: 28.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 20A', preco: 30.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 25A', preco: 35.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 32A', preco: 40.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 40A', preco: 48.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 50A', preco: 58.00, tipo: 'material' },
        { nome: 'Disjuntor Monofásico 63A', preco: 70.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 10A', preco: 45.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 16A', preco: 50.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 20A', preco: 55.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 25A', preco: 60.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 32A', preco: 70.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 40A', preco: 85.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 50A', preco: 100.00, tipo: 'material' },
        { nome: 'Disjuntor Bifásico 63A', preco: 120.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 10A', preco: 65.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 16A', preco: 75.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 20A', preco: 85.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 25A', preco: 95.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 32A', preco: 110.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 40A', preco: 130.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 50A', preco: 155.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 63A', preco: 185.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 80A', preco: 230.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 100A', preco: 280.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 125A', preco: 350.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 160A', preco: 440.00, tipo: 'material' },
        { nome: 'Disjuntor Trifásico 200A', preco: 550.00, tipo: 'material' },
        
        // Interruptores e Tomadas
        { nome: 'Interruptor Simples Branco', preco: 8.00, tipo: 'material' },
        { nome: 'Interruptor Simples Cinza', preco: 9.00, tipo: 'material' },
        { nome: 'Interruptor Simples Preto', preco: 10.00, tipo: 'material' },
        { nome: 'Interruptor Duplo Branco', preco: 14.00, tipo: 'material' },
        { nome: 'Interruptor Duplo Cinza', preco: 15.00, tipo: 'material' },
        { nome: 'Interruptor Duplo Preto', preco: 17.00, tipo: 'material' },
        { nome: 'Interruptor Triplo Branco', preco: 20.00, tipo: 'material' },
        { nome: 'Interruptor Triplo Cinza', preco: 22.00, tipo: 'material' },
        { nome: 'Interruptor Triplo Preto', preco: 25.00, tipo: 'material' },
        { nome: 'Interruptor Intermediário Branco', preco: 18.00, tipo: 'material' },
        { nome: 'Interruptor Intermediário Cinza', preco: 20.00, tipo: 'material' },
        { nome: 'Interruptor Intermediário Preto', preco: 22.00, tipo: 'material' },
        { nome: 'Interruptor com Sensor de Presença', preco: 85.00, tipo: 'material' },
        { nome: 'Interruptor com Timer', preco: 120.00, tipo: 'material' },
        { nome: 'Interruptor Inteligente WiFi', preco: 150.00, tipo: 'material' },
        { nome: 'Tomada 10A 2P+T Branca', preco: 12.00, tipo: 'material' },
        { nome: 'Tomada 10A 2P+T Cinza', preco: 13.00, tipo: 'material' },
        { nome: 'Tomada 10A 2P+T Preta', preco: 14.00, tipo: 'material' },
        { nome: 'Tomada 20A 2P+T Branca', preco: 18.00, tipo: 'material' },
        { nome: 'Tomada 20A 2P+T Cinza', preco: 20.00, tipo: 'material' },
        { nome: 'Tomada 20A 2P+T Preta', preco: 22.00, tipo: 'material' },
        { nome: 'Tomada com USB Branca', preco: 65.00, tipo: 'material' },
        { nome: 'Tomada com USB Cinza', preco: 70.00, tipo: 'material' },
        { nome: 'Tomada com USB Preta', preco: 75.00, tipo: 'material' },
        { nome: 'Tomada Inteligente WiFi', preco: 120.00, tipo: 'material' },
        { nome: 'Tomada de Embutir 10A', preco: 15.00, tipo: 'material' },
        { nome: 'Tomada de Embutir 20A', preco: 22.00, tipo: 'material' },
        { nome: 'Tomada de Superfície 10A', preco: 10.00, tipo: 'material' },
        { nome: 'Tomada de Superfície 20A', preco: 16.00, tipo: 'material' },
        
        // Lâmpadas e Luminares
        { nome: 'Lâmpada LED 9W Branca', preco: 15.00, tipo: 'material' },
        { nome: 'Lâmpada LED 9W Amarela', preco: 15.00, tipo: 'material' },
        { nome: 'Lâmpada LED 12W Branca', preco: 20.00, tipo: 'material' },
        { nome: 'Lâmpada LED 12W Amarela', preco: 20.00, tipo: 'material' },
        { nome: 'Lâmpada LED 15W Branca', preco: 28.00, tipo: 'material' },
        { nome: 'Lâmpada LED 15W Amarela', preco: 28.00, tipo: 'material' },
        { nome: 'Lâmpada LED 20W Branca', preco: 38.00, tipo: 'material' },
        { nome: 'Lâmpada LED 20W Amarela', preco: 38.00, tipo: 'material' },
        { nome: 'Lâmpada LED 30W Branca', preco: 55.00, tipo: 'material' },
        { nome: 'Lâmpada LED 30W Amarela', preco: 55.00, tipo: 'material' },
        { nome: 'Lâmpada LED 50W Branca', preco: 85.00, tipo: 'material' },
        { nome: 'Lâmpada LED 50W Amarela', preco: 85.00, tipo: 'material' },
        { nome: 'Lâmpada LED 100W Branca', preco: 150.00, tipo: 'material' },
        { nome: 'Lâmpada LED 100W Amarela', preco: 150.00, tipo: 'material' },
        { nome: 'Lâmpada LED 150W Branca', preco: 220.00, tipo: 'material' },
        { nome: 'Lâmpada LED 150W Amarela', preco: 220.00, tipo: 'material' },
        { nome: 'Lâmpada LED 200W Branca', preco: 290.00, tipo: 'material' },
        { nome: 'Lâmpada LED 200W Amarela', preco: 290.00, tipo: 'material' },
        { nome: 'Lâmpada LED Tubular 1,2m 18W', preco: 35.00, tipo: 'material' },
        { nome: 'Lâmpada LED Tubular 1,2m 36W', preco: 55.00, tipo: 'material' },
        { nome: 'Lâmpada LED Tubular 1,5m 45W', preco: 70.00, tipo: 'material' },
        { nome: 'Lâmpada LED Tubular 1,5m 60W', preco: 95.00, tipo: 'material' },
        { nome: 'Luminária LED Embutir 12W', preco: 45.00, tipo: 'material' },
        { nome: 'Luminária LED Embutir 18W', preco: 65.00, tipo: 'material' },
        { nome: 'Luminária LED Embutir 24W', preco: 85.00, tipo: 'material' },
        { nome: 'Luminária LED Embutir 36W', preco: 120.00, tipo: 'material' },
        { nome: 'Luminária LED Embutir 48W', preco: 160.00, tipo: 'material' },
        { nome: 'Luminária LED Sobrepor 12W', preco: 40.00, tipo: 'material' },
        { nome: 'Luminária LED Sobrepor 18W', preco: 58.00, tipo: 'material' },
        { nome: 'Luminária LED Sobrepor 24W', preco: 78.00, tipo: 'material' },
        { nome: 'Luminária LED Sobrepor 36W', preco: 110.00, tipo: 'material' },
        { nome: 'Luminária LED Sobrepor 48W', preco: 145.00, tipo: 'material' },
        { nome: 'Refletor LED 50W', preco: 120.00, tipo: 'material' },
        { nome: 'Refletor LED 100W', preco: 200.00, tipo: 'material' },
        { nome: 'Refletor LED 150W', preco: 280.00, tipo: 'material' },
        { nome: 'Refletor LED 200W', preco: 380.00, tipo: 'material' },
        { nome: 'Refletor LED 300W', preco: 550.00, tipo: 'material' },
        { nome: 'Refletor LED 500W', preco: 850.00, tipo: 'material' },
        { nome: 'Lâmpada LED Decorativa Filamento 4W', preco: 25.00, tipo: 'material' },
        { nome: 'Lâmpada LED Decorativa Filamento 6W', preco: 35.00, tipo: 'material' },
        { nome: 'Lâmpada LED Decorativa Filamento 8W', preco: 45.00, tipo: 'material' },
        { nome: 'Lâmpada LED Decorativa Filamento 10W', preco: 58.00, tipo: 'material' },
        { nome: 'Lâmpada LED Decorativa Filamento 12W', preco: 70.00, tipo: 'material' },
        
        // Quadros de Distribuição
        { nome: 'Quadro de Distribuição 4 Caminhos', preco: 120.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 6 Caminhos', preco: 160.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 8 Caminhos', preco: 200.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 10 Caminhos', preco: 250.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 12 Caminhos', preco: 300.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 16 Caminhos', preco: 380.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 20 Caminhos', preco: 460.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 24 Caminhos', preco: 550.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 30 Caminhos', preco: 680.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 36 Caminhos', preco: 820.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 42 Caminhos', preco: 980.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 48 Caminhos', preco: 1150.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 54 Caminhos', preco: 1350.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 60 Caminhos', preco: 1550.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 72 Caminhos', preco: 1850.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 84 Caminhos', preco: 2200.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 96 Caminhos', preco: 2600.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 108 Caminhos', preco: 3100.00, tipo: 'material' },
        { nome: 'Quadro de Distribuição 120 Caminhos', preco: 3600.00, tipo: 'material' },
        
        // Caixas e Acessórios
        { nome: 'Caixa de Passagem 4x2"', preco: 5.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 4x4"', preco: 8.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 6x4"', preco: 12.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 8x6"', preco: 18.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 10x8"', preco: 28.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 12x10"', preco: 42.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 16x12"', preco: 65.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 20x16"', preco: 95.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 24x20"', preco: 140.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 30x24"', preco: 200.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 36x30"', preco: 280.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 42x36"', preco: 380.00, tipo: 'material' },
        { nome: 'Caixa de Passagem 48x42"', preco: 500.00, tipo: 'material' },
        { nome: 'Conector para Cabo 1,5mm²', preco: 2.00, tipo: 'material' },
        { nome: 'Conector para Cabo 2,5mm²', preco: 2.50, tipo: 'material' },
        { nome: 'Conector para Cabo 4mm²', preco: 3.50, tipo: 'material' },
        { nome: 'Conector para Cabo 6mm²', preco: 4.50, tipo: 'material' },
        { nome: 'Conector para Cabo 10mm²', preco: 6.50, tipo: 'material' },
        { nome: 'Conector para Cabo 16mm²', preco: 9.00, tipo: 'material' },
        { nome: 'Conector para Cabo 25mm²', preco: 13.00, tipo: 'material' },
        { nome: 'Conector para Cabo 35mm²', preco: 18.00, tipo: 'material' },
        { nome: 'Conector para Cabo 50mm²', preco: 25.00, tipo: 'material' },
        { nome: 'Conector para Cabo 70mm²', preco: 35.00, tipo: 'material' },
        { nome: 'Conector para Cabo 95mm²', preco: 48.00, tipo: 'material' },
        { nome: 'Conector para Cabo 120mm²', preco: 65.00, tipo: 'material' },
        { nome: 'Conector para Cabo 150mm²', preco: 85.00, tipo: 'material' },
        { nome: 'Conector para Cabo 185mm²', preco: 110.00, tipo: 'material' },
        { nome: 'Conector para Cabo 240mm²', preco: 145.00, tipo: 'material' },
        { nome: 'Fita Isolante 19mm x 20m', preco: 8.00, tipo: 'material' },
        { nome: 'Fita Isolante 19mm x 50m', preco: 18.00, tipo: 'material' },
        { nome: 'Fita Isolante 25mm x 20m', preco: 12.00, tipo: 'material' },
        { nome: 'Fita Isolante 25mm x 50m', preco: 25.00, tipo: 'material' },
        { nome: 'Abraçadeira de Nylon 100x2,5mm', preco: 15.00, tipo: 'material' },
        { nome: 'Abraçadeira de Nylon 150x3,5mm', preco: 22.00, tipo: 'material' },
        { nome: 'Abraçadeira de Nylon 200x4,5mm', preco: 32.00, tipo: 'material' },
        { nome: 'Abraçadeira de Nylon 300x4,5mm', preco: 45.00, tipo: 'material' },
        { nome: 'Abraçadeira de Nylon 500x4,5mm', preco: 70.00, tipo: 'material' },
        { nome: 'Abraçadeira de Nylon 750x4,5mm', preco: 100.00, tipo: 'material' },
        { nome: 'Abraçadeira de Nylon 1000x4,5mm', preco: 130.00, tipo: 'material' },
        { nome: 'Buracos para Parafuso 3/16"', preco: 3.00, tipo: 'material' },
        { nome: 'Buracos para Parafuso 1/4"', preco: 4.00, tipo: 'material' },
        { nome: 'Buracos para Parafuso 5/16"', preco: 5.00, tipo: 'material' },
        { nome: 'Buracos para Parafuso 3/8"', preco: 7.00, tipo: 'material' },
        { nome: 'Parafuso 3/16"x1"', preco: 2.00, tipo: 'material' },
        { nome: 'Parafuso 1/4"x1"', preco: 3.00, tipo: 'material' },
        { nome: 'Parafuso 5/16"x1"', preco: 4.00, tipo: 'material' },
        { nome: 'Parafuso 3/8"x1"', preco: 6.00, tipo: 'material' },
        { nome: 'Parafuso 3/16"x2"', preco: 3.00, tipo: 'material' },
        { nome: 'Parafuso 1/4"x2"', preco: 4.50, tipo: 'material' },
        { nome: 'Parafuso 5/16"x2"', preco: 6.00, tipo: 'material' },
        { nome: 'Parafuso 3/8"x2"', preco: 9.00, tipo: 'material' },
        { nome: 'Buchas de Nylon 5mm', preco: 0.50, tipo: 'material' },
        { nome: 'Buchas de Nylon 6mm', preco: 0.60, tipo: 'material' },
        { nome: 'Buchas de Nylon 8mm', preco: 0.80, tipo: 'material' },
        { nome: 'Buchas de Nylon 10mm', preco: 1.00, tipo: 'material' },
        { nome: 'Buchas de Nylon 12mm', preco: 1.20, tipo: 'material' },
        { nome: 'Buchas de Nylon 14mm', preco: 1.50, tipo: 'material' },
        { nome: 'Buchas de Nylon 16mm', preco: 2.00, tipo: 'material' },
        
        // Equipamentos de Proteção
        { nome: 'Dispositivo DPS 1P 20kA', preco: 120.00, tipo: 'material' },
        { nome: 'Dispositivo DPS 1P 40kA', preco: 180.00, tipo: 'material' },
        { nome: 'Dispositivo DPS 2P 20kA', preco: 200.00, tipo: 'material' },
        { nome: 'Dispositivo DPS 2P 40kA', preco: 280.00, tipo: 'material' },
        { nome: 'Dispositivo DPS 3P 20kA', preco: 280.00, tipo: 'material' },
        { nome: 'Dispositivo DPS 3P 40kA', preco: 380.00, tipo: 'material' },
        { nome: 'Dispositivo DPS 3P+N 20kA', preco: 350.00, tipo: 'material' },
        { nome: 'Dispositivo DPS 3P+N 40kA', preco: 480.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 40A 30mA', preco: 250.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 63A 30mA', preco: 320.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 80A 30mA', preco: 420.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 100A 30mA', preco: 520.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 125A 30mA', preco: 650.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 160A 30mA', preco: 820.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 200A 30mA', preco: 1050.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 40A 100mA', preco: 220.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 63A 100mA', preco: 290.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 80A 100mA', preco: 380.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 100A 100mA', preco: 480.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 125A 100mA', preco: 600.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 160A 100mA', preco: 760.00, tipo: 'material' },
        { nome: 'DR (Diferencial Residual) 200A 100mA', preco: 980.00, tipo: 'material' },
        
        // Inversores e Equipamentos Solares
        { nome: 'Inversor Solar 1kW Monofásico', preco: 1200.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 1.5kW Monofásico', preco: 1600.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 2kW Monofásico', preco: 2000.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 3kW Monofásico', preco: 2800.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 4kW Monofásico', preco: 3500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 5kW Monofásico', preco: 4200.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 6kW Trifásico', preco: 5200.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 8kW Trifásico', preco: 6800.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 10kW Trifásico', preco: 8500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 12kW Trifásico', preco: 10200.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 15kW Trifásico', preco: 12500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 20kW Trifásico', preco: 16500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 25kW Trifásico', preco: 20500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 30kW Trifásico', preco: 24500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 40kW Trifásico', preco: 32500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 50kW Trifásico', preco: 40500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 60kW Trifásico', preco: 48500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 75kW Trifásico', preco: 60500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 100kW Trifásico', preco: 80500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 150kW Trifásico', preco: 120500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 200kW Trifásico', preco: 160500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 250kW Trifásico', preco: 200500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 300kW Trifásico', preco: 240500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 400kW Trifásico', preco: 320500.00, tipo: 'equipamento' },
        { nome: 'Inversor Solar 500kW Trifásico', preco: 400500.00, tipo: 'equipamento' },
        
        // Kit Solar
        { nome: 'Kit Solar 1kW (2 placas + Inversor)', preco: 3500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 2kW (4 placas + Inversor)', preco: 6500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 3kW (6 placas + Inversor)', preco: 9500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 4kW (8 placas + Inversor)', preco: 12500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 5kW (10 placas + Inversor)', preco: 15500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 6kW (12 placas + Inversor)', preco: 18500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 7kW (14 placas + Inversor)', preco: 21500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 8kW (16 placas + Inversor)', preco: 24500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 9kW (18 placas + Inversor)', preco: 27500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 10kW (20 placas + Inversor)', preco: 30500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 15kW (30 placas + Inversor)', preco: 45500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 20kW (40 placas + Inversor)', preco: 60500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 25kW (50 placas + Inversor)', preco: 75500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 30kW (60 placas + Inversor)', preco: 90500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 40kW (80 placas + Inversor)', preco: 120500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 50kW (100 placas + Inversor)', preco: 150500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 75kW (150 placas + Inversor)', preco: 225500.00, tipo: 'equipamento' },
        { nome: 'Kit Solar 100kW (200 placas + Inversor)', preco: 300500.00, tipo: 'equipamento' },
        
        // Placa Solar
        { nome: 'Placa Solar 300W (Policristalina)', preco: 800.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 330W (Policristalina)', preco: 880.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 355W (Policristalina)', preco: 950.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 380W (Policristalina)', preco: 1020.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 400W (Policristalina)', preco: 1080.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 420W (Policristalina)', preco: 1130.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 450W (Policristalina)', preco: 1200.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 300W (Monocristalina)', preco: 900.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 330W (Monocristalina)', preco: 990.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 355W (Monocristalina)', preco: 1080.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 380W (Monocristalina)', preco: 1150.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 400W (Monocristalina)', preco: 1220.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 420W (Monocristalina)', preco: 1280.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 450W (Monocristalina)', preco: 1350.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 500W (Monocristalina)', preco: 1500.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 550W (Monocristalina)', preco: 1650.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 600W (Monocristalina)', preco: 1800.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 650W (Monocristalina)', preco: 1950.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 700W (Monocristalina)', preco: 2100.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 750W (Monocristalina)', preco: 2250.00, tipo: 'equipamento' },
        { nome: 'Placa Solar 800W (Monocristalina)', preco: 2400.00, tipo: 'equipamento' },
        
        // Transformadores
        { nome: 'Transformador 1kVA 220/127V', preco: 800.00, tipo: 'equipamento' },
        { nome: 'Transformador 2kVA 220/127V', preco: 1200.00, tipo: 'equipamento' },
        { nome: 'Transformador 3kVA 220/127V', preco: 1600.00, tipo: 'equipamento' },
        { nome: 'Transformador 5kVA 220/127V', preco: 2200.00, tipo: 'equipamento' },
        { nome: 'Transformador 7.5kVA 220/127V', preco: 3000.00, tipo: 'equipamento' },
        { nome: 'Transformador 10kVA 220/127V', preco: 3800.00, tipo: 'equipamento' },
        { nome: 'Transformador 15kVA 220/127V', preco: 5200.00, tipo: 'equipamento' },
        { nome: 'Transformador 20kVA 220/127V', preco: 6800.00, tipo: 'equipamento' },
        { nome: 'Transformador 25kVA 220/127V', preco: 8500.00, tipo: 'equipamento' },
        { nome: 'Transformador 30kVA 220/127V', preco: 10200.00, tipo: 'equipamento' },
        { nome: 'Transformador 45kVA 220/127V', preco: 15000.00, tipo: 'equipamento' },
        { nome: 'Transformador 60kVA 220/127V', preco: 20000.00, tipo: 'equipamento' },
        { nome: 'Transformador 75kVA 220/127V', preco: 25000.00, tipo: 'equipamento' },
        { nome: 'Transformador 100kVA 220/127V', preco: 33000.00, tipo: 'equipamento' },
        { nome: 'Transformador 150kVA 220/127V', preco: 48000.00, tipo: 'equipamento' },
        { nome: 'Transformador 200kVA 220/127V', preco: 63000.00, tipo: 'equipamento' },
        { nome: 'Transformador 300kVA 220/127V', preco: 93000.00, tipo: 'equipamento' },
        { nome: 'Transformador 500kVA 220/127V', preco: 153000.00, tipo: 'equipamento' },
        
        // Medidores
        { nome: 'Medidor de Energia Monofásico', preco: 250.00, tipo: 'equipamento' },
        { nome: 'Medidor de Energia Bifásico', preco: 350.00, tipo: 'equipamento' },
        { nome: 'Medidor de Energia Trifásico', preco: 500.00, tipo: 'equipamento' },
        { nome: 'Medidor de Energia Digital Monofásico', preco: 400.00, tipo: 'equipamento' },
        { nome: 'Medidor de Energia Digital Bifásico', preco: 550.00, tipo: 'equipamento' },
        { nome: 'Medidor de Energia Digital Trifásico', preco: 750.00, tipo: 'equipamento' },
        { nome: 'Medidor de Energia com Comunicação', preco: 1200.00, tipo: 'equipamento' },
        { nome: 'Medidor de Energia Inteligente', preco: 1500.00, tipo: 'equipamento' },
        
        // Aterramento
        { nome: 'Haste de Aterramento 2,4m (3/4")', preco: 120.00, tipo: 'material' },
        { nome: 'Haste de Aterramento 2,4m (5/8")', preco: 100.00, tipo: 'material' },
        { nome: 'Haste de Aterramento 3,0m (3/4")', preco: 150.00, tipo: 'material' },
        { nome: 'Haste de Aterramento 3,0m (5/8")', preco: 125.00, tipo: 'material' },
        { nome: 'Haste de Aterramento 1,5m (5/8")', preco: 65.00, tipo: 'material' },
        { nome: 'Conector para Haste de Aterramento', preco: 35.00, tipo: 'material' },
        { nome: 'Caixa de Inspeção de Aterramento', preco: 50.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 16mm² (100m)', preco: 650.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 25mm² (100m)', preco: 950.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 35mm² (100m)', preco: 1250.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 50mm² (100m)', preco: 1750.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 70mm² (100m)', preco: 2450.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 95mm² (100m)', preco: 3350.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 120mm² (100m)', preco: 4250.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 150mm² (100m)', preco: 5300.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 185mm² (100m)', preco: 6550.00, tipo: 'material' },
        { nome: 'Fio de Cobre Nu 240mm² (100m)', preco: 8500.00, tipo: 'material' },
        { nome: 'Gel Anti-Oxidante 500g', preco: 45.00, tipo: 'material' },
        { nome: 'Gel Anti-Oxidante 1kg', preco: 80.00, tipo: 'material' },
        { nome: 'Gel Anti-Oxidante 5kg', preco: 350.00, tipo: 'material' },
        { nome: 'Pasta de Aterramento 1kg', preco: 60.00, tipo: 'material' },
        { nome: 'Pasta de Aterramento 5kg', preco: 250.00, tipo: 'material' },
        
        // Fiações e Acessórios
        { nome: 'Fio de Cobre 1,5mm² (100m)', preco: 120.00, tipo: 'material' },
        { nome: 'Fio de Cobre 2,5mm² (100m)', preco: 190.00, tipo: 'material' },
        { nome: 'Fio de Cobre 4mm² (100m)', preco: 300.00, tipo: 'material' },
        { nome: 'Fio de Cobre 6mm² (100m)', preco: 440.00, tipo: 'material' },
        { nome: 'Fio de Cobre 10mm² (100m)', preco: 720.00, tipo: 'material' },
        { nome: 'Fio de Cobre 16mm² (100m)', preco: 1120.00, tipo: 'material' },
        { nome: 'Fio de Cobre 25mm² (100m)', preco: 1750.00, tipo: 'material' },
        { nome: 'Fio de Cobre 35mm² (100m)', preco: 2450.00, tipo: 'material' },
        { nome: 'Fio de Cobre 50mm² (100m)', preco: 3450.00, tipo: 'material' },
        { nome: 'Fio de Cobre 70mm² (100m)', preco: 4800.00, tipo: 'material' },
        { nome: 'Fio de Cobre 95mm² (100m)', preco: 6500.00, tipo: 'material' },
        { nome: 'Fio de Cobre 120mm² (100m)', preco: 8200.00, tipo: 'material' },
        { nome: 'Fio de Cobre 150mm² (100m)', preco: 10200.00, tipo: 'material' },
        { nome: 'Fio de Cobre 185mm² (100m)', preco: 12600.00, tipo: 'material' },
        { nome: 'Fio de Cobre 240mm² (100m)', preco: 16300.00, tipo: 'material' },
        { nome: 'Fio de Cobre 300mm² (100m)', preco: 20400.00, tipo: 'material' },
        
        // Canaletas
        { nome: 'Canaleta 15x15mm (2m)', preco: 8.00, tipo: 'material' },
        { nome: 'Canaleta 20x20mm (2m)', preco: 12.00, tipo: 'material' },
        { nome: 'Canaleta 30x30mm (2m)', preco: 18.00, tipo: 'material' },
        { nome: 'Canaleta 40x40mm (2m)', preco: 25.00, tipo: 'material' },
        { nome: 'Canaleta 50x50mm (2m)', preco: 35.00, tipo: 'material' },
        { nome: 'Canaleta 60x60mm (2m)', preco: 45.00, tipo: 'material' },
        { nome: 'Canaleta 80x80mm (2m)', preco: 65.00, tipo: 'material' },
        { nome: 'Canaleta 100x100mm (2m)', preco: 95.00, tipo: 'material' },
        { nome: 'Canaleta 120x120mm (2m)', preco: 130.00, tipo: 'material' },
        { nome: 'Canaleta 150x150mm (2m)', preco: 180.00, tipo: 'material' },
        { nome: 'Canaleta 200x200mm (2m)', preco: 260.00, tipo: 'material' },
        { nome: 'Canaleta 250x250mm (2m)', preco: 380.00, tipo: 'material' },
        { nome: 'Canaleta 300x300mm (2m)', preco: 520.00, tipo: 'material' },
        { nome: 'Canaleta 400x400mm (2m)', preco: 750.00, tipo: 'material' },
        { nome: 'Canaleta 500x500mm (2m)', preco: 1050.00, tipo: 'material' },
        { nome: 'Canaleta 600x600mm (2m)', preco: 1450.00, tipo: 'material' },
        { nome: 'Canaleta 800x800mm (2m)', preco: 2150.00, tipo: 'material' },
        { nome: 'Canaleta 1000x1000mm (2m)', preco: 3150.00, tipo: 'material' },
        
        // Perfilados
        { nome: 'Perfilado 20x20mm (3m)', preco: 25.00, tipo: 'material' },
        { nome: 'Perfilado 30x30mm (3m)', preco: 38.00, tipo: 'material' },
        { nome: 'Perfilado 40x40mm (3m)', preco: 55.00, tipo: 'material' },
        { nome: 'Perfilado 50x50mm (3m)', preco: 78.00, tipo: 'material' },
        { nome: 'Perfilado 60x60mm (3m)', preco: 105.00, tipo: 'material' },
        { nome: 'Perfilado 80x80mm (3m)', preco: 155.00, tipo: 'material' },
        { nome: 'Perfilado 100x100mm (3m)', preco: 225.00, tipo: 'material' },
        { nome: 'Perfilado 120x120mm (3m)', preco: 310.00, tipo: 'material' },
        { nome: 'Perfilado 150x150mm (3m)', preco: 430.00, tipo: 'material' },
        { nome: 'Perfilado 200x200mm (3m)', preco: 620.00, tipo: 'material' },
        { nome: 'Perfilado 250x250mm (3m)', preco: 900.00, tipo: 'material' },
        { nome: 'Perfilado 300x300mm (3m)', preco: 1240.00, tipo: 'material' },
        { nome: 'Perfilado 400x400mm (3m)', preco: 1790.00, tipo: 'material' },
        { nome: 'Perfilado 500x500mm (3m)', preco: 2500.00, tipo: 'material' },
        
        // Filtros de Linha
        { nome: 'Filtro de Linha 10A', preco: 80.00, tipo: 'material' },
        { nome: 'Filtro de Linha 16A', preco: 120.00, tipo: 'material' },
        { nome: 'Filtro de Linha 20A', preco: 160.00, tipo: 'material' },
        { nome: 'Filtro de Linha 25A', preco: 200.00, tipo: 'material' },
        { nome: 'Filtro de Linha 32A', preco: 260.00, tipo: 'material' },
        { nome: 'Filtro de Linha 40A', preco: 340.00, tipo: 'material' },
        { nome: 'Filtro de Linha 50A', preco: 440.00, tipo: 'material' },
        { nome: 'Filtro de Linha 63A', preco: 560.00, tipo: 'material' },
        { nome: 'Filtro de Linha 80A', preco: 720.00, tipo: 'material' },
        { nome: 'Filtro de Linha 100A', preco: 920.00, tipo: 'material' },
        
        // Sensores
        { nome: 'Sensor de Presença 360º', preco: 120.00, tipo: 'material' },
        { nome: 'Sensor de Presença 180º', preco: 90.00, tipo: 'material' },
        { nome: 'Sensor de Presença 90º', preco: 70.00, tipo: 'material' },
        { nome: 'Sensor de Luminosidade 0-1000Lux', preco: 80.00, tipo: 'material' },
        { nome: 'Sensor de Temperatura -20 a 100°C', preco: 120.00, tipo: 'material' },
        { nome: 'Sensor de Umidade 0-100%', preco: 150.00, tipo: 'material' },
        { nome: 'Sensor de Presença com Timer', preco: 180.00, tipo: 'material' },
        { nome: 'Sensor de Presença com Luminosidade', preco: 220.00, tipo: 'material' },
        { nome: 'Sensor de Movimento WiFi', preco: 250.00, tipo: 'material' },
        { nome: 'Sensor de Fumaça', preco: 180.00, tipo: 'material' },
        { nome: 'Sensor de Gás', preco: 220.00, tipo: 'material' },
        { nome: 'Sensor de Água', preco: 150.00, tipo: 'material' },
        { nome: 'Sensor de Vibração', preco: 180.00, tipo: 'material' },
        { nome: 'Sensor de Abertura de Porta', preco: 100.00, tipo: 'material' },
        { nome: 'Sensor de Abertura de Janela', preco: 120.00, tipo: 'material' },
        
        // Controladores
        { nome: 'Controlador de Carga 10A', preco: 200.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 20A', preco: 300.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 30A', preco: 400.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 40A', preco: 520.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 50A', preco: 650.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 60A', preco: 780.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 80A', preco: 1020.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 100A', preco: 1280.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 120A', preco: 1550.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga 150A', preco: 1950.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga MPPT 10A', preco: 350.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga MPPT 20A', preco: 520.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga MPPT 30A', preco: 700.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga MPPT 40A', preco: 920.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga MPPT 50A', preco: 1150.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga MPPT 60A', preco: 1400.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga MPPT 80A', preco: 1850.00, tipo: 'equipamento' },
        { nome: 'Controlador de Carga MPPT 100A', preco: 2350.00, tipo: 'equipamento' },
        
        // Automação
        { nome: 'Módulo WiFi 4 Canais', preco: 350.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 6 Canais', preco: 480.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 8 Canais', preco: 620.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 12 Canais', preco: 850.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 16 Canais', preco: 1100.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 20 Canais', preco: 1350.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 24 Canais', preco: 1600.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 32 Canais', preco: 2100.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 48 Canais', preco: 3100.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 64 Canais', preco: 4100.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 96 Canais', preco: 6100.00, tipo: 'equipamento' },
        { nome: 'Módulo WiFi 128 Canais', preco: 8100.00, tipo: 'equipamento' },
        { nome: 'Módulo ZigBee 4 Canais', preco: 400.00, tipo: 'equipamento' },
        { nome: 'Módulo ZigBee 8 Canais', preco: 700.00, tipo: 'equipamento' },
        { nome: 'Módulo ZigBee 16 Canais', preco: 1300.00, tipo: 'equipamento' },
        { nome: 'Módulo ZigBee 32 Canais', preco: 2500.00, tipo: 'equipamento' },
        { nome: 'Módulo ZigBee 64 Canais', preco: 4900.00, tipo: 'equipamento' },
        { nome: 'Módulo ZigBee 128 Canais', preco: 9700.00, tipo: 'equipamento' },
        { nome: 'Hub de Automação Residencial', preco: 800.00, tipo: 'equipamento' },
        { nome: 'Hub de Automação Industrial', preco: 2000.00, tipo: 'equipamento' },
        { nome: 'Hub de Automação Comercial', preco: 3500.00, tipo: 'equipamento' },
        
        // Ferramentas
        { nome: 'Alicate de Corte', preco: 45.00, tipo: 'material' },
        { nome: 'Alicate de Crimpagem', preco: 80.00, tipo: 'material' },
        { nome: 'Alicate Multifuncional', preco: 120.00, tipo: 'material' },
        { nome: 'Chave de Fenda 3/16"', preco: 15.00, tipo: 'material' },
        { nome: 'Chave de Fenda 1/4"', preco: 20.00, tipo: 'material' },
        { nome: 'Chave de Fenda 5/16"', preco: 25.00, tipo: 'material' },
        { nome: 'Chave Phillips 3/16"', preco: 18.00, tipo: 'material' },
        { nome: 'Chave Phillips 1/4"', preco: 22.00, tipo: 'material' },
        { nome: 'Chave Phillips 5/16"', preco: 28.00, tipo: 'material' },
        { nome: 'Chave Allen 3mm', preco: 10.00, tipo: 'material' },
        { nome: 'Chave Allen 4mm', preco: 12.00, tipo: 'material' },
        { nome: 'Chave Allen 5mm', preco: 15.00, tipo: 'material' },
        { nome: 'Chave Allen 6mm', preco: 18.00, tipo: 'material' },
        { nome: 'Chave Allen 8mm', preco: 22.00, tipo: 'material' },
        { nome: 'Chave Allen 10mm', preco: 28.00, tipo: 'material' },
        { nome: 'Chave de Teste (Fase)', preco: 20.00, tipo: 'material' },
        { nome: 'Multímetro Digital', preco: 150.00, tipo: 'material' },
        { nome: 'Multímetro True RMS', preco: 350.00, tipo: 'material' },
        { nome: 'Multímetro de Bancada', preco: 600.00, tipo: 'material' },
        { nome: 'Clampímetro AC/DC', preco: 400.00, tipo: 'material' },
        { nome: 'Megôhmetro 1000V', preco: 800.00, tipo: 'material' },
        { nome: 'Teste de Tensão 1000V', preco: 500.00, tipo: 'material' },
        { nome: 'Lanterna de Cabeça LED', preco: 40.00, tipo: 'material' },
        { nome: 'Lanterna Portátil LED', preco: 60.00, tipo: 'material' },
        
        // ===== MÃO DE OBRA - SERVIÇOS =====
        // Serviços Elétricos
        { nome: 'Instalação Elétrica Residencial (por m²)', preco: 120.00, tipo: 'servico' },
        { nome: 'Instalação Elétrica Comercial (por m²)', preco: 150.00, tipo: 'servico' },
        { nome: 'Instalação Elétrica Industrial (por m²)', preco: 200.00, tipo: 'servico' },
        { nome: 'Instalação de Quadro de Distribuição', preco: 500.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema Solar (por kWp)', preco: 600.00, tipo: 'servico' },
        { nome: 'Instalação de Inversor Solar', preco: 800.00, tipo: 'servico' },
        { nome: 'Instalação de Aterramento', preco: 400.00, tipo: 'servico' },
        { nome: 'Instalação de DPS', preco: 300.00, tipo: 'servico' },
        { nome: 'Instalação de DR', preco: 350.00, tipo: 'servico' },
        { nome: 'Instalação de Disjuntor Geral', preco: 200.00, tipo: 'servico' },
        { nome: 'Instalação de Tomadas (por ponto)', preco: 80.00, tipo: 'servico' },
        { nome: 'Instalação de Interruptores (por ponto)', preco: 70.00, tipo: 'servico' },
        { nome: 'Instalação de Lâmpadas (por ponto)', preco: 60.00, tipo: 'servico' },
        { nome: 'Instalação de Luminárias (por ponto)', preco: 100.00, tipo: 'servico' },
        { nome: 'Instalação de Sensor de Presença', preco: 150.00, tipo: 'servico' },
        { nome: 'Instalação de Automação Residencial', preco: 500.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de CFTV', preco: 600.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Alarmes', preco: 500.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Iluminação LED', preco: 400.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Energia Solar', preco: 1500.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Bombeamento Solar', preco: 2000.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Aquecimento Solar', preco: 2500.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Refrigeração', preco: 3000.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Ventilação', preco: 2000.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Ar Condicionado', preco: 3500.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Bombas', preco: 4000.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Geradores', preco: 5000.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de Transformadores', preco: 6000.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de UPS', preco: 4500.00, tipo: 'servico' },
        { nome: 'Instalação de Sistema de No-Break', preco: 4000.00, tipo: 'servico' },
        { nome: 'Manutenção Preventiva Elétrica (por m²)', preco: 80.00, tipo: 'servico' },
        { nome: 'Manutenção Corretiva Elétrica (por hora)', preco: 120.00, tipo: 'servico' },
        { nome: 'Manutenção de Quadro de Distribuição', preco: 350.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema Solar (por kWp)', preco: 400.00, tipo: 'servico' },
        { nome: 'Manutenção de Inversor Solar', preco: 600.00, tipo: 'servico' },
        { nome: 'Manutenção de Aterramento', preco: 250.00, tipo: 'servico' },
        { nome: 'Manutenção de DPS', preco: 200.00, tipo: 'servico' },
        { nome: 'Manutenção de DR', preco: 250.00, tipo: 'servico' },
        { nome: 'Manutenção de Disjuntores', preco: 150.00, tipo: 'servico' },
        { nome: 'Manutenção de Tomadas', preco: 60.00, tipo: 'servico' },
        { nome: 'Manutenção de Interruptores', preco: 50.00, tipo: 'servico' },
        { nome: 'Manutenção de Lâmpadas', preco: 40.00, tipo: 'servico' },
        { nome: 'Manutenção de Luminárias', preco: 80.00, tipo: 'servico' },
        { nome: 'Manutenção de Sensor de Presença', preco: 120.00, tipo: 'servico' },
        { nome: 'Manutenção de Automação Residencial', preco: 350.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de CFTV', preco: 400.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Alarmes', preco: 350.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Iluminação LED', preco: 300.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Energia Solar', preco: 1000.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Bombeamento Solar', preco: 1500.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Aquecimento Solar', preco: 2000.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Refrigeração', preco: 2500.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Ventilação', preco: 1500.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Ar Condicionado', preco: 2500.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Bombas', preco: 3000.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Geradores', preco: 3500.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de Transformadores', preco: 4000.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de UPS', preco: 3000.00, tipo: 'servico' },
        { nome: 'Manutenção de Sistema de No-Break', preco: 2800.00, tipo: 'servico' },
        { nome: 'Diagnóstico de Falhas Elétricas', preco: 250.00, tipo: 'servico' },
        { nome: 'Análise de Qualidade de Energia', preco: 500.00, tipo: 'servico' },
        { nome: 'Projeto Elétrico Residencial', preco: 800.00, tipo: 'servico' },
        { nome: 'Projeto Elétrico Comercial', preco: 1200.00, tipo: 'servico' },
        { nome: 'Projeto Elétrico Industrial', preco: 2000.00, tipo: 'servico' },
        { nome: 'Projeto de Automação Residencial', preco: 1000.00, tipo: 'servico' },
        { nome: 'Projeto de Automação Industrial', preco: 2500.00, tipo: 'servico' },
        { nome: 'Projeto de Iluminação LED', preco: 1500.00, tipo: 'servico' },
        { nome: 'Projeto de Energia Solar', preco: 3000.00, tipo: 'servico' },
        { nome: 'Projeto de Sistema de CFTV', preco: 1200.00, tipo: 'servico' },
        { nome: 'Projeto de Sistema de Alarmes', preco: 1000.00, tipo: 'servico' },
        { nome: 'Projeto de Sistema de Bombeamento', preco: 2500.00, tipo: 'servico' },
        { nome: 'Projeto de Sistema de Refrigeração', preco: 3500.00, tipo: 'servico' },
        { nome: 'Projeto de Sistema de Ar Condicionado', preco: 4000.00, tipo: 'servico' },
        { nome: 'Projeto de Sistema de Ventilação', preco: 2000.00, tipo: 'servico' },
        { nome: 'Laudo Técnico Elétrico', preco: 800.00, tipo: 'servico' },
        { nome: 'Inspeção Técnica Elétrica', preco: 600.00, tipo: 'servico' },
        { nome: 'Certificação Elétrica', preco: 1000.00, tipo: 'servico' },
        { nome: 'Análise de Risco Elétrico', preco: 700.00, tipo: 'servico' },
        { nome: 'Avaliação de Carga Elétrica', preco: 500.00, tipo: 'servico' },
        { nome: 'Análise de Curto-Circuito', preco: 800.00, tipo: 'servico' },
        { nome: 'Análise de Coordenação de Proteção', preco: 1200.00, tipo: 'servico' },
        { nome: 'Análise de Estabilidade de Tensão', preco: 1000.00, tipo: 'servico' },
        { nome: 'Análise de Harmônicos', preco: 1500.00, tipo: 'servico' },
        { nome: 'Análise de Fator de Potência', preco: 800.00, tipo: 'servico' },
        { nome: 'Correção de Fator de Potência', preco: 1500.00, tipo: 'servico' },
        { nome: 'Balanceamento de Carga', preco: 800.00, tipo: 'servico' },
        { nome: 'Análise de Sistema de Aterramento', preco: 600.00, tipo: 'servico' },
        { nome: 'Análise de Sistema de Proteção', preco: 800.00, tipo: 'servico' },
        { nome: 'Treinamento Técnico Elétrico', preco: 2000.00, tipo: 'servico' },
        { nome: 'Treinamento em Automação', preco: 2500.00, tipo: 'servico' },
        { nome: 'Treinamento em Energia Solar', preco: 3000.00, tipo: 'servico' },
        { nome: 'Treinamento em CFTV', preco: 1500.00, tipo: 'servico' },
        { nome: 'Treinamento em Alarmes', preco: 1200.00, tipo: 'servico' },
        { nome: 'Treinamento em Iluminação LED', preco: 1800.00, tipo: 'servico' },
        { nome: 'Consultoria Técnica Elétrica', preco: 1500.00, tipo: 'servico' },
        { nome: 'Consultoria em Eficiência Energética', preco: 2000.00, tipo: 'servico' },
        { nome: 'Consultoria em Automação', preco: 2500.00, tipo: 'servico' },
        { nome: 'Consultoria em Energia Solar', preco: 3000.00, tipo: 'servico' },
        { nome: 'Consultoria em CFTV', preco: 1800.00, tipo: 'servico' },
        { nome: 'Consultoria em Alarmes', preco: 1500.00, tipo: 'servico' },
        { nome: 'Consultoria em Iluminação LED', preco: 2200.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de Bombas', preco: 2500.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de Refrigeração', preco: 3000.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de Ar Condicionado', preco: 3500.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de Ventilação', preco: 2500.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de Geradores', preco: 3500.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de Transformadores', preco: 4000.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de UPS', preco: 3000.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de No-Break', preco: 2800.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de Aterramento', preco: 2000.00, tipo: 'servico' },
        { nome: 'Consultoria em Sistema de Proteção', preco: 2500.00, tipo: 'servico' },
        { nome: 'Gestão de Manutenção Elétrica', preco: 2000.00, tipo: 'servico' },
        { nome: 'Gestão de Projetos Elétricos', preco: 3000.00, tipo: 'servico' },
        { nome: 'Gestão de Obras Elétricas', preco: 4000.00, tipo: 'servico' },
        { nome: 'Gestão de Equipes Técnicas', preco: 3500.00, tipo: 'servico' },
        { nome: 'Gestão de Fornecedores Elétricos', preco: 2500.00, tipo: 'servico' },
        { nome: 'Gestão de Estoque de Materiais', preco: 2000.00, tipo: 'servico' },
        { nome: 'Gestão de Qualidade Elétrica', preco: 3000.00, tipo: 'servico' },
        { nome: 'Gestão de Segurança Elétrica', preco: 3500.00, tipo: 'servico' },
        { nome: 'Gestão de Treinamento Técnico', preco: 2500.00, tipo: 'servico' },
        { nome: 'Gestão de Documentação Técnica', preco: 2000.00, tipo: 'servico' },
        { nome: 'Supervisão de Obras Elétricas', preco: 3500.00, tipo: 'servico' },
        { nome: 'Supervisão de Instalações Elétricas', preco: 3000.00, tipo: 'servico' },
        { nome: 'Supervisão de Manutenção Elétrica', preco: 2500.00, tipo: 'servico' },
        { nome: 'Supervisão de Equipes Técnicas', preco: 3000.00, tipo: 'servico' },
        { nome: 'Coordenação de Projetos Elétricos', preco: 4000.00, tipo: 'servico' },
        { nome: 'Coordenação de Obras Elétricas', preco: 4500.00, tipo: 'servico' },
        { nome: 'Coordenação de Equipes Técnicas', preco: 3500.00, tipo: 'servico' },
        { nome: 'Coordenação de Fornecedores', preco: 3000.00, tipo: 'servico' },
        { nome: 'Coordenação de Qualidade Elétrica', preco: 4000.00, tipo: 'servico' },
        { nome: 'Coordenação de Segurança Elétrica', preco: 4500.00, tipo: 'servico' },
        { nome: 'Coordenação de Documentação Técnica', preco: 3000.00, tipo: 'servico' },
        { nome: 'Coordenação de Treinamento Técnico', preco: 3500.00, tipo: 'servico' },
        { nome: 'Gerência de Projetos Elétricos', preco: 5000.00, tipo: 'servico' },
        { nome: 'Gerência de Obras Elétricas', preco: 5500.00, tipo: 'servico' },
        { nome: 'Gerência de Manutenção Elétrica', preco: 4500.00, tipo: 'servico' },
        { nome: 'Gerência de Equipes Técnicas', preco: 4000.00, tipo: 'servico' },
        { nome: 'Gerência de Qualidade Elétrica', preco: 5000.00, tipo: 'servico' },
        { nome: 'Gerência de Segurança Elétrica', preco: 5500.00, tipo: 'servico' },
        { nome: 'Gerência de Documentação Técnica', preco: 4000.00, tipo: 'servico' }
    ];
    
    // Gera os produtos com IDs únicos
    materiais.forEach(material => {
        produtos.push({
            id: String(id++),
            nome: material.nome,
            preco: material.preco,
            tipo: material.tipo
        });
    });
    
    console.log(`✅ ${produtos.length} produtos gerados!`);
    return produtos;
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
        if (p) {
            produtos = JSON.parse(p);
            console.log(`📦 ${produtos.length} produtos carregados`);
        } else {
            // Primeira execução - gerar produtos
            produtos = gerarProdutosPara();
            salvarDados();
            console.log(`📦 ${produtos.length} produtos criados!`);
        }
        if (o) ordensServico = JSON.parse(o);
        if (r) recibos = JSON.parse(r);
        
        if (clientes.length === 0) {
            clientes = [
                { id: '1', nome: 'José Castilho', email: 'jose@email.com', telefone: '(93) 98102-7290', cpf: '123.456.789-00', endereco: 'Rua Exemplo, 123 - Belém/PA' },
                { id: '2', nome: 'Maria Santos', email: 'maria@email.com', telefone: '(91) 99999-2222', cpf: '987.654.321-00', endereco: 'Av. Principal, 456 - Ananindeua/PA' }
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
        console.log('✅ Dados salvos com sucesso!');
    } catch(e) { console.log('Erro ao salvar:', e); }
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

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
// CADASTRO DE USUÁRIO (APENAS ADMIN)
// ============================================
function mostrarCadastroUsuario() {
    // Verifica se é admin
    if (!usuarioAtual || usuarioAtual.tipo !== 'admin') {
        alert('⚠️ Apenas administradores podem cadastrar usuários!');
        return;
    }
    
    console.log('📝 Abrindo cadastro de usuário');
    const modal = document.getElementById('modalCadastroUsuario');
    if (modal) modal.style.display = 'flex';
}

function salvarNovoUsuario() {
    // Verifica se é admin
    if (!usuarioAtual || usuarioAtual.tipo !== 'admin') {
        alert('⚠️ Apenas administradores podem cadastrar usuários!');
        return;
    }
    
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
    registrarLog('USUARIO_CADASTRADO', `Usuário "${nome}" (${login}) cadastrado por ${usuarioAtual?.nome}`);
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
        registrarLog('USUARIO_EXCLUIDO', `Usuário "${login}" excluído por ${usuarioAtual?.nome}`);
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
// INICIALIZAÇÃO
// ============================================
function init() {
    console.log('🚀 Inicializando sistema...');
    carregarUsuarios();
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