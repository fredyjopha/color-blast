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

export class HomeScene extends Scene {
  private playButton: Container;
  private audioButton: Container;
  private trophySprite: Sprite;
  private logoSprite: Sprite;
  // private scoreSprite: Sprite;
  private scoreText: Text;

  constructor(
    app: Application,
    sceneManager: SceneManager,
    gameManager: GameManager
  ) {
    super(app, sceneManager, gameManager);

    this.playButton = new Container();
    this.audioButton = new Container();
    this.trophySprite = Sprite.from("trophy");
    // this.scoreSprite = Sprite.from("score");
    this.logoSprite = Sprite.from("color-blast");
    this.scoreText = new Text({
      text: "",
      style: {
        fontFamily: "Oswald-Regular",
        fill: 0xff7748,
        fontSize: 32,
      },
    });

    this.trophySprite.anchor.set(0.5);
    this.logoSprite.anchor.set(0.5);
    this.scoreText.anchor.set(0.5);

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
    const buttonSize = 150 * scale;
    const spacing = 40 * scale;

    return { width, height, centerX, centerY, scale, buttonSize, spacing };
  }

  private init() {
    this.container.addChild(this.trophySprite, this.logoSprite, this.scoreText);

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
          }, 1000);
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

    this.scoreText.text = storage.getStorageItem("bestScore") ?? "0";
  }

  resize() {
    const { centerX, centerY, scale, buttonSize, spacing } =
      this.getLayoutMetrics();

    // === TROPHY ===
    this.trophySprite.position.set(centerX, centerY - 100 * scale);
    this.trophySprite.width = 120 * scale;
    this.trophySprite.height = 120 * scale;

    // === LOGO ===
    this.logoSprite.position.set(centerX, centerY - 260 * scale);
    this.logoSprite.width = 250 * scale;
    this.logoSprite.height = 250 * scale;

    this.scoreText.position.set(centerX, centerY - 20 * scale);
    this.scoreText.style.fontSize = 40 * scale;

    // === BUTTON POSITIONING & DRAWING ===
    const placeButton = (
      button: Container,
      color: number,
      textureSpriteIndex: number,
      x: number,
      y: number
    ) => {
      const graphic = button.getChildAt(0) as Graphics;
      const icon = button.getChildAt(textureSpriteIndex) as Sprite;

      graphic.clear();
      graphic.roundRect(0, 0, buttonSize, buttonSize, 20 * scale);
      graphic.fill(color);

      icon.scale.set(
        (buttonSize / Math.max(icon.texture.width, icon.texture.height)) * 0.7
      );
      icon.position.set(buttonSize / 2, buttonSize / 2);

      button.pivot.set(buttonSize / 2, buttonSize / 2);
      button.position.set(x, y);
      button.scale.set(1);
    };

    // Place play button to the left of center
    placeButton(
      this.playButton,
      0x9acd32,
      1,
      centerX - (buttonSize / 2 + spacing),
      centerY + 150 * scale
    );

    // Place audio button to the right of center
    placeButton(
      this.audioButton,
      0x75bfff,
      1,
      centerX + (buttonSize / 2 + spacing),
      centerY + 150 * scale
    );
    this.scoreText.text = storage.getStorageItem("bestScore") ?? "0";
  }

  update() {}
  destroy() {}
}
