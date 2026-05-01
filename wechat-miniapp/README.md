# CloudWear AI 微信小程序 MVP

这是基于「微信小程序 + 微信云开发」的 AI 穿搭推荐 MVP。小程序端只调用云函数，不直接暴露 AI Key、淘宝/京东/唯品会联盟 Key。

## 项目结构

```text
miniprogram/
  pages/
    index/        条件输入
    generating/   生成中进度
    result/       穿搭结果与商品清单
    history/      历史记录
    mine/         我的与偏好设置
  components/
    product-card/
    outfit-card/
    loading-steps/
  utils/
    cloud.js
    format.js

cloudfunctions/
  generateOutfit/
  getHistory/
  getOutfitDetail/
  deleteHistory/
  favoriteOutfit/
  trackProductClick/
  getUserProfile/
  updateUserPreference/
  shared/
    ai/
    products/
    scoring/
    storage/
    handlers/
```

## 云开发初始化

1. 用微信开发者工具打开本目录：`wechat-miniapp/`。
2. 在 `project.config.json` 中把 `appid` 改成你的小程序 AppID。
3. 在 [miniprogram/app.js](/Users/fuchen/project/AI-Code/CloudWear-AI/wechat-miniapp/miniprogram/app.js) 中把 `cloudwear-ai-mvp` 改成你的云环境 ID。
4. 在云开发控制台创建以下集合：

```text
users
outfit_records
products_cache
favorites
product_clicks
```

建议权限：

```text
users: 仅创建者可读写
outfit_records: 仅创建者可读写
products_cache: 所有人可读，仅管理员可写
favorites: 仅创建者可读写
product_clicks: 仅创建者可写，仅管理员可读
```

## 云函数部署

在微信开发者工具中部署以下云函数：

```text
generateOutfit
getHistory
getOutfitDetail
deleteHistory
favoriteOutfit
trackProductClick
getUserProfile
updateUserPreference
```

本项目把通用逻辑放在 `cloudfunctions/shared/`。如果你的部署方式只上传单个云函数目录，需要确保 `shared` 目录一并进入云函数包，或在部署前把 `shared` 同步到每个云函数目录中。

每个云函数依赖：

```json
{"wx-server-sdk":"latest"}
```

## 环境变量

MVP 默认 mock 模式，可以直接跑通完整链路：

```text
AI_MODE=mock
PRODUCT_SOURCE=mock
```

接入真实服务时，Key 只能配置在云函数环境变量中，不能写入小程序端：

```text
AI_MODE=real
OPENAI_API_KEY=...
OPENAI_BASE_URL=...
OPENAI_MODEL=...

PRODUCT_SOURCE=real
TAOBAO_APP_KEY=...
TAOBAO_APP_SECRET=...
JD_APP_KEY=...
JD_APP_SECRET=...
VIP_APP_KEY=...
VIP_APP_SECRET=...
```

当前真实 adapter 只保留接口边界，未写入真实联盟调用。接入时替换：

```text
cloudfunctions/shared/products/taobaoProductAdapter.js
cloudfunctions/shared/products/jdProductAdapter.js
cloudfunctions/shared/products/vipProductAdapter.js
cloudfunctions/shared/ai/aiService.js
```

## 核心链路

```text
首页填写条件
→ pages/generating 调用 wx.cloud.callFunction({ name: "generateOutfit" })
→ 云函数解析条件并生成关键词
→ mock/真实商品 adapter 召回商品
→ productScoring 过滤无图、低销量、低评分、预算异常商品
→ AI mock/真实服务只能从候选商品 id 中选搭配
→ 图片写入云存储或 mock 图片 URL
→ 结果写入 outfit_records
→ 结果页展示商品卡并先 trackProductClick 再处理购买跳转
```

## 本地验证

当前可自动验证云函数共享逻辑：

```bash
node --test cloudfunctions/tests/product-service.test.js
```

语法检查：

```bash
find miniprogram cloudfunctions -name '*.js' -print0 | xargs -0 -n1 node --check
```

手动冒烟路径：

1. 微信开发者工具打开项目并确认云环境 ID。
2. 上传并部署云函数。
3. 首页填写条件，点击「立即生成」。
4. 生成中页面展示 6 个步骤。
5. 结果页展示搭配建议、效果图、关键词和商品清单。
6. 点击商品购买按钮，确认 `product_clicks` 写入记录。
7. 历史页查看详情、删除记录。
8. 我的页保存默认风格、预算和身材标签。

## 安全约束

- 小程序端没有 AI Key、电商联盟 Key、转链 Key。
- 商品推荐先召回真实/模拟商品，再由 AI 选择商品组合。
- 佣金权重只有 5%，不会压过相关度、销量、评分和店铺口碑。
- AI 结果图只作为搭配示意，结果页始终保留真实商品卡片。
