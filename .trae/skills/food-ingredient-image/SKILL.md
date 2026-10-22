---
name: food-ingredient-image
description: LetsDo 食材配图批量生成/更新固定流程。生成 AI 食材图并上传 CloudBase 存储、写回 ingredient.imageUrl。无论何时生成食材图都必须走本流程，禁止生成 2560 高清大图。
---

# LetsDo 食材配图生成流程（已定稿）

## 0. 硬约束（不可协商）

| 项 | 定稿值 | 禁止 |
|---|---|---|
| 输出分辨率 | **256 × 256** | ❌ 禁止 2560×2560 / square_hd / 任何 >512px |
| 单张体积 | **≤ 15 KB**（约 10 KB） | ❌ 禁止 200 KB 以上 |
| 拍摄构图 | 物品占画面 **85%**，居中微距特写 | ❌ 禁止大量留白 / 大理石场景 / 多件摆放 |
| 背景 | 浅灰纯色 studio 背景 | ❌ 禁止道具、其它物体、文字、人物 |
| 云端路径 | `ingredients/{英文名}.jpg` | 不得改目录结构 |
| 数据库字段 | `cloud://` fileID | ❌ 禁止写 `https://...tcb.qcloud.la` |

**原因**：小程序里图片显示处仅 ~56rpx（约 84px @3x）。2560px 图单张解码占 ~26MB 内存，一次随机食材加载 4 张会占用 100MB+，低端机卡顿甚至闪退。

---

## 1. 确认目标食材

调用 `mcp_cloudbase` → `readNoSqlDatabaseContent`

```json
{
  "action": "queryNoSqlDatabaseContent",
  "collectionName": "ingredient",
  "limit": 100,
  "projection": { "name": 1, "imageUrl": 1 }
}
```

- 中文名 → 英文名：优先从已有 `imageUrl` 末段提取（`.../ingredients/tomato.jpg` → `tomato`）
- 无 imageUrl 的新食材，按下方对照表手工映射
- `isCondiment=true`（姜、蒜、葱花等调料）**跳过，不生成图**

---

## 2. 生成图片（严格用此 prompt）

调用 `integrated_default` → `GenerateImage`

```json
{
  "path": "e:\\project\\LetsDo\\ingredient_imgs\\{英文名}",
  "image_size": "square",
  "prompt": "Food ingredient photography: a single fresh {英文名}, extreme close-up macro shot, the ingredient fills 85% of the frame, centered composition, plain clean light grey studio background, soft diffused lighting, no props, no other objects, no people, no text, commercial product shot style, high resolution"
}
```

- `image_size` 用 `square`（不是 `square_hd`）；生成工具会自动加 `_1` 后缀，属正常
- 逐张处理，不要等全部生成完再上传

### 2.1 菜品图（recipe）专属规则

菜 ≠ 食材，**必须画容器**，否则只是一盘散料。

- 容器与菜型必须匹配：
  - 炒菜 / 红烧 / 糖醋 → 白色圆盘（薄边）
  - 整鱼 / 清蒸鱼 → 椭圆白瓷鱼盘
  - 面 / 汤 / 羹 → 深口白瓷碗
  - 盖饭 / 炒饭 → 浅口碗
  - 三明治 / 汉堡 → 白盘或木砧板
- Prompt 必须显式写「served on/in {容器}，食物盛在容器内，容器+菜合计占画面 85%」
- 禁止：只有食物没有盘子、盘子被裁出画面、筷子/勺子/餐巾等餐具入镜
- 分辨率 **768×768**（菜单封面 120rpx ≈ 360px@3x、详情大图 750×440rpx ≈ 1125×660px，256 会明显发糊）；Quality 82，单张 70~90KB
- 生成图右下角带「AI 生成」水印，**压缩时先裁掉底部 10%** 再缩放成正方形，否则放大后水印会露出来
- 云端路径：`dishes/{英文名}.jpg`（**不要**放 `ingredients/`）
- 写库目标：`recipe.imageUrl`（集合名是 `recipe`，不是 `dish`）
- **风格定稿（用户最终确认，最高优先级）**：
  - **正俯视平拍**（flat lay / 90° top-down），与常见美食 App 菜品封面风格一致
  - 自然光从左侧斜向打入（非逆光），柔和定向阴影
  - 容器：**粗陶斑点盘**（哑光浅米白带小斑点，handmade rustic feel）；整鱼用同风格椭圆鱼盘；面/汤用同风格深口碗；**各菜容器保持同系列，色泽斑点高度一致**
  - 背景：**浅木色桌面**（淡原木纹，极简干净），角上一块**浅色亚麻餐巾**（淡米色/浅灰色）作点缀
  - 菜盘边上散落 2-3 颗**配菜装饰**（如小番茄切片、葱花段、玉米粒，按菜型选对应食材），提升真实感
  - 色调：暖中性、低饱和胶片感，**高级不廉价**
  - 菜 + 容器占画面 **80%+**，亚麻餐巾和配菜点缀占剩余 ~15%
  - 五张之间必须保持：同一套盘子光泽/斑点 + 同一块原木桌面纹理 + 同一条亚麻餐巾位置
  - 单张约 **120~132 KB**（768×768 / q85）
  - **不要**：45° 侧俯拍（已弃用）、哑光白陶（已弃用）、榆木板（已弃用）、纯白板（已弃用）、纯灰背景（已弃用）

### 2.2 菜品图批量补图流水线（2026-10 实战沉淀，照此执行）

1. **查缺图清单**：`readNoSqlDatabaseContent` → collectionName=`recipe`、query=`{"imageUrl":""}`、projection=`{"_id":1,"name":1,"imageUrl":1}`。结果存 `scripts/missing_recipes.json`，人工补英文名映射并留档（`_id` ↔ 中文名 ↔ 英文文件名 必须一一对应，文件名一旦定稿不要中途改名）。
2. **生成**：`GenerateImage` → `path=e:\project\LetsDo\dish_raw\{英文名}`、`image_size="square"`。实际产出 1920×1920，文件名可能带 `_1` 后缀，压缩前先确认真实文件名。
3. **压缩**：PowerShell System.Drawing（禁装 npm 包）。先裁底部 10%（去右下角「AI生成」水印）再缩放 **768×768 / q85**，输出 `dish_imgs_final\{英文名}.jpg`。脚本同 §3，改动两处：目标尺寸 256→768、Quality 82→85，`DrawImage` 用源矩形 `Rectangle(0,0,W,0.9*H)` 做裁剪。
4. **上传**：`manageStorage` → action=`upload`、cloudPath=`dishes/{英文名}.jpg`。
5. **写库（唯一正确姿势）**：`writeNoSqlDatabaseContent` → action=`update`、collectionName=`recipe`、query=`{"_id":"..."}`、update=`{"$set":{"imageUrl":"cloud://letsdoenv-d1gndgyhv2f9d22fb.6c65-letsdoenv-d1gndgyhv2f9d22fb-1507384605/dishes/{英文名}.jpg"}}`，**逐条执行**。
   - ❌ **禁用 `tcb-admin-node` 脚本写库**：`db.collection('recipe').doc(id).update({data:{imageUrl}})` 会把 `data` 当成字段名写入，`imageUrl` 静默不更新（2026-10-21 事故：60 张图传完库里仍为空）。该 SDK 正确写法是 `.update({imageUrl})` 直接平铺，但为避免再踩坑统一走 MCP。
   - ❌ MCP 不支持 `updates` 批量数组，也不支持把 `_id` 放在顶层，必须 `query` + `$set`。
6. **验收**：回查 `{"imageUrl":""}` 应为 0 条；本地抽查每张 768×768、60~130KB。

素材目录约定：`dish_raw\` 生成原图（可定期清理）、`dish_imgs_final\` 768 成品（上传源）。

---

## 3. 强制压缩到 256×256（必做，不可跳过）

生成完立刻用 PowerShell 原生 System.Drawing 压缩，**不要装任何 npm 包**：

```powershell
Add-Type -AssemblyName System.Drawing
$src = "e:\project\LetsDo\ingredient_imgs"
$dst = Join-Path $src "thumb"
New-Item -ItemType Directory -Force $dst | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 82L)
Get-ChildItem $src -Filter *_1.jpg | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $bmp = New-Object System.Drawing.Bitmap(256, 256)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, 256, 256)
  $out = Join-Path $dst (($_.BaseName -replace '_1$','') + '.jpg')
  $bmp.Save($out, $codec, $ep)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}
```

压缩后用 `Measure-Object Length -Average` 检查平均体积，应 ≈ 10 KB。超过 20 KB 就把 Quality 降到 75。

---

## 4. 上传（覆盖同路径）

调用 `mcp_cloudbase` → `manageStorage`

```json
{
  "action": "upload",
  "localPath": "e:\\project\\LetsDo\\ingredient_imgs\\thumb\\{英文名}.jpg",
  "cloudPath": "ingredients/{英文名}.jpg"
}
```

可分批并行（每批 10 个）。覆盖后云端路径不变，**数据库 imageUrl 无需修改**。

---

## 5. 数据库 imageUrl 格式（关键）

必须是 **cloud:// fileID**，不是 https CDN 地址：

```
cloud://letsdoenv-d1gndgyhv2f9d22fb.6c65-letsdoenv-d1gndgyhv2f9d22fb-1507384605/ingredients/tomato.jpg
```

- 格式：`cloud://{envId}.{bucket}/ingredients/{英文名}.jpg`
- envId：`letsdoenv-d1gndgyhv2f9d22fb`
- bucket：`6c65-letsdoenv-d1gndgyhv2f9d22fb-1507384605`

**为什么不用 https**：该存储桶 ACL 为 `PRIVATE`，https CDN 地址返回 403（图片全白）。`cloud://` 走小程序原生协议，不受 ACL 限制。已尝试用 MCP `managePermissions` 改 `READONLY` / `CUSTOM` 均返回成功但不生效（环境限制），不要再浪费时间重试。

新食材写库：用 `recipeService` 云函数的 `migrateImageUrl` 模式，或直接写上述 cloud:// 串。

---

## 6. 前端渲染约定

```html
<image v-if="ing.imageUrl" class="di-img" :src="ing.imageUrl" mode="aspectFill" />
<text v-else class="di-emoji">{{ foodEmoji(ing.name) }}</text>
```

- 有 imageUrl 用图，无则 fallback 到 `foodEmoji()`（`src/utils/foodEmoji.js`）
- 缩略图容器 56rpx 圆形（`border-radius: 50%`），256px 源图足够 3x 屏清晰度
- 云函数 `recipeService` 的 `mk()` 必须透传 `imageUrl`，否则前端拿不到图

---

## 7. 中英对照表（常用）

番茄 tomato / 鸡蛋 egg / 猪肉里脊 pork_tenderloin / 鸡胸肉 chicken_breast / 草鱼 grass_carp / 米饭 steamed_rice / 面条 noodles / 土豆 potato / 西兰花 broccoli / 白菜 cabbage / 黄瓜 cucumber / 胡萝卜 carrot / 洋葱 onion / 豆腐 tofu / 青椒 green_pepper / 玉米 corn / 香菇 shiitake_mushroom / 南瓜 pumpkin / 菠菜 spinach / 茄子 eggplant / 芹菜 celery / 山药 yam / 紫薯 purple_sweet_potato / 红薯 sweet_potato / 香蕉 banana / 苹果 apple / 橙子 orange / 草莓 strawberry / 牛油果 avocado / 芒果 mango / 菠萝 pineapple / 西瓜 watermelon / 葡萄 grape / 三文鱼 salmon / 金枪鱼 tuna / 虾 shrimp / 牛肉 beef / 羊肉 lamb / 鸭肉 duck_meat / 火腿 ham / 香肠 sausage / 培根 bacon / 鸡腿 chicken_drumstick / 鸡翅 chicken_wing / 鳕鱼 cod / 带鱼 ribbon_fish / 鱿鱼 squid / 蛤蜊 clam / 扇贝 scallop / 生蚝 oyster / 黄油 butter / 奶酪 cheese / 牛奶 milk / 酸奶 yogurt / 吐司面包 toast_bread / 全麦面包 whole_wheat_bread / 馒头 steamed_bun / 饺子皮 dumpling_wrapper / 粉丝 glass_noodles / 乌冬面 udon_noodles / 荞麦面 soba_noodles / 意大利面 pasta / 木耳 wood_ear / 海带 kelp / 紫菜 seaweed / 竹笋 bamboo_shoot / 莲藕 lotus_root / 小米 millet / 燕麦 oats / 红豆 red_bean / 绿豆 mung_bean / 黄豆 soybean / 豌豆 pea / 腐竹 dried_tofu_stick / 豆皮 tofu_skin / 冬瓜 winter_melon / 丝瓜 luffa / 苦瓜 bitter_melon / 金针菇 enoki_mushroom / 平菇 oyster_mushroom / 莴笋 asparagus_lettuce / 圣女果 cherry_tomato

---

## 8. 自检清单

- [ ] 图片是 256×256 且 ≤15KB（抽查 `queryStorage` → `action: "info"`）
- [ ] 物品居中占画面主体，无大理石大留白
- [ ] 云端路径为 `ingredients/{英文名}.jpg`
- [ ] 数据库 imageUrl 是 `cloud://` 开头
- [ ] 调料类未生成
- [ ] 云端文件名与数据库引用完全一致（大小写、下划线）

菜品图追加检查：

- [ ] 菜品图是 768×768、60~130KB，底部无「AI生成」水印
- [ ] 容器与菜型匹配（汤/面→深碗、整鱼→椭圆盘、盖饭/炒饭→浅碗、其余→圆盘）
- [ ] 云端路径 `dishes/{英文名}.jpg`，写库集合是 `recipe` 不是 `dish`
- [ ] 风格统一为正俯视平拍 ins 风定稿版（不要混入 45° 侧俯拍旧风格）
- [ ] 回查 `recipe` 集合 `imageUrl=""` 为 0 条
