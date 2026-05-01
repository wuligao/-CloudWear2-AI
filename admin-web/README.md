# CloudWear Admin

基于 Vivy Nest Admin 的 React 管理后台前端。

## 本地开发

```sh
pnpm install
pnpm run dev
```

默认访问地址：

```text
http://localhost:8000
```

开发环境通过 `config/proxy.ts` 把 `/api` 和 `/uploads` 代理到后端：

```text
http://localhost:9200
```
