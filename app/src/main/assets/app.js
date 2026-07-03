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

        definitionArea.innerHTML = '';
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
            if (allDicts.length === 0) {
                definitionArea.innerHTML = '';
            } else {
                definitionArea.innerHTML = '';
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
            const fuzzyResults = currentDict.containsSearch(word);
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

    function initLearnBooks() {
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

        // Use async fetch instead of bridge
        fetch('dicts/index.json').then(r => r.json()).then(files => {
            learnBookList = files;
            renderLearnBookList(learnBookList);
        }).catch(() => {
            // Fallback: use bridge
            if (window.AndroidBridge && window.AndroidBridge.listDictJsonFiles) {
                try {
                    const json = window.AndroidBridge.listDictJsonFiles();
                    learnBookList = JSON.parse(json);
                    renderLearnBookList(learnBookList);
                } catch (e) {
                    listEl.innerHTML = '<div class="empty-msg">加载失败</div>';
                }
            }
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

    function renderLearnBookList(books) {
        const listEl = document.getElementById('learn-book-list');
        const countEl = document.getElementById('learn-book-count');
        countEl.textContent = books.length;
        listEl.innerHTML = books.map(name => `
            <div class="learn-book-item" data-book="${name}">
                <span class="learn-book-name">${escapeHtml(name)}</span>
            </div>
        `).join('');
        listEl.querySelectorAll('.learn-book-item').forEach(item => {
            item.addEventListener('click', () => {
                window.learnSelectBook(item.dataset.book);
            });
        });
    }

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
                if (window.AndroidBridge && window.AndroidBridge.readDictJson) {
                    text = window.AndroidBridge.readDictJson(bookName);
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

    // Start
    init();
    applyCustomCSS();
})();
