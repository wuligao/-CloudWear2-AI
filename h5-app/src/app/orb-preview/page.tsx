import {
  CheckCircle2,
  Clock3,
  ImagePlus,
  Loader2,
  Sparkles,
  WandSparkles,
} from "lucide-react";

const variants = [
  {
    key: "A",
    name: "Live 胶囊",
    className: "orb-live",
    title: "1 个生成",
    meta: "01:01 · 48%",
    note: "后台生成",
  },
  {
    key: "B",
    name: "高级黑金",
    className: "orb-noir",
    title: "生成中",
    meta: "01:01 / 48%",
    note: "LOOK 01",
  },
  {
    key: "C",
    name: "珍珠小球",
    className: "orb-pearl",
    title: "AI 生成",
    meta: "48%",
    note: "01:01",
  },
  {
    key: "D",
    name: "杂志贴纸",
    className: "orb-editorial",
    title: "1 个任务",
    meta: "48% · 01:01",
    note: "CloudWear",
  },
];

export default function OrbPreviewPage() {
  return (
    <main className="cw-orb-preview-page">
      <section className="cw-orb-preview-shell">
        <div className="cw-orb-preview-head">
          <span>GLOBAL PROGRESS</span>
          <h1>生成浮球样式</h1>
          <p>四版都按真实首页右下角悬浮状态做了尺寸、信息层级和动效预览。</p>
        </div>
        <div className="cw-orb-preview-grid">
          {variants.map((variant) => (
            <article className="cw-orb-preview-card" key={variant.key}>
              <div className="cw-orb-preview-phone">
                <div className="cw-orb-preview-hero">
                  <small>AI STYLING STUDIO</small>
                  <strong>今日穿搭</strong>
                  <span>根据天气和风格偏好生成中</span>
                </div>
                <div className="cw-orb-preview-weather">
                  <div>
                    <Clock3 size={15} />
                    <span>明日穿搭推荐</span>
                  </div>
                  <strong>19°C</strong>
                  <small>多云 · 适合轻层次</small>
                </div>
                <PreviewOrb variant={variant} />
                <div className="cw-orb-preview-nav">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="cw-orb-preview-caption">
                <b>{variant.key}</b>
                <div>
                  <strong>{variant.name}</strong>
                  <span>{getVariantDescription(variant.key)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function PreviewOrb({
  variant,
}: {
  variant: (typeof variants)[number];
}) {
  if (variant.key === "A") {
    return (
      <button className={`cw-orb-sample ${variant.className}`} type="button">
        <span className="orb-sample-ring">
          <Loader2 size={17} />
        </span>
        <span className="orb-sample-copy">
          <strong>{variant.title}</strong>
          <small>{variant.meta}</small>
        </span>
        <i>1</i>
      </button>
    );
  }

  if (variant.key === "B") {
    return (
      <button className={`cw-orb-sample ${variant.className}`} type="button">
        <span className="orb-sample-plate">
          <WandSparkles size={17} />
        </span>
        <span className="orb-sample-copy">
          <small>{variant.note}</small>
          <strong>{variant.title}</strong>
          <em>{variant.meta}</em>
        </span>
        <span className="orb-sample-bar">
          <span />
        </span>
      </button>
    );
  }

  if (variant.key === "C") {
    return (
      <button className={`cw-orb-sample ${variant.className}`} type="button">
        <span className="orb-sample-pearl">
          <Sparkles size={18} />
        </span>
        <span className="orb-sample-copy">
          <strong>{variant.meta}</strong>
          <small>{variant.note}</small>
        </span>
        <i>1</i>
      </button>
    );
  }

  return (
    <button className={`cw-orb-sample ${variant.className}`} type="button">
      <span className="orb-sample-sticker">
        <ImagePlus size={17} />
      </span>
      <span className="orb-sample-copy">
        <small>{variant.note}</small>
        <strong>{variant.title}</strong>
        <em>{variant.meta}</em>
      </span>
      <CheckCircle2 size={16} />
    </button>
  );
}

function getVariantDescription(key: string) {
  if (key === "A") return "最像系统级通知，清爽、可信、适合长期悬浮。";
  if (key === "B") return "更像高端时装工具，质感强，和首页黑色英雄区呼应。";
  if (key === "C") return "占位最小，拖动不挡内容，适合保守上线。";
  return "更有品牌记忆点，像贴在页面上的编辑部进度签。";
}
