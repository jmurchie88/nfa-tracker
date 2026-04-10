import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { Calendar, Activity, TrendingUp, TrendingDown, Minus, Heart, Loader2 } from 'lucide-react';
import { Suspense, lazy } from 'react';
const MapPanel = lazy(() => import('./MapPanel'));
const DetailedAnalysis = lazy(() => import('./DetailedAnalysis'));

export default function App() {
  const [overviewRaw, setOverviewRaw] = useState([]);
  const [trendsRaw, setTrendsRaw] = useState(null);
  
  
  const [loading, setLoading] = useState(true);
  
  
  // Controls
  const [overviewRegistrant, setOverviewRegistrant] = useState('Individual');
  const [timeFilter, setTimeFilter] = useState('All');
  const [useLogScale, setUseLogScale] = useState(true);
  
  
  
  
  
  const [trendWindow, setTrendWindow] = useState('60');
  const [formTypes, setFormTypes] = useState([]);
  const [stats, setStats] = useState({ total: 0, latest: '' });

  const sanitize = (name) => {
    if (!name) return '';
    return name.replace(/ /g, '_').replace(/-/g, '_').replace(/\//g, '_').replace(/\(/g, '').replace(/\)/g, '');
  };
  
  // Legend interaction
  const [hiddenSeries, setHiddenSeries] = useState({});
  const handleLegendClick = (e) => {
    setHiddenSeries(prev => ({
      ...prev,
      [e.dataKey]: !prev[e.dataKey]
    }));
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <ul style={{ listStyle: 'none', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px', padding: 0, marginTop: '20px' }}>
        {payload.map((entry, index) => {
          const isHidden = hiddenSeries[entry.dataKey];
          const color = isHidden ? '#555' : entry.color;
          return (
            <li 
              key={`item-${index}`} 
              onClick={() => handleLegendClick(entry)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color, transition: 'color 0.2s' }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color, transition: 'background-color 0.2s' }}></span>
              <span style={{ fontSize: '13px' }}>{entry.value}</span>
            </li>
          );
        })}
      </ul>
    );
  };
  
  useEffect(() => {
    Promise.all([
      fetch('/overview.json').then(r => r.json()),
      fetch('/trends.json').then(r => r.json())
    ]).then(([overview, trends]) => {
      setOverviewRaw(overview);
      setTrendsRaw(trends);
      
      const types = [...new Set(overview.map(item => item['Form Type']))].filter(Boolean).sort();
      setFormTypes(types);
      
      const latest = overview.length > 0 ? overview[overview.length-1]['Approved Date'] : '';
      setStats({ total: 11049, latest }); // Total hardcoded for now or we could sum up
      
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load initial data:', err);
      setLoading(false);
    });
  }, []);

  

  const overviewData = useMemo(() => {
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
      groupedByDate[date][item['Form Type']] = Math.max(1, item[`Median Wait ${trendWindow}`]);
    });
    
    return Object.values(groupedByDate).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [overviewRaw, overviewRegistrant, timeFilter, trendWindow]);
  
  

  const trendCardsData = useMemo(() => {
    if (!trendsRaw || !formTypes.length) return [];
    
    const activeTrends = trendsRaw[overviewRegistrant] || {};
    return formTypes.map(ft => {
      const stats = activeTrends[ft] ? activeTrends[ft][trendWindow] : { current: 0, trend: 'steady', delta: 0 };
      return { formType: ft, ...stats };
    });
  }, [trendsRaw, formTypes, overviewRegistrant, trendWindow]);

  if (loading) {
     return <div className="loading-screen"><div className="spinner"></div><p>Aggregating NFA Data...</p></div>;
  }

  

  const colors = ['#00d2ff', '#00e676', '#C62828', '#b8bb86', '#B0BEC5', '#F44336', '#FF5722'];

  return (
    <div className="animate-fade-in">
      <header className="app-header">
        <div className="header-title">
          <h1>NFA Approvals Dashboard</h1>
          <p>User submitted ATF approval tracking</p>
        </div>
      </header>

      <main className="dashboard-container">
        

        <div className="stats-grid">
           <div className="glass-panel stat-card">
              <span className="stat-label">Total Submissions</span>
              <span className="stat-value">{stats.total.toLocaleString()}</span>
              <span className="stat-sub"><Activity size={14}/> Live Data Array</span>
           </div>
           <div className="glass-panel stat-card" style={{borderTopColor: '#C62828'}}>
              <span className="stat-label">Latest Approval Logged</span>
              <span className="stat-value">{stats.latest ? new Date(stats.latest).toLocaleDateString() : 'N/A'}</span>
              <span className="stat-sub"><Calendar size={14}/> Updated Nightly via Actions</span>
           </div>
           <div className="glass-panel stat-card" style={{borderTopColor: '#b8bb86'}}>
              <span className="stat-label">Community Sourced</span>
              <span className="stat-value" style={{fontSize: '1.5rem', marginTop: '0.8rem'}}>Thank You!</span>
              <span className="stat-sub" style={{color: '#b8bb86', fontWeight: 500, marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', alignItems: 'center'}}>
                 <Heart size={14} color="#b8bb86" style={{marginRight: '4px'}}/> <a href="https://thinlineweapons.com/" target="_blank" rel="noreferrer" style={{color: '#b8bb86', textDecoration: 'none', marginLeft: '4px'}}>ThinLineWeapons</a> &nbsp;&amp;&nbsp; <a href="https://www.reddit.com/r/NFA/" target="_blank" rel="noreferrer" style={{color: '#b8bb86', textDecoration: 'none'}}>r/NFA</a>
              </span>
           </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }} className="glass-panel">
           <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><Activity size={16} style={{display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px'}}/>Global Rolling Trend Window:</span>
           <div className="toggle-container">
               <button className={`toggle-btn ${trendWindow === '30' ? 'active' : ''}`} onClick={() => setTrendWindow('30')}>30 Day</button>
               <button className={`toggle-btn ${trendWindow === '60' ? 'active' : ''}`} onClick={() => setTrendWindow('60')}>60 Day</button>
               <button className={`toggle-btn ${trendWindow === '90' ? 'active' : ''}`} onClick={() => setTrendWindow('90')}>90 Day</button>
           </div>
        </div>
        <section className="glass-panel">
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <h2><Calendar size={20} color="#B0BEC5" /> Current Median Wait Times <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem'}}>(in days, {trendWindow}-Day Rolling Window)</span></h2>
          </div>
          <div className="trend-cards-grid">
             {trendCardsData.map((tc, i) => (
                <div key={tc.formType} className="trend-card" style={{ borderTopColor: colors[i % colors.length], borderTopWidth: '3px', borderTopStyle: 'solid' }}>
                   <div className="ft-label" title={tc.formType}>{tc.formType}</div>
                   <div className="val">
                      {tc.current}
                      {tc.trend === 'up' && <TrendingUp size={24} className="trend-icon up" title="Increasing (> 2 day delta vs 30 days ago)" />}
                      {tc.trend === 'down' && <TrendingDown size={24} className="trend-icon down" title="Decreasing (> 2 day delta vs 30 days ago)" />}
                      {tc.trend === 'steady' && <Minus size={24} className="trend-icon steady" title="Steady (± 2 day delta vs 30 days ago)" />}
                   </div>
                </div>
             ))}
          </div>
        </section>

        <section className="glass-panel">
          <div className="panel-header" style={{flexWrap: 'wrap', gap: '1rem'}}>
            <h2><Activity size={20} color="#00d2ff" /> Wait Times Overview by Form Type <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem'}}>({trendWindow}-Day Rolling Median)</span></h2>
            <div className="toggle-container" style={{ gap: '0.25rem' }}>
               <button className={`toggle-btn ${timeFilter === 'All' ? 'active' : ''}`} onClick={() => setTimeFilter('All')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>All Time</button>
               <button className={`toggle-btn ${timeFilter === '1Y' ? 'active' : ''}`} onClick={() => setTimeFilter('1Y')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>1Y</button>
               <button className={`toggle-btn ${timeFilter === '6M' ? 'active' : ''}`} onClick={() => setTimeFilter('6M')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>6M</button>
            </div>
          </div>
          <div className="controls-row" style={{marginBottom: '2rem'}}>
             <div className="toggle-container" style={{ gap: '0.25rem' }}>
                <button className={`toggle-btn ${overviewRegistrant === 'Individual' ? 'active' : ''}`} onClick={() => setOverviewRegistrant('Individual')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Individual</button>
                <button className={`toggle-btn ${overviewRegistrant === 'Trust' ? 'active' : ''}`} onClick={() => setOverviewRegistrant('Trust')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Trust</button>
             </div>
             <div className="toggle-container" style={{ gap: '0.25rem', marginLeft: 'auto' }}>
                <button className={`toggle-btn ${useLogScale ? 'active' : ''}`} onClick={() => setUseLogScale(!useLogScale)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Log Scale</button>
             </div>
          </div>
          <div className="chart-wrapper">
             <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <LineChart data={overviewData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#95a5a6" tick={{fill: '#95a5a6'}} tickMargin={10} minTickGap={30} />
                  <YAxis 
                     stroke="#95a5a6" 
                     tick={{fill: '#95a5a6'}} 
                     scale={useLogScale ? "log" : "auto"} 
                     domain={useLogScale ? [1, 'auto'] : ['auto', 'auto']} 
                     allowDataOverflow 
                     label={{ value: 'Wait Time (Days)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#95a5a6', fontSize: '12px', fontWeight: 600 } }}
                  />
                 <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(11, 12, 16, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ecf0f1' }}
                    itemStyle={{ color: '#ecf0f1' }}
                 />
                 <Legend content={renderLegend} verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                 {formTypes.map((type, i) => (
                    <Line 
                      type="monotone" 
                      key={type} 
                      dataKey={type} 
                      stroke={colors[i % colors.length]} 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={!hiddenSeries[type] ? { r: 6 } : false}
                      hide={hiddenSeries[type] === true}
                      connectNulls
                    />
                 ))}
                 <Brush dataKey="date" height={30} stroke="#3a7bd5" fill="rgba(30, 31, 38, 0.5)" tickFormatter={() => ''} />
               </LineChart>
             </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.75rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Activity size={14} style={{marginRight: '6px'}}/> Drag the timeline handles above to zoom into a custom date range
          </div>
        </section>

        <Suspense fallback={<div className="glass-panel" style={{height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Loader2 className="spinner" size={32} color="#00d2ff" />
          </div>}>
          <DetailedAnalysis formTypes={formTypes} trendWindow={trendWindow} />
        </Suspense>
        
        <Suspense fallback={<div className="glass-panel" style={{height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Loader2 className="spinner" size={32} color="#00d2ff" />
          </div>}>
          <MapPanel />
        </Suspense>
      </main>
    </div>
  )
}
