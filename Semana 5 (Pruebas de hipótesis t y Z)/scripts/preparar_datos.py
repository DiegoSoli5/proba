"""Genera datos web y resultados de referencia desde el CSV entregado."""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
df = pd.read_csv(ROOT / 'GRAPROES_JAL_LOC.csv', dtype={'MUN': str, 'LOC': str})
df['GRAPROES'] = pd.to_numeric(df['GRAPROES'], errors='coerce')
valid = df.dropna(subset=['GRAPROES']).reset_index(drop=True)
g = valid['GRAPROES']
reference = {
    'count': len(g), 'excluded': len(df) - len(g),
    'mean': float(g.mean()), 'sigma': float(g.std(ddof=0)),
    'median': float(g.median()), 'municipalities': int(valid.NOM_MUN.nunique()),
    'aggregated': int(valid.LOC.isin(['9998', '9999']).sum()), 'exercises': {}
}
for kind, n, seed, mu in [('t', 15, 42, 6.69), ('z', 45, 101, 6.0)]:
    m = g.sample(n=n, random_state=seed)
    s = float(m.std(ddof=1))
    se = (s if kind == 't' else reference['sigma']) / np.sqrt(n)
    statistic = float((m.mean() - mu) / se)
    p = float(2 * stats.t.sf(abs(statistic), n - 1) if kind == 't' else stats.norm.sf(statistic))
    critical = float(stats.t.ppf(.975, n - 1) if kind == 't' else stats.norm.ppf(.95))
    reference['exercises'][kind] = {
        'n': n, 'seed': seed, 'mu0': mu, 'indices': m.index.tolist(),
        'mean': float(m.mean()), 'median': float(m.median()), 's': s,
        'se': float(se), 'statistic': statistic, 'p': p, 'critical': critical,
        'reject': bool(p <= .05)
    }
rows = [[r.NOM_MUN, r.NOM_LOC, float(r.GRAPROES), r.MUN, r.LOC] for r in valid.itertuples()]
(ROOT / 'dist' / 'datos.json').write_text(json.dumps({'reference': reference, 'rows': rows}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
(ROOT / 'referencia.json').write_text(json.dumps(reference, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(reference, ensure_ascii=False, indent=2))
