import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';

export default function OverviewChart({ 
  overviewData, 
  useLogScale, 
  formTypes, 
  hiddenSeries, 
  colors, 
  renderLegend 
}) {
  return (
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
             isAnimationActive={false}
           />
        ))}
        <Brush dataKey="date" height={30} stroke="#3a7bd5" fill="rgba(30, 31, 38, 0.5)" tickFormatter={() => ''} />
      </LineChart>
    </ResponsiveContainer>
  );
}
