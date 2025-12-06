(()=>{var e={};e.id=126,e.ids=[126],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},33873:e=>{"use strict";e.exports=require("path")},15493:(e,t,i)=>{"use strict";i.r(t),i.d(t,{GlobalError:()=>s.a,__next_app__:()=>u,pages:()=>d,routeModule:()=>p,tree:()=>c});var r=i(70260),a=i(28203),n=i(25155),s=i.n(n),l=i(67292),o={};for(let e in l)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>l[e]);i.d(t,o);let c=["",{children:["[locale]",{children:["(dashboard)",{children:["ai-consultant",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(i.bind(i,80462)),"/var/www/documentiulia.ro/apps/web/app/[locale]/(dashboard)/ai-consultant/page.tsx"]}]},{}]},{layout:[()=>Promise.resolve().then(i.bind(i,20078)),"/var/www/documentiulia.ro/apps/web/app/[locale]/(dashboard)/layout.tsx"]}]},{layout:[()=>Promise.resolve().then(i.bind(i,95694)),"/var/www/documentiulia.ro/apps/web/app/[locale]/layout.tsx"]}]},{"not-found":[()=>Promise.resolve().then(i.t.bind(i,19937,23)),"next/dist/client/components/not-found-error"]}],d=["/var/www/documentiulia.ro/apps/web/app/[locale]/(dashboard)/ai-consultant/page.tsx"],u={require:i,loadChunk:()=>Promise.resolve()},p=new r.AppPageRouteModule({definition:{kind:a.RouteKind.APP_PAGE,page:"/[locale]/(dashboard)/ai-consultant/page",pathname:"/[locale]/ai-consultant",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},6418:(e,t,i)=>{Promise.resolve().then(i.bind(i,80462))},46330:(e,t,i)=>{Promise.resolve().then(i.bind(i,93988))},93988:(e,t,i)=>{"use strict";i.r(t),i.d(t,{default:()=>z});var r=i(45512),a=i(58009),n=i(24540),s=i(6648),l=i(67497),o=i(61075),c=i(17497),d=i(45723),u=i(52858),p=i(80832),m=i(12214),x=i(49656),h=i(93468);let g=(0,h.A)("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);var f=i(12592),b=i(46904);let y=(0,h.A)("ThumbsDown",[["path",{d:"M17 14V2",key:"8ymqnk"}],["path",{d:"M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z",key:"s6e0r"}]]);var v=i(87798),j=i(92557),A=i(15607),w=i(45037);let k=[{icon:l.A,title:"Prag TVA 2025",question:"Care este pragul de \xeenregistrare \xeen scopuri de TVA \xeen 2025?",category:"tva"},{icon:o.A,title:"e-Factura obligatorie",question:"De c\xe2nd este obligatorie e-Factura pentru toate firmele?",category:"efactura"},{icon:c.A,title:"Cheltuieli deductibile",question:"Ce cheltuieli sunt deductibile fiscal pentru un SRL?",category:"deductibilitate"},{icon:d.A,title:"Termen D300",question:"P\xe2nă c\xe2nd trebuie depusă declarația D300 pentru TVA?",category:"declaratii"},{icon:u.A,title:"PFA vs SRL",question:"Care sunt diferențele fiscale \xeentre PFA și SRL?",category:"pfa"},{icon:p.A,title:"Impozit micro 2025",question:"Care este impozitul pe venit pentru micro\xeentreprinderi \xeen 2025?",category:"srl"}],N={"prag tva":`**Pragul de \xeenregistrare \xeen scopuri de TVA pentru 2025**

Conform legislației \xeen vigoare, pragul de scutire pentru TVA este de **300.000 lei** (cifra de afaceri anuală).

📋 **Ce trebuie să știi:**
- Dacă depășești acest prag, ai **10 zile** pentru a te \xeenregistra \xeen scopuri de TVA
- Monitorizează cifra de afaceri lunar
- Poți opta pentru \xeenregistrare voluntară și sub acest prag

⚠️ **Atenție:** Pragul se calculează pe baza cifrei de afaceri din anul calendaristic curent.

📅 **Recomandare:** Setează alerte \xeen DocumentIulia pentru a fi notificat c\xe2nd te apropii de prag.`,"e-factura":`**e-Factura - Sistem național de facturare electronică**

📅 **Termene importante:**
- **1 ianuarie 2024**: Obligatorie pentru relațiile B2B \xeentre firme \xeenregistrate \xeen RO e-Factura
- **1 iulie 2024**: Obligatorie pentru TOATE tranzacțiile B2B din Rom\xe2nia

🔧 **Cum funcționează:**
1. Emiți factura \xeen format XML structurat
2. O trimiți către sistemul ANAF SPV
3. ANAF validează și atribuie un număr de index
4. Clientul o primește \xeen spațiul său privat virtual

✅ **DocumentIulia te ajută:**
- Generare automată XML conform standardului
- Transmitere directă către ANAF
- Monitorizare stare factură
- Notificări pentru facturi primite`,"cheltuieli deductibile":`**Cheltuieli deductibile fiscal pentru SRL**

✅ **100% deductibile:**
- Salarii și contribuții sociale
- Chirii pentru spații de lucru
- Utilități (curent, gaz, apă, internet)
- Materii prime și materiale
- Servicii profesionale (contabilitate, juridic)
- Asigurări obligatorii
- Amortizare echipamente

⚠️ **Parțial deductibile:**
- Combustibil autovehicule: 50% (fără foaie de parcurs)
- Protocol și reprezentare: 2% din profit brut
- Sponsorizări: 0.75% din cifra de afaceri

❌ **Nedeductibile:**
- Amenzi și penalități
- Cheltuieli personale ale asociaților
- Cheltuieli fără documente justificative
- TVA nedeductibilă

💡 **Sfat:** Păstrează toate documentele justificative minimum 10 ani!`,d300:`**Declarația D300 - Decont TVA**

📅 **Termene de depunere:**
- **Lunar**: p\xe2nă pe data de **25** a lunii următoare (pentru cifră afaceri > 100.000 EUR)
- **Trimestrial**: p\xe2nă pe data de **25** a lunii următoare trimestrului

📋 **Conținut D300:**
- TVA colectată din v\xe2nzări
- TVA deductibilă din achiziții
- TVA de plată sau de recuperat
- Operațiuni scutite și intracomunitare

✅ **DocumentIulia calculează automat:**
- Centralizare TVA din toate facturile
- Verificare coduri TVA parteneri
- Generare XML pentru depunere
- Arhivare digitală conform ANAF`,"pfa srl":`**Comparație fiscală PFA vs SRL \xeen 2025**

👤 **PFA (Persoană Fizică Autorizată)**
- Impozit pe venit: **10%** din venitul net
- Contribuții sociale obligatorii: ~35% din venit
- Venit maxim pentru norma de venit: depinde de activitate
- Răspundere: nelimitată (cu patrimoniul personal)

🏢 **SRL Micro\xeentreprindere**
- Impozit pe venit: **1%** din cifra de afaceri (fără angajați) sau **3%** (cu angajați)
- Dividende: **8%** impozit la distribuire
- Contribuții: doar pentru angajați
- Răspundere: limitată la capitalul social

💡 **Recomandare:**
- Venituri mici (<100.000 lei/an): PFA poate fi mai avantajos
- Venituri mari: SRL micro\xeentreprindere
- Nevoie de protecție patrimoniu: SRL

⚠️ **Notă:** Consultă un expert contabil pentru situația ta specifică!`,"impozit micro":`**Impozitul pe venit pentru micro\xeentreprinderi 2025**

📊 **Cote de impozitare:**
- **1%** din cifra de afaceri - pentru firme FĂRĂ angajați
- **3%** din cifra de afaceri - pentru firme CU angajați

📋 **Condiții micro\xeentreprindere:**
- Cifra de afaceri < 500.000 EUR/an
- Capital social deținut de persoane fizice (nu alte firme)
- Nu activezi \xeen domenii excluse (bancar, asigurări, jocuri de noroc)

💰 **Calcul exemplu:**
- Cifră afaceri: 100.000 lei
- Impozit (fără angajați): 1.000 lei
- Impozit (cu angajați): 3.000 lei

📅 **Plată:** Trimestrial, p\xe2nă pe 25 a lunii următoare trimestrului

⚠️ **Modificări 2025:** Verifică legislația actuală pentru eventuale schimbări!`};function z(){let[e,t]=(0,a.useState)([]),[i,l]=(0,a.useState)(""),[o,c]=(0,a.useState)(!1),d=(0,a.useRef)(null),u=(0,a.useRef)(null),p=async e=>{if(!e.trim()||o)return;let i={id:Date.now().toString(),role:"user",content:e.trim(),timestamp:new Date};t(e=>[...e,i]),l(""),c(!0);let r={id:"typing",role:"assistant",content:"",timestamp:new Date,isTyping:!0};t(e=>[...e,r]),await new Promise(e=>setTimeout(e,1500));let a=function(e){let t=e.toLowerCase();return t.includes("prag")&&t.includes("tva")?N["prag tva"]:t.includes("e-factura")||t.includes("efactura")||t.includes("factura electronica")?N["e-factura"]:t.includes("deductibil")||t.includes("cheltuiel")?N["cheltuieli deductibile"]:t.includes("d300")||t.includes("decont")?N.d300:t.includes("pfa")&&t.includes("srl")?N["pfa srl"]:t.includes("micro")||t.includes("impozit")?N["impozit micro"]:`Mulțumesc pentru \xeentrebare!

Aceasta este o versiune demo a Consultantului AI DocumentIulia. \xcen versiunea completă, vei primi răspunsuri personalizate bazate pe:

📚 **Baza de cunoștințe:**
- Codul Fiscal actualizat
- Norme metodologice ANAF
- Ghiduri și instrucțiuni oficiale
- Practici contabile rom\xe2nești

🔍 **Pentru \xeentrebarea ta:**
"${e}"

Te rugăm să reformulezi \xeentrebarea sau să alegi una din sugestiile de mai jos pentru a vedea un exemplu de răspuns detaliat.

💡 **Sfat:** \xcencearcă \xeentrebări despre TVA, e-Factura, cheltuieli deductibile, sau diferențe PFA/SRL!`}(e);t(e=>[...e.filter(e=>"typing"!==e.id),{id:(Date.now()+1).toString(),role:"assistant",content:a,timestamp:new Date}]),c(!1)},h=e=>{navigator.clipboard.writeText(e)},z=e=>e.toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"});return(0,r.jsxs)("div",{className:"h-[calc(100vh-8rem)] flex flex-col",children:[(0,r.jsxs)("div",{className:"flex items-center justify-between mb-4",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3",children:[(0,r.jsx)("div",{className:"p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl",children:(0,r.jsx)(m.A,{className:"w-6 h-6 text-white"})}),(0,r.jsxs)("div",{children:[(0,r.jsx)("h1",{className:"text-xl font-bold",children:"Consultant AI Fiscal"}),(0,r.jsx)("p",{className:"text-sm text-gray-500 dark:text-gray-400",children:"Răspunsuri inteligente la \xeentrebări fiscale și contabile"})]})]}),e.length>0&&(0,r.jsxs)("button",{onClick:()=>{t([])},className:"flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",children:[(0,r.jsx)(x.A,{className:"w-4 h-4"}),"Șterge conversația"]})]}),(0,r.jsxs)("div",{className:"flex-1 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden",children:[(0,r.jsx)("div",{className:"flex-1 overflow-y-auto p-4 space-y-4",children:0===e.length?(0,r.jsx)("div",{className:"h-full flex flex-col items-center justify-center",children:(0,r.jsxs)(n.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"text-center max-w-xl",children:[(0,r.jsx)("div",{className:"w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center",children:(0,r.jsx)(g,{className:"w-8 h-8 text-white"})}),(0,r.jsx)("h2",{className:"text-xl font-semibold mb-2",children:"Bună! Sunt asistentul tău fiscal AI"}),(0,r.jsx)("p",{className:"text-gray-500 dark:text-gray-400 mb-6",children:"Pot răspunde la \xeentrebări despre TVA, e-Factura, deductibilități, declarații fiscale și multe altele. Cu ce te pot ajuta astăzi?"}),(0,r.jsx)("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:k.map((e,t)=>(0,r.jsxs)(n.P.button,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.1*t},onClick:()=>p(e.question),className:"flex items-start gap-3 p-3 text-left rounded-lg border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors group",children:[(0,r.jsx)("div",{className:"p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors",children:(0,r.jsx)(e.icon,{className:"w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400"})}),(0,r.jsxs)("div",{children:[(0,r.jsx)("div",{className:"font-medium text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400",children:e.title}),(0,r.jsx)("div",{className:"text-xs text-gray-500 dark:text-gray-400 line-clamp-2",children:e.question})]})]},t))})]})}):(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(s.N,{children:e.map(e=>(0,r.jsxs)(n.P.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},exit:{opacity:0},className:`flex gap-3 ${"user"===e.role?"justify-end":""}`,children:["assistant"===e.role&&(0,r.jsx)("div",{className:"flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center",children:(0,r.jsx)(g,{className:"w-4 h-4 text-white"})}),(0,r.jsxs)("div",{className:`max-w-[80%] ${"user"===e.role?"order-first":""}`,children:[(0,r.jsx)("div",{className:`rounded-2xl px-4 py-3 ${"user"===e.role?"bg-purple-600 text-white rounded-br-md":"bg-gray-100 dark:bg-gray-800 rounded-bl-md"}`,children:e.isTyping?(0,r.jsxs)("div",{className:"flex items-center gap-1",children:[(0,r.jsx)("span",{className:"w-2 h-2 bg-gray-400 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),(0,r.jsx)("span",{className:"w-2 h-2 bg-gray-400 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),(0,r.jsx)("span",{className:"w-2 h-2 bg-gray-400 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]}):(0,r.jsx)("div",{className:`prose prose-sm max-w-none ${"user"===e.role?"prose-invert":"dark:prose-invert"}`,children:e.content.split("\n").map((e,t)=>{let i=e.split(/(\*\*[^*]+\*\*)/g);return(0,r.jsx)("p",{className:"mb-2 last:mb-0",children:i.map((e,t)=>e.startsWith("**")&&e.endsWith("**")?(0,r.jsx)("strong",{children:e.slice(2,-2)},t):e)},t)})})}),!e.isTyping&&"assistant"===e.role&&(0,r.jsxs)("div",{className:"flex items-center gap-2 mt-1 px-2",children:[(0,r.jsx)("span",{className:"text-xs text-gray-400",children:z(e.timestamp)}),(0,r.jsx)("button",{onClick:()=>h(e.content),className:"p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",title:"Copiază",children:(0,r.jsx)(f.A,{className:"w-3 h-3"})}),(0,r.jsx)("button",{className:"p-1 text-gray-400 hover:text-green-500",title:"Răspuns util",children:(0,r.jsx)(b.A,{className:"w-3 h-3"})}),(0,r.jsx)("button",{className:"p-1 text-gray-400 hover:text-red-500",title:"Răspuns neutil",children:(0,r.jsx)(y,{className:"w-3 h-3"})})]}),"user"===e.role&&(0,r.jsx)("div",{className:"text-right mt-1 px-2",children:(0,r.jsx)("span",{className:"text-xs text-gray-400",children:z(e.timestamp)})})]}),"user"===e.role&&(0,r.jsx)("div",{className:"flex-shrink-0 w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center",children:(0,r.jsx)(v.A,{className:"w-4 h-4 text-gray-600 dark:text-gray-400"})})]},e.id))}),(0,r.jsx)("div",{ref:d})]})}),e.length>0&&(0,r.jsx)("div",{className:"px-4 py-2 border-t border-gray-100 dark:border-gray-800",children:(0,r.jsxs)("div",{className:"flex items-center gap-2 overflow-x-auto scrollbar-thin pb-2",children:[(0,r.jsx)("span",{className:"text-xs text-gray-400 flex-shrink-0",children:"Sugestii:"}),k.slice(0,4).map((e,t)=>(0,r.jsx)("button",{onClick:()=>p(e.question),className:"flex-shrink-0 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-colors",children:e.title},t))]})}),(0,r.jsxs)("div",{className:"p-4 border-t border-gray-200 dark:border-gray-800",children:[(0,r.jsxs)("div",{className:"flex items-end gap-3",children:[(0,r.jsxs)("div",{className:"flex-1 relative",children:[(0,r.jsx)("textarea",{ref:u,value:i,onChange:e=>l(e.target.value),onKeyDown:e=>{"Enter"!==e.key||e.shiftKey||(e.preventDefault(),p(i))},placeholder:"Scrie \xeentrebarea ta despre fiscalitate...",rows:1,className:"w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none",style:{maxHeight:"120px"}}),(0,r.jsx)("div",{className:"absolute right-2 bottom-2 text-xs text-gray-400",children:"Enter pentru a trimite"})]}),(0,r.jsx)("button",{onClick:()=>p(i),disabled:!i.trim()||o,className:"p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all",children:o?(0,r.jsx)(j.A,{className:"w-5 h-5 animate-spin"}):(0,r.jsx)(A.A,{className:"w-5 h-5"})})]}),(0,r.jsxs)("p",{className:"mt-2 text-xs text-center text-gray-400",children:[(0,r.jsx)(w.A,{className:"w-3 h-3 inline mr-1"}),"Răspunsurile AI sunt orientative. Pentru decizii importante, consultă un expert contabil."]})]})]})]})}},45037:(e,t,i)=>{"use strict";i.d(t,{A:()=>r});let r=(0,i(93468).A)("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]])},12592:(e,t,i)=>{"use strict";i.d(t,{A:()=>r});let r=(0,i(93468).A)("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]])},92557:(e,t,i)=>{"use strict";i.d(t,{A:()=>r});let r=(0,i(93468).A)("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]])},15607:(e,t,i)=>{"use strict";i.d(t,{A:()=>r});let r=(0,i(93468).A)("Send",[["path",{d:"m22 2-7 20-4-9-9-4Z",key:"1q3vgg"}],["path",{d:"M22 2 11 13",key:"nzbqef"}]])},46904:(e,t,i)=>{"use strict";i.d(t,{A:()=>r});let r=(0,i(93468).A)("ThumbsUp",[["path",{d:"M7 10v12",key:"1qc93n"}],["path",{d:"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z",key:"y3tblf"}]])},49656:(e,t,i)=>{"use strict";i.d(t,{A:()=>r});let r=(0,i(93468).A)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]])},80832:(e,t,i)=>{"use strict";i.d(t,{A:()=>r});let r=(0,i(93468).A)("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]])},80462:(e,t,i)=>{"use strict";i.r(t),i.d(t,{default:()=>r});let r=(0,i(46760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"/var/www/documentiulia.ro/apps/web/app/[locale]/(dashboard)/ai-consultant/page.tsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"/var/www/documentiulia.ro/apps/web/app/[locale]/(dashboard)/ai-consultant/page.tsx","default")}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),r=t.X(0,[112,891,557,943,69],()=>i(15493));module.exports=r})();