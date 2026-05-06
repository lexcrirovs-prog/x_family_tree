import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAuthRedirectUrl } from './authRedirect.ts';

test('builds magic-link redirect for the deployed base path', () => {
  assert.equal(getAuthRedirectUrl('https://kotelgavno.ru', '/family/'), 'https://kotelgavno.ru/family/');
});

test('normalizes a base path without a trailing slash', () => {
  assert.equal(getAuthRedirectUrl('https://kotelgavno.ru', '/family'), 'https://kotelgavno.ru/family/');
});
