export const stageOf=l=>l.group!=='基礎'?'風格專項':['subdivision','rests','offbeat','strum'].includes(l.id)?'入門':'進階';
export function nextLesson(records,lesson){
 const rows=records.filter(r=>r.id===lesson.id&&r.method==='tap');const last=rows[0],bpm=last?.bpm||80;
 if(!last||last.reason!=='課程完成'||last.result.expected<8)return {bpm,text:'先完成一次完整練習，建立自己的起點。'};
 const good=r=>r.reason==='課程完成'&&r.bpm===bpm&&r.result.expected>=8&&r.result.coverage>=.9&&r.result.absoluteMs<=45&&r.result.extras<=1;
 if(last.result.coverage<.7)return {bpm:Math.max(40,bpm-5),text:'先減慢 5 BPM，把漏拍補齊。'};
 if(rows.slice(0,3).length===3&&rows.slice(0,3).every(good))return {bpm:Math.min(200,bpm+5),text:'同速連續三次穩定，可嘗試增加 5 BPM。'};
 if(last.result.restExtras>1)return {bpm,text:'這次只專注休止：空格時保持手勢，先不要點下。'};
 if(last.result.matched>=8&&Math.abs(last.result.signedMs)>25)return {bpm,text:last.result.signedMs<0?'整體偏早；先聽清主拍，再放鬆落點。':'整體偏晚；提早準備手勢，保持落點。'};
 return {bpm,text:'維持這個速度，再完整練一次，先求穩定。'};
}
export function timelineData(plan,scorer,elapsed){return scorer.targets.filter((t,i)=>t.time+scorer.tolerance(i)<=elapsed).map(t=>{const index=scorer.targets.indexOf(t),hit=scorer.hits.find(h=>h.index===index);return {time:t.time,bar:t.bar,error:hit?hit.error*1000:null}})}
export function validSegment(a,b,duration){return Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&b<=duration&&b-a>=1}
