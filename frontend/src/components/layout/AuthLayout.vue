<template>
  <div class="auth-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
    <div class="auth-atmosphere pointer-events-none absolute inset-0" aria-hidden="true"></div>
    <div class="auth-grid pointer-events-none absolute inset-0" aria-hidden="true"></div>

    <!-- Content Container -->
    <div class="relative z-10 w-full max-w-[430px]">
      <!-- Logo/Brand -->
      <div v-if="settingsLoaded" class="mb-7 text-center">
        <!-- Custom Logo or Default Logo -->
        <div class="auth-logo mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl">
          <img :src="siteLogo || '/logo.svg'" alt="Logo" class="h-full w-full object-contain" />
        </div>
        <h1 class="auth-title mb-1.5 text-[2rem] font-bold">
          {{ siteName }}
        </h1>
        <p class="auth-subtitle text-sm">
          {{ siteSubtitle }}
        </p>
      </div>

      <!-- Card Container -->
      <div class="auth-card rounded-3xl">
        <slot />
      </div>

      <!-- Footer Links -->
      <div class="auth-footer mt-6 text-center text-sm">
        <slot name="footer" />
      </div>

      <!-- Copyright -->
      <div class="auth-copyright mt-8 text-center text-xs">
        &copy; {{ currentYear }} {{ siteName }}. All rights reserved.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { sanitizeUrl } from '@/utils/url'

const appStore = useAppStore()

const siteName = computed(() => appStore.siteName || 'LargeChestnut')
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || 'Subscription to API Conversion Platform')
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)

const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  appStore.fetchPublicSettings()
})
</script>

<style scoped>
.auth-shell {
  background: #f6f5f2;
  color: #171513;
}

.auth-atmosphere {
  background:
    radial-gradient(circle at 82% 4%, rgba(200, 68, 37, 0.075), transparent 28rem),
    radial-gradient(circle at 8% 88%, rgba(23, 21, 19, 0.045), transparent 30rem);
}

.auth-grid {
  background-image:
    linear-gradient(rgba(23, 21, 19, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 21, 19, 0.035) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.72), transparent 78%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.72), transparent 78%);
}

.auth-logo {
  border: 1px solid rgba(23, 21, 19, 0.1);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 14px 34px rgba(20, 18, 14, 0.1);
}

.auth-title {
  letter-spacing: -0.045em;
}

.auth-subtitle {
  color: #6c655d;
}

.auth-card {
  position: relative;
  border: 1px solid rgba(23, 21, 19, 0.09);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 26px 70px rgba(20, 18, 14, 0.085);
  padding: clamp(1.35rem, 4vw, 2rem);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.auth-card::before {
  position: absolute;
  top: -1px;
  left: 2rem;
  width: 4.5rem;
  height: 2px;
  border-radius: 999px;
  background: #c84425;
  content: '';
}

.auth-footer {
  color: #6c655d;
}

.auth-copyright {
  color: #989189;
}

.dark .auth-shell {
  background: #24211d;
  color: #f7f3ec;
}

.dark .auth-atmosphere {
  background:
    radial-gradient(circle at 82% 4%, rgba(255, 132, 96, 0.11), transparent 28rem),
    radial-gradient(circle at 8% 88%, rgba(255, 240, 220, 0.055), transparent 30rem);
}

.dark .auth-grid {
  background-image:
    linear-gradient(rgba(255, 246, 232, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 246, 232, 0.04) 1px, transparent 1px);
}

.dark .auth-logo {
  border-color: rgba(255, 246, 232, 0.14);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
}

.dark .auth-subtitle,
.dark .auth-footer {
  color: #c0b7aa;
}

.dark .auth-card {
  border-color: rgba(255, 246, 232, 0.11);
  background: rgba(46, 42, 37, 0.94);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.2);
}

.dark .auth-card::before {
  background: #ff7653;
}

.dark .auth-copyright {
  color: #92897e;
}
</style>
