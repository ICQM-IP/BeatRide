// All time values in seconds; offsets have the same sign as a late tap.
export const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0;
export const sd = a => Math.sqrt(mean(a.map(x=>(x-mean(a))**2)));
export const median = a => { const b=[...a].sort((x,y)=>x-y); return b.length ? (b[Math.floor((b.length-1)/2)]+b[Math.ceil((b.length-1)/2)])/2 : 0; };
export function stability(taps) {
  const intervals=taps.slice(1).map((t,i)=>t-taps[i]);
  if(intervals.length<3) return null;
  const center=median(intervals), breaks=intervals.filter(x=>x>center*1.8).length;
  const avg=mean(intervals), deviation=sd(intervals), cv=deviation/avg;
  const n=Math.max(1,Math.floor(intervals.length/3));
  return {bpm:60/avg,meanMs:avg*1000,sdMs:deviation*1000,cv,breaks,
    driftPercent:(mean(intervals.slice(-n))/mean(intervals.slice(0,n))-1)*100,
    score:Math.max(0,Math.round(100*(1-Math.min(1,cv))))};
}
export function recommendation(s) {
  if(!s) return '先連續打至少 4 拍，讓教練了解你的節奏。';
  if(s.breaks) return '出現節奏中斷。把速度降至 70–80 BPM，先連續維持 16 拍。';
  if(s.cv>.12) return '先放鬆手腕，每拍只點一下。用 80 BPM 的四分音符練習。';
  if(Math.abs(s.driftPercent)>5) return s.driftPercent<0?'你逐漸加速。試試 Silent Beat，靜音時保持原來的呼吸。':'你逐漸減慢。試試 4 拍有聲、4 拍無聲，留意靜音段。';
  return '拍距已相當穩定。下一次試試反拍，或把無聲段延長至 8 拍。';
}
export function nextDifficulty(s,bpm) { return Math.max(40,Math.min(200,bpm+(s&&s.cv<.06?5:s&&s.cv>.15?-5:0))); }
export function trainingPlan(result,record){
  const stable=result.taps>=8&&result.stability&&result.stability.cv<=.12&&!result.stability.breaks;
  const bpm=stable?Math.max(40,Math.min(200,Math.round(record.bpm||80))):80;
  return {bpm,mode:stable?'silent':'trainer',silent:stable?4:0,title:stable?'下一次：一分鐘無聲節拍':'下一次：一分鐘主拍練習',description:stable?`以 ${bpm} BPM 練習 4 拍有聲、4 拍無聲，留意自己的速度。`:'以 80 BPM 放鬆跟拍，先連續維持 16 拍。'};
}
// Recent feedback deliberately differs from the full-session Scorer result.
export class LiveCoach {
  constructor(){this.window=[];this.breaks=0;}
  gapLimit(){const times=this.window.map(x=>x.time),gaps=times.slice(1).map((t,i)=>t-times[i]);return gaps.length>=3?Math.max(.3,median(gaps)*1.8):Infinity;}
  push(time,error=null){
    if(!Number.isFinite(time))return this.snapshot(time);
    if(this.window.length&&time-this.window.at(-1).time>this.gapLimit()){this.window=[];this.breaks++;}
    this.window.push({time,error});this.window=this.window.slice(-16);
    return this.snapshot(time);
  }
  snapshot(now){
    const interrupted=this.window.length>0&&now-this.window.at(-1).time>this.gapLimit();
    const count=this.window.length,phase=interrupted?'interrupted':count<8?'warming':'tracking';
    const stats=phase==='tracking'?stability(this.window.map(x=>x.time)):null;
    const errors=this.window.map(x=>x.error).filter(Number.isFinite);
    let message=phase==='interrupted'?'節奏中斷了。準備好再輕點，我們會重新建立近期節奏。':phase==='warming'?'正在了解你的節奏，先自然地連續打 8 拍。':stats.cv>.12?'拍距有些不平均。放鬆手腕，每拍只輕點一下。':Math.abs(stats.driftPercent)>5?(stats.driftPercent<0?'你正逐漸加速，試著放鬆一點。':'你正逐漸減慢，留意原來的速度。'):'近期拍距很穩定，保持現在的力度與呼吸。';
    return {phase,count,stats,message,absoluteMs:errors.length?mean(errors.map(Math.abs))*1000:null,matched:errors.length,breaks:this.breaks};
  }
}
export function targetAt(index,{bpm=90,meter=4,subdivision=1,pattern='beat',silent=0}={}) {
  // 6/8 uses an eighth-note pulse, with two accented groups per bar.
  const step=60/bpm/subdivision;
  let pos=index;
  if(pattern==='offbeat') pos=index+.5;
  if(pattern==='syncopation') pos=Math.floor(index/4)*4+[0,1.5,2,3.5][index%4];
  if(pattern==='imitation') pos=Math.floor(index/4)*4+[0,1,2.5,3][index%4];
  const beat=Math.floor(pos/subdivision);
  const silentLength=pattern==='growing'?Math.min(32,4+Math.floor(beat/32)*4):silent;
  const audible=!silentLength || beat%(silentLength*2)<silentLength;
  return {time:pos*step,accent:meter===6?beat%3===0:beat%meter===0,audible,
    reference:pattern==='imitation'?Math.floor(beat/4)%2===0:true};
}
export function nearestBeat(time,beats) {
  if(!beats.length) return null;
  let lo=0,hi=beats.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(beats[mid]<time)lo=mid+1;else hi=mid;}
  const indices=[lo-1,lo].filter(i=>i>=0&&i<beats.length);
  const i=indices.reduce((a,b)=>Math.abs(beats[a]-time)<=Math.abs(beats[b]-time)?a:b);
  return {index:i,error:time-beats[i]};
}
export class Scorer {
  constructor(){this.taps=[];this.errors=[];this.used=new Set();this.streak=0;this.best=0;this.duplicates=0;}
  tap(time,beats=null,offset=0,tolerance=.15){
    if(!Number.isFinite(time))return {ignored:true};
    const gaps=beats?.slice(1).map((t,i)=>t-beats[i]).filter(x=>x>0)||[];
    const debounce=gaps.length?Math.max(.012,Math.min(.08,Math.min(...gaps)*.4)):.08;
    if(this.taps.length&&time-this.taps.at(-1)<debounce)return {ignored:true};
    this.taps.push(time);
    if(!beats)return {stability:stability(this.taps)};
    const hit=nearestBeat(time-offset,beats);
    if(!hit||Math.abs(hit.error)>tolerance){this.streak=0;this.duplicates++;return {label:'Miss',error:null};}
    if(this.used.has(hit.index)){this.streak=0;this.duplicates++;return {label:'Extra',error:null};}
    this.used.add(hit.index);this.errors.push(hit.error);
    this.streak=Math.abs(hit.error)<=.07?this.streak+1:0;this.best=Math.max(this.best,this.streak);
    return {error:hit.error,label:Math.abs(hit.error)<=.04?'Perfect':hit.error<0?'Early':'Late'};
  }
  result(beats=null,elapsed=0,offset=0){
    const indices=beats?beats.map((t,i)=>({t,i})).filter(x=>x.t>=0&&x.t<=elapsed-offset-.15):[];
    const eligible=indices.length,matchedEligible=indices.filter(x=>this.used.has(x.i)).length;
    return {taps:this.taps.length,stability:stability(this.taps),
      timing:beats?{signedMs:mean(this.errors)*1000,absoluteMs:mean(this.errors.map(Math.abs))*1000,
        matched:this.errors.length,expected:eligible,missed:Math.max(0,eligible-matchedEligible),extra:this.duplicates,best:this.best}:null};
  }
}
export function validateBeatMap(map,hash,duration){
  if(map.version!==1||map.audioSHA256!==hash||typeof map.source!=='string'||!map.source.trim())throw Error('拍點檔案必須符合目前音訊的 SHA-256，並列明資料來源。');
  if(!Array.isArray(map.beats)||map.beats.length<2||map.beats.some((x,i)=>!Number.isFinite(x)||x<0||x>duration||(i&&x<=map.beats[i-1])))throw Error('拍點必須是遞增的秒數，且位於音訊範圍內。');
  return map;
}
export function calibration(errors){
  if(errors.length<12)throw Error('需要至少 12 次有效點擊。');
  const offset=median(errors),spread=sd(errors);
  return {offset,spread,samples:errors.length,confidence:spread<.025?'較高':spread<.06?'中等':'偏低',date:new Date().toISOString()};
}
// Media snapshots never extrapolate through pauses, seeks, track changes or buffering.
export class MediaClock {
  constructor(){this.anchor=null;this.generation=0;}
  update({id,time,playing},host){
    const old=this.anchor;
    const discontinuity=!!old&&(old.id!==id||old.playing!==playing||Math.abs(this.at(host)-time)>.25);
    if(discontinuity)this.generation++;
    this.anchor={id,time,playing,host};return discontinuity;
  }
  at(host){return this.anchor?this.anchor.time+(this.anchor.playing?Math.max(0,host-this.anchor.host):0):0;}
}
