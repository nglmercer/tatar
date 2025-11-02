    (function() {
        'use strict';
        
        // Check if script was already injected
        if (window.__ADBLOCK_INJECTED__) {
            return;
        }
        window.__ADBLOCK_INJECTED__ = true;
        console.log('🛡️ AdBlock: Injecting into', window.location.href);
        
        const nativeFetch = window.fetch;
        const nativeXHR = window.XMLHttpRequest;
        
        const WHITELIST = [];
        
        function isWhitelisted(url) {
            return WHITELIST.some(domain => url.includes(domain));
        }
        
        const blockCache = new Map();
        const CACHE_TTL = 120000; // Aumentado a 2 minutos
        const MAX_CACHE_SIZE = 2000; // Límite de caché más pequeño
        
        let invoke = null;
        let adblockReady = false;
        
        const tauriFetch = window.fetch;
        
        async function init() {
            let attempts = 0;
            while (!window.__TAURI__?.core?.invoke && attempts < 100) {
                await new Promise(r => setTimeout(r, 50));
                attempts++;
            }
            
            if (!window.__TAURI__?.core?.invoke) {
                console.error('🛡️ AdBlock: No se pudo inicializar Tauri API');
                return;
            }
            
            invoke = window.__TAURI__.core.invoke;
            
            // Wait for AdBlock engine to be fully initialized
            attempts = 0;
            while (!adblockReady && attempts < 50) {
                try {
                    adblockReady = await invoke('is_adblock_ready');
                    console.log('🛡️ AdBlock: Ready =', adblockReady);
                    
                    if (!adblockReady) {
                        await new Promise(r => setTimeout(r, 200));
                        attempts++;
                    }
                } catch (e) {
                    console.error('🛡️ AdBlock: Error checking status', e);
                    await new Promise(r => setTimeout(r, 200));
                    attempts++;
                }
            }
            
            if (!adblockReady) {
                console.warn('🛡️ AdBlock: Engine failed to initialize after multiple attempts');
            }
        }
        init();
        console.log("window.__TAURI__", window.__TAURI__);
        async function checkUrl(url, type) {
            if (!adblockReady || !url || 
                url.startsWith('data:') || 
                url.startsWith('blob:') ||
                url.startsWith('tauri://') ||
                isWhitelisted(url)) {
                return false;
            }
            
            const cacheKey = `${url}|${type}`;
            const cached = blockCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.time < CACHE_TTL)) {
                // Actualizar tiempo de acceso para LRU
                cached.time = Date.now();
                cached.accessCount = (cached.accessCount || 1) + 1;
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
                    time: Date.now(),
                    accessCount: 1
                });
                
                // Limpieza de caché más inteligente
                if (blockCache.size > MAX_CACHE_SIZE) {
                    const entries = Array.from(blockCache.entries());
                    
                    // Primero remover entradas expiradas
                    const now = Date.now();
                    for (const [key, value] of entries) {
                        if (now - value.time > CACHE_TTL) {
                            blockCache.delete(key);
                        }
                    }
                    
                    // Si todavía hay muchas, remover las menos usadas
                    if (blockCache.size > MAX_CACHE_SIZE * 0.8) {
                        const sortedEntries = Array.from(blockCache.entries())
                            .sort((a, b) => (a[1].accessCount || 0) - (b[1].accessCount || 0));
                        
                        // Mantener solo el 80% más usadas
                        const toRemove = sortedEntries.slice(0, sortedEntries.length - Math.floor(MAX_CACHE_SIZE * 0.8));
                        for (const [key] of toRemove) {
                            blockCache.delete(key);
                        }
                    }
                }
                
                if (blocked) {
                    console.log('🛡️ Bloqueado:', url);
                }
                
                return blocked;
            } catch (e) {
                console.error('🛡️ Error al verificar URL', e);
                return false;
            }
        }
        
        // Variable to detect if we're in an IPC call
        let isIpcCall = false;
        
        window.fetch = async function(...args) {
            const url = args[0];
            const urlStr = typeof url === 'string' ? url : (url?.url || '');
            
            // Exclude IPC requests and other internal requests
            if (urlStr.startsWith('tauri://') ||
                urlStr.startsWith('ipc://') ||
                urlStr.includes('__TAURI_IPC__') ||
                isIpcCall) {
                return nativeFetch.apply(this, args);
            }
            
            const options = args[1] || {};
            if (options.method === 'OPTIONS') {
                return nativeFetch.apply(this, args);
            }
            
            // Mark as IPC call to avoid recursion
            if (urlStr.includes('is_url_blocked') ||
                urlStr.includes('is_adblock_ready') ||
                urlStr.includes('get_cosmetic_filters')) {
                isIpcCall = true;
                try {
                    return await nativeFetch.apply(this, args);
                } finally {
                    isIpcCall = false;
                }
            }
            
            if (await checkUrl(urlStr, 'fetch')) {
                return new Response('', { status: 200 });
            }
            return nativeFetch.apply(this, args);
        };
        
        window.XMLHttpRequest = function() {
            const xhr = new nativeXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            let requestUrl = '';
            let isIpcXhr = false;
            
            xhr.open = function(method, url, ...rest) {
                requestUrl = url;
                
                // Detect IPC requests
                if (url.includes('__TAURI_IPC__') ||
                    url.includes('is_url_blocked') ||
                    url.includes('is_adblock_ready') ||
                    url.includes('get_cosmetic_filters')) {
                    isIpcXhr = true;
                }
                
                if (method === 'OPTIONS') {
                    return originalOpen.apply(this, [method, url, ...rest]);
                }
                
                return originalOpen.apply(this, [method, url, ...rest]);
            };
            
            xhr.send = async function(...args) {
                if (requestUrl && !requestUrl.startsWith('tauri://') &&
                    !requestUrl.startsWith('ipc://') &&
                    !requestUrl.includes('__TAURI_IPC__') &&
                    !isIpcXhr &&
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
        
        const observer = new MutationObserver(mutations => {
            if (!adblockReady) return;
            
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    
                    const tag = node.tagName?.toLowerCase();
                    
                    if (!['script', 'iframe'].includes(tag)) continue;
                    
                    const src = node.src || node.getAttribute('src');
                    if (!src || isWhitelisted(src) || 
                        src.startsWith('tauri://') || 
                        src.startsWith('ipc://')) continue;
                    
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
        
        console.log('🛡️ AdBlock: Script successfully injected');
        
        // Listen for navigation events to restart AdBlock
        window.addEventListener('beforeunload', () => {
            console.log('🛡️ AdBlock: Page unloading, preparing re-injection');
            window.__ADBLOCK_INJECTED__ = false;
        });
        
        // Periodically check if engine is ready and retry if not
        setTimeout(async () => {
            if (!adblockReady) {
                console.log('🛡️ AdBlock: Retrying initialization');
                await init();
            }
        }, 3000);
        
        // Clean cache periodically
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
                console.log(`🛡️ AdBlock: Cache cleanup - ${removed} entries removed`);
            }
        }, 60000); // Every minute
        
        // Re-inject if page loads without script
        setTimeout(() => {
            if (!window.__ADBLOCK_INITIALIZED__) {
                console.log('🛡️ AdBlock: Re-injecting script');
                window.__ADBLOCK_INJECTED__ = false;
                // Call recursively to re-inject
                setTimeout(arguments.callee, 100);
            }
        }, 1000);
        
        window.__ADBLOCK_INITIALIZED__ = true;
    })();