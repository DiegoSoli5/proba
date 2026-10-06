// Distribuciones y muestreo reproducible, sin dependencias externas.
export const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
export const variance = (a, ddof = 1) => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - ddof); };
export const median = a => { const b = [...a].sort((x,y) => x-y); const k = Math.floor(b.length/2); return b.length%2 ? b[k] : (b[k-1]+b[k])/2; };
export function logGamma(z) {
  const c = [676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z < .5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z--; let x=.99999999999980993; c.forEach((p,i)=>x+=p/(z+i+1)); const t=z+7.5;
  return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
function betaFraction(a,b,x) {
  let c=1, d=1-(a+b)*x/(a+1); if(Math.abs(d)<1e-30)d=1e-30; d=1/d; let h=d;
  for(let m=1;m<=250;m++) {
    let aa=m*(b-m)*x/((a+2*m-1)*(a+2*m)); d=1+aa*d; if(Math.abs(d)<1e-30)d=1e-30; c=1+aa/c; if(Math.abs(c)<1e-30)c=1e-30;d=1/d;h*=d*c;
    aa=-(a+m)*(a+b+m)*x/((a+2*m)*(a+2*m+1)); d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<3e-14)break;
  }return h;
}
export function betaI(x,a,b) {
  if(x<=0)return 0;if(x>=1)return 1;
  const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));
  return x<(a+1)/(a+b+2) ? bt*betaFraction(a,b,x)/a : 1-bt*betaFraction(b,a,1-x)/b;
}
export const tPDF = (x,df) => Math.exp(logGamma((df+1)/2)-logGamma(df/2)) / Math.sqrt(df*Math.PI) * (1+x*x/df)**(-(df+1)/2);
export function tCDF(x,df) { const b=.5*betaI(df/(df+x*x),df/2,.5); return x>=0 ? 1-b : b; }
export const normalPDF = x => Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
export function normalCDF(x) {
  // Aproximación de Abramowitz y Stegun; error absoluto < 7.5e-8.
  const t=1/(1+.2316419*Math.abs(x)); const p=normalPDF(x)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return x>=0 ? 1-p : p;
}
export function quantile(p,cdf) { let lo=-100,hi=100; for(let k=0;k<90;k++){const mid=(lo+hi)/2;if(cdf(mid)<p)lo=mid;else hi=mid;}return (lo+hi)/2; }
export function test({values,mu0,alpha,kind,tail,sigma}) {
  const n=values.length,m=mean(values),s=Math.sqrt(variance(values)),df=n-1,se=(kind==='t'?s:sigma)/Math.sqrt(n);
  if(!Number.isFinite(se)||se<=0) return {valid:false,n,mean:m,s,error:'La desviación es cero; el estadístico no está definido.'};
  const statistic=(m-mu0)/se,cdf=kind==='t'?x=>tCDF(x,df):normalCDF;
  const p=Math.min(1,Math.max(0,tail==='both'?2*cdf(-Math.abs(statistic)):tail==='right'?cdf(-statistic):cdf(statistic)));
  const critical=quantile(1-(tail==='both'?alpha/2:alpha),cdf);
  return {valid:true,n,mean:m,median:median(values),s,df,se,statistic,p,critical,reject:p<=alpha,ci:[m-quantile(1-alpha/2,cdf)*se,m+quantile(1-alpha/2,cdf)*se]};
}
export function rng(seed) { let a=Number(seed)>>>0;return ()=>{ a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296; }; }
export function sample(a,n,random) {const ix=Array.from({length:a.length},(_,i)=>i);for(let i=0;i<n;i++){const j=i+Math.floor(random()*(a.length-i));[ix[i],ix[j]]=[ix[j],ix[i]];}return ix.slice(0,n).map(i=>a[i]);}
export const randomNormal = random => Math.sqrt(-2*Math.log(Math.max(1e-12,random())))*Math.cos(2*Math.PI*random());
