# AGENTS.md

MDict — Android WebView 英语词典应用（MDX/MDD）。

## 构建 / 安装 / 测试

```powershell
# 构建 release APK（含 R8 压缩；无 keystore.properties 时回退 debug 签名）
.\gradlew.bat :app:assembleRelease

# 安装到连接的手机（adb 位于 ANDROID_HOME\platform-tools）
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
& $adb install -r "app\build\outputs\apk\release\MDict-release.apk"
& $adb shell am force-stop com.mdict.app
& $adb shell am start -n com.mdict.app/.MainActivity

# 抓日志（用 -d 一次性导出，不要用阻塞式前台 logcat）
& $adb logcat -d -s MDict:V AndroidRuntime:E
```

版本号在 `gradle.properties`（mdictVersionCode / mdictVersionName）。发布流程：bump 版本 → push master → `git tag vX.Y.Z && git push origin vX.Y.Z`（GitHub Actions 自动构建发布）。

## 架构要点

- **UI 全部在 WebView**：`app/src/main/assets/` 下的 `index.html` / `app.js` / `style.css`。改 UI/交互逻辑主要改 app.js。
- **桥接**：`MainActivity.kt` 的 `WebViewBridge`（@JavascriptInterface）提供文件读取、字典缓存、MDD 资源加载等原生能力。注意：**@JavascriptInterface 方法不能有 Kotlin 默认参数**（反射按实参个数调用，曾因此出过 bug）。
- **MDX/MDD 索引**：`buildIndexInternal`（MainActivity.kt）只读文件头+关键块原生构建 idx 缓存（`<name>.idx.json`，存于 `filesDir/caches`），秒级导入。key 排序用 Kotlin `compareTo`（码元序），JS 侧 light parser 必须用 `<`/`>` 比较而非 `localeCompare`。
- **MDD 资源**：HTML 引用被改写成 `file:///mdd_res/<path>` → `shouldInterceptRequest` 拦截 → `loadMddResource`（LRU 缓存解析后的 idx，`mddIdxCache` 上限 4）。
- **发音**：`sound://` scheme → `playSoundFromMdd` → 从 MDD 读字节写唯一临时文件 → MediaPlayer。
- **词典运行时解析**：JS 端 `createLightParser`（基于 idx 缓存 + `readLocalFileChunk` 按需读记录块）；js-mdict 全量解析仅作浏览器/回退路径。

## 验证

修改解析相关代码后必须跑对拍（对比原生构建逻辑与 js-mdict）：

```powershell
node tools/make-fixture.mjs C:\Users\SW\AppData\Local\Temp\opencode\fixtures
node tools/verify-index.mjs <fixtures>\fixture.mdx --words=apple,bat,hello,we
node tools/verify-index.mjs <fixtures>\fixture.mdd
# 真实词典抽查（本地文件不入库）
node tools/verify-index.mjs mydictionary\xxx.mdx --words=bat,we
```

CI 的 `.github/workflows/verify.yml` 在 push 时自动跑同一检查。

## 调试提示

- 设备非 debuggable（release 签名），无法 `run-as` 拉取内部文件；诊断靠 logcat + `crash.log`（`filesDir/caches/crash.log`，Kotlin 未捕获异常和 JS 错误都会追加写入）。
- `adb install` 被 `INSTALL_FAILED_USER_RESTRICTED` 拦截时：`adb push xxx.apk /sdcard/Download/` 后手机端手动安装。
- 手机 adb 经常掉线（USB/锁屏），跑命令前先 `adb devices` 确认，必要时轮询等待。
