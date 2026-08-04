# MDict

基于 Android WebView 的英语词典应用，支持 MDX 格式词典文件，内置学习模式和间隔重复（SRS）复习系统。

## 功能

- **词典查询** — 支持导入 `.mdx` 格式词典，实时搜索与自动补全
- **学习模式** — 选择词书，通过卡片翻转记忆单词
- **间隔重复复习** — 基于 SM-2 算法的 SRS 复习系统（重来/困难/良好/简单）
- **历史记录** — 自动记录查询历史
- **收藏夹** — 收藏单词方便回顾
- **自定义样式** — 支持导入自定义 CSS 美化词典显示

## 技术栈

- **前端**: HTML / CSS / JavaScript（运行在 Android WebView 中）
- **后端**: Android (Java/Kotlin) 提供原生文件访问能力
- **词典解析**: [js-mdict](https://github.com/terasum/js-mdict) — 纯 JavaScript MDX/MDD 解析库

## 项目结构

```
├── app/                        # Android 应用模块
│   └── src/main/assets/        # WebView 前端资源
│       ├── index.html          # 主页面
│       ├── app.js              # 应用逻辑
│       ├── style.css           # 样式
│       ├── mdict-lib.js        # 词典解析库
│       ├── pako.min.js         # 压缩/解压库
│       └── dicts/              # 内置词书 (JSON)
├── mydictionary/               # 词典文件目录 (.mdx)
├── build.gradle                # Gradle 构建配置
└── settings.gradle             # Gradle 模块配置
```

## 构建 Android 应用

```bash
./gradlew assembleDebug
```

## 使用说明

1. 将 `.mdx` 词典文件放入 `mydictionary/` 目录
2. 在应用「设置」→「导入词典」中选择 MDX 文件
3. 切换到「学习」标签选择词书开始学习
4. 查询页面支持输入搜索和点击单词查看详情

## License

ISC
