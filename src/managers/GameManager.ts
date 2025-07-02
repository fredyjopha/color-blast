import { Application } from "pixi.js";
import { sound } from "@pixi/sound";
import { initAssets } from "../app/assets";
import { audio } from "../app/audio";
import { storage } from "../app/storage";
import { SceneManager } from "./SceneManager";
import { SDKManager } from "./SDKManager";

export class GameManager {
  private app: Application;
  private sceneManager: SceneManager;
  private muted: boolean = storage.getStorageItem("muted");

  private constructor(app: Application) {
    this.app = app;
    this.sceneManager = new SceneManager(this.app, this);
    window.addEventListener("resize", () => this.resize());
  }

  public static async create(): Promise<GameManager> {
    const app = new Application();
    await app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      resizeTo: window,
      backgroundColor: 0xf0f0f0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    document.body.appendChild(app.canvas as HTMLCanvasElement);
    await initAssets();

    storage.readyStorage();
    audio.muted(storage.getStorageItem("muted"));

    // Disable unwanted page scroll.
    window.addEventListener("wheel", (event) => event.preventDefault(), {
      passive: false,
    });

    // Disable unwanted key events and spacebar scrolling.
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", ""].includes(event.key)) {
        event.preventDefault();
      }
    });
    // Check for visibility sate so we can mute the audio on "hidden"
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") {
        // Always mute on hidden
        audio.muted(true);
      } else {
        // Only unmute if it was previously unmuted
        audio.muted(storage.getStorageItem("muted"));
      }
    });
    document.addEventListener("click", () => {
      if (sound.context.audioContext.state === "suspended") {
        sound.context.audioContext.resume().then(() => {
          console.log("AudioContext activé pour PIXI.sound");
        });
      }
    });
    const gameManager = new GameManager(app);
    gameManager.sceneManager.switchScene("home");
    gameManager.resize();
    const sdk = SDKManager.getInstance();
    await sdk.loadingStop();
    return gameManager;
  }

  resize() {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.sceneManager.currentScene?.resize();
  }

  toggleSound() {
    const toggleMute = !this.muted;
    storage.setStorageItem("muted", toggleMute);
    audio.muted(toggleMute);
    this.muted = toggleMute;
  }

  isMuted(): boolean {
    return storage.getStorageItem("muted");
  }
}
