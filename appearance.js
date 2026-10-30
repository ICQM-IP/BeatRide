export function setupAppearance(){
 const intro=document.querySelector('.lesson-intro'),hero=document.createElement('div'),copy=document.createElement('div');hero.className='academy-hero';copy.className='academy-copy';
 for(const selector of ['.eyebrow','h1','.intro']){const node=intro.querySelector(selector);if(node)copy.append(node)}hero.append(copy);const mascot=intro.querySelector('.mascot-welcome .mascot');if(mascot)hero.append(mascot);intro.querySelector('.mascot-welcome')?.remove();intro.prepend(hero);
 const route=document.querySelector('.learning-route');hero.after(route);const tools=document.createElement('div');tools.className='academy-tools';tools.append(document.getElementById('lesson-daily'));const detail=document.createElement('details');detail.className='academy-about';detail.innerHTML='<summary>練習模式與評分說明</summary>';detail.append(intro.querySelector('.lesson-disclaimer'));tools.append(detail);route.after(tools);
 const heading=document.createElement('div');heading.className='academy-section-heading';heading.innerHTML='<h2>探索課程</h2><span>18 課 · 自由選擇</span>';document.getElementById('lesson-catalog').before(heading);
 document.getElementById('lesson-panel').hidden=true;
 const legend=document.querySelector('.lesson-legend'),explain=document.createElement('details');explain.className='lesson-explanation';explain.innerHTML='<summary>查看譜格與時間說明</summary>';legend.before(explain);explain.append(legend,document.getElementById('lesson-calibration'));
 document.querySelectorAll('.page>.eyebrow').forEach(node=>{const labels={listen:'我的節奏空間',train:'每天一點，穩穩前進',progress:'每次練習，都有累積',settings:'練出你的節奏'};if(labels[node.parentElement.id])node.textContent=labels[node.parentElement.id]});
 const modes=['主拍訓練','內在節拍','節奏挑戰'];document.querySelectorAll('.mode h2').forEach((n,i)=>n.textContent=modes[i]);document.querySelectorAll('.mode>span').forEach((n,i)=>n.textContent=['01 · 基礎','02 · 拍感','03 · 進階'][i]);
 for(const [selector,label] of [['.learning-dashboard>.eyebrow','學習足跡'],['.mascot-settings>.eyebrow','你的節奏拍檔'],['.plan>.eyebrow','每日五分鐘']]){const n=document.querySelector(selector);if(n)n.textContent=label}
}
