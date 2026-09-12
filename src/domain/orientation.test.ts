import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS,
  FACE_LABEL,
  mirrorAcrossVerticalAxis,
  normalize,
  rotateCW,
  rotateToUpright,
  rotationDegrees,
  type Direction,
  type Face,
} from './orientation';

describe('基础变换原语', () => {
  it('rotateCW 按屏幕顺时针方向每 90° 一档循环', () => {
    expect(rotateCW('U', 0)).toBe('U');
    expect(rotateCW('U', 1)).toBe('R');
    expect(rotateCW('U', 2)).toBe('D');
    expect(rotateCW('U', 3)).toBe('L');
    expect(rotateCW('U', 4)).toBe('U');
    expect(rotateCW('L', 1)).toBe('U');
    expect(rotateCW('R', -1)).toBe('U');
    expect(rotateCW('D', -2)).toBe('U');
  });

  it('竖轴镜像保持上下、互换左右', () => {
    expect(mirrorAcrossVerticalAxis('U')).toBe('U');
    expect(mirrorAcrossVerticalAxis('D')).toBe('D');
    expect(mirrorAcrossVerticalAxis('R')).toBe('L');
    expect(mirrorAcrossVerticalAxis('L')).toBe('R');
  });

  it('rotationDegrees 给出把上边转到屏幕上方所需的顺时针角度', () => {
    expect(rotationDegrees('U')).toBe(0);
    expect(rotationDegrees('R')).toBe(270);
    expect(rotationDegrees('D')).toBe(180);
    expect(rotationDegrees('L')).toBe(90);
  });
});

describe('第一步：旋转归位', () => {
  it.each([
    ['U', 'U', 'U'],
    ['U', 'R', 'R'],
    ['U', 'D', 'D'],
    ['U', 'L', 'L'],
    ['R', 'U', 'L'],
    ['R', 'R', 'U'],
    ['R', 'D', 'R'],
    ['R', 'L', 'D'],
    ['D', 'U', 'D'],
    ['D', 'R', 'L'],
    ['D', 'D', 'U'],
    ['D', 'L', 'R'],
    ['L', 'U', 'R'],
    ['L', 'R', 'D'],
    ['L', 'D', 'L'],
    ['L', 'L', 'U'],
  ] as [Direction, Direction, Direction][])(
    '上边在 %s、尖端朝 %s → 归位后尖端朝 %s',
    (top, tip, expected) => {
      expect(rotateToUpright(top, tip)).toBe(expected);
    },
  );
});

describe('归一规则：全部离散组合（2 观察面 × 4 上边 × 4 尖端 = 32）', () => {
  const faces: Face[] = ['design', 'gum'];

  // 独立参考实现（索引运算），与被测代码的分支写法相互独立
  const indexOf = (d: Direction) => DIRECTIONS.indexOf(d);
  const mirrorIndex = (i: number) => [0, 3, 2, 1][i]!;

  it.each(faces.flatMap((face) =>
    DIRECTIONS.flatMap((top) =>
      DIRECTIONS.map((tip) => [face, top, tip] as [Face, Direction, Direction]),
    ),
  ))(
    '%s观察 / 上边在%s / 尖端朝%s',
    (face, top, tip) => {
      const afterIndex = (indexOf(tip) - indexOf(top) + 4) % 4;
      const expectedAfter = DIRECTIONS[afterIndex];
      const expectedCatalog =
        face === 'gum'
          ? DIRECTIONS[mirrorIndex(afterIndex)]
          : expectedAfter;

      const out = normalize({ face, top, tip });
      expect(out.afterRotation).toBe(expectedAfter);
      expect(out.mirrored).toBe(face === 'gum');
      expect(out.catalog).toBe(expectedCatalog);
    },
  );

  it('每个观察面恰好覆盖 16 个组合', () => {
    for (const face of faces) {
      const catalogs = DIRECTIONS.flatMap((top) =>
        DIRECTIONS.map((tip) => normalize({ face, top, tip }).catalog),
      );
      expect(catalogs).toHaveLength(16);
    }
    expect(faces.map((f) => FACE_LABEL[f]).join('/')).toBe('图案面/背胶面');
  });
});

describe('验收对照：同姿态（上边朝上、尖端朝右）两观察面结果相反', () => {
  it('背胶面：右向水印归一为左向', () => {
    const gum = normalize({ face: 'gum', top: 'U', tip: 'R' });
    expect(gum.afterRotation).toBe('R');
    expect(gum.mirrored).toBe(true);
    expect(gum.catalog).toBe('L');
  });

  it('图案面：同姿态仍保持右向', () => {
    const design = normalize({ face: 'design', top: 'U', tip: 'R' });
    expect(design.afterRotation).toBe('R');
    expect(design.mirrored).toBe(false);
    expect(design.catalog).toBe('R');
  });

  it('背胶面仅镜像左右：归位后朝上/朝下的尖端不受镜像影响', () => {
    expect(normalize({ face: 'gum', top: 'U', tip: 'U' }).catalog).toBe('U');
    expect(normalize({ face: 'gum', top: 'U', tip: 'D' }).catalog).toBe('D');
  });
});
