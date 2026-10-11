import * as migration_20261011_020010_initial from './20261011_020010_initial'
import * as migration_20261011_024428_salon_extras from './20261011_024428_salon_extras'

export const migrations = [
  {
    up: migration_20261011_020010_initial.up,
    down: migration_20261011_020010_initial.down,
    name: '20261011_020010_initial',
  },
  {
    up: migration_20261011_024428_salon_extras.up,
    down: migration_20261011_024428_salon_extras.down,
    name: '20261011_024428_salon_extras',
  },
]
