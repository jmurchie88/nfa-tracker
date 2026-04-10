import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, Brush } from 'recharts';
import { FileText, Activity } from 'lucide-react';

const sanitize = (name) => {
  if (!name) return '';
  return name.replace(/ /g, '_').replace(/-/g, '_').replace(/\//g, '_').replace(/\(/g, '').replace(/\)/g, '');
};

const DetailedAnalysis = ({ formTypes, trendWindow }) => {
  const [detailedFormType, setDetailedFormType] = useState('');
  const [detailedRegistrant, setDetailedRegistrant] = useState('Individual');
  const [detailedTimeFilter, setDetailedTimeFilter] = useState('All');
  const [detailedDataRaw, setDetailedDataRaw] = useState([]);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [useLogScale, setUseLogScale] = useState(true);

  useEffect(() => {
    if (formTypes.length > 0 && !detailedFormType) {
      setDetailedFormType(formTypes.find(t => t.includes('Form 1 - EFile')) || formTypes[0]);
    }
  }, [formTypes, detailedFormType]);

  useEffect(() => {
    if (!detailedFormType || !detailedRegistrant) return;
    
    setDetailedLoading(true);
    const filename = `${sanitize(detailedFormType)}_${sanitize(detailedRegistrant)}.json`;
    
    fetch(`/detailed/${filename}`)
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
  }, [detailedFormType, detailedRegistrant]);

  const detailedData = useMemo(() => {
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
       'Median Wait': Math.max(1, d[`Median Wait ${trendWindow}`]),
       'Std Dev': d['Std Dev']
    })).sort((a,b) => a.timestamp - b.timestamp);
  }, [detailedDataRaw, detailedTimeFilter, trendWindow]);

  const CustomDetailedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dailyItems = detailedDataRaw.filter(d => new Date(d['Approved Date']).getTime() === label);
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

  return (
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
                 <Line type="monotone" name={`${trendWindow}-Day Rolling Median`} dataKey="Median Wait" stroke="#00d2ff" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                 
                 <Brush dataKey="timestamp" height={30} stroke="#C62828" fill="rgba(30, 31, 38, 0.5)" tickFormatter={() => ''} />
               </ComposedChart>
             </ResponsiveContainer>
         ) : (
            <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6'}}>
            {detailedLoading ? <div className="spinner"></div> : "No data available for the selected criteria."}
            </div>
         )}
      </div>
      {detailedData.length > 0 && (
         <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.75rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={14} style={{marginRight: '6px'}}/> Drag the timeline handles above to zoom into a custom date range
         </div>
      )}
    </section>
  );
};

export default DetailedAnalysis;
