//import { GameManager } from "./managers/GameManager";

import { GameManager } from "../managers/GameManager";

export async function startGame() {
  await GameManager.create();
}
