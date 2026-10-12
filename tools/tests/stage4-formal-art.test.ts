import {
  BOTTOM_OBSTACLE_ART,
  FORMAL_ART_ASSET_KEYS,
  FORMAL_ART_RESOURCE_PATHS,
  FORMAL_BACKGROUND_LAYERS,
  FORMAL_PRESENTATION,
  FORMAL_TOP_ART_OVERSCAN,
  getBottomObstacleFillLayout,
  getNezhaArtKey,
  getTopObstacleFillLayout,
  getWheelArtKey,
  TOP_OBSTACLE_ART,
} from '../../assets/scripts/gameplay/FormalArtConfig';

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(FORMAL_ART_ASSET_KEYS.length === 28, 'Stage 4 must load all 28 runtime art assets.');
assert(
  FORMAL_ART_RESOURCE_PATHS.uiButtonPrimary.includes('ui_button_primary'),
  'Start and retry must share the existing primary-button artwork.',
);
assert(
  FORMAL_PRESENTATION.backgroundWash.a > 0 &&
    FORMAL_PRESENTATION.backgroundWash.a < 64,
  'The scenery wash must soften rather than obscure the hand-painted background.',
);
assert(
  FORMAL_PRESENTATION.scoreFontSize <= FORMAL_PRESENTATION.scorePlateHeight * 0.45,
  'Score text must fit the painted parchment region, not the entire sprite.',
);
assert(
  FORMAL_PRESENTATION.leavesOpacity < 160,
  'Decorative leaves must remain less prominent than gameplay objects.',
);
assert(
  new Set(FORMAL_ART_ASSET_KEYS).size === FORMAL_ART_ASSET_KEYS.length,
  'Formal art asset keys must be unique.',
);
assert(
  new Set(FORMAL_ART_ASSET_KEYS.map((key) => FORMAL_ART_RESOURCE_PATHS[key])).size ===
    FORMAL_ART_ASSET_KEYS.length,
  'Formal art resource paths must be unique.',
);
for (const key of FORMAL_ART_ASSET_KEYS) {
  assert(
    FORMAL_ART_RESOURCE_PATHS[key].startsWith('art/'),
    `Asset ${key} must load from the Cocos resources art directory.`,
  );
  assert(
    FORMAL_ART_RESOURCE_PATHS[key].endsWith('/spriteFrame'),
    `Asset ${key} must address a sprite frame sub-asset.`,
  );
}

assert(FORMAL_BACKGROUND_LAYERS.length === 5, 'Chentang Pass requires five layers.');
assert(
  FORMAL_BACKGROUND_LAYERS[0].swayAmplitude === 0,
  'The opaque sky layer must remain fixed.',
);
for (let index = 1; index < FORMAL_BACKGROUND_LAYERS.length; index += 1) {
  assert(
    FORMAL_BACKGROUND_LAYERS[index].swayAmplitude >
      FORMAL_BACKGROUND_LAYERS[index - 1].swayAmplitude,
    'Nearer background layers must have stronger parallax.',
  );
}

assert(Object.keys(TOP_OBSTACLE_ART).length === 3, 'All top obstacles need formal art.');
assert(
  Object.keys(BOTTOM_OBSTACLE_ART).length === 3,
  'All bottom obstacles need formal art.',
);
assert(getNezhaArtKey('idle', false) === 'nezhaIdle', 'Idle pose mapping failed.');
assert(getNezhaArtKey('rising', false) === 'nezhaBoost', 'Boost pose mapping failed.');
assert(getNezhaArtKey('falling', false) === 'nezhaFall', 'Fall pose mapping failed.');
assert(getNezhaArtKey('cruising', true) === 'nezhaHit', 'Hit pose mapping failed.');
assert(
  FORMAL_ART_RESOURCE_PATHS.nezhaResult.includes('nezha_result'),
  'Result pose must be included for the post-hit state.',
);
assert(getWheelArtKey('rising') === 'wheelBoost', 'Boost wheel mapping failed.');
assert(getWheelArtKey('falling') === 'wheelWeak', 'Weak wheel mapping failed.');
assert(getWheelArtKey('idle') === 'wheelNormal', 'Normal wheel mapping failed.');

const designHeight = 1334;
const gapTop = 205;
const gapBottom = -205;
const topLayout = getTopObstacleFillLayout(
  designHeight,
  gapTop,
  FORMAL_TOP_ART_OVERSCAN,
);
const bottomLayout = getBottomObstacleFillLayout(designHeight, gapBottom);
assert(
  topLayout.centerY + topLayout.height / 2 ===
    designHeight / 2 + FORMAL_TOP_ART_OVERSCAN,
  'Upper obstacle art must overscan the top of the design canvas.',
);
assert(
  topLayout.centerY - topLayout.height / 2 === gapTop,
  'Upper obstacle art must stop exactly at the upper passage edge.',
);
assert(
  bottomLayout.centerY - bottomLayout.height / 2 === -designHeight / 2,
  'Lower obstacle art must touch the bottom of the design canvas.',
);
assert(
  bottomLayout.centerY + bottomLayout.height / 2 === gapBottom,
  'Lower obstacle art must stop exactly at the lower passage edge.',
);
assert(
  (gapTop + gapBottom) / 2 === 0,
  'The opening passage edges must be symmetric around the first center line.',
);

console.log(
  JSON.stringify({
    result: 'PASS',
    runtimeAssets: FORMAL_ART_ASSET_KEYS.length,
    backgroundLayers: FORMAL_BACKGROUND_LAYERS.length,
    obstacleSprites: Object.keys(TOP_OBSTACLE_ART).length + Object.keys(BOTTOM_OBSTACLE_ART).length,
    nezhaStates: 5,
    wheelStates: 3,
  }),
);
