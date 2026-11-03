import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context=vm.createContext({Date});
vm.runInContext(await readFile(new URL('../assets/js/renovacions.js',import.meta.url),'utf8'),context);
function parts(value){const d=context.nextRenewalDate(value);return d?[d.getFullYear(),d.getMonth()+1,d.getDate()]:null}
test('reminder after exactly one calendar month',()=>assert.deepEqual(parts(new Date(2026,9,3,12)),[2026,11,3]));
test('month end clamps instead of skipping February',()=>assert.deepEqual(parts(new Date(2026,0,31,12)),[2026,2,28]));
test('leap year preserves February 29',()=>assert.deepEqual(parts(new Date(2028,0,31,12)),[2028,2,29]));
test('December rolls into the next year',()=>assert.deepEqual(parts(new Date(2026,11,31,12)),[2027,1,31]));
test('invalid date does not invent a deadline',()=>assert.equal(context.nextRenewalDate('invalid'),null));
