export type Message = { id: string; role: 'user'|'assistant'|'tool'; text: string; at: string; tool?: string; error?: boolean };
export type Idea = { id: string; text: string; project?: string; at: string; source: 'voice'|'text' };
export type Tool = { name: string; description: string; parameters: Record<string, unknown>; source: 'mac'|'windows'|'console'|'browser'|'memory'|'files'; readOnly: boolean };
export type Pending = { id: string; tool: string; arguments: Record<string, unknown>; expires: number };
export type Settings = { provider: 'ollama'|'openai'; model: string; ollamaUrl: string; openaiUrl: string; openaiModel: string; consoleUrl: string; voice: 'system'|'elevenlabs'|'agent'; elevenVoice: string; elevenAgent: string; speakReplies: boolean; roots: string[] };
export type Keys = { elevenlabs?: string; openai?: string };
export type Status = { platform: string; shortcut: string; busy: boolean; pending?: Pending; model: string; console: string; mac: string; browser: string; voice: string; toolCount: number; settings: Settings; messages: Message[]; ideas: Idea[]; tools: Tool[] };
export interface AlfredAPI {
  state(): Promise<Status>;
  send(text: string, source?: 'voice'|'text'): Promise<void>;
  decide(id: string, approve: boolean): Promise<void>;
  stop(): Promise<void>;
  saveIdea(text: string, source?: 'voice'|'text'): Promise<Idea>;
  deleteIdea(id: string): Promise<void>;
  configure(settings: Partial<Settings>, keys?: Keys): Promise<void>;
  agentUrl(): Promise<string>;
  agentTask(request: string): Promise<string>;
  connectConsole(): Promise<void>;
  connectBrowser(): Promise<void>;
  check(): Promise<void>;
  addFolder(): Promise<void>;
  listen(): Promise<void>;
  stopListening(): Promise<void>;
  transcribe(audio: ArrayBuffer, mime: string): Promise<string>;
  speak(text: string): Promise<string|undefined>;
  silence(): Promise<void>;
  hide(): Promise<void>;
  onState(fn: (state: Status) => void): () => void;
  onSpeech(fn: (event: { text?: string; final?: boolean; error?: string; listening?: boolean }) => void): () => void;
}
declare global { interface Window { alfred: AlfredAPI } }
