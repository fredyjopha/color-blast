import { SDKManager } from "./../managers/SDKManager";
import { startGame } from "./App";

(async () => {
  const sdk = SDKManager.getInstance();
  await sdk.loadingStart().then(async () => {
    await sdk.init();
  });
  await startGame();
})();
