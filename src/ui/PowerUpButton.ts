import { Button } from "@pixi/ui";
import gsap from "gsap";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { sfx } from "../app/audio";

export class PowerUpButton extends Container {
  public button: Button;
  private square: Graphics;
  public trashSprite: Sprite;
  public videoAdContainer: Container;
  private videoAdButton: Button;
  private clapperSprite: Sprite;
  private videoAdText: Text;

  constructor(color: number, squareSize: number) {
    super();

    this.square = new Graphics()
      .roundRect(0, 0, squareSize, squareSize, Math.floor(squareSize / 8))
      .fill(color);
    this.button = new Button(this.square);
    this.button.view.eventMode = "static";
    this.button.view.cursor = "pointer";

    this.trashSprite = Sprite.from("trash");
    this.trashSprite.anchor.set(0.5, 0.5); // Anchor at top-left for bottom-right positioning
    this.trashSprite.visible = true;
    //this.button.view.addChild(this.trashSprite);

    // Conteneur pour le bouton VideoAd
    this.videoAdContainer = new Container();
    this.videoAdContainer.visible = false;

    const videoAdSquare = new Graphics()
      .roundRect(0, 0, squareSize * 2, squareSize, Math.floor(squareSize / 4))
      .fill(0xee687d);
    this.videoAdButton = new Button(videoAdSquare);
    this.videoAdButton.view.eventMode = "static";
    this.videoAdButton.view.cursor = "pointer";

    this.clapperSprite = Sprite.from("clapper");
    this.clapperSprite.anchor.set(0.5, 0.5);

    this.videoAdText = new Text({
      text: "ADS",
      style: {
        fill: 0xffffff,
        fontSize: squareSize * 0.4,
        fontWeight: "bold",
        align: "center",
      },
    });
    this.videoAdText.anchor.set(0.5);
    //this.videoAdButton.view.addChild()
    this.videoAdContainer.addChild(
      this.videoAdButton.view,
      this.videoAdText,
      this.clapperSprite
    );

    this.addChild(this.button.view, this.trashSprite, this.videoAdContainer);

    this.updateTrashSize(squareSize);
    this.positionTrash(squareSize);
    this.updateSquareSize(squareSize);
  }

  public updateLayout(
    screenWidth: number,
    screenHeight: number,
    offsetX: number,
    offsetY: number,
    isPortrait: boolean,
    sizeSquare: number
  ) {
    //const squareSize = this.square.width;
    const adVideoContainerPositionX =
      this.videoAdContainer.visible === true ? offsetX * 0.75 : offsetX * 0.9;
    this.position.set(
      isPortrait ? screenWidth * 0.15 : adVideoContainerPositionX,
      isPortrait ? offsetY : screenHeight * 0.8
    );
    this.updateTrashSize(sizeSquare);
    this.positionTrash(sizeSquare);
    this.updateSquareSize(sizeSquare);

    // Positionnement du bouton VideoAd
    const videoAdWidth = sizeSquare * 2;
    const videoAdHeight = sizeSquare;
    this.videoAdButton.view.width = videoAdWidth;
    this.videoAdButton.view.height = videoAdHeight;
    this.clapperSprite.width = sizeSquare * 0.8;
    this.clapperSprite.height = sizeSquare * 0.8;
    this.clapperSprite.position.set(sizeSquare * 0.5, videoAdHeight / 2);
    this.videoAdText.style.fontSize = sizeSquare * 0.4;
    this.videoAdText.position.set(videoAdWidth * 0.7, videoAdHeight / 2);
  }

  public setCallbacks(onVideoAdClick: () => void) {
    this.videoAdButton.onPress.connect(() => {
      //this.hideVideoAd();
      onVideoAdClick();
    });
  }

  public trigger(callback: () => void) {
    gsap.to(this.scale, {
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
      onComplete: callback,
    });
  }

  public showVideoAd() {
    this.button.view.visible = false;
    this.trashSprite.visible = false;
    this.videoAdContainer.visible = true;
    this.videoAdContainer.scale.set(0);
    gsap.to(this.videoAdContainer.scale, {
      x: 1,
      y: 1,
      duration: 0.2,
      ease: "back.out",
    });
  }

  public hideVideoAd() {
    gsap.to(this.videoAdContainer.scale, {
      x: 0,
      y: 0,
      duration: 0.1,
      ease: "back.in",
      onComplete: () => {
        this.videoAdContainer.visible = false;
      },
    });
  }

  private updateTrashSize(squareSize: number) {
    const iconSize = squareSize * 0.9; // Consistent with original trash icon size
    this.trashSprite.width = iconSize;
    this.trashSprite.height = iconSize;
  }

  private positionTrash(squareSize: number) {
    // Position at bottom-right of the button
    this.trashSprite.position.set(squareSize, squareSize);
  }
  private updateSquareSize(squareSize: number) {
    this.button.view.width = squareSize;
    this.button.view.height = squareSize;
  }

  public destroy() {
    this.removeChildren();
    this.button.view.off("pointerdown");
    this.videoAdButton.view.off("pointerdown");
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.square);
    gsap.killTweensOf(this.trashSprite);
    gsap.killTweensOf(this.videoAdContainer);
    this.square.destroy();
    this.trashSprite.destroy();
    this.clapperSprite.destroy();
    this.videoAdText.destroy();
    this.videoAdButton.view.destroy();
    this.videoAdContainer.destroy();
  }
}
