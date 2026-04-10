import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, Brush } from 'recharts';
import { Calendar, Activity, FileText, TrendingUp, TrendingDown, Minus, Heart } from 'lucide-react';
import MapPanel from './MapPanel';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [overviewRegistrant, setOverviewRegistrant] = useState('Individual');
  const [timeFilter, setTimeFilter] = useState('All');
  
  const [detailedFormType, setDetailedFormType] = useState('');
  const [detailedRegistrant, setDetailedRegistrant] = useState('Individual');
  const [detailedTimeFilter, setDetailedTimeFilter] = useState('All');
  const [useLogScale, setUseLogScale] = useState(true);
  const [trendWindow, setTrendWindow] = useState('60');
  const [formTypes, setFormTypes] = useState([]);
  
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
  }, []);

  const overviewData = useMemo(() => {
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
      groupedByDate[date][item['Form Type']] = Math.max(1, item[`Median Wait ${trendWindow}`]);
    });
    
    return Object.values(groupedByDate).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [data, overviewRegistrant, timeFilter, trendWindow]);
  
  const detailedData = useMemo(() => {
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
       'Median Wait': Math.max(1, d[`Median Wait ${trendWindow}`]),
       'Std Dev': dailyStdDev[d['Approved Date']].toFixed(1)
    })).sort((a,b) => a.timestamp - b.timestamp);
  }, [data, detailedFormType, detailedRegistrant, detailedTimeFilter, trendWindow]);

  const trendCardsData = useMemo(() => {
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
      
      const currentMedian = last30.length > 0 ? (last30.reduce((s, x) => s + x[`Median Wait ${trendWindow}`], 0) / last30.length) : latestObj[`Median Wait ${trendWindow}`];
      const pastMedian = prev30.length > 0 ? (prev30.reduce((s, x) => s + x[`Median Wait ${trendWindow}`], 0) / prev30.length) : currentMedian;
      
      const delta = currentMedian - pastMedian;
      let trend = 'steady';
      if (delta > 2) trend = 'up';
      else if (delta < -2) trend = 'down';
      
      return { formType: ft, current: Math.round(currentMedian), trend, delta };
    });
  }, [data, formTypes, overviewRegistrant, trendWindow]);

  if (loading) {
     return <div className="loading-screen"><div className="spinner"></div><p>Aggregating NFA Data...</p></div>;
  }

  const CustomDetailedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      const dailyItems = detailedData.filter(d => d.timestamp === label);
      let waitTimesString = '';
      if (dailyItems.length > 5) {
         const waits = dailyItems.map(item => item['Wait Time']).sort((a,b) => a - b);
         waitTimesString = `${waits[0]} - ${waits[waits.length-1]} days`;
      } else if (dailyItems.length > 0) {
         waitTimesString = dailyItems.map(item => item['Wait Time']).sort((a,b) => a - b).join(', ') + ' days';
      } else {
         waitTimesString = data['Wait Time'] + ' days';
      }

      return (
        <div style={{ backgroundColor: 'rgba(11, 12, 16, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', zIndex: 1000, position: 'relative' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#C62828' }}>
             {typeof label === 'number' ? new Date(label).toLocaleDateString() : label}
          </p>
          <p style={{ margin: '0 0 0.5rem 0', color: '#00d2ff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{trendWindow}-Day Rolling Median: {data['Median Wait']} days</p>
          <div style={{ margin: '0 0 0.25rem 0', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
             <span style={{color: 'rgba(255,255,255,0.5)'}}>Approvals Logged:</span> {dailyItems.length > 0 ? dailyItems.length : 1}
          </div>
          <div style={{ margin: '0 0 0.25rem 0', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
             <span style={{color: 'rgba(255,255,255,0.5)'}}>Wait Times:</span> {waitTimesString}
          </div>
          <p style={{ margin: '0.5rem 0 0 0', color: '#b8bb86', fontWeight: 600, fontSize: '0.85rem' }}>Daily Std Deviation: ±{data['Std Dev']} days</p>
        </div>
      );
    }
    return null;
  };

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
              <span className="stat-value">{data.length.toLocaleString()}</span>
              <span className="stat-sub"><Activity size={14}/> Live Data Array</span>
           </div>
           <div className="glass-panel stat-card" style={{borderTopColor: '#C62828'}}>
              <span className="stat-label">Latest Approval Logged</span>
              <span className="stat-value">{data.length > 0 ? new Date(data[data.length-1]['Approved Date']).toLocaleDateString() : 'N/A'}</span>
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
             <ResponsiveContainer width="100%" height="100%">
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

        <section className="glass-panel">
          <div className="panel-header" style={{flexWrap: 'wrap', gap: '1rem'}}>
            <h2><FileText size={20} color="#C62828" /> Detailed Wait Time Analysis <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem'}}>({trendWindow}-Day Rolling Median)</span></h2>
            <div className="toggle-container" style={{ gap: '0.25rem' }}>
               <button className={`toggle-btn ${detailedTimeFilter === 'All' ? 'active' : ''}`} onClick={() => setDetailedTimeFilter('All')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>All Time</button>
               <button className={`toggle-btn ${detailedTimeFilter === '1Y' ? 'active' : ''}`} onClick={() => setDetailedTimeFilter('1Y')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>1Y</button>
               <button className={`toggle-btn ${detailedTimeFilter === '6M' ? 'active' : ''}`} onClick={() => setDetailedTimeFilter('6M')} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>6M</button>
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
                <button className={`toggle-btn ${useLogScale ? 'active' : ''}`} onClick={() => setUseLogScale(!useLogScale)} style={{ padding: '0.75rem 1.5rem', fontSize: '0.90rem', height: '100%', boxSizing: 'border-box' }}>Log Scale</button>
             </div>
          </div>

          <div className="chart-wrapper">
             {detailedData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
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
                     <Line type="monotone" name={`${trendWindow}-Day Rolling Median`} dataKey="Median Wait" stroke="#00d2ff" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                     
                     <Brush dataKey="timestamp" height={30} stroke="#C62828" fill="rgba(30, 31, 38, 0.5)" tickFormatter={() => ''} />
                   </ComposedChart>
                 </ResponsiveContainer>
             ) : (
                <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6'}}>
                   No data available for the selected criteria.
                </div>
             )}
          </div>
          {detailedData.length > 0 && (
             <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.75rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={14} style={{marginRight: '6px'}}/> Drag the timeline handles above to zoom into a custom date range
             </div>
          )}
        </section>
        
        <MapPanel data={data} />
      </main>
    </div>
  )
}
