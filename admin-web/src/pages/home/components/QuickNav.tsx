import { PictureOutlined, SkinOutlined, UserAddOutlined, StarOutlined } from '@ant-design/icons'
import { history } from '@umijs/max'

const items = [
  {
    title: '新建换装任务',
    desc: 'AI智能换装生成',
    icon: <StarOutlined />,
    path: '/ai/model',
    tone: 'violet',
  },
  {
    title: '上传服装',
    desc: '添加新服装资源',
    icon: <SkinOutlined />,
    path: '/ai/h5-config',
    tone: 'blue',
  },
  {
    title: '添加模特',
    desc: '创建模特数字人',
    icon: <UserAddOutlined />,
    path: '/ai/h5-config',
    tone: 'mint',
  },
  {
    title: '新建场景',
    desc: '构建换装场景',
    icon: <PictureOutlined />,
    path: '/ai/h5-config',
    tone: 'cyan',
  },
]

const QuickNav: React.FC = () => {
  return (
    <section className="home-panel quick-nav-card">
      <div className="home-section-head">
        <strong>快速操作</strong>
        <button type="button">自定义</button>
      </div>
      <div className="quick-nav-grid">
        {items.map((item) => (
          <button className={item.tone} key={item.title} type="button" onClick={() => history.push(item.path)}>
            <i>{item.icon}</i>
            <span>
              <b>{item.title}</b>
              <small>{item.desc}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default QuickNav
