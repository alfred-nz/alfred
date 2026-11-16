import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();const output=path.join(root,'release/Alfred.app');
const electron=path.join(root,'node_modules/electron/dist/Electron.app');
if(!fs.existsSync(electron))throw new Error('Install the Darwin Electron runtime first: node node_modules/electron/install.js');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.rmSync(output,{recursive:true,force:true});
execFileSync('/usr/bin/ditto',[electron,output]);
const contents=path.join(output,'Contents');const resources=path.join(contents,'Resources');
const appdir=path.join(resources,'app');fs.mkdirSync(appdir,{recursive:true});
for(const name of ['dist','dist-electron','package.json','node_modules'])fs.cpSync(path.join(root,name),path.join(appdir,name),{recursive:true,verbatimSymlinks:true,filter:p=>!p.includes('/node_modules/electron/')&&!p.includes('/node_modules/.cache/')&&!p.includes('/node_modules/.bin')});
const plist=path.join(contents,'Info.plist');
function set(file,key,value){try{execFileSync('/usr/libexec/PlistBuddy',['-c',`Set :${key} ${value}`,file],{stdio:'pipe'});}catch{execFileSync('/usr/libexec/PlistBuddy',['-c',`Add :${key} string ${value}`,file],{stdio:'pipe'});}}
set(plist,'CFBundleIdentifier','io.openexec.alfred');set(plist,'CFBundleName','Alfred');set(plist,'CFBundleDisplayName','Alfred');
set(plist,'NSMicrophoneUsageDescription','Alfred listens when you ask it to take a voice instruction.');set(plist,'NSSpeechRecognitionUsageDescription','Alfred transcribes your spoken instructions on this Mac.');
const helper=path.join(resources,'Alfred Speech.app/Contents');fs.mkdirSync(path.join(helper,'MacOS'),{recursive:true});
fs.writeFileSync(path.join(helper,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>AlfredSpeech</string><key>CFBundleIdentifier</key><string>io.openexec.alfred.speech</string><key>CFBundleName</key><string>Alfred Speech</string><key>CFBundlePackageType</key><string>APPL</string><key>LSUIElement</key><true/><key>NSMicrophoneUsageDescription</key><string>Alfred listens to your spoken instructions.</string><key>NSSpeechRecognitionUsageDescription</key><string>Alfred transcribes speech on your Mac.</string></dict></plist>`);
execFileSync('/usr/bin/swiftc',['scripts/Speech.swift','-o',path.join(helper,'MacOS/AlfredSpeech'),'-framework','Speech','-framework','AVFoundation','-framework','Foundation'],{stdio:'inherit'});
// MAC_SIGN_IDENTITY (for example "Developer ID Application: Valkohelmi Oy (4CA9Q5448J)") signs for distribution
// with the hardened runtime, ready for notarization. Without it the app gets a local ad-hoc signature.
const identity=process.env.MAC_SIGN_IDENTITY;
if(identity){
  // Sign inside out, as Apple requires: every Mach-O file, then nested bundles deepest first, then the app.
  const entitlements=path.join(root,'scripts/mac-entitlements.plist');
  const machO=f=>{try{const b=Buffer.alloc(4);const fd=fs.openSync(f,'r');fs.readSync(fd,b,0,4,0);fs.closeSync(fd);return ['feedfacf','cffaedfe','cafebabe','bebafeca'].includes(b.toString('hex'));}catch{return false;}};
  const files=[],bundles=[];
  (function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);
    if(e.isSymbolicLink())continue;
    if(e.isDirectory()){walk(p);if(/\.(app|framework)$/.test(e.name))bundles.push(p);}
    else if(machO(p))files.push(p);}})(contents);
  const depth=p=>p.split(path.sep).length;
  const sign=target=>execFileSync('/usr/bin/codesign',['--force','--timestamp','--options','runtime','--entitlements',entitlements,'--sign',identity,target],{stdio:'inherit'});
  for(const f of files.sort((a,b)=>depth(b)-depth(a)))sign(f);
  for(const b of bundles.sort((a,b)=>depth(b)-depth(a)))sign(b);
  sign(output);
}else execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',output],{stdio:'inherit'});
execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',output],{stdio:'inherit'});
console.log(output);
