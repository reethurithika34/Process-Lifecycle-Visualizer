
(function () {
  let processes      = [];    
  let processCounter = 1;     
  let schedulingType = 'preemptive';   
  let selectedAlgo   = null;           
  let needsPriority  = false;          
  const btnPreemptive    = document.getElementById('btnPreemptive');
  const btnNonPreemptive = document.getElementById('btnNonPreemptive');
  const btnAddProcess    = document.getElementById('btnAddProcess');
  const btnRun           = document.getElementById('btnRun');
  const btnClear         = document.getElementById('btnClear');
  const btnPause         = document.getElementById('btnPause');
  const btnStep          = document.getElementById('btnStep');
  const btnReset         = document.getElementById('btnReset');
  const speedSlider      = document.getElementById('speedSlider');
  const speedValue       = document.getElementById('speedValue');
  const inputAT       = document.getElementById('inputAT');
  const inputBT       = document.getElementById('inputBT');
  const inputPriority = document.getElementById('inputPriority');
  const timeQuantum   = document.getElementById('timeQuantum');
  function init() {
    const params = new URLSearchParams(window.location.search);
    let urlType = params.get('type');
    if (urlType === 'non-preemptive') urlType = 'nonpreemptive';
    if (urlType === 'preemptive' || urlType === 'nonpreemptive') {
      schedulingType = urlType;
    }
    UI.renderAlgoList(schedulingType, onAlgoSelected);
    btnPreemptive.classList.toggle('active', schedulingType === 'preemptive');
    btnNonPreemptive.classList.toggle('active', schedulingType === 'nonpreemptive');
    let urlAlgo = params.get('algo');
    if (!urlAlgo) {
      urlAlgo = schedulingType === 'preemptive' ? 'SRTF' : 'FCFS';
    }
    const requiresPriority = ['PriorityP', 'PriorityNP'].includes(urlAlgo);
    UI.selectAlgo(urlAlgo, requiresPriority);
    selectedAlgo  = urlAlgo;
    needsPriority = requiresPriority;
    bindEvents();
  }
  function bindEvents() {
    btnPreemptive.addEventListener('click', () => {
      setSchedulingType('preemptive');
    });
    btnNonPreemptive.addEventListener('click', () => {
      setSchedulingType('nonpreemptive');
    });
    btnAddProcess.addEventListener('click', addProcess);
    [inputAT, inputBT, inputPriority, timeQuantum].forEach(el => {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') addProcess();
      });
    });
    btnRun.addEventListener('click', runSimulation);
    btnClear.addEventListener('click', clearAll);
    btnPause.addEventListener('click', () => Visualization.togglePause());
    btnStep.addEventListener('click',  () => {
      if (!Visualization.isRunning) return;
      Visualization.step();
    });
    btnReset.addEventListener('click', () => {
      Visualization.reset();
      document.getElementById('btnPause').disabled = true;
      document.getElementById('btnStep').disabled  = true;
      document.getElementById('btnReset').disabled = true;
      document.getElementById('btnRun').disabled = (processes.length === 0);
    });
    speedSlider.addEventListener('input', () => {
      const val = parseInt(speedSlider.value);
      const actualMs = 2100 - val; 
      speedValue.textContent = `${actualMs}ms`;
      Visualization.setSpeed(actualMs);
    });
  }
  function setSchedulingType(type) {
    schedulingType = type;
    btnPreemptive.classList.toggle('active',    type === 'preemptive');
    btnNonPreemptive.classList.toggle('active', type === 'nonpreemptive');
    UI.renderAlgoList(type, onAlgoSelected);
    const algos = {
      preemptive:    { key: 'SRTF',  needsPriority: false },
      nonpreemptive: { key: 'FCFS',  needsPriority: false }
    };
    const def = algos[type];
    UI.selectAlgo(def.key, def.needsPriority);
    selectedAlgo  = def.key;
    needsPriority = def.needsPriority;
  }
  function onAlgoSelected(key, prioNeeded) {
    selectedAlgo  = key;
    needsPriority = prioNeeded;
    UI.renderProcessList(processes, removeProcess);
  }
  function addProcess() {
    UI.clearInputErrors();
    const atVal  = inputAT.value.trim();
    const btVal  = inputBT.value.trim();
    const priVal = inputPriority.value.trim();
    let valid = true;
    if (atVal === '' || isNaN(atVal) || parseInt(atVal) < 0) {
      UI.markInputError('inputAT', true);
      UI.showError('Arrival Time must be a non-negative integer.');
      valid = false;
    }
    if (valid && (btVal === '' || isNaN(btVal) || parseInt(btVal) < 1)) {
      UI.markInputError('inputBT', true);
      UI.showError('Burst Time must be a positive integer (>= 1).');
      valid = false;
    }
    if (valid && needsPriority) {
      if (priVal === '' || isNaN(priVal) || parseInt(priVal) < 1) {
        UI.markInputError('inputPriority', true);
        UI.showError('Priority must be a positive integer (1 = highest).');
        valid = false;
      }
    }
    if (valid && selectedAlgo === 'RoundRobin') {
      const qVal = timeQuantum.value.trim();
      if (qVal === '' || isNaN(qVal) || parseInt(qVal) < 1) {
        UI.markInputError('timeQuantum', true);
        UI.showError('Time Quantum must be >= 1.');
        valid = false;
      }
    }
    if (!valid) return;
    if (processes.length >= 10) {
      UI.showError('Maximum 10 processes allowed.');
      return;
    }
    const newProc = {
      id:       processCounter,
      pid:      `P${processCounter}`,
      at:       parseInt(atVal),
      bt:       parseInt(btVal),
      priority: needsPriority ? parseInt(priVal) : 1
    };
    processes.push(newProc);
    processCounter++;
    inputAT.value       = '';
    inputBT.value       = '';
    inputPriority.value = '';
    inputAT.focus();
    UI.renderProcessList(processes, removeProcess);
  }
  function removeProcess(idx) {
    processes.splice(idx, 1);
    UI.renderProcessList(processes, removeProcess);
  }
  function clearAll() {
    processes      = [];
    processCounter = 1;
    UI.renderProcessList(processes, removeProcess);
    Visualization.reset();
    document.getElementById('btnPause').disabled = true;
    document.getElementById('btnStep').disabled  = true;
    document.getElementById('btnReset').disabled = true;
  }
  function runSimulation() {
    if (!processes.length) {
      UI.showError('Please add at least one process.');
      return;
    }
    if (!selectedAlgo) {
      UI.showError('Please select a scheduling algorithm.');
      return;
    }
    const quantum = parseInt(timeQuantum.value) || 2;
    const result = Scheduler.run(selectedAlgo, processes, { quantum });
    if (!result) {
      UI.showError('Scheduling failed. Check your inputs.');
      return;
    }
    btnRun.disabled = true;
    Visualization.start(result.processes, result.gantt, (finalProcs) => {
      UI.renderResults(finalProcs);
      btnRun.disabled = (processes.length === 0);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
