import os from 'node:os';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import type { Hardware } from '../shared/contract';

// First-launch check: can this computer run the default local model (Qwen3 8B, about 5 GB at 4-bit)?
const GB=1024**3;
export type Facts={platform:string;appleSilicon:boolean;memoryGB:number;freeDiskGB?:number;gpuGB?:number};
const r=(n:number)=>Math.round(n*10)/10;

export function assess(f:Facts):Hardware{
  const reasons:string[]=[];let verdict:Hardware['verdict']='good';
  // 7.5, not 8: an 8 GB PC often reports a little less after hardware reservations.
  if(f.memoryGB<7.5){verdict='cloud';reasons.push(`${r(f.memoryGB)} GB of memory; the local model needs at least 8 GB.`);}
  if(f.freeDiskGB!==undefined&&f.freeDiskGB<6){verdict='cloud';reasons.push(`${r(f.freeDiskGB)} GB of free disk; the model needs about 6 GB.`);}
  if(verdict==='good'){
    if(f.platform==='darwin'){
      if(!f.appleSilicon){verdict='slow';reasons.push('Intel Mac: the model runs on the processor, so replies are slow.');}
      else if(f.memoryGB<15){verdict='slow';reasons.push(`${r(f.memoryGB)} GB of memory is tight; other apps slow down while Alfred thinks.`);}
    }else if(!(f.gpuGB!==undefined&&f.gpuGB>=6)){
      verdict='slow';reasons.push(f.gpuGB?`The graphics card has ${r(f.gpuGB)} GB; the model mostly runs on the processor, so replies are slow.`:'No graphics card with 6 GB or more found; the model runs on the processor, so replies are slow.');
    }
  }
  return {verdict,reasons,appleSilicon:f.appleSilicon,memoryGB:r(f.memoryGB),freeDiskGB:f.freeDiskGB===undefined?undefined:r(f.freeDiskGB),gpuGB:f.gpuGB===undefined?undefined:r(f.gpuGB)};
}

export async function probe():Promise<Hardware>{
  let freeDiskGB:number|undefined;
  try{const s=fs.statfsSync(os.homedir());freeDiskGB=s.bavail*s.bsize/GB;}catch{} // Ollama keeps models under the home folder
  const appleSilicon=process.platform==='darwin'&&/apple/i.test(os.cpus()[0]?.model||'');
  return assess({platform:process.platform,appleSilicon,memoryGB:os.totalmem()/GB,freeDiskGB,gpuGB:process.platform==='win32'?await windowsGpuGB():undefined});
}

// Win32_VideoController.AdapterRAM stops at 4 GB, so read the driver's 64-bit qwMemorySize instead.
function windowsGpuGB():Promise<number|undefined>{
  const script="(Get-ItemProperty 'HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0*' -ErrorAction SilentlyContinue | ForEach-Object { $_.'HardwareInformation.qwMemorySize' } | Measure-Object -Maximum).Maximum";
  return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{timeout:8000,windowsHide:true},(error,out)=>{const n=Number(String(out).trim());resolve(!error&&n>0?n/GB:undefined);}));
}
