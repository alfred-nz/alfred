import path from 'node:path';
import { Tool } from '../shared/contract';
import { macTools, macCall, macPermissions } from './mac';
import { WindowsDesktop } from './windows';
export interface Desktop { tools():Tool[]; status():Promise<string>; call(name:string,args:Record<string,unknown>,signal?:AbortSignal):Promise<unknown> }
export function desktopFor(platform:NodeJS.Platform=process.platform,resources=process.resourcesPath||''):Desktop {
  if(platform==='darwin')return {tools:()=>macTools,status:macPermissions,call:macCall};
  if(platform==='win32')return new WindowsDesktop(path.join(resources,'AlfredNative.exe'));
  return {tools:()=>[],status:async()=>'Native desktop control is unavailable on this platform',call:async()=>{throw new Error('Unsupported desktop platform.');}};
}
