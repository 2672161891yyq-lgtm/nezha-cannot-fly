# 《哪吒不会飞》

一款以哪吒和陈塘关为主题、采用单指点击操作的竖屏微信小游戏。第一版聚焦于跑通完整、稳定、可反复游玩的核心循环。

## 第一版一句话定义

玩家点击屏幕控制踩着风火轮的哪吒上升，松手后下坠，在陈塘关上空穿过由天空与地面障碍组成的安全通道，挑战更高分数。

## 项目基线

- 平台：微信小游戏
- 引擎：Cocos Creator 3.8.8
- 语言：TypeScript
- 屏幕：竖屏，设计分辨率 750 × 1334
- 美术：东方神话 × 温暖手绘动画电影感 × 轻喜剧冒险
- 第一版目标：核心玩法完整、运行稳定、规则公平、可以提交体验版

## 文档导航

1. [游戏设计文档 GDD](docs/01-GDD-V1.md)
2. [技术设计文档 TDD](docs/02-TECHNICAL-DESIGN-V1.md)
3. [美术与音频规范](docs/03-ART-AUDIO-GUIDE-V1.md)
4. [数值与障碍生成规则](docs/04-BALANCE-CONFIG-V1.md)
5. [开发计划与验收标准](docs/05-MVP-PLAN-ACCEPTANCE-V1.md)
6. [工程基线与命名规范](docs/06-PROJECT-BASELINE.md)
7. [阶段 1：核心玩法灰盒验收](docs/07-STAGE-1-GRAYBOX.md)
8. [阶段 2：障碍系统验收](docs/08-STAGE-2-OBSTACLE-SYSTEM.md)
9. [阶段 3：动态障碍验收](docs/09-STAGE-3-DYNAMIC-OBSTACLES.md)
10. [阶段 4：正式素材接入验收](docs/10-STAGE-4-FORMAL-ART.md)

## V1 视觉素材

- [运行时素材清单](assets/resources/art/ASSET_MANIFEST.md)
- [首页美术预览](docs/previews/v1_home_art_preview.png)
- [游戏画面预览](docs/previews/v1_gameplay_art_preview.png)
- [哪吒动作循环 GIF](docs/previews/nezha_animation_preview.gif)
- [图像生成规格记录](art-source/generated/PROMPTS.md)

游戏运行时只引用 `assets/resources/art/`；未切分的高清生成母图保存在 `art-source/generated/`，用于重新切图和后续迭代。

## V1 范围

包含：开始、待机、游戏、暂停、结算、重新开始；哪吒飞行；六类障碍；随机合法组合；计分；本地最高分；基础音效；基础适配。

不包含：登录、云排行榜、广告、付费、复活、皮肤、任务、成就、关卡地图、剧情、社交分享，以及会追踪、射击或随机变轨的复杂移动障碍。

## 核心原则

1. 随机生成只能制造变化，不能制造无解局面。
2. 视觉碰撞范围必须可预期，判定应略宽容于画面。
3. 动态障碍使用可复现的固定时间轴：火球视觉与圆形碰撞同步小幅浮动；雷电先预警后生效；八卦阵仅旋转视觉，圆形碰撞保持固定。
4. 哪吒采用原创造型，不照搬任何影视、动画或游戏版本。
5. 每次修改玩法参数后，都必须完成真机手感测试。
