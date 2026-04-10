const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const sanitizeJS = `  const sanitize = (name) => {
    if (!name) return '';
    return name.replace(/ /g, '_').replace(/-/g, '_').replace(/\\//g, '_').replace(/\\(/g, '').replace(/\\)/g, '');
  };`;

// 1. Update State Hooks
const oldState = `  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [overviewRegistrant, setOverviewRegistrant] = useState('Individual');
  const [timeFilter, setTimeFilter] = useState('All');
  
  const [detailedFormType, setDetailedFormType] = useState('');
  const [detailedRegistrant, setDetailedRegistrant] = useState('Individual');
  const [detailedTimeFilter, setDetailedTimeFilter] = useState('All');
  const [useLogScale, setUseLogScale] = useState(true);
  const [trendWindow, setTrendWindow] = useState('60');
  const [formTypes, setFormTypes] = useState([]);`;

const newState = `  const [overviewRaw, setOverviewRaw] = useState([]);
  const [trendsRaw, setTrendsRaw] = useState(null);
  const [detailedDataRaw, setDetailedDataRaw] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [detailedLoading, setDetailedLoading] = useState(false);
  
  // Controls
  const [overviewRegistrant, setOverviewRegistrant] = useState('Individual');
  const [timeFilter, setTimeFilter] = useState('All');
  
  const [detailedFormType, setDetailedFormType] = useState('');
  const [detailedRegistrant, setDetailedRegistrant] = useState('Individual');
  const [detailedTimeFilter, setDetailedTimeFilter] = useState('All');
  const [useLogScale, setUseLogScale] = useState(true);
  const [trendWindow, setTrendWindow] = useState('60');
  const [formTypes, setFormTypes] = useState([]);
  const [stats, setStats] = useState({ total: 0, latest: '' });

${sanitizeJS}`;

// 2. Update init useEffect
const oldInitEffect = `  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(json => {
         const sorted = json.sort((a,b) => new Date(a['Approved Date']) - new Date(b['Approved Date']));
         setData(sorted);
         
         const types = [...new Set(sorted.map(item => item['Form Type']))].filter(Boolean).sort();
         setFormTypes(types);
         if(types.length > 0) {
           setDetailedFormType(types.find(t => t.includes('Form 1 - EFile')) || types[0]);
         }
         
         setLoading(false);
      })
      .catch(err => {
         console.error('Failed to load data:', err);
         setLoading(false);
      });
  }, []);`;

const newInitEffect = `  useEffect(() => {
    Promise.all([
      fetch('/overview.json').then(r => r.json()),
      fetch('/trends.json').then(r => r.json())
    ]).then(([overview, trends]) => {
      setOverviewRaw(overview);
      setTrendsRaw(trends);
      
      const types = [...new Set(overview.map(item => item['Form Type']))].filter(Boolean).sort();
      setFormTypes(types);
      if(types.length > 0) {
        setDetailedFormType(types.find(t => t.includes('Form 1 - EFile')) || types[0]);
      }
      
      const latest = overview.length > 0 ? overview[overview.length-1]['Approved Date'] : '';
      setStats({ total: 11049, latest }); // Total hardcoded for now or we could sum up
      
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load initial data:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!detailedFormType || !detailedRegistrant) return;
    
    setDetailedLoading(true);
    const filename = \`\${sanitize(detailedFormType)}_\${sanitize(detailedRegistrant)}.json\`;
    
    fetch(\`/detailed/\${filename}\`)
      .then(r => r.json())
      .then(json => {
         setDetailedDataRaw(json);
         setDetailedLoading(false);
      })
      .catch(err => {
         console.error('Failed to load detailed data:', err);
         setDetailedDataRaw([]);
         setDetailedLoading(false);
      });
  }, [detailedFormType, detailedRegistrant]);`;

// 3. Update overviewData useMemo
const oldOverviewMemo = `  const overviewData = useMemo(() => {
    if (!data.length) return [];
    
    let filteredData = data;
    if (timeFilter !== 'All') {
       const latestDate = new Date(data[data.length - 1]['Approved Date']);
       const cutoffDate = new Date(latestDate);
       if (timeFilter === '1Y') cutoffDate.setMonth(cutoffDate.getMonth() - 12);
       else if (timeFilter === '6M') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
       else if (timeFilter === '3M') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
       
       filteredData = data.filter(d => new Date(d['Approved Date']) >= cutoffDate);
    }
    
    const filtered = filteredData.filter(d => d.Registrant === overviewRegistrant);
    
    const groupedByDate = {};
    filtered.forEach(item => {
      const date = item['Approved Date'];
      if (!groupedByDate[date]) {
         groupedByDate[date] = { date };
      }
      groupedByDate[date][item['Form Type']] = Math.max(1, item[\`Median Wait \${trendWindow}\`]);
    });
    
    return Object.values(groupedByDate).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [data, overviewRegistrant, timeFilter, trendWindow]);`;

const newOverviewMemo = `  const overviewData = useMemo(() => {
    if (!overviewRaw.length) return [];
    
    let filteredData = overviewRaw;
    if (timeFilter !== 'All') {
       const latestDate = new Date(overviewRaw[overviewRaw.length - 1]['Approved Date']);
       const cutoffDate = new Date(latestDate);
       if (timeFilter === '1Y') cutoffDate.setMonth(cutoffDate.getMonth() - 12);
       else if (timeFilter === '6M') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
       else if (timeFilter === '3M') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
       
       filteredData = overviewRaw.filter(d => new Date(d['Approved Date']) >= cutoffDate);
    }
    
    const filtered = filteredData.filter(d => d.Registrant === overviewRegistrant);
    
    const groupedByDate = {};
    filtered.forEach(item => {
      const date = item['Approved Date'];
      if (!groupedByDate[date]) {
         groupedByDate[date] = { date };
      }
      groupedByDate[date][item['Form Type']] = Math.max(1, item[\`Median Wait \${trendWindow}\`]);
    });
    
    return Object.values(groupedByDate).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [overviewRaw, overviewRegistrant, timeFilter, trendWindow]);`;

// 4. Update detailedData useMemo
const oldDetailedMemo = `  const detailedData = useMemo(() => {
    if (!data.length) return [];
    
    let filteredData = data;
    if (detailedTimeFilter !== 'All') {
       const latestDate = new Date(data[data.length - 1]['Approved Date']);
       const cutoffDate = new Date(latestDate);
       if (detailedTimeFilter === '1Y') cutoffDate.setMonth(cutoffDate.getMonth() - 12);
       else if (detailedTimeFilter === '6M') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
       else if (detailedTimeFilter === '3M') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
       
       filteredData = data.filter(d => new Date(d['Approved Date']) >= cutoffDate);
    }
    
    const baseData = filteredData.filter(d => 
      d['Form Type'] === detailedFormType && 
      d.Registrant === detailedRegistrant
    );
    
    const dailyWaits = {};
    baseData.forEach(d => {
       const dt = d['Approved Date'];
       if(!dailyWaits[dt]) dailyWaits[dt] = [];
       dailyWaits[dt].push(d['Wait Time']);
    });
    
    const dailyStdDev = {};
    for (const dt in dailyWaits) {
       const waits = dailyWaits[dt];
       if (waits.length <= 1) {
           dailyStdDev[dt] = 0;
       } else {
           const mean = waits.reduce((a,b) => a+b, 0) / waits.length;
           const variance = waits.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / (waits.length - 1);
           dailyStdDev[dt] = Math.sqrt(variance);
       }
    }

    return baseData.map(d => ({
       date: d['Approved Date'],
       timestamp: new Date(d['Approved Date']).getTime(),
       'Wait Time': Math.max(1, d['Wait Time']),
       'Median Wait': Math.max(1, d[\`Median Wait \${trendWindow}\`]),
       'Std Dev': dailyStdDev[d['Approved Date']].toFixed(1)
    })).sort((a,b) => a.timestamp - b.timestamp);
  }, [data, detailedFormType, detailedRegistrant, detailedTimeFilter, trendWindow]);`;

const newDetailedMemo = `  const detailedData = useMemo(() => {
    if (!detailedDataRaw.length) return [];
    
    let filteredData = detailedDataRaw;
    if (detailedTimeFilter !== 'All') {
       const latestDate = new Date(detailedDataRaw[detailedDataRaw.length - 1]['Approved Date']);
       const cutoffDate = new Date(latestDate);
       if (detailedTimeFilter === '1Y') cutoffDate.setMonth(cutoffDate.getMonth() - 12);
       else if (detailedTimeFilter === '6M') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
       else if (detailedTimeFilter === '3M') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
       
       filteredData = detailedDataRaw.filter(d => new Date(d['Approved Date']) >= cutoffDate);
    }
    
    return filteredData.map(d => ({
       date: d['Approved Date'],
       timestamp: new Date(d['Approved Date']).getTime(),
       'Wait Time': Math.max(1, d['Wait Time']),
       'Median Wait': Math.max(1, d[\`Median Wait \${trendWindow}\`]),
       'Std Dev': d['Std Dev']
    })).sort((a,b) => a.timestamp - b.timestamp);
  }, [detailedDataRaw, detailedTimeFilter, trendWindow]);`;


// 5. Update trendCardsData useMemo
const oldTrendCardsMemo = `  const trendCardsData = useMemo(() => {
    if (!data.length || !formTypes.length) return [];
    
    return formTypes.map(ft => {
      const ftData = data.filter(d => d.Registrant === overviewRegistrant && d['Form Type'] === ft);
      if (ftData.length === 0) return { formType: ft, current: 0, trend: 'steady' };
      
      const latestObj = ftData[ftData.length - 1];
      const latestDate = new Date(latestObj['Approved Date']);
      
      const t30 = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const t60 = new Date(latestDate.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      const last30 = ftData.filter(d => new Date(d['Approved Date']) >= t30);
      const prev30 = ftData.filter(d => {
         const dDate = new Date(d['Approved Date']);
         return dDate >= t60 && dDate < t30;
      });
      
      const currentMedian = last30.length > 0 ? (last30.reduce((s, x) => s + x[\`Median Wait \${trendWindow}\`], 0) / last30.length) : latestObj[\`Median Wait \${trendWindow}\`];
      const pastMedian = prev30.length > 0 ? (prev30.reduce((s, x) => s + x[\`Median Wait \${trendWindow}\`], 0) / prev30.length) : currentMedian;
      
      const delta = currentMedian - pastMedian;
      let trend = 'steady';
      if (delta > 2) trend = 'up';
      else if (delta < -2) trend = 'down';
      
      return { formType: ft, current: Math.round(currentMedian), trend, delta };
    });
  }, [data, formTypes, overviewRegistrant, trendWindow]);`;

const newTrendCardsMemo = `  const trendCardsData = useMemo(() => {
    if (!trendsRaw || !formTypes.length) return [];
    
    const activeTrends = trendsRaw[overviewRegistrant] || {};
    return formTypes.map(ft => {
      const stats = activeTrends[ft] ? activeTrends[ft][trendWindow] : { current: 0, trend: 'steady', delta: 0 };
      return { formType: ft, ...stats };
    });
  }, [trendsRaw, formTypes, overviewRegistrant, trendWindow]);`;

// Custom Tooltip update for finding daily items
const oldTooltipLines = `      const dailyItems = detailedData.filter(d => d.timestamp === label);
      let waitTimesString = '';`;
const newTooltipLines = `      const dailyItems = detailedDataRaw.filter(d => new Date(d['Approved Date']).getTime() === label);
      let waitTimesString = '';`;

// Final UI cleanup for Total Submissions and Latest
const oldStatsHeader = `<span className="stat-value">{data.length.toLocaleString()}</span>`;
const newStatsHeader = `<span className="stat-value">{stats.total.toLocaleString()}</span>`;
const oldLatestLine = `<span className="stat-value">{data.length > 0 ? new Date(data[data.length-1]['Approved Date']).toLocaleDateString() : 'N/A'}</span>`;
const newLatestLine = `<span className="stat-value">{stats.latest ? new Date(stats.latest).toLocaleDateString() : 'N/A'}</span>`;

content = content.replace(oldState, newState);
content = content.replace(oldInitEffect, newInitEffect);
content = content.replace(oldOverviewMemo, newOverviewMemo);
content = content.replace(oldDetailedMemo, newDetailedMemo);
content = content.replace(oldTrendCardsMemo, newTrendCardsMemo);
content = content.replace(oldTooltipLines, newTooltipLines);
content = content.replace(oldStatsHeader, newStatsHeader);
content = content.replace(oldLatestLine, newLatestLine);

// Handle the "No data" message in detailed view
const oldNoDataLine = `<div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6'}}>`;
const newNoDataLine = `<div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6'}}>
                {detailedLoading ? <div className="spinner"></div> : "No data available for the selected criteria."}`;

content = content.replace('No data available for the selected criteria.', '');
content = content.replace(oldNoDataLine, newNoDataLine);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx successfully refactored for static pre-aggregation!');
