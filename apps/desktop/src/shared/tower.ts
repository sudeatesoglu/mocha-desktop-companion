/** Mocha's needs as the Tower shows them: whole numbers and flags only. */
export interface TowerView {
  /** 0 to 100. */
  mood: number;
  /** 0 to 100. */
  energy: number;
  /** Energy is low enough for Mocha to look tired. */
  tired: boolean;
  /** Treats Mocha still accepts today. */
  treatsLeft: number;
  /** A break is in progress: Mocha naps, and "Rest together" is not offered. */
  resting: boolean;
  /** Mocha is paused from the menu bar: no break can start. */
  paused: boolean;
}

/** What the user can do for Mocha in the Tower. */
export type TowerAction = 'pet' | 'treat' | 'rest';
