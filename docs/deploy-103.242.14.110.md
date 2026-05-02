# CloudWear AI Docker Compose 部署手册（103.242.14.110）

当前部署入口统一为项目根目录的 `docker-compose.yaml`，不再使用构建脚本部署。

部署目标：

- API 服务：`http://103.242.14.110:9200`
- H5：`http://103.242.14.110:9300`
- Web 管理端：`http://103.242.14.110:9400`
- MySQL：复用服务器已有 `127.0.0.1:3306`
- Redis：复用服务器已有 `127.0.0.1:6379`
- SQL：统一使用 `api-server/sql/vivy-nest-admin.sql`

## 重要说明

`docker-compose.yaml` 使用 Linux 的 `host` 网络模式。这样 API 容器访问 `127.0.0.1:3306` 和 `127.0.0.1:6379` 时，访问的是服务器已有 MySQL/Redis，不会再启动或占用新的数据库容器。

因此服务器上不能再有其他服务占用：

- `9200`：API
- `9300`：H5
- `9400`：Web 管理端

## 服务器准备

在服务器执行：

```bash
ssh root@103.242.14.110

apt update
apt install -y git curl default-mysql-client redis-tools
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

- `MYSQL_USER`
- `MYSQL_PASSWORD`
- Redis 如果有密码，填写 `REDIS_PASSWORD`；如果没有认证，`REDIS_USERNAME` 和 `REDIS_PASSWORD` 保持空
- `OPENAI_TEXT_API_KEY`、`OPENAI_TEXT_BASE_URL`、`OPENAI_TEXT_MODEL`
- `OPENAI_IMAGE_API_KEY`、`OPENAI_IMAGE_BASE_URL`、`OPENAI_IMAGE_MODEL`

不要把 `deploy/.env.compose` 提交到仓库。

## 数据库准备

确认服务器已有 MySQL/Redis 可用：

```bash
redis-cli -h 127.0.0.1 -p 6379 ping
mysql -h127.0.0.1 -P3306 -uroot -p -e "SELECT VERSION();"
```

创建业务库和账号：

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

首次部署或需要重置数据时，导入当前统一 SQL：

```bash
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < api-server/sql/vivy-nest-admin.sql
```

注意：导入 SQL 前建议先备份；当前 SQL 可能覆盖已有表结构和数据。

```bash
mysqldump -h127.0.0.1 -P3306 -ucloudwear -p --single-transaction --routines --triggers vivy-nest-admin > backup-before-cloudwear.sql
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
```

公网验证：

```bash
curl -i http://103.242.14.110:9200/
curl -I http://103.242.14.110:9300/
curl -I http://103.242.14.110:9400/
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

- 发布前先保留 `mysqldump` 备份。
- 如果导入 SQL 后需要恢复，用备份文件恢复。

```bash
mysql -h127.0.0.1 -P3306 -ucloudwear -p vivy-nest-admin < backup-before-cloudwear.sql
```

## 防火墙

对公网开放：

- `9200/tcp`
- `9300/tcp`
- `9400/tcp`

不要对公网开放 MySQL `3306` 和 Redis `6379`。
