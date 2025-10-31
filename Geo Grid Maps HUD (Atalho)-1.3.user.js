// ==UserScript==
// @name         Geo Grid Maps HUD (github)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adiciona um HUD com informações de clientes e atalhos no Geo Grid, ativado pela tecla "+" do Numpad.
// @author       (Seu Nome Aqui)
// @match        http://172.16.6.57/geogrid/aconcagua/*
// @grant        none
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
    };

    // LÓGICA DE CONFIGURAÇÕES (LocalStorage)
    const STORAGE_KEY = "geoGridHudSettings";
    const DEFAULT_SETTINGS = {
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

        // MUDANÇA AQUI:
        checkbox.addEventListener("change", () => {
            onChange(checkbox.checked); // 1. Atualiza o estado (state)
            saveSettings();             // 2. Salva o novo estado no localStorage
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
        document.querySelectorAll("div.componente-topo > div.conteudo > div.bloco1, .componente-rodape").forEach(div => div.remove());
        document.querySelectorAll(".menu-lateral-container, .menu-lateral-direito.menu-lateral-rota.absolute").forEach(el => { el.style.overflow = "auto"; });

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

        const btnPesquisa = createButton('pesquisaBtn', ICONS.search, 'Ocultar/Exibir Pesquisa');
        const expandirBtn = createButton('expandirBtn', ICONS.notes, 'Anotações');
        const btnCopiar = createButton('copiarContratosBtn', ICONS.copy, 'Copiar Contratos');
        const btnConfig = createButton('configBtn', ICONS.settings, 'Configurações');
        const btnMapa = createButton('abrirMapaBtn', ICONS.map, 'Localização');

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
            const minWidth = 280;
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

        // (NOVO) Botão Pesquisa Toggle
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
        // (NOVO) Define o estado inicial do botão de pesquisa
        btnPesquisa.classList.toggle('active', state.searchBarVisible);

        // Botão Fechar (agora chama a função dedicada)
        btnFechar.addEventListener("click", removerHUD);

        // Botão Notas
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

        // Botão Configurações
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

            content.appendChild(createCheckbox('exibirNomeCliente', 'Exibir nome do cliente', state.exibirNomeCliente, val => state.exibirNomeCliente = val));

            // Os checkboxes agora usam o 'state' carregado do localStorage
            content.appendChild(createCheckbox('somenteCancelados', 'Copiar só cancelados', state.somenteCancelados, val => state.somenteCancelados = val));
            content.appendChild(createCheckbox('copiarStatus', 'Copiar status do cliente', state.copiarStatus, val => state.copiarStatus = val));
            content.appendChild(createCheckbox('copiarNomeRede', 'Copiar nome da rede', state.copiarNomeRede, val => state.copiarNomeRede = val));
            content.appendChild(createCheckbox('abrirNovaGuia', 'Mapa abre em nova guia', state.abrirNovaGuia, val => state.abrirNovaGuia = val));
            content.appendChild(createCheckbox('destacarRedesDivergentes', 'Destacar redes divergentes', state.destacarRedesDivergentes, val => state.destacarRedesDivergentes = val));

            createDraggablePanel('blocoPredefinicoesHUD', 'Predefinições', content, {
                top: mainPanelRect.top,
                left: mainPanelRect.left - 320,
                width: 300,
                height: mainPanelRect.height
            });
        });

        // Botão Mapa (usa a 'localizacao' global)
        btnMapa.addEventListener("click", () => {
            if (!localizacao || localizacao.length < 2) {
                btnMapa.style.borderColor = 'var(--hud-red)';
                setTimeout(() => btnMapa.style.borderColor = 'var(--hud-border)', 1000);
                return;
            }
            const link = `https://www.google.com/maps?q=${localizacao[0]},${localizacao[1]}`;
            if (state.abrirNovaGuia) {
                window.open(link, "_blank");
                return;
            }
            copyToClipboard(link, btnMapa);
        });

        // Botão Copiar (usa 'infoClientes' e 'state' globais)
        btnCopiar.addEventListener("click", () => {
            const clientesParaCopiar = Object.values(infoClientes)
                .filter(c => !state.somenteCancelados || c.data.registro.tipodesativacao === 1)
                .map(c => {
                    // --- LÓGICA DE PARSING (AGORA ESPELHA A 'finalizarHud') ---
                    let textoCompleto = c.data.registro.nome || "Cliente Desconhecido";
                    let partes = textoCompleto.split(" - ");
                    let contrato = partes[1]?.trim() || "Cliente Desconhecido";

                    let textoParaCopiar = contrato; // Começa com o contrato

                    // --- (NOVO) LÓGICA PARA ADICIONAR O NOME ---
                    if (state.exibirNomeCliente) { // A CONDIÇÃO QUE PEDISTE
                        let nomeCliente = "";
                        if (partes.length > 2) {
                            let ultimasPartes = partes.slice(2).join(" - ");
                            nomeCliente = ultimasPartes.replace(/\s*\((ATIVO|CANCELADO|SUSPENSO|NAO IDENTIFICADO)\)$/i, "").trim();
                        }
                        if (nomeCliente) {
                            textoParaCopiar += ` - ${nomeCliente}`; // Adiciona o nome
                        }
                    }
                    // --- FIM DA LÓGICA DO NOME ---

                    // (Existente) Lógica para adicionar o status
                    if (state.copiarStatus && contrato !== "Cliente Desconhecido") {
                        let statusCliente = textoCompleto.match(/\((ATIVO|CANCELADO|SUSPENSO|NAO IDENTIFICADO)\)/i);
                        textoParaCopiar += ` (${statusCliente ? statusCliente[1] : "NAO IDENTIFICADO"})`;
                    }

                    // (Existente) Lógica para adicionar a rede
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
        // Popula o HUD com os dados que já foram coletados
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
        // Trava para executar o redimensionamento apenas na carga inicial
        if (!isInitialLoadComplete) {
            // --- CÁLCULO DA ALTURA (JÁ EXISTENTE) ---
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
            const minWidth = 280; // Do teu CSS
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
            "carregaViabilidadeMarcadorJava.php": data => {
                const loc = data?.dados?.[0];
                if (loc) localizacao = [loc.lat, loc.lng];
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
                let bodyParams = (typeof this._body === "string") ? new URLSearchParams(this._body) : null;
                dispatchHandler(this._url, this.responseText, bodyParams);
            });
            return origOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            this._body = body;
            return origSend.call(this, body);
        };
    }

    /**
     * Inicia o listener para o preenchimento de coordenadas.
     */
    function iniciarListenerCoordenadas() {
        // A flag __coordenadas__ previne que o listener seja adicionado múltiplas vezes
        window.__coordenadas__ = window.__coordenadas__ ?? true;
        if (window.__coordenadas__) {
            document.body.addEventListener('click', function(event) {
                if (event.target.closest('button[name="coordenada"]')) {
                    const coord = prompt("Cole a coordenada aqui");
                    if (!coord) return;

                    let valor = coord.trim().replace(',', ' ');
                    let partes = valor.split(/\s+/);

                    if (partes.length >= 2) {
                        const lat = partes[0];
                        const lon = partes[1];

                        setTimeout(() => {
                            const latInputs = document.querySelectorAll('input[name="latitude"]');
                            latInputs.forEach(ipt => ipt.value = lat);

                            const lonInputs = document.querySelectorAll('input[name="longitude"]');
                            lonInputs.forEach(ipt => ipt.value = lon);
                        }, 250);
                    }
                }
            }, true); // Usando 'true' para capturar o evento mais cedo
            window.__coordenadas__ = false; // Trava o listener
        };
    }

    // --- 6. INICIALIZAÇÃO DO SCRIPT ---
    // Inicia os componentes persistentes

    iniciarListenerCoordenadas();
    iniciarInterceptadorXHR();

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

})();
