import fs from 'node:fs';
import sharp from 'sharp';
import path from 'node:path';
import { spawn } from 'node:child_process';
// A separate, invisible browser profile; never uses a teacher's browser session.
const profile=path.resolve('tmp/guide-capture-profile');
fs.mkdirSync(profile,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 ['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-gpu','--remote-debugging-port=9332','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
browser.on('error',error=>{console.error(error);process.exitCode=1});
let available=false;
for(let i=0;i<50;i++){try{await fetch('http://localhost:9332/json');available=true;break}catch{await new Promise(r=>setTimeout(r,200))}}
if(!available)throw Error('Le navigateur de capture ne démarre pas.');
const tabs=await (await fetch('http://localhost:9332/json')).json();
const ws=new WebSocket(tabs.find(tab=>tab.type==='page' && tab.url==='about:blank').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0; const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}};
async function call(method,params={}) {const n=++id;let timeout;const p=new Promise((resolve,reject)=>{timeout=setTimeout(()=>{pending.delete(n);reject(Error('Timeout: '+method))},15000);pending.set(n,m=>{clearTimeout(timeout);resolve(m)})});ws.send(JSON.stringify({id:n,method,params}));const m=await p;if(m.error)throw Error(JSON.stringify(m.error));return m.result;}
await call('Page.enable');
await call('Emulation.setScrollbarsHidden',{hidden:true});
async function capture(url,file,width=390,height=844,format='png') {
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://localhost:3000'+url});
 let ready=false;
 for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,150));const v=await call('Runtime.evaluate',{expression:'document.querySelector("#root")?.textContent.length > 100'});if(v.result.value){ready=true;break;}}
 if(!ready)throw Error(`Écran non chargé : ${url}`);
 await call('Runtime.evaluate',{expression:'document.fonts.ready.then(()=>true)',awaitPromise:true});
 await new Promise(r=>setTimeout(r,600));
 await call('Runtime.evaluate',{expression:'document.activeElement?.blur()'});
 const shot=await call('Page.captureScreenshot',{format,...(format==='webp'?{quality:88}:{})});const buffer=Buffer.from(shot.data,'base64');fs.writeFileSync(file,format==='webp'?await sharp(buffer).removeAlpha().webp({quality:88}).toBuffer():buffer);console.log(file);
}
try {
 const screens=process.argv.includes('--classes') ? ['classes'] : ['classes','schedule','editor','add','dates','notifications','appearance','assessments','print','students'];
 for(const key of screens) for(const lang of ['fr','ar']) await capture(`/scripts/guide-preview/index.html?screen=${key==='assessments'?'evaluations':key}&lang=${lang}`,`public/guide/current/${key}-${lang}.webp`,1280,720,'webp');
 for(const lang of ['fr','ar']) await capture(`/scripts/guide-preview/index.html?screen=classes&lang=${lang}`,`public/guide/current/phone-${lang}.webp`,390,844,'webp');
} finally {
 await call('Browser.close').catch(()=>{});
 ws.close();
}
