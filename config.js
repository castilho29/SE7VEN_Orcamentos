// ============================================
// CONFIG.JS - ARQUIVO DE CONFIGURAÇÃO
// ============================================
// Esta chave é a PÚBLICA (publishable/anon) - ela É PARA FICAR no navegador.
// Nunca coloque aqui a "secret key" / "service_role key" do Supabase.
const CONFIG = {
    SUPABASE: {
        url: 'https://aqxrogqjeaxbckfxwbtt.supabase.co',
        publicKey: 'sb_publishable_23NQo9Pd7-hvhyhNQQrpHw_WP_o7DzM'
    }
};
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    console.log('✅ Configurações carregadas do config.js');
}
