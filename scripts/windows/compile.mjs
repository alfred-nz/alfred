import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
export function compileNative(destination){
  if(process.platform!=='win32')throw new Error('Build the Windows helper on Windows (or use the Windows GitHub Actions job).');
  const framework=path.join(process.env.WINDIR||'C:\\Windows','Microsoft.NET','Framework64','v4.0.30319');
  const compiler=path.join(framework,'csc.exe');
  if(!fs.existsSync(compiler))throw new Error('.NET Framework 4.x compiler is missing.');
  const refs=['UIAutomationClient','UIAutomationTypes','WindowsBase','System.Speech'].map(n=>'/reference:'+path.join(framework,'WPF',n+'.dll'));
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  execFileSync(compiler,['/nologo','/target:exe','/platform:x64','/out:'+destination,'/reference:System.Web.Extensions.dll','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll',...refs,path.resolve('scripts','windows','AlfredNative.cs')],{stdio:'inherit'});
  return destination;
}
