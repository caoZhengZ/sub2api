import { ref } from 'vue'

const isDark = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

export function useTheme() {
  if (typeof document !== 'undefined') {
    isDark.value = document.documentElement.classList.contains('dark')
  }

  return { isDark, toggleTheme }
}
