const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');

const app       = express();
const PORT      = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'pm_data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── SSE clients list ────────────────────────────────────────────────────────
const sseClients = [];

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => { try { res.write(msg); } catch(e){} });
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function readData()       { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(data)  { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

// ══════════════════════════════════════════════════════════════════════════════
// SSE ENDPOINT  –  clients subscribe here for live updates
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();
  res.write('event: connected\ndata: {}\n\n');

  sseClients.push(res);
  req.on('close', () => {
    const i = sseClients.indexOf(res);
    if (i !== -1) sseClients.splice(i, 1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD API
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/dashboard', (req, res) => {
  const data = readData();
  const { from, to } = req.query;
  let jobs = data.jobs;
  if (from && to) jobs = jobs.filter(j => j.planned >= from && j.planned <= to);

  const completed      = jobs.filter(j => j.status === 'completed');
  const overdue        = jobs.filter(j => j.status === 'overdue');
  const complianceRate = jobs.length > 0
    ? parseFloat(((completed.length / jobs.length) * 100).toFixed(1)) : 0;
  const avgTime = completed.length > 0
    ? parseFloat((completed.reduce((s,j) => s+(j.duration||0),0)/completed.length).toFixed(2)) : 0;
  const totalCost = jobs.reduce((s,j) => s+(j.cost||0), 0);

  res.json({
    kpis: { totalPMJobs:jobs.length, complianceRate, overdueCount:overdue.length, avgCompletionTime:avgTime, totalCost },
    funnel: { planned:jobs.length, completed:completed.length, overdue:overdue.length },
    weeklyData:       data.weeklyData,
    complianceTrend:  data.complianceTrend,
    overdueBreakdown: data.overdueBreakdown,
    jobs
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// JOBS CRUD
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/jobs', (req, res) => res.json(readData().jobs));

app.post('/api/jobs', (req, res) => {
  const data = readData();
  const job  = { id: Date.now(), ...req.body, status: req.body.completed ? 'completed' : 'overdue' };
  data.jobs.push(job);
  writeData(data);
  res.json({ success:true, job });
});

app.put('/api/jobs/:id', (req, res) => {
  const data = readData();
  const idx  = data.jobs.findIndex(j => j.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Not found' });
  data.jobs[idx] = { ...data.jobs[idx], ...req.body, status: req.body.completed ? 'completed' : 'overdue' };
  writeData(data);
  res.json({ success:true, job: data.jobs[idx] });
});

app.delete('/api/jobs/:id', (req, res) => {
  const data = readData();
  const idx  = data.jobs.findIndex(j => j.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Not found' });
  data.jobs.splice(idx, 1);
  writeData(data);
  res.json({ success:true });
});

// ══════════════════════════════════════════════════════════════════════════════
// STATIONS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/stations', (req, res) => {
  res.json(readData().stations || []);
});

app.post('/api/stations', (req, res) => {
  const data = readData();
  if (!data.stations) data.stations = [];
  const station = { id: req.body.id || ('station-' + Date.now()), ...req.body, status:'running', currentStoppage:null };
  data.stations.push(station);
  writeData(data);
  broadcast('stations', data.stations);
  res.json({ success:true, station });
});

app.put('/api/stations/:id', (req, res) => {
  const data = readData();
  if (!data.stations) data.stations = [];
  const idx = data.stations.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Not found' });
  data.stations[idx] = { ...data.stations[idx], ...req.body };
  writeData(data);
  broadcast('stations', data.stations);
  res.json({ success:true, station: data.stations[idx] });
});

app.delete('/api/stations/:id', (req, res) => {
  const data = readData();
  if (!data.stations) data.stations = [];
  const idx = data.stations.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Not found' });
  data.stations.splice(idx, 1);
  writeData(data);
  broadcast('stations', data.stations);
  res.json({ success:true });
});

// ══════════════════════════════════════════════════════════════════════════════
// STOPPAGES  –  log why a machine stopped
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/stoppages', (req, res) => {
  const data = readData();
  let stoppages = data.stoppages || [];
  if (req.query.stationId) stoppages = stoppages.filter(s => s.stationId === req.query.stationId);
  res.json(stoppages);
});

// START a stoppage  (machine goes down)
app.post('/api/stoppages/start', (req, res) => {
  const data = readData();
  if (!data.stoppages) data.stoppages = [];
  if (!data.stations)  data.stations  = [];

  const { stationId, reason, operator, notes } = req.body;
  const stoppage = {
    id:        Date.now(),
    stationId,
    reason,           // 'breakdown' | 'no_material' | 'quality' | 'pm' | 'other'
    operator:  operator || 'Unknown',
    notes:     notes   || '',
    startTime: new Date().toISOString(),
    endTime:   null,
    duration:  null
  };
  data.stoppages.push(stoppage);

  // Mark station as stopped
  const si = data.stations.findIndex(s => s.id === stationId);
  if (si !== -1) {
    data.stations[si].status          = 'stopped';
    data.stations[si].currentStoppage = stoppage;
  }

  writeData(data);
  broadcast('stations',  data.stations);
  broadcast('stoppage_start', stoppage);
  res.json({ success:true, stoppage });
});

// END a stoppage  (machine back up)
app.post('/api/stoppages/end', (req, res) => {
  const data = readData();
  if (!data.stoppages) data.stoppages = [];
  if (!data.stations)  data.stations  = [];

  const { stationId, nextPmDate } = req.body;
  const endTime = new Date().toISOString();

  // Find the open stoppage
  const si = data.stoppages.findIndex(s => s.stationId === stationId && !s.endTime);
  if (si !== -1) {
    const start = new Date(data.stoppages[si].startTime);
    const end   = new Date(endTime);
    data.stoppages[si].endTime  = endTime;
    data.stoppages[si].duration = Math.round((end - start) / 60000); // minutes
  }

  // Mark station as running
  const stIdx = data.stations.findIndex(s => s.id === stationId);
  if (stIdx !== -1) {
    data.stations[stIdx].status          = 'running';
    data.stations[stIdx].currentStoppage = null;
    if (nextPmDate) data.stations[stIdx].nextPmDate = nextPmDate;
  }

  writeData(data);
  broadcast('stations', data.stations);
  broadcast('stoppage_end', { stationId, endTime });
  res.json({ success:true });
});

// ══════════════════════════════════════════════════════════════════════════════
// STATION TABLET PAGE  –  serve station.html for any /station/* URL
// ══════════════════════════════════════════════════════════════════════════════
app.get('/station/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'station.html'));
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  console.log(`\n✅  PM Dashboard running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  for (const name of Object.keys(nets))
    for (const net of nets[name])
      if (net.family === 'IPv4' && !net.internal)
        console.log(`   Network: http://${net.address}:${PORT}  ← share with colleagues`);
  console.log('\n');
});
