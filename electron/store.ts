import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Idea, Message, Settings } from '../shared/contract';

export const defaults: Settings = { model:'qwen3:8b', ollamaUrl:'http://127.0.0.1:11434', consoleUrl:'https://connect.perttu.ai/mcp', voice:'system', elevenVoice:'JBFqnCBsd6RMkjVDRZzb', speakReplies:true, roots:[] };
export class Store {
  data: { settings: Settings; messages: Message[]; ideas: Idea[] };
  constructor(readonly directory: string) {
    fs.mkdirSync(directory,{recursive:true,mode:0o700});
    const file=path.join(directory,'workspace.json');
    // Never silently overwrite a damaged user's inbox.
    const loaded=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
    this.data={settings:{...defaults,...loaded.settings},messages:loaded.messages||[],ideas:loaded.ideas||[]};
  }
  save() {
    const file=path.join(this.directory,'workspace.json');
    fs.writeFileSync(file+'.tmp',JSON.stringify(this.data,null,2),{mode:0o600});
    fs.renameSync(file+'.tmp',file);
  }
  message(role: Message['role'], text: string, extra: Partial<Message>={}) {
    const m={id:randomUUID(),role,text,at:new Date().toISOString(),...extra};
    this.data.messages.push(m);this.save();return m;
  }
  idea(text: string, source: Idea['source']='text', project?: string) {
    if(!text.trim() || text.length>20000) throw new Error('An idea must contain 1–20,000 characters.');
    const idea={id:randomUUID(),text:text.trim(),source,project,at:new Date().toISOString()};
    this.data.ideas.unshift(idea);this.save();return idea;
  }
}

export function validateEndpoint(value: string, localOnly=false) {
  const url=new URL(value);
  const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(url.username||url.password||url.hash || (localOnly ? !local : !local && url.protocol!=='https:') || !['http:','https:'].includes(url.protocol)) throw new Error(localOnly?'Local inference must use a loopback URL.':'Use HTTPS, or HTTP on localhost.');
  return url.toString().replace(/\/$/,'');
}

export function allowedFile(roots: string[], requested: string) {
  const resolved=fs.realpathSync(requested);
  if(!roots.some(root=>{const rel=path.relative(fs.realpathSync(root),resolved);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));})) throw new Error('Choose this folder in Connections before reading it.');
  const parts=resolved.split(path.sep);
  if(parts.some(p=>p.startsWith('.')||/^(credentials|auth\.json|.*secrets.*|.*\.pem|.*\.key)$/i.test(p))) throw new Error('Credential and hidden paths are not readable through Alfred tools.');
  return resolved;
}
