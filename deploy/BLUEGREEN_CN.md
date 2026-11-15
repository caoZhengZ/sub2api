# LargeChestnut / Sub2API 并行部署与快速回滚

这个方案不会替换或停止旧容器。新版本先以 `sub2api-candidate` 名称启动，
复用现有 PostgreSQL、Redis 和 `.env`，验证完成后再切换入口。

## 先明确切换方式

- 新旧服务在同一台服务器：不要改 DNS 来切容器，二者共用服务器 IP。
  最终应把 Caddy 的 `reverse_proxy` 从旧端口 `8080` 改到候选端口 `18080`。
  改 Caddy 配置约几秒完成，回滚也是改回 `8080`，比 DNS 更快。
- 新服务在另一台服务器：先给候选服务绑定测试域名，验证后修改 Cloudflare
  `A`/`AAAA` 记录到新服务器 IP；旧服务器和旧容器保持运行，失败时把记录改回。

## 安全前提

1. **必须先备份数据库。** 新版本启动时会执行向前迁移，迁移不能简单回滚。
2. 新旧服务必须使用同一个 `JWT_SECRET` 和 `TOTP_ENCRYPTION_KEY`。否则用户
   登录态会失效，现有的 2FA/加密凭据也可能无法解密。
3. 候选容器必须使用独立的 `data-candidate/`、容器名和端口，不能挂载旧的
   `deploy/data/`。
4. 在旧容器仍在线时，两个进程会同时连接数据库和 Redis。若这次只改前端，
   风险较低；若包含后端或迁移改动，优先用数据库副本做第一轮验证，确认后再
   连接生产库完成短暂切换。
5. 切换窗口内先暂停充值回调和后台定时任务等可能写数据的操作，避免新旧进程
   重复处理。

## 上传与启动

在服务器上把源码压缩包解压到独立目录，例如：

```bash
mkdir -p /opt/largechestnut-candidate
tar -xzf largechestnut-sub2api-candidate.tar.gz -C /opt/largechestnut-candidate
cd /opt/largechestnut-candidate/deploy
```

把旧部署目录中的 `.env` 原样复制到当前 `deploy/.env`。然后启动：

```bash
chmod +x candidate-up.sh
./candidate-up.sh
```

如果最近已经有可恢复的数据库备份，并且本次发布确认没有数据库迁移，可以跳过
整库导出。仍建议首次切换前先确认备份可用：

```bash
SKIP_DB_BACKUP=1 \
SOURCE_DATA_DIR=/www/dk_project/sub2api/data \
./candidate-up.sh
```

`SOURCE_DATA_DIR` 会把旧服务的 `config.yaml`、模型价格等运行数据复制到
`data-candidate/`，不会修改旧目录。

脚本会：

- 自动找到旧 PostgreSQL 容器所在的 Docker 网络
- 先执行 `pg_dump` 备份
- 复制旧 `config.yaml` 到独立的 `data-candidate/`
- 构建镜像并启动 `sub2api-candidate`
- 监听 `127.0.0.1:18080`，等待 `/health` 通过
- 保持旧容器继续运行

检查日志：

```bash
docker logs -f --tail 200 sub2api-candidate
```

## 验证

服务器本机：

```bash
curl -fsS http://127.0.0.1:18080/health
curl -fsS http://127.0.0.1:18080/api/v1/settings/public
```

本地电脑可通过 SSH 隧道访问：

```bash
ssh -N -L 18080:127.0.0.1:18080 root@你的服务器IP
```

然后打开 `http://127.0.0.1:18080`，重点验证：

- 老账号登录、2FA 和登录态恢复
- API Key 列表、切换 Key、使用记录
- 用户余额、账户用量、充值订单和充值跳转
- 模型列表、桌面端登录回调和浏览器 handoff
- 新浅色主题与侧边栏

## 同机切换（推荐）

给候选服务临时增加独立测试域名，例如 Cloudflare 增加
`next.largechestnut.com`，指向现有服务器，并在现有 Caddyfile 增加：

```caddyfile
next.largechestnut.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:18080
}
```

确认 `next` 域名完整可用后，再把主域名上游从旧端口切到候选端口。先验证并
重载 Caddy：

```bash
caddy validate --config /path/to/Caddyfile
caddy reload --config /path/to/Caddyfile
```

回滚只需把主域名的上游改回旧服务端口并再次 reload。旧容器始终没有停止：

```caddyfile
reverse_proxy 127.0.0.1:8080
```

## 跨服务器 DNS 切换

1. 候选服务在新服务器通过测试域名验证。
2. Cloudflare 中把主域名 `A`/`AAAA` 记录切到新服务器。
3. 保留旧服务器的 DNS 值，出问题时立即改回。
4. 切换后清理 Cloudflare 的 HTML 缓存并检查 `/health`、登录和 API 请求。

Cloudflare 开启代理时，记录变更通常很快生效，但不要依赖 DNS 做同机容器切换。

## 回滚

同机 Caddy 方案：把上游改回 `127.0.0.1:8080` 并 reload。

跨服务器 DNS 方案：把 Cloudflare 记录改回旧服务器。

如果新版本已经执行了不兼容迁移，单纯切回旧容器可能不够；需要停止写入并从
`deploy/backups/*.dump` 恢复数据库。因此启动候选前的备份是硬性要求。
