import { circleIntersectsRectangle } from '../../assets/scripts/gameplay/CollisionMath';
import { GRAYBOX_CONFIG } from '../../assets/scripts/gameplay/GrayboxConfig';
import { PlayerMotion } from '../../assets/scripts/gameplay/PlayerMotion';

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const nearlyEqual = (actual: number, expected: number, tolerance = 0.001): boolean =>
  Math.abs(actual - expected) <= tolerance;

const motion = new PlayerMotion(GRAYBOX_CONFIG);
motion.reset(0);
assert(motion.y === 0, 'Reset should restore the configured player height.');
assert(motion.velocityY === 0, 'Reset should clear vertical velocity.');

motion.flap();
assert(
  motion.velocityY === GRAYBOX_CONFIG.flapVelocity,
  'A flap must set a fixed upward velocity.',
);

motion.step(1 / 60);
assert(motion.y > 0, 'The player should rise immediately after a flap.');
assert(motion.rotationDegrees > 0, 'The player should tilt upward while rising.');

for (let frame = 0; frame < 240; frame += 1) {
  motion.step(1 / 60);
}
assert(
  nearlyEqual(motion.velocityY, GRAYBOX_CONFIG.maxFallSpeed),
  'Falling velocity must stop at the configured terminal speed.',
);
const observedTerminalVelocity = motion.velocityY;
assert(motion.rotationDegrees < -60, 'The player should visibly tilt down while falling.');

motion.flap();
assert(
  motion.velocityY === GRAYBOX_CONFIG.flapVelocity,
  'Repeated input must reset velocity instead of accumulating an unlimited impulse.',
);

const obstacle = { minX: 100, maxX: 200, minY: -100, maxY: 100 };
assert(
  circleIntersectsRectangle(80, 0, 25, obstacle),
  'A circle touching an obstacle edge should collide.',
);
assert(
  !circleIntersectsRectangle(60, 0, 25, obstacle),
  'A circle separated from the obstacle should not collide.',
);
assert(
  circleIntersectsRectangle(150, 0, 10, obstacle),
  'A circle inside an obstacle should collide.',
);

console.log(
  JSON.stringify({
    result: 'PASS',
    flapVelocity: GRAYBOX_CONFIG.flapVelocity,
    terminalVelocity: observedTerminalVelocity,
    collisionCases: 3,
  }),
);
