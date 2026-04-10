const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Update Imports
content = content.replace(
  "import MapPanel from './MapPanel';",
  "import { Suspense, lazy } from 'react';\nconst MapPanel = lazy(() => import('./MapPanel'));\nconst DetailedAnalysis = lazy(() => import('./DetailedAnalysis'));"
);

// 2. Remove extracted imports from recharts and lucide
content = content.replace(
  "import { LineChart, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, Brush } from 'recharts';",
  "import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';"
);
content = content.replace(
  "import { Calendar, Activity, FileText, TrendingUp, TrendingDown, Minus, Heart } from 'lucide-react';",
  "import { Calendar, Activity, TrendingUp, TrendingDown, Minus, Heart, Loader2 } from 'lucide-react';"
);

// 3. Remove extracted states
const statesToRemove = [
  "const [detailedFormType, setDetailedFormType] = useState('');",
  "const [detailedRegistrant, setDetailedRegistrant] = useState('Individual');",
  "const [detailedTimeFilter, setDetailedTimeFilter] = useState('All');",
  "const [detailedDataRaw, setDetailedDataRaw] = useState([]);",
  "const [detailedLoading, setDetailedLoading] = useState(false);",
  "const [useLogScale, setUseLogScale] = useState(true);"
];
statesToRemove.forEach(s => { content = content.replace(s, ''); });

// 4. Remove detailed raw useEffect (lines 86-103)
content = content.replace(/useEffect\(\(\) => \{\s+if \(!detailedFormType[\s\S]+?\}\, \[detailedFormType\, detailedRegistrant\]\)\;/g, '');

// 5. Remove detailedData useMemo (lines 133-154)
content = content.replace(/const detailedData = useMemo\(\(\) => \{[\s\S]+?\}\, \[detailedDataRaw\, detailedTimeFilter\, trendWindow\]\)\;/g, '');

// 6. Remove CustomDetailedTooltip
content = content.replace(/const CustomDetailedTooltip = \(\{ active, payload, label \}\) => \{[\s\S]+?  \};/g, '');

// 7. Implement Suspense in JSX
const detailedSectionOld = `<section className="glass-panel">
          <div className="panel-header" style={{flexWrap: 'wrap', gap: '1rem'}}>
            <h2><FileText size={20} color="#C62828" /> Detailed Wait Time Analysis <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem'}}>({trendWindow}-Day Rolling Median)</span></h2>
            <div className="toggle-container" style={{ gap: '0.25rem' }}>
               <button className={\`toggle-btn \${detailedTimeFilter === 'All' ? 'active' : ''}\`} onClick={() => setDetailedTimeFilter('All')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>All Time</button>
               <button className={\`toggle-btn \${detailedTimeFilter === '1Y' ? 'active' : ''}\`} onClick={() => setDetailedTimeFilter('1Y')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>1Y</button>
               <button className={\`toggle-btn \${detailedTimeFilter === '6M' ? 'active' : ''}\`} onClick={() => setDetailedTimeFilter('6M')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>6M</button>
            </div>
          </div>
          
          <div className="controls-row" style={{marginBottom: '2rem'}}>
             <div className="control-group">
                <label>Form Type</label>
                <select className="custom-select" value={detailedFormType} onChange={e => setDetailedFormType(e.target.value)}>
                   {formTypes.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                </select>
             </div>
             <div className="control-group">
                <label>Registrant Type</label>
                <select className="custom-select" value={detailedRegistrant} onChange={e => setDetailedRegistrant(e.target.value)}>
                   <option value="Individual">Individual</option>
                   <option value="Trust">Trust</option>
                </select>
             </div>
             <div className="control-group" style={{ flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                <button className={\`toggle-btn \${useLogScale ? 'active' : ''}\`} onClick={() => setUseLogScale(!useLogScale)} style={{ padding: '0.75rem 1.5rem', fontSize: '0.90rem', height: '100%', boxSizing: 'border-box' }}>Log Scale</button>
             </div>
          </div>

          <div className="chart-wrapper">
             {detailedData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%" debounce={50}>
                   <ComposedChart data={detailedData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                     <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(tick) => new Date(tick).toLocaleDateString()} stroke="#95a5a6" tick={{fill: '#95a5a6'}} tickMargin={10} minTickGap={30}/>
                     <YAxis 
                        stroke="#95a5a6" 
                        tick={{fill: '#95a5a6'}} 
                        scale={useLogScale ? "log" : "auto"} 
                        domain={useLogScale ? [1, 'auto'] : ['auto', 'auto']} 
                        allowDataOverflow 
                        label={{ value: 'Wait Time (Days)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#95a5a6', fontSize: '12px', fontWeight: 600 } }}
                     />
                     <Tooltip content={<CustomDetailedTooltip />} />
                     <Legend wrapperStyle={{ paddingTop: '20px' }} />
                     
                     <Scatter name="Actual Wait Times" dataKey="Wait Time" fill="rgba(255,255,255,0.35)" />
                     <Line type="monotone" name={\`\${trendWindow}-Day Rolling Median\`} dataKey="Median Wait" stroke="#00d2ff" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                     
                     <Brush dataKey="timestamp" height={30} stroke="#C62828" fill="rgba(30, 31, 38, 0.5)" tickFormatter={() => ''} />
                   </ComposedChart>
                 </ResponsiveContainer>
             ) : (
                <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6'}}>
                {detailedLoading ? <div className="spinner"></div> : ""}
                
                   
                </div>
             )}
          </div>
          {detailedData.length > 0 && (
             <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.75rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={14} style={{marginRight: '6px'}}/> Drag the timeline handles above to zoom into a custom date range
             </div>
          )}
        </section>`;

const fallback = `<div className="glass-panel" style={{height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Loader2 className="spinner" size={32} color="#00d2ff" />
          </div>`;

content = content.replace(detailedSectionOld, `<Suspense fallback={${fallback}}>
          <DetailedAnalysis formTypes={formTypes} trendWindow={trendWindow} />
        </Suspense>`);

content = content.replace('<MapPanel />', `<Suspense fallback={${fallback}}>
          <MapPanel />
        </Suspense>`);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx successfully refactored for Lazy Loading!');
