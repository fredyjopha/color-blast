import gsap from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { Application, Container, Graphics, Sprite, Text } from "pixi.js";
import { sfx } from "../app/audio";
import { storage } from "../app/storage";
import { GameManager } from "../managers/GameManager";
import { SceneManager } from "../managers/SceneManager";
import { SDKManager } from "../managers/SDKManager";
import { Scene } from "./Scenes";

gsap.registerPlugin(PixiPlugin);

export class GameOverScene extends Scene {
  private trophy: Sprite;
  private scoreText: Text;
  private restartButton: Container;
  private homeButton: Container;

  constructor(
    app: Application,
    sceneManager: SceneManager,
    gameManager: GameManager
  ) {
    super(app, sceneManager, gameManager);

    this.trophy = Sprite.from("trophy-score");
    this.trophy.anchor.set(0.5);

    this.scoreText = new Text({
      text: "Score: 0",
      style: {
        fontFamily: "Oswald-Regular",
        fill: 0x657887,
        fontSize: 48,
        align: "center",
      },
    });
    this.scoreText.anchor.set(0.5);

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

    return { width, height, centerX, centerY, scale, spacing, buttonSize };
  }

  private init() {
    // Add trophy and scoreText
    this.container.addChild(this.trophy, this.scoreText);

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
            const shouldShowAd = storage.ifShouldShowAd();
            if (shouldShowAd) {
              const sdk = SDKManager.getInstance();
              await sdk.showRewardedAd(
                () => {},
                () => {
                  setTimeout(async () => {
                    await this.sceneManager.switchScene("home");
                  }, 5);
                },
                (error: { code: string; message: string }) => {
                  console.log("Home Button error :: ", error);
                  setTimeout(async () => {
                    await this.sceneManager.switchScene("home");
                  }, 5);
                },
                "midgame"
              );
            } else {
              await this.sceneManager.switchScene("home");
            }
          }, 5);
        },
      });
    });
    this.container.addChild(this.homeButton);
  }

  resize() {
    const { centerX, centerY, scale, spacing, buttonSize } =
      this.getLayoutMetrics();

    // === Trophy ===
    this.trophy.position.set(centerX, centerY - 200 * scale);
    this.trophy.width = 150 * scale;
    this.trophy.height = 150 * scale;

    // === Score Text ===
    this.scoreText.text = storage.getStorageItem("lastScore");
    this.scoreText.position.set(centerX, centerY - 60 * scale);
    this.scoreText.style.fontSize = 48 * scale;

    // === Layout Buttons ===
    const totalWidth = buttonSize * 2 + spacing;
    const startX = centerX - totalWidth / 2;

    this.positionButton(
      this.restartButton,
      0xffa500,
      "restart",
      startX + buttonSize / 2,
      centerY + 60 * scale,
      buttonSize,
      scale
    );
    this.positionButton(
      this.homeButton,
      0xff4b6e,
      "home",
      startX + buttonSize * 1.5 + spacing,
      centerY + 60 * scale,
      buttonSize,
      scale
    );
  }

  private positionButton(
    button: Container,
    color: number,
    textureKey: string,
    x: number,
    y: number,
    size: number,
    scale: number
  ) {
    const graphic = button.getChildAt(0) as Graphics;
    const icon = button.getChildAt(1) as Sprite;

    graphic.clear();
    graphic.roundRect(0, 0, size, size, 20 * scale);
    graphic.fill(color);

    icon.texture = Sprite.from(textureKey).texture;
    icon.scale.set(
      (size / Math.max(icon.texture.width, icon.texture.height)) * 0.7
    );
    icon.position.set(size / 2, size / 2);

    button.pivot.set(size / 2, size / 2);
    button.position.set(x, y);
    button.scale.set(1);
  }

  update() {}
  destroy() {}
}
