import { circlesIntersect } from '../../assets/scripts/gameplay/CollisionMath';
import { DynamicObstacleMotion } from '../../assets/scripts/gameplay/DynamicObstacleMotion';
import {
  getLegalGapCenterRange,
  ObstacleGenerator,
} from '../../assets/scripts/gameplay/ObstacleGenerator';
import { OBSTACLE_SYSTEM_CONFIG } from '../../assets/scripts/gameplay/ObstacleSystemConfig';
import {
  getPlayerFlightVisualState,
  WindFireWheelMotion,
} from '../../assets/scripts/gameplay/PlayerVisualDynamics';

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const nearlyEqual = (actual: number, expected: number, tolerance = 0.001): boolean =>
  Math.abs(actual - expected) <= tolerance;

const lightning = new DynamicObstacleMotion();
lightning.reset(0);
assert(lightning.snapshot.lightningPhase === 'warning', 'Lightning must begin with warning.');
assert(
  !lightning.snapshot.lightningCollisionActive,
  'Lightning warning must not deal collision damage.',
);
lightning.step(OBSTACLE_SYSTEM_CONFIG.lightningWarningDuration - 0.01);
assert(lightning.snapshot.lightningPhase === 'warning', 'Warning duration ended early.');
lightning.step(0.02);
assert(lightning.snapshot.lightningPhase === 'active', 'Lightning did not become active.');
assert(
  lightning.snapshot.lightningCollisionActive,
  'Active lightning must enable its collision.',
);
lightning.step(OBSTACLE_SYSTEM_CONFIG.lightningActiveDuration);
assert(lightning.snapshot.lightningPhase === 'cooldown', 'Lightning cooldown did not begin.');
assert(
  !lightning.snapshot.lightningCollisionActive,
  'Lightning cooldown must disable collision damage.',
);
lightning.step(OBSTACLE_SYSTEM_CONFIG.lightningCooldownDuration);
assert(
  lightning.snapshot.lightningPhase === 'warning',
  'Every lightning cycle must return to warning before becoming active again.',
);

const fireball = new DynamicObstacleMotion();
fireball.reset(0);
assert(nearlyEqual(fireball.snapshot.fireballOffsetY, 0), 'Fireball must start centered.');
fireball.step(OBSTACLE_SYSTEM_CONFIG.fireballFloatPeriod / 4);
assert(
  nearlyEqual(
    fireball.snapshot.fireballOffsetY,
    OBSTACLE_SYSTEM_CONFIG.fireballFloatAmplitude,
  ),
  'Fireball quarter-cycle must reach its maximum height.',
);
const firstFireballSnapshot = fireball.snapshot;
fireball.reset(0);
fireball.step(OBSTACLE_SYSTEM_CONFIG.fireballFloatPeriod / 4);
assert(
  nearlyEqual(fireball.snapshot.fireballOffsetY, firstFireballSnapshot.fireballOffsetY),
  'Fireball motion must reproduce after pool reset.',
);

const noDecorativeConfig = {
  ...OBSTACLE_SYSTEM_CONFIG,
  decorativeAnimationEnabled: false,
};
const noDecorativeMotion = new DynamicObstacleMotion(noDecorativeConfig);
noDecorativeMotion.reset(0);
noDecorativeMotion.step(OBSTACLE_SYSTEM_CONFIG.fireballFloatPeriod / 4);
assert(
  nearlyEqual(
    noDecorativeMotion.snapshot.fireballOffsetY,
    fireball.snapshot.fireballOffsetY,
  ),
  'Disabling decorative animation must not change fireball collision motion.',
);
assert(
  noDecorativeMotion.snapshot.fireballRotationDegrees === 0 &&
    noDecorativeMotion.snapshot.baguaOuterRotationDegrees === 0 &&
    noDecorativeMotion.snapshot.baguaInnerRotationDegrees === 0,
  'Decorative animation switch must freeze visual-only rotations.',
);

const bagua = new DynamicObstacleMotion();
bagua.reset(0);
bagua.step(1);
assert(
  bagua.snapshot.baguaOuterRotationDegrees > 0 &&
    bagua.snapshot.baguaInnerRotationDegrees > bagua.snapshot.baguaOuterRotationDegrees,
  'Bagua rings must rotate in opposite directions after degree wrapping.',
);

const wheels = new WindFireWheelMotion();
wheels.reset();
wheels.step(1 / 60, getPlayerFlightVisualState(0, true));
const idleWheels = wheels.snapshot;
wheels.step(1 / 60, getPlayerFlightVisualState(620, false));
const risingWheels = wheels.snapshot;
wheels.step(1 / 60, getPlayerFlightVisualState(-500, false));
const fallingWheels = wheels.snapshot;
assert(risingWheels.rotationSpeed > idleWheels.rotationSpeed, 'Rising wheels must accelerate.');
assert(risingWheels.flameScale > idleWheels.flameScale, 'Rising flame must grow brighter.');
assert(fallingWheels.rotationSpeed < idleWheels.rotationSpeed, 'Falling wheels must slow down.');
assert(fallingWheels.flameScale < idleWheels.flameScale, 'Falling flame must weaken.');
assert(
  risingWheels.leftRotationDegrees !== risingWheels.rightRotationDegrees,
  'Left and right wheels must retain a phase difference.',
);

assert(circlesIntersect(0, 0, 10, 19, 0, 10), 'Touching circular colliders must collide.');
assert(!circlesIntersect(0, 0, 10, 21, 0, 10), 'Separated circles must not collide.');

const generator = new ObstacleGenerator();
let dynamicGroups = 0;
for (let index = 0; index < 10_000; index += 1) {
  const spec = generator.generate(Math.floor(index / 25));
  const range = getLegalGapCenterRange(spec.difficulty);
  const halfGap = spec.gapHeight / 2;
  const playableBottom =
    -OBSTACLE_SYSTEM_CONFIG.designHeight / 2 +
    OBSTACLE_SYSTEM_CONFIG.bottomSafeArea;
  const playableTop =
    OBSTACLE_SYSTEM_CONFIG.designHeight / 2 - OBSTACLE_SYSTEM_CONFIG.topSafeArea;
  const requiredMargin =
    OBSTACLE_SYSTEM_CONFIG.gapSafetyMargin +
    OBSTACLE_SYSTEM_CONFIG.maximumDynamicVerticalTravel;

  assert(
    spec.gapCenterY >= range.minimum - 0.0001 &&
      spec.gapCenterY <= range.maximum + 0.0001,
    `Dynamic-safe gap range failed at obstacle ${index}.`,
  );
  assert(
    spec.gapCenterY - halfGap >= playableBottom + requiredMargin - 0.0001,
    `Bottom dynamic travel margin failed at obstacle ${index}.`,
  );
  assert(
    spec.gapCenterY + halfGap <= playableTop - requiredMargin + 0.0001,
    `Top dynamic travel margin failed at obstacle ${index}.`,
  );

  if (spec.bottomType === 'fireball') {
    const gapBottom = spec.gapCenterY - halfGap;
    const baseCenterY =
      gapBottom -
      OBSTACLE_SYSTEM_CONFIG.gapSafetyMargin -
      OBSTACLE_SYSTEM_CONFIG.fireballFloatAmplitude -
      OBSTACLE_SYSTEM_CONFIG.fireballRadius;
    const highestCollisionEdge =
      baseCenterY +
      OBSTACLE_SYSTEM_CONFIG.fireballFloatAmplitude +
      OBSTACLE_SYSTEM_CONFIG.fireballRadius;
    assert(
      highestCollisionEdge <=
        gapBottom - OBSTACLE_SYSTEM_CONFIG.gapSafetyMargin + 0.0001,
      `Fireball movement invaded the safe gap at obstacle ${index}.`,
    );
    dynamicGroups += 1;
  }

  if (spec.topType === 'bagua-array' || spec.topType === 'lightning') {
    dynamicGroups += 1;
  }
}

assert(dynamicGroups > 0, 'The acceptance sequence must contain dynamic obstacles.');

console.log(
  JSON.stringify({
    result: 'PASS',
    generated: 10_000,
    dynamicGroups,
    lightningWarningSeconds: OBSTACLE_SYSTEM_CONFIG.lightningWarningDuration,
    fireballAmplitude: OBSTACLE_SYSTEM_CONFIG.fireballFloatAmplitude,
    baguaCollider: 'fixed-circle',
    wheelStates: 4,
  }),
);
