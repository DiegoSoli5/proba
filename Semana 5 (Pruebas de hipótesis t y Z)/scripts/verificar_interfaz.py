"""QA de interfaz con Playwright y Chromium existente. Ejecutar con servidor local."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verificacion'
OUT.mkdir(exist_ok=True)
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    failures=[]
    page.on('response',lambda response: failures.append(response.url) if response.status>=400 else None)
    assert page.goto('http://127.0.0.1:4173/').status == 200
    page.wait_for_selector('#data-rows tr')
    assert page.locator('#explore-count').inner_text() == '6,334'
    assert 'No se rechaza' in page.locator('#lab-decision').inner_text()
    page.screenshot(path=str(OUT/'escritorio.png'))
    page.locator('.preset-switch [data-preset=z]').click()
    assert 'Se rechaza' in page.locator('#lab-decision').inner_text()
    page.locator('#alpha').evaluate("el => {el.value=.01;el.dispatchEvent(new Event('input'));}")
    assert 'No se rechaza' in page.locator('#lab-decision').inner_text()
    page.locator('.preset-switch [data-preset=t]').click()
    page.locator('#test-tail').select_option('left')
    assert 'μ <' in page.locator('#lab-hypotheses').inner_text()
    page.locator('#sample-size').evaluate("el => {el.value=100;el.dispatchEvent(new Event('input'));}")
    assert '100' in page.locator('#n-value').inner_text()
    assert page.locator('#sample-values span').count() == 100
    page.locator('#aggregate').uncheck()
    assert page.locator('#explore-count').inner_text() == '6,112'
    page.locator('#municipality').select_option('Acatic')
    assert int(page.locator('#explore-count').inner_text().replace(',','')) < 100
    page.locator('#locality-search').fill('<script>nothing</script>')
    assert page.locator('#explore-count').inner_text() == '0'
    page.locator('#reset-explorer').click()
    page.locator('#table-next').click()
    assert '7–12' in page.locator('#table-count').inner_text()
    for k in range(7):
        page.locator(f'.step[data-step="{k}"]').click()
        assert f'PASO {k:02}' in page.locator('#step-content').inner_text()
    page.locator('#clt-n').evaluate("el => {el.value=100;el.dispatchEvent(new Event('input'));}")
    page.locator('#run-clt').click()
    assert '1,000 repeticiones' in page.locator('#clt-count').inner_text()
    page.locator('#true-mean').evaluate("el => {el.value=7;el.dispatchEvent(new Event('input'));}")
    assert 'Potencia teórica' in page.locator('#error-results').inner_text()
    page.locator('[data-answer=correct]').click()
    assert 'Exacto' in page.locator('#quiz-feedback').inner_text()
    page.locator('.sample-details summary').click()
    with page.expect_download() as download:
        page.locator('#download-sample').click()
    assert '.csv' in download.value.suggested_filename
    assert page.request.get('http://127.0.0.1:4173/recursos/T_y_Z.ipynb').status==200
    assert page.request.get('http://127.0.0.1:4173/recursos/GRAPROES_JAL_LOC.csv').status==200
    page.locator('.preset-switch [data-preset=t]').click()
    page.locator('#laboratorio').scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/'laboratorio.png'))
    for width,height in [(390,844),(768,1024),(1440,1000)]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate('scrollTo(0,0)')
        page.wait_for_timeout(150)
        overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
        assert not overflow, f'Overflow at {width}px'
        if width==390:page.screenshot(path=str(OUT/'movil.png'))
    assert not errors, errors
    assert not failures, failures
    browser.close()
result={'status':'correcto','viewports':[390,768,1440],'page_errors':errors,'http_failures':failures,'checks':['presets t y Z','cambio de alpha y cola','muestreo de 100 registros','filtros y registros agrupados','paginación','7 pasos','TLC','potencia','quiz','descarga de muestra','originales descargables','sin desbordamiento horizontal']}
(OUT/'resultado.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
