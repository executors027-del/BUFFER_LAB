/* Interface wiring and requestAnimationFrame loop. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const engine = new BufferLabSimulation.BufferSimulation();
  const presets = {
    fast:{downloadMbps:20,bitrateMbps:5},
    slow:{downloadMbps:2,bitrateMbps:5},
    quality:{downloadMbps:8,bitrateMbps:12},
    balanced:{downloadMbps:8,bitrateMbps:5}
  };
  const controls = {downloadSpeed:$("downloadSpeed"),bitrate:$("bitrate"),capacity:$("capacity"),stability:$("stability")};
  let raf=0,lastFrame=null,lastRender=0,sceneTime=0;
  const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmtTime = s => {const n=Math.max(0,Math.floor(s));return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;};
  const fmt = n => Number(n).toFixed(1);
  function readControls(){
    return {downloadMbps:+controls.downloadSpeed.value,bitrateMbps:+controls.bitrate.value,capacitySeconds:+controls.capacity.value,stability:+controls.stability.value};
  }
  function updateLabels(){
    const c=readControls();
    $("downloadValue").innerHTML=`${fmt(c.downloadMbps)} <small>Mbps</small>`;
    $("bitrateValue").innerHTML=`${fmt(c.bitrateMbps)} <small>Mbps</small>`;
    $("capacityValue").innerHTML=`${c.capacitySeconds} <small>sec</small>`;
    $("stabilityValue").innerHTML=`${c.stability} <small>%</small>`;
    $("screenQuality").textContent=qualityName(c.bitrateMbps);
    $("qualitySelect").value=String(c.bitrateMbps);
    $("statDownload").innerHTML=`${fmt(engine.currentDownloadMbps)} <small>Mbps</small>`;
    $("statBitrate").innerHTML=`${fmt(c.bitrateMbps)} <small>Mbps</small>`;
  }
  function qualityName(rate){return rate<=1.5?"480p":rate<=3?"720p":rate<=8?"1080p":"1440p";}
  function applyConfig(){engine.configure(readControls());updateLabels();render();}
  function setControls(values){
    const map={downloadMbps:"downloadSpeed",bitrateMbps:"bitrate",capacitySeconds:"capacity",stability:"stability"};
    Object.entries(values).forEach(([k,v])=>{if(map[k])controls[map[k]].value=String(v);});
    applyConfig();
    document.querySelectorAll(".preset").forEach(b=>b.classList.toggle("active",presets[b.dataset.preset] && presets[b.dataset.preset].downloadMbps===engine.config.downloadMbps && presets[b.dataset.preset].bitrateMbps===engine.config.bitrateMbps));
    document.querySelectorAll("[data-capacity]").forEach(b=>b.classList.toggle("selected",+b.dataset.capacity===engine.config.capacitySeconds));
  }
  function render(){
    const s=engine.snapshot(),pct=s.capacitySeconds?100*s.buffer/s.capacitySeconds:0;
    $("playerState").textContent=s.state;$("screenStatus").textContent=s.state;
    $("screenMessage").textContent=({READY:"Ready when you are",PLAYING:"Streaming smoothly",BUFFERING:"Waiting for more data…",PAUSED:"Playback paused",COMPLETED:"You've reached the end"})[s.state];
    $("screenPlay").style.opacity=s.state==="PLAYING"?"0":"1";
    $("screenPlay").textContent=s.state==="PLAYING"?"":s.state==="PAUSED"?"▶":"▶";
    $("screenIndicator")?.classList.toggle("active",s.state==="PLAYING");
    $("playerHint").textContent=s.state==="BUFFERING"?"Buffer is refilling — playback will resume automatically":s.state==="PLAYING"?"Playback is consuming buffered video":s.state==="COMPLETED"?"Experiment complete — reset to run again":"Press play to start the experiment";
    $("timelineProgress").style.width=`${100*s.playbackTime/s.videoDuration}%`;
    $("currentTime").textContent=fmtTime(s.playbackTime);$("screenTime").textContent=`${fmtTime(s.playbackTime)} / 01:30`;
    $("bufferValue").textContent=fmt(s.buffer);$("bufferMax").textContent=s.capacitySeconds;
    $("bufferPercent").textContent=`${Math.round(pct)}%`;$("capacityMeta").textContent=`${s.capacitySeconds} sec`;
    $("bufferProgress").setAttribute("aria-valuemax",s.capacitySeconds);$("bufferProgress").setAttribute("aria-valuenow",s.buffer.toFixed(1));
    $("bufferFill").style.width=`${pct}%`;
    const health=s.buffer===0?"EMPTY":pct<15?"CRITICAL":pct<40?"LOW":"HEALTHY";
    $("bufferHealth").textContent=health;
    $("bufferFill").style.background=health==="CRITICAL"||health==="EMPTY"?"var(--red)":health==="LOW"?"var(--amber)":"var(--green)";
    $("incomingRate").textContent=`${fmt(s.ratio)}×`;$("outgoingRate").textContent=s.playRequested&&s.state==="PLAYING"?"1.00×":"0.00×";
    const filled=Math.round(pct/100*8);$("miniBuffer").querySelectorAll("i").forEach((el,i)=>el.classList.toggle("filled",i<filled));
    $("statDownload").innerHTML=`${fmt(s.currentDownloadMbps)} <small>Mbps</small>`;$("statBitrate").innerHTML=`${fmt(s.bitrateMbps)} <small>Mbps</small>`;
    $("statPlayback").textContent=fmtTime(s.playbackTime);$("statElapsed").textContent=fmtTime(s.elapsedTime);
    $("statEvents").textContent=s.bufferingEvents;$("statBuffering").innerHTML=`${fmt(s.bufferingDuration)} <small>sec</small>`;
    $("statExhaustion").textContent=s.timeToEmpty===null?"—":`${fmt(s.timeToEmpty)} sec`;
    $("ratioValue").textContent=`${fmt(s.ratio)}×`;
    const sustainable=s.ratio>=1;
    $("comparisonTitle").textContent=sustainable?"Your network can sustain this quality.":"Your network cannot sustain this quality.";
    $("comparisonText").textContent=sustainable?"Incoming data can keep up with playback consumption.":"Incoming data is slower than playback consumption.";
    $("downloadBar").style.width=`${Math.min(100,s.downloadMbps/25*100)}%`;$("bitrateBar").style.width=`${Math.min(100,s.bitrateMbps/25*100)}%`;
    $("instantSpeed").textContent=`${fmt(s.currentDownloadMbps)} Mbps`;
    const outage=s.outageRemaining>0;
    $("outageStatus").textContent=outage?`Offline · ${fmt(s.outageRemaining)} sec`:"Network online";
    $("outageBtn").disabled=outage;$("deepOutageBtn").disabled=outage;
    $("outageBtn").textContent=outage?`↯  Connection interrupted (${Math.ceil(s.outageRemaining)}s)`:"↯  Trigger 8-second internet outage";
    $("chartRange").textContent=`0–${Math.max(30,Math.ceil(s.elapsedTime/30)*30)} SEC`;
    BufferLabGraph.drawBufferChart($("bufferChart"),s.history,s.capacitySeconds);
    BufferLabGraph.drawScene($("sceneCanvas"),sceneTime,s.state);
    $("playBtn").disabled=s.state==="PLAYING"||s.state==="BUFFERING"||s.state==="COMPLETED";
    $("pauseBtn").disabled=!s.playRequested||s.state==="COMPLETED";
  }
  function tick(timestamp){
    if(lastFrame===null)lastFrame=timestamp;
    const raw=(timestamp-lastFrame)/1000;lastFrame=timestamp;
    // Ignore long suspended-tab gaps; simulation time is not wall-clock time.
    const dt=Math.min(Math.max(raw,0),.1);
    if(dt>0){engine.step(dt);sceneTime+=dt;}
    if(timestamp-lastRender>45||engine.state==="COMPLETED"){render();lastRender=timestamp;}
    if(engine.state!== "COMPLETED")raf=requestAnimationFrame(tick);
  }
  function startLoop(){if(!raf){lastFrame=null;raf=requestAnimationFrame(tick);}}
  function stopLoop(){if(raf){cancelAnimationFrame(raf);raf=0;}lastFrame=null;}
  function reset(){stopLoop();engine.reset();sceneTime=0;render();}
  $("playBtn").addEventListener("click",()=>{engine.play();startLoop();render();});
  $("screenPlay").addEventListener("click",()=>{if(engine.state=== "PLAYING")engine.pause();else engine.play();startLoop();render();});
  $("pauseBtn").addEventListener("click",()=>{engine.pause();render();});
  $("resetBtn").addEventListener("click",reset);
  Object.values(controls).forEach(el=>el.addEventListener("input",()=>{engine.configure(readControls());updateLabels();render();}));
  document.querySelectorAll(".preset").forEach(btn=>btn.addEventListener("click",()=>setControls(presets[btn.dataset.preset])));
  function outage(){engine.triggerOutage(8);startLoop();render();}
  $("outageBtn").addEventListener("click",outage);$("deepOutageBtn").addEventListener("click",outage);
  $("qualitySelect").addEventListener("change",e=>{controls.bitrate.value=e.target.value;applyConfig();});
  document.querySelectorAll("[data-capacity]").forEach(btn=>btn.addEventListener("click",()=>{controls.capacity.value=btn.dataset.capacity;applyConfig();document.querySelectorAll("[data-capacity]").forEach(b=>b.classList.toggle("selected",b===btn));}));
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",e=>{const target=document.querySelector(a.getAttribute("href"));if(target){e.preventDefault();target.scrollIntoView({behavior:reducedMotion?"auto":"smooth"});}}));
  let resizeTimer;window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,100);});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&raf){lastFrame=null;}});
  updateLabels();render();
})();