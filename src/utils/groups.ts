import { GridElement, GroupCounter } from "../types";
import { squars } from "./conformations";

// Vérifie si une conformation est connectée (cellules adjacentes par leurs côtés)
function isConnected(coords: number[][]): boolean {
  if (coords.length === 0) return false;
  const visited = new Set<string>();
  const queue: number[][] = [coords[0]];
  visited.add(`${coords[0][0]},${coords[0][1]}`);

  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]; // Haut, bas, droite, gauche

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      const neighbor = `${nx},${ny}`;
      if (
        coords.some(([cx, cy]) => cx === nx && cy === ny) &&
        !visited.has(neighbor)
      ) {
        visited.add(neighbor);
        queue.push([nx, ny]);
      }
    }
  }

  return visited.size === coords.length;
}

// Normalise les coordonnées pour une correspondance robuste des conformations
function normalizeCoordinates(coords: number[][]): number[][] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const minX = Math.min(...coords.map(([x, _]) => x));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const minY = Math.min(...coords.map(([_, y]) => y));
  return coords
    .map(([x, y]) => [x - minX, y - minY])
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
}

// Compare deux tableaux de coordonnées
function arraysEqual(a: number[][], b: number[][]): boolean {
  const aSorted = normalizeCoordinates(a);
  const bSorted = normalizeCoordinates(b);
  return (
    aSorted.length === bSorted.length &&
    aSorted.every(([x1, y1], i) => x1 === bSorted[i][0] && y1 === bSorted[i][1])
  );
}

// Vérifie si les coordonnées sélectionnées correspondent à une conformation de polyomino
export function hasSelectedConfiormation(spawn: number[][]): string {
  if (!spawn.some(([x, y]) => x === 0 && y === 0)) {
    console.log("Conformation invalide : [0,0] manquant", spawn);
    return "";
  }
  if (!isConnected(spawn)) {
    console.log("Conformation invalide : non connectée", spawn);
    return "";
  }
  // Validation dynamique pour 2 à 11 cellules
  //if (spawn.length >= 2 && spawn.length <= 11) {
  if (spawn.length >= 2) {
    return `POLYOMINO_${spawn.length}`;
  }
  const normalizedSpawn = normalizeCoordinates(spawn);
  for (const conformation of squars.conformations) {
    for (const patternGroup of conformation.pattern) {
      if (arraysEqual(normalizedSpawn, patternGroup)) {
        console.log(
          "Conformation trouvée :",
          conformation.name,
          normalizedSpawn
        );
        return conformation.name;
      }
    }
  }
  //console.log("Aucune conformation trouvée pour :", normalizedSpawn);
  return "";
}

// Assigne des ID de groupe pour former des polyominos valides
export function findGroups(
  grid: GridElement[][],
  selectedNeighborColor: { selected: number[][]; groupIds: number[] },
  row: number,
  col: number,
  groupIdCounter: GroupCounter
): GridElement[] {
  const conformation = hasSelectedConfiormation(selectedNeighborColor.selected);
  //console.log("conformation :::: ", conformation);
  const group: GridElement[] = [];

  if (conformation === "") return group; // Aucun polyomino valide trouvé

  let groupId: number | null = null;

  // Utilise un ID de groupe existant si disponible, sinon en assigne un nouveau
  if (selectedNeighborColor.groupIds.length > 0) {
    groupId = selectedNeighborColor.groupIds[0];
  } else {
    groupId = groupIdCounter.nextId();
  }

  // Assigne l'ID de groupe à la cellule actuelle et à ses voisins valides
  for (const spawn of selectedNeighborColor.selected) {
    const newRow = row + spawn[0];
    const newCol = col + spawn[1];
    if (
      newRow >= 0 &&
      newRow < grid.length &&
      newCol >= 0 &&
      newCol < grid[0].length
    ) {
      grid[newRow][newCol].groupId = groupId;
      grid[newRow][newCol].conformation = conformation;
      group.push(grid[newRow][newCol]);
    }
  }

  // Fusionne les autres groupes si nécessaire
  if (selectedNeighborColor.groupIds.length > 1) {
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (selectedNeighborColor.groupIds.includes(grid[i][j].groupId!)) {
          grid[i][j].groupId = groupId;
        }
      }
    }
  }

  return group;
}
