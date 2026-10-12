# 《哪吒不会飞》工程基线

- 基线版本：V1.0
- Cocos Creator：3.8.8
- Cocos Dashboard：2.2.2
- 微信开发者工具：2.02.2608070
- 内部项目名：`nezha-cannot-fly`
- 游戏展示名：`哪吒不会飞`
- 目标平台：`wechatgame`
- 设计分辨率：750 × 1334
- 屏幕方向：竖屏
- 开发语言：TypeScript

## 项目根目录

当前工作区根目录即 Cocos Creator 项目根目录，不再创建重复嵌套目录。

## 目录职责

```text
assets/
  art/                    正式运行时美术
  audio/
    music/                背景音乐
    sfx/                  操作与环境音效
  data/                   JSON 配置
  prefabs/
    effects/              特效预制体
    obstacles/            障碍预制体
    player/               玩家预制体
    ui/                   UI 预制体
  scenes/                 Cocos 场景
  scripts/
    core/                 状态、常量与基础流程
    gameplay/             玩家、障碍、计分等玩法
    platform/             微信与编辑器适配
    services/             存档、音频等服务
    ui/                   UI 控制逻辑
    utils/                无业务依赖的工具
art-source/               高清生成母图，不进入游戏运行包
docs/                     产品、技术、美术与验收文档
tools/                    素材处理和项目辅助工具
```

## 命名规范

- 文件夹、图片和 JSON：小写英文与下划线，例如 `obstacle_fireball.png`。
- TypeScript 文件、类和枚举：PascalCase，例如 `GameState.ts`。
- TypeScript 变量和方法：camelCase。
- 常量：UPPER_SNAKE_CASE。
- 场景：PascalCase，例如 `Boot.scene`、`MainGame.scene`。
- 预制体：PascalCase，例如 `Player.prefab`、`ObstaclePair.prefab`。
- Cocos 节点：PascalCase，功能层可使用 `BackgroundLayer`、`GameplayLayer`、`UILayer`。

## 基础场景

`assets/scenes/Boot.scene` 使用官方 2D 场景模板建立，Canvas 基准尺寸为 750 × 1334。阶段 0 只验证工程、场景和构建链路，不包含核心玩法。

## 构建约定

- 默认构建目录：`build/`
- 微信测试 AppID：Cocos 默认测试 AppID，仅用于工程基线验证。
- 正式 AppID：在提交体验版前由项目所有者提供并替换。
- 构建产物、临时库和日志不提交版本控制。

## 阶段 0 完成条件

- Cocos Creator 3.8.8 能识别并导入工程。
- TypeScript 脚本无编译错误。
- `Boot.scene` 可作为首场景构建。
- 微信小游戏构建输出包含 `game.json` 与 `project.config.json`。
- 构建产物配置为竖屏。

## 阶段 0 验收记录

- 验收日期：2026-10-09
- 验收状态：通过
- Cocos 构建目标：`wechatgame`
- 启动场景：`db://assets/scenes/Boot.scene`
- 构建设计分辨率：750 × 1334
- 构建屏幕方向：`portrait`
- 构建输出：`build/wechatgame-baseline/`
- 已生成：`game.json`、`project.config.json`、`application.js` 和游戏资源包
- 构建日志结果：`build Task (wechatgame-baseline) Finished`
- 微信开发者工具状态：已安装并可使用；当前“服务端口”安全开关关闭，因此未通过 CLI 自动打开工程。可在工具中手动导入 `build/wechatgame-baseline/`，或由项目所有者在“设置 → 安全设置”中开启服务端口后再启用自动化。

阶段 0 到此冻结。阶段 1 已在此基线上实现并通过验收，记录见 `07-STAGE-1-GRAYBOX.md`。
