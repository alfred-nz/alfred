import { randomUUID } from 'node:crypto';
import { Pending } from '../shared/contract';
// Remote hints are descriptive, not authority. Only audited names auto-read.
const reads=new Set(['diagnostic_ping','list_projects','get_project','list_repositories','list_tasks','get_task','read_chat','list_chats','get_repository_snapshot','read_repository_file','search_repository','list_advisory_requests','get_advisory_request','list_advisory_reports','get_advisory_report','list_advisory_artifacts','read_advisory_artifact']);
export function remoteReadOnly(source: string, name: string) {return source==='console'&&reads.has(name);}
export class Approval {
  pending?: Pending;
  propose(tool: string,args: Record<string,unknown>) {
    if(this.pending) throw new Error('Resolve the pending action first.');
    this.pending={id:randomUUID(),tool,arguments:structuredClone(args),expires:Date.now()+300000};
    return this.pending;
  }
  consume(id: string) {
    const pending=this.pending;
    if(!pending||pending.id!==id) throw new Error('This action is no longer pending.');
    this.pending=undefined;
    if(pending.expires<Date.now()) throw new Error('Approval expired. Ask Alfred to prepare the action again.');
    return pending;
  }
  cancel(){this.pending=undefined;}
}
