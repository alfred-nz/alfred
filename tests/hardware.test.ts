import test from 'node:test';
import assert from 'node:assert/strict';
import { assess } from '../electron/hardware';

const mac={platform:'darwin',appleSilicon:true,freeDiskGB:200};
const pc={platform:'win32',appleSilicon:false,freeDiskGB:200};
test('Apple Silicon with 16 GB runs the local model well',()=>assert.equal(assess({...mac,memoryGB:16}).verdict,'good'));
test('Apple Silicon with 8 GB is tight, Intel Mac is slow',()=>{
  assert.equal(assess({...mac,memoryGB:8}).verdict,'slow');
  assert.equal(assess({...mac,appleSilicon:false,memoryGB:32}).verdict,'slow');
});
test('a PC needs a 6 GB graphics card to count as good',()=>{
  assert.equal(assess({...pc,memoryGB:16,gpuGB:8}).verdict,'good');
  assert.equal(assess({...pc,memoryGB:32,gpuGB:4}).verdict,'slow');
  assert.equal(assess({...pc,memoryGB:32}).verdict,'slow');
});
test('too little memory or disk sends the user to a cloud model, with reasons',()=>{
  const small=assess({...pc,memoryGB:4,gpuGB:8});assert.equal(small.verdict,'cloud');assert.match(small.reasons[0],/at least 8 GB/);
  const full=assess({...mac,memoryGB:16,freeDiskGB:3});assert.equal(full.verdict,'cloud');assert.match(full.reasons[0],/free disk/);
  assert.equal(assess({...pc,memoryGB:7.8,gpuGB:8}).verdict,'good'); // an 8 GB PC reporting slightly less still qualifies
});
