# Rainny 仓库分支管理说明

> 最后更新：2026-07-31

## 远程仓库

| Remote | 仓库 | 用途 |
|--------|------|------|
| `origin` | `git@github.com:xiay8874-source/Rainny.git` | 你自己的 fork，日常开发和推送 |
| `upstream` | `https://github.com/anomalyco/opencode.git` | 官方原始仓库，用于同步上游更新 |

## 分支

| 分支 | 说明 |
|------|------|
| `rainny-branding` | **唯一的开发主分支**（也是 GitHub 默认分支）。包含 Rainny 品牌化 + opencode→rainny 重命名的全部改动 |

> `dev` 分支已于 2026-07-31 删除，其内容已全部合并到 `rainny-branding`。

## 同步官方更新

当官方 `anomalyco/opencode` 有新提交时，同步到你的 fork：

```bash
git fetch upstream
git merge upstream/dev
# 解决冲突（如有），然后推送
git push origin rainny-branding
```

## 项目历史

1. Fork 自 `anomalyco/opencode`
2. 在 `rainny-branding` 分支上做了 Rainny 品牌化（桌面分发、发布 1.18.11）
3. 在 `dev` 分支上做了 opencode → rainny 的全面重命名
4. 2026-07-31：将 `dev` 合并到 `rainny-branding`，删除 `dev`，设置 `rainny-branding` 为唯一主分支
