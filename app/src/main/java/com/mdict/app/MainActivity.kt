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
                pendingLookupWord?.let { word ->
                    pendingLookupWord = null
                    lookupWord(word)
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
        val word = extractLookupWord(intent) ?: return
        pendingLookupWord = word
        if (webViewReady) {
            pendingLookupWord = null
            lookupWord(word)
        }
    }

    private fun extractLookupWord(intent: Intent?): String? {
        if (intent == null) return null
        return when (intent.action) {
            Intent.ACTION_PROCESS_TEXT ->
                intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()?.trim()
            Intent.ACTION_SEND -> {
                val text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()?.trim() ?: return null
                firstWord(text)
            }
            else -> null
        }
    }

    private fun firstWord(text: String): String? {
        var i = 0
        while (i < text.length && !text[i].isLetterOrDigit()) i++
        if (i >= text.length) return null
        var j = i
        while (j < text.length && (text[j].isLetterOrDigit() || text[j] == '-' || text[j] == '\'')) j++
        return text.substring(i, j)
    }

    private fun lookupWord(word: String) {
        webView.evaluateJavascript("window.searchWord(${jsEscape(word)})", null)
    }

    private fun jsEscape(s: String): String {
        return org.json.JSONObject.quote(s)
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
