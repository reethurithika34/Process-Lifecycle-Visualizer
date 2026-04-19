/**
 * main.js
 * ============================================================
 * Application entry point.
 * Wires together: UI, Scheduler, Visualization.
 * Manages application state: process list, scheduling type,
 * algorithm selection, simulation lifecycle.
 * ============================================================
 */

(function () {

  // ============================================================
  // Application State
  // ============================================================
  let processes      = [];    // Array of process input objects
  let processCounter = 1;     // Auto-incrementing PID counter
  let schedulingType = 'preemptive';   // 'preemptive' | 'nonpreemptive'
  let selectedAlgo   = null;           // Currently selected algorithm key
  let needsPriority  = false;          // Whether selected algo needs priority

  // ============================================================
  // DOM References
  // ============================================================
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

  // ============================================================
  // Initialization
  // ============================================================
  
  function init() {

  const params = new URLSearchParams(window.location.search);
  const urlType = params.get('type');
  const urlAlgo = params.get('algo');

  console.log("TYPE:", urlType);
  console.log("ALGO:", urlAlgo);

  if (urlType) {
  const fixedType = urlType.replace('-', ''); // 🔥 FIX
  setSchedulingType(fixedType);
} else {
  setSchedulingType('preemptive');
}

  // 👇 KEEP YOUR ALGO MAPPING CODE HERE
  const algos = {
    preemptive: [
      { key: 'SRTF', needsPriority: false },
      { key: 'PriorityP', needsPriority: true },
      { key: 'RoundRobin', needsPriority: false }
    ],
    nonpreemptive: [
      { key: 'FCFS', needsPriority: false },
      { key: 'SJF', needsPriority: false },
      { key: 'PriorityNP', needsPriority: true }
    ]
  };

  if (urlAlgo) {
    const algoMap = {
      rr: 'RoundRobin',
      fcfs: 'FCFS',
      sjf: 'SJF',
      priorityp: 'PriorityP',
      prioritynp: 'PriorityNP'
    };

    const finalAlgo = algoMap[urlAlgo.toLowerCase()] || urlAlgo;

    const selected = algos[schedulingType].find(a => a.key === finalAlgo);

    if (selected) {
      UI.selectAlgo(selected.key, selected.needsPriority);
      selectedAlgo = selected.key;
      needsPriority = selected.needsPriority;
    }
  }

  bindEvents();
}

  // ============================================================
  // Event Binding
  // ============================================================
  function bindEvents() {

    // --- Scheduling type toggle ---
    btnPreemptive.addEventListener('click', () => {
      setSchedulingType('preemptive');
    });
    btnNonPreemptive.addEventListener('click', () => {
      setSchedulingType('nonpreemptive');
    });

    // --- Add Process ---
    btnAddProcess.addEventListener('click', addProcess);

    // Support Enter key in inputs
    [inputAT, inputBT, inputPriority, timeQuantum].forEach(el => {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') addProcess();
      });
    });

    // --- Run simulation ---
    btnRun.addEventListener('click', runSimulation);

    // --- Clear all ---
    btnClear.addEventListener('click', clearAll);

    // --- Simulation controls ---
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

    // --- Speed slider ---
    speedSlider.addEventListener('input', () => {
      const val = parseInt(speedSlider.value);
      // Invert: high slider value = slow, low = fast
      const actualMs = 2100 - val; // range 100–2000
      speedValue.textContent = `${actualMs}ms`;
      Visualization.setSpeed(actualMs);
    });
  }

  // ============================================================
  // Scheduling Type Change
  // ============================================================
  function setSchedulingType(type) {
    schedulingType = type;

    // Toggle active buttons
    btnPreemptive.classList.toggle('active',    type === 'preemptive');
    btnNonPreemptive.classList.toggle('active', type === 'nonpreemptive');

    // Re-render algo list; auto-select first
    UI.renderAlgoList(type, onAlgoSelected);
    
  }

  // ============================================================
  // Algorithm Selected Callback
  // ============================================================
  function onAlgoSelected(key, prioNeeded) {
    selectedAlgo  = key;
    needsPriority = prioNeeded;
    // Re-render process list to show/hide priority column
    UI.renderProcessList(processes, removeProcess);
  }

  // ============================================================
  // Add Process
  // ============================================================
  function addProcess() {
    UI.clearInputErrors();

    const atVal  = inputAT.value.trim();
    const btVal  = inputBT.value.trim();
    const priVal = inputPriority.value.trim();

    let valid = true;

    // Validate Arrival Time
    if (atVal === '' || isNaN(atVal) || parseInt(atVal) < 0) {
      UI.markInputError('inputAT', true);
      UI.showError('Arrival Time must be a non-negative integer.');
      valid = false;
    }

    // Validate Burst Time
    if (valid && (btVal === '' || isNaN(btVal) || parseInt(btVal) < 1)) {
      UI.markInputError('inputBT', true);
      UI.showError('Burst Time must be a positive integer (>= 1).');
      valid = false;
    }

    // Validate Priority if needed
    if (valid && needsPriority) {
      if (priVal === '' || isNaN(priVal) || parseInt(priVal) < 1) {
        UI.markInputError('inputPriority', true);
        UI.showError('Priority must be a positive integer (1 = highest).');
        valid = false;
      }
    }

    // Validate Time Quantum if RR
    if (valid && selectedAlgo === 'RoundRobin') {
      const qVal = timeQuantum.value.trim();
      if (qVal === '' || isNaN(qVal) || parseInt(qVal) < 1) {
        UI.markInputError('timeQuantum', true);
        UI.showError('Time Quantum must be >= 1.');
        valid = false;
      }
    }

    if (!valid) return;

    // Max 10 processes
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

    // Reset inputs
    inputAT.value       = '';
    inputBT.value       = '';
    inputPriority.value = '';
    inputAT.focus();

    UI.renderProcessList(processes, removeProcess);
  }

  // ============================================================
  // Remove Process
  // ============================================================
  function removeProcess(idx) {
    processes.splice(idx, 1);
    UI.renderProcessList(processes, removeProcess);
  }

  // ============================================================
  // Clear All
  // ============================================================
  function clearAll() {
    processes      = [];
    processCounter = 1;
    UI.renderProcessList(processes, removeProcess);
    Visualization.reset();
    document.getElementById('btnPause').disabled = true;
    document.getElementById('btnStep').disabled  = true;
    document.getElementById('btnReset').disabled = true;
  }

  // ============================================================
  // Run Simulation
  // ============================================================
  function runSimulation() {
    if (!processes.length) {
      UI.showError('Please add at least one process.');
      return;
    }
    if (!selectedAlgo) {
      UI.showError('Please select a scheduling algorithm.');
      return;
    }

    // Get quantum
    const quantum = parseInt(timeQuantum.value) || 2;

    // Run scheduler
    const result = Scheduler.run(selectedAlgo, processes, { quantum });

    if (!result) {
      UI.showError('Scheduling failed. Check your inputs.');
      return;
    }

    // Disable run button during simulation
    btnRun.disabled = true;

    // Start visualization
    Visualization.start(result.processes, result.gantt, (finalProcs) => {
      // Render results table when done
      UI.renderResults(finalProcs);
      btnRun.disabled = (processes.length === 0);
    });
  }

  // ============================================================
  // Boot
  // ============================================================
  document.addEventListener('DOMContentLoaded', init);

})();

