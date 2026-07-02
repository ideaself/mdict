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

        // Welcome import button
        document.getElementById('btn-import-welcome')?.addEventListener('click', () => pickFile('application/octet-stream,.mdx'));

        // Tab navigation
        navItems.forEach(item => {
            item.addEventListener('click', () => switchTab(item.dataset.tab));
        });

        // History
        document.getElementById('btn-clear-history')?.addEventListener('click', clearHistory);

        // Settings
        document.getElementById('btn-import-mdx')?.addEventListener('click', () => pickFile('application/octet-stream,.mdx'));
        document.getElementById('btn-import-css')?.addEventListener('click', () => pickFile('text/css,.css'));

        // Global functions
        window.onFilesPicked = onFilesPicked;
        window.searchWord = searchWord;
        window.goBack = goBack;

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box') && !e.target.closest('.suggestion-list')) {
                suggestionList.classList.add('hidden');
            }
        });
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
        allDicts = allDicts.filter(d => d.id !== dictId);
        localStorage.setItem('mdict_dicts', JSON.stringify(allDicts));
        if (window._dictParsers) {
            delete window._dictParsers[dictId];
        }
        if (currentDict && currentDict.id === dictId) {
            currentDict = null;
            currentDictName = '';
            definitionArea.innerHTML = `
                <div class="welcome-msg">
                    <div class="welcome-icon">📖</div>
                    <h2>MDict 词典</h2>
                    <p>请先导入词典文件 (.mdx)</p>
                </div>`;
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

    function loadDict(dictId) {
        if (window._dictParsers && window._dictParsers[dictId]) {
            // Parser exists in memory, just need to set it as current
            // But we must re-set the buffer because js-mdict uses global scanner
            const dictInfo = allDicts.find(d => d.id === dictId);
            if (dictInfo && dictInfo.internalPath && window.AndroidBridge) {
                const base64 = window.AndroidBridge.readLocalFile(dictInfo.internalPath);
                if (base64) {
                    MDictLib.setBuffer(base64ToArrayBuffer(base64));
                    // Re-create parser with fresh buffer
                    window._dictParsers[dictId] = new MDictLib.MDX('dummy');
                }
            }
            currentDict = window._dictParsers[dictId];
            currentDictName = dictId;
            return;
        }

        const dictInfo = allDicts.find(d => d.id === dictId);
        if (!dictInfo) return;

        // Load from internal storage
        if (dictInfo.internalPath && window.AndroidBridge) {
            const base64 = window.AndroidBridge.readLocalFile(dictInfo.internalPath);
            if (base64) {
                MDictLib.setBuffer(base64ToArrayBuffer(base64));
                const parser = new MDictLib.MDX('dummy');
                window._dictParsers = window._dictParsers || {};
                window._dictParsers[dictId] = parser;
                currentDict = parser;
                currentDictName = dictId;
                return;
            }
        }

        definitionArea.innerHTML = `
            <div class="no-result">
                <div class="emoji">⚠️</div>
                <p>需要重新导入词典文件</p>
                <button class="btn-primary" onclick="window.pickFileForImport()" style="margin-top:12px">导入词典</button>
            </div>`;
    }

    function base64ToArrayBuffer(base64) {
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes.buffer;
    }

    window.pickFileForImport = function() {
        pickFile('application/octet-stream,.mdx');
    };

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
            doSearch();
        } else if (e.key === 'Escape') {
            suggestionList.classList.add('hidden');
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
            if (allDicts.length === 0) {
                definitionArea.innerHTML = '<div class="no-result"><div class="emoji">📚</div><p>请先导入词典</p></div>';
            } else {
                definitionArea.innerHTML = '<div class="no-result"><div class="emoji">👆</div><p>请先选择词典</p></div>';
            }
            return;
        }

        doSearchWord(word);
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

            let defHtml = result.definition || '<p style="color:#999">无释义</p>';

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
            const fuzzyResults = currentDict.containsSearch(word);
            if (fuzzyResults.length > 0) {
                definitionArea.innerHTML = `
                    <div class="no-result">
                        <div class="emoji">🔍</div>
                        <p>未找到 "${escapeHtml(word)}" 的精确匹配</p>
                        <p style="margin-top:12px;color:#666">您是否在找:</p>
                        <div style="margin-top:8px;text-align:left">
                            ${fuzzyResults.slice(0, 10).map(item => `
                                <div class="suggestion-item" onclick="window.searchWord('${escapeHtml(item.keyText)}')" style="padding:8px 0;cursor:pointer;color:#1976D2">
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
    }

    // Go back
    function goBack() {
        if (definitionArea.querySelector('.def-content')) {
            clearSearch();
            definitionArea.innerHTML = `
                <div class="welcome-msg">
                    <div class="welcome-icon">📖</div>
                    <h2>MDict 词典</h2>
                    <p>请先导入词典文件 (.mdx)</p>
                    <button id="btn-import-welcome" class="btn-primary">导入词典</button>
                </div>`;
            document.getElementById('btn-import-welcome')?.addEventListener('click', () => pickFile('application/octet-stream,.mdx'));
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

    // Start
    init();
    applyCustomCSS();
})();
