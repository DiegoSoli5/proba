import {mean,median,variance,tPDF,tCDF,normalPDF,normalCDF,quantile,test,rng,sample,randomNormal} from './stats.mjs';

const $ = id => document.getElementById(id);
const fmt = (v,n=4) => Number.isFinite(v) ? v.toFixed(n) : '—';
const int = v => new Intl.NumberFormat('es-MX').format(v);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors = {violet:'#a18abe',lavender:'#d8cbea',coral:'#d3978c',teal:'#729787',ink:'#6b5c80'};
let database,ref,activeSample=[],currentResult,preset='t',page=0,filtered=[],cltRun=0,errorRun=0,toastTimer;

function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function drawDecision(id,{kind='z',df=14,critical=1.96,statistic=null,tail='both',hero=false}={}) {
  const el=$(id),vb=el.viewBox.baseVal,w=vb.width,h=vb.height;
  const left=hero?15:30,right=w-22,top=23,bottom=h-42;
  const range=Math.min(10,Math.max(4.2,critical*1.3));
  const x=v=>left+(v+range)/(2*range)*(right-left),pdf=kind==='t'?v=>tPDF(v,df):normalPDF,y=v=>bottom-v/(pdf(0)*1.18)*(bottom-top);
  const points=Array.from({length:241},(_,i)=>-range+2*range*i/240);
  const path=arr=>arr.map((v,i)=>`${i?'L':'M'}${x(v).toFixed(2)},${y(pdf(v)).toFixed(2)}`).join(' ');
  const area=(lo,hi)=>{const a=[lo,...points.filter(v=>v>lo&&v<hi),hi];return `M${x(lo)},${bottom} ${path(a).replace(/^M/,'L')} L${x(hi)},${bottom} Z`;};
  const c=Math.min(range,critical);const regions=tail==='both'?[[-range,-c],[c,range]]:tail==='right'?[[c,range]]:[[-range,-c]];
  const grad='fill-'+id;
  let out=`<defs><linearGradient id="${grad}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c9b8e4" stop-opacity=".65"/><stop offset="1" stop-color="#e9e2f2" stop-opacity=".5"/></linearGradient></defs>`;
  [.25,.5,.75].forEach(f=>{const yy=bottom-f*(bottom-top);out+=`<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="#e6e0ec" stroke-width=".7" stroke-dasharray="3 5"/>`;});
  out+=`<path d="${area(-range,range)}" fill="url(#${grad})"/>`;
  regions.forEach(([lo,hi])=>out+=`<path d="${area(lo,hi)}" fill="${colors.coral}" opacity=".65"/>`);
  out+=`<path d="${path(points)}" fill="none" stroke="${colors.violet}" stroke-width="${hero?2.5:2}" stroke-linecap="round"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#d7d0df"/>`;
  [-Math.floor(range/2)*2,0,Math.floor(range/2)*2].forEach(v=>out+=`<text x="${x(v)}" y="${bottom+18}" text-anchor="middle" style="font-size:${hero?9:10}px">${v===0?'0':v.toFixed(0)}</text>`);
  const bounds=tail==='both'?[-c,c]:tail==='right'?[c]:[-c];
  bounds.forEach(v=>out+=`<line x1="${x(v)}" y1="${bottom}" x2="${x(v)}" y2="${y(pdf(v))-9}" stroke="#c8887f" stroke-dasharray="3 3" stroke-width="1.1"/><text x="${x(v)}" y="${bottom+33}" text-anchor="middle" style="font-size:${hero?8:9}px;fill:#b7857d">${v>0?'+':''}${fmt(v,hero?2:3)}</text>`);
  if(Number.isFinite(statistic)){
    const visible=Math.max(-range+.08,Math.min(range-.08,statistic)),xx=x(visible),yy=y(pdf(visible));
    out+=`<line x1="${xx}" y1="${bottom}" x2="${xx}" y2="${Math.min(yy-14,top+14)}" stroke="${colors.ink}" stroke-width="1.6"/><circle cx="${xx}" cy="${yy}" r="3.8" fill="${colors.ink}" stroke="white" stroke-width="2"/>`;
    const text=`${kind==='t'?'t':'Z'} = ${fmt(statistic,3)}${Math.abs(statistic)>range?' · fuera de escala':''}`;
    const anchor=xx>right-80?'end':xx<left+80?'start':'middle';
    out+=`<text x="${xx}" y="${top+3}" text-anchor="${anchor}" style="fill:#766089;font-size:10px;font-weight:500">${esc(text)}</text>`;
    el.setAttribute('aria-label',`Distribución ${kind==='t'?'t de Student':'normal estándar'} bajo H₀. Estadístico ${fmt(statistic)}, valor crítico ${tail==='left'?'-':''}${fmt(critical)}${tail==='both'?' en ambas colas':''}. Las áreas coral representan rechazo.`);
  }
  el.innerHTML=out;
}

function drawHistogram(id,values,{min=0,max=18,bins=18,color=colors.violet,kde=false,markers=false}={}) {
  const el=$(id),vb=el.viewBox.baseVal,w=vb.width,h=vb.height,left=35,right=w-15,top=17,bottom=h-34;
  if(!values.length){el.innerHTML=`<text x="${w/2}" y="${h/2}" text-anchor="middle">No hay registros que coincidan con los filtros.</text>`;return;}
  const bw=(max-min)/bins,counts=Array(bins).fill(0);values.forEach(v=>{const i=Math.min(bins-1,Math.floor((v-min)/bw));if(i>=0&&v<=max)counts[i]++;});
  const x=v=>left+(v-min)/(max-min)*(right-left),ymax=Math.max(...counts)*1.18||1,y=v=>bottom-v/ymax*(bottom-top);
  let out='';[0,.5,1].forEach(f=>{const value=ymax*f,yy=y(value);out+=`<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="#eae6ef" stroke-width=".8"/><text x="${left-7}" y="${yy+3}" text-anchor="end" style="font-size:9px">${Math.round(value)}</text>`;});
  counts.forEach((c,i)=>{const xx=x(min+i*bw)+2,barW=Math.max(1,(right-left)/bins-4);out+=`<rect class="bar" x="${xx}" y="${y(c)}" width="${barW}" height="${bottom-y(c)}" rx="3" fill="${color}" opacity=".72"><title>${fmt(min+i*bw,1)}–${fmt(min+(i+1)*bw,1)} años: ${c} registros</title></rect>`;});
  const ticks=5;for(let i=0;i<=ticks;i++){const value=min+(max-min)*i/ticks;out+=`<text x="${x(value)}" y="${bottom+19}" text-anchor="middle" style="font-size:9px">${fmt(value,1)}</text>`;}
  if(kde&&values.length>1){const sd=Math.sqrt(variance(values)),band=Math.max(.12,1.06*sd*values.length**(-.2));const pts=Array.from({length:150},(_,i)=>min+(max-min)*i/149);const points=pts.map((v,i)=>{const density=values.reduce((sum,a)=>sum+normalPDF((v-a)/band)/band,0)/values.length;return `${i?'L':'M'}${x(v)},${y(Math.min(ymax,density*values.length*bw))}`;}).join(' ');out+=`<path d="${points}" stroke="${colors.ink}" stroke-width="1.6" fill="none"/>`;}
  if(markers){[[mean(values),colors.teal,'Media'],[median(values),colors.coral,'Mediana']].forEach(([v,c,label])=>out+=`<line x1="${x(v)}" y1="${top+5}" x2="${x(v)}" y2="${bottom}" stroke="${c}" stroke-dasharray="3 4" stroke-width="1.4"><title>${label}: ${fmt(v)}</title></line>`);}
  out+=`<text x="${right}" y="${h-3}" text-anchor="end" style="font-size:8px">GRAPROES · años</text>`;el.innerHTML=out;
}

const steps=[
  {title:'Primero, mira los datos.',text:'Antes de calcular, revisa cómo se obtuvo la muestra y qué forma tienen sus valores. Un contraste para la media necesita observaciones aleatorias e independientes. Con n pequeño, la t requiere una población aproximadamente normal, sin asimetría fuerte ni valores extremos dominantes.',more:'El notebook compara media y mediana y dibuja un histograma con KDE. El histograma agrupa frecuencias; la KDE suaviza la densidad estimada. Son herramientas de diagnóstico, no pruebas de normalidad. Con muestras grandes, el TLC ayuda a aproximar la distribución de la media.',equation:'Muestra aleatoria + independencia + modelo razonable',note:'En la muestra t: media = 6.3727 y mediana = 6.30. Su cercanía es descriptiva; no garantiza normalidad. Las localidades también podrían presentar dependencia espacial, que este ejercicio no modela.'},
  {title:'Define la pregunta antes de mirar.',text:'H₀ es la hipótesis nula: el punto de referencia que ponemos a prueba. H₁ propone la diferencia que buscamos detectar. μ es la media de la población del marco de estudio; μ₀ es el valor de referencia, no la media de la muestra.',more:'La dirección de H₁ determina las colas. En un contraste unilateral se calcula la distribución en la frontera μ = μ₀ de la hipótesis nula compuesta.',html:'<div class="tail-options"><div>μ ≠ μ₀<small>Dos colas · cualquier diferencia</small></div><div>μ > μ₀<small>Derecha · valores mayores</small></div><div>μ < μ₀<small>Izquierda · valores menores</small></div></div>',note:'Elige la alternativa antes de observar la muestra. Cambiar de cola después de ver los resultados altera la tasa de error del procedimiento.'},
  {title:'Pon un límite al falso positivo.',text:'α es el nivel de significancia: la tasa de rechazos incorrectos que el procedimiento admite bajo H₀ en repeticiones, si se cumplen los supuestos. En ambos ejercicios del notebook se fija α = 0.05.',more:'En una prueba bilateral ese 5% se reparte: 2.5% en cada cola. En una unilateral se coloca todo en la dirección elegida. Reducir α exige evidencia más extrema y puede reducir la potencia.',equation:'Bilateral: α/2 + α/2 <small>·</small> Unilateral: α',note:'α = 0.05 no significa “95% de probabilidad de que la conclusión sea correcta”, ni asigna probabilidades posteriores a H₀.'},
  {title:'Elige la escala de comparación.',text:'Si σ es desconocida, la estimas con s y usas t de Student con n − 1 grados de libertad. Si σ es conocida y la media muestral tiene distribución normal o aproximadamente normal, usas Z.',more:'Las colas de t son más amplias porque estimar σ añade incertidumbre. A medida que crecen los grados de libertad, t se aproxima a Z. El notebook ilustra t con n = 15 y Z con n = 45; el umbral de 30 no es una frontera universal.',equation:'t: gl = n − 1 <small>·</small> Z: sin grados de libertad',note:'En el ejercicio t se trata σ como desconocida a propósito, aunque está disponible en el archivo completo. En Z se utiliza la σ de los 6,334 registros.'},
  {title:'Mide la distancia en errores estándar.',text:'El numerador x̄ − μ₀ mide la diferencia observada. El denominador es el error estándar (EE): s/√n para t, o σ/√n para Z. El estadístico dice cuántos errores estándar separan la muestra del valor nulo.',more:'El valor crítico es un cuantil de la distribución bajo H₀. Con α = 0.05, t bilateral y 14 gl: ±2.1448. Para Z de cola derecha: 1.6449. El p-valor resume cuán extremo sería el resultado bajo H₀, en las colas especificadas.',equation:'Estadístico = (x̄ − μ₀) / EE',note:'Población: σ² = Σ(x − μ)²/N, con ddof = 0. Muestra: s² = Σ(x − x̄)²/(n − 1), con ddof = 1. Usar N o n − 1 cambia el cálculo.'},
  {title:'Decide sin afirmar de más.',text:'Rechaza H₀ cuando p ≤ α, o cuando el estadístico cae en la región de rechazo. Para dos colas se compara |t| o |Z| con el valor crítico positivo; a la derecha se compara el valor sin tomar el absoluto.',more:'La t original da −1.3984 y p = 0.1838: no se rechaza H₀. La Z da 1.9852 y p = 0.0236: se rechaza H₀. La conclusión debe mencionar la dirección de la alternativa, el nivel α y el contexto.',equation:'p ≤ α → rechazar H₀',note:'No rechazar es “evidencia insuficiente contra H₀”. No significa aceptarla como verdadera. El p-valor tampoco es la probabilidad de que H₀ sea verdadera.'},
  {title:'Toda decisión puede equivocarse.',text:'Error tipo I: rechazas H₀ aunque es verdadera, un falso positivo. Error tipo II: no rechazas H₀ aunque es falsa, un falso negativo. β es la tasa de tipo II para una alternativa concreta; 1 − β es la potencia.',more:'Una muestra más grande o una diferencia real mayor suelen aumentar la potencia. Bajar α reduce los falsos positivos, pero, manteniendo todo lo demás, puede aumentar los falsos negativos.',equation:'Tipo I: α <small>·</small> Tipo II: β <small>·</small> Potencia: 1 − β',note:'En la decisión t podría ocurrir un error tipo II; en la decisión Z, un tipo I. El resultado del contraste por sí solo no demuestra que se haya cometido un error.'}
];
function setStep(k){document.querySelectorAll('.step').forEach(b=>{const active=Number(b.dataset.step)===k;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});const s=steps[k];$('step-content').innerHTML=`<span class="overline">PASO ${k.toString().padStart(2,'0')} / 06</span><h3>${s.title}</h3><p>${s.text}</p><p>${s.more}</p>${s.html||`<div class="step-equation">${s.equation}</div>`}<div class="step-insight"><strong>Para interpretar bien.</strong> ${s.note}</div>`;}
document.querySelectorAll('.step').forEach(b=>b.addEventListener('click',()=>setStep(Number(b.dataset.step))));setStep(0);
drawDecision('hero-curve',{hero:true});

function filterData(){page=0;const municipality=$('municipality').value,query=$('locality-search').value.trim().toLocaleLowerCase('es'),include=$('aggregate').checked;filtered=database.filter(r=>(!municipality||r[0]===municipality)&&(!query||r[1].toLocaleLowerCase('es').includes(query))&&(include||!['9998','9999'].includes(r[4])));const values=filtered.map(r=>r[2]);$('explore-count').textContent=int(values.length);$('explore-mean').textContent=values.length?`${fmt(mean(values))} años`:'—';$('explore-median').textContent=values.length?`${fmt(median(values),2)} años`:'—';drawHistogram('data-histogram',values);$('data-chart-note').textContent=values.length?`Media de esta selección: ${fmt(mean(values))} años. Cada barra cuenta registros, sin ponderación por habitantes.`:'Prueba otro municipio o nombre de localidad.';renderTable();}
function renderTable(){const per=6,start=page*per,rows=filtered.slice(start,start+per);$('data-rows').innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r[1])}</td><td>${esc(r[0])}</td><td>${esc(r[4])}</td><td>${fmt(r[2],2)}</td></tr>`).join(''):'<tr><td colspan="4">No se encontraron registros.</td></tr>';$('table-count').textContent=filtered.length?`${start+1}–${Math.min(start+per,filtered.length)} de ${int(filtered.length)} registros`:'0 registros';$('table-prev').disabled=page===0;$('table-next').disabled=start+per>=filtered.length;}

function loadPreset(kind,scroll=false){preset=kind;const r=ref.exercises[kind];$('test-kind').value=kind;$('test-tail').value=kind==='t'?'both':'right';$('mu0').value=r.mu0;$('alpha').value=.05;$('sample-size').value=r.n;$('seed').value=r.seed;activeSample=r.indices.map(i=>database[i]);updateLab();if(scroll){$('laboratorio').scrollIntoView({behavior:motionOK?'smooth':'auto',block:'start'});toast(`Muestra original del ejercicio ${kind==='t'?'t':'Z'} cargada.`);}}
function redrawSample(){const n=Number($('sample-size').value),seed=Number($('seed').value);if(!Number.isFinite(seed)||seed<0||seed>4294967295||!Number.isInteger(seed))return false;preset=null;activeSample=sample(database,n,rng(seed));return true;}
function updateLab(){
  const mu0=Number($('mu0').value),alpha=Number($('alpha').value),kind=$('test-kind').value,tail=$('test-tail').value;
  $('alpha-value').textContent=fmt(alpha,2);$('n-value').textContent=$('sample-size').value;
  document.querySelectorAll('.preset-switch button').forEach(b=>{const a=b.dataset.preset===preset;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));});
  if(!Number.isFinite(mu0)||mu0<0||mu0>20||$('mu0').value===''){$('lab-decision').innerHTML='<h4>Revisa la media de referencia</h4><p>Introduce un número entre 0 y 20 años.</p>';return;}
  if(!$('seed').checkValidity()||$('seed').value===''){$('lab-decision').innerHTML='<h4>Revisa la semilla</h4><p>Usa un entero entre 0 y 4,294,967,295.</p>';return;}
  const values=activeSample.map(r=>r[2]),r=test({values,mu0,alpha,kind,tail,sigma:ref.sigma});currentResult=r;
  if(!r.valid){$('lab-decision').textContent=r.error;return;}
  const symbol=tail==='both'?'≠':tail==='right'?'>':'<',nullSymbol=tail==='both'?'=':tail==='right'?'≤':'≥';
  $('lab-hypotheses').innerHTML=`<span>H₀: μ ${nullSymbol} ${fmt(mu0,2)}</span><span>H₁: μ ${symbol} ${fmt(mu0,2)}</span>`;
  $('lab-distribution-label').textContent=kind==='t'?`Distribución t · ${r.df} grados de libertad`:'Normal estándar · σ conocida';
  drawDecision('lab-curve',{kind,df:r.df,critical:r.critical,statistic:r.statistic,tail});
  $('lab-stat-grid').innerHTML=[['Media x̄',fmt(r.mean)],['Error estándar',fmt(r.se)],[`Estadístico ${kind==='t'?'t':'Z'}`,fmt(r.statistic)],['p-valor',r.p<.0001?'< 0.0001':fmt(r.p)]].map(([label,value])=>`<div><small>${label}</small><strong>${esc(value)}</strong></div>`).join('');
  const action=tail==='both'?'difiere de':tail==='right'?'supera':'es menor que';const decision=$('lab-decision');decision.classList.toggle('reject',r.reject);
  decision.innerHTML=`<h4>${r.reject?'Se rechaza H₀':'No se rechaza H₀'}</h4><p>${r.reject?'Hay evidencia':'No hay evidencia suficiente'}, a α = ${fmt(alpha,2)}, para concluir que la media ${action} ${fmt(mu0,2)} años.${!r.reject?' No rechazar H₀ no demuestra que sea verdadera.':''}</p><span class="decision-rule">p ${r.reject?'≤':'>'} α · Valor crítico ${tail==='both'?'±':tail==='left'?'−':''}${fmt(r.critical)} · Posible error tipo ${r.reject?'I':'II'}.</span>`;
  $('lab-assumption').textContent=kind==='t'?(values.length<30?'Muestra pequeña: revisa normalidad aproximada y valores extremos. Se asumen selección aleatoria e independencia.':'Con n grande, el TLC puede apoyar la aproximación. t sigue siendo válida con σ desconocida; revisa independencia y extremos.'):(values.length<30?'Con n pequeño, Z requiere una población aproximadamente normal. Conocer σ no elimina ese supuesto.':'Se usa σ de todo el archivo y la aproximación normal de la media. n ≥ 30 es una guía, no una garantía.');
  $('sample-origin').textContent=preset?`Muestra original del notebook · Pandas, semilla ${ref.exercises[preset].seed}.`:`Nueva muestra del navegador · semilla ${$('seed').value} (generador distinto a Pandas).`;
  const mn=Math.max(0,Math.floor(Math.min(...values)-.5)),mx=Math.ceil(Math.max(...values)+.5);
  drawHistogram('sample-histogram',values,{min:mn,max:mx,bins:values.length<30?6:8,kde:true,markers:true});
  $('sample-values-count').textContent=`n = ${values.length}`;$('sample-values').innerHTML=values.map(v=>`<span>${fmt(v,2)}</span>`).join('');
  $('sample-ci').textContent=`s = ${fmt(r.s)} · mediana = ${fmt(r.median,2)}. Intervalo bilateral de confianza ${Math.round((1-alpha)*100)}%: [${fmt(r.ci[0])}, ${fmt(r.ci[1])}] años. Este intervalo es bilateral incluso si el contraste seleccionado es unilateral.`;
}
function downloadSample(){const safeField=s=>'"'+String(s).replace(/"/g,'""')+'"';const csv='NOM_MUN,NOM_LOC,GRAPROES,MUN,LOC\n'+activeSample.map(r=>[r[0],r[1],r[2],r[3],r[4]].map(safeField).join(',')).join('\n');const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`muestra-${$('test-kind').value}-n${activeSample.length}-semilla${$('seed').value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Muestra descargada en formato CSV.');}

function runCLT(){const n=Number($('clt-n').value),N=database.length,random=rng(2026+cltRun++),values=database.map(r=>r[2]),means=[];
  // Rechazo de índices repetidos: muestra uniforme sin reemplazo, eficiente para n ≪ N.
  for(let k=0;k<1000;k++){const ix=new Set();let sum=0;while(ix.size<n){const j=Math.floor(random()*N);if(!ix.has(j)){ix.add(j);sum+=values[j];}}means.push(sum/n);}
  drawHistogram('clt-population',values,{color:'#b7a3cc'});drawHistogram('clt-means',means,{color:'#93b5a5'});
  const expected=ref.sigma/Math.sqrt(n)*Math.sqrt((N-n)/(N-1));
  $('clt-count').textContent='1,000 repeticiones';$('clt-results').innerHTML=[['Media poblacional μ',fmt(ref.mean)],['Promedio de las 1,000 medias',fmt(mean(means))],['EE teórico (con corrección)',fmt(expected)],['Desviación de las medias',fmt(Math.sqrt(variance(means)))]].map(([label,value])=>`<div>${label}<strong>${value}</strong></div>`).join('');
}
function runErrors(){const alpha=Number($('error-alpha').value),n=Number($('error-n').value),mu=Number($('true-mean').value);$('true-mean-value').textContent=fmt(mu,2);if(!Number.isFinite(n)||!Number.isInteger(n)||n<5||n>500){$('error-results').textContent='Introduce un tamaño entero entre 5 y 500.';return;}
  const critical=quantile(1-alpha,normalCDF),delta=(mu-6)/(ref.sigma/Math.sqrt(n)),random=rng(6400+errorRun++),hits=Array.from({length:500},()=>randomNormal(random)+delta>critical),count=hits.filter(Boolean).length,probability=normalCDF(delta-critical),nullTrue=mu<=6;
  $('simulation-dots').innerHTML=hits.map(v=>`<i${v?' class="hit"':''}></i>`).join('');$('simulation-dots').setAttribute('aria-label',`${count} de 500 contrastes rechazan H₀; ${500-count} no la rechazan.`);
  $('error-results').innerHTML=`<strong>${count} / 500</strong><p>contrastes rechazan H₀ (${fmt(count/5,1)}%). ${nullTrue?'Son falsos positivos porque la media del modelo satisface H₀.':'Son aciertos: la media del modelo es mayor que 6.'}</p><div class="power-row"><span>${nullTrue?'Tasa teórica de rechazo bajo esta media':'Potencia teórica · 1 − β'}</span><b>${fmt(100*probability,1)}%</b></div>${!nullTrue?`<div class="power-row"><span>Tipo II teórico · β</span><b>${fmt(100*(1-probability),1)}%</b></div>`:''}<p>${mu===6?'En la frontera μ = 6, la tasa teórica de falsos positivos es α.':nullTrue?'Para μ < 6, la tasa de falsos positivos es menor que α.':'La potencia depende de esta media verdadera, n y α.'} La frecuencia simulada fluctúa entre repeticiones.</p>`;
}

const motionOK=!matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window&&motionOK){document.documentElement.classList.add('js-reveal');const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.06,rootMargin:'0px 0px -20px 0px'});document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));}
function progress(){const max=document.documentElement.scrollHeight-innerHeight;$('reading-progress').style.width=`${max>0?100*scrollY/max:0}%`;}
window.addEventListener('scroll',progress,{passive:true});window.addEventListener('resize',progress);progress();
document.querySelectorAll('.quiz-options button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.quiz-options button').forEach(a=>a.classList.remove('correct-answer','wrong-answer'));const correct=b.dataset.answer==='correct';b.classList.add(correct?'correct-answer':'wrong-answer');$('quiz-feedback').textContent=correct?'Exacto. p > α: la muestra no aporta evidencia suficiente contra H₀.':'Inténtalo de nuevo. El contraste no asigna una probabilidad a H₀ ni demuestra igualdad; compara p con α.';}));

async function init(){try{const response=await fetch('./datos.json');if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();database=data.rows;ref=data.reference;
  const municipalities=[...new Set(database.map(r=>r[0]))].sort((a,b)=>a.localeCompare(b,'es'));$('municipality').innerHTML+=[...municipalities].map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('');
  ['municipality','aggregate'].forEach(id=>$(id).addEventListener('change',filterData));$('locality-search').addEventListener('input',filterData);$('reset-explorer').addEventListener('click',()=>{$('municipality').value='';$('locality-search').value='';$('aggregate').checked=true;filterData();});$('table-prev').addEventListener('click',()=>{page--;renderTable();});$('table-next').addEventListener('click',()=>{page++;renderTable();});filterData();
  drawDecision('example-t',{kind:'t',df:14,critical:ref.exercises.t.critical,statistic:ref.exercises.t.statistic});drawDecision('example-z',{critical:ref.exercises.z.critical,statistic:ref.exercises.z.statistic,tail:'right'});loadPreset('t');
  document.querySelectorAll('.load-preset').forEach(b=>b.addEventListener('click',()=>loadPreset(b.dataset.preset,!b.closest('.preset-switch'))));
  ['test-kind','test-tail','mu0','alpha'].forEach(id=>$(id).addEventListener(id==='test-kind'||id==='test-tail'?'change':'input',updateLab));
  ['sample-size','seed'].forEach(id=>$(id).addEventListener('input',()=>{if(redrawSample())updateLab();else updateLab();}));
  $('new-sample').addEventListener('click',()=>{$('seed').value=(Number($('seed').value)+1)>>>0;redrawSample();updateLab();toast('Nueva muestra extraída.');});$('download-sample').addEventListener('click',downloadSample);
  document.querySelectorAll('.challenge').forEach(b=>b.addEventListener('click',()=>{const c=b.dataset.challenge;loadPreset(c==='n'?'t':'z');if(c==='alpha')$('alpha').value=.01;if(c==='tail')$('test-tail').value='left';if(c==='n'){$('sample-size').value=100;redrawSample();}updateLab();$('lab-form').scrollIntoView({behavior:motionOK?'smooth':'auto',block:'center'});toast(c==='alpha'?'α = 0.01: compara el nuevo umbral.':c==='tail'?'H₁: μ < μ₀. Observa la cola izquierda.':'n = 100: se ha extraído una nueva muestra.');}));
  $('clt-n').addEventListener('input',()=>{$('clt-n-value').textContent=$('clt-n').value;$('clt-count').textContent='Pulsa Simular para actualizar';});$('run-clt').addEventListener('click',()=>{runCLT();toast('Se generaron 1,000 muestras nuevas.');});runCLT();
  ['error-alpha','error-n','true-mean'].forEach(id=>$(id).addEventListener(id==='error-alpha'?'change':'input',runErrors));$('run-errors').addEventListener('click',runErrors);runErrors();
}catch(error){console.error('No se pudo cargar el dataset:',error);$('data-chart-note').textContent='No se pudo cargar el dataset. Recarga la página o descarga el CSV en Recursos.';$('lab-decision').innerHTML='<h4>Datos no disponibles</h4><p>Recarga la página. Si la abriste como archivo local, sírvela con python -m http.server 4173 desde dist.</p>';toast('No se pudo cargar el dataset. Las explicaciones y descargas están disponibles.');}}
init();
