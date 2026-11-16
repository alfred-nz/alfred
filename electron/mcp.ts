import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Tool } from '../shared/contract';
import { remoteReadOnly } from './policy';
import { browserChannel } from './browser-channel';

export interface Vault { get(key: string): any; set(key: string,value: any): void }
export class MCP {
  clients=new Map<string,Client>();
  tools: Tool[]=[];
  names=new Map<string,{source:string;name:string}>();
  private callback?: http.Server;
  constructor(private vault: Vault,private openURL:(url:string)=>Promise<void>,private changed:()=>void){}
  async catalog(source: 'console'|'browser', client: Client) {
    const found: Tool[]=[];
    let cursor:string|undefined;
    do {
      const result=await client.listTools(cursor?{cursor}:{});
      for(const t of result.tools){
        const name=`${source}__${t.name}`;
        this.names.set(name,{source,name:t.name});
        found.push({name,description:t.description||t.name,parameters:t.inputSchema,source,readOnly:remoteReadOnly(source,t.name)});
      }
      cursor=result.nextCursor;
    } while(cursor);
    this.tools=this.tools.filter(t=>t.source!==source).concat(found);
    this.clients.set(source,client);this.changed();
  }
  async disconnect(source:string){
    await this.clients.get(source)?.close();this.clients.delete(source);
    this.tools=this.tools.filter(t=>t.source!==source);
    for(const [key,value] of this.names)if(value.source===source)this.names.delete(key);
  }
  async console(url:string,interactive=true) {
    await this.disconnect('console');this.callback?.close();
    const key=`console:${url}`;
    const state=randomUUID();let verifier='';
    const saved=()=>this.vault.get(key)||{};
    const save=(patch:Record<string,unknown>)=>this.vault.set(key,{...saved(),...patch});
    let transport:StreamableHTTPClientTransport;
    const server=http.createServer(async(req,res)=>{
      const callback=new URL(req.url||'','http://127.0.0.1');
      if(callback.pathname!=='/callback'||callback.searchParams.get('state')!==state){res.writeHead(400);res.end('Invalid sign-in state.');return;}
      const code=callback.searchParams.get('code');
      if(!code){res.writeHead(400);res.end('Sign-in was not completed.');server.close();return;}
      try {
        await transport.finishAuth(code);
        const client=new Client({name:'openexec-alfred',version:'0.1.0'});
        const fresh=new StreamableHTTPClientTransport(new URL(url),{authProvider:provider});
        await client.connect(fresh);await this.catalog('console',client);
        res.end('Alfred is connected. You can return to Alfred.');
      }catch{res.writeHead(500);res.end('Alfred could not complete sign-in. Return to Connections and retry.');}
      finally{server.close();this.changed();}
    });
    await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(17843,'127.0.0.1',()=>resolve());});
    this.callback=server;
    const port=(server.address() as {port:number}).port;
    const redirect=`http://127.0.0.1:${port}/callback`;
    // DCR binds its exact loopback port; register again for this interactive session.
    const provider:OAuthClientProvider={
      redirectUrl:redirect,
      clientMetadata:{client_name:'Alfred for Mac',redirect_uris:[redirect],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none',scope:'mcp:advisory mcp:code mcp:chat mcp:tasks project-tasks:write'},
      state:()=>state,
      clientInformation:()=>saved().client as OAuthClientInformationMixed|undefined,
      saveClientInformation:(client)=>save({client}),
      tokens:()=>saved().tokens as OAuthTokens|undefined,
      saveTokens:(tokens)=>save({tokens}),
      saveCodeVerifier:(value)=>{verifier=value;},
      codeVerifier:()=>verifier,
      redirectToAuthorization:async(authURL)=>{if(!interactive)throw new Error('Sign in again from Connections.');await this.openURL(authURL.toString());},
      invalidateCredentials:(scope)=>{if(scope==='tokens')save({tokens:undefined});else if(scope==='client')save({client:undefined});else if(scope==='all')this.vault.set(key,{});}
    };
    // Persisted registrations can refresh without a callback. Re-register if no tokens.
    if(!saved().tokens)save({client:undefined});
    transport=new StreamableHTTPClientTransport(new URL(url),{authProvider:provider});
    const client=new Client({name:'openexec-alfred',version:'0.1.0'});
    try{await client.connect(transport);await this.catalog('console',client);server.close();}
    catch(e){
      if((e as Error).name!=='UnauthorizedError'){server.close();throw e;}
      setTimeout(()=>server.close(),300000).unref();
      throw new Error('Complete Agent Console sign-in in your browser.');
    }
  }
  async browser(appRoot:string,dataDirectory:string) {
    await this.disconnect('browser');
    const client=new Client({name:'openexec-alfred',version:'0.1.0'});
    const transport=new StdioClientTransport({command:process.execPath,cwd:dataDirectory,args:[path.join(appRoot,'node_modules/@playwright/mcp/cli.js'),'--browser',browserChannel(),'--isolated'],env:{...Object.fromEntries(Object.entries(process.env).filter((p):p is [string,string]=>!!p[1]&&!/KEY|TOKEN|SECRET|PASSWORD/.test(p[0]))),ELECTRON_RUN_AS_NODE:'1'},stderr:'pipe'});
    await client.connect(transport);await this.catalog('browser',client);
  }
  async call(name:string,args:Record<string,unknown>,signal?:AbortSignal) {
    const target=this.names.get(name);if(!target)throw new Error('Tool is not in the connected catalog.');
    const client=this.clients.get(target.source);if(!client)throw new Error('Connection closed.');
    return client.callTool({name:target.name,arguments:args},undefined,{signal,timeout:60000});
  }
  async close(){this.callback?.close();await Promise.allSettled([...this.clients.values()].map(c=>c.close()));}
}
