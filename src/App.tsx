import { useMemo, useState } from 'react';
import {
  DIRECTIONS,
  DIRECTION_LABEL,
  FACE_LABEL,
  normalize,
  rotationDegrees,
  type Direction,
  type Face,
} from './domain/orientation';
import { StampFigure } from './components/StampFigure';

type Maybe<T> = T | undefined;

interface ChoiceGroupProps<T extends string> {
  testid: string;
  label: string;
  options: readonly T[];
  optionLabel: (value: T) => string;
  value: Maybe<T>;
  error: string | undefined;
  touched: boolean;
  onSelect: (value: T) => void;
}

function ChoiceGroup<T extends string>({
  testid,
  label,
  options,
  optionLabel,
  value,
  error,
  touched,
  onSelect,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset
      className="control"
      aria-invalid={touched && !!error}
      data-testid={testid}
    >
      <legend className="control-label">{label}</legend>
      <div className="choice-row">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`choice${value === option ? ' choice-active' : ''}`}
            aria-pressed={value === option}
            data-testid={`${testid}-${option}`}
            onClick={() => onSelect(option)}
          >
            {optionLabel(option)}
          </button>
        ))}
      </div>
      {touched && error && (
        <span className="error" data-testid={`${testid}-error`}>
          ⚠ {error}
        </span>
      )}
    </fieldset>
  );
}

const FACES: readonly Face[] = ['design', 'gum'];

export default function App() {
  const [face, setFace] = useState<Maybe<Face>>(undefined);
  const [top, setTop] = useState<Maybe<Direction>>(undefined);
  const [tip, setTip] = useState<Maybe<Direction>>(undefined);
  const [touched, setTouched] = useState({
    face: false,
    top: false,
    tip: false,
  });
  const [attempted, setAttempted] = useState(false);

  const showError = (key: keyof typeof touched) =>
    attempted || touched[key];

  const errors = {
    face: face === undefined ? '请选择观察面' : undefined,
    top: top === undefined ? '请指出邮票上边所在方向' : undefined,
    tip: tip === undefined ? '请选择水印尖端方向' : undefined,
  };

  // 只要任一选择变化，结论即依据当前三项重新计算；缺项时结果为 undefined，
  // 旧结论因此立即消失。
  const result = useMemo(() => {
    if (face === undefined || top === undefined || tip === undefined) {
      return undefined;
    }
    return normalize({ face, top, tip });
  }, [face, top, tip]);

  const toggle = <T,>(
    setter: (v: Maybe<T>) => void,
    current: Maybe<T>,
    next: T,
    key: keyof typeof touched,
  ) => {
    setter(current === next ? undefined : next);
    setTouched((t) => ({ ...t, [key]: true }));
  };

  const cwDegrees = top !== undefined ? rotationDegrees(top) : 0;

  return (
    <main className="page">
      <header>
        <h1>邮票水印目录视向校核器</h1>
        <p className="rule">
          归一规则（固定两步）：① 先把邮票上边<b>旋转</b>到屏幕上方；②
          若观察自<b>背胶面</b>，再沿归位后画面的竖轴做一次左右<b>镜像</b>；
          图案面不镜像。最终水印尖端方向即目录视向。全程离线运行，不调用在线服务。
        </p>
      </header>

      <section className="controls" aria-label="观察输入">
        <ChoiceGroup<Face>
          testid="face-control"
          label="① 观察面"
          options={FACES}
          optionLabel={(f) => FACE_LABEL[f]}
          value={face}
          error={errors.face}
          touched={showError('face')}
          onSelect={(f) => toggle(setFace, face, f, 'face')}
        />
        <ChoiceGroup<Direction>
          testid="top-control"
          label="② 当前画面中，邮票上边所在方向"
          options={DIRECTIONS}
          optionLabel={(d) => DIRECTION_LABEL[d]}
          value={top}
          error={errors.top}
          touched={showError('top')}
          onSelect={(d) => toggle(setTop, top, d, 'top')}
        />
        <ChoiceGroup<Direction>
          testid="tip-control"
          label="③ 当前画面中，水印尖端所指方向"
          options={DIRECTIONS}
          optionLabel={(d) => DIRECTION_LABEL[d]}
          value={tip}
          error={errors.tip}
          touched={showError('tip')}
          onSelect={(d) => toggle(setTip, tip, d, 'tip')}
        />
        <div className="actions">
          <button
            type="button"
            className="verify-btn"
            data-testid="verify-button"
            onClick={() => setAttempted(true)}
          >
            校核目录视向
          </button>
        </div>
      </section>

      {result ? (
        <section
          className="result"
          data-testid="result-banner"
          key={`${face}-${top}-${tip}`}
        >
          <span>
            {FACE_LABEL[face!]}观察 · 上边在{DIRECTION_LABEL[top!]} ·
            尖端朝{DIRECTION_LABEL[tip!]}
          </span>
          <strong data-testid="result-direction">
            目录视向：{DIRECTION_LABEL[result.catalog]}
          </strong>
        </section>
      ) : (
        (attempted ||
          touched.face ||
          touched.top ||
          touched.tip) && (
          <section className="result result-pending" data-testid="result-banner">
            选择不完整：请补全上方带提示的选择项后，才会给出结论。
          </section>
        )
      )}

      <section className="panels" aria-label="归一过程图示">
        <figure className="panel">
          <figcaption>1. 原始观察轮廓</figcaption>
          <StampFigure
            mode="input"
            testid="figure-input"
            stampTop={top}
            tip={tip}
            placeholder={
              top === undefined || tip === undefined
                ? '待选择上边/尖端'
                : undefined
            }
          />
        </figure>

        <figure className="panel">
          <figcaption>2. 旋转归位（上边朝上）</figcaption>
          <StampFigure
            mode="step"
            testid="figure-rotated"
            stampTop={result ? 'U' : undefined}
            tip={result?.afterRotation}
            annotation={
              result
                ? `整体顺时针 ${cwDegrees}°，尖端 → ${DIRECTION_LABEL[result.afterRotation]}`
                : '先选择三项'
            }
            placeholder="待选择上边/尖端"
          />
        </figure>

        <figure className="panel">
          <figcaption>
            3. {face === 'gum' ? '背胶面：竖轴左右镜像' : '镜像步骤（按观察面）'}
          </figcaption>
          {face === 'gum' && result ? (
            <StampFigure
              mode="mirror"
              testid="figure-mirror"
              stampTop="U"
              tip={result.catalog}
              ghostTip={result.afterRotation}
              showAxis
              annotation="沿竖轴左右镜像（背胶面必做）"
            />
          ) : (
            <StampFigure
              mode="step"
              testid="figure-mirror"
              stampTop={result ? 'U' : undefined}
              tip={result?.afterRotation}
              annotation={
                result ? '图案面：不镜像，方向保持' : '先选择三项'
              }
              placeholder="待选择上边/尖端"
            />
          )}
        </figure>

        <figure className="panel panel-final">
          <figcaption>4. 最终目录轮廓</figcaption>
          <StampFigure
            mode="final"
            testid="figure-final"
            stampTop={result ? 'U' : undefined}
            tip={result?.catalog}
            annotation={
              result
                ? `${FACE_LABEL[face!]} → 目录视向 ${DIRECTION_LABEL[result.catalog]}`
                : '尚无结论'
            }
            placeholder="尚无结论"
          />
        </figure>
      </section>
    </main>
  );
}
