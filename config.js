// ============================================
// CONFIG.JS - ARQUIVO DE CONFIGURAÇÃO
// ============================================
// Esta chave é a PÚBLICA (publishable/anon) - ela É PARA FICAR no navegador.
// Nunca coloque aqui a "secret key" / "service_role key" do Supabase.
const CONFIG = {
    SUPABASE: {
        url: 'https://aqxrogqjeaxbckfxwbtt.supabase.co',
        publicKey: 'sb_publishable_23NQo9Pd7-hvhyhNQQrpHw_WP_o7DzM'
    },
    GOOGLE: {
        // Client ID OAuth do Google Cloud Console (tipo "Web application").
        // Veja o LEIA-ME.md para o passo a passo de como gerar o seu.
        // Sem isso preenchido, o botão de backup no Drive avisa e permite baixar localmente.
        driveClientId: ''
    }
};
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    console.log('✅ Configurações carregadas do config.js');
}
