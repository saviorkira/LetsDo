---
name: letsdo-deploy
description: LetsDo 小程序部署固定流程。包含：云函数部署、小程序构建上传、IP 白名单问题排查。每次代码改动后必须按此流程执行。
---

# LetsDo 部署固定流程

## 0. 前置检查（每次必做）

```powershell
# 1. 确认当前出口 IP（联通 NAT 会漂移）
(Invoke-WebRequest -Uri "https://ifconfig.me/ip" -UseBasicParsing -TimeoutSec 10 -Headers @{"User-Agent"="curl/7.68"}).Content.Trim()

# 2. 确认代理已清空
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select-Object ProxyEnable, ProxyServer

# 3. 确认 dist 目录是最新构建
Get-Item "e:\project\LetsDo\dist\build\mp-weixin\app.json" | Select-Object LastWriteTime
```

**白名单维护**（如 IP 变化）：
- 到 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 开发管理 → 开发设置 → 小程序代码上传 → IP白名单
- 当前已配置：`113.204.220.163`, `113.204.220.164`, `183.230.46.96`（后者是 2026-10-29 宽带换段后新增）
- 联通 NAT 池范围：`113.204.220.161` ~ `113.204.220.167`（建议全加）

---

## 1. 云函数部署

**触发条件**：修改了 `cloudfunctions/` 下任何文件

```powershell
cd e:\project\LetsDo
node scripts/deploy-cloud.js
```

**脚本特性**：
- 自动带 8 次重试，对抗 NAT IP 漂移
- 部署 `generateMenu` + `recipeService`
- 云端自动安装依赖（remoteNpmInstall: true）

**验证部署成功**：
```powershell
# 查看云函数状态
# 或到 CloudBase 控制台 → 云函数 → 看版本号更新时间
```

---

## 2. 小程序构建

**触发条件**：修改了 `src/` 下任何文件

```powershell
cd e:\project\LetsDo
npm run build:mp-weixin
```

**构建输出**：`dist/build/mp-weixin`

**必须确认**：
- `app.json` 中 `darkmode: false`（暗色禁用）
- `app.json` 中 `enableShareAppMessage: true`（转发开启）

---

## 3. 小程序上传

**触发条件**：构建完成后

### 方式 A：微信开发者工具 CLI（首选，自动成为体验版）

```powershell
& "E:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" upload --project "e:\project\LetsDo\dist\build\mp-weixin" -v 1.3.1 -d "版本描述"
```

- 上传者身份：**用户本人微信号**
- **微信服务端会自动把该版本设为体验版** ✅（这才是历史上"上传完手机就能看到最新"的真正原因）
- 不需要代码上传密钥、不需要 IP 白名单
- 依赖 `servicewechat.com` 连通性
- ⏱️ **`Upload` 阶段可能耗时数分钟**（390KB 代码包）。`✔ Using AppID: xxx` 只代表权限校验通过，**不代表上传成功**
- ✅ **成功标志**：出现 `✔ upload` + `TOTAL ... KB` 表格
- ❌ **绝对不要中途杀进程**（2026-10-30 曾误杀两个正在 Upload 的进程，导致误判为失败）
- 命令请给 **≥10 分钟超时**；或用 `run_in_background` 跑，等通知，不要主动轮询

### 方式 B：miniprogram-ci（兜底，必须手动设体验版）

```powershell
$env:VERSION='1.3.1'; $env:DESC='版本描述'; node scripts/upload-retry.js
```

- 上传者身份：**ci机器人1**
- **不会自动设体验版**，必须手动点一次
- 依赖 `private.wx47509108d337878e.key` + IP 白名单
- 走 `api.weixin.qq.com`，方式 A 因 `servicewechat.com` 被 RST 时可用

### 如何判断实际走的是哪条

看后台「开发版本」列表里该版本的 **开发者** 字段：

| 显示内容 | 上传方式 | 体验版 |
|---|---|---|
| 你的微信昵称 | 方式 A（cli.bat） | 自动 ✅ |
| `ci机器人1` | 方式 B（miniprogram-ci） | 需手动 ❌ |

**上传成功后**：

1. **方式 A**：无需任何操作，等约 1 分钟体验版自动生效
2. **方式 B**：到 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 版本管理 → 开发版本 → 最新版本右侧「∨」→「选为体验版本」
3. 需要正式发布时才点「提交审核」

> ⚠️ 「选为体验版本」没有开放 API，`miniprogram-ci`、`ci.cloud`、微信开放接口均不支持，只能后台手动点。
> 使用方式 B 时，AI 每次上传成功后必须主动提醒用户执行第 2 步。

---

## 4. 常见问题速查

| 报错 | 原因 | 解决 |
|---|---|---|
| `ECONNRESET` | 出口 IP 不在白名单 / NAT 漂移 | 1. 检查白名单 2. 脚本自动重试 3. 换手机热点 |
| **`cli.bat` 报 ECONNRESET**（卡在 `Fetching AppID () permissions`） | **开发者工具登录态失效**，服务端收到无效凭证直接断连。实测网络正常（servicewechat TCP/HTTPS 均通，404 是正常响应）。**括号为空是正常现象**，与 appid 无关 | 开发者工具 → 退出登录 → 重新扫码 → 重跑 cli.bat |
| **版本管理里「开发者」显示 `ci机器人1`** | 走了 miniprogram-ci，不会自动成为体验版 | 手动点「选为体验版本」；长期应改用 cli.bat |
| **新版本没自动成为体验版** | 上传方式变成 miniprogram-ci（身份是 ci 机器人） | 用 cli.bat 重传即可自动生效 |
| `-10008 invalid ip` | 同上 | 同上 |
| `41001 access_token missing` | 签名格式问题（降级提示） | 正常，不代表失败 |
| 上传转圈 | 同 ECONNRESET | 取消后重试，或等几分钟 |
| **cli.bat 停在 `- Upload` 长时间不动** | **正常**，Upload 阶段耗时长（几分钟），不是卡死 | 耐心等待，**不要杀进程**；给 ≥10 分钟超时；成功标志是 `✔ upload` + TOTAL 表格 |
| **误判"上传失败"** | 只有 `Fetching AppID` 阶段 `ECONNRESET` 才是真失败；出现 `✔ Using AppID` 说明已进入上传阶段 | 必须等到 `✔ upload` 或明确报错码再下结论 |
| **版本管理里版本号没变** | 上传脚本把 `version` 写死了，新包覆盖了旧版本号 | 用 `upload-retry.js`，必须传 `$env:VERSION`；脚本已加保护：缺 VERSION 直接报错退出 |

---

## 5. 一键部署（完整流程）

```powershell
cd e:\project\LetsDo

# 1. 构建
npm run build:mp-weixin

# 2. 部署云函数（如改了 cloudfunctions/）
node scripts/deploy-cloud.js

# 3. 上传小程序 —— 首选 cli.bat（自动成为体验版；≥10 分钟超时，勿中途杀进程）
& "E:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" upload --project "e:\project\LetsDo\dist\build\mp-weixin" -v 1.3.x -d "描述"
#    成功标志：✔ upload + TOTAL 表格。仅出现 ✔ Using AppID 不算成功

# 3'. 仅当 cli.bat 在 Fetching AppID 阶段报 ECONNRESET，才改用 ci 兜底：
$env:VERSION='1.3.x'; $env:DESC='描述'; node scripts/upload-retry.js
#    然后手动：版本管理 → 开发版本 → 最新版本「∨」→ 选为体验版本
```

---

## 6. 版本号规范

- 功能新增：`1.3.0` → `1.4.0`
- 修复/优化：`1.3.0` → `1.3.1`
- 紧急修复：加 `-hotfix` 后缀，如 `1.3.1-hotfix`

**每次上传必须递增版本号**，微信后台不允许重复。
