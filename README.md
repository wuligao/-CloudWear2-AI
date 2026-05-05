# -CloudWear2-AI

## 项目目录

```text
h5-app/          H5 Web 客户端，面向移动端浏览器
admin-web/       后台管理前端，基于 React、Umi Max、Ant Design
api-server/      统一业务后端，基于 NestJS，承载 RBAC、管理端 API 和后续 H5/小程序 API
wechat-miniapp/  微信小程序端与云函数代码
```

## 本地开发入口

```sh
# H5
cd h5-app
npm run dev

# 管理后台前端
cd admin-web
pnpm run dev

# 统一后端
cd api-server
pnpm run docker:base
pnpm run build:common
cd vivy-modules/vivy-system
pnpm run dev
```

H5 的后端地址通过 `h5-app/.env.local` 的 `NEXT_PUBLIC_API_BASE_URL` 配置；穿搭生成相关 AI Key 和模型地址放在 `api-server/vivy-modules/vivy-system/src/config/config.local.yaml` 或同名环境变量中。

## 服务器部署

当前服务器部署统一使用项目根目录的 `docker-compose.yaml`：

```sh
cp deploy/.env.compose.example deploy/.env.compose
vim deploy/.env.compose
docker compose --env-file deploy/.env.compose up -d --build
```

目标端口：

- API：`9200`
- H5：`9300`
- Web 管理端：`9400`

MySQL 和 Redis 已内置在 `docker-compose.yaml` 中，运行在独立 Docker 网络里，默认绑定 `0.0.0.0` 并映射到宿主机 `13306` / `16379`，可用外部工具直连，不占用服务器已有的 `3306` / `6379`；首次启动时会自动创建数据卷并导入初始化 SQL。部署前只需要在 `deploy/.env.compose` 里填写数据库密码，AI 模型服务商、Key、文本模型和生图模型统一在 Web 管理端后台配置。`NEXT_PUBLIC_API_BASE_URL` 默认可留空，H5 会按当前访问域名自动请求 API 的 `9200` 端口。

部署说明见 `docs/deploy-103.242.14.110.md`。
