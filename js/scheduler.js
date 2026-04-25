
const Scheduler = (() => {
  function cloneProcesses(processes) {
    return processes.map(p => ({
      ...p,
      remaining: p.bt,
      ct: 0, tat: 0, wt: 0, rt: -1,   
      started: false,
      finished: false
    }));
  }
  function computeDerived(proc) {
    proc.tat = proc.ct - proc.at;
    proc.wt  = proc.tat - proc.bt;
    return proc;
  }
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
  function FCFS(processes) {
    const procs = cloneProcesses(processes);
    procs.sort((a, b) => a.at - b.at || a.id - b.id);
    const gantt = [];
    let time = 0;
    for (const p of procs) {
      if (time < p.at) {
        gantt.push({ pid: 'IDLE', start: time, end: p.at });
        time = p.at;
      }
      p.rt = time - p.at;
      gantt.push({ pid: p.pid, start: time, end: time + p.bt });
      time += p.bt;
      p.ct = time;
      computeDerived(p);
    }
    return { processes: procs, gantt: mergeGantt(gantt) };
  }
  function SJF(processes) {
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
  function SRTF(processes) {
    const procs = cloneProcesses(processes);
    const gantt = [];
    const n = procs.length;
    let time = 0;
    let done = 0;
    let prev = null;
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
      available.sort((a, b) => a.remaining - b.remaining || a.at - b.at || a.id - b.id);
      const p = available[0];
      if (!p.started) {
        p.rt = time - p.at;
        p.started = true;
      }
      const arrivals = procs
        .filter(q => q.at > time && !q.finished)
        .map(q => q.at);
      const nextArrival = arrivals.length ? Math.min(...arrivals) : Infinity;
      const nextArrivalTime = Math.min(
        ...procs.filter(q => q.at > time && !q.finished).map(q => q.at),
        Infinity
      );
const runFor = 1;
const runUntil = time + 1;
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
  function RoundRobin(processes, quantum) {
    const procs = cloneProcesses(processes);
    const gantt = [];
    const n = procs.length;
    let time = 0;
    let done = 0;
    const queue = [];
    const inQueue = new Array(n).fill(false);
    procs.forEach((p, i) => {
      if (p.at === 0) {
        queue.push(i);
        inQueue[i] = true;
      }
    });
    queue.sort((a, b) => procs[a].at - procs[b].at);
    while (done < n) {
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
      if (!p.started) {
        p.rt = time - p.at;
        p.started = true;
      }
      const runFor = Math.min(quantum, p.remaining);
      const runEnd = time + runFor;
      const last = gantt[gantt.length - 1];
      if (last && last.pid === p.pid) {
        last.end = runEnd;
      } else {
        gantt.push({ pid: p.pid, start: time, end: runEnd });
      }
      p.remaining -= runFor;
      time = runEnd;
      const arrived = [];
      for (let i = 0; i < n; i++) {
        if (!procs[i].finished && procs[i].at > (time - runFor) && procs[i].at <= time) {
          arrived.push(i);
        }
      }
      arrived.sort((a, b) => procs[a].at - procs[b].at);
      arrived.forEach(i => queue.push(i));
      if (p.remaining === 0) {
        p.ct = time;
        p.finished = true;
        computeDerived(p);
        done++;
      } else {
        queue.push(idx);
      }
    }
    return { processes: procs, gantt: mergeGantt(gantt) };
  }
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
})(); 
