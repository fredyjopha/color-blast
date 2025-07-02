interface IPlatformSDK {
  init(): Promise<void>;
  getUser(): Promise<{ id: string; username: string } | null>;
  showRewardedAd(
    onAdStarted: () => void,
    onAdFinished: () => void,
    onAdError: (error: { code: string; message: string }) => void,
    adType: "rewarded" | "midgame"
  ): Promise<void>;
  showBannerAd(
    containerId: string,
    adWidth: number,
    adHeight: number
  ): Promise<void>;
  gameplayStart(): Promise<void>;
  gameplayStop(): Promise<void>;
  loadingStart(): Promise<void>;
  loadingStop(): Promise<void>;
  clearBanner(containerId: string): Promise<void>;
}

// Mock SDK for local testing
class MockSDK implements IPlatformSDK {
  async init() {
    console.log("Mock SDK initialized");
  }
  async getUser() {
    return { id: "mock-user", username: "MockUser" };
  }

  async showRewardedAd(
    onAdStarted: () => void,
    onAdFinished: () => void,
    onAdError: (error: { code: string; message: string }) => void,
    adType: "rewarded" | "midgame"
  ) {
    onAdFinished();
    onAdStarted();
    onAdError({ code: "fake code", message: "Fake message" });
    console.log("type de publicité :: ", adType);
  }
  async showBannerAd(containerId: string, adWidth: number, adHeight: number) {
    console.log(
      `Mock SDK: Showing banner ad in ${containerId} et adWidth:${adWidth} et adHeight:${adHeight}  `
    );
  }

  async gameplayStart() {
    console.error("GamePlayStart LOG ad:");
  }

  async gameplayStop() {
    console.error("GamePlayStop LOG ad:");
  }

  async loadingStart() {
    console.error("LoadingStart LOG ad:");
  }

  async loadingStop() {
    console.error("LoadingStop LOG ad:");
  }
  async clearBanner(containerId: string) {
    console.log(`Mock SDK: Clean banner ad in ${containerId}`);
  }
}

// CrazyGames SDK implementation
class CrazyGamesSDK implements IPlatformSDK {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sdk: any;
  private isInitialized: boolean = false;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.sdk = (window as any).CrazyGames?.SDK;
    if (!this.sdk) {
      console.warn(
        "CrazyGames SDK not found. Ensure running in CrazyGames environment."
      );
    }
  }

  async init() {
    if (!this.sdk) throw new Error("CrazyGames SDK not available");
    await this.sdk.init();
    this.isInitialized = true;
    console.log("CrazyGames SDK initialized");
  }

  async getUser() {
    if (!this.isInitialized) await this.init();
    try {
      const user = await this.sdk.user.getUser();
      return user ? { id: user.id, username: user.username } : null;
    } catch (e) {
      console.error("Failed to get user:", e);
      return null;
    }
  }

  async showRewardedAd(
    onAdStarted: () => void,
    onAdFinished: () => void,
    onAdError: (error: { code: string; message: string }) => void,
    adType: "rewarded" | "midgame"
  ) {
    if (!this.isInitialized) await this.init();
    try {
      const callbacks = {
        adFinished: () => {
          onAdFinished();
        },
        adError: (error: { code: string; message: string }) => {
          onAdError(error);
          console.log("Error midgame ad", error);
        },
        adStarted: () => {
          onAdStarted();
        },
      };
      await this.sdk.ad.requestAd(adType, callbacks);
    } catch (e) {
      console.error("Failed to show rewarded ad:", e);
    }
  }

  async showBannerAd(containerId: string, adWidth: number, adHeight: number) {
    if (!this.isInitialized) await this.init();
    try {
      await this.sdk.banner.requestBanner({
        id: containerId,
        width: adWidth,
        height: adHeight,
      });
    } catch (e) {
      console.error("Failed to show banner ad:", e);
    }
  }

  async gameplayStart() {
    if (!this.isInitialized) await this.init();
    try {
      await this.sdk.game.gameplayStart();
    } catch (e) {
      console.error("Failed GamePlayStart LOG ad:", e);
    }
  }

  async gameplayStop() {
    if (!this.isInitialized) await this.init();
    try {
      await this.sdk.game.gameplayStop();
    } catch (e) {
      console.error("Failed GamePlayStop LOG ad:", e);
    }
  }

  async loadingStart() {
    if (!this.isInitialized) await this.init();
    try {
      await this.sdk.game.loadingStart();
    } catch (e) {
      console.error("Failed LoadingStart LOG ad:", e);
    }
  }

  async loadingStop() {
    if (!this.isInitialized) await this.init();
    try {
      await this.sdk.game.loadingStop();
    } catch (e) {
      console.error("Failed LoadingStop LOG ad:", e);
    }
  }

  async clearBanner(containerId: string) {
    if (!this.isInitialized) await this.init();
    try {
      await this.sdk.banner.clearBanner(containerId);
    } catch (e) {
      console.error("Failed ClearBanner LOG ad:", e);
    }
  }
}

// SDK Factory
export class SDKManager {
  private static instance: SDKManager;
  private sdk: IPlatformSDK;

  private constructor(platform: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (platform === "crazygames" && (window as any).CrazyGames?.SDK) {
      this.sdk = new CrazyGamesSDK();
    } else {
      console.warn("Using Mock SDK for local testing or unsupported platform");
      this.sdk = new MockSDK();
    }
  }

  static getInstance(platform: string = "crazygames"): SDKManager {
    if (!SDKManager.instance) {
      SDKManager.instance = new SDKManager(platform);
    }
    return SDKManager.instance;
  }

  async init() {
    await this.sdk.init();
  }

  async getUser() {
    return await this.sdk.getUser();
  }

  async gameplayStart() {
    await this.sdk.gameplayStart();
  }

  async gameplayStop() {
    await this.sdk.gameplayStop();
  }

  async loadingStart() {
    await this.sdk.loadingStart();
  }

  async loadingStop() {
    await this.sdk.loadingStop();
  }

  async showRewardedAd(
    onAdStarted: () => void,
    onAdFinished: () => void,
    onAdError: (error: { code: string; message: string }) => void,
    adType: "rewarded" | "midgame"
  ) {
    return await this.sdk.showRewardedAd(
      onAdStarted,
      onAdFinished,
      onAdError,
      adType
    );
  }

  async showBannerAd(containerId: string, adWidth: number, adHeight: number) {
    await this.sdk.showBannerAd(containerId, adWidth, adHeight);
  }

  async clearBanner(containerId: string) {
    await this.sdk.clearBanner(containerId);
  }
}
