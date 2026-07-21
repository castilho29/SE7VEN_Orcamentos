// ============================================
// SISTEMA SE7VEN ENERGIA - COMPLETO
// ============================================

console.log('⚡ Carregando sistema...');

// ============================================
// CARREGAR CONFIGURAÇÕES
// ============================================
const CFG = window.CONFIG || {};
if (!CFG.SUPABASE) {
    CFG.SUPABASE = { url: 'https://aqxrogqjeaxbckfxwbtt.supabase.co', publicKey: '' };
}

const SUPABASE_URL = CFG.SUPABASE.url;
const SUPABASE_PUBLIC_KEY = CFG.SUPABASE.publicKey;

// ============================================
// CLIENTE ÚNICO DO SUPABASE (só chave pública)
// A segurança agora vem do login real (Supabase Auth) + regras RLS no banco,
// não de uma chave secreta escondida no navegador (isso nunca foi seguro).
// ============================================
let sb = null;
try {
    if (SUPABASE_PUBLIC_KEY) {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
        console.log('✅ Supabase conectado!');
    } else {
        console.warn('⚠️ Chave pública do Supabase não configurada em config.js!');
    }
} catch (e) {
    console.warn('⚠️ Erro ao conectar Supabase:', e.message);
}

// ============================================
// DADOS DA EMPRESA
// ============================================
const EMPRESA = {
    nome: 'SE7VEN SOLUÇÕES ENERGÉTICAS',
    nomeAbreviado: 'SE7VEN',
    telefone: '(93) 98102-7290',
    whatsapp: '5593981027290',
    email: 'se7venenergia@gmail.com',
    instagram: '@se7venenergia',
    cnpj: '62.008.856/0001-60',
    endereco: 'Rua Dourados, 626 - Novo Progresso/PA',
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
let usuarioAtual = null;      // { id, nome, tipo, email }
let modoCadastro = false;     // tela de login: false = entrar, true = criar conta
let clientes = [];
let produtos = [];
let ordensServico = [];
let recibos = [];
let logs = [];
let perfis = [];              // lista de usuários (tabela profiles)
let syncTimeout = null;
let realtimeChannel = null;
let osAtual = null;
let reciboAtual = null;
let editandoOSId = null;
let despesas = [];
let visitas = [];
let paginaClientes = 0;
let paginaProdutos = 0;
const ITENS_POR_PAGINA = 20;
let sincronizando = false;
let ultimaSync = null;

// Tabela de ampacidade de cabos de cobre (A) por bitola (mm²) - referência prática
const TABELA_AMPACIDADE = {1.5:15.5,2.5:21,4:28,6:36,10:50,16:68,25:89,35:111,50:134,70:171,95:207,120:239,150:275,185:314,240:370};
const RESISTIVIDADE_COBRE = 0.0178; // Ω·mm²/m (aprox., referência prática)

// ============================================
// AUTENTICAÇÃO (SUPABASE AUTH)
// ============================================

function alternarModoCadastro() {
    modoCadastro = !modoCadastro;
    document.getElementById('loginNome').style.display = modoCadastro ? 'block' : 'none';
    document.getElementById('btnEntrar').textContent = modoCadastro ? '✨ Criar conta' : '🔑 Entrar';
    document.getElementById('btnAlternarCadastro').textContent = modoCadastro ? 'Já tenho conta, entrar' : 'Não tem conta? Criar uma agora';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginSucesso').style.display = 'none';
}

async function fazerLogin() {
    if (!sb) { alert('⚠️ Supabase não está configurado (veja config.js).'); return; }
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const nome = document.getElementById('loginNome').value.trim();
    const errorEl = document.getElementById('loginError');
    const sucessoEl = document.getElementById('loginSucesso');
    errorEl.style.display = 'none';
    sucessoEl.style.display = 'none';

    if (!email || !senha) { errorEl.textContent = '❌ Preencha e-mail e senha!'; errorEl.style.display = 'block'; return; }
    if (modoCadastro && !nome) { errorEl.textContent = '❌ Informe seu nome!'; errorEl.style.display = 'block'; return; }

    if (modoCadastro) {
        const { data, error } = await sb.auth.signUp({
            email, password: senha, options: { data: { nome } }
        });
        if (error) { errorEl.textContent = '❌ ' + error.message; errorEl.style.display = 'block'; return; }
        if (data.session) {
            // Login automático (confirmação de e-mail desativada no projeto)
            await entrarNoSistema(data.user);
        } else {
            // Volta para o modo "login" manualmente, sem apagar a mensagem de sucesso
            modoCadastro = false;
            document.getElementById('loginNome').style.display = 'none';
            document.getElementById('btnEntrar').textContent = '🔑 Entrar';
            document.getElementById('btnAlternarCadastro').textContent = 'Não tem conta? Criar uma agora';
            sucessoEl.textContent = '✅ Conta criada! Verifique seu e-mail para confirmar e depois faça login.';
            sucessoEl.style.display = 'block';
        }
        return;
    }

    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
        errorEl.textContent = '❌ E-mail ou senha incorretos!';
        errorEl.style.display = 'block';
    }
    // Sucesso: onAuthStateChange cuida de entrar no sistema
}

async function loginGoogle() {
    if (!sb) { alert('⚠️ Supabase não está configurado.'); return; }
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
    });
    if (error) alert('❌ Erro ao entrar com Google: ' + error.message +
        '\n\n(Verifique se o provedor Google está habilitado em Supabase → Authentication → Providers)');
}

async function fazerLogout() {
    if (syncTimeout) { clearInterval(syncTimeout); syncTimeout = null; }
    if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
    if (sb) await sb.auth.signOut();
    usuarioAtual = null;
    mostrarTelaLogin();
}

function mostrarTelaLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('sistemaScreen').style.display = 'none';
    document.getElementById('pendingScreen').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginSenha').value = '';
}

function souAdmin() { return usuarioAtual?.tipo === 'admin'; }

async function garantirPerfil(user) {
    // Cria a linha em "profiles" na primeira vez que o usuário loga de verdade.
    // Novo cadastro entra como "pendente" — só passa a usar o sistema depois
    // que um administrador aprovar (aba Usuários).
    const { data: existente } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (existente) return existente;
    const nome = user.user_metadata?.nome || user.email;
    const { data: criado, error } = await sb.from('profiles')
        .insert({ id: user.id, nome, tipo: 'pendente' })
        .select().single();
    if (error) { console.warn('Não foi possível criar o perfil:', error.message); return { id: user.id, nome, tipo: 'pendente' }; }
    return criado;
}

async function entrarNoSistema(user) {
    const perfil = await garantirPerfil(user);
    usuarioAtual = { id: user.id, email: user.email, nome: perfil.nome, tipo: perfil.tipo };

    if (perfil.tipo === 'pendente') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('sistemaScreen').style.display = 'none';
        document.getElementById('pendingScreen').style.display = 'flex';
        return;
    }

    document.getElementById('pendingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sistemaScreen').style.display = 'block';
    document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
    atualizarStatus(`✅ Bem-vindo, ${usuarioAtual.nome}!`);
    registrarLog('LOGIN', `${usuarioAtual.nome} entrou no sistema`);
    init();
}

// ============================================
// SINCRONIZAÇÃO
// ============================================

async function carregarClientesSupabase() {
    const { data, error } = await sb.from('clientes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    clientes = data || [];
    renderClientes();
    renderSelectClientes();
}

async function carregarProdutosSupabase() {
    const { data, error } = await sb.from('produtos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    produtos = data || [];
    renderProdutos();
    renderSelectProdutos();
}

async function carregarOSSupabase() {
    const { data, error } = await sb.from('ordens_servico').select('*').order('data_criacao', { ascending: false });
    if (error) throw error;
    ordensServico = data || [];
    listarOS();
}

async function carregarRecibosSupabase() {
    const { data, error } = await sb.from('recibos').select('*').order('data_emissao', { ascending: false });
    if (error) throw error;
    recibos = data || [];
    listarRecibos();
}

async function carregarPerfisSupabase() {
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    perfis = data || [];
    listarUsuarios();
}

async function carregarLogsSupabase() {
    const { data, error } = await sb.from('logs').select('*').order('data', { ascending: false }).limit(200);
    if (error) throw error;
    logs = data || [];
    renderizarLogs();
}

async function sincronizarDados() {
    if (!sb) return;
    if (sincronizando) { console.log('⏳ Sincronização em andamento...'); return; }
    sincronizando = true;
    const statusElement = document.getElementById('syncStatus');
    const progressElement = document.getElementById('syncProgress');
    const ultimaSyncElement = document.getElementById('ultimaSync');
    try {
        statusElement.textContent = '🔄 Sincronizando...';
        statusElement.className = 'status sincronizando';
        progressElement.style.display = 'block';
        progressElement.textContent = '⏳ Conectando ao banco de dados...';

        await Promise.all([
            carregarClientesSupabase(),
            carregarProdutosSupabase(),
            carregarOSSupabase(),
            carregarRecibosSupabase(),
            carregarPerfisSupabase(),
            carregarLogsSupabase(),
            carregarDespesasSupabase(),
            carregarVisitasSupabase()
        ]);

        await semearProdutosPadrao();
        atualizarDashboard();

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
    } finally {
        sincronizando = false;
    }
}

function iniciarSincronizacaoAutomatica() {
    if (!sb) return;
    sincronizarDados();

    // Sincronização em tempo real: qualquer alteração feita em outro dispositivo
    // chega aqui na hora, sem precisar recarregar a página.
    realtimeChannel = sb.channel('se7ven-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recibos' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'despesas' }, () => sincronizarDados())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visitas' }, () => sincronizarDados())
        .subscribe();

    // Rede de segurança: sincroniza a cada 60s mesmo que o realtime perca algum evento
    if (syncTimeout) clearInterval(syncTimeout);
    syncTimeout = setInterval(sincronizarDados, 60000);
    console.log('✅ Sincronização automática (tempo real + reforço a cada 60s) ativada');
}

async function semearProdutosPadrao() {
    // Só roda uma vez: se a tabela de produtos estiver vazia, cadastra o catálogo padrão.
    // Usa IDs fixos (1,2,3...) então rodar de novo nunca duplica.
    if (produtos.length > 0) return;
    const catalogo = gerarProdutos();
    try {
        const { error } = await sb.from('produtos').upsert(catalogo, { onConflict: 'id' });
        if (error) throw error;
        await carregarProdutosSupabase();
        console.log(`📦 ${catalogo.length} produtos padrão cadastrados!`);
    } catch (e) {
        console.warn('Não foi possível semear produtos padrão:', e.message);
    }
}

// ============================================
// LEITOR DE CÓDIGO DE BARRAS (câmera do celular)
// Não existe base pública/gratuita de nome+preço por código de barras
// (diferente do CNPJ, que é registro público). O que dá pra automatizar
// de verdade é a LEITURA do código e o reconhecimento dentro do seu
// próprio catálogo já cadastrado.
// ============================================

let scannerStream = null;
let scannerAtivo = false;

async function abrirScanner(aoDetectar) {
    if (!('BarcodeDetector' in window)) {
        alert('⚠️ Seu navegador não suporta leitura de código de barras pela câmera (funciona no Chrome/Android). Digite o código manualmente.');
        return;
    }
    const video = document.getElementById('videoScanner');
    const statusEl = document.getElementById('scannerStatus');
    try {
        scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = scannerStream;
        abrirModal('modalScanner');
        statusEl.textContent = 'Aponte a câmera para o código de barras';
        scannerAtivo = true;

        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
        const loop = async () => {
            if (!scannerAtivo) return;
            try {
                const codigos = await detector.detect(video);
                if (codigos.length > 0) {
                    const valor = codigos[0].rawValue;
                    statusEl.textContent = `✅ Código lido: ${valor}`;
                    fecharScanner();
                    aoDetectar(valor);
                    return;
                }
            } catch (e) { /* frame sem leitura, ignora e tenta o próximo */ }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    } catch (e) {
        alert('❌ Não foi possível acessar a câmera. Verifique se você permitiu o acesso.');
        fecharScanner();
    }
}

function fecharScanner() {
    scannerAtivo = false;
    if (scannerStream) {
        scannerStream.getTracks().forEach(t => t.stop());
        scannerStream = null;
    }
    fecharModal('modalScanner');
}

function escanearParaProduto() {
    abrirScanner((codigo) => {
        const existente = produtos.findIndex(p => p.codigo_barras === codigo);
        if (existente >= 0) {
            atualizarStatus(`✅ Produto encontrado: ${produtos[existente].nome}`);
            editarProduto(existente);
        } else {
            atualizarStatus('ℹ️ Código novo — complete o cadastro do produto');
            document.querySelector('#modalProduto h3').textContent = '📦 Novo Produto';
            document.getElementById('nomeProduto').value = '';
            document.getElementById('precoProduto').value = '';
            document.getElementById('tipoProduto').value = 'material';
            document.getElementById('codigoBarrasProduto').value = codigo;
            abrirModal('modalProduto');
            document.getElementById('nomeProduto').focus();
        }
    });
}

function escanearParaModalProduto() {
    abrirScanner((codigo) => {
        document.getElementById('codigoBarrasProduto').value = codigo;
    });
}

// ============================================
// BUSCA DE CNPJ (dados públicos da Receita Federal via BrasilAPI)
// Só funciona para CNPJ. CPF não tem base pública/legal para consulta
// de nome e endereço — dado pessoal protegido pela LGPD.
// ============================================

async function buscarCNPJ() {
    const valor = document.getElementById('cpfCliente').value.replace(/\D/g, '');
    if (valor.length !== 14) {
        alert('⚠️ Digite um CNPJ completo (14 números) nesse campo para buscar.\n\nBusca automática só funciona para CNPJ — não existe base pública para consultar nome/endereço por CPF.');
        return;
    }
    atualizarStatus('🔍 Buscando dados do CNPJ...');
    try {
        const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${valor}`);
        if (!resp.ok) throw new Error('CNPJ não encontrado');
        const dados = await resp.json();

        const nomeAtual = document.getElementById('nomeCliente').value.trim();
        const nomeEncontrado = dados.razao_social || dados.nome_fantasia || '';
        if (nomeEncontrado && (!nomeAtual || confirm(`Preencher nome como "${nomeEncontrado}"?`))) {
            document.getElementById('nomeCliente').value = nomeEncontrado;
        }

        const partesEndereco = [dados.logradouro, dados.numero, dados.bairro].filter(Boolean).join(', ');
        const cidadeUf = dados.municipio ? ` - ${dados.municipio}/${dados.uf}` : '';
        document.getElementById('enderecoCliente').value = (partesEndereco + cidadeUf).trim();

        if (dados.ddd_telefone_1 && !document.getElementById('telefoneCliente').value.trim()) {
            document.getElementById('telefoneCliente').value = dados.ddd_telefone_1;
        }
        if (dados.email && !document.getElementById('emailCliente').value.trim()) {
            document.getElementById('emailCliente').value = dados.email;
        }
        atualizarStatus('✅ Dados do CNPJ preenchidos!');
    } catch (e) {
        atualizarStatus('❌ CNPJ não encontrado', 'error');
        alert('❌ Não encontramos esse CNPJ na Receita Federal. Confira os números e tente de novo.');
    }
}

// ============================================
// CLIENTES
// ============================================

let filtroClientes = '';

function renderClientes() {
    const lista = document.getElementById('listaClientes');
    if (!lista) return;
    const filtrados = filtroClientes
        ? clientes.filter(c => `${c.nome} ${c.telefone || ''} ${c.email || ''}`.toLowerCase().includes(filtroClientes))
        : clientes;
    if (filtrados.length === 0) {
        lista.innerHTML = `<li style="color:#999;text-align:center;padding:20px;">${clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}</li>`;
        atualizarControlesPaginacao('Clientes', 0, 0);
        return;
    }
    const inicio = paginaClientes * ITENS_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + ITENS_POR_PAGINA);
    lista.innerHTML = pagina.map((c) => {
        const i = clientes.fin