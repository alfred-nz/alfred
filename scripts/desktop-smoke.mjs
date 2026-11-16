import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();const data=fs.mkdtempSync('/private/tmp/alfred-desktop-test-');
const evidence=path.join(root,'test-results');fs.mkdirSync(evidence,{recursive:true});
const executablePath=path.join(root,'release/Alfred.app/Contents/MacOS/Electron');
const env={...process.env,ALFRED_DATA_DIR:data};delete env.ELECTRON_RUN_AS_NODE;
let app;
async function launch(){app=await electron.launch({executablePath,env,timeout:45000});const page=await app.firstWindow();page.on('pageerror',error=>console.error('renderer:',error.message));await page.getByRole('heading',{name:'Make room for your day.'}).waitFor();return page;}
try{
  let page=await launch();
  await page.evaluate(()=>window.alfred.configure({speakReplies:false}));
  await page.screenshot({path:path.join(evidence,'01-conversation.png')});
  await page.getByLabel('Message Alfred').fill('Remember this: collect sample receipts every Friday.');await page.getByLabel('Send message',{exact:true}).click();
  await page.getByText('Saved to your ideas inbox. It is a note, not a task.').waitFor();
  await page.getByRole('button',{name:/Ideas inbox/}).click();await page.getByText('collect sample receipts every Friday.',{exact:true}).waitFor();
  await page.screenshot({path:path.join(evidence,'02-ideas.png')});
  await app.close();page=await launch();await page.getByRole('button',{name:/Ideas inbox/}).click();await page.getByText('collect sample receipts every Friday.',{exact:true}).waitFor();
  console.log('PASS: real UI capture, persistent inbox, relaunch');
  await page.getByRole('button',{name:'Conversation',exact:true}).click();
  await page.getByLabel('Message Alfred').fill('Use mac_apps to list the running applications on this Mac, then tell me how many you found.');await page.getByLabel('Send message',{exact:true}).click();
  let result;const deadline=Date.now()+180000;
  do {result=await page.evaluate(()=>window.alfred.state());if(!result.busy&&result.messages.some(m=>m.tool==='mac_apps'))break;await new Promise(r=>setTimeout(r,1000));}while(Date.now()<deadline);
  if(!result.messages.some(m=>m.tool==='mac_apps'&&!m.error))console.log(JSON.stringify({busy:result.busy,last:result.messages.slice(-3)}));
  assert(result.messages.some(m=>m.tool==='mac_apps'&&!m.error));
  console.log('PASS: local model → native Mac app listing → persisted tool receipt');
  await page.screenshot({path:path.join(evidence,'03-mac-result.png')});
  await page.evaluate(()=>window.alfred.connectBrowser());
  const connected=await page.evaluate(()=>window.alfred.state());assert(connected.tools.some(t=>t.source==='browser'));
  console.log('PASS: browser MCP catalog ('+connected.tools.filter(t=>t.source==='browser').length+' tools)');
  async function pendingNavigation(){
    await page.evaluate(()=>window.alfred.send('Use the browser tool to navigate to https://example.com.'));
    const pending=(await page.evaluate(()=>window.alfred.state())).pending;
    assert(pending,'Navigation must wait for owner confirmation');return pending;
  }
  const first=await pendingNavigation();await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert(!(await page.evaluate(()=>window.alfred.state())).messages.some(m=>m.tool===first.tool));
  await pendingNavigation();await page.getByRole('button',{name:'Confirm action',exact:true}).click();
  const navigationDeadline=Date.now()+180000;let navigation;
  do{navigation=await page.evaluate(()=>window.alfred.state());if(!navigation.busy)break;await new Promise(r=>setTimeout(r,1000));}while(Date.now()<navigationDeadline);
  assert(navigation.messages.some(m=>m.tool==='browser__browser_navigate'&&!m.error&&m.text.includes('Example Domain')));
  console.log('PASS: rejected navigation did nothing; approved browser action returned Example Domain');
  await page.getByLabel('Connections',{exact:true}).click();await page.screenshot({path:path.join(evidence,'04-connections.png')});
  fs.writeFileSync(path.join(evidence,'smoke-summary.json'),JSON.stringify({date:new Date().toISOString(),tests:['UI capture','idea survives relaunch','local model native tool call','browser MCP discovery','rejected browser action','approved browser navigation'],model:result.settings.model,macStatus:result.mac,consoleStatus:result.console,errors:result.messages.filter(m=>m.error).map(m=>m.text)},null,2));
}finally{await app?.close();}
