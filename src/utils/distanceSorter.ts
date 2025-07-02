import { GridElement } from "../types";

export function getSortedCellsByDistance(sizeGrid: number): {
  row: number;
  col: number;
  distance: number;
}[] {
  const center: number = Math.floor(sizeGrid / 2);
  const cells: { row: number; col: number; distance: number }[] = [];
  const centerX = center - 0.5;
  const centerY = center - 0.5;

  for (let row = 0; row < sizeGrid; row++) {
    for (let col = 0; col < sizeGrid; col++) {
      const distance = Math.abs(row - centerY) + Math.abs(col - centerX);
      cells.push({ row, col, distance });
    }
  }
  cells.sort((a, b) => a.distance - b.distance);
  return cells;
}

export function getSortedCellsByUserClickCenterDistance(
  row: number,
  col: number,
  group: GridElement[]
): { row: number; col: number; distance: number }[] {
  const cells: { row: number; col: number; distance: number }[] = [];
  const centerX = col + 0.5;
  const centerY = row + 0.5;

  group.forEach(({ row, col }) => {
    const distance = Math.abs(row - centerY) + Math.abs(col - centerX);
    cells.push({ row, col, distance });
  });
  cells.sort((a, b) => a.distance - b.distance);
  return cells;
}
