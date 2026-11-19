import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../'+file, import.meta.url),'utf8');
const upload=read('src/components/DoohMediaUpload.tsx');
const processUi=read('src/components/DoohMediaProcessing.tsx');
const hook=read('src/lib/useDoohMediaPilotCapabilities.ts');

test('P0-03 UI only trusts backend capability response, not grant or build flag alone', () => {
  assert.match(hook, /apiClient\.get<unknown>\('\/dooh\/media\/capabilities'/);
  assert.match(hook, /typeof response\.uploadEnabled === 'boolean'/);
  assert.match(hook, /typeof response\.processingEnabled === 'boolean'/);
  assert.match(hook, /uploadEnabled: false, processingEnabled: false/);
});
test('P0-03 UI upload requires DOOH FULL, roles and server pilot upload enabled', () => {
  assert.match(upload, /canUploadDoohMedia\(/);
  assert.match(upload, /eligible && pilot\.uploadEnabled/);
  assert.match(upload, /!pilot\.uploadEnabled/);
  assert.match(upload, /dooh\/media\/uploads\/init/);
  assert.match(upload, /credentials: 'omit', redirect: 'error'/);
});
test('P0-03 UI enqueue requires server worker configured', () => {
  assert.match(processUi, /canRequestDoohProcessing\(/);
  assert.match(processUi, /eligibleQueue && pilot\.processingEnabled/);
  assert.match(processUi, /!pilot\.processingEnabled/);
  assert.match(processUi, /canEnqueueDoohProcessing/);
  assert.match(processUi, /\/process/);
});
test('P0-03 UI prevents stale cross-tenant capability responses', () => {
  assert.match(hook, /contextKey/);
  assert.match(hook, /abort\.signal\.aborted/);
  assert.match(hook, /\(\) => abort\.abort\(\)/);
  assert.match(hook, /result\?\.key === contextKey/);
});
test('P0-03 UI no credential or S3 secrets added to browser', () => {
  for(const source of [upload,processUi,hook]) {
    assert.doesNotMatch(source, /deviceSecret|pollToken|DATABASE_URL|AWS_SECRET_ACCESS_KEY/);
  }
});
