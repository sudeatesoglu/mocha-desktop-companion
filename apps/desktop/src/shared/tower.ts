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
}
