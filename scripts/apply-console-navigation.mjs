import {readFile,writeFile} from 'node:fs/promises';
import {navSource,patchSidebar,patchCSS} from './console-navigation.mjs';
const root=new URL('../',import.meta.url);
const files=['src/main.jsx','src/components/Infrastructure.jsx','src/components/Notifications.jsx','src/components/Protocols.jsx','src/components/ConsoleNav.jsx','src/styles.css'];
const plan=await Promise.all(files.map(async file=>{const path=new URL(file,root),old=await readFile(path,'utf8');let next;if(file.endsWith('/ConsoleNav.jsx')){if(!old.includes('function ConsoleNav')||!old.includes("['app','Overview'"))throw Error('Unexpected console navigation source');next=navSource;}else next=file.endsWith('.css')?patchCSS(old):patchSidebar(old,file);return {file,path,old,next};}));
for(const {file,path,old,next} of plan){if(old!==next){await writeFile(path,next);console.log('Updated',file);}else console.log('Already updated',file);}
console.log('Navigation updated. Protocols route and backend remain unchanged.');
