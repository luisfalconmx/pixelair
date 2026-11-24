import type { UserConfig } from '@commitlint/types'

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      ['app', 'ui', 'core', 'tauri', 'deps', 'ci', 'docker', 'test', 'e2e', 'release', 'skills'],
    ],
    'body-max-line-length': [0],
  },
}

export default config
