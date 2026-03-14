const { execFile } = require('child_process');
const path = require('path');

/**
 * Parse netstat output to extract listening TCP ports.
 * Uses `netstat -ano` which is fast (~38ms).
 */
function scanPorts() {
  return new Promise((resolve, reject) => {
    execFile('netstat', ['-ano'], (err, stdout) => {
      if (err) return reject(err);

      const lines = stdout.split('\n');
      const entries = [];
      const seen = new Set();

      for (const line of lines) {
        if (!line.includes('LISTENING')) continue;

        // Example lines:
        //   TCP    0.0.0.0:5174           0.0.0.0:0              LISTENING       13032
        //   TCP    [::1]:5175             [::]:0                  LISTENING       4484
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) continue;

        // Only TCP rows
        if (parts[0] !== 'TCP') continue;

        const localAddress = parts[1];
        const pid = parseInt(parts[4], 10);
        if (isNaN(pid)) continue;

        const lastColon = localAddress.lastIndexOf(':');
        const address = localAddress.substring(0, lastColon);
        const port = parseInt(localAddress.substring(lastColon + 1), 10);
        if (isNaN(port)) continue;

        const key = `${port}:${address}:${pid}`;
        if (seen.has(key)) continue;
        seen.add(key);

        entries.push({ port, address, pid });
      }

      resolve(entries);
    });
  });
}

/**
 * Get process details using PowerShell (fetches all, filters in JS).
 * Returns a map of PID -> { name, commandLine }.
 */
function getProcessDetails(pids) {
  return new Promise((resolve) => {
    if (pids.length === 0) return resolve({});

    const pidSet = new Set(pids);

    // Fetch ALL processes as JSON — no filter string, so no command-line length issues
    const psCommand = 'Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json -Compress';

    execFile('powershell.exe', ['-NoProfile', '-Command', psCommand], { maxBuffer: 1024 * 1024 * 10 }, (err, stdout) => {
      const map = {};

      if (err) return resolve(map);

      try {
        let data = JSON.parse(stdout.trim());
        if (!Array.isArray(data)) data = [data];

        for (const proc of data) {
          if (proc && proc.ProcessId != null && pidSet.has(proc.ProcessId)) {
            map[proc.ProcessId] = {
              name: proc.Name || 'Unknown',
              commandLine: proc.CommandLine || '',
            };
          }
        }
      } catch {
        // JSON parse failed, return empty map
      }

      resolve(map);
    });
  });
}

/**
 * Full scan: get listening ports + enrich with process details.
 */
async function fullScan() {
  const entries = await scanPorts();
  const uniquePids = [...new Set(entries.map(e => e.pid))];
  const processMap = await getProcessDetails(uniquePids);

  return entries.map(entry => ({
    port: entry.port,
    address: entry.address,
    pid: entry.pid,
    processName: processMap[entry.pid]?.name || 'Unknown',
    commandLine: processMap[entry.pid]?.commandLine || '',
  }));
}

/**
 * Kill a process by PID using taskkill.
 */
function killProcess(pid) {
  return new Promise((resolve, reject) => {
    // Protect system PIDs
    if (pid === 0 || pid === 4) {
      return reject(new Error('Cannot kill system process'));
    }

    execFile('taskkill', ['/F', '/T', '/PID', String(pid)], (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

module.exports = { fullScan, killProcess };
