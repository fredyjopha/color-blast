import { PlayOptions, sound } from "@pixi/sound";

/**
 * A class to handle sound effects within the game.
 */
class SFX {
  /** A global volume that affects all sfx sounds. */
  private _volume = 0.5;

  /**
   * Play sound effects.
   * @param alias - Name of the audio file.
   * @param options - Options to be passed to the sound instance.
   */
  public play(alias: string, options?: PlayOptions) {
    const volume = this._volume * (options?.volume ?? 1);

    sound.play(alias, { ...options, volume });
  }

  /**
   * Set the global volume.
   * @param v - Target volume.
   */
  public setVolume(v: number) {
    this._volume = v;
  }

  /**
   * Get the global volume.
   */
  public getVolume() {
    return this._volume;
  }
}

/**
 * A object to hold methods that handle certain features on the global sound instance
 */
export const audio = {
  /**
   * Mute the global sound instance.
   * @param value - The audio mute state.
   */
  muted(value: boolean) {
    if (value) sound.muteAll();
    else sound.unmuteAll();
  },
  /** Get the volume of the global sound instance. */
  getMasterVolume() {
    return sound.volumeAll;
  },
  /** Set the volume of the global sound instance.
   * @param v - The target global volume.
   */
  setMasterVolume(v: number) {
    sound.volumeAll = v;
    if (!v) {
      sound.muteAll();
    } else {
      sound.unmuteAll();
    }
  },
};

/**
 * A class to handle sound effects within the game.
 */
export const sfx = new SFX();
