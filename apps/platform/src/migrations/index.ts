import * as migration_20261011_020010_initial from './20261011_020010_initial';
import * as migration_20261011_024428_salon_extras from './20261011_024428_salon_extras';
import * as migration_20261011_041047_change_cutoff from './20261011_041047_change_cutoff';
import * as migration_20261011_042500_refunds from './20261011_042500_refunds';

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
  {
    up: migration_20261011_041047_change_cutoff.up,
    down: migration_20261011_041047_change_cutoff.down,
    name: '20261011_041047_change_cutoff',
  },
  {
    up: migration_20261011_042500_refunds.up,
    down: migration_20261011_042500_refunds.down,
    name: '20261011_042500_refunds'
  },
];
