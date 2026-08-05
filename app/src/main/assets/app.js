/**
 * MDict App - Main Application Logic
 */
(function() {
    'use strict';

    // State
    let currentDict = null;
    let currentDictName = '';
    let currentDefinition = null;
    let currentKeywordIndex = -1;
    let searchHistory = [];
    let favorites = [];
    let customCSS = '';
    let allDicts = [];
    let dictLoading = false;
    let pendingSearchWord = null;
    let translateRequestId = 0;
    let currentTranslateId = -1;
    let modelsRequestId = 0;
    let translateConfig = { engine: 'google', apiKey: '', baseUrl: '', model: '' };
    let mddImportRequestId = 0;
    const pendingMddImports = {};

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const btnSearch = document.getElementById('btn-search');
    const btnClear = document.getElementById('btn-clear');
    const dictSelect = document.getElementById('dict-select');
    const suggestionList = document.getElementById('suggestion-list');
    const definitionArea = document.getElementById('definition-area');

    // Tabs
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    // Initialize
    function init() {
        loadSavedData();
        setupEventListeners();
        refreshDictList();
        renderMddList();
        loadTranslateConfig();
        initTranslateSettings();
        initThemeSettings();
        initExportButtons();
        applyTheme();
    }

    function loadSavedData() {
        try {
            const saved = localStorage.getItem('mdict_data');
            if (saved) {
                const data = JSON.parse(saved);
                searchHistory = data.history || [];
                favorites = data.favorites || [];
                customCSS = data.customCSS || '';
            }
        } catch (e) {
            console.error('Failed to load saved data:', e);
        }
    }

    function saveData() {
        try {
            localStorage.setItem('mdict_data', JSON.stringify({
                history: searchHistory,
                favorites: favorites,
                customCSS: customCSS,
                lastDict: currentDictName
            }));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    }

    function setupEventListeners() {
        // Search
        searchInput.addEventListener('input', onSearchInput);
        searchInput.addEventListener('keydown', onSearchKeydown);
        btnSearch.addEventListener('click', doSearch);
        btnClear.addEventListener('click', clearSearch);

        // Dict selector
        dictSelect.addEventListener('change', onDictChange);



        // Tab navigation
        navItems.forEach(item => {
            item.addEventListener('click', () => switchTab(item.dataset.tab));
        });

        // History
        document.getElementById('btn-clear-history')?.addEventListener('click', clearHistory);

        // Settings
        document.getElementById('btn-import-dict')?.addEventListener('click', () => pickFile('*/*'));

        // Global functions
        window.onFilesPicked = onFilesPicked;
        window.searchWord = searchWord;
        window.goBack = goBack;
        window.setLookupMode = setLookupMode;
        window.handleLookupText = handleLookupText;
        window.onTranslateResult = onTranslateResult;
        window.onModelsResult = onModelsResult;

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box') && !e.target.closest('.suggestion-list')) {
                suggestionList.classList.add('hidden');
            }
        });

        // Click definition area to focus search input
        definitionArea.addEventListener('click', (e) => {
            if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.suggestion-item')) return;
            searchInput.focus();
        });

        // Word list panel
        document.querySelectorAll('.stat-item[data-list]').forEach(el => {
            el.addEventListener('click', () => window.toggleWordList(el.dataset.list));
        });
        document.querySelector('.btn-close-list')?.addEventListener('click', () => window.closeWordList());
    }

    // Lookup popup mode: hide bottom nav, add expand-to-fullscreen button
    function setLookupMode(enabled) {
        document.body.classList.toggle('lookup-mode', !!enabled);
        if (enabled) {
            if (document.getElementById('btn-fullscreen')) return;
            const btn = document.createElement('button');
            btn.id = 'btn-fullscreen';
            btn.className = 'btn-icon';
            btn.title = '打开完整应用';
            btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
            btn.onclick = () => { if (window.AndroidBridge) window.AndroidBridge.openFullApp(); };
            const box = document.querySelector('.search-box');
            if (box) box.appendChild(btn);
        } else {
            document.getElementById('btn-fullscreen')?.remove();
        }
    }

    // File picking
    function pickFile(mimeType) {
        if (window.AndroidBridge) {
            window.AndroidBridge.pickFile(mimeType);
        } else {
            // Fallback: use input element
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = mimeType;
            input.multiple = true;
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = btoa(String.fromCharCode(...new Uint8Array(reader.result)));
                        processFile(file.name, base64).then(info => {
                            showImportStatus('import-status', 'success',
                                `导入成功: ${info.title} (${info.keywordCount} 词条)`);
                        }).catch(e => {
                            showImportStatus('import-status', 'error', `导入失败: ${e.message}`);
                        });
                    };
                    reader.readAsArrayBuffer(file);
                });
            };
            input.click();
        }
    }

    // Import: pick .mdx together with optional companion .css / .mdd files
    async function onFilesPicked(uris) {
        const mdxFiles = [];
        const mddFiles = [];
        const cssFiles = [];

        uris.forEach(uri => {
            const fileName = window.AndroidBridge?.getFileName(uri) || 'unknown';
            if (fileName.endsWith('.css')) cssFiles.push({ uri, fileName });
            else if (fileName.endsWith('.mdd')) mddFiles.push({ uri, fileName });
            else if (fileName.endsWith('.mdx')) mdxFiles.push({ uri, fileName });
        });

        if (mdxFiles.length === 0 && mddFiles.length === 0) {
            showImportStatus('import-status', 'error',
                '请选择 .mdx 词典文件（可同时多选配套的 .css 与 .mdd 文件）');
            return;
        }

        showImportStatus('import-status', 'loading', '正在导入词典及配套文件...');

        let dictCount = 0;
        let mddCount = 0;
        let cssApplied = false;
        let errors = [];

        // 1. CSS companions (optional)
        cssFiles.forEach(({ uri, fileName }) => {
            try {
                const base64 = window.AndroidBridge?.readFileAsBase64(uri) || '';
                if (base64) {
                    processCSSFile(fileName, base64);
                    cssApplied = true;
                }
            } catch (e) {
                errors.push(`${fileName}: ${e.message}`);
            }
        });

        // 2. Dictionaries (at least one .mdx required)
        for (const { uri, fileName } of mdxFiles) {
            try {
                const info = await importMdxFile(uri, fileName);
                registerDict(fileName, info);
                dictCount++;
            } catch (e) {
                errors.push(`${fileName}: ${e.message}`);
            }
        }

        // 3. MDD companions (optional)
        for (const { uri, fileName } of mddFiles) {
            try {
                mddCount += await importMddFile(uri, fileName);
            } catch (e) {
                errors.push(`${fileName}: ${e.message}`);
            }
        }

        if (dictCount === 0 && mddCount === 0 && !cssApplied) {
            showImportStatus('import-status', 'error', `导入失败: ${errors.join('；') || '未知错误'}`);
            return;
        }

        const parts = [];
        if (dictCount > 0) parts.push(`导入成功: ${dictCount} 个词典`);
        if (mddCount > 0) parts.push(`资源 ${mddCount} 项`);
        if (cssApplied) parts.push('已应用 CSS');
        if (errors.length > 0) parts.push(`部分文件失败: ${errors.join('；')}`);
        showImportStatus('import-status', 'success', parts.join('，'));
        refreshDictList();
    }

    // Register an imported dictionary in localStorage (parser is created lazily
    // from the idx cache when the dict is opened).
    function registerDict(fileName, info) {
        const dictId = fileName.replace('.mdx', '');
        const dictData = {
            id: dictId,
            name: info.title || fileName,
            fileName: fileName,
            keywordCount: info.count || 0,
            version: info.version || 0,
            encoding: info.enc || 'UTF-8',
            internalPath: info.internalPath || ''
        };
        allDicts = allDicts.filter(d => d.id !== dictId);
        allDicts.push(dictData);
        localStorage.setItem('mdict_dicts', JSON.stringify(allDicts));
        if (window._dictParsers) delete window._dictParsers[dictId];
        if (window._dictBuffers) delete window._dictBuffers[dictId];
        refreshDictList();
    }

    // Import a single .mdx file. Preferred path: native index build (no base64
    // read, seconds even for big dictionaries). Falls back to the slow js-mdict
    // parse for files the native builder can't handle (lzo records, encryption).
    async function importMdxFile(uri, fileName) {
        let internalPath = '';
        if (window.AndroidBridge) {
            try {
                internalPath = window.AndroidBridge.saveFileToInternal(uri, fileName) || '';
            } catch (e) {}
        }
        if (window.AndroidBridge && window.AndroidBridge.buildMdxIndex && internalPath) {
            // Re-import invalidates any cached index for this file
            if (window.AndroidBridge.deleteDictCache) {
                window.AndroidBridge.deleteDictCache(fileName + '.idx.json');
            }
            try {
                showImportStatus('import-status', 'loading', '正在解析词典...');
                const result = await new Promise((resolve, reject) => {
                    const requestId = ++mddImportRequestId;
                    pendingMddImports[requestId] = { resolve, reject };
                    window.AndroidBridge.buildMdxIndex(internalPath, fileName, requestId);
                });
                return {
                    count: result.count || 0,
                    title: result.title || '',
                    version: result.version || 0,
                    enc: result.enc || 'UTF-8',
                    internalPath: internalPath
                };
            } catch (e) {
                console.warn('Native MDX index build failed, falling back to js-mdict:', e.message);
            }
        }
        // Fallback: slow js-mdict parse of the whole file
        const base64 = window.AndroidBridge?.readFileAsBase64(uri) || '';
        if (base64) {
            return processFile(fileName, base64, internalPath);
        }
        throw new Error('读取文件失败');
    }

    function processFile(fileName, base64Data, internalPath) {
        return new Promise((resolve, reject) => {
            if (fileName.endsWith('.css')) {
                processCSSFile(fileName, base64Data);
                resolve({ type: 'css' });
                return;
            }

            if (fileName.endsWith('.mdd')) {
                processMddFile(fileName, base64Data, internalPath).then(resolve, reject);
                return;
            }

            if (!fileName.endsWith('.mdx')) {
                reject(new Error('仅支持 .mdx / .mdd / .css 文件'));
                return;
            }

            showImportStatus('import-status', 'loading', '正在解析词典...');

            setTimeout(() => {
                try {
                    const binaryStr = atob(base64Data);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }

                    console.log('File size:', bytes.length, 'bytes');

                    // Use js-mdict library
                    MDictLib.setBuffer(bytes.buffer);
                    const parser = new MDictLib.MDX('dummy');

                    console.log('Parse complete:', parser.header?.Title, parser.keywordList?.length);

                    resolve({
                        title: parser.header?.Title || fileName.replace('.mdx', ''),
                        count: parser.keywordList?.length || 0,
                        version: parser.meta?.version || 0,
                        enc: parser.meta?.encoding || 'UTF-8',
                        internalPath: internalPath || ''
                    });
                } catch (e) {
                    console.error('Parse error:', e);
                    reject(e);
                }
            }, 100);
        });
    }

    // Import a single .mdd file. One requestId spans the whole flow so the user
    // sees copy progress ("正在拷贝...") followed by index progress ("正在解析..."),
    // and completes via onMddIndexDone.
    function importMddFile(uri, fileName) {
        if (window.AndroidBridge && window.AndroidBridge.buildMddIndex) {
            return new Promise((resolve, reject) => {
                const requestId = ++mddImportRequestId;
                pendingMddImports[requestId] = {
                    resolve: r => resolve(r && r.count ? r.count : 0),
                    reject
                };
                const internalPath = window.AndroidBridge.saveFileToInternalWithProgress(uri, fileName, requestId) || '';
                if (!internalPath) {
                    delete pendingMddImports[requestId];
                    reject(new Error('文件保存失败'));
                    return;
                }
                window.AndroidBridge.buildMddIndex(internalPath, fileName, requestId);
            });
        }
        // Browser fallback: slow JS parse of the whole file
        const base64 = window.AndroidBridge?.readFileAsBase64(uri) || '';
        return processMddFileSlow(fileName, base64, '');
    }

    function processMddFile(fileName, base64Data, internalPath) {
        // Fast path: native side builds the index by reading only the file header +
        // key blocks (front of file), so multi-GB .mdd files import in seconds.
        if (window.AndroidBridge && window.AndroidBridge.buildMddIndex && internalPath) {
            return new Promise((resolve, reject) => {
                const requestId = ++mddImportRequestId;
                pendingMddImports[requestId] = { resolve, reject };
                window.AndroidBridge.buildMddIndex(internalPath, fileName, requestId);
            });
        }
        // Fallback (browser / no native bridge): slow JS parse of the whole file
        return processMddFileSlow(fileName, base64Data, internalPath);
    }

    window.onMddIndexProgress = function(requestId, pct, phase) {
        if (!pendingMddImports[requestId]) return;
        const label = phase === 'copy' ? '正在拷贝资源文件...' : '正在解析资源文件...';
        showImportStatus('import-status', 'loading', `${label} ${pct}%`);
    };

    window.onMddIndexDone = function(requestId, json) {
        const pending = pendingMddImports[requestId];
        if (!pending) return;
        delete pendingMddImports[requestId];
        let result = null;
        try {
            result = typeof json === 'string' ? JSON.parse(json) : json;
        } catch (e) {
            result = { ok: false, error: '解析返回数据失败' };
        }
        if (result.ok) {
            pending.resolve(result);
        } else {
            pending.reject(new Error(result.error || '资源文件解析失败'));
        }
    };

    function processMddFileSlow(fileName, base64Data, internalPath) {
        return new Promise((resolve, reject) => {
            showImportStatus('import-status', 'loading', '正在解析资源文件...');

            setTimeout(() => {
                try {
                    const binaryStr = atob(base64Data);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }

                    MDictLib.setBuffer(bytes.buffer);
                    // 'dummy.mdd' suffix is required: js-mdict derives the file type from the
                    // filename, and a plain 'dummy' is treated as MDX (wrong key sizes for MDD)
                    const parser = new MDictLib.MDD('dummy.mdd');
                    const kw = parser.keywordList || [];
                    const ri = parser.recordInfoList || [];
                    if (kw.length === 0 || ri.length === 0) {
                        reject(new Error('资源文件为空或解析失败'));
                        return;
                    }

                    // Build resource index cache (used by the native side to read
                    // resources on demand without parsing the whole mdd)
                    kw.sort((a, b) => a.keyText < b.keyText ? -1 : a.keyText > b.keyText ? 1 : 0);
                    const idx = {
                        v: 1,
                        enc: parser.meta.encoding || 'UTF-8',
                        encrypt: parser.meta.encrypt || 0,
                        rbs: parser._recordBlockStartOffset || 0,
                        k: kw.map(x => [x.keyText, x.recordStartOffset, x.recordEndOffset, x.keyBlockIdx]),
                        r: ri.map(x => [x.packSize, x.packAccumulateOffset, x.unpackSize, x.unpackAccumulatorOffset])
                    };
                    if (window.AndroidBridge && window.AndroidBridge.saveDictCache) {
                        window.AndroidBridge.saveDictCache(fileName + '.idx.json', JSON.stringify(idx));
                    }

                    // Register in the mdd registry
                    if (window.AndroidBridge && window.AndroidBridge.readDictCache) {
                        let registry = [];
                        try {
                            const existing = window.AndroidBridge.readDictCache('mdd_registry.json');
                            if (existing) registry = JSON.parse(existing);
                        } catch (e) {}
                        registry = registry.filter(m => m.name !== fileName);
                        registry.push({ name: fileName, path: internalPath || '' });
                        window.AndroidBridge.saveDictCache('mdd_registry.json', JSON.stringify(registry));
                    }

                    renderMddList();
                    resolve(kw.length);
                } catch (e) {
                    console.error('Mdd parse error:', e);
                    reject(e);
                }
            }, 100);
        });
    }

    function processCSSFile(fileName, base64Data) {
        try {
            const css = atob(base64Data);
            customCSS = css;
            applyCustomCSS();
            saveData();
        } catch (e) {
            console.error('CSS import failed:', e);
        }
    }

    function applyCustomCSS() {
        let styleEl = document.getElementById('custom-dict-css');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'custom-dict-css';
            document.head.appendChild(styleEl);
        }
        // Appended after the dictionary css so these overrides win: sound buttons
        // must never show css-drawn glyphs (e.g. the 'θ' fallback icon).
        styleEl.textContent = customCSS + `
            .def-content a[href^="sound://"] { background: none !important; }
            .def-content a[href^="sound://"]::before,
            .def-content a[href^="sound://"]::after { content: none !important; }
        `;
    }

    function showImportStatus(elementId, type, message) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.className = `import-status ${type}`;
        el.textContent = message;
        el.classList.remove('hidden');

        if (type !== 'loading') {
            setTimeout(() => el.classList.add('hidden'), 5000);
        }
    }

    function refreshDictList() {
        // Load from localStorage
        try {
            const saved = localStorage.getItem('mdict_dicts');
            if (saved) {
                allDicts = JSON.parse(saved);
            }
        } catch (e) {}

        // Update selector
        dictSelect.innerHTML = '<option value="">-- 请选择词典 --</option>';
        allDicts.forEach(dict => {
            const option = document.createElement('option');
            option.value = dict.id;
            option.textContent = `${dict.name} (${dict.keywordCount} 词条)`;
            dictSelect.appendChild(option);
        });

        // Update settings manage list
        const manageList = document.getElementById('dict-manage-list');
        if (manageList) {
            if (allDicts.length === 0) {
                manageList.innerHTML = '<div class="empty-msg">暂无词典</div>';
            } else {
                const enabled = getEnabledDicts();
                manageList.innerHTML = allDicts.map(dict => `
                    <div class="dict-manage-item">
                        <div class="dict-manage-info">
                            <div class="dict-manage-name">
                                <label class="dict-enable" title="启用多词典同时查询">
                                    <input type="checkbox" ${enabled.includes(dict.id) ? 'checked' : ''}
                                        onchange="window.toggleDictEnabled('${dict.id}', this.checked)">
                                </label>
                                ${escapeHtml(dict.name)}
                            </div>
                            <div class="dict-manage-size">${dict.keywordCount} 词条 | v${dict.version}</div>
                        </div>
                        <button class="btn-delete" onclick="window.deleteDict('${dict.id}')">删除</button>
                    </div>
                `).join('');
            }
        }

        // Restore last dict
        try {
            const data = JSON.parse(localStorage.getItem('mdict_data') || '{}');
            if (data.lastDict && allDicts.find(d => d.id === data.lastDict)) {
                dictSelect.value = data.lastDict;
                loadDict(data.lastDict);
            }
        } catch (e) {}
    }

    function readMddRegistry() {
        try {
            if (window.AndroidBridge && window.AndroidBridge.readDictCache) {
                const existing = window.AndroidBridge.readDictCache('mdd_registry.json');
                if (existing) return JSON.parse(existing);
            }
        } catch (e) {}
        return [];
    }

    function saveMddRegistry(registry) {
        try {
            if (window.AndroidBridge && window.AndroidBridge.saveDictCache) {
                window.AndroidBridge.saveDictCache('mdd_registry.json', JSON.stringify(registry));
            }
        } catch (e) {}
    }

    function renderMddList() {
        const list = document.getElementById('mdd-manage-list');
        if (!list) return;
        const registry = readMddRegistry();
        if (registry.length === 0) {
            list.innerHTML = '<div class="empty-msg">暂无资源文件</div>';
            return;
        }
        list.innerHTML = registry.map(m => `
            <div class="dict-manage-item">
                <div class="dict-manage-info">
                    <div class="dict-manage-name">${escapeHtml(m.name)}</div>
                    <div class="dict-manage-size">MDD 资源</div>
                </div>
                <button class="btn-delete" onclick="window.deleteMdd('${escapeHtml(m.name)}')">删除</button>
            </div>
        `).join('');
    }

    window.deleteMdd = function(fileName) {
        if (!confirm('确定删除资源文件 ' + fileName + '?')) return;
        let registry = readMddRegistry().filter(m => m.name !== fileName);
        saveMddRegistry(registry);
        if (window.AndroidBridge && window.AndroidBridge.deleteDictCache) {
            window.AndroidBridge.deleteDictCache(fileName + '.idx.json');
            window.AndroidBridge.deleteDictFile(fileName);
        }
        renderMddList();
    };

    function getEnabledDicts() {
        try {
            const saved = localStorage.getItem('mdict_enabled_dicts');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return allDicts.map(d => d.id);
    }

    function setDictEnabled(id, enabled) {
        let ids = getEnabledDicts();
        if (enabled) {
            if (!ids.includes(id)) ids.push(id);
        } else {
            ids = ids.filter(x => x !== id);
        }
        localStorage.setItem('mdict_enabled_dicts', JSON.stringify(ids));
    }

    function dictName(id) {
        const d = allDicts.find(x => x.id === id);
        return d ? (d.name || id) : id;
    }

    window.toggleDictEnabled = function(id, enabled) {
        setDictEnabled(id, enabled);
    };

    window.deleteDict = function(dictId) {        if (!confirm('确定删除此词典?')) return;
        const dictInfo = allDicts.find(d => d.id === dictId);
        if (dictInfo && window.AndroidBridge && window.AndroidBridge.deleteDictCache) {
            window.AndroidBridge.deleteDictCache(dictInfo.fileName + '.idx.json');
        }
        allDicts = allDicts.filter(d => d.id !== dictId);
        localStorage.setItem('mdict_dicts', JSON.stringify(allDicts));
        if (window._dictParsers) {
            delete window._dictParsers[dictId];
        }
        if (window._dictBuffers) {
            delete window._dictBuffers[dictId];
        }
        if (currentDict && currentDict.id === dictId) {
            currentDict = null;
            currentDictName = '';
            definitionArea.innerHTML = '';
        }
        refreshDictList();
    };

    function onDictChange() {
        const dictId = dictSelect.value;
        if (dictId) {
            loadDict(dictId);
        } else {
            currentDict = null;
        }
        saveData();
    }

    async function loadDict(dictId) {
        const dictInfo = allDicts.find(d => d.id === dictId);
        if (!dictInfo) {
            finishDictLoad();
            return;
        }

        // Parser + buffer already in memory -> instant
        if (window._dictParsers && window._dictParsers[dictId] &&
            window._dictBuffers && window._dictBuffers[dictId]) {
            MDictLib.setBuffer(window._dictBuffers[dictId]);
            currentDict = window._dictParsers[dictId];
            currentDictName = dictId;
            finishDictLoad();
            return;
        }

        // Index cache exists -> fast startup, records read on demand
        if (dictInfo.internalPath && window.AndroidBridge && window.AndroidBridge.readDictCache) {
            try {
                const cacheJson = window.AndroidBridge.readDictCache(dictInfo.fileName + '.idx.json');
                if (cacheJson) {
                    const idx = JSON.parse(cacheJson);
                    currentDict = createLightParser(idx, dictInfo.internalPath);
                    currentDictName = dictId;
                    finishDictLoad();
                    return;
                }
            } catch (e) {
                console.error('Dict cache load error:', e);
            }
        }

        dictLoading = true;

        // Load from internal storage (chunked, keeps UI responsive)
        if (dictInfo.internalPath && window.AndroidBridge && window.AndroidBridge.readLocalFileChunk) {
            showDictLoading(dictInfo, 0);
            const size = window.AndroidBridge.getFileSize(dictInfo.internalPath);
            if (size > 0) {
                const buffer = await readFileChunks(dictInfo.internalPath, size, (pct) => showDictLoading(dictInfo, pct));
                if (buffer) {
                    try {
                        MDictLib.setBuffer(buffer);
                        const parser = new MDictLib.MDX('dummy');
                        window._dictParsers = window._dictParsers || {};
                        window._dictParsers[dictId] = parser;
                        window._dictBuffers = window._dictBuffers || {};
                        window._dictBuffers[dictId] = buffer;
                        currentDict = parser;
                        currentDictName = dictId;
                        finishDictLoad();
                        setTimeout(() => buildDictCache(dictInfo, parser), 100);
                        return;
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            }
            showDictLoading(dictInfo, -1);
            finishDictLoad();
            return;
        }

        // Legacy fallback: read whole file as base64 in one call
        if (dictInfo.internalPath && window.AndroidBridge) {
            const base64 = window.AndroidBridge.readLocalFile(dictInfo.internalPath);
            if (base64) {
                const buffer = base64ToArrayBuffer(base64);
                MDictLib.setBuffer(buffer);
                const parser = new MDictLib.MDX('dummy');
                window._dictParsers = window._dictParsers || {};
                window._dictParsers[dictId] = parser;
                window._dictBuffers = window._dictBuffers || {};
                window._dictBuffers[dictId] = buffer;
                currentDict = parser;
                currentDictName = dictId;
                finishDictLoad();
                return;
            }
        }

        definitionArea.innerHTML = '';
        finishDictLoad();
    }

    const READ_CHUNK_SIZE = 2 * 1024 * 1024;

    // Load a dictionary in the background without switching the active dict.
    async function ensureDictLoaded(dictId, onDone) {
        const dictInfo = allDicts.find(d => d.id === dictId);
        if (!dictInfo) {
            onDone?.();
            return;
        }
        if (window._dictParsers && window._dictParsers[dictId]) {
            onDone?.();
            return;
        }
        // Index cache first (fast, no big buffer)
        if (dictInfo.internalPath && window.AndroidBridge && window.AndroidBridge.readDictCache) {
            try {
                const cacheJson = window.AndroidBridge.readDictCache(dictInfo.fileName + '.idx.json');
                if (cacheJson) {
                    const idx = JSON.parse(cacheJson);
                    window._dictParsers = window._dictParsers || {};
                    window._dictParsers[dictId] = createLightParser(idx, dictInfo.internalPath);
                    onDone?.();
                    return;
                }
            } catch (e) {
                console.error('Dict cache load error:', e);
            }
        }
        // Full chunked load (silent)
        if (dictInfo.internalPath && window.AndroidBridge && window.AndroidBridge.readLocalFileChunk) {
            const size = window.AndroidBridge.getFileSize(dictInfo.internalPath);
            if (size > 0) {
                const buffer = await readFileChunks(dictInfo.internalPath, size, () => {});
                if (buffer) {
                    try {
                        MDictLib.setBuffer(buffer);
                        const parser = new MDictLib.MDX('dummy');
                        window._dictParsers = window._dictParsers || {};
                        window._dictParsers[dictId] = parser;
                        window._dictBuffers = window._dictBuffers || {};
                        window._dictBuffers[dictId] = buffer;
                        setTimeout(() => buildDictCache(dictInfo, parser), 100);
                        onDone?.();
                        return;
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            }
        }
        onDone?.();
    }

    async function readFileChunks(path, size, onProgress) {
        const bytes = new Uint8Array(size);
        let offset = 0;
        let lastPct = -1;
        while (offset < size) {
            const len = Math.min(READ_CHUNK_SIZE, size - offset);
            const b64 = window.AndroidBridge.readLocalFileChunk(path, offset, len);
            if (!b64) return null;
            const bin = atob(b64);
            for (let i = 0; i < bin.length; i++) {
                bytes[offset + i] = bin.charCodeAt(i);
            }
            offset += len;
            const pct = Math.floor((offset / size) * 100);
            if (pct !== lastPct) {
                lastPct = pct;
                onProgress(pct);
                await new Promise(r => setTimeout(r, 0));
            }
        }
        return bytes.buffer;
    }

    function showDictLoading(dictInfo, pct) {
        if (pct === -1) {
            definitionArea.innerHTML = `
                <div class="no-result">
                    <div class="emoji">😕</div>
                    <p>词典加载失败，请检查文件后重新导入</p>
                </div>`;
            return;
        }
        const name = escapeHtml(dictInfo.name || dictInfo.id);
        definitionArea.innerHTML = `
            <div class="no-result">
                <div class="emoji">⏳</div>
                <p>正在加载词典 "${name}"...</p>
                <div style="margin-top:16px;max-width:240px;margin-left:auto;margin-right:auto">
                    <div style="background:#EFEBE9;border-radius:8px;height:8px;overflow:hidden">
                        <div style="background:#F9A825;height:8px;border-radius:8px;width:${pct}%"></div>
                    </div>
                    <p style="margin-top:8px;color:#8D6E63">${pct}%</p>
                </div>
            </div>`;
    }

    function finishDictLoad() {
        dictLoading = false;
        if (pendingSearchWord !== null) {
            const word = pendingSearchWord;
            pendingSearchWord = null;
            searchWord(word);
        }
    }

    // ---- Cache-based lightweight dict access ----
    // Reads only the index from a JSON cache; record data is read from the
    // mdx file on demand (single small chunk per lookup), so startup is fast.
    function createLightParser(idx, filePath) {
        let enc = idx.enc || 'UTF-8';
        if (enc.toLowerCase().startsWith('utf-16')) enc = 'utf-16le';
        const decoder = new TextDecoder(enc);
        const keywordList = idx.k.map(f => ({
            keyText: f[0],
            recordStartOffset: f[1],
            recordEndOffset: f[2],
            keyBlockIdx: f[3]
        }));
        const recordInfoList = idx.r.map(f => ({
            packSize: f[0],
            packAccumulateOffset: f[1],
            unpackSize: f[2],
            unpackAccumulatorOffset: f[3]
        }));
        const encrypt = idx.encrypt || 0;
        const recordBlockStart = idx.rbs || 0;

        function lookupKeyBlockByWord(word, isAssociate = false) {
            const list = keywordList;
            if (list.length === 0) return undefined;
            let left = 0;
            let right = list.length - 1;
            let mid = 0;
            while (left <= right) {
                mid = left + (right - left >> 1);
                // Code-unit comparison: must match the sort order used when the
                // index was built (native Kotlin compareTo, JS < >). localeCompare
                // collation order differs for punctuation/non-ASCII keys.
                if (word > list[mid].keyText) {
                    left = mid + 1;
                } else if (word === list[mid].keyText) {
                    break;
                } else {
                    right = mid - 1;
                }
            }
            if (list[mid].keyText !== word && !isAssociate) {
                return undefined;
            }
            return list[mid];
        }

        function reduceRecordBlockInfo(recordStart) {
            let left = 0;
            let right = recordInfoList.length - 1;
            let mid = 0;
            while (left <= right) {
                mid = left + (right - left >> 1);
                if (recordStart >= recordInfoList[mid].unpackAccumulatorOffset) {
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
            return left - 1;
        }

        function decompressBuff(recordBuffer) {
            const compHex = Array.from(recordBuffer.subarray(0, 4),
                b => b.toString(16).padStart(2, '0')).join('');
            if (compHex === '00000000') {
                return recordBuffer.slice(8);
            }
            if (encrypt === 1) return null;
            const payload = recordBuffer.subarray(8, recordBuffer.length);
            if (compHex === '02000000') {
                return new Uint8Array(pako.inflate(payload));
            }
            return null;
        }

        function lookupRecordByKeyBlock(item) {
            const bi = reduceRecordBlockInfo(item.recordStartOffset);
            if (bi < 0 || bi >= recordInfoList.length) return undefined;
            const info = recordInfoList[bi];
            const packed = readFileRange(filePath, recordBlockStart + info.packAccumulateOffset, info.packSize);
            if (!packed) return undefined;
            const unpack = decompressBuff(packed);
            if (!unpack) return undefined;
            const start = item.recordStartOffset - info.unpackAccumulatorOffset;
            const end = item.recordEndOffset - info.unpackAccumulatorOffset;
            return unpack.slice(start, end);
        }

        return {
            keywordList: keywordList,
            meta: { decoder: decoder },
            lookup(word) {
                const item = lookupKeyBlockByWord(word);
                if (!item) return { keyText: word, definition: null };
                const def = lookupRecordByKeyBlock(item);
                if (!def) return { keyText: word, definition: null };
                return { keyText: word, definition: decoder.decode(def) };
            },
            contains(substring, caseSensitive = false, limit = 1000) {
                const searchKey = caseSensitive ? substring : substring.toLowerCase();
                const res = [];
                for (const item of keywordList) {
                    const keyText = caseSensitive ? item.keyText : item.keyText.toLowerCase();
                    if (keyText.includes(searchKey)) {
                        res.push(item);
                        if (res.length >= limit) break;
                    }
                }
                return res;
            },
            containsSearch(sub) {
                return this.contains(sub, false, 50);
            },
            associate(phrase) {
                const item = lookupKeyBlockByWord(phrase, true);
                if (!item) return [];
                return keywordList.filter(k => k.keyBlockIdx === item.keyBlockIdx);
            },
            prefix(prefix) {
                const item = lookupKeyBlockByWord(prefix, true);
                if (!item) return [];
                return keywordList.filter(k => k.keyBlockIdx === item.keyBlockIdx && k.keyText.startsWith(prefix));
            }
        };
    }

    function readFileRange(path, offset, length) {
        if (!window.AndroidBridge || !window.AndroidBridge.readLocalFileChunk) return null;
        const b64 = window.AndroidBridge.readLocalFileChunk(path, offset, length);
        if (!b64) return null;
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        return bytes;
    }

    function buildDictCache(dictInfo, parser) {
        try {
            if (!window.AndroidBridge || !window.AndroidBridge.saveDictCache) return;
            const kw = parser.keywordList || [];
            const ri = parser.recordInfoList || [];
            if (kw.length === 0 || ri.length === 0) return;
            if (parser.meta.encrypt === 1) return;
            // Code-unit sort: matches the light parser's search comparator
            kw.sort((a, b) => a.keyText < b.keyText ? -1 : a.keyText > b.keyText ? 1 : 0);
            // Skip unsupported record compression (e.g. lzo)
            if (window.AndroidBridge.readLocalFileChunk) {
                const first = window.AndroidBridge.readLocalFileChunk(
                    dictInfo.internalPath,
                    (parser._recordBlockStartOffset || 0) + ri[0].packAccumulateOffset,
                    4
                );
                if (!first) return;
                const bin = atob(first);
                const hex = Array.from(bin, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
                if (hex !== '00000000' && hex !== '02000000') return;
            }
            const idx = {
                v: 1,
                enc: parser.meta.encoding || 'UTF-8',
                encrypt: parser.meta.encrypt || 0,
                rbs: parser._recordBlockStartOffset || 0,
                k: kw.map(x => [x.keyText, x.recordStartOffset, x.recordEndOffset, x.keyBlockIdx]),
                r: ri.map(x => [x.packSize, x.packAccumulateOffset, x.unpackSize, x.unpackAccumulatorOffset])
            };
            const json = JSON.stringify(idx);
            window.AndroidBridge.saveDictCache(dictInfo.fileName + '.idx.json', json);
            console.log('Dict cache saved:', (json.length / 1048576).toFixed(1) + 'MB');
        } catch (e) {
            console.error('Cache build error:', e);
        }
    }

    function base64ToArrayBuffer(base64) {
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Search
    function onSearchInput(e) {
        const value = e.target.value.trim();
        btnClear.classList.toggle('hidden', !value);

        if (!currentDict || !value) {
            suggestionList.classList.add('hidden');
            return;
        }

        // Show suggestions
        const results = currentDict.prefix ? currentDict.prefix(value) : [];
        if (results.length > 0) {
            suggestionList.innerHTML = results.slice(0, 20).map(item => `
                <div class="suggestion-item" data-word="${escapeHtml(item.keyText)}">
                    ${highlightMatch(item.keyText, value)}
                </div>
            `).join('');
            suggestionList.classList.remove('hidden');

            // Add click handlers
            suggestionList.querySelectorAll('.suggestion-item').forEach(el => {
                el.addEventListener('click', () => {
                    searchWord(el.dataset.word);
                });
            });
        } else {
            suggestionList.classList.add('hidden');
        }
    }

    function onSearchKeydown(e) {
        if (e.key === 'Enter') {
            suggestionList.classList.add('hidden');
            searchInput.blur();
            doSearch();
        } else if (e.key === 'Escape') {
            suggestionList.classList.add('hidden');
            searchInput.blur();
        }
    }

    function doSearch() {
        const word = searchInput.value.trim();
        if (!word) return;
        searchWord(word);
    }

    let currentSearchWord = null;

    function searchWord(word) {
        currentSearchWord = word;
        searchInput.value = word;
        suggestionList.classList.add('hidden');
        btnClear.classList.remove('hidden');

        if (!currentDict) {
            if (dictLoading) {
                pendingSearchWord = word;
            } else {
                definitionArea.innerHTML = '';
            }
            return;
        }

        const candidates = buildLookupCandidates(word);
        for (const candidate of candidates) {
            const result = currentDict.lookup(candidate);
            if (result && result.definition) {
                if (candidate !== word) searchInput.value = candidate;
                doSearchWord(candidate);
                return;
            }
        }
        doSearchWord(word);
    }

    // ---- Inflection lemmatization (offline) ----

    const IRREGULAR_FORMS = {
        went: 'go', gone: 'go', goes: 'go', going: 'go',
        ran: 'run', running: 'run', runs: 'run',
        ate: 'eat', eaten: 'eat', eats: 'eat', eating: 'eat',
        saw: 'see', seen: 'see', sees: 'see', seeing: 'see',
        took: 'take', taken: 'take', takes: 'take', taking: 'take',
        gave: 'give', given: 'give', gives: 'give', giving: 'give',
        came: 'come', comes: 'come', coming: 'come',
        made: 'make', makes: 'make', making: 'make',
        said: 'say', says: 'say', saying: 'say',
        got: 'get', gotten: 'get', gets: 'get', getting: 'get',
        found: 'find', finds: 'find', finding: 'find',
        thought: 'think', thinks: 'think', thinking: 'think',
        knew: 'know', known: 'know', knows: 'know', knowing: 'know',
        had: 'have', has: 'have', having: 'have',
        was: 'be', were: 'be', been: 'be', being: 'be', am: 'be', is: 'be', are: 'be',
        did: 'do', does: 'do', done: 'do', doing: 'do',
        wrote: 'write', written: 'write', writes: 'write', writing: 'write',
        spoke: 'speak', spoken: 'speak', speaks: 'speak', speaking: 'speak',
        broke: 'break', broken: 'break', breaks: 'break', breaking: 'break',
        drove: 'drive', driven: 'drive', drives: 'drive', driving: 'drive',
        began: 'begin', begun: 'begin', begins: 'begin', beginning: 'begin',
        brought: 'bring', brings: 'bring', bringing: 'bring',
        bought: 'buy', buys: 'buy', buying: 'buy',
        caught: 'catch', catches: 'catch', catching: 'catch',
        felt: 'feel', feels: 'feel', feeling: 'feel',
        held: 'hold', holds: 'hold', holding: 'hold',
        kept: 'keep', keeps: 'keep', keeping: 'keep',
        left: 'leave', leaves: 'leave', leaving: 'leave',
        lost: 'lose', loses: 'lose', losing: 'lose',
        met: 'meet', meets: 'meet', meeting: 'meet',
        paid: 'pay', pays: 'pay', paying: 'pay',
        puts: 'put', putting: 'put',
        reads: 'read', reading: 'read',
        sent: 'send', sends: 'send', sending: 'send',
        sat: 'sit', sits: 'sit', sitting: 'sit',
        slept: 'sleep', sleeps: 'sleep', sleeping: 'sleep',
        stood: 'stand', stands: 'stand', standing: 'stand',
        taught: 'teach', teaches: 'teach', teaching: 'teach',
        told: 'tell', tells: 'tell', telling: 'tell',
        understood: 'understand', understands: 'understand', understanding: 'understand',
        won: 'win', wins: 'win', winning: 'win',
        flew: 'fly', flown: 'fly', flies: 'fly', flying: 'fly',
        grew: 'grow', grown: 'grow', grows: 'grow', growing: 'grow',
        threw: 'throw', thrown: 'throw', throws: 'throw', throwing: 'throw',
        drank: 'drink', drunk: 'drink', drinks: 'drink', drinking: 'drink',
        sang: 'sing', sung: 'sing', sings: 'sing', singing: 'sing',
        swam: 'swim', swum: 'swim', swims: 'swim', swimming: 'swim',
        rode: 'ride', ridden: 'ride', rides: 'ride', riding: 'ride',
        rose: 'rise', risen: 'rise', rises: 'rise', rising: 'rise',
        chose: 'choose', chosen: 'choose', chooses: 'choose', choosing: 'choose',
        forgot: 'forget', forgotten: 'forget', forgets: 'forget', forgetting: 'forget',
        lent: 'lend', lends: 'lend', lending: 'lend',
        spent: 'spend', spends: 'spend', spending: 'spend',
        built: 'build', builds: 'build', building: 'build',
        sold: 'sell', sells: 'sell', selling: 'sell',
        shot: 'shoot', shoots: 'shoot', shooting: 'shoot',
        wore: 'wear', worn: 'wear', wears: 'wear', wearing: 'wear',
        meant: 'mean', means: 'mean', meaning: 'mean',
        heard: 'hear', hears: 'hear', hearing: 'hear',
        led: 'lead', leads: 'lead', leading: 'lead',
        fought: 'fight', fights: 'fight', fighting: 'fight',
        drew: 'draw', drawn: 'draw', draws: 'draw', drawing: 'draw',
        fell: 'fall', fallen: 'fall', falls: 'fall', falling: 'fall',
        bent: 'bend', bends: 'bend', bending: 'bend',
        hid: 'hide', hidden: 'hide', hides: 'hide', hiding: 'hide',
        hung: 'hang', hangs: 'hang', hanging: 'hang',
        lit: 'light', lights: 'light', lighting: 'light',
        grew: 'grow', grows: 'grow', growing: 'grow'
    };

    function inflectLemmas(word) {
        const w = word.toLowerCase();
        const res = [];
        if (IRREGULAR_FORMS[w]) res.push(IRREGULAR_FORMS[w]);
        const len = w.length;
        if (len < 4) return res;
        // plural -ies / -es / -s
        if (w.endsWith('ies') && len > 4) res.push(w.slice(0, -3) + 'y');
        else if (w.endsWith('es')) res.push(w.slice(0, -2));
        else if (w.endsWith('s') && !w.endsWith('ss')) res.push(w.slice(0, -1));
        // -ying -> -y
        if (w.endsWith('ying') && len > 5) res.push(w.slice(0, -3) + 'y');
        // -ing
        if (w.endsWith('ing') && len > 5) {
            const base = w.slice(0, -3);
            res.push(base);
            if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
                res.push(base.slice(0, -1));
            }
            res.push(base + 'e');
        }
        // -ied / -ed
        if (w.endsWith('ied') && len > 4) res.push(w.slice(0, -3) + 'y');
        else if (w.endsWith('ed') && len > 4) {
            const base = w.slice(0, -2);
            res.push(base);
            if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
                res.push(base.slice(0, -1));
            }
            res.push(base + 'e');
        }
        // -ier / -iest / -er / -est
        if (w.endsWith('ier') && len > 4) res.push(w.slice(0, -3) + 'y');
        if (w.endsWith('iest') && len > 5) res.push(w.slice(0, -4) + 'y');
        if (w.endsWith('er') && len > 4) res.push(w.slice(0, -2));
        if (w.endsWith('est') && len > 5) res.push(w.slice(0, -3));
        return res.filter(Boolean);
    }

    function buildLookupCandidates(word) {
        const candidates = [word];
        const lower = word.toLowerCase();
        if (lower !== word && !candidates.includes(lower)) candidates.push(lower);
        const cap = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        if (cap !== word && !candidates.includes(cap)) candidates.push(cap);
        for (const lemma of inflectLemmas(word)) {
            if (!candidates.includes(lemma)) candidates.push(lemma);
        }
        return candidates;
    }

    // ---- Theme ----

    function applyTheme() {
        const mode = localStorage.getItem('mdict_theme') || 'system';
        const dark = mode === 'dark' ||
            (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.body.classList.toggle('dark', dark);
        if (window.AndroidBridge && window.AndroidBridge.setDarkMode) {
            window.AndroidBridge.setDarkMode(dark);
        }
    }

    function initThemeSettings() {
        const select = document.getElementById('theme-mode');
        if (!select) return;
        select.value = localStorage.getItem('mdict_theme') || 'system';
        select.addEventListener('change', () => {
            localStorage.setItem('mdict_theme', select.value);
            applyTheme();
        });
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
        }
    }

    // ---- Export ----

    function exportFavorites() {
        if (favorites.length === 0) {
            alert('暂无收藏单词');
            return;
        }
        const rows = [['word', 'dict', 'time']];
        favorites.forEach(f => {
            rows.push([f.word, (f.dictId || '').replace(/,/g, ' '), new Date(f.time).toISOString()]);
        });
        const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        if (window.AndroidBridge && window.AndroidBridge.saveTextToFile) {
            window.AndroidBridge.saveTextToFile(csv, 'mdict_favorites.csv');
        }
    }

    function exportLearnWords() {
        const rows = [['book', 'word', 'status']];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('learn_') || key === 'learn_last_book') continue;
            const book = key.replace('learn_', '');
            try {
                const data = JSON.parse(localStorage.getItem(key) || '{}');
                (data.known || []).forEach(w => rows.push([book, w, 'known']));
                (data.unknown || []).forEach(w => rows.push([book, w, 'unknown']));
            } catch (e) {}
        }
        if (rows.length === 1) {
            alert('暂无学习记录');
            return;
        }
        const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        if (window.AndroidBridge && window.AndroidBridge.saveTextToFile) {
            window.AndroidBridge.saveTextToFile(csv, 'mdict_learn_words.csv');
        }
    }

    function initExportButtons() {
        document.getElementById('btn-export-fav')?.addEventListener('click', exportFavorites);
        document.getElementById('btn-export-learn')?.addEventListener('click', exportLearnWords);
    }

    // ---- Sentence translation ----

    function handleLookupText(text) {
        const trimmed = text.trim();
        if (!trimmed) return;
        const words = trimmed.match(/[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'-]*/g) || [];
        const isLatin = words.length > 0;
        if (words.length >= 2 || !isLatin) {
            doTranslate(trimmed);
        } else {
            searchWord(trimmed);
        }
    }

    function loadTranslateConfig() {
        try {
            if (window.AndroidBridge && window.AndroidBridge.getTranslateConfig) {
                translateConfig = JSON.parse(window.AndroidBridge.getTranslateConfig());
            }
        } catch (e) {
            console.error('Load translate config error:', e);
        }
    }

    function engineDisplayName() {
        switch (translateConfig.engine) {
            case 'deepl': return 'DeepL';
            case 'openai': return translateConfig.model || 'OpenAI';
            default: return 'Google 翻译';
        }
    }

    function doTranslate(text) {
        translateRequestId++;
        currentTranslateId = translateRequestId;
        definitionArea.innerHTML = `
            <div class="translate-split">
                <div class="translate-half">
                    <div class="translate-half-title">原文</div>
                    <div class="translate-half-content">${escapeHtml(text)}</div>
                </div>
                <div class="translate-half">
                    <div class="translate-half-title">翻译 (${escapeHtml(engineDisplayName())})</div>
                    <div class="translate-half-content" id="translate-target-content">
                        <div style="color:#8D6E63">翻译中...</div>
                    </div>
                </div>
            </div>`;
        if (!window.AndroidBridge || !window.AndroidBridge.translate) {
            document.getElementById('translate-target-content').innerHTML = '当前环境不支持翻译';
            return;
        }
        window.AndroidBridge.translate(text, translateRequestId);
    }

    function onTranslateResult(id, result) {
        if (id !== currentTranslateId) return;
        const target = document.getElementById('translate-target-content');
        if (!target) return;
        if (result.startsWith('ERROR:')) {
            target.innerHTML = `
                <div style="color:#B71C1C">翻译失败：${escapeHtml(result.substring(6))}</div>
                <div style="margin-top:8px;color:#8D6E63">可在「设置 → 翻译设置」中更换翻译引擎</div>`;
            return;
        }
        target.innerHTML = escapeHtml(result);
    }

    function initTranslateSettings() {
        const engine = document.getElementById('translate-engine');
        if (!engine || !window.AndroidBridge) return;
        loadTranslateConfig();
        engine.value = translateConfig.engine || 'google';
        document.getElementById('translate-apikey').value = translateConfig.apiKey || '';
        document.getElementById('translate-baseurl').value = translateConfig.baseUrl || 'https://api.deepseek.com';
        const modelSel = document.getElementById('translate-model');
        if (translateConfig.model) {
            modelSel.innerHTML = '';
            const opt = document.createElement('option');
            opt.value = translateConfig.model;
            opt.textContent = translateConfig.model;
            modelSel.appendChild(opt);
        }
        document.getElementById('btn-list-models')?.addEventListener('click', listModels);
        document.getElementById('btn-save-translate')?.addEventListener('click', () => {
            const cfg = {
                engine: engine.value,
                apiKey: document.getElementById('translate-apikey').value.trim(),
                baseUrl: document.getElementById('translate-baseurl').value.trim(),
                model: document.getElementById('translate-model').value.trim()
            };
            try {
                if (window.AndroidBridge.saveTranslateConfig) {
                    window.AndroidBridge.saveTranslateConfig(JSON.stringify(cfg));
                }
                translateConfig = cfg;
                showImportStatus('translate-status', 'success', '翻译设置已保存');
            } catch (e) {
                showImportStatus('translate-status', 'error', '保存失败: ' + e.message);
            }
        });
    }

    function listModels() {
        const engineSel = document.getElementById('translate-engine');
        if (engineSel.value !== 'openai') {
            showImportStatus('translate-status', 'error', '仅 OpenAI 兼容引擎（DeepSeek 等）支持获取模型列表');
            return;
        }
        const apiKey = document.getElementById('translate-apikey').value.trim();
        if (!apiKey) {
            showImportStatus('translate-status', 'error', '请先填写 API Key');
            return;
        }
        // Persist current form values so the request uses them
        const cfg = {
            engine: 'openai',
            apiKey: apiKey,
            baseUrl: document.getElementById('translate-baseurl').value.trim(),
            model: document.getElementById('translate-model').value.trim()
        };
        try {
            if (window.AndroidBridge.saveTranslateConfig) {
                window.AndroidBridge.saveTranslateConfig(JSON.stringify(cfg));
            }
        } catch (e) {}
        modelsRequestId++;
        window.AndroidBridge.listModels(modelsRequestId);
        showImportStatus('translate-status', 'loading', '正在获取模型列表...');
    }

    function onModelsResult(id, json) {
        if (id !== modelsRequestId) return;
        let result;
        try {
            result = JSON.parse(json);
        } catch (e) {
            showImportStatus('translate-status', 'error', '响应解析失败');
            return;
        }
        if (!result.ok) {
            showImportStatus('translate-status', 'error', '获取失败: ' + (result.error || '未知错误'));
            return;
        }
        const sel = document.getElementById('translate-model');
        const current = sel.value || translateConfig.model || '';
        sel.innerHTML = '';
        const seen = {};
        (result.models || []).forEach(m => {
            if (!seen[m]) {
                seen[m] = true;
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                sel.appendChild(opt);
            }
        });
        if (current) {
            sel.value = current;
            if (!sel.value) {
                const opt = document.createElement('option');
                opt.value = current;
                opt.textContent = current + '（自定义）';
                sel.appendChild(opt);
                sel.value = current;
            }
        }
        showImportStatus('translate-status', 'success', '获取到 ' + result.models.length + ' 个模型');
    }

    function doSearchWord(word) {
        const result = currentDict.lookup(word);

        // Look up the same word in other enabled dictionaries
        const extraResults = [];
        const mainId = currentDictName;
        const enabled = getEnabledDicts();
        const loadedIds = new Set(Object.keys(window._dictParsers || {}));
        for (const id of enabled) {
            if (id === mainId) continue;
            // Lazily load dictionaries that are enabled but not loaded yet;
            // when ready, re-run the search if the word hasn't changed.
            if (!loadedIds.has(id)) {
                ensureDictLoaded(id, () => {
                    if (currentSearchWord !== word) return;
                    const mainBuff = window._dictBuffers && window._dictBuffers[mainId];
                    if (mainBuff) MDictLib.setBuffer(mainBuff);
                    doSearchWord(word);
                });
                continue;
            }
            const parser = window._dictParsers[id];
            const buff = window._dictBuffers && window._dictBuffers[id];
            if (buff) MDictLib.setBuffer(buff);
            const r = parser.lookup(word);
            if (r && r.definition) {
                extraResults.push({ id: id, name: dictName(id), html: r.definition });
            }
        }
        // Switch the global buffer back to the main dictionary
        const mainBuff = window._dictBuffers && window._dictBuffers[mainId];
        if (mainBuff) MDictLib.setBuffer(mainBuff);

        const extraHtml = extraResults.map(ex => `
            <div class="dict-extra-block">
                <div class="dict-extra-name">${escapeHtml(ex.name)}</div>
                <div class="def-content">${fixResourcePaths(ex.html)}</div>
            </div>
        `).join('');

        if (result) {
            currentDefinition = result;

            // Add to history
            addToHistory(word);

                // Find keyword index for navigation
                const keywords = currentDict.keywordList || [];
                currentKeywordIndex = keywords.findIndex(k => k.keyText.toLowerCase() === word.toLowerCase());

            // Check if favorited
            const isFav = favorites.some(f => f.word === word && f.dictId === currentDictName);

            let defHtml = result.definition || '<p style="color:#8D6E63">无释义</p>';

            // Try to fix relative resource paths
            defHtml = fixResourcePaths(defHtml);

            definitionArea.innerHTML = `
                <div class="word-header">
                    <span class="word-title">${escapeHtml(result.keyText)}</span>
                    <button class="btn-fav ${isFav ? 'favorited' : ''}" onclick="toggleFavorite('${escapeHtml(word)}')">
                        ${isFav ? '★' : '☆'}
                    </button>
                </div>
                <div class="definition-nav">
                    <button class="btn-nav" onclick="navWord(-1)" ${currentKeywordIndex <= 0 ? 'disabled' : ''}>← 上一个</button>
                    <button class="btn-nav" onclick="navWord(1)" ${currentKeywordIndex >= keywords.length - 1 ? 'disabled' : ''}>下一个 →</button>
                </div>
                <div class="def-content">${defHtml}</div>
                ${extraHtml}
            `;

            definitionArea.scrollTop = 0;
        } else if (extraResults.length > 0) {
            // Main dictionary has no match, but others do
            currentDefinition = null;
            currentKeywordIndex = -1;
            definitionArea.innerHTML = `
                <div class="no-result">
                    <div class="emoji">🔍</div>
                    <p>"${escapeHtml(word)}" 未收录于「${escapeHtml(dictName(mainId))}」，以下词典有收录:</p>
                </div>
                ${extraHtml}`;
            definitionArea.scrollTop = 0;
        } else {
            currentDefinition = null;
            currentKeywordIndex = -1;

            // Try fuzzy search
            const fuzzyResults = currentDict.containsSearch ? currentDict.containsSearch(word) : [];
            if (fuzzyResults.length > 0) {
                definitionArea.innerHTML = `
                    <div class="no-result">
                        <div class="emoji">🔍</div>
                        <p>未找到 "${escapeHtml(word)}" 的精确匹配</p>
                        <p style="margin-top:12px;color:#5D4037">您是否在找:</p>
                        <div style="margin-top:8px;text-align:left">
                            ${fuzzyResults.slice(0, 10).map(item => `
                                <div class="suggestion-item" onclick="window.searchWord('${escapeHtml(item.keyText)}')" style="padding:8px 0;cursor:pointer;color:#8D6E63">
                                    ${escapeHtml(item.keyText)}
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
            } else {
                definitionArea.innerHTML = `
                    <div class="no-result">
                        <div class="emoji">😕</div>
                        <p>未找到 "${escapeHtml(word)}"</p>
                    </div>`;
            }
        }
    }

    const SPEAKER_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='20' height='20' fill='%23F9A825'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3z'/%3E%3Cpath d='M16.5 12A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z'/%3E%3C/svg%3E";

    function fixResourcePaths(html) {
        if (!html) return html;
        // OALD-style sound buttons are empty <a href="sound://..."> links whose icon
        // is drawn by the dictionary css (often a bare glyph like 'θ'); inject a
        // real speaker icon instead and suppress the css glyph.
        html = html.replace(/<a\s+([^>]*href="sound:\/\/[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, inner) => {
            const img = `<img src="${SPEAKER_ICON}" alt="" style="vertical-align:middle;pointer-events:none">`;
            return `<a ${attrs}>${img}${inner}</a>`;
        });
        // Sound sources render as a speaker icon; tapping the wrapping link
        // plays audio via the sound:// handler
        html = html.replace(/src="sound:\/\/([^"]+)"/g, `src="${SPEAKER_ICON}"`);
        // Route relative resources (images, css, audio...) to the mdd loader
        html = html.replace(/(src|href)="([^"]+)"/g, (match, attr, path) => {
            if (path.startsWith('http') || path.startsWith('data:') ||
                path.startsWith('file:') || path.startsWith('#') ||
                path.startsWith('javascript:') || path.startsWith('sound://') ||
                path.startsWith('entry://')) {
                return match;
            }
            return `${attr}="file:///mdd_res/${encodeURIComponent(path)}"`;
        });
        html = html.replace(/href="entry:\/\//g, 'onclick="window.searchWord(\'');
        return html;
    }

    window.navWord = function(direction) {
        const keywords = currentDict?.keywordList || [];
        if (!keywords || currentKeywordIndex < 0) return;

        const newIndex = currentKeywordIndex + direction;
        if (newIndex < 0 || newIndex >= keywords.length) return;

        searchWord(keywords[newIndex].keyText);
    };

    function clearSearch() {
        searchInput.value = '';
        btnClear.classList.add('hidden');
        suggestionList.classList.add('hidden');
        searchInput.focus();
    }

    window.searchFromList = function(word, dictId) {
        // Switch to search tab
        switchTab('search');
        // Load the correct dictionary if needed
        if (dictId && dictSelect.value !== dictId) {
            dictSelect.value = dictId;
            loadDict(dictId);
        }
        // Search the word
        searchWord(word);
    };

    // History
    function addToHistory(word) {
        // Remove if exists
        searchHistory = searchHistory.filter(h => h.word !== word);
        // Add to front
        searchHistory.unshift({
            word: word,
            dictId: currentDictName,
            time: Date.now()
        });
        // Keep max 500
        if (searchHistory.length > 500) {
            searchHistory = searchHistory.slice(0, 500);
        }
        saveData();
    }

    function renderHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;

        if (searchHistory.length === 0) {
            list.innerHTML = '<div class="empty-msg">暂无查询记录</div>';
            return;
        }

        list.innerHTML = searchHistory.map(item => `
            <div class="word-item" onclick="window.searchFromList('${escapeHtml(item.word)}', '${escapeHtml(item.dictId || '')}')">
                <div>
                    <div class="word-item-text">${escapeHtml(item.word)}</div>
                    <div class="word-item-time">${formatTime(item.time)}</div>
                </div>
                <div class="word-item-actions">
                    <button class="btn-remove" onclick="event.stopPropagation();removeHistory('${escapeHtml(item.word)}')" title="删除">✕</button>
                </div>
            </div>
        `).join('');
    }

    function clearHistory() {
        if (!confirm('确定清空所有历史记录?')) return;
        searchHistory = [];
        saveData();
        renderHistory();
    }

    window.removeHistory = function(word) {
        searchHistory = searchHistory.filter(h => h.word !== word);
        saveData();
        renderHistory();
    };

    // Favorites
    function toggleFavorite(word) {
        const idx = favorites.findIndex(f => f.word === word && f.dictId === currentDictName);
        if (idx >= 0) {
            favorites.splice(idx, 1);
        } else {
            favorites.unshift({
                word: word,
                dictId: currentDictName,
                time: Date.now()
            });
        }
        saveData();

        // Update button
        const btn = definitionArea.querySelector('.btn-fav');
        if (btn) {
            const isFav = favorites.some(f => f.word === word && f.dictId === currentDictName);
            btn.className = `btn-fav ${isFav ? 'favorited' : ''}`;
            btn.textContent = isFav ? '★' : '☆';
        }
    }
    window.toggleFavorite = toggleFavorite;

    function renderFavorites() {
        const list = document.getElementById('favorites-list');
        const countEl = document.getElementById('fav-count');
        if (!list) return;

        if (countEl) countEl.textContent = favorites.length;

        if (favorites.length === 0) {
            list.innerHTML = '<div class="empty-msg">暂无收藏单词</div>';
            return;
        }

        list.innerHTML = favorites.map(item => `
            <div class="word-item" onclick="window.searchFromList('${escapeHtml(item.word)}', '${escapeHtml(item.dictId || '')}')">
                <div>
                    <div class="word-item-text">${escapeHtml(item.word)}</div>
                    <div class="word-item-time">${formatTime(item.time)}</div>
                </div>
                <div class="word-item-actions">
                    <button class="btn-remove" onclick="event.stopPropagation();removeFavorite('${escapeHtml(item.word)}')" title="取消收藏">✕</button>
                </div>
            </div>
        `).join('');
    }

    window.removeFavorite = function(word) {
        favorites = favorites.filter(f => !(f.word === word && f.dictId === currentDictName));
        saveData();
        renderFavorites();
    };

    // Tab switching
    function switchTab(tabName) {
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        if (tabName === 'history') renderHistory();
        if (tabName === 'favorites') renderFavorites();
        if (tabName === 'learn') initLearnBooks();
        else saveLearnProgress();
    }

    // Go back
    function goBack() {
        if (definitionArea.querySelector('.def-content')) {
            clearSearch();
            definitionArea.innerHTML = '';
            return 'handled';
        }
        const bookPicker = document.getElementById('book-picker-popup');
        if (bookPicker && !bookPicker.classList.contains('hidden')) {
            window.hideBookPicker();
            return 'handled';
        }
        const activeTab = document.querySelector('.nav-item.active');
        if (activeTab && activeTab.dataset.tab !== 'search') {
            switchTab('search');
            return 'handled';
        }
        return 'no_back';
    }

    // Utilities
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
    }

    function highlightMatch(text, query) {
        const lower = text.toLowerCase();
        const idx = lower.indexOf(query.toLowerCase());
        if (idx < 0) return escapeHtml(text);
        return escapeHtml(text.substring(0, idx)) +
               '<span class="highlight">' + escapeHtml(text.substring(idx, idx + query.length)) + '</span>' +
               escapeHtml(text.substring(idx + query.length));
    }

    function formatTime(timestamp) {
        const d = new Date(timestamp);
        const now = new Date();
        const diff = now - d;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    // ===== Learn Module =====
    const LEARN_DICT_PREFIX = 'dicts/';
    let learnBookList = [];
    let learnCurrentBook = null;
    let learnWords = [];
    let learnIndex = 0;
    let learnFlipped = false;
    let learnStats = { new: 0, known: 0, unknown: 0 };
    let learnMode = 'learn'; // 'learn' or 'review'
    let srsData = {}; // { wordName: { easeFactor, interval, nextReview, reviewCount } }
    let reviewQueue = [];
    let reviewDoneCount = 0;
    let learnLongPressActive = false;

    function setupLearnWordLongPress() {
        const wordElement = document.getElementById('learn-word');
        let longPressTimer = null;
        let isLongPress = false;

        // 长按开始
        const startLongPress = (e) => {
            isLongPress = false;
            learnLongPressActive = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                learnLongPressActive = true;
                // 获取当前单词
                if (learnWords.length > 0 && learnIndex < learnWords.length) {
                    const word = learnWords[learnIndex].name;
                    if (word) {
                        // 切换到搜索标签页并查询单词
                        switchTab('search');
                        searchWord(word);
                    }
                }
            }, 500); // 500ms 长按阈值
        };

        // 长按结束
        const endLongPress = (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            // 如果是长按，阻止后续的点击事件
            if (isLongPress) {
                e.preventDefault();
                e.stopPropagation();
                // 延迟重置标志，确保点击事件被阻止
                setTimeout(() => {
                    learnLongPressActive = false;
                }, 100);
            }
        };

        // 添加事件监听器
        wordElement.addEventListener('touchstart', startLongPress, { passive: true });
        wordElement.addEventListener('touchend', endLongPress);
        wordElement.addEventListener('touchmove', endLongPress);
        
        // 鼠标事件支持（桌面端）
        wordElement.addEventListener('mousedown', startLongPress);
        wordElement.addEventListener('mouseup', endLongPress);
        wordElement.addEventListener('mouseleave', endLongPress);
    }

    function initLearnBooks() {
        // 设置单词长按查询功能
        setupLearnWordLongPress();
        
        const lastBook = localStorage.getItem('learn_last_book');
        if (lastBook) {
            loadLearnBook(lastBook);
        } else {
            document.getElementById('learn-word').textContent = '请选择词书';
            document.getElementById('learn-phonetic').textContent = '点击左上角选择';
        }
    }

    // Mode switching
    window.switchLearnMode = function(mode) {
        if (!learnCurrentBook) return;
        learnMode = mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        if (mode === 'review') {
            startReview();
        } else {
            showLearnCard();
        }
    };

    // SRS functions
    function initSrsData(bookName) {
        const progress = loadLearnProgress(bookName);
        if (!progress.srs) {
            progress.srs = {};
            // Initialize SRS for all words
            learnWords.forEach(w => {
                if (!progress.srs[w.name]) {
                    progress.srs[w.name] = { easeFactor: 2.5, interval: 0, nextReview: 0, reviewCount: 0 };
                }
            });
            localStorage.setItem(getLearnStorageKey(bookName), JSON.stringify(progress));
        }
        srsData = progress.srs;
        // Ensure all words have SRS entry
        learnWords.forEach(w => {
            if (!srsData[w.name]) {
                srsData[w.name] = { easeFactor: 2.5, interval: 0, nextReview: 0, reviewCount: 0 };
            }
        });
    }

    function startReview() {
        const now = Date.now();
        reviewQueue = [];
        reviewDoneCount = 0;
        // Get words that need review (nextReview <= now)
        learnWords.forEach(w => {
            const srs = srsData[w.name];
            if (srs && srs.nextReview <= now) {
                reviewQueue.push(w);
            }
        });
        // Sort by nextReview ascending (oldest first)
        reviewQueue.sort((a, b) => (srsData[a.name]?.nextReview || 0) - (srsData[b.name]?.nextReview || 0));
        showReviewCard();
    }

    function showReviewCard() {
        const cardArea = document.getElementById('learn-card-area');
        const reviewActions = document.getElementById('review-actions');
        const learnActions = document.getElementById('learn-actions');
        const doneView = document.getElementById('learn-done-view');

        document.getElementById('learn-actions').classList.add('hidden');
        document.getElementById('review-actions').classList.remove('hidden');

        if (reviewQueue.length === 0) {
            doneView.classList.remove('hidden');
            cardArea.classList.add('hidden');
            reviewActions.classList.add('hidden');
            document.getElementById('learn-done-title').textContent = '今日复习完成！';
            document.getElementById('learn-done-stats').textContent = `已复习 ${reviewDoneCount} 个单词`;
            document.getElementById('learn-done-next').classList.remove('hidden');
            // Find next review time
            const nextTime = findNextReviewTime();
            document.getElementById('learn-done-next-text').textContent = nextTime;
            document.getElementById('learn-done-btn').textContent = '返回学习';
            document.getElementById('learn-done-btn').onclick = function() { window.switchLearnMode('learn'); };
            return;
        }

        doneView.classList.add('hidden');
        cardArea.classList.remove('hidden');
        reviewActions.classList.remove('hidden');

        const word = reviewQueue[0];
        document.getElementById('learn-word').textContent = word.name;
        document.getElementById('learn-phonetic').textContent =
            (word.ukphone ? '/' + word.ukphone + '/' : '') +
            (word.usphone && word.usphone !== word.ukphone ? '  /' + word.usphone + '/' : '');
        document.getElementById('learn-word-back').textContent = word.name;
        document.getElementById('learn-trans').innerHTML =
            (word.trans || []).map(t => escapeHtml(t)).join('<br>');

        learnFlipped = false;
        document.querySelector('.learn-card-front').classList.remove('hidden');
        document.querySelector('.learn-card-back').classList.add('hidden');

        // Update progress text
        const total = reviewQueue.length + reviewDoneCount;
        document.getElementById('learn-progress-text').textContent =
            `剩余 ${reviewQueue.length} / 已完成 ${reviewDoneCount}`;
    }

    function findNextReviewTime() {
        const now = Date.now();
        let earliest = Infinity;
        learnWords.forEach(w => {
            const srs = srsData[w.name];
            if (srs && srs.nextReview > now && srs.nextReview < earliest) {
                earliest = srs.nextReview;
            }
        });
        if (earliest === Infinity) return '暂无待复习单词';
        const diff = earliest - now;
        if (diff < 3600000) return `${Math.ceil(diff / 60000)} 分钟后可复习`;
        if (diff < 86400000) return `${Math.ceil(diff / 3600000)} 小时后可复习`;
        return `${Math.ceil(diff / 86400000)} 天后可复习`;
    }

    function calculateNextReview(word, quality) {
        const srs = srsData[word.name] || { easeFactor: 2.5, interval: 0, nextReview: 0, reviewCount: 0 };
        const now = Date.now();
        const DAY = 86400000;

        if (quality === 0) {
            // Again: reset
            srs.interval = 1;
            srs.easeFactor = Math.max(1.3, srs.easeFactor - 0.2);
            srs.nextReview = now + DAY; // review tomorrow
        } else if (quality === 1) {
            // Hard
            if (srs.interval === 0) srs.interval = 1;
            else srs.interval = Math.ceil(srs.interval * 1.2);
            srs.easeFactor = Math.max(1.3, srs.easeFactor - 0.15);
            srs.nextReview = now + srs.interval * DAY;
        } else if (quality === 2) {
            // Good
            if (srs.interval === 0) srs.interval = 1;
            else srs.interval = Math.ceil(srs.interval * srs.easeFactor);
            srs.nextReview = now + srs.interval * DAY;
        } else {
            // Easy
            if (srs.interval === 0) srs.interval = 4;
            else srs.interval = Math.ceil(srs.interval * srs.easeFactor * 1.3);
            srs.easeFactor += 0.15;
            srs.nextReview = now + srs.interval * DAY;
        }

        srs.reviewCount++;
        srsData[word.name] = srs;
    }

    window.reviewMark = function(quality) {
        if (reviewQueue.length === 0) return;
        const word = reviewQueue.shift();
        calculateNextReview(word, quality);

        // If "Again", put back at end of queue
        if (quality === 0) {
            reviewQueue.push(word);
        } else {
            reviewDoneCount++;
        }

        saveLearnProgress();
        showReviewCard();
    };

    window.showBookPicker = function() {
        const popup = document.getElementById('book-picker-popup');
        popup.classList.remove('hidden');

        if (learnBookList.length > 0) return;

        const listEl = document.getElementById('learn-book-list');
        const searchEl = document.getElementById('learn-search-book');
        listEl.innerHTML = '<div class="loading">加载词书列表...</div>';

        function onBookListLoaded(files) {
            learnBookList = files;
            renderLearnBookList(learnBookList);
        }

        function onBookListError() {
            listEl.innerHTML = '<div class="empty-msg">加载失败</div>';
        }

        // Try bridge first (most reliable on Android), then fetch
        if (window.AndroidBridge && window.AndroidBridge.readAssetFile) {
            try {
                const json = window.AndroidBridge.readAssetFile('dicts/index.json');
                if (json) {
                    onBookListLoaded(JSON.parse(json));
                    searchEl.oninput = () => {
                        const q = searchEl.value.trim().toLowerCase();
                        const filtered = learnBookList.filter(b => b.toLowerCase().includes(q));
                        renderLearnBookList(filtered);
                    };
                    return;
                }
            } catch (e) {
                console.error('Bridge load failed:', e);
            }
        }

        // Fallback: fetch
        fetch('dicts/index.json').then(r => r.json()).then(files => {
            onBookListLoaded(files);
        }).catch(() => {
            onBookListError();
        });

        searchEl.oninput = () => {
            const q = searchEl.value.trim().toLowerCase();
            const filtered = learnBookList.filter(b => b.toLowerCase().includes(q));
            renderLearnBookList(filtered);
        };
    };

    window.hideBookPicker = function() {
        document.getElementById('book-picker-popup').classList.add('hidden');
    };

    function loadLearnBook(bookName) {
        learnCurrentBook = bookName;
        localStorage.setItem('learn_last_book', bookName);
        window.hideBookPicker();
        document.getElementById('learn-book-title').textContent = bookName;

        const cardArea = document.getElementById('learn-card-area');
        const actions = document.querySelector('.learn-actions');
        const doneView = document.getElementById('learn-done-view');
        doneView.classList.add('hidden');
        actions.classList.add('hidden');
        cardArea.classList.remove('hidden');
        document.getElementById('learn-word').textContent = '加载中...';
        document.getElementById('learn-phonetic').textContent = '';
        document.querySelector('.learn-card-front').classList.remove('hidden');
        document.querySelector('.learn-card-back').classList.add('hidden');

        setTimeout(() => {
            try {
                let text = '';
                if (window.AndroidBridge && window.AndroidBridge.readAssetFileBase64) {
                    text = readGzAsset('dicts/' + bookName + '.json.gz');
                }
                if (!text && window.AndroidBridge && window.AndroidBridge.readAssetFile) {
                    text = window.AndroidBridge.readAssetFile('dicts/' + bookName + '.json');
                }
                if (!text) {
                    // Fallback: fetch
                    fetch('dicts/' + bookName + '.json').then(r => r.text()).then(t => {
                        if (t) {
                            processLearnWords(bookName, JSON.parse(t));
                        } else {
                            document.getElementById('learn-word').textContent = '加载失败';
                        }
                    }).catch(() => {
                        document.getElementById('learn-word').textContent = '加载失败';
                    });
                    return;
                }
                if (text) {
                    processLearnWords(bookName, JSON.parse(text));
                } else {
                    document.getElementById('learn-word').textContent = '加载失败';
                }
            } catch (e) {
                console.error('Load error:', e);
                document.getElementById('learn-word').textContent = '加载失败: ' + e.message;
            }
        }, 10);
    }

    window._dictJsonCallback = function() {};

    // Read a gzipped asset (stored as .json.gz) and return its text content
    function readGzAsset(path) {
        if (!window.AndroidBridge || !window.AndroidBridge.readAssetFileBase64) return '';
        const b64 = window.AndroidBridge.readAssetFileBase64(path);
        if (!b64) return '';
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(pako.inflate(bytes));
    }

    function processLearnWords(bookName, words) {
        learnWords = words;
        learnIndex = 0;
        learnFlipped = false;
        learnStats = { new: 0, known: 0, unknown: 0 };

        const progress = loadLearnProgress(bookName);
        const knownSet = new Set(progress.known || []);
        const unknownSet = new Set(progress.unknown || []);

        for (let i = 0; i < learnWords.length; i++) {
            const w = learnWords[i];
            if (knownSet.has(w.name)) { learnStats.known++; w._status = 'known'; }
            else if (unknownSet.has(w.name)) { learnStats.unknown++; w._status = 'unknown'; }
            else { learnStats.new++; }
        }

        initSrsData(bookName);
        shuffleNewWords();
        learnMode = 'learn';
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'learn'));
        document.getElementById('learn-actions').classList.remove('hidden');
        document.getElementById('review-actions').classList.add('hidden');
        showLearnCard();
    }

    function renderLearnBookList(books) {
        const listEl = document.getElementById('learn-book-list');
        listEl.innerHTML = books.map(name => `
            <div class="learn-book-item" data-book="${name}">
                <span class="learn-book-name">${escapeHtml(name)}</span>
            </div>
        `).join('');
        listEl.querySelectorAll('.learn-book-item').forEach(item => {
            item.addEventListener('click', () => {
                loadLearnBook(item.dataset.book);
            });
        });
    }

    function shuffleNewWords() {
        const newWords = learnWords.filter(w => !w._status);
        for (let i = newWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newWords[i], newWords[j]] = [newWords[j], newWords[i]];
        }
        const known = learnWords.filter(w => w._status === 'known');
        learnWords = [...newWords, ...known];
    }

    function showLearnCard() {
        const doneView = document.getElementById('learn-done-view');
        const cardArea = document.getElementById('learn-card-area');
        const learnActions = document.getElementById('learn-actions');
        const reviewActions = document.getElementById('review-actions');

        document.getElementById('stat-new').textContent = learnStats.new;
        document.getElementById('stat-known').textContent = learnStats.known;
        document.getElementById('stat-unknown').textContent = learnStats.unknown;

        const total = learnWords.length;
        const done = learnStats.known + learnStats.unknown;
        document.getElementById('learn-progress-text').textContent =
            total > 0 ? `${done}/${total}` : '0/0';

        const remaining = learnWords.filter(w => !w._status);
        if (remaining.length === 0) {
            doneView.classList.remove('hidden');
            cardArea.classList.add('hidden');
            learnActions.classList.add('hidden');
            reviewActions.classList.add('hidden');
            document.getElementById('learn-done-title').textContent = '今日学习完成！';
            document.getElementById('learn-done-stats').textContent =
                `掌握 ${learnStats.known} 词，待复习 ${learnStats.unknown} 词`;
            document.getElementById('learn-done-next').classList.add('hidden');
            document.getElementById('learn-done-btn').textContent = '再学一轮';
            document.getElementById('learn-done-btn').onclick = function() { window.learnReset(); };
            saveLearnProgress();
            return;
        }

        doneView.classList.add('hidden');
        cardArea.classList.remove('hidden');
        learnActions.classList.remove('hidden');
        reviewActions.classList.add('hidden');

        while (learnIndex < learnWords.length && learnWords[learnIndex]._status) learnIndex++;
        if (learnIndex >= learnWords.length) {
            learnIndex = 0;
            while (learnIndex < learnWords.length && learnWords[learnIndex]._status) learnIndex++;
            if (learnIndex >= learnWords.length) {
                doneView.classList.remove('hidden');
                cardArea.classList.add('hidden');
                learnActions.classList.add('hidden');
                reviewActions.classList.add('hidden');
                saveLearnProgress();
                return;
            }
        }

        const word = learnWords[learnIndex];
        document.getElementById('learn-word').textContent = word.name;
        document.getElementById('learn-phonetic').textContent =
            (word.ukphone ? '/' + word.ukphone + '/' : '') +
            (word.usphone && word.usphone !== word.ukphone ? '  /' + word.usphone + '/' : '');
        document.getElementById('learn-word-back').textContent = word.name;
        document.getElementById('learn-trans').innerHTML =
            (word.trans || []).map(t => escapeHtml(t)).join('<br>');

        learnFlipped = false;
        document.querySelector('.learn-card-front').classList.remove('hidden');
        document.querySelector('.learn-card-back').classList.add('hidden');
    }

    window.learnFlip = function() {
        // 如果长按激活，不执行翻转
        if (learnLongPressActive) return;
        
        learnFlipped = !learnFlipped;
        document.querySelector('.learn-card-front').classList.toggle('hidden', learnFlipped);
        document.querySelector('.learn-card-back').classList.toggle('hidden', !learnFlipped);
    };

    window.learnMark = function(isKnown) {
        if (learnIndex >= learnWords.length) return;
        const word = learnWords[learnIndex];
        if (isKnown) {
            if (word._status !== 'known') learnStats.known++;
            if (!word._status) learnStats.new--;
            else if (word._status === 'unknown') learnStats.unknown--;
            word._status = 'known';
        } else {
            if (word._status !== 'unknown') learnStats.unknown++;
            if (!word._status) learnStats.new--;
            else if (word._status === 'known') learnStats.known--;
            word._status = 'unknown';
        }
        learnIndex++;
        saveLearnProgress();
        showLearnCard();
    };

    window.learnBack = function() {
        window.hideBookPicker();
    };

    window.learnReset = function() {
        learnIndex = 0;
        learnStats = { new: 0, known: 0, unknown: 0 };
        learnWords.forEach(w => {
            w._status = null;
            learnStats.new++;
        });
        shuffleNewWords();
        learnMode = 'learn';
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'learn'));
        document.getElementById('learn-actions').classList.remove('hidden');
        document.getElementById('review-actions').classList.add('hidden');
        document.getElementById('learn-done-next').classList.add('hidden');
        document.getElementById('learn-done-btn').textContent = '再学一轮';
        document.getElementById('learn-done-btn').onclick = function() { window.learnReset(); };
        showLearnCard();
    };

    function getLearnStorageKey(bookName) { return 'learn_' + bookName; }

    function loadLearnProgress(bookName) {
        try { return JSON.parse(localStorage.getItem(getLearnStorageKey(bookName))) || {}; }
        catch(e) { return {}; }
    }

    function saveLearnProgress() {
        if (!learnCurrentBook) return;
        const known = [], unknown = [];
        learnWords.forEach(w => {
            if (w._status === 'known') known.push(w.name);
            else if (w._status === 'unknown') unknown.push(w.name);
        });
        localStorage.setItem(getLearnStorageKey(learnCurrentBook), JSON.stringify({ known, unknown, srs: srsData }));
    }

    // Word List Panel
    let wordListOpen = false;
    let wordListType = '';

    window.toggleWordList = function(type) {
        const panel = document.getElementById('word-list-panel');
        const cardArea = document.getElementById('learn-card-area');
        const actions = document.querySelector('.learn-actions');
        const doneView = document.getElementById('learn-done-view');
        if (wordListOpen && wordListType === type) {
            panel.classList.add('hidden');
            cardArea.classList.remove('hidden');
            actions.classList.remove('hidden');
            wordListOpen = false;
            return;
        }
        wordListType = type;
        wordListOpen = true;
        renderWordList(type);
        panel.classList.remove('hidden');
        cardArea.classList.add('hidden');
        actions.classList.add('hidden');
        doneView.classList.add('hidden');
    };

    window.closeWordList = function() {
        document.getElementById('word-list-panel').classList.add('hidden');
        document.getElementById('learn-card-area').classList.remove('hidden');
        document.querySelector('.learn-actions').classList.remove('hidden');
        wordListOpen = false;
    };

    function renderWordList(type) {
        const titleEl = document.getElementById('word-list-title');
        const contentEl = document.getElementById('word-list-content');

        const titles = { new: '新词', known: '已掌握', unknown: '待复习' };
        titleEl.textContent = titles[type] + ' (' + learnStats[type] + ')';

        let words = [];
        if (type === 'new') {
            words = learnWords.filter(w => !w._status);
        } else if (type === 'known') {
            words = learnWords.filter(w => w._status === 'known');
        } else if (type === 'unknown') {
            words = learnWords.filter(w => w._status === 'unknown');
        }

        if (words.length === 0) {
            contentEl.innerHTML = '<div class="empty-msg">暂无单词</div>';
            return;
        }

        contentEl.innerHTML = words.map(w => `
            <div class="word-list-item" onclick="window.learnJumpToWord('${escapeHtml(w.name)}')">
                <div class="word-list-word">${escapeHtml(w.name)}</div>
                <div class="word-list-trans">${escapeHtml((w.trans || []).slice(0, 2).join(', '))}</div>
            </div>
        `).join('');
    }

    window.learnJumpToWord = function(word) {
        const idx = learnWords.findIndex(w => w.name === word);
        if (idx >= 0) {
            learnIndex = idx;
            learnFlipped = false;
            showLearnCard();
            window.closeWordList();
        }
    };

    // About popup
    const aboutPopup = document.getElementById('about-popup');
    document.getElementById('btn-about').addEventListener('click', function() {
        aboutPopup.classList.remove('hidden');
    });
    window.hideAbout = function() {
        aboutPopup.classList.add('hidden');
    };

    // Show the real installed version (from the APK) instead of a hardcoded one
    if (window.AndroidBridge && window.AndroidBridge.getAppVersion) {
        const v = window.AndroidBridge.getAppVersion();
        if (v) {
            document.querySelectorAll('#app-version-main, #app-version-about').forEach(el => {
                el.textContent = v;
            });
        }
    }

    // Start
    init();
    applyCustomCSS();
})();
