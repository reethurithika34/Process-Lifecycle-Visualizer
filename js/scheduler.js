/**
 * scheduler.js
 * ============================================================
 * Core scheduling algorithm implementations.
 * Each function receives an array of process objects and
 * returns enriched objects with CT, TAT, WT, RT, and a
 * ganttLog array for visualization.
 *
 * Process object shape:
 *   { id, pid, at, bt, priority }
 *
 * Output shape (per process):
 *   { ...original, ct, tat, wt, rt }
 *
 * GanttLog entry:
 *   { pid, start, end }   — 'IDLE' for idle periods
 * ============================================================
 */

const Scheduler = (() => {

  // -------------------------------------------------------
  // Helper: Deep clone processes and add remaining time field
  // -------------------------------------------------------
  function cloneProcesses(processes) {
    return processes.map(p => ({
      ...p,
      remaining: p.bt,
      ct: 0, tat: 0, wt: 0, rt: -1,   // rt = -1 means not yet started
      started: false,
      finished: false
    }));
  }

  // -------------------------------------------------------
  // Helper: Compute TAT, WT from CT after algorithm runs
  // -------------------------------------------------------
  function computeDerived(proc) {
    proc.tat = proc.ct - proc.at;
    proc.wt  = proc.tat - proc.bt;
    return proc;
  }

  // -------------------------------------------------------
  // Helper: Merge consecutive same-PID gantt entries
  // -------------------------------------------------------
  function mergeGantt(gantt) {
    if (!gantt.length) return [];
    const merged = [{ ...gantt[0] }];
    for (let i = 1; i < gantt.length; i++) {
      const last = merged[merged.length - 1];
      if (gantt[i].pid === last.pid) {
        last.end = gantt[i].end;
      } else {
        merged.push({ ...gantt[i] });
      }
    }
    return merged;
  }

  // -------------------------------------------------------
  // 1. FCFS — First Come First Served (Non-Preemptive)
  // -------------------------------------------------------
  function FCFS(processes) {
    const procs = cloneProcesses(processes);
    // Sort by arrival time, then by id for tie-breaking
    procs.sort((a, b) => a.at - b.at || a.id - b.id);

    const gantt = [];
    let time = 0;

    for (const p of procs) {
      // CPU idle gap
      if (time < p.at) {
        gantt.push({ pid: 'IDLE', start: time, end: p.at });
        time = p.at;
      }
      // Response time = first time on CPU
      p.rt = time - p.at;
      gantt.push({ pid: p.pid, start: time, end: time + p.bt });
      time += p.bt;
      p.ct = time;
      computeDerived(p);
    }

    return { processes: procs, gantt: mergeGantt(gantt) };
  }

  // -------------------------------------------------------
  // 2. SJF — Shortest Job First (Non-Preemptive)
  // -------------------------------------------------------
  function SJF(processes) {
    const procs = cloneProcesses(processes);
    const gantt = [];
    let time = 0;
    let done = 0;
    const n = procs.length;

    while (done < n) {
      // Eligible: arrived and not finished
      const available = procs.filter(p => !p.finished && p.at <= time);

      if (!available.length) {
        // CPU idle — advance to next arrival
        const next = procs.filter(p => !p.finished)
                           .sort((a, b) => a.at - b.at)[0];
        gantt.push({ pid: 'IDLE', start: time, end: next.at });
        time = next.at;
        continue;
      }

      // Pick shortest burst; tie-break by arrival, then id
      available.sort((a, b) => a.bt - b.bt || a.at - b.at || a.id - b.id);
      const p = available[0];

      p.rt = time - p.at;
      gantt.push({ pid: p.pid, start: time, end: time + p.bt });
      time += p.bt;
      p.ct = time;
      p.finished = true;
      computeDerived(p);
      done++;
    }

    return { processes: procs, gantt: mergeGantt(gantt) };
  }

  // -------------------------------------------------------
  // 3. SRTF — Shortest Remaining Time First (Preemptive SJF)
  // -------------------------------------------------------
  function SRTF(processes) {
    const procs = cloneProcesses(processes);
    const gantt = [];
    const n = procs.length;
    let time = 0;
    let done = 0;
    let prev = null;

    // Collect all unique event times
    const maxTime = procs.reduce((s, p) => s + p.bt, 0) +
                    Math.max(...procs.map(p => p.at));

    while (done < n && time <= maxTime) {
      const available = procs.filter(p => !p.finished && p.at <= time);

      if (!available.length) {
        const next = procs.filter(p => !p.finished)
                          .sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        if (gantt.length && gantt[gantt.length - 1].pid === 'IDLE') {
          gantt[gantt.length - 1].end = next.at;
        } else {
          gantt.push({ pid: 'IDLE', start: time, end: next.at });
        }
        time = next.at;
        continue;
      }

      // Pick shortest remaining; tie-break by arrival, id
      available.sort((a, b) => a.remaining - b.remaining || a.at - b.at || a.id - b.id);
      const p = available[0];

      // Record RT on first execution
      if (!p.started) {
        p.rt = time - p.at;
        p.started = true;
      }

      // Determine next preemption point
      const arrivals = procs
        .filter(q => q.at > time && !q.finished)
        .map(q => q.at);
      const nextArrival = arrivals.length ? Math.min(...arrivals) : Infinity;
      const nextArrivalTime = Math.min(
        ...procs.filter(q => q.at > time && !q.finished).map(q => q.at),
        Infinity
      );

// simulate step by step instead of jumping blindly
// Run only 1 unit at a time (CRITICAL for SRTF)
const runFor = 1;
const runUntil = time + 1;

// Add gantt segment
const last = gantt[gantt.length - 1];
if (last && last.pid === p.pid) {
  last.end = runUntil;
} else {
  gantt.push({ pid: p.pid, start: time, end: runUntil });
}

p.remaining -= runFor;
time = runUntil;

      if (p.remaining === 0) {
        p.ct = time;
        p.finished = true;
        computeDerived(p);
        done++;
      }
    }

    return { processes: procs, gantt: mergeGantt(gantt) };
  }

  // -------------------------------------------------------
  // 4. Priority — Non-Preemptive
  //    Lower priority number = higher priority
  // -------------------------------------------------------
  function PriorityNP(processes) {
    const procs = cloneProcesses(processes);
    const gantt = [];
    let time = 0;
    let done = 0;
    const n = procs.length;

    while (done < n) {
      const available = procs.filter(p => !p.finished && p.at <= time);

      if (!available.length) {
        const next = procs.filter(p => !p.finished)
                          .sort((a, b) => a.at - b.at)[0];
        gantt.push({ pid: 'IDLE', start: time, end: next.at });
        time = next.at;
        continue;
      }

      // Lowest number = highest priority; tie-break by arrival, id
      available.sort((a, b) => a.priority - b.priority || a.at - b.at || a.id - b.id);
      const p = available[0];

      p.rt = time - p.at;
      gantt.push({ pid: p.pid, start: time, end: time + p.bt });
      time += p.bt;
      p.ct = time;
      p.finished = true;
      computeDerived(p);
      done++;
    }

    return { processes: procs, gantt: mergeGantt(gantt) };
  }

  // -------------------------------------------------------
  // 5. Priority — Preemptive
  //    Preempt if a higher-priority process arrives
  // -------------------------------------------------------
  function PriorityP(processes) {
    const procs = cloneProcesses(processes);
    const gantt = [];
    const n = procs.length;
    let time = 0;
    let done = 0;
    const maxTime = procs.reduce((s, p) => s + p.bt, 0) +
                    Math.max(...procs.map(p => p.at));

    while (done < n && time <= maxTime) {
      const available = procs.filter(p => !p.finished && p.at <= time);

      if (!available.length) {
        const next = procs.filter(p => !p.finished)
                          .sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        gantt.push({ pid: 'IDLE', start: time, end: next.at });
        time = next.at;
        continue;
      }

      available.sort((a, b) => a.priority - b.priority || a.at - b.at || a.id - b.id);
      const p = available[0];

      if (!p.started) {
        p.rt = time - p.at;
        p.started = true;
      }

      // Run 1 unit at a time for preemptive check
      const last = gantt[gantt.length - 1];
      if (last && last.pid === p.pid) {
        last.end = time + 1;
      } else {
        gantt.push({ pid: p.pid, start: time, end: time + 1 });
      }

      p.remaining -= 1;
      time += 1;

      if (p.remaining === 0) {
        p.ct = time;
        p.finished = true;
        computeDerived(p);
        done++;
      }
    }

    return { processes: procs, gantt: mergeGantt(gantt) };
  }

  // -------------------------------------------------------
  // 6. Round Robin
  // -------------------------------------------------------
  function RoundRobin(processes, quantum) {
    const procs = cloneProcesses(processes);
    const gantt = [];
    const n = procs.length;
    let time = 0;
    let done = 0;

    // Queue holds indices into procs array
    const queue = [];
    const inQueue = new Array(n).fill(false);

    // Enqueue processes that arrive at time 0
    procs.forEach((p, i) => {
      if (p.at === 0) {
        queue.push(i);
        inQueue[i] = true;
      }
    });

    // Sort initial queue by arrival
    queue.sort((a, b) => procs[a].at - procs[b].at);

    while (done < n) {
      // If queue is empty, advance time to next arrival
      if (!queue.length) {
        const notDone = procs
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => !p.finished)
          .sort((a, b) => a.p.at - b.p.at);

        if (!notDone.length) break;
        const { p: next, i: ni } = notDone[0];
        gantt.push({ pid: 'IDLE', start: time, end: next.at });
        time = next.at;
        queue.push(ni);
        inQueue[ni] = true;
        continue;
      }

      const idx = queue.shift();
      const p = procs[idx];

      // Record response time on first run
      if (!p.started) {
        p.rt = time - p.at;
        p.started = true;
      }

      const runFor = Math.min(quantum, p.remaining);
      const runEnd = time + runFor;

      // Gantt entry
      const last = gantt[gantt.length - 1];
      if (last && last.pid === p.pid) {
        last.end = runEnd;
      } else {
        gantt.push({ pid: p.pid, start: time, end: runEnd });
      }

      p.remaining -= runFor;
      time = runEnd;

      // Enqueue newly arrived processes during this slice
    // Enqueue newly arrived processes in correct order
// Enqueue newly arrived processes in correct FIFO order
      const arrived = [];

      for (let i = 0; i < n; i++) {
        if (!procs[i].finished && procs[i].at > (time - runFor) && procs[i].at <= time) {
          arrived.push(i);
        }
      }

      // maintain arrival order
      arrived.sort((a, b) => procs[a].at - procs[b].at);

      arrived.forEach(i => queue.push(i));

      if (p.remaining === 0) {
        p.ct = time;
        p.finished = true;
        computeDerived(p);
        done++;
      } else {
        // Re-enqueue at end
        queue.push(idx);
      }
    }

    return { processes: procs, gantt: mergeGantt(gantt) };
  }

  // -------------------------------------------------------
  // Public dispatch function
  // -------------------------------------------------------
  function run(algorithm, processes, options = {}) {
    if (!processes || !processes.length) return null;

    switch (algorithm) {
      case 'FCFS':           return FCFS(processes);
      case 'SJF':            return SJF(processes);
      case 'SRTF':           return SRTF(processes);
      case 'PriorityNP':     return PriorityNP(processes);
      case 'PriorityP':      return PriorityP(processes);
      case 'RoundRobin':     return RoundRobin(processes, options.quantum || 2);
      default:
        console.error('Unknown algorithm:', algorithm);
        return null;
    }
  }

  return { run };

})(); // end Scheduler
