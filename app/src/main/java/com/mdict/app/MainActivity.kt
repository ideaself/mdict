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
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import android.os.Environment
import android.os.Build
import androidx.activity.OnBackPressedCallback
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
    }

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
                    // Handle sound playback - could be implemented later
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

    inner class WebViewBridge {

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
        fun log(message: String) {
            Log.d(TAG, message)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
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
        webView.destroy()
        super.onDestroy()
    }
}
