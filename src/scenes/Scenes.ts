import { Application, Container, Ticker } from "pixi.js";
import { GameManager } from "../managers/GameManager";
import { SceneManager } from "../managers/SceneManager";

export abstract class Scene {
  public container: Container;
  protected app: Application;
  protected sceneManager: SceneManager;
  protected gameManager: GameManager;

  constructor(
    app: Application,
    sceneManager: SceneManager,
    gameManager: GameManager
  ) {
    this.app = app;
    this.sceneManager = sceneManager;
    this.gameManager = gameManager;
    this.container = new Container();
  }

  abstract resize(): void;

  abstract update(time: Ticker): void;

  public reset(): void {
    // Default implementation (override in GameScene)
  }
  public destroy(): void {
    this.container.removeChildren();
    this.container.destroy();
  }
}
