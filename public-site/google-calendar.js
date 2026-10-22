// Read-only Google availability. Tokens and responses stay in memory, never planner files.
(() => {
  const scope='https://www.googleapis.com/auth/calendar.events.freebusy';
  let token='',expires=0,client,context,cache=null,inflight='',generation=0,loading;
  const el=id=>document.getElementById(id);
  function status(text){el('googleCalendarStatus').textContent=text;}
  function controls(){el('googleCalendarConnect').textContent=token?'Reconnect Google':'Connect Google Calendar';el('googleCalendarDisconnect').hidden=!token;el('googleCalendarRefresh').hidden=!token;}
  function loadIdentity(){
    if(window.google?.accounts?.oauth2)return Promise.resolve();
    return loading??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=()=>{loading=null;reject(Error('Google sign-in could not load. Check your internet connection.'));};document.head.appendChild(script);});
  }
  async function connect(){
    if(!/^https?:$/.test(location.protocol)){status('Open the hosted planner to connect Google. Local files cannot use Google sign-in.');return;}
    const id=window.ORBIT_CONFIG?.googleClientId;if(!id){status('Google Client ID is missing.');return;}
    try{await loadIdentity();client??=window.google.accounts.oauth2.initTokenClient({client_id:id,scope,callback:response=>{
      if(response.error){status('Google access was not granted. Your local plans are unchanged.');return;}
      if(!window.google.accounts.oauth2.hasGrantedAllScopes(response,scope)){status('Allow access to calendar availability to display busy times.');return;}
      status('Google authorized · preparing availability…');token=response.access_token;expires=Date.now()+Number(response.expires_in||3600)*1000;cache=null;generation++;controls();refresh();
    },error_callback:()=>status('Sign-in closed or blocked. Click Connect Google Calendar to retry.')});client.requestAccessToken();}catch(error){status(error.message);}
  }
  function paint(){
    document.querySelectorAll('.google-busy').forEach(node=>node.remove());
    if(!context||!cache)return;let visible=0;
    if(!['day','week'].includes(context.view)){status('Google connected · switch to Day or Week to see busy times');return;}
    document.querySelectorAll('.time-lane').forEach(lane=>{
      const day=lane.dataset.calendarDate,base=new Date(day+'T00:00:00'),next=new Date(base);next.setDate(next.getDate()+1);
      for(const busy of cache.busy){const from=new Date(busy.start),to=new Date(busy.end);if(to<=base||from>=next)continue;
        const begin=from<base?0:from.getHours()*60+from.getMinutes(),finish=to>=next?1440:to.getHours()*60+to.getMinutes(),start=Math.max(context.start,begin),end=Math.min(context.end,finish);if(end<=start)continue;
        visible++;const block=document.createElement('div');block.className='google-busy';Object.assign(block.style,{position:'absolute',left:'1px',right:'1px',background:'rgba(66,133,244,.22)',border:'1px solid rgba(66,133,244,.55)',color:'#24589b',fontSize:'12px',padding:'3px',pointerEvents:'none',zIndex:'0',boxSizing:'border-box'});block.style.top=(start-context.start)/60*context.scale+'px';block.style.height=(end-start)/60*context.scale+'px';block.textContent='Google · Busy';block.setAttribute('aria-label','Busy in Google Calendar');lane.prepend(block);
      }
    });
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
    status('Google connected · '+visible+' visible / '+cache.busy.length+' loaded · '+tz+(visible?'':' · No busy times within the displayed dates/hours'));
    let jump=el('googleCalendarShowBusy');if(!jump){jump=document.createElement('button');jump.id='googleCalendarShowBusy';jump.type='button';jump.textContent='Show next busy time';jump.addEventListener('click',()=>{const sorted=cache?.busy.slice().sort((a,b)=>new Date(a.start)-new Date(b.start))||[],entry=sorted.find(b=>new Date(b.end)>new Date())||sorted[0];if(entry)window.PLANNER_OPEN_GOOGLE?.(entry.start);});el('googleCalendarStatus').after(jump);}jump.hidden=!!visible||!cache.busy.length;
  }
  async function refresh(force=false){
    if(!token||!context)return;
    if(Date.now()>=expires){token='';cache=null;generation++;controls();paint();status('Google connection expired. Reconnect to refresh busy times.');return;}
    const date=new Date(context.date+'T12:00:00'),start=new Date(date.getFullYear(),date.getMonth(),1);start.setDate(start.getDate()-7);const end=new Date(date.getFullYear(),date.getMonth()+1,8),key=start.toISOString()+'/'+end.toISOString();
    if(!force&&cache?.key===key){paint();return;}if(inflight===key)return;
    const run=generation;inflight=key;status('Loading Google busy times…');
    try{const response=await fetch('https://www.googleapis.com/calendar/v3/freeBusy',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({timeMin:start.toISOString(),timeMax:end.toISOString(),items:[{id:'primary'}]})});
      if(run!==generation)return;
      if(response.status===401){token='';cache=null;controls();throw Error('Google connection expired. Click Reconnect Google.');}
      if(!response.ok)throw Error('Could not load Google availability. Check calendar access and try Refresh.');
      const data=await response.json(),calendar=data.calendars?.primary;if(!calendar||calendar.errors?.length)throw Error('Google could not read your primary calendar availability.');
      if(run!==generation)return;cache={key,busy:calendar.busy||[]};paint();
    }catch(error){if(run===generation){cache=null;paint();status(error.message);}}finally{if(inflight===key)inflight='';}
  }
  el('googleCalendarConnect').addEventListener('click',connect);
  el('googleCalendarRefresh').addEventListener('click',()=>refresh(true));
  el('googleCalendarDisconnect').addEventListener('click',()=>{const old=token;token='';expires=0;cache=null;generation++;inflight='';paint();if(el('googleCalendarShowBusy'))el('googleCalendarShowBusy').hidden=true;controls();status('Google disconnected');if(old)window.google?.accounts?.oauth2.revoke(old,()=>{});});
  window.PLANNER_GOOGLE={render(value){context=value;paint();refresh();}};
})();
