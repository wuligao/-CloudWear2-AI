import { KeyOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { LoginForm, ProFormCheckbox, ProFormText } from '@ant-design/pro-components'
import { useModel, useRequest } from '@umijs/max'
import { Space, Typography } from 'antd'
import { flushSync } from 'react-dom'
import { login, captcha } from '@/apis/auth/login'
import type { LoginParams } from '@/apis/auth/login'
import { Message } from '@/components/App'
import { PageEnum } from '@/enums/pageEnum'
import { Footer } from '@/layouts/default'
import { setToken } from '@/utils/auth'
import './index.less'

const Login = () => {
  const { initialState, setInitialState } = useModel('@@initialState')
  const { data: captchaImage, run: runCaptchaImage } = useRequest(captcha)

  const fetchUserInfo = async (): Promise<void> => {
    const userInfo = await initialState?.fetchUserInfo?.()
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          ...userInfo,
        }))
      })
    }
  }

  const handleLogin = async (values: LoginParams) => {
    try {
      const token = await login({
        ...values,
        uuid: captchaImage?.uuid,
      })
      setToken(token.token)
      await fetchUserInfo()
      Message.loading('登录中...')
      window.location.href = PageEnum.BASE_HOME
    } catch (error: any) {
      runCaptchaImage()
      Message.error(error.message || '登录失败，请重试！')
    }
  }

  return (
    <div className="cloudwear-login">
      <section className="login-visual">
        <div className="brand-mark">
          <span><img src="/logo.svg" alt="" /></span>
          云裳 AI 织境中枢
        </div>
        <div className="login-claim">
          <Typography.Title level={1}>云裳 AI 织境中枢</Typography.Title>
          <Typography.Paragraph>模型接入、H5 配置、内容运营与生成任务统一调度。</Typography.Paragraph>
        </div>
        <div className="login-orbit" aria-hidden="true">
          <i className="orbit-a" />
          <i className="orbit-b" />
          <i className="orbit-core" />
          <span className="node node-one" />
          <span className="node node-two" />
          <span className="node node-three" />
        </div>
        <div className="login-metrics">
          <span><strong>AI</strong> 模型路由</span>
          <span><strong>H5</strong> 内容配置</span>
          <span><strong>RBAC</strong> 权限控制</span>
        </div>
      </section>

      <section className="login-panel">
        <LoginForm title="云裳 AI 织境中枢" subTitle="登录控制台继续管理模型和 H5 体验" onFinish={handleLogin}>
          <ProFormText
            name="username"
            initialValue={'admin'}
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined className={'prefixIcon'} />,
            }}
            placeholder={'用户名'}
            rules={[
              {
                required: true,
                message: '请输入用户名!',
              },
            ]}
          />
          <ProFormText.Password
            name="password"
            initialValue={'Aa@123456'}
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined className={'prefixIcon'} />,
            }}
            placeholder={'密码'}
            rules={[
              {
                required: true,
                message: '请输入密码！',
              },
            ]}
          />
          {captchaImage ? (
            <Space>
              <ProFormText
                name="code"
                fieldProps={{
                  size: 'large',
                  prefix: <KeyOutlined className={'prefixIcon'} />,
                  autoFocus: true,
                }}
                placeholder={'验证码'}
                rules={[
                  {
                    required: true,
                    message: '请输入验证码!',
                  },
                ]}
              />
              <div
                className="flex cursor-pointer mb-[24px]"
                dangerouslySetInnerHTML={{ __html: captchaImage.img }}
                onClick={runCaptchaImage}
              />
            </Space>
          ) : null}
          <div className="mb-5">
            <ProFormCheckbox noStyle name="autoLogin">
              自动登录
            </ProFormCheckbox>
            <a className="float-right">忘记密码</a>
          </div>
        </LoginForm>
        <Footer />
      </section>
    </div>
  )
}

export default Login
