# CloudWear AI 第一版开发文档

## 1. 开发目标

在 1-3 天内完成一个可部署、可演示、可验证的 AI 穿搭生成 Web App。第一版聚焦“输入场景条件 → 生成穿搭方案和图片 → 保存历史 → 回看历史”的最小闭环。

## 2. 推荐技术栈

### 2.1 前端与服务端

- Next.js App Router
- TypeScript
- Tailwind CSS
- Server Actions 或 Route Handlers
- React Hook Form 或原生受控表单

### 2.2 数据与存储

- Supabase Auth
- Supabase Postgres
- Supabase Storage

### 2.3 AI 能力

- LLM：用于生成结构化穿搭方案。
- Image Model：用于生成穿搭图片。

### 2.4 部署

- Vercel
- Supabase 云服务

## 3. 架构概览

```text
Browser
  -> Next.js Page / Component
  -> Server Action or API Route
  -> Keyword generation builds image prompt directly, or photo generation asks LLM for structured outfit JSON
  -> Image model generates outfit image
  -> Upload image to Supabase Storage
  -> Save generation record to Supabase Postgres
  -> Return result to browser
```

## 4. 页面与路由

```text
/
  生成页

/history
  历史列表页

/history/[id]
  历史详情页

/profile
  个人风格页，可在第一版延后
```

## 5. 目录建议

```text
app/
  page.tsx
  history/
    page.tsx
    [id]/
      page.tsx
  profile/
    page.tsx

components/
  outfit/
    OutfitForm.tsx
    OutfitResult.tsx
    OutfitCard.tsx
    OutfitItems.tsx
  layout/
    AppShell.tsx
    BottomNav.tsx
  ui/
    Button.tsx
    Input.tsx
    Select.tsx
    Textarea.tsx
    LoadingState.tsx
    EmptyState.tsx

lib/
  ai/
    generateOutfitPlan.ts
    generateOutfitImage.ts
    prompts.ts
  db/
    generations.ts
    profile.ts
  supabase/
    client.ts
    server.ts
  validation/
    outfit.ts

types/
  outfit.ts
  database.ts
```

## 6. 数据库设计

### 6.1 outfit_generations

```sql
create table outfit_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id text,
  season text not null,
  temperature integer not null,
  weather text not null,
  location text not null,
  occasion text not null,
  style text not null,
  color_preference text,
  gender_preference text,
  outfit_title text not null,
  outfit_summary text not null,
  style_tags jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  temperature_advice text not null,
  occasion_reason text not null,
  image_prompt text not null,
  image_url text not null,
  llm_output jsonb not null,
  created_at timestamptz not null default now()
);

create index outfit_generations_user_id_created_at_idx
  on outfit_generations(user_id, created_at desc);

create index outfit_generations_session_id_created_at_idx
  on outfit_generations(session_id, created_at desc);
```

### 6.2 style_profiles

```sql
create table style_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  favorite_styles jsonb not null default '[]'::jsonb,
  favorite_colors jsonb not null default '[]'::jsonb,
  avoid_colors jsonb not null default '[]'::jsonb,
  common_occasions jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

第一版如果不做登录，可以先使用 session_id 绑定匿名历史记录；后续接入 Supabase Auth 后再关联 user_id。

## 7. 类型定义

```ts
export type OutfitInput = {
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  temperature: number
  weather: string
  location: string
  occasion: string
  style: string
  colorPreference?: string
  genderPreference?: string
}

export type OutfitItem = {
  category: string
  name: string
  color: string
  material: string
  reason: string
}

export type OutfitPlan = {
  outfitTitle: string
  summary: string
  styleTags: string[]
  temperatureAdvice: string
  occasionReason: string
  items: OutfitItem[]
  imagePrompt: string
}

export type OutfitGeneration = OutfitInput & OutfitPlan & {
  id: string
  imageUrl: string
  createdAt: string
}
```

## 8. API 设计

H5 不再承载 Next API route，所有生成相关请求通过 `NEXT_PUBLIC_API_BASE_URL` 指向 `api-server`。

### 8.1 POST /api/generate-outfit

用途：在 `api-server` 创建穿搭生成任务。

请求：

```json
{
  "season": "autumn",
  "temperature": 18,
  "weather": "多云",
  "location": "上海武康路",
  "occasion": "拍照打卡",
  "style": "法式简约",
  "colorPreference": "低饱和",
  "genderPreference": "不限"
}
```

响应：

```json
{
  "id": "uuid",
  "outfitTitle": "秋日街区法式轻盈穿搭",
  "summary": "适合 18 度多云天气的低饱和法式街拍造型。",
  "styleTags": ["法式", "低饱和", "街拍"],
  "temperatureAdvice": "适合 16-20 度，外套可应对早晚温差。",
  "occasionReason": "整体色彩柔和，适合武康路街区拍照和步行。",
  "items": [],
  "imageUrl": "https://example.com/image.png",
  "createdAt": "2026-04-27T00:00:00.000Z"
}
```

### 8.2 GET /api/generations

用途：获取当前用户或匿名会话的历史记录。

查询参数：

- limit：默认 20。
- cursor：分页游标，第一版可不实现。

### 8.3 GET /api/generations/[id]

用途：获取历史详情。

### 8.4 DELETE /api/generations/[id]

用途：删除历史记录。

## 9. AI 生成实现

### 9.1 AI Prompt 原则

关键词生成默认跳过文本模型，服务端根据用户输入直接拼接图片提示词，以减少一次 AI 调用。该路径会返回标题、摘要、标签和温度/场景说明，但单品拆解可为空。

上传照片生成仍先通过 LLM 生成结构化 JSON，再调用图片编辑模型。

LLM 必须输出可解析 JSON。输出字段固定，不允许输出 Markdown。

系统要求：

- 根据天气、温度、地点、场景和风格生成可穿搭方案。
- 优先实用性，其次视觉表现。
- 不生成品牌商标。
- 不生成暴露、色情、仇恨、暴力或违法内容。
- imagePrompt 使用英文描述，便于图片模型理解。

### 9.2 LLM 输出 JSON 示例

```json
{
  "outfitTitle": "秋日街区法式轻盈穿搭",
  "summary": "适合 18 度多云天气的低饱和法式街拍造型。",
  "styleTags": ["法式", "低饱和", "街拍"],
  "temperatureAdvice": "适合 16-20 度，外套可应对早晚温差。",
  "occasionReason": "整体色彩柔和，适合街区拍照、咖啡店和步行。",
  "items": [
    {
      "category": "outerwear",
      "name": "短款米灰色风衣",
      "color": "米灰色",
      "material": "棉混纺",
      "reason": "适合 18 度早晚温差，轮廓简洁。"
    }
  ],
  "imagePrompt": "Full body fashion editorial image of one adult model wearing a soft low-saturation French minimalist autumn outfit for a cloudy 18 Celsius city street photo walk in Shanghai, realistic fabric texture, clean background, no text, no logo, no watermark."
}
```

### 9.3 图片生成 Prompt 约束

图片提示词应包含：

- full body outfit
- one adult model
- season and temperature feeling
- occasion
- style
- colors
- realistic fabric texture
- no text, no logo, no watermark

## 10. 服务端校验

建议使用 Zod 定义输入校验：

- temperature 必须是合理整数，例如 -30 到 50。
- location 最大长度 80。
- occasion 最大长度 40。
- style 最大长度 40。
- colorPreference 最大长度 40。
- 禁止空字符串提交。

校验失败返回 400，并给出明确字段错误。

## 11. 鉴权与匿名会话

### 11.1 第一版方案

- 未登录用户使用浏览器 cookie 中的 session_id。
- 生成记录同时支持 user_id 和 session_id。
- 历史查询必须限制在当前 user_id 或 session_id。

### 11.2 后续方案

- 接入 Supabase Auth。
- 用户登录后可将匿名 session_id 下的记录迁移到 user_id。

## 12. 环境变量

```text
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DAILY_GENERATION_LIMIT=
```

注意：

- OPENAI_TEXT_API_KEY 和 OPENAI_IMAGE_API_KEY 配置在 api-server，不能放入 H5。
- 前端只能读取 NEXT_PUBLIC_ 开头的环境变量。
- 如果文本和图片使用不同兼容 OpenAI API 的服务商，在 api-server 分别配置 OPENAI_TEXT_BASE_URL 和 OPENAI_IMAGE_BASE_URL。

## 13. UI 设计要求

### 13.1 设计方向

- 移动端优先。
- 信息密度适中，避免营销页式大篇幅介绍。
- 第一屏就是生成表单。
- 操作按钮明确。
- 结果图要成为视觉中心。

### 13.2 状态要求

- 表单默认状态。
- 生成中状态。
- 生成成功状态。
- 生成失败状态。
- 历史空态。
- 删除确认状态。

### 13.3 组件要求

- 表单项使用选择器、分段控件或输入框。
- 生成按钮需要禁用重复点击。
- 历史卡片尺寸稳定，避免图片加载导致布局跳动。

## 14. 测试方案

### 14.1 单元测试

- 输入校验。
- LLM JSON 解析。
- prompt 拼接。
- 历史记录查询权限条件。

### 14.2 接口测试

- api-server POST /api/generate-outfit 成功创建任务。
- api-server POST /api/generate-outfit 输入非法时返回 400。
- GET /api/generations 只返回当前会话记录。
- DELETE /api/generations/[id] 只能删除当前会话记录。

### 14.3 手动冒烟测试

- 移动端打开首页。
- 输入“秋天、18 度、多云、上海武康路、拍照打卡、法式简约”。
- 点击生成。
- 等待图片和方案返回。
- 保存后进入历史页。
- 打开详情页。
- 删除记录。

## 15. 1-3 天开发计划

### Day 1：主流程

- 初始化 Next.js 项目。
- 完成首页表单和基础 UI。
- 实现 LLM 结构化穿搭方案生成。
- 实现图片生成。
- 展示生成结果。

验收：用户可以完成一次生成并看到图片和说明。

### Day 2：历史记录

- 配置 Supabase 数据库和 Storage。
- 保存图片和生成记录。
- 实现历史列表。
- 实现历史详情。
- 实现删除记录。

验收：生成结果可以保存、回看和删除。

### Day 3：上线前整理

- 完善移动端样式。
- 补齐加载态、错误态和空态。
- 增加每日生成次数限制。
- 补充基础测试。
- 部署到 Vercel。

验收：公网可访问，核心路径可稳定完成。

## 16. 风险与处理

### 16.1 图片生成时间长

处理：

- 明确显示生成进度。
- 防止重复提交。
- 记录请求状态，便于排查失败原因。

### 16.2 LLM 输出不是合法 JSON

处理：

- 使用结构化输出能力。
- 服务端校验输出字段。
- 输出不合法时返回明确错误，不保存不完整记录。

### 16.3 生成结果不实用

处理：

- Prompt 中强调温度、场景、可穿性。
- 保存用户反馈字段，为后续优化做准备。

### 16.4 成本不可控

处理：

- 匿名用户限制每日生成次数。
- 服务端记录生成用量。
- 第一版每次只生成一张图。

## 17. 后续技术扩展

- 加入天气 API 自动获取实时天气。
- 增加用户反馈表：喜欢、不喜欢、原因。
- 支持一次生成多套方案。
- 支持风格参考图。
- 支持真人照片虚拟试衣。
- 增加商品推荐与电商链接。
- 增加生成队列和异步任务状态。
