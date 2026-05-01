# CloudWear AI

CloudWear AI 是一个移动端优先的 AI 穿搭生成 MVP。用户输入季节、气温、天气、地点、场景和个人风格后，应用会生成一套穿搭图片与单品拆解，并支持在浏览器本地保存历史记录。

## 功能

- 穿搭条件表单：季节、气温、天气、地点、场景、风格、颜色和倾向。
- AI 生成链路：关键词生成直接拼接图片提示词以减少一次文本模型调用；上传照片生成保留结构化方案。
- AI 图片生成：默认走 `https://api.bltcy.ai/v1`，页面内可选择热门图片模型生成单人全身穿搭图。
- 用户照片生成：可上传本人照片，支持基于照片进行穿搭图片编辑生成。
- 历史记录：保存、查看详情、删除、基于旧记录重新生成相似风格。
- 个人偏好：本地保存常用风格、喜欢颜色、避免颜色和备注。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide React

## 本地启动

安装依赖：

```bash
npm install
```

创建本地环境变量：

```bash
cp .env.example .env.local
```

在 `.env.local` 中配置：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:9200
```

AI 模型 Key 和模型地址配置在 `api-server`，H5 只通过 `NEXT_PUBLIC_API_BASE_URL` 调用统一后端。

启动开发服务：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 验证

```bash
npm run lint
npm run build
```

手动冒烟路径：

1. 打开首页。
2. 使用默认条件生成穿搭。
3. 保存结果。
4. 进入历史页查看记录。
5. 打开详情页。
6. 删除记录。

## 当前版本说明

第一版为了保证 1-3 天内可运行，历史记录和个人偏好使用浏览器本地存储。Supabase 数据库、图片持久化存储和登录体系已在 [开发文档](./docs/development.md) 中规划，适合作为下一阶段接入。
