# CloudWear AI 部署手册（103.242.14.110）

本文档面向当前仓库状态，覆盖三部分部署：

- API 服务：`api-server`，NestJS，默认端口 `9200`
- H5：`h5-app`，Next.js，外部访问端口 `9300`
- Web 管理端：`admin-web`，Umi Max 静态站点，外部访问端口 `9400`

## 调查结论

- 现状是：三端都已具备本地构建脚本，后端使用 PM2 配置 `api-server/ecosystem.config.cjs`，H5 使用 `next start`，Web 管理端构建产物在 `admin-web/dist`。
- 关键约束是：管理端生产请求前缀固定为 `/api`，并期望 Nginx 把 `/api` 去掉再转发到后端；H5 的部分后端接口真实路径本身就是 `/api/h5/*`、`/api/generate-outfit`，不能套同一个“去掉 /api”的代理规则。
- 我之前不知道但现在知道的是：`api-server/sql` 目录挂到 MySQL 自动初始化时，文件名排序会让 `cloudwear-*` 早于 `vivy-nest-admin.sql`，不适合直接依赖自动初始化顺序。
- 基于以上，我的判断是：当前最稳的 IP 部署方式是 API 独立暴露 `9200`，H5 对外走 `9300`，管理端对外走 `9400`，管理端自己的 `/api` 由 Nginx 单独代理并去前缀。

## 服务器基础准备

以下命令在服务器 `103.242.14.110` 执行。

```bash
ssh root@103.242.14.110

apt update
apt install -y git curl nginx
systemctl enable --now nginx

# 安装 nvm / Node。项目已验证 Node v23.11.0 可构建；生产也可使用 Node 22 LTS。
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

corepack enable
corepack prepare pnpm@10.11.0 --activate
npm i -g pm2
```

建议目录：

```bash
mkdir -p /opt/cloudwear
cd /opt/cloudwear
git clone <你的仓库地址> CloudWear-AI
cd CloudWear-AI
```

如果不是 Git 拉取，也可以从本机打包上传，但不要上传 `node_modules`、`.next/cache`、本地 IDE 文件和真实密钥。

## 一键部署脚本

仓库已准备 `deploy/deploy.sh`。服务器进入项目根目录后，先复制参数模板并填写真实连接信息：

```bash
cd /opt/cloudwear/CloudWear-AI
cp deploy/.env.deploy.example deploy/.env.deploy
vim deploy/.env.deploy
```

常规部署：

```bash
bash deploy/deploy.sh
```

如果需要脚本顺便创建 MySQL 库和账号，在 `deploy/.env.deploy` 里设置：

```bash
CREATE_DB=1
MYSQL_ADMIN_USER=root
MYSQL_ADMIN_PASSWORD=<root密码>
```

如果需要导入当前仓库 SQL，必须显式打开：

```bash
IMPORT_SQL=1
CONFIRM_IMPORT_SQL=YES
```

注意：`IMPORT_SQL=1` 会先备份当前库到 `backups/`，再按顺序导入 SQL。基础脚本 `vivy-nest-admin.sql` 内含 `DROP TABLE`，所以默认不会自动导入。

## 数据库与 Redis

后端 `NODE_ENV=production` 时默认读取：

- MySQL：`localhost:3306`
- Redis：`localhost:6379`
- 数据库名：`vivy-nest-admin`

服务器已经有 MySQL 和 Redis，并且 `3306/6379` 已被占用，所以主部署路径是直接复用服务器现有服务，不再启动数据库容器。

先确认服务可用：

```bash
mysql --version
redis-cli -h 127.0.0.1 -p 6379 ping
mysql -h127.0.0.1 -P3306 -u<已有MySQL用户> -p -e "SELECT VERSION();"
```

创建业务库和账号。下面只给占位符，真实密码不要写进仓库：

```bash
mysql -h127.0.0.1 -P3306 -uroot -p
```

```sql
CREATE DATABASE IF NOT EXISTS `vivy-nest-admin`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'cloudwear'@'127.0.0.1' IDENTIFIED BY '<强密码>';
GRANT ALL PRIVILEGES ON `vivy-nest-admin`.* TO 'cloudwear'@'127.0.0.1';
FLUSH PRIVILEGES;
```

如果服务器现有 Redis 设置了密码，后端配置里也要填同一个密码；如果没有密码，把 `password` 留空或删掉该字段。

仓库里的 `api-server/docker-compose.prod.yaml` 已改成备用隔离方案：MySQL 映射 `127.0.0.1:13306`，Redis 映射 `127.0.0.1:16379`。只有当你不想用服务器现有 MySQL/Redis 时才启动它，并且必须在后端生产配置里同步改端口。

## 导入当前 SQL

如果“现在的 SQL”指仓库当前 SQL 脚本，按这个顺序手动导入，不建议依赖 Docker 自动初始化目录排序：

```bash
cd /opt/cloudwear/CloudWear-AI/api-server

mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < sql/vivy-nest-admin.sql
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < sql/cloudwear-ai-model.sql
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < sql/cloudwear-ai-prompt.sql
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < sql/cloudwear-h5-style-profile.sql
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < sql/cloudwear-outfit-record.sql
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < sql/cloudwear-drop-visitor-id.sql
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < sql/patch-menu-icons.sql
```

如果“现在的 SQL”指本机正在跑的真实数据，则先在本机导出当前库，再传到服务器导入：

```bash
mysqldump -h127.0.0.1 -P3306 -u<本机MySQL用户> -p --single-transaction --routines --triggers vivy-nest-admin > vivy-nest-admin-current.sql

scp vivy-nest-admin-current.sql root@103.242.14.110:/opt/cloudwear/

ssh root@103.242.14.110
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < /opt/cloudwear/vivy-nest-admin-current.sql
```

## 后端 API 部署

生产私有配置放在服务器本地，不提交仓库。仓库已准备示例文件 `deploy/config.production.local.example.yaml`，推荐复制后改真实连接信息：

```bash
cd /opt/cloudwear/CloudWear-AI/api-server/vivy-modules/vivy-system/src/config
cp /opt/cloudwear/CloudWear-AI/deploy/config.production.local.example.yaml config.production.local.yaml
vim config.production.local.yaml
```

至少确认：

- `outfitAi.textApiKey`、`outfitAi.textBaseUrl`、`outfitAi.textModel`
- `outfitAi.imageApiKey`、`outfitAi.imageBaseUrl`、`outfitAi.imageModel`
- `datasource.defalut.host/port/username/password/database` 指向服务器现有 MySQL
- `redis.defalut.host/port/password` 和 `bull.redis.host/port/password` 指向服务器现有 Redis

构建并启动：

```bash
cd /opt/cloudwear/CloudWear-AI/api-server
pnpm install --frozen-lockfile
pnpm run build
pnpm run pm2:prod
pm2 save
pm2 status
```

验证：

```bash
curl -i http://127.0.0.1:9200/
curl -i http://127.0.0.1:9200/health
curl -i http://103.242.14.110:9200/swagger
```

注意：`/health` 当前会检查一个外部网络地址、MySQL、Redis、磁盘和内存。如果外部地址不可达，健康检查可能返回异常，但不一定代表核心 API 全部不可用。

## H5 部署

H5 构建时建议显式指定后端 API 地址：

```bash
cd /opt/cloudwear/CloudWear-AI/h5-app
cat > .env.production <<'EOF'
NEXT_PUBLIC_API_BASE_URL=http://103.242.14.110:9200
EOF

npm ci
npm run build
pm2 start "npm run start -- -p 3000" --name cloudwear-h5
pm2 save
```

说明：H5 的 Next.js 进程仍监听服务器本机 `3000`，对外由 Nginx 的 `9300` 端口代理。这样外部端口保持为你指定的 `9300`，同时保留 Nginx 的转发头和后续 HTTPS 扩展空间。

验证：

```bash
curl -I http://127.0.0.1:3000/login
curl -I http://103.242.14.110:9300/
```

## Web 管理端部署

管理端静态文件由 Nginx 直接托管，使用 `9400`，避免与 H5 端口冲突。

```bash
cd /opt/cloudwear/CloudWear-AI/admin-web
pnpm install --frozen-lockfile
pnpm run build
```

Nginx 配置已准备在 `deploy/nginx-cloudwear.conf`，部署时复制到 `/etc/nginx/conf.d/cloudwear.conf`：

```bash
cp /opt/cloudwear/CloudWear-AI/deploy/nginx-cloudwear.conf /etc/nginx/conf.d/cloudwear.conf
```

加载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

验证：

```bash
curl -I http://103.242.14.110:9300/
curl -I http://103.242.14.110:9400/
curl -i http://103.242.14.110:9400/api/health
```

## 防火墙建议

如果服务器启用了防火墙，至少开放：

- `9200/tcp`：API 服务
- `9300/tcp`：H5
- `9400/tcp`：Web 管理端

MySQL `3306` 和 Redis `6379` 不应对公网开放；确认它们只监听内网或 `127.0.0.1`，或者通过安全组限制来源。

## 发布检查清单

- `pnpm run build` 在 `api-server` 成功
- `npm run build` 在 `h5-app` 成功
- `pnpm run build` 在 `admin-web` 成功
- MySQL 已按顺序导入当前 SQL
- API `http://103.242.14.110:9200/swagger` 可访问
- H5 `http://103.242.14.110:9300/` 可访问并能登录/生成
- Web 管理端 `http://103.242.14.110:9400/` 可访问并能登录
- 上传文件路径 `/uploads/*` 可访问

## 回滚

代码回滚：

```bash
cd /opt/cloudwear/CloudWear-AI
git log --oneline -5
git checkout <上一个可用提交>

cd api-server && pnpm install --frozen-lockfile && pnpm run build && pm2 restart vivy-system
cd ../h5-app && npm ci && npm run build && pm2 restart cloudwear-h5
cd ../admin-web && pnpm install --frozen-lockfile && pnpm run build && nginx -t && systemctl reload nginx
```

数据库回滚：

- 发布前先执行 `mysqldump` 备份。
- 如果 SQL 已经改表，优先用备份恢复，而不是手写反向 DDL。

```bash
mysqldump -h127.0.0.1 -P3306 -ucloudwear -p --single-transaction --routines --triggers vivy-nest-admin > backup-before-release.sql
```
