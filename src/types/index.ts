import { Sprite } from "pixi.js";

export interface GridElement {
  sprite: Sprite | null; // Autoriser null pour sprite pour verifier que la case est vide
  color: number;
  groupId: number | null;
  row: number;
  col: number;
  conformation: string | null;
  isEmpty?: boolean;
  isMatch?: boolean;
}

export interface ShortElement {
  row: number;
  col: number;
  color: number;
}

export interface GroupCounter {
  currentId: number;
  nextId(): number;
}

export interface GridPlatform {
  isPortrait: boolean;
  baseDimension: number;
  border: number;
  gridSize: number;
  spacing: number;
  squareSize: number;
  gridWidth: number;
  gridHeight: number;
  offsetX: number;
  offsetY: number;
}

export const defaultGridElement = {
  sprite: null,
  color: 0,
  groupId: null,
  row: 0,
  col: 0,
  conformation: null,
  isEmpty: true,
  isMatch: false,
};
