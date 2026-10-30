import {MASCOT_STATES,rewardFor,safeMascotState} from './mascot-states.js';
const views=new Set();let baseline='idle',state='idle',hidden=false,bpm=80,until=0,lastReward=0;
export function mascotMarkup(extra=''){return `<span class="mascot ${extra}" data-state="idle" aria-hidden="true"><span class="mascot-shadow"></span><span class="mascot-sprite"></span></span>`}
function paint(){for(const view of views){if(!view.isConnected){views.delete(view);continue}view.hidden=hidden;view.dataset.state=safeMascotState(state,hidden);view.style.setProperty('--mascot-beat',60/Math.max(40,Math.min(200,bpm))+'s')}}
export const mascot={
 mount(root=document){root.querySelectorAll('.mascot:not([data-gallery])').forEach(v=>views.add(v));paint()},
 start({tempo=80,demo=false,known=true}={}){bpm=tempo;baseline=known?(demo?'bob':'groove'):'idle';state=baseline;hidden=false;until=0;lastReward=0;paint()},
 visibility(value){if(hidden===value)return;hidden=value;paint()},
 frame(){if(until&&performance.now()>until){until=0;state=baseline;paint()}},
 hit({error,streak=0}={}){if(hidden)return;const now=performance.now();if(now-lastReward<1200)return;state=rewardFor({error,streak});lastReward=now;until=now+(state==='recover'?1250:1100);paint()},
 stop(completed=false){baseline='idle';state=completed?'victory':'idle';hidden=false;until=completed?performance.now()+2400:0;paint();if(completed)setTimeout(()=>this.frame(),2450)},
};
export function setupMascots(){
 const intro=document.querySelector('.lesson-intro');intro?.insertAdjacentHTML('beforeend',`<div class="mascot-welcome">${mascotMarkup()}<div><strong>你的節奏拍檔</strong><span>一起練，慢慢穩。</span></div></div>`);
 document.querySelector('#pixel-tutor .pixel-person')?.replaceWith(document.createRange().createContextualFragment(mascotMarkup('mascot-tutor')));
 document.getElementById('pixel-art')?.insertAdjacentHTML('beforeend',mascotMarkup('mascot-main'));
 document.getElementById('tap')?.classList.add('has-mascot');
 const box=document.createElement('article');box.className='card mascot-settings';box.innerHTML=`<div class="eyebrow">MEET YOUR RHYTHM PARTNER</div><h2>結他吉祥物 · 10 種動作</h2><p>參照你的設計圖：墨鏡、披風與紅橙色結他。點選動作可預覽。</p><div id="mascot-preview">${mascotMarkup()}<strong id="mascot-preview-name">Idle · 待機</strong></div><div class="mascot-choices">${MASCOT_STATES.map(([id,en,zh],i)=>`<button class="quiet" data-preview="${id}" aria-pressed="${i===0}"><span>${String(i+1).padStart(2,'0')}</span>${zh}</button>`).join('')}</div><p class="fine">已知拍點練習才跟隨設定 BPM；個人歌曲沒有拍點時只回應點擊。無聲／模仿回應階段隱藏，減少動態時顯示靜態姿勢。</p>`;document.getElementById('settings').append(box);
 const preview=box.querySelector('.mascot');preview.dataset.gallery='yes';box.querySelectorAll('[data-preview]').forEach(button=>button.onclick=()=>{preview.dataset.state=button.dataset.preview;const selected=MASCOT_STATES.find(s=>s[0]===button.dataset.preview);box.querySelector('#mascot-preview-name').textContent=selected[1]+' · '+selected[2];box.querySelectorAll('[data-preview]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)))});
 mascot.mount();document.addEventListener('visibilitychange',()=>{if(document.hidden)mascot.stop()});window.addEventListener('hashchange',()=>mascot.stop());
}
