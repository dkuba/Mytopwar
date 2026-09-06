"""Browser smoke. --offline embeds identical local modules, and does not qualify HTTP hosting."""
from pathlib import Path
import argparse,base64,json,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
def offline_html():
    imports={}
    for path in (ROOT/'src').rglob('*.js'):
        def rewrite(m):
            target=(path.parent/m.group(2)).resolve().relative_to(ROOT).as_posix()
            return 'from '+m.group(1)+'lc/'+target+m.group(1)
        code=re.sub(r'from\s*([\'\"])(\.{1,2}/[^\'\"]+)\1',rewrite,path.read_text())
        imports['lc/'+path.relative_to(ROOT).as_posix()]='data:text/javascript;base64,'+base64.b64encode(code.encode()).decode()
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<link rel="stylesheet"[^>]+>',lambda _: '<style>'+(ROOT/'styles.css').read_text()+'</style>',html)
    return re.sub(r'<script type="module"[^>]+></script>',lambda _: '<script type="importmap">'+json.dumps({'imports':imports})+'</script><script type="module">import "lc/src/main.js";</script>',html)
def run():
    a=argparse.ArgumentParser();a.add_argument('--offline',action='store_true');a.add_argument('--url',default='http://localhost:8080/');a.add_argument('--output',default='test-results');a.add_argument('--viewport',choices=['all','desktop','mobile'],default='all');args=a.parse_args()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True);results=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        for name,w,h,touch in [('desktop',1280,900,False),('mobile',390,844,True)]:
            if args.viewport != 'all' and args.viewport != name: continue
            page=browser.new_page(viewport={'width':w,'height':h},has_touch=touch,device_scale_factor=1);errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            if args.offline:
                page.goto('about:blank?qa=1');page.set_content(offline_html(),wait_until='load')
            else: page.goto(args.url+('&' if '?' in args.url else '?')+'qa=1',wait_until='networkidle')
            page.wait_for_function('window.__qa && document.querySelectorAll(".commander").length===3')
            assert not page.locator('#fatal').is_visible(),page.locator('#fatal-message').text_content()
            page.screenshot(path=str(out/f'{name}-menu.png'))
            page.click('#missions');assert page.locator('.mission').count()==12;page.locator('.mission').first.click()
            page.click('#play');page.evaluate('__qa.freeze(true);__qa.step(400)');assert page.evaluate('__qa.sim.units.length')>=10
            x=page.evaluate('__qa.scene.project(3.5,0,0).x');y=int(h*.72)
            if touch:page.touchscreen.tap(x,y)
            else:page.mouse.move(w/2,y);page.mouse.down();page.mouse.move(x,y,steps=8);page.mouse.up()
            page.evaluate('__qa.step(90)');assert page.evaluate('__qa.sim.x')>2.9
            page.click('#pause');before=page.evaluate('__qa.sim.time');page.evaluate('__qa.step(120)');assert page.evaluate('__qa.sim.time')==before
            page.get_by_role('button',name='Продолжить',exact=True).click();page.click('#ability');assert page.evaluate('__qa.sim.cooldown')>23
            page.evaluate('__qa.step(180)');page.screenshot(path=str(out/f'{name}-battle.png'))
            page.evaluate('__qa.step(1000)');page.wait_for_selector('.artifact');assert page.locator('.artifact').count()==3
            before=page.evaluate('__qa.sim.time');page.evaluate('__qa.step(180)');assert page.evaluate('__qa.sim.time')==before
            page.locator('.artifact').first.click();assert page.evaluate('__qa.sim.artifacts.length')==1
            for level in range(1,11):
                page.evaluate("""level=>{__qa.start(level);__qa.freeze(true);const s=__qa.sim;s.events=[{at:0,type:'row',choices:[{lane:0,op:'add',value:50}]},{at:8,type:'boss'}];__qa.step(520);}""",level)
                assert page.evaluate('__qa.sim.bosses.length')>=1
                if level==5:page.screenshot(path=str(out/f'{name}-boss.png'))
            page.evaluate('__qa.home()');page.click('#endless');assert page.evaluate('__qa.sim.mode')=='endless'
            page.click('#pause');page.get_by_role('button',name='В штаб',exact=True).click();page.click('#shop');assert page.locator('.shop-item').count()==2
            page.get_by_role('button',name='Назад',exact=True).click()
            page.evaluate('for(let i=0;i<8;i++)__qa.start(1);__qa.freeze(false)');page.wait_for_timeout(600);assert 0<page.evaluate('__qa.sim.time')<.9
            assert not errors,errors
            results.append({'viewport':name,'size':[w,h],'passed':True,'javascript_errors':errors,'renderer':page.evaluate('__qa.scene.g.mode'),'checks':['menu','missions','recruit','pointer/touch','pause','ability','artifact-freeze','artifact-choice','ten-boss-models','endless','shop','single-clock']})
            page.close()
        browser.close()
    report={'mode':'offline-import-map','results':results} if args.offline else {'mode':'HTTP','results':results}
    (out/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':run()
