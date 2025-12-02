// ==UserScript==
// @name         New - GeoGrid Tools
// @namespace    http://tampermonkey.net/
// @version      5.6
// @description  Ferramentas avançadas para GeoGrid Maps + OCR
// @author       Jhon
// @match        http://172.16.6.57/geogrid/aconcagua/*
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @require      https://unpkg.com/tesseract.js@v4.0.3/dist/tesseract.min.js
// @downloadURL https://github.com/Jhondbs/Geogrid-HUD/raw/refs/heads/main/Geo%20Grid%20Maps%20HUD%20(Atalho)-1.3.user.js
// @updateURL https://github.com/Jhondbs/Geogrid-HUD/raw/refs/heads/main/Geo%20Grid%20Maps%20HUD%20(Atalho)-1.3.user.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * =======================================================================================
     * MODULE: CONFIGURATION & STATE
     * =======================================================================================
     */
    const STORAGE_KEY = "geogrid_tools_settings_v3";
    const JUPITER_API_SEARCH = "https://viaradio.jupiter.com.br/painel.php";
    const JUPITER_API_ONUS = "https://viaradio.jupiter.com.br/api/view/ONUS/retornarONUSJSON";
    const JUPITER_API_SIGNAL = "https://viaradio.jupiter.com.br/api/view/OLT/retornarNivelDeSinal";
    let sinalSearchController = null; // Abort controller

    const DEFAULT_SETTINGS = {
        modoClaro: false,
        exibirInfoDiagrama: false,
        removerIndesejado: true,
        exibirNomeCliente: true,
        destacarRedesDivergentes: true,
        limitarAlturaPainel: true,
        copiarNomeRede: false,
        copiarStatus: true,
        somenteCancelados: true,
        copiarCoordenadas: false,
        abrirNovaGuia: false
    };

    // Global Data Store
    let equipamentosInfo = {};
    let equipamentosOrdem = [];
    let infoClientes = {};
    let ultimaAPI = null;
    let ultimoCodigoEquipamentoPai = null;
    let localizacao = null;

    function loadSettings() {
        let saved = {};
        try {
            const savedJson = localStorage.getItem(STORAGE_KEY);
            if (savedJson) saved = JSON.parse(savedJson);
        } catch (e) { console.error(e); }
        return { ...DEFAULT_SETTINGS, ...saved };
    }

    function saveSettings() {
        if (window.__hudState__) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(window.__hudState__));
            if (typeof UIManager !== 'undefined') {
                UIManager.renderClientList();
            }
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    window.__hudState__ = loadSettings();
    window.saveSettings = saveSettings;

    /**
     * =======================================================================================
     * MODULE: MAP INTERCEPTOR
     * Description: Captura a instância do Google Maps para permitir o clique.
     * =======================================================================================
     */
    const mapScript = document.createElement('script');
    mapScript.textContent = `
    (function(){
        window.__googleMapInstancia__ = window.__googleMapInstancia__ || null;

        // Tenta capturar se já existir
        if (typeof map !== 'undefined' && map instanceof google.maps.Map) {
            window.__googleMapInstancia__ = map;
        }

        // Hook no construtor para capturar instâncias futuras
        const checkGoogle = setInterval(function() {
            if (typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.Map === 'function') {
                clearInterval(checkGoogle);
                const originalMap = google.maps.Map;
                google.maps.Map = function() {
                    const instance = new originalMap(...arguments);
                    window.__googleMapInstancia__ = instance;
                    return instance;
                };
                google.maps.Map.prototype = originalMap.prototype;
            }
        }, 100);
    })();
    `;
    (document.head || document.body || document.documentElement).appendChild(mapScript);

    /**
     * =======================================================================================
     * MODULE: LEGACY NETWORK INTERCEPTOR
     * =======================================================================================
     */

    function resetDataState() {
        equipamentosInfo = {};
        equipamentosOrdem = [];
        infoClientes = {};
        ultimaAPI = null;
        console.log("[GeoGrid Tools] Data State Reset.");

        if (typeof UIManager !== 'undefined') {
            // Reseta a trava de redimensionamento e o estado visual
            UIManager.resetPanelState();
        }
    }

    const triggerRender = debounce(() => {
        if (typeof UIManager !== 'undefined') UIManager.renderClientList();
    }, 200);

    const handlers = {
        "api.php": (data, url, bodyParams) => {
            if (data && data.equipamentos) {
                resetDataState();
            }
            ultimaAPI = data;
            if (bodyParams && bodyParams.get) {
                const controlador = bodyParams.get("controlador");
                const metodo = bodyParams.get("metodo");
                const codigo = bodyParams.get("codigo");

                // Captura ID do Pai (ex: Caixa onde estamos clicando)
                if (controlador === 'diagrama' && metodo === 'carregarCabosEquipamentos' && codigo) {
                    ultimoCodigoEquipamentoPai = codigo;
                }
            }
        },
        "carregaViabilidadeMarcadorJava.php": (data, url, bodyParams) => {
            const loc = data?.dados?.[0];
            if (loc && loc.lat && loc.lng) {
                localizacao = [loc.lat, loc.lng];
            }
            if (bodyParams && bodyParams.get) {
                const posteRaw = bodyParams.get("poste");
                if (posteRaw) {
                    // Remove o 'PT' se existir, queremos apenas o número para o nome padrão
                    window.ultimoCodigoPoste = posteRaw.replace(/^PT/i, '');
                    console.log("[GeoGrid Tools] Poste capturado:", window.ultimoCodigoPoste);
                }
            }
        },
        "carregarPortas.php": (data, url, bodyParams) => {
            const equipId = bodyParams?.get("codigo");
            if (!equipId) return;

            const nomeRede = ultimaAPI?.dados?.nome_rede || "Rede Desconhecida";

            if (!equipamentosInfo[equipId]) {
                equipamentosInfo[equipId] = { nomeRede: nomeRede, clientes: [] };
                if (!equipamentosOrdem.includes(equipId)) equipamentosOrdem.push(equipId);
            }

            if (data.registros && data.registros.saidas) {
                data.registros.saidas.forEach(p => {
                    equipamentosInfo[equipId].clientes.push({
                        id: p.cliente.possuiCliente ? p.cliente.id : null,
                        porta: p.fibra,
                        obs: p.comentario?.texto ?? "",
                        status: p.cliente.possuiCliente ? 'Conectado' : 'Livre'
                    });
                });
            }
            triggerRender();
        },
        // --- NOVO: Captura Clientes por Demanda ---
        "carregarFibras.php": (data, url, bodyParams) => {
            if (data && data.registros) {
                // Garante que o grupo especial existe
                if (!equipamentosInfo['__porDemanda__']) {
                    equipamentosInfo['__porDemanda__'] = {
                        nomeRede: 'Clientes por Demanda',
                        clientes: []
                    };
                }

                data.registros.forEach(p => {
                    if (p.cliente && p.cliente.possuiCliente) {
                        equipamentosInfo['__porDemanda__'].clientes.push({
                            id: p.cliente.id,
                            porta: 'D', // D de Demanda
                            obs: p.comentario?.texto ?? "",
                            status: 'Conectado'
                        });
                    }
                });

                // Adiciona ao topo da lista se ainda não estiver lá
                if (!equipamentosOrdem.includes('__porDemanda__')) {
                    equipamentosOrdem.unshift('__porDemanda__');
                }

                triggerRender();
            }
        },
        "consultarCliente.php": (data, url, bodyParams) => {
            const idCliente = bodyParams?.get("idCliente");
            if (idCliente && data.status) {
                infoClientes[idCliente] = { id: idCliente, data: data };
                triggerRender();
            }
        }
    };

    (function(open, send) {
        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return open.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function(body) {
            this._body = body;
            this.addEventListener('load', function() {
                if (this.status === 200) {
                    try {
                        const url = this._url;
                        for (const key in handlers) {
                            if (url.indexOf(key) !== -1) {
                                let bodyParams = null;
                                if (this._body) {
                                    bodyParams = (typeof this._body === 'string') ? new URLSearchParams(this._body) : this._body;
                                }
                                const responseData = JSON.parse(this.responseText);
                                handlers[key](responseData, url, bodyParams);
                                break;
                            }
                        }
                    } catch (e) {}
                }
            });
            return send.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open, XMLHttpRequest.prototype.send);


    /**
     * =======================================================================================
     * MODULE: TURBO ENGINE (Fast Map Loading - Corrected)
     * Description: Parallel fetching, O(1) plotting, Custom Status HUD (No native alerts).
     * =======================================================================================
     */
    const turboScript = document.createElement('script');
    turboScript.textContent = `
    (function() {
        console.log("[GeoGrid Turbo] Performance Module Loaded.");

        const CONFIG = {
            CONCURRENCY: 6,
            BATCH_SIZE: 2000,
        };

        let isTurboRunning = false;
        let originalRetornaIndice = null;

        // --- INTERNAL STATUS HUD (Substitui o criaAlerta) ---
        // Cria um elemento visual próprio para não depender do site
        const statusHud = document.createElement('div');
        statusHud.style.cssText = "position:fixed; bottom:10px; right:10px; padding: 8px 12px; background: rgba(0,0,0,0.85); color: #e0e0e0; border-radius: 4px; z-index:2147483647; font-family: sans-serif; font-size: 11px; display: none; border-left: 4px solid #ff9800; box-shadow: 0 2px 10px rgba(0,0,0,0.3); pointer-events: none;";
        (document.body || document.documentElement).appendChild(statusHud);

        function updateStatusHUD(status, msg) {
            statusHud.style.display = 'block';
            statusHud.innerHTML = '<strong>TURBO ENGINE</strong><br>' + msg;

            if(status === "working") statusHud.style.borderLeftColor = "#4caf50"; // Verde
            else if(status === "finish") {
                statusHud.style.borderLeftColor = "#00bcd4"; // Ciano
                setTimeout(function() { statusHud.style.display = 'none'; }, 3000);
            } else {
                statusHud.style.borderLeftColor = "#ff9800"; // Laranja (Padrão)
            }
        }

        // Índice Global de Acesso Rápido
        window.__TURBO_INDEX__ = {};

        // --- TURBO LOADER FUNCTION ---
        const turboCompletaJson = async function(jsonJava, cdAbrir = "", deveCentralizar = true, carregamentos = true) {
            if (isTurboRunning) return;

            // Credenciais Fixas
            const idRazao = 46;
            let viabilidade = "";
            try {
                if(window.jsonPrincipalUsuario?.dados?.viabilidade) {
                    viabilidade = window.jsonPrincipalUsuario.dados.viabilidade;
                }
            } catch(e) {}

            isTurboRunning = true;

            // Feedback Visual Próprio (Sem criaAlerta)
            if(carregamentos) updateStatusHUD("working", "Iniciando aceleração...");

            window.__TURBO_INDEX__ = {};

            let itemsToLoad = new Set();
            let loadedItems = new Set();

            let inputList = jsonJava;
            try { if (typeof inputList === 'string') inputList = JSON.parse(inputList); } catch(e) {}

            if (Array.isArray(inputList)) {
                inputList.forEach(function(item) {
                    let codigo = item.cd || item;
                    if (typeof codigo === 'string' && codigo.length > 2) {
                        itemsToLoad.add(codigo);
                        loadedItems.add(codigo);
                    }
                });
            }

            let totalItems = itemsToLoad.size;
            let processed = 0;

            // --- PROCESSAMENTO EM LOTE ---
            const processBatch = async () => {
                while (itemsToLoad.size > 0) {
                    const batch = Array.from(itemsToLoad).slice(0, CONFIG.BATCH_SIZE);
                    batch.forEach(function(id) { itemsToLoad.delete(id); });

                    // Atualiza HUD Próprio
                    if(carregamentos) {
                        let percent = Math.round((processed / totalItems) * 100);
                        updateStatusHUD("working", "Baixando dados (" + percent + "%)<br>" + processed + " / " + totalItems);
                    }

                    const formData = new URLSearchParams();
                    formData.append('idRazaoSocial', idRazao);
                    formData.append('viabilidade', viabilidade);
                    batch.forEach(function(cd) { formData.append('json[]', cd); });

                    try {
                        const response = await fetch('php/arquivosComuns/carregaCompletar.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                            body: formData
                        });

                        const data = await response.json();

                        if (Array.isArray(data)) {
                            data.forEach(function(itemData) {
                                let f = retornaFicha(itemData.cd);
                                if (!jsonPrincipal[f]) jsonPrincipal[f] = [];

                                jsonPrincipal[f].push(itemData);

                                if(!window.__TURBO_INDEX__[f]) window.__TURBO_INDEX__[f] = {};
                                window.__TURBO_INDEX__[f][itemData.cd] = jsonPrincipal[f].length - 1;

                                extractChildren(itemData, itemsToLoad, loadedItems);
                            });
                        }
                        processed += batch.length;
                    } catch (e) {
                        console.error("[Turbo] Erro de conexão:", e);
                    }
                }
            };

            function extractChildren(itemData, queueSet, loadedSet) {
                const checkAndAdd = function(cd) {
                    if (cd && cd.length > 2 && !loadedSet.has(cd)) {
                        let f = retornaFicha(cd);
                        if (typeof retornaIndice === 'function' && retornaIndice(f, cd) === -1) {
                            loadedSet.add(cd);
                            queueSet.add(cd);
                            totalItems++;
                        }
                    }
                };
                if (itemData.points) itemData.points.forEach(function(p) { checkAndAdd(p.cd); });
                if (itemData.acc && itemData.acc.itens) itemData.acc.itens.forEach(function(acc) { checkAndAdd(acc.cd); });
            }

            const workers = [];
            for (let i = 0; i < CONFIG.CONCURRENCY; i++) workers.push(processBatch());
            await Promise.all(workers);

            // --- FASE DE PLOTAGEM ---
            if(carregamentos) updateStatusHUD("working", "Renderizando mapa...");

            if (typeof carregados !== 'undefined') carregados = [];

            loadedItems.forEach(function(cd) {
                const ficha = retornaFicha(cd);
                let indice = -1;

                if (window.__TURBO_INDEX__[ficha] && window.__TURBO_INDEX__[ficha][cd] !== undefined) {
                    indice = window.__TURBO_INDEX__[ficha][cd];
                } else if (typeof retornaIndice === 'function') {
                    indice = retornaIndice(ficha, cd);
                }

                if (indice !== -1) {
                    carregados.push({ cd: cd, indice: indice, id: cd + "@Turbo" });
                }
            });

            if (typeof retornaIndice !== 'undefined') {
                originalRetornaIndice = retornaIndice;
                window.retornaIndice = function(ficha, codigo) {
                    if (window.__TURBO_INDEX__[ficha] && window.__TURBO_INDEX__[ficha][codigo] !== undefined) {
                        return window.__TURBO_INDEX__[ficha][codigo];
                    }
                    return originalRetornaIndice(ficha, codigo);
                };
            }

            try {
                if (typeof plotaItensNoMapa === 'function') plotaItensNoMapa();
            } catch(err) { console.error("[Turbo] Erro plotagem:", err); }

            if (originalRetornaIndice) {
                window.retornaIndice = originalRetornaIndice;
                originalRetornaIndice = null;
            }

            try {
                if (deveCentralizar && typeof centraliza === 'function') centraliza();
                if (cdAbrir && typeof abreFichaDireto === 'function') abreFichaDireto(cdAbrir);
            } catch(e) {}

            isTurboRunning = false;

            // Finaliza HUD Próprio
            updateStatusHUD("finish", "Concluído.");
        };

        // --- INSTALADOR ---
        const installTurbo = setInterval(() => {
            if (typeof window.completaJson === 'function' && window.completaJson !== turboCompletaJson) {
                window.completaJson = turboCompletaJson;
                console.log("[GeoGrid Turbo] Motor ativado.");
                clearInterval(installTurbo);
            }
        }, 1000);

    })();
    `;
    (document.head || document.body || document.documentElement).appendChild(turboScript);

    // Retorna data formatada YYYY-MM-DD
    function getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    // Wrapper para requisições AJAX usando jQuery da página
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
                    try {
                        const dataJson = JSON.parse(responseText);

                        // --- LÓGICA DE VALIDAÇÃO (ATUALIZADA) ---

                        // 1. Padrão: verifica se status é true
                        const sucessoPadrao = (dataJson.status === true || dataJson.status === "true");

                        // 2. Exceção A: carregaAcessoriosPoste (retorna objeto com 'dados')
                        const excecaoAcessorios = (url.includes('carregaAcessoriosPoste') && dataJson.dados);

                        // 3. Exceção B: carregaCompletar (retorna Array direto)
                        const excecaoArray = Array.isArray(dataJson);

                        if (sucessoPadrao || excecaoAcessorios || excecaoArray) {
                            resolve({ response: responseText });
                        } else {
                            // Se a API diz que falhou (e não é um array nem a exceção), rejeitamos
                            reject(dataJson.mensagem || `Erro na API: ${debugInfo}`);
                        }
                    } catch (e) {
                        // Se não for JSON válido (pode ser HTML ou texto puro)
                        // Para cadastros críticos, queremos rejeitar se não for JSON.
                        if(url.includes('salvaEquipamentos') || url.includes('cadastraCaboLigacao')) {
                            reject(`Resposta inválida (não JSON) em ${debugInfo}`);
                        } else {
                            // Para outras chamadas, resolvemos (pode ser HTML de erro ou sucesso sem JSON)
                            resolve({ response: responseText });
                        }
                    }
                },
                error: (xhr, status, error) => {
                    reject(`Erro HTTP ${xhr.status}: ${error}`);
                }
            });
        });
    }

    // Lógica inteligente para encontrar a próxima sigla livre
    function findNextSigla(baseSigla, keywords, existingList) {
        const normalizedKeywords = keywords.map(k => k.toLowerCase());

        const matching = existingList.filter(eq => {
            const s = eq.sigla.toLowerCase();
            return normalizedKeywords.some(k => s.includes(k));
        });

        const suffixes = ["", " - A", " - B", " - C", " - D"];

        const baseOccupied = matching.some(eq => {
            return eq.sigla.toUpperCase() === baseSigla.toUpperCase();
        });

        if (!baseOccupied && !matching.some(eq => eq.sigla.toUpperCase() === baseSigla.toUpperCase())) {
            return baseSigla;
        }

        for (let i = 1; i < suffixes.length; i++) {
            const candidate = baseSigla + suffixes[i];
            const exists = matching.some(eq => eq.sigla.toUpperCase() === candidate.toUpperCase());
            if (!exists) return candidate;
        }

        return null;
    }

    /**
     * (NOVO) Intercepta APENAS a "Busca no Mapa" para localização rápida por coordenadas.
     * A busca do Menu continua com o comportamento padrão do site (lento/carregamento de árvore).
     */
    function iniciarListenerDePesquisaRapida() {
        document.body.addEventListener('keydown', async function(e) {

            // 1. Apenas tecla Enter
            if (e.key !== 'Enter') return;

            const input = e.target;

            // 2. IDENTIFICAÇÃO DO ALVO:
            // Verifica se o input pertence ao componente de busca do mapa (flutuante)
            // Geralmente ele está dentro de uma div com a classe 'busca-mapa-principal'
            const isMapSearch = input.closest('.busca-mapa-principal');

            // Se NÃO for a busca do mapa (ex: é a busca do menu), SAIMOS.
            // Isso deixa o site rodar o código nativo (busca lenta/padrão no menu).
            if (!isMapSearch) return;

            // 3. Verifica se parece um código de equipamento (tem números)
            // Se for apenas texto (ex: "Rua das Flores"), deixamos o Google Maps nativo buscar o endereço.
            const valor = input.value.trim();
            const temNumero = /\d/.test(valor);

            if (!temNumero) return; // Deixa passar para a busca de endereço nativa

            // 4. INTERCEPTAÇÃO
            console.log('[HUD Script] Busca Rápida no Mapa acionada para:', valor);
            e.preventDefault();
            e.stopPropagation();

            const originalPlaceholder = input.placeholder;
            input.value = `Localizando ${valor}...`;
            input.disabled = true;

            try {
                // 5. Consulta a API "carregaCompletar" (Rápida, retorna lat/lng)
                const body = new URLSearchParams();
                body.append('idRazaoSocial', '46'); // ID Fixo
                body.append('json[]', valor); // O código digitado
                body.append('viabilidade', 'cabos,ficha_equipamento,ficha_terminal');

                const response = await fazerRequisicaoDaPagina(
                    "php/arquivosComuns/carregaCompletar.php",
                    body.toString(),
                    `Busca Mapa ${valor}`
                );

                const data = JSON.parse(response.response);
                // A API pode retornar um array ou objeto, pegamos o primeiro válido
                const loc = (Array.isArray(data) && data.length > 0) ? data[0] : null;

                if (loc && loc.lat && loc.lng) {
                    // 6. SUCESSO: Move o mapa e desenha destaque
                    console.log(`[HUD Script] Coordenadas encontradas: ${loc.lat}, ${loc.lng}`);

                    const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
                    const map = gw.__googleMapInstancia__;

                    if (map) {
                        const newCoords = { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };

                        // Move a câmera
                        map.setCenter(newCoords);
                        map.setZoom(19);

                        // Remove círculo anterior se existir
                        if (gw.__hudSearchCircle__) {
                            gw.__hudSearchCircle__.setMap(null);
                        }

                        // Desenha novo círculo de destaque (Raio 25m)
                        gw.__hudSearchCircle__ = new gw.google.maps.Circle({
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: '#FF0000',
                            fillOpacity: 0.35,
                            map: map,
                            center: newCoords,
                            radius: 25
                        });

                        // Feedback visual
                        input.value = valor.toUpperCase();
                        // Opcional: Mostra um toast rápido
                        if(typeof UIManager !== 'undefined') {
                            UIManager.showToastGeneric(`Encontrado: ${loc.sg || valor}`, "#00b894");
                        }
                    }
                } else {
                    // 7. NÃO ENCONTRADO
                    console.warn('[HUD Script] Item não retornado pela API rápida.');
                    input.value = valor; // Restaura o texto
                    if(typeof UIManager !== 'undefined') {
                        UIManager.showToastGeneric("Item não localizado nas coordenadas.", "#ff7675");
                    }
                }

            } catch (err) {
                console.error('[HUD Script] Erro na busca rápida:', err);
                input.value = valor;
            } finally {
                input.disabled = false;
                input.placeholder = originalPlaceholder;
                input.focus();
            }

        }, true); // Use capture para garantir prioridade sobre o listener nativo
    }

    // --- FUNÇÕES DE COLAR COORDENADAS E LINKS ---

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
                        } catch (e) { reject(e); }
                    },
                    onerror(err) { reject(err); },
                    ontimeout(err) { reject(err); },
                });
            } catch (e) { reject(e); }
        });
    }

    function extractCoords(text) {
        if (!text) return null;
        let m;
        // Padrões do Google Maps e Lat/Lon
        if (m = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
        if (m = text.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
        if (m = text.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
        if (m = text.match(/[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)) return { lat: m[1], lon: m[2] };
        const nums = text.match(/-?\d+\.\d+/g);
        if (nums && nums.length >= 2) return { lat: nums[0], lon: nums[1] };
        return null;
    }

    function iniciarListenerDeColarCoordenadas() {
        document.body.addEventListener('paste', async function(e) {
            // Só age se colar no input de latitude
            if (!e.target || !e.target.matches || !e.target.matches('input[name="latitude"]')) return;

            const latInput = e.target;
            // Tenta achar o container pai para pegar o campo de longitude e o botão OK
            // No Geogrid novo, geralmente estão próximos
            const commonParent = latInput.closest('div') || latInput.parentElement;
            if (!commonParent) return;

            // Busca input longitude e botão OK no mesmo container
            const lonInput = commonParent.parentElement.querySelector('input[name="longitude"]');
            const okButton = commonParent.parentElement.querySelector('button[name="ok"]') ||
                             Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Ok') && commonParent.parentElement.contains(b));

            if (!lonInput) return;

            const pastedText = (e.clipboardData || window.clipboardData).getData('text') || '';
            const raw = pastedText.trim();
            if (!raw) return;

            const preencher = (lat, lon) => {
                if (!lat || !lon) return;
                e.preventDefault(); // Impede a colagem do texto original
                latInput.value = lat;
                lonInput.value = lon;
                // Dispara eventos para o site reconhecer a mudança
                latInput.dispatchEvent(new Event('change'));
                lonInput.dispatchEvent(new Event('change'));

                if (okButton) okButton.focus(); // Foca no OK para facilitar

                if(typeof UIManager !== 'undefined') UIManager.showToastGeneric("Coordenadas coladas!", "#00b894");
            };

            // 1. Verifica link do Google Maps
            const shortlinkPattern = /\b(?:https?:\/\/)?(?:maps\.app\.goo\.gl|goo\.gl\/maps|goo\.gl)\//i;
            const longlinkPattern  = /\bhttps?:\/\/(?:www\.)?google\.[^\/]+\/maps/i;

            if (shortlinkPattern.test(raw) || longlinkPattern.test(raw)) {
                e.preventDefault();
                latInput.value = "Lendo link...";

                try {
                    let resolved = { url: raw, html: '' };
                    if (shortlinkPattern.test(raw)) {
                        resolved = await resolveShortlinkWithGM(raw);
                    }

                    let coords = extractCoords(resolved.url || raw);
                    if (!coords && resolved.html) coords = extractCoords(resolved.html);

                    if (coords) {
                        preencher(coords.lat, coords.lon);
                    } else {
                        latInput.value = "Link não reconhecido";
                    }
                } catch (err) {
                    console.error("Erro link:", err);
                    latInput.value = "Erro";
                }
                return;
            }

            // 2. Verifica coordenadas brutas (ex: -23.55, -46.66)
            // Aceita espaço, vírgula ou ponto e vírgula como separador
            const coordMatch = raw.match(/^(-?\d+\.\d+)[\s,;]+(-?\d+\.\d+)$/);
            if (coordMatch) {
                preencher(coordMatch[1], coordMatch[2]);
            }

        }, true); // Use capture
    }

    /**
     * =======================================================================================
     * MODULE: UI MANAGER
     * =======================================================================================
     */
    const UIManager = {
        config: {
            sidebarId: 'geogrid-tools-sidebar',
            mainPanelId: 'geogrid-tools-main-panel',
            buttonsClass: 'gg-tool-btn',
            themeColor: '#2d3436',
            accentColor: '#0984e3',
            textColor: '#dfe6e9',
            borderColor: '#636e72'
        },
        currentBox: {
            title: "Aguardando...",
            data: [],
            clientCache: {}
        },

        zIndexCounter: 10000,
        isManuallyResized: false,
        searchQuery: "",
        isCapturing: false,
        mapListener: null,
        captureShield: null,
        shieldUpdater: null,

        init: function() {
            this.injectStyles();
            this.createSidebar();
            this.bindGlobalEvents();
            this.applyTheme();
            iniciarListenerDePesquisaRapida();
            iniciarListenerDeColarCoordenadas();
            console.log("[GeoGrid Tools] UI Initialized.");
        },

        applyTheme: function() {
            const isLight = (window.__hudState__ && window.__hudState__.modoClaro) || false;
            document.body.classList.toggle('gg-light-mode', isLight);
        },

        setLoadingState: function() {
            const contentDiv = document.querySelector(`#${this.config.mainPanelId} .gg-panel-content`);
            if (contentDiv) contentDiv.innerHTML = '<div class="gg-empty-state">Carregando dados da caixa...</div>';
        },

        injectStyles: function() {
            const style = document.createElement('style');
            style.textContent = `
                /* --- VARIÁVEIS GLOBAIS DO TEMA --- */
                :root {
                    --gg-bg: ${this.config.themeColor};
                    --gg-text: ${this.config.textColor};
                    --gg-border: ${this.config.borderColor};
                    --gg-accent: ${this.config.accentColor};
                    --gg-hover: rgba(255, 255, 255, 0.1);
                    --gg-header-bg: rgba(0, 0, 0, 0.2);
                    --gg-shadow: rgba(0, 0, 0, 0.4);
                    --gg-input-bg: transparent;
                    --gg-scrollbar: #636e72;
                    --gg-divergent: rgba(224, 108, 117, 0.2);
                }
                body.gg-light-mode {
                    --gg-bg: #ffffff;
                    --gg-text: #000000;
                    --gg-border: #dcdde1;
                    --gg-hover: rgba(45, 52, 54, 0.08);
                    --gg-header-bg: rgba(0, 0, 0, 0.03);
                    --gg-shadow: rgba(0, 0, 0, 0.15);
                    --gg-input-bg: rgba(0, 0, 0, 0.03);
                    --gg-scrollbar: #b2bec3;
                    --gg-accent: #1363a1;
                    --gg-divergent: rgba(215, 58, 73, 0.15);
                }

                /* --- ESTILOS DO NOVO PAINEL MAC (DUAS COLUNAS) --- */
                .gg-mac-container {
                    display: flex;
                    gap: 15px;
                    padding: 10px;
                    height: 100%;
                    min-height: 250px;
                }
                .gg-mac-col-left {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .gg-mac-col-right {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    justify-content: flex-start;
                }

                /* Área de Colagem */
                .gg-paste-area {
                    flex-grow: 1;
                    min-height: 120px;
                    background-color: var(--gg-input-bg);
                    border: 2px dashed var(--gg-border);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #b2bec3;
                    font-size: 13px;
                    text-align: center;
                    cursor: text;
                    transition: border-color 0.2s;
                    padding: 10px;
                }
                .gg-paste-area:focus {
                    outline: none;
                    border-color: var(--gg-accent);
                    background-color: var(--gg-hover);
                    color: var(--gg-text);
                }

                /* Canvas de Debug (Oculto ou Pequeno) */
                #gg-mac-debug-canvas {
                    width: 100%;
                    height: 60px;
                    border: 1px solid var(--gg-border);
                    background: #000;
                    object-fit: contain;
                    display: none; /* Ative se quiser ver o tratamento */
                }

                /* Inputs da Direita */
                .gg-info-field {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .gg-info-field label {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--gg-accent);
                    text-transform: uppercase;
                }
                .gg-info-field input {
                    background-color: var(--gg-input-bg);
                    border: 1px solid var(--gg-border);
                    color: var(--gg-text);
                    padding: 6px 8px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-family: 'Consolas', monospace;
                    outline: none;
                }
                .gg-info-field input:focus { border-color: var(--gg-accent); }
                .gg-info-field input:read-only { opacity: 0.7; cursor: default; }

                /* --- ANIMAÇÕES --- */
                #btn-location.capturing {
                    color: #ff7675;
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 118, 117, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 118, 117, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 118, 117, 0); }
                }

                /* --- SIDEBAR --- */
                #${this.config.sidebarId} {
                    position: fixed;
                    right: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 50px;
                    background-color: var(--gg-bg);
                    border-top-left-radius: 8px;
                    border-bottom-left-radius: 8px;
                    box-shadow: -2px 0 12px rgba(0,0,0,0.1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 10px 0;
                    gap: 8px;
                    z-index: 9999;
                    border: 1px solid var(--gg-border);
                    border-right: none;
                }

                .${this.config.buttonsClass} {
                    width: 36px; height: 36px; border: none; background-color: transparent;
                    border-radius: 6px; cursor: pointer; display: flex; justify-content: center;
                    align-items: center; transition: all 0.2s ease; color: #b2bec3;
                }
                body.gg-light-mode .${this.config.buttonsClass} { color: #636e72; }
                .${this.config.buttonsClass}:hover { background-color: var(--gg-hover); color: var(--gg-text); }
                .${this.config.buttonsClass}.active {
                    background-color: var(--gg-accent); color: #ffffff !important;
                    box-shadow: 0 0 8px var(--gg-accent);
                }
                .${this.config.buttonsClass} svg { width: 20px; height: 20px; fill: currentColor; }

                /* --- PAINÉIS GERAIS --- */
                .gg-panel {
                    position: fixed; background-color: var(--gg-bg); color: var(--gg-text);
                    border: 1px solid var(--gg-border); border-radius: 6px;
                    box-shadow: 0 5px 15px var(--gg-shadow); z-index: 9999;
                    display: none; flex-direction: column; font-family: 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden; min-width: 250px; min-height: 150px;
                }
                .gg-panel-header {
                    padding: 8px 12px; background-color: var(--gg-header-bg);
                    border-bottom: 1px solid var(--gg-border); font-weight: 600; font-size: 13px;
                    display: flex; justify-content: space-between; align-items: center;
                    cursor: move; user-select: none; flex-shrink: 0;
                }
                .gg-panel-controls { display: flex; align-items: center; gap: 8px; }

                .gg-header-btn {
                    cursor: pointer; background: transparent; border: none; color: #b2bec3;
                    display: flex; align-items: center; justify-content: center;
                    padding: 4px; border-radius: 4px; transition: all 0.2s;
                }
                body.gg-light-mode .gg-header-btn { color: #636e72; }
                .gg-header-btn:hover { color: var(--gg-text); background-color: var(--gg-hover); }
                .gg-header-btn.close-btn:hover { color: #ff7675; background-color: transparent; }
                .gg-header-btn svg { width: 14px; height: 14px; fill: currentColor; }
                .gg-panel-close { cursor: pointer; padding: 0 5px; font-size: 16px; }
                .gg-panel-close:hover { color: #ff7675; }

                .gg-panel-content { padding: 10px; font-size: 12px; overflow-y: auto; flex-grow: 1; position: relative; }
                .gg-empty-state { text-align: center; color: #636e72; padding: 20px; font-style: italic; }

                /* --- BARRA DE PESQUISA E TOASTS --- */
                .gg-search-container {
                    padding: 8px 10px; background-color: rgba(0,0,0,0.1);
                    border-bottom: 1px solid var(--gg-border); display: none;
                }
                .gg-search-input {
                    width: 100%; background-color: var(--gg-input-bg); border: 1px solid var(--gg-border);
                    color: var(--gg-text); padding: 6px 8px; border-radius: 4px;
                    font-family: 'Segoe UI', sans-serif; font-size: 12px; outline: none;
                }
                .gg-search-input:focus { border-color: var(--gg-accent); }

                .gg-toast {
                    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                    background-color: var(--gg-accent); color: white; padding: 6px 12px;
                    border-radius: 20px; font-size: 11px; font-weight: bold; opacity: 0;
                    transition: opacity 0.3s; pointer-events: none; white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 100;
                }

                /* --- RESIZERS --- */
                .gg-resizer { position: absolute; background: transparent; z-index: 100; }
                .gg-resizer.n { top: 0; left: 0; right: 0; height: 5px; cursor: n-resize; }
                .gg-resizer.s { bottom: 0; left: 0; right: 0; height: 5px; cursor: s-resize; }
                .gg-resizer.e { top: 0; right: 0; bottom: 0; width: 5px; cursor: e-resize; }
                .gg-resizer.w { top: 0; left: 0; bottom: 0; width: 5px; cursor: w-resize; }
                .gg-resizer.ne { top: 0; right: 0; width: 10px; height: 10px; cursor: ne-resize; z-index: 101; }
                .gg-resizer.nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nw-resize; z-index: 101; }
                .gg-resizer.se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: se-resize; z-index: 101; }
                .gg-resizer.sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: sw-resize; z-index: 101; }

                /* --- ELEMENTOS ESPECÍFICOS --- */
                #${this.config.mainPanelId} { width: 350px; }
                #geogrid-tools-notes-panel { width: 300px; height: 400px; }
                #geogrid-tools-settings-panel { width: 300px; height: auto; max-height: 600px; }

                .gg-notes-area {
                    width: 100%; height: 100%; background-color: var(--gg-input-bg);
                    border: none; color: var(--gg-text); padding: 10px;
                    font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
                    resize: none; outline: none; line-height: 1.5;
                }
                .gg-notes-area::-webkit-scrollbar { width: 6px; }
                .gg-notes-area::-webkit-scrollbar-thumb { background-color: var(--gg-scrollbar); border-radius: 3px; }

                /* --- CONFIGURAÇÕES --- */
                .gg-settings-group-title {
                    color: var(--gg-accent); font-weight: 600; font-size: 11px;
                    text-transform: uppercase; letter-spacing: 0.5px; margin-top: 15px;
                    margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--gg-border);
                }
                .gg-settings-group-title:first-child { margin-top: 0; }
                .gg-setting-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 8px; border-radius: 4px; cursor: pointer; transition: background-color 0.2s ease; user-select: none;
                }
                .gg-setting-row:hover { background-color: var(--gg-hover); }
                .gg-setting-label { color: var(--gg-text); }
                .gg-toggle-switch {
                    position: relative; width: 32px; height: 18px; appearance: none;
                    background: #b2bec3; border-radius: 20px; cursor: pointer; transition: 0.3s; outline: none; flex-shrink: 0;
                }
                .gg-toggle-switch:checked { background: var(--gg-accent); }
                .gg-toggle-switch::after {
                    content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
                    background: #fff; border-radius: 50%; transition: 0.3s;
                }
                .gg-toggle-switch:checked::after { left: 16px; }

                /* --- ESTILOS DE LISTA --- */
                .strikethrough { text-decoration: line-through; opacity: 0.6; }
                .network-divergent { background-color: var(--gg-divergent) !important; }
                .gg-group-header {
                    padding: 6px 10px; background: var(--gg-header-bg); font-weight: 600;
                    font-size: 12px; color: var(--gg-text); border-left: 3px solid var(--gg-accent);
                    cursor: pointer; display: flex; justify-content: space-between; align-items: center;
                }
                .gg-group-header:hover { background-color: var(--gg-hover); }
                .gg-group-content { transition: max-height 0.3s ease; }

                /* ==========================================================================
                   NOVO: ESTILOS DO CADASTRO DE EQUIPAMENTO (MODERNO / FLAT DESIGN)
                   ==========================================================================
                */

                /* Container dos botões e inputs */
                .gg-btn-group {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 20px;
                    align-items: stretch;
                }

                /* Botões de Seleção (Toggles) */
                .gg-toggle-btn {
                    background-color: var(--gg-bg);
                    border: 1px solid var(--gg-border);
                    color: var(--gg-text);
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-family: 'Segoe UI', sans-serif;
                    transition: all 0.2s ease-in-out;
                    user-select: none;
                    flex-grow: 1;
                    text-align: center;
                    min-width: 60px;
                    font-weight: 500;
                }

                .gg-toggle-btn:hover {
                    background-color: var(--gg-hover);
                    border-color: var(--gg-accent);
                    transform: translateY(-1px);
                }

                .gg-toggle-btn.active {
                    background-color: var(--gg-accent);
                    color: white;
                    border-color: var(--gg-accent);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                    font-weight: 700;
                }

                /* Grupo do Input de Rede */
                .gg-input-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background-color: var(--gg-input-bg);
                    border: 1px solid var(--gg-border);
                    padding: 5px 12px;
                    border-radius: 6px;
                    flex-grow: 10;
                    position: relative; /* Importante para o Autocomplete */
                    transition: border-color 0.2s;
                }

                .gg-input-group:focus-within {
                    border-color: var(--gg-accent);
                    box-shadow: 0 0 0 2px rgba(9, 132, 227, 0.1);
                }

                .gg-input-group label {
                    font-weight: 600;
                    font-size: 13px;
                    color: var(--gg-accent);
                    white-space: nowrap;
                }

                .gg-input-group input {
                    background: transparent;
                    border: none;
                    color: var(--gg-text);
                    outline: none;
                    width: 100%;
                    font-size: 14px;
                    height: 30px;
                }

                /* Títulos das Seções */
                .gg-section-title {
                    color: var(--gg-text);
                    font-weight: 700;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                    opacity: 0.6;
                    border-bottom: 1px solid var(--gg-border);
                    padding-bottom: 4px;
                }

                /* Rodapé */
                .gg-footer-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 25px;
                    padding-top: 15px;
                    border-top: 1px solid var(--gg-border);
                    background-color: var(--gg-header-bg);
                    margin-left: -10px;
                    margin-right: -10px;
                    margin-bottom: -10px;
                    padding-right: 15px;
                    padding-bottom: 15px;
                    padding-left: 15px;
                }

                /* Botões de Ação */
                .gg-action-btn {
                    padding: 8px 20px;
                    border-radius: 6px;
                    border: 1px solid var(--gg-border);
                    background-color: var(--gg-bg);
                    color: var(--gg-text);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    transition: all 0.2s;
                }

                .gg-action-btn:hover { filter: brightness(0.95); }

                .gg-action-btn.primary {
                    background-color: var(--gg-accent);
                    color: white;
                    border-color: var(--gg-accent);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .gg-action-btn.primary:hover { background-color: #0870c0; }

                .gg-action-btn.danger {
                    color: #ff7675;
                    border-color: transparent;
                    background: transparent;
                }
                .gg-action-btn.danger:hover { background-color: rgba(255, 118, 117, 0.1); }

                /* Autocomplete (Dropdown) */
                .gg-autocomplete-suggestions {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background-color: var(--gg-bg);
                    border: 1px solid var(--gg-border);
                    border-top: none;
                    border-bottom-left-radius: 6px;
                    border-bottom-right-radius: 6px;
                    z-index: 1000;
                    max-height: 200px;
                    overflow-y: auto;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.15);
                }

                .gg-suggestion-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 12px;
                    color: var(--gg-text);
                    border-bottom: 1px solid var(--gg-border);
                }
                .gg-suggestion-item:last-child { border-bottom: none; }
                .gg-suggestion-item:hover { background-color: var(--gg-accent); color: white; }
                .gg-suggestion-item.loading { color: #b2bec3; font-style: italic; cursor: default; }
                .gg-suggestion-item.loading:hover { background-color: transparent; color: #b2bec3; }
            `;
            document.head.appendChild(style);
        },

        createSidebar: function() {
            const sidebar = document.createElement('div');
            sidebar.id = this.config.sidebarId;

            const buttons = [
                { id: 'btn-clients', title: 'Painel de Clientes', icon: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>', action: () => this.toggleMainPanel() },
                { id: 'btn-notes', title: 'Bloco de Notas', icon: '<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>', action: () => this.toggleNotesPanel() },

                // NOVO BOTÃO: Pesquisar via MAC (Ícone de Servidor/Rack)
                {
                    id: 'btn-mac',
                    title: 'Pesquisar via MAC',
                    icon: '<path d="M2 9c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V9zm2 0v4h16V9H4zm0-6c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V3zm2 0v4h16V3H4zm0 12c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-4zm2 0v4h16v-4H4z M6 5h2v2H6V5zm0 6h2v2H6v-2zm0 6h2v2H6v-2z"/>',
                    action: () => this.toggleMacPanel()
                },

                { id: 'btn-location', title: 'Localização', icon: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>', action: () => this.handleLocationAction() },
                { id: 'btn-settings', title: 'Configurações', icon: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L5.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>', action: () => this.toggleSettingsPanel() }
            ];

            buttons.forEach(btnData => {
                const btn = document.createElement('button');
                btn.className = this.config.buttonsClass;
                btn.title = btnData.title;
                btn.id = btnData.id;
                btn.innerHTML = `<svg viewBox="0 0 24 24">${btnData.icon}</svg>`;

                if (btnData.action) {
                    btn.addEventListener('click', (e) => {
                        // Lógica de Toggle visual apenas para painéis
                        if (btnData.id !== 'btn-location') {
                            const isActive = btn.classList.contains('active');
                            if (!isActive) {
                                btn.classList.add('active');
                                btnData.action(true);
                            } else {
                                btn.classList.remove('active');
                                btnData.action(false);
                            }
                        } else {
                            // Botão de localização tem lógica própria
                            btnData.action();
                        }
                    });
                }
                sidebar.appendChild(btn);
            });
            document.body.appendChild(sidebar);
        },

        createMacPanel: function() {
            if (document.getElementById('geogrid-tools-mac-panel')) return;

            const panel = document.createElement('div');
            panel.id = 'geogrid-tools-mac-panel';
            panel.className = 'gg-panel';
            panel.style.width = '550px'; // Um pouco mais largo para as 2 colunas

            const header = document.createElement('div');
            header.className = 'gg-panel-header';
            header.innerHTML = `<span>Pesquisar via MAC</span><span class="gg-panel-close">×</span>`;

            const content = document.createElement('div');
            content.className = 'gg-panel-content';
            content.style.padding = '0'; // Custom padding no container interno

            // Estrutura HTML do Painel
            content.innerHTML = `
                <div class="gg-mac-container">
                    <div class="gg-mac-col-left">
                        <div id="gg-mac-paste-area" class="gg-paste-area" contenteditable="true">
                            Clique aqui e cole a imagem do Serial (Ctrl+V)
                        </div>
                        <div id="gg-mac-status" style="font-size:11px; color:#f1c40f; text-align:center; min-height:15px;"></div>
                        <canvas id="gg-mac-debug-canvas"></canvas>
                    </div>

                    <div class="gg-mac-col-right">
                        <div class="gg-info-field">
                            <label>MAC / Serial</label>
                            <input type="text" id="gg-input-mac" placeholder="---" readonly style="font-weight:bold; color:var(--gg-accent);">
                        </div>
                        <div class="gg-info-field">
                            <label>Cliente</label>
                            <input type="text" id="gg-input-cliente" placeholder="Aguardando..." readonly>
                        </div>
                        <div class="gg-info-field">
                            <label>Contrato</label>
                            <input type="text" id="gg-input-contrato" placeholder="Aguardando..." readonly>
                        </div>
                        <div class="gg-info-field">
                            <label>Rede</label>
                            <input type="text" id="gg-input-rede" placeholder="Aguardando..." readonly>
                        </div>
                    </div>
                </div>
            `;

            panel.append(header, content);
            document.body.appendChild(panel);

            // Eventos do Painel
            header.querySelector('.gg-panel-close').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMacPanel(false);
                const btn = document.getElementById('btn-mac');
                if(btn) btn.classList.remove('active');
            });

            this.makeDraggable(panel, header);
            this.makeResizable(panel);

            // --- LÓGICA DE OCR INTEGRADA ---
            const pasteArea = content.querySelector('#gg-mac-paste-area');
            const statusText = content.querySelector('#gg-mac-status');
            const inputMAC = content.querySelector('#gg-input-mac');
            const debugCanvas = content.querySelector('#gg-mac-debug-canvas');

            // Listener de Colagem
            pasteArea.addEventListener('paste', (e) => {
                const clipboardData = (e.clipboardData || e.originalEvent.clipboardData);
                const items = clipboardData.items;

                // 1. TENTA IMAGEM (Prioridade)
                for (let index in items) {
                    const item = items[index];
                    if (item.kind === 'file' && item.type.includes('image')) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        this.processOcrImage(blob, statusText, inputMAC, debugCanvas);
                        return; // Encerra aqui se for imagem
                    }
                }

                // 2. TENTA TEXTO (Se não for imagem)
                const pastedText = clipboardData.getData('text');
                if (pastedText) {
                    e.preventDefault();
                    // Passa o texto para processamento manual
                    this.processManualText(pastedText, statusText, inputMAC);
                }
            });

            // Focus helper
            pasteArea.addEventListener('focus', () => {
                if(pasteArea.innerText.includes("Clique")) pasteArea.innerText = "";
            });
        },

        processManualText: function(textRaw, statusEl, outputEl) {
            statusEl.innerText = "Texto detectado...";
            statusEl.style.color = "var(--gg-accent)";

            this.clearMacFields(); // Limpa campos antigos

            // Limpeza básica (Uppercase + remove espaços/quebras de linha)
            let cleanText = textRaw.toUpperCase().replace(/[\n\r\s]+/g, '');

            // Tenta aplicar a mesma lógica de Regex do OCR para garantir formatação
            // (Ex: se o cara colar "FHTT 09F..." ou um texto sujo, o extrator arruma)
            // Se o extrator retornar null (ex: texto curto demais), usamos o texto limpo original.
            const sn = this.extractSNFromText(cleanText) || cleanText;

            outputEl.value = sn;

            // Inicia a busca imediatamente
            statusEl.innerText = "Buscando na Jupiter...";
            statusEl.style.color = "#74b9ff"; // Azul

            this.fetchJupiterData(sn, statusEl);
        },

        processOcrImage: async function(imageBlob, statusEl, outputEl, canvasEl) {
            statusEl.innerText = "Processando imagem...";
            statusEl.style.color = "var(--gg-accent)";
            outputEl.value = "...";

            // Limpa campos anteriores
            this.clearMacFields();

            try {
                // 1. Pré-processamento
                const processedImageURL = await this.preprocessImage(imageBlob, canvasEl);

                statusEl.innerText = "Lendo texto (OCR)...";

                // 2. Tesseract
                if (typeof Tesseract === 'undefined') {
                    throw new Error("Tesseract não carregado.");
                }

                const { data: { text } } = await Tesseract.recognize(processedImageURL, 'eng', {
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    tessedit_pageseg_mode: '6'
                });

                // 3. Extração e Regex
                const sn = this.extractSNFromText(text);

                if (sn) {
                    outputEl.value = sn;
                    statusEl.innerText = "Buscando na Jupiter...";
                    statusEl.style.color = "#74b9ff"; // Azul

                    // --- NOVO: Chama a busca externa ---
                    this.fetchJupiterData(sn, statusEl);

                } else {
                    statusEl.innerText = "SN não identificado.";
                    statusEl.style.color = "#ff7675";
                }

            } catch (err) {
                console.error(err);
                statusEl.innerText = "Erro OCR.";
                statusEl.style.color = "#ff7675";
            }
        },

        preprocessImage: function(blob, canvas) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });

                    // Zoom para melhorar leitura
                    const targetWidth = 2500;
                    const scale = targetWidth / img.width;
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Filtro de Níveis (Levels)
                    for (let i = 0; i < data.length; i += 4) {
                        const g = data[i + 1]; // Green Channel
                        let gray = 255 - g; // Inverter

                        // Contraste
                        if (gray < 50) gray = 0;
                        else if (gray > 180) gray = 255;
                        else {
                            gray = (gray - 50) * (255 / (180 - 50));
                        }
                        data[i] = gray;
                        data[i + 1] = gray;
                        data[i + 2] = gray;
                    }
                    ctx.putImageData(imageData, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 1.0));
                };
                img.src = URL.createObjectURL(blob);
            });
        },

        extractSNFromText: function(fullText) {
            let cleanText = fullText.toUpperCase().replace(/[\n\r\s]+/g, '');
            cleanText = cleanText.replace(/O/g, '0'); // Fix comum

            // Regra 1: FHTT perfeito
            let match = cleanText.match(/FHTT[0-9A-Z]{8,12}/);
            if (match) return match[0];

            // Regra 2: Prefixo quebrado (Ex: HTT..., TT...)
            match = cleanText.match(/(?:HTT|TT|FHIT|EHIT)[0-9A-Z]{8,12}/);
            if (match) {
                const suffix = match[0].replace(/^[A-Z]+/, '');
                return "FHTT" + suffix;
            }

            // Regra 3: Sufixo Hexadecimal (Ex: 09F...)
            match = cleanText.match(/[0-9]{2}[0-9A-F]{6,10}/);
            if (match && match[0].length >= 8) {
                return "FHTT" + match[0];
            }

            return null;
        },

        toggleMacPanel: function(force) {
            this.createMacPanel();
            this.toggleGeneric('geogrid-tools-mac-panel', force);
            // Auto focus na área de colagem ao abrir
            const p = document.getElementById('geogrid-tools-mac-panel');
            if (p && p.style.display !== 'none') {
                setTimeout(() => {
                    const area = document.getElementById('gg-mac-paste-area');
                    if(area) area.focus();
                }, 100);
            }
        },

        // Limpa os inputs
        clearMacFields: function() {
            document.getElementById('gg-input-cliente').value = "";
            document.getElementById('gg-input-contrato').value = "";
            document.getElementById('gg-input-rede').value = "";
        },

        // PASSO 1: Busca MAC para pegar Contrato e Rede
        fetchJupiterData: function(mac, statusEl) {
            // Limpa formatação caso venha sujo
            const macClean = mac.trim();
            const url = `https://viaradio.jupiter.com.br/painel.php?adm=onus&np=10&p=1&t=1&valorbusca=${macClean}&tipo=3`;

            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (response) => {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, "text/html");

                        // Pega a primeira linha de dados
                        const row = doc.querySelector('table tbody tr');

                        if (row) {
                            const cells = row.querySelectorAll('td');
                            // Validação básica de colunas
                            if (cells.length >= 6) {
                                // Coluna 2 (índice 2): Contrato (Ex: 61273)
                                const contratoId = cells[2].textContent.trim();

                                // Coluna 5 (índice 5): Rede (Ex: Dorgival 04)
                                // O usuário indicou a "quinta coluna", no HTML fornecido anteriormente o índice 5 bate com a rede.
                                const nomeRede = cells[5].textContent.trim();

                                console.log(`[GeoGrid] MAC encontrado. Contrato: ${contratoId}, Rede: ${nomeRede}`);

                                // Preenche o que já temos
                                document.getElementById('gg-input-contrato').value = contratoId;
                                document.getElementById('gg-input-rede').value = nomeRede;

                                // PASSO 2: Busca o Nome do Cliente
                                statusEl.innerText = "Buscando nome...";
                                this.fetchCustomerName(contratoId, statusEl);

                            } else {
                                throw new Error("Tabela MAC fora do padrão.");
                            }
                        } else {
                            statusEl.innerText = "MAC não encontrado.";
                            statusEl.style.color = "#ffeaa7"; // Amarelo
                            document.getElementById('gg-input-contrato').value = "---";
                        }
                    } catch (e) {
                        console.error(e);
                        statusEl.innerText = "Erro ao ler dados.";
                        statusEl.style.color = "#ff7675";
                    }
                },
                onerror: () => {
                    statusEl.innerText = "Erro conexão Jupiter.";
                    statusEl.style.color = "#ff7675";
                }
            });
        },

        // PASSO 2: Busca Contrato para pegar Nome do Cliente
        fetchCustomerName: function(contratoId, statusEl) {
            const url = `https://viaradio.jupiter.com.br/painel.php?adm=gerenciarusuarios&np=5&p=1&t=&valorbusca=${contratoId}&tipo=2`;

            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (response) => {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, "text/html");

                        // Procura linha que tenha dados (geralmente tem checkbox ou cor de fundo)
                        // O seletor pega a primeira TR dentro do TBODY
                        const row = doc.querySelector('table tbody tr');

                        if (row) {
                            const cells = row.querySelectorAll('td');

                            // O usuário informou que a segunda coluna é o nome.
                            // Estrutura HTML observada: td[0]=check, td[1]=id, td[2]=Nome
                            if (cells.length >= 3) {
                                const nomeCliente = cells[2].textContent.trim();

                                document.getElementById('gg-input-cliente').value = nomeCliente;

                                statusEl.innerText = "Concluído!";
                                statusEl.style.color = "#00b894"; // Verde
                            } else {
                                statusEl.innerText = "Nome não localizado na tabela.";
                            }
                        } else {
                            // Caso raro: achou no menu ONU mas não achou no Gerenciar Usuários
                            statusEl.innerText = "Cliente não cadastrado?";
                            statusEl.style.color = "#fab1a0";
                        }
                    } catch (e) {
                        console.error(e);
                        statusEl.innerText = "Erro ao ler nome.";
                    }
                },
                onerror: () => {
                    statusEl.innerText = "Erro conexão Nome.";
                }
            });
        },

        // --- Helpers: Drag & Resize ---
        makeDraggable: function(el, handle) {
            let isDragging = false, startX, startY, initialLeft, initialTop;
            handle.addEventListener('mousedown', (e) => {
                if (e.target.closest('.gg-header-btn') || e.target.closest('.gg-panel-close')) return;
                isDragging = true; startX = e.clientX; startY = e.clientY;
                initialLeft = el.offsetLeft; initialTop = el.offsetTop;
                el.style.width = getComputedStyle(el).width; el.style.height = getComputedStyle(el).height; el.style.right = 'auto';
                el.style.cursor = 'grabbing'; document.body.style.userSelect = 'none';
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                el.style.left = `${initialLeft + (e.clientX - startX)}px`;
                el.style.top = `${initialTop + (e.clientY - startY)}px`;
            });
            document.addEventListener('mouseup', () => {
                if(isDragging) { isDragging = false; el.style.cursor = 'default'; document.body.style.userSelect = ''; }
            });
        },

        makeResizable: function(el) {
            const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
            directions.forEach(dir => {
                const resizer = document.createElement('div');
                resizer.className = `gg-resizer ${dir}`;
                el.appendChild(resizer);
                resizer.addEventListener('mousedown', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const startX = e.clientX, startY = e.clientY;
                    const startW = parseInt(document.defaultView.getComputedStyle(el).width, 10);
                    const startH = parseInt(document.defaultView.getComputedStyle(el).height, 10);
                    const startL = el.offsetLeft, startT = el.offsetTop;

                    const onMouseMove = (eMove) => {
                        const dx = eMove.clientX - startX, dy = eMove.clientY - startY;
                        if (dir.includes('e')) el.style.width = `${startW + dx}px`;
                        else if (dir.includes('w')) { el.style.width = `${startW - dx}px`; el.style.left = `${startL + dx}px`; }
                        if (dir.includes('s')) el.style.height = `${startH + dy}px`;
                        else if (dir.includes('n')) { el.style.height = `${startH - dy}px`; el.style.top = `${startT + dy}px`; }
                    };

                    const onMouseUp = () => {
                        // NOVO: Usuário mexeu, bloqueia o auto-resize para esta sessão
                        this.isManuallyResized = true;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
                });
            });
        },

        calculateSmartPosition: function(panelEl) {
            const sidebarWidth = 60, gap = 15;
            let currentRightEdge = sidebarWidth;
            const visiblePanels = Array.from(document.querySelectorAll('.gg-panel')).filter(p => p.id !== panelEl.id && p.style.display === 'flex');
            visiblePanels.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
            for (let p of visiblePanels) {
                const rect = p.getBoundingClientRect();
                if ((window.innerWidth - rect.right) < (currentRightEdge + gap + 5)) {
                    currentRightEdge = window.innerWidth - rect.left;
                }
            }
            panelEl.style.transform = 'none'; panelEl.style.right = 'auto';
            const panelWidth = panelEl.offsetWidth || 350;
            panelEl.style.left = (window.innerWidth - (currentRightEdge + panelWidth + gap)) + 'px';
            panelEl.style.top = '150px';
        },

        // --- Helper: Normalize String for Comparison ---
        normalizeNetworkName: function(name) {
            // Remove prefixos numéricos (ex: "127 - ") e espaços extras
            return name ? name.replace(/^\d+\s*-\s*/, "").trim().toLowerCase() : "";
        },

        // --- RENDER LOGIC (v3.3.0 - Final Version) ---
        renderClientList: function() {
            const panel = document.getElementById(this.config.mainPanelId);
            const contentDiv = panel ? panel.querySelector('.gg-panel-content') : null;
            if (!contentDiv) return;

            contentDiv.innerHTML = '';

            // Configurações
            const showName = window.__hudState__.exibirNomeCliente;
            const highlightDivergent = window.__hudState__.destacarRedesDivergentes;

            // 1. Mapeamento Global de Redes (Para verificar divergência corretamente)
            const validNetworksInBox = new Set();
            if (ultimaAPI?.dados?.nome_rede) {
                const r = this.normalizeNetworkName(ultimaAPI.dados.nome_rede);
                if(r) validNetworksInBox.add(r);
            }
            equipamentosOrdem.forEach(id => {
                const eq = equipamentosInfo[id];
                if (eq && eq.nomeRede) {
                    const r = this.normalizeNetworkName(eq.nomeRede);
                    if(r) validNetworksInBox.add(r);
                }
            });

            // Ordenação Visual (Por Demanda sempre no topo)
            const ordemVisual = [...equipamentosOrdem].sort((a, b) => {
                if (a === '__porDemanda__') return -1;
                if (b === '__porDemanda__') return 1;
                return 0;
            });

            let hasContent = false;

            ordemVisual.forEach(equipId => {
                const equip = equipamentosInfo[equipId];
                if (!equip) return;

                const isDemanda = equipId === '__porDemanda__';
                const qtdClientes = equip.clientes ? equip.clientes.length : 0;

                // Filtros de Exibição (Vazios ou muito pequenos, exceto Demanda)
                if (!equip.clientes || qtdClientes === 0) return;
                if (!isDemanda && qtdClientes < 8) return;

                hasContent = true;

                const group = document.createElement('div');
                group.style.cssText = "margin-bottom: 12px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;";

                // --- HEADER DO EQUIPAMENTO ---
                const groupHeader = document.createElement('div');
                groupHeader.className = 'gg-group-header';
                // Estilo flex para separar título do botão de sinal
                groupHeader.style.cssText = `padding: 6px 10px; background: var(--gg-header-bg); font-weight: 600; font-size: 12px; color: var(--gg-text); border-left: 3px solid var(--gg-accent); display: flex; justify-content: space-between; align-items: center; cursor: pointer;`;

                // Título + Quantidade
                const nomeRedeEquip = equip.nomeRede || "Rede Desconhecida";
                const labelQtd = isDemanda ? "Demanda" : `${qtdClientes} Portas`;
                const titleSpan = document.createElement('span');
                titleSpan.innerHTML = `${nomeRedeEquip} <span style="font-size:10px; opacity:0.7">(${labelQtd})</span>`;

                // Botão de Sinal (Novo)
                const btnSignal = document.createElement('button');
                btnSignal.className = 'gg-header-btn';
                btnSignal.title = "Verificar Sinal (Segure Ctrl para todos)";
                btnSignal.innerHTML = '<svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.4-4.4 11.6-4.4 16 0l2-2C16.8-2.8 7.2-2.8 1 9zm8 8l3 3 3-3c-1.6-1.6-4.4-1.6-6 0zm-4-4l2 2c2.2-2.2 5.8-2.2 8 0l2-2c-3.3-3.3-8.7-3.3-12 0z"/></svg>';
                btnSignal.style.cssText = "padding: 2px; height: 20px; width: 20px; min-width: 20px;";

                // Ação do Botão de Sinal
                btnSignal.onclick = (e) => {
                    e.stopPropagation(); // Impede que o grupo minimize ao clicar no botão
                    const isBatch = e.ctrlKey; // Verifica se CTRL está pressionado
                    this.verifySignal(equipId, isBatch, btnSignal);
                };

                // Montagem do Header
                groupHeader.appendChild(titleSpan);
                groupHeader.appendChild(btnSignal);

                // Ação de Minimizar (Accordion)
                groupHeader.onclick = (e) => {
                    // Segurança extra: só minimiza se o alvo não for o botão
                    if (e.target !== btnSignal && !btnSignal.contains(e.target)) {
                        const c = group.querySelector('.gg-group-content');
                        c.style.display = c.style.display === 'none' ? 'block' : 'none';
                        // Reajusta altura do painel após animação
                        setTimeout(() => this.adjustPanelHeight(), 50);
                    }
                };
                group.appendChild(groupHeader);

                // --- CONTEÚDO (LISTA DE CLIENTES) ---
                const groupContent = document.createElement('div');
                groupContent.className = 'gg-group-content';
                group.appendChild(groupContent);

                const clientesOrdenados = [...equip.clientes].sort((a,b) => {
                    if (isDemanda) return 0;
                    return parseInt(a.porta) - parseInt(b.porta);
                });

                clientesOrdenados.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'gg-client-row';
                    // Adiciona ID ao dataset para facilitar atualização individual via DOM
                    row.dataset.clientId = item.id || "";
                    row.style.cssText = "display: flex; align-items: center; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; transition: background 0.2s; cursor: pointer;";

                    // Eventos da Linha
                    row.onmouseover = () => row.style.backgroundColor = "var(--gg-hover)";
                    row.onmouseout = () => row.style.backgroundColor = "transparent";
                    row.onclick = () => row.classList.toggle('strikethrough'); // Taxar

                    let statusColor = '#b2bec3'; // Cinza (Livre)
                    let mainText = item.status || 'Livre';
                    let subText = '';

                    if (item.id && infoClientes[item.id]) {
                        const dados = infoClientes[item.id].data;
                        const reg = dados.registro || {};
                        const nomeFull = reg.nome || "Desconhecido";
                        const redeClienteRaw = dados.rede?.rede || "";

                        // Parse: "123 - Contrato - Nome (Status)"
                        const parts = nomeFull.split(' - ');
                        let contrato = "ID: " + item.id;
                        let nomeReal = nomeFull;

                        if (parts.length >= 3) {
                            contrato = parts[1];
                            nomeReal = parts.slice(2).join(' - ').replace(/\(ATIVO\)|\(SUSPENSO\)|\(CANCELADO\)/g, '').trim();
                        }

                        // Tratamento do Nome da Rede do Cliente
                        const redeLimpa = redeClienteRaw.replace(/Card \d+ Porta \d+$/i, "").trim();
                        const displayRede = redeLimpa ? ` - ${redeLimpa}` : "";

                        // Define Texto Principal
                        mainText = `${contrato}${displayRede}`;

                        // Define Subtexto (Nome ou Vazio dependendo da config)
                        if (showName) {
                            subText = nomeReal;
                        }

                        // Cores por Status
                        if (nomeFull.includes('ATIVO')) statusColor = '#55efc4'; // Verde
                        else if (nomeFull.includes('SUSPENSO')) statusColor = '#ffeaa7'; // Amarelo
                        else if (nomeFull.includes('CANCELADO')) statusColor = '#ff7675'; // Vermelho
                        else statusColor = '#55efc4';

                        // Verificação de Divergência
                        if (highlightDivergent && !isDemanda) {
                            const clientRedeNorm = this.normalizeNetworkName(redeLimpa);
                            if (clientRedeNorm.length > 0) {
                                let matchFound = false;
                                // Verifica se a rede do cliente existe na "Whitelist" da caixa
                                for (let boxNet of validNetworksInBox) {
                                    if (clientRedeNorm.includes(boxNet) || boxNet.includes(clientRedeNorm)) {
                                        matchFound = true; break;
                                    }
                                }
                                if (!matchFound) row.classList.add('network-divergent');
                            }
                        }

                    } else if (item.id) {
                        statusColor = '#74b9ff'; // Azul (Carregando)
                        mainText = "Carregando...";
                        subText = `ID: ${item.id}`;
                    } else {
                        // Sem cliente (Portas Vazias ou Especiais)
                        if (item.status === 'Ocupada') statusColor = '#ffeaa7';
                        if (item.status === 'Reservada') statusColor = '#74b9ff';
                        if (item.status === 'Bloqueada') statusColor = '#ff7675';
                    }

                    // --- LÓGICA DE CACHE DE SINAL ---
                    // Se já existe sinal verificado para este cliente, exibe NO LUGAR do nome
                    let subTextColor = 'var(--gg-text)';
                    let subTextOpacity = '0.7';
                    let subTextWeight = 'normal';

                    if (item.id && this.currentBox.signalCache && this.currentBox.signalCache[item.id]) {
                        const cache = this.currentBox.signalCache[item.id];
                        subText = cache.text; // Ex: "-20.50 dBm"
                        subTextColor = cache.color; // Cor baseada na qualidade
                        subTextOpacity = '1';
                        subTextWeight = 'bold';
                    }
                    // --------------------------------

                    const dot = `<span style="width: 8px; height: 8px; background: ${statusColor}; border-radius: 50%; display: inline-block; margin-right: 10px; flex-shrink: 0;"></span>`;
                    const portNum = `<strong style="color: var(--gg-accent); margin-right: 10px; min-width: 20px;">${item.porta}</strong>`;

                    // Montagem HTML da Linha
                    let contentHTML = '';
                    if (subText) {
                        contentHTML = `
                            <div style="display:flex; flex-direction:column; line-height: 1.3;">
                                <span style="color: var(--gg-text); font-weight:600;">${mainText}</span>
                                <span class="gg-client-subtext" style="color: ${subTextColor}; opacity: ${subTextOpacity}; font-weight: ${subTextWeight}; font-size: 11px;">${subText}</span>
                            </div>`;
                    } else {
                        // Se não tem subtexto (Nome oculto e sem sinal), ajusta cor do principal
                        const color = item.id ? 'var(--gg-text)' : '#636e72';
                        const style = item.id ? 'font-weight:600;' : 'font-style: italic;';
                        contentHTML = `<span style="color: ${color}; ${style}">${mainText}</span>`;
                    }

                    row.innerHTML = dot + portNum + contentHTML;
                    groupContent.appendChild(row);
                });

                contentDiv.appendChild(group);
            });

            if (!hasContent) {
                contentDiv.innerHTML += '<div class="gg-empty-state">Caixa vazia ou sem equipamentos compatíveis.</div>';
            }

            this.adjustPanelHeight();
        },

        // --- PANELS ---
        createMainPanel: function() {
            if (document.getElementById(this.config.mainPanelId)) return;

            const panel = document.createElement('div');
            panel.id = this.config.mainPanelId;
            panel.className = 'gg-panel';

            // Header
            const header = document.createElement('div');
            header.className = 'gg-panel-header';

            const title = document.createElement('span');
            title.textContent = 'Clientes';

            const controls = document.createElement('div');
            controls.className = 'gg-panel-controls';

            // --- BOTÃO PESQUISAR ---
            const btnSearch = document.createElement('button');
            btnSearch.className = 'gg-header-btn';
            btnSearch.title = "Pesquisar";
            btnSearch.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';

            btnSearch.onclick = (e) => {
                e.stopPropagation();
                const searchBar = panel.querySelector('.gg-search-container');
                const input = panel.querySelector('.gg-search-input');

                if (searchBar.style.display === 'none' || searchBar.style.display === '') {
                    searchBar.style.display = 'block';
                    input.focus();
                    btnSearch.style.color = this.config.accentColor;
                } else {
                    searchBar.style.display = 'none';
                    this.searchQuery = ""; // Limpa busca ao fechar
                    input.value = "";
                    this.renderClientList(); // Restaura lista
                    btnSearch.style.color = "";
                }
                this.adjustPanelHeight(); // Ajusta altura com a nova barra
            };

            // --- BOTÃO COPIAR (CORRIGIDO PARA HTTP) ---
            const btnCopy = document.createElement('button');
            btnCopy.className = 'gg-header-btn';
            btnCopy.title = "Copiar lista";
            btnCopy.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';

            btnCopy.onclick = (e) => {
                e.stopPropagation();

                // Reconstrói a lista de texto baseada nos dados visíveis
                const linhasParaCopiar = [];
                const config = window.__hudState__; // Pega configurações atuais

                // Itera sobre a ordem visual dos equipamentos
                equipamentosOrdem.forEach(equipId => {
                    const equip = equipamentosInfo[equipId];
                    if (!equip || !equip.clientes) return;

                    equip.clientes.forEach(item => {
                        // Se for para copiar apenas cancelados e o status não for cancelado, pula
                        // Nota: A lógica de filtro do status depende de como você guarda o status.
                        // Aqui simplifiquei para copiar o que está renderizado se tiver dados.

                        if (item.id && infoClientes[item.id]) {
                            const dados = infoClientes[item.id].data;
                            const reg = dados.registro || {};
                            const nomeFull = reg.nome || "Desconhecido";

                            // Lógica de Filtro (Opcional, baseada nas configs)
                            if (config.somenteCancelados && !nomeFull.includes('CANCELADO') && !nomeFull.includes('Desativado')) {
                                return;
                            }

                            // Formatação da linha
                            let textoLinha = "";
                            const parts = nomeFull.split(' - ');
                            const contrato = parts.length >= 2 ? parts[1].trim() : item.id;

                            textoLinha += contrato;

                            if (config.exibirNomeCliente) {
                                let nomeReal = parts.slice(2).join(' - ').replace(/\(ATIVO\)|\(SUSPENSO\)|\(CANCELADO\)/g, '').trim();
                                if(nomeReal) textoLinha += ` - ${nomeReal}`;
                            }

                            if (config.copiarStatus) {
                                const matchStatus = nomeFull.match(/\((ATIVO|CANCELADO|SUSPENSO)\)/i);
                                const status = matchStatus ? matchStatus[1] : "Indefinido";
                                textoLinha += ` (${status})`;
                            }

                            if (config.copiarNomeRede) {
                                const rede = (dados.rede?.rede || "").replace(/Card \d+ Porta \d+$/i, "").trim();
                                if(rede) textoLinha += ` || ${rede}`;
                            }

                            linhasParaCopiar.push(textoLinha);
                        }
                    });
                });

                if (linhasParaCopiar.length > 0) {
                    this.copyTextSimple(linhasParaCopiar.join("\n"), "Lista copiada!");
                } else {
                    this.showToastGeneric("Nenhum cliente para copiar (verifique filtros).", "#ffeaa7");
                }
            };

            const btnClose = document.createElement('button');
            btnClose.className = 'gg-header-btn close-btn';
            btnClose.title = "Fechar";
            btnClose.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
            btnClose.onclick = (e) => {
                e.stopPropagation();
                this.toggleMainPanel(false);
                const btn = document.getElementById('btn-clients');
                if(btn) btn.classList.remove('active');
            };

            controls.appendChild(btnSearch);
            controls.appendChild(btnCopy);
            controls.appendChild(btnClose);
            header.appendChild(title);
            header.appendChild(controls);

            // -- Search Container --
            const searchContainer = document.createElement('div');
            searchContainer.className = 'gg-search-container';
            const searchInput = document.createElement('input');
            searchInput.className = 'gg-search-input';
            searchInput.placeholder = "Filtrar por nome, contrato ou porta...";

            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderClientList(); // Re-renderiza com filtro
            });

            searchContainer.appendChild(searchInput);

            // -- Content --
            const content = document.createElement('div');
            content.className = 'gg-panel-content';
            content.innerHTML = '<div class="gg-empty-state">Aguardando dados...</div>';

            // -- Toast (Hidden) --
            const toast = document.createElement('div');
            toast.className = 'gg-toast';
            toast.textContent = 'Copiado!';

            panel.appendChild(header);
            panel.appendChild(searchContainer);
            panel.appendChild(content);
            panel.appendChild(toast); // Add toast to panel
            document.body.appendChild(panel);

            this.makeDraggable(panel, header);
            this.makeResizable(panel);
        },

        createNotesPanel: function() {
            if (document.getElementById('geogrid-tools-notes-panel')) return;
            const panel = document.createElement('div'); panel.id = 'geogrid-tools-notes-panel'; panel.className = 'gg-panel';
            const header = document.createElement('div'); header.className = 'gg-panel-header'; header.innerHTML = `<span>Anotações</span><span class="gg-panel-close">&times;</span>`;

            const content = document.createElement('div'); content.style.cssText = "flex-grow: 1; display: flex; flex-direction: column;";
            const textarea = document.createElement('textarea'); textarea.className = 'gg-notes-area'; textarea.placeholder = "Digite aqui...";

            const saved = localStorage.getItem('geogrid_notes_content'); if(saved) textarea.value = saved;
            textarea.addEventListener('input', () => localStorage.setItem('geogrid_notes_content', textarea.value));

            content.appendChild(textarea); panel.append(header, content); document.body.appendChild(panel);
            header.querySelector('.gg-panel-close').addEventListener('click', (e) => { e.stopPropagation(); this.toggleNotesPanel(false); document.getElementById('btn-notes').classList.remove('active'); });
            this.makeDraggable(panel, header); this.makeResizable(panel);
        },

        createSettingsPanel: function() {
            if (document.getElementById('geogrid-tools-settings-panel')) return;
            const panel = document.createElement('div'); panel.id = 'geogrid-tools-settings-panel'; panel.className = 'gg-panel';
            const header = document.createElement('div'); header.className = 'gg-panel-header'; header.innerHTML = `<span>Configurações</span><span class="gg-panel-close">&times;</span>`;

            const content = document.createElement('div'); content.className = 'gg-panel-content';

            const createToggle = (label, key, def) => {
                const row = document.createElement('label'); row.className = 'gg-setting-row';
                const lbl = document.createElement('span'); lbl.className = 'gg-setting-label'; lbl.textContent = label;
                const inp = document.createElement('input'); inp.type = 'checkbox'; inp.className = 'gg-toggle-switch';
                inp.checked = (window.__hudState__ && window.__hudState__.hasOwnProperty(key)) ? window.__hudState__[key] : def;
                inp.addEventListener('change', () => {
                    if(window.__hudState__) { window.__hudState__[key] = inp.checked; if(key === 'modoClaro') this.applyTheme(); saveSettings(); }
                });
                row.append(lbl, inp); return row;
            };

            const sec1 = document.createElement('div'); sec1.className = 'gg-settings-group-title'; sec1.textContent = 'Interface';
            content.append(sec1,
                createToggle("Modo Claro", "modoClaro", false),
                createToggle("Informações no GeoGrid", "exibirInfoDiagrama", false),
                createToggle("Ocultar Topo/Rodapé", "removerIndesejado", true),
                createToggle("Limitar Tamanho Vertical (Auto)", "limitarAlturaPainel", true),
                createToggle("Exibir Nome do Cliente", "exibirNomeCliente", true),
                createToggle("Destacar Redes Divergentes", "destacarRedesDivergentes", true)
            );

            const sec2 = document.createElement('div'); sec2.className = 'gg-settings-group-title'; sec2.textContent = 'Área de Transferência';
            content.append(sec2,
                createToggle("Incluir Nome da Rede", "copiarNomeRede", false),
                createToggle("Incluir Status", "copiarStatus", true),
                createToggle("Apenas Cancelados", "somenteCancelados", true)
            );

            const sec3 = document.createElement('div'); sec3.className = 'gg-settings-group-title'; sec3.textContent = 'Localização';
            content.append(sec3,
                createToggle("Copiar Coordenadas (vs Link)", "copiarCoordenadas", false),
                createToggle("Abrir em Nova Guia", "abrirNovaGuia", false)
            );

            panel.append(header, content); document.body.appendChild(panel);
            header.querySelector('.gg-panel-close').addEventListener('click', (e) => { e.stopPropagation(); this.toggleSettingsPanel(false); document.getElementById('btn-settings').classList.remove('active'); });
            this.makeDraggable(panel, header); this.makeResizable(panel);
        },

        resetPanelState: function() {
            this.isManuallyResized = false; // Destrava o redimensionamento
            this.currentBox.title = "Carregando...";
            this.currentBox.data = [];
            this.setLoadingState();

            // Se o painel estiver aberto, força um ajuste imediato para o tamanho mínimo
            const panel = document.getElementById(this.config.mainPanelId);
            if (panel && panel.style.display === 'flex') {
                panel.style.height = 'auto'; // Reseta altura visual
            }
        },

        adjustPanelHeight: function() {
            const panel = document.getElementById(this.config.mainPanelId);

            // Regra: Só redimensiona se o painel existir, estiver visível E o usuário não tiver mexido manualmente
            if (!panel || panel.style.display === 'none' || this.isManuallyResized) return;

            const contentDiv = panel.querySelector('.gg-panel-content');
            const header = panel.querySelector('.gg-panel-header');
            if (!contentDiv || !header) return;

            const limitHeight = window.__hudState__.limitarAlturaPainel;

            // 1. Reseta a altura para 'auto' para o navegador calcular o scrollHeight real do conteúdo
            // Importante: salvamos a largura para evitar flickers visuais estranhos
            const currentWidth = panel.style.width;
            panel.style.height = 'auto';
            panel.style.width = currentWidth;

            // 2. Calcula altura necessária
            const headerHeight = header.offsetHeight;
            const contentHeight = contentDiv.scrollHeight;
            const paddingBuffer = 24; // Um pouco mais de respiro

            const desiredHeight = headerHeight + contentHeight + paddingBuffer;

            // 3. Aplica limites (Mínimo 470px solicitado)
            const minHeight = 470;
            const maxHeight = limitHeight ? 560 : (window.innerHeight - 50);

            // Lógica: Pega o maior entre (Desejado e Mínimo), mas trava no Máximo
            const finalHeight = Math.min(Math.max(desiredHeight, minHeight), maxHeight);

            panel.style.height = finalHeight + 'px';
        },

        // --- LOCATION & CAPTURE LOGIC ---
        handleLocationAction: function() {
            // Verifica se a caixa está aberta
            const caixaAbertaEl = document.querySelector('.padrao-painel-flutuante.painel-modulo-container-diagramas.ui-draggable');

            if (caixaAbertaEl && caixaAbertaEl.style.display !== 'none') {
                // MODO 1: Caixa Aberta -> Usa a variável global 'localizacao' (Lógica Antiga)
                if (localizacao && localizacao.length === 2) {
                    this.processCoordinates(localizacao[0], localizacao[1], "Localização da caixa copiada!");
                } else {
                    // Fallback visual se não tiver capturado ainda
                    this.showToastGeneric("Erro: Passe o mouse sobre a caixa para capturar as coordenadas.", "#ff7675");
                }
            } else {
                // MODO 2: Nenhuma caixa -> Alternar Modo de Captura
                this.toggleMapCapture();
            }
        },

        // --- Variáveis para o Escudo ---
        toggleMapCapture: function() {
            const gw = unsafeWindow;
            const mapInstance = gw.__googleMapInstancia__;
            const btn = document.getElementById('btn-location');

            if (!mapInstance) {
                // Tenta recuperar se o mapa foi carregado tardiamente
                if (gw.map && gw.map instanceof gw.google.maps.Map) {
                    gw.__googleMapInstancia__ = gw.map;
                    this.toggleMapCapture();
                    return;
                }
                this.showToastGeneric("Mapa não detectado. Tente mover o mapa.", "#ff7675");
                return;
            }

            if (this.isCapturing) {
                // --- DESATIVAR ---
                this.isCapturing = false;
                btn.classList.remove('capturing', 'active');

                // Remove o Escudo
                if (this.captureShield) {
                    this.captureShield.setMap(null);
                    this.captureShield = null;
                }
                if (this.shieldUpdater) {
                    gw.google.maps.event.removeListener(this.shieldUpdater);
                    this.shieldUpdater = null;
                }

                console.log("[GeoGrid Tools] Modo de captura desativado.");

            } else {
                // --- ATIVAR ---
                this.isCapturing = true;
                btn.classList.add('capturing', 'active');
                this.showToastGeneric("Clique no mapa para capturar...", "#0984e3");

                // Cria o Escudo de Vidro (Rectangle)
                // Cobre a visão atual do mapa para interceptar cliques
                const bounds = mapInstance.getBounds();

                this.captureShield = new gw.google.maps.Rectangle({
                    bounds: bounds,
                    map: mapInstance,
                    fillColor: '#ffffff',
                    fillOpacity: 0,       // Invisível
                    strokeOpacity: 0,     // Invisível
                    zIndex: 2147483647,   // Máximo possível (acima dos postes)
                    clickable: true,
                    cursor: 'crosshair'   // Mira
                });

                // Atualiza o escudo se o usuário arrastar o mapa
                this.shieldUpdater = gw.google.maps.event.addListener(mapInstance, 'bounds_changed', () => {
                    if (this.captureShield) {
                        this.captureShield.setBounds(mapInstance.getBounds());
                    }
                });

                // O clique acontece no escudo, não no poste
                gw.google.maps.event.addListener(this.captureShield, 'click', (event) => {
                    const lat = event.latLng.lat();
                    const lng = event.latLng.lng();

                    this.processCoordinates(lat, lng, "Coordenadas capturadas!");
                    this.toggleMapCapture(); // Sai automaticamente
                });
            }
        },

        processCoordinates: function(lat, lng, msg) {
            const settings = window.__hudState__;
            let text = "";

            if (settings.copiarCoordenadas) {
                text = `${lat}, ${lng}`;
            } else {
                // Link padrão Google Maps
                text = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            }

            if (settings.abrirNovaGuia && !settings.copiarCoordenadas) {
                window.open(text, '_blank');
            } else {
                this.copyTextSimple(text, msg);
            }
        },

        copyTextSimple: function(text, msg) {
            // Cria um elemento textarea invisível
            const textArea = document.createElement("textarea");
            textArea.value = text;

            // Garante que o elemento não seja visível mas faça parte do DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);

            textArea.focus();
            textArea.select();

            try {
                // Comando antigo que funciona em HTTP
                const successful = document.execCommand('copy');
                if (successful) {
                    this.showToastGeneric(msg || "Copiado!", "#00b894");
                } else {
                    this.showToastGeneric("Falha ao copiar.", "#ff7675");
                }
            } catch (err) {
                console.error('Erro ao copiar:', err);
                this.showToastGeneric("Erro ao copiar.", "#ff7675");
            } finally {
                document.body.removeChild(textArea);
            }
        },

        showToastGeneric: function(msg, color = 'var(--gg-accent)') {
            let toast = document.getElementById('gg-quick-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'gg-quick-toast';
                toast.style.cssText = "position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; z-index: 10000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); transition: opacity 0.3s; pointer-events: none;";
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.background = color;
            toast.style.opacity = '1';
            setTimeout(() => { toast.style.opacity = '0'; }, 2500);
        },

        // --- TOGGLES ---
        toggleMainPanel: function(force) {
            this.createMainPanel();
            const panel = document.getElementById(this.config.mainPanelId);
            const show = (typeof force !== 'undefined') ? force : (panel.style.display !== 'flex');

            if (show) {
                panel.style.display = 'flex';
                this.calculateSmartPosition(panel);

                // CORREÇÃO: Força a renderização dos dados que já estão em memória
                // Garante que se a caixa foi aberta antes do painel, os dados apareçam agora.
                this.renderClientList();

                // Força o recálculo da altura após a renderização
                requestAnimationFrame(() => {
                    this.adjustPanelHeight();
                });

                panel.style.zIndex = ++this.zIndexCounter;
                document.getElementById('btn-clients').classList.add('active');
            } else {
                panel.style.display = 'none';
                document.getElementById('btn-clients').classList.remove('active');
            }
        },
        toggleNotesPanel: function(force) { this.createNotesPanel(); this.toggleGeneric('geogrid-tools-notes-panel', force); },
        toggleSettingsPanel: function(force) { this.createSettingsPanel(); this.toggleGeneric('geogrid-tools-settings-panel', force); },

        toggleGeneric: function(id, force) {
            const el = document.getElementById(id); const show = (typeof force !== 'undefined') ? force : (el.style.display !== 'flex');
            el.style.display = show ? 'flex' : 'none'; if(show) { this.calculateSmartPosition(el); el.style.zIndex = ++this.zIndexCounter; }
        },

        toggleVisibility: function() {
            const sb = document.getElementById(this.config.sidebarId);
            sb.style.display = (sb.style.display === 'flex') ? 'none' : 'flex';
        },

        // --- SIGNAL CHECKER LOGIC (Updated for Divergence Feedback) ---
        verifySignal: async function(targetEquipId, isBatchMode, btnElement) {
            // 1. Verifica Cancelamento
            if (sinalSearchController) {
                sinalSearchController.abort();
                sinalSearchController = null;
                this.showToastGeneric("Parando...", "#ff7675");
                return;
            }

            // 2. Coleta clientes
            const clientsToCheck = [];
            const equipIdsToCheck = isBatchMode ? equipamentosOrdem : [targetEquipId];

            equipIdsToCheck.forEach(eqId => {
                const equip = equipamentosInfo[eqId];
                if (!equip || !equip.clientes) return;

                equip.clientes.forEach(item => {
                    if (!item.id || !infoClientes[item.id]) return;

                    const dados = infoClientes[item.id].data;
                    const nomeFull = dados.registro?.nome || "";

                    // Regra: Apenas ATIVOS
                    if (!nomeFull.includes("ATIVO")) return;

                    const redeClienteRaw = dados.rede?.rede || "";
                    const redeClienteLimpa = this.normalizeNetworkName(redeClienteRaw.replace(/Card \d+ Porta \d+$/i, ""));
                    const redeEquipLimpa = this.normalizeNetworkName(equip.nomeRede);

                    // Verificação de Divergência
                    if (eqId !== '__porDemanda__' && redeClienteLimpa && !redeClienteLimpa.includes(redeEquipLimpa)) {
                        // ATUALIZAÇÃO: Mostra mensagem de erro visual ao invés de ignorar
                        this.updateClientSignalUI(item.id, "Rede Divergente", "#ff7675", "bold");
                        return; // Não adiciona na fila de fetch
                    }

                    clientsToCheck.push({
                        id: item.id,
                        contrato: item.id,
                        nomeOriginal: nomeFull
                    });
                });
            });

            if (clientsToCheck.length === 0) {
                this.showToastGeneric("Nenhum cliente apto.", "#b2bec3");
                return;
            }

            // 3. Prepara UI e Controle
            sinalSearchController = new AbortController();
            const signal = sinalSearchController.signal;

            if(btnElement) {
                if(!btnElement.dataset.originalHtml) btnElement.dataset.originalHtml = btnElement.innerHTML;
                // Ícone de Stop
                btnElement.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>';
                btnElement.classList.add('active');
                btnElement.style.color = "#ff7675";
            }

            const total = clientsToCheck.length;
            let completed = 0;
            this.showToastGeneric(`Iniciando ${total} verificações...`, "#0984e3");

            // 4. Executor de Tarefa (Wrapper)
            const runTask = async (client) => {
                if (signal.aborted) return;

                this.updateClientSignalUI(client.id, "...", "#74b9ff", "bold");

                try {
                    const result = await this.fetchSignal(client, signal);
                    if (signal.aborted) return;

                    let color = "#b2bec3";
                    let text = result.sinal;
                    let weight = "normal";

                    if (text.includes("dBm")) {
                         const val = parseFloat(text);
                         if (!isNaN(val)) {
                             weight = "bold";
                             if (val < -24.30) color = "#ffeaa7";
                             else color = "#55efc4";
                         }
                    } else {
                        color = "#ff7675";
                    }

                    if(!this.currentBox.signalCache) this.currentBox.signalCache = {};
                    this.currentBox.signalCache[client.id] = { text, color };

                    this.updateClientSignalUI(client.id, text, color, weight);

                } catch (err) {
                    if (!signal.aborted) this.updateClientSignalUI(client.id, "Erro", "#ff7675");
                } finally {
                    completed++;
                }
            };

            // 5. Gerenciador de Concorrência
            const CONCURRENCY = 6;
            const queue = [...clientsToCheck];
            const activeWorkers = [];

            const next = () => {
                if (queue.length === 0 || signal.aborted) return Promise.resolve();
                const client = queue.shift();
                return runTask(client).then(() => next());
            };

            for (let i = 0; i < CONCURRENCY; i++) {
                activeWorkers.push(next());
            }

            await Promise.all(activeWorkers);

            // 6. Finalização
            sinalSearchController = null;
            if(btnElement) {
                if(btnElement.dataset.originalHtml) btnElement.innerHTML = btnElement.dataset.originalHtml;
                btnElement.classList.remove('active');
                btnElement.style.color = "";
            }

            if(!signal.aborted) this.showToastGeneric(`Concluído: ${completed}/${total}`, "#00b894");
        },

        fetchSignal: async function(client, signal) {
            // Lógica portada do script antigo (v4.6)
            // 1. Busca na lista geral para pegar ID da ONU
            const parts = client.nomeOriginal.split(' - ');
            let contrato = client.id;
            let nomeBusca = "";

            if (parts.length >= 3) {
                contrato = parts[1].trim();
                nomeBusca = parts.slice(2).join(' - ').replace(/\(ATIVO\)/, "").trim();
            }

            // Clean text helper
            const clean = (t) => t ? t.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
            const targetName = clean(nomeBusca);
            const searchTerms = targetName.split(" ").slice(0, 2);

            // Fetch 1: Search Panel
            const searchUrl = `${JUPITER_API_SEARCH}?adm=gerenciarusuarios&np=5&p=1&t=&valorbusca=${contrato}&tipo=2`;

            const searchResp = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET", url: searchUrl, timeout: 20000,
                    onload: resolve, onerror: reject, ontimeout: reject
                });
            });

            if(signal.aborted) throw new Error("Aborted");

            // Parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(searchResp.responseText, "text/html");
            const rows = doc.querySelectorAll('tr[onu]');
            let onuId = null;

            for (const row of rows) {
                const rowText = clean(row.textContent);
                // Validação frouxa: se contém os termos principais
                if (searchTerms.every(term => rowText.includes(term))) {
                    onuId = row.getAttribute('onu');
                    break;
                }
            }

            if (!onuId) return { sinal: "Não encontrado / Divergente" };

            // Fetch 2: Dados Técnicos
            const onusResp = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET", url: `${JUPITER_API_ONUS}?id=${onuId}`, timeout: 15000,
                    onload: resolve, onerror: reject
                });
            });

            const jsonOnus = JSON.parse(onusResp.responseText);
            if (!jsonOnus.onus || jsonOnus.onus.length === 0) return { sinal: "Sem dados ONU" };

            const dadosOnus = jsonOnus.onus[0];

            // Fetch 3: Sinal
            const params = new URLSearchParams();
            for (const key in dadosOnus) params.append(key, dadosOnus[key]);
            if(!params.has('id')) params.append('id', onuId);

            const signalResp = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET", url: `${JUPITER_API_SIGNAL}?${params.toString()}`, timeout: 45000,
                    onload: resolve, onerror: reject
                });
            });

            const jsonSignal = JSON.parse(signalResp.responseText);
            return { sinal: jsonSignal.sinal || "Sem Leitura" };
        },

        updateClientSignalUI: function(clientId, text, color) {
            // Atualiza o DOM diretamente para performance
            // Procura o elemento de subtexto do cliente
            // Como não temos IDs nos elementos DOM, buscamos pelo contexto
            // Hack: Vamos adicionar um data-id na renderização para facilitar
            const row = document.querySelector(`.gg-client-row[data-client-id="${clientId}"]`);
            if (row) {
                const subTextEl = row.querySelector('.gg-client-subtext');
                if (subTextEl) {
                    subTextEl.textContent = text;
                    subTextEl.style.color = color;
                    subTextEl.style.fontWeight = "bold";
                }
            }
        },

        createEquipmentPanel: function() {
            if (document.getElementById('gg-equipment-panel')) return;

            const panel = document.createElement('div');
            panel.id = 'gg-equipment-panel';
            panel.className = 'gg-panel';
            panel.style.width = '600px';
            panel.style.height = 'auto';
            panel.style.display = 'flex';

            const header = document.createElement('div');
            header.className = 'gg-panel-header';
            header.innerHTML = `<span>Cadastro Rápido</span><span class="gg-panel-close">×</span>`;

            const content = document.createElement('div');
            content.className = 'gg-panel-content';

            // --- CONTEÚDO COM ESTRUTURA PARA AUTOCOMPLETE ---
            content.innerHTML = `
                <div class="gg-section-title">Geral</div>
                <div class="gg-btn-group">
                    <div class="gg-input-group">
                        <label>Rede:</label>
                        <input type="text" id="gg-equip-rede" placeholder="Digite para buscar..." autocomplete="off">
                        <div id="gg-rede-suggestions" class="gg-autocomplete-suggestions"></div>
                    </div>
                    <button class="gg-toggle-btn" data-type="ponte">Ponte</button>
                    <button class="gg-toggle-btn" data-type="rede_1x2">1x2 Rede</button>
                </div>

                <div class="gg-section-title">Splitter 1x2</div>
                <div class="gg-btn-group">
                    <button class="gg-toggle-btn" data-type="1x2_5/95">5/95</button>
                    <button class="gg-toggle-btn" data-type="1x2_10/90">10/90</button>
                    <button class="gg-toggle-btn" data-type="1x2_15/85">15/85</button>
                    <button class="gg-toggle-btn" data-type="1x2_20/80">20/80</button>
                    <button class="gg-toggle-btn" data-type="1x2_30/70">30/70</button>
                    <button class="gg-toggle-btn" data-type="1x2_50/50">50/50</button>
                </div>

                <div class="gg-section-title">Splitter 1x8</div>
                <div class="gg-btn-group">
                    <button class="gg-toggle-btn" data-type="1x8_cliente">Cliente</button>
                    <button class="gg-toggle-btn" data-type="1x8_expansao">Expansão</button>
                </div>

                <div class="gg-footer-actions">
                    <button class="gg-action-btn danger" id="gg-btn-cancel">Cancelar</button>
                    <button class="gg-action-btn" id="gg-btn-default">Tela Padrão</button>
                    <button class="gg-action-btn primary" id="gg-btn-confirm">Confirmar</button>
                </div>
            `;

            panel.appendChild(header);
            panel.appendChild(content);
            document.body.appendChild(panel);

            // Posiciona no centro
            panel.style.left = (window.innerWidth - 600) / 2 + 'px';
            panel.style.top = '150px';

            this.makeDraggable(panel, header);

            // --- REFERÊNCIAS ---
            const inputRede = content.querySelector('#gg-equip-rede');
            const suggestionsBox = content.querySelector('#gg-rede-suggestions');

            // --- EVENTOS GERAIS ---
            header.querySelector('.gg-panel-close').onclick = () => panel.remove();
            content.querySelector('#gg-btn-cancel').onclick = () => panel.remove();

            const toggles = content.querySelectorAll('.gg-toggle-btn');
            toggles.forEach(btn => {
                btn.onclick = () => btn.classList.toggle('active');
            });

            content.querySelector('#gg-btn-default').onclick = () => {
                window.__hudFallbackActive__ = true;
                panel.remove();
                const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
                if (gw.jQuery) {
                    gw.jQuery('.adicionar-equipamento-recipiente').click();
                }

                // Segurança: Se por algum motivo o clique falhar, remove a flag após 1s
                setTimeout(() => { window.__hudFallbackActive__ = false; }, 1000);
            };

            // --- LÓGICA DE AUTOCOMPLETE (COM DEBOUNCE) ---
            const handleRedeSearch = () => {
                const term = inputRede.value.trim();

                // Limpa ID se o usuário mudou o texto
                if (inputRede.dataset.lastTerm !== term) {
                    inputRede.dataset.redeId = "";
                }

                if (term.length < 3) {
                    suggestionsBox.style.display = 'none';
                    return;
                }

                suggestionsBox.style.display = 'block';
                suggestionsBox.innerHTML = '<div class="gg-suggestion-item loading">Buscando...</div>';

                // Chama a API do Jupiter
                GM_xmlhttpRequest({
                    method: "GET",
                    url: `https://api.jupiter.com.br/view/Redes/retornarRedesFibra?rede=${encodeURIComponent(term)}`,
                    onload: (res) => {
                        try {
                            const json = JSON.parse(res.responseText);
                            suggestionsBox.innerHTML = '';

                            if (json.redes && json.redes.length > 0) {
                                json.redes.forEach(rede => {
                                    const div = document.createElement('div');
                                    div.className = 'gg-suggestion-item';
                                    div.textContent = `${rede.id} - ${rede.descricao}`;
                                    div.onclick = () => {
                                        inputRede.value = `${rede.id} - ${rede.descricao}`;
                                        inputRede.dataset.redeId = rede.id; // SALVA O ID
                                        inputRede.dataset.lastTerm = inputRede.value;
                                        suggestionsBox.style.display = 'none';
                                    };
                                    suggestionsBox.appendChild(div);
                                });
                            } else {
                                suggestionsBox.innerHTML = '<div class="gg-suggestion-item loading">Nenhuma rede encontrada</div>';
                            }
                        } catch (e) {
                            suggestionsBox.innerHTML = '<div class="gg-suggestion-item loading">Erro na API</div>';
                        }
                    },
                    onerror: () => {
                        suggestionsBox.innerHTML = '<div class="gg-suggestion-item loading">Erro de conexão</div>';
                    }
                });
            };

            // Aplica o Debounce (espera 400ms após parar de digitar)
            const debouncedRedeSearch = debounce(handleRedeSearch, 400);
            inputRede.addEventListener('input', debouncedRedeSearch);

            // Fecha sugestões ao clicar fora
            document.addEventListener('click', (e) => {
                if (!inputRede.contains(e.target) && !suggestionsBox.contains(e.target)) {
                    suggestionsBox.style.display = 'none';
                }
            });


            // --- LÓGICA DO BOTÃO CONFIRMAR ---
            content.querySelector('#gg-btn-confirm').onclick = async (e) => {
                const btn = e.target;
                const originalText = btn.textContent;

                const nomeRedeVisual = inputRede.value.trim();
                const idRedeSelecionada = inputRede.dataset.redeId || "";

                const ativos = Array.from(content.querySelectorAll('.gg-toggle-btn.active'));

                if (ativos.length === 0) {
                    this.showToastGeneric("Selecione ao menos um equipamento.", "#ff7675");
                    return;
                }
                if (!ultimoCodigoEquipamentoPai) {
                    this.showToastGeneric("Erro: Equipamento Pai não detectado.", "#ff7675");
                    return;
                }
                if (!window.ultimoCodigoPoste) {
                    this.showToastGeneric("Erro: Código do Poste não capturado. Passe o mouse no poste.", "#ff7675");
                    return;
                }

                // Validações de Rede
                const tipos = ativos.map(b => b.dataset.type);
                if ((tipos.includes('1x8_expansao') || tipos.includes('rede_1x2')) && !nomeRedeVisual) {
                    this.showToastGeneric("Nome da Rede obrigatório para Expansão/1x2.", "#ff7675");
                    return;
                }
                if (tipos.includes('1x8_cliente') && !idRedeSelecionada) {
                    this.showToastGeneric("Para Splitter Cliente, selecione uma rede da lista.", "#ff7675");
                    return;
                }

                try {
                    btn.disabled = true;
                    btn.textContent = "Verificando...";

                    // 1. Carrega dados atuais do diagrama (para checar duplicidade de nomes)
                    const checkParams = new URLSearchParams();
                    checkParams.append('controlador', 'diagrama');
                    checkParams.append('metodo', 'carregarCabosEquipamentos');
                    checkParams.append('codigo', ultimoCodigoEquipamentoPai);
                    checkParams.append('idRazaoSocial', '46');

                    const checkResp = await fazerRequisicaoDaPagina(
                        "php/diagramaJson/api.php",
                        checkParams.toString(),
                        "Check Inicial"
                    );

                    const checkData = JSON.parse(checkResp.response);
                    const existingEquips = checkData.equipamentos || [];
                    const existingCables = checkData.cabosJson || []; // Pontes aparecem aqui
                    const codigoPoste = window.ultimoCodigoPoste;

                    const payloads = [];

                    // =================================================================================
                    // LÓGICA DA PONTE (CABO DE LIGAÇÃO)
                    // =================================================================================
                    if (tipos.includes('ponte')) {
                        btn.textContent = "Validando Ponte...";

                        // 1. Verifica se já existe
                        if (existingCables.some(c => c.sigla && c.sigla.toLowerCase().includes('ponte'))) {
                            throw new Error("Já existe uma ponte neste poste.");
                        }

                        // 2. Busca acessórios do poste (CE e TA)
                        const paramsAcc = new URLSearchParams();
                        paramsAcc.append('idRazaoSocial', '46');
                        paramsAcc.append('poste', 'PT' + codigoPoste); // A API exige o prefixo PT

                        const respAcc = await fazerRequisicaoDaPagina(
                            "php/acessorios/carregaAcessoriosPoste.php",
                            paramsAcc.toString(),
                            "Busca Acessórios"
                        );

                        const dataAcc = JSON.parse(respAcc.response);
                        const listaAcessorios = dataAcc.dados || [];

                        // 3. Tenta encontrar 1 Caixa (CE) e 1 Terminal (TA)
                        const itemCE = listaAcessorios.find(d => d.cd && d.cd.startsWith('CE'));
                        const itemTA = listaAcessorios.find(d => d.cd && d.cd.startsWith('TA'));

                        if (!itemCE || !itemTA) {
                            throw new Error("Para criar Ponte, o poste precisa ter 1 Caixa (CE) e 1 Terminal (TA).");
                        }

                        // 4. Monta o payload da Ponte (cadastraCaboLigacao.php)
                        const siglaPonte = `ponte ${codigoPoste}`;
                        const pPonte = new URLSearchParams();
                        pPonte.append('idRazaoSocial', '46');
                        pPonte.append('codigoEmpresa', 'JPT');
                        pPonte.append('poste', 'PT' + codigoPoste);
                        pPonte.append('sigla', siglaPonte);
                        pPonte.append('codigo', siglaPonte); // Sim, envia igual a sigla
                        pPonte.append('dataDeInstalacao', getTodayDate());
                        pPonte.append('tipo_cabo', '12 Fibras AS 120'); // Padrão hardcoded do antigo script
                        pPonte.append('pontaA', itemCE.cd); // ID da Caixa
                        pPonte.append('pontaB', itemTA.cd); // ID do Terminal
                        pPonte.append('ponta_a', '0'); // Índices visuais (padrão)
                        pPonte.append('ponta_b', '1');
                        pPonte.append('obs', '');

                        payloads.push({
                            url: "php/cabos/cadastraCaboLigacao.php", // URL diferente!
                            data: pPonte.toString(),
                            sigla: siglaPonte
                        });
                    }

                    // =================================================================================
                    // LÓGICA DOS SPLITTERS (EQUIPAMENTOS)
                    // =================================================================================
                    for (const btnEl of ativos) {
                        const type = btnEl.dataset.type;
                        if (type === 'ponte') continue; // Já processado acima

                        let id_equip = '157';
                        let baseSigla = '';
                        let extensao = 'true';
                        let payloadRedeId = "";
                        let payloadNomeRede = "";

                        if (type.startsWith('1x8')) {
                            id_equip = '159';
                            if (type.includes('cliente')) {
                                baseSigla = `spl cl. ${codigoPoste}`;
                                extensao = 'false';
                                payloadRedeId = idRedeSelecionada;
                                payloadNomeRede = nomeRedeVisual;
                            } else {
                                baseSigla = `spl exp. ${nomeRedeVisual.toUpperCase()}`;
                                payloadRedeId = "";
                                payloadNomeRede = nomeRedeVisual;
                            }
                        } else if (type.startsWith('1x2')) {
                            const ratio = btnEl.textContent.trim();
                            baseSigla = `spl ${ratio} ${codigoPoste}`;
                        } else if (type === 'rede_1x2') {
                            baseSigla = `1/2 ${nomeRedeVisual.toUpperCase()}`;
                            payloadNomeRede = nomeRedeVisual;
                        }

                        const keywords = baseSigla.includes('spl') ? ['spl'] : ['1/2'];
                        const siglaFinal = findNextSigla(baseSigla, keywords, existingEquips);
                        if (!siglaFinal) throw new Error(`Limite atingido para ${baseSigla}`);

                        const p = new URLSearchParams();
                        p.append('codigo', ultimoCodigoEquipamentoPai);
                        p.append('idRazaoSocial', '46');
                        p.append('codigoEmpresa', 'JPT');
                        p.append('id_equipamento', id_equip);
                        p.append('extensao', extensao);
                        p.append('rede', payloadRedeId);
                        p.append('nome_rede', payloadNomeRede);
                        p.append('sigla', siglaFinal);
                        p.append('obs', '');
                        p.append('ip', '');
                        p.append('projeto', 'false');
                        p.append('nomeUsuario', 'jhonvictor');
                        p.append('razaoSocial', 'Jupiter Telecomunicações');

                        payloads.push({
                            url: "php/diagramaJson/salvaEquipamentos.php",
                            data: p.toString(),
                            sigla: siglaFinal
                        });
                    }

                    // --- EXECUÇÃO ---
                    btn.textContent = `Salvando (${payloads.length})...`;

                    // Processa a fila sequencialmente
                    for (const item of payloads) {
                        await fazerRequisicaoDaPagina(item.url, item.data, item.sigla);
                    }

                    btn.textContent = "Atualizando...";
                    const gw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
                    if (gw.abreDiagrama) {
                        gw.abreDiagrama(ultimoCodigoEquipamentoPai, '46');
                        setTimeout(() => {
                            gw.jQuery('.button.botao-inserir-todos').click();
                            this.showToastGeneric("Sucesso!", "#00b894");
                            panel.remove();
                        }, 800);
                    } else {
                        this.showToastGeneric("Salvo! Recarregue.", "#ffeaa7");
                        panel.remove();
                    }

                } catch (err) {
                    console.error(err);
                    this.showToastGeneric(err.message || "Erro ao salvar", "#ff7675");
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
            };
        },

        bindGlobalEvents: function() {
            // ... (listeners de keydown e mousedown mantidos) ...
            document.addEventListener('keydown', (e) => { if(e.code === 'NumpadAdd') { e.preventDefault(); this.toggleVisibility(); }});
            document.addEventListener('mousedown', (e) => { const p = e.target.closest('.gg-panel'); if(p) p.style.zIndex = ++this.zIndexCounter; });

            // LISTENERS DO HYBRID ENGINE
            document.addEventListener('hud:structureLoad', (e) => {
                const data = JSON.parse(e.detail);

                // NOVO: Resetar flag de redimensionamento manual para a nova caixa
                this.isManuallyResized = false;

                this.currentBox.title = data.titulo;
                this.currentBox.data = data.equipamentos;

                // Renderiza (se estiver fechado, apenas atualiza o HTML interno)
                this.renderClientList();
            });

            document.addEventListener('hud:clientData', (e) => {
                // ... (mantido igual) ...
                const client = JSON.parse(e.detail);
                this.currentBox.clientCache[client.id] = client.nome;
                this.renderClientList();
            });

            document.addEventListener('click', (e) => {
                // Procura pelo botão nativo de adicionar equipamento
                const btn = e.target.closest('.adicionar-equipamento-recipiente');

                if (btn) {
                    // Verifica se a flag de fallback está ativa (quando clicamos em "Tela Padrão")
                    if (window.__hudFallbackActive__) {
                        return; // Deixa o site agir normalmente
                    } else {
                        e.preventDefault();
                        e.stopPropagation();

                        // Abre nosso painel
                        this.createEquipmentPanel();
                    }
                }
            }, true); // Use capture (true) para pegar o evento antes do site/jQuery
        }
    };

    UIManager.init();

})();
