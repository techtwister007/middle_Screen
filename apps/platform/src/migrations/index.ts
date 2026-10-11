import * as migration_20261011_020010_initial from './20261011_020010_initial';

export const migrations = [
  {
    up: migration_20261011_020010_initial.up,
    down: migration_20261011_020010_initial.down,
    name: '20261011_020010_initial'
  },
];
