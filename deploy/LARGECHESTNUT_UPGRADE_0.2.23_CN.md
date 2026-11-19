# LargeChestnut v0.2.23 升级准备

本次只准备本地代码和验证结果。尚未推送、构建服务器镜像、重启服务或执行生产数据库迁移。实际发布须等用户通知。

## 合并范围

- 上游仓库：`https://github.com/Wei-Shaw/sub2api`。
- 目标：已发布标签 `v0.2.23`，提交 `5af9afb588c4b014b3df9db7d4073af1f8ae01b6`。
- 原二开分支：`largechestnut`，原提交 `dedbfd6ca899458b57be70fc9e60dae581148e0e`。
- 与上游的共同基础：`dab829a4e9b7d1cc307189aea8b0319eb29e29d0`，本次合入 227 个上游提交。
- 保留 LargeChestnut 品牌、首页、浅色和深色主题、登录页及桌面登录交接接口。
- 合并前已有的 5 个未提交文件独立保留，未纳入本次合并暂存区。

合并前补丁和文件备份位于项目旁的
`../output/sub2api-merge-v0.2.23-20261119/`。

## 本地验证

- Go 1.27.4：`go test -p 4 -tags=unit ./...` 通过，包括模型兼容、计费、登录、路由和迁移文件测试。
- 前端关键测试及 LargeChestnut 登录和页面标题测试：33 个文件、614 项测试全部通过。
- 前端 TypeScript 检查、生产构建和 ESLint 检查通过。
- Linux amd64 后端已完成包含前端资源的 `embed` 构建，未运行该二进制或发布镜像。
- 部署脚本的 Shell 语法检查、Compose 安全配置、Gateway 环境变量和运行资源静态检查通过。
- 原有 5 个未提交文件的 SHA-256 与合并前一致。

本地未安装 Docker，依赖 Docker 的 Compose 配置测试及真实数据库迁移演练尚未执行，留到获准上线前的发布验证阶段。生产数据库未连接到本次构建产物。

测试日志和 Linux 构建产物位于同一个 `../output/sub2api-merge-v0.2.23-20261119/` 目录。构建产物 `sub2api-linux-amd64` 的 SHA-256：

```text
1894e3e4158b02b10d3f6dc6dc75c8cf2df0c8c108e74abc57aad435867b0e65
```

## 版本号与发布参数

发布版本使用 `0.2.23-largechestnut`。原部署脚本和 Compose 文件仍保留其原有未提交内容，因此发布时必须显式设置 `CANDIDATE_VERSION`，避免沿用旧的默认版本号。

以下命令仅供收到上线通知后执行；本次准备没有执行：

```sh
cd /www/dk_project/largechestnut-sub2api/deploy
CANDIDATE_VERSION=0.2.23-largechestnut \
CANDIDATE_TAG="largechestnut-0.2.23-$(date +%Y%m%d-%H%M%S)" \
SKIP_DB_BACKUP=0 \
SOURCE_DATA_DIR=/www/dk_project/sub2api/data \
./candidate-up.sh
```

执行前先完成本地代码审阅、提交、推送，以及服务器源码同步。发布时还需保留现有 `.env`、持久化配置、JWT 密钥及加密密钥，避免登录态或渠道监控密钥失效。

## 数据库变更

本次包含 5 个新增 SQL 迁移，应用启动时自动执行：

1. `249_add_usage_logs_api_key_cost_index_notx.sql`。
2. `250_openai_cache_write_ttl.sql`。
3. `251_group_force_openai_ultrafast.sql`。
4. `251_group_usage_rollup_nonblocking_build.sql`。
5. `252_channel_pricing_ultrafast_multiplier.sql`。

两个 `251_` 文件名称不同。项目按完整文件名记录迁移，无须重命名编号。

发布前必须完成数据库备份，并核对生产已应用迁移的文件名和校验和。本次不能使用旧文档中“没有数据库迁移”的判断，也不能设置 `SKIP_DB_BACKUP=1`。用量表建索引可能延长首次启动时间，应结合迁移日志判断进度。

新旧容器共享数据库，新容器启动即可能修改共享库。切换 Caddy 只能回退流量，不能撤销数据库迁移。上线前应在备份恢复出的独立测试库完成迁移及旧版本兼容性验证。

## 上线验证

- 健康检查、邮箱登录、2FA、桌面登录交接及登录态恢复。
- 首页、侧栏、登录页、浅色和深色主题仍显示 LargeChestnut。
- `gpt-plus`、`gpt-pro` 的 `gpt-6-luna` 请求仍按渠道配置映射，并核对实际模型、Token、缓存用量、单价和倍率。
- 用户余额、消费记录、充值订单和付款入口。
- 渠道监控持续产生新的采样记录，保留原有加密配置。
- 使用小额请求核对新增缓存写入 TTL 计费；按需验证 Fast 和 Ultra Fast 档位。

旧 `sub2api`、PostgreSQL、Redis 和 Caddy 配置均不在本次本地代码准备的修改范围内。
