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
        loadTranslateConfig();
        initTranslateSettings();
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
        document.getElementById('btn-import-mdx')?.addEventListener('click', () => pickFile('*/*'));
        document.getElementById('btn-import-css')?.addEventListener('click', () => pickFile('text/css,.css'));

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
                        processFile(file.name, base64);
                    };
                    reader.readAsArrayBuffer(file);
                });
            };
            input.click();
        }
    }

    function onFilesPicked(uris) {
        uris.forEach(uri => {
            const fileName = window.AndroidBridge?.getFileName(uri) || 'unknown.mdx';

            if (fileName.endsWith('.css')) {
                const base64 = window.AndroidBridge?.readFileAsBase64(uri) || '';
                if (base64) processCSSFile(fileName, base64);
                return;
            }

            if (!fileName.endsWith('.mdx')) {
                showImportStatus('import-status', 'error', '仅支持 .mdx 文件');
                return;
            }

            // Save to internal storage first
            showImportStatus('import-status', 'loading', '正在保存词典...');
            let internalPath = '';
            if (window.AndroidBridge) {
                internalPath = window.AndroidBridge.saveFileToInternal(uri, fileName) || '';
            }

            const base64 = window.AndroidBridge?.readFileAsBase64(uri) || '';
            if (base64) {
                processFile(fileName, base64, internalPath);
            }
        });
    }

    function processFile(fileName, base64Data, internalPath) {
        if (fileName.endsWith('.css')) {
            processCSSFile(fileName, base64Data);
            return;
        }

        if (!fileName.endsWith('.mdx')) {
            showImportStatus('import-status', 'error', '仅支持 .mdx 文件');
            return;
        }

        // Re-import invalidates any cached index for this file
        if (window.AndroidBridge && window.AndroidBridge.deleteDictCache) {
            window.AndroidBridge.deleteDictCache(fileName + '.idx.json');
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

                const info = {
                    title: parser.header?.Title || fileName.replace('.mdx',''),
                    keywordCount: parser.keywordList?.length || 0,
                    version: parser.meta?.version || 0,
                    encoding: parser.meta?.encoding || 'UTF-8'
                };

                console.log('Parse complete:', info);

                const dictId = fileName.replace('.mdx', '');
                const dictData = {
                    id: dictId,
                    name: info.title || fileName,
                    fileName: fileName,
                    keywordCount: info.keywordCount,
                    version: info.version,
                    encoding: info.encoding,
                    internalPath: internalPath || ''
                };

                allDicts = allDicts.filter(d => d.id !== dictId);
                allDicts.push(dictData);
                localStorage.setItem('mdict_dicts', JSON.stringify(allDicts));

                window._dictParsers = window._dictParsers || {};
                window._dictParsers[dictId] = parser;

                showImportStatus('import-status', 'success',
                    `导入成功: ${info.title} (${info.keywordCount} 词条)`);
                refreshDictList();
            } catch (e) {
                console.error('Parse error:', e);
                showImportStatus('import-status', 'error', `解析失败: ${e.message}`);
            }
        }, 100);
    }

    function processCSSFile(fileName, base64Data) {
        try {
            const css = atob(base64Data);
            customCSS = css;
            applyCustomCSS();
            saveData();
            showImportStatus('css-import-status', 'success', `CSS 导入成功: ${fileName}`);
        } catch (e) {
            showImportStatus('css-import-status', 'error', `CSS 导入失败: ${e.message}`);
        }
    }

    function applyCustomCSS() {
        let styleEl = document.getElementById('custom-dict-css');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'custom-dict-css';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = customCSS;
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
                manageList.innerHTML = allDicts.map(dict => `
                    <div class="dict-manage-item">
                        <div class="dict-manage-info">
                            <div class="dict-manage-name">${escapeHtml(dict.name)}</div>
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

    window.deleteDict = function(dictId) {
        if (!confirm('确定删除此词典?')) return;
        const dictInfo = allDicts.find(d => d.id === dictId);
        if (dictInfo && window.AndroidBridge && window.AndroidBridge.deleteDictCache) {
            window.AndroidBridge.deleteDictCache(dictInfo.fileName + '.idx.json');
        }
        allDicts = allDicts.filter(d => d.id !== dictId);
        localStorage.setItem('mdict_dicts', JSON.stringify(allDicts));
        if (window._dictParsers) {
            delete window._dictParsers[dictId];
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

        // Parser already in memory and buffer matches this file -> instant
        if (window._dictParsers && window._dictParsers[dictId] &&
            window._currentBufferPath === dictInfo.internalPath) {
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
                        window._currentBufferPath = dictInfo.internalPath;
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
                MDictLib.setBuffer(base64ToArrayBuffer(base64));
                const parser = new MDictLib.MDX('dummy');
                window._dictParsers = window._dictParsers || {};
                window._dictParsers[dictId] = parser;
                window._currentBufferPath = dictInfo.internalPath;
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
                const compRes = word.localeCompare(list[mid].keyText);
                if (compRes > 0) {
                    left = mid + 1;
                } else if (compRes === 0) {
                    break;
                } else {
                    right = mid - 1;
                }
            }
            if (word.localeCompare(list[mid].keyText) !== 0 && !isAssociate) {
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
        const results = currentDict.prefix(value);
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

    function searchWord(word) {
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

    function buildLookupCandidates(word) {
        const candidates = [word];
        const lower = word.toLowerCase();
        if (lower !== word && !candidates.includes(lower)) candidates.push(lower);
        const cap = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        if (cap !== word && !candidates.includes(cap)) candidates.push(cap);
        return candidates;
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
            `;

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

    function fixResourcePaths(html) {
        if (!html) return html;
        // Fix img src and link href for local resources
        html = html.replace(/src="([^"]+)"/g, (match, path) => {
            if (path.startsWith('http') || path.startsWith('data:')) return match;
            return `src="file:///android_asset/dict_res/${path}"`;
        });
        html = html.replace(/href="sound:\/\//g, 'href="');
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
                if (window.AndroidBridge && window.AndroidBridge.readAssetFile) {
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

    // Start
    init();
    applyCustomCSS();
})();
