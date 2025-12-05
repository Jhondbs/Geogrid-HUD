// ==UserScript==
// @name         GeoGrid Tools (Loader)
// @namespace    http://tampermonkey.net/
// @version      7.2
// @description  Carregador Modular do Sistema Geogrid
// @author       Jhon
// @match        http://172.16.6.57/geogrid/aconcagua/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-end
// @downloadURL https://github.com/Jhondbs/Geogrid-HUD/raw/refs/heads/main/Geo%20Grid%20Maps%20HUD%20(Atalho)-1.3.user.js
// @updateURL https://github.com/Jhondbs/Geogrid-HUD/raw/refs/heads/main/Geo%20Grid%20Maps%20HUD%20(Atalho)-1.3.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log("[GeoGrid Loader] Inicializando...");

    // --- PONTE DE PERMISSÕES (IMPORTANTE) ---
    // Expõe as funções do Tampermonkey para os scripts modulares
    unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;
    //unsafeWindow.GM_setClipboard = GM_setClipboard;

    // CONFIGURAÇÃO DA REDE
    const BASE_URL = "http://172.16.6.23/mapas/dados/Geogrid%20Clientes%20-%20Jhon/scripts/";

    const MODULES = [
        "style.css",
        "core.js",
        "interceptors.js",
        "features.js",
        "ui.js",
        "map_viewer.js"
    ];

    function loadCSS(url) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url + "?t=" + new Date().getTime();
        document.head.appendChild(link);
    }

    function loadNextScript(index) {
        if (index >= MODULES.length) {
            console.log("[GeoGrid Loader] Sistema carregado.");
            return;
        }

        const file = MODULES[index];
        const url = BASE_URL + file + "?t=" + new Date().getTime();

        if (file.endsWith(".css")) {
            loadCSS(url);
            loadNextScript(index + 1);
            return;
        }

        console.log(`[Loader] Baixando: ${file}`);

        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const script = document.createElement("script");
                        script.textContent = response.responseText;
                        document.body.appendChild(script);
                        loadNextScript(index + 1);
                    } catch (e) {
                        console.error(`[Loader] Erro em ${file}:`, e);
                    }
                } else {
                    console.error(`[Loader] Falha 404 em ${file}`);
                }
            }
        });
    }

    loadNextScript(0);

})();
