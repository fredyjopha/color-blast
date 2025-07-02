import gsap from "gsap";
import { GlowFilter, ShockwaveFilter } from "pixi-filters";
import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Ticker,
} from "pixi.js";
import { sfx } from "../app/audio";
import { storage } from "../app/storage";
import { GameManager } from "../managers/GameManager";
import { SceneManager } from "../managers/SceneManager";
import { SDKManager } from "../managers/SDKManager";
import {
  defaultGridElement,
  GridElement,
  GroupCounter,
  ShortElement,
} from "../types";
import {
  getSortedCellsByDistance,
  getSortedCellsByUserClickCenterDistance,
} from "../utils/distanceSorter";
import { findGroups, hasSelectedConfiormation } from "../utils/groups";
import { Platform } from "./../core/Platform";
import { UIManager } from "./../ui/UIManager";
import { Scene } from "./Scenes";

export class GameScene extends Scene {
  private gridContainer: Container;
  private grid: Graphics[][];
  private elements: GridElement[][];
  private platform: Platform;
  private currentColors: number[] = [
    0xff7748, 0x75bfff, 0x9acd32, 0xff69b4, 0xffc107,
  ];
  private score: number = 0;
  private bestScore: number = 0;
  private spawnTimer: number = 0;
  private spawnInterval: number = 0.8;
  private groupIdCounter: GroupCounter;
  private removalCount: number = 0;
  private tutorialShown: boolean = false;
  private neverShowTutorial: boolean = false;
  public isStartGame: boolean = false;
  private isGameOver: boolean = false;
  private sizeGrid: number = 10;
  private isAnimating: boolean = false;
  private resizeDebounce: ReturnType<typeof setTimeout> | null = null;
  private cells: { row: number; col: number; distance: number }[];
  private groupIdTutorial: number = 0;
  private currentPowerUpColor: number = 0xdfdfdf;
  private isCombo: boolean = false;
  private storeElement: ShortElement[] = [];
  private uiManager: UIManager;
  private ifPowerUpIsDisplaying: boolean = false;
  public isPowerUpActive: boolean = false;
  private lastBannerRefresh: number = 0; // Track last banner refresh time
  private animationDuration: number = 0.5;
  private filledCount: number = 0;
  private frame: Graphics;

  constructor(
    app: Application,
    sceneManager: SceneManager,
    gameManager: GameManager
  ) {
    super(app, sceneManager, gameManager);
    this.platform = new Platform(app.screen.width, app.screen.height);
    this.frame = new Graphics();
    this.gridContainer = new Container();
    this.container.addChild(this.gridContainer, this.frame);
    this.grid = Array(this.sizeGrid)
      .fill(null)
      .map(() => Array(this.sizeGrid).fill(null));
    this.elements = Array(this.sizeGrid)
      .fill(null)
      .map(() => Array(this.sizeGrid).fill(defaultGridElement));
    this.groupIdCounter = {
      currentId: 0,
      nextId() {
        this.currentId++;
        if (this.currentId > 100) {
          this.currentId = 1;
          storage.setStorageItem("lastGroupId", 0);
        }
        storage.setStorageItem("lastGroupId", this.currentId);
        return this.currentId;
      },
    };
    this.cells = getSortedCellsByDistance(this.sizeGrid);
    this.uiManager = new UIManager();

    this.container.addChild(this.uiManager);
    this.initStorage().then(() => {
      this.reset();
    });
  }

  private async initStorage() {
    try {
      // Fetch storage values asynchronously
      this.score = storage.getStorageItem("score");
      this.bestScore = storage.getStorageItem("bestScore");
      this.tutorialShown = storage.getStorageItem("tutorialShown");
      this.neverShowTutorial = storage.getStorageItem("neverShowTutorial");
      this.storeElement = storage.getStorageItem("storegridelements");
      this.groupIdCounter.currentId =
        storage.getStorageItem("lastGroupId") || 0;
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      // Use default values if storage fetch fails
    }
  }

  private async createBanner() {
    const sdk = SDKManager.getInstance();
    const bannerId = "banner-ad-container-crazygames-inner";
    const currentTime = Date.now();

    // Clear existing banner if it exists
    const existingBanner = document.getElementById(bannerId);
    if (existingBanner) {
      await sdk.clearBanner(bannerId);
      existingBanner.remove();
    }

    // Only create banner in portrait mode
    if (!this.platform.isPortrait) {
      console.log("Skipping banner creation: Not in portrait mode");
      return;
    }

    // Check 60-second refresh delay
    if (currentTime - this.lastBannerRefresh < 60 * 1000) {
      console.warn(
        `Cannot refresh banner yet. Wait ${
          60 - (currentTime - this.lastBannerRefresh) / 1000
        } seconds.`
      );
      return;
    }

    // Portrait mode: Select banner size based on screen width
    const portraitBanners = [
      { width: 728, height: 90 },
      { width: 468, height: 60 },
      { width: 320, height: 50 },
    ];
    const screenWidth = this.app.screen.width;
    const selectedBanner =
      portraitBanners.find((b) => b.width <= screenWidth) ||
      portraitBanners[portraitBanners.length - 1]; // Fallback to smallest

    // Create new banner container
    const banner = document.createElement("div");
    banner.id = bannerId;
    banner.style.position = "fixed";
    banner.style.zIndex = "9999";
    banner.style.width = `${selectedBanner.width}px`;
    banner.style.height = `${selectedBanner.height}px`;
    banner.style.bottom = "0";
    banner.style.left = "50%";
    banner.style.transform = "translateX(-50%)";

    document.body.appendChild(banner);
    await sdk.showBannerAd(
      bannerId,
      selectedBanner.width,
      selectedBanner.height
    );

    this.lastBannerRefresh = currentTime;
  }

  private updateSpawnInterval(): void {
    if (!this.tutorialShown && !this.neverShowTutorial) return;

    if (this.filledCount >= 85) {
      this.spawnInterval = 0.25; // Game Over
      this.animationDuration = 0.25;
    } else if (this.filledCount >= 67) {
      this.spawnInterval = 0.35;
      this.animationDuration = 0.35;
    } else if (this.filledCount >= 51) {
      this.spawnInterval = 0.5;
      this.animationDuration = 0.4;
    } else if (this.filledCount >= 34) {
      this.spawnInterval = 0.65;
      this.animationDuration = 0.45;
    } else {
      this.spawnInterval = 0.8;
      this.animationDuration = 0.5;
    }
  }

  private updateFrame(pathCount: number): void {
    this.frame.clear();

    const gridWidth = this.platform.screenWidth;
    const gridHeight = this.platform.screenHeight;
    const centerX = gridWidth / 2;
    const centerY = gridHeight / 2;
    const progress = pathCount / 100;

    let color = 0x000000; // Vert jaune par défaut
    const thickness = this.platform.squareSize;

    if (pathCount >= 100) {
      color = 0x000000; // Jaune ambre
      // thickness = this.platform.squareSize * 2;
    } else if (pathCount >= 85) {
      color = 0xffc107; // Jaune ambre
      // thickness = this.platform.squareSize * 2;
    } else if (pathCount >= 67) {
      color = 0xff7748; // Orange corail
      // thickness = this.platform.squareSize;
    } else if (pathCount >= 51) {
      color = 0xff69b4; // Rose vif
      // thickness = this.platform.squareSize / 2;
    } else if (pathCount >= 34) {
      color = 0x75bfff; // Bleu ciel
      // thickness = this.platform.squareSize / 4;
    } else {
      color = 0x9acd32;
      //thickness = this.platform.squareSize / 6;
    }

    const totalLength = centerY + gridWidth / 2; // Longueur approximative par trace (mi-hauteur + moitié largeur)
    const maxLength = totalLength * progress;

    // Tracé gauche haut
    const leftTopPath = [
      { x1: 0, y1: centerY, x2: 0, y2: 0, len: centerY }, // Monte vers le haut
      { x1: 0, y1: 0, x2: centerX, y2: 0, len: centerX }, // Vers le centre en haut
    ];

    // Tracé gauche bas
    const leftBottomPath = [
      { x1: 0, y1: centerY, x2: 0, y2: gridHeight, len: gridHeight - centerY }, // Descend vers le bas
      { x1: 0, y1: gridHeight, x2: centerX, y2: gridHeight, len: centerX }, // Vers le centre en bas
    ];

    // Tracé droit haut
    const rightTopPath = [
      { x1: gridWidth, y1: centerY, x2: gridWidth, y2: 0, len: centerY }, // Monte vers le haut
      { x1: gridWidth, y1: 0, x2: centerX, y2: 0, len: centerX }, // Vers le centre en haut
    ];

    // Tracé droit bas
    const rightBottomPath = [
      {
        x1: gridWidth,
        y1: centerY,
        x2: gridWidth,
        y2: gridHeight,
        len: gridHeight - centerY,
      }, // Descend vers le bas
      {
        x1: gridWidth,
        y1: gridHeight,
        x2: centerX,
        y2: gridHeight,
        len: centerX,
      }, // Vers le centre en bas
    ];

    // Fonction pour dessiner un chemin
    const drawPath = (
      segments: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        len: number;
      }[],
      maxLength: number
    ) => {
      let drawn = 0;
      for (const seg of segments) {
        if (drawn >= maxLength) break;

        const remain = maxLength - drawn;
        const len = Math.min(remain, seg.len);
        const ratio = len / seg.len;

        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;

        const x = seg.x1 + dx * ratio;
        const y = seg.y1 + dy * ratio;

        this.frame.moveTo(seg.x1, seg.y1);
        this.frame.lineTo(x, y);

        drawn += len;
      }
    };

    // Dessiner les quatre traces
    drawPath(leftTopPath, maxLength);
    drawPath(leftBottomPath, maxLength);
    drawPath(rightTopPath, maxLength);
    drawPath(rightBottomPath, maxLength);

    this.frame.stroke({
      color,
      width: thickness,
      cap: "round",
      join: "round",
    });
  }

  private init() {
    for (let row = 0; row < this.sizeGrid; row++) {
      for (let col = 0; col < this.sizeGrid; col++) {
        const square = new Graphics();
        square.roundRect(
          0,
          0,
          this.platform.squareSize,
          this.platform.squareSize,
          Math.floor(this.platform.squareSize / 8)
        );
        square.fill(0xdfdfdf);
        square.pivot.set(
          this.platform.squareSize / 2,
          this.platform.squareSize / 2
        );
        square.position.set(
          this.platform.offsetX +
            col * (this.platform.squareSize + this.platform.spacing) +
            this.platform.squareSize / 2,
          this.platform.offsetY +
            row * (this.platform.squareSize + this.platform.spacing) +
            this.platform.squareSize / 2
        );
        square.scale.set(0);
        this.grid[row][col] = square;
        this.gridContainer.addChild(square);
      }
    }
    this.gridContainer.position.set(0, 0); // Grid container is offset by platform.offsetX/Y
    this.frame.position.set(0, 0);
    this.uiManager.updateLayout(
      this.app.screen.width,
      this.app.screen.height,
      this.platform.offsetX,
      this.platform.offsetY,
      this.platform.squareSize,
      this.platform.isPortrait
    );
    this.resize();
  }

  private createShockwave(
    x: number,
    y: number,
    squareSize: number,
    delayStart: number
  ): void {
    const shockwaveFilter = new ShockwaveFilter();
    this.container.filters = [shockwaveFilter];
    shockwaveFilter.center = { x, y };
    shockwaveFilter.radius = squareSize * 7;
    shockwaveFilter.amplitude = squareSize * 0.3;
    shockwaveFilter.wavelength = squareSize * 2;
    shockwaveFilter.time = 0;

    gsap.to(shockwaveFilter, {
      time: 1,
      duration: 0.4,
      ease: "power2.out",
      delay: delayStart,
      onStart: () => {
        sfx.play("audio/powerup-bomb.wav", { volume: 0.3 });
      },
      onComplete: () => {
        this.container.filters = [];
      },
    });
  }

  setTutorialShown(value: boolean): void {
    this.tutorialShown = value;
    storage.setStorageItem("tutorialShown", value);
  }

  setNeverShowTutorial(value: boolean): void {
    this.neverShowTutorial = value;
    storage.setStorageItem("neverShowTutorial", value);
  }

  resize() {
    if (this.resizeDebounce !== null) {
      clearTimeout(this.resizeDebounce);
      this.resizeDebounce = null;
    }
    this.isAnimating = true;
    this.resizeDebounce = setTimeout(() => {
      this.platform.resize(this.app.screen.width, this.app.screen.height);
      this.createBanner();
      for (let row = 0; row < this.sizeGrid; row++) {
        for (let col = 0; col < this.sizeGrid; col++) {
          this.grid[row][col].clear();
          this.grid[row][col].roundRect(
            0,
            0,
            this.platform.squareSize,
            this.platform.squareSize,
            Math.floor(this.platform.squareSize / 8)
          );
          this.grid[row][col].fill(0xdfdfdf);
          this.grid[row][col].pivot.set(
            this.platform.squareSize / 2,
            this.platform.squareSize / 2
          );
          this.grid[row][col].position.set(
            this.platform.offsetX +
              col * (this.platform.squareSize + this.platform.spacing) +
              this.platform.squareSize / 2,
            this.platform.offsetY +
              row * (this.platform.squareSize + this.platform.spacing) +
              this.platform.squareSize / 2
          );
        }
      }
      this.gridContainer.position.set(0, 0);
      this.frame.position.set(0, 0);
      this.uiManager.updateLayout(
        this.app.screen.width,
        this.app.screen.height,
        this.platform.offsetX,
        this.platform.offsetY,
        this.platform.squareSize,
        this.platform.isPortrait
      );
      this.resizeElement();
      this.isAnimating = false;
      this.resizeDebounce = null;
      if (!this.isStartGame) {
        let cellCounter = 0;
        [...this.cells].forEach(({ row, col, distance }) => {
          gsap.killTweensOf(this.grid[row][col]);
          gsap.to(this.grid[row][col].scale, {
            x: 1,
            y: 1,
            duration: 0.2,
            delay: (this.sizeGrid - distance) * 0.05,
            onComplete: () => {
              cellCounter++;
              if (cellCounter === this.cells.length) {
                this.loadInitialGrid();
                //this.updateFrame();
              }
            },
          });
        });
      }
    }, 400);
  }

  resizeElement() {
    for (let row = 0; row < this.sizeGrid; row++) {
      for (let col = 0; col < this.sizeGrid; col++) {
        if (
          this.elements[row][col].sprite !== null &&
          !this.elements[row][col].isEmpty
        ) {
          const sprite = this.elements[row][col].sprite!;
          sprite.position.set(
            this.grid[row][col].position.x,
            this.grid[row][col].position.y
          );
          sprite.height = this.grid[row][col].height;
          sprite.width = this.grid[row][col].width;
          sprite.interactive = true;
          sprite.eventMode = "static";
          sprite.anchor.set(0.5);
          sprite.hitArea = new Rectangle(
            -this.platform.squareSize / 2,
            -this.platform.squareSize / 2,
            this.platform.squareSize,
            this.platform.squareSize
          );
        }
      }
    }
  }

  public update(time: Ticker) {
    if (
      this.isAnimating ||
      !this.isStartGame ||
      this.tutorialShown ||
      this.isPowerUpActive
    )
      return;
    this.spawnTimer += time.deltaTime / 60;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnElement();
      this.spawnTimer = 0;
    }
  }

  private async loadInitialGrid() {
    const initialElements: ShortElement[] = this.storeElement;
    let initDataCount = 0;
    const initDataLength = initialElements.length;
    if (initDataLength > 0) {
      [...initialElements].forEach(({ row, col, color }) => {
        if (
          row >= 0 &&
          row < this.sizeGrid &&
          col >= 0 &&
          col < this.sizeGrid &&
          this.elements[row][col].sprite === null &&
          this.elements[row][col].isEmpty
        ) {
          const spriteContainer = new Container();
          const rectColored = new Graphics()
            .roundRect(
              0,
              0,
              this.platform.squareSize,
              this.platform.squareSize,
              Math.floor(this.platform.squareSize / 8)
            )
            .fill(color);
          const texture = this.app.renderer.generateTexture(rectColored);
          const sprite = new Sprite(texture);
          sprite.anchor.set(0.5);
          sprite.position.set(
            this.grid[row][col].position.x,
            this.grid[row][col].position.y
          );
          sprite.scale.set(0);
          gsap.to(sprite.scale, {
            x: 1,
            y: 1,
            delay: 0.5 + Math.random() * 0.5,
            duration: 1,
            ease: "elastic.inOut",
            onComplete: () => {
              initDataCount++;
              if (initDataLength === initDataCount) {
                if (!this.tutorialShown && !this.neverShowTutorial) {
                  this.spawnInterval = 0.2;
                }

                this.filledCount = [...this.elements]
                  .flat()
                  .filter((elem) => elem.sprite !== null).length;

                const teewnObject = { progress: 0 };

                gsap.to(teewnObject, {
                  progress: this.filledCount,
                  duration: 0.5,
                  onUpdate: () => {
                    const frame = teewnObject.progress;
                    this.updateFrame(frame);
                  },
                  onComplete: () => {
                    this.updateSpawnInterval();
                    this.isStartGame = true;
                  },
                });
              }
            },
          });
          sprite.interactive = true;
          sprite.on("pointerdown", () => this.handleClick(row, col));
          spriteContainer.addChild(sprite);
          this.gridContainer.addChild(spriteContainer);
          this.elements[row][col] = {
            sprite,
            color,
            groupId: null,
            row,
            col,
            conformation: null,
            isEmpty: false,
            isMatch: false,
          };
          this.updateGroups(row, col);
        }
      });
    } else {
      if (!this.tutorialShown && !this.neverShowTutorial) {
        this.spawnInterval = 0.2;
      }
      this.isStartGame = true;
    }
  }

  private spawnElement() {
    if (this.isAnimating || this.tutorialShown || this.isPowerUpActive) return;

    const countElements = [...this.elements]
      .flat()
      .filter((elem) => elem.sprite !== null).length;
    const emptySpots: { row: number; col: number }[] = [];
    for (let row = 0; row < this.sizeGrid; row++) {
      for (let col = 0; col < this.sizeGrid; col++) {
        if (
          this.elements[row][col].isEmpty &&
          this.elements[row][col].sprite === null
        ) {
          emptySpots.push({ row, col });
        }
      }
    }

    if (emptySpots.length === 0) {
      this.isGameOver = true;
      this.gameOver();
      return;
    }

    const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
    const neighborColors: number[] = [];
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dr, dc] of directions) {
      const nr = spot.row + dr;
      const nc = spot.col + dc;
      if (
        nr >= 0 &&
        nr < this.sizeGrid &&
        nc >= 0 &&
        nc < this.sizeGrid &&
        !this.elements[nr][nc].isEmpty
      ) {
        neighborColors.push(this.elements[nr][nc].color);
      }
    }
    const color =
      neighborColors.length > 0 && Math.random() < 0.7
        ? neighborColors[Math.floor(Math.random() * neighborColors.length)]
        : this.currentColors[
            Math.floor(Math.random() * this.currentColors.length)
          ];

    const spriteContainer = new Container();
    const rectColored = new Graphics()
      .roundRect(
        0,
        0,
        this.platform.squareSize,
        this.platform.squareSize,
        Math.floor(this.platform.squareSize / 8)
      )
      .fill(color);
    const texture = this.app.renderer.generateTexture(rectColored);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.scale.set(0);
    spriteContainer.addChild(sprite);
    this.gridContainer.addChild(spriteContainer);

    this.elements[spot.row][spot.col] = {
      sprite,
      color,
      groupId: null,
      row: spot.row,
      col: spot.col,
      conformation: null,
      isEmpty: false,
      isMatch: false,
    };

    this.isAnimating = true;

    this.filledCount = [...this.elements]
      .flat()
      .filter((elem) => elem.sprite !== null).length;

    const teewnObject = { progress: countElements };

    gsap.to(teewnObject, {
      progress: this.filledCount,
      duration: this.animationDuration,
      onUpdate: () => {
        const frame = teewnObject.progress;
        this.updateFrame(frame);
      },
      onComplete: () => {
        this.updateSpawnInterval();
      },
    });

    gsap.to(sprite.scale, {
      x: 1,
      y: 1,
      duration: this.animationDuration,
      ease: "elastic.inOut",
      onStart: () => {
        sfx.play("audio/popping-open-hand-cream-bottle-lid.wav", {
          volume: 0.1,
        });
      },
      onUpdate: () => {
        if (this.grid[spot.row] && this.grid[spot.row][spot.col]) {
          sprite.position.set(
            this.grid[spot.row][spot.col].position.x,
            this.grid[spot.row][spot.col].position.y
          );
        }
      },
      onComplete: () => {
        this.isAnimating = false;
        if (this.grid[spot.row] && this.grid[spot.row][spot.col]) {
          sprite.position.set(
            this.grid[spot.row][spot.col].position.x,
            this.grid[spot.row][spot.col].position.y
          );
        }
        sprite.interactive = true;
        sprite.eventMode = "static";
        sprite.hitArea = new Rectangle(
          -this.platform.squareSize / 2,
          -this.platform.squareSize / 2,
          this.platform.squareSize,
          this.platform.squareSize
        );

        sprite.on("pointerdown", () => this.handleClick(spot.row, spot.col));

        if (!this.tutorialShown && !this.neverShowTutorial) {
          const countGroup = this.countGroupById();
          const filteredCountMap: { [key: number]: number } = {};
          Object.entries(countGroup).forEach(([groupId, count]) => {
            if (count >= 3) filteredCountMap[Number(groupId)] = count;
          });
          const length = Object.keys(filteredCountMap).length;
          const firstElement = Object.entries(filteredCountMap)[0];
          if (length === 1 && firstElement[1] >= 3) {
            this.spawnInterval = 0.8;
            this.groupIdTutorial = Number(firstElement[0]);
            this.setTutorialShown(true);
            this.isAnimating = true;
            this.showTutorial(this.groupIdTutorial);
          }
        }
      },
    });

    this.updateGroups(spot.row, spot.col);
    this.updatePowerUp();
    this.saveGameElements();
  }

  private saveGameElements() {
    const saveElement: ShortElement[] = [...this.elements]
      .flat()
      .filter((elem) => elem.sprite !== null)
      .map((elem) => ({
        row: elem.row,
        col: elem.col,
        color: elem.color,
      }));
    storage.setStorageItem("storegridelements", saveElement);
  }

  private handleClick(row: number, col: number) {
    if (
      this.isGameOver ||
      (!this.tutorialShown && !this.neverShowTutorial) ||
      this.isPowerUpActive
    )
      return;
    const element = this.elements[row][col];
    if (!element || !element.groupId) return;

    const group = this.elements
      .flat()
      .filter((item) => item.groupId === element.groupId);
    if (group.length < 3) return;

    const countElements = [...this.elements]
      .flat()
      .filter((elem) => elem.sprite !== null).length;

    this.removalCount++;
    let points = group.length;
    this.isCombo = group.length >= 25;
    if (this.isCombo) points *= 2;

    this.score += points;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      storage.setStorageItem("bestScore", this.bestScore);
    }
    const data = { valeur: Number(this.uiManager.scoreUI.scoreText.text) };
    gsap.to(data, {
      valeur: this.score,
      duration: 0.1,
      ease: "power1.out",
      onUpdate: () => {
        this.uiManager.scoreUI.scoreText.text = Math.floor(
          data.valeur
        ).toString();
      },
      onComplete: () => {
        storage.setStorageItem("score", this.score);
      },
    });
    this.uiManager.scoreUI.bestScoreText.text = `${this.bestScore}`;

    const groupBySpiral = getSortedCellsByUserClickCenterDistance(
      row,
      col,
      group as GridElement[]
    );
    this.isAnimating = true;

    const centerX =
      this.platform.offsetX +
      (groupBySpiral.reduce((sum, cell) => sum + cell.col, 0) / group.length) *
        (this.platform.squareSize + this.platform.spacing) +
      this.platform.squareSize / 2;
    const centerY =
      this.platform.offsetY +
      (groupBySpiral.reduce((sum, cell) => sum + cell.row, 0) / group.length) *
        (this.platform.squareSize + this.platform.spacing) +
      this.platform.squareSize / 2;

    if (this.isCombo) {
      const shakeDuration = 0.15; // 0.15 seconde totale
      const shakeTimeline = gsap.timeline({
        onComplete: () => {
          this.gridContainer.position.set(0, 0);
          const flash = new Graphics()
            .rect(0, 0, this.app.screen.width, this.app.screen.height)
            .fill({ color: element.color, alpha: 0.45 });
          this.container.addChild(flash);
          gsap.to(flash, {
            alpha: 0,
            duration: 0.3,
            ease: "power2.out",
            delay: 0.15,
            onComplete: () => flash.destroy(),
          });

          const globalPosition =
            this.elements[row][col].sprite!.getGlobalPosition();
          this.createShockwave(
            globalPosition.x,
            globalPosition.y,
            this.platform.squareSize,
            0.15
          );
        },
      });

      // Ajouter 5 oscillations aléatoires autour de la position initiale
      for (let i = 0; i < 5; i++) {
        const randomX = (Math.random() - 0.5) * this.platform.squareSize; // Décalage aléatoire entre -5 et 5
        const randomY = (Math.random() - 0.5) * this.platform.squareSize; // Décalage aléatoire entre -5 et 5
        shakeTimeline.to(this.gridContainer, {
          x: randomX,
          y: randomY,
          duration: shakeDuration / 10, // 0.015 seconde par oscillation
          ease: "power1.inOut",
        });
      }
    }

    let animationsCompleted = 0;
    const totalAnimations = group.length;
    if (!this.isCombo) {
      sfx.play("audio/robinhood-swoosh.wav", { volume: 0.2 });
    }
    groupBySpiral.forEach(({ row, col, distance }) => {
      const color = this.elements[row][col].color;
      this.elements[row][col].sprite?.off("pointerdown");
      if (this.elements[row][col].sprite !== null) {
        const sprite = this.elements[row][col].sprite!;
        const spriteContainer = sprite.parent;
        gsap.killTweensOf(sprite);
        gsap.killTweensOf(spriteContainer);
        gsap.to(sprite.scale, {
          x: 0,
          y: 0,
          duration: 0.2,
          ease: "power2.inOut",
          delay: Math.pow(distance, 0.8) * 0.05 + (this.isCombo ? 0.2 : 0),
          onComplete: () => {
            gsap.killTweensOf(sprite);
            this.gridContainer.removeChild(spriteContainer);
            this.elements[row][col] = defaultGridElement;
            animationsCompleted++;
            if (
              animationsCompleted > Math.floor(totalAnimations * 0.33) &&
              this.isCombo
            ) {
              this.isCombo = false;
              const comboText = new Text({
                text: "COMBO 2x",
                style: {
                  fill: 0xffffff,
                  stroke: {
                    color: element.color,
                    width: this.platform.squareSize / 10,
                  },
                  fontSize: this.platform.squareSize * 2,
                  fontWeight: "bold",
                  fontFamily: "Oswald-Regular",
                },
              });
              comboText.anchor.set(0.5);
              comboText.position.set(centerX, centerY);
              comboText.scale.set(0);
              this.container.addChild(comboText);

              gsap.to(comboText.scale, {
                x: 1,
                y: 1,
                duration: 0.3,
                ease: "back.out",
                onComplete: () => {
                  gsap.to(comboText.scale, {
                    x: 0,
                    y: 0,
                    duration: 0.3,
                    ease: "power2.in",
                    delay: 0.3,
                    onComplete: () => {
                      this.container.removeChild(comboText);
                    },
                  });
                },
              });
            }
            if (animationsCompleted === totalAnimations) {
              if (this.tutorialShown && this.isAnimating) {
                this.setTutorialShown(false);
                this.setNeverShowTutorial(true);
              }
              /////
              this.filledCount = [...this.elements]
                .flat()
                .filter((elem) => elem.sprite !== null).length;

              const teewnObject = { progress: countElements };
              const duration =
                groupBySpiral.length < 10
                  ? 0.15
                  : groupBySpiral.length >= 10 && groupBySpiral.length < 25
                    ? 0.25
                    : groupBySpiral.length / 100;

              gsap.to(teewnObject, {
                progress: this.filledCount,
                duration: duration,
                onUpdate: () => {
                  const frame = teewnObject.progress;
                  this.updateFrame(frame);
                },
                onComplete: () => {
                  this.updateSpawnInterval();
                  this.isAnimating = false;
                  this.reorganizeGroups();
                },
              });
              ////
              // this.isAnimating = false;
              // this.reorganizeGroups();
            }
          },
        });
        this.createExplosion(
          sprite.position.x,
          sprite.position.y,
          color,
          this.platform.squareSize,
          Math.pow(distance, 0.8) * 0.05 + (this.isCombo ? 0.2 : 0),
          false
        );
      }
    });

    this.updatePowerUp();
    this.uiManager.tutorialText.visible = false;
    if (this.uiManager.tutorialText.visible) {
      gsap.killTweensOf(this.uiManager.tutorialText);
      this.uiManager.tutorialText.visible = false;
    }
  }

  private reorganizeGroups() {
    for (let row = 0; row < this.sizeGrid; row++) {
      for (let col = 0; col < this.sizeGrid; col++) {
        if (!this.elements[row][col].isEmpty) {
          this.updateGroups(row, col);
        }
      }
    }
  }

  private createExplosion(
    x: number,
    y: number,
    blockColor: number,
    squareSize: number,
    delayStart: number,
    isPowerUp: boolean = false
  ): void {
    const particleCount = 12;
    const glowFilter = new GlowFilter({
      distance: 5,
      outerStrength: 1.5,
      innerStrength: 0,
      color: blockColor,
      quality: 0.2,
    });

    for (let i = 0; i < particleCount; i++) {
      const particle = new Graphics();
      const isCircle = i % 2 === 0;
      const particleSize = squareSize / 8;
      if (isCircle) {
        particle.circle(0, 0, particleSize);
      } else {
        particle.rect(0, 0, particleSize, particleSize);
      }
      particle.fill({ color: blockColor });
      particle.filters = [glowFilter];
      particle.x = x;
      particle.y = y;
      this.container.addChild(particle);

      const angle = (i / particleCount) * Math.PI * 2;
      const distance = squareSize * 0.4 + Math.random() * (squareSize * 0.6);
      const targetX = particle.x + Math.cos(angle) * distance;
      const targetY = particle.y + Math.sin(angle) * distance;
      const targetRotation = isCircle ? 0 : (Math.random() - 0.5) * Math.PI;

      const tweenObj = { progress: 0 };
      gsap.to(tweenObj, {
        progress: 1,
        duration: 0.5,
        ease: "power2.inOut",
        delay: isPowerUp ? delayStart : delayStart + i * 0.01,
        onComplete: () => particle.destroy(),
        onUpdate: () => {
          const p = tweenObj.progress;
          particle.x = x + (targetX - x) * p;
          particle.y = y + (targetY - y) * p;
          if (p > 0.8) {
            particle.scale.set(1 - p * 0.5);
            particle.alpha = 1 - p;
          }
          particle.rotation = targetRotation * p;
        },
      });
    }
  }

  private selecteConformation(
    row: number,
    col: number
  ): { selected: number[][]; groupIds: number[] } {
    const color = this.elements[row][col].color;
    const selected: number[][] = [];
    const groupIds: number[] = [];
    const visited = new Set<string>();
    const queue: { r: number; c: number; dx: number; dy: number }[] = [
      { r: row, c: col, dx: 0, dy: 0 },
    ];
    visited.add(`${row},${col}`);

    while (queue.length > 0) {
      const { r, c, dx, dy } = queue.shift()!;
      selected.push([dx, dy]);
      if (dx !== 0 || dy !== 0) {
        if (this.elements[r][c].groupId !== null) {
          groupIds.push(this.elements[r][c].groupId!);
        }
      }
      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (
          nr >= 0 &&
          nr < this.sizeGrid &&
          nc >= 0 &&
          nc < this.sizeGrid &&
          !visited.has(key) &&
          !this.elements[nr][nc].isEmpty &&
          this.elements[nr][nc].color === color
        ) {
          visited.add(key);
          queue.push({ r: nr, c: nc, dx: nr - row, dy: nc - col });
        }
      }
    }
    return { selected, groupIds: [...new Set(groupIds)] };
  }

  private refineConformation(
    neighbors: number[][],
    row: number,
    col: number
  ): number[][] {
    const selectedRefined = neighbors.filter(([dx, dy]) => {
      const newRow = row + dx;
      const newCol = col + dy;
      return (
        newRow >= 0 &&
        newRow < this.sizeGrid &&
        newCol >= 0 &&
        newCol < this.sizeGrid &&
        !this.elements[newRow][newCol].isEmpty &&
        this.elements[newRow][newCol].color === this.elements[row][col].color
      );
    });
    const conformation = hasSelectedConfiormation(selectedRefined);
    return conformation !== "" ? selectedRefined : [[0, 0]];
  }

  private updateGroups(row: number, col: number) {
    if (this.elements[row][col].isEmpty) return;

    const selectedNeighborColor = this.selecteConformation(row, col);
    if (selectedNeighborColor.selected.length < 2) {
      this.elements[row][col].groupId = null;
      this.elements[row][col].conformation = null;
      return;
    }

    selectedNeighborColor.selected = this.refineConformation(
      selectedNeighborColor.selected,
      row,
      col
    );
    const group = findGroups(
      this.elements,
      selectedNeighborColor,
      row,
      col,
      this.groupIdCounter
    );
    if (group.length >= 3) {
      group.forEach((elem) => (elem.isMatch = true));
    }
    this.deleteGroupIdsAlone();
  }

  private countNotMatchingColor() {
    const countColor: { [key: number]: number } = {};
    [...this.elements]
      .flat()
      .filter((elem) => elem.sprite !== null && !elem.isMatch && !elem.isEmpty)
      .forEach(({ color }) => {
        countColor[color] = (countColor[color] || 0) + 1;
      });
    return Object.entries(countColor).sort((a, b) => b[1] - a[1]);
  }

  private countSelectMatchingColor(color: number) {
    return [...this.elements]
      .flat()
      .filter(
        (elem) =>
          elem.sprite !== null &&
          !elem.isMatch &&
          !elem.isEmpty &&
          elem.color === color
      );
  }

  private countGroupById() {
    const countMap: { [key: number]: number } = {};
    for (let row = 0; row < this.sizeGrid; row++) {
      for (let col = 0; col < this.sizeGrid; col++) {
        const groupId = this.elements[row][col].groupId;
        if (groupId !== null) {
          countMap[groupId] = (countMap[groupId] || 0) + 1;
        }
      }
    }
    return countMap;
  }

  private deleteGroupIdsAlone() {
    const countMap = this.countGroupById();
    for (let row = 0; row < this.sizeGrid; row++) {
      for (let col = 0; col < this.sizeGrid; col++) {
        const element = this.elements[row][col];
        if (element.groupId !== null && countMap[element.groupId] === 1) {
          element.groupId = null;
          element.conformation = null;
          element.isMatch = false;
          if (element.sprite) element.sprite.filters = [];
        }
      }
    }
  }

  private updatePowerUp() {
    if (this.tutorialShown || !this.neverShowTutorial || this.isPowerUpActive)
      return;
    const countColor = this.countNotMatchingColor();
    if (
      countColor.length > 0 &&
      this.currentPowerUpColor !== Number(countColor[0][0])
    ) {
      if (Number(countColor[0][1]) >= 10 && !this.ifPowerUpIsDisplaying) {
        this.uiManager.setPowerUp(
          Number(countColor[0][0]),
          this.platform.squareSize,
          this.platform.isPortrait,
          this.platform.offsetX,
          this.platform.offsetY,
          this.app.screen,
          () => this.activatePowerUp(Number(countColor[0][0])),
          () => this.handleVideoAdClick()
        );
        this.currentPowerUpColor = Number(countColor[0][0]);
        this.ifPowerUpIsDisplaying = true;
      }
      if (this.ifPowerUpIsDisplaying && this.currentPowerUpColor !== 0xdfdfdf) {
        const currentGaugePowerUp = this.countSelectMatchingColor(
          this.currentPowerUpColor
        );
        if (currentGaugePowerUp.length < 5) {
          this.uiManager.clearPowerUp();
          this.currentPowerUpColor = 0xdfdfdf;
          this.ifPowerUpIsDisplaying = false;
        }
      }
    }
  }

  private async handleVideoAdClick() {
    //this.isPowerUpActive = true;

    const sdk = SDKManager.getInstance();

    await sdk.showRewardedAd(
      () => {
        this.sceneManager.stopTicker();
      },
      () => {
        this.switchPowerUpUI();
        this.sceneManager.startTicker();
        setTimeout(() => {
          this.removePowerUpElements(this.currentPowerUpColor);
        }, 100);
      },
      (error: { code: string; message: string }) => {
        console.log("PowerUp Error :: ", error);
        this.switchPowerUpUI();
        this.sceneManager.startTicker();
        setTimeout(() => {
          this.removePowerUpElements(this.currentPowerUpColor);
        }, 100);
      },
      "rewarded"
    );
  }

  public activatePowerUp(currentColor: number) {
    if (this.tutorialShown || !this.neverShowTutorial || this.isPowerUpActive)
      return;

    this.isPowerUpActive = true;
    this.uiManager.showGameUI(false);
    this.resizeElement();

    // Animer les éléments de couleur du power-up
    const group = [...this.elements]
      .flat()
      .filter((elem) => elem.sprite !== null && elem.color === currentColor);
    group.forEach((elem) => {
      if (elem.sprite) {
        gsap.to(elem.sprite, {
          y: elem.sprite.y - this.platform.squareSize * 0.1,
          duration: 0.2,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      }
    });

    //Afficher le bouton VideoAd
    this.uiManager.showVideoAd(
      () => {
        this.uiManager.updateLayout(
          this.app.screen.width,
          this.app.screen.height,
          this.platform.offsetX,
          this.platform.offsetY,
          this.platform.squareSize,
          this.platform.isPortrait
        );
      },
      () => {
        this.switchPowerUpUI();
        this.ifPowerUpIsDisplaying = false;
        this.currentPowerUpColor = 0xdfdfdf;
        group.forEach((elem) => {
          if (elem.sprite) {
            gsap.killTweensOf(elem.sprite);
            elem.sprite.position.set(
              this.grid[elem.row][elem.col].position.x,
              this.grid[elem.row][elem.col].position.y
            );
          }
        });
      }
    );
  }
  private switchPowerUpUI() {
    this.isPowerUpActive = false;
    this.uiManager.hideVideoAd();
    this.resizeElement();
  }

  private removePowerUpElements(currentColor: number) {
    if (this.tutorialShown || !this.neverShowTutorial) return;

    this.isAnimating = true;
    const countElements = [...this.elements]
      .flat()
      .filter((elem) => elem.sprite !== null).length;
    const group = this.elements
      .flat()
      .filter((elem) => elem.sprite !== null && elem.color === currentColor);

    let animationsCompleted = 0;
    const totalAnimations = group.length;
    if (!this.isCombo) {
      sfx.play("audio/robinhood-swoosh.wav", { volume: 0.2 });
    }
    group.forEach((elem) => {
      const color = this.elements[elem.row][elem.col].color;
      if (elem.sprite !== null) {
        gsap.killTweensOf(elem.sprite);
        gsap.killTweensOf(elem.sprite!.parent!);
        gsap.to(elem.sprite.scale, {
          x: 0,
          y: 0,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => {
            gsap.killTweensOf(this.elements[elem.row][elem.col].sprite);
            this.gridContainer.removeChild(
              this.elements[elem.row][elem.col].sprite!.parent!
            );
            this.elements[elem.row][elem.col] = defaultGridElement;
            animationsCompleted++;
            if (animationsCompleted === totalAnimations) {
              this.filledCount = [...this.elements]
                .flat()
                .filter((elem) => elem.sprite !== null).length;

              const teewnObject = { progress: countElements };
              const duration = group.length / 100;

              gsap.to(teewnObject, {
                progress: this.filledCount,
                duration: duration,
                onUpdate: () => {
                  const frame = teewnObject.progress;
                  this.updateFrame(frame);
                },
                onComplete: () => {
                  this.updateSpawnInterval();
                  this.isAnimating = false;
                  this.reorganizeGroups();
                  this.updatePowerUp();
                },
              });
            }
          },
        });
        this.createExplosion(
          elem.sprite!.position.x,
          elem.sprite!.position.y,
          color,
          this.platform.squareSize,
          0,
          true
        );
      }
    });
  }

  private showTutorial(groupId: number) {
    const groupList = this.elements
      .flat()
      .filter((item) => item.groupId === groupId);
    groupList.forEach(({ row, col }, i) => {
      if (
        this.elements[row][col].sprite &&
        typeof this.sizeGrid === "number" &&
        !isNaN(this.sizeGrid)
      ) {
        gsap.killTweensOf(this.elements[row][col].sprite);
        this.elements[row][col].sprite.zIndex = 1000;
        gsap.to(this.elements[row][col].sprite.scale, {
          x: 0.9,
          y: 0.9,
          duration: 0.4,
          yoyo: true,
          ease: "sine.inOut",
          repeat: Infinity,
          delay: i * 0.08,
        });
      }
    });
    this.uiManager.tutorialText.visible = true;
    this.uiManager.tutorialText.position.set(
      this.elements[groupList[0].row][groupList[0].col].sprite!.position.x,
      this.elements[groupList[0].row][groupList[0].col].sprite!.position.y +
        this.platform.squareSize * 0.4
    );
    gsap.to(this.uiManager.tutorialText.scale, {
      x: this.platform.isPortrait ? 0.4 : 0.8,
      y: this.platform.isPortrait ? 0.4 : 0.8,
      duration: 0.4,
      yoyo: true,
      ease: "sine.inOut",
      repeat: Infinity,
    });
  }

  private showPauseOverlay() {
    this.isAnimating = true;
    gsap.to(this.uiManager.pauseButton.view.scale, {
      x: 0.9,
      y: 0.9,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onStart: () => {
        sfx.play("audio/light-switch-on.wav", { volume: 0.2 });
      },
      onComplete: () => {
        setTimeout(async () => {
          this.isAnimating = false;
          await this.sceneManager.switchScene("pause");
        }, 100);
      },
    });
  }

  private setFinalScor(lastScore: number): void {
    storage.setStorageItem("lastScore", lastScore);
  }

  private async getCurrentScore() {
    try {
      this.score = storage.getStorageItem("score");
    } catch (error) {
      console.log("Can't get score data :", error);
    }
  }

  private gameOver() {
    this.isAnimating = true;
    let cellCounter = 0;
    [...this.cells].forEach(({ row, col, distance }) => {
      gsap.killTweensOf(this.grid[row][col]);
      gsap.killTweensOf(this.elements[row][col]);
      gsap.to(this.grid[row][col].scale, {
        x: 0,
        y: 0,
        duration: 0.2,
        delay: (distance - 0.5) * 0.05 + 0.01,
        onComplete: () => {
          cellCounter++;
          if (cellCounter === this.cells.length) {
            //const lastScore = storage.getStorageItem("score");
            this.getCurrentScore().then(() => {
              this.setFinalScor(this.score);
              setTimeout(async () => {
                storage.setStorageItem("storegridelements", []);
                storage.setStorageItem("score", 0);
                const shouldShowAd = storage.ifShouldShowAd();
                if (shouldShowAd) {
                  this.sceneManager.stopTicker();
                  const sdk = SDKManager.getInstance();
                  await sdk.showRewardedAd(
                    () => {},
                    () => {
                      setTimeout(async () => {
                        this.isAnimating = false;
                        this.sceneManager.startTicker();
                        await this.sceneManager.switchScene("gameOver");
                      }, 5);
                    },
                    (error: { code: string; message: string }) => {
                      console.log("Home Button error :: ", error);
                      setTimeout(async () => {
                        this.isAnimating = false;
                        this.sceneManager.startTicker();
                        await this.sceneManager.switchScene("gameOver");
                      }, 5);
                    },
                    "midgame"
                  );
                } else {
                  await this.sceneManager.switchScene("gameOver");
                }
              }, 10);
            });
          }
        },
      });
      if (this.elements[row][col].sprite) {
        gsap.to(this.elements[row][col].sprite!.scale, {
          x: 0,
          y: 0,
          duration: 0.2,
          delay: (this.sizeGrid - distance) * 0.05,
        });
      }
    });
  }
  public destroy() {
    // Remove all children from containers
    this.gridContainer.removeChildren();
    this.container.removeChildren();

    // Kill all GSAP animations
    gsap.killTweensOf(this.gridContainer);
    gsap.killTweensOf(this.uiManager);
    gsap.killTweensOf(this.container);
    this.elements.forEach((row) =>
      row.forEach((elem) => {
        if (elem.sprite) {
          elem.sprite.off("pointerdown");
          gsap.killTweensOf(elem.sprite);
          elem.sprite.destroy();
        }
      })
    );

    // Clear arrays and timers
    this.grid = [];
    this.elements = [];
    this.cells = [];
    if (this.resizeDebounce) {
      clearTimeout(this.resizeDebounce);
      this.resizeDebounce = null;
    }

    // Reset UI
    this.uiManager.clearPowerUp();
    this.uiManager.destroy();
  }
  public reset() {
    this.spawnTimer = 0;
    this.removalCount = 0;
    this.isStartGame = false;
    this.isGameOver = false;
    this.isAnimating = false;
    this.tutorialShown = false;
    this.currentPowerUpColor = 0xdfdfdf;
    this.ifPowerUpIsDisplaying = false;
    this.isPowerUpActive = false;
    this.isCombo = false;
    this.animationDuration = 0.5;
    this.spawnInterval = 0.8;
    this.filledCount = 0;
    //this.storeElement = storage.getStorageItem("storegridelements");

    // Clear existing grid and elements
    this.gridContainer.removeChildren();
    this.grid = Array(this.sizeGrid)
      .fill(null)
      .map(() => Array(this.sizeGrid).fill(null));
    this.elements = Array(this.sizeGrid)
      .fill(null)
      .map(() => Array(this.sizeGrid).fill(defaultGridElement));

    // Kill all GSAP animations
    gsap.killTweensOf(this.gridContainer);
    gsap.killTweensOf(this.uiManager);
    this.elements.forEach((row) =>
      row.forEach((elem) => {
        if (elem.sprite) gsap.killTweensOf(elem.sprite);
      })
    );

    // Reinitialize
    this.uiManager.scoreUI.scoreText.text = `${this.score}`;
    this.uiManager.scoreUI.bestScoreText.text = `${this.bestScore}`;
    this.uiManager.clearPowerUp();
    this.uiManager.tutorialText.visible = false;
    this.uiManager.pauseButton.onPress.connect(() => this.showPauseOverlay());
    this.init();
    //this.resize();
  }
}
