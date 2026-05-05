# CloudWear AI Docker Compose 部署手册（103.242.14.110）

当前部署入口统一为项目根目录的 `docker-compose.yaml`，不再使用构建脚本部署。

部署目标：

- API 服务：`http://103.242.14.110:9200`
- H5：`http://103.242.14.110:9300`
- Web 管理端：`http://103.242.14.110:9400`
- MySQL：由 `docker-compose.yaml` 内置启动，容器内 `3306`，宿主机维护端口 `13306`
- Redis：由 `docker-compose.yaml` 内置启动，容器内 `6379`，宿主机维护端口 `16379`
- SQL：首次创建 MySQL 数据卷时自动导入 `api-server/sql/vivy-nest-admin.sql` 及必要增量 SQL

## 重要说明

`docker-compose.yaml` 使用 Docker 网络隔离。API 通过服务名访问内置依赖：

- MySQL：`mysql:3306`
- Redis：`redis:6379`

MySQL 和 Redis 仍只加入 `cloudwear-private` 网络供 API 内部访问，同时映射维护端口到宿主机：MySQL `13306:3306`、Redis `16379:6379`。这样不会占用服务器已有的 `3306` / `6379`。

因此服务器上不能再有其他服务占用：

- `9200`：API
- `9300`：H5
- `9400`：Web 管理端
- `13306`：内置 MySQL 维护端口
- `16379`：内置 Redis 维护端口

## 服务器准备

在服务器执行：

```bash
ssh root@103.242.14.110

apt update
apt install -y git curl
```

安装 Docker Engine 和 Docker Compose Plugin 后确认版本：

```bash
docker --version
docker compose version
```

拉取代码：

```bash
mkdir -p /opt/cloudwear
cd /opt/cloudwear
git clone https://github.com/wuligao/-CloudWear2-AI.git CloudWear-AI
cd CloudWear-AI
```

## 配置环境变量

复制 compose 环境变量模板：

```bash
cp deploy/.env.compose.example deploy/.env.compose
vim deploy/.env.compose
```

至少要修改：

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`

AI 模型服务商、Key、文本模型和生图模型都在 Web 管理端的后台配置里维护，不需要写入 `deploy/.env.compose`。

`CLOUDWEAR_MYSQL_BIND_HOST` 和 `CLOUDWEAR_REDIS_BIND_HOST` 默认是 `0.0.0.0`，用于支持外部工具直连。外部工具连接信息：

- MySQL：主机 `103.242.14.110`，端口 `13306`，数据库 `vivy-nest-admin`，用户名为 `MYSQL_USER`
- Redis：主机 `103.242.14.110`，端口 `16379`

`NEXT_PUBLIC_API_BASE_URL` 默认可以留空。留空时 H5 会按当前访问域名自动请求 `9200` 端口，例如访问 `http://103.242.14.110:9300` 时会请求 `http://103.242.14.110:9200`。只有 API 使用独立域名或网关地址时才需要显式填写。

不要把 `deploy/.env.compose` 提交到仓库。

## 数据库初始化

首次执行 `docker compose up` 时，MySQL 容器会自动创建业务库和账号，并按顺序导入 `docker-compose.yaml` 中挂载到 `/docker-entrypoint-initdb.d/` 的 SQL 文件。

注意：MySQL 初始化脚本只会在 `cloudwear-mysql-data` 数据卷为空时执行。已有数据卷不会重复导入，避免覆盖线上数据。

需要全量重置数据时，先停止服务并确认可以丢弃当前数据库数据，再删除 MySQL 数据卷：

```bash
docker compose --env-file deploy/.env.compose down
docker volume rm cloudwear-ai_cloudwear-mysql-data
docker compose --env-file deploy/.env.compose up -d --build
```

## Compose 部署

在项目根目录执行：

```bash
docker compose --env-file deploy/.env.compose config
docker compose --env-file deploy/.env.compose up -d --build
```

查看状态和日志：

```bash
docker compose --env-file deploy/.env.compose ps
docker compose --env-file deploy/.env.compose logs -f mysql
docker compose --env-file deploy/.env.compose logs -f redis
docker compose --env-file deploy/.env.compose logs -f api
docker compose --env-file deploy/.env.compose logs -f h5
docker compose --env-file deploy/.env.compose logs -f admin
```

## 验证

服务器本机验证：

```bash
curl -i http://127.0.0.1:9200/
curl -i http://127.0.0.1:9200/health
curl -I http://127.0.0.1:9300/
curl -I http://127.0.0.1:9400/
curl -i http://127.0.0.1:9400/api/health
nc -zv 127.0.0.1 13306
nc -zv 127.0.0.1 16379
```

公网验证：

```bash
curl -i http://103.242.14.110:9200/
curl -I http://103.242.14.110:9300/
curl -I http://103.242.14.110:9400/
nc -zv 103.242.14.110 13306
nc -zv 103.242.14.110 16379
```

浏览器访问：

- `http://103.242.14.110:9300/`
- `http://103.242.14.110:9400/`
- `http://103.242.14.110:9200/swagger`

## 常用维护命令

更新代码后重新部署：

```bash
git pull
docker compose --env-file deploy/.env.compose up -d --build
```

停止服务：

```bash
docker compose --env-file deploy/.env.compose down
```

只重启 API：

```bash
docker compose --env-file deploy/.env.compose up -d --build api
```

清理旧镜像：

```bash
docker image prune -f
```

如果构建时拉取基础镜像出现 Docker Hub EOF 或 timeout，先在服务器配置 Docker 镜像加速源，或手动重试：

```bash
docker pull node:22-bookworm-slim
docker pull nginx:1.27-alpine
docker pull mysql:8.0
docker pull redis:7.4-alpine
docker compose --env-file deploy/.env.compose up -d --build
```

## 回滚

代码回滚：

```bash
git log --oneline -5
git checkout <上一个可用提交>
docker compose --env-file deploy/.env.compose up -d --build
```

数据库回滚：

- 数据库数据保存在 Docker volume：`cloudwear-ai_cloudwear-mysql-data`。
- 需要回滚数据库时，优先使用发布前的 `mysqldump` 备份在 MySQL 容器内恢复。

```bash
docker compose --env-file deploy/.env.compose exec -T mysql \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" vivy-nest-admin' < backup-before-cloudwear.sql
```

## 防火墙

对公网开放：

- `9200/tcp`
- `9300/tcp`
- `9400/tcp`

不要对公网开放 MySQL `13306` 和 Redis `16379`，建议只允许本机或可信管理 IP 访问。
