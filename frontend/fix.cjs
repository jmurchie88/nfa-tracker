const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const oldXAxis = `<XAxis dataKey="date" stroke="#95a5a6" tick={{fill: '#95a5a6'}} tickMargin={10} minTickGap={30}/>`;
const newXAxis = `<XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(tick) => new Date(tick).toLocaleDateString()} stroke="#95a5a6" tick={{fill: '#95a5a6'}} tickMargin={10} minTickGap={30}/>`;

const oldBrush = `<Brush dataKey="date" height={30} stroke="#C62828" fill="rgba(30, 31, 38, 0.5)" tickFormatter={() => ''} />`;
const newBrush = `<Brush dataKey="timestamp" height={30} stroke="#C62828" fill="rgba(30, 31, 38, 0.5)" tickFormatter={() => ''} />`;


let parts = content.split('<ComposedChart');
if (parts.length > 1) {
  parts[1] = parts[1].replace(oldXAxis, newXAxis);
  parts[1] = parts[1].replace(oldBrush, newBrush);
  
  content = parts.join('<ComposedChart');
  fs.writeFileSync('src/App.jsx', content);
  console.log('Fixed XAxis in ComposedChart!');
} else {
  console.log('Could not find ComposedChart');
}
