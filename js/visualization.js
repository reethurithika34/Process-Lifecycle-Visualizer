
const Visualization = (() => {
  let simTimer    = null;
  let simStep     = 0;
  let ganttLog    = [];
  let allProcs    = [];
  let isRunning   = false;
  let isPaused    = false;
  let speedMs     = 800;
  let simCallback = null; 
  const pidColorMap = {};
  let colorIdx = 0;
  const COLOR_COUNT = 8;
  function reset() {
    clearInterval(simTimer);
    simTimer   = null;
    simStep    = 0;
    isRunning  = false;
    isPaused   = false;
    colorIdx   = 0;
    Object.keys(pidColorMap).forEach(k => delete pidColorMap[k]);
    clearZone('readyQueue');
    clearZone('runningProcess');
    clearZone('waitingQueue');
    clearZone('terminatedList');
    document.getElementById('ganttChart').innerHTML    = '';
    document.getElementById('ganttTimeline').innerHTML = '';
    document.getElementById('ganttCard').style.display = 'none';
    document.getElementById('resultsCard').style.display = 'none';
    setClockDisplay(0);
    setStatus('idle');
  }
  function start(processes, gantt, onComplete) {
    reset();
    ganttLog   = gantt;
    allProcs   = processes;
    simStep    = 0;
    isRunning  = true;
    simCallback = onComplete;
    processes.forEach(p => {
      if (pidColorMap[p.pid] === undefined) {
        pidColorMap[p.pid] = colorIdx % COLOR_COUNT;
        colorIdx++;
      }
    });
    document.getElementById('ganttCard').style.display = 'block';
    document.getElementById('btnPause').disabled = false;
    document.getElementById('btnStep').disabled  = false;
    document.getElementById('btnReset').disabled = false;
    setStatus('running');
    scheduleNextStep();
  }
  function scheduleNextStep() {
    clearInterval(simTimer);
    if (!isPaused && isRunning) {
      simTimer = setInterval(doStep, speedMs);
    }
  }
  function doStep() {
    if (simStep >= ganttLog.length) {
      finishSim();
      return;
    }
    const segment = ganttLog[simStep];
    const time    = segment.start;
    setClockDisplay(segment.end);
    updateLifecycleZones(segment, time);
    appendGanttBlock(segment);
    simStep++;
    if (simStep >= ganttLog.length) {
      setTimeout(finishSim, speedMs);
      clearInterval(simTimer);
    }
  }
  function step() {
    if (simStep >= ganttLog.length) { finishSim(); return; }
    doStep();
  }
  function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    const btn = document.getElementById('btnPause');
    if (isPaused) {
      clearInterval(simTimer);
      btn.textContent = 'Resume';
      setStatus('paused');
    } else {
      btn.textContent = 'Pause';
      setStatus('running');
      scheduleNextStep();
    }
  }
  function setSpeed(ms) {
    speedMs = ms;
    if (isRunning && !isPaused) {
      scheduleNextStep();
    }
  }
  function updateLifecycleZones(segment, time) {
    const currentPid = segment.pid; 
    const ready      = [];
    const running    = [];
    const terminated = [];
    allProcs.forEach(p => {
      if (p.ct !== undefined && segment.start >= p.ct) {
        terminated.push(p);
      } else if (p.at > segment.start) {
      } else if (p.pid === currentPid) {
        running.push(p);
      } else if (p.at <= segment.start) {
        ready.push(p);
      }
    });
    renderZone('readyQueue',    ready,      'token-ready',      p => `RT rem`);
    renderZone('runningProcess', running,   'token-running',    p => {
      const seg = ganttLog[simStep];
      return seg ? `T:${seg.start}` : '';
    });
    renderZone('terminatedList', terminated, 'token-terminated', p => `WT:${p.wt}`);
    clearZone('waitingQueue'); 
  }
  function renderZone(zoneId, procs, tokenClass, infoFn) {
    const zone = document.getElementById(zoneId);
    zone.innerHTML = '';
    if (!procs.length) {
      zone.innerHTML = '<div class="empty-state">Empty / Idle</div>';
      return;
    }
    procs.forEach(p => {
      const token = document.createElement('div');
      token.className = `proc-token ${tokenClass}`;
      token.innerHTML = `
        <span class="token-pid">${p.pid}</span>
        <span class="token-info">${infoFn(p)}</span>
      `;
      zone.appendChild(token);
    });
  }
  function appendGanttBlock(segment) {
    const chart    = document.getElementById('ganttChart');
    const timeline = document.getElementById('ganttTimeline');
    const duration = segment.end - segment.start;
    const width = Math.max(32, duration * 36);
    const block = document.createElement('div');
    block.className = 'gantt-block';
    if (segment.pid === 'IDLE') {
      block.classList.add('idle-block');
      block.textContent = 'IDLE';
    } else {
      const ci = pidColorMap[segment.pid] || 0;
      block.classList.add(`run-block-${ci}`);
      block.textContent = segment.pid;
    }
    block.style.width    = `${width}px`;
    block.style.minWidth = `${width}px`;
    block.title = `${segment.pid}: [${segment.start} → ${segment.end}]`;
    chart.appendChild(block);
    const tick = document.createElement('div');
    tick.className = 'gantt-tick';
    tick.style.width    = `${width}px`;
    tick.style.minWidth = `${width}px`;
    tick.textContent    = segment.start;
    timeline.appendChild(tick);
    if (simStep + 1 >= ganttLog.length) {
      const endTick = document.createElement('div');
      endTick.className   = 'gantt-tick';
      endTick.textContent = segment.end;
      endTick.style.width = '32px';
      timeline.appendChild(endTick);
    }
    const scroll = document.querySelector('.gantt-scroll');
    if (scroll) scroll.scrollLeft = scroll.scrollWidth;
  }
  function finishSim() {
    clearInterval(simTimer);
    isRunning = false;
    renderZone('readyQueue',    [], 'token-ready',      () => '');
    renderZone('runningProcess',[], 'token-running',    () => '');
    renderZone('waitingQueue',  [], 'token-waiting',    () => '');
    renderZone('terminatedList', allProcs, 'token-terminated', p => `WT:${p.wt}`);
    setStatus('done');
    document.getElementById('btnPause').disabled = true;
    document.getElementById('btnStep').disabled  = true;
    const lastSeg = ganttLog[ganttLog.length - 1];
    if (lastSeg) setClockDisplay(lastSeg.end);
    document.getElementById('resultsCard').style.display = 'block';
    try {
      sessionStorage.setItem('os_sim_results', JSON.stringify(allProcs));
      sessionStorage.setItem('os_sim_averages', JSON.stringify({
        n: allProcs.length,
        tat: (allProcs.reduce((s, p) => s + p.tat, 0) / allProcs.length).toFixed(2),
        wt: (allProcs.reduce((s, p) => s + p.wt, 0) / allProcs.length).toFixed(2),
        rt: (allProcs.reduce((s, p) => s + p.rt, 0) / allProcs.length).toFixed(2)
      }));
    } catch (e) {
      console.warn("Failed to save simulation results to sessionStorage", e);
    }
    if (simCallback) simCallback(allProcs);
  }
  function clearZone(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="empty-state">Empty / Idle</div>';
  }
  function setClockDisplay(t) {
    document.getElementById('clockDisplay').textContent = `T = ${t}`;
  }
  function setStatus(state) {
    const dot   = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    dot.className = `status-dot ${state}`;
    const labels = {
      idle: 'IDLE', running: 'RUNNING', paused: 'PAUSED', done: 'DONE'
    };
    label.textContent = labels[state] || state.toUpperCase();
  }
  function getColorMap() { return { ...pidColorMap }; }
  return {
    start,
    reset,
    step,
    togglePause,
    setSpeed,
    getColorMap,
    get isRunning() { return isRunning; },
    get isPaused()  { return isPaused; }
  };
})(); 
