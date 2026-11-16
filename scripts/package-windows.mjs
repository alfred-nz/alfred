import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { compileNative } from './windows/compile.mjs';
if(process.platform!=='win32'||process.arch!=='x64')throw new Error('Package on Windows x64; use the Windows CI artifact from a Mac.');
const root=process.cwd();const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const folder=`Alfred-${version}-windows-x64`;const output=path.join(root,'release',folder);
const electron=path.join(root,'node_modules/electron/dist');
if(!fs.existsSync(path.join(electron,'electron.exe')))throw new Error('Install the Windows Electron runtime first.');
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
fs.cpSync(electron,output,{recursive:true});fs.renameSync(path.join(output,'electron.exe'),path.join(output,'Alfred.exe'));
const resources=path.join(output,'resources');const appdir=path.join(resources,'app');fs.mkdirSync(appdir,{recursive:true});
for(const name of ['dist','dist-electron','package.json','node_modules'])fs.cpSync(path.join(root,name),path.join(appdir,name),{recursive:true,filter:p=>{
  const normalized=p.split(path.sep).join('/');return !/\/node_modules\/(electron|\.bin|\.cache)(\/|$)/.test(normalized);
}});
compileNative(path.join(resources,'AlfredNative.exe'));
fs.copyFileSync('docs/windows-quickstart.txt',path.join(output,'START-HERE.txt'));fs.copyFileSync('NOTICE.md',path.join(output,'NOTICE.md'));
const zip=path.join(root,'release',folder+'.zip');fs.rmSync(zip,{force:true});
// Fixed archive utility, paths passed as argv; no model/user text is shell code.
execFileSync('tar.exe',['-a','-c','-f',zip,'-C',path.dirname(output),folder],{stdio:'inherit'});
fs.writeFileSync(zip+'.sha256',createHash('sha256').update(fs.readFileSync(zip)).digest('hex')+'  '+path.basename(zip)+'\n');
console.log(zip);
