import { Button } from "@pixi/ui";
import gsap from "gsap";
import { Container, Sprite } from "pixi.js";
import { PowerUpButton } from "./PowerUpButton";
import { ScoreUI } from "./ScoreUI";

export class UIManager extends Container {
  public scoreUI: ScoreUI;
  public powerUpButton: PowerUpButton | null = null;
  public pauseButton: Button;
  public crossButton: Button | null = null;
  public tutorialText: Sprite;

  constructor() {
    super();

    this.scoreUI = new ScoreUI();
    this.tutorialText = Sprite.from("indicator");
    this.tutorialText.anchor.set(0.5);
    this.tutorialText.visible = false;

    const pauseSprite = Sprite.from("pause");
    pauseSprite.anchor.set(0.5);
    this.pauseButton = new Button(pauseSprite);
    this.pauseButton.view.pivot.set(0.5);

    const crossSprite = Sprite.from("cross");
    crossSprite.anchor.set(0.5);
    this.crossButton = new Button(crossSprite);
    this.crossButton.view.pivot.set(0.5);
    this.addChild(
      this.scoreUI,
      this.tutorialText,
      this.pauseButton.view,
      this.crossButton.view
    );
  }

  public updateLayout(
    screenWidth: number,
    screenHeight: number,
    offsetX: number,
    offsetY: number,
    squareSize: number,
    isPortrait: boolean
  ) {
    this.scoreUI.updateLayout(
      screenWidth,
      screenHeight,
      offsetX,
      offsetY,
      squareSize,
      isPortrait
    );

    if (isPortrait) {
      this.pauseButton.view.position.set(
        screenWidth * 0.85,
        offsetY - squareSize
      );
      if (this.crossButton) {
        this.crossButton.view.position.set(
          screenWidth * 0.85,
          offsetY - squareSize
        );
      }
      if (this.powerUpButton) {
        this.powerUpButton.updateLayout(
          screenWidth,
          screenHeight,
          offsetX,
          offsetY - squareSize * 1.5,
          isPortrait,
          squareSize
        );
      }
    } else {
      this.pauseButton.view.position.set(
        offsetX - squareSize * 1.4,
        screenHeight * 0.2
      );
      if (this.crossButton) {
        this.crossButton.view.position.set(
          offsetX - squareSize * 1.4,
          screenHeight * 0.2
        );
      }
      if (this.powerUpButton) {
        this.powerUpButton.updateLayout(
          screenWidth,
          screenHeight,
          offsetX - squareSize * 1.5,
          screenHeight * 0.8,
          isPortrait,
          squareSize
        );
      }
    }

    this.pauseButton.view.scale.set(1);
    this.pauseButton.view.width = squareSize * 0.8;
    this.pauseButton.view.height = squareSize * 0.8;

    if (this.crossButton) {
      this.crossButton.view.scale.set(1);
      this.crossButton.view.width = squareSize * 0.8;
      this.crossButton.view.height = squareSize * 0.8;
    }

    this.tutorialText.width = squareSize * 0.8;
    this.tutorialText.height = squareSize * 0.8;
  }

  //public showGameUI;
  public showGameUI(show: boolean): void {
    this.scoreUI.visible = show;
    if (this.powerUpButton && !this.powerUpButton.videoAdContainer.visible) {
      this.powerUpButton.button.view.visible = show;
      this.powerUpButton.trashSprite.visible = show;
    }
    this.pauseButton.view.visible = show;
    if (!show && this.crossButton) {
      this.crossButton.view.visible = true;
    } else if (show && this.crossButton) {
      this.removeCrossButton();
    }
  }

  private removeCrossButton() {
    if (this.crossButton) {
      this.removeChild(this.crossButton.view);
      this.crossButton.view.off("pointerdown");
      this.crossButton.view.destroy();
      this.crossButton = null;
    }
  }

  public setPowerUp(
    color: number,
    squareSize: number,
    isPortrait: boolean,
    offsetX: number,
    offsetY: number,
    screen: { width: number; height: number },
    onActivate: () => void,
    onVideoAdClick: () => void
  ) {
    if (this.powerUpButton) {
      this.removeChild(this.powerUpButton);
      this.powerUpButton.destroy();
    }

    const btn = new PowerUpButton(color, squareSize);
    btn.setCallbacks(() => {
      //btn.hideVideoAd();
      onVideoAdClick();
    });
    btn.button.onPress.connect(() => btn.trigger(onActivate));
    btn.updateLayout(
      screen.width,
      screen.height,
      isPortrait ? offsetX : offsetX - squareSize * 1.5,
      isPortrait ? offsetY - squareSize * 1.5 : screen.height * 0.8,
      isPortrait,
      squareSize
    );
    this.powerUpButton = btn;
    this.addChild(btn);
  }

  public hideVideoAd() {
    if (this.powerUpButton) {
      this.powerUpButton.hideVideoAd();
    }
    this.showGameUI(true);
  }

  public clearPowerUp() {
    if (this.powerUpButton) {
      this.removeChild(this.powerUpButton);
      this.powerUpButton.destroy();
      this.powerUpButton = null;
    }
    this.removeCrossButton();
  }

  public updateBestScoreAnimation(isPortrait: boolean) {
    this.scoreUI.animateBestScore(isPortrait);
  }

  public showVideoAd(handleUpdateLayout: () => void, onCrossClick: () => void) {
    if (!this.powerUpButton) return;
    this.powerUpButton.showVideoAd();
    this.showGameUI(false);
    // Créer le bouton croix
    const crossSprite = Sprite.from("cross");
    crossSprite.anchor.set(0.5);
    this.crossButton = new Button(crossSprite);
    this.crossButton.view.eventMode = "static";
    this.crossButton.view.cursor = "pointer";
    this.crossButton.onPress.connect(() => {
      this.hideVideoAd();
      onCrossClick();
    });
    this.addChild(this.crossButton.view);

    handleUpdateLayout();
  }

  public destroy() {
    this.removeChildren();
    this.scoreUI.destroy();
    if (this.powerUpButton) {
      this.powerUpButton.destroy();
      this.powerUpButton = null;
    }
    this.pauseButton.view.off("pointerdown");
    if (this.crossButton) {
      this.crossButton.view.off("pointerdown");
      this.removeCrossButton();
    }
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.tutorialText);
    gsap.killTweensOf(this.pauseButton.view);
  }
}
