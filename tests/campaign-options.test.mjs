import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignOptions} from '../scripts/campaign-options.mjs';
test('campaign defaults keep the original twelve missions and seed',()=>{
 assert.deepEqual(campaignOptions(),{from:1,to:12,seeds:[73]});
});
test('qualification may resume at a bounded mission range',()=>{
 assert.deepEqual(campaignOptions({LEVEL_FROM:'8',LEVEL_TO:'12',SEED:'509'}),{from:8,to:12,seeds:[509]});
});
test('explicit seed overrides the complete matrix flag',()=>{
 assert.deepEqual(campaignOptions({SEED:'0',FULL_CAMPAIGN:'1'}).seeds,[0]);
 assert.deepEqual(campaignOptions({FULL_CAMPAIGN:'1'}).seeds,[11,73,509]);
});
test('invalid or inverted mission ranges are rejected',()=>{
 for(const env of [{LEVEL_FROM:'0'},{LEVEL_TO:'13'},{LEVEL_FROM:'8',LEVEL_TO:'2'},{LEVEL_FROM:'1.5'}])
  assert.throws(()=>campaignOptions(env));
});
test('non-finite negative and oversized seeds are rejected',()=>{
 for(const SEED of ['NaN','Infinity','-1','1.5','4294967296']) assert.throws(()=>campaignOptions({SEED}));
});
