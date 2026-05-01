import { RiseOutlined, SkinOutlined, TeamOutlined, UsergroupAddOutlined, PictureOutlined } from '@ant-design/icons'
import { useModel } from '@umijs/max'

const stats = [
  { label: '今日换装生成', value: '2,458', meta: '较昨日', trend: '18.6%', tone: 'violet', icon: <RiseOutlined /> },
  { label: '总换装数量', value: '156,782', meta: '较上周', trend: '11.2%', tone: 'blue', icon: <SkinOutlined /> },
  { label: '服装总数', value: '8,632', meta: '较上周', trend: '8.7%', tone: 'mint', icon: <TeamOutlined /> },
  { label: '模特总数', value: '512', meta: '较上周', trend: '6.3%', tone: 'amber', icon: <UsergroupAddOutlined /> },
  { label: '场景总数', value: '296', meta: '较上周', trend: '4.8%', tone: 'purple', icon: <PictureOutlined /> },
]

const Header: React.FC = () => {
  const { initialState } = useModel('@@initialState')
  const userInfo = initialState?.userInfo
  const hour = new Date().getHours()
  const greeting = hour < 11 ? '上午好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <section className="home-overview">
      <div className="home-greeting">
        <h1>{greeting}，{userInfo?.nickName || '设计师'}<span>👋</span></h1>
        <p>欢迎使用 云裳 AI 织境中枢，今日为您准备了最新的换装数据与智能洞察</p>
      </div>
      <div className="home-stat-cards">
        {stats.map((item) => (
          <article className={`home-stat-card ${item.tone}`} key={item.label}>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.meta}<em>↑ {item.trend}</em></small>
            </div>
            <i>{item.icon}</i>
          </article>
        ))}
      </div>
    </section>
  )
}

export default Header
