import { describe, expect, it } from 'vitest';
import {
  buildReviewUrl,
  encodeReviewParams,
  hasReviewField,
  parseReviewParams,
  REVIEW_FIELDS,
} from './reviewLink';
import { DIRECTIONS, normalize, type Direction, type Face } from './orientation';

const FACES: Face[] = ['design', 'gum'];

describe('复核链接：全部 2×4×4=32 个取值组合的往返一致性', () => {
  it.each(
    FACES.flatMap((face) =>
      DIRECTIONS.flatMap((top) =>
        DIRECTIONS.map((tip) => [face, top, tip] as [Face, Direction, Direction]),
      ),
    ),
  )('face=%s top=%s tip=%s：encode → parse 原样往返', (face, top, tip) => {
    const input = { face, top, tip };
    const decoded = parseReviewParams(encodeReviewParams(input));
    expect(decoded.unknown).toEqual(new Set());
    expect(decoded.values).toEqual(input);
  });

  it('每个组合恢复出的选择经原归一函数产生完全相同的结论', () => {
    for (const face of FACES) {
      for (const top of DIRECTIONS) {
        for (const tip of DIRECTIONS) {
          const { values } = parseReviewParams(
            encodeReviewParams({ face, top, tip }),
          );
          expect(normalize({ face: values.face!, top: values.top!, tip: values.tip! }))
            .toEqual(normalize({ face, top, tip }));
        }
      }
    }
  });

  it('编码输出按 face/top/tip 规范顺序稳定排列', () => {
    expect(REVIEW_FIELDS).toEqual(['face', 'top', 'tip']);
    expect(encodeReviewParams({ face: 'gum', top: 'R', tip: 'U' })).toBe(
      'face=gum&top=R&tip=U',
    );
  });
});

describe('复核链接：乱序参数解析', () => {
  it('参数顺序颠倒、分散也能恢复', () => {
    const a = parseReviewParams('tip=U&top=R&face=gum');
    expect(a.values).toEqual({ face: 'gum', top: 'R', tip: 'U' });

    const b = parseReviewParams(
      'top=L&unused=1&face=design&other=2&tip=D',
    );
    expect(b.values).toEqual({ face: 'design', top: 'L', tip: 'D' });
    expect(b.unknown).toEqual(new Set());
  });

  it('接受 URLSearchParams 实例，且解析结果与查询串一致', () => {
    const fromString = parseReviewParams('face=gum&top=U&tip=R');
    const fromParams = parseReviewParams(
      new URLSearchParams('tip=R&face=gum&top=U'),
    );
    expect(fromParams).toEqual(fromString);
  });

  it('乱序往返后再次编码被规范化回固定顺序', () => {
    const parsed = parseReviewParams('tip=D&face=design&top=L');
    expect(encodeReviewParams(parsed.values)).toBe(
      'face=design&top=L&tip=D',
    );
  });

  it('部分字段缺失时只恢复合法字段', () => {
    const onlyTip = parseReviewParams('tip=R');
    expect(onlyTip.values).toEqual({ tip: 'R' });
    expect(onlyTip.unknown).toEqual(new Set());

    const faceTop = parseReviewParams('top=L&face=gum');
    expect(faceTop.values).toEqual({ face: 'gum', top: 'L' });
  });

  it('同名字段重复时取第一个', () => {
    const r = parseReviewParams('face=gum&face=design&top=U&tip=R');
    expect(r.values.face).toBe('gum');
  });
});

describe('复核链接：未知取值只忽略该字段，其他合法字段保留', () => {
  it('一个未知方向：忽略该项并登记，其余恢复', () => {
    const r = parseReviewParams('face=gum&top=X&tip=R');
    expect(r.values).toEqual({ face: 'gum', tip: 'R' });
    expect(r.unknown).toEqual(new Set(['top']));
  });

  it('未知观察面小写/乱码：忽略 face，top/tip 保留', () => {
    const r = parseReviewParams('face=GUM&top=U&tip=L');
    expect(r.values).toEqual({ top: 'U', tip: 'L' });
    expect(r.unknown).toEqual(new Set(['face']));
  });

  it('三项全部未知：values 为空，unknown 覆盖三项', () => {
    const r = parseReviewParams('face=?&top=9&tip=zz');
    expect(r.values).toEqual({});
    expect(r.unknown).toEqual(new Set(['face', 'top', 'tip']));
  });

  it('未知参数名整体忽略且不算异常', () => {
    const r = parseReviewParams('a=1&b=2&face=design');
    expect(r.values).toEqual({ face: 'design' });
    expect(r.unknown).toEqual(new Set());
  });

  it('空值视为未知', () => {
    const r = parseReviewParams('face=&top=U&tip=');
    expect(r.values).toEqual({ top: 'U' });
    expect(r.unknown).toEqual(new Set(['face', 'tip']));
  });

  it('无任何查询参数时为空恢复', () => {
    const r = parseReviewParams('');
    expect(r.values).toEqual({});
    expect(r.unknown).toEqual(new Set());
    expect(hasReviewField(r)).toBe(false);
  });

  it('hasReviewField 区分纯未知/合法/空链接', () => {
    expect(hasReviewField(parseReviewParams('face=gum'))).toBe(true);
    expect(hasReviewField(parseReviewParams('top=X'))).toBe(true);
    expect(hasReviewField(parseReviewParams('ignored=1'))).toBe(false);
  });
});

describe('buildReviewUrl：只保留当前三项选择', () => {
  it('剥离原有查询串与哈希，规范化输出三项', () => {
    const href = buildReviewUrl(
      { face: 'gum', top: 'R', tip: 'U' },
      'http://localhost:8080/?old=1&tip=R#section',
    );
    expect(href).toBe('http://localhost:8080/?face=gum&top=R&tip=U');
  });

  it('路径保持不变', () => {
    const href = buildReviewUrl(
      { face: 'design', top: 'U', tip: 'R' },
      'http://h.test/foo/bar?x=1',
    );
    expect(href).toBe('http://h.test/foo/bar?face=design&top=U&tip=R');
  });
});
