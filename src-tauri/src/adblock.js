(function() {  
    'use strict';  
      
    if (window.__ADBLOCK_INJECTED__) {  
        console.log('🛡️ AdBlock: Script already injected, skipping');  
        return;  
    }  
    window.__ADBLOCK_INJECTED__ = true;  
    console.log('🛡️ AdBlock: Starting injection into', window.location.href);  
      
    const nativeFetch = window.fetch;  
    const nativeXHR = window.XMLHttpRequest;  
      
    const WHITELIST = [];  
      
    function isWhitelisted(url) {  
        return WHITELIST.some(domain => url.includes(domain));  
    }  
      
    // ✅ Cache simplificado  
    const blockCache = new Map();  
    const CACHE_TTL = 86400000; // 1 día  
    const MAX_CACHE_SIZE = 1000;  
      
    let invoke = null;  
    let adblockReady = false;  
    let cosmeticStyleElement = null;  
      
    async function init() {  
        console.log('🛡️ AdBlock: [INIT] Starting initialization...');  
          
        let attempts = 0;  
        while (!window.__TAURI__?.core?.invoke && attempts < 100) {  
            await new Promise(r => setTimeout(r, 50));  
            attempts++;  
        }  
          
        if (!window.__TAURI__?.core?.invoke) {  
            console.error('🛡️ AdBlock: [INIT] ❌ Failed to initialize Tauri API after', attempts, 'attempts');  
            return false;  
        }  
          
        console.log('🛡️ AdBlock: [INIT] ✅ Tauri API found after', attempts, 'attempts');  
        invoke = window.__TAURI__.core.invoke;  
          
        // Esperar a que el engine esté listo  
        attempts = 0;  
        while (!adblockReady && attempts < 50) {  
            try {  
                adblockReady = await invoke('is_adblock_ready');  
                console.log('🛡️ AdBlock: [INIT] Engine ready check (attempt', attempts + 1, '):', adblockReady);  
                  
                if (!adblockReady) {  
                    await new Promise(r => setTimeout(r, 200));  
                    attempts++;  
                }  
            } catch (e) {  
                console.error('🛡️ AdBlock: [INIT] Error checking engine status:', e);  
                await new Promise(r => setTimeout(r, 200));  
                attempts++;  
            }  
        }  
          
        if (!adblockReady) {  
            console.warn('🛡️ AdBlock: [INIT] ⚠️ Engine failed to initialize after', attempts, 'attempts');  
            return false;  
        }  
          
        console.log('🛡️ AdBlock: [INIT] ✅ Engine ready! Applying cosmetic filters...');  
          
        // ✅ Aplicar filtros cosméticos  
        await applyCosmeticFilters();  
          
        console.log('🛡️ AdBlock: [INIT] ✅ Initialization complete');  
        return true;  
    }  
      
    // ✅ Aplicar filtros cosméticos  
    async function applyCosmeticFilters() {  
        if (!adblockReady || !invoke) {  
            console.log('🛡️ AdBlock: [COSMETIC] Skipping - engine not ready');  
            return;  
        }  
          
        try {  
            console.log('🛡️ AdBlock: [COSMETIC] Fetching cosmetic resources for', window.location.href);  
            const resources = await invoke('get_cosmetic_resources', {  
                url: window.location.href  
            });  
              
            console.log('🛡️ AdBlock: [COSMETIC] Received resources:', {  
                hideSelectors: resources.hide_selectors?.length || 0,  
                exceptions: resources.exceptions?.length || 0,  
                hasInjectedScript: !!resources.injected_script,  
                proceduralActions: resources.procedural_actions?.length || 0  
            });  
              
            // Aplicar hide_selectors  
            if (resources.hide_selectors && resources.hide_selectors.length > 0) {  
                if (!cosmeticStyleElement) {  
                    cosmeticStyleElement = document.createElement('style');  
                    cosmeticStyleElement.id = '__adblock_cosmetic_filters__';  
                    document.head.appendChild(cosmeticStyleElement);  
                }  
                  
                cosmeticStyleElement.textContent = resources.hide_selectors.map(s =>   
                    `${s} { display: none !important; }`  
                ).join('\n');  
                  
                console.log('🛡️ AdBlock: [COSMETIC] Applied', resources.hide_selectors.length, 'hide selectors');  
            }  
              
            // Inyectar script  
            if (resources.injected_script) {  
                const script = document.createElement('script');  
                script.textContent = resources.injected_script;  
                document.documentElement.appendChild(script);  
                script.remove();  
                console.log('🛡️ AdBlock: [COSMETIC] Injected scriptlet');  
            }  
        } catch (e) {  
            console.error('🛡️ AdBlock: [COSMETIC] Error applying cosmetic filters:', e);  
        }  
    }  
      
    async function checkUrl(url, type) {  
        if (!adblockReady || !url ||   
            url.startsWith('data:') ||   
            url.startsWith('blob:') ||  
            url.startsWith('tauri://') ||  
            url.startsWith('ipc://') ||  
            isWhitelisted(url)) {  
            return false;  
        }  
          
        const cacheKey = `${url}|${type}`;  
        const cached = blockCache.get(cacheKey);  
          
        if (cached && (Date.now() - cached.time < CACHE_TTL)) {  
            return cached.blocked;  
        }  
          
        try {  
            const blocked = await invoke('is_url_blocked', {  
                url,  
                sourceUrl: window.location.href,  
                requestType: type  
            });  
              
            blockCache.set(cacheKey, {  
                blocked,  
                time: Date.now()  
            });  
              
            // ✅ Limpieza simple de caché  
            if (blockCache.size > MAX_CACHE_SIZE) {  
                const now = Date.now();  
                for (const [key, value] of blockCache.entries()) {  
                    if (now - value.time > CACHE_TTL) {  
                        blockCache.delete(key);  
                    }  
                }  
                  
                // Si aún hay muchas, eliminar las más antiguas  
                if (blockCache.size > MAX_CACHE_SIZE) {  
                    const entries = Array.from(blockCache.entries());  
                    entries.sort((a, b) => a[1].time - b[1].time);  
                    const toRemove = entries.slice(0, blockCache.size - MAX_CACHE_SIZE);  
                    toRemove.forEach(([key]) => blockCache.delete(key));  
                }  
            }  
              
            if (blocked) {  
                console.log('🛡️ AdBlock: [BLOCK]', type, url);  
            }  
              
            return blocked;  
        } catch (e) {  
            console.error('🛡️ AdBlock: [ERROR] Failed to check URL:', e);  
            return false;  
        }  
    }  
      
    // ✅ Detección mejorada de IPC  
    function isIpcRequest(url) {  
        return url.startsWith('tauri://') ||  
               url.startsWith('ipc://') ||  
               url.includes('__TAURI_IPC__');  
    }  
      
    // Interceptar fetch  
    window.fetch = async function(...args) {  
        const url = args[0];  
        const urlStr = typeof url === 'string' ? url : (url?.url || '');  
          
        if (isIpcRequest(urlStr)) {  
            return nativeFetch.apply(this, args);  
        }  
          
        const options = args[1] || {};  
        if (options.method === 'OPTIONS') {  
            return nativeFetch.apply(this, args);  
        }  
          
        if (await checkUrl(urlStr, 'fetch')) {  
            return new Response('', { status: 200 });  
        }  
          
        return nativeFetch.apply(this, args);  
    };  
      
    // Interceptar XMLHttpRequest  
    window.XMLHttpRequest = function() {  
        const xhr = new nativeXHR();  
        const originalOpen = xhr.open;  
        const originalSend = xhr.send;  
        let requestUrl = '';  
          
        xhr.open = function(method, url, ...rest) {  
            requestUrl = url;  
            return originalOpen.apply(this, [method, url, ...rest]);  
        };  
          
        xhr.send = async function(...args) {  
            if (requestUrl &&   
                !isIpcRequest(requestUrl) &&  
                await checkUrl(requestUrl, 'xhr')) {  
                setTimeout(() => {  
                    Object.defineProperty(xhr, 'status', { value: 200 });  
                    Object.defineProperty(xhr, 'readyState', { value: 4 });  
                    if (xhr.onload) xhr.onload(new Event('load'));  
                }, 0);  
                return;  
            }  
            return originalSend.apply(this, args);  
        };  
          
        return xhr;  
    };  
      
    // Observer para elementos dinámicos  
    const observer = new MutationObserver(mutations => {  
        if (!adblockReady) return;  
          
        for (const mutation of mutations) {  
            for (const node of mutation.addedNodes) {  
                if (node.nodeType !== 1) continue;  
                  
                const tag = node.tagName?.toLowerCase();  
                  
                if (!['script', 'iframe', 'img', 'link'].includes(tag)) continue;  
                  
                const src = node.src || node.href || node.getAttribute('src') || node.getAttribute('href');  
                if (!src || isWhitelisted(src) || isIpcRequest(src)) continue;  
                  
                checkUrl(src, tag).then(blocked => {  
                    if (blocked && node.parentNode) {  
                        node.remove();  
                    }  
                });  
            }  
        }  
    });  
      
    observer.observe(document.documentElement, {  
        childList: true,  
        subtree: true  
    });  
      
    // Iniciar  
    init().then(success => {  
        if (success) {  
            console.log('🛡️ AdBlock: ✅ Fully operational');  
        } else {  
            console.warn('🛡️ AdBlock: ⚠️ Initialization incomplete');  
        }  
    });  
      
    // Limpieza periódica de caché  
    setInterval(() => {  
        const now = Date.now();  
        let removed = 0;  
        for (const [key, value] of blockCache.entries()) {  
            if (now - value.time > CACHE_TTL) {  
                blockCache.delete(key);  
                removed++;  
            }  
        }  
        if (removed > 0) {  
            console.log(`🛡️ AdBlock: [CACHE] Cleaned ${removed} expired entries`);  
        }  
    }, 60000);  
      
    // Re-aplicar filtros cosméticos en navegación  
    window.addEventListener('load', () => {  
        console.log('🛡️ AdBlock: [EVENT] Page loaded, re-applying cosmetic filters');  
        applyCosmeticFilters();  
    });  
      
    window.__ADBLOCK_INITIALIZED__ = true;  
})();