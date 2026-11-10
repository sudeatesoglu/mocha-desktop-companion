import { describe, expect, it } from 'vitest';
import { reminderPosition } from './reminder-placement.ts';

const AREA = { x: 0, y: 25, width: 1440, height: 875 };
const SIZE = { width: 264, height: 112 };
const mochaAt = (x: number, y: number) => ({ x, y, width: 144, height: 144 });

describe('reminderPosition', () => {
  it('opens in front of the beak, to the left of Mocha, level with its head', () => {
    expect(reminderPosition(mochaAt(1272, 732), SIZE, AREA)).toEqual({
      x: 1272 - 264 + 12,
      y: 740,
      side: 'left',
    });
  });

  it('moves to the right when there is no room on the left', () => {
    expect(reminderPosition(mochaAt(40, 300), SIZE, AREA)).toEqual({
      x: 40 + 144 - 12,
      y: 308,
      side: 'right',
    });
  });

  it('stays inside the bottom and top edges', () => {
    expect(reminderPosition(mochaAt(800, 860), SIZE, AREA).y).toBe(25 + 875 - 112);
    expect(reminderPosition(mochaAt(800, -50), SIZE, AREA).y).toBe(25);
  });

  it('stays inside the right edge on a narrow screen', () => {
    const narrow = { x: 0, y: 0, width: 300, height: 800 };

    const { x } = reminderPosition(mochaAt(10, 100), SIZE, narrow);

    expect(x + SIZE.width).toBeLessThanOrEqual(300);
    expect(x).toBeGreaterThanOrEqual(0);
  });

  it('works on a display left of the primary one', () => {
    const external = { x: -1920, y: 0, width: 1920, height: 1080 };

    const position = reminderPosition(mochaAt(-200, 500), SIZE, external);

    expect(position.side).toBe('left');
    expect(position.x).toBe(-200 - 264 + 12);
  });
});
