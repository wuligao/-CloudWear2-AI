const outfits = [
  { title: '法式碎花连衣裙', count: '2,856', swatch: 'dress-a' },
  { title: '白色衬衫', count: '2,342', swatch: 'dress-b' },
  { title: '牛仔外套', count: '1,987', swatch: 'dress-c' },
  { title: '黑色西装外套', count: '1,563', swatch: 'dress-d' },
  { title: '针织开衫', count: '1,256', swatch: 'dress-e' },
]

const scenes = [
  { title: '室内客厅', count: '3,456', swatch: 'scene-a' },
  { title: '街道', count: '2,789', swatch: 'scene-b' },
  { title: '商场', count: '2,345', swatch: 'scene-c' },
  { title: '户外花园', count: '1,876', swatch: 'scene-d' },
  { title: '办公室', count: '1,543', swatch: 'scene-e' },
]

const ProjectCard: React.FC = () => {
  return (
    <>
      <section className="home-panel chart-card">
        <div className="home-section-head">
          <strong>AI 换装数据趋势</strong>
          <button type="button">近7天⌄</button>
        </div>
        <div className="chart-legend">
          <span className="violet">生成数量</span>
          <span className="blue">成功率</span>
          <span className="mint">用户满意度</span>
        </div>
        <div className="trend-chart" aria-label="AI 换装趋势图">
          <svg viewBox="0 0 720 260" role="img">
            <defs>
              <linearGradient id="violetArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8b75ff" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#8b75ff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="blueArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#72c3ff" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#72c3ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className="chart-grid">
              <path d="M44 36H682M44 88H682M44 140H682M44 192H682" />
              <path d="M44 36V218M178 36V218M312 36V218M446 36V218M580 36V218M682 36V218" />
            </g>
            <path className="area violet-area" d="M44 132C112 94 148 196 218 152C290 107 312 72 392 92C468 111 508 182 580 142C634 112 652 70 682 92V218H44Z" />
            <path className="area blue-area" d="M44 178C112 206 164 191 218 164C286 132 334 112 392 126C458 141 504 94 580 118C626 132 654 156 682 168V218H44Z" />
            <path className="line violet-line" d="M44 132C112 94 148 196 218 152C290 107 312 72 392 92C468 111 508 182 580 142C634 112 652 70 682 92" />
            <path className="line blue-line" d="M44 178C112 206 164 191 218 164C286 132 334 112 392 126C458 141 504 94 580 118C626 132 654 156 682 168" />
            <path className="line mint-line" d="M44 190C112 210 178 198 244 176C312 153 350 145 426 166C492 184 548 160 612 174C646 182 666 190 682 196" />
            <path className="line dash-line" d="M44 110C112 142 160 92 226 116C302 144 352 114 420 76C494 32 546 54 606 92C644 116 662 132 682 126" />
            <circle cx="500" cy="78" r="6" />
            <circle cx="500" cy="126" r="6" />
            <foreignObject x="455" y="146" width="165" height="88">
              <div className="chart-tooltip">
                <strong>05-17</strong>
                <span><i />生成数量 <b>2,856</b></span>
                <span><i />成功率 <b>92.3%</b></span>
                <span><i />用户满意度 <b>88.7%</b></span>
              </div>
            </foreignObject>
          </svg>
          <div className="chart-axis">
            <span>05-13</span><span>05-14</span><span>05-15</span><span>05-16</span><span>05-17</span><span>05-18</span><span>05-19</span>
          </div>
        </div>
      </section>

      <div className="home-bottom-grid">
        <section className="home-panel success-card">
          <div className="home-section-head">
            <strong>换装成功率</strong>
          </div>
          <div className="success-ring">
            <strong>92.3%</strong>
            <span>整体成功率</span>
          </div>
          <div className="success-metrics">
            <span><i />成功 <b>45,682</b></span>
            <span><i />失败 <b>3,821</b></span>
            <span><i />重试 <b>1,256</b></span>
          </div>
        </section>

        <RankingCard title="热门服装 TOP5" items={outfits} />
        <RankingCard title="热门场景 TOP5" items={scenes} />
      </div>
    </>
  )
}

const RankingCard: React.FC<{ title: string; items: typeof outfits }> = ({ title, items }) => {
  return (
    <section className="home-panel ranking-card">
      <div className="home-section-head">
        <strong>{title}</strong>
        <span>换装次数</span>
      </div>
      <div className="ranking-list">
        {items.map((item, index) => (
          <article key={item.title}>
            <em>{index + 1}</em>
            <i className={item.swatch} />
            <span>{item.title}</span>
            <b>{item.count}</b>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ProjectCard
