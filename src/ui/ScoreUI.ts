import gsap from "gsap";
import { Container, Sprite, Text } from "pixi.js";

export class ScoreUI extends Container {
  public scoreText: Text;
  public bestScoreText: Text;
  public trophyIcon: Sprite;

  constructor() {
    super();

    this.scoreText = new Text({
      text: "0",
      style: {
        fontFamily: "Oswald-Regular",
        fill: 0x657887,
        fontSize: 60,
        fontWeight: "bold",
        align: "right",
      },
    });
    this.bestScoreText = new Text({
      text: "0",
      style: {
        fontFamily: "Oswald-Regular",
        fill: 0xff7748,
        fontSize: 60,
        fontWeight: "bold",
        align: "left",
      },
    });

    this.scoreText.anchor.set(0.5, 0);
    this.bestScoreText.anchor.set(0.5, 0);

    this.trophyIcon = Sprite.from("trophy");
    this.trophyIcon.anchor.set(0.5);

    this.addChild(this.scoreText, this.bestScoreText, this.trophyIcon);
  }

  public updateLayout(
    screenWidth: number,
    screenHeight: number,
    offsetX: number,
    offsetY: number,
    squareSize: number,
    isPortrait: boolean
  ) {
    const fontSize = isPortrait ? screenWidth / 15 : screenHeight / 15;
    this.scoreText.style.fontSize = fontSize;
    this.bestScoreText.style.fontSize = fontSize;

    if (isPortrait) {
      this.scoreText.position.set(
        screenWidth * 0.4,
        offsetY - squareSize * 1.5
      );
      this.bestScoreText.position.set(
        screenWidth * 0.6,
        offsetY - squareSize * 1.5
      );
      this.trophyIcon.position.set(screenWidth * 0.5, offsetY - squareSize);
    } else {
      const midY = screenHeight * 0.5;
      this.scoreText.position.set(
        offsetX - squareSize * 1.5,
        midY - squareSize
      );
      this.bestScoreText.position.set(
        offsetX - squareSize * 1.5,
        midY + squareSize
      );
      this.trophyIcon.position.set(
        offsetX - squareSize * 1.5,
        midY + squareSize * 0.6
      );
    }

    this.trophyIcon.width = squareSize;
    this.trophyIcon.height = squareSize;
  }

  public animateBestScore(isPortrait: boolean) {
    gsap.to(this.trophyIcon.scale, {
      x: isPortrait ? 0.4 : 0.6,
      y: isPortrait ? 0.4 : 0.6,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: "back.out(2)",
    });
  }

  public destroy() {
    this.removeChildren();
    gsap.killTweensOf(this.scoreText);
    gsap.killTweensOf(this.bestScoreText);
    gsap.killTweensOf(this.trophyIcon);
    this.scoreText.destroy();
    this.bestScoreText.destroy();
    this.trophyIcon.destroy();
  }
}
