import type { BottomObstacleType, TopObstacleType } from './ObstacleSystemConfig';
import type { PlayerFlightVisualState } from './PlayerVisualDynamics';

export const FORMAL_ART_ASSET_KEYS = [
  'backgroundSky',
  'backgroundClouds',
  'backgroundLandscape',
  'backgroundChentangPass',
  'backgroundForeground',
  'nezhaIdle',
  'nezhaBoost',
  'nezhaFall',
  'nezhaHit',
  'nezhaResult',
  'wheelNormal',
  'wheelBoost',
  'wheelWeak',
  'obstacleMountain',
  'obstacleStonePillar',
  'obstacleFireball',
  'obstacleStormCloud',
  'obstacleLightning',
  'obstacleBagua',
  'effectScoreSparkle',
  'effectCollisionPuff',
  'effectFireSparks',
  'effectDriftingLeaves',
  'uiScorePlaque',
  'uiButtonPrimary',
  'uiResultPanel',
  'uiDividerCloud',
  'titleLogo',
] as const;

export type FormalArtAssetKey = (typeof FORMAL_ART_ASSET_KEYS)[number];

// The sky-obstacle PNGs contain a small transparent painting margin. Extending
// their bounds past the camera edge guarantees that visible pixels, not only
// the Sprite rectangle, meet the top edge on tall phones.
export const FORMAL_TOP_ART_OVERSCAN = 72;

export interface VerticalFillLayout {
  readonly height: number;
  readonly centerY: number;
  readonly screenEdgeY: number;
  readonly gapEdgeY: number;
}

/**
 * Fits an upper obstacle exactly between the top of the design canvas and the
 * upper edge of the safe passage. Keeping this calculation outside the scene
 * code makes the visual edge and the collision edge share one source of truth.
 */
export const getTopObstacleFillLayout = (
  designHeight: number,
  gapTop: number,
  topOverscan = 0,
): VerticalFillLayout => {
  const screenEdgeY = designHeight / 2;
  const height = Math.max(0, screenEdgeY - gapTop + topOverscan);
  return {
    height,
    centerY: gapTop + height / 2,
    screenEdgeY,
    gapEdgeY: gapTop,
  };
};

export const getBottomObstacleFillLayout = (
  designHeight: number,
  gapBottom: number,
): VerticalFillLayout => {
  const screenEdgeY = -designHeight / 2;
  const height = Math.max(0, gapBottom - screenEdgeY);
  return {
    height,
    centerY: screenEdgeY + height / 2,
    screenEdgeY,
    gapEdgeY: gapBottom,
  };
};

export const FORMAL_ART_RESOURCE_PATHS: Readonly<
  Record<FormalArtAssetKey, string>
> = Object.freeze({
  backgroundSky: 'art/backgrounds/day/bg_00_sky/spriteFrame',
  backgroundClouds: 'art/backgrounds/day/bg_01_clouds/spriteFrame',
  backgroundLandscape: 'art/backgrounds/day/bg_02_landscape/spriteFrame',
  backgroundChentangPass:
    'art/backgrounds/day/bg_03_chentang_pass/spriteFrame',
  backgroundForeground: 'art/backgrounds/day/bg_04_foreground/spriteFrame',
  nezhaIdle: 'art/characters/nezha/nezha_idle/spriteFrame',
  nezhaBoost: 'art/characters/nezha/nezha_boost/spriteFrame',
  nezhaFall: 'art/characters/nezha/nezha_fall/spriteFrame',
  nezhaHit: 'art/characters/nezha/nezha_hit/spriteFrame',
  nezhaResult: 'art/characters/nezha/nezha_result/spriteFrame',
  wheelNormal: 'art/characters/nezha/wind_fire_wheel_normal/spriteFrame',
  wheelBoost: 'art/characters/nezha/wind_fire_wheel_boost/spriteFrame',
  wheelWeak: 'art/characters/nezha/wind_fire_wheel_weak/spriteFrame',
  obstacleMountain: 'art/obstacles/ground/obstacle_mountain/spriteFrame',
  obstacleStonePillar:
    'art/obstacles/ground/obstacle_stone_pillar/spriteFrame',
  obstacleFireball: 'art/obstacles/ground/obstacle_fireball/spriteFrame',
  obstacleStormCloud: 'art/obstacles/sky/obstacle_storm_cloud/spriteFrame',
  obstacleLightning: 'art/obstacles/sky/obstacle_lightning/spriteFrame',
  obstacleBagua: 'art/obstacles/sky/obstacle_bagua/spriteFrame',
  effectScoreSparkle: 'art/effects/fx_score_sparkle/spriteFrame',
  effectCollisionPuff: 'art/effects/fx_collision_puff/spriteFrame',
  effectFireSparks: 'art/effects/fx_fire_sparks/spriteFrame',
  effectDriftingLeaves: 'art/effects/fx_drifting_leaves/spriteFrame',
  uiScorePlaque: 'art/ui/common/ui_score_plaque/spriteFrame',
  uiButtonPrimary: 'art/ui/common/ui_button_primary/spriteFrame',
  uiResultPanel: 'art/ui/common/ui_panel_result/spriteFrame',
  uiDividerCloud: 'art/ui/common/ui_divider_cloud/spriteFrame',
  titleLogo: 'art/branding/title_nezha_cannot_fly/spriteFrame',
});

// Only the scenery is softened. Collision art and the player retain their
// original contrast; the wash must stay behind the entire gameplay layer.
export const FORMAL_PRESENTATION = Object.freeze({
  backgroundWash: Object.freeze({ r: 243, g: 245, b: 230, a: 48 }),
  modalScrim: Object.freeze({ r: 28, g: 55, b: 62, a: 135 }),
  ink: Object.freeze({ r: 73, g: 52, b: 41, a: 255 }),
  mutedInk: Object.freeze({ r: 92, g: 84, b: 65, a: 255 }),
  skyInk: Object.freeze({ r: 48, g: 88, b: 94, a: 255 }),
  accent: Object.freeze({ r: 171, g: 62, b: 42, a: 255 }),
  scoreFontSize: 42,
  scorePlateWidth: 220,
  scorePlateHeight: 105,
  actionWidth: 390,
  actionHeight: 175,
  leavesOpacity: 130,
});

export interface FormalBackgroundLayerConfig {
  readonly key: FormalArtAssetKey;
  readonly name: string;
  readonly swayAmplitude: number;
  readonly swaySpeed: number;
  readonly scale: number;
}

export const FORMAL_BACKGROUND_LAYERS: readonly FormalBackgroundLayerConfig[] =
  Object.freeze([
    Object.freeze({
      key: 'backgroundSky' as const,
      name: 'SkyLayer',
      swayAmplitude: 0,
      swaySpeed: 0,
      scale: 1,
    }),
    Object.freeze({
      key: 'backgroundClouds' as const,
      name: 'CloudLayer',
      swayAmplitude: 7,
      swaySpeed: 0.18,
      scale: 1.03,
    }),
    Object.freeze({
      key: 'backgroundLandscape' as const,
      name: 'LandscapeLayer',
      swayAmplitude: 11,
      swaySpeed: 0.25,
      scale: 1.04,
    }),
    Object.freeze({
      key: 'backgroundChentangPass' as const,
      name: 'ChentangPassLayer',
      swayAmplitude: 17,
      swaySpeed: 0.34,
      scale: 1.055,
    }),
    Object.freeze({
      key: 'backgroundForeground' as const,
      name: 'ForegroundLayer',
      swayAmplitude: 24,
      swaySpeed: 0.46,
      scale: 1.075,
    }),
  ]);

export const TOP_OBSTACLE_ART: Readonly<
  Record<TopObstacleType, FormalArtAssetKey>
> = Object.freeze({
  'dark-cloud': 'obstacleStormCloud',
  lightning: 'obstacleLightning',
  'bagua-array': 'obstacleBagua',
});

export const BOTTOM_OBSTACLE_ART: Readonly<
  Record<BottomObstacleType, FormalArtAssetKey>
> = Object.freeze({
  mountain: 'obstacleMountain',
  'stone-pillar': 'obstacleStonePillar',
  fireball: 'obstacleFireball',
});

export const getNezhaArtKey = (
  state: PlayerFlightVisualState,
  isGameOver: boolean,
): FormalArtAssetKey => {
  if (isGameOver) {
    return 'nezhaHit';
  }
  if (state === 'rising') {
    return 'nezhaBoost';
  }
  if (state === 'falling') {
    return 'nezhaFall';
  }
  return 'nezhaIdle';
};

export const getWheelArtKey = (
  state: PlayerFlightVisualState,
): FormalArtAssetKey => {
  if (state === 'rising') {
    return 'wheelBoost';
  }
  if (state === 'falling') {
    return 'wheelWeak';
  }
  return 'wheelNormal';
};
