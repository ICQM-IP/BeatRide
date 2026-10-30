// Audio stays in this origin's IndexedDB; never sent to a server.
export class AudioLibrary {
  constructor(factory){try{this.factory=arguments.length?factory:globalThis.indexedDB}catch{this.factory=null}this.dbPromise=null;}
  open(){
    if(!this.factory)return Promise.reject(Error('此瀏覽器無法保存歌庫，請使用一般模式的 Safari 或 Chrome。'));
    this.dbPromise??=new Promise((resolve,reject)=>{const request=this.factory.open('beatride-audio-library',1);request.onupgradeneeded=()=>{request.result.createObjectStore('tracks',{keyPath:'id'})};request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();this.dbPromise=null};resolve(db)};request.onerror=()=>{this.dbPromise=null;reject(request.error)};request.onblocked=()=>{this.dbPromise=null;reject(Error('請關閉其他 BeatRide 分頁後重試。'))}});
    return this.dbPromise;
  }
  async transact(mode,operation){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('tracks',mode);let result;try{const request=operation(tx.objectStore('tracks'));request.onsuccess=()=>result=request.result;request.onerror=()=>{};}catch(e){tx.abort();reject(e);return}tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('歌庫保存失敗。'))})}
  async list(){const rows=await this.transact('readonly',s=>s.getAll());return rows.map(({blob,...metadata})=>metadata).sort((a,b)=>b.createdAt-a.createdAt)}
  get(id){return this.transact('readonly',s=>s.get(id))}
  async add(track){if(!track.id||!(track.blob instanceof Blob)||!Number.isFinite(track.duration)||track.duration<=0)throw Error('音訊資料不完整。');const old=await this.get(track.id);if(old)return {track:old,duplicate:true};await this.transact('readwrite',s=>s.put(track));return {track,duplicate:false}}
  async rename(id,name){const title=name.trim().slice(0,120);if(!title)throw Error('請輸入歌曲名稱。');const row=await this.get(id);if(!row)throw Error('歌曲已不存在。');row.name=title;await this.transact('readwrite',s=>s.put(row));return row}
  async setBeatMap(id,map){const row=await this.get(id);if(!row)throw Error('歌曲已不存在。');row.beatMap=map;await this.transact('readwrite',s=>s.put(row))}
  remove(id){return this.transact('readwrite',s=>s.delete(id))}
}
export function audioMetadata(blob){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),audio=new Audio();let settled=false;const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);const duration=audio.duration;audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);if(error)reject(error);else resolve({duration})};const timer=setTimeout(()=>finish(Error('讀取音訊逾時；請檢查檔案格式。')),12000);audio.preload='metadata';audio.onloadedmetadata=()=>Number.isFinite(audio.duration)&&audio.duration>0?finish():finish(Error('無法讀取有效音訊長度。'));audio.onerror=()=>finish(Error('無法播放此格式。請使用無 DRM 的 MP3、M4A 或 WAV。'));audio.src=url})}
export function fileLabel(filename){return filename.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').trim()||'未命名歌曲'}
