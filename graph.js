/* Responsive canvas renderers. All plotted values come from the simulation engine. */
(function (global) {
  "use strict";
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width:rect.width, height:rect.height };
  }
  function drawBufferChart(canvas, history, capacity) {
    if (!canvas) return;
    const {ctx,w,width,height} = (() => { const x=setupCanvas(canvas); return {ctx:x.ctx,width:x.width,height:x.height}; })();
    const left=35,right=12,top=12,bottom=25,plotW=Math.max(1,width-left-right),plotH=Math.max(1,height-top-bottom);
    ctx.clearRect(0,0,width,height);
    const maxTime=Math.max(30, history.length ? history[history.length-1].time : 30);
    const maxY=Math.max(5,capacity);
    ctx.font='9px "IBM Plex Mono", monospace'; ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y=top+plotH*i/4, val=maxY*(1-i/4);
      ctx.strokeStyle="#e9eae5";ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();
      ctx.fillStyle="#96988f";ctx.textAlign="right";ctx.fillText(val.toFixed(0),left-8,y+3);
    }
    for(let i=0;i<=4;i++){
      const x=left+plotW*i/4;
      ctx.strokeStyle="#f0f0ec";ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+plotH);ctx.stroke();
      ctx.fillStyle="#96988f";ctx.textAlign="center";ctx.fillText(`${Math.round(maxTime*i/4)}s`,x,height-7);
    }
    if(history.length){
      const start=Math.max(0,history[0].time);
      const end=Math.max(maxTime,history[history.length-1].time);
      const span=Math.max(1,end-start);
      ctx.beginPath();
      history.forEach((p,i)=>{const x=left+((p.time-start)/span)*plotW;const y=top+plotH-(Math.min(maxY,p.buffer)/maxY)*plotH;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
      ctx.lineTo(left+plotW,top+plotH);ctx.lineTo(left,top+plotH);ctx.closePath();ctx.fillStyle="rgba(49,91,232,.08)";ctx.fill();
      ctx.beginPath();history.forEach((p,i)=>{const x=left+((p.time-start)/span)*plotW;const y=top+plotH-(Math.min(maxY,p.buffer)/maxY)*plotH;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
      ctx.strokeStyle="#315be8";ctx.lineWidth=2;ctx.stroke();
      const p=history[history.length-1],px=left+((p.time-start)/span)*plotW,py=top+plotH-(Math.min(maxY,p.buffer)/maxY)*plotH;
      ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);ctx.fillStyle="#315be8";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.stroke();
    }
  }
  function drawScene(canvas, time, state) {
    if(!canvas)return;
    const {ctx,width,height}=setupCanvas(canvas);
    ctx.clearRect(0,0,width,height);
    const g=ctx.createLinearGradient(0,0,width,height);g.addColorStop(0,"#172b49");g.addColorStop(1,"#0b1423");ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
    const t=time*0.35;
    for(let i=0;i<7;i++){
      const x=width*(.12+i*.13)+Math.sin(t+i*.7)*16;
      const y=height*(.25+(i%3)*.2)+Math.cos(t*.8+i)*10;
      const r=width*(.035+(i%2)*.012);
      const rg=ctx.createRadialGradient(x,y,0,x,y,r*2.5);
      rg.addColorStop(0,`rgba(${i%2?73:65},${i%2?117:145},${i%2?214:232},.28)`);rg.addColorStop(1,"rgba(49,91,232,0)");
      ctx.fillStyle=rg;ctx.beginPath();ctx.arc(x,y,r*2.5,0,Math.PI*2);ctx.fill();
    }
    ctx.strokeStyle="rgba(154,184,232,.15)";ctx.lineWidth=1;
    for(let i=0;i<9;i++){const x=(i/8)*width;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
    for(let i=0;i<5;i++){const y=(i/4)*height;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    ctx.fillStyle="rgba(221,232,255,.65)";ctx.font='10px "IBM Plex Mono", monospace';ctx.fillText("STREAM / FRAME "+String(Math.floor(time*24)).padStart(5,"0"),18,height-18);
    ctx.fillStyle="rgba(221,232,255,.35)";ctx.fillText(state,18,22);
  }
  global.BufferLabGraph={drawBufferChart,drawScene};
})(window);
