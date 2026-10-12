export interface RectangleBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const circleIntersectsRectangle = (
  centerX: number,
  centerY: number,
  radius: number,
  rectangle: RectangleBounds,
): boolean => {
  const closestX = clamp(centerX, rectangle.minX, rectangle.maxX);
  const closestY = clamp(centerY, rectangle.minY, rectangle.maxY);
  const offsetX = centerX - closestX;
  const offsetY = centerY - closestY;
  return offsetX * offsetX + offsetY * offsetY <= radius * radius;
};

export const circlesIntersect = (
  firstCenterX: number,
  firstCenterY: number,
  firstRadius: number,
  secondCenterX: number,
  secondCenterY: number,
  secondRadius: number,
): boolean => {
  const offsetX = firstCenterX - secondCenterX;
  const offsetY = firstCenterY - secondCenterY;
  const combinedRadius = firstRadius + secondRadius;
  return offsetX * offsetX + offsetY * offsetY <= combinedRadius * combinedRadius;
};
