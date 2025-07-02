import { ShortElement } from "../types";

const DEFAULT_STORAGE = {
  muted: false,
  bestScore: 0,
  score: 0,
  lastScore: 0,
  storegridelements: [] as ShortElement[],
  tutorialShown: false,
  neverShowTutorial: false,
  lastGroupId: 0,
  sessionCount: 0,
  nextAdSession: 5,
};

export type StorageData = typeof DEFAULT_STORAGE;

/**
 * The ID of the local storage where the data is stored.
 */
const STORAGE_ID = "color-blast-Vqhnc2YivPsDZy";

export const storage = {
  /**
   * Initializes the storage data to the default if not already set.
   */
  readyStorage() {
    if (!localStorage.getItem(STORAGE_ID)) this.setStorage(DEFAULT_STORAGE);
  },
  /**
   * Retrieves the storage data.
   * @returns The storage data if it exists, undefined otherwise.
   */
  getStorage(): StorageData {
    const data = localStorage.getItem(STORAGE_ID);

    return data ? JSON.parse(data) : DEFAULT_STORAGE;
  },
  /**
   * Retrieves a specific value from the storage data.
   * @param key - The key of the value to retrieve.
   * @returns The retrieved value.
   */
  getStorageItem<T extends keyof StorageData>(key: T): StorageData[T] {
    const data = this.getStorage();

    return data[key];
  },
  /**
   * Sets a specific value in the storage data.
   * @param key - The key of the value to set.
   * @param value - The value to set.
   * @returns The set value.
   */
  setStorageItem<T extends keyof StorageData>(
    key: T,
    value: StorageData[T]
  ): StorageData[T] {
    const data = this.getStorage();

    // Check if storage and intended item exists
    if (data && key in data) {
      data[key] = value;

      // Replace local storage
      this.setStorage(data);
    }

    return data[key];
  },
  /**
   * Sets the entire storage data.
   * @param data - The data to set.
   * @returns The set data.
   */
  setStorage(data: StorageData) {
    return localStorage.setItem(STORAGE_ID, JSON.stringify(data, undefined, 2));
  },

  addUnitToSessionCount() {
    let sessionCount = this.getStorageItem("sessionCount");
    sessionCount++;
    storage.setStorageItem("sessionCount", sessionCount);
  },

  ifShouldShowAd(): boolean {
    const sessionCount = this.getStorageItem("sessionCount");
    const nextAdSession = this.getStorageItem("nextAdSession");
    const shouldShowAd = sessionCount >= nextAdSession;
    if (shouldShowAd) {
      // Détermine aléatoirement le prochain intervalle (2 ou 3 sessions plus tard)
      const nextInterval = Math.random() < 0.5 ? 4 : 6;
      const nextSession = Number(sessionCount) + Number(nextInterval);
      this.setStorageItem("nextAdSession", nextSession);
    }
    return shouldShowAd;
  },
};
