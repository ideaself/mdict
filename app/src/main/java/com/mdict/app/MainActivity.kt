package com.mdict.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Outline
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowInsets
import android.widget.Toast
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import android.os.Environment
import android.os.Build
import androidx.activity.OnBackPressedCallback
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var dimOverlay: View
    private var pendingLookupWord: String? = null
    private var webViewReady = false
    private var lookupMode = false
    private var launchedForLookup = false

    companion object {
        private const val TAG = "MDict"
        private const val FILE_PICK_REQUEST = 1001
        private const val PERMISSION_REQUEST = 1002
        private const val EXPORT_REQUEST = 1004
    }

    private var pendingExportContent: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        if (isLookupAction(intent?.action)) {
            setTheme(R.style.Theme_MDict_Lookup)
        }
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        dimOverlay = findViewById(R.id.dim_overlay)
        dimOverlay.setOnClickListener { closeLookupWindow() }

        if (!isLookupAction(intent?.action)) {
            checkPermissions()
        }

        webView = findViewById(R.id.webview)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            databaseEnabled = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d(TAG, "JS: ${consoleMessage?.message()}")
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("sound://")) {
                    val key = url.removePrefix("sound://")
                    playSoundFromMdd(key)
                    return true
                }
                if (url.startsWith("entry://")) {
                    // Handle internal dictionary links
                    val word = url.removePrefix("entry://")
                    view?.evaluateJavascript("window.searchWord(${jsEscape(word)})", null)
                    return true
                }
                return false
            }

            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): android.webkit.WebResourceResponse? {
                val url = request?.url?.toString() ?: return null
                if (url.startsWith("file:///mdd_res/")) {
                    val key = Uri.decode(url.removePrefix("file:///mdd_res/"))
                    val bytes = loadMddResource(key)
                    if (bytes != null) {
                        return android.webkit.WebResourceResponse(
                            guessMime(key),
                            null,
                            ByteArrayInputStream(bytes)
                        )
                    }
                    return android.webkit.WebResourceResponse(
                        "text/plain",
                        "utf-8",
                        ByteArrayInputStream(ByteArray(0))
                    )
                }
                return null
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                webViewReady = true
                syncLookupModeToWeb()
                pendingLookupWord?.let { text ->
                    pendingLookupWord = null
                    handleLookupText(text)
                }
            }
        }

        webView.addJavascriptInterface(WebViewBridge(), "AndroidBridge")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (lookupMode) {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        closeLookupWindow()
                    }
                    return
                }
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    webView.evaluateJavascript("window.goBack()", { result ->
                        if (result == "null" || result == "\"no_back\"") {
                            finish()
                        }
                    })
                }
            }
        })

        webView.loadUrl("file:///android_asset/index.html")

        launchedForLookup = isLookupAction(intent?.action)
        if (launchedForLookup) {
            enterLookupMode()
        }
        handleLookupIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        when (intent.action) {
            Intent.ACTION_PROCESS_TEXT, Intent.ACTION_SEND -> {
                if (!lookupMode) enterLookupMode()
                handleLookupIntent(intent)
            }
            else -> {
                exitedFullscreenFromPopup()
            }
        }
    }

    private fun isLookupAction(action: String?): Boolean =
        action == Intent.ACTION_PROCESS_TEXT || action == Intent.ACTION_SEND

    private fun exitedFullscreenFromPopup() {
        if (lookupMode) exitLookupMode()
    }

    private fun enterLookupMode() {
        if (lookupMode) return
        val dm = resources.displayMetrics
        val density = dm.density
        val cardW = (dm.widthPixels * 0.92).toInt().coerceAtMost((420 * density).toInt())
        val cardH = (dm.heightPixels * 0.60).toInt().coerceAtMost((520 * density).toInt())
        dimOverlay.visibility = View.VISIBLE
        webView.layoutParams = android.widget.FrameLayout.LayoutParams(cardW, cardH, Gravity.CENTER)
        makeRoundedCorners()
        hideStatusBar()
        lookupMode = true
        syncLookupModeToWeb()
    }

    private fun exitLookupMode() {
        if (!lookupMode) return
        dimOverlay.visibility = View.GONE
        webView.layoutParams = android.widget.FrameLayout.LayoutParams(
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT
        )
        restoreCorners()
        showStatusBar()
        lookupMode = false
        syncLookupModeToWeb()
    }

    private fun closeLookupWindow() {
        if (launchedForLookup) {
            finish()
        } else {
            exitLookupMode()
        }
    }

    private fun hideStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.hide(WindowInsets.Type.statusBars())
        } else {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN
        }
    }

    private fun showStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.show(WindowInsets.Type.statusBars())
        } else {
            window.decorView.systemUiVisibility = 0
        }
    }

    private fun makeRoundedCorners() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return
        val radius = 20 * resources.displayMetrics.density
        webView.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View?, outline: Outline?) {
                if (view == null || outline == null) return
                outline.setRoundRect(0, 0, view.width, view.height, radius)
            }
        }
        webView.clipToOutline = true
    }

    private fun restoreCorners() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return
        webView.outlineProvider = ViewOutlineProvider.BACKGROUND
        webView.clipToOutline = false
    }

    private fun syncLookupModeToWeb() {
        if (::webView.isInitialized && webViewReady) {
            webView.evaluateJavascript("window.setLookupMode($lookupMode)", null)
        }
    }

    private fun handleLookupIntent(intent: Intent?) {
        val text = extractLookupText(intent) ?: return
        pendingLookupWord = text
        if (webViewReady) {
            pendingLookupWord = null
            handleLookupText(text)
        }
    }

    private fun extractLookupText(intent: Intent?): String? {
        if (intent == null) return null
        return when (intent.action) {
            Intent.ACTION_PROCESS_TEXT ->
                intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()?.trim()
            Intent.ACTION_SEND ->
                intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()?.trim()
            else -> null
        }
    }

    private fun handleLookupText(text: String) {
        webView.evaluateJavascript("window.handleLookupText(${jsEscape(text)})", null)
    }

    private fun jsEscape(s: String): String {
        return org.json.JSONObject.quote(s)
    }

    // ---- Translation engines ----

    private fun readTranslateConfig(): org.json.JSONObject {
        val sp = getSharedPreferences("mdict", MODE_PRIVATE)
        return org.json.JSONObject().apply {
            put("engine", sp.getString("t_engine", "google"))
            put("apiKey", sp.getString("t_apikey", ""))
            put("baseUrl", sp.getString("t_baseurl", "https://api.deepseek.com"))
            put("model", sp.getString("t_model", "deepseek-chat"))
        }
    }

    private fun saveTranslateConfigInternal(json: String) {
        try {
            val o = org.json.JSONObject(json)
            getSharedPreferences("mdict", MODE_PRIVATE).edit()
                .putString("t_engine", o.optString("engine", "google"))
                .putString("t_apikey", o.optString("apiKey", ""))
                .putString("t_baseurl", o.optString("baseUrl", "https://api.deepseek.com"))
                .putString("t_model", o.optString("model", "deepseek-chat"))
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Save translate config error: ${e.message}")
        }
    }

    private fun doTranslate(text: String): String {
        val cfg = readTranslateConfig()
        val target = if (containsCJK(text)) "en" else "zh"
        return when (cfg.optString("engine", "google")) {
            "deepl" -> translateDeepl(text, target, cfg)
            "openai" -> translateOpenAI(text, target, cfg)
            else -> translateGoogle(text, target)
        }
    }

    private fun containsCJK(text: String): Boolean {
        for (ch in text) {
            if (ch in '\u4e00'..'\u9fff') return true
        }
        return false
    }

    private fun translateGoogle(text: String, target: String): String {
        val tl = if (target == "en") "en" else "zh-CN"
        val url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=$tl&dt=t&q=" +
            java.net.URLEncoder.encode(text, "UTF-8")
        val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android)")
        conn.connectTimeout = 15000
        conn.readTimeout = 20000
        try {
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val segments = org.json.JSONArray(body).getJSONArray(0)
            val sb = StringBuilder()
            for (i in 0 until segments.length()) {
                sb.append(segments.getJSONArray(i).getString(0))
            }
            return sb.toString().trim()
        } finally {
            conn.disconnect()
        }
    }

    private fun translateDeepl(text: String, target: String, cfg: org.json.JSONObject): String {
        val tl = if (target == "en") "EN" else "ZH"
        val base = cfg.optString("baseUrl", "").ifBlank { "https://api-free.deepl.com" }.trimEnd('/')
        val conn = java.net.URL("$base/v2/translate").openConnection() as java.net.HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 15000
        conn.readTimeout = 20000
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
        val params = "auth_key=${java.net.URLEncoder.encode(cfg.optString("apiKey"), "UTF-8")}" +
            "&text=${java.net.URLEncoder.encode(text, "UTF-8")}&target_lang=$tl"
        try {
            conn.outputStream.use { it.write(params.toByteArray()) }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = org.json.JSONObject(body)
            return json.getJSONArray("translations").getJSONObject(0).getString("text").trim()
        } finally {
            conn.disconnect()
        }
    }

    private fun translateOpenAI(text: String, target: String, cfg: org.json.JSONObject): String {
        val base = cfg.optString("baseUrl", "").ifBlank { "https://api.deepseek.com" }.trimEnd('/')
        val model = cfg.optString("model", "").ifBlank { "deepseek-chat" }
        val targetName = if (target == "en") "英文" else "中文"
        val payload = org.json.JSONObject().apply {
            put("model", model)
            put("temperature", 0.3)
            put("messages", org.json.JSONArray().apply {
                put(org.json.JSONObject().apply {
                    put("role", "system")
                    put("content", "你是专业翻译引擎。请将用户输入翻译成$targetName，直接输出译文，不要解释，不要多余内容。")
                })
                put(org.json.JSONObject().apply {
                    put("role", "user")
                    put("content", text)
                })
            })
        }
        val conn = java.net.URL("$base/chat/completions").openConnection() as java.net.HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 20000
        conn.readTimeout = 30000
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Authorization", "Bearer ${cfg.optString("apiKey")}")
        try {
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = org.json.JSONObject(body)
            return json.getJSONArray("choices").getJSONObject(0)
                .getJSONObject("message").getString("content").trim()
        } finally {
            conn.disconnect()
        }
    }

    private fun listOpenAIModels(): String {
        val cfg = readTranslateConfig()
        if (cfg.optString("engine") != "openai") {
            return org.json.JSONObject().apply {
                put("ok", false)
                put("error", "仅 OpenAI 兼容引擎（DeepSeek 等）支持获取模型列表")
            }.toString()
        }
        val base = cfg.optString("baseUrl", "").ifBlank { "https://api.deepseek.com" }.trimEnd('/')
        val conn = java.net.URL("$base/models").openConnection() as java.net.HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 15000
        conn.readTimeout = 20000
        conn.setRequestProperty("Authorization", "Bearer ${cfg.optString("apiKey")}")
        try {
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = org.json.JSONObject(body)
            val data = json.getJSONArray("data")
            val ids = org.json.JSONArray()
            for (i in 0 until data.length()) {
                ids.put(data.getJSONObject(i).optString("id"))
            }
            return org.json.JSONObject().apply {
                put("ok", true)
                put("models", ids)
            }.toString()
        } finally {
            conn.disconnect()
        }
    }

    private var mediaPlayer: android.media.MediaPlayer? = null

    // ---- MDD resource loading ----

    private fun readMddRegistry(): org.json.JSONArray {
        return try {
            val json = readDictCacheInternal("mdd_registry.json")
            if (json.isEmpty()) org.json.JSONArray() else org.json.JSONArray(json)
        } catch (e: Exception) {
            org.json.JSONArray()
        }
    }

    private fun readDictCacheInternal(fileName: String): String {
        val file = File(File(filesDir, "caches"), fileName)
        return if (file.exists()) file.readText() else ""
    }

    private fun normalizeMddKey(key: String): String {
        var k = key.replace("/", "\\")
        if (k.isNotEmpty() && !k.startsWith("\\")) k = "\\$k"
        return k
    }

    private fun loadMddResource(key: String): ByteArray? {
        val normalized = normalizeMddKey(key)
        val registry = readMddRegistry()
        for (i in 0 until registry.length()) {
            val entry = registry.getJSONObject(i)
            val name = entry.optString("name", "")
            val path = entry.optString("path", "")
            val idxJson = readDictCacheInternal(name + ".idx.json")
            if (idxJson.isEmpty()) continue
            try {
                val bytes = lookupMddBytes(idxJson, normalized, path) ?: continue
                return bytes
            } catch (e: Exception) {
                Log.e(TAG, "Mdd lookup error: ${e.message}")
            }
        }
        return null
    }

    private fun lookupMddBytes(idxJson: String, key: String, mddPath: String): ByteArray? {
        val idx = org.json.JSONObject(idxJson)
        val keywords = idx.getJSONArray("k")
        val recordInfo = idx.getJSONArray("r")
        val rbs = idx.optLong("rbs", 0)
        val encrypt = idx.optInt("encrypt", 0)

        // Binary search on [keyText, start, end, blockIdx]
        var lo = 0
        var hi = keywords.length() - 1
        var found = -1
        while (lo <= hi) {
            val mid = (lo + hi) ushr 1
            val kt = keywords.getJSONArray(mid).getString(0)
            val c = key.compareTo(kt)
            when {
                c > 0 -> lo = mid + 1
                c < 0 -> hi = mid - 1
                else -> { found = mid; break }
            }
        }
        if (found < 0) return null

        val item = keywords.getJSONArray(found)
        val recordStart = item.getLong(1)
        val recordEnd = item.getLong(2)

        // Find record block info
        var rlo = 0
        var rhi = recordInfo.length() - 1
        var blockIdx = -1
        while (rlo <= rhi) {
            val mid = (rlo + rhi) ushr 1
            if (recordStart >= recordInfo.getJSONArray(mid).getLong(3)) {
                blockIdx = mid
                rlo = mid + 1
            } else {
                rhi = mid - 1
            }
        }
        if (blockIdx < 0) return null

        val info = recordInfo.getJSONArray(blockIdx)
        val packSize = info.getInt(0)
        val packAccumulateOffset = info.getLong(1)
        val unpackSize = info.getInt(2)
        val unpackAccumulatorOffset = info.getLong(3)

        val packed = readMddRange(mddPath, rbs + packAccumulateOffset, packSize) ?: return null
        val unpack = mddDecompress(packed, unpackSize, encrypt) ?: return null
        val start = (recordStart - unpackAccumulatorOffset).toInt()
        val end = (recordEnd - unpackAccumulatorOffset).toInt()
        if (start < 0 || end > unpack.size || end <= start) return null
        return unpack.copyOfRange(start, end)
    }

    private fun readMddRange(path: String, offset: Long, length: Int): ByteArray? {
        return try {
            val file = File(path)
            if (!file.exists() || offset >= file.length()) return null
            RandomAccessFile(file, "r").use { raf ->
                raf.seek(offset)
                val bytes = ByteArray(length)
                val n = raf.read(bytes)
                if (n <= 0) null else if (n == length) bytes else bytes.copyOf(n)
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun mddDecompress(packed: ByteArray, unpackSize: Int, encrypt: Int): ByteArray? {
        if (packed.size < 8) return null
        val compHex = packed.take(4).joinToString("") { "%02x".format(it) }
        if (compHex == "00000000") {
            return packed.copyOfRange(8, packed.size)
        }
        if (encrypt == 1) return null
        if (compHex == "02000000") {
            return try {
                val inflater = java.util.zip.Inflater()
                inflater.setInput(packed, 8, packed.size - 8)
                val out = ByteArray(unpackSize)
                val n = inflater.inflate(out)
                inflater.end()
                if (n == unpackSize) out else out.copyOfRange(0, n)
            } catch (e: Exception) {
                null
            }
        }
        if (compHex == "01000000") {
            return try {
                lzo1xDecompress(packed.copyOfRange(8, packed.size))
            } catch (e: Exception) {
                null
            }
        }
        return null
    }

    // ---- Native MDD index building (fast: reads only header/key blocks, not the 1GB payload) ----

    private fun zlibInflate(data: ByteArray, off: Int, len: Int): ByteArray {
        val inflater = java.util.zip.Inflater()
        inflater.setInput(data, off, len)
        val out = java.io.ByteArrayOutputStream()
        val buf = ByteArray(65536)
        while (!inflater.finished()) {
            val n = inflater.inflate(buf)
            if (n == 0) throw IllegalStateException("zlib 解压失败")
            out.write(buf, 0, n)
        }
        inflater.end()
        return out.toByteArray()
    }

    // ---- MDict v2 encryption (Encrypted="2") ----
    // Ports of js-mdict's ripemd128 / fast_decrypt / mdxDecrypt (mdict-lib.js).

    private fun ripemd128(input: ByteArray): ByteArray {
        val S = arrayOf(
            intArrayOf(11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8),
            intArrayOf(7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12),
            intArrayOf(11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5),
            intArrayOf(11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12),
            intArrayOf(8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6),
            intArrayOf(9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11),
            intArrayOf(9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5),
            intArrayOf(15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8)
        )
        val X = arrayOf(
            intArrayOf(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15),
            intArrayOf(7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8),
            intArrayOf(3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12),
            intArrayOf(1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2),
            intArrayOf(5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12),
            intArrayOf(6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2),
            intArrayOf(15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13),
            intArrayOf(8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14)
        )
        val K = intArrayOf(0, 1518500249, 1859775393, 0x8f1bbcdc.toInt(), 1352829926, 1548603684, 1836072691, 0)

        val bytes = input.size
        val padLen = if (bytes % 64 < 56) 56 - bytes % 64 else 120 - bytes % 64
        val total = bytes + padLen + 8
        val concat = ByteArray(total)
        System.arraycopy(input, 0, concat, 0, bytes)
        concat[bytes] = 128.toByte()
        val bitLen = bytes.toLong() * 8
        for (i in 0 until 8) {
            concat[total - 8 + i] = ((bitLen shr (8 * i)) and 0xff).toByte()
        }
        val x = IntArray(total / 4)
        for (i in 0 until total step 4) {
            x[i / 4] = (concat[i].toInt() and 0xff) or ((concat[i + 1].toInt() and 0xff) shl 8) or
                ((concat[i + 2].toInt() and 0xff) shl 16) or ((concat[i + 3].toInt() and 0xff) shl 24)
        }
        fun f(r: Int, acc: Int, b: Int, c: Int, d: Int, w: Int, k: Int, s: Int): Int {
            val res = when (r) {
                0 -> b xor c xor d
                1 -> (b and c) or (b.inv() and d)
                2 -> (b or c.inv()) xor d
                else -> (b and d) or (c and d.inv())
            }
            val sum = res + acc + w + k
            return (sum shl s) or (sum ushr (32 - s))
        }
        val hash = intArrayOf(0x67452301, 0xefcdab89.toInt(), 0x98badcfe.toInt(), 0x10325476)
        for (i in 0 until total step 64) {
            var aa = hash[0]; var bb = hash[1]; var cc = hash[2]; var dd = hash[3]
            var aaa = aa; var bbb = bb; var ccc = cc; var ddd = dd
            var t = 0
            while (t < 64) {
                val r = t / 16
                aa = f(r, aa, bb, cc, dd, x[(i / 4) + X[r][t % 16]], K[r], S[r][t % 16])
                val tmp = dd; dd = cc; cc = bb; bb = aa; aa = tmp
                t++
            }
            while (t < 128) {
                val r = t / 16
                val rr = (63 - t % 64) / 16
                aaa = f(rr, aaa, bbb, ccc, ddd, x[(i / 4) + X[r][t % 16]], K[r], S[r][t % 16])
                val tmp = ddd; ddd = ccc; ccc = bbb; bbb = aaa; aaa = tmp
                t++
            }
            ddd = (hash[1] + cc + ddd) and 0xffffffff.toInt()
            hash[1] = (hash[2] + dd + aaa) and 0xffffffff.toInt()
            hash[2] = (hash[3] + aa + bbb) and 0xffffffff.toInt()
            hash[3] = (hash[0] + bb + ccc) and 0xffffffff.toInt()
            hash[0] = ddd
        }
        return ByteArray(16) { (hash[it / 4] ushr (8 * (it % 4))).toByte() }
    }

    // Decrypt an MDict v2 encrypted block. Only the key-info section of the file is
    // encrypted; key blocks and record blocks are stored uncompressed-encrypted.
    private fun mdxDecrypt(compBlock: ByteArray): ByteArray {
        val keyin = ByteArray(8)
        System.arraycopy(compBlock, 4, keyin, 0, 4)
        keyin[4] = (149).toByte()
        keyin[5] = (54).toByte()
        val key = ripemd128(keyin)
        val result = compBlock.copyOf()
        var previous = 54
        for (j in 0 until compBlock.size - 8) {
            val orig = compBlock[8 + j].toInt() and 0xff
            var t = ((orig shr 4) or (orig shl 4)) and 0xff
            t = t xor previous xor (j and 0xff) xor (key[j % key.size].toInt() and 0xff)
            previous = orig
            result[8 + j] = t.toByte()
        }
        return result
    }

    // Faithful port of the lzo1x decompressor used by js-mdict (mdict-lib.js shims/lzo1x.js).
    private fun lzo1xDecompress(input: ByteArray): ByteArray {
        val buf = input
        val ipEnd = input.size
        var out = ByteArray(maxOf(16384, input.size + (8192 - input.size % 8192)))
        var cbl = out.size
        var ip = 0
        var op = 0
        var t = 0
        var mPos = 0
        var skipFirst = false

        fun extend() {
            val nb = out.copyOf(cbl + 8192)
            out = nb
            cbl = nb.size
        }
        fun ensureOp(n: Int) {
            while (op + n > cbl) extend()
        }
        fun copyFromBuf() {
            ensureOp(t)
            repeat(t) { out[op++] = buf[ip++] }
        }
        fun copyMatch() {
            t += 2
            ensureOp(t)
            repeat(t) { out[op++] = out[mPos++] }
        }
        fun matchNext() {
            ensureOp(3)
            out[op++] = buf[ip++]
            if (t > 1) {
                out[op++] = buf[ip++]
                if (t > 2) out[op++] = buf[ip++]
            }
            t = buf[ip++].toInt() and 0xff
        }
        fun matchDone(): Int {
            t = buf[ip - 2].toInt() and 3
            return t
        }
        fun match(): Boolean {
            while (true) {
                if (t >= 64) {
                    mPos = op - 1 - ((t shr 2) and 7) - ((buf[ip++].toInt() and 0xff) shl 3)
                    t = (t shr 5) - 1
                    copyMatch()
                    if (matchDone() == 0) return true
                    matchNext()
                } else if (t >= 32) {
                    t = t and 31
                    if (t == 0) {
                        while (ip < ipEnd && buf[ip].toInt() and 0xff == 0) { t += 255; ip++ }
                        if (ip >= ipEnd) throw IllegalStateException("lzo 数据损坏")
                        t += 31 + (buf[ip++].toInt() and 0xff)
                    }
                    mPos = op - 1 - (((buf[ip].toInt() and 0xff) shr 2) + ((buf[ip + 1].toInt() and 0xff) shl 6))
                    ip += 2
                } else if (t >= 16) {
                    mPos = op - ((t and 8) shl 11)
                    t = t and 7
                    if (t == 0) {
                        while (ip < ipEnd && buf[ip].toInt() and 0xff == 0) { t += 255; ip++ }
                        if (ip >= ipEnd) throw IllegalStateException("lzo 数据损坏")
                        t += 7 + (buf[ip++].toInt() and 0xff)
                    }
                    mPos -= (((buf[ip].toInt() and 0xff) shr 2) + ((buf[ip + 1].toInt() and 0xff) shl 6))
                    ip += 2
                    if (mPos == op) return false
                    mPos -= 16384
                } else {
                    mPos = op - 1 - (t shr 2) - ((buf[ip++].toInt() and 0xff) shl 2)
                    ensureOp(2)
                    if (mPos < 0 || mPos > op) throw IllegalStateException("lzo 数据损坏")
                    out[op++] = out[mPos++]
                    out[op++] = out[mPos]
                    if (matchDone() == 0) return true
                    matchNext()
                }
                copyMatch()
                if (matchDone() == 0) return true
                matchNext()
            }
        }

        if (buf[ip].toInt() and 0xff > 17) {
            t = (buf[ip++].toInt() and 0xff) - 17
            if (t < 4) {
                matchNext()
                if (!match()) return out.copyOf(op)
            } else {
                copyFromBuf()
                skipFirst = true
            }
        }
        while (true) {
            if (!skipFirst) {
                t = buf[ip++].toInt() and 0xff
                if (t >= 16) {
                    if (!match()) return out.copyOf(op)
                    continue
                }
                if (t == 0) {
                    while (ip < ipEnd && buf[ip].toInt() and 0xff == 0) { t += 255; ip++ }
                    if (ip >= ipEnd) throw IllegalStateException("lzo 数据损坏")
                    t += 15 + (buf[ip++].toInt() and 0xff)
                }
                t += 3
                copyFromBuf()
            } else {
                skipFirst = false
            }
            t = buf[ip++].toInt() and 0xff
            if (t < 16) {
                mPos = op - 2049 - (t shr 2) - ((buf[ip++].toInt() and 0xff) shl 2)
                ensureOp(3)
                if (mPos < 0 || mPos > op) throw IllegalStateException("lzo 数据损坏")
                out[op++] = out[mPos++]
                out[op++] = out[mPos++]
                out[op++] = out[mPos]
                if (matchDone() == 0) continue
                matchNext()
            }
            if (!match()) return out.copyOf(op)
        }
    }

    // Build the MDD resource index by reading only the file header + key blocks + record
    // block infos (all located at the front of the file), so importing a multi-GB .mdd is fast.
    private fun buildMddIndexInternal(file: File, fileName: String, requestId: Int): Int {
        RandomAccessFile(file, "r").use { raf ->
            val fileLen = raf.length()
            fun readBytes(offset: Long, len: Int): ByteArray {
                if (offset < 0 || offset + len > fileLen) throw IllegalStateException("文件格式异常（数据越界）")
                raf.seek(offset)
                val b = ByteArray(len)
                raf.readFully(b)
                return b
            }
            fun b2n(b: ByteArray, off: Int, width: Int): Long {
                var v = 0L
                for (i in 0 until width) v = (v shl 8) or (b[off + i].toLong() and 0xff)
                return v
            }

            // STEP 1. header
            val headerSize = b2n(readBytes(0, 4), 0, 4).toInt()
            if (headerSize <= 0 || headerSize > 10_000_000) throw IllegalStateException("文件头异常")
            val headerText = String(readBytes(4, headerSize), Charsets.UTF_16LE)
            val headerMap = HashMap<String, String>()
            val re = Regex("(\\w+)=\"((.|\\r|\\n)*?)\"")
            for (m in re.findAll(headerText)) {
                headerMap[m.groupValues[1].lowercase()] = m.groupValues[2]
            }
            val headerEnd = headerSize.toLong() + 8
            val version = (headerMap["generatedbyengineversion"]?.toFloatOrNull() ?: 1f)
            val numWidth = if (version >= 2) 8 else 4
            val encrypt = when (headerMap["encrypted"]?.lowercase()) {
                null, "", "no" -> 0
                "yes" -> 1
                else -> headerMap["encrypted"]!!.toIntOrNull() ?: 0
            }
            if (encrypt == 1) throw IllegalStateException("Encrypted=Yes 词典暂不支持")

            // STEP 2. key block header
            val keyHeaderSize = if (version >= 2) 40 else 16
            val keyHeaderExtra = if (version >= 2) 4 else 0
            val kh = readBytes(headerEnd, keyHeaderSize)
            val keywordBlocksNum = b2n(kh, 0, numWidth).toInt()
            val keywordNum = b2n(kh, numWidth, numWidth)
            val keyInfoUnpackSize = if (version >= 2) b2n(kh, numWidth * 2, numWidth).toInt() else 0
            val keyInfoPackedSize = b2n(kh, if (version >= 2) numWidth * 3 else numWidth * 2, numWidth).toInt()
            val keywordBlockPackedSize = b2n(kh, if (version >= 2) numWidth * 4 else numWidth * 3, numWidth).toInt()
            if (keywordBlocksNum <= 0) throw IllegalStateException("关键块数量异常")
            val keyHeaderEnd = headerEnd + keyHeaderSize + keyHeaderExtra

            // STEP 3. key block infos
            var keyInfo = readBytes(keyHeaderEnd, keyInfoPackedSize)
            if (version >= 2) {
                // pack type is the 4 bytes joined as digits (e.g. bytes 02 00 00 00 -> "2000")
                val isZlib = keyInfo.size >= 8 &&
                    keyInfo[0].toInt() == 2 && keyInfo[1].toInt() == 0 &&
                    keyInfo[2].toInt() == 0 && keyInfo[3].toInt() == 0
                if (isZlib) {
                    var src = keyInfo
                    if (encrypt == 2) src = mdxDecrypt(keyInfo)
                    keyInfo = zlibInflate(src, 8, src.size - 8)
                    if (keyInfo.size != keyInfoUnpackSize) throw IllegalStateException("关键块信息解压异常")
                }
            }
            val blockInfo = ArrayList<Triple<Int, Int, Long>>() // (packSize, unpackSize, blockWordCount)
            var infoOff = 0
            for (i in 0 until keywordBlocksNum) {
                val blockWordCount = b2n(keyInfo, infoOff, numWidth); infoOff += numWidth
                var firstWordSize = b2n(keyInfo, infoOff, numWidth / 4).toInt(); infoOff += numWidth / 4
                firstWordSize = if (version >= 2) (firstWordSize + 1) * 2 else firstWordSize * 2
                infoOff += firstWordSize
                var lastWordSize = b2n(keyInfo, infoOff, numWidth / 4).toInt(); infoOff += numWidth / 4
                lastWordSize = if (version >= 2) (lastWordSize + 1) * 2 else lastWordSize * 2
                infoOff += lastWordSize
                val packSize = b2n(keyInfo, infoOff, numWidth).toInt(); infoOff += numWidth
                val unpackSize = b2n(keyInfo, infoOff, numWidth).toInt(); infoOff += numWidth
                blockInfo.add(Triple(packSize, unpackSize, blockWordCount))
            }

            // STEP 4. key blocks -> keyword list
            class KeyItem(val keyText: String, val recordStartOffset: Long, var recordEndOffset: Long, val keyBlockIdx: Int)
            val keyList = ArrayList<KeyItem>()
            var keyBlockStart = keyHeaderEnd + keyInfoPackedSize
            var blockPackAccu = 0L
            for (idx in blockInfo.indices) {
                val info = blockInfo[idx]
                val kbPacked = readBytes(keyBlockStart + blockPackAccu, info.first)
                val keyBlock = when {
                    kbPacked.size < 4 -> throw IllegalStateException("关键块数据异常")
                    else -> {
                        val compHex = kbPacked.take(4).joinToString("") { "%02x".format(it) }
                        when (compHex) {
                            "00000000" -> kbPacked.copyOfRange(8, kbPacked.size)
                            "01000000" -> lzo1xDecompress(kbPacked.copyOfRange(8, kbPacked.size))
                            "02000000" -> zlibInflate(kbPacked, 8, kbPacked.size - 8)
                            else -> throw IllegalStateException("不支持的关键块压缩: $compHex")
                        }
                    }
                }
                val localKeys = ArrayList<KeyItem>()
                var pos = 0
                while (pos + numWidth <= keyBlock.size) {
                    val meaningOffset = b2n(keyBlock, pos, numWidth)
                    pos += numWidth
                    var end = -1
                    var i = pos
                    while (i + 1 < keyBlock.size) {
                        if (keyBlock[i] == 0.toByte() && keyBlock[i + 1] == 0.toByte()) { end = i; break }
                        i += 2
                    }
                    if (end == -1) break
                    val keyText = String(keyBlock, pos, end - pos, Charsets.UTF_16LE)
                    if (localKeys.isNotEmpty() && localKeys.last().recordEndOffset == -1L) {
                        localKeys.last().recordEndOffset = meaningOffset
                    }
                    localKeys.add(KeyItem(keyText, meaningOffset, -1L, idx))
                    pos = end + 2
                }
                if (keyList.isNotEmpty() && keyList.last().recordEndOffset == -1L && localKeys.isNotEmpty()) {
                    keyList.last().recordEndOffset = localKeys[0].recordStartOffset
                }
                keyList.addAll(localKeys)
                blockPackAccu += info.first
                runOnUiThread {
                    webView.evaluateJavascript(
                        "window.onMddIndexProgress($requestId, ${(idx + 1) * 100 / blockInfo.size})",
                        null
                    )
                }
            }
            if (keyList.size.toLong() != keywordNum) {
                throw IllegalStateException("关键词数量不匹配（${keyList.size} != $keywordNum）")
            }

            // STEP 5. record block header
            val recordHeaderStart = keyBlockStart + keywordBlockPackedSize
            val recordHeaderLen = if (version >= 2) 32 else 16
            val rh = readBytes(recordHeaderStart, recordHeaderLen)
            val recordBlocksNum = b2n(rh, 0, numWidth).toInt()
            val recordInfoCompSize = b2n(rh, numWidth * 2, numWidth).toInt()
            if (recordBlocksNum <= 0) throw IllegalStateException("记录块数量异常")

            // STEP 6. record block infos
            val recordInfoStart = recordHeaderStart + recordHeaderLen
            val riRaw = readBytes(recordInfoStart, recordInfoCompSize)
            val r = StringBuilder()
            var riOff = 0
            var compressedAdder = 0L
            var decompressionAdder = 0L
            r.append("[")
            for (i in 0 until recordBlocksNum) {
                val packSize = b2n(riRaw, riOff, numWidth); riOff += numWidth
                val unpackSize = b2n(riRaw, riOff, numWidth); riOff += numWidth
                if (i > 0) r.append(",")
                r.append("[$packSize,$compressedAdder,$unpackSize,$decompressionAdder]")
                compressedAdder += packSize
                decompressionAdder += unpackSize
            }
            r.append("]")
            if (keyList.isNotEmpty()) {
                keyList[keyList.size - 1].recordEndOffset = decompressionAdder
            }
            val rbs = recordInfoStart + recordInfoCompSize

            // STEP 7. sort by key text (native binary search relies on compareTo order)
            keyList.sortWith(compareBy { it.keyText })

            // STEP 8. build idx json
            val k = StringBuilder()
            k.append("[")
            for (i in keyList.indices) {
                if (i > 0) k.append(",")
                val item = keyList[i]
                k.append("[\"")
                for (c in item.keyText) {
                    when (c) {
                        '"' -> k.append("\\\"")
                        '\\' -> k.append("\\\\")
                        '\n' -> k.append("\\n")
                        '\r' -> k.append("\\r")
                        '\t' -> k.append("\\t")
                        else -> if (c < ' ') k.append("\\u%04x".format(c.code)) else k.append(c)
                    }
                }
                k.append("\",${item.recordStartOffset},${item.recordEndOffset},${item.keyBlockIdx}]")
            }
            k.append("]")
            val idxJson = "{\"v\":1,\"enc\":\"UTF-16\",\"encrypt\":$encrypt,\"rbs\":$rbs,\"k\":$k,\"r\":$r}"

            // STEP 9. save cache + register
            saveDictCacheInternal(fileName + ".idx.json", idxJson)
            val registry = readMddRegistry()
            for (i in registry.length() - 1 downTo 0) {
                if (registry.getJSONObject(i).optString("name") == fileName) registry.remove(i)
            }
            registry.put(org.json.JSONObject().put("name", fileName).put("path", file.absolutePath))
            saveDictCacheInternal("mdd_registry.json", registry.toString())
            return keyList.size
        }
    }

    private fun saveDictCacheInternal(fileName: String, content: String) {
        val dir = File(filesDir, "caches")
        dir.mkdirs()
        File(dir, fileName).writeText(content)
    }

    private fun guessMime(name: String): String {
        return when (name.substringAfterLast('.', "").lowercase()) {
            "css" -> "text/css"
            "js" -> "application/javascript"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "gif" -> "image/gif"
            "svg" -> "image/svg+xml"
            "webp" -> "image/webp"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            "ogg" -> "audio/ogg"
            "m4a" -> "audio/mp4"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "html", "htm" -> "text/html"
            else -> "application/octet-stream"
        }
    }

    private fun playSoundFromMdd(key: String) {
        Thread {
            val data = loadMddResource(key) ?: return@Thread
            val tmp = File(cacheDir, "tmp_sound")
            try {
                tmp.writeBytes(data)
            } catch (e: Exception) {
                return@Thread
            }
            runOnUiThread {
                try {
                    mediaPlayer?.release()
                    mediaPlayer = android.media.MediaPlayer().apply {
                        setDataSource(tmp.absolutePath)
                        setOnCompletionListener { mp ->
                            mp.release()
                            if (mediaPlayer === mp) mediaPlayer = null
                        }
                        prepare()
                        start()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Sound play error: ${e.message}")
                }
            }
        }.start()
    }

    inner class WebViewBridge {

        @JavascriptInterface
        fun getAppVersion(): String {
            return try {
                packageManager.getPackageInfo(packageName, 0).versionName ?: ""
            } catch (e: Exception) {
                ""
            }
        }

        @JavascriptInterface
        fun pickFile(mimeType: String) {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = mimeType
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            }
            startActivityForResult(intent, FILE_PICK_REQUEST)
        }

        @JavascriptInterface
        fun readFileAsBase64(uriStr: String): String {
            return try {
                val uri = Uri.parse(uriStr)
                val inputStream = contentResolver.openInputStream(uri) ?: return ""
                val bytes = inputStream.readBytes()
                inputStream.close()
                Base64.encodeToString(bytes, Base64.NO_WRAP)
            } catch (e: Exception) {
                Log.e(TAG, "Error reading file: ${e.message}")
                ""
            }
        }

        @JavascriptInterface
        fun getFileName(uriStr: String): String {
            return try {
                val uri = Uri.parse(uriStr)
                var name = "unknown"
                contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (idx >= 0) name = cursor.getString(idx)
                    }
                }
                name
            } catch (e: Exception) {
                "unknown"
            }
        }

        @JavascriptInterface
        fun saveFileToInternal(uriStr: String, fileName: String): String {
            return try {
                val uri = Uri.parse(uriStr)
                val inputStream = contentResolver.openInputStream(uri) ?: return ""
                val dir = File(filesDir, "dictionaries")
                dir.mkdirs()
                val outFile = File(dir, fileName)
                FileOutputStream(outFile).use { output ->
                    inputStream.copyTo(output)
                }
                inputStream.close()
                outFile.absolutePath
            } catch (e: Exception) {
                Log.e(TAG, "Error saving file: ${e.message}")
                ""
            }
        }

        @JavascriptInterface
        fun listDictFiles(): String {
            val dir = File(filesDir, "dictionaries")
            if (!dir.exists()) return "[]"
            val files = dir.listFiles() ?: return "[]"
            val result = files.map { mapOf("name" to it.name, "path" to it.absolutePath, "size" to it.length()) }
            return org.json.JSONArray(result.map { org.json.JSONObject(it) }).toString()
        }

        @JavascriptInterface
        fun deleteDictFile(fileName: String): Boolean {
            val dir = File(filesDir, "dictionaries")
            val file = File(dir, fileName)
            return file.delete()
        }

        @JavascriptInterface
        fun readLocalFile(filePath: String): String {
            return try {
                val file = File(filePath)
                if (!file.exists()) return ""
                val bytes = file.readBytes()
                Base64.encodeToString(bytes, Base64.NO_WRAP)
            } catch (e: Exception) {
                Log.e(TAG, "Error reading local file: ${e.message}")
                ""
            }
        }

        @JavascriptInterface
        fun getFileSize(filePath: String): Long {
            return try {
                File(filePath).length()
            } catch (e: Exception) {
                Log.e(TAG, "Error getting file size: ${e.message}")
                0L
            }
        }

        @JavascriptInterface
        fun readLocalFileChunk(filePath: String, offset: Long, length: Int): String {
            return try {
                val file = File(filePath)
                if (!file.exists() || offset >= file.length()) return ""
                RandomAccessFile(file, "r").use { raf ->
                    raf.seek(offset)
                    val bytes = ByteArray(length)
                    val n = raf.read(bytes)
                    if (n <= 0) {
                        ""
                    } else {
                        Base64.encodeToString(
                            if (n == bytes.size) bytes else bytes.copyOf(n),
                            Base64.NO_WRAP
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading file chunk: ${e.message}")
                ""
            }
        }

        @JavascriptInterface
        fun setDarkMode(dark: Boolean) {
            runOnUiThread {
                val mode = if (dark) android.content.res.Configuration.UI_MODE_NIGHT_YES
                else android.content.res.Configuration.UI_MODE_NIGHT_NO
                resources.configuration.uiMode =
                    (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK.inv()) or mode
                window.statusBarColor = if (dark) android.graphics.Color.parseColor("#121212")
                else android.graphics.Color.WHITE
                val base = if (lookupMode) View.SYSTEM_UI_FLAG_FULLSCREEN else 0
                window.decorView.systemUiVisibility =
                    if (dark) base else base or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            }
        }

        @JavascriptInterface
        fun saveTextToFile(content: String, suggestedName: String) {
            pendingExportContent = content
            val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "text/csv"
                putExtra(Intent.EXTRA_TITLE, suggestedName)
            }
            startActivityForResult(intent, EXPORT_REQUEST)
        }

        @JavascriptInterface
        fun openFullApp() {
            runOnUiThread { exitLookupMode() }
        }

        @JavascriptInterface
        fun translate(text: String, requestId: Int) {
            Thread {
                val result = try {
                    doTranslate(text)
                } catch (e: Exception) {
                    Log.e(TAG, "Translate error: ${e.message}")
                    "ERROR: ${e.message}"
                }
                runOnUiThread {
                    webView.evaluateJavascript(
                        "window.onTranslateResult($requestId, ${jsEscape(result)})",
                        null
                    )
                }
            }.start()
        }

        @JavascriptInterface
        fun getTranslateConfig(): String {
            return readTranslateConfig().toString()
        }

        @JavascriptInterface
        fun saveTranslateConfig(json: String) {
            saveTranslateConfigInternal(json)
        }

        @JavascriptInterface
        fun listModels(requestId: Int) {
            Thread {
                val result = try {
                    listOpenAIModels()
                } catch (e: Exception) {
                    Log.e(TAG, "List models error: ${e.message}")
                    org.json.JSONObject().apply {
                        put("ok", false)
                        put("error", e.message ?: "unknown")
                    }.toString()
                }
                runOnUiThread {
                    webView.evaluateJavascript(
                        "window.onModelsResult($requestId, ${jsEscape(result)})",
                        null
                    )
                }
            }.start()
        }

        @JavascriptInterface
        fun saveDictCache(fileName: String, content: String): Boolean {
            return try {
                val dir = File(filesDir, "caches")
                dir.mkdirs()
                File(dir, fileName).writeText(content)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Error saving dict cache: ${e.message}")
                false
            }
        }

        @JavascriptInterface
        fun readDictCache(fileName: String): String {
            return try {
                val file = File(File(filesDir, "caches"), fileName)
                if (!file.exists()) "" else file.readText()
            } catch (e: Exception) {
                Log.e(TAG, "Error reading dict cache: ${e.message}")
                ""
            }
        }

        // Build the MDD resource index natively (reads only the header + key blocks from
        // the front of the file, so multi-GB .mdd imports are fast). Progress and result
        // are reported back to JS via window.onMddIndexProgress / window.onMddIndexDone.
        @JavascriptInterface
        fun buildMddIndex(path: String, fileName: String, requestId: Int) {
            Thread {
                val result = try {
                    val count = buildMddIndexInternal(File(path), fileName, requestId)
                    "{\"ok\":true,\"count\":$count}"
                } catch (e: Exception) {
                    Log.e(TAG, "buildMddIndex error: ${e.message}")
                    "{\"ok\":false,\"error\":${jsEscape(e.message ?: "unknown error")}}"
                }
                runOnUiThread {
                    webView.evaluateJavascript("window.onMddIndexDone($requestId, ${jsEscape(result)})", null)
                }
            }.start()
        }

        @JavascriptInterface
        fun deleteDictCache(fileName: String) {
            try {
                File(File(filesDir, "caches"), fileName).delete()
            } catch (e: Exception) {
                Log.e(TAG, "Error deleting dict cache: ${e.message}")
            }
        }

        @JavascriptInterface
        fun readAssetFile(path: String): String {
            return try {
                assets.open(path).bufferedReader().use { it.readText() }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading asset file $path: ${e.message}")
                ""
            }
        }

        @JavascriptInterface
        fun readAssetFileBase64(path: String): String {
            return try {
                val bytes = assets.open(path).use { it.readBytes() }
                Base64.encodeToString(bytes, Base64.NO_WRAP)
            } catch (e: Exception) {
                Log.e(TAG, "Error reading asset file $path: ${e.message}")
                ""
            }
        }

        @JavascriptInterface
        fun log(message: String) {
            Log.d(TAG, message)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == EXPORT_REQUEST && resultCode == Activity.RESULT_OK) {
            data?.data?.let { uri ->
                pendingExportContent?.let { content ->
                    try {
                        contentResolver.openOutputStream(uri)?.use { out ->
                            out.write(content.toByteArray())
                        }
                        Toast.makeText(this, "导出成功", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        Toast.makeText(this, "导出失败: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            pendingExportContent = null
            return
        }
        if (requestCode == FILE_PICK_REQUEST && resultCode == Activity.RESULT_OK) {
            val uris = mutableListOf<String>()

            data?.data?.let { uris.add(it.toString()) }

            data?.clipData?.let { clipData ->
                for (i in 0 until clipData.itemCount) {
                    uris.add(clipData.getItemAt(i).uri.toString())
                }
            }

            if (uris.isNotEmpty()) {
                val jsArray = uris.joinToString(",") { "\"$it\"" }
                webView.evaluateJavascript(
                    "window.onFilesPicked([$jsArray])",
                    null
                )
            }
        }
    }

    private fun checkPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+
            val perms = arrayOf(
                android.Manifest.permission.READ_MEDIA_IMAGES,
                android.Manifest.permission.READ_MEDIA_VIDEO,
                android.Manifest.permission.READ_MEDIA_AUDIO
            )
            ActivityCompat.requestPermissions(this, perms, PERMISSION_REQUEST)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11-12
            if (!Environment.isExternalStorageManager()) {
                val intent = Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                intent.data = Uri.parse("package:$packageName")
                startActivity(intent)
            }
        } else {
            // Android 10 and below
            val perms = arrayOf(
                android.Manifest.permission.READ_EXTERNAL_STORAGE,
                android.Manifest.permission.WRITE_EXTERNAL_STORAGE
            )
            ActivityCompat.requestPermissions(this, perms, PERMISSION_REQUEST)
        }
    }

    override fun onDestroy() {
        mediaPlayer?.release()
        mediaPlayer = null
        webView.destroy()
        super.onDestroy()
    }
}

