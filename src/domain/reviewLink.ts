/**
 * 复核链接编解码（纯函数，无任何在线依赖）
 *
 * 鉴定员完成一次目录视向校核后，可把当前三项选择编码成 URL 查询参数交给同事：
 * 同事打开同一链接即可恢复相同选择，继而由原归一函数 reproduce 相同的
 * 步骤图与目录视向结论。
 *
 * 参数名与取值记号直接复用领域常量，保证链接稳定、可读：
 *   face=design | gum      观察面（图案面 / 背胶面）
 *   top =U | R | D | L     当前画面中邮票上边所在方向
 *   tip =U | R | D | L     当前画面中水印尖端所指方向
 *
 * 约定：
 * - 编码永远按 face → top → tip 的规范顺序输出，只包含这三项，结果稳定；
 * - 解码与参数在 URL 中的出现顺序无关（乱序亦可恢复）；
 * - 某个已知字段取了未知值时，仅忽略该字段（由界面就近提示重新选择），
 *   其他合法字段照常恢复；未知参数名整体忽略。
 */
import type { Direction, Face, NormalizationInput } from './orientation';
import { DIRECTIONS } from './orientation';

/** 复核链接承载的三项选择字段 */
export type ReviewField = keyof NormalizationInput;

/** 规范参数顺序：编码输出与链接展示均保持此顺序 */
export const REVIEW_FIELDS: readonly ReviewField[] = ['face', 'top', 'tip'];

const FACES: readonly Face[] = ['design', 'gum'];

export function isFaceToken(value: string): value is Face {
  return (FACES as readonly string[]).includes(value);
}

export function isDirectionToken(value: string): value is Direction {
  return (DIRECTIONS as readonly string[]).includes(value);
}

export interface ReviewParseResult {
  /** 成功恢复的合法字段（未知字段不会出现在这里） */
  values: Partial<NormalizationInput>;
  /** 取了未知值的已知字段名，调用方应在对应控件旁提示重新选择 */
  unknown: ReadonlySet<ReviewField>;
}

/**
 * 把三项选择编码为规范查询串（不含前导 '?'）。
 * 仅包含传入且合法的字段，顺序固定为 face、top、tip。
 */
export function encodeReviewParams(
  input: Partial<NormalizationInput>,
): string {
  const params = new URLSearchParams();
  if (input.face !== undefined && isFaceToken(input.face)) {
    params.set('face', input.face);
  }
  if (input.top !== undefined && isDirectionToken(input.top)) {
    params.set('top', input.top);
  }
  if (input.tip !== undefined && isDirectionToken(input.tip)) {
    params.set('tip', input.tip);
  }
  // URLSearchParams 按插入顺序序列化，上面的插入顺序即规范顺序。
  return params.toString();
}

/**
 * 解析复核链接查询参数（可传 location.search 或已构造的 URLSearchParams）。
 * 与参数出现顺序无关；未知取值只登记到 unknown，合法值照常恢复。
 */
export function parseReviewParams(
  search: string | URLSearchParams,
): ReviewParseResult {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  const values: Partial<NormalizationInput> = {};
  const unknown = new Set<ReviewField>();

  // 同名字段重复时取第一个（URLSearchParams.get 语义）。
  const face = params.get('face');
  if (face !== null) {
    if (isFaceToken(face)) {
      values.face = face;
    } else {
      unknown.add('face');
    }
  }

  const readDirection = (field: 'top' | 'tip') => {
    const raw = params.get(field);
    if (raw === null) return;
    if (isDirectionToken(raw)) {
      values[field] = raw;
    } else {
      unknown.add(field);
    }
  };
  readDirection('top');
  readDirection('tip');

  return { values, unknown };
}

/** 链接中是否带过任一本工具认识的复核字段（含取值未知的情况） */
export function hasReviewField(result: ReviewParseResult): boolean {
  return (
    result.unknown.size > 0 ||
    result.values.face !== undefined ||
    result.values.top !== undefined ||
    result.values.tip !== undefined
  );
}

/**
 * 基于 base（通常为 window.location.href）生成只含当前三项选择的完整复核
 * 链接：剥离原查询串与哈希，规范化输出 face/top/tip。
 */
export function buildReviewUrl(
  input: Partial<NormalizationInput>,
  base: string,
): string {
  const url = new URL(base);
  url.search = encodeReviewParams(input);
  url.hash = '';
  return url.href;
}
