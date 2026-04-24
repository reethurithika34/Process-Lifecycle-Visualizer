/**
 * ui.js
 * ============================================================
 * Handles all UI rendering and DOM manipulation:
 *   - Algorithm list rendering based on scheduling type
 *   - Process list rendering
 *   - Results table rendering
 *   - Error messaging
 * ============================================================
 */

const UI = (() => {

  // -------------------------------------------------------
  // Algorithm definitions
  // -------------------------------------------------------
  const ALGORITHMS = {
    preemptive: [
      { key: 'SRTF',       label: 'SRTF — Shortest Remaining Time First', needsPriority: false },
      { key: 'PriorityP',  label: 'Priority — Preemptive',                needsPriority: true  },
      { key: 'RoundRobin', label: 'Round Robin',                          needsPriority: false }
    ],
    nonpreemptive: [
      { key: 'FCFS',       label: 'FCFS — First Come First Served',        needsPriority: false },
      { key: 'SJF',        label: 'SJF — Shortest Job First',              needsPriority: false },
      { key: 'PriorityNP', label: 'Priority — Non-Preemptive',             needsPriority: true  }
    ]
  };

  let selectedAlgo   = null;
  let selectedType   = 'preemptive';
  let onAlgoChange   = null; // callback

  // -------------------------------------------------------
  // Render algorithm selection buttons
  // -------------------------------------------------------
  function renderAlgoList(type, onSelect) {
    selectedType  = type;
    selectedAlgo  = null;
    onAlgoChange  = onSelect;

    const container = document.getElementById('algoList');
    container.innerHTML = '';

    const algos = ALGORITHMS[type] || [];
    algos.forEach(algo => {
      const btn = document.createElement('button');
      btn.className   = 'algo-btn';
      btn.dataset.key = algo.key;
      btn.textContent = algo.label;
      btn.addEventListener('click', () => selectAlgo(algo.key, algo.needsPriority));
      container.appendChild(btn);
    });
  }

  // -------------------------------------------------------
  // Select an algorithm
  // -------------------------------------------------------
  function selectAlgo(key, needsPriority) {
    selectedAlgo = key;

    // Update active state
    document.querySelectorAll('.algo-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.key === key);
    });

    // Show/hide Priority input
    const priorityGroup = document.getElementById('priorityGroup');
    priorityGroup.style.display = needsPriority ? 'flex' : 'none';

    // Show/hide Time Quantum input
    const quantumCard = document.getElementById('quantumCard');
    quantumCard.style.display = (key === 'RoundRobin') ? 'block' : 'none';

    if (onAlgoChange) onAlgoChange(key, needsPriority);
  }

  // -------------------------------------------------------
  // Render the process pill list
  // -------------------------------------------------------
  function renderProcessList(processes, onRemove) {
    const list  = document.getElementById('processList');
    const count = document.getElementById('processCount');
    count.textContent = processes.length;

    if (!processes.length) {
      list.innerHTML = '<div class="empty-state">No processes added yet.</div>';
      document.getElementById('btnRun').disabled = true;
      return;
    }

    list.innerHTML = '';
    processes.forEach((p, idx) => {
      const pill = document.createElement('div');
      pill.className = 'process-pill';

      const needsPriority = (selectedAlgo === 'PriorityP' || selectedAlgo === 'PriorityNP');
      const priorityText  = needsPriority ? ` | P:${p.priority}` : '';

      pill.innerHTML = `
        <span class="pid-tag">${p.pid}</span>
        <span class="pill-info">AT:${p.at} BT:${p.bt}${priorityText}</span>
        <button class="remove-btn" title="Remove">x</button>
      `;

      pill.querySelector('.remove-btn').addEventListener('click', () => {
        if (onRemove) onRemove(idx);
      });

      list.appendChild(pill);
    });

    document.getElementById('btnRun').disabled = false;
  }

  // -------------------------------------------------------
  // Show validation error
  // -------------------------------------------------------
  function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    setTimeout(() => { if (el) el.textContent = ''; }, 3000);
  }

  // -------------------------------------------------------
  // Highlight an input as invalid
  // -------------------------------------------------------
  function markInputError(id, isError) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('error', isError);
  }

  // -------------------------------------------------------
  // Clear all input errors
  // -------------------------------------------------------
  function clearInputErrors() {
    ['inputAT', 'inputBT', 'inputPriority', 'timeQuantum'].forEach(id => {
      markInputError(id, false);
    });
  }

  // -------------------------------------------------------
  // Render results table
  // -------------------------------------------------------
  function renderResults(processes) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    processes.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.pid}</td>
        <td>${p.at}</td>
        <td>${p.bt}</td>
        <td>${p.ct}</td>
        <td>${p.tat}</td>
        <td>${p.wt}</td>
        <td>${p.rt}</td>
      `;
      tbody.appendChild(tr);
    });

    // Averages
    const n = processes.length;
    const avg = key => (processes.reduce((s, p) => s + p[key], 0) / n).toFixed(2);

    const avgRow = document.getElementById('averagesRow');
    avgRow.innerHTML = `
      <div class="stat-card">
        <span class="avg-label">Avg TAT</span>
        <span class="avg-value">${avg('tat')}</span>
      </div>
      <div class="stat-card">
        <span class="avg-label">Avg WT</span>
        <span class="avg-value">${avg('wt')}</span>
      </div>
      <div class="stat-card">
        <span class="avg-label">Avg RT</span>
        <span class="avg-value">${avg('rt')}</span>
      </div>
      <div class="stat-card">
        <span class="avg-label">Throughput</span>
        <span class="avg-value">${n} proc</span>
      </div>
    `;
  }

  // -------------------------------------------------------
  // Get currently selected algorithm key
  // -------------------------------------------------------
  function getSelectedAlgo() { return selectedAlgo; }
  function getSelectedType() { return selectedType; }

  // -------------------------------------------------------
  // Public API
  // -------------------------------------------------------
  return {
    renderAlgoList,
    selectAlgo,
    renderProcessList,
    showError,
    markInputError,
    clearInputErrors,
    renderResults,
    getSelectedAlgo,
    getSelectedType
  };

})(); // end UI
