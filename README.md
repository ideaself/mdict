# MDict

基于 Android WebView 的英语词典应用，支持 MDX/MDD 格式词典文件，内置学习模式和间隔重复（SRS）复习系统。

## 功能

- **词典查询** — 支持导入 `.mdx` 词典及配套 `.mdd` 资源（图片/音频/CSS），实时搜索与自动补全
- **发音** — 点击词条内小喇叭播放 MDD 中的音频
- **学习模式** — 选择词书，通过卡片翻转记忆单词
- **间隔重复复习** — 基于 SM-2 算法的 SRS 复习系统（重来/困难/良好/简单）
- **历史记录** — 自动记录查询历史
- **收藏夹** — 收藏单词方便回顾
- **自定义样式** — 支持导入自定义 CSS 美化词典显示

## 技术栈

- **前端**: HTML / CSS / JavaScript（运行在 Android WebView 中）
- **后端**: Android (Kotlin) 提供原生文件访问、MDD 资源索引与按需读取
- **词典解析**: [js-mdict](https://github.com/terasum/js-mdict) + 原生快速索引构建（MDX/MDD 导入秒级完成，支持 UTF-8/GBK/Big5/UTF-16 编码）

## 项目结构

```
├── app/                        # Android 应用模块
│   └── src/main/assets/        # WebView 前端资源
│       ├── index.html          # 主页面
│       ├── app.js              # 应用逻辑
│       ├── style.css           # 样式
│       ├── mdict-lib.js        # 词典解析库 (js-mdict bundle)
│       ├── pako.min.js         # 压缩/解压库
│       └── dicts/              # 内置词书 (JSON)
├── tools/
│   ├── make-fixture.mjs        # 生成微型 MDX/MDD 测试夹具
│   └── verify-index.mjs        # 原生索引构建 vs js-mdict 逐词条对拍
├── .github/workflows/
│   ├── release.yml             # 打 tag 自动构建并发布正式签名 APK
│   └── verify.yml              # push 时自动运行索引对拍回归
├── build.gradle                # Gradle 构建配置
└── settings.gradle             # Gradle 模块配置
```

## 构建 Android 应用

```bash
./gradlew assembleRelease
```

产物位于 `app/build/outputs/apk/release/MDict-release.apk`。

本地开发时（无 `keystore.properties`）回退使用 debug keystore 签名，可直接安装。

### 发布版本（CI 自动发布）

1. 在 `gradle.properties` 中递增版本号：

```properties
mdictVersionCode=4
mdictVersionName=1.3.0
```

2. 提交并推送 master：

```bash
git add -A && git commit -m "chore: bump version to X.Y.Z"
git push origin master
```

3. 打 tag（触发 GitHub Actions 自动构建、正式签名并发布）：

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

Release 附件为 CI 构建的正式签名 APK（签名密钥通过仓库 secrets 注入：`KEYSTORE_B64` / `KEYSTORE_PASSWORD` / `KEY_ALIAS` / `KEY_PASSWORD`）。

## 开发验证

修改词典解析相关代码后，运行索引对拍（需 Node.js ≥ 18）：

```bash
node tools/make-fixture.mjs /tmp/fixtures
node tools/verify-index.mjs /tmp/fixtures/fixture.mdx
node tools/verify-index.mjs /tmp/fixtures/fixture.mdd
node tools/verify-index.mjs mydictionary/xxx.mdx --words=bat,we   # 真实词典抽查
```

`verify-index.mjs` 将原生索引构建逻辑（Kotlin 移植）与 js-mdict 解析结果对比：词条数、完整排序词条集合、抽样 offset 必须一致，退出码 0 为通过。CI 的 `verify.yml` 在 push 时自动执行同一检查。

## 使用说明

1. 将 `.mdx` 词典文件及配套 `.mdd`/`.css` 放入手机，应用「设置」→「导入词典」中多选导入
2. 切换「学习」标签选择词书开始学习
3. 查询页面支持输入搜索和点击单词查看详情

## License

ISC
