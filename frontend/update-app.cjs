const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Update detailedData memo
const oldDetailedDataOut = `    return baseData.map(d => ({
       date: d['Approved Date'],
       timestamp: new Date(d['Approved Date']).getTime(),
       'Wait Time': Math.max(1, d['Wait Time']),
       'Median Wait': Math.max(1, d['Median Wait']),
       'Std Dev': dailyStdDev[d['Approved Date']].toFixed(1)
    })).sort((a,b) => a.timestamp - b.timestamp);
  }, [data, detailedFormType, detailedRegistrant, detailedTimeFilter]);`;

const newDetailedDataOut = `    return baseData.map(d => ({
       date: d['Approved Date'],
       timestamp: new Date(d['Approved Date']).getTime(),
       'Wait Time': Math.max(1, d['Wait Time']),
       'Median Wait': Math.max(1, d[\`Median Wait \${trendWindow}\`]),
       'Std Dev': dailyStdDev[d['Approved Date']].toFixed(1)
    })).sort((a,b) => a.timestamp - b.timestamp);
  }, [data, detailedFormType, detailedRegistrant, detailedTimeFilter, trendWindow]);`;


// 2. Update overviewData memo
const oldOverview = `      groupedByDate[date][item['Form Type']] = Math.max(1, item['Median Wait']);
    });
    
    return Object.values(groupedByDate).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [data, overviewRegistrant, timeFilter]);`;

const newOverview = `      groupedByDate[date][item['Form Type']] = Math.max(1, item[\`Median Wait \${trendWindow}\`]);
    });
    
    return Object.values(groupedByDate).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [data, overviewRegistrant, timeFilter, trendWindow]);`;


// 3. Update trendCardsData memo
const oldTrendCards = `      const last30 = ftData.filter(d => new Date(d['Approved Date']) >= t30);
      const prev30 = ftData.filter(d => {
         const dDate = new Date(d['Approved Date']);
         return dDate >= t60 && dDate < t30;
      });
      
      const currentMedian = latestObj['Median Wait'] || 0;
      const t30Obj = prev30.length > 0 ? prev30[prev30.length - 1] : last30[0];
      const prevMedian = t30Obj ? (t30Obj['Median Wait'] || 0) : currentMedian;`;

const newTrendCards = `      const last30 = ftData.filter(d => new Date(d['Approved Date']) >= t30);
      const prev30 = ftData.filter(d => {
         const dDate = new Date(d['Approved Date']);
         return dDate >= t60 && dDate < t30;
      });
      
      const currentMedian = latestObj[\`Median Wait \${trendWindow}\`] || 0;
      const t30Obj = prev30.length > 0 ? prev30[prev30.length - 1] : last30[0];
      const prevMedian = t30Obj ? (t30Obj[\`Median Wait \${trendWindow}\`] || 0) : currentMedian;`;

const oldTrendCardsEnd = `  }, [data, formTypes, overviewRegistrant]);`;
const newTrendCardsEnd = `  }, [data, formTypes, overviewRegistrant, trendWindow]);`;


// 4. Update the Tooltip internal logic reference
const oldTooltip = `<p style={{ margin: '0 0 0.5rem 0', color: '#00d2ff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>60-Day Rolling Median: {data['Median Wait']} days</p>`;
const newTooltip = `<p style={{ margin: '0 0 0.5rem 0', color: '#00d2ff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{trendWindow}-Day Rolling Median: {data['Median Wait']} days</p>`;

// 5. Update HTML Headers
const oldT1 = `(in days, 60-Day Rolling Window)</span></h2>`;
const newT1 = `(in days, {trendWindow}-Day Rolling Window)</span></h2>`;

const oldT2 = `(60-Day Rolling Median)</span></h2>`;
const newT2 = `({trendWindow}-Day Rolling Median)</span></h2>`;

const oldL1 = `name="60-Day Rolling Median"`;
const newL1 = `name={\`\${trendWindow}-Day Rolling Median\`}`;

// 6. Insert toggle UI
const insertUiTarget = `<div className="stats-grid">`;
const insertUi = `<div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', gap: '1rem', alignItems: 'center' }} className="glass-panel">
           <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><Activity size={16} style={{display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px'}}/>Global Trend Window:</span>
           <div className="toggle-container">
               <button className={\`toggle-btn \${trendWindow === '30' ? 'active' : ''}\`} onClick={() => setTrendWindow('30')}>30 Day</button>
               <button className={\`toggle-btn \${trendWindow === '60' ? 'active' : ''}\`} onClick={() => setTrendWindow('60')}>60 Day</button>
               <button className={\`toggle-btn \${trendWindow === '90' ? 'active' : ''}\`} onClick={() => setTrendWindow('90')}>90 Day</button>
           </div>
        </div>
        <div className="stats-grid">`;

content = content.replace(oldDetailedDataOut, newDetailedDataOut);
content = content.replace(oldOverview, newOverview);
content = content.replace(oldTrendCards, newTrendCards);
content = content.replace(oldTrendCardsEnd, newTrendCardsEnd);
content = content.replace(oldTooltip, newTooltip);
content = content.replace(oldT1, newT1);
content = content.replaceAll(oldT2, newT2);
content = content.replace(oldL1, newL1);
content = content.replace(insertUiTarget, insertUi);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx Updated!');
