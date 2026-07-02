package com.mdict.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.util.Base64
import android.util.Log
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import android.os.Environment
import android.os.Build
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    companion object {
        private const val TAG = "MDict"
        private const val FILE_PICK_REQUEST = 1001
        private const val PERMISSION_REQUEST = 1002
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        checkPermissions()

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
                    view?.evaluateJavascript("window.searchWord('${word.replace("'", "\\'")}')", null)
                    return true
                }
                return false
            }
        }

        webView.addJavascriptInterface(WebViewBridge(), "AndroidBridge")

        webView.loadUrl("file:///android_asset/index.html")
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

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            webView.evaluateJavascript("window.goBack()", { result ->
                if (result == "null" || result == "\"no_back\"") {
                    super.onBackPressed()
                }
            })
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
