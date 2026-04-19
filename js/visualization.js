/**
 * visualization.js
 * ============================================================
 * Handles the real-time step-by-step simulation playback.
 * Drives the lifecycle state cards (Ready/Running/Waiting/Terminated)
 * and the Gantt Chart progressive reveal.
 *
 * Depends on:
 *   - DOM elements created in index.html
 *   - scheduler.js for pre-computed results
 *   - ui.js for showResults()
 * ============================================================
 */

const Visualization = (() => {

  // State
  let simTimer    = null;
  let simStep     = 0;
  let ganttLog    = [];
  let allProcs    = [];
  let isRunning   = false;
  let isPaused    = false;
  let speedMs     = 800;
  let simCallback = null; // called when sim completes

  // PID -> color-class index map
  const pidColorMap = {};
  let colorIdx = 0;
  const COLOR_COUNT = 8;

  // -------------------------------------------------------
  // Initialize / Reset visualization state
  // -------------------------------------------------------
  function reset() {
    clearInterval(simTimer);
    simTimer   = null;
    simStep    = 0;
    isRunning  = false;
    isPaused   = false;
    colorIdx   = 0;
    Object.keys(pidColorMap).forEach(k => delete pidColorMap[k]);

    // Clear all state zones
    clearZone('readyQueue');
    clearZone('runningProcess');
    clearZone('waitingQueue');
    clearZone('terminatedList');

    // Clear gantt
    document.getElementById('ganttChart').innerHTML    = '';
    document.getElementById('ganttTimeline').innerHTML = '';
    document.getElementById('ganttCard').style.display = 'none';
    document.getElementById('resultsCard').style.display = 'none';

    // Clock
    setClockDisplay(0);
    setStatus('idle');
  }

  // -------------------------------------------------------
  // Start simulation
  // -------------------------------------------------------
  function start(processes, gantt, onComplete) {
    reset();
    ganttLog   = gantt;
    allProcs   = processes;
    simStep    = 0;
    isRunning  = true;
    simCallback = onComplete;

    // Assign colors to PIDs
    processes.forEach(p => {
      if (pidColorMap[p.pid] === undefined) {
        pidColorMap[p.pid] = colorIdx % COLOR_COUNT;
        colorIdx++;
      }
    });

    // Show gantt card
    document.getElementById('ganttCard').style.display = 'block';

    // Button states
    document.getElementById('btnPause').disabled = false;
    document.getElementById('btnStep').disabled  = false;
    document.getElementById('btnReset').disabled = false;
    setStatus('running');

    scheduleNextStep();
  }

  // -------------------------------------------------------
  // Schedule next step with current speed
  // -------------------------------------------------------
  function scheduleNextStep() {
    clearInterval(simTimer);
    if (!isPaused && isRunning) {
      simTimer = setInterval(doStep, speedMs);
    }
  }

  // -------------------------------------------------------
  // Execute one simulation step (one gantt segment)
  // -------------------------------------------------------
  function doStep() {
    if (simStep >= ganttLog.length) {
      finishSim();
      return;
    }

    const segment = ganttLog[simStep];
    const time    = segment.start;

    // Update clock to segment start
    setClockDisplay(segment.end);

    // Update lifecycle zones based on current time
    updateLifecycleZones(segment, time);

    // Append gantt block
    appendGanttBlock(segment);

    simStep++;

    if (simStep >= ganttLog.length) {
      // Schedule final cleanup on next tick
      setTimeout(finishSim, speedMs);
      clearInterval(simTimer);
    }
  }

  // -------------------------------------------------------
  // Manual step (when paused)
  // -------------------------------------------------------
  function step() {
    if (simStep >= ganttLog.length) { finishSim(); return; }
    doStep();
  }

  // -------------------------------------------------------
  // Pause / Resume
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // Update speed from slider
  // -------------------------------------------------------
  function setSpeed(ms) {
    speedMs = ms;
    if (isRunning && !isPaused) {
      scheduleNextStep();
    }
  }

  // -------------------------------------------------------
  // Update lifecycle state zones for the current gantt segment
  // -------------------------------------------------------
  function updateLifecycleZones(segment, time) {
    const currentPid = segment.pid; // 'IDLE' or real pid

    // Determine which processes are in which state at segment.start
    const ready      = [];
    const running    = [];
    const terminated = [];

    allProcs.forEach(p => {
      if (p.ct !== undefined && segment.start >= p.ct) {
        terminated.push(p);
      } else if (p.at > segment.start) {
        // Not arrived yet — not shown
      } else if (p.pid === currentPid) {
        running.push(p);
      } else if (p.at <= segment.start) {
        ready.push(p);
      }
    });

    // Render
    renderZone('readyQueue',    ready,      'token-ready',      p => `RT rem`);
    renderZone('runningProcess', running,   'token-running',    p => {
      const seg = ganttLog[simStep];
      return seg ? `T:${seg.start}` : '';
    });
    renderZone('terminatedList', terminated, 'token-terminated', p => `WT:${p.wt}`);
    clearZone('waitingQueue'); // No I/O waiting in CPU scheduling sim
  }

  // -------------------------------------------------------
  // Render tokens in a zone
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // Append a gantt block to the chart
  // -------------------------------------------------------
  function appendGanttBlock(segment) {
    const chart    = document.getElementById('ganttChart');
    const timeline = document.getElementById('ganttTimeline');
    const duration = segment.end - segment.start;

    // Block width proportional to duration (min 32px)
    const width = Math.max(32, duration * 36);

    // Gantt block
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

    // Timeline tick
    const tick = document.createElement('div');
    tick.className = 'gantt-tick';
    tick.style.width    = `${width}px`;
    tick.style.minWidth = `${width}px`;
    tick.textContent    = segment.start;
    timeline.appendChild(tick);

    // Add final time tick after last block
    if (simStep + 1 >= ganttLog.length) {
      const endTick = document.createElement('div');
      endTick.className   = 'gantt-tick';
      endTick.textContent = segment.end;
      endTick.style.width = '32px';
      timeline.appendChild(endTick);
    }

    // Auto-scroll gantt
    const scroll = document.querySelector('.gantt-scroll');
    if (scroll) scroll.scrollLeft = scroll.scrollWidth;
  }

  // -------------------------------------------------------
  // Finish simulation: show all terminated, results table
  // -------------------------------------------------------
  function finishSim() {
    clearInterval(simTimer);
    isRunning = false;

    // All processes terminated
    renderZone('readyQueue',    [], 'token-ready',      () => '');
    renderZone('runningProcess',[], 'token-running',    () => '');
    renderZone('waitingQueue',  [], 'token-waiting',    () => '');
    renderZone('terminatedList', allProcs, 'token-terminated', p => `WT:${p.wt}`);

    setStatus('done');
    document.getElementById('btnPause').disabled = true;
    document.getElementById('btnStep').disabled  = true;

    // Clock to final time
    const lastSeg = ganttLog[ganttLog.length - 1];
    if (lastSeg) setClockDisplay(lastSeg.end);

    // Show results
    document.getElementById('resultsCard').style.display = 'block';
    if (simCallback) simCallback(allProcs);
  }

  // -------------------------------------------------------
  // Utilities
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // Public API
  // -------------------------------------------------------
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

})(); // end Visualization
