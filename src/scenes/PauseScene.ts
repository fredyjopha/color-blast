import gsap from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { Application, Container, Graphics, Sprite } from "pixi.js";
import { sfx } from "../app/audio";
import { storage } from "../app/storage";
import { GameManager } from "../managers/GameManager";
import { SceneManager } from "../managers/SceneManager";
import { SDKManager } from "../managers/SDKManager";
import { Scene } from "./Scenes";

gsap.registerPlugin(PixiPlugin);

export class PauseScene extends Scene {
  private playButton: Container;
  private audioButton: Container;
  private restartButton: Container;
  private homeButton: Container;

  constructor(
    app: Application,
    sceneManager: SceneManager,
    gameManager: GameManager
  ) {
    super(app, sceneManager, gameManager);

    this.playButton = new Container();
    this.audioButton = new Container();
    this.restartButton = new Container();
    this.homeButton = new Container();

    this.init();
    this.resize();
  }

  private getLayoutMetrics() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const base = Math.min(width, height);
    const scale = Math.max(0.5, Math.min(base / 800, 2));
    const spacing = 40 * scale;
    const buttonSize = 120 * scale;
    const playSize = 160 * scale;

    return {
      width,
      height,
      centerX,
      centerY,
      scale,
      spacing,
      buttonSize,
      playSize,
    };
  }

  private init() {
    // === PLAY BUTTON ===
    const playGraphic = new Graphics();
    const playSprite = Sprite.from("play");
    playSprite.anchor.set(0.5);
    this.playButton.addChild(playGraphic, playSprite);
    this.playButton.interactive = true;
    this.playButton.on("pointerdown", () => {
      gsap.to(this.playButton.scale, {
        x: 0.9,
        y: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onStart: () => {
          sfx.play("audio/light-switch-on.wav", {
            volume: 0.2,
          });
        },
        onComplete: () => {
          setTimeout(async () => {
            const shouldShowAd = storage.ifShouldShowAd();
            if (shouldShowAd) {
              const sdk = SDKManager.getInstance();
              await sdk.showRewardedAd(
                () => {},
                () => {
                  setTimeout(async () => {
                    await this.sceneManager.switchScene("game");
                  }, 5);
                },
                (error: { code: string; message: string }) => {
                  console.log("Home Button error :: ", error);
                  setTimeout(async () => {
                    await this.sceneManager.switchScene("game");
                  }, 5);
                },
                "midgame"
              );
            } else {
              await this.sceneManager.switchScene("game");
            }
          }, 100);
        },
      });
    });
    this.container.addChild(this.playButton);

    // === AUDIO BUTTON ===
    const audioGraphic = new Graphics();
    const audioSprite = Sprite.from(
      this.gameManager.isMuted() ? "audio-off" : "audio-on"
    );
    audioSprite.anchor.set(0.5);
    this.audioButton.addChild(audioGraphic, audioSprite);
    this.audioButton.interactive = true;
    this.audioButton.on("pointerdown", () => {
      gsap.to(this.audioButton.scale, {
        x: 0.9,
        y: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onStart: () => {
          sfx.play("audio/light-switch-on.wav", {
            volume: 0.2,
          });
        },
        onComplete: () => {
          this.gameManager.toggleSound();
          audioSprite.texture = Sprite.from(
            this.gameManager.isMuted() ? "audio-off" : "audio-on"
          ).texture;
        },
      });
    });
    this.container.addChild(this.audioButton);

    // === RESTART BUTTON ===
    const restartGraphic = new Graphics();
    const restartSprite = Sprite.from("restart");
    restartSprite.anchor.set(0.5);
    this.restartButton.addChild(restartGraphic, restartSprite);
    this.restartButton.interactive = true;
    this.restartButton.on("pointerdown", () => {
      gsap.to(this.restartButton.scale, {
        x: 0.9,
        y: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onStart: () => {
          sfx.play("audio/light-switch-on.wav", {
            volume: 0.2,
          });
        },
        onComplete: () => {
          storage.setStorageItem("storegridelements", []);
          storage.setStorageItem("score", 0);
          setTimeout(async () => {
            const shouldShowAd = storage.ifShouldShowAd();
            if (shouldShowAd) {
              const sdk = SDKManager.getInstance();
              await sdk.showRewardedAd(
                () => {},
                () => {
                  setTimeout(async () => {
                    await this.sceneManager.switchScene("game");
                  }, 5);
                },
                (error: { code: string; message: string }) => {
                  console.log("Home Button error :: ", error);
                  setTimeout(async () => {
                    await this.sceneManager.switchScene("game");
                  }, 5);
                },
                "midgame"
              );
            } else {
              await this.sceneManager.switchScene("game");
            }
          }, 1000);
        },
      });
    });
    this.container.addChild(this.restartButton);

    // === HOME BUTTON ===
    const homeGraphic = new Graphics();
    const homeSprite = Sprite.from("home");
    homeSprite.anchor.set(0.5);
    this.homeButton.addChild(homeGraphic, homeSprite);
    this.homeButton.interactive = true;
    this.homeButton.on("pointerdown", () => {
      gsap.to(this.homeButton.scale, {
        x: 0.9,
        y: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onStart: () => {
          sfx.play("audio/light-switch-on.wav", {
            volume: 0.2,
          });
        },
        onComplete: () => {
          setTimeout(async () => {
            await this.sceneManager.switchScene("home");
          }, 100);
        },
      });
    });
    this.container.addChild(this.homeButton);
  }

  resize() {
    const { centerX, centerY, scale, spacing, buttonSize, playSize } =
      this.getLayoutMetrics();

    const positionButton = (
      button: Container,
      color: number,
      textureIndex: number,
      size: number,
      x: number,
      y: number
    ) => {
      const graphic = button.getChildAt(0) as Graphics;
      const icon = button.getChildAt(textureIndex) as Sprite;

      graphic.clear();
      graphic.roundRect(0, 0, size, size, 20 * scale);
      graphic.fill(color);

      icon.scale.set(
        (size / Math.max(icon.texture.width, icon.texture.height)) * 0.7
      );
      icon.position.set(size / 2, size / 2);

      button.pivot.set(size / 2, size / 2);
      button.position.set(x, y);
      button.scale.set(1);
    };

    // Position PLAY (plus mis en valeur)
    positionButton(
      this.playButton,
      0x9acd32,
      1,
      playSize,
      centerX,
      centerY - (playSize + spacing)
    );

    // Position AUDIO, RESTART, HOME en ligne sous le bouton play
    const totalWidth = 3 * buttonSize + 2 * spacing;
    const startX = centerX - totalWidth / 2;

    positionButton(
      this.audioButton,
      0x75bfff,
      1,
      buttonSize,
      startX + buttonSize / 2,
      centerY + spacing
    );

    positionButton(
      this.restartButton,
      0xffa500,
      1,
      buttonSize,
      startX + buttonSize * 1.5 + spacing,
      centerY + spacing
    );

    positionButton(
      this.homeButton,
      0xff4b6e,
      1,
      buttonSize,
      startX + buttonSize * 2.5 + spacing * 2,
      centerY + spacing
    );
  }

  update() {}
  destroy() {}
}
