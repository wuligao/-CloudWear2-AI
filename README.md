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
