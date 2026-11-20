import { spawnSync } from 'node:child_process';
const files = [
  'scripts/ux01-ux05-functional.test.mjs',
  'scripts/p0-07-onboarding.test.mjs',
  'scripts/p0-08-fix02-upload-processing-ui.test.mjs',
  'scripts/d13j-dooh-player-inventory.test.mjs',
  'scripts/d13k-dooh-player-detail.test.mjs',
  'scripts/d15a1-pairing-assignment.test.mjs',
  'scripts/d15b4-media-upload.test.mjs',
  'scripts/d15b5-media-processing.test.mjs',
  'scripts/d15c1-playlists-readonly.test.mjs',
  'scripts/d15c3-playlist-draft-cas.test.mjs',
  'scripts/d15c4-playlist-reorder-cas.test.mjs',
  'scripts/d15c5-playlist-publish-qa.test.mjs',
  'scripts/d15d1-schedules-readonly.test.mjs',
  'scripts/d15d2-schedule-targets-cas.test.mjs',
  'scripts/d15d3-schedule-details-cas.test.mjs',
  'scripts/d15d5-schedule-publish-cas.test.mjs',
  'scripts/p0-05-publication-pilot-ui.test.mjs',
];
const result = spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...files], { stdio: 'inherit', cwd: process.cwd() });
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
