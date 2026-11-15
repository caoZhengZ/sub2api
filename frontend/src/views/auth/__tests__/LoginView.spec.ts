import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginView from '@/views/auth/LoginView.vue'

const { getPublicSettingsMock, pushMock, createDesktopHandoffMock, routeQuery } = vi.hoisted(() => ({
  getPublicSettingsMock: vi.fn(),
  pushMock: vi.fn(),
  createDesktopHandoffMock: vi.fn(),
  routeQuery: {} as Record<string, unknown>
}))

const publicSettings = {
  registration_enabled: true,
  turnstile_enabled: false,
  turnstile_site_key: '',
  tencent_captcha_enabled: false,
  tencent_captcha_app_id: '',
  aliyun_captcha_enabled: false,
  aliyun_captcha_scene_id: '',
  aliyun_captcha_prefix: '',
  linuxdo_oauth_enabled: false,
  dingtalk_oauth_enabled: false,
  wechat_oauth_enabled: false,
  backend_mode_enabled: false,
  oidc_oauth_enabled: false,
  oidc_oauth_provider_name: 'OIDC',
  github_oauth_enabled: false,
  google_oauth_enabled: false,
  password_reset_enabled: false,
  passkey_enabled: false,
  login_agreement_enabled: false,
  login_agreement_documents: []
}

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
    currentRoute: { value: { query: routeQuery } }
  })
}))

vi.mock('vue-i18n', () => ({
  createI18n: () => ({
    global: {
      t: (key: string) => key
    }
  }),
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
    loginWithPasskey: vi.fn(),
    login2FA: vi.fn()
  }),
  useAppStore: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn()
  })
}))

vi.mock('@/api/auth', () => ({
  buildOAuthLoginStartURL: vi.fn(),
  createDesktopHandoff: (...args: unknown[]) => createDesktopHandoffMock(...args),
  getPublicSettings: (...args: unknown[]) => getPublicSettingsMock(...args),
  isTotp2FARequired: vi.fn(() => false),
  isWeChatWebOAuthEnabled: vi.fn(() => false),
  startOAuthLogin: vi.fn()
}))

function mountLogin() {
  return mount(LoginView, {
    global: {
      stubs: {
        AuthLayout: { template: '<div><slot /><slot name="footer" /></div>' },
        DingTalkOAuthSection: true,
        EmailOAuthButtons: true,
        Icon: true,
        LinuxDoOAuthSection: true,
        LoginAgreementPrompt: true,
        OidcOAuthSection: true,
        RouterLink: { template: '<a><slot /></a>' },
        TotpLoginModal: true,
        TurnstileWidget: true,
        WechatOAuthSection: true,
        transition: false
      }
    }
  })
}

describe('LoginView registration entry', () => {
  beforeEach(() => {
    getPublicSettingsMock.mockReset()
    pushMock.mockReset()
    createDesktopHandoffMock.mockReset()
    Object.keys(routeQuery).forEach(key => delete routeQuery[key])
    getPublicSettingsMock.mockResolvedValue(publicSettings)
  })

  it('shows the registration entry when registration is enabled', async () => {
    const wrapper = mountLogin()
    await flushPromises()

    expect(wrapper.text()).toContain('auth.signUp')
  })

  it('hides the registration entry when registration is disabled', async () => {
    getPublicSettingsMock.mockResolvedValueOnce({
      ...publicSettings,
      registration_enabled: false
    })

    const wrapper = mountLogin()
    await flushPromises()

    expect(wrapper.text()).not.toContain('auth.signUp')
  })

  it('shows an explicit return button after LargeChestnut desktop handoff login', async () => {
    routeQuery.desktop_state = 's'.repeat(43)
    routeQuery.desktop_challenge = 'c'.repeat(43)
    createDesktopHandoffMock.mockResolvedValue({ code: 'one-time-code' })
    const wrapper = mountLogin()
    await flushPromises()
    await wrapper.get('#email').setValue('user@example.com')
    await wrapper.get('#password').setValue('local-test-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createDesktopHandoffMock).toHaveBeenCalledWith('s'.repeat(43), 'c'.repeat(43))
    expect(wrapper.text()).toContain('auth.desktopLoginReadyTitle')
    const callback = new URL(wrapper.get('a[href^="zcode://"]').attributes('href')!)
    expect(callback.searchParams.get('provider')).toBe('largechestnut-sub2api')
    expect(callback.searchParams.get('state')).toBe('s'.repeat(43))
    expect(callback.searchParams.get('code')).toBe('one-time-code')
    expect(pushMock).not.toHaveBeenCalled()
  })
})
