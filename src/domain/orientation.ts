/**
 * 邮票水印「目录视向」归一规则（纯函数实现，无任何在线依赖）
 *
 * 背景：鉴定员从背胶面观察水印时，所见影像相对图案面左右翻转；
 * 若邮票在托片中又转过方向，直接照抄箭头朝向便会把目录视向记反。
 *
 * 归一规则固定为两步：
 *   1) 旋转：先把邮票上边旋转到屏幕上方；
 *   2) 镜像：若观察自背胶面，再沿归位后画面的竖轴做一次左右镜像；
 *            图案面不镜像。
 * 最终尖端方向即为目录视向。
 *
 * 所有方向均以「当前屏幕画面」的上/右/下/左为参照（U/R/D/L）。
 */

export type Direction = 'U' | 'R' | 'D' | 'L';
export type Face = 'design' | 'gum';

/** 屏幕顺时针次序：上 → 右 → 下 → 左 */
export const DIRECTIONS: readonly Direction[] = ['U', 'R', 'D', 'L'] as const;

export const DIRECTION_LABEL: Record<Direction, string> = {
  U: '上',
  R: '右',
  D: '下',
  L: '左',
};

export const FACE_LABEL: Record<Face, string> = {
  design: '图案面',
  gum: '背胶面',
};

/** 方向在屏幕顺时针次序中的索引：上=0 右=1 下=2 左=3 */
const INDEX: Record<Direction, number> = { U: 0, R: 1, D: 2, L: 3 };

/** 把方向顺时针旋转 cw 个 90° 档（0..3，可为负数） */
export function rotateCW(dir: Direction, cw: number): Direction {
  return DIRECTIONS[(((INDEX[dir] + cw) % 4) + 4) % 4];
}

/**
 * 第一步：旋转归位。
 * 让邮票上边转到屏幕上方 U，整个画面旋转，水印尖端同向旋转。
 * 上边在 top 时所需的顺时针旋转档 = (0 - INDEX[top]) mod 4。
 */
export function rotateToUpright(top: Direction, tip: Direction): Direction {
  const cw = (-INDEX[top] + 4) % 4;
  return rotateCW(tip, cw);
}

/**
 * 第二步：沿竖轴（竖直轴）左右镜像。
 * 上仍是上、下仍是下，左右互换：U→U D→D R→L L→R。
 */
export function mirrorAcrossVerticalAxis(dir: Direction): Direction {
  switch (dir) {
    case 'U':
      return 'U';
    case 'D':
      return 'D';
    case 'R':
      return 'L';
    case 'L':
      return 'R';
  }
}

/** 邮票上边归位到屏幕上方所需的顺时针旋转角度（度），供图示使用 */
export function rotationDegrees(top: Direction): number {
  return (((360 - INDEX[top] * 90) % 360) + 360) % 360;
}

export interface NormalizationInput {
  /** 观察面：图案面 / 背胶面 */
  face: Face;
  /** 当前画面中邮票上边所在方向（屏幕方向） */
  top: Direction;
  /** 当前画面中水印尖端所指方向（屏幕方向） */
  tip: Direction;
}

export interface NormalizationStep {
  /** 归位后（镜像前）水印尖端方向 */
  afterRotation: Direction;
  /** 本观察面是否需要左右镜像 */
  mirrored: boolean;
  /** 最终目录视向 */
  catalog: Direction;
}

/** 完整归一：先旋转归位，背胶面再做竖轴镜像；图案面不镜像。 */
export function normalize(input: NormalizationInput): NormalizationStep {
  const afterRotation = rotateToUpright(input.top, input.tip);
  const mirrored = input.face === 'gum';
  const catalog = mirrored
    ? mirrorAcrossVerticalAxis(afterRotation)
    : afterRotation;
  return { afterRotation, mirrored, catalog };
}
