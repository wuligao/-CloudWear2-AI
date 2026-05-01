import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertH5Password,
  buildH5CreateUser,
  normalizeH5Phone,
  toH5AuthUser,
} from '../src/modules/auth/h5/h5-auth.utils.ts'

test('normalizeH5Phone accepts mainland China mobile numbers with spaces', () => {
  assert.equal(normalizeH5Phone(' 138 0013 8000 '), '13800138000')
})

test('normalizeH5Phone rejects invalid phone numbers', () => {
  assert.throws(() => normalizeH5Phone('12800138000'), /请输入正确的手机号/)
})

test('assertH5Password rejects short passwords', () => {
  assert.throws(() => assertH5Password('12345'), /密码长度需为 6-32 位/)
})

test('buildH5CreateUser creates an active mobile H5 account payload', () => {
  assert.deepEqual(buildH5CreateUser({
    phone: '13800138000',
    password: '123456',
  }), {
    userName: '13800138000',
    nickName: '云裳用户8000',
    phonenumber: '13800138000',
    password: '123456',
    userType: '10',
    status: '0',
    sex: '3',
  })
})

test('toH5AuthUser exposes only public profile fields', () => {
  const user = toH5AuthUser({
    userId: 12,
    userName: '13800138000',
    sysUser: {
      userId: 12,
      userName: '13800138000',
      nickName: '云裳用户8000',
      phonenumber: '13800138000',
      avatar: 'https://example.com/avatar.png',
      password: 'secret-hash',
    },
  })

  assert.deepEqual(user, {
    userId: 12,
    userName: '13800138000',
    phone: '13800138000',
    nickName: '云裳用户8000',
    avatar: 'https://example.com/avatar.png',
  })
  assert.equal('password' in user, false)
})
