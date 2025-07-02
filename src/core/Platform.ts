export class Platform {
  public screenWidth: number;
  public screenHeight: number;
  public squareSize: number = 0;
  public gridHeight: number = 0;
  public gridWidth: number = 0;
  public offsetX: number = 0;
  public offsetY: number = 0;
  public isPortrait: boolean = true;
  public border: number = 0;
  public spacing: number = 0;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.resize(screenWidth, screenHeight);
  }

  resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.isPortrait = height > width;

    const baseSize = Math.min(width, height);
    this.border = baseSize * 0.05; // 5% of base dimension for margins
    const gridSize = baseSize - 2 * this.border; // Account for borders
    this.spacing = Math.floor(gridSize / 150); // Consistent with original spacing
    this.squareSize = (gridSize - this.spacing * 9) / 10; // 10 squares, 9 gaps
    this.gridWidth = this.squareSize * 10 + this.spacing * 9;
    this.gridHeight = this.squareSize * 10 + this.spacing * 9;

    // Center the grid
    this.offsetX = (width - this.gridWidth) / 2;
    this.offsetY = (height - this.gridHeight) / 2;
  }
}
