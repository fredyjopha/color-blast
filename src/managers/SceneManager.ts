import * as PIXI from "pixi.js";
import { GameOverScene } from "../scenes/GameOverScene";
import { GameScene } from "../scenes/GameScene";
import { HomeScene } from "../scenes/HomeScene";
import { PauseScene } from "../scenes/PauseScene";
import { Scene } from "../scenes/Scenes";
import { GameManager } from "./GameManager";
import { SDKManager } from "./SDKManager";
import { storage } from "../app/storage";

export class SceneManager {
  private app: PIXI.Application;
  private gameManager: GameManager;
  private scenes: { [key: string]: Scene };
  public currentScene: Scene | null = null;

  constructor(app: PIXI.Application, gameManager: GameManager) {
    this.app = app;
    this.gameManager = gameManager;
    this.scenes = {
      home: new HomeScene(this.app, this, this.gameManager),
      game: new GameScene(this.app, this, this.gameManager),
      gameOver: new GameOverScene(this.app, this, this.gameManager),
      pause: new PauseScene(this.app, this, this.gameManager),
    };
  }

  async switchScene(sceneName: string) {
    if (this.currentScene) {
      this.app.ticker.remove(this.currentScene.update, this.currentScene);
      this.app.stage.removeChild(this.currentScene.container);
      this.currentScene.destroy();
      if (sceneName === "game") {
        const sdk = SDKManager.getInstance();
        await sdk.gameplayStart();
        storage.addUnitToSessionCount();
        this.scenes.game = new GameScene(this.app, this, this.gameManager);
      }
      if (sceneName !== "game") {
        const sdk = SDKManager.getInstance();
        await sdk.gameplayStop();
      }
    }
    this.currentScene = this.scenes[sceneName];
    this.app.stage.addChild(this.currentScene.container);
    this.currentScene.resize();
    this.app.ticker.add(this.currentScene.update, this.currentScene);
  }
  startTicker() {
    if (
      this.currentScene &&
      !(
        this.currentScene instanceof GameScene &&
        (this.currentScene as GameScene).isPowerUpActive
      )
    ) {
      this.app.ticker.start();
    }
  }

  stopTicker() {
    if (this.currentScene && this.currentScene instanceof GameScene) {
      this.app.ticker.stop();
    }
  }
}
