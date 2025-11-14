// ==UserScript==
// @name         Geogrid Tools
// @namespace    http://tampermonkey.net/
// @version      3.12
// @description  Adiciona um HUD com informações de clientes e atalhos no Geo Grid, ativado pela tecla "+" do Numpad.
// @author       Jhon
// @match        http://172.16.6.57/geogrid/aconcagua/*
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/db.js@0.15.0/dist/db.min.js
// @downloadURL https://github.com/Jhondbs/Geogrid-HUD/raw/refs/heads/main/Geo%20Grid%20Maps%20HUD%20(Atalho)-1.3.user.js
// @updateURL https://github.com/Jhondbs/Geogrid-HUD/raw/refs/heads/main/Geo%20Grid%20Maps%20HUD%20(Atalho)-1.3.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. CONSTANTES E CONFIGURAÇÕES INICIAIS ---

    // ÍCONES SVG
    const ICONS = {
        search: `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`, // <-- ADICIONE ESTA LINHA
        notes: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
        copy: `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
        settings: `<svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49-.42l-.38 2.65c-.61-.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24-.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69-.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`,
        map: `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
        crosshair: `<svg viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>`
    };

    // LÓGICA DE CONFIGURAÇÕES (LocalStorage)
    const STORAGE_KEY = "geoGridHudSettings";
    const DEFAULT_SETTINGS = {
        modoClaro: false,
        copiarCoordenadas: false,
        removerIndesejado: true,
        exibirNomeCliente: false,
        searchBarVisible: true,
        somenteCancelados: true,
        copiarNomeRede: false,
        abrirNovaGuia: false,
        destacarRedesDivergentes: true,
        copiarStatus: true,
    };

    // ESTILOS (CSS)
    const cssStyles = `
        :root {
            /* Modo Escuro (Padrão) */
            --hud-bg: #282c34;
            --hud-bg-light: #3a3f4b;
            --hud-border: #4e5463;
            --hud-text: #abb2bf;
            --hud-text-header: #ffffff;
            --hud-accent: #61afef;
            --hud-green: #98c379;
            --hud-red: #e06c75;
            --hud-orange: #d19a66;
            --hud-font: 'Segoe UI', Roboto, sans-serif;
        }

        /* (NOVO) Definições de Cores do Modo Claro */
        body.hud-light-mode {
            --hud-bg: #f4f6f8;             /* Fundo principal (branco suave) */
            --hud-bg-light: #ffffff;       /* Fundo dos cabeçalhos (branco) */
            --hud-border: #d1d5da;         /* Bordas (cinza claro) */
            --hud-text: #24292e;           /* Texto principal (preto suave) */
            --hud-text-header: #1b1f23;    /* Texto dos cabeçalhos (preto forte) */
            --hud-accent: #0366d6;         /* Cor de destaque (azul) */
            --hud-green: #28a745;         /* Verde */
            --hud-red: #d73a49;           /* Vermelho */
            --hud-orange: #f66a0a;        /* Laranja */
        }

        /* (NOVO) Ajustes finos para o Modo Claro */
        /* Ajusta o placeholder do input de pesquisa */
        body.hud-light-mode .hud-search-input::placeholder {
            color: #586069;
        }
        /* Ajusta a cor dos ícones dos botões da HUD */
        body.hud-light-mode .hud-btn {
            color: var(--hud-text);
        }
        body.hud-light-mode .hud-btn:hover {
            color: white; /* Cor do ícone no hover (branco) */
        }
        body.hud-light-mode .hud-btn.active {
             color: white; /* Cor do ícone ativo (branco) */
        }
        /* Ajusta o botão de fechar */
        body.hud-light-mode .hud-btn-close {
            color: var(--hud-text);
        }
        body.hud-light-mode .hud-btn-close:hover {
            color: var(--hud-red);
        }
        /* Ajusta o texto da rede no painel principal */
        body.hud-light-mode .hud-network-header strong {
            color: var(--hud-accent);
        }
        /* Ajusta o texto da porta no painel principal */
        body.hud-light-mode .hud-client-row .port {
            color: var(--hud-accent);
        }
        /* Ajusta o texto do nome do cliente */
        body.hud-light-mode .hud-client-name {
            color: var(--hud-text);
            opacity: 0.8;
        }
        /* Ajusta o fundo da textarea de anotações */
        body.hud-light-mode #blocoNotasHUD textarea {
            background: var(--hud-bg);
            color: var(--hud-text);
        }
        .hud-panel {
            position: fixed;
            background: var(--hud-bg);
            border: 1px solid var(--hud-border);
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.4);
            font-family: var(--hud-font);
            color: var(--hud-text);
            z-index: 2147483647;
            padding: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-width: 280px;
            min-height: 150px;
            max-height: 550px;
        }
        .hud-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            background: var(--hud-bg-light);
            border-bottom: 1px solid var(--hud-border);
            cursor: move;
            user-select: none;
            flex-shrink: 0;
        }
        .hud-header strong {
            color: var(--hud-text-header);
            font-size: 14px;
        }
        .hud-header img.hud-icon {
            width: 16px;
            height: 16px;
        }
        .hud-content {
            padding: 8px 12px;
            font-size: 13px;
            overflow-y: auto;
            flex-grow: 1;
        }
        .hud-buttons-group {
            margin-left: auto;
            display: flex;
            gap: 4px;
        }
        .hud-btn {
            background: transparent;
            border: 1px solid var(--hud-border);
            color: var(--hud-text);
            padding: 4px;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s, color 0.2s;
            width: 30px;
            height: 30px;
        }
        .hud-btn:hover {
            background-color: var(--hud-accent);
            color: white;
        }
        .hud-btn.active {
            background-color: var(--hud-accent);
            color: white;
        }
        .hud-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
        .hud-btn-close { background: transparent; border: none; font-size: 18px; color: var(--hud-text); cursor: pointer; padding: 0 8px; }
        .hud-btn-close:hover { color: var(--hud-red); }

        .hud-client-row {
            padding: 3px 0;
            cursor: pointer;
            border-radius: 3px;
            transition: background-color 0.2s;
        }
        .hud-client-row.clicked {
            opacity: 0.5;
            text-decoration: line-through;
        }
        .hud-client-row:hover {
            background-color: var(--hud-bg-light);
        }
        .hud-client-row .port { font-size: 0.9em; color: var(--hud-accent); min-width: 20px; display: inline-block; }
        .hud-client-row .contract { font-weight: 600; color: var(--hud-text-header); }
        .hud-client-row .status-ATIVO { color: var(--hud-green); }
        .hud-client-row .status-CANCELADO { color: var(--hud-red); }
        .hud-client-row .status-SUSPENSO { color: var(--hud-orange); }
        .hud-client-row .status-NAO-IDENTIFICADO { color: var(--hud-text); }
        .hud-client-row.network-divergent { background-color: rgba(224, 108, 117, 0.2); }
        .hud-network-header { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--hud-border); }
        .hud-network-header strong { color: var(--hud-accent); }

        .hud-checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            padding: 6px;
            cursor: pointer;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .hud-checkbox-label:hover {
             background-color: var(--hud-bg-light);
        }
        .hud-checkbox-label input {
            accent-color: var(--hud-accent);
        }

        .hud-content {
            scrollbar-width: thin;
            scrollbar-color: var(--hud-border) var(--hud-bg);
        }
        .hud-content::-webkit-scrollbar { width: 8px; }
        .hud-content::-webkit-scrollbar-track { background: var(--hud-bg); }
        .hud-content::-webkit-scrollbar-thumb {
            background-color: var(--hud-border);
            border-radius: 4px;
            border: 2px solid var(--hud-bg);
        }
        .hud-content::-webkit-scrollbar-thumb:hover { background-color: var(--hud-accent); }

        .resizer {
            position: absolute;
            background: transparent;
        }
        .resizer.top { top: -4px; left: 0; right: 0; height: 8px; cursor: ns-resize; }
        .resizer.bottom { bottom: -4px; left: 0; right: 0; height: 8px; cursor: ns-resize; }
        .resizer.left { left: -4px; top: 0; bottom: 0; width: 8px; cursor: ew-resize; }
        .resizer.right { right: -4px; top: 0; bottom: 0; width: 8px; cursor: ew-resize; }
        .resizer.top-left { top: -4px; left: -4px; width: 12px; height: 12px; cursor: nwse-resize; z-index: 10; }
        .resizer.top-right { top: -4px; right: -4px; width: 12px; height: 12px; cursor: nesw-resize; z-index: 10; }
        .resizer.bottom-left { bottom: -4px; left: -4px; width: 12px; height: 12px; cursor: nesw-resize; z-index: 10; }
        .resizer.bottom-right { bottom: -4px; right: -4px; width: 12px; height: 12px; cursor: nwse-resize; z-index: 10; }

       /* --- ESTILOS DE PESQUISA (TESTE SIMPLIFICADO) --- */
        .hud-client-row.highlighted {
            /* Usamos a cor --hud-orange com 40% de opacidade */
            background-color: rgba(209, 154, 102, 0.4) !important;
        }

        /* O hover normal não vai sobrepor o destaque */
        .hud-client-row.highlighted:hover {
            background-color: rgba(209, 154, 102, 0.6) !important;
        }

        .hud-search-bar {
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 1px solid var(--hud-border);
        }

        .hud-search-input {
            width: 100%;
            background-color: var(--hud-bg-light);
            border: 1px solid var(--hud-border);
            color: var(--hud-text);
            padding: 8px;
            border-radius: 4px;
            font-family: var(--hud-font);
            font-size: 14px;
            box-sizing: border-box; /* Garante que o padding não quebre a largura */
        }

        .hud-search-input::placeholder {
            color: var(--hud-text);
            opacity: 0.6;
        }
        .hud-client-name {
            color: var(--hud-text); /* Cor de texto normal */
            font-weight: normal;
            font-size: 0.95em;
            opacity: 0.8; /* Um pouco mais suave que o contrato */
        }
        /* --- ESTILOS PAINEL CONFIGURAÇÕES --- */
        .hud-settings-header {
            color: var(--hud-accent); /* Cor de destaque (azul) */
            font-weight: 600;
            font-size: 14px;
            padding-bottom: 4px;
            margin-top: 10px; /* Espaço acima do título */
            margin-bottom: 4px; /* Espaço abaixo do título */
            border-bottom: 1px solid var(--hud-border);
        }
        /* Garante que o primeiro header não tenha margem em cima */
        .hud-settings-header:first-of-type {
            margin-top: 0;
        }
        /* --- ESTILOS DO PAINEL DE CADASTRO DE EQUIPAMENTO --- */
        .hud-cadastro-content {
            display: flex;
            flex-direction: column;
            height: 100%;
            box-sizing: border-box; /* Garante que o padding não quebre a altura */
            background-color: var(--hud-bg); /* Garante o fundo */
        }
        .hud-cadastro-body {
            flex-grow: 1; /* Faz o corpo crescer para preencher o espaço */
            overflow-y: auto;
            padding: 10px 15px;
            /* Estilos da barra de rolagem (copiados do .hud-content) */
            scrollbar-width: thin;
            scrollbar-color: var(--hud-border) var(--hud-bg);
        }
        .hud-cadastro-body::-webkit-scrollbar { width: 8px; }
        .hud-cadastro-body::-webkit-scrollbar-track { background: var(--hud-bg); }
        .hud-cadastro-body::-webkit-scrollbar-thumb {
            background-color: var(--hud-border);
            border-radius: 4px;
            border: 2px solid var(--hud-bg);
        }
        .hud-cadastro-header {
            color: var(--hud-accent);
            font-weight: 600;
            font-size: 14px;
            padding-bottom: 4px;
            margin-top: 10px;
            margin-bottom: 8px;
            border-bottom: 1px solid var(--hud-border);
        }
        .hud-cadastro-header:first-of-type {
            margin-top: 0;
        }
        .hud-btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .hud-toggle-btn {
            background: var(--hud-bg-light);
            border: 1px solid var(--hud-border);
            color: var(--hud-text);
            padding: 8px 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 13px;
            transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
            user-select: none;
        }
        .hud-toggle-btn:hover {
            background-color: #4e5463; /* Tom de hover */
        }
        .hud-toggle-btn.active {
            background-color: var(--hud-accent);
            color: white;
            border-color: var(--hud-accent);
            box-shadow: 0 0 8px rgba(97, 175, 239, 0.5);
        }
        /* Estilo para o grupo do input 'Rede' */
        .hud-input-group {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--hud-bg-light);
            border: 1px solid var(--hud-border);
            padding: 8px 12px;
            border-radius: 5px;
            flex-grow: 1; /* Faz o input ocupar o espaço */
            min-width: 200px; /* Largura mínima */
        }
        .hud-input-group label {
            font-size: 13px;
            color: var(--hud-text);
            white-space: nowrap;
        }
        .hud-cadastro-input {
            width: 100%;
            background-color: var(--hud-bg); /* Mais escuro que o fundo do grupo */
            border: 1px solid var(--hud-border);
            color: var(--hud-text);
            padding: 5px;
            border-radius: 4px;
            font-family: var(--hud-font);
            font-size: 13px;
        }
        /* Estilos do Rodapé (Footer) */
        .hud-cadastro-footer {
            padding: 10px 15px;
            border-top: 1px solid var(--hud-border);
            background: var(--hud-bg-light);
            display: flex;
            justify-content: flex-end; /* Alinha botões à direita */
            gap: 10px;
            flex-shrink: 0; /* Impede o rodapé de encolher */
        }
        .hud-footer-btn {
            background: var(--hud-bg);
            border: 1px solid var(--hud-border);
            color: var(--hud-text);
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.2s, color 0.2s;
        }
        .hud-footer-btn:hover {
            background-color: #4e5463;
        }
        .hud-footer-btn.primary { /* Botão Confirmar */
            background-color: var(--hud-green);
            border-color: var(--hud-green);
            color: #ffffff;
        }
        .hud-footer-btn.primary:hover {
            background-color: #a8d389;
        }
        .hud-footer-btn.danger { /* Botão Cancelar */
             color: var(--hud-red);
             border-color: var(--hud-red);
             background: transparent;
        }
        .hud-footer-btn.danger:hover {
             background-color: rgba(224, 108, 117, 0.2);
        }
        /* --- ESTILOS DO AUTOCOMPLETE DE REDE --- */
        .hud-input-group {
            /* Precisamos disso para posicionar a caixa de sugestões */
            position: relative;
        }
        .hud-autocomplete-suggestions {
            display: none; /* Começa escondido */
            position: absolute;
            top: 100%; /* Aparece logo abaixo do input */
            left: 0;
            right: 0;
            background: var(--hud-bg-light);
            border: 1px solid var(--hud-border);
            border-top: none;
            border-radius: 0 0 5px 5px;
            z-index: 100;
            max-height: 200px;
            overflow-y: auto;
            /* Estilos da barra de rolagem */
            scrollbar-width: thin;
            scrollbar-color: var(--hud-border) var(--hud-bg);
        }
        .hud-autocomplete-suggestions::-webkit-scrollbar { width: 8px; }
        .hud-autocomplete-suggestions::-webkit-scrollbar-track { background: var(--hud-bg-light); }
        .hud-autocomplete-suggestions::-webkit-scrollbar-thumb {
            background-color: var(--hud-border);
            border-radius: 4px;
        }
        .hud-suggestion-item {
            padding: 8px 12px;
            color: var(--hud-text);
            font-size: 13px;
            cursor: pointer;
            border-bottom: 1px solid var(--hud-border);
        }
        .hud-suggestion-item:last-child {
            border-bottom: none;
        }
        .hud-suggestion-item:hover {
            background-color: var(--hud-accent);
            color: white;
        }
        .hud-suggestion-item.loading {
            color: var(--hud-orange);
            cursor: default;
        }
        /* --- ESTILOS DO TOAST DE NOTIFICAÇÃO --- */
        .hud-toast-notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--hud-red);
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            font-family: var(--hud-font);
            font-size: 14px;
            font-weight: 600;
            z-index: 2147483647; /* Máximo z-index */
            opacity: 0;
            transition: opacity 0.3s, top 0.3s;
        }
        .hud-toast-notification.show {
            opacity: 1;
            top: 40px;
        }

    `;

    // --- 2. FUNÇÕES AUXILIARES (HELPERS) ---

    /** (NOVO) Armazena a conexão com o banco de dados IndexedDB */
    let cacheDB = null;

    /** (MODIFICADO) Inicializa a conexão com o IndexedDB */
    async function iniciarCacheDB() {
        try {
            console.log("[HUD Script - Cache] Iniciando IndexedDB (v2)...");
            // Abre (ou cria) o banco de dados
            cacheDB = await db.open({
                server: 'geogridCache',
                version: 3,
                schema: {
                    apiResponses: { // <-- (ANTIGO) Cache "burro" - Mantemos para fallback
                        key: { keyPath: 'id' }
                    },
                    geoItems: { // <-- (NOVO) Cache "inteligente"
                        key: { keyPath: 'cd' }, // Chave primária (ex: "JPT25588")
                        indexes: {
                            city: 'cdCity', // Índice para buscar por cidade (ex: "1146")
                            dependencies: 'dependencies.cd'
                        }
                    }
                }
            });
            console.log("[HUD Script - Cache] IndexedDB v2 iniciado com sucesso.");
        } catch (e) {
            console.error("[HUD Script - Cache] Erro ao iniciar o IndexedDB:", e);
        }
    }

    /** (NOVO) Lê uma resposta do cache do IndexedDB */
    async function lerDoCache(cacheId) {
        if (!cacheDB) {
            console.warn("[HUD Script - Cache] O DB não está pronto. Leitura pulada.");
            return null;
        }

        try {
            const registro = await cacheDB.apiResponses.get(cacheId);
            if (registro) {
                //console.log(`[HUD Script - Cache] SUCESSO DE CACHE: ${cacheId}`);
                return registro.data; // Retorna os dados puros (em JSON)
            }
        } catch (e) {
            console.error(`[HUD Script - Cache] Erro ao ler ${cacheId} do DB:`, e);
        }

        //console.warn(`[HUD Script - Cache] FALHA DE CACHE: ${cacheId}`);
        return null; // Não encontrado
    }

    /** (MODIFICADO) Injeta o script 'listener' no contexto da página (para contornar a sandbox) */
    function injetarScriptPagina() {
        // Verifica se já foi injetado para não duplicar
        if (document.getElementById('hud-injected-script')) return;

        const scriptContent = `
            (function() {
                // Flag para garantir que rode apenas uma vez
                if (window.__hudFastLoaderInjected__) return;
                window.__hudFastLoaderInjected__ = true;

                console.log('%c[HUD Page Context] Listener de Carga Rápida (v4.4 - Preparação Assíncrona) Ativado.', 'color: #61afef; font-weight: bold;');

                // --- Configurações Globais ---
                const TAMANHO_LOTE_PREPARO = 2500;  // Lotes para a fase de preparação (mais rápido)
                const TAMANHO_LOTE_RENDER = 1500;  // Lotes para a fase de renderização (mais suave)

                // Filas de trabalho
                window.__hudFilaDePreparo__ = []; // Itens brutos do cache (ex: 37.000)
                window.__hudFilaDeCarga__ = [];   // Itens prontos para plotar

                // Armazenamento
                if (!window.__hudIndiceRapido__) {
                    window.__hudIndiceRapido__ = {};
                }
                window.__hudFichasParaIndexar__ = new Set();
                window.__hudTotalDeItensPreparo__ = 0;
                window.__hudTotalDeItensCarga__ = 0;

                // --- Flags Globais ---
                window.__hudBypassProximaCarga__ = false; // (v2) Para o XHR Interceptor
                // --- (INÍCIO DA MODIFICAÇÃO - SYNC) ---
                window.__hudCachePlottedIDs__ = new Set(); // (v3) Armazena IDs do cache para o sync
                window.__hudIsDeltaLoading__ = false;    // (v3) Flag para 'plotaItensNoMapa' saber que é o delta sync
                // --- (FIM DA MODIFICAÇÃO - SYNC) ---

                window.__hudFastLoadEmAndamento__ = false;

                // --- (INÍCIO DA OTIMIZAÇÃO v4.4: MONKEY-PATCHING) ---
                window.__originalRetornaIndice__ = window.retornaIndice;
                window.__originalCentraliza__ = window.centraliza;
                // --- (INÍCIO DA MODIFICAÇÃO - SYNC) ---
                // Precisamos interceptar a função de plotagem do site
                window.__originalPlotaItensNoMapa__ = window.plotaItensNoMapa;
                // --- (FIM DA MODIFICAÇÃO - SYNC) ---


                window.retornaIndice = function(ficha, codigo) {
                    try {
                        const indice = window.__hudIndiceRapido__[ficha][codigo];
                        if (indice !== undefined) {
                            return indice;
                        }
                    } catch (e) {}
                    return window.__originalRetornaIndice__(ficha, codigo);
                };

                window.centraliza = function() {
                    arrayCentralizar = [];
                    centerBag = new google.maps.LatLngBounds();
                };

                // --- (INÍCIO DA MODIFICAÇÃO - SYNC) ---
                /**
                 * (NOVO v3) Interceptamos a função 'plotaItensNoMapa'
                 * Esta função é chamada tanto pela Carga Rápida (várias vezes)
                 * quanto pela Carga Lenta (uma vez no final).
                 */
                window.plotaItensNoMapa = function() {
                    // Verifica se esta é a chamada da Carga Lenta (Delta)
                    if (window.__hudIsDeltaLoading__ === true) {
                        // Reseta a flag para não rodar de novo
                        window.__hudIsDeltaLoading__ = false;

                        // 'carregados' é a variável global que a Carga Lenta populou
                        const networkIDs = new Set(carregados.map(item => item.cd));

                        console.log(
                            '[HUD Page Context] Sincronização Delta iniciada. Comparando %s itens do cache com %s itens da rede.',
                            window.__hudCachePlottedIDs__.size,
                            networkIDs.size
                        );

                        // Limpa o set de cache, o trabalho está feito
                        window.__hudCachePlottedIDs__.clear();
                    }

                    // Finalmente, chama a função original para que o mapa
                    // seja desenhado (seja da carga rápida ou lenta)
                    return window.__originalPlotaItensNoMapa__(...arguments);
                };
                // --- (FIM DA MODIFICAÇÃO - SYNC) ---


                /**
                 * FASE 3: Renderização (Plotagem)
                 */
                function processarLoteDeCarga() {
                    const lote = window.__hudFilaDeCarga__.splice(0, TAMANHO_LOTE_RENDER);

                    if (lote.length === 0) {
                        // --- O TRABALHO DA CARGA RÁPIDA ACABOU ---
                        window.__hudFastLoadEmAndamento__ = false;
                        console.log('%c[HUD Page Context] Carga Rápida concluída!', 'color: #98c379; font-weight: bold;');

                        // --- CORREÇÃO: CANCELA O TOAST DE PROGRESSO ---
                        document.dispatchEvent(new CustomEvent('hud:hideProgress'));

                        // Restaura funções nativas (APENAS as que monkey-patchou)
                        window.retornaIndice = window.__originalRetornaIndice__;
                        window.centraliza = window.__originalCentraliza__;

                        console.log('[HUD Page Context] Executando centralização final...');
                        window.centraliza(); // Chama a função de verdade (original, que não faz mais nada)

                        // --- CORREÇÃO: CANCELA O ALERTA NATIVO (Por segurança, caso o site o tenha ativado) ---
                        // Chamamos a função ORIGINAL, que agora é window.criaAlerta
                        window.criaAlerta("carregando", "cancela");


                        // --- (INÍCIO DA MODIFICAÇÃO v2 - Robusta) ---
                        try {
                            if (window.jQuery) {
                                const $botaoCarregar = window.jQuery('img[name="mostrar_item"]');
                                if ($botaoCarregar.length > 0) {
                                    console.log('[HUD Page Context] Disparando clique (via jQuery) para Carga Lenta (Delta)...');
                                    // --- (INÍCIO DA MODIFICAÇÃO - SYNC) ---
                                    window.__hudIsDeltaLoading__ = true; // (v3) Avisa 'plotaItensNoMapa' que a próxima carga é o sync
                                    // --- (FIM DA MODIFICAÇÃO - SYNC) ---
                                    window.__hudBypassProximaCarga__ = true; // (v2) Avisa o XHR Interceptor para não usar o cache
                                    $botaoCarregar.click();
                                } else {
                                     console.warn('[HUD Page Context] Não foi possível encontrar o botão img[name="mostrar_item"] com jQuery.');
                                }
                            } else {
                                console.warn('[HUD Page Context] jQuery não encontrado para disparar o clique do delta load.');
                            }
                        } catch (err) {
                            console.error('[HUD Page Context] Erro ao tentar disparar o delta load:', err);
                        }
                        // --- (FIM DA MODIFICAÇÃO v2) ---

                        window.__hudIndiceRapido__ = {};
                        delete window.__hudFichasParaIndexar__;
                        return;
                    }

                    // Calcula o progresso da FASE 3
                    const processados = window.__hudTotalDeItensCarga__ - window.__hudFilaDeCarga__.length;
                    const percentual = Math.round((processados / window.__hudTotalDeItensCarga__) * 100);
                    const msg = \`Carregando itens... (\${percentual}%) \${processados} / \${window.__hudTotalDeItensCarga__}\`;

                    // --- CORREÇÃO: ATUALIZA O TOAST DE PROGRESSO ---
                    document.dispatchEvent(new CustomEvent('hud:showProgress', { detail: { message: msg } }));

                    carregados = lote;
                    plotaItensNoMapa(); // (AGORA CHAMA A NOSSA VERSÃO INTERCEPTADA)
                    setTimeout(processarLoteDeCarga, 0);
                }

                /**
                 * FASE 2: Construção do Índice
                 */
                function construirIndice() {
                    console.time('[HUD Page Context] Fase 2: Construção do Índice');
                    document.dispatchEvent(new CustomEvent('hud:showProgress', { detail: { message: "Finalizando preparação do índice..." } }));

                    for (const ficha of window.__hudFichasParaIndexar__) {
                        if (!window.__hudIndiceRapido__[ficha]) {
                            window.__hudIndiceRapido__[ficha] = {};
                            jsonPrincipal[ficha].forEach((item, index) => {
                                window.__hudIndiceRapido__[ficha][item.cd] = index;
                            });
                        }
                    }
                    console.timeEnd('[HUD Page Context] Fase 2: Construção do Índice');

                    // Passa para a Fase 3
                    window.__hudTotalDeItensCarga__ = window.__hudFilaDeCarga__.length;
                    processarLoteDeCarga();
                }

                /**
                 * FASE 1: Preparação dos Itens
                 */
                function processarLoteDePreparo() {
                    const lote = window.__hudFilaDePreparo__.splice(0, TAMANHO_LOTE_PREPARO);

                    if (lote.length === 0) {
                        // --- FASE 1 ACABOU ---
                        console.log('[HUD Page Context] Fase 1 (Preparo) concluída.');
                        setTimeout(construirIndice, 0);
                        return;
                    }

                    // Calcula o progresso da FASE 1
                    const processados = window.__hudTotalDeItensPreparo__ - window.__hudFilaDePreparo__.length;
                    const percentual = Math.round((processados / window.__hudTotalDeItensPreparo__) * 100);
                    const msg = \`Preparando dados... (\${percentual}%) \${processados} / \${window.__hudTotalDeItensPreparo__}\`;

                    document.dispatchEvent(new CustomEvent('hud:showProgress', { detail: { message: msg } }));

                    // Processa o lote
                    for (const item of lote) {
                        const ficha = retornaFicha(item.cd);
                        window.__hudFichasParaIndexar__.add(ficha);

                        const indice = window.__originalRetornaIndice__(ficha, item.cd);

                        if (indice === -1) {
                            jsonPrincipal[ficha].push(item);
                            const novoIndice = jsonPrincipal[ficha].length - 1;
                            window.__hudFilaDeCarga__.push({ cd: item.cd, indice: novoIndice, id: item.cd + '@' + (item.cdCity || 'CIDADE_PADRAO') });
                        } else if (jsonPrincipal[ficha][indice].visible == false) {
                            window.__hudFilaDeCarga__.push({ cd: item.cd, indice: indice, id: item.cd + '@' + (item.cdCity || 'CIDADE_PADRAO') });
                        }
                    }

                    setTimeout(processarLoteDePreparo, 0);
                }

                /**
                 * Listener principal que recebe os dados do cache
                 */
                document.addEventListener('hud:plotFast', (e) => {
                    const items = e.detail.items;
                    if (!items) return;

                    console.log('[HUD Page Context] Recebidos ' + items.length + ' itens do cache.');

                    // --- (INÍCIO DA MODIFICAÇÃO - SYNC) ---
                    // (v3) Guarda a lista COMPLETA de IDs que vieram do cache
                    // para a sincronização no final.
                    console.log('[HUD Page Context] Armazenando %s IDs do cache para sincronização delta.', items.length);
                    window.__hudCachePlottedIDs__ = new Set(items.map(item => item.cd));
                    // --- (FIM DA MODIFICAÇÃO - SYNC) ---

                    try {
                        window.__hudFastLoadEmAndamento__ = true;
                        window.__hudFilaDePreparo__ = items;
                        window.__hudTotalDeItensPreparo__ = items.length;
                        window.__hudFilaDeCarga__ = [];

                        if (window.__hudFichasParaIndexar__ && typeof window.__hudFichasParaIndexar__.clear === 'function') {
                            window.__hudFichasParaIndexar__.clear();
                        } else {
                            // Se foi deletado ou nunca existiu
                            window.__hudFichasParaIndexar__ = new Set();
                        }

                        processarLoteDePreparo();

                    } catch (err) {
                        console.error("[HUD Page Context] Erro ao processar dados do cache:", err);
                        // Restaura em caso de erro
                        window.retornaIndice = window.__originalRetornaIndice__;
                        window.centraliza = window.__originalCentraliza__;
                        window.criaAlerta = window.__originalCriaAlerta__;
                        // --- (INÍCIO DA MODIFICAÇÃO - SYNC) ---
                        // (v3) Restaura a função de plotagem em caso de erro
                        window.plotaItensNoMapa = window.__originalPlotaItensNoMapa__;
                        // --- (FIM DA MODIFICAÇÃO - SYNC) ---
                        if (typeof criaAlerta === 'function') {
                            criaAlerta("carregando", "cancela");
                        }
                    }
                });
            })();
        `;

        // 5. Cria e injeta o script
        const scriptElement = document.createElement('script');
        scriptElement.id = 'hud-injected-script';
        scriptElement.textContent = scriptContent;
        (document.head || document.documentElement).appendChild(scriptElement);

        scriptElement.remove();
    }

    /** (NOVO) Ativa um aviso antes do usuário fechar ou recarregar a página */
    function ativarAvisoDeSaida() {
        const handler = (event) => {
            // Esta linha é necessária para a maioria dos navegadores
            event.preventDefault();
            // Esta linha é para navegadores mais antigos
            event.returnValue = '';
            return '';
        };

        // Adiciona o aviso
        window.addEventListener('beforeunload', handler);
    }

    // (NOVA FUNÇÃO HELPER) Lida com o 'status: true/false'
            function fazerRequisicaoDaPagina(url, data, debugInfo) {
                return new Promise((resolve, reject) => {
                    const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
                    if (!gw.jQuery) {
                        reject("jQuery da página não encontrado");
                        return;
                    }

                    gw.jQuery.ajax({
                        type: "POST",
                        url: url,
                        data: data,
                        dataType: "text",
                        success: (responseText) => {
                            // (MODIFICADO) Verifica a resposta do 'salvaEquipamentos'
                            if (url.includes("salvaEquipamentos.php") || url.includes("cadastraCaboLigacao.php")) {
                                try {
                                    const data = JSON.parse(responseText);
                                    if (data.status === true || data.status === "true") {
                                        resolve({ status: 'fulfilled', value: `Sucesso: ${debugInfo}`, response: responseText });
                                    } else {
                                        // A API retornou 'status: false', rejeita com a mensagem de erro
                                        reject(data.mensagem || `Erro ao salvar ${debugInfo}`);
                                    }
                                } catch (e) {
                                    reject(`Erro ao parsear resposta de ${url}: ${responseText}`);
                                }
                            } else {
                                // Comportamento original para as outras chamadas (api.php, etc)
                                resolve({ status: 'fulfilled', value: `Sucesso: ${debugInfo}`, response: responseText });
                            }
                        },
                        error: (xhr, textStatus, errorThrown) => {
                            console.error(`[HUD Script] Erro de jQuery.ajax em ${debugInfo}:`, textStatus, errorThrown);
                            reject(`Erro ${xhr.status} ao processar ${debugInfo} (${textStatus})`);
                        }
                    });
                });
            }

    /** (NOVO) Retorna a data de hoje no formato YYYY-MM-DD */
    function getTodayDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Meses são 0-indexados
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // --- 2. FUNÇÕES AUXILIARES (HELPERS) ---
    // ... (restante das suas funções)

    /** (NOVO) Referência global para o Toast de Progresso */
    let progressToastElement = null;

    /** (NOVO) Mostra ou atualiza uma notificação toast de progresso */
    function showHudToastProgress(message) {
        // 1. Remove qualquer toast de erro/sucesso existente
        document.querySelector('.hud-toast-notification')?.remove();

        // 2. Se o elemento de progresso não existe, cria
        if (!progressToastElement) {
            progressToastElement = document.createElement('div');
            progressToastElement.className = 'hud-toast-notification hud-element';
            progressToastElement.style.backgroundColor = 'var(--hud-accent)'; // Cor de destaque
            progressToastElement.style.top = '10px'; // Posiciona mais acima, longe do centro
            progressToastElement.style.transition = 'none'; // Desativa a transição de entrada/saída
            progressToastElement.style.opacity = '0'; // Começa invisível
            document.body.appendChild(progressToastElement);

            // Animação de entrada
            setTimeout(() => {
                 progressToastElement.style.transition = 'opacity 0.3s, top 0.3s';
                 progressToastElement.classList.add('show');
            }, 10);
        }

        // 3. Atualiza a mensagem
        progressToastElement.textContent = message;
    }

    /** (NOVO) Remove o Toast de Progresso */
    function hideHudToastProgress() {
        if (progressToastElement) {
            // Animação de saída
            progressToastElement.classList.remove('show');
            // Remove o elemento após a animação
            setTimeout(() => {
                progressToastElement?.remove();
                progressToastElement = null; // Zera a referência
            }, 300);
        }
    }

    /** (NOVO) Mostra uma notificação toast personalizada */
    function showHudToast(message, type = 'error') {
        // Remove qualquer toast existente
        document.querySelector('.hud-toast-notification')?.remove();

        const toast = document.createElement('div');
        toast.className = 'hud-toast-notification hud-element';
        toast.textContent = message;

        // (Opcional: mudar a cor com base no tipo)
        if (type === 'success') {
            toast.style.backgroundColor = 'var(--hud-green)';
        } else {
            toast.style.backgroundColor = 'var(--hud-red)';
        }

        document.body.appendChild(toast);

        // Animação de entrada
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Animação de saída
        setTimeout(() => {
            toast.classList.remove('show');
            // Remove o elemento após a animação
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000); // Toast fica visível por 3 segundos
    }

    /** (NOVO) Injeta os estilos CSS do HUD na página, uma única vez. */
    function injetarEstilosGlobais() {
        // Se os estilos já foram injetados, não faz nada.
        if (document.getElementById('hud-global-styles')) {
            return;
        }

        console.log('[HUD Script] Injetando estilos CSS globais...');
        const styleSheet = document.createElement("style");
        styleSheet.id = "hud-global-styles"; // ID único
        styleSheet.innerText = cssStyles;
        document.head.appendChild(styleSheet);
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Carrega as configurações salvas do localStorage (MODIFICADO)
     */
    function loadSettings() {
        let saved = {};
        try {
            const savedJson = localStorage.getItem(STORAGE_KEY);
            if (savedJson) {
                saved = JSON.parse(savedJson);
            }
        } catch (e) {
            console.error("Erro ao carregar configurações do HUD:", e);
        }

        const settings = { ...DEFAULT_SETTINGS, ...saved };

        // (NOVO) Aplica o modo claro imediatamente ao carregar as configs
        toggleModoClaro(settings.modoClaro);

        return settings;
    }

    /**
     * Salva o estado atual das configurações no localStorage (MODIFICADO)
     */
    function saveSettings() {
        // Filtra o 'state' para salvar APENAS as chaves de DEFAULT_SETTINGS
        const settingsToSave = {};
        for (const key in DEFAULT_SETTINGS) {
            // Verifica se a chave existe no 'state' antes de salvar
            if (Object.hasOwnProperty.call(state, key)) {
                settingsToSave[key] = state[key];
            }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
    }

    function toggleModoClaro(ativar) {
        if (ativar) {
            document.body.classList.add('hud-light-mode');
        } else {
            document.body.classList.remove('hud-light-mode');
        }
    }

    async function copyToClipboard(text, successElement) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                if (successElement) {
                    const originalContent = successElement.innerHTML;
                    successElement.innerHTML = '✅';
                    setTimeout(() => { successElement.innerHTML = originalContent; }, 1500);
                }
                return;
            } catch (err) {
                console.warn('Cópia moderna falhou, usando fallback.', err);
            }
        }
        const ta = document.createElement("textarea");
        ta.value = text;
        Object.assign(ta.style, { position: "fixed", top: "-9999px", left: "-9999px", opacity: '0' });
        document.body.appendChild(ta);
        ta.select();
        try {
            const successful = document.execCommand('copy');
            if (successful && successElement) {
                const originalContent = successElement.innerHTML;
                successElement.innerHTML = '✅';
                setTimeout(() => { successElement.innerHTML = originalContent; }, 1500);
            } else if (!successful) {
                prompt("Falha ao copiar. Copie manualmente:", text);
            }
        } catch (err) {
            prompt("Erro ao copiar. Copie manualmente:", text);
        } finally {
            document.body.removeChild(ta);
        }
    }

    function createDraggablePanel(id, title, contentElement, position) {
        const panel = document.createElement("div");
        panel.id = id;
        panel.className = "hud-panel hud-element";
        Object.assign(panel.style, {
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            height: `${position.height}px`,
        });

        const header = document.createElement("div");
        header.className = "hud-header";
        header.innerHTML = `<strong>${title}</strong>`;

        // --- (INÍCIO DA MODIFICAÇÃO) ---
        // Se for o painel de Configurações, adiciona um botão Salvar
        if (id === 'blocoPredefinicoesHUD') {
            const saveBtn = document.createElement("button");
            saveBtn.className = 'hud-btn'; // Reutiliza a classe de botão
            saveBtn.title = 'Salvar Configurações Manualmente';
            saveBtn.innerHTML = 'Salvar';

            // Estilo para o botão de texto (para caber "Salvar")
            Object.assign(saveBtn.style, {
                width: 'auto',      // Largura automática
                padding: '4px 8px', // Espaçamento interno
                height: '30px',     // Altura padrão
                marginLeft: 'auto'  // Joga ele para a direita (antes do 'X')
            });

            // Adiciona a função de salvar
            saveBtn.onclick = () => {
                try {
                    saveSettings(); // Chama a função que já usamos!
                    // Feedback visual
                    saveBtn.innerHTML = 'Salvo ✅';
                    saveBtn.style.color = 'var(--hud-green)';
                    setTimeout(() => {
                        saveBtn.innerHTML = 'Salvar';
                        saveBtn.style.color = 'var(--hud-text)';
                    }, 2000);
                } catch (e) {
                    saveBtn.innerHTML = 'Erro!';
                    saveBtn.style.color = 'var(--hud-red)';
                    console.error("[HUD Script] Erro ao salvar configurações manualmente:", e);
                }
            };
            header.appendChild(saveBtn);
        }
        // --- (FIM DA MODIFICAÇÃO) ---

        const closeBtn = document.createElement("button");
        closeBtn.className = "hud-btn-close";
        closeBtn.innerHTML = "×";

        // (MODIFICADO) Ajusta a margem do botão 'X'
        // Se for o painel de config, damos uma margem pequena; senão, 'auto'
        if (id === 'blocoPredefinicoesHUD') {
            closeBtn.style.marginLeft = "4px";
        } else {
            closeBtn.style.marginLeft = "auto";
        }

        closeBtn.onclick = () => {
            panel.remove();
            if (id === 'blocoNotasHUD') state.notasAtivo = false;
            if (id === 'blocoPredefinicoesHUD') state.configAtivo = false;
            if (id === 'hudAdicionarEquipamento') state.cadastroEquipamentoAtivo = false;
        };
        header.appendChild(closeBtn);
        panel.appendChild(header);
        panel.appendChild(contentElement);
        document.body.appendChild(panel);

        let offsetX, offsetY, isDragging = false;
        header.addEventListener("mousedown", e => {
            isDragging = true;
            const r = panel.getBoundingClientRect();
            offsetX = e.clientX - r.left;
            offsetY = e.clientY - r.top;
            document.body.style.userSelect = "none";
        });
        document.addEventListener("mousemove", e => {
            if (!isDragging) return;
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
        });
        document.addEventListener("mouseup", () => {
            isDragging = false;
            document.body.style.userSelect = "auto";
        });
        return panel;
    }

    /**
     * Cria um Checkbox que salva automaticamente (MODIFICADO)
     */
    function createCheckbox(id, label, checked, onChange) {
        const container = document.createElement("div");
        const labelEl = document.createElement("label");
        labelEl.className = 'hud-checkbox-label';
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = id;
        checkbox.checked = checked;

        checkbox.addEventListener("change", () => {
            onChange(checkbox.checked); // 1. Atualiza o estado (state)
            saveSettings();          // 2. Salva o novo estado no localStorage
        });

        labelEl.appendChild(checkbox);
        labelEl.appendChild(document.createTextNode(label));
        container.appendChild(labelEl);
        return container;
    }

    /**
     * Lógica de pesquisa que será "debounced" (ADICIONADO)
     */
    function performSearch() {
        const searchInput = document.getElementById('hud-search-field');
        // Se o HUD não existir ou o input não for encontrado, não faz nada
        if (!searchInput) return;

        const query = searchInput.value.trim();
        state.searchQuery = query; // Salva o valor da pesquisa no estado global
        const allRows = document.querySelectorAll('.hud-client-row');

        // Se a pesquisa estiver vazia, remove todos os destaques
        if (!query) {
            allRows.forEach(row => row.classList.remove('highlighted'));
            return;
        }

        // Itera por todas as linhas de cliente
        allRows.forEach(row => {
            const contractSpan = row.querySelector('.contract');
            if (contractSpan) {
                const contractNumber = contractSpan.textContent.trim();
                // Verifica se o número do contrato INCLUI a consulta
                if (contractNumber.includes(query)) {
                    row.classList.add('highlighted');
                } else {
                    row.classList.remove('highlighted');
                }
            }
        });
    }

    // Cria uma versão "debounced" da função de pesquisa (ADICIONADO)
    const debouncedSearch = debounce(performSearch, 300); // 300ms de espera

    // Função de REMOVER AS DIVS INDESEJADAS
    function atualizarElementosIndesejados() {
        const seletores = "div.componente-topo > div.conteudo > div.bloco1, .componente-rodape";
        const elementos = document.querySelectorAll(seletores);
        const btn_ajuda = document.querySelector('#launcher')
        if (btn_ajuda) {btn_ajuda.remove()};
        // 'none' se for para remover, '' (vazio) para restaurar ao padrão
        const displayValor = state.removerIndesejado ? 'none' : '';
        elementos.forEach(el => {
            el.style.display = displayValor;
        });
    }

    function handleMapLink(lat, lon, successElement) {
        if (!lat || !lon) {
            console.warn("HUD Script: handleMapLink chamado sem coordenadas.");
            if (successElement) { // Pisca a vermelho se falhar
                successElement.style.borderColor = 'var(--hud-red)';
                setTimeout(() => successElement.style.borderColor = 'var(--hud-border)', 1000);
            }
            return;
        }

        // Verifica o estado que o utilizador definiu
        if (state.copiarCoordenadas) {
            // Copia apenas as coordenadas
            copyToClipboard(`${lat}, ${lon}`, successElement);
        } else {
            // Cria o link
            const link = `https://www.google.com/maps?q=${lat},${lon}`;
            if (state.abrirNovaGuia) {
                window.open(link, "_blank");
            } else {
                copyToClipboard(link, successElement);
            }
        }
    }

    /**
     * (NOVO) Função chamada quando o mapa é clicado no modo de captura.
     */
    function handleMapCaptureClick(event) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        // Encontra o botão de captura para o feedback de 'sucesso'
        const btnCaptura = document.getElementById('capturaMapaBtn');

        // 1. Usa a nossa nova função central
        handleMapLink(lat, lng, btnCaptura);

        // 2. (NOVO) Desativa o modo de captura automaticamente
        //    Como o modo está ATIVO, chamá-lo irá desativá-lo.
        toggleMapCaptureMode();
    }

    /**
     * (NOVO) Ativa/Desativa o modo de captura de coordenadas
     */
    function toggleMapCaptureMode() {
        // Usa unsafeWindow quando disponível (script em sandbox)
        const gw = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

        if (!gw.__googleMapsApiDisponivel__ || !gw.__googleMapInstancia__) {
            console.error("HUD Script: Captura falhou. API do Google ou Instância do Mapa não encontradas.");
            return;
        }

        const map = gw.__googleMapInstancia__;
        const btnCaptura = document.getElementById('capturaMapaBtn');

        // Inverte o estado global na página (lembrando que o listener real vive na instância do mapa)
        gw.__mapCaptureActive__ = !gw.__mapCaptureActive__;

        if (gw.__mapCaptureActive__) {
            console.log('%c[HUD Script] MODO DE CAPTURA ATIVADO.', 'color: #98c379; font-weight: bold;');
            // Guarda o listener criado no objeto da página (retornado pelo addListener)
            gw.__mapClickListener__ = map.addListener('click', handleMapCaptureClick);
            // Muda cursor
            try { map.setOptions({ draggableCursor: 'crosshair' }); } catch (e) {}
            if (btnCaptura) btnCaptura.classList.add('active');
        } else {
            console.log('%c[HUD Script] MODO DE CAPTURA DESATIVADO.', 'color: #e06c75; font-weight: bold;');
            try {
                if (gw.__mapClickListener__) {
                    // removeListener precisa ser chamado no contexto da API do google.maps na página
                    google.maps.event.removeListener(gw.__mapClickListener__);
                    gw.__mapClickListener__ = null;
                }
                map.setOptions({ draggableCursor: null });
            } catch (e) {}
            if (btnCaptura) btnCaptura.classList.remove('active');
        }
    }

    // --- 3. ESTADO GLOBAL E DADOS COLETADOS ---

    // ESTADO GLOBAL (MODIFICADO)
    // Carrega as configurações salvas (persistentes)
    const persistentSettings = loadSettings();
    // O 'state' agora é uma combinação das configurações salvas
    // e do estado de tempo de execução (que sempre começa como falso)
    window.__hudState__ = {
        ...persistentSettings,
        notasAtivo: false,
        configAtivo: false,
        cadastroEquipamentoAtivo: false,
        cadastroEquipamentoFallback: false,
        searchQuery: '',
    };
    const state = window.__hudState__;

    // DADOS COLETADOS (persistentes)
    let localizacao = [];
    let equipamentosInfo = {};
    let equipamentosOrdem = [];
    let infoClientes = {};
    let isInitialLoadComplete = false;
    let ultimaAPI;
    let ultimoCodigoPoste = null;
    let ultimoCodigoEquipamentoPai = null;
    let hudUserInteracted = false;

    // --- 4. LÓGICA DE CRIAÇÃO E REMOÇÃO DO HUD ---

    /**
     * (MODIFICADO) Remove apenas os elementos do HUD PRINCIPAL da página.
     */
    function removerHUD() {
        // Remove o painel principal
        document.querySelector("#hudPainelTeste")?.remove();

        // Remove os painéis "satélite" (Notas e Config)
        document.querySelector("#blocoNotasHUD")?.remove();
        document.querySelector("#blocoPredefinicoesHUD")?.remove();

        // (NOTA: Não removemos #hudAdicionarEquipamento aqui,
        // pois ele tem seu próprio botão 'x' para fechar)

        window.__hudAtivo__ = false; // Flag do HUD principal
        state.notasAtivo = false;
        state.configAtivo = false;
        isInitialLoadComplete = false;
    }

    /**
     * Cria e injeta todo o painel do HUD na página.
     */
    function criarHUD() {
        if (window.__hudAtivo__) return; // Já está ativo
        window.__hudAtivo__ = true;

        // --- LIMPEZA DA PÁGINA ORIGINAL ---
        atualizarElementosIndesejados();
        //document.querySelectorAll(".menu-lateral-container, .menu-lateral-direito.menu-lateral-rota.absolute").forEach(el => { el.style.overflow = "auto"; });

        // --- PAINEL PRINCIPAL (HUD) ---
        const painel = document.createElement("div");
        painel.id = "hudPainelTeste";
        painel.className = "hud-panel hud-element";
        Object.assign(painel.style, {
            bottom: "12px",
            right: "12px"
            // A largura será definida automaticamente
        });

        const cabecalho = document.createElement("div");
        cabecalho.className = "hud-header";
        const icone = document.createElement("img");
        icone.className = "hud-icon";
        icone.src = document.querySelector('link[rel*="icon"]')?.href || "";
        const titulo = document.createElement("strong");
        titulo.textContent = ":: Geo Grid Maps ::";
        cabecalho.appendChild(icone);
        cabecalho.appendChild(titulo);

        const buttonsGroup = document.createElement('div');
        buttonsGroup.className = 'hud-buttons-group';

        function createButton(id, icon, title) {
            const btn = document.createElement("button");
            btn.id = id;
            btn.className = "hud-btn";
            btn.title = title;
            btn.innerHTML = icon;
            buttonsGroup.appendChild(btn);
            return btn;
        }

        // ORDEM DOS BOTÕES ATUALIZADA
        const btnPesquisa = createButton('pesquisaBtn', ICONS.search, 'Ocultar/Exibir Pesquisa');
        const expandirBtn = createButton('expandirBtn', ICONS.notes, 'Anotações');
        const btnCopiar = createButton('copiarContratosBtn', ICONS.copy, 'Copiar Contratos');
        const btnConfig = createButton('configBtn', ICONS.settings, 'Configurações');
        const btnMapa = createButton('abrirMapaBtn', ICONS.map, 'Localização do Poste');

        const btnCaptura = createButton('capturaMapaBtn', ICONS.crosshair, 'Capturar Coordenadas do Mapa (Ativa/Desativa)');

        const btnFechar = document.createElement("button");
        btnFechar.className = 'hud-btn-close';
        btnFechar.innerHTML = '×';
        btnFechar.title = 'Fechar HUD';
        buttonsGroup.appendChild(btnFechar);

        cabecalho.appendChild(buttonsGroup);
        painel.appendChild(cabecalho);

        const conteudoDiv = document.createElement("div");
        conteudoDiv.className = "hud-content";
        conteudoDiv.textContent = "Aguardando abertura de equipamento...";
        painel.appendChild(conteudoDiv);
        document.body.appendChild(painel);

        // --- LÓGICA DE DRAG & DROP E REDIMENSIONAMENTO ---
        let offsetX, offsetY, isDragging = false;
        cabecalho.addEventListener("mousedown", e => {
            if (e.target !== cabecalho && e.target !== titulo && e.target !== icone) return;
            isDragging = true;
            const r = painel.getBoundingClientRect();
            offsetX = e.clientX - r.left;
            offsetY = e.clientY - r.top;
            document.body.style.userSelect = "none";
        });

        const resizers = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
        resizers.forEach(direction => {
            const resizer = document.createElement('div');
            resizer.className = `resizer ${direction} hud-element`;
            painel.appendChild(resizer);

            resizer.addEventListener('mousedown', function(e) {
                e.preventDefault();
                initResize(e, direction);
            });
        });

        let startX, startY, startWidth, startHeight, startLeft, startTop;
        let resizeDirection;

        function initResize(e, direction) {
            resizeDirection = direction;
            startX = e.clientX;
            startY = e.clientY;
            const rect = painel.getBoundingClientRect();
            startWidth = rect.width;
            startHeight = rect.height;
            startLeft = rect.left;
            startTop = rect.top;

            document.documentElement.addEventListener('mousemove', doResize, false);
            document.documentElement.addEventListener('mouseup', stopResize, false);
            document.body.style.userSelect = 'none';
        }

        function doResize(e) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            const minWidth = 409;
            const minHeight = 150;

            if (resizeDirection.includes('right')) {
                const newWidth = startWidth + deltaX;
                if (newWidth > minWidth) painel.style.width = newWidth + 'px';
            }
            if (resizeDirection.includes('bottom')) {
                const newHeight = startHeight + deltaY;
                if (newHeight > minHeight) painel.style.height = newHeight + 'px';
            }
            if (resizeDirection.includes('left')) {
                const newWidth = startWidth - deltaX;
                if (newWidth > minWidth) {
                    painel.style.width = newWidth + 'px';
                    painel.style.left = startLeft + deltaX + 'px';
                }
            }
            if (resizeDirection.includes('top')) {
                const newHeight = startHeight - deltaY;
                if (newHeight > minHeight) {
                    painel.style.height = newHeight + 'px';
                    painel.style.top = startTop + deltaY + 'px';
                }
            }
        }

        function stopResize() {
            document.documentElement.removeEventListener('mousemove', doResize, false);
            document.documentElement.removeEventListener('mouseup', stopResize, false);
            document.body.style.userSelect = 'auto';
        }

        document.addEventListener("mousemove", e => {
            if (!isDragging) return;
            painel.style.left = `${e.clientX - offsetX}px`;
            painel.style.top = `${e.clientY - offsetY}px`;
            painel.style.right = "auto";
            painel.style.bottom = "auto";
        });
        document.addEventListener("mouseup", () => {
            isDragging = false;
            document.body.style.userSelect = "auto";
        });

        // --- EVENTOS DOS BOTÕES ---

        // (Existente) Botão Pesquisa Toggle
        btnPesquisa.addEventListener("click", () => {
            // 1. Inverte o estado
            state.searchBarVisible = !state.searchBarVisible;
            // 2. Salva a preferência
            saveSettings();
            // 3. Atualiza a UI (mostra/esconde a barra)
            const searchBar = document.querySelector(".hud-search-bar");
            if (searchBar) {
                searchBar.style.display = state.searchBarVisible ? 'block' : 'none';
            }
            // 4. Atualiza a aparência do botão
            btnPesquisa.classList.toggle('active', state.searchBarVisible);
        });
        // Define o estado inicial do botão de pesquisa
        btnPesquisa.classList.toggle('active', state.searchBarVisible);

        // (Existente) Botão Fechar
        btnFechar.addEventListener("click", removerHUD);

        // (Existente) Botão Notas
        expandirBtn.addEventListener("click", () => {
            if (state.notasAtivo) {
                document.querySelector("#blocoNotasHUD")?.remove();
                state.notasAtivo = false;
                return;
            }
            state.notasAtivo = true;
            const mainPanelRect = painel.getBoundingClientRect();
            const content = document.createElement("div");
            content.className = "hud-content";
            content.style.padding = '0';
            const textarea = document.createElement("textarea");
            Object.assign(textarea.style, {
                width: '100%', height: '100%', border: 'none', resize: 'none',
                padding: '8px', fontFamily: 'var(--hud-font)', fontSize: '13px',
                background: 'var(--hud-bg)', color: 'var(--hud-text)', outline: 'none'
            });
            content.appendChild(textarea);
            createDraggablePanel('blocoNotasHUD', 'Anotações', content, {
                top: mainPanelRect.top,
                left: mainPanelRect.left - 300,
                width: 280,
                height: mainPanelRect.height
            });
        });

        // (Existente) Botão Configurações (COM REORGANIZAÇÃO)
        btnConfig.addEventListener("click", () => {
            if (state.configAtivo) {
                document.querySelector("#blocoPredefinicoesHUD")?.remove();
                state.configAtivo = false;
                return;
            }
            state.configAtivo = true;
            const mainPanelRect = painel.getBoundingClientRect();
            const content = document.createElement("div");
            content.className = "hud-content";

            // Helper para criar os títulos dos grupos
            const createSettingsHeader = (title) => {
                const header = document.createElement("div");
                header.className = "hud-settings-header";
                header.textContent = title;
                return header;
            };

            // --- Grupo 1: Interface e Exibição ---
            content.appendChild(createSettingsHeader("Interface e Exibição"));

            content.appendChild(createCheckbox(
                'modoClaro',
                'Modo Claro',
                state.modoClaro,
                val => {
                    state.modoClaro = val;
                    toggleModoClaro(val); // Chama a função que aplica a classe
                }
            ));

            content.appendChild(createCheckbox(
                'searchBarVisible',
                'Exibir barra de pesquisa',
                state.searchBarVisible,
                val => {
                    state.searchBarVisible = val;
                    const searchBar = document.querySelector(".hud-search-bar");
                    if (searchBar) {
                        searchBar.style.display = val ? 'block' : 'none';
                    }
                    const btnPesquisa = document.getElementById('pesquisaBtn');
                    if (btnPesquisa) {
                        btnPesquisa.classList.toggle('active', val);
                    }
                }
            ));

            content.appendChild(createCheckbox(
                'removerIndesejado',
                'Ocultar topo e rodapé do site',
                state.removerIndesejado,
                val => {
                    state.removerIndesejado = val;
                    atualizarElementosIndesejados();
                }
            ));

            content.appendChild(createCheckbox(
                'exibirNomeCliente',
                'Exibir nome do cliente no HUD',
                state.exibirNomeCliente,
                val => {
                    state.exibirNomeCliente = val;
                    finalizarHud(); // Redesenha o HUD
                }
            ));

            content.appendChild(createCheckbox(
                'destacarRedesDivergentes',
                'Destacar redes divergentes',
                state.destacarRedesDivergentes,
                val => {
                    state.destacarRedesDivergentes = val;
                    finalizarHud(); // Redesenha o HUD
                }
            ));

            // --- Grupo 2: Copiar Informações ---
            content.appendChild(createSettingsHeader("Copiar Informações"));

            // (MOVEMOS o 'copiarCoordenadas' daqui)

            content.appendChild(createCheckbox(
                'somenteCancelados',
                'Copiar apenas clientes cancelados',
                state.somenteCancelados,
                val => state.somenteCancelados = val
            ));

            content.appendChild(createCheckbox(
                'copiarStatus',
                'Incluir status do cliente',
                state.copiarStatus,
                val => state.copiarStatus = val
            ));

            content.appendChild(createCheckbox(
                'copiarNomeRede',
                'Incluir nome da rede',
                state.copiarNomeRede,
                val => state.copiarNomeRede = val
            ));

            // --- Grupo 3: Localização (RENOMEADO) ---
            content.appendChild(createSettingsHeader("Localização")); // (RENOMEADO)

            // (MOVEMOS para cá) Checkbox de Coordenadas
            content.appendChild(createCheckbox(
                'copiarCoordenadas',
                'Copiar coordenadas (em vez de link)',
                state.copiarCoordenadas,
                val => state.copiarCoordenadas = val
            ));

            content.appendChild(createCheckbox(
                'abrirNovaGuia',
                'Abrir mapa em nova guia',
                state.abrirNovaGuia,
                val => state.abrirNovaGuia = val
            ));

            // --- Grupo 4: Cache de Dados ---
            content.appendChild(createSettingsHeader("Cache de Carregamento"));

            // --- (INÍCIO DA MODIFICAÇÃO) ---

            // Container para os botões de Importar/Exportar/Limpar
            const cacheButtonsContainer = document.createElement('div');
            cacheButtonsContainer.style.display = 'flex';
            cacheButtonsContainer.style.flexDirection = 'column'; // Um botão por linha
            cacheButtonsContainer.style.gap = '8px'; // Espaço entre os botões
            cacheButtonsContainer.style.marginTop = '5px';

            // --- Botão de EXPORTAR Cache ---
            const btnExportarCache = document.createElement('button');
            btnExportarCache.className = 'hud-footer-btn'; // Reutiliza estilo
            btnExportarCache.textContent = 'Exportar Cache (Backup)';
            btnExportarCache.style.width = '100%';
            btnExportarCache.style.backgroundColor = 'var(--hud-accent)'; // Cor azul
            btnExportarCache.style.borderColor = 'var(--hud-accent)';
            btnExportarCache.style.color = 'white';

            btnExportarCache.onclick = async () => {
                if (!cacheDB) {
                    showHudToast("Erro: O banco de dados do cache não está acessível.");
                    return;
                }
                btnExportarCache.textContent = 'Exportando... (Aguarde)';
                btnExportarCache.disabled = true;

                try {
                    // 1. Lê TODOS os itens da tabela 'geoItems'
                    console.log("[HUD Script - Export] Lendo todos os itens do cache...");
                    const allItems = await cacheDB.geoItems.query().all().execute();
                    console.log(`[HUD Script - Export] ${allItems.length} itens lidos.`);

                    if (allItems.length === 0) {
                        showHudToast("Cache vazio. Nada para exportar.");
                        btnExportarCache.textContent = 'Cache vazio';
                        return;
                    }

                    // 2. Converte para JSON
                    const jsonString = JSON.stringify(allItems);

                    // 3. Cria um Blob (arquivo em memória)
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    // 4. Cria um link de download invisível e clica nele
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `geogrid_cache_backup_${getTodayDate()}.json`;
                    document.body.appendChild(a);
                    a.click();

                    // 5. Limpa
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    console.log("[HUD Script - Export] Exportação concluída!");
                    btnExportarCache.textContent = 'Exportado com Sucesso!';
                    btnExportarCache.style.backgroundColor = 'var(--hud-green)'; // Verde
                    btnExportarCache.style.borderColor = 'var(--hud-green)';

                } catch (e) {
                    console.error("[HUD Script - Export] Erro ao exportar cache:", e);
                    showHudToast("Erro ao exportar: " + e.message);
                    btnExportarCache.textContent = 'Erro na Exportação';
                     btnExportarCache.style.backgroundColor = 'var(--hud-red)'; // Vermelho
                    btnExportarCache.style.borderColor = 'var(--hud-red)';
                } finally {
                     // Reseta o botão após alguns segundos
                    setTimeout(() => {
                        btnExportarCache.textContent = 'Exportar Cache (Backup)';
                        btnExportarCache.style.backgroundColor = 'var(--hud-accent)';
                        btnExportarCache.style.borderColor = 'var(--hud-accent)';
                        btnExportarCache.disabled = false;
                    }, 3000);
                }
            };
            cacheButtonsContainer.appendChild(btnExportarCache);


            // --- Botão de IMPORTAR Cache ---
            const btnImportarCache = document.createElement('button');
            btnImportarCache.className = 'hud-footer-btn'; // Reutiliza estilo
            btnImportarCache.textContent = 'Importar Cache (Restaurar)';
            btnImportarCache.style.width = '100%';
            btnImportarCache.style.backgroundColor = 'var(--hud-orange)'; // Cor laranja
            btnImportarCache.style.borderColor = 'var(--hud-orange)';
            btnImportarCache.style.color = 'white';

            btnImportarCache.onclick = () => {
                if (!cacheDB) {
                    showHudToast("Erro: O banco de dados do cache não está acessível.");
                    return;
                }

                // 1. Cria um input de arquivo invisível
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json, application/json';

                // 2. Define o que fazer quando um arquivo for selecionado
                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    btnImportarCache.textContent = 'Importando... (Aguarde)';
                    btnImportarCache.disabled = true;

                    try {
                        const text = await file.text();
                        const items = JSON.parse(text);

                        if (!Array.isArray(items)) {
                             throw new Error("Arquivo JSON inválido. O conteúdo não é um array.");
                        }

                        console.log(`[HUD Script - Import] Arquivo lido. Importando ${items.length} itens...`);

                        // 3. Limpa o cache antigo antes de importar (Opcional, mas recomendado)
                        await cacheDB.geoItems.clear();

                        // 4. (O PULO DO GATO) O db.js 'put' aceita um array para bulk-insert
                        await cacheDB.geoItems.put(items);

                        console.log("[HUD Script - Import] Importação concluída!");
                        btnImportarCache.textContent = 'Importado com Sucesso!';
                        btnImportarCache.style.backgroundColor = 'var(--hud-green)'; // Verde
                        btnImportarCache.style.borderColor = 'var(--hud-green)';
                        showHudToast(`Sucesso! ${items.length} itens importados. Recarregue a página.`);

                    } catch (err) {
                        console.error("[HUD Script - Import] Erro ao importar cache:", err);
                        showHudToast("Erro ao importar: " + err.message);
                        btnImportarCache.textContent = 'Erro na Importação';
                        btnImportarCache.style.backgroundColor = 'var(--hud-red)'; // Vermelho
                        btnImportarCache.style.borderColor = 'var(--hud-red)';
                    } finally {
                        // Reseta o botão
                        setTimeout(() => {
                            btnImportarCache.textContent = 'Importar Cache (Restaurar)';
                            btnImportarCache.style.backgroundColor = 'var(--hud-orange)';
                            btnImportarCache.style.borderColor = 'var(--hud-orange)';
                            btnImportarCache.disabled = false;
                        }, 3000);
                    }
                };

                // 5. Clica no input de arquivo invisível para abrir a janela "Selecionar Arquivo"
                fileInput.click();
            };
            cacheButtonsContainer.appendChild(btnImportarCache);


            // --- Botão de LIMPAR Cache (Existente) ---
            const btnLimparCache = document.createElement('button');
            btnLimparCache.className = 'hud-footer-btn danger'; // Reutiliza estilo
            btnLimparCache.textContent = 'Limpar Cache de Carregamento';
            btnLimparCache.style.width = '100%';
            //btnLimparCache.style.marginTop = '5px'; // (Removido, pois o 'gap' do container cuida disso)

            btnLimparCache.onclick = async () => {
                if (!cacheDB) {
                    showHudToast("Erro: O banco de dados do cache não está acessível.");
                    return;
                }
                if (confirm("Você tem certeza?\n\nIsso forçará um recarregamento lento (8 minutos) da próxima vez que você carregar as cidades.")) {
                    try {
                        btnLimparCache.textContent = 'Limpando...';

                        // Limpa AMBOS os caches
                        await cacheDB.apiResponses.clear();
                        await cacheDB.geoItems.clear(); // <-- (NOVO) Limpa o cache inteligente

                        btnLimparCache.textContent = 'Limpo com Sucesso!';
                        btnLimparCache.style.backgroundColor = 'var(--hud-green)';
                        btnLimparCache.style.borderColor = 'var(--hud-green)';
                        btnLimparCache.style.color = 'white';

                    } catch (e) {
                        showHudToast("Erro ao limpar o cache: " + e.message);
                    } finally {
                         setTimeout(() => {
                            btnLimparCache.textContent = 'Limpar Cache de Carregamento';
                            btnLimparCache.style.backgroundColor = '';
                            btnLimparCache.style.borderColor = 'var(--hud-red)';
                            btnLimparCache.style.color = 'var(--hud-red)';
                        }, 2500);
                    }
                }
            };
            cacheButtonsContainer.appendChild(btnLimparCache);

            // Adiciona o container (com os 3 botões) ao painel de configurações
            content.appendChild(cacheButtonsContainer);

            // --- (FIM DA MODIFICAÇÃO) ---

            // --- Cria o painel ---
            createDraggablePanel('blocoPredefinicoesHUD', 'Predefinições', content, {
                top: mainPanelRect.top,
                left: mainPanelRect.left - 320,
                width: 300,
                height: 570 // (Altura AUMENTADA para caber os novos botões)
            });
        });

        // (MODIFICADO) Botão Mapa (agora usa a função central)
        btnMapa.addEventListener("click", () => {
            // A variável 'localizacao' (com 'l' minúsculo) é preenchida pelo teu interceptador XHR
            handleMapLink(localizacao[0], localizacao[1], btnMapa);
        });

        // (NOVO) Botão Captura
        btnCaptura.addEventListener("click", toggleMapCaptureMode);

        // (Existente) Botão Copiar
        btnCopiar.addEventListener("click", () => {
            const clientesParaCopiar = Object.values(infoClientes)
                .filter(c => !state.somenteCancelados || c.data.registro.tipodesativacao === 1)
                .map(c => {
                    let textoCompleto = c.data.registro.nome || "Cliente Desconhecido";
                    let partes = textoCompleto.split(" - ");
                    let contrato = partes[1]?.trim() || "Cliente Desconhecido";

                    let textoParaCopiar = contrato;

                    if (state.exibirNomeCliente) {
                        let nomeCliente = "";
                        if (partes.length > 2) {
                            let ultimasPartes = partes.slice(2).join(" - ");
                            nomeCliente = ultimasPartes.replace(/\s*\((ATIVO|CANCELADO|SUSPENSO|NAO IDENTIFICADO)\)$/i, "").trim();
                        }
                        if (nomeCliente) {
                            textoParaCopiar += ` - ${nomeCliente}`;
                        }
                    }

                    if (state.copiarStatus && contrato !== "Cliente Desconhecido") {
                        let statusCliente = textoCompleto.match(/\((ATIVO|CANCELADO|SUSPENSO|NAO IDENTIFICADO)\)/i);
                        textoParaCopiar += ` (${statusCliente ? statusCliente[1] : "NAO IDENTIFICADO"})`;
                    }

                    if (state.copiarNomeRede) {
                        let redeCliente = (c.data.rede?.rede || "").replace(/Card \d+ Porta \d+$/i, "").trim();
                        if(redeCliente) textoParaCopiar += ` || ${redeCliente}`;
                    }
                    return textoParaCopiar;
                });

            if (clientesParaCopiar.length === 0) return;
            copyToClipboard(clientesParaCopiar.join("\n"), btnCopiar);
        });

        // --- PREENCHIMENTO INICIAL ---
        finalizarHud();
    }


    // --- 5. FUNÇÕES DO INTERCEPTADOR DE API ---

    /**
     * (MODIFICADO) Reseta o estado dos dados coletados,
     * mas preserva os códigos de contexto (Pai e Poste) se existirem.
     */
    function resetState() {
        ultimaAPI = null;
        equipamentosInfo = {};
        equipamentosOrdem = [];
        infoClientes = {};
        isInitialLoadComplete = false;
        state.searchQuery = ''; // Limpa a pesquisa
        hudUserInteracted = false;

        // NÃO limpa ultimoCodigoEquipamentoPai
        // NÃO limpa ultimoCodigoPoste
    }

    /**
     * Desenha os dados coletados dentro do painel do HUD.
     * (VERSÃO MODIFICADA - INCLUI BARRA DE PESQUISA)
     */
    function finalizarHud() {
        // Encontra os elementos do HUD
        const conteudoDiv = document.querySelector("#hudPainelTeste .hud-content");
        const painel = document.querySelector("#hudPainelTeste");
        const cabecalho = document.querySelector("#hudPainelTeste .hud-header");

        // Se o HUD não estiver na tela (fechado), não faz nada.
        if (!conteudoDiv || !painel || !cabecalho) {
            return;
        }

        conteudoDiv.innerHTML = ""; // Limpa o conteúdo

        // --- ADICIONAR BARRA DE PESQUISA (NOVO) ---
        const searchBar = document.createElement('div');
        searchBar.className = 'hud-search-bar';

        searchBar.style.display = state.searchBarVisible ? 'block' : 'none';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'hud-search-field';
        searchInput.className = 'hud-search-input';
        searchInput.placeholder = 'Pesquisar contrato (só números)...';
        searchInput.value = state.searchQuery || ''; // Restaura o valor da pesquisa anterior

        // 1. Filtro de "só números" e 2. Acionador da pesquisa
        searchInput.oninput = (e) => {
            e.target.value = e.target.value.replace(/\D/g, ''); // Remove não-números
            debouncedSearch(); // Chama a pesquisa com "debounce"
        };

        searchBar.appendChild(searchInput);
        conteudoDiv.appendChild(searchBar);
        // --- FIM DA BARRA DE PESQUISA ---

        const normalizarRede = nome => nome ? nome.replace(/^\d+\s*-\s*/, "").trim().toLowerCase() : "";
        const capitalizarRede = nome => nome.replace(/\b\w/g, l => l.toUpperCase());
        const todasRedesNorm = [...new Set(Object.values(equipamentosInfo).map(e => e.nomeRede))]
            .map(normalizarRede)
            .filter(Boolean);

        const ordemFinal = [...equipamentosOrdem];
        if (equipamentosInfo['__porDemanda__'] && !ordemFinal.includes('__porDemanda__')) {
            ordemFinal.unshift('__porDemanda__');
        }

        ordemFinal.forEach(equipId => {
            const equipamento = equipamentosInfo[equipId];
            if (!equipamento || equipamento.clientes.length === 0) return;

            const isDemanda = equipId === '__porDemanda__';
            const nomeRedeEquipamento = equipamento.nomeRede;
            let redeFinal = isDemanda ? nomeRedeEquipamento : (capitalizarRede(normalizarRede(nomeRedeEquipamento)) || "Rede Desconhecida");

            const redeDiv = document.createElement("div");
            redeDiv.className = "hud-network-header";
            redeDiv.innerHTML = `📡 <strong>${redeFinal}</strong>`;
            conteudoDiv.appendChild(redeDiv);

            const clientesDoEquipamento = [...equipamento.clientes].sort((a, b) => {
                const portaA = parseInt(a.porta) || Infinity;
                const portaB = parseInt(b.porta) || Infinity;
                return portaA - portaB;
            });

            clientesDoEquipamento.forEach(conexao => {
                const clienteDetalhes = infoClientes[conexao.id];
                if (!clienteDetalhes) return;

                const li = document.createElement("div");
                li.className = 'hud-client-row';
                li.onclick = () => {
                    li.classList.toggle('clicked');

                    // --- INÍCIO DA CORREÇÃO ---
                    // "Trava" o HUD assim que o usuário interagir pela primeira vez
                    if (hudUserInteracted === false) {
                         console.log('[HUD Script] Interação detetada (tachado). A desativar refresh no hover.');
                         hudUserInteracted = true;
                    }
                    // --- FIM DA CORREÇÃO ---
                };

                let texto = clienteDetalhes.data.registro?.nome || "Cliente desconhecido";
                let partes = texto.split(" - ");

                // --- LÓGICA DE PARSING ATUALIZADA ---
                let contrato = partes[1]?.trim() || "";
                let matchStatus = texto.match(/\((ATIVO|CANCELADO|SUSPENSO|NAO IDENTIFICADO)\)/i);
                let status = matchStatus ? matchStatus[1].toUpperCase().replace(' ', '-') : "NAO-IDENTIFICADO";

                // (NOVO) Extrai o nome do cliente
                let nomeCliente = "";
                if (partes.length > 2) {
                    // Pega tudo da parte 2 em diante e junta (caso o nome tenha " - ")
                    let ultimasPartes = partes.slice(2).join(" - ");
                    // Remove o status do final do nome
                    nomeCliente = ultimasPartes.replace(/\s*\((ATIVO|CANCELADO|SUSPENSO|NAO IDENTIFICADO)\)$/i, "").trim();
                }

                // (NOVO) Decide se o nome deve ser exibido
                const nomeDisplay = (state.exibirNomeCliente && nomeCliente)
                                    ? `<span class="hud-client-name"> - ${nomeCliente}</span>`
                                    : ''; // String vazia se desativado ou se não houver nome
                // --- FIM DA LÓGICA DE PARSING ---

                let redeCliente = (clienteDetalhes.data.rede?.rede || "").replace(/Card \d+ Porta \d+$/i, "").trim();
                const redeClienteNorm = redeCliente.toLowerCase();

                let mesmaRede = isDemanda ? true : todasRedesNorm.some(r => redeClienteNorm.includes(r));

                const portaDisplay = conexao.obs
                    ? `<img src="https://img.icons8.com/fluency/48/error--v1.png" style="width:14px;height:14px;vertical-align:middle;" title="${conexao.obs}">`
                    : (conexao.porta || '?');

                if (contrato) {
                    // (ATUALIZADO) Adiciona a variável 'nomeDisplay' ao innerHTML
                    li.innerHTML = `
                        <span class="port">${portaDisplay}:</span>
                        <span class="contract">${contrato}</span>${nomeDisplay}
                        <span class="status-${status}">(${status.charAt(0) + status.slice(1).toLowerCase().replace('-', ' ')})</span>
                        ${redeCliente ? `|| <span class="network">${redeCliente}</span>` : ""}
                    `;
                    if (!mesmaRede && state.destacarRedesDivergentes) {
                        li.classList.add('network-divergent');
                    }
                } else {
                    li.innerHTML = `<span class="port">${portaDisplay}:</span> <span class="contract">Cliente Desconhecido</span>`;
                }
                conteudoDiv.appendChild(li);
            });
        });

        // Trava para executar o redimensionamento apenas na carga inicial
        if (!isInitialLoadComplete) {
            // --- CÁLCULO DA ALTURA ---
            const headerHeight = cabecalho.offsetHeight;
            const contentHeight = conteudoDiv.scrollHeight;
            const totalHeight = headerHeight + contentHeight + 15; // 15px de padding/margem

            // Limita a altura máxima
            const maxHeight = parseInt(getComputedStyle(painel).maxHeight) || 550;
            painel.style.height = `${Math.min(totalHeight, maxHeight)}px`;

            // --- (NOVO) CÁLCULO DA LARGURA ---

            // 1. 'scrollWidth' mede a largura total do conteúdo (incluindo padding)
            //    mesmo que esteja a transbordar do painel (que estava com 280px).
            let optimalWidth = conteudoDiv.scrollWidth;

            // 2. Verifica se a barra de rolagem vertical está visível
            //    (Se o conteúdo for mais alto que o espaço visível)
            const isScrollbarVisible = conteudoDiv.scrollHeight > conteudoDiv.clientHeight;

            if (isScrollbarVisible) {
                // Adiciona 8px para compensar o espaço da barra de rolagem
                optimalWidth += 8;
            }

            // 3. Define os limites mínimo e máximo para a largura
            const minWidth = 409; // Do teu CSS
            const maxWidth = window.innerWidth * 0.8; // Ex: Max 80% da largura da tela

            // 4. Aplica a nova largura ao painel
            painel.style.width = `${Math.min(Math.max(optimalWidth, minWidth), maxWidth)}px`;
            // --- FIM DO CÁLCULO DA LARGURA ---

            isInitialLoadComplete = true; // Ativa a trava
        }

        // --- RE-APLICAR PESQUISA (NOVO) ---
        // Garante que o filtro seja mantido se o HUD for
        // redesenhado por uma chamada de API
        performSearch();
    }

    // Criar uma versão "debounced" da função de finalização
    const debouncedFinalizar = debounce(finalizarHud, 400);


    /**
     * (MODIFICADO) Inicia o interceptador de XHR (API).
     * (NOVO) 'carregaCompletar.php' agora escreve no cache 'geoItems'.
     * (NOVO) 'carregaItensCidades.php' é o GATILHO para a carga rápida.
     */
    function iniciarInterceptadorXHR() {

        // --- Handlers (Funções que gravam no cache e fazem outras lógicas) ---
        const handlers = {
            "api.php": (data, url, bodyParams) => {
                // ... (toda a sua lógica original de 'api.php' permanece igual) ...
                if (bodyParams && bodyParams.get) {
                    const controlador = bodyParams.get("controlador");
                    const metodo = bodyParams.get("metodo");
                    const codigo = bodyParams.get("codigo");

                    if (controlador === 'diagrama' && metodo === 'carregarCabosEquipamentos' && codigo) {
                        ultimoCodigoEquipamentoPai = codigo;
                        console.log('[HUD Script] Código do equipamento PAI capturado:', ultimoCodigoEquipamentoPai);
                    }
                }

                if (data?.equipamentos) {
                    const codigoPaiPreservado = ultimoCodigoEquipamentoPai;
                    const codigoPostePreservado = ultimoCodigoPoste;
                    resetState();
                    ultimoCodigoEquipamentoPai = codigoPaiPreservado;
                    ultimoCodigoPoste = codigoPostePreservado;
                    const conteudoDiv = document.querySelector("#hudPainelTeste .hud-content");
                    if(conteudoDiv) {
                        conteudoDiv.innerHTML = '';
                        const searchBar = document.createElement('div');
                        searchBar.className = 'hud-search-bar';
                        searchBar.style.display = state.searchBarVisible ? 'block' : 'none';
                        searchBar.innerHTML = `<input type="text" id="hud-search-field" class="hud-search-input" placeholder="Pesquisar contrato (só números)...">`;
                        conteudoDiv.appendChild(searchBar);
                        const searchInput = document.getElementById('hud-search-field');
                        searchInput.oninput = (e) => {
                            e.target.value = e.target.value.replace(/\D/g, '');
                            debouncedSearch();
                        };
                        const textNode = document.createElement('div');
                        textNode.textContent = "Aguardando abertura de equipamento...";
                        textNode.style.padding = "8px 0";
                        conteudoDiv.appendChild(textNode);
                    }
                }
                ultimaAPI = data;
            },
            "desvincularCliente.php": (data, url, bodyParams) => {
                // Pega o código do splitter (ex: JPT_DIV76173) e a porta (ex: 4)
                const codigoEquipamento = bodyParams?.get("codigo");
                const portaCliente = bodyParams?.get("id"); // Este é o número da porta

                if (!codigoEquipamento || !portaCliente) {
                    console.warn("[HUD Script] 'desvincularCliente.php' intercetado sem código ou porta.");
                    return;
                }

                console.log(`[HUD Script] Atualizando cliente para 'Removido': Equipamento ${codigoEquipamento}, Porta ${portaCliente}`);

                try {
                    // --- Etapa 1: Remover o cliente do nosso objeto de DADOS ---
                    if (equipamentosInfo[codigoEquipamento] && equipamentosInfo[codigoEquipamento].clientes) {

                        const indexParaRemover = equipamentosInfo[codigoEquipamento].clientes.findIndex(
                            cliente => cliente.porta == portaCliente
                        );

                        if (indexParaRemover > -1) {
                            // Remove o cliente do array de dados
                            equipamentosInfo[codigoEquipamento].clientes.splice(indexParaRemover, 1);
                            console.log("[HUD Script] Cliente removido dos DADOS.");
                        } else {
                             console.warn("[HUD Script] Porta não encontrada nos dados do equipamento.");
                        }
                    } else {
                         console.warn("[HUD Script] Equipamento não encontrado em 'equipamentosInfo'.");
                    }

                    // --- Etapa 2: Atualizar a VISUALIZAÇÃO (do HTML) para "Removido" ---
                    const conteudoDiv = document.querySelector("#hudPainelTeste .hud-content");
                    if (!conteudoDiv) return;

                    const todasAsLinhas = conteudoDiv.querySelectorAll('.hud-client-row');
                    let linhaModificada = false;

                    for (const linha of todasAsLinhas) {
                        const portSpan = linha.querySelector('.port');

                        // 1. Encontra a linha correta pela porta
                        if (portSpan && portSpan.textContent.replace(':', '').trim() == portaCliente) {

                            // 2. Pega o número do contrato ANTES de apagar
                            let contratoNum = "0000"; // Default
                            const contractSpan = linha.querySelector('.contract');
                            if (contractSpan) {
                                contratoNum = contractSpan.textContent.trim();
                            }

                            // 3. Define o novo texto (limpando o conteúdo antigo)
                            //    (Mantemos o span da porta, pois é um bom identificador)
                            linha.innerHTML = `
                                <span class="port">${portSpan.innerHTML}</span>
                                <span class="contract" style="color: var(--hud-red);">Removido (${contratoNum})</span>
                            `;

                            // 4. Adiciona a classe "tachado"
                            linha.classList.add('clicked');

                            // 5. (Opcional) Remove a cor de "rede divergente", se tiver
                            linha.classList.remove('network-divergent');

                            // 6. Torna o clique "permanente" (desativa o toggle)
                            linha.onclick = null;

                            linhaModificada = true;
                            console.log("[HUD Script] Linha do cliente atualizada para 'Removido'.");
                            break; // Para o loop
                        }
                    }
                    if (!linhaModificada) {
                        console.warn("[HUD Script] Não foi encontrada nenhuma linha no HTML com a porta " + portaCliente);
                    }

                } catch (e) {
                    console.error("[HUD Script] Erro ao tentar atualizar cliente da HUD para 'Removido':", e);
                }
            },
            "carregarPortas.php": (data, url, bodyParams) => {
                // ... (toda a sua lógica original de 'carregarPortas.php' permanece igual) ...
                const equipId = bodyParams?.get("codigo");
                if (!equipId || !ultimaAPI?.dados) return;
                const nomeRede = ultimaAPI.dados.nome_rede;
                if (!equipamentosInfo[equipId]) {
                    equipamentosInfo[equipId] = { nomeRede, clientes: [] };
                    if (!equipamentosOrdem.includes(equipId)) {
                        equipamentosOrdem.push(equipId);
                    }
                }
                data.registros.saidas.forEach(p => {
                    if (p.cliente.possuiCliente) {
                        equipamentosInfo[equipId].clientes.push({
                            id: p.cliente.id, porta: p.fibra, obs: p.comentario?.texto ?? ""
                        });
                    }
                });
            },
            "carregarFibras.php": (data) => {
                // ... (toda a sua lógica original de 'carregarFibras.php' permanece igual) ...
                if (data?.registros) {
                    if (!equipamentosInfo['__porDemanda__']) {
                        equipamentosInfo['__porDemanda__'] = { nomeRede: 'Clientes por Demanda', clientes: [] };
                    }
                    data.registros.forEach(p => {
                        if (p.cliente.possuiCliente) {
                            equipamentosInfo['__porDemanda__'].clientes.push({
                                id: p.cliente.id, porta: '?', obs: p.comentario?.texto ?? ""
                            });
                        }
                    });
                }
            },
            "consultarCliente.php": (data, url, bodyParams) => {
                const idCliente = bodyParams?.get("idCliente");
                if (!idCliente) return;

                // --- INÍCIO DA CORREÇÃO (Estratégia do "Tachado") ---

                // 1. Se o usuário JÁ INTERAGIU (tachou um cliente),
                // apenas atualiza os dados em segundo plano e NÃO redesenha.
                if (hudUserInteracted === true) {
                    infoClientes[idCliente] = { id: idCliente, data };
                    return; // Sai da função e ignora o finalizarHud()
                }

                // 2. Se o usuário AINDA NÃO INTERAGIU, processa normalmente.
                // (Isso permite que o HUD carregue os clientes iniciais)
                infoClientes[idCliente] = { id: idCliente, data };
                debouncedFinalizar();
                // --- FIM DA CORREÇÃO ---
            },
            "carregaViabilidadeMarcadorJava.php": (data, url, bodyParams) => {
                // ... (toda a sua lógica original de 'carregaViabilidadeMarcadorJava.php' permanece igual) ...
                const loc = data?.dados?.[0];
                if (loc) localizacao = [loc.lat, loc.lng];
                if (bodyParams && bodyParams.get) {
                    const posteRaw = bodyParams.get("poste");
                    if (posteRaw) { ultimoCodigoPoste = posteRaw.replace(/^PT/i, ''); }
                }
            },
            "carregaTipoPadrao": (data) => {
                const fabricante = data?.fabricante;
                const tipo = data?.tipo;
                let codigoParaInserir = null;
                let seletorDoInput = null;

                const codigoPoste = ultimoCodigoPoste || "00000";

                // 1. Define o código E o seletor correto
                if (fabricante === "Overtek" && tipo === "Caixa de Atendimento (Splitter)") {
                    codigoParaInserir = `cx em. ${codigoPoste}`;
                    seletorDoInput = '.template-caixa input[name="codigo"]';
                } else if (fabricante === "Furukawa" && tipo === "terminal de teste") {
                    codigoParaInserir = `cx at. ${codigoPoste}`;
                    seletorDoInput = '.template-terminal input[name="codigo"]';
                }

                if (!codigoParaInserir || !seletorDoInput) {
                    return;
                }

                // 3. (REVERTIDO) Usa o "Vigia" simples com timeout de 3s
                const observer = new MutationObserver((mutationsList, obs) => {
                    for (const mutation of mutationsList) {
                        if (mutation.type === 'childList') {
                            for (const node of mutation.addedNodes) {
                                // 4. Verifica se o nó adicionado é o painel de cadastro
                                if (node.nodeType === 1 && node.matches('.padrao-painel-flutuante.painel-acessorio-cadastro')) {

                                    // 5. Painel encontrado! Usamos o seletor dinâmico
                                    const inputCodigo = node.querySelector(seletorDoInput);

                                    if (inputCodigo) {
                                        // 6. Preenche o valor e foca no campo
                                        inputCodigo.value = codigoParaInserir;
                                        inputCodigo.focus();

                                        // 7. Para de observar (trabalho concluído)
                                        obs.disconnect();
                                        return;
                                    }
                                }
                            }
                        }
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                // 9. (MODIFICADO) Medida de segurança: 3 segundos
                setTimeout(() => {
                    observer.disconnect();
                }, 3000); // 3 segundos
            },
            "funcoesRoteamentoMapa.php": (data) => {
                setTimeout(() => {
                    document.querySelectorAll(".menu-lateral-container, .menu-lateral-direito.menu-lateral-rota.absolute").forEach(el => { el.style.overflow = "auto"; });
                }, 100); // 100ms de espera
            },
            "carrega_tiposDeEquipamentos.php": (data) => {
                const codigoPoste = ultimoCodigoPoste || "00000";
                const codigoParaInserir = `spl. TIPO ${codigoPoste}`;
                setTimeout(() => {
                    document.activeElement.value=codigoParaInserir
                }, 100); // 100ms de espera
            },

            // --- Handlers de Cache (Lógica de gravação ATUALIZADA) ---

            "carregaItensCidades.php": (data, url, bodyParams) => {
                // Esta chamada apenas GRAVA no cache "burro"
                gravarNoCache(url, bodyParams.toString(), data);
            },
            "carregaAcessoriosPoste.php": (data, url, bodyParams) => {
                // --- Lógica da v3.3 (CACHE) ---
                if (bodyParams && bodyParams.get('poste')) {
                    gravarNoCache(url, bodyParams.toString(), data);
                }

                // --- Lógica da v2.7 (PREENCHIMENTO) ---
                // 1. Pega o código do poste
                const codigoPoste = ultimoCodigoPoste || "00000";
                const codigoParaInserir = `ponte ${codigoPoste}`;

                // 3. Usa o "Vigia" simples com timeout de 3s
                const observer = new MutationObserver((mutationsList, obs) => {
                    for (const mutation of mutationsList) {
                        if (mutation.type === 'childList') {
                            for (const node of mutation.addedNodes) {
                                // 4. Verifica se é o painel correto
                                if (node.nodeType === 1 && node.matches('.padrao-painel-flutuante.painel-cadastro-cabo-ligacao')) {

                                    // 5. Encontra o input de código DENTRO dele
                                    const inputCodigo = node.querySelector('input[name="codigo"]');

                                    if (inputCodigo) {
                                        // 6. Preenche e foca
                                        inputCodigo.value = codigoParaInserir;
                                        inputCodigo.focus();

                                        // 7. Limpa
                                        obs.disconnect();
                                        return;
                                    }
                                }
                            }
                        }
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => {
                    observer.disconnect();
                }, 3000); // 3 segundos
            },

            // (NOVO) 'carregaCompletar' agora é um "escritor inteligente"
            "carregaCompletar.php": async (data, url, bodyParams) => {
                // 1. Mantém o cache "burro" (é bom como fallback)
                gravarNoCache(url, bodyParams.toString(), data);

                // 2. Inicia a lógica do cache "inteligente"
                if (!cacheDB) return;

                try {
                    let itemsToSave = [];

                    // O 'data' pode ser um array (ex: cabos) ou um objeto (ex: postes)
                    if (Array.isArray(data)) {
                        itemsToSave = data;
                    } else if (data && data.cd) { // Resposta de item único
                        itemsToSave = [data];
                    }

                    // --- INÍCIO DA NOVA LÓGICA DE DEPENDÊNCIA ---
                    const itemsComDependencia = itemsToSave.map(item => {
                        const dependencies = new Set();

                        // Verifica se é um Cabo (possui array 'points')
                        if (item.points && Array.isArray(item.points)) {

                            // Percorre todos os pontos do cabo
                            item.points.forEach(point => {
                                // O campo 'cd' nos pontos é o código do poste/equipamento
                                if (point.cd && point.cd.startsWith('PT')) { // Filtra apenas por PT (poste)
                                    dependencies.add(point.cd);
                                }

                                // O campo 'cd' no ponto 0 e no último ponto é crucial,
                                // mas também os pontos intermediários podem ter.
                                // Exemplo de estrutura aninhada: bType 2 (Poste)
                                if (point.bType === 2 && point.cd) {
                                    dependencies.add(point.cd);
                                }
                            });
                        }

                        // Retorna o item enriquecido com a lista de dependências
                        return {
                            ...item,
                            dependencies: Array.from(dependencies) // Converte o Set para Array
                        };
                    });
                    // --- FIM DA NOVA LÓGICA DE DEPENDÊNCIA ---

                    // Filtra por itens válidos (só salva se tiver os dados mínimos)
                    const validItems = itemsComDependencia.filter(item => item.cd && item.cdCity);

                    if (validItems.length > 0) {
                        // A SINTAXE CORRETA DO 'db.js':
                        await cacheDB.geoItems.put(validItems);
                        console.log(`[HUD Script - Cache] Salvo ${validItems.length} itens (com dependências) no 'geoItems'.`);
                    }
                } catch (e) {
                    console.error(`[HUD Script - Cache] Erro ao salvar no 'geoItems':`, e);
                }
            }
        };

        // --- Função de Gravação (Helper interno - "Cache Burro") ---
        async function gravarNoCache(url, payloadString, responseData) {
            if (!cacheDB) { return; }
            const cacheId = `${url}?${payloadString}`;
            try {
                await cacheDB.apiResponses.put({ // Salva no cache 'apiResponses'
                    id: cacheId,
                    url: url,
                    data: responseData,
                    timestamp: new Date().getTime()
                });
                // console.log(`[HUD Script - Cache] Salvo: ${cacheId.substring(0, 150)}...`);
            } catch (e) {
                console.error(`[HUD Script - Cache] Erro ao salvar ${cacheId}:`, e);
            }
        }

        // --- Função Dispatcher (Helper interno) ---
        // (Chama os handlers acima)
        function dispatchHandler(url, resp, bodyParams) {
            const key = Object.keys(handlers).find(k => url.includes(k));
            if (!key) return;
            try {
                const data = JSON.parse(resp);
                handlers[key](data, url, bodyParams); // Chama o handler correspondente
            } catch (err) {}
        }

        // --- Monkey-patching XMLHttpRequest ---
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            this._method = method;

            // (GRAVADOR) Anexa o 'load' listener para salvar no cache QUANDO a rede responder
            this.addEventListener("load", () => {
                if (this.status !== 200) return;
                let bodyParams = (this._body instanceof FormData) ? this._body : new URLSearchParams(this._body || "");
                // Chama o dispatcher, que vai salvar nos caches (burro e/ou inteligente)
                dispatchHandler(this._url, this.responseText, bodyParams);
            });

            return origOpen.apply(this, arguments);
        };

        // (LÓGICA DO 'SEND' REFEITA - COM .abort())
        XMLHttpRequest.prototype.send = function(body) {
            this._body = body;
            const xhr = this;

            // --- (INÍCIO DA MODIFICAÇÃO: LÓGICA DE BYPASS) ---
            // Verifica se a flag de bypass (definida pelo script injetado) está ativa
            try {
                const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
                if (gw.__hudBypassProximaCarga__ === true) {
                    console.log('[HUD Script - Interceptor] Flag de bypass detectada. Permitindo carregamento lento.');
                    gw.__hudBypassProximaCarga__ = false; // Reseta a flag para a próxima vez
                    origSend.call(xhr, body); // Chama o 'send' original
                    return; // Pula toda a lógica de cache
                }
            } catch (err) {
                // Mesmo se der erro ao ler a flag, continua o fluxo normal
                console.warn("[HUD Script - Interceptor] Erro ao verificar flag de bypass.", err);
            }
            // --- (FIM DA MODIFICAÇÃO) ---

            // --- (INÍCIO DA LÓGICA DO "LEITOR RÁPIDO" - COM DEPENDÊNCIAS) ---
            const isFastLoadTrigger = xhr._url && xhr._url.includes("carregaItensCidades.php");

            if (xhr._method === 'POST' && isFastLoadTrigger && cacheDB) {
                console.log('[HUD Script] Gatilho de Carga Rápida detectado!');

                (async () => {
                    try {
                        const bodyParams = new URLSearchParams(body);
                        const cityCodes = bodyParams.getAll('json[]');
                        const cityIDs = cityCodes.map(c => c.replace('CD', '')); // IDs numéricos
                        const cityIdSet = new Set(cityIDs);

                        const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);

                        console.log(`[HUD Script] Consultando cache para cidades: ${cityIDs.join(', ')}`);

                        // 1. Pede TODOS os itens do cache
                        const allItems = await cacheDB.geoItems.query().all().execute();

                        console.log(`[HUD Script] ${allItems.length} itens lidos. Filtrando...`);

                        // --- ETAPA A: CARREGA ITENS PRINCIPAIS (da cidade selecionada) ---
                        const primaryItems = allItems.filter(item => {
                            return cityIdSet.has(item.cdCity);
                        });

                        // --- ETAPA B: BUSCA POR DEPENDÊNCIAS INTERCIDADE ---

                        const dependencyCodes = new Set();
                        // 1. Coleta TODOS os códigos de dependência dos itens primários
                        primaryItems.forEach(item => {
                            (item.dependencies || []).forEach(depCode => {
                                // Adiciona se o código de dependência NÃO for da cidade que já está sendo carregada (evita duplicação)
                                const depCityMatch = depCode.match(/CD(\d+)/)?.[1] || '';
                                if (!cityIdSet.has(depCityMatch)) {
                                     dependencyCodes.add(depCode);
                                }
                            });
                        });

                        console.log(`[HUD Script] Encontradas ${dependencyCodes.size} dependências intercidade.`);

                        // 2. Busca os itens de dependência no cache (ex: PT001_CD200)
                        const dependentItems = allItems.filter(item => {
                            // Verifica se o 'cd' do item (ex: PT001_CD200) está na nossa lista de dependências
                            return dependencyCodes.has(item.cd);
                        });

                        // 3. Combina as listas e remove duplicatas
                        const finalItemsMap = new Map();

                        [...primaryItems, ...dependentItems].forEach(item => {
                             finalItemsMap.set(item.cd, item);
                        });

                        const finalItems = Array.from(finalItemsMap.values());

                        console.log(`[HUD Script] Total de ${finalItems.length} itens (cidade + dependências) encontrados.`);


                        if (!finalItems || finalItems.length === 0) {
                            console.warn("[HUD Script] Cache 'geoItems' vazio. Deixando a carga normal do site prosseguir.");
                            origSend.call(xhr, body);
                            return;
                        }

                        // 4. A "PONTE": Envia os dados para o script injetado
                        console.log(`[HUD Script] Cache 'geoItems' carregado. Enviando ${finalItems.length} itens para a página...`);
                        document.dispatchEvent(new CustomEvent('hud:plotFast', {
                            detail: { items: finalItems }
                        }));

                        // 5. ABORTA a requisição original
                        console.log("[HUD Script] Abortando requisição XHR original.");
                        xhr.abort();
                        // --- (FIM DA CORREÇÃO) ---

                    } catch (e) {
                        console.error("[HUD Script] Erro ao carregar do 'geoItems':", e);
                        origSend.call(xhr, body); // Fallback para o carregamento lento
                    }
                })();

                return;
            }
            // --- (FIM DA LÓGICA DO "LEITOR RÁPIDO") ---

            // --- Lógica de cache antiga (para 'carregaCompletar' etc.) ---
            const isOldCacheable = xhr._url && (
                xhr._url.includes("carregaCompletar.php") ||
                (xhr._url.includes("carregaAcessoriosPoste.php") && body && body.includes("poste="))
            );

            if (xhr._method === 'POST' && isOldCacheable && cacheDB) {
                (async () => {
                    let bodyParams = new URLSearchParams(body);
                    const cacheId = `${xhr._url}?${bodyParams.toString()}`;
                    const cachedData = await lerDoCache(cacheId);

                    if (cachedData) {
                        Object.defineProperty(xhr, 'responseText', { value: JSON.stringify(cachedData) });
                        Object.defineProperty(xhr, 'status', { value: 200 });
                        Object.defineProperty(xhr, 'readyState', { value: 4 });
                        xhr.dispatchEvent(new Event('load'));
                    } else {
                        origSend.call(xhr, body);
                    }
                })();
            } else {
                origSend.call(xhr, body);
            }
        };
    }

    /**
     * (NOVO) Inicia um listener para forçar o carregamento lento (bypass do cache).
     * Se o usuário segurar CTRL ao clicar em "Mostrar Item", o cache rápido é ignorado.
     */
    function iniciarListenerDeBypassDeCarga() {
        // Usamos 'mousedown' na fase de 'capture' (true) para garantir que
        // definimos a flag ANTES do 'click' ser processado pela página.
        document.body.addEventListener('mousedown', function(e) {

            // 1. Verifica se o alvo é o botão de carregar
            const target = e.target;
            if (target && target.matches('img[name="mostrar_item"]')) {

                // 2. Verifica se a tecla CTRL está pressionada
                if (e.ctrlKey) {
                    console.log('%c[HUD Script] CTRL+Click detectado no botão "Mostrar Item".', 'color: #f66a0a; font-weight: bold;');
                    console.log('%c[HUD Script] Forçando carregamento lento (bypass do cache)...', 'color: #f66a0a; font-weight: bold;');

                    // 3. Define a flag de bypass no contexto da PÁGINA (unsafeWindow)
                    try {
                        const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
                        gw.__hudBypassProximaCarga__ = true;

                        // O seu interceptador XHR em 'iniciarInterceptadorXHR'
                        // agora verá esta flag como 'true', fará o carregamento lento
                        // e depois resetará a flag para 'false' automaticamente.

                    } catch (err) {
                        console.error("[HUD Script] Falha ao definir a flag de bypass no 'unsafeWindow'.", err);
                    }
                }
            }
        }, true); // 'true' usa a fase de CAPTURA
    }

    //Colar Coordenadas (MODIFICADO - V4 - Foco no 'OK' após colar)
function iniciarListenerDeColarCoordenadas() {
    // Se já foi instalado no contexto da página, não reinstala
    try {
        if (unsafeWindow.__coordenadasListener__) return;
        unsafeWindow.__coordenadasListener__ = true;
    } catch (err) {
        if (window.__coordenadasListener__) return;
        window.__coordenadasListener__ = true;
    }

    document.body.addEventListener('paste', async function(e) {
        // 1. Só age ao colar em um input[name="latitude"]
        if (!e.target || !e.target.matches || !e.target.matches('input[name="latitude"]')) return;

        const latInput = e.target;

        // 2. (NOVO) Encontra os elementos relativos a este input
        const commonParent = latInput.closest('.latitude-container')?.parentElement;
        if (!commonParent) {
            console.warn('[HUD Script - Paste] Não foi possível encontrar "commonParent" do input.');
            return;
        }

        const lonInput = commonParent.querySelector('input[name="longitude"]');
        const okButton = commonParent.querySelector('button[name="ok"]');

        if (!lonInput || !okButton) {
            console.warn('[HUD Script - Paste] Não foi possível encontrar lonInput ou okButton relativos.');
            return;
        }

        // 3. Pega o texto colado
        const pastedText = (e.clipboardData || window.clipboardData).getData('text') || '';
        const raw = pastedText.trim();
        if (!raw) return;

        // 4. (MODIFICADO) Helper para preencher E focar
        function preencher(lat, lon) {
            if (!lat || !lon) return;
            latInput.value = lat;
            lonInput.value = lon;
            // --- A MÁGICA ACONTECE AQUI ---
            okButton.focus();
            // -----------------------------
        }

        // --- LÓGICA DE PASTE ---

        // 5. Detecta coordenadas diretas no texto colado
        const coordMatch = raw.match(/-?\d+\.\d+/g);
        if (coordMatch && coordMatch.length >= 2) {
            console.log('[HUD Script - Paste] Coordenadas diretas detectadas.');
            e.preventDefault();
            const latRaw = coordMatch[0];
            const lonRaw = coordMatch[1];
            preencher(latRaw, lonRaw); // <--- Chama o preencher/focar
            return;
        }

        // 6. Detecta código de Poste (ex: PT12345)
        const posteRegex = /^pt(\d+)$/i;
        if (posteRegex.test(raw)) {
            // É um código de poste. NÃO faz nada, deixa o paste padrão ocorrer.
            console.log('[HUD Script - Paste] Código de Poste detectado. Permitindo paste padrão.');
            return;
        }

        // 7. Detecta links (short e long)
        const shortlinkPattern = /\b(?:https?:\/\/)?(?:maps\.app\.goo\.gl|goo\.gl\/maps|goo\.gl)\//i;
        const longlinkPattern  = /\bhttps?:\/\/(?:www\.)?google\.[^\/]+\/maps/i;

        if (shortlinkPattern.test(raw) || longlinkPattern.test(raw)) {
            console.log('[HUD Script - Paste] Link de mapa detectado. Resolvendo...');
            e.preventDefault();

            // Feedback visual temporário (agora nos inputs corretos)
            latInput.value = "carregando...";
            lonInput.value = "carregando...";

            try {
                const shouldUseGM = shortlinkPattern.test(raw);
                let resolved = { url: raw, html: '' };

                if (shouldUseGM && typeof GM_xmlhttpRequest === 'function') {
                    resolved = await resolveShortlinkWithGM(raw);
                } else {
                    resolved = await resolveShortlinkFetch(raw);
                }

                const urlFinal = resolved.url || raw;
                const htmlFinal = resolved.html || '';

                let coords = extractCoords(urlFinal);
                if ((!coords || !coords.lat) && htmlFinal) {
                    const htmlCoords = extractCoords(htmlFinal);
                    if (htmlCoords) coords = htmlCoords;
                }

                if (coords) {
                    preencher(coords.lat, coords.lon); // <--- Chama o preencher/focar
                } else {
                    latInput.value = "erro";
                    lonInput.value = "erro";
                }
            } catch (err) {
                console.error("Falha ao resolver link de mapa:", err);
                latInput.value = "erro";
                lonInput.value = "erro";
            }
            return;
        }

        // 8. Se não for coordenada, nem poste, nem link, limpa os placeholders
        console.log('[HUD Script - Paste] Texto colado não reconhecido. Limpando campos.');
        e.preventDefault(); // Impede que o texto inválido seja colado
        latInput.value = "";
        lonInput.value = "";

    }, true); // uso da fase de captura para interceptar antes de inputs do site

    // --- Auxiliares (Não mudaram) ---

    // Usa GM_xmlhttpRequest (Tampermonkey) para contornar CORS em shortlinks
    function resolveShortlinkWithGM(url) {
        return new Promise((resolve, reject) => {
            try {
                let target = url;
                if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

                GM_xmlhttpRequest({
                    method: "GET",
                    url: target,
                    headers: { "User-Agent": "Mozilla/5.0 (Tampermonkey)" },
                    onload(response) {
                        try {
                            const final = response.finalUrl || response.responseURL || null;
                            const html = response.responseText || '';
                            if (final) return resolve({ url: final, html });
                            const meta = html.match(/<meta\s+http-equiv=["']refresh["']\s+content=["'][^;]+;\s*url=([^"']+)["']/i);
                            if (meta) return resolve({ url: meta[1], html });
                            resolve({ url: target, html });
                        } catch (e) {
                            reject(e);
                        }
                    },
                    onerror(err) { reject(err); },
                    ontimeout(err) { reject(err); },
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    // Resolve via fetch (quando GM não é necessário)
    async function resolveShortlinkFetch(url) {
        try {
            let target = url;
            if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
            const resp = await fetch(target, { redirect: "follow" });
            const html = await resp.text().catch(()=>"");
            const finalUrl = resp.url || target;
            return { url: finalUrl, html };
        } catch (e) {
            throw e;
        }
    }

    // Extrai coordenadas de texto/HTML
    function extractCoords(text) {
        if (!text) return null;
        let m;
        if (m = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)) return { lat: m[1], lon: m2 };
        if (m = text.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
        if (m = text.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
        if (m = text.match(/[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
        const nums = text.match(/-?\d+\.\d+/g);
        if (nums && nums.length >= 2) return { lat: nums[0], lon: nums[1] };
        return null;
    }
}

    // --- 6. INICIALIZAÇÃO DO SCRIPT ---
    // (Movido para cima para agrupar)

    // --- 7. ATIVADOR POR TECLA ---
    // Ouve por a tecla "+" do Numpad para ligar/desligar o HUD

    document.addEventListener('keydown', function(e) {
        // e.code === "NumpadAdd" é a tecla "+" do teclado numérico
        if (e.code === 'NumpadAdd') {

            // Previne que o "+" seja escrito em algum campo de texto
            e.preventDefault();

            // Lógica de toggle
            if (window.__hudAtivo__) {
                removerHUD();
            } else {
                criarHUD();
            }
        }
    });

    /**
     * (MODIFICADO) LÓGICA DE INTERCEÇÃO DO GOOGLE MAPS
     * Vigia até que a API do Google Maps esteja pronta, e então
     * "substitui" o construtor do Mapa para capturar a instância.
     * ADICIONADO: __hudSearchCircle__ para guardar o círculo de busca.
     */
    function iniciarInterceptadorDoMapa() {
        // Injeta um pequeno snippet que roda no contexto da página (não no sandbox)
        const injected = `(function(){
            // Flags na página
            window.__googleMapsApiDisponivel__ = false;
            window.__googleMapInstancia__ = window.__googleMapInstancia__ || null;
            window.__mapCaptureActive__ = window.__mapCaptureActive__ || false;
            window.__mapClickListener__ = window.__mapClickListener__ || null;
            // (NOVA LINHA ADICIONADA AQUI)
            window.__hudSearchCircle__ = window.__hudSearchCircle__ || null;

            // Verifica periodicamente até a API do Google estar disponível
            const check = setInterval(function(){
                try {
                    if (typeof window.google === 'object' && typeof window.google.maps === 'object') {
                        clearInterval(check);
                        window.__googleMapsApiDisponivel__ = true;
                        console.log('[HUD Script - injected] Google Maps API detectada. Interceptando construtor Map...');

                        // Monkey-patch do construtor para capturar a instância
                        try {
                            const originalMap = window.google.maps.Map;
                            window.google.maps.Map = function() {
                                const mapInstance = new originalMap(...arguments);
                                try {
                                    if (!window.__googleMapInstancia__) {
                                        window.__googleMapInstancia__ = mapInstance;
                                        console.log('[HUD Script - injected] Instância principal do mapa capturada.');
                                    }
                                } catch (e) {
                                    console.error('[HUD Script - injected] erro ao salvar instância do mapa', e);
                                }
                                return mapInstance;
                            };
                        } catch (err) {
                            console.warn('[HUD Script - injected] não foi possível sobrescrever google.maps.Map', err);
                        }
                    }
                } catch (e) { /* Ignore */ }
            }, 100);
        })();`;

        const s = document.createElement('script');
        s.textContent = injected;
        (document.head || document.documentElement).appendChild(s);
        // removemos o elemento imediatamente — o script já foi executado no contexto da página
        s.parentNode.removeChild(s);
    }


    /**
     * (MODIFICADO - V3) Intercepta cliques em botões 'OK' para buscar poste.
     * AGORA USA A API carregaCompletar.php
     */
    function iniciarListenerDeBuscaPoste() {
        document.body.addEventListener('click', async function(e) {
            const okButton = e.target.closest('button[name="ok"]');
            if (!okButton) { return; }

            console.log('[HUD Script - Busca Poste] Botão OK clicado.');

            const commonParent = okButton.closest('.buttons-container')?.parentElement;
            if (!commonParent) {
                console.warn('[HUD Script - Busca Poste] Não foi possível encontrar o "commonParent" do botão.');
                return;
            }

            const latInput = commonParent.querySelector('input[name="latitude"]');
            const lonInput = commonParent.querySelector('input[name="longitude"]');
            if (!latInput || !lonInput) {
                console.warn('[HUD Script - Busca Poste] Inputs de Lat/Lon não encontrados.');
                return;
            }

            const latValue = latInput.value.trim();
            const posteRegex = /^pt(\d+)$/i;
            const match = latValue.match(posteRegex);

            if (!match) { return; }

            console.log('[HUD Script - Busca Poste] CÓDIGO DE POSTE DETECTADO! Interceptando clique.');
            e.preventDefault();
            e.stopPropagation();

            const posteCode = `PT${match[1]}`;
            console.log(`[HUD Script - Busca Poste] Buscando API por: ${posteCode}`);
            latInput.value = "Buscando poste...";
            lonInput.value = "Aguarde...";

            try {
                // --- INÍCIO DAS MODIFICAÇÕES DA API ---

                // 1. (MODIFICADO) Monta o novo payload
                const body = new URLSearchParams();
                body.append('idRazaoSocial', '46');
                body.append('json[]', posteCode); // Trocado 'poste' por 'json[]'
                body.append('viabilidade', 'cabos,ficha_equipamento,ficha_terminal');
                // O campo 'ficha' foi removido

                // 2. (MODIFICADO) Faz a requisição para a nova URL
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: "http://172.16.6.57/geogrid/aconcagua/php/arquivosComuns/carregaCompletar.php",
                        data: body.toString(),
                        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                        onload: resolve,
                        onerror: reject,
                        ontimeout: reject
                    });
                });

                // 3. (MODIFICADO) Processa a nova resposta (que é um array direto)
                const data = JSON.parse(response.responseText);
                const loc = (Array.isArray(data) && data.length > 0) ? data[0] : null;

                // --- FIM DAS MODIFICAÇÕES DA API ---

                if (loc && loc.lat && loc.lng) {
                    console.log(`[HUD Script - Busca Poste] Sucesso! Coordenadas: ${loc.lat}, ${loc.lng}`);
                    latInput.value = loc.lat;
                    lonInput.value = loc.lng;

                    console.log('[HUD Script - Busca Poste] Preenchido. Executando clique original...');
                    okButton.click();
                } else {
                    console.warn('[HUD Script - Busca Poste] Poste não encontrado ou resposta inválida:', data);
                    latInput.value = "Poste não encontrado";
                    lonInput.value = "";
                }
            } catch (err) {
                console.error('[HUD Script - Busca Poste] Erro na requisição ou parsing:', err);
                latInput.value = "Erro (Ver console F12)";
                lonInput.value = "";
            }
        }, true);
    }

    /**
     * (MODIFICADO) Intercepta a busca por poste no menu principal.
     * (NOVO) Se 'CTRL' + 'Enter' for pressionado, ignora o script
     * e permite a busca padrão do site.
     * (REMOVIDO) Toda a lógica de pré-carregamento de acessórios foi removida.
     */
    function iniciarListenerDePesquisaRapida() {
        document.body.addEventListener('keydown', async function(e) {

            // 1. Verifica se o 'Enter' foi pressionado
            if (e.key !== 'Enter') {
                return;
            }

            // --- (INÍCIO DA NOVA LÓGICA DE BYPASS) ---
            // 2. Verifica se a tecla 'CTRL' está pressionada
            if (e.ctrlKey) {
                console.log('[HUD Script - Pesquisa Rápida] CTRL pressionado. Ignorando script e permitindo busca padrão do site.');
                // Não faz e.preventDefault(), apenas retorna
                // para que o listener padrão do site seja executado.
                return;
            }
            // --- (FIM DA NOVA LÓGICA DE BYPASS) ---

            const searchInput = e.target;

            // 3. Verifica se o alvo é o input de pesquisa correto
            if (!searchInput || !searchInput.matches('input[name="pesquisar"]')) {
                return;
            }

            // 4. (Fallback)
            if (searchInput.dataset.isHudFallback) {
                delete searchInput.dataset.isHudFallback;
                return;
            }

            // 5. Verifica se o valor da pesquisa parece um código de Poste.
            const searchText = searchInput.value.trim();
            const posteRegex = /^pt(\d+)$/i;
            const match = searchText.match(posteRegex);

            if (!match) {
                // Não é um poste, deixa a busca padrão do site ocorrer
                return;
            }

            // 6. É UM CÓDIGO DE POSTE! Interceptamos o evento.
            console.log('[HUD Script - Pesquisa Rápida] Poste detectado! Interceptando e iniciando busca...');
            e.preventDefault();
            e.stopPropagation();

            const posteCode = `PT${match[1]}`;
            const originalPlaceholder = searchInput.placeholder;
            searchInput.value = `Buscando ${posteCode}...`;
            searchInput.disabled = true;

            try {
                // 7. Monta o payload e faz a requisição principal
                const body = new URLSearchParams();
                body.append('idRazaoSocial', '46');
                body.append('json[]', posteCode);
                body.append('viabilidade', 'cabos,ficha_equipamento,ficha_terminal');

                const response = await fazerRequisicaoDaPagina(
                    "http://172.16.6.57/geogrid/aconcagua/php/arquivosComuns/carregaCompletar.php",
                    body.toString(),
                    `Busca Rápida Poste ${posteCode}`
                );

                const data = JSON.parse(response.response);
                const loc = (Array.isArray(data) && data.length > 0) ? data[0] : null;

                if (loc && loc.lat && loc.lng) {
                    // 8. SUCESSO! (Lógica de UI)
                    console.log(`[HUD Script - Pesquisa Rápida] Sucesso! Coords: ${loc.lat}, ${loc.lng}`);
                    const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
                    const map = gw.__googleMapInstancia__;

                    if (map && gw.google && gw.google.maps) {
                        const newCoords = { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
                        map.setCenter(newCoords);
                        map.setZoom(19);

                        if (gw.__hudSearchCircle__) {
                            gw.__hudSearchCircle__.setMap(null);
                            gw.__hudSearchCircle__ = null;
                        }

                        gw.__hudSearchCircle__ = new gw.google.maps.Circle({
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: '#FF0000',
                            fillOpacity: 0.35,
                            map: map,
                            center: newCoords,
                            radius: 20
                        });

                        searchInput.value = posteCode;
                    } else {
                        console.error('[HUD Script - Pesquisa Rápida] Instância do mapa ou API Google não encontrada!');
                        searchInput.value = 'Mapa não achado!';
                    }

                    // --- (LÓGICA DE PRÉ-CARREGAMENTO FOI REMOVIDA DAQUI) ---

                } else {
                    // 9. FALHA (API retornou sem dados) -> Aciona o Fallback
                    console.warn('[HUD Script - Pesquisa Rápida] Poste não encontrado via API. Acionando busca padrão do site...');
                    triggerFallbackSearch(searchText, searchInput);
                }
            } catch (err) {
                // 10. FALHA (Erro de rede/JSON) -> Aciona o Fallback
                console.error('[HUD Script - Pesquisa Rápida] Erro na requisição. Acionando busca padrão do site...', err);
                triggerFallbackSearch(searchText, searchInput);
            } finally {
                searchInput.disabled = false;
                searchInput.placeholder = originalPlaceholder;
            }

            function triggerFallbackSearch(searchText, searchInput) {
                searchInput.value = searchText;
                searchInput.dataset.isHudFallback = 'true';
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter', code: 'Enter', bubbles: true
                });
                searchInput.dispatchEvent(enterEvent);
            }

        }, true);
    }

    /**
     * (MODIFICADO) Intercepta o clique no botão "Adicionar Equipamento"
     * (FINAL) Adiciona a lógica de validação e criação da "Ponte".
     * (FINAL) Adiciona verificação de duplicatas e sufixo automático (A, B, C, D).
     * (FINAL) Corrige 'extensao' para 'expansao'.
     * (FINAL) Adiciona verificação de status/mensagem no 'salvaEquipamentos'.
     */
    function iniciarListenerAdicionarEquipamento() {
        document.body.addEventListener('click', function(e) {

            // Etapa de Fallback para "Tela Padrão"
            if (state.cadastroEquipamentoFallback) {
                console.log('[HUD Script] Flag de fallback detectada. Deixando clique original passar.');
                state.cadastroEquipamentoFallback = false;
                return;
            }

            // 1. Procura pelo botão alvo
            const addButton = e.target.closest('.adicionar-equipamento-recipiente');

            if (!addButton) { return; }

            // 2. INTERCEPTAÇÃO
            console.log('[HUD Script] Botão "Adicionar Equipamento" interceptado!');
            e.preventDefault();
            e.stopPropagation();

            // 3. Verifica se o painel já está aberto
            if (state.cadastroEquipamentoAtivo) {
                console.log('[HUD Script] Painel de cadastro já está ativo.');
                return;
            }
            state.cadastroEquipamentoAtivo = true;

            // 4. Cria o elemento de conteúdo para o nosso novo painel
            const content = document.createElement("div");
            content.className = "hud-cadastro-content";

            // 4.1. Cria o 'corpo' do painel
            const body = document.createElement("div");
            body.className = "hud-cadastro-body";
            body.innerHTML = `
                <div class="hud-cadastro-header">Geral</div>
                <div class="hud-btn-group">
                    <div class="hud-input-group">
                        <label for="hud-cadastro-rede">Rede:</label>
                        <input type="text" id="hud-cadastro-rede" name="rede" class="hud-cadastro-input" autocomplete="off">
                    </div>
                    <button class="hud-toggle-btn" data-value="ponte">Ponte</button>
                    <button class="hud-toggle-btn" data-value="rede_1x2">1x2 Rede</button>
                </div>

                <div class="hud-cadastro-header">Splinter 1x2</div>
                <div class="hud-btn-group">
                    <button class="hud-toggle-btn" data-value="1x2_5/95">5/95</button>
                    <button class="hud-toggle-btn" data-value="1x2_10/90">10/90</button>
                    <button class="hud-toggle-btn" data-value="1x2_15/85">15/85</button>
                    <button class="hud-toggle-btn" data-value="1x2_20/80">20/80</button>
                    <button class="hud-toggle-btn" data-value="1x2_30/70">30/70</button>
                    <button class="hud-toggle-btn" data-value="1x2_50/50">50/50</button>
                </div>

                <div class="hud-cadastro-header">Splinter 1x8</div>
                <div class="hud-btn-group">
                    <button class="hud-toggle-btn" data-value="1x8_cliente">Cliente</button>
                    <button class="hud-toggle-btn" data-value="1x8_expansao">Expansão</button>
                </div>
            `;

            // 4.2. Cria o 'rodapé' do painel
            const footer = document.createElement("div");
            footer.className = "hud-cadastro-footer";
            footer.innerHTML = `
                <button class="hud-footer-btn" id="hud-cadastro-padrao">Tela Padrão</button>
                <button class="hud-footer-btn danger" id="hud-cadastro-cancelar">Cancelar</button>
                <button class="hud-footer-btn primary" id="hud-cadastro-confirmar">Confirmar</button>
            `;

            // 4.3. Monta o painel
            content.appendChild(body);
            content.appendChild(footer);

            // 5. Define as dimensões e a posição inicial
            const width = 840;
            const height = 530;
            const position = {
                width: `${width}px`,
                height: `${height}px`,
                top: (window.innerHeight - height) / 2,
                left: (window.innerWidth - width) / 2
            };

            // 6. Cria o painel
            const newPanel = createDraggablePanel(
                'hudAdicionarEquipamento',
                'Cadastro Rápido de Equipamento',
                content,
                position
            );

            // 7. Adiciona a lógica de toggle aos botões
            newPanel.querySelectorAll('.hud-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.classList.toggle('active');
                });
            });

            // --- LÓGICA DE AUTOCOMPLETE ---
            const redeInputGroup = newPanel.querySelector('.hud-input-group');
            const redeInput = newPanel.querySelector('#hud-cadastro-rede');
            const suggestionsBox = document.createElement('div');
            suggestionsBox.className = 'hud-autocomplete-suggestions';
            redeInputGroup.appendChild(suggestionsBox);

            const handleRedeSearch = () => {
                const searchTerm = redeInput.value.trim();
                redeInput.dataset.redeId = ''; // Limpa o ID

                if (searchTerm.length < 3) {
                    suggestionsBox.style.display = 'none';
                    return;
                }

                suggestionsBox.innerHTML = '<div class="hud-suggestion-item loading">Buscando redes...</div>';
                suggestionsBox.style.display = 'block';

                GM_xmlhttpRequest({
                    method: "GET",
                    url: `https://api.jupiter.com.br/view/Redes/retornarRedesFibra?rede=${encodeURIComponent(searchTerm)}`,
                    onload: function(response) {
                        try {
                            const data = JSON.parse(response.responseText);
                            if (data.success === "1" && data.redes && data.redes.length > 0) {
                                suggestionsBox.innerHTML = '';

                                data.redes.forEach(rede => {
                                    const itemDiv = document.createElement('div');
                                    itemDiv.className = 'hud-suggestion-item';
                                    const formattedText = `${rede.id} - ${rede.descricao}`;
                                    itemDiv.textContent = formattedText;

                                    itemDiv.addEventListener('click', () => {
                                        redeInput.value = formattedText;
                                        redeInput.dataset.redeId = rede.id;
                                        suggestionsBox.style.display = 'none';
                                    });
                                    suggestionsBox.appendChild(itemDiv);
                                });

                            } else {
                                suggestionsBox.innerHTML = '<div class="hud-suggestion-item loading">Nenhuma rede encontrada.</div>';
                            }
                        } catch (e) {
                            console.error("[HUD Script] Erro ao parsear JSON da API de Redes:", e);
                            suggestionsBox.innerHTML = '<div class="hud-suggestion-item loading">Erro ao carregar redes.</div>';
                        }
                    },
                    onerror: function(error) {
                        console.error("[HUD Script] Erro de rede na API de Redes:", error);
                        suggestionsBox.innerHTML = '<div class="hud-suggestion-item loading">Erro de rede.</div>';
                    }
                });
            };
            const debouncedRedeSearch = debounce(handleRedeSearch, 300);
            redeInput.addEventListener('keyup', debouncedRedeSearch);
            newPanel.addEventListener('click', (e) => {
                if (!redeInputGroup.contains(e.target)) {
                    suggestionsBox.style.display = 'none';
                }
            });
            // --- FIM DO AUTOCOMPLETE ---

            // 8. Adiciona lógica ao botão 'Cancelar'
            newPanel.querySelector('#hud-cadastro-cancelar').addEventListener('click', () => {
                newPanel.remove();
                state.cadastroEquipamentoAtivo = false;
            });

            // 9. Adiciona lógica ao botão 'Tela Padrão' (Fallback)
            newPanel.querySelector('#hud-cadastro-padrao').addEventListener('click', () => {
                console.log('[HUD Script] "Tela Padrão" clicado. Acionando fallback.');
                state.cadastroEquipamentoFallback = true;
                newPanel.remove();
                state.cadastroEquipamentoAtivo = false;
                addButton.click();
            });

            // --- (INÍCIO DA LÓGICA DO 'CONFIRMAR' REFATORADA) ---

            // (NOVA FUNÇÃO HELPER) Encontra o próximo sufixo (ex: " - B")
            function findNextSigla(baseSigla, keywords, existingList) {
                const normalizedKeywords = keywords.map(k => k.toLowerCase());

                // 1. Filtra a lista principal para encontrar APENAS equipamentos do mesmo tipo
                const matchingEquipments = existingList.filter(eq => {
                    const normalizedSigla = eq.sigla.toLowerCase();
                    // Verifica se a sigla contém QUALQUER uma das keywords
                    // ex: keywords ['cliente', 'cl.']
                    return normalizedKeywords.some(keyword => normalizedSigla.includes(keyword));
                });

                const suffixes = ["", " - A", " - B", " - C", " - D"];
                const usedSuffixes = new Set();

                // 2. Verifica quais sufixos já estão em uso
                for (const eq of matchingEquipments) {
                    const normalizedSigla = eq.sigla.toUpperCase();
                    // Itera de trás para frente (de " - D" para " - A")
                    for (let i = suffixes.length - 1; i > 0; i--) {
                        const suffix = suffixes[i].toUpperCase();
                        if (normalizedSigla.endsWith(suffix)) {
                            usedSuffixes.add(suffix);
                            break; // Encontrou o sufixo, vai para o próximo equipamento
                        }
                    }
                }

                // 3. Encontra o primeiro sufixo vago
                // Começa verificando a base (sem sufixo)
                const baseSiglaExists = matchingEquipments.some(eq =>
                    !eq.sigla.toUpperCase().includes(" - A") &&
                    !eq.sigla.toUpperCase().includes(" - B") &&
                    !eq.sigla.toUpperCase().includes(" - C") &&
                    !eq.sigla.toUpperCase().includes(" - D")
                );

                if (!baseSiglaExists) {
                    return baseSigla; // Slot base ("") está vago
                }

                // Se a base está ocupada, procura por A, B, C, D
                for (let i = 1; i < suffixes.length; i++) {
                    const suffix = suffixes[i].toUpperCase();
                    if (!usedSuffixes.has(suffix)) {
                        return baseSigla + suffixes[i]; // ex: "spl cl. 0000 - A"
                    }
                }

                return null; // Limite (A, B, C, D) atingido
            }



            // 10. (REFATORADO) Lógica do botão 'Confirmar'
            newPanel.querySelector('#hud-cadastro-confirmar').addEventListener('click', async () => {
                const btnConfirmar = newPanel.querySelector('#hud-cadastro-confirmar');
                const btnCancelar = newPanel.querySelector('#hud-cadastro-cancelar');
                const btnPadrao = newPanel.querySelector('#hud-cadastro-padrao');

                const botoesAtivosNodeList = newPanel.querySelectorAll('.hud-toggle-btn.active');
                const botoesAtivos = Array.from(botoesAtivosNodeList);

                const nomeRedeInput = newPanel.querySelector('#hud-cadastro-rede');
                const nome_rede_valor = nomeRedeInput.value.trim();
                const rede_id_valor = nomeRedeInput.dataset.redeId || '';

                const siglasEquipamentosCriados = []; // Para splitters
                let siglaPonteCriada = null; // Para a ponte

                // --- Verificações Iniciais ---
                if (botoesAtivos.length === 0) {
                    showHudToast('Nenhum equipamento selecionado.');
                    return;
                }
                if (!ultimoCodigoEquipamentoPai) {
                    showHudToast('Erro: Código do equipamento pai (ex: TA...) não foi capturado.');
                    return;
                }
                if (!ultimoCodigoPoste) {
                    showHudToast('Erro: Código numérico do poste (ex: 55325) não foi capturado.');
                    return;
                }

                // --- Validação de Rede Robusta ---
                const tiposSelecionados = botoesAtivos.map(btn => btn.dataset.value);
                const isCriandoSplCliente = tiposSelecionados.includes('1x8_cliente');
                const isCriandoExpansao = tiposSelecionados.includes('1x8_expansao'); // Corrigido
                const isCriandoRede1x2 = tiposSelecionados.includes('rede_1x2');

                if (isCriandoSplCliente && !rede_id_valor) {
                    showHudToast('Para "Cliente", você DEVE pesquisar e selecionar uma rede da lista.');
                    return;
                }
                if ((isCriandoExpansao || isCriandoRede1x2) && !nome_rede_valor) {
                    showHudToast('O campo "Rede" é obrigatório para Expansão ou 1x2 Rede.');
                    return;
                }

                // Bloqueia botões
                btnConfirmar.disabled = true;
                btnCancelar.disabled = true;
                btnPadrao.disabled = true;

                try {
                    // --- ETAPA 1: VERIFICAR EQUIPAMENTOS EXISTENTES ---
                    btnConfirmar.textContent = '1/5 Verificando...';
                    console.log(`[HUD Script] Iniciando Etapa 1: Verificando equipamentos existentes...`);

                    const payloadVerificar = new URLSearchParams();
                    payloadVerificar.append('controlador', 'diagrama');
                    payloadVerificar.append('metodo', 'carregarCabosEquipamentos');
                    payloadVerificar.append('codigo', ultimoCodigoEquipamentoPai);
                    payloadVerificar.append('idRazaoSocial', '46');

                    const resultadoVerificar = await fazerRequisicaoDaPagina(
                        "http://172.16.6.57/geogrid/aconcagua/php/diagramaJson/api.php",
                        payloadVerificar.toString(),
                        "Verificar Equipamentos"
                    );

                    const dataVerificar = JSON.parse(resultadoVerificar.response);
                    const existingEquipments = dataVerificar.equipamentos || [];
                    const existingCabos = dataVerificar.cabosJson || [];

                    console.log(`[HUD Script] Verificação concluída. Encontrados ${existingEquipments.length} equipamentos e ${existingCabos.length} cabos.`);

                    // --- ETAPA 2: CONSTRUIR PAYLOADS E VALIDAR ---
                    btnConfirmar.textContent = '2/5 Preparando...';
                    const payloadsParaSalvar = [];
                    const isCriandoPonte = tiposSelecionados.includes('ponte');

                    // --- 2A. Lógica da Ponte ---
                    if (isCriandoPonte) {
                        console.log(`[HUD Script] Validando Ponte...`);

                        const ponteExistente = existingCabos.some(c => c.sigla && c.sigla.toLowerCase().includes('ponte'));
                        if (ponteExistente) {
                            showHudToast("Já existe uma ponte neste poste. Crie da forma antiga.");
                            throw new Error("Já existe uma ponte.");
                        }

                        const payloadValidacao = new URLSearchParams();
                        payloadValidacao.append('idRazaoSocial', '46');
                        payloadValidacao.append('poste', `PT${ultimoCodigoPoste}`);

                        const resultadoValidacao = await fazerRequisicaoDaPagina(
                            "http://172.16.6.57/geogrid/aconcagua/php/acessorios/carregaAcessoriosPoste.php",
                            payloadValidacao.toString(), "Validação da Ponte"
                        );
                        const dataValidacao = JSON.parse(resultadoValidacao.response);
                        const dados = dataValidacao.dados;

                        const pontaA_CE = dados?.find(d => d.cd.startsWith('CE'));
                        const pontaB_TA = dados?.find(d => d.cd.startsWith('TA'));

                        if (dados?.length !== 2 || !pontaA_CE || !pontaB_TA) {
                            showHudToast('Caixa incompatível pra criação da Ponte, crie da forma antiga');
                            throw new Error("Validação da Ponte falhou.");
                        }

                        const siglaPonte = `ponte ${ultimoCodigoPoste}`;
                        const payloadCriacaoPonte = new URLSearchParams();
                        payloadCriacaoPonte.append('codigo', siglaPonte);
                        payloadCriacaoPonte.append('dataDeInstalacao', getTodayDate());
                        payloadCriacaoPonte.append('tipo_cabo', '12 Fibras AS 120');
                        payloadCriacaoPonte.append('ponta_a', '0');
                        payloadCriacaoPonte.append('ponta_b', '1');
                        payloadCriacaoPonte.append('obs', '');
                        payloadCriacaoPonte.append('idRazaoSocial', '46');
                        payloadCriacaoPonte.append('codigoEmpresa', 'JPT');
                        payloadCriacaoPonte.append('poste', `PT${ultimoCodigoPoste}`);
                        payloadCriacaoPonte.append('sigla', siglaPonte);
                        payloadCriacaoPonte.append('pontaA', pontaA_CE.cd);
                        payloadCriacaoPonte.append('pontaB', pontaB_TA.cd);

                        payloadsParaSalvar.push({
                            url: "http://172.16.6.57/geogrid/aconcagua/php/cabos/cadastraCaboLigacao.php",
                            payload: payloadCriacaoPonte.toString(),
                            sigla: siglaPonte,
                            isPonte: true
                        });
                        siglaPonteCriada = siglaPonte;
                    }

                    // --- 2B. Lógica dos Splitters ---
                    const otherEquipments = botoesAtivos.filter(btn => btn.dataset.value !== 'ponte');

                    for (const btn of otherEquipments) {
                        const tipo = btn.dataset.value;
                        const textoBotao = btn.textContent.trim();

                        let id_equipamento = '157';
                        let baseSigla = '';
                        let extensao = 'true';
                        let payload_rede_id = '';
                        let payload_nome_rede = '';
                        let keywords = [];

                        if (tipo.startsWith('1x8_')) {
                            id_equipamento = '159';
                            if (tipo === '1x8_cliente') {
                                baseSigla = `spl cl. ${ultimoCodigoPoste}`;
                                extensao = 'false';
                                payload_rede_id = rede_id_valor;
                                payload_nome_rede = nome_rede_valor;
                                keywords = ['cliente', 'cl.'];
                            } else { // 1x8_expansao (corrigido)
                                baseSigla = `spl exp. ${nome_rede_valor.toUpperCase()}`;
                                keywords = ['expansão', 'expansao', 'exp.'];
                            }
                        } else if (tipo.startsWith('1x2_')) {
                            id_equipamento = '157';
                            baseSigla = `spl ${textoBotao} ${ultimoCodigoPoste}`;
                            keywords = [textoBotao]; // ex: "10/90"
                        } else if (tipo === 'rede_1x2') {
                            id_equipamento = '157';
                            baseSigla = `1/2 ${nome_rede_valor.toUpperCase()}`;
                            keywords = ['1/2'];
                        }

                        // Encontra o próximo sufixo vago
                        const siglaFinal = findNextSigla(baseSigla, keywords, existingEquipments);

                        if (!siglaFinal) {
                            showHudToast(`Limite de 5 (A-D) atingido para ${baseSigla}`);
                            throw new Error("Limite de equipamento atingido.");
                        }

                        const payload = new URLSearchParams();
                        payload.append('codigo', ultimoCodigoEquipamentoPai);
                        payload.append('idRazaoSocial', '46');
                        payload.append('ip', '');
                        payload.append('obs', '');
                        payload.append('razaoSocial', 'Jupiter Telecomunicações');
                        payload.append('nomeUsuario', 'jhonvictor');
                        payload.append('codigoEmpresa', 'JPT');
                        payload.append('projeto', 'false');
                        payload.append('id_equipamento', id_equipamento);
                        payload.append('extensao', extensao);
                        payload.append('rede', payload_rede_id);
                        payload.append('nome_rede', payload_nome_rede);
                        payload.append('sigla', siglaFinal); // Usa a sigla final com sufixo

                        payloadsParaSalvar.push({
                            url: "http://172.16.6.57/geogrid/aconcagua/php/diagramaJson/salvaEquipamentos.php",
                            payload: payload.toString(),
                            sigla: siglaFinal,
                            isPonte: false
                        });
                        siglasEquipamentosCriados.push(siglaFinal);
                    }

                    // --- ETAPA 3: Loop SEQUENCIAL para salvar ---
                    btnConfirmar.textContent = '3/5 Salvando...';
                    console.log(`[HUD Script] Iniciando Etapa 3: Salvar ${payloadsParaSalvar.length} itens...`);

                    for (const item of payloadsParaSalvar) {
                        console.log(`[HUD Script] Salvando item: ${item.sigla}...`);
                        await fazerRequisicaoDaPagina(item.url, item.payload, item.sigla);
                        console.log(`[HUD Script] Sucesso: ${item.sigla}`);
                    }
                    console.log('[HUD Script] Etapa 3 (Salvar) concluída com sucesso.');

                    // --- ETAPA 4: Recarrega o diagrama (CHAMADA ÚNICA) ---
                    btnConfirmar.textContent = '4/5 Recarregando...';

                    const payloadRecarregar = new URLSearchParams();
                    payloadRecarregar.append('controlador', 'diagrama');
                    payloadRecarregar.append('metodo', 'carregarCabosEquipamentos');
                    payloadRecarregar.append('codigo', ultimoCodigoEquipamentoPai);
                    payloadRecarregar.append('idRazaoSocial', '46');

                    const resultadoRecarga = await fazerRequisicaoDaPagina(
                        "http://172.16.6.57/geogrid/aconcagua/php/diagramaJson/api.php",
                        payloadRecarregar.toString(),
                        "carregarCabosEquipamentos"
                    );

                    const dataRecarga = JSON.parse(resultadoRecarga.response);
                    if (!dataRecarga) {
                        throw new Error('Falha na Etapa 4: Resposta de carregarCabosEquipamentos inválida.');
                    }

                    // --- ETAPA 5: Chama as recargas FINAIS (em paralelo) ---
                    btnConfirmar.textContent = '5/5 Carregando portas...';

                    // Encontra os itens recém-criados
                    const equipamentosRecemCriados = dataRecarga.equipamentos?.filter(eq => siglasEquipamentosCriados.includes(eq.sigla)) || [];
                    const cabosRecemCriados = dataRecarga.cabosJson?.filter(cabo => cabo.sigla === siglaPonteCriada) || [];

                    console.log(`[HUD Script] Etapa 4 concluída. ${equipamentosRecemCriados.length} equipamentos e ${cabosRecemCriados.length} pontes identificados.`);

                    const promessasDeCargaFinal = [];
                    const ponta = ultimoCodigoEquipamentoPai.startsWith('TA') ? 'B' : 'A';
                    const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);

                    // Loop 1: Carrega os SPLITTERS
                    for (const eq of equipamentosRecemCriados) {
                        const novoCodigoEquipamento = eq.codigo; // ex: JPT_DIV75964

                        const payloadApi = new URLSearchParams();
                        payloadApi.append('controlador', 'fichaEquipamento');
                        payloadApi.append('metodo', 'carregarEquipamento');
                        payloadApi.append('codigo', novoCodigoEquipamento);
                        payloadApi.append('idRazaoSocial', '46');
                        promessasDeCargaFinal.push(fazerRequisicaoDaPagina(
                            "http://172.16.6.57/geogrid/aconcagua/php/diagramaJson/api.php",
                            payloadApi.toString(), `carregarEquipamento ${novoCodigoEquipamento}`
                        ));

                        const payloadPortas = new URLSearchParams();
                        payloadPortas.append('idRazaoSocial', '46');
                        payloadPortas.append('codigo', novoCodigoEquipamento);
                        payloadPortas.append('codigoPosteRecipiente', ultimoCodigoEquipamentoPai);
                        promessasDeCargaFinal.push(fazerRequisicaoDaPagina(
                            "http://172.16.6.57/geogrid/aconcagua/php/diagramaJson/carregarPortas.php",
                            payloadPortas.toString(), `carregarPortas ${novoCodigoEquipamento}`
                        ));
                    }

                    // Loop 2: Carrega a PONTE
                    for (const cabo of cabosRecemCriados) {
                        const novoCodigoCabo = cabo.codigo; // ex: JPT54321

                        const payloadApiCabo = new URLSearchParams();
                        payloadApiCabo.append('controlador', 'cabos');
                        payloadApiCabo.append('metodo', 'carregarCabo');
                        payloadApiCabo.append('codigo', novoCodigoCabo);
                        payloadApiCabo.append('idRazaoSocial', '46');
                        payloadApiCabo.append('codigoPosteRecipiente', ultimoCodigoEquipamentoPai);
                        payloadApiCabo.append('ponta', ponta);
                        payloadApiCabo.append('caboDeLigacao', 'true');
                        promessasDeCargaFinal.push(fazerRequisicaoDaPagina(
                            "http://172.16.6.57/geogrid/aconcagua/php/diagramaJson/api.php",
                            payloadApiCabo.toString(), `carregarCabo ${novoCodigoCabo}`
                        ));

                        const payloadFibras = new URLSearchParams();
                        payloadFibras.append('idRazaoSocial', '46');
                        payloadFibras.append('codigoCabo', novoCodigoCabo);
                        payloadFibras.append('codigoPosteRecipiente', ultimoCodigoEquipamentoPai);
                        payloadFibras.append('ponta', ponta);
                        payloadFibras.append('caboDeLigacao', 'true');
                        promessasDeCargaFinal.push(fazerRequisicaoDaPagina(
                            "http://172.16.6.57/geogrid/aconcagua/php/diagramaJson/carregarFibras.php",
                            payloadFibras.toString(), `carregarFibras ${novoCodigoCabo}`
                        ));
                    }

                    await Promise.all(promessasDeCargaFinal);
                    console.log('[HUD Script] Etapa 5 (carregarEquipamento/carregarPortas/Fibras) concluídas.');

                    // --- ETAPA 6: Recarrega a UI (AbreDiagrama) e clica ---
                    btnConfirmar.textContent = 'Recarregando UI...';

                    if (gw && typeof gw.abreDiagrama === 'function') {
                        console.log(`[HUD Script] Chamando a função de recarregamento global: gw.abreDiagrama(${ultimoCodigoEquipamentoPai}, '46')`);
                        await gw.abreDiagrama(ultimoCodigoEquipamentoPai, '46');
                        console.log('[HUD Script] Recarregamento pela função "abreDiagrama" concluído.');

                        btnConfirmar.textContent = 'Finalizando...';
                        const delayMs = 500;
                        console.log(`[HUD Script] Aguardando ${delayMs}ms para a UI renderizar...`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));

                        console.log('[HUD Script] Procurando e clicando no botão ".button.botao-inserir-todos" via jQuery');
                        const botaoInserirTodos = gw.jQuery('.button.botao-inserir-todos');

                        if (botaoInserirTodos.length > 0) {
                            if (!botaoInserirTodos.is(':disabled')) {
                                botaoInserirTodos.click();
                                console.log('[HUD Script] Botão "Inserir Todos" clicado com sucesso (via jQuery).');
                            } else {
                                console.warn('[HUD Script] Botão "Inserir Todos" encontrado, mas estava DESABILITADO. O clique foi pulado.');
                            }
                        } else {
                            console.warn('[HUD Script] Botão ".button.botao-inserir-todos" NÃO foi encontrado pelo jQuery. A etapa foi pulada.');
                        }

                        // Fecha o painel
                        newPanel.remove();
                        state.cadastroEquipamentoAtivo = false;

                    } else {
                        throw new Error("Função de recarregamento (abreDiagrama) não encontrada na página (window.abreDiagrama). A UI não será atualizada. Por favor, feche e abra o poste.");
                    }

                } catch (e) {
                    console.error('[HUD Script] Erro na cadeia de confirmação:', e.message || e);
                    showHudToast(`Ocorreu um erro: ${e.message || e}`);

                    btnConfirmar.disabled = false;
                    btnCancelar.disabled = false;
                    btnPadrao.disabled = false;
                    btnConfirmar.textContent = 'Confirmar';
                }
            });

        }, true); // Usa a fase de captura
    }

    // --- (INÍCIO) MÓDULO DE INJEÇÃO V2 (vincularCliente) ---
/**
 * Inicia o "rapto" (monkey-patch) das funções do diagrama
 * para injetar dados de cliente diretamente no SVG. (V2 - Interativo Corrigido)
 */
function iniciarInjecaoDiagramaV2() {
    console.log("[HUD Script] Módulo de Injeção V2 (Interativo) iniciado.");
    const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);

    // Helper para normalizar nomes de rede (copiado da lógica da HUD)
    const normalizarRede = nome => nome ? nome.replace(/^\d+\s*-\s*/, "").trim().toLowerCase() : "";

    const interval = setInterval(() => {
        // Espera que o protótipo da FIBRA esteja carregado
        if (gw.geogrid &&
            gw.geogrid.modulo &&
            gw.geogrid.modulo.diagrama &&
            gw.geogrid.modulo.diagrama.objetos &&
            gw.geogrid.modulo.diagrama.objetos.fibra &&
            gw.geogrid.modulo.diagrama.objetos.fibra.prototype.vincularCliente &&
            gw.geogrid.modulo.diagrama.objetos.fibra.prototype.removerCliente) {

            clearInterval(interval);
            console.log("[HUD Script] Protótipo 'fibra.prototype' detectado. Aplicando patches V11 (Correção de Remoção)...");

            try {
                // Aplica o patch na função de VINCULAR
                patchVincularCliente_V11(gw, normalizarRede);
                // Aplica o patch na função de REMOVER
                patchRemoverCliente_V4(gw);
                console.log("[HUD Script] Patches V11 (vincular/remover) aplicados com sucesso!");
            } catch (e) {
                console.error("[HUD Script] Falha grave ao aplicar patch V11:", e);
            }
        }
    }, 500); // Verifica a cada 500ms
}

/**
 * Patch 1: Modifica 'vincularCliente' para DESENHAR os nossos dados. (V11 - Salva Referência)
 */
function patchVincularCliente_V11(gw, normalizarRede) {
    // 1. Acesso às variáveis da PÁGINA
    const $ = gw.$;

    // 2. Guarda a função original
    const originalVincularCliente = gw.geogrid.modulo.diagrama.objetos.fibra.prototype.vincularCliente;

    // 3. Substitui a função
    gw.geogrid.modulo.diagrama.objetos.fibra.prototype.vincularCliente = async function(idCliente) {
        // 'this' é a 'fibra'

        // --- CÓDIGO ORIGINAL (REIMPLEMENTADO) ---
        let dadosCliente;
        try {
            dadosCliente = await $.ajax({
                type: 'post',
                url: 'php/diagramaJson/consultarCliente.php',
                dataType: 'json',
                data: {
                    idRazaoSocial: '46', // ID Fixo
                    idCliente: idCliente
                }
            });
        } catch (e) {
            console.error("[HUD Patch V11] Falha ao chamar consultarCliente.php:", e);
            return originalVincularCliente.apply(this, arguments);
        }

        let corCliente = '';
        if (dadosCliente.registro.nome.includes('desconhecido'))
            corCliente = '#a5a5a5';
        else if (dadosCliente.registro.nome.includes('ATIVO'))
            corCliente = '#72f542';
        else if (dadosCliente.registro.nome.includes('SUSPENSO'))
            corCliente = '#FFCC00';
        else
            corCliente = '#f54242';

        this.flags.cliente = true;
        this.cliente = this.container.svg.append(function(){
            return $(`
            <svg>
                <g style="fill:${corCliente};stroke:black;stroke-width:0.3;cursor:pointer;">
                    <circle cx="5.54235" cy="2.28534" r="2.28534"/>
                    <path d="M9.15385,24.81109c0-3.061,0-5.54235,5.54235-5.54235s5.54235,2.48139,5.54235,5.54235" transform="translate(-9.15385 -14.88462)"/>
                </g>
            </svg>`).children()[0];
        });
        const clientIcon = this.cliente; // Guarda a referência ao "boneco"

        this.cliente
            .on('mouseenter', () => {
                this.objeto.diagrama.template.trigger('focouCliente', [this, gw.d3.mouse(gw.d3.select('body').node()), idCliente]);
            })
            .on('mouseleave', () => {
                this.objeto.diagrama.template.trigger('desfocouCliente', [this]);
            });

        this.reposicionar();
        // --- FIM DO CÓDIGO ORIGINAL ---


        // --- (INÍCIO DA MODIFICAÇÃO - V11 INTERATIVO) ---
        try {
            if (dadosCliente && this.cliente) {

                // 1. EXTRAI OS DADOS
                const contrato = (dadosCliente.registro.nome.split(" - ")[1] || "N/A").trim();
                const rede = (dadosCliente.rede?.rede || "").replace(/Card \d+ Porta \d+$/i, "").trim();

                // 2. LÓGICA DE LIMITE DE 35 CHARS (V9)
                const MAX_TOTAL_LENGTH = 35;
                const separador = " - ";
                let espacoParaRede = MAX_TOTAL_LENGTH - contrato.length - separador.length;
                if (espacoParaRede < 0) espacoParaRede = 0;
                let redeFinal = "";
                if (rede.length > 0 && espacoParaRede > 0) {
                    if (rede.length > espacoParaRede) {
                        if (espacoParaRede > 3) {
                            redeFinal = rede.substring(0, espacoParaRede - 3) + "...";
                        } else {
                            redeFinal = "";
                        }
                    } else {
                        redeFinal = rede;
                    }
                }

                // 3. PREPARA O SVG
                const parentGroup = clientIcon.node().parentNode; // O <g> que contém o "boneco"
                const svgNS = "http://www.w3.org/2000/svg";
                const transform = clientIcon.attr('transform');
                const match = /translate\(([^,]+),([^)]+)\)/.exec(transform);
                const iconX = parseFloat(match[1]);
                const iconY = parseFloat(match[2]);

                // 4. LÓGICA DE POSIÇÃO E ORDEM (V8)
                const lado = this.objeto?.lado || 'e';
                let x, y, textAnchor, textoCompleto;
                if (lado === 'd') {
                    textoCompleto = contrato;
                    if (redeFinal) textoCompleto += ` - ${redeFinal}`;
                    x = iconX + 16;
                    y = iconY + 8;
                    textAnchor = "start";
                } else {
                    textoCompleto = contrato;
                    if (redeFinal) textoCompleto = `${redeFinal} - ${contrato}`;
                    x = iconX - 5;
                    y = iconY + 8;
                    textAnchor = "end";
                }

                // 5. CRIA O TEXTO
                const textElement = document.createElementNS(svgNS, "text");
                textElement.setAttribute("x", String(x));
                textElement.setAttribute("y", String(y));
                textElement.setAttribute("fill", "black");
                textElement.setAttribute("font-size", "10px");
                textElement.setAttribute("font-family", "Arial, sans-serif");
                textElement.setAttribute("text-anchor", textAnchor);
                textElement.setAttribute("style", "cursor: pointer; user-select: none;"); // Torna clicável
                textElement.textContent = textoCompleto;

                // 6. CRIA O FUNDO (RECT)
                parentGroup.appendChild(textElement); // Adiciona temporariamente para medir
                const bbox = textElement.getBBox(); // Mede o texto
                parentGroup.removeChild(textElement); // Remove

                const rectElement = document.createElementNS(svgNS, "rect");
                rectElement.setAttribute("x", String(bbox.x - 2)); // Padding horizontal
                rectElement.setAttribute("y", String(bbox.y - 1)); // Padding vertical
                rectElement.setAttribute("width", String(bbox.width + 4));
                rectElement.setAttribute("height", String(bbox.height + 2));
                rectElement.setAttribute("rx", "2"); // Cantos arredondados
                rectElement.setAttribute("style", "cursor: pointer;");

                // 7. LÓGICA DE REDE DIVERGENTE E CORES
                const equipId = this.objeto?.config?.id;
                // 'state' e 'equipamentosInfo' são lidos do escopo GLOBAL do UserScript
                const equipamentoInfo = (equipId && typeof equipamentosInfo !== 'undefined') ? equipamentosInfo[equipId] : null;
                const nomeRedeEquipamento = equipamentoInfo ? normalizarRede(equipamentoInfo.nomeRede) : '';
                const redeClienteNorm = normalizarRede(rede);
                const isDemanda = equipId === '__porDemanda__';

                let mesmaRede = true; // Padrão
                if (nomeRedeEquipamento && redeClienteNorm) {
                    mesmaRede = isDemanda ? true : redeClienteNorm.includes(nomeRedeEquipamento);
                }

                const destacar = (typeof state !== 'undefined' && state.destacarRedesDivergentes && !mesmaRede);
                const isLight = document.body.classList.contains('hud-light-mode');

                const highlightFill = isLight ? '#e1e4e8' : '#3a3f4b'; // Fundo do hover
                const divergentFill = isLight ? 'rgba(215, 58, 73, 0.2)' : 'rgba(224, 108, 117, 0.2)'; // Fundo vermelho
                const defaultFill = destacar ? divergentFill : 'transparent'; // Fundo padrão

                rectElement.setAttribute("fill", defaultFill);

                // 8. CRIA O GRUPO INTERATIVO
                const interactiveGroup = document.createElementNS(svgNS, "g");
                interactiveGroup.setAttribute("class", "hud-injected-group");
                interactiveGroup.appendChild(rectElement); // Fundo primeiro
                interactiveGroup.appendChild(textElement); // Texto na frente
                parentGroup.appendChild(interactiveGroup); // Adiciona o grupo ao SVG

                // *** INÍCIO DA CORREÇÃO (V11) ***
                // Salva uma referência direta do grupo na instância da fibra ('this')
                this.__hudInjectedGroup__ = interactiveGroup;
                // *** FIM DA CORREÇÃO ***

                // 9. ADICIONA OS EVENT LISTENERS
                interactiveGroup.dataset.isClicked = 'false';

                const setClickedState = (isClicked) => {
                    interactiveGroup.dataset.isClicked = String(isClicked);
                    if (isClicked) {
                        textElement.setAttribute("opacity", "0.5");
                        textElement.setAttribute("text-decoration", "line-through");
                        clientIcon.attr("opacity", "0.5"); // Tacha o "boneco"
                        rectElement.setAttribute("fill", defaultFill); // Volta ao fundo padrão
                    } else {
                        textElement.setAttribute("opacity", "1");
                        textElement.setAttribute("text-decoration", "none");
                        clientIcon.attr("opacity", "1"); // Restaura o "boneco"
                        rectElement.setAttribute("fill", highlightFill); // Mantém o highlight
                    }
                };

                interactiveGroup.addEventListener('mouseenter', () => {
                    if (interactiveGroup.dataset.isClicked === 'false') {
                        rectElement.setAttribute("fill", highlightFill);
                    }
                });

                interactiveGroup.addEventListener('mouseleave', () => {
                    if (interactiveGroup.dataset.isClicked === 'false') {
                        rectElement.setAttribute("fill", defaultFill);
                    }
                });

                interactiveGroup.addEventListener('click', () => {
                    const newState = interactiveGroup.dataset.isClicked === 'false';
                    setClickedState(newState);
                });

            }
        } catch (e) {
            console.error("[HUD Patch V11] Erro ao injetar dados no SVG:", e);
        }
        // --- (FIM) DA MODIFICAÇÃO ---
    };
}

/**
 * Patch 2: Modifica 'removerCliente' para LIMPAR os nossos dados. (V4 - Corrigido)
 */
function patchRemoverCliente_V4(gw) {
    // 1. Guarda a função original
    const originalRemoverCliente = gw.geogrid.modulo.diagrama.objetos.fibra.prototype.removerCliente;

    // 2. Substitui
    gw.geogrid.modulo.diagrama.objetos.fibra.prototype.removerCliente = function() {
        // 'this' é a 'fibra'

        // --- (INÍCIO) NOSSA LIMPEZA (V4 - CORRIGIDA) ---
        try {
            // 'this.__hudInjectedGroup__' foi salvo no 'patchVincularCliente_V11'
            if (this.__hudInjectedGroup__ && this.__hudInjectedGroup__.parentNode) {
                // Remove o grupo específico que salvamos
                this.__hudInjectedGroup__.parentNode.removeChild(this.__hudInjectedGroup__);
                this.__hudInjectedGroup__ = null; // Limpa a referência
            } else {
                // Se a referência não existir, loga um aviso, mas não faz nada
                // para evitar apagar o grupo errado.
                console.warn("[HUD Patch V4] Não foi possível encontrar '__hudInjectedGroup__' para remover.");
            }
        } catch(e) {
            console.error("[HUD Patch V4] Erro ao limpar grupo injetado:", e);
        }
        // --- (FIM) NOSSA LIMPEZA ---

        // 3. Chama a função original para remover o "bonequinho"
        return originalRemoverCliente.apply(this, arguments);
    };
}

/**
 * Patch 2: Modifica 'removerCliente' para LIMPAR os nossos dados. (V3 - Limpa Grupo)
 */
function patchRemoverCliente_V3(gw) {
    // 1. Guarda a função original
    const originalRemoverCliente = gw.geogrid.modulo.diagrama.objetos.fibra.prototype.removerCliente;

    // 2. Substitui
    gw.geogrid.modulo.diagrama.objetos.fibra.prototype.removerCliente = function() {
        // 'this' é a 'fibra'

        // --- (INÍCIO) NOSSA LIMPEZA ---
        try {
            if (this.cliente) {
                const parentGroup = this.cliente.node().parentNode;
                // Remove o nosso grupo interativo (que contém o texto e o fundo)
                const injectedGroup = parentGroup.querySelector('.hud-injected-group');
                if (injectedGroup) {
                    parentGroup.removeChild(injectedGroup);
                }
            }
        } catch(e) {
            console.error("[HUD Patch V3] Erro ao limpar grupo injetado:", e);
        }
        // --- (FIM) NOSSA LIMPEZA ---

        // 3. Chama a função original para remover o "bonequinho"
        return originalRemoverCliente.apply(this, arguments);
    };
}

/**
 * Patch 2: Modifica 'removerCliente' para LIMPAR os nossos dados.
 * (Baseado no código-fonte de geogrid.modulo.diagrama.objetos.fibra.js)
 */
function patchRemoverCliente(gw) {
    // 1. Guarda a função original
    const originalRemoverCliente = gw.geogrid.modulo.diagrama.objetos.fibra.prototype.removerCliente;

    // 2. Substitui
    gw.geogrid.modulo.diagrama.objetos.fibra.prototype.removerCliente = function() {
        // 'this' é a 'fibra'

        // --- (INÍCIO) NOSSA LIMPEZA ---
        try {
            // O 'this.cliente' é o ícone do "bonequinho" que está prestes
            // a ser removido pela função original.
            if (this.cliente) {
                const parentGroup = this.cliente.node().parentNode;
                // Removemos os nossos textos ANTES que o ícone seja removido.
                parentGroup.querySelectorAll('.hud-injected-text').forEach(el => el.remove());
            }
        } catch(e) {
            console.error("[HUD Patch V2] Erro ao limpar textos injetados:", e);
        }
        // --- (FIM) NOSSA LIMPEZA ---

        // 3. Chama a função original para remover o "bonequinho"
        return originalRemoverCliente.apply(this, arguments);
    };
}
// --- (FIM) MÓDULO DE INJEÇÃO V2 (vincularCliente) ---

// --- INICIAÇÃO (FINAL) ---

// (NOVO) Criamos uma função 'main' assíncrona para controlar a ordem de inicialização
    async function runMainScript() {

        // 1. Funções síncronas que podem rodar primeiro
        // (Estes não dependem do banco de dados)
        injetarEstilosGlobais();
        injetarScriptPagina();
        iniciarInterceptadorDoMapa();
        ativarAvisoDeSaida();

        // 2. (IMPORTANTE) Espera o DB estar pronto
        try {
            await iniciarCacheDB(); // <-- O 'await' pausa aqui até o DB estar pronto
            console.log("[HUD Script] Banco de dados pronto.");
        } catch (e) {
            console.error("[HUD Script] FALHA CRÍTICA ao iniciar DB. O cache não funcionará.", e);
            // Mesmo se falhar, o resto do script (HUD, etc.) pode continuar
        }

        // 3. Funções que dependem do DB ou devem rodar após o 'await'
        // (iniciarInterceptadorXHR agora pode usar 'cacheDB' com segurança)
        iniciarListenerDeBypassDeCarga(); // <-- ADICIONE ESTA LINHA
        iniciarListenerDeColarCoordenadas();
        iniciarInterceptadorXHR(); // <-- Agora só roda DEPOIS do DB
        iniciarListenerDeBuscaPoste();
        iniciarListenerDePesquisaRapida();
        iniciarListenerAdicionarEquipamento();
        iniciarInjecaoDiagramaV2();

        // 4. LISTENERS DA PONTE (Custom Events)
        document.addEventListener('hud:showProgress', (e) => {
            showHudToastProgress(e.detail.message);
        });

        document.addEventListener('hud:hideProgress', () => {
            hideHudToastProgress();
        });

        console.log("[HUD Script] Todos os listeners iniciados.");
    }

    // (NOVO) Chama a função main assíncrona para iniciar tudo
    runMainScript();

    })(); // Mantém o fechamento do IIFE original
