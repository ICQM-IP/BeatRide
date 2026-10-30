// Musical positions are quarter-note beats. No interval-equality score is used here.
export function buildLesson(lesson,{bpm=80,mode='tap',phraseBars=1,bars}={}){
  const beat=60/bpm,meter=lesson.meter||4,barSeconds=meter*beat,countIn=barSeconds;
  const totalBars=bars||lesson.bars||8,events=[],clicks=[],rests=[],listeningBars=[];
  for(let i=0;i<meter;i++)clicks.push({time:i*beat,accent:i===0,countIn:true});
  for(let bar=0;bar<totalBars;bar++){
    const listening=lesson.imitation&&Math.floor(bar/phraseBars)%2===0;
    if(listening)listeningBars.push(bar);
    const patternBar=lesson.imitation?Math.floor(bar/(phraseBars*2))*phraseBars+bar%phraseBars:bar;
    const pattern=lesson.pattern(patternBar);
    const audible=lesson.clicks?lesson.clicks(bar):'all';
    const visualClick=audible!=='none';
    for(let b=0;b<meter;b++)if(audible==='all'||audible==='backbeat'&&(b===1||b===3)||audible==='bar'&&b===0)clicks.push({time:countIn+(bar*meter+b)*beat,accent:b===0,bar,visual:visualClick});
    for(const note of pattern){
      const target=mode==='tap'&&!listening&&(!lesson.accentOnly||note.accent);
      events.push({...note,time:countIn+(bar*meter+note.at)*beat,end:countIn+(bar*meter+note.at+(note.hold||.1))*beat,bar,target,
        demo:mode==='demo'||mode==='guitar'||listening||lesson.accentOnly,hidden:!!lesson.imitation&&!listening&&mode==='tap'});
    }
    const step=lesson.grid||.25;
    for(let b=0;b<meter;b+=step)if(!pattern.some(n=>Math.abs(n.at-b)<.001||n.hold&&b>n.at&&b<n.at+n.hold))rests.push({start:countIn+(bar*meter+b)*beat,end:countIn+(bar*meter+b+step)*beat,bar});
  }
  return {events,clicks,rests,listeningBars,bpm,beat,meter,countIn,barSeconds,totalBars,duration:countIn+totalBars*barSeconds,mode};
}
export class LessonScorer{
 constructor(plan,offset=0){this.plan=plan;this.offset=offset;this.targets=plan.events.filter(e=>e.target);this.used=new Set();this.hits=[];this.extras=[];this.releases=[];this.last=-Infinity;}
 tolerance(index){const t=this.targets[index],before=index? t.time-this.targets[index-1].time:Infinity,after=index+1<this.targets.length?this.targets[index+1].time-t.time:Infinity;return Math.min(.15,this.plan.beat*.3,Math.min(before,after)*.45)}
 tap(time){
   const gaps=this.targets.slice(1).map((t,i)=>t.time-this.targets[i].time),spacing=gaps.length?Math.min(...gaps):this.plan.beat;
   if(time-this.last<Math.max(.012,Math.min(.04,spacing*.35)))return {ignored:true};
   this.last=time;const corrected=time-this.offset;
   if(corrected<this.plan.countIn-.15||corrected>=this.plan.duration+.15)return {ignored:true};
   if(this.plan.events.some(e=>e.bar===Math.floor((corrected-this.plan.countIn)/this.plan.barSeconds)&&!e.target&&e.hidden===false)&&this.plan.mode!=='tap')return {ignored:true};
   if(this.plan.mode!=='tap')return {ignored:true};
   // Ignore planned listening phrases, rather than penalizing their long gaps.
   const bar=Math.floor((corrected-this.plan.countIn)/this.plan.barSeconds);
   if(this.plan.listeningBars.includes(bar))return {ignored:true};
   let best=-1;for(let i=0;i<this.targets.length;i++)if(best<0||Math.abs(this.targets[i].time-corrected)<Math.abs(this.targets[best].time-corrected))best=i;
   if(best>=0&&Math.abs(corrected-this.targets[best].time)<=this.tolerance(best)&&!this.used.has(best)){
     const error=corrected-this.targets[best].time;this.used.add(best);this.hits.push({index:best,error,time});
     return {index:best,error,label:Math.abs(error)<=Math.min(.04,this.tolerance(best)*.6)?'準確':error<0?'搶拍':'拖拍',hold:!!this.targets[best].hold};
   }
   const rest=this.plan.rests.some(r=>corrected>=r.start&&corrected<r.end);this.extras.push({time,rest});return {label:rest?'休止位置多打':'額外點擊',error:null};
 }
 release(index,time){const target=this.targets[index];if(target?.hold&&!this.releases.some(x=>x.index===index)){const error=time-this.offset-target.end;this.releases.push({index,error});return error}return null}
 result(elapsed=this.plan.duration){
   const due=this.targets.map((t,i)=>({t,i})).filter(({t,i})=>t.time+this.offset+this.tolerance(i)<=elapsed);
   const hits=this.hits.filter(h=>due.some(x=>x.i===h.index)),expected=due.length,matched=hits.length;
   const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
   const reentry=hits.filter(h=>this.targets[h.index].reentry);
   return {expected,matched,missed:expected-matched,extras:this.extras.length,restExtras:this.extras.filter(x=>x.rest).length,
     coverage:expected?matched/expected:null,signedMs:avg(hits.map(h=>h.error*1000)),absoluteMs:avg(hits.map(h=>Math.abs(h.error)*1000)),
     reentryMs:avg(reentry.map(h=>Math.abs(h.error)*1000)),releaseMs:avg(this.releases.map(h=>Math.abs(h.error)*1000)),
     missingReleases:due.filter(x=>x.t.hold&&!this.releases.some(r=>r.index===x.i)).length,
     silentMs:avg(hits.filter(h=>this.targets[h.index].silent).map(h=>Math.abs(h.error)*1000))};
 }
}
