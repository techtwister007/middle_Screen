import * as migration_20261011_020010_initial from './20261011_020010_initial';
import * as migration_20261011_024428_salon_extras from './20261011_024428_salon_extras';
import * as migration_20261011_041047_change_cutoff from './20261011_041047_change_cutoff';
import * as migration_20261011_042500_refunds from './20261011_042500_refunds';
import * as migration_20261011_044647_design_styles_library from './20261011_044647_design_styles_library';
import * as migration_20261011_045743_allergies_tips_receipts from './20261011_045743_allergies_tips_receipts';

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
    name: '20261011_042500_refunds',
  },
  {
    up: migration_20261011_044647_design_styles_library.up,
    down: migration_20261011_044647_design_styles_library.down,
    name: '20261011_044647_design_styles_library',
  },
  {
    up: migration_20261011_045743_allergies_tips_receipts.up,
    down: migration_20261011_045743_allergies_tips_receipts.down,
    name: '20261011_045743_allergies_tips_receipts'
  },
];
