import { spawn } from 'node:child_process';

/** Fixed native executable; request data never becomes shell text or argv. */
export function nativeRequest(binary:string,request:Record<string,unknown>,signal?:AbortSignal):Promise<any>{
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new Error('Stopped.'));return;}
    const child=spawn(binary,['request'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='';let finished=false;
    const finish=(error?:Error,value?:unknown)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
    const abort=()=>{child.kill();finish(new Error('Stopped.'));};
    const timer=setTimeout(()=>{child.kill();finish(new Error('Windows tool timed out. Observe again before retrying an action.'));},25000);
    signal?.addEventListener('abort',abort,{once:true});
    child.stdout.on('data',chunk=>{output+=chunk.toString('utf8');if(output.length>2*1024*1024){child.kill();finish(new Error('Windows tool output exceeded its limit.'));}});
    child.stderr.on('data',()=>{}); // Never expose native diagnostics containing arbitrary app data.
    child.stdin.on('error',()=>{});
    child.once('error',()=>finish(new Error('Cannot start the Windows helper. Re-extract the complete Alfred ZIP.')));
    child.once('close',code=>{
      if(finished)return;
      try{const result=JSON.parse(output.trim());if(code!==0||result.ok===false)finish(new Error(result.error||'Windows tool failed.'));else finish(undefined,result.data);}
      catch{finish(new Error('Windows helper returned an invalid response.'));}
    });
    child.stdin.end(JSON.stringify(request));
  });
}
