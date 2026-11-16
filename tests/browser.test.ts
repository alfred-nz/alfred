import test from 'node:test';
import assert from 'node:assert/strict';
import { MCP } from '../electron/mcp';
test('file-linked browser snapshots are observed through MCP without replaying the action',async()=>{
  const calls:string[]=[];
  const mcp=new MCP({get:()=>undefined,set:()=>{}},async()=>{},()=>{});
  mcp.names.set('browser__browser_navigate',{source:'browser',name:'browser_navigate'});
  mcp.clients.set('browser',{callTool:async({name}:{name:string})=>{calls.push(name);return {content:[{type:'text',text:name==='browser_snapshot'?'heading "Real page" [ref=e1]':'### Snapshot\n- [Snapshot](untrusted-path.yml)'}]};}} as any);
  const result=await mcp.call('browser__browser_navigate',{url:'http://localhost'});
  assert.deepEqual(calls,['browser_navigate','browser_snapshot']);assert(JSON.stringify(result).includes('Real page'));
});
test('failed follow-up observation preserves the completed action and never retries it',async()=>{
  let calls=0;
  const mcp=new MCP({get:()=>undefined,set:()=>{}},async()=>{},()=>{});
  mcp.names.set('browser__browser_click',{source:'browser',name:'browser_click'});
  mcp.clients.set('browser',{callTool:async()=>{if(++calls===2)throw new Error('closed');return {content:[{type:'text',text:'Action done. ### Snapshot\n[Snapshot](page.yml)'}]};}} as any);
  const result=await mcp.call('browser__browser_click',{});
  assert.equal(calls,2);assert(JSON.stringify(result).includes('Action done'));assert(JSON.stringify(result).includes('observation failed'));
});
