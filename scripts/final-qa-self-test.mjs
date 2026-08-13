#!/usr/bin/env node
import assert from 'node:assert/strict';
import { inspectSpaDocumentResponse, isExpectedSpaDocumentFallback } from './final-qa-lib.mjs';

const shell = inspectSpaDocumentResponse(200, 'text/html; charset=utf-8', '<!doctype html><html><body><div id="root"></div></body></html>');
assert.equal(shell.ok, true);
assert.equal(shell.mode, 'direct-shell');

const github404 = inspectSpaDocumentResponse(404, 'text/html; charset=utf-8', '<!DOCTYPE html><html><head><title>Redirecting...</title><script src="/route-redirect.js"></script></head><body></body></html>');
assert.equal(github404.ok, true);
assert.equal(github404.mode, 'github-pages-spa-fallback');

const real404 = inspectSpaDocumentResponse(404, 'text/html', '<!doctype html><html><head><title>Not found</title></head><body>404</body></html>');
assert.equal(real404.ok, false);

const requested = 'https://onemediaap.com.br/buscar?q=Aguas%20Claras';
assert.equal(isExpectedSpaDocumentFallback({ status: 404, type: 'Document', url: requested }, requested, 'https://onemediaap.com.br'), true);
assert.equal(isExpectedSpaDocumentFallback({ status: 404, type: 'Image', url: 'https://onemediaap.com.br/assets/missing.png' }, requested, 'https://onemediaap.com.br'), false);
assert.equal(isExpectedSpaDocumentFallback({ status: 404, type: 'Document', url: 'https://onemediaap.com.br/outra' }, requested, 'https://onemediaap.com.br'), false);

console.log('Final QA self-test: PASS');
