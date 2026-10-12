# V1 运行时美术素材清单

运行时根目录为 `assets/resources/art/`，素材使用小写英文、下划线命名。生成母图保存在 `art-source/generated/`，不要直接在 Cocos 场景中引用母图。

## 角色

路径：`characters/nezha/`

- `nezha_idle.png`：待机悬浮。
- `nezha_boost.png`：点击上升。
- `nezha_fall.png`：自然下坠。
- `nezha_hit.png`：受击。
- `nezha_result.png`：结算失败。
- `nezha_reference.png`：造型参考，不进入正式场景。
- `wind_fire_wheel_normal.png`：正常状态风火轮。
- `wind_fire_wheel_boost.png`：加速状态风火轮。
- `wind_fire_wheel_weak.png`：弱火状态风火轮。

建议在 Cocos 中将人物和两只风火轮拆成三个节点。左右风火轮复用同一张图片，通过角度、缩放和旋转速度制造差异。

## 地面障碍

路径：`obstacles/ground/`

- `obstacle_mountain.png`
- `obstacle_stone_pillar.png`
- `obstacle_fireball.png`

## 天空障碍

路径：`obstacles/sky/`

- `obstacle_storm_cloud.png`
- `obstacle_lightning.png`
- `obstacle_bagua.png`

动态障碍遵循阶段 3 规则：火球视觉与圆形碰撞同步小幅浮动；雷电先预警再短暂生效；八卦阵只旋转视觉并保持固定圆形碰撞。

## 白天背景

路径：`backgrounds/day/`

- `bg_00_sky.png`：不透明天空底图。
- `bg_01_clouds.png`：远云透明层。
- `bg_02_landscape.png`：远山与海面透明层。
- `bg_03_chentang_pass.png`：陈塘关建筑透明层。
- `bg_04_foreground.png`：屋檐、山石和树叶前景透明层。

五层均为 750 × 1334。节点顺序与编号一致；视差速度参考美术规范文档。

## UI

路径：`ui/common/`

- `ui_button_primary.png`：主按钮底板，文字由 Label 绘制。
- `ui_panel_result.png`：结算面板。
- `ui_button_round.png`：暂停、声音等圆形按钮底板。
- `ui_score_plaque.png`：分数或提示底板。
- `ui_badge_new_record.png`：新纪录徽章底板。
- `ui_divider_cloud.png`：云纹分隔装饰。
- `icons/icon_pause.svg`
- `icons/icon_sound_on.svg`
- `icons/icon_sound_off.svg`
- `icons/icon_restart.svg`
- `icons/icon_home.svg`
- `icons/icon_tap.svg`

## 品牌

路径：`branding/`

- `title_nezha_cannot_fly.png`：标题“哪吒不会飞”。
- `app_icon_1024.png`：1024 × 1024 原始应用图标；提交微信前按平台要求导出各尺寸。

## 特效

路径：`effects/`

- `fx_score_sparkle.png`
- `fx_collision_puff.png`
- `fx_fire_sparks.png`
- `fx_drifting_leaves.png`

## 导入建议

- Sprite 使用 Trim，Packable 按同类资源分图集。
- 角色、障碍和 UI 默认使用透明混合。
- 背景底图不透明；其余四层保持 Alpha。
- 美术边缘不等于碰撞边缘，碰撞体按视觉主体向内收缩约 8%–15%。
- UI 面板若需要自由拉伸，应在 Cocos 中配置九宫格；正式配置前先避开卷轴、金属和云纹装饰边缘。
