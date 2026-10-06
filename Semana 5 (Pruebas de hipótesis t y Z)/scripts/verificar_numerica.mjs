import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test, tCDF, normalCDF, quantile, rng, sample} from '../dist/stats.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../dist/datos.json',import.meta.url),'utf8'));
for(const kind of ['t','z']) {
  const e=data.reference.exercises[kind];
  const values=e.indices.map(i=>data.rows[i][2]);
  const r=test({values,mu0:e.mu0,alpha:.05,kind,tail:kind==='t'?'both':'right',sigma:data.reference.sigma});
  for(const key of ['mean','median','s','se','statistic','p','critical'])assert.ok(Math.abs(r[key]-e[key])<2e-6,`${kind}.${key}: ${r[key]} vs SciPy ${e[key]}`);
  assert.equal(r.reject,e.reject);
}
assert.ok(Math.abs(tCDF(0,14)-.5)<1e-12);
assert.ok(Math.abs(quantile(.975,x=>tCDF(x,4))-2.7764451051977987)<1e-9);
assert.ok(Math.abs(normalCDF(1.6448536269514722)-.95)<1e-7);
const indices=Array.from({length:6334},(_,i)=>i);
const first=sample(indices,200,rng(42));
assert.equal(new Set(first).size,200);assert.deepEqual(first,sample(indices,200,rng(42)));
assert.notDeepEqual(first,sample(indices,200,rng(43)));
const z=data.reference.exercises.z,values=z.indices.map(i=>data.rows[i][2]);
assert.equal(test({values,mu0:6,alpha:.01,kind:'z',tail:'right',sigma:data.reference.sigma}).reject,false);
assert.equal(test({values,mu0:6,alpha:.05,kind:'z',tail:'left',sigma:data.reference.sigma}).reject,false);
assert.equal(test({values:Array(15).fill(6),mu0:6,alpha:.05,kind:'t',tail:'both',sigma:data.reference.sigma}).valid,false);
console.log('Verificación numérica correcta: ejercicios vs SciPy, cuantiles, colas, cero varianza y muestreo reproducible.');
