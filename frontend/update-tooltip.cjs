const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const targetFunction = `  const CustomDetailedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'rgba(11, 12, 16, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', zIndex: 1000, position: 'relative' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#C62828' }}>
             {typeof label === 'number' ? new Date(label).toLocaleDateString() : label}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#00d2ff' }}>60-Day Rolling Median: {data['Median Wait']} days</p>
          <p style={{ margin: '0 0 0.25rem 0', color: 'rgba(255,255,255,0.7)' }}>Wait Time Tracked: {data['Wait Time']} days</p>
          <p style={{ margin: '0', color: '#b8bb86', fontWeight: 600 }}>Daily Std Deviation: ±{data['Std Dev']} days</p>
        </div>
      );
    }
    return null;
  };`;

const newFunction = `  const CustomDetailedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      const dailyItems = detailedData.filter(d => d.timestamp === label);
      let waitTimesString = '';
      if (dailyItems.length > 5) {
         const waits = dailyItems.map(item => item['Wait Time']).sort((a,b) => a - b);
         waitTimesString = \`Range: \${waits[0]} - \${waits[waits.length-1]} days\`;
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
          <p style={{ margin: '0 0 0.5rem 0', color: '#00d2ff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>60-Day Rolling Median: {data['Median Wait']} days</p>
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
  };`;

if(content.includes('CustomDetailedTooltip')) {
   content = content.replace(targetFunction, newFunction);
   fs.writeFileSync('src/App.jsx', content);
   console.log('Tooltip successfully updated in App.jsx');
} else {
   console.log('Failed to find Tooltip text match');
}
