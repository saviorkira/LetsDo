# 项目固定约束：LetsDo「来做吧」微信小程序
## 项目信息
项目名称：来做吧 LetsDo
目标平台：**仅微信小程序（暂时不考虑抖音/H5/App）**
技术栈：uni‑app Vue3 + <script setup> + Vite，Wot UI，SCSS；后端：微信云开发TCB(Node云函数、云数据库NoSQL)
仓库：GitHub私有仓库，HTTPS地址：`https://github.com/saviorkira/LetsDo.git`；文件夹名称 LetsDo，禁止文件名带空格、单引号等特殊字符

## 前端编码强制规则
1. Vue 必须使用 <script setup> 组合式API，禁止 Options API。
2. UI组件：优先 Wot UI，不要使用uni‑ui原生组件，样式使用scss。
3. 只输出微信小程序兼容代码，**暂时不要写抖音 #ifdef MP‑TOUTIAO 条件编译代码**（后续再加）。
4. 视频播放：菜品详情页使用微信小程序原生 <wx‑video‑channel> 嵌入视频号；不要写web‑view兜底抖音视频逻辑。
5. uni‑app调用云开发：使用 uni.cloud.callFunction 调用云函数；**不要前端直接大量读写云数据库**，业务逻辑全部放到云函数。
6. 页面文案：营养、热量描述必须附带提示文字：「营养数据仅估算参考，不构成膳食医疗建议」。
7. 命名规范：js变量小驼峰；组件文件大驼峰；页面文件名小写；禁止中文变量。
8. 代码精简，不要冗余console、无用注释；代码注释用中文；不要自动生成测试页面、无关demo。
9. 不要引入多余npm包，保持包体积轻量。
10. 页面交互：生活化简约工具风格，圆角柔和，支持暗色模式。

## 云函数（TCB Node.js）强制规则
1. 云函数语言 Node.js，CommonJS；不要写TS/Python。
2. 数据库集合：dish（菜品）、menu_record（菜单记录）。
3. 核心云函数 generateMenu：接收目标热量、是否需要蔬菜，在数据库筛选菜品，随机组合，汇总总热量、总价、营养数据返回。
4. 云函数内操作数据库，做好参数校验，防止非法查询。
5. 云函数代码放在 `cloudfunctions/` 目录，纳入git版本管理。

## MCP CloudBase 操作约束（重要）
1. 使用CloudBase MCP操作云开发（创建集合、部署云函数、查询数据）。
2. **禁止自动删除云数据库集合、清空全部数据**；任何删除操作，必须先询问用户确认。
3. 不要硬编码环境ID、密钥；环境ID单独写在前端配置文件。
4. MCP执行高危操作前，先文字提示，等待用户确认，不要直接执行。

## Git / GitHub约束
1. 远程仓库地址：`https://github.com/saviorkira/LetsDo.git`，使用HTTPS方式推送拉取。
2. 生成代码时，留意 .gitignore：不要提交 unpackage/dist、node_modules、.hbuilderx 缓存产物。
3. 所有源码保存在本地，每完成一个可运行版本，提醒我执行git add/commit/push推送到GitHub私有仓库。
4. 不要自动修改 .gitignore，除非我明确要求。
> 注意：私有仓库HTTPS推送，使用GitHub Personal access token(PAT)作为密码，不要使用账号密码。

## AI回复规则
1. 先简述实现思路，再贴代码块；代码块标明文件路径。
2. 代码改动涉及多个文件时，列出全部受影响文件。
3. 不要脑补额外需求，我没提的功能不要额外实现。
4. 如果你发现代码会产生微信小程序审核风险，主动提醒。
5. 不要写跨端（抖音、APP）相关代码，除非我明确说要扩展。
