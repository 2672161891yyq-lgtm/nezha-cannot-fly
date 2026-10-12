import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  Graphics,
  HorizontalTextAlignment,
  Input,
  input,
  KeyCode,
  Label,
  Layers,
  Node,
  profiler,
  ResolutionPolicy,
  Sprite,
  SpriteFrame,
  UITransform,
  VerticalTextAlignment,
  view,
} from 'cc';
import { GameState } from '../core/GameState';
import {
  circleIntersectsRectangle,
  circlesIntersect,
  RectangleBounds,
} from './CollisionMath';
import { DifficultySnapshot, sampleDifficulty } from './DifficultyCurve';
import {
  DynamicObstacleMotion,
  DynamicObstacleSnapshot,
  LightningPhase,
} from './DynamicObstacleMotion';
import { FixedObjectPool } from './FixedObjectPool';
import {
  BOTTOM_OBSTACLE_ART,
  FORMAL_BACKGROUND_LAYERS,
  FORMAL_PRESENTATION,
  FORMAL_TOP_ART_OVERSCAN,
  getBottomObstacleFillLayout,
  getNezhaArtKey,
  getTopObstacleFillLayout,
  getWheelArtKey,
  TOP_OBSTACLE_ART,
} from './FormalArtConfig';
import { FormalArtAssets, loadFormalArtAssets } from './FormalArtLoader';
import { GRAYBOX_CONFIG } from './GrayboxConfig';
import { ObstacleGenerator, ObstacleSpec } from './ObstacleGenerator';
import { ObstacleScoreGate } from './ObstacleScoreGate';
import {
  BOTTOM_OBSTACLE_NAMES,
  OBSTACLE_SYSTEM_CONFIG,
  TOP_OBSTACLE_NAMES,
} from './ObstacleSystemConfig';
import { PlayerMotion } from './PlayerMotion';
import {
  getPlayerFlightVisualState,
  WindFireWheelMotion,
} from './PlayerVisualDynamics';

const { ccclass } = _decorator;

interface ObstaclePairRuntime {
  readonly node: Node;
  readonly collisionGraphics: Graphics;
  readonly topAttachmentNode: Node;
  readonly topAttachmentSprite: Sprite;
  readonly topVisualNode: Node;
  readonly topVisualGraphics: Graphics;
  readonly topVisualSprite: Sprite;
  readonly topInnerNode: Node;
  readonly topInnerGraphics: Graphics;
  readonly topInnerSprite: Sprite;
  readonly bottomVisualNode: Node;
  readonly bottomVisualGraphics: Graphics;
  readonly bottomVisualSprite: Sprite;
  readonly topLabel: Label;
  readonly bottomLabel: Label;
  readonly scoreGate: ObstacleScoreGate;
  readonly motion: DynamicObstacleMotion;
  lastLightningPhase: LightningPhase | null;
  x: number;
  spec: ObstacleSpec | null;
}

@ccclass('GrayboxGame')
export class GrayboxGame extends Component {
  private readonly config = GRAYBOX_CONFIG;
  private readonly obstacleConfig = OBSTACLE_SYSTEM_CONFIG;
  private readonly playerMotion = new PlayerMotion(this.config);
  private readonly wheelMotion = new WindFireWheelMotion();
  private readonly obstacleGenerator = new ObstacleGenerator(this.obstacleConfig);

  private state = GameState.Boot;
  private playerNode!: Node;
  private playerBodyGraphics!: Graphics;
  private playerBodySprite!: Sprite;
  private leftWheelNode!: Node;
  private rightWheelNode!: Node;
  private leftWheelGraphics!: Graphics;
  private rightWheelGraphics!: Graphics;
  private leftWheelSprite!: Sprite;
  private rightWheelSprite!: Sprite;
  private leftFlameNode!: Node;
  private rightFlameNode!: Node;
  private backgroundFallbackNode!: Node;
  private backgroundWashNode!: Node;
  private readonly backgroundLayerNodes: Node[] = [];
  private readonly backgroundLayerSprites: Sprite[] = [];
  private obstacleLayer!: Node;
  private obstaclePool!: FixedObjectPool<ObstaclePairRuntime>;
  private readonly activeObstaclePairs: ObstaclePairRuntime[] = [];
  private scoreLabel!: Label;
  private promptLabel!: Label;
  private readyHintPanel!: Node;
  private readyHintLabel!: Label;
  private readySubtitleLabel!: Label;
  private debugLabel!: Label;
  private titleLabel!: Label;
  private titleLogoNode!: Node;
  private titleLogoSprite!: Sprite;
  private scorePanelSprite!: Sprite;
  private promptDividerSprite!: Sprite;
  private gameOverPanel!: Node;
  private gameOverBackdrop!: Node;
  private gameOverPanelGraphics!: Graphics;
  private gameOverPanelSprite!: Sprite;
  private gameOverLabel!: Label;
  private resultScoreLabel!: Label;
  private resultScoreCaption!: Label;
  private resultHintLabel!: Label;
  private retryButtonSprite!: Sprite;
  private resultPortraitNode!: Node;
  private resultPortraitSprite!: Sprite;
  private scoreEffectNode!: Node;
  private scoreEffectSprite!: Sprite;
  private collisionEffectNode!: Node;
  private collisionEffectSprite!: Sprite;
  private fireSparksNode!: Node;
  private fireSparksSprite!: Sprite;
  private driftingLeavesNode!: Node;
  private driftingLeavesSprite!: Sprite;

  private formalArtAssets: FormalArtAssets | null = null;
  private artReady = false;
  private scoreEffectTimeRemaining = 0;
  private collisionEffectTimeRemaining = 0;

  private elapsedTime = 0;
  private score = 0;
  private gameOverElapsed = 0;
  private lastPrimaryInputTimeMs = Number.NEGATIVE_INFINITY;
  private currentDifficulty: DifficultySnapshot = sampleDifficulty(0);

  protected override onLoad(): void {
    profiler.hideStats();
    view.setDesignResolutionSize(
      this.config.designWidth,
      this.config.designHeight,
      ResolutionPolicy.FIXED_HEIGHT,
    );
    this.buildGrayboxScene();
    this.resetToReady();
    this.promptLabel.string = '正式素材加载中…';
    void this.loadAndApplyFormalArt();
  }

  protected override onEnable(): void {
    input.on(Input.EventType.TOUCH_START, this.onPrimaryInput, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onPrimaryInput, this);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  protected override onDisable(): void {
    input.off(Input.EventType.TOUCH_START, this.onPrimaryInput, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onPrimaryInput, this);
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  protected override update(deltaTime: number): void {
    const safeDeltaTime = Math.min(deltaTime, 1 / 30);
    this.elapsedTime += safeDeltaTime;
    this.updateBackgroundParallax();
    this.updateFormalVfx(safeDeltaTime);

    if (this.state === GameState.Ready) {
      this.updateReadyPose(safeDeltaTime);
    } else if (this.state === GameState.Playing) {
      this.updatePlaying(safeDeltaTime);
    } else if (this.state === GameState.GameOver) {
      this.gameOverElapsed += safeDeltaTime;
      this.applyFormalPlayerVisual('falling', true);
    }

    this.updateDebugLabel();
  }

  private readonly onPrimaryInput = (): void => {
    if (!this.artReady) {
      return;
    }
    const inputTimeMs = Date.now();
    if (inputTimeMs - this.lastPrimaryInputTimeMs < 50) {
      return;
    }
    this.lastPrimaryInputTimeMs = inputTimeMs;

    if (this.state === GameState.Ready) {
      this.startPlaying();
      this.playerMotion.flap();
      return;
    }

    if (this.state === GameState.Playing) {
      this.playerMotion.flap();
      return;
    }

    if (this.state === GameState.GameOver && this.gameOverElapsed >= 0.3) {
      this.resetToReady();
    }
  };

  private readonly onKeyDown = (event: EventKeyboard): void => {
    if (event.keyCode === KeyCode.SPACE) {
      this.onPrimaryInput();
    }
  };

  private startPlaying(): void {
    this.state = GameState.Playing;
    this.promptLabel.string = '';
    if (this.formalArtAssets) {
      this.titleLogoNode.active = false;
      this.promptDividerSprite.node.active = false;
      this.readyHintLabel.node.active = false;
      this.readyHintPanel.active = false;
      this.readySubtitleLabel.node.active = false;
      this.scorePanelSprite.node.active = true;
    }
  }

  private updateReadyPose(deltaTime: number): void {
    const hoverOffset = Math.sin(this.elapsedTime * 3) * 10;
    this.playerMotion.reset(this.config.playerStartY + hoverOffset);
    this.applyPlayerTransform();
    this.updatePlayerVisuals(deltaTime, true);
  }

  private updatePlaying(deltaTime: number): void {
    this.playerMotion.step(deltaTime);
    this.applyPlayerTransform();
    this.updatePlayerVisuals(deltaTime, false);
    this.currentDifficulty = sampleDifficulty(this.score);

    for (let index = 0; index < this.activeObstaclePairs.length; index += 1) {
      const pair = this.activeObstaclePairs[index];
      pair.x -= this.currentDifficulty.scrollSpeed * deltaTime;
      pair.node.setPosition(pair.x, 0);
      pair.motion.step(deltaTime);
      this.applyDynamicObstacleVisuals(pair);
    }

    // Collision always wins over scoring when both happen in the same frame.
    if (this.hasCollision()) {
      this.enterGameOver();
      return;
    }

    for (let index = 0; index < this.activeObstaclePairs.length; index += 1) {
      const pair = this.activeObstaclePairs[index];
      if (pair.scoreGate.tryPass(pair.x, this.config.playerX)) {
        this.score += 1;
        this.scoreLabel.string = this.score.toString();
        this.currentDifficulty = sampleDifficulty(this.score);
        this.playScoreEffect();
      }
    }

    this.recycleOffscreenPairs();
  }

  private updatePlayerVisuals(deltaTime: number, isReady: boolean): void {
    const visualState = getPlayerFlightVisualState(this.playerMotion.velocityY, isReady);
    this.wheelMotion.step(deltaTime, visualState);
    const snapshot = this.wheelMotion.snapshot;
    const flamePulse = 1 + Math.sin(this.elapsedTime * 15) * 0.07;

    this.leftWheelNode.setRotationFromEuler(0, 0, snapshot.leftRotationDegrees);
    this.rightWheelNode.setRotationFromEuler(0, 0, snapshot.rightRotationDegrees);
    this.leftFlameNode.setScale(0.92, snapshot.flameScale * flamePulse, 1);
    this.rightFlameNode.setScale(0.92, snapshot.flameScale * (2 - flamePulse), 1);
    this.applyFormalPlayerVisual(visualState, false);
  }

  private hasCollision(): boolean {
    const playerRadius = this.config.playerCollisionRadius;
    const upperBoundary = this.config.designHeight / 2 - this.config.topSafeArea;
    const lowerBoundary = -this.config.designHeight / 2 + this.config.bottomSafeArea;

    if (
      this.playerMotion.y + playerRadius >= upperBoundary ||
      this.playerMotion.y - playerRadius <= lowerBoundary
    ) {
      return true;
    }

    for (let index = 0; index < this.activeObstaclePairs.length; index += 1) {
      const pair = this.activeObstaclePairs[index];
      const spec = pair.spec;
      if (!spec) {
        continue;
      }

      const snapshot = pair.motion.snapshot;
      if (this.hasTopObstacleCollision(pair, spec, snapshot, playerRadius)) {
        return true;
      }
      if (this.hasBottomObstacleCollision(pair, spec, snapshot, playerRadius)) {
        return true;
      }
    }

    return false;
  }

  private hasTopObstacleCollision(
    pair: ObstaclePairRuntime,
    spec: ObstacleSpec,
    snapshot: DynamicObstacleSnapshot,
    playerRadius: number,
  ): boolean {
    const gapTop = spec.gapCenterY + spec.gapHeight / 2;
    const collisionRadiusScale = 1 - this.obstacleConfig.collisionInsetRatio;

    if (spec.topType === 'bagua-array') {
      return circlesIntersect(
        this.config.playerX,
        this.playerMotion.y,
        playerRadius,
        pair.x,
        this.getBaguaCenterY(spec),
        this.obstacleConfig.baguaRadius * collisionRadiusScale,
      );
    }

    if (spec.topType === 'lightning' && !snapshot.lightningCollisionActive) {
      return false;
    }

    const collisionHalfWidth =
      (spec.obstacleWidth * collisionRadiusScale) / 2;
    const topObstacle: RectangleBounds = {
      minX: pair.x - collisionHalfWidth,
      maxX: pair.x + collisionHalfWidth,
      minY: gapTop,
      maxY: this.config.designHeight / 2,
    };
    return circleIntersectsRectangle(
      this.config.playerX,
      this.playerMotion.y,
      playerRadius,
      topObstacle,
    );
  }

  private hasBottomObstacleCollision(
    pair: ObstaclePairRuntime,
    spec: ObstacleSpec,
    snapshot: DynamicObstacleSnapshot,
    playerRadius: number,
  ): boolean {
    const gapBottom = spec.gapCenterY - spec.gapHeight / 2;
    const collisionRadiusScale = 1 - this.obstacleConfig.collisionInsetRatio;

    if (spec.bottomType === 'fireball') {
      return circlesIntersect(
        this.config.playerX,
        this.playerMotion.y,
        playerRadius,
        pair.x,
        this.getFireballBaseCenterY(spec) + snapshot.fireballOffsetY,
        this.obstacleConfig.fireballRadius * collisionRadiusScale,
      );
    }

    const collisionHalfWidth =
      (spec.obstacleWidth * collisionRadiusScale) / 2;
    const bottomObstacle: RectangleBounds = {
      minX: pair.x - collisionHalfWidth,
      maxX: pair.x + collisionHalfWidth,
      minY: -this.config.designHeight / 2,
      maxY: gapBottom,
    };
    return circleIntersectsRectangle(
      this.config.playerX,
      this.playerMotion.y,
      playerRadius,
      bottomObstacle,
    );
  }

  private enterGameOver(): void {
    if (this.state !== GameState.Playing) {
      return;
    }

    this.state = GameState.GameOver;
    this.gameOverElapsed = 0;
    this.gameOverPanel.active = true;
    this.gameOverLabel.string = this.formalArtAssets
      ? '下次一定飞更远'
      : `撞到了！\n本局得分：${this.score}\n随机种子：${this.obstacleConfig.seed}\n点击重新准备`;
    this.promptLabel.string = '';
    if (this.formalArtAssets) {
      this.titleLogoNode.active = false;
      this.promptDividerSprite.node.active = false;
      this.readyHintLabel.node.active = false;
      this.readyHintPanel.active = false;
      this.readySubtitleLabel.node.active = false;
      this.scorePanelSprite.node.active = false;
      this.gameOverBackdrop.active = true;
      this.resultScoreLabel.string = this.score.toString();
    }
    this.playCollisionEffect();
    this.applyFormalPlayerVisual('falling', true);
  }

  private resetToReady(): void {
    this.state = GameState.Ready;
    this.elapsedTime = 0;
    this.gameOverElapsed = 0;
    this.score = 0;
    this.currentDifficulty = sampleDifficulty(0);
    this.scoreLabel.string = '0';
    this.promptLabel.string = '点击屏幕 / 空格键起飞';
    if (this.formalArtAssets) {
      this.titleLogoNode.active = true;
      this.promptDividerSprite.node.active = true;
      this.promptLabel.string = '点击起飞';
      this.readyHintLabel.node.active = true;
      this.readyHintPanel.active = true;
      this.readySubtitleLabel.node.active = true;
      this.scorePanelSprite.node.active = false;
    }
    this.gameOverPanel.active = false;
    this.gameOverBackdrop.active = false;
    this.playerMotion.reset(this.config.playerStartY);
    this.wheelMotion.reset();
    this.scoreEffectTimeRemaining = 0;
    this.collisionEffectTimeRemaining = 0;
    if (this.scoreEffectNode) {
      this.scoreEffectNode.active = false;
    }
    if (this.collisionEffectNode) {
      this.collisionEffectNode.active = false;
    }
    this.applyPlayerTransform();
    this.updatePlayerVisuals(0, true);
    this.resetObstaclePool();
  }

  private resetObstaclePool(): void {
    for (let index = 0; index < this.activeObstaclePairs.length; index += 1) {
      const pair = this.activeObstaclePairs[index];
      pair.node.active = false;
      pair.spec = null;
      pair.lastLightningPhase = null;
      pair.scoreGate.clear();
    }

    this.activeObstaclePairs.length = 0;
    this.obstaclePool.reset();
    this.obstacleGenerator.reset(this.obstacleConfig.seed);

    for (let index = 0; index < this.obstacleConfig.poolSize; index += 1) {
      const pair = this.obstaclePool.acquire();
      const x =
        this.config.playerX +
        this.obstacleConfig.firstObstacleDistance +
        index * this.obstacleConfig.horizontalSpacing;
      this.configureObstaclePair(pair, x, this.obstacleGenerator.generate(0));
      this.activeObstaclePairs.push(pair);
    }
  }

  private recycleOffscreenPairs(): void {
    const screenLeft = -this.config.designWidth / 2;

    for (let index = 0; index < this.activeObstaclePairs.length; ) {
      const pair = this.activeObstaclePairs[index];
      const width = pair.spec?.obstacleWidth ?? this.obstacleConfig.baseObstacleWidth;
      if (
        pair.x >=
        screenLeft - width / 2 - this.obstacleConfig.offscreenRecyclePadding
      ) {
        index += 1;
        continue;
      }

      let rightmostX =
        this.config.playerX +
        this.obstacleConfig.firstObstacleDistance -
        this.obstacleConfig.horizontalSpacing;
      for (let otherIndex = 0; otherIndex < this.activeObstaclePairs.length; otherIndex += 1) {
        if (otherIndex !== index) {
          rightmostX = Math.max(rightmostX, this.activeObstaclePairs[otherIndex].x);
        }
      }

      this.activeObstaclePairs.splice(index, 1);
      this.releaseObstaclePair(pair);
      const recycledPair = this.obstaclePool.acquire();
      const nextX = rightmostX + this.obstacleConfig.horizontalSpacing;
      this.configureObstaclePair(
        recycledPair,
        nextX,
        this.obstacleGenerator.generate(this.score),
      );
      this.activeObstaclePairs.push(recycledPair);
    }
  }

  private releaseObstaclePair(pair: ObstaclePairRuntime): void {
    pair.node.active = false;
    pair.spec = null;
    pair.lastLightningPhase = null;
    pair.scoreGate.clear();
    this.obstaclePool.release(pair);
  }

  private configureObstaclePair(
    pair: ObstaclePairRuntime,
    x: number,
    spec: ObstacleSpec,
  ): void {
    pair.x = x;
    pair.spec = spec;
    pair.lastLightningPhase = null;
    pair.motion.reset(spec.sequenceIndex);
    pair.scoreGate.reset(spec.runtimeId);
    pair.node.name = `ObstaclePair_${spec.runtimeId}`;
    pair.node.active = true;
    pair.node.setPosition(x, 0);
    pair.topLabel.string = TOP_OBSTACLE_NAMES[spec.topType];
    pair.bottomLabel.string = BOTTOM_OBSTACLE_NAMES[spec.bottomType];
    this.drawObstacleVisuals(pair, spec);
    this.applyDynamicObstacleVisuals(pair, true);
  }

  private applyPlayerTransform(): void {
    this.playerNode.setPosition(this.config.playerX, this.playerMotion.y);
    this.playerNode.setRotationFromEuler(0, 0, this.playerMotion.rotationDegrees);
  }

  private buildGrayboxScene(): void {
    const background = this.createGraphicsNode('BackgroundLayer', this.node);
    this.backgroundFallbackNode = background.node;
    background.node.setSiblingIndex(0);
    this.drawBackground(background.graphics);
    this.buildFormalBackgroundNodes();
    const wash = this.createGraphicsNode('BackgroundColorWash', this.node);
    this.backgroundWashNode = wash.node;
    wash.node.active = false;
    wash.graphics.fillColor = this.presentationColor('backgroundWash');
    // Overscan also covers the moving scenery edges, but not the obstacles.
    wash.graphics.rect(-1000, -1000, 2000, 2000);
    wash.graphics.fill();

    this.obstacleLayer = new Node('ObstaclePoolLayer');
    this.obstacleLayer.layer = Layers.Enum.UI_2D;
    this.obstacleLayer.setParent(this.node);
    this.obstaclePool = new FixedObjectPool(
      () => this.createObstaclePairRuntime(),
      this.obstacleConfig.poolSize,
    );

    this.buildPlayer();

    const titleLogo = this.createSpriteNode('TitleLogo', this.node);
    this.titleLogoNode = titleLogo.node;
    this.titleLogoSprite = titleLogo.sprite;
    this.titleLogoNode.setPosition(0, 500);
    this.titleLogoNode.active = false;

    this.titleLabel = this.createLabel(
      'TitleLabel',
      '哪吒不会飞 · 阶段 4 正式素材',
      30,
      700,
      64,
      new Color(255, 255, 255, 255),
    );
    this.titleLabel.node.setPosition(0, 570);
    this.readySubtitleLabel = this.createLabel(
      'ReadySubtitle', '陈塘关 · 风火轮试飞', 24, 480, 42,
      this.presentationColor('skyInk'),
    );
    this.readySubtitleLabel.node.setPosition(0, 395);
    this.readySubtitleLabel.node.active = false;

    const scorePanel = this.createSpriteNode('ScorePanel', this.node);
    this.scorePanelSprite = scorePanel.sprite;
    scorePanel.node.setPosition(0, 550);
    this.scoreLabel = this.createLabel(
      'ScoreLabel',
      '0',
      FORMAL_PRESENTATION.scoreFontSize,
      120,
      56,
      new Color(255, 245, 192, 255),
      scorePanel.node,
    );
    this.scoreLabel.node.setPosition(18, 13);
    this.scoreLabel.overflow = Label.Overflow.SHRINK;
    this.scoreLabel.enableWrapText = false;

    const promptDivider = this.createSpriteNode('StartButton', this.node);
    this.promptDividerSprite = promptDivider.sprite;
    promptDivider.node.setPosition(0, -405);
    this.promptLabel = this.createLabel(
      'PromptLabel',
      '',
      34,
      290,
      56,
      new Color(255, 255, 255, 255),
      promptDivider.node,
    );
    this.promptLabel.node.setPosition(16, -4);
    this.promptLabel.overflow = Label.Overflow.SHRINK;
    this.promptLabel.enableWrapText = false;
    const hintPanel = this.createGraphicsNode('ReadyControlHintPanel', this.node);
    this.readyHintPanel = hintPanel.node;
    hintPanel.node.setPosition(0, -535);
    hintPanel.graphics.fillColor = new Color(250, 245, 225, 223);
    hintPanel.graphics.roundRect(-205, -28, 410, 56, 28);
    hintPanel.graphics.fill();
    hintPanel.graphics.strokeColor = new Color(72, 108, 109, 125);
    hintPanel.graphics.lineWidth = 2;
    hintPanel.graphics.roundRect(-205, -28, 410, 56, 28);
    hintPanel.graphics.stroke();
    this.readyHintLabel = this.createLabel(
      'ReadyControlHint', '轻点上升 · 自然下落', 24, 390, 46,
      this.presentationColor('skyInk'), hintPanel.node,
    );
    hintPanel.node.active = false;
    this.debugLabel = this.createLabel(
      'DebugLabel',
      '',
      20,
      720,
      70,
      new Color(232, 246, 255, 230),
    );
    this.debugLabel.node.setPosition(0, -590);

    this.buildGameOverPanel();
    this.buildFormalEffectNodes();
  }

  private buildPlayer(): void {
    const player = this.createGraphicsNode('Player', this.node);
    this.playerNode = player.node;
    this.playerBodyGraphics = player.graphics;
    this.playerBodySprite = player.node.addComponent(Sprite);
    this.drawPlayerBody(player.graphics);

    this.leftFlameNode = this.createFlameNode('LeftWheelFlame', -34);
    this.rightFlameNode = this.createFlameNode('RightWheelFlame', 34);
    const leftWheel = this.createWheelNode('LeftWindFireWheel', -34);
    const rightWheel = this.createWheelNode('RightWindFireWheel', 34);
    this.leftWheelNode = leftWheel.node;
    this.rightWheelNode = rightWheel.node;
    this.leftWheelGraphics = leftWheel.graphics;
    this.rightWheelGraphics = rightWheel.graphics;
    this.leftWheelSprite = leftWheel.sprite;
    this.rightWheelSprite = rightWheel.sprite;
  }

  private createWheelNode(
    name: string,
    x: number,
  ): { node: Node; graphics: Graphics; sprite: Sprite } {
    const wheel = this.createGraphicsNode(name, this.playerNode);
    wheel.node.setPosition(x, -45);
    wheel.graphics.fillColor = new Color(255, 174, 36, 255);
    wheel.graphics.circle(0, 0, 20);
    wheel.graphics.fill();
    wheel.graphics.strokeColor = new Color(255, 246, 196, 255);
    wheel.graphics.lineWidth = 5;
    wheel.graphics.circle(0, 0, 11);
    wheel.graphics.moveTo(0, 0);
    wheel.graphics.lineTo(0, 17);
    wheel.graphics.moveTo(0, 0);
    wheel.graphics.lineTo(15, -8);
    wheel.graphics.moveTo(0, 0);
    wheel.graphics.lineTo(-15, -8);
    wheel.graphics.stroke();
    return { ...wheel, sprite: wheel.node.addComponent(Sprite) };
  }

  private createFlameNode(name: string, x: number): Node {
    const flame = this.createGraphicsNode(name, this.playerNode);
    flame.node.setPosition(x, -58);
    flame.graphics.fillColor = new Color(239, 76, 37, 235);
    flame.graphics.moveTo(-13, 4);
    flame.graphics.lineTo(0, -38);
    flame.graphics.lineTo(13, 4);
    flame.graphics.close();
    flame.graphics.fill();
    flame.graphics.fillColor = new Color(255, 213, 71, 245);
    flame.graphics.moveTo(-7, 2);
    flame.graphics.lineTo(0, -24);
    flame.graphics.lineTo(7, 2);
    flame.graphics.close();
    flame.graphics.fill();
    return flame.node;
  }

  private createObstaclePairRuntime(): ObstaclePairRuntime {
    const root = this.createGraphicsNode('PooledObstaclePair', this.obstacleLayer);
    const topAttachment = this.createSpriteNode('TopAttachmentVisual', root.node);
    const topVisual = this.createGraphicsNode('TopVisual', root.node);
    const topInner = this.createGraphicsNode('TopInnerVisual', root.node);
    const bottomVisual = this.createGraphicsNode('BottomVisual', root.node);
    const topVisualSprite = topVisual.node.addComponent(Sprite);
    const topInnerSprite = topInner.node.addComponent(Sprite);
    const bottomVisualSprite = bottomVisual.node.addComponent(Sprite);
    const topLabel = this.createLabel(
      'TopTypeLabel',
      '',
      19,
      150,
      32,
      new Color(255, 255, 255, 235),
      root.node,
    );
    const bottomLabel = this.createLabel(
      'BottomTypeLabel',
      '',
      19,
      150,
      32,
      new Color(255, 255, 255, 235),
      root.node,
    );
    root.node.active = false;
    return {
      node: root.node,
      collisionGraphics: root.graphics,
      topAttachmentNode: topAttachment.node,
      topAttachmentSprite: topAttachment.sprite,
      topVisualNode: topVisual.node,
      topVisualGraphics: topVisual.graphics,
      topVisualSprite,
      topInnerNode: topInner.node,
      topInnerGraphics: topInner.graphics,
      topInnerSprite,
      bottomVisualNode: bottomVisual.node,
      bottomVisualGraphics: bottomVisual.graphics,
      bottomVisualSprite,
      topLabel,
      bottomLabel,
      scoreGate: new ObstacleScoreGate(),
      motion: new DynamicObstacleMotion(this.obstacleConfig),
      lastLightningPhase: null,
      x: 0,
      spec: null,
    };
  }

  private drawBackground(graphics: Graphics): void {
    const halfWidth = this.config.designWidth / 2;
    const halfHeight = this.config.designHeight / 2;

    graphics.fillColor = new Color(74, 165, 210, 255);
    graphics.rect(-halfWidth, -halfHeight, this.config.designWidth, this.config.designHeight);
    graphics.fill();
    graphics.fillColor = new Color(45, 117, 145, 255);
    graphics.rect(
      -halfWidth,
      -halfHeight,
      this.config.designWidth,
      this.config.bottomSafeArea,
    );
    graphics.fill();
    graphics.fillColor = new Color(38, 105, 138, 150);
    graphics.rect(
      -halfWidth,
      halfHeight - this.config.topSafeArea,
      this.config.designWidth,
      this.config.topSafeArea,
    );
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 120);
    graphics.lineWidth = 3;
    graphics.moveTo(-halfWidth, -halfHeight + this.config.bottomSafeArea);
    graphics.lineTo(halfWidth, -halfHeight + this.config.bottomSafeArea);
    graphics.moveTo(-halfWidth, halfHeight - this.config.topSafeArea);
    graphics.lineTo(halfWidth, halfHeight - this.config.topSafeArea);
    graphics.stroke();
  }

  private drawPlayerBody(graphics: Graphics): void {
    const halfWidth = this.config.playerVisualWidth / 2;
    graphics.fillColor = new Color(232, 91, 62, 255);
    graphics.roundRect(-halfWidth, -32, this.config.playerVisualWidth, 70, 18);
    graphics.fill();
    graphics.fillColor = new Color(255, 244, 218, 255);
    graphics.circle(15, 6, 12);
    graphics.fill();
    graphics.fillColor = new Color(53, 55, 67, 255);
    graphics.circle(18, 7, 4);
    graphics.fill();
  }

  private drawObstacleVisuals(pair: ObstaclePairRuntime, spec: ObstacleSpec): void {
    pair.topVisualGraphics.clear();
    pair.topInnerGraphics.clear();
    pair.bottomVisualGraphics.clear();
    pair.topVisualNode.setRotationFromEuler(0, 0, 0);
    pair.topInnerNode.setRotationFromEuler(0, 0, 0);
    pair.bottomVisualNode.setRotationFromEuler(0, 0, 0);
    pair.topVisualNode.setScale(1, 1, 1);
    pair.topInnerNode.setScale(1, 1, 1);
    pair.bottomVisualNode.setScale(1, 1, 1);
    pair.topAttachmentNode.setScale(1, 1, 1);
    pair.topAttachmentNode.active = false;
    pair.topInnerNode.active = false;

    if (this.formalArtAssets) {
      this.drawFormalObstacleVisuals(pair, spec);
      return;
    }

    this.drawTopObstacleVisual(pair, spec);
    this.drawBottomObstacleVisual(pair, spec);
  }

  private drawFormalObstacleVisuals(
    pair: ObstaclePairRuntime,
    spec: ObstacleSpec,
  ): void {
    const assets = this.formalArtAssets;
    if (!assets) {
      return;
    }

    const gapTop = spec.gapCenterY + spec.gapHeight / 2;
    const gapBottom = spec.gapCenterY - spec.gapHeight / 2;
    const topFillLayout = getTopObstacleFillLayout(
      this.config.designHeight,
      gapTop,
      FORMAL_TOP_ART_OVERSCAN,
    );
    const bottomFillLayout = getBottomObstacleFillLayout(
      this.config.designHeight,
      gapBottom,
    );
    pair.topLabel.node.active = spec.topType === 'lightning';
    pair.bottomLabel.node.active = false;
    pair.topVisualSprite.color = Color.WHITE;
    pair.topAttachmentSprite.color = Color.WHITE;
    pair.bottomVisualSprite.color = Color.WHITE;
    pair.topInnerSprite.color = new Color(255, 236, 173, 185);

    this.setSpriteFrame(
      pair.topVisualSprite,
      assets[TOP_OBSTACLE_ART[spec.topType]],
    );
    this.setSpriteFrame(
      pair.bottomVisualSprite,
      assets[BOTTOM_OBSTACLE_ART[spec.bottomType]],
    );

    if (spec.topType === 'dark-cloud') {
      this.setSpriteSize(
        pair.topVisualSprite,
        spec.obstacleWidth * 1.65,
        topFillLayout.height,
      );
      pair.topVisualNode.setPosition(0, topFillLayout.centerY);
    } else if (spec.topType === 'lightning') {
      this.setSpriteSize(
        pair.topVisualSprite,
        spec.obstacleWidth * 1.65,
        topFillLayout.height,
      );
      pair.topVisualNode.setPosition(0, topFillLayout.centerY);
      pair.topLabel.node.setPosition(0, gapTop + 46);
      this.applyFormalLightningPhase(pair, pair.motion.snapshot.lightningPhase);
    } else {
      const baguaSize = this.obstacleConfig.baguaRadius * 2.45;
      const baguaCenterY = this.getBaguaCenterY(spec);
      this.setSpriteSize(pair.topVisualSprite, baguaSize, baguaSize);
      pair.topVisualNode.setPosition(0, baguaCenterY);
      pair.topInnerNode.active = true;
      this.setSpriteFrame(pair.topInnerSprite, assets.obstacleBagua);
      this.setSpriteSize(pair.topInnerSprite, baguaSize * 0.58, baguaSize * 0.58);
      pair.topInnerNode.setPosition(0, baguaCenterY);
      const attachmentBottom = baguaCenterY + baguaSize * 0.42;
      const attachmentLayout = getTopObstacleFillLayout(
        this.config.designHeight,
        attachmentBottom,
        FORMAL_TOP_ART_OVERSCAN,
      );
      pair.topAttachmentNode.active = true;
      this.setSpriteFrame(pair.topAttachmentSprite, assets.obstacleStormCloud);
      this.setSpriteSize(
        pair.topAttachmentSprite,
        spec.obstacleWidth * 1.55,
        attachmentLayout.height,
      );
      pair.topAttachmentNode.setPosition(0, attachmentLayout.centerY);
      pair.topAttachmentSprite.color = new Color(236, 241, 247, 235);
      pair.topLabel.node.active = false;
    }

    if (spec.bottomType === 'fireball') {
      this.setSpriteSize(pair.bottomVisualSprite, 116, 142);
      pair.bottomVisualNode.setPosition(0, this.getFireballBaseCenterY(spec));
    } else {
      const widthMultiplier = spec.bottomType === 'mountain' ? 1.65 : 1.35;
      this.setSpriteSize(
        pair.bottomVisualSprite,
        spec.obstacleWidth * widthMultiplier,
        bottomFillLayout.height,
      );
      pair.bottomVisualNode.setPosition(0, bottomFillLayout.centerY);
    }
  }

  private drawTopObstacleVisual(pair: ObstaclePairRuntime, spec: ObstacleSpec): void {
    const graphics = pair.topVisualGraphics;
    const halfWidth = spec.obstacleWidth / 2;
    const gapTop = spec.gapCenterY + spec.gapHeight / 2;

    if (spec.topType === 'dark-cloud') {
      pair.topVisualNode.setPosition(0, gapTop + 38);
      graphics.fillColor = new Color(76, 91, 111, 255);
      graphics.circle(-30, -12, 35);
      graphics.circle(5, 2, 45);
      graphics.circle(40, -14, 32);
      graphics.fill();
      pair.topLabel.node.setPosition(0, gapTop + 42);
      return;
    }

    if (spec.topType === 'lightning') {
      pair.topVisualNode.setPosition(0, gapTop + 65);
      pair.topLabel.node.setPosition(0, gapTop + 150);
      this.drawLightningVisual(pair, 'warning', halfWidth);
      return;
    }

    const baguaCenterY = this.getBaguaCenterY(spec);
    pair.topVisualNode.setPosition(0, baguaCenterY);
    pair.topInnerNode.setPosition(0, baguaCenterY);
    pair.topInnerNode.active = true;
    graphics.fillColor = new Color(111, 76, 148, 255);
    graphics.circle(0, 0, this.obstacleConfig.baguaRadius);
    graphics.fill();
    graphics.strokeColor = new Color(255, 214, 95, 255);
    graphics.lineWidth = 5;
    graphics.circle(0, 0, this.obstacleConfig.baguaRadius - 8);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      graphics.moveTo(Math.cos(angle) * 30, Math.sin(angle) * 30);
      graphics.lineTo(Math.cos(angle) * 43, Math.sin(angle) * 43);
    }
    graphics.stroke();
    pair.topInnerGraphics.strokeColor = new Color(255, 232, 154, 255);
    pair.topInnerGraphics.lineWidth = 5;
    pair.topInnerGraphics.circle(0, 0, 22);
    pair.topInnerGraphics.moveTo(-20, 0);
    pair.topInnerGraphics.lineTo(20, 0);
    pair.topInnerGraphics.moveTo(0, -20);
    pair.topInnerGraphics.lineTo(0, 20);
    pair.topInnerGraphics.stroke();
    pair.topLabel.node.setPosition(0, baguaCenterY + 72);
  }

  private drawBottomObstacleVisual(pair: ObstaclePairRuntime, spec: ObstacleSpec): void {
    const graphics = pair.bottomVisualGraphics;
    const halfWidth = spec.obstacleWidth / 2;
    const halfHeight = this.config.designHeight / 2;
    const gapBottom = spec.gapCenterY - spec.gapHeight / 2;

    if (spec.bottomType === 'mountain') {
      pair.bottomVisualNode.setPosition(0, 0);
      graphics.fillColor = new Color(74, 112, 91, 255);
      graphics.moveTo(-halfWidth, -halfHeight);
      graphics.lineTo(-halfWidth, gapBottom - 70);
      graphics.lineTo(-18, gapBottom - 28);
      graphics.lineTo(0, gapBottom);
      graphics.lineTo(24, gapBottom - 40);
      graphics.lineTo(halfWidth, gapBottom - 78);
      graphics.lineTo(halfWidth, -halfHeight);
      graphics.close();
      graphics.fill();
      pair.bottomLabel.node.setPosition(0, gapBottom - 48);
      return;
    }

    if (spec.bottomType === 'stone-pillar') {
      pair.bottomVisualNode.setPosition(0, 0);
      graphics.fillColor = new Color(126, 126, 125, 255);
      graphics.rect(-halfWidth + 12, -halfHeight, halfWidth * 2 - 24, gapBottom + halfHeight);
      graphics.fill();
      graphics.fillColor = new Color(162, 150, 119, 255);
      graphics.rect(-halfWidth, gapBottom - 28, halfWidth * 2, 28);
      graphics.fill();
      graphics.strokeColor = new Color(219, 192, 121, 210);
      graphics.lineWidth = 4;
      graphics.moveTo(-22, gapBottom - 86);
      graphics.lineTo(0, gapBottom - 55);
      graphics.lineTo(22, gapBottom - 86);
      graphics.stroke();
      pair.bottomLabel.node.setPosition(0, gapBottom - 52);
      return;
    }

    pair.bottomVisualNode.setPosition(0, this.getFireballBaseCenterY(spec));
    graphics.fillColor = new Color(201, 52, 30, 255);
    graphics.moveTo(-34, -10);
    graphics.lineTo(-10, -66);
    graphics.lineTo(3, -36);
    graphics.lineTo(22, -72);
    graphics.lineTo(33, -8);
    graphics.close();
    graphics.fill();
    graphics.fillColor = new Color(234, 73, 37, 255);
    graphics.circle(0, 0, this.obstacleConfig.fireballRadius);
    graphics.fill();
    graphics.fillColor = new Color(255, 194, 58, 255);
    graphics.circle(-10, 10, 24);
    graphics.fill();
    graphics.fillColor = new Color(255, 231, 134, 255);
    graphics.circle(-15, 16, 10);
    graphics.fill();
    graphics.strokeColor = new Color(255, 238, 166, 210);
    graphics.lineWidth = 3;
    graphics.circle(
      0,
      0,
      this.obstacleConfig.fireballRadius *
        (1 - this.obstacleConfig.collisionInsetRatio),
    );
    graphics.stroke();
    pair.bottomLabel.node.setPosition(0, this.getFireballBaseCenterY(spec) - 74);
  }

  private drawLightningVisual(
    pair: ObstaclePairRuntime,
    phase: LightningPhase,
    halfWidth: number,
  ): void {
    const graphics = pair.topVisualGraphics;
    graphics.clear();
    if (phase === 'warning') {
      graphics.fillColor = new Color(132, 103, 61, 255);
      pair.topLabel.string = '雷电·预警';
      pair.topLabel.color = new Color(255, 226, 126, 255);
    } else if (phase === 'active') {
      graphics.fillColor = new Color(67, 61, 92, 255);
      pair.topLabel.string = '雷电·生效';
      pair.topLabel.color = new Color(255, 248, 188, 255);
    } else {
      graphics.fillColor = new Color(73, 77, 113, 255);
      pair.topLabel.string = '雷电·冷却';
      pair.topLabel.color = new Color(190, 204, 226, 255);
    }
    graphics.roundRect(-halfWidth, 0, halfWidth * 2, 58, 24);
    graphics.fill();
    graphics.fillColor =
      phase === 'active'
        ? new Color(255, 245, 157, 255)
        : phase === 'warning'
          ? new Color(255, 210, 77, 125)
          : new Color(164, 177, 207, 55);
    graphics.moveTo(15, 42);
    graphics.lineTo(-16, -16);
    graphics.lineTo(7, -16);
    graphics.lineTo(-14, -61);
    graphics.lineTo(35, 2);
    graphics.lineTo(10, 2);
    graphics.close();
    graphics.fill();
  }

  private applyDynamicObstacleVisuals(
    pair: ObstaclePairRuntime,
    forceRefresh = false,
  ): void {
    const spec = pair.spec;
    if (!spec) {
      return;
    }
    const snapshot = pair.motion.snapshot;

    if (spec.bottomType === 'fireball') {
      const centerY = this.getFireballBaseCenterY(spec) + snapshot.fireballOffsetY;
      pair.bottomVisualNode.setPosition(0, centerY);
      pair.bottomVisualNode.setRotationFromEuler(
        0,
        0,
        snapshot.fireballRotationDegrees,
      );
      pair.bottomLabel.node.setPosition(0, centerY - 74);
    }

    if (spec.topType === 'bagua-array') {
      pair.topVisualNode.setRotationFromEuler(
        0,
        0,
        snapshot.baguaOuterRotationDegrees,
      );
      pair.topInnerNode.setRotationFromEuler(
        0,
        0,
        snapshot.baguaInnerRotationDegrees,
      );
    }

    if (spec.topType === 'lightning' && this.formalArtAssets) {
      pair.lastLightningPhase = snapshot.lightningPhase;
      this.applyFormalLightningPhase(pair, snapshot.lightningPhase);
      pair.collisionGraphics.clear();
      return;
    }

    if (
      spec.topType === 'lightning' &&
      (forceRefresh || pair.lastLightningPhase !== snapshot.lightningPhase)
    ) {
      pair.lastLightningPhase = snapshot.lightningPhase;
      this.drawLightningVisual(
        pair,
        snapshot.lightningPhase,
        spec.obstacleWidth / 2,
      );
      this.drawCollisionDebug(pair, spec, snapshot);
      return;
    }

    if (forceRefresh) {
      this.drawCollisionDebug(pair, spec, snapshot);
    }
  }

  private drawCollisionDebug(
    pair: ObstaclePairRuntime,
    spec: ObstacleSpec,
    snapshot: DynamicObstacleSnapshot,
  ): void {
    const graphics = pair.collisionGraphics;
    if (this.formalArtAssets) {
      graphics.clear();
      return;
    }
    const halfWidth = spec.obstacleWidth / 2;
    const halfHeight = this.config.designHeight / 2;
    const gapBottom = spec.gapCenterY - spec.gapHeight / 2;
    const gapTop = spec.gapCenterY + spec.gapHeight / 2;
    graphics.clear();

    if (spec.topType === 'bagua-array') {
      graphics.fillColor = new Color(83, 59, 111, 80);
      graphics.circle(0, this.getBaguaCenterY(spec), this.obstacleConfig.baguaRadius);
      graphics.fill();
    } else {
      graphics.fillColor =
        spec.topType === 'lightning'
          ? snapshot.lightningPhase === 'active'
            ? new Color(255, 222, 82, 105)
            : snapshot.lightningPhase === 'warning'
              ? new Color(255, 190, 66, 55)
              : new Color(53, 58, 94, 35)
          : new Color(57, 74, 91, 105);
      graphics.rect(-halfWidth, gapTop, halfWidth * 2, halfHeight - gapTop);
      graphics.fill();
    }

    if (spec.bottomType !== 'fireball') {
      graphics.fillColor =
        spec.bottomType === 'mountain'
          ? new Color(55, 91, 80, 105)
          : new Color(83, 85, 91, 115);
      graphics.rect(-halfWidth, -halfHeight, halfWidth * 2, gapBottom + halfHeight);
      graphics.fill();
    }

    graphics.strokeColor = new Color(113, 255, 177, 210);
    graphics.lineWidth = 3;
    graphics.moveTo(0, gapBottom);
    graphics.lineTo(0, gapTop);
    graphics.stroke();
  }

  private getFireballBaseCenterY(spec: ObstacleSpec): number {
    const gapBottom = spec.gapCenterY - spec.gapHeight / 2;
    return (
      gapBottom -
      this.obstacleConfig.gapSafetyMargin -
      this.obstacleConfig.fireballFloatAmplitude -
      this.obstacleConfig.fireballRadius
    );
  }

  private getBaguaCenterY(spec: ObstacleSpec): number {
    const gapTop = spec.gapCenterY + spec.gapHeight / 2;
    return (
      gapTop + this.obstacleConfig.gapSafetyMargin + this.obstacleConfig.baguaRadius
    );
  }

  private buildGameOverPanel(): void {
    const backdrop = this.createGraphicsNode('ResultBackdrop', this.node);
    this.gameOverBackdrop = backdrop.node;
    backdrop.graphics.fillColor = this.presentationColor('modalScrim');
    backdrop.graphics.rect(-1000, -1000, 2000, 2000);
    backdrop.graphics.fill();
    backdrop.node.active = false;
    const panel = this.createGraphicsNode('GameOverPanel', this.node);
    this.gameOverPanel = panel.node;
    this.gameOverPanelGraphics = panel.graphics;
    this.gameOverPanelSprite = panel.node.addComponent(Sprite);
    panel.graphics.fillColor = new Color(25, 40, 53, 225);
    panel.graphics.roundRect(-270, -175, 540, 350, 28);
    panel.graphics.fill();
    panel.graphics.strokeColor = new Color(255, 208, 94, 255);
    panel.graphics.lineWidth = 5;
    panel.graphics.roundRect(-270, -175, 540, 350, 28);
    panel.graphics.stroke();
    this.gameOverLabel = this.createLabel(
      'GameOverLabel',
      '',
      38,
      500,
      290,
      new Color(255, 255, 255, 255),
      panel.node,
    );
    const resultPortrait = this.createSpriteNode('ResultPortrait', panel.node);
    this.resultPortraitNode = resultPortrait.node;
    this.resultPortraitSprite = resultPortrait.sprite;

    this.resultScoreCaption = this.createLabel(
      'ResultScoreCaption', '本局得分', 24, 270, 42,
      this.presentationColor('mutedInk'), panel.node,
    );
    this.resultScoreCaption.node.setPosition(90, 55);
    this.resultScoreLabel = this.createLabel(
      'ResultScore', '0', 86, 280, 110,
      this.presentationColor('accent'), panel.node,
    );
    this.resultScoreLabel.node.setPosition(90, -20);
    this.resultScoreLabel.overflow = Label.Overflow.SHRINK;
    this.resultScoreLabel.enableWrapText = false;
    this.resultHintLabel = this.createLabel(
      'ResultHint', '风火轮歇一歇，再来！', 23, 280, 42,
      this.presentationColor('mutedInk'), panel.node,
    );
    this.resultHintLabel.node.setPosition(90, -120);
    const retryButton = this.createSpriteNode('RetryButton', panel.node);
    this.retryButtonSprite = retryButton.sprite;
    retryButton.node.setPosition(0, -355);
    const retryLabel = this.createLabel(
      'RetryLabel', '再试一次', 34, 290, 56,
      this.presentationColor('ink'), retryButton.node,
    );
    retryLabel.node.setPosition(16, -4);
    this.resultScoreCaption.node.active = false;
    this.resultScoreLabel.node.active = false;
    this.resultHintLabel.node.active = false;
    retryButton.node.active = false;
  }

  private buildFormalBackgroundNodes(): void {
    for (let index = 0; index < FORMAL_BACKGROUND_LAYERS.length; index += 1) {
      const layerConfig = FORMAL_BACKGROUND_LAYERS[index];
      const layer = this.createSpriteNode(layerConfig.name, this.node);
      layer.node.active = false;
      this.backgroundLayerNodes.push(layer.node);
      this.backgroundLayerSprites.push(layer.sprite);
    }
  }

  private buildFormalEffectNodes(): void {
    const driftingLeaves = this.createSpriteNode(
      'DriftingLeavesVfx',
      this.backgroundLayerNodes[4],
    );
    this.driftingLeavesNode = driftingLeaves.node;
    this.driftingLeavesSprite = driftingLeaves.sprite;
    this.driftingLeavesNode.active = false;

    const fireSparks = this.createSpriteNode('FireSparksVfx', this.playerNode);
    this.fireSparksNode = fireSparks.node;
    this.fireSparksSprite = fireSparks.sprite;
    this.fireSparksNode.setPosition(0, -118);
    this.fireSparksNode.active = false;

    const scoreEffect = this.createSpriteNode('ScoreSparkleVfx', this.node);
    this.scoreEffectNode = scoreEffect.node;
    this.scoreEffectSprite = scoreEffect.sprite;
    this.scoreEffectNode.active = false;

    const collisionEffect = this.createSpriteNode('CollisionPuffVfx', this.node);
    this.collisionEffectNode = collisionEffect.node;
    this.collisionEffectSprite = collisionEffect.sprite;
    this.collisionEffectNode.active = false;
  }

  private async loadAndApplyFormalArt(): Promise<void> {
    try {
      const assets = await loadFormalArtAssets();
      this.formalArtAssets = assets;
      this.applyFormalArtAssets();
      this.artReady = true;
      this.resetToReady();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Stage4] 正式素材加载失败，保留灰盒显示：${message}`);
      this.artReady = true;
      this.promptLabel.string = '正式素材加载失败 · 点击继续灰盒';
    }
  }

  private applyFormalArtAssets(): void {
    const assets = this.formalArtAssets;
    if (!assets) {
      return;
    }

    this.backgroundFallbackNode.active = false;
    this.backgroundWashNode.active = true;
    for (let index = 0; index < FORMAL_BACKGROUND_LAYERS.length; index += 1) {
      const config = FORMAL_BACKGROUND_LAYERS[index];
      const node = this.backgroundLayerNodes[index];
      const sprite = this.backgroundLayerSprites[index];
      node.active = true;
      this.setSpriteFrame(sprite, assets[config.key]);
      this.setSpriteSize(
        sprite,
        this.config.designWidth * config.scale,
        this.config.designHeight * config.scale,
      );
      node.setPosition(0, 0);
    }

    this.titleLogoNode.active = this.state === GameState.Ready;
    this.setSpriteFrame(this.titleLogoSprite, assets.titleLogo);
    this.setSpriteSize(this.titleLogoSprite, 460, 131);
    this.titleLabel.node.active = false;

    this.setSpriteFrame(this.scorePanelSprite, assets.uiScorePlaque);
    this.setSpriteSize(
      this.scorePanelSprite,
      FORMAL_PRESENTATION.scorePlateWidth,
      FORMAL_PRESENTATION.scorePlateHeight,
    );
    this.setSpriteFrame(this.promptDividerSprite, assets.uiButtonPrimary);
    this.setSpriteSize(
      this.promptDividerSprite,
      FORMAL_PRESENTATION.actionWidth,
      FORMAL_PRESENTATION.actionHeight,
    );
    this.scoreLabel.color = this.presentationColor('ink');
    this.promptLabel.color = this.presentationColor('ink');
    this.promptDividerSprite.node.active = this.state === GameState.Ready;

    this.gameOverPanelGraphics.clear();
    this.setSpriteFrame(this.gameOverPanelSprite, assets.uiResultPanel);
    this.setSpriteSize(this.gameOverPanelSprite, 570, 525);
    this.gameOverLabel.color = this.presentationColor('ink');
    this.gameOverLabel.fontSize = 31;
    this.gameOverLabel.lineHeight = 42;
    this.gameOverLabel.node.setPosition(90, 140);
    this.gameOverLabel.node.getComponent(UITransform)?.setContentSize(300, 56);
    this.gameOverLabel.enableWrapText = false;
    this.gameOverLabel.overflow = Label.Overflow.SHRINK;
    this.resultScoreCaption.node.active = true;
    this.resultScoreLabel.node.active = true;
    this.resultHintLabel.node.active = true;
    this.setSpriteFrame(this.retryButtonSprite, assets.uiButtonPrimary);
    this.setSpriteSize(
      this.retryButtonSprite,
      FORMAL_PRESENTATION.actionWidth,
      FORMAL_PRESENTATION.actionHeight,
    );
    this.retryButtonSprite.node.active = true;
    this.setSpriteFrame(this.resultPortraitSprite, assets.nezhaResult);
    this.setSpriteSize(this.resultPortraitSprite, 100, 132);
    this.resultPortraitNode.setPosition(-235, -34);

    this.playerBodyGraphics.clear();
    this.leftWheelGraphics.clear();
    this.rightWheelGraphics.clear();
    this.leftFlameNode.active = false;
    this.rightFlameNode.active = false;
    this.applyFormalPlayerVisual('idle', false);

    this.setSpriteFrame(this.fireSparksSprite, assets.effectFireSparks);
    this.setSpriteSize(this.fireSparksSprite, 110, 116);
    this.setSpriteFrame(this.driftingLeavesSprite, assets.effectDriftingLeaves);
    this.setSpriteSize(this.driftingLeavesSprite, 122, 115);
    this.driftingLeavesSprite.color = new Color(
      255, 255, 255, FORMAL_PRESENTATION.leavesOpacity,
    );
    this.driftingLeavesNode.active = true;
    this.setSpriteFrame(this.scoreEffectSprite, assets.effectScoreSparkle);
    this.setSpriteSize(this.scoreEffectSprite, 150, 170);
    this.setSpriteFrame(this.collisionEffectSprite, assets.effectCollisionPuff);
    this.setSpriteSize(this.collisionEffectSprite, 210, 170);

    for (let index = 0; index < this.activeObstaclePairs.length; index += 1) {
      const pair = this.activeObstaclePairs[index];
      if (!pair.spec) {
        continue;
      }
      this.drawObstacleVisuals(pair, pair.spec);
      this.applyDynamicObstacleVisuals(pair, true);
    }

    this.debugLabel.node.active = false;
  }

  private applyFormalPlayerVisual(
    visualState: ReturnType<typeof getPlayerFlightVisualState>,
    isGameOver: boolean,
  ): void {
    const assets = this.formalArtAssets;
    if (!assets) {
      return;
    }

    const playerArtKey =
      isGameOver && this.gameOverElapsed >= 0.55
        ? 'nezhaResult'
        : getNezhaArtKey(visualState, isGameOver);
    this.setSpriteFrame(this.playerBodySprite, assets[playerArtKey]);
    this.setSpriteSize(this.playerBodySprite, 150, 204);
    const wheelFrame = assets[getWheelArtKey(visualState)];
    this.setSpriteFrame(this.leftWheelSprite, wheelFrame);
    this.setSpriteFrame(this.rightWheelSprite, wheelFrame);
    this.setSpriteSize(this.leftWheelSprite, 66, 64);
    this.setSpriteSize(this.rightWheelSprite, 66, 64);
    this.leftWheelNode.setPosition(-38, -102);
    this.rightWheelNode.setPosition(38, -102);

    this.fireSparksNode.active = visualState === 'rising' && !isGameOver;
    if (this.fireSparksNode.active) {
      const pulse = 0.9 + Math.sin(this.elapsedTime * 18) * 0.08;
      this.fireSparksNode.setScale(pulse, pulse, 1);
    }
  }

  private applyFormalLightningPhase(
    pair: ObstaclePairRuntime,
    phase: LightningPhase,
  ): void {
    if (!this.formalArtAssets) {
      return;
    }

    pair.topLabel.node.active = phase !== 'cooldown';
    if (phase === 'warning') {
      pair.topLabel.string = '雷光预警';
      pair.topLabel.color = new Color(255, 218, 91, 255);
      const pulse = Math.round(10 + Math.sin(this.elapsedTime * 14) * 10);
      pair.topVisualSprite.color = new Color(255, 223 + pulse, 142 + pulse, 220);
      pair.topVisualNode.setScale(1, 1, 1);
      return;
    }

    if (phase === 'active') {
      pair.topLabel.string = '雷电生效';
      pair.topLabel.color = new Color(255, 250, 215, 255);
      pair.topVisualSprite.color = new Color(255, 255, 255, 255);
      pair.topVisualNode.setScale(1, 1, 1);
      return;
    }

    pair.topLabel.string = '';
    pair.topVisualSprite.color = new Color(170, 183, 207, 145);
    pair.topVisualNode.setScale(1, 1, 1);
  }

  private updateBackgroundParallax(): void {
    if (!this.formalArtAssets) {
      return;
    }
    for (let index = 0; index < FORMAL_BACKGROUND_LAYERS.length; index += 1) {
      const config = FORMAL_BACKGROUND_LAYERS[index];
      const offsetX =
        Math.sin(this.elapsedTime * config.swaySpeed + index * 0.7) *
        config.swayAmplitude;
      this.backgroundLayerNodes[index].setPosition(offsetX, 0);
    }
    this.driftingLeavesNode.setPosition(
      280 + Math.sin(this.elapsedTime * 0.72) * 22,
      190 + Math.cos(this.elapsedTime * 0.54) * 24,
    );
    this.driftingLeavesNode.setRotationFromEuler(
      0,
      0,
      Math.sin(this.elapsedTime * 0.9) * 7,
    );
  }

  private updateFormalVfx(deltaTime: number): void {
    if (!this.formalArtAssets) {
      return;
    }

    if (this.scoreEffectTimeRemaining > 0) {
      this.scoreEffectTimeRemaining = Math.max(
        0,
        this.scoreEffectTimeRemaining - deltaTime,
      );
      const progress = 1 - this.scoreEffectTimeRemaining / 0.45;
      const scale = 0.72 + progress * 0.45;
      this.scoreEffectNode.setScale(scale, scale, 1);
      this.scoreEffectSprite.color = new Color(
        255,
        255,
        255,
        Math.round(255 * (1 - progress)),
      );
      this.scoreEffectNode.active = this.scoreEffectTimeRemaining > 0;
    }

    if (this.collisionEffectTimeRemaining > 0) {
      this.collisionEffectTimeRemaining = Math.max(
        0,
        this.collisionEffectTimeRemaining - deltaTime,
      );
      const progress = 1 - this.collisionEffectTimeRemaining / 0.55;
      const scale = 0.65 + progress * 0.55;
      this.collisionEffectNode.setScale(scale, scale, 1);
      this.collisionEffectSprite.color = new Color(
        255,
        255,
        255,
        Math.round(255 * (1 - progress)),
      );
      this.collisionEffectNode.active = this.collisionEffectTimeRemaining > 0;
    }
  }

  private playScoreEffect(): void {
    if (!this.formalArtAssets) {
      return;
    }
    this.scoreEffectTimeRemaining = 0.45;
    this.scoreEffectNode.active = true;
    this.scoreEffectNode.setPosition(
      this.config.playerX + 88,
      this.playerMotion.y + 42,
    );
    this.scoreEffectSprite.color = Color.WHITE;
  }

  private playCollisionEffect(): void {
    if (!this.formalArtAssets) {
      return;
    }
    this.collisionEffectTimeRemaining = 0.55;
    this.collisionEffectNode.active = true;
    this.collisionEffectNode.setPosition(this.config.playerX, this.playerMotion.y);
    this.collisionEffectSprite.color = Color.WHITE;
  }

  private createSpriteNode(
    name: string,
    parent: Node,
  ): { node: Node; sprite: Sprite } {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(1, 1);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    return { node, sprite };
  }

  private presentationColor(
    key: 'backgroundWash' | 'modalScrim' | 'ink' | 'mutedInk' | 'skyInk' | 'accent',
  ): Color {
    const color = FORMAL_PRESENTATION[key];
    return new Color(color.r, color.g, color.b, color.a);
  }

  private setSpriteFrame(sprite: Sprite, spriteFrame: SpriteFrame): void {
    if (sprite.spriteFrame !== spriteFrame) {
      sprite.spriteFrame = spriteFrame;
    }
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  }

  private setSpriteSize(sprite: Sprite, width: number, height: number): void {
    const transform = sprite.node.getComponent(UITransform);
    transform?.setContentSize(width, height);
  }

  private createGraphicsNode(
    name: string,
    parent: Node,
  ): { node: Node; graphics: Graphics } {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(this.config.designWidth, this.config.designHeight);

    const graphicsNode = new Node(`${name}GraphicsRenderer`);
    graphicsNode.layer = Layers.Enum.UI_2D;
    graphicsNode.setParent(node);
    const graphicsTransform = graphicsNode.addComponent(UITransform);
    graphicsTransform.setContentSize(
      this.config.designWidth,
      this.config.designHeight,
    );
    return { node, graphics: graphicsNode.addComponent(Graphics) };
  }

  private createLabel(
    name: string,
    text: string,
    fontSize: number,
    width: number,
    height: number,
    color: Color,
    parent: Node = this.node,
  ): Label {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.25);
    label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.enableWrapText = true;
    return label;
  }

  private updateDebugLabel(): void {
    const roundedY = Math.round(this.playerMotion.y);
    const roundedVelocity = Math.round(this.playerMotion.velocityY);
    const roundedSpeed = Math.round(this.currentDifficulty.scrollSpeed);
    const roundedGap = Math.round(this.currentDifficulty.gapHeight);
    let lightningStatus = '无';
    for (let index = 0; index < this.activeObstaclePairs.length; index += 1) {
      const pair = this.activeObstaclePairs[index];
      if (pair.spec?.topType === 'lightning') {
        const phase = pair.motion.snapshot.lightningPhase;
        lightningStatus = phase === 'warning' ? '预警' : phase === 'active' ? '生效' : '冷却';
        break;
      }
    }
    this.debugLabel.string =
      `状态：${this.state}  高度：${roundedY}  速度：${roundedVelocity}\n` +
      `滚动：${roundedSpeed}  通道：${roundedGap}  雷电：${lightningStatus}`;
  }
}
