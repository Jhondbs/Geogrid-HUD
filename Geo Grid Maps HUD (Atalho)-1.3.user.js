// ==UserScript==
// @name         Geogrid Tools
// @namespace    http://tampermonkey.net/
// @version      1.12
// @description  Adiciona um HUD com informações de clientes e atalhos no Geo Grid, ativado pela tecla "+" do Numpad.
// @author       Jhon
// @match        http://172.16.6.57/geogrid/aconcagua/*
// @grant        GM_xmlhttpRequest
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
    `;

    // --- 2. FUNÇÕES AUXILIARES (HELPERS) ---

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
            // Se houver um erro, continua com as configurações padrão
        }
        // Junta as padrões com as salvas (as salvas têm prioridade)
        return { ...DEFAULT_SETTINGS, ...saved };
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

        const closeBtn = document.createElement("button");
        closeBtn.className = "hud-btn-close";
        closeBtn.innerHTML = "×";
        closeBtn.style.marginLeft = "auto";
        closeBtn.onclick = () => {
            panel.remove();
            if (id === 'blocoNotasHUD') state.notasAtivo = false;
            if (id === 'blocoPredefinicoesHUD') state.configAtivo = false;
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
        searchQuery: '', // (ADICIONADO) Adiciona o estado da pesquisa
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

    // --- 4. LÓGICA DE CRIAÇÃO E REMOÇÃO DO HUD ---

    /**
     * Remove todos os elementos do HUD da página.
     */
    function removerHUD() {
        document.querySelectorAll(".hud-element").forEach(el => el.remove());
        window.__hudAtivo__ = false;
        state.notasAtivo = false;
        state.configAtivo = false;
        // Permite que o HUD se redimensione na próxima vez que for aberto
        isInitialLoadComplete = false;
    }

    /**
     * Cria e injeta todo o painel do HUD na página.
     */
    function criarHUD() {
        if (window.__hudAtivo__) return; // Já está ativo
        window.__hudAtivo__ = true;

        // --- INJETAR ESTILOS ---
        const styleSheet = document.createElement("style");
        styleSheet.className = "hud-element";
        styleSheet.innerText = cssStyles;
        document.head.appendChild(styleSheet);

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

            // --- Cria o painel ---
            createDraggablePanel('blocoPredefinicoesHUD', 'Predefinições', content, {
                top: mainPanelRect.top,
                left: mainPanelRect.left - 320,
                width: 300,
                height: 460 // (Altura mantida)
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
     * Reseta o estado dos dados coletados.
     */
    function resetState() {
        ultimaAPI = null;
        equipamentosInfo = {};
        equipamentosOrdem = [];
        infoClientes = {};
        isInitialLoadComplete = false;
        state.searchQuery = ''; // Limpa a pesquisa
        //ultimoCodigoPoste = null;
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
                li.onclick = () => li.classList.toggle('clicked');

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
     * Inicia o interceptador de XHR (API).
     * (ESTRATÉGIA HÍBRIDA - Gatilho direto para Splitter, Vigia de 3s para os outros)
     */
    function iniciarInterceptadorXHR() {
        // Handlers para cada API que queremos "ouvir"
        const handlers = {
            "api.php": data => {
                if (data?.equipamentos) {
                    resetState(); // Reseta os dados
                    // Se o HUD estiver aberto, limpa ele
                    const conteudoDiv = document.querySelector("#hudPainelTeste .hud-content");
                    if(conteudoDiv) {
                        // Limpa, mas já adiciona a barra de pesquisa
                        conteudoDiv.innerHTML = '';
                        const searchBar = document.createElement('div');
                        searchBar.className = 'hud-search-bar';

                        searchBar.style.display = state.searchBarVisible ? 'block' : 'none';

                        searchBar.innerHTML = `<input type="text" id="hud-search-field" class="hud-search-input" placeholder="Pesquisar contrato (só números)...">`;
                        conteudoDiv.appendChild(searchBar);

                        // Adiciona o listener de input ao novo campo
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
            "carregarPortas.php": (data, url, bodyParams) => {
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
                            id: p.cliente.id,
                            porta: p.fibra,
                            obs: p.comentario?.texto ?? ""
                        });
                    }
                });
            },
            "carregarFibras.php": (data) => {
                if (data?.registros) {
                    if (!equipamentosInfo['__porDemanda__']) {
                        equipamentosInfo['__porDemanda__'] = { nomeRede: 'Clientes por Demanda', clientes: [] };
                    }
                    data.registros.forEach(p => {
                        if (p.cliente.possuiCliente) {
                            equipamentosInfo['__porDemanda__'].clientes.push({
                                id: p.cliente.id,
                                porta: '?',
                                obs: p.comentario?.texto ?? ""
                            });
                        }
                    });
                }
            },
            "consultarCliente.php": (data, url, bodyParams) => {
                const idCliente = bodyParams?.get("idCliente");
                if (idCliente) {
                    infoClientes[idCliente] = { id: idCliente, data };
                    // Atualiza o HUD (com debounce)
                    debouncedFinalizar();
                }
            },

            "carregaViabilidadeMarcadorJava.php": (data, url, bodyParams) => {
                // (Existente) Lógica da resposta
                const loc = data?.dados?.[0];
                if (loc) localizacao = [loc.lat, loc.lng];

                // (Existente) Lógica do payload (request)
                if (bodyParams && bodyParams.get) {
                    const posteRaw = bodyParams.get("poste");
                    if (posteRaw) {
                        const posteLimpo = posteRaw.replace(/^PT/i, '');
                        ultimoCodigoPoste = posteLimpo;
                        //console.log('HUD Script: Código do poste capturado:', ultimoCodigoPoste);
                    }
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

            "carregaAcessoriosPoste.php": (data) => {
                // 1. Pega o código do poste
                const codigoPoste = ultimoCodigoPoste || "00000";
                const codigoParaInserir = `ponte ${codigoPoste}`;

                // 3. (REVERTIDO) Usa o "Vigia" simples com timeout de 3s
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

            "solicitaBackup.php": (data) => {
                setTimeout(() => {atualizarElementosIndesejados();}, 100); // 100ms de espera
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
            }
        };

        function dispatchHandler(url, resp, bodyParams) {
            const key = Object.keys(handlers).find(k => url.includes(k));
            if (!key) return;
            try {
                const data = JSON.parse(resp);
                handlers[key](data, url, bodyParams);
            } catch (err) {}
        }

        // Monkey-patching XMLHttpRequest
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            this.addEventListener("load", () => {
                let bodyParams;
                if (this._body instanceof FormData) {
                    bodyParams = this._body;
                } else if (typeof this._body === "string") {
                    bodyParams = new URLSearchParams(this._body);
                } else {
                    bodyParams = null;
                }
                dispatchHandler(this._url, this.responseText, bodyParams);
            });
            return origOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            this._body = body;
            return origSend.call(this, body);
        };
    }

    // --- CÓDIGOS NOVOS (INÍCIO) ---

    //Colar Coordenadas (CORRIGIDO - V3)
    function iniciarListenerDeColarCoordenadas() {
        // Se já foi instalado no contexto da página, não reinstala
        try {
            if (unsafeWindow.__coordenadasListener__) return;
            unsafeWindow.__coordenadasListener__ = true;
        } catch (err) {
            // Em casos estranhos onde unsafeWindow não existe, tenta usar window (fallback)
            if (window.__coordenadasListener__) return;
            window.__coordenadasListener__ = true;
        }

        document.body.addEventListener('paste', async function(e) {
            // Só age ao colar em um input[name="latitude"]
            if (!e.target || !e.target.matches || !e.target.matches('input[name="latitude"]')) return;

            const pastedText = (e.clipboardData || window.clipboardData).getData('text') || '';
            const raw = pastedText.trim();
            if (!raw) return;

            // Referência aos inputs (poderá haver vários)
            const latInputs = document.querySelectorAll('input[name="latitude"]');
            const lonInputs = document.querySelectorAll('input[name="longitude"]');

            // Helper para preencher
            function preencher(lat, lon) {
                if (!lat || !lon) return;
                latInputs.forEach(i => i.value = lat);
                lonInputs.forEach(i => i.value = lon);
            }

            // --- LÓGICA DE PASTE ---

            // 1. Detecta coordenadas diretas no texto colado
            const coordMatch = raw.match(/-?\d+\.\d+/g);
            if (coordMatch && coordMatch.length >= 2) {
                console.log('[HUD Script - Paste] Coordenadas diretas detectadas.');
                e.preventDefault();
                const latRaw = coordMatch[0];
                const lonRaw = coordMatch[1];
                preencher(latRaw, lonRaw);
                return;
            }

            // 2. Detecta código de Poste (ex: PT12345)
            const posteRegex = /^pt(\d+)$/i;
            if (posteRegex.test(raw)) {
                // É um código de poste.
                // NÃO chame e.preventDefault().
                // Apenas retorne, para que o 'paste' padrão ocorra.
                console.log('[HUD Script - Paste] Código de Poste detectado. Permitindo paste padrão.');
                return;
            }

            // 3. Detecta links (short e long)
            const shortlinkPattern = /\b(?:https?:\/\/)?(?:maps\.app\.goo\.gl|goo\.gl\/maps|goo\.gl)\//i;
            const longlinkPattern  = /\bhttps?:\/\/(?:www\.)?google\.[^\/]+\/maps/i;

            if (shortlinkPattern.test(raw) || longlinkPattern.test(raw)) {
                console.log('[HUD Script - Paste] Link de mapa detectado. Resolvendo...');
                e.preventDefault();

                // Feedback visual temporário
                latInputs.forEach(i => i.value = "carregando...");
                lonInputs.forEach(i => i.value = "carregando...");

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
                        preencher(coords.lat, coords.lon);
                    } else {
                        latInputs.forEach(i => i.value = "erro");
                        lonInputs.forEach(i => i.value = "erro");
                    }
                } catch (err) {
                    console.error("Falha ao resolver link de mapa:", err);
                    latInputs.forEach(i => i.value = "erro");
                    lonInputs.forEach(i => i.value = "erro");
                }
                return;
            }

            // 4. Se não for coordenada, nem poste, nem link, limpa os placeholders
            console.log('[HUD Script - Paste] Texto colado não reconhecido. Limpando campos.');
            e.preventDefault(); // Impede que o texto inválido seja colado
            latInputs.forEach(i => i.value = "");
            lonInputs.forEach(i => i.value = "");

        }, true); // uso da fase de captura para interceptar antes de inputs do site

        // --- Auxiliares (com a correção do erro de digitação) ---

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

        // Extrai coordenadas de texto/HTML (CORRIGIDO O ERRO DE DIGITAÇÃO)
        function extractCoords(text) {
            if (!text) return null;
            let m;
            if (m = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
            if (m = text.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
            if (m = text.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
            // --- LINHA CORRIGIDA ---
            if (m = text.match(/[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
            // --- FIM DA CORREÇÃO ---
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
     * (NOVO) LÓGICA DE INTERCEÇÃO DO GOOGLE MAPS
     * Vigia até que a API do Google Maps esteja pronta, e então
     * "substitui" o construtor do Mapa para capturar a instância.
     */
    function iniciarInterceptadorDoMapa() {
        // Injeta um pequeno snippet que roda no contexto da página (não no sandbox)
        const injected = `(function(){
            // Flags na página
            window.__googleMapsApiDisponivel__ = false;
            window.__googleMapInstancia__ = window.__googleMapInstancia__ || null;
            window.__mapCaptureActive__ = window.__mapCaptureActive__ || false;
            window.__mapClickListener__ = window.__mapClickListener__ || null;

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
     * (NOVO - V2) Intercepta cliques em botões 'OK' de formulários de coordenadas
     * para permitir a busca por código de poste (ex: PT12345).
     *
     * Esta versão usa DOM traversal (closest/querySelector) para
     * encontrar os inputs corretos relativos ao botão clicado.
     */
    function iniciarListenerDeBuscaPoste() {
        // Usamos 'captura' (true) para nosso listener rodar ANTES
        // de qualquer listener que o site possa ter no botão.
        document.body.addEventListener('click', async function(e) {
            // 1. Verifica se o alvo é o botão 'OK'
            // Usamos .closest() para garantir que pegamos o botão mesmo se o clique for num ícone dentro dele
            const okButton = e.target.closest('button[name="ok"]');

            if (!okButton) {
                // Não é o botão que queremos, não faz nada.
                return;
            }

            console.log('[HUD Script - Busca Poste] Botão OK clicado.');

            // 2. Encontra os inputs de lat/lon RELATIVOS ao botão.
            // Sobe para o 'buttons-container', depois para o 'div-pai'
            const commonParent = okButton.closest('.buttons-container')?.parentElement;

            if (!commonParent) {
                console.warn('[HUD Script - Busca Poste] Não foi possível encontrar o "commonParent" do botão. O clique normal seguirá.');
                return; // Deixa o clique original seguir se não acharmos a estrutura esperada.
            }

            const latInput = commonParent.querySelector('input[name="latitude"]');
            const lonInput = commonParent.querySelector('input[name="longitude"]');

            if (!latInput || !lonInput) {
                console.warn('[HUD Script - Busca Poste] Inputs de Lat/Lon não encontrados dentro do "commonParent". O clique normal seguirá.');
                return; // Deixa o clique original seguir
            }

            // 3. Verifica se o valor da latitude parece um código de Poste.
            const latValue = latInput.value.trim();
            const posteRegex = /^pt(\d+)$/i; // ex: "pt7542" ou "PT7542"
            const match = latValue.match(posteRegex);

            if (!match) {
                console.log('[HUD Script - Busca Poste] O valor não é um poste. Deixando o clique normal seguir.');
                return;
            }

            // 4. É UM CÓDIGO DE POSTE!
            console.log('[HUD Script - Busca Poste] CÓDIGO DE POSTE DETECTADO! Interceptando clique.');
            e.preventDefault();
            e.stopPropagation(); // Impede outros listeners de clique (inclusive o do site)

            // 5. Formata o código do poste para o formato da API (PT maiúsculo)
            const posteCode = `PT${match[1]}`; // ex: "PT7542"
            console.log(`[HUD Script - Busca Poste] Buscando API por: ${posteCode}`);

            // 6. Mostra feedback visual para o usuário
            latInput.value = "Buscando poste...";
            lonInput.value = "Aguarde...";

            try {
                // 7. Monta o payload
                const body = new URLSearchParams();
                body.append('idRazaoSocial', '46'); // Valor fixo da imagem
                body.append('poste', posteCode);
                body.append('viabilidade', 'cabos,ficha_equipamento,ficha_terminal'); // Valor fixo
                body.append('ficha', 'ficha_poste'); // Valor fixo

                // 8. Faz a requisição (vamos usar 'await' para facilitar a leitura)
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: "http://172.16.6.57/geogrid/aconcagua/php/marcadores/carregaViabilidadeMarcadorJava.php",
                        data: body.toString(),
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                        },
                        onload: resolve,
                        onerror: reject,
                        ontimeout: reject
                    });
                });

                // 9. Processa a resposta
                const data = JSON.parse(response.responseText);
                const loc = data?.dados?.[0];

                if (loc && loc.lat && loc.lng) {
                    console.log(`[HUD Script - Busca Poste] Sucesso! Coordenadas: ${loc.lat}, ${loc.lng}`);
                    // 10. SUCESSO! Preenche os campos
                    latInput.value = loc.lat;
                    lonInput.value = loc.lng;

                    // 11. Clica no botão "OK" novamente.
                    // Desta vez, o clique não será interceptado (passo 3).
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

        }, true); // O 'true' (useCapture) é crucial!
    }


    // --- INICIAÇÃO (FINAL) ---
    // (A tua inicialização existente)
    iniciarListenerDeColarCoordenadas();
    iniciarInterceptadorXHR();

    // (NOVO) Inicia o interceptador do mapa
    iniciarInterceptadorDoMapa();

    // (NOVO) Inicia o listener de busca por poste
    iniciarListenerDeBuscaPoste();

})();
