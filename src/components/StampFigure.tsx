import type { Direction } from '../domain/orientation';
import { DIRECTIONS, DIRECTION_LABEL } from '../domain/orientation';

/** 方向 → 屏幕单位向量（SVG 坐标，y 向下为正） */
const SCREEN_VECTOR: Record<Direction, { x: number; y: number }> = {
  U: { x: 0, y: -1 },
  R: { x: 1, y: 0 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
};

/** 方向（屏幕）→ 邮票局部坐标系需要旋转到的角度 */
const SCREEN_ANGLE: Record<Direction, number> = {
  U: 0,
  R: 90,
  D: 180,
  L: 270,
};

export type FigureMode = 'input' | 'step' | 'mirror' | 'final';

interface StampFigureProps {
  mode: FigureMode;
  /** 邮票上边当前位于屏幕的哪个方向；undefined 表示尚未选择 */
  stampTop?: Direction;
  /** 水印尖端当前指向（屏幕方向）；undefined 表示尚未选择 */
  tip?: Direction;
  /** 镜像步骤中，镜像前的尖端（虚线残影） */
  ghostTip?: Direction;
  /** 是否绘制竖轴（镜像步骤） */
  showAxis?: boolean;
  /** 步骤说明，例如 “顺时针 90° 归位” */
  annotation?: string;
  /** 缺项占位文字 */
  placeholder?: string;
  testid: string;
}

const CENTER = 120;
const STAMP_X = 60;
const STAMP_Y = 42;
const STAMP_W = 120;
const STAMP_H = 156;
const ARROW_LEN = 62;

function arrowTarget(dir: Direction) {
  const v = SCREEN_VECTOR[dir];
  return { x: CENTER + v.x * ARROW_LEN, y: CENTER + v.y * ARROW_LEN };
}

function WatermarkArrow({
  dir,
  color,
  dashed = false,
  opacity = 1,
  markerId,
}: {
  dir: Direction;
  color: string;
  dashed?: boolean;
  opacity?: number;
  markerId: string;
}) {
  const to = arrowTarget(dir);
  return (
    <line
      x1={CENTER}
      y1={CENTER}
      x2={to.x}
      y2={to.y}
      stroke={color}
      strokeWidth={4}
      strokeLinecap="round"
      strokeDasharray={dashed ? '7 6' : undefined}
      opacity={opacity}
      markerEnd={`url(#${markerId})`}
    />
  );
}

export function StampFigure({
  mode,
  stampTop,
  tip,
  ghostTip,
  showAxis = false,
  annotation,
  placeholder,
  testid,
}: StampFigureProps) {
  const empty = stampTop === undefined || tip === undefined;
  const accent =
    mode === 'final' ? '#15803d' : mode === 'mirror' ? '#b45309' : '#1d4ed8';

  return (
    <svg
      viewBox="0 0 240 240"
      role="img"
      aria-label={placeholder ?? '步骤图示'}
      data-testid={testid}
      className="figure"
    >
      <defs>
        <marker
          id={`${testid}-arrow`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={accent} />
        </marker>
        <marker
          id={`${testid}-arrow-ghost`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
        </marker>
      </defs>

      {/* 屏幕方向参照框 */}
      <rect
        x={6}
        y={6}
        width={228}
        height={228}
        rx={10}
        fill="none"
        stroke="#d1d5db"
        strokeWidth={1.5}
      />
      {DIRECTIONS.map((d) => {
        const pos: Record<Direction, { x: number; y: number }> = {
          U: { x: CENTER, y: 18 },
          R: { x: 224, y: CENTER + 4 },
          D: { x: CENTER, y: 226 },
          L: { x: 16, y: CENTER + 4 },
        };
        return (
          <text
            key={d}
            x={pos[d].x}
            y={pos[d].y}
            textAnchor="middle"
            className="screen-label"
          >
            {DIRECTION_LABEL[d]}
          </text>
        );
      })}

      {empty ? (
        <g data-testid={`${testid}-empty`}>
          <rect
            x={STAMP_X}
            y={STAMP_Y}
            width={STAMP_W}
            height={STAMP_H}
            rx={6}
            fill="#f9fafb"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            className="placeholder-text"
          >
            {placeholder ?? '待选择'}
          </text>
        </g>
      ) : (
        <>
          {/* 邮票轮廓（按上边所在屏幕方向旋转） */}
          <g transform={`rotate(${SCREEN_ANGLE[stampTop!]} ${CENTER} ${CENTER})`}>
            <rect
              x={STAMP_X}
              y={STAMP_Y}
              width={STAMP_W}
              height={STAMP_H}
              rx={4}
              fill={mode === 'final' ? '#f0fdf4' : '#f8fafc'}
              stroke={mode === 'final' ? '#15803d' : '#334155'}
              strokeWidth={2.5}
              strokeDasharray="3 4"
            />
            {/* 上边标记：邮票局部顶部的色条 + “上边” */}
            <rect
              x={STAMP_X}
              y={STAMP_Y}
              width={STAMP_W}
              height={16}
              rx={4}
              fill={accent}
            />
            <text
              x={CENTER}
              y={STAMP_Y + 12}
              textAnchor="middle"
              className="topedge-label"
            >
              上边
            </text>
            <text x={CENTER} y={CENTER + 34} textAnchor="middle" className="face-hint">
              邮票
            </text>
          </g>

          {/* 镜像竖轴 */}
          {showAxis && (
            <line
              x1={CENTER}
              y1={26}
              x2={CENTER}
              y2={214}
              stroke="#b45309"
              strokeWidth={1.5}
              strokeDasharray="6 5"
            />
          )}

          {/* 镜像前残影 */}
          {ghostTip !== undefined && (
            <WatermarkArrow
              dir={ghostTip}
              color="#9ca3af"
              dashed
              opacity={0.75}
              markerId={`${testid}-arrow-ghost`}
            />
          )}

          {/* 水印尖端箭头（屏幕方向） */}
          <WatermarkArrow
            dir={tip!}
            color={accent}
            markerId={`${testid}-arrow`}
          />

          {annotation && (
            <text x={CENTER} y={205} textAnchor="middle" className="annotation">
              {annotation}
            </text>
          )}

          {mode === 'final' && (
            <text
              x={CENTER}
              y={92}
              textAnchor="middle"
              className="final-direction"
              data-testid={`${testid}-direction`}
            >
              目录视向：{DIRECTION_LABEL[tip!]}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
