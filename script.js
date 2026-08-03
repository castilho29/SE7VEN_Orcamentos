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
// Versão do app — atualizar a cada rodada de ajustes importante
const APP_VERSAO = '2.5.0';

// Logo da empresa: começa com o arquivo padrão do repositório, mas pode ser
// trocada pelo admin (fica então guardada no Supabase Storage).
let LOGO_URL = 'logo.png';

// Juros de mora e multa por atraso (crediário próprio) — configuráveis na aba Config.
let CONFIG_FINANCEIRO = {
    jurosMoraMensal: 2,  // % ao mês
    multaAtraso: 2       // % fixo, uma vez
};

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

// Tabela de ampacidade de cabos de cobre (A) por bitola (mm²)
// Fonte: ABNT NBR 5410:2004, Tabela 36 — condutores de cobre, isolação PVC,
// método de referência B1 (eletroduto aparente ou embutido em alvenaria),
// temperatura ambiente de 30°C. "mono" = 2 condutores carregados
// (circuitos monofásicos/bifásicos), "tri" = 3 condutores carregados
// (circuitos trifásicos). É a referência mais usada no dia a dia; outros
// métodos de instalação (enterrado, bandeja, etc.) têm capacidades diferentes
// e não estão contemplados aqui.
const TABELA_AMPACIDADE = {
    1.5:  { mono: 17.5, tri: 15.5 },
    2.5:  { mono: 24,   tri: 21 },
    4:    { mono: 32,   tri: 28 },
    6:    { mono: 41,   tri: 36 },
    10:   { mono: 57,   tri: 50 },
    16:   { mono: 76,   tri: 68 },
    25:   { mono: 101,  tri: 89 },
    35:   { mono: 125,  tri: 110 },
    50:   { mono: 151,  tri: 134 },
    70:   { mono: 192,  tri: 171 },
    95:   { mono: 232,  tri: 207 },
    120:  { mono: 269,  tri: 239 },
    150:  { mono: 309,  tri: 275 },
    185:  { mono: 353,  tri: 314 },
    240:  { mono: 415,  tri: 370 },
    300:  { mono: 477,  tri: 426 },
    400:  { mono: 571,  tri: 510 },
    500:  { mono: 656,  tri: 587 }
};
const RESISTIVIDADE_COBRE = 0.0178; // Ω·mm²/m a 20°C (referência usual para queda de tensão)

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

    if (!navigator.onLine) {
        errorEl.textContent = '📴 Sem internet — não é possível entrar agora. Conecte-se e tente de novo. (Se você não chegou a sair do app antes, não precisa fazer login de novo — é só reabrir.)';
        errorEl.style.display = 'block';
        return;
    }

    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
        if (error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network')) {
            errorEl.textContent = '📴 Não foi possível conectar ao servidor — verifique sua internet e tente de novo.';
        } else {
            errorEl.textContent = '❌ E-mail ou senha incorretos!';
        }
        errorEl.style.display = 'block';
    }
    // Sucesso: onAuthStateChange cuida de entrar no sistema
}

async function fazerLogout() {
    if (syncTimeout) { clearInterval(syncTimeout); syncTimeout = null; }
    if (window.__lembretesVisitasInterval) { clearInterval(window.__lembretesVisitasInterval); window.__lembretesVisitasInterval = null; }
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
// MODO OFFLINE
// ============================================
// Duas partes: 1) guarda uma cópia dos dados no localStorage pra dar pra
// CONSULTAR mesmo sem internet; 2) enfileira alterações feitas sem internet
// (clientes, produtos e orçamentos) e manda pro Supabase assim que a conexão
// voltar.

const CHAVE_CACHE_OFFLINE = 'se7ven_cache_dados';
const CHAVE_FILA_OFFLINE = 'se7ven_fila_offline';

function salvarCacheOffline() {
    try {
        const pacote = { clientes, produtos, ordensServico, recibos, despesas, visitas, perfis, salvoEm: new Date().toISOString() };
        localStorage.setItem(CHAVE_CACHE_OFFLINE, JSON.stringify(pacote));
    } catch (e) { console.warn('Não foi possível salvar o cache offline:', e.message); }
}

function carregarCacheOffline() {
    try {
        const bruto = localStorage.getItem(CHAVE_CACHE_OFFLINE);
        if (!bruto) return null;
        const pacote = JSON.parse(bruto);
        clientes = pacote.clientes || [];
        produtos = pacote.produtos || [];
        ordensServico = pacote.ordensServico || [];
        recibos = pacote.recibos || [];
        despesas = pacote.despesas || [];
        visitas = pacote.visitas || [];
        perfis = pacote.perfis || [];
        return pacote.salvoEm || null;
    } catch (e) { return null; }
}

function mostrarBannerOffline(salvoEm) {
    const el = document.getElementById('bannerOffline');
    if (!el) return;
    if (!salvoEm) { el.style.display = 'none'; return; }
    const dataFmt = new Date(salvoEm).toLocaleString('pt-BR');
    el.style.display = 'block';
    el.textContent = `📴 Sem internet — mostrando dados salvos em ${dataFmt}. O que você alterar agora entra na fila e sincroniza sozinho quando a conexão voltar.`;
}
function esconderBannerOffline() {
    const el = document.getElementById('bannerOffline');
    if (el) el.style.display = 'none';
}

function pegarFilaOffline() {
    try { return JSON.parse(localStorage.getItem(CHAVE_FILA_OFFLINE) || '[]'); } catch (e) { return []; }
}
function definirFilaOffline(fila) {
    try { localStorage.setItem(CHAVE_FILA_OFFLINE, JSON.stringify(fila)); } catch (e) {}
    atualizarIndicadorFilaOffline();
}
function adicionarNaFilaOffline(tabela, registro) {
    const fila = pegarFilaOffline();
    fila.push({ tabela, registro, criadoEm: new Date().toISOString() });
    definirFilaOffline(fila);
}
function atualizarIndicadorFilaOffline() {
    const el = document.getElementById('indicadorFilaOffline');
    if (!el) return;
    const fila = pegarFilaOffline();
    if (fila.length === 0) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.textContent = `⏳ ${fila.length} alteração(ões) salva(s) neste aparelho, aguardando internet para sincronizar.`;
}

// Salva ou atualiza um registro com suporte offline: tenta enviar pro Supabase
// e, se não conseguir por falta de conexão, guarda na fila local pra tentar
// depois — sem travar o uso do sistema.
async function upsertComOffline(tabela, registro) {
    if (!navigator.onLine || !sb) {
        adicionarNaFilaOffline(tabela, registro);
        return { offline: true };
    }
    try {
        const { error } = await sb.from(tabela).upsert(registro, { onConflict: 'id' });
        if (error) throw error;
        return { offline: false };
    } catch (e) {
        // Erro de rede (sem conexão de verdade) cai aqui também — trata como offline.
        adicionarNaFilaOffline(tabela, registro);
        return { offline: true };
    }
}

async function sincronizarFilaOffline() {
    const fila = pegarFilaOffline();
    if (!fila.length || !sb || !navigator.onLine) return;
    const restantes = [];
    let sucesso = 0;
    for (const item of fila) {
        try {
            const { error } = await sb.from(item.tabela).upsert(item.registro, { onConflict: 'id' });
            if (error) throw error;
            sucesso++;
        } catch (e) {
            restantes.push(item);
        }
    }
    definirFilaOffline(restantes);
    if (sucesso > 0) {
        atualizarStatus(`☁️ ${sucesso} alteração(ões) feita(s) offline foram sincronizadas!`);
        registrarLog('SYNC_OFFLINE', `${sucesso} alteração(ões) pendente(s) sincronizada(s)`);
        sincronizarDados();
    }
}

window.addEventListener('online', () => {
    esconderBannerOffline();
    atualizarStatus('🌐 Conexão de volta! Sincronizando...');
    sincronizarFilaOffline();
    sincronizarDados();
});
window.addEventListener('offline', () => {
    atualizarStatus('📴 Sem internet — você ainda pode consultar e lançar dados; sincroniza sozinho quando a conexão voltar.');
});

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
        esconderBannerOffline();
        salvarCacheOffline();
        sincronizarFilaOffline();
        console.log('✅ Sincronização completa!');
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        const salvoEm = carregarCacheOffline();
        if (salvoEm) {
            renderClientes(); renderSelectClientes();
            renderProdutos(); renderSelectProdutos();
            listarOS(); listarRecibos(); listarDespesas(); listarVisitas();
            listarUsuarios(); atualizarDashboard(); atualizarEstatisticas();
            statusElement.textContent = '📴 Offline (usando dados salvos)';
            statusElement.className = 'status offline';
            progressElement.style.display = 'none';
            mostrarBannerOffline(salvoEm);
        } else {
            statusElement.textContent = '❌ Erro: ' + error.message;
            statusElement.className = 'status offline';
            progressElement.textContent = '❌ ' + error.message;
            progressElement.style.display = 'block';
        }
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
        const i = clientes.findIndex(x => x.id === c.id);
        return `
        <li>
            <span>
                <strong>${c.nome}</strong>
                ${c.telefone ? `<br><small>📱 ${c.telefone}</small>` : ''}
                ${c.email ? `<br><small>✉️ ${c.email}</small>` : ''}
                ${c.observacoes ? `<br><small>📝 ${c.observacoes}</small>` : ''}
            </span>
            <div style="display:flex;gap:5px;">
                <button onclick="abrirHistoricoCliente('${c.id}')" class="btn-secondary" style="padding:4px 8px;">📋</button>
                ${souAdmin() ? `
                    <button onclick="editarCliente(${i})" class="btn-secondary" style="padding:4px 8px;">✏️</button>
                    <button onclick="excluirCliente(${i})" class="btn-secondary" style="padding:4px 8px;">🗑️</button>
                ` : ''}
            </div>
        </li>
    `; }).join('');
    atualizarControlesPaginacao('Clientes', paginaClientes, filtrados.length);
}

function atualizarControlesPaginacao(sufixo, pagina, total) {
    const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
    const infoEl = document.getElementById(`infoPag${sufixo}`);
    const btnAnterior = document.getElementById(`btnPagAnterior${sufixo}`);
    const btnProxima = document.getElementById(`btnPagProxima${sufixo}`);
    if (infoEl) infoEl.textContent = total > 0 ? `Página ${pagina + 1} de ${totalPaginas}` : '';
    if (btnAnterior) btnAnterior.disabled = pagina <= 0;
    if (btnProxima) btnProxima.disabled = pagina >= totalPaginas - 1;
}

function paginaAnteriorClientes() { if (paginaClientes > 0) { paginaClientes--; renderClientes(); } }
function paginaProximaClientes() {
    const totalPaginas = Math.max(1, Math.ceil(clientes.length / ITENS_POR_PAGINA));
    if (paginaClientes < totalPaginas - 1) { paginaClientes++; renderClientes(); }
}
function paginaAnteriorProdutos() { if (paginaProdutos > 0) { paginaProdutos--; renderProdutos(); } }
function paginaProximaProdutos() {
    const totalPaginas = Math.max(1, Math.ceil(produtos.length / ITENS_POR_PAGINA));
    if (paginaProdutos < totalPaginas - 1) { paginaProdutos++; renderProdutos(); }
}

async function adicionarCliente() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
    const novoCliente = {
        id: gerarId(), nome, telefone,
        email: document.getElementById('emailCliente').value.trim() || '',
        cpf: document.getElementById('cpfCliente').value.trim() || '',
        endereco: document.getElementById('enderecoCliente').value.trim() || '',
        observacoes: document.getElementById('observacoesCliente').value.trim() || ''
    };
    try {
        const resultado = await upsertComOffline('clientes', novoCliente);
        clientes.push(novoCliente);
        document.getElementById('nomeCliente').value = '';
        document.getElementById('telefoneCliente').value = '';
        document.getElementById('cpfCliente').value = '';
        document.getElementById('enderecoCliente').value = '';
        document.getElementById('emailCliente').value = '';
        document.getElementById('observacoesCliente').value = '';
        fecharModal('modalCliente');
        renderClientes();
        renderSelectClientes();
        atualizarStatus(resultado.offline ? `📴 Cliente "${nome}" salvo neste aparelho — sincroniza quando a internet voltar` : `✅ Cliente "${nome}" cadastrado!`);
        registrarLog('CLIENTE_ADICIONADO', `Cliente "${nome}" adicionado`);
    } catch (e) {
        alert('❌ Erro ao salvar cliente: ' + e.message);
    }
}

async function excluirCliente(index) {
    const cliente = clientes[index];
    if (!cliente) return;
    if (!confirm(`Excluir "${cliente.nome}"?`)) return;
    try {
        const { error } = await sb.from('clientes').delete().eq('id', cliente.id);
        if (error) throw error;
        clientes.splice(index, 1);
        renderClientes();
        renderSelectClientes();
        atualizarStatus(`🗑️ Cliente "${cliente.nome}" removido`);
        registrarLog('CLIENTE_EXCLUIDO', `Cliente "${cliente.nome}" excluído`);
    } catch (e) {
        alert('❌ Erro ao excluir cliente: ' + e.message);
    }
}

function editarCliente(index) {
    const c = clientes[index];
    if (!c) { alert('⚠️ Não encontrei esse cliente — a lista pode ter sido atualizada. Tente de novo.'); return; }
    document.getElementById('nomeCliente').value = c.nome;
    document.getElementById('telefoneCliente').value = c.telefone || '';
    document.getElementById('cpfCliente').value = c.cpf || '';
    document.getElementById('enderecoCliente').value = c.endereco || '';
    document.getElementById('emailCliente').value = c.email || '';
    document.getElementById('observacoesCliente').value = c.observacoes || '';
    document.querySelector('#modalCliente h3').textContent = '✏️ Editar Cliente';
    const btn = document.getElementById('salvarCliente');
    btn.textContent = '💾 Atualizar';
    btn.dataset.id = c.id;
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener('click', async function () {
        const idCliente = this.dataset.id;
        const clienteOriginal = clientes.find(x => x.id === idCliente);
        if (!clienteOriginal) { alert('⚠️ Esse cliente não existe mais (foi removido em outro dispositivo).'); fecharModal('modalCliente'); renderClientes(); return; }
        const nome = document.getElementById('nomeCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();
        const cpf = document.getElementById('cpfCliente').value.trim();
        const endereco = document.getElementById('enderecoCliente').value.trim();
        const email = document.getElementById('emailCliente').value.trim();
        const observacoes = document.getElementById('observacoesCliente').value.trim();
        if (!nome) { alert('⚠️ Nome é obrigatório'); return; }
        const clienteAtualizado = { ...clienteOriginal, nome, telefone, cpf, endereco, email, observacoes };
        try {
            const resultado = await upsertComOffline('clientes', clienteAtualizado);
            const idx = clientes.findIndex(x => x.id === idCliente);
            if (idx >= 0) clientes[idx] = clienteAtualizado;
            document.getElementById('nomeCliente').value = '';
            document.getElementById('telefoneCliente').value = '';
            document.getElementById('cpfCliente').value = '';
            document.getElementById('enderecoCliente').value = '';
            document.getElementById('emailCliente').value = '';
            document.getElementById('observacoesCliente').value = '';
            document.querySelector('#modalCliente h3').textContent = '👤 Novo Cliente';
            this.textContent = 'Salvar';
            this.dataset.id = '';
            fecharModal('modalCliente');
            renderClientes();
            renderSelectClientes();
            atualizarStatus(resultado.offline ? `📴 Cliente "${nome}" salvo neste aparelho — sincroniza quando a internet voltar` : `✅ Cliente "${nome}" atualizado!`);
            registrarLog('CLIENTE_EDITADO', `Cliente "${nome}" editado`);
        } catch (e) {
            alert('❌ Erro ao atualizar cliente: ' + e.message);
        }
    });
    abrirModal('modalCliente');
}

function renderSelectClientes() {
    const sel = document.getElementById('selCliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione um cliente</option>' +
        clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    renderSelectClienteVisita();
}

// ============================================
// PRODUTOS
// ============================================

let filtroProdutos = '';

function renderProdutos() {
    const lista = document.getElementById('listaProdutos');
    if (!lista) return;
    const filtrados = filtroProdutos
        ? produtos.filter(p => `${p.nome} ${p.codigo_barras || ''}`.toLowerCase().includes(filtroProdutos))
        : produtos;
    if (filtrados.length === 0) {
        lista.innerHTML = `<li style="color:#999;text-align:center;padding:20px;">${produtos.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}</li>`;
        atualizarControlesPaginacao('Produtos', 0, 0);
        return;
    }
    const inicio = paginaProdutos * ITENS_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + ITENS_POR_PAGINA);
    lista.innerHTML = pagina.map((p) => {
        const i = produtos.findIndex(x => x.id === p.id);
        const temEstoque = p.quantidade !== null && p.quantidade !== undefined;
        const estoqueBaixo = temEstoque && p.estoque_minimo !== null && p.estoque_minimo !== undefined && Number(p.quantidade) <= Number(p.estoque_minimo);
        return `
        <li>
            <span style="display:flex;gap:10px;align-items:center;">
                ${p.foto_url ? `<img src="${p.foto_url}" style="width:44px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0;">` : ''}
                <span>
                    <strong>${p.nome}</strong>
                    <br><small>R$ ${Number(p.preco).toFixed(2)} / ${p.unidade || 'un'}</small>
                    <br><small>📂 ${p.tipo || 'outro'} ${p.nota_fiscal === false ? '· 🚫 sem nota' : '· 🧾 com nota'}</small>
                    ${p.codigo_barras ? `<br><small>🔢 ${p.codigo_barras}</small>` : ''}
                    ${temEstoque ? `<br><small class="${estoqueBaixo ? 'estoque-baixo' : ''}">📦 Estoque: ${p.quantidade} ${p.unidade || 'un'}${estoqueBaixo ? ' ⚠️ baixo!' : ''}</small>` : ''}
                </span>
            </span>
            <div style="display:flex;gap:5px;">
                <button onclick="enviarProdutoWhatsApp('${p.id}')" class="btn-whatsapp" style="padding:4px 8px;">💬</button>
                ${souAdmin() ? `
                    <button onclick="editarProduto(${i})" class="btn-secondary" style="padding:4px 8px;">✏️</button>
                    <button onclick="excluirProduto(${i})" class="btn-secondary" style="padding:4px 8px;">🗑️</button>
                ` : ''}
            </div>
        </li>
    `; }).join('');
    atualizarControlesPaginacao('Produtos', paginaProdutos, filtrados.length);
}

function comprimirImagem(arquivo, maxLado = 800, qualidade = 0.72) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(arquivo);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > height && width > maxLado) { height = Math.round(height * (maxLado / width)); width = maxLado; }
            else if (height > maxLado) { width = Math.round(width * (maxLado / height)); height = maxLado; }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem')), 'image/jpeg', qualidade);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem')); };
        img.src = url;
    });
}

async function enviarFotoProduto(idProduto, arquivo) {
    if (!arquivo) return null;
    const comprimida = await comprimirImagem(arquivo);
    const caminho = `${idProduto}.jpg`; // extensão sempre igual: trocar a foto sobrescreve, não deixa lixo
    const { error } = await sb.storage.from('produtos').upload(caminho, comprimida, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    const { data } = sb.storage.from('produtos').getPublicUrl(caminho);
    return data.publicUrl + '?t=' + Date.now(); // evita cache de imagem antiga
}

async function removerFotoProduto(idProduto) {
    try { await sb.storage.from('produtos').remove([`${idProduto}.jpg`]); } catch (e) { /* sem problema se não existir */ }
}

async function adicionarProduto() {
    const nome = document.getElementById('nomeProduto').value.trim();
    const preco = parseFloat(document.getElementById('precoProduto').value);
    const tipo = document.getElementById('tipoProduto').value;
    const unidade = document.getElementById('unidadeProduto').value;
    const notaFiscal = document.getElementById('notaFiscalProduto').checked;
    const descricao = document.getElementById('descricaoProduto').value.trim();
    const codigoBarras = document.getElementById('codigoBarrasProduto').value.trim();
    const quantidadeVal = document.getElementById('quantidadeProduto').value;
    const estoqueMinimoVal = document.getElementById('estoqueMinimoProduto').value;
    const arquivoFoto = document.getElementById('fotoProduto').files[0];
    if (!nome || isNaN(preco) || preco <= 0) { alert('⚠️ Nome e preço válido são obrigatórios'); return; }
    const novoProduto = {
        id: gerarId(), nome, preco, tipo, unidade, nota_fiscal: notaFiscal,
        descricao: descricao || null, codigo_barras: codigoBarras || null, foto_url: null,
        quantidade: quantidadeVal !== '' ? parseFloat(quantidadeVal) : null,
        estoque_minimo: estoqueMinimoVal !== '' ? parseFloat(estoqueMinimoVal) : null
    };
    try {
        let fotoAdiada = false;
        if (arquivoFoto) {
            if (navigator.onLine) {
                atualizarStatus('📸 Enviando foto...');
                novoProduto.foto_url = await enviarFotoProduto(novoProduto.id, arquivoFoto);
            } else {
                fotoAdiada = true; // sem internet não dá pra subir a foto agora — o produto é salvo sem ela
            }
        }
        const resultado = await upsertComOffline('produtos', novoProduto);
        produtos.push(novoProduto);
        document.getElementById('nomeProduto').value = '';
        document.getElementById('precoProduto').value = '';
        document.getElementById('unidadeProduto').value = 'un';
        document.getElementById('notaFiscalProduto').checked = true;
        document.getElementById('descricaoProduto').value = '';
        document.getElementById('codigoBarrasProduto').value = '';
        document.getElementById('quantidadeProduto').value = '';
        document.getElementById('estoqueMinimoProduto').value = '';
        document.getElementById('fotoProduto').value = '';
        document.getElementById('previewFotoProduto').style.display = 'none';
        fecharModal('modalProduto');
        renderProdutos();
        renderSelectProdutos();
        if (resultado.offline) {
            atualizarStatus(`📴 Produto "${nome}" salvo neste aparelho — sincroniza quando a internet voltar${fotoAdiada ? ' (a foto precisa ser adicionada depois, com internet)' : ''}`);
        } else {
            atualizarStatus(`✅ Produto "${nome}" cadastrado!`);
        }
        registrarLog('PRODUTO_ADICIONADO', `Produto "${nome}" adicionado`);
    } catch (e) {
        alert('❌ Erro ao salvar produto: ' + e.message);
    }
}

async function excluirProduto(index) {
    const produto = produtos[index];
    if (!produto) return;
    if (!confirm(`Excluir "${produto.nome}"?`)) return;
    try {
        const { error } = await sb.from('produtos').delete().eq('id', produto.id);
        if (error) throw error;
        if (produto.foto_url) await removerFotoProduto(produto.id);
        produtos.splice(index, 1);
        renderProdutos();
        renderSelectProdutos();
        atualizarStatus(`🗑️ Produto "${produto.nome}" removido`);
        registrarLog('PRODUTO_EXCLUIDO', `Produto "${produto.nome}" excluído`);
    } catch (e) {
        alert('❌ Erro ao excluir produto: ' + e.message);
    }
}

function editarProduto(index) {
    const p = produtos[index];
    if (!p) { alert('⚠️ Não encontrei esse produto — a lista pode ter sido atualizada. Tente de novo.'); return; }
    document.getElementById('nomeProduto').value = p.nome;
    document.getElementById('precoProduto').value = p.preco;
    document.getElementById('tipoProduto').value = p.tipo || 'outro';
    document.getElementById('descricaoProduto').value = p.descricao || '';
    document.getElementById('codigoBarrasProduto').value = p.codigo_barras || '';
    document.getElementById('unidadeProduto').value = p.unidade || 'un';
    document.getElementById('notaFiscalProduto').checked = p.nota_fiscal !== false;
    document.getElementById('quantidadeProduto').value = (p.quantidade ?? '');
    document.getElementById('estoqueMinimoProduto').value = (p.estoque_minimo ?? '');
    document.getElementById('fotoProduto').value = '';
    const preview = document.getElementById('previewFotoProduto');
    if (p.foto_url) { preview.src = p.foto_url; preview.style.display = 'block'; } else { preview.style.display = 'none'; }
    document.querySelector('#modalProduto h3').textContent = '✏️ Editar Produto';
    const btn = document.getElementById('salvarProduto');
    btn.textContent = '💾 Atualizar';
    btn.dataset.id = p.id;
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener('click', async function () {
        const idProduto = this.dataset.id;
        const produtoOriginal = produtos.find(x => x.id === idProduto);
        if (!produtoOriginal) { alert('⚠️ Esse produto não existe mais (foi removido em outro dispositivo).'); fecharModal('modalProduto'); renderProdutos(); return; }
        const nome = document.getElementById('nomeProduto').value.trim();
        const preco = parseFloat(document.getElementById('precoProduto').value);
        const tipo = document.getElementById('tipoProduto').value;
        const unidade = document.getElementById('unidadeProduto').value;
        const notaFiscal = document.getElementById('notaFiscalProduto').checked;
        const descricao = document.getElementById('descricaoProduto').value.trim();
        const codigoBarras = document.getElementById('codigoBarrasProduto').value.trim();
        const quantidadeVal = document.getElementById('quantidadeProduto').value;
        const estoqueMinimoVal = document.getElementById('estoqueMinimoProduto').value;
        const arquivoFoto = document.getElementById('fotoProduto').files[0];
        if (!nome || isNaN(preco) || preco <= 0) { alert('⚠️ Nome e preço válido são obrigatórios'); return; }
        const produtoAtualizado = {
            ...produtoOriginal, nome, preco, tipo, unidade, nota_fiscal: notaFiscal,
            descricao: descricao || null, codigo_barras: codigoBarras || null,
            quantidade: quantidadeVal !== '' ? parseFloat(quantidadeVal) : null,
            estoque_minimo: estoqueMinimoVal !== '' ? parseFloat(estoqueMinimoVal) : null
        };
        try {
            let fotoAdiada = false;
            if (arquivoFoto) {
                if (navigator.onLine) {
                    atualizarStatus('📸 Enviando foto...');
                    produtoAtualizado.foto_url = await enviarFotoProduto(produtoAtualizado.id, arquivoFoto);
                } else {
                    fotoAdiada = true;
                }
            }
            const resultado = await upsertComOffline('produtos', produtoAtualizado);
            const idx = produtos.findIndex(x => x.id === idProduto);
            if (idx >= 0) produtos[idx] = produtoAtualizado;
            document.getElementById('nomeProduto').value = '';
            document.getElementById('precoProduto').value = '';
            document.getElementById('unidadeProduto').value = 'un';
            document.getElementById('notaFiscalProduto').checked = true;
            document.getElementById('descricaoProduto').value = '';
            document.getElementById('codigoBarrasProduto').value = '';
            document.getElementById('quantidadeProduto').value = '';
            document.getElementById('estoqueMinimoProduto').value = '';
            document.getElementById('fotoProduto').value = '';
            document.getElementById('previewFotoProduto').style.display = 'none';
            document.querySelector('#modalProduto h3').textContent = '📦 Novo Produto';
            this.textContent = 'Salvar';
            this.dataset.id = '';
            fecharModal('modalProduto');
            renderProdutos();
            renderSelectProdutos();
            if (resultado.offline) {
                atualizarStatus(`📴 Produto "${nome}" salvo neste aparelho — sincroniza quando a internet voltar${fotoAdiada ? ' (a foto precisa ser adicionada depois, com internet)' : ''}`);
            } else {
                atualizarStatus(`✅ Produto "${nome}" atualizado!`);
            }
            registrarLog('PRODUTO_EDITADO', `Produto "${nome}" editado`);
        } catch (e) {
            alert('❌ Erro ao atualizar produto: ' + e.message);
        }
    });
    abrirModal('modalProduto');
}

function renderSelectProdutos() {
    document.querySelectorAll('.selProduto').forEach(select => {
        const current = select.value;
        select.innerHTML = '<option value="">Selecione um produto</option>' +
            produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}" data-unidade="${p.unidade || 'un'}">${p.nome} - R$ ${Number(p.preco).toFixed(2)}/${p.unidade || 'un'}</option>`).join('');
        select.value = current;
    });
}

// ============================================
// ORÇAMENTO
// ============================================

function criarLinhaItem(nomeSelecionado = '', qtd = 1) {
    const div = document.createElement('div');
    div.className = 'item-orcamento';
    div.innerHTML = `
        <select class="selProduto">
            <option value="">Selecione um produto</option>
            ${produtos.map(p => `<option value="${p.nome}" data-preco="${p.preco}" data-unidade="${p.unidade || 'un'}">${p.nome} - R$ ${Number(p.preco).toFixed(2)}/${p.unidade || 'un'}</option>`).join('')}
        </select>
        <input type="number" class="qtdProduto" placeholder="Qtd" min="0.01" step="0.01" value="${qtd}">
        <button class="btn-remove-item" onclick="removerItem(this)">✕</button>
    `;
    if (nomeSelecionado) div.querySelector('.selProduto').value = nomeSelecionado;
    div.querySelector('.selProduto').addEventListener('change', updateTotal);
    div.querySelector('.qtdProduto').addEventListener('input', updateTotal);
    return div;
}

function adicionarItem() {
    if (produtos.length === 0) { alert('⚠️ Cadastre um produto primeiro!'); return; }
    document.getElementById('itensOrcamento').appendChild(criarLinhaItem());
    updateTotal();
}

function removerItem(btn) { btn.parentElement.remove(); updateTotal(); }

function updateTotal() {
    let total = 0;
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseFloat(item.querySelector('.qtdProduto').value) || 0;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        total += preco * qtd;
    });
    document.getElementById('totalValor').textContent = total.toFixed(2);
}

function pegarItensOrcamentoAtual() {
    const itens = [];
    document.querySelectorAll('.item-orcamento').forEach(item => {
        const select = item.querySelector('.selProduto');
        const qtd = parseFloat(item.querySelector('.qtdProduto').value) || 0;
        const nome = select.value;
        const preco = parseFloat(select.options[select.selectedIndex]?.dataset?.preco) || 0;
        const unidade = select.options[select.selectedIndex]?.dataset?.unidade || 'un';
        if (nome && qtd > 0) itens.push({ nome, qtd, preco, unidade, subtotal: preco * qtd });
    });
    return itens;
}

function limparOrcamento() {
    if (!confirm('Limpar todos os itens?')) return;
    document.getElementById('itensOrcamento').innerHTML = '';
    document.getElementById('itensOrcamento').appendChild(criarLinhaItem());
    updateTotal();
    document.getElementById('selCliente').value = '';
    document.getElementById('resultadoProjeto').innerHTML = '';
    editandoOSId = null;
    atualizarStatus('🧹 Orçamento limpo!');
}

async function salvarOrcamento() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente!'); return; }
    const itens = pegarItensOrcamentoAtual();
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item!'); return; }
    const total = itens.reduce((sum, item) => sum + item.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);
    const formaPagamento = document.getElementById('formaPagamentoOrcamento').value;
    const parcelas = formaPagamento === 'Cartão de Crédito' ? parseInt(document.getElementById('parcelasOrcamento').value) : 1;
    const ehCrediario = formaPagamento === 'Crediário Próprio';
    const crediario = ehCrediario ? {
        crediario_num_parcelas: parseInt(document.getElementById('crediarioNumParcelas').value),
        crediario_primeiro_vencimento: document.getElementById('crediarioPrimeiroVencimento').value,
        crediario_intervalo_dias: parseInt(document.getElementById('crediarioIntervaloDias').value) || 30
    } : { crediario_num_parcelas: null, crediario_primeiro_vencimento: null, crediario_intervalo_dias: null };
    if (ehCrediario && !crediario.crediario_primeiro_vencimento) { alert('⚠️ Informe o vencimento da 1ª parcela do crediário!'); return; }

    // Editando um orçamento já existente: atualiza em vez de criar um novo
    if (editandoOSId) {
        const osExistente = ordensServico.find(o => o.id === editandoOSId);
        if (!osExistente) { alert('⚠️ Não encontrei esse orçamento — talvez tenha sido removido.'); editandoOSId = null; return; }
        const osAtualizada = { ...osExistente, cliente_id: clienteData?.id || '', cliente_nome: cliente, itens, total, forma_pagamento: formaPagamento, parcelas, ...crediario };
        try {
            const resultado = await upsertComOffline('ordens_servico', osAtualizada);
            const idx = ordensServico.findIndex(o => o.id === editandoOSId);
            if (idx >= 0) ordensServico[idx] = osAtualizada;
            listarOS();
            atualizarStatus(resultado.offline ? `📴 Orçamento ${osAtualizada.numero} salvo neste aparelho — sincroniza quando a internet voltar` : `✅ Orçamento ${osAtualizada.numero} atualizado!`);
            registrarLog('OS_EDITADA', `OS ${osAtualizada.numero} editada`);
            alert(`${resultado.offline ? '📴' : '✅'} Orçamento ${osAtualizada.numero} ${resultado.offline ? 'salvo neste aparelho' : 'atualizado'}!\nCliente: ${cliente}\nTotal: R$ ${total.toFixed(2)}`);
            editandoOSId = null;
            limparOrcamento();
            abrirTab('tabOS');
        } catch (e) {
            alert('❌ Erro ao atualizar orçamento: ' + e.message);
        }
        return;
    }

    const novaOS = {
        id: gerarId(),
        numero: 'OS-' + (ordensServico.length + 1).toString().padStart(4, '0'),
        cliente_id: clienteData?.id || '',
        cliente_nome: cliente,
        itens: itens,
        total: total,
        status: 'orcamento',
        forma_pagamento: formaPagamento,
        parcelas: parcelas,
        ...crediario,
        data_criacao: new Date().toISOString()
    };
    try {
        const resultado = await upsertComOffline('ordens_servico', novaOS);
        ordensServico.push(novaOS);
        listarOS();
        atualizarStatus(resultado.offline ? `📴 Orçamento salvo neste aparelho! Nº ${novaOS.numero} — sincroniza quando a internet voltar` : `✅ Orçamento salvo! Nº ${novaOS.numero}`);
        registrarLog('OS_CRIADA', `OS ${novaOS.numero} criada para ${cliente}`);
        alert(`${resultado.offline ? '📴' : '✅'} Orçamento ${resultado.offline ? 'salvo neste aparelho' : 'salvo'}!\nNº: ${novaOS.numero}\nCliente: ${cliente}\nTotal: R$ ${total.toFixed(2)}`);
        abrirTab('tabOS');
    } catch (e) {
        alert('❌ Erro ao salvar orçamento: ' + e.message);
    }
}

// ============================================
// ORDEM DE SERVIÇO
// ============================================

function listarOS(filtro = 'todos') {
    const container = document.getElementById('listaOS');
    if (!container) return;
    let lista = filtro !== 'todos' ? ordensServico.filter(os => os.status === filtro) : ordensServico;
    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhuma OS encontrada</p>';
        return;
    }
    const badges = {
        orcamento: '📄 Orçamento', aprovado: '✅ Aprovado', em_andamento: '🔧 Em Andamento',
        concluido: '✅ Concluído', cancelado: '❌ Cancelado'
    };
    container.innerHTML = lista.map(os => `
        <div class="os-card" onclick="abrirOS('${os.id}')">
            <div><strong>${os.numero}</strong> <span class="status-badge status-orcamento">${badges[os.status] || os.status}</span></div>
            <div><strong>Cliente:</strong> ${os.cliente_nome}</div>
            <div style="font-size:12px;color:#666;">${os.itens?.length || 0} itens | Total: R$ ${Number(os.total || 0).toFixed(2)}</div>
        </div>
    `).join('');
}

function filtrarOS() { listarOS(document.getElementById('filtroStatusOS').value); }

function abrirOS(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;
    const data = new Date(os.data_criacao).toLocaleDateString('pt-BR');
    let itensHTML = os.itens?.map((item, i) => `
        <tr><td>${i + 1}</td><td>${item.nome}</td><td>${item.qtd}${item.unidade ? ' ' + item.unidade : ''}</td><td>R$ ${Number(item.preco).toFixed(2)}</td><td>R$ ${Number(item.subtotal).toFixed(2)}</td></tr>
    `).join('') || '';
    const pagamentoTexto = os.forma_pagamento
        ? os.forma_pagamento + (os.forma_pagamento === 'Cartão de Crédito' && os.parcelas > 1 ? ` (${os.parcelas}x)` : '')
        : '—';
    document.getElementById('detalhesOS').innerHTML = `
        <div style="margin-bottom:10px;">
            <p><strong>Nº:</strong> ${os.numero}</p>
            <p><strong>Cliente:</strong> ${os.cliente_nome}</p>
            <p><strong>Status:</strong> ${os.status}</p>
            <p><strong>Data:</strong> ${data}</p>
            <p><strong>Forma de pagamento:</strong> ${pagamentoTexto}</p>
            <p><strong>Total:</strong> R$ ${Number(os.total || 0).toFixed(2)}</p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="background:#1a237e;color:white;">
                    <th style="padding:5px;">#</th><th style="padding:5px;">Produto</th>
                    <th style="padding:5px;">Qtd</th><th style="padding:5px;">Preço</th>
                    <th style="padding:5px;">Subtotal</th>
                </tr></thead>
                <tbody>${itensHTML}</tbody>
            </table>
        </div>
    `;
    document.getElementById('btnAprovarOS').style.display = (souAdmin() && os.status === 'orcamento') ? 'inline-block' : 'none';
    document.getElementById('btnIniciarOS').style.display = (souAdmin() && os.status === 'aprovado') ? 'inline-block' : 'none';
    document.getElementById('btnConcluirOS').style.display = (souAdmin() && os.status === 'em_andamento') ? 'inline-block' : 'none';
    document.getElementById('btnCancelarOS').style.display = (souAdmin() && os.status !== 'cancelado' && os.status !== 'concluido') ? 'inline-block' : 'none';
    document.getElementById('btnEmitirRecibo').style.display = (souAdmin() && os.status === 'concluido') ? 'inline-block' : 'none';
    document.getElementById('btnEditarOS').style.display = souAdmin() ? 'inline-block' : 'none';
    osAtual = os;
    abrirModal('modalOS');
}

function editarOS(id) {
    const os = ordensServico.find(o => o.id === id) || osAtual;
    if (!os) return;
    editandoOSId = os.id;
    document.getElementById('selCliente').value = os.cliente_nome;
    const container = document.getElementById('itensOrcamento');
    container.innerHTML = '';
    (os.itens && os.itens.length ? os.itens : [{ nome: '', qtd: 1 }]).forEach(item => {
        container.appendChild(criarLinhaItem(item.nome, item.qtd));
    });
    updateTotal();
    fecharModal('modalOS');
    abrirTab('tabOrcamento');
    atualizarStatus(`✏️ Editando orçamento ${os.numero} — altere os itens e clique em Salvar`);
}

function reimprimirOS(id) {
    const os = ordensServico.find(o => o.id === id) || osAtual;
    if (!os) return;
    const clienteData = clientes.find(c => c.nome === os.cliente_nome);
    const { conteudo } = montarConteudoOrcamentoPDF(os.cliente_nome, os.itens || [], os.total || 0, clienteData);
    const nomeArquivo = `Orcamento_${EMPRESA.nomeAbreviado}_${os.numero}_${os.cliente_nome.replace(/\s/g, '_')}.pdf`;
    fecharModal('modalOS');
    baixarPDFDoConteudo(conteudo, nomeArquivo);
}

async function atualizarStatusOS(novoStatus, mensagem, acao) {
    if (!osAtual) return;
    const osAtualizada = { ...osAtual, status: novoStatus };
    if (novoStatus === 'aprovado') osAtualizada.data_aprovacao = new Date().toISOString();
    if (novoStatus === 'em_andamento') osAtualizada.data_inicio = new Date().toISOString();
    if (novoStatus === 'concluido') osAtualizada.data_conclusao = new Date().toISOString();
    try {
        const { error } = await sb.from('ordens_servico').upsert(osAtualizada, { onConflict: 'id' });
        if (error) throw error;
        const idx = ordensServico.findIndex(o => o.id === osAtualizada.id);
        if (idx >= 0) ordensServico[idx] = osAtualizada;
        osAtual = osAtualizada;
        listarOS();
        fecharModal('modalOS');
        atualizarStatus(mensagem);
        registrarLog(acao, `OS ${osAtualizada.numero}: ${mensagem}`);
    } catch (e) {
        alert('❌ Erro ao atualizar OS: ' + e.message);
    }
}

async function aprovarOS() {
    if (!osAtual || !confirm(`Aprovar OS ${osAtual.numero}?`)) return;
    await atualizarStatusOS('aprovado', `✅ OS ${osAtual.numero} aprovada!`, 'OS_APROVADA');
}
async function iniciarOS() {
    if (!osAtual || !confirm(`Iniciar OS ${osAtual.numero}?`)) return;
    await atualizarStatusOS('em_andamento', `🔧 OS ${osAtual.numero} em andamento!`, 'OS_INICIADA');
}
async function concluirOS() {
    if (!osAtual || !confirm(`Concluir OS ${osAtual.numero}?`)) return;
    await atualizarStatusOS('concluido', `✅ OS ${osAtual.numero} concluída!`, 'OS_CONCLUIDA');
}
async function cancelarOS() {
    if (!osAtual || !confirm(`Cancelar OS ${osAtual.numero}?`)) return;
    await atualizarStatusOS('cancelado', `❌ OS ${osAtual.numero} cancelada!`, 'OS_CANCELADA');
}

function gerarParcelasCrediario(total, numParcelas, primeiroVencimento, intervaloDias) {
    const valorParcela = Math.floor((total / numParcelas) * 100) / 100;
    const parcelas = [];
    let somaParcial = 0;
    for (let i = 0; i < numParcelas; i++) {
        const vencimento = new Date(primeiroVencimento + 'T00:00:00');
        vencimento.setDate(vencimento.getDate() + intervaloDias * i);
        // A última parcela absorve a diferença de arredondamento centavo a centavo
        const valor = i === numParcelas - 1 ? Math.round((total - somaParcial) * 100) / 100 : valorParcela;
        somaParcial += valor;
        parcelas.push({
            id: gerarId(), numero: i + 1, valor, valor_pago: 0,
            vencimento: vencimento.toISOString().split('T')[0],
            status: 'pendente', pago_em: null
        });
    }
    return parcelas;
}

async function emitirRecibo() {
    if (!osAtual || osAtual.status !== 'concluido') { alert('⚠️ A OS precisa estar concluída!'); return; }
    const ehCrediario = osAtual.forma_pagamento === 'Crediário Próprio' && osAtual.crediario_num_parcelas;
    const recibo = {
        id: gerarId(),
        numero: 'REC-' + (recibos.length + 1).toString().padStart(4, '0'),
        os_id: osAtual.id, os_numero: osAtual.numero,
        cliente_id: osAtual.cliente_id, cliente_nome: osAtual.cliente_nome,
        itens: osAtual.itens, total: osAtual.total,
        forma_pagamento: osAtual.forma_pagamento || null, parcelas: osAtual.parcelas || 1,
        pagamentos: [], valor_recebido: 0,
        parcelas_detalhe: ehCrediario
            ? gerarParcelasCrediario(osAtual.total, osAtual.crediario_num_parcelas, osAtual.crediario_primeiro_vencimento, osAtual.crediario_intervalo_dias || 30)
            : [],
        status: 'pendente', data_emissao: new Date().toISOString(), data_pagamento: null
    };
    try {
        const resultado = await upsertComOffline('recibos', recibo);
        recibos.push(recibo);
        listarRecibos();
        fecharModal('modalOS');
        atualizarDashboard();
        atualizarStatus(resultado.offline ? `📴 Recibo ${recibo.numero} salvo neste aparelho` : `💰 Recibo ${recibo.numero} emitido!`);
        registrarLog('RECIBO_EMITIDO', `Recibo ${recibo.numero} emitido para ${osAtual.cliente_nome}`);
        abrirRecibo(recibo.id);
    } catch (e) {
        alert('❌ Erro ao emitir recibo: ' + e.message);
    }
}

// ============================================
// RECIBOS
// ============================================

function valorRecebidoRecibo(recibo) {
    return (recibo.pagamentos || []).reduce((s, p) => s + Number(p.valor || 0), 0);
}

// Calcula o valor atualizado de uma parcela vencida e não paga, aplicando
// multa fixa + juros de mora proporcionais aos dias de atraso.
function calcularJurosAtraso(parcela) {
    const jaPago = Number(parcela.valor_pago || 0);
    if (parcela.status === 'pago') return { valorAtualizado: parcela.valor, diasAtraso: 0, jurosValor: 0, devido: 0 };
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(parcela.vencimento + 'T00:00:00');
    const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
    if (diasAtraso <= 0) {
        const valorAtualizado = parcela.valor;
        return { valorAtualizado, diasAtraso: 0, jurosValor: 0, devido: Math.max(0, valorAtualizado - jaPago) };
    }
    const multa = parcela.valor * (CONFIG_FINANCEIRO.multaAtraso / 100);
    const juros = parcela.valor * (CONFIG_FINANCEIRO.jurosMoraMensal / 100) * (diasAtraso / 30);
    const jurosValor = multa + juros;
    const valorAtualizado = parcela.valor + jurosValor;
    return { valorAtualizado, diasAtraso, jurosValor, devido: Math.max(0, valorAtualizado - jaPago) };
}

function preencherValorAbatimento(reciboId, parcelaId) {
    const recibo = recibos.find(r => r.id === reciboId);
    const parcela = recibo?.parcelas_detalhe?.find(p => p.id === parcelaId);
    if (!parcela) return;
    const { devido } = calcularJurosAtraso(parcela);
    const input = document.getElementById('valorAbaterCrediario');
    if (input) input.value = devido.toFixed(2);
}

// Abate um valor QUALQUER do crediário: aplica primeiro na parcela mais antiga em
// aberto, e o que sobrar (se pagar mais do que ela deve) já cai automaticamente
// na próxima — recalculando juros/multa de cada parcela na hora.
async function confirmarAbatimentoCrediario() {
    if (!reciboAtual) return;
    const valorAbatido = parseFloat(document.getElementById('valorAbaterCrediario').value);
    if (!valorAbatido || valorAbatido <= 0) { alert('⚠️ Informe um valor válido para abater'); return; }

    let restante = valorAbatido;
    const novasParcelas = reciboAtual.parcelas_detalhe.map(p => ({ ...p }));
    const ordemPagamento = [...novasParcelas].sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

    for (const parcela of ordemPagamento) {
        if (restante <= 0.004) break;
        const alvo = novasParcelas.find(p => p.id === parcela.id);
        if (alvo.status === 'pago') continue;
        const { devido } = calcularJurosAtraso(alvo);
        if (devido <= 0.004) { alvo.status = 'pago'; alvo.pago_em = alvo.pago_em || new Date().toISOString(); continue; }
        const aplicado = Math.min(restante, devido);
        alvo.valor_pago = Number((Number(alvo.valor_pago || 0) + aplicado).toFixed(2));
        restante = Number((restante - aplicado).toFixed(2));
        const aindaDevido = calcularJurosAtraso(alvo).devido;
        if (aindaDevido <= 0.004) { alvo.status = 'pago'; alvo.pago_em = new Date().toISOString(); }
        else { alvo.status = 'parcial'; }
    }

    const valorAplicado = Number((valorAbatido - restante).toFixed(2));
    const novoPagamento = { id: gerarId(), data: new Date().toISOString(), valor: valorAplicado };
    const pagamentos = [...(reciboAtual.pagamentos || []), novoPagamento];
    const todasPagas = novasParcelas.every(p => p.status === 'pago');
    const totalRecebido = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
    const atualizado = {
        ...reciboAtual, parcelas_detalhe: novasParcelas, pagamentos, valor_recebido: totalRecebido,
        status: todasPagas ? 'pago' : 'parcial',
        data_pagamento: todasPagas ? new Date().toISOString() : reciboAtual.data_pagamento
    };
    try {
        const resultado = await upsertComOffline('recibos', atualizado);
        const idx = recibos.findIndex(r => r.id === reciboAtual.id);
        if (idx >= 0) recibos[idx] = atualizado;
        reciboAtual = atualizado;
        listarRecibos();
        abrirRecibo(reciboAtual.id);
        atualizarDashboard();
        document.getElementById('valorAbaterCrediario').value = '';
        atualizarStatus(resultado.offline ? '📴 Abatimento salvo neste aparelho' : `✅ R$ ${valorAplicado.toFixed(2)} abatido do crediário!`);
        registrarLog('CREDIARIO_ABATIMENTO', `R$ ${valorAplicado.toFixed(2)} abatido no crediário do recibo ${reciboAtual.numero}`);
        if (restante > 0.004) alert(`ℹ️ Todas as parcelas já foram quitadas. Sobrou R$ ${restante.toFixed(2)} sem aplicar.`);
    } catch (e) {
        alert('❌ Erro ao registrar abatimento: ' + e.message);
    }
}

function listarRecibos(filtro = 'todos') {
    const container = document.getElementById('listaRecibos');
    if (!container) return;
    let lista = filtro !== 'todos' ? recibos.filter(r => r.status === filtro) : recibos;
    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhum recibo encontrado</p>';
        return;
    }
    container.innerHTML = lista.map(r => {
        const data = new Date(r.data_emissao).toLocaleDateString('pt-BR');
        const recebido = valorRecebidoRecibo(r);
        const saldo = Number(r.total || 0) - recebido;
        const badges = { pago: '✅ Pago', parcial: '🔶 Parcial', pendente: '⏳ Pendente' };
        const classes = { pago: 'status-recebido', parcial: 'status-os', pendente: 'status-orcamento' };
        return `
            <div class="os-card" onclick="abrirRecibo('${r.id}')">
                <div><strong>${r.numero}</strong> <span class="status-badge ${classes[r.status] || 'status-orcamento'}">${badges[r.status] || r.status}</span></div>
                <div><strong>Cliente:</strong> ${r.cliente_nome}</div>
                <div style="font-size:12px;color:#666;">OS: ${r.os_numero} | Total: R$ ${Number(r.total || 0).toFixed(2)} | ${data}</div>
                ${r.status !== 'pago' ? `<div style="font-size:12px;color:#e67e22;">Recebido: R$ ${recebido.toFixed(2)} · Saldo: R$ ${saldo.toFixed(2)}</div>` : ''}
            </div>
        `;
    }).join('');
}

function filtrarRecibos() { listarRecibos(document.getElementById('filtroRecibo').value); }

function abrirRecibo(id) {
    reciboAtual = recibos.find(r => r.id === id);
    if (!reciboAtual) return;
    const data = new Date(reciboAtual.data_emissao).toLocaleDateString('pt-BR');
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    let itensHTML = reciboAtual.itens?.map((item, i) => `
        <tr><td>${i + 1}</td><td>${item.nome}</td><td>${item.qtd}${item.unidade ? ' ' + item.unidade : ''}</td><td>R$ ${Number(item.preco).toFixed(2)}</td><td>R$ ${Number(item.subtotal).toFixed(2)}</td></tr>
    `).join('') || '';
    const recebido = valorRecebidoRecibo(reciboAtual);
    const saldo = Number(reciboAtual.total || 0) - recebido;
    const rotulos = { pago: '✅ PAGO', parcial: '🔶 PARCIAL', pendente: '⏳ PENDENTE' };
    const cores = { pago: '#27ae60', parcial: '#e67e22', pendente: '#e67e22' };
    const pagamentos = reciboAtual.pagamentos || [];
    document.getElementById('conteudoRecibo').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:3px solid #1a237e;padding-bottom:12px;margin-bottom:15px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="${logoParaDocumento(baseUrl)}" alt="${EMPRESA.nomeAbreviado}" style="height:44px;width:auto;border-radius:6px;object-fit:contain;" onerror="this.style.display='none'">
                <div>
                    <div style="color:#1a237e;font-size:16px;font-weight:900;">${EMPRESA.nome}</div>
                    <div style="color:#666;font-size:10px;">CNPJ: ${EMPRESA.cnpj}</div>
                </div>
            </div>
            <div style="text-align:right;">
                <span style="display:inline-block;background:#1a237e;color:white;font-size:12px;font-weight:bold;padding:3px 10px;border-radius:4px;">RECIBO</span>
                <div style="font-size:11px;color:#666;margin-top:3px;">${reciboAtual.numero}</div>
            </div>
        </div>
        <div style="font-size:10px;color:#777;margin-bottom:12px;">${EMPRESA.endereco} · 📞 ${EMPRESA.telefone} · 📧 ${EMPRESA.email}</div>
        <div style="background:#f5f5f5;border-left:4px solid #1a237e;border-radius:4px;padding:12px;margin-bottom:15px;">
            <p style="margin:2px 0;"><strong>Cliente:</strong> ${reciboAtual.cliente_nome}</p>
            <p style="margin:2px 0;"><strong>Referente à OS:</strong> ${reciboAtual.os_numero}</p>
            <p style="margin:2px 0;"><strong>Data de emissão:</strong> ${data}</p>
            ${reciboAtual.forma_pagamento ? `<p style="margin:2px 0;"><strong>Forma de pagamento:</strong> ${reciboAtual.forma_pagamento}${reciboAtual.forma_pagamento === 'Cartão de Crédito' && reciboAtual.parcelas > 1 ? ` (${reciboAtual.parcelas}x)` : ''}</p>` : ''}
            <p style="margin:2px 0;"><strong>Status:</strong> <span style="color:${cores[reciboAtual.status] || '#e67e22'};font-weight:bold;">${rotulos[reciboAtual.status] || reciboAtual.status}</span></p>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="background:#1a237e;color:white;">
                    <th style="padding:8px 6px;text-align:left;">#</th><th style="padding:8px 6px;text-align:left;">Produto/Serviço</th>
                    <th style="padding:8px 6px;text-align:right;">Qtd</th><th style="padding:8px 6px;text-align:right;">Preço</th>
                    <th style="padding:8px 6px;text-align:right;">Subtotal</th>
                </tr></thead>
                <tbody>${itensHTML}</tbody>
            </table>
        </div>
        <div style="text-align:right;padding:12px 4px;font-size:19px;font-weight:bold;border-top:2px solid #1a237e;margin-top:8px;color:#1a237e;">
            TOTAL: R$ ${Number(reciboAtual.total || 0).toFixed(2)}
        </div>
        ${pagamentos.length > 0 ? `
        <div style="background:#e8f5e9;border-radius:6px;padding:10px 12px;margin-top:10px;font-size:12px;">
            <strong style="color:#2e7d32;">Pagamentos recebidos:</strong>
            ${pagamentos.map(p => `<div>• R$ ${Number(p.valor).toFixed(2)} em ${new Date(p.data).toLocaleDateString('pt-BR')}</div>`).join('')}
            <div style="margin-top:5px;border-top:1px solid #c8e6c9;padding-top:5px;">
                <strong>Recebido: R$ ${recebido.toFixed(2)}</strong>${saldo > 0 ? ` &nbsp;|&nbsp; <strong style="color:#e74c3c;">Saldo: R$ ${saldo.toFixed(2)}</strong>` : ''}
            </div>
        </div>` : ''}
        ${(reciboAtual.parcelas_detalhe && reciboAtual.parcelas_detalhe.length > 0) ? `
        <div style="margin-top:12px;">
            <strong style="color:#e67e22;font-size:12px;">💳 Parcelas do Crediário:</strong>
            ${reciboAtual.parcelas_detalhe.map(p => {
                const { valorAtualizado, diasAtraso, devido } = calcularJurosAtraso(p);
                const vencido = diasAtraso > 0 && p.status !== 'pago';
                const venc = new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR');
                const rotulos = { pago: '✅', parcial: '🔶 Parcial', pendente: '' };
                return `
                <div style="display:flex;justify-content:space-between;align-items:center;background:${p.status === 'pago' ? '#e8f5e9' : vencido ? '#fdecea' : '#f8f9fa'};padding:8px 10px;border-radius:6px;margin-top:6px;font-size:12px;">
                    <div>
                        <strong>Parcela ${p.numero}</strong> ${rotulos[p.status] || ''} — venc. ${venc}<br>
                        Valor: R$ ${p.valor.toFixed(2)}${vencido ? ` <span style="color:#c0392b;">(+ juros/multa: R$ ${valorAtualizado.toFixed(2)})</span>` : ''}
                        ${Number(p.valor_pago || 0) > 0 ? `<br>Já pago: R$ ${Number(p.valor_pago).toFixed(2)}` : ''}
                        ${p.status !== 'pago' ? `<br><strong style="color:#e67e22;">Falta: R$ ${devido.toFixed(2)}</strong>` : `<br><span style="color:#27ae60;">Quitada em ${new Date(p.pago_em).toLocaleDateString('pt-BR')}</span>`}
                    </div>
                    ${p.status !== 'pago' ? `<button onclick="preencherValorAbatimento('${reciboAtual.id}','${p.id}')" class="btn-secondary" style="padding:5px 10px;font-size:11px;white-space:nowrap;">Usar valor</button>` : ''}
                </div>`;
            }).join('')}
            <div style="display:flex;gap:6px;margin-top:10px;">
                <input type="number" id="valorAbaterCrediario" placeholder="Valor a abater (R$)" step="0.01" min="0.01" style="flex:1;margin:0;">
                <button onclick="confirmarAbatimentoCrediario()" class="btn-success" style="white-space:nowrap;">💰 Abater</button>
            </div>
            <p style="font-size:11px;color:#888;margin-top:5px;">Aceita qualquer valor — abate primeiro na parcela mais antiga em aberto e o restante já cai na próxima automaticamente.</p>
        </div>` : ''}
        <div class="assinatura" style="margin-top:30px;">
            <div style="border-top:1px solid #333;width:80%;margin:0 auto;padding-top:6px;text-align:center;font-size:11px;color:#555;">
                Assinatura do Cliente
            </div>
        </div>
        <div style="margin-top:20px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px;">
            ${EMPRESA.nome} — CNPJ ${EMPRESA.cnpj} · 📷 ${EMPRESA.instagram}
        </div>
    `;
    definirDisplay('btnRegistrarPagamento', reciboAtual.status !== 'pago' ? 'inline-block' : 'none');
    abrirModal('modalRecibo');
}

function abrirPagamentoRecibo() {
    if (!reciboAtual) return;
    const recebido = valorRecebidoRecibo(reciboAtual);
    const saldo = Number(reciboAtual.total || 0) - recebido;
    document.getElementById('pagamentoReciboInfo').textContent = `${reciboAtual.numero} — ${reciboAtual.cliente_nome}`;
    document.getElementById('pagamentoSaldoAtual').textContent = `R$ ${saldo.toFixed(2)}`;
    document.getElementById('valorPagamento').value = '';
    const pagamentos = reciboAtual.pagamentos || [];
    const historico = document.getElementById('historicoPagamentosRecibo');
    historico.innerHTML = pagamentos.length
        ? '<strong>Já recebido:</strong><br>' + pagamentos.map(p => `R$ ${Number(p.valor).toFixed(2)} em ${new Date(p.data).toLocaleDateString('pt-BR')}`).join('<br>')
        : '';
    abrirModal('modalPagamentoRecibo');
}

function preencherValorPagamento(valor) { document.getElementById('valorPagamento').value = valor; }

function preencherValorRestante() {
    if (!reciboAtual) return;
    const saldo = Number(reciboAtual.total || 0) - valorRecebidoRecibo(reciboAtual);
    document.getElementById('valorPagamento').value = saldo > 0 ? saldo.toFixed(2) : '';
}

async function confirmarPagamentoRecibo() {
    if (!reciboAtual) return;
    const valor = parseFloat(document.getElementById('valorPagamento').value);
    if (!valor || valor <= 0) { alert('⚠️ Informe um valor válido'); return; }
    const pagamentosAtuais = reciboAtual.pagamentos || [];
    const novoPagamento = { id: gerarId(), data: new Date().toISOString(), valor };
    const pagamentos = [...pagamentosAtuais, novoPagamento];
    const totalRecebido = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
    const total = Number(reciboAtual.total || 0);
    const novoStatus = totalRecebido >= total ? 'pago' : 'parcial';
    const atualizado = {
        ...reciboAtual, pagamentos, valor_recebido: totalRecebido, status: novoStatus,
        data_pagamento: novoStatus === 'pago' ? new Date().toISOString() : reciboAtual.data_pagamento
    };
    try {
        const resultado = await upsertComOffline('recibos', atualizado);
        const idx = recibos.findIndex(r => r.id === reciboAtual.id);
        if (idx >= 0) recibos[idx] = atualizado;
        reciboAtual = atualizado;
        listarRecibos();
        abrirRecibo(reciboAtual.id);
        fecharModal('modalPagamentoRecibo');
        atualizarDashboard();
        atualizarCaixa();
        atualizarStatus(resultado.offline
            ? `📴 Pagamento de R$ ${valor.toFixed(2)} salvo neste aparelho — sincroniza quando a internet voltar`
            : `✅ Pagamento de R$ ${valor.toFixed(2)} registrado!${novoStatus === 'pago' ? ' Recibo quitado.' : ''}`);
        registrarLog('RECIBO_PAGAMENTO', `Pagamento de R$ ${valor.toFixed(2)} no recibo ${reciboAtual.numero} (status: ${novoStatus})`);
    } catch (e) {
        alert('❌ Erro ao registrar pagamento: ' + e.message);
    }
}

function imprimirRecibo() {
    if (!reciboAtual) return;
    const conteudo = document.getElementById('conteudoRecibo').innerHTML;
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
        <html><head><title>Recibo ${reciboAtual.numero}</title>
        <style>
            * { box-sizing: border-box; }
            body{font-family:Arial,Helvetica,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#222;}
            .recibo-area{background:white;padding:10px;}
            table{width:100%;border-collapse:collapse;}
            td{padding:8px 6px;border-bottom:1px solid #ddd;}
            @media print{ body{padding:15px;} }
        </style>
        </head><body><div class="recibo-area">${conteudo}</div>
        <script>window.onload=function(){window.print();}<\/script></body></html>
    `);
    win.document.close();
}

// ============================================
// GERAR PDF - MODELO SE7VEN ENERGIA
// ============================================

function montarConteudoOrcamentoPDF(cliente, itens, total, clienteData, incluirFotos = false) {
    const data = new Date();
    const dataFormatada = data.toLocaleDateString('pt-BR');
    const dataInvertida = data.getDate().toString().padStart(2, '0') + '/' +
        (data.getMonth() + 1).toString().padStart(2, '0') + '/' + data.getFullYear();
    const numeroOrcamento = 'ORC-' + Date.now().toString().slice(-6);
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

    const conteudo = `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Orçamento ${EMPRESA.nome}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a237e; padding-bottom: 15px; margin-bottom: 15px; }
            .header .marca { display: flex; align-items: center; gap: 12px; }
            .header img { height: 55px; width: auto; border-radius: 8px; object-fit: contain; }
            .header h1 { color: #1a237e; font-size: 22px; font-weight: 900; letter-spacing: 1px; margin: 0; }
            .header .subtitle { color: #666; font-size: 11px; font-weight: bold; margin: 2px 0 0 0; letter-spacing: 1px; }
            .header .doc-info { text-align: right; font-size: 12px; color: #444; }
            .header .doc-info .tag { display: inline-block; background: #1a237e; color: white; font-weight: bold; font-size: 13px; padding: 4px 10px; border-radius: 4px; margin-bottom: 6px; }
            .empresa-dados { font-size: 11px; color: #555; margin-bottom: 20px; line-height: 1.5; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
            .empresa-dados strong { color: #1a237e; }
            .cliente-box { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #1a237e; }
            .cliente-box .titulo { color: #1a237e; font-size: 14px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; }
            .cliente-box p { margin: 3px 0; font-size: 14px; }
            .cliente-box .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
            table thead { background: #1a237e; color: white; }
            table th { padding: 10px 12px; text-align: left; }
            table td { padding: 10px 12px; border-bottom: 1px solid #ddd; vertical-align: middle; }
            table tr:last-child td { border-bottom: none; }
            .text-center { text-align: center; } .text-right { text-align: right; }
            .foto-item { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; display: block; }
            .total-box { text-align: right; padding: 12px; font-size: 18px; font-weight: bold; border-top: 2px solid #1a237e; margin: 10px 0 30px 0; }
            .pagamento { background: #e8f5e9; padding: 15px; border-radius: 4px; border-left: 4px solid #2e7d32; margin-top: 20px; }
            .pagamento .titulo { font-weight: bold; color: #1a237e; }
            .pagamento p { margin: 0; font-size: 14px; }
            .observacoes { margin-top: 15px; font-size: 11px; color: #666; }
            .observacoes li { margin: 3px 0 3px 15px; }
            .rodape { margin-top: 30px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #ddd; padding-top: 15px; }
            .rodape p { margin: 2px 0; } .rodape .destaque { color: #1a237e; font-weight: bold; }
            @media print { body { padding: 20px; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="marca">
                <img src="${logoParaDocumento(baseUrl)}" alt="${EMPRESA.nomeAbreviado}" onerror="this.style.display='none'">
                <div>
                    <h1>${EMPRESA.nome}</h1>
                    <p class="subtitle">ORÇAMENTO DE SERVIÇOS ELÉTRICOS</p>
                </div>
            </div>
            <div class="doc-info">
                <span class="tag">Nº ${numeroOrcamento}</span><br>
                Data: ${dataInvertida}
            </div>
        </div>
        <div class="empresa-dados">
            <strong>${EMPRESA.nome}</strong> — CNPJ: ${EMPRESA.cnpj}<br>
            ${EMPRESA.endereco} &nbsp;|&nbsp; 📞 ${EMPRESA.telefone} &nbsp;|&nbsp; 📧 ${EMPRESA.email} &nbsp;|&nbsp; 📷 ${EMPRESA.instagram}
        </div>
        <div class="cliente-box">
            <div class="titulo">CLIENTE:</div>
            <p><span class="label">Nome:</span> ${cliente}</p>
            ${clienteData?.telefone ? `<p><span class="label">Cel:</span> ${clienteData.telefone}</p>` : ''}
            ${clienteData?.cpf ? `<p><span class="label">CPF/CNPJ:</span> ${clienteData.cpf}</p>` : ''}
            ${clienteData?.endereco ? `<p><span class="label">Endereço:</span> ${clienteData.endereco}</p>` : ''}
        </div>
        <table>
            <thead><tr>
                ${incluirFotos ? '<th style="width:10%;">Foto</th>' : ''}
                <th style="width:8%;">Nº</th><th style="width:${incluirFotos ? '32%' : '42%'};">Descrição</th><th style="width:15%;text-align:right;">Preço</th><th style="width:10%;text-align:center;">Qt.</th><th style="width:25%;text-align:right;">Total</th>
            </tr></thead>
            <tbody>
                ${itens.map((item, index) => {
                    const produtoRef = incluirFotos ? produtos.find(p => p.nome === item.nome) : null;
                    const fotoTd = incluirFotos
                        ? `<td>${produtoRef?.foto_url ? `<img src="${produtoRef.foto_url}" class="foto-item">` : ''}</td>`
                        : '';
                    return `<tr>${fotoTd}<td class="text-center">${index + 1}</td><td>${item.nome}</td><td class="text-right">R$ ${item.preco.toFixed(2)}</td><td class="text-center">${item.qtd}${item.unidade ? ' ' + item.unidade : ''}</td><td class="text-right"><strong>R$ ${item.subtotal.toFixed(2)}</strong></td></tr>`;
                }).join('')}
            </tbody>
        </table>
        <div class="total-box"><strong>Total: R$ ${total.toFixed(2)}</strong></div>
        <div class="pagamento"><p class="titulo">FORMA DE PAGAMENTO</p><p>${EMPRESA.formasPagamento.join(' • ')}</p></div>
        <ul class="observacoes">
            ${EMPRESA.observacoes.map(obs => `<li>${obs}</li>`).join('')}
        </ul>
        <div class="rodape"><p><span class="destaque">${EMPRESA.nome}</span> — CNPJ ${EMPRESA.cnpj}</p><p>📧 ${EMPRESA.email} | 📱 ${EMPRESA.telefone} | 📷 ${EMPRESA.instagram}</p></div>
    </body></html>
    `;

    return { conteudo, dataFormatada, numeroOrcamento };
}

function baixarPDFDoConteudo(conteudo, nomeArquivo) {
    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!win) { alert('⚠️ Por favor, permita pop-ups para gerar o PDF'); return; }
    win.document.write(conteudo);
    win.document.close();

    setTimeout(() => {
        try {
            const script = win.document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = function () {
                const element = win.document.body;
                const opt = {
                    margin: 0.5,
                    filename: nomeArquivo,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                win.html2pdf().set(opt).from(element).save().then(() => {
                    win.close();
                    atualizarStatus('✅ PDF gerado com sucesso!');
                }).catch(() => {
                    win.document.body.innerHTML += `<div style="text-align:center;margin-top:20px;padding:20px;"><button onclick="window.print()" style="padding:12px 24px;background:#1a237e;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;">🖨️ Salvar como PDF</button></div>`;
                    atualizarStatus('⚠️ Use "Imprimir" para salvar o PDF');
                });
            };
            script.onerror = function () {
                win.document.body.innerHTML += `<div style="text-align:center;margin-top:20px;padding:20px;"><button onclick="window.print()" style="padding:12px 24px;background:#1a237e;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;">🖨️ Salvar como PDF</button></div>`;
                atualizarStatus('⚠️ Use "Imprimir" para salvar o PDF');
            };
            win.document.head.appendChild(script);
        } catch (err) {
            win.close();
            alert('❌ Erro ao gerar PDF. Tente novamente.');
        }
    }, 1500);
}

function gerarPDF() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente'); return; }
    const itens = pegarItensOrcamentoAtual();
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item ao orçamento'); return; }

    const total = itens.reduce((sum, item) => sum + item.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);
    const incluirFotos = document.getElementById('incluirFotosPDF')?.checked || false;
    const { conteudo, dataFormatada } = montarConteudoOrcamentoPDF(cliente, itens, total, clienteData, incluirFotos);
    const nomeArquivo = `Orcamento_${EMPRESA.nomeAbreviado}_${cliente.replace(/\s/g, '_')}_${dataFormatada.replace(/\//g, '-')}.pdf`;
    baixarPDFDoConteudo(conteudo, nomeArquivo);
}

// ============================================
// WHATSAPP
// ============================================

function formatarTelefoneWhatsApp(telefone) {
    let digitos = (telefone || '').replace(/\D/g, '');
    if (!digitos) return null;
    if (digitos.length <= 11) digitos = '55' + digitos; // adiciona DDI Brasil se não tiver
    return digitos;
}

function montarMensagemOrcamento(cliente, itens, total) {
    const data = new Date();
    const dataFormatada = data.getDate().toString().padStart(2, '0') + '/' +
        (data.getMonth() + 1).toString().padStart(2, '0') + '/' + data.getFullYear();

    let msg = `*${EMPRESA.nomeAbreviado} ENERGIA - ORÇAMENTO*\n\n`;
    msg += `📅 Data: ${dataFormatada}\n`;
    msg += `👤 Cliente: ${cliente}\n\n`;
    msg += `*ITENS:*\n`;
    itens.forEach((item, i) => {
        msg += `${i + 1}. ${item.nome} - ${item.qtd}${item.unidade || 'un'} x R$ ${item.preco.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n`;
    });
    msg += `\n*TOTAL: R$ ${total.toFixed(2)}*\n\n`;
    msg += `💳 *Formas de Pagamento:*\n`;
    EMPRESA.formasPagamento.forEach(fp => { msg += `✅ ${fp}\n`; });
    msg += `\n📱 *Entre em contato para mais informações!*`;
    return msg;
}

function enviarWhatsApp() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente'); return; }
    const itens = pegarItensOrcamentoAtual();
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item ao orçamento'); return; }
    const total = itens.reduce((s, i) => s + i.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);
    const numero = formatarTelefoneWhatsApp(clienteData?.telefone) || EMPRESA.whatsapp;
    if (!clienteData?.telefone) alert('ℹ️ Esse cliente não tem celular cadastrado — a mensagem vai abrir para o número da própria empresa.');
    const mensagem = montarMensagemOrcamento(cliente, itens, total);
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
    registrarLog('WHATSAPP_ENVIADO', `Orçamento para ${cliente} aberto no WhatsApp`);
}

async function enviarProdutoWhatsApp(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const mensagem = `*${produto.nome}*\n📂 ${produto.tipo || 'outro'}\n💰 R$ ${Number(produto.preco).toFixed(2)}${produto.descricao ? `\n\n${produto.descricao}` : ''}`;

    // Com foto: tenta abrir o menu nativo de compartilhar (celular), que anexa a
    // imagem + texto direto na conversa do WhatsApp escolhida.
    if (produto.foto_url && navigator.canShare) {
        try {
            atualizarStatus('📸 Preparando envio...');
            const resposta = await fetch(produto.foto_url);
            const blob = await resposta.blob();
            const arquivo = new File([blob], `${produto.nome}.jpg`, { type: blob.type || 'image/jpeg' });
            if (navigator.canShare({ files: [arquivo] })) {
                await navigator.share({ files: [arquivo], title: produto.nome, text: mensagem });
                atualizarStatus('✅ Produto compartilhado!');
                registrarLog('PRODUTO_COMPARTILHADO', `Produto "${produto.nome}" compartilhado com foto`);
                return;
            }
        } catch (e) {
            if (e.name === 'AbortError') { atualizarStatus('Envio cancelado'); return; }
            console.warn('Não foi possível compartilhar com foto, enviando só o texto:', e.message);
        }
    }

    // Sem foto, ou navegador sem suporte a compartilhar arquivo: manda só o texto.
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
    if (produto.foto_url) alert('ℹ️ Seu navegador não permite anexar a foto automaticamente aqui — abri o WhatsApp só com o texto. Baixe a foto e anexe na mão se quiser.');
    registrarLog('PRODUTO_COMPARTILHADO', `Produto "${produto.nome}" enviado ao WhatsApp (texto)`);
}

async function enviarPDFWhatsApp() {
    const cliente = document.getElementById('selCliente').value;
    if (!cliente) { alert('⚠️ Selecione um cliente'); return; }
    const itens = pegarItensOrcamentoAtual();
    if (itens.length === 0) { alert('⚠️ Adicione pelo menos um item ao orçamento'); return; }
    const total = itens.reduce((s, i) => s + i.subtotal, 0);
    const clienteData = clientes.find(c => c.nome === cliente);
    const incluirFotos = document.getElementById('incluirFotosPDF')?.checked || false;
    const { conteudo, dataFormatada } = montarConteudoOrcamentoPDF(cliente, itens, total, clienteData, incluirFotos);
    const mensagem = montarMensagemOrcamento(cliente, itens, total);
    const nomeArquivo = `Orcamento_${EMPRESA.nomeAbreviado}_${cliente.replace(/\s/g, '_')}_${dataFormatada.replace(/\//g, '-')}.pdf`;

    atualizarStatus('⏳ Gerando PDF para compartilhar...');

    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!win) { alert('⚠️ Por favor, permita pop-ups para gerar o PDF'); return; }
    win.document.write(conteudo);
    win.document.close();

    setTimeout(() => {
        const script = win.document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = async function () {
            try {
                const opt = {
                    margin: 0.5,
                    filename: nomeArquivo,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                const blob = await win.html2pdf().set(opt).from(win.document.body).outputPdf('blob');
                win.close();

                // Tenta o compartilhamento nativo do celular (anexa o PDF direto na conversa).
                // Só existe em navegadores mobile modernos (Android/iOS); no computador cai no plano B.
                const arquivo = new File([blob], nomeArquivo, { type: 'application/pdf' });
                if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
                    try {
                        await navigator.share({ files: [arquivo], title: `Orçamento ${cliente}`, text: mensagem });
                        atualizarStatus('✅ PDF enviado para compartilhar!');
                        registrarLog('WHATSAPP_ENVIADO', `Orçamento (PDF) para ${cliente} compartilhado`);
                        return;
                    } catch (e) {
                        if (e.name === 'AbortError') { atualizarStatus('Envio cancelado'); return; } // usuário cancelou o compartilhamento
                    }
                }

                // Plano B (computador ou navegador sem suporte a compartilhar arquivos):
                // baixa o PDF e abre o WhatsApp com a mensagem — falta só anexar o arquivo na mão.
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = nomeArquivo; a.click();
                URL.revokeObjectURL(url);
                alert('📄 Seu navegador baixou o PDF, mas não consegue anexá-lo automaticamente ao WhatsApp. Vou abrir a conversa com a mensagem pronta — é só anexar o arquivo que acabou de baixar.');
                window.open(`https://wa.me/${formatarTelefoneWhatsApp(clienteData?.telefone) || EMPRESA.whatsapp}?text=${encodeURIComponent(mensagem)}`, '_blank');
                registrarLog('WHATSAPP_ENVIADO', `Orçamento para ${cliente}: PDF baixado + WhatsApp aberto`);
            } catch (err) {
                win.close();
                alert('❌ Erro ao gerar o PDF para envio. Tente novamente.');
            }
        };
        script.onerror = function () {
            win.close();
            alert('❌ Não foi possível carregar o gerador de PDF. Verifique sua internet e tente de novo.');
        };
        win.document.head.appendChild(script);
    }, 1500);
}

// ============================================
// CÁLCULOS ELÉTRICOS
// ============================================

// Disjuntores termomagnéticos de fabricação padrão (NBR NM 60898 / IEC 60898) em Ampères
const DISJUNTORES_PADRAO = [10, 13, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400];

function disjuntorRecomendado(corrente, ampacidadeCabo) {
    // Regra de coordenação da NBR 5410 (Ib ≤ In ≤ Iz): o disjuntor deve suportar
    // pelo menos a corrente do circuito, sem superar a ampacidade do cabo escolhido.
    for (const d of DISJUNTORES_PADRAO) {
        if (d >= corrente && d <= ampacidadeCabo) return d;
    }
    return null;
}

function popularSelectBitolas(idSelect) {
    const sel = document.getElementById(idSelect);
    if (!sel) return;
    sel.innerHTML = Object.keys(TABELA_AMPACIDADE)
        .map(Number).sort((a, b) => a - b)
        .map(b => `<option value="${b}">${b} mm²</option>`).join('');
}

function bitolaMinimaPorAmpacidade(corrente, fases = 'tri') {
    const bitolasOrdenadas = Object.keys(TABELA_AMPACIDADE).map(Number).sort((a, b) => a - b);
    for (const b of bitolasOrdenadas) {
        if (TABELA_AMPACIDADE[b][fases] >= corrente) return b;
    }
    return null;
}

function calcularQuedaPercentual(corrente, distancia, bitola, tensao, fases) {
    // fases: 'mono' (2 condutores, fator 2) ou 'tri' (3 condutores, fator √3)
    const fator = fases === 'tri' ? Math.sqrt(3) : 2;
    const quedaVolts = (fator * distancia * corrente * RESISTIVIDADE_COBRE) / bitola;
    return (quedaVolts / tensao) * 100;
}

function dimensionarCabos() {
    const corrente = parseFloat(document.getElementById('correnteCabos').value);
    const fases = document.getElementById('fasesCabos').value;
    if (!corrente || corrente <= 0) { alert('⚠️ Informe a corrente!'); return; }
    const bitola = bitolaMinimaPorAmpacidade(corrente, fases);
    if (!bitola) {
        document.getElementById('resultadoCabos').innerHTML = '⚠️ Corrente muito alta para a tabela padrão (acima de 500 mm²) — consulte um projeto específico.';
        return;
    }
    const ampacidade = TABELA_AMPACIDADE[bitola][fases];
    const disjuntor = disjuntorRecomendado(corrente, ampacidade);
    document.getElementById('resultadoCabos').innerHTML = `
        ✅ Bitola recomendada: <strong>${bitola} mm²</strong> (suporta ${ampacidade} A)<br>
        🔌 Disjuntor sugerido: <strong>${disjuntor ? disjuntor + ' A' : 'nenhum padrão se encaixa — avalie manualmente'}</strong>
    `;
}

function calcularQuedaTensao() {
    const corrente = parseFloat(document.getElementById('correnteQueda').value);
    const distancia = parseFloat(document.getElementById('distanciaQueda').value);
    const bitola = parseFloat(document.getElementById('bitolaQueda').value);
    const tensao = parseFloat(document.getElementById('tensaoQueda').value);
    const fases = document.getElementById('fasesQueda').value;
    if (!corrente || !distancia || !bitola || !tensao) { alert('⚠️ Preencha todos os campos!'); return; }
    const quedaPercentual = calcularQuedaPercentual(corrente, distancia, bitola, tensao, fases);
    const status = quedaPercentual <= 3 ? '✅ Dentro do recomendado (≤3%)'
        : quedaPercentual <= 5 ? '⚠️ Aceitável, mas no limite (até 5%)'
        : '❌ Acima do recomendado — considere um cabo mais grosso ou menor distância';
    document.getElementById('resultadoQueda').innerHTML =
        `📉 Queda de tensão: <strong>${quedaPercentual.toFixed(2)}%</strong><br>${status}`;
}

function calcularDemanda() {
    const potencia = parseFloat(document.getElementById('potenciaDemanda').value);
    const tensao = parseFloat(document.getElementById('tensaoDemanda').value);
    const fases = document.getElementById('fasesDemanda').value;
    const fp = parseFloat(document.getElementById('fpDemanda').value) || 0.92;
    if (!potencia || !tensao) { alert('⚠️ Preencha potência e tensão!'); return; }
    const corrente = fases === 'tri' ? potencia / (Math.sqrt(3) * tensao * fp) : potencia / (tensao * fp);
    const demandaKVA = potencia / (1000 * fp);
    const bitola = bitolaMinimaPorAmpacidade(corrente, fases);
    const disjuntor = bitola ? disjuntorRecomendado(corrente, TABELA_AMPACIDADE[bitola][fases]) : null;
    document.getElementById('resultadoDemanda').innerHTML = `
        💡 Corrente estimada: <strong>${corrente.toFixed(2)} A</strong><br>
        📊 Demanda: <strong>${demandaKVA.toFixed(2)} kVA</strong><br>
        📏 Cabo sugerido: <strong>${bitola ? bitola + ' mm²' : 'acima da tabela padrão'}</strong>
        ${disjuntor ? `<br>🔌 Disjuntor sugerido: <strong>${disjuntor} A</strong>` : ''}
    `;
}

function calcularProjeto() {
    const potencia = parseFloat(document.getElementById('potenciaProjeto').value);
    const distancia = parseFloat(document.getElementById('distancia').value);
    const tensao = parseFloat(document.getElementById('tensao').value);
    const fp = parseFloat(document.getElementById('fp').value) || 0.92;
    const quedaMax = parseFloat(document.getElementById('quedaMax').value) || 3;
    if (!potencia || !distancia || !tensao) { alert('⚠️ Preencha ao menos a potência, distância e tensão!'); return; }

    const fases = tensao === 380 ? 'tri' : 'mono';
    const corrente = fases === 'tri' ? potencia / (Math.sqrt(3) * tensao * fp) : potencia / (tensao * fp);

    let bitolaEscolhida = bitolaMinimaPorAmpacidade(corrente, fases);
    if (!bitolaEscolhida) {
        document.getElementById('resultadoProjeto').innerHTML = '❌ Corrente muito alta para a tabela padrão (acima de 500 mm²) — consulte um projeto específico.';
        return;
    }
    // Sobe de bitola até a queda de tensão ficar dentro do limite escolhido
    let quedaFinal = calcularQuedaPercentual(corrente, distancia, bitolaEscolhida, tensao, fases);
    const bitolasOrdenadas = Object.keys(TABELA_AMPACIDADE).map(Number).sort((a, b) => a - b);
    let i = bitolasOrdenadas.indexOf(bitolaEscolhida);
    while (quedaFinal > quedaMax && i < bitolasOrdenadas.length - 1) {
        i++;
        bitolaEscolhida = bitolasOrdenadas[i];
        quedaFinal = calcularQuedaPercentual(corrente, distancia, bitolaEscolhida, tensao, fases);
    }

    const disjuntor = disjuntorRecomendado(corrente, TABELA_AMPACIDADE[bitolaEscolhida][fases]);
    const statusQueda = quedaFinal <= quedaMax ? '✅ dentro do limite definido' : '⚠️ acima do limite — considere reduzir a distância';
    document.getElementById('resultadoProjeto').innerHTML = `
        ⚡ Corrente estimada: <strong>${corrente.toFixed(2)} A</strong><br>
        📏 Bitola recomendada: <strong>${bitolaEscolhida} mm²</strong><br>
        🔌 Disjuntor sugerido: <strong>${disjuntor ? disjuntor + ' A' : 'avalie manualmente'}</strong><br>
        📉 Queda de tensão resultante: <strong>${quedaFinal.toFixed(2)}%</strong> (${statusQueda})
    `;
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
function definirDisplay(id, valor) {
    const el = document.getElementById(id);
    if (el) el.style.display = valor;
}

function abrirTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

function carregarLogo() {
    const header = document.getElementById('headerLogo');
    if (!header) return;
    header.innerHTML = `
        <img src="${LOGO_URL}" alt="SE7VEN" class="logo-dinamica" style="height:54px; width:auto; border-radius:8px; object-fit:contain; margin-right:10px; box-shadow:0 2px 6px rgba(26,35,126,0.25);" onerror="this.style.display='none'">
        <h1 class="logo-title">SE7VEN SOLUÇÕES ENERGÉTICAS</h1>
    `;
}

// Retorna a URL da logo pronta pra usar em PDF/recibo (que abrem em outra janela
// e precisam de uma URL absoluta — logo local vs. logo enviada pelo admin).
function logoParaDocumento(baseUrl) {
    if (LOGO_URL.startsWith('http')) return LOGO_URL; // já é uma URL do Supabase Storage
    return baseUrl + LOGO_URL;
}

function atualizarVisibilidadeConfigAdmin() {
    const blocoLogo = document.getElementById('blocoLogoConfig');
    const blocoFinanceiro = document.getElementById('blocoFinanceiroConfig');
    if (blocoLogo) blocoLogo.style.display = souAdmin() ? 'block' : 'none';
    if (blocoFinanceiro) blocoFinanceiro.style.display = souAdmin() ? 'block' : 'none';
}

function atualizarCamposConfigFinanceiro() {
    const jurosEl = document.getElementById('configJurosMora');
    const multaEl = document.getElementById('configMultaAtraso');
    if (jurosEl) jurosEl.value = CONFIG_FINANCEIRO.jurosMoraMensal;
    if (multaEl) multaEl.value = CONFIG_FINANCEIRO.multaAtraso;
}

async function carregarConfigEmpresa() {
    if (!sb) return;
    try {
        const { data, error } = await sb.from('config_empresa').select('*');
        if (error) throw error;
        (data || []).forEach(linha => {
            if (linha.chave === 'logo_url' && linha.valor) {
                LOGO_URL = linha.valor;
                document.querySelectorAll('.logo-dinamica').forEach(img => img.src = LOGO_URL);
            }
            if (linha.chave === 'juros_mora_mensal') CONFIG_FINANCEIRO.jurosMoraMensal = parseFloat(linha.valor) || 0;
            if (linha.chave === 'multa_atraso') CONFIG_FINANCEIRO.multaAtraso = parseFloat(linha.valor) || 0;
        });
        carregarLogo();
        atualizarCamposConfigFinanceiro();
        const preview = document.getElementById('previewLogoConfig');
        if (preview) { preview.src = LOGO_URL; preview.style.display = 'block'; }
        atualizarVisibilidadeConfigAdmin();
    } catch (e) {
        console.warn('Não foi possível carregar configurações da empresa:', e.message);
    }
}

async function salvarNovaLogo() {
    if (!souAdmin()) { alert('⚠️ Só administradores podem trocar a logo.'); return; }
    const arquivo = document.getElementById('uploadLogoInput')?.files[0];
    if (!arquivo) { alert('⚠️ Escolha uma imagem primeiro.'); return; }
    try {
        atualizarStatus('📸 Enviando nova logo...');
        const extensao = arquivo.name.split('.').pop();
        const caminho = `logo-atual.${extensao}`;
        const { error: erroUpload } = await sb.storage.from('logos').upload(caminho, arquivo, { upsert: true });
        if (erroUpload) throw erroUpload;
        const { data } = sb.storage.from('logos').getPublicUrl(caminho);
        const novaUrl = data.publicUrl + '?t=' + Date.now();
        const { error: erroConfig } = await sb.from('config_empresa')
            .upsert({ chave: 'logo_url', valor: novaUrl, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });
        if (erroConfig) throw erroConfig;
        LOGO_URL = novaUrl;
        document.querySelectorAll('.logo-dinamica').forEach(img => img.src = LOGO_URL);
        carregarLogo();
        document.getElementById('uploadLogoInput').value = '';
        atualizarStatus('✅ Logo atualizada!');
        registrarLog('LOGO_ATUALIZADA', 'Logo da empresa foi trocada');
        alert('✅ Logo atualizada para todo mundo que usa o sistema!');
    } catch (e) {
        alert('❌ Erro ao trocar a logo: ' + e.message);
    }
}

async function salvarConfigFinanceiro() {
    if (!souAdmin()) { alert('⚠️ Só administradores podem alterar isso.'); return; }
    const juros = parseFloat(document.getElementById('configJurosMora').value);
    const multa = parseFloat(document.getElementById('configMultaAtraso').value);
    if (isNaN(juros) || juros < 0 || isNaN(multa) || multa < 0) { alert('⚠️ Informe valores válidos (0 ou mais).'); return; }
    try {
        await sb.from('config_empresa').upsert([
            { chave: 'juros_mora_mensal', valor: String(juros), atualizado_em: new Date().toISOString() },
            { chave: 'multa_atraso', valor: String(multa), atualizado_em: new Date().toISOString() }
        ], { onConflict: 'chave' });
        CONFIG_FINANCEIRO.jurosMoraMensal = juros;
        CONFIG_FINANCEIRO.multaAtraso = multa;
        atualizarStatus('✅ Configuração financeira salva!');
        registrarLog('CONFIG_FINANCEIRA_ALTERADA', `Juros de mora: ${juros}% a.m. · Multa: ${multa}%`);
    } catch (e) {
        alert('❌ Erro ao salvar: ' + e.message);
    }
}

// ============================================
// USUÁRIOS — administradores podem aprovar novos cadastros
// e definir quem é admin ou usuário comum.
// ============================================

const ROTULOS_TIPO = { pendente: '⏳ Pendente', usuario: '👤 Usuário', admin: '👑 Administrador' };

function listarUsuarios() {
    const container = document.getElementById('listaUsuarios');
    if (!container) return;
    if (!perfis.length) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:10px;">Nenhum usuário encontrado</p>';
        return;
    }

    if (!souAdmin()) {
        container.innerHTML = perfis.map(p => `
            <div class="user-item">
                <span><strong>${p.nome}</strong></span>
                <span class="role">${ROTULOS_TIPO[p.tipo] || p.tipo}</span>
            </div>
        `).join('');
        return;
    }

    // Visão de administrador: dá pra aprovar pendentes e trocar o perfil de qualquer um (menos o próprio).
    container.innerHTML = perfis.map(p => {
        const souEu = p.id === usuarioAtual.id;
        const corBadge = p.tipo === 'pendente' ? 'background:#fff3cd;color:#856404;' : '';
        if (souEu) {
            return `
            <div class="user-item">
                <span><strong>${p.nome}</strong> <small style="color:#999;">(você)</small></span>
                <span class="role" style="${corBadge}">${ROTULOS_TIPO[p.tipo] || p.tipo}</span>
            </div>`;
        }
        return `
            <div class="user-item" style="flex-wrap:wrap;gap:6px;">
                <span style="flex:1;min-width:120px;"><strong>${p.nome}</strong><br><small style="color:#999;">${ROTULOS_TIPO[p.tipo] || p.tipo}</small></span>
                <select onchange="atualizarPerfilUsuario('${p.id}', this.value, '${p.nome.replace(/'/g, "\\'")}')" style="width:auto;padding:6px;margin:0;font-size:12px;">
                    <option value="pendente" ${p.tipo === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                    <option value="usuario" ${p.tipo === 'usuario' ? 'selected' : ''}>👤 Usuário</option>
                    <option value="admin" ${p.tipo === 'admin' ? 'selected' : ''}>👑 Administrador</option>
                </select>
            </div>`;
    }).join('');
}

async function atualizarPerfilUsuario(id, novoTipo, nome) {
    if (!souAdmin()) { alert('⚠️ Só administradores podem alterar perfis de usuário.'); return; }
    if (!confirm(`Definir o perfil de "${nome}" como "${ROTULOS_TIPO[novoTipo]}"?`)) { listarUsuarios(); return; }
    try {
        const { error } = await sb.from('profiles').update({ tipo: novoTipo }).eq('id', id);
        if (error) throw error;
        const idx = perfis.findIndex(p => p.id === id);
        if (idx >= 0) perfis[idx].tipo = novoTipo;
        listarUsuarios();
        atualizarStatus(`✅ Perfil de "${nome}" atualizado!`);
        registrarLog('PERFIL_ALTERADO', `Perfil de "${nome}" alterado para ${novoTipo}`);
    } catch (e) {
        alert('❌ Erro ao atualizar perfil: ' + e.message);
        listarUsuarios();
    }
}

// ============================================
// LOGS (sincronizados com o Supabase)
// ============================================

async function registrarLog(acao, detalhes) {
    const entry = { data: new Date().toISOString(), usuario: usuarioAtual?.nome || 'Sistema', acao, detalhes };
    logs.unshift(entry);
    renderizarLogs();
    if (!sb) return;
    try {
        const { error } = await sb.from('logs').insert(entry);
        if (error) console.warn('Não foi possível gravar o log:', error.message);
    } catch (e) { console.warn('Não foi possível gravar o log:', e.message); }
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

async function limparLogs() {
    if (!souAdmin()) { alert('⚠️ Só administradores podem limpar os logs.'); return; }
    if (!confirm('Limpar todos os logs (de todos os dispositivos)?')) return;
    try {
        await sb.from('logs').delete().neq('id', 0);
        logs = [];
        renderizarLogs();
        atualizarStatus('🗑️ Logs limpos!');
    } catch (e) {
        alert('❌ Erro ao limpar logs: ' + e.message);
    }
}

// ============================================
// DESPESAS (contas a pagar da empresa)
// ============================================

const CATEGORIAS_DESPESA = { material: '🧰 Material/Compra', combustivel: '⛽ Combustível', ferramenta: '🔧 Ferramenta', aluguel: '🏠 Aluguel', salario: '💵 Salário', outro: '📦 Outro' };

async function carregarDespesasSupabase() {
    const { data, error } = await sb.from('despesas').select('*').order('data', { ascending: false });
    if (error) throw error;
    despesas = data || [];
    listarDespesas();
}

function listarDespesas(filtro = 'todos') {
    const container = document.getElementById('listaDespesas');
    if (!container) return;
    let lista = filtro !== 'todos' ? despesas.filter(d => d.status === filtro) : despesas;
    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhuma despesa lançada</p>';
        return;
    }
    container.innerHTML = lista.map(d => {
        const dataFmt = d.data ? new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
        const pago = d.status === 'pago';
        return `
        <div class="os-card">
            <div><strong>${d.descricao}</strong> <span class="status-badge ${pago ? 'status-recebido' : 'status-orcamento'}">${pago ? '✅ Pago' : '⏳ Pendente'}</span></div>
            <div style="font-size:12px;color:#666;">${CATEGORIAS_DESPESA[d.categoria] || d.categoria || ''} · ${dataFmt}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px;">
                <strong style="color:#e74c3c;">R$ ${Number(d.valor).toFixed(2)}</strong>
                ${souAdmin() ? `<button onclick="excluirDespesa('${d.id}')" class="btn-secondary" style="padding:4px 8px;">🗑️</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

function filtrarDespesas() { listarDespesas(document.getElementById('filtroDespesa').value); }

async function adicionarDespesa() {
    const descricao = document.getElementById('descricaoDespesa').value.trim();
    const valor = parseFloat(document.getElementById('valorDespesa').value);
    const categoria = document.getElementById('categoriaDespesa').value;
    const data = document.getElementById('dataDespesa').value || new Date().toISOString().split('T')[0];
    const status = document.getElementById('statusDespesa').value;
    if (!descricao || isNaN(valor) || valor <= 0) { alert('⚠️ Descrição e valor válido são obrigatórios'); return; }
    const nova = { id: gerarId(), descricao, valor, categoria, data, status, criado_por: usuarioAtual?.nome || '' };
    try {
        const { error } = await sb.from('despesas').upsert(nova, { onConflict: 'id' });
        if (error) throw error;
        despesas.unshift(nova);
        document.getElementById('descricaoDespesa').value = '';
        document.getElementById('valorDespesa').value = '';
        document.getElementById('dataDespesa').value = '';
        fecharModal('modalDespesa');
        listarDespesas();
        atualizarDashboard();
        atualizarStatus(`✅ Despesa "${descricao}" lançada!`);
        registrarLog('DESPESA_LANCADA', `Despesa "${descricao}" de R$ ${valor.toFixed(2)} lançada`);
    } catch (e) {
        alert('❌ Erro ao lançar despesa: ' + e.message);
    }
}

async function excluirDespesa(id) {
    if (!souAdmin()) { alert('⚠️ Só administradores podem excluir despesas.'); return; }
    const despesa = despesas.find(d => d.id === id);
    if (!despesa || !confirm(`Excluir despesa "${despesa.descricao}"?`)) return;
    try {
        const { error } = await sb.from('despesas').delete().eq('id', id);
        if (error) throw error;
        despesas = despesas.filter(d => d.id !== id);
        listarDespesas();
        atualizarDashboard();
        atualizarStatus('🗑️ Despesa removida');
        registrarLog('DESPESA_EXCLUIDA', `Despesa "${despesa.descricao}" excluída`);
    } catch (e) {
        alert('❌ Erro ao excluir despesa: ' + e.message);
    }
}

// ============================================
// AGENDA DE VISITAS TÉCNICAS
// ============================================

// --- Lembrete sonoro ---
// Navegadores só deixam tocar som depois de alguma interação do usuário na
// página (regra padrão de todos os navegadores). Por isso o "desbloqueio" do
// áudio acontece no primeiro toque em qualquer lugar do app (geralmente já
// no login) — depois disso, os lembretes tocam normalmente mesmo vindo de
// um timer, sem precisar de outro toque.
let audioCtx = null;
function desbloquearAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('click', desbloquearAudio, { once: false });

function tocarBeep(frequencia, quandoSegundos, duracao = 0.3) {
    if (!audioCtx) return;
    try {
        const inicio = audioCtx.currentTime + quandoSegundos;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequencia;
        gain.gain.setValueAtTime(0.35, inicio);
        gain.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(inicio);
        osc.stop(inicio + duracao);
    } catch (e) { /* ignora se o áudio ainda não estiver liberado */ }
}

function tocarLembreteVisita() {
    desbloquearAudio();
    // Agendados de uma vez no relógio do áudio (não em setTimeout), pra tocarem
    // mesmo que um alert() logo em seguida trave a página.
    tocarBeep(880, 0);
    tocarBeep(1046, 0.35);
    tocarBeep(880, 0.7);
}

function chaveVisitasNotificadas() {
    return `se7ven_visitas_notificadas_${new Date().toISOString().split('T')[0]}`;
}
function pegarVisitasNotificadas() {
    try { return new Set(JSON.parse(localStorage.getItem(chaveVisitasNotificadas()) || '[]')); }
    catch (e) { return new Set(); }
}
function marcarVisitaNotificada(id) {
    const notificadas = pegarVisitasNotificadas();
    notificadas.add(id);
    try { localStorage.setItem(chaveVisitasNotificadas(), JSON.stringify([...notificadas])); } catch (e) {}
}

function verificarLembretesVisitas() {
    if (!visitas.length) return;
    const agora = new Date();
    const notificadas = pegarVisitasNotificadas();
    visitas.forEach(v => {
        if (v.status !== 'agendada' || notificadas.has(v.id)) return;
        const horaVisita = new Date(v.data_hora);
        const diffMs = agora - horaVisita;
        // Dispara quando a hora chega, com até 2 minutos de tolerância pra trás
        // (caso o app estivesse fechado ou o timer não tenha rodado exatamente na hora)
        if (diffMs >= 0 && diffMs <= 2 * 60 * 1000) {
            marcarVisitaNotificada(v.id);
            tocarLembreteVisita();
            atualizarStatus(`🔔 Lembrete: visita com ${v.cliente_nome} agora!`);
            alert(`🔔 Lembrete de visita!\n\nCliente: ${v.cliente_nome}\nHorário: ${horaVisita.toLocaleString('pt-BR')}${v.descricao ? '\n' + v.descricao : ''}`);
        }
    });
}

function iniciarLembretesVisitas() {
    verificarLembretesVisitas();
    if (window.__lembretesVisitasInterval) clearInterval(window.__lembretesVisitasInterval);
    window.__lembretesVisitasInterval = setInterval(verificarLembretesVisitas, 30000);
}

async function carregarVisitasSupabase() {
    const { data, error } = await sb.from('visitas').select('*').order('data_hora', { ascending: true });
    if (error) throw error;
    visitas = data || [];
    listarVisitas();
}

function listarVisitas() {
    const container = document.getElementById('listaVisitas');
    if (!container) return;
    if (visitas.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Nenhuma visita agendada</p>';
        return;
    }
    const badges = { agendada: '📅 Agendada', concluida: '✅ Concluída', cancelada: '❌ Cancelada' };
    container.innerHTML = visitas.map(v => {
        const dataHora = new Date(v.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        return `
        <div class="os-card">
            <div><strong>${v.cliente_nome}</strong> <span class="status-badge status-orcamento">${badges[v.status] || v.status}</span></div>
            <div style="font-size:12px;color:#666;">🕐 ${dataHora}</div>
            ${v.descricao ? `<div style="font-size:12px;color:#666;">${v.descricao}</div>` : ''}
            <div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap;">
                ${v.status === 'agendada' ? `
                    <button onclick="adicionarAoGoogleAgenda('${v.id}')" class="btn-info" style="padding:4px 8px;font-size:11px;background:#4285f4;color:white;">📅 Google Agenda</button>
                    <button onclick="concluirVisita('${v.id}')" class="btn-success" style="padding:4px 8px;font-size:11px;">✅ Concluir</button>
                    <button onclick="cancelarVisita('${v.id}')" class="btn-danger" style="padding:4px 8px;font-size:11px;">❌ Cancelar</button>
                ` : ''}
                ${souAdmin() ? `<button onclick="excluirVisita('${v.id}')" class="btn-secondary" style="padding:4px 8px;">🗑️</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

function adicionarAoGoogleAgenda(id) {
    const v = visitas.find(x => x.id === id);
    if (!v) return;
    const inicio = new Date(v.data_hora);
    const fim = new Date(inicio.getTime() + 60 * 60 * 1000); // 1h de duração padrão
    const formatarData = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `Visita técnica - ${v.cliente_nome}`,
        dates: `${formatarData(inicio)}/${formatarData(fim)}`,
        details: v.descricao || `Visita técnica agendada pelo sistema ${EMPRESA.nomeAbreviado}`
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
    registrarLog('VISITA_GOOGLE_AGENDA', `Visita de ${v.cliente_nome} enviada ao Google Agenda`);
}

function renderSelectClienteVisita() {
    const sel = document.getElementById('clienteVisita');
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = '<option value="">Selecione um cliente</option>' + clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    sel.value = atual;
}

async function adicionarVisita() {
    const clienteNome = document.getElementById('clienteVisita').value;
    const dataHora = document.getElementById('dataHoraVisita').value;
    const descricao = document.getElementById('descricaoVisita').value.trim();
    if (!clienteNome || !dataHora) { alert('⚠️ Selecione o cliente e a data/hora!'); return; }
    const clienteData = clientes.find(c => c.nome === clienteNome);
    const nova = {
        id: gerarId(), cliente_id: clienteData?.id || '', cliente_nome: clienteNome,
        data_hora: new Date(dataHora).toISOString(), descricao, status: 'agendada', criado_por: usuarioAtual?.nome || ''
    };
    try {
        const { error } = await sb.from('visitas').upsert(nova, { onConflict: 'id' });
        if (error) throw error;
        visitas.push(nova);
        visitas.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
        document.getElementById('clienteVisita').value = '';
        document.getElementById('dataHoraVisita').value = '';
        document.getElementById('descricaoVisita').value = '';
        fecharModal('modalVisita');
        listarVisitas();
        atualizarDashboard();
        atualizarStatus(`✅ Visita agendada para ${clienteNome}!`);
        registrarLog('VISITA_AGENDADA', `Visita agendada para ${clienteNome}`);
        if (confirm(`✅ Visita agendada!\n\nQuer adicionar também ao Google Agenda do celular? Assim o lembrete toca com som mesmo de app fechado.`)) {
            adicionarAoGoogleAgenda(nova.id);
        }
    } catch (e) {
        alert('❌ Erro ao agendar visita: ' + e.message);
    }
}

async function atualizarStatusVisita(id, novoStatus) {
    const visita = visitas.find(v => v.id === id);
    if (!visita) return;
    const atualizada = { ...visita, status: novoStatus };
    try {
        const { error } = await sb.from('visitas').upsert(atualizada, { onConflict: 'id' });
        if (error) throw error;
        const idx = visitas.findIndex(v => v.id === id);
        if (idx >= 0) visitas[idx] = atualizada;
        listarVisitas();
        atualizarDashboard();
        atualizarStatus('✅ Visita atualizada!');
        registrarLog('VISITA_ATUALIZADA', `Visita de ${visita.cliente_nome} marcada como ${novoStatus}`);
    } catch (e) {
        alert('❌ Erro ao atualizar visita: ' + e.message);
    }
}
function concluirVisita(id) { atualizarStatusVisita(id, 'concluida'); }
function cancelarVisita(id) { if (confirm('Cancelar essa visita?')) atualizarStatusVisita(id, 'cancelada'); }

async function excluirVisita(id) {
    if (!souAdmin()) { alert('⚠️ Só administradores podem excluir visitas.'); return; }
    if (!confirm('Excluir essa visita?')) return;
    try {
        const { error } = await sb.from('visitas').delete().eq('id', id);
        if (error) throw error;
        visitas = visitas.filter(v => v.id !== id);
        listarVisitas();
        atualizarDashboard();
        atualizarStatus('🗑️ Visita removida');
    } catch (e) {
        alert('❌ Erro ao excluir visita: ' + e.message);
    }
}

// ============================================
// DASHBOARD (resumo do negócio)
// ============================================

function atualizarDashboard() {
    const aReceber = recibos.filter(r => r.status !== 'pago')
        .reduce((s, r) => s + (Number(r.total || 0) - valorRecebidoRecibo(r)), 0);
    const agora = new Date();
    const mesAtual = agora.getMonth(), anoAtual = agora.getFullYear();
    const recebidoMes = recibos.reduce((s, r) => {
        const pagamentosDoMes = (r.pagamentos || []).filter(p => {
            const d = new Date(p.data);
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        });
        return s + pagamentosDoMes.reduce((s2, p) => s2 + Number(p.valor || 0), 0);
    }, 0);
    const despesasMes = despesas.filter(d => d.data &&
        new Date(d.data + 'T00:00:00').getMonth() === mesAtual && new Date(d.data + 'T00:00:00').getFullYear() === anoAtual)
        .reduce((s, d) => s + Number(d.valor || 0), 0);
    const osAndamento = ordensServico.filter(o => o.status === 'aprovado' || o.status === 'em_andamento').length;
    const estoqueBaixoCount = produtos.filter(p =>
        p.quantidade !== null && p.quantidade !== undefined &&
        p.estoque_minimo !== null && p.estoque_minimo !== undefined &&
        Number(p.quantidade) <= Number(p.estoque_minimo)
    ).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('dashAReceber', `R$ ${aReceber.toFixed(2)}`);
    set('dashRecebidoMes', `R$ ${recebidoMes.toFixed(2)}`);
    set('dashDespesasMes', `R$ ${despesasMes.toFixed(2)}`);
    set('dashOSAndamento', osAndamento);
    set('dashClientes', clientes.length);
    set('dashEstoqueBaixo', estoqueBaixoCount);

    const proximasVisitas = visitas.filter(v => v.status === 'agendada' && new Date(v.data_hora) >= new Date())
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora)).slice(0, 5);
    const container = document.getElementById('dashProximasVisitas');
    if (container) {
        if (proximasVisitas.length === 0) {
            container.innerHTML = '<p style="color:#999;text-align:center;padding:10px;font-size:12px;">Nenhuma visita agendada em breve</p>';
        } else {
            container.innerHTML = `<h3 style="font-size:14px;color:#1a237e;margin-bottom:8px;">📅 Próximas visitas</h3>` + proximasVisitas.map(v => `
                <div style="background:#f8f9fa;padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:12px;">
                    <strong>${v.cliente_nome}</strong> — ${new Date(v.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
            `).join('');
        }
    }
    atualizarCaixa();
}

// ============================================
// CAIXA (controle de a receber / a pagar)
// ============================================

function atualizarCaixa() {
    const recibosAbertos = recibos.filter(r => r.status !== 'pago')
        .map(r => ({ ...r, saldo: Number(r.total || 0) - valorRecebidoRecibo(r) }))
        .filter(r => r.saldo > 0)
        .sort((a, b) => new Date(a.data_emissao) - new Date(b.data_emissao));
    const despesasAbertas = despesas.filter(d => d.status !== 'pago')
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    const totalReceber = recibosAbertos.reduce((s, r) => s + r.saldo, 0);
    const totalPagar = despesasAbertas.reduce((s, d) => s + Number(d.valor || 0), 0);
    const saldo = totalReceber - totalPagar;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('caixaAReceber', `R$ ${totalReceber.toFixed(2)}`);
    set('caixaAPagar', `R$ ${totalPagar.toFixed(2)}`);
    const saldoEl = document.getElementById('caixaSaldo');
    if (saldoEl) {
        saldoEl.textContent = `R$ ${saldo.toFixed(2)}`;
        saldoEl.style.color = saldo >= 0 ? '#1a237e' : '#c0392b';
    }

    const listaReceber = document.getElementById('caixaListaReceber');
    if (listaReceber) {
        listaReceber.innerHTML = recibosAbertos.length === 0
            ? '<p style="color:#999;text-align:center;padding:10px;font-size:12px;">Nada a receber 🎉</p>'
            : recibosAbertos.map(r => `
                <div class="os-card" onclick="abrirRecibo('${r.id}')">
                    <div><strong>${r.cliente_nome}</strong> <span class="status-badge ${r.status === 'parcial' ? 'status-os' : 'status-orcamento'}">${r.status === 'parcial' ? '🔶 Parcial' : '⏳ Pendente'}</span></div>
                    <div style="font-size:12px;color:#666;">${r.numero} · Total: R$ ${Number(r.total || 0).toFixed(2)}</div>
                    <div style="font-size:12px;color:#e67e22;font-weight:bold;">Saldo: R$ ${r.saldo.toFixed(2)}</div>
                </div>
            `).join('');
    }

    const listaPagar = document.getElementById('caixaListaPagar');
    if (listaPagar) {
        listaPagar.innerHTML = despesasAbertas.length === 0
            ? '<p style="color:#999;text-align:center;padding:10px;font-size:12px;">Nada a pagar 🎉</p>'
            : despesasAbertas.map(d => `
                <div class="os-card">
                    <div><strong>${d.descricao}</strong></div>
                    <div style="font-size:12px;color:#666;">${CATEGORIAS_DESPESA[d.categoria] || d.categoria || ''} · ${d.data ? new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</div>
                    <div style="font-size:12px;color:#c0392b;font-weight:bold;">R$ ${Number(d.valor || 0).toFixed(2)}</div>
                </div>
            `).join('');
    }
}

// ============================================
// HISTÓRICO DO CLIENTE
// ============================================

function abrirHistoricoCliente(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;
    document.getElementById('tituloHistoricoCliente').textContent = `📋 Histórico — ${cliente.nome}`;
    const osDoCliente = ordensServico.filter(o => o.cliente_id === clienteId || o.cliente_nome === cliente.nome);
    const recibosDoCliente = recibos.filter(r => r.cliente_id === clienteId || r.cliente_nome === cliente.nome);
    const visitasDoCliente = visitas.filter(v => v.cliente_id === clienteId || v.cliente_nome === cliente.nome);

    let html = '';
    if (!osDoCliente.length && !recibosDoCliente.length && !visitasDoCliente.length) {
        html = '<p style="color:#999;text-align:center;padding:20px;">Nenhum histórico encontrado para esse cliente</p>';
    } else {
        const badgesOS = { orcamento: '📄 Orçamento', aprovado: '✅ Aprovado', em_andamento: '🔧 Em Andamento', concluido: '✅ Concluído', cancelado: '❌ Cancelado' };
        if (osDoCliente.length) {
            html += `<h4 style="color:#1a237e;font-size:13px;margin:10px 0 6px;">📄 Orçamentos/OS</h4>`;
            html += osDoCliente.map(o => `<div style="font-size:12px;background:#f8f9fa;padding:6px 10px;border-radius:6px;margin-bottom:4px;">${o.numero} — ${badgesOS[o.status] || o.status} — R$ ${Number(o.total || 0).toFixed(2)}</div>`).join('');
        }
        if (recibosDoCliente.length) {
            html += `<h4 style="color:#1a237e;font-size:13px;margin:10px 0 6px;">💰 Recibos</h4>`;
            html += recibosDoCliente.map(r => `<div style="font-size:12px;background:#f8f9fa;padding:6px 10px;border-radius:6px;margin-bottom:4px;">${r.numero} — ${r.status === 'pago' ? '✅ Pago' : '⏳ Pendente'} — R$ ${Number(r.total || 0).toFixed(2)}</div>`).join('');
        }
        if (visitasDoCliente.length) {
            html += `<h4 style="color:#1a237e;font-size:13px;margin:10px 0 6px;">📅 Visitas</h4>`;
            html += visitasDoCliente.map(v => `<div style="font-size:12px;background:#f8f9fa;padding:6px 10px;border-radius:6px;margin-bottom:4px;">${new Date(v.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} — ${v.status}</div>`).join('');
        }
    }
    document.getElementById('conteudoHistoricoCliente').innerHTML = html;
    abrirModal('modalHistoricoCliente');
}

// ============================================
// CATÁLOGO PADRÃO DE PRODUTOS
// ============================================

function gerarProdutos() {
    const lista = [
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
    return lista.map(item => ({ id: String(id++), nome: item.nome, preco: item.preco, tipo: item.tipo }));
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================
// BACKUP (JSON local — continua útil como cópia de segurança extra)
// ============================================

function montarDadosBackup() {
    return { clientes, produtos, ordensServico, recibos, logs, data: new Date().toISOString() };
}

function exportarDados() {
    const dados = montarDadosBackup();
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_se7ven_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    atualizarStatus('✅ Backup baixado neste dispositivo!');
    registrarLog('EXPORTAR', 'Backup baixado localmente');
}

async function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (!dados.clientes) { alert('❌ Arquivo inválido!'); return; }
            if (!confirm('Isso vai enviar os dados do backup para o Supabase (mesclando com o que já existe). Continuar?')) return;
            if (dados.clientes?.length) await sb.from('clientes').upsert(dados.clientes, { onConflict: 'id' });
            if (dados.produtos?.length) await sb.from('produtos').upsert(dados.produtos, { onConflict: 'id' });
            if (dados.ordensServico?.length) await sb.from('ordens_servico').upsert(dados.ordensServico, { onConflict: 'id' });
            if (dados.recibos?.length) await sb.from('recibos').upsert(dados.recibos, { onConflict: 'id' });
            await sincronizarDados();
            atualizarStatus('✅ Dados importados!');
            registrarLog('IMPORTAR', 'Dados importados do JSON');
            alert('✅ Dados importados com sucesso!');
        } catch (err) {
            alert('❌ Erro ao importar: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// BACKUP NO GOOGLE DRIVE (upload de verdade)
// Precisa de um Client ID OAuth do Google Cloud Console, configurado em
// config.js (CONFIG.GOOGLE.driveClientId). Veja o LEIA-ME.md para o passo a passo.
// ============================================

let googleTokenClient = null;

function enviarBackupGoogleDrive() {
    if (!CFG.GOOGLE?.driveClientId) {
        if (confirm('⚠️ O envio automático para o Google Drive ainda não foi configurado (falta o Client ID do Google no config.js).\n\nQuer baixar o backup neste dispositivo por enquanto?')) {
            exportarDados();
        }
        return;
    }
    if (!window.google?.accounts?.oauth2) {
        alert('⚠️ Não foi possível carregar o Google. Verifique sua internet e tente de novo.');
        return;
    }
    if (!googleTokenClient) {
        googleTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CFG.GOOGLE.driveClientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: '' // definido abaixo, a cada chamada
        });
    }

    atualizarStatus('☁️ Conectando ao Google Drive...');
    googleTokenClient.callback = async (resposta) => {
        if (resposta.error) {
            alert('❌ Não foi possível autorizar o acesso ao Google Drive.');
            return;
        }
        try {
            const dados = montarDadosBackup();
            const nomeArquivo = `backup_se7ven_${new Date().toISOString().split('T')[0]}.json`;
            const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });

            const metadata = { name: nomeArquivo, mimeType: 'application/json' };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            atualizarStatus('☁️ Enviando backup para o Google Drive...');
            const uploadResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { Authorization: `Bearer ${resposta.access_token}` },
                body: form
            });
            if (!uploadResp.ok) throw new Error(`Falha no envio (${uploadResp.status})`);

            atualizarStatus('✅ Backup enviado para o Google Drive!');
            registrarLog('BACKUP_DRIVE', `Backup enviado para o Google Drive: ${nomeArquivo}`);
            alert(`✅ Backup "${nomeArquivo}" enviado para o seu Google Drive!`);
        } catch (e) {
            alert('❌ Erro ao enviar para o Google Drive: ' + e.message);
        }
    };
    googleTokenClient.requestAccessToken();
}

function atualizarEstatisticas() {
    try {
        const el1 = document.getElementById('statsClientes');
        const el2 = document.getElementById('statsProdutos');
        const el3 = document.getElementById('statsOS');
        const el4 = document.getElementById('statsRecibos');
        if (el1) el1.textContent = `Clientes: ${clientes.length}`;
        if (el2) el2.textContent = `Produtos: ${produtos.length}`;
        if (el3) el3.textContent = `Ordens de Serviço: ${ordensServico.length}`;
        if (el4) el4.textContent = `Recibos: ${recibos.length}`;
    } catch (e) {}
}

function limparDadosLocais() {
    if (!confirm('Isso limpa apenas o cache local deste navegador (os dados no Supabase continuam intactos). Continuar?')) return;
    try {
        localStorage.clear();
        atualizarStatus('🗑️ Cache local limpo! Recarregando...');
        setTimeout(() => location.reload(), 800);
    } catch (e) {}
}

function recarregarDados() {
    sincronizarDados();
    atualizarStatus('🔄 Dados recarregados!');
}

// ============================================
// INICIALIZAÇÃO
// ============================================

function init() {
    console.log('🚀 Inicializando sistema...');
    atualizarVisibilidadeConfigAdmin();
    renderClientes();
    renderProdutos();
    renderSelectClientes();
    renderSelectProdutos();
    updateTotal();
    listarOS();
    listarRecibos();
    listarDespesas();
    listarVisitas();
    atualizarDashboard();
    iniciarLembretesVisitas();
    renderizarLogs();
    listarUsuarios();
    carregarLogo();
    popularSelectBitolas('bitolaQueda');
    atualizarIndicadorFilaOffline();
    iniciarSincronizacaoAutomatica();
    atualizarStatus(`✅ Sistema pronto!`);
    console.log('✅ Sistema inicializado!');
}

// ============================================
// EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('📄 DOM carregado!');
    const versaoEl = document.getElementById('versaoApp');
    if (versaoEl) versaoEl.textContent = APP_VERSAO;
    const versaoConfigEl = document.getElementById('versaoAppConfig');
    if (versaoConfigEl) versaoConfigEl.textContent = APP_VERSAO;

    if (sb) {
        await carregarConfigEmpresa();
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            await entrarNoSistema(session.user);
        } else {
            mostrarTelaLogin();
        }
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && !usuarioAtual) entrarNoSistema(session.user);
            if (event === 'SIGNED_OUT') mostrarTelaLogin();
        });
    } else {
        mostrarTelaLogin();
    }

    // Eventos de Login
    document.getElementById('loginEmail')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') document.getElementById('loginSenha').focus();
    });
    document.getElementById('loginSenha')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') fazerLogin();
    });

    // Eventos dos Botões
    document.getElementById('btnAddCliente')?.addEventListener('click', function () {
        abrirModal('modalCliente');
        document.getElementById('nomeCliente').focus();
    });
    document.getElementById('btnAddProduto')?.addEventListener('click', function () {
        document.querySelector('#modalProduto h3').textContent = '📦 Novo Produto';
        document.getElementById('nomeProduto').value = '';
        document.getElementById('precoProduto').value = '';
        document.getElementById('descricaoProduto').value = '';
        document.getElementById('codigoBarrasProduto').value = '';
        document.getElementById('fotoProduto').value = '';
        document.getElementById('previewFotoProduto').style.display = 'none';
        abrirModal('modalProduto');
        document.getElementById('nomeProduto').focus();
    });
    document.getElementById('fotoProduto')?.addEventListener('change', function (e) {
        const arquivo = e.target.files[0];
        const preview = document.getElementById('previewFotoProduto');
        if (!arquivo) { preview.style.display = 'none'; return; }
        preview.src = URL.createObjectURL(arquivo);
        preview.style.display = 'block';
    });
    document.getElementById('btnAddItem')?.addEventListener('click', adicionarItem);
    document.getElementById('btnLimpar')?.addEventListener('click', limparOrcamento);
    document.getElementById('btnSalvarOrcamento')?.addEventListener('click', salvarOrcamento);
    document.getElementById('btnGerarPDF')?.addEventListener('click', gerarPDF);
    document.getElementById('btnEnviarPDF')?.addEventListener('click', enviarPDFWhatsApp);
    document.getElementById('btnWhatsApp')?.addEventListener('click', enviarWhatsApp);
    document.getElementById('salvarCliente')?.addEventListener('click', adicionarCliente);
    document.getElementById('salvarProduto')?.addEventListener('click', adicionarProduto);
    document.getElementById('btnBuscarCNPJ')?.addEventListener('click', buscarCNPJ);
    document.getElementById('btnEscanearProduto')?.addEventListener('click', escanearParaProduto);
    document.getElementById('btnEscanearModalProduto')?.addEventListener('click', escanearParaModalProduto);
    document.getElementById('btnFecharScanner')?.addEventListener('click', fecharScanner);
    document.getElementById('fecharModalCliente')?.addEventListener('click', function () { fecharModal('modalCliente'); });
    document.getElementById('fecharModalProduto')?.addEventListener('click', function () { fecharModal('modalProduto'); });
    document.getElementById('btnFecharOS')?.addEventListener('click', function () { fecharModal('modalOS'); });
    document.getElementById('btnFecharRecibo')?.addEventListener('click', function () { fecharModal('modalRecibo'); });

    // Paginação
    document.getElementById('btnPagAnteriorClientes')?.addEventListener('click', paginaAnteriorClientes);
    document.getElementById('btnPagProximaClientes')?.addEventListener('click', paginaProximaClientes);
    document.getElementById('btnPagAnteriorProdutos')?.addEventListener('click', paginaAnteriorProdutos);
    document.getElementById('btnPagProximaProdutos')?.addEventListener('click', paginaProximaProdutos);

    // Despesas
    document.getElementById('btnSalvarLogo')?.addEventListener('click', salvarNovaLogo);
    document.getElementById('uploadLogoInput')?.addEventListener('change', function (e) {
        const arquivo = e.target.files[0];
        const preview = document.getElementById('previewLogoConfig');
        if (!arquivo || !preview) return;
        preview.src = URL.createObjectURL(arquivo);
        preview.style.display = 'block';
    });
    document.getElementById('btnSalvarConfigFinanceiro')?.addEventListener('click', salvarConfigFinanceiro);

    document.getElementById('btnAddDespesa')?.addEventListener('click', function () {
        document.getElementById('descricaoDespesa').value = '';
        document.getElementById('valorDespesa').value = '';
        document.getElementById('dataDespesa').value = new Date().toISOString().split('T')[0];
        abrirModal('modalDespesa');
    });
    document.getElementById('salvarDespesa')?.addEventListener('click', adicionarDespesa);
    document.getElementById('fecharModalDespesa')?.addEventListener('click', function () { fecharModal('modalDespesa'); });

    // Agenda de visitas
    document.getElementById('btnAddVisita')?.addEventListener('click', function () {
        document.getElementById('clienteVisita').value = '';
        document.getElementById('dataHoraVisita').value = '';
        document.getElementById('descricaoVisita').value = '';
        abrirModal('modalVisita');
    });
    document.getElementById('salvarVisita')?.addEventListener('click', adicionarVisita);
    document.getElementById('fecharModalVisita')?.addEventListener('click', function () { fecharModal('modalVisita'); });

    // Histórico do cliente
    document.getElementById('btnFecharHistorico')?.addEventListener('click', function () { fecharModal('modalHistoricoCliente'); });

    // Forma de pagamento do orçamento: mostra parcelas só quando é cartão
    document.getElementById('formaPagamentoOrcamento')?.addEventListener('change', function () {
        document.getElementById('parcelasOrcamento').style.display = this.value === 'Cartão de Crédito' ? 'block' : 'none';
        definirDisplay('blocoCrediario', this.value === 'Crediário Próprio' ? 'block' : 'none');
    });

    // Eventos da OS
    document.getElementById('btnEditarOS')?.addEventListener('click', () => editarOS(osAtual?.id));
    document.getElementById('btnReimprimirOS')?.addEventListener('click', () => reimprimirOS(osAtual?.id));
    document.getElementById('btnAprovarOS')?.addEventListener('click', aprovarOS);
    document.getElementById('btnIniciarOS')?.addEventListener('click', iniciarOS);
    document.getElementById('btnConcluirOS')?.addEventListener('click', concluirOS);
    document.getElementById('btnCancelarOS')?.addEventListener('click', cancelarOS);
    document.getElementById('btnEmitirRecibo')?.addEventListener('click', emitirRecibo);

    // Eventos do Recibo
    document.getElementById('btnRegistrarPagamento')?.addEventListener('click', abrirPagamentoRecibo);
    document.getElementById('salvarPagamentoRecibo')?.addEventListener('click', confirmarPagamentoRecibo);
    document.getElementById('fecharModalPagamento')?.addEventListener('click', function () { fecharModal('modalPagamentoRecibo'); });
    document.getElementById('btnImprimirRecibo')?.addEventListener('click', imprimirRecibo);

    // Fechar modal clicando fora
    window.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    });

    // Busca Clientes
    document.getElementById('buscaCliente')?.addEventListener('input', function (e) {
        filtroClientes = e.target.value.toLowerCase().trim();
        paginaClientes = 0;
        renderClientes();
    });

    // Busca Produtos
    document.getElementById('buscaProduto')?.addEventListener('input', function (e) {
        filtroProdutos = e.target.value.toLowerCase().trim();
        paginaProdutos = 0;
        renderProdutos();
    });

    // Enter nos modais
    document.getElementById('nomeCliente')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') adicionarCliente(); });
    document.getElementById('nomeProduto')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') adicionarProduto(); });
    document.getElementById('precoProduto')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') adicionarProduto(); });

    console.log('✅ Eventos configurados!');
});

console.log('⚡ SE7VEN ENERGIA - Sistema carregado!');
