

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

  function computeDerived(p) {
    p.tat = p.ct - p.at;
    p.wt = p.tat - p.bt;
    return p;
  }

  function mergeGantt(gantt) {
    if (!gantt.length) return [];
    const merged = [{ ...gantt[0] }];

    for (let i = 1; i < gantt.length; i++) {
      const last = merged[merged.length - 1];
      if (last.pid === gantt[i].pid) {
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

    let time = 0;
    const gantt = [];

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
    let time = 0, done = 0;
    const gantt = [];

    while (done < procs.length) {
      const available = procs.filter(p => !p.finished && p.at <= time);

      if (!available.length) {
        const next = procs.filter(p => !p.finished).sort((a,b)=>a.at-b.at)[0];
        gantt.push({ pid:'IDLE', start:time, end:next.at });
        time = next.at;
        continue;
      }

      available.sort((a,b)=>a.bt-b.bt || a.at-b.at);
      const p = available[0];

      p.rt = time - p.at;
      gantt.push({ pid:p.pid, start:time, end:time+p.bt });

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
    let time = 0, done = 0;
    const gantt = [];

    while (done < procs.length) {
      const available = procs.filter(p => !p.finished && p.at <= time);

      if (!available.length) {
        time++;
        continue;
      }

      available.sort((a,b)=>a.remaining-b.remaining);
      const p = available[0];

      if (!p.started) {
        p.rt = time - p.at;
        p.started = true;
      }

      const last = gantt[gantt.length-1];
      if (last && last.pid === p.pid) last.end++;
      else gantt.push({ pid:p.pid, start:time, end:time+1 });

      p.remaining--;
      time++;

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
    let time = 0, done = 0;
    const gantt = [];

    while (done < procs.length) {
      const available = procs.filter(p => !p.finished && p.at <= time);

      if (!available.length) {
        time++;
        continue;
      }

      available.sort((a,b)=>a.priority-b.priority);
      const p = available[0];

      p.rt = time - p.at;
      gantt.push({ pid:p.pid, start:time, end:time+p.bt });

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
    let time = 0, done = 0;
    const gantt = [];

    while (done < procs.length) {
      const available = procs.filter(p => !p.finished && p.at <= time);

      if (!available.length) {
        time++;
        continue;
      }

      available.sort((a,b)=>a.priority-b.priority);
      const p = available[0];

      if (!p.started) {
        p.rt = time - p.at;
        p.started = true;
      }

      const last = gantt[gantt.length-1];
      if (last && last.pid === p.pid) last.end++;
      else gantt.push({ pid:p.pid, start:time, end:time+1 });

      p.remaining--;
      time++;

      if (p.remaining === 0) {
        p.ct = time;
        p.finished = true;
        computeDerived(p);
        done++;
      }
    }

    return { processes: procs, gantt: mergeGantt(gantt) };
  }

  function RoundRobin(processes, quantum=2) {
    const procs = cloneProcesses(processes);
    const queue = [];
    const gantt = [];
    let time = 0, done = 0;

    procs.forEach((p,i)=> {
      if (p.at === 0) queue.push(i);
    });

    while (done < procs.length) {

      if (!queue.length) {
        time++;
        continue;
      }

      const i = queue.shift();
      const p = procs[i];

      if (!p.started) {
        p.rt = time - p.at;
        p.started = true;
      }

      const run = Math.min(quantum, p.remaining);

      gantt.push({ pid:p.pid, start:time, end:time+run });

      time += run;
      p.remaining -= run;

      procs.forEach((q,idx)=>{
        if (q.at > time-run && q.at <= time && !q.finished && !queue.includes(idx))
          queue.push(idx);
      });

      if (p.remaining > 0) queue.push(i);
      else {
        p.ct = time;
        p.finished = true;
        computeDerived(p);
        done++;
      }
    }

    return { processes: procs, gantt: mergeGantt(gantt) };
  }

  function run(algo, processes, opt={}) {
    switch(algo) {
      case 'FCFS': return FCFS(processes);
      case 'SJF': return SJF(processes);
      case 'SRTF': return SRTF(processes);
      case 'PriorityNP': return PriorityNP(processes);
      case 'PriorityP': return PriorityP(processes);
      case 'RoundRobin': return RoundRobin(processes, opt.quantum);
    }
  }

  return { run };

})();


const processes = [
  { id:1, pid:'P1', at:0, bt:5, priority:2 },
  { id:2, pid:'P2', at:1, bt:3, priority:1 },
  { id:3, pid:'P3', at:2, bt:8, priority:4 },
  { id:4, pid:'P4', at:3, bt:6, priority:3 }
];

function print(title, res) {
  console.log("\n=====", title, "=====");

  console.table(res.processes.map(p=>({
    PID:p.pid, AT:p.at, BT:p.bt,
    CT:p.ct, TAT:p.tat, WT:p.wt, RT:p.rt
  })));

  console.log("Gantt:");
  res.gantt.forEach(g=>console.log(`${g.pid} [${g.start}-${g.end}]`));
}

print("FCFS", Scheduler.run('FCFS', processes));
print("SJF", Scheduler.run('SJF', processes));
print("SRTF", Scheduler.run('SRTF', processes));
print("Priority NP", Scheduler.run('PriorityNP', processes));
print("Priority P", Scheduler.run('PriorityP', processes));
print("Round Robin", Scheduler.run('RoundRobin', processes, {quantum:2}));