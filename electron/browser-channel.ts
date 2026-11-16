import fs from 'node:fs';
import path from 'node:path';
export function browserChannel(platform:NodeJS.Platform=process.platform,exists:(p:string)=>boolean=fs.existsSync,env:NodeJS.ProcessEnv=process.env){
  if(platform!=='win32')return 'chrome';
  for(const dir of [env.PROGRAMFILES,env['PROGRAMFILES(X86)'],env.LOCALAPPDATA].filter((x):x is string=>!!x)){
    if(exists(path.win32.join(dir,'Google','Chrome','Application','chrome.exe')))return 'chrome';
  }
  return 'msedge'; // included in supported Windows 10/11 installations
}
