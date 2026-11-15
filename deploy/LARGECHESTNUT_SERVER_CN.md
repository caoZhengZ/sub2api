# LargeChestnut 服务器部署与更新

## 当前结构

- 生产旧服务：`sub2api`，监听 `127.0.0.1:8080`，保留用于回滚。
- LargeChestnut 新服务：`sub2api-candidate`，监听 `127.0.0.1:18080`。
- Caddy 主站上游：`sub2api-candidate:8080`。
- PostgreSQL、Redis：直接复用现有 `sub2api-postgres` 和 `sub2api-redis`。
- 新服务运行数据：`/www/dk_project/largechestnut-sub2api/deploy/data-candidate`。
- 源码目录：`/www/dk_project/largechestnut-sub2api`。
- Caddy 配置与备份：`/www/dk_project/sub2api/Caddyfile` 和
  `/www/dk_project/sub2api/Caddyfile.bak-largechestnut-*`。

本次版本基于 Sub2API `v0.2.20`，没有数据库迁移。后续如果同步了上游并新增
迁移，发布前必须先确认数据库备份可用。

## 后续更新

1. 本地修改并推送到 `largechestnut` 分支。
2. 登录服务器并更新源码：

```bash
ssh root@159.195.43.97
cd /www/dk_project/largechestnut-sub2api
git fetch origin largechestnut
git reset --hard origin/largechestnut
```

3. 构建并重建候选服务。已有数据库备份且本次没有迁移时：

```bash
cd /www/dk_project/largechestnut-sub2api/deploy
SKIP_DB_BACKUP=1 \
SOURCE_DATA_DIR=/www/dk_project/sub2api/data \
CANDIDATE_TAG="largechestnut-$(date +%Y%m%d-%H%M%S)" \
./candidate-up.sh
```

如果有数据库迁移，去掉 `SKIP_DB_BACKUP=1`，脚本会先执行 PostgreSQL 备份。
构建和健康检查期间，旧 `sub2api` 容器始终不会停止。

4. 检查服务：

```bash
curl -fsS http://127.0.0.1:18080/health
docker logs --tail 200 sub2api-candidate
docker ps --filter name=sub2api --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

## 回滚

把最近的 Caddy 备份恢复回宿主机，并重启 Caddy：

```bash
cp -a /www/dk_project/sub2api/Caddyfile.bak-largechestnut-20261115-154121 \
  /www/dk_project/sub2api/Caddyfile
docker restart sub2api-caddy
```

回滚只会把流量切回旧 `sub2api:8080`，不会删除新容器、数据库或用户数据。

## 注意事项

- Caddy 的 `Caddyfile` 是单文件 bind mount。不要直接使用会替换 inode 的
  `sed -i` 修改后立即 reload；应通过容器内路径写回，或修改后重启 Caddy。
- 不要删除 `data-candidate`、`/www/dk_project/sub2api/postgres_data` 和
  `/www/dk_project/sub2api/data`。
- 不要把 `.env`、数据库备份或真实 API Key 提交到 Git。
