// Independent timer: no planner content, no network requests.
(() => {
  const defaults={focus:30,rest:5,mode:'focus',running:false,remaining:1800,end:0};
  let state={...defaults},audio;
  try{const saved=JSON.parse(sessionStorage.getItem('planner-pomodoro'));if(saved&&[30,45,60].includes(saved.focus)&&[5,10,25].includes(saved.rest)&&['focus','rest'].includes(saved.mode)&&Number.isFinite(saved.remaining)&&saved.remaining>=0&&Number.isFinite(saved.end))state={...defaults,...saved};}catch{}
  const el=id=>document.getElementById(id),length=()=>state[state.mode]*60;
  function save(){try{sessionStorage.setItem('planner-pomodoro',JSON.stringify(state));}catch{}}
  function sound(){try{if(!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.frequency.value=660;gain.gain.setValueAtTime(.08,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.6);osc.start();osc.stop(audio.currentTime+.6);}catch{}}
  function render(){const remaining=state.running?Math.max(0,Math.ceil((state.end-Date.now())/1000)):state.remaining;
    el('pomodoroTime').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');el('pomodoroMode').textContent=state.mode==='focus'?'Focus':'Break';
    el('pomodoroToggle').textContent=state.running?'Ⅱ':'▶';el('pomodoroToggle').setAttribute('aria-label',state.running?'Pause Pomodoro':state.remaining<length()?'Resume Pomodoro':'Start Pomodoro');el('pomodoro').classList.toggle('is-running',state.running);el('pomodoro').classList.toggle('is-break',state.mode==='rest');
    document.querySelectorAll('[data-pomo-duration]').forEach(button=>button.setAttribute('aria-pressed',state[button.dataset.pomoDuration]===Number(button.dataset.minutes)));
  }
  function tick(){if(state.running&&Date.now()>=state.end){const finished=state.mode;state.mode=finished==='focus'?'rest':'focus';state.remaining=length();state.end=Date.now()+state.remaining*1000;el('pomodoroAnnouncement').textContent=finished==='focus'?'Focus finished. Take a break.':'Break finished. Start focusing.';sound();save();}render();}
  el('pomodoroToggle').addEventListener('click',()=>{if(state.running){state.remaining=Math.max(0,Math.ceil((state.end-Date.now())/1000));state.running=false;state.end=0;}else{try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();}catch{}state.running=true;state.end=Date.now()+state.remaining*1000;}save();tick();});
  el('pomodoroReset').addEventListener('click',()=>{state={...state,mode:'focus',running:false,end:0,remaining:state.focus*60};el('pomodoroAnnouncement').textContent='Timer reset';save();render();});
  document.querySelectorAll('[data-pomo-duration]').forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.pomoDuration;state[mode]=Number(button.dataset.minutes);if(!state.running&&state.mode===mode)state.remaining=length();save();render();}));
  el('pomodoroSettings').addEventListener('click',()=>{el('pomodoroPanel').hidden=!el('pomodoroPanel').hidden;el('pomodoroSettings').setAttribute('aria-expanded',!el('pomodoroPanel').hidden);});
  function close(){el('pomodoroPanel').hidden=true;el('pomodoroSettings').setAttribute('aria-expanded','false');}
  document.addEventListener('click',event=>{if(!event.target.closest('#pomodoro'))close();});document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});document.addEventListener('visibilitychange',tick);
  tick();setInterval(tick,1000);
})();
