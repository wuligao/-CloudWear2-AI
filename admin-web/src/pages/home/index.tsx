import Header from './components/Header'
import ProjectCard from './components/ProjectCard'
import QuickNav from './components/QuickNav'
import './index.less'

const previewItems = [
  { name: '通勤白衬衫', tone: 'preview-a' },
  { name: '粉色礼服裙', tone: 'preview-b' },
  { name: '度假套装', tone: 'preview-c' },
  { name: '春季新品', tone: 'preview-d' },
]

const taskItems = [
  { title: '春季新品换装项目', meta: '生成完成 · 120张', time: '2分钟前', status: '成功' },
  { title: '电商主题换装', meta: '生成完成 · 80张', time: '15分钟前', status: '成功' },
  { title: '模特新品换装测试', meta: '生成中 · 45/120张', time: '32分钟前', status: '进行中' },
]

const Home = () => {
  return (
    <div className="cloudwear-home">
      <Header />
      <div className="home-dashboard-grid">
        <main className="home-main-column">
          <ProjectCard />
        </main>
        <aside className="home-side-column">
          <QuickNav />
          <section className="home-panel preview-card">
            <div className="home-section-head">
              <strong>换装效果预览</strong>
              <button type="button">查看更多</button>
            </div>
            <div className="preview-grid">
              {previewItems.map((item) => (
                <article className={item.tone} key={item.name}>
                  <span>{item.name}</span>
                  <b>AI 换装</b>
                </article>
              ))}
            </div>
            <div className="preview-dots" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          </section>
          <section className="home-panel task-card">
            <div className="home-section-head">
              <strong>最近任务</strong>
              <button type="button">查看更多</button>
            </div>
            <div className="task-list">
              {taskItems.map((item) => (
                <article key={item.title}>
                  <i />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <time>{item.time}</time>
                  <em className={item.status === '成功' ? 'success' : 'running'}>{item.status}</em>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Home
