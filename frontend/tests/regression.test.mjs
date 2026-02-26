import assert from 'node:assert/strict';
import { computeDisplayTotal } from '../src/pages/packages/pricing.ts';

assert.equal(computeDisplayTotal(100, 10, 5), 95);
assert.equal(computeDisplayTotal(73, 10, 7), 72.7);
assert.equal(computeDisplayTotal(50, 0, 3), 53);
console.log('frontend regression tests passed');
