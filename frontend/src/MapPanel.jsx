import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { scaleLinear } from 'd3-scale';
import { Map as MapIcon } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export default function MapPanel({ data }) {

  const stateData = useMemo(() => {
    const agg = {};
    data.forEach(item => {
      const stateName = item.State;
      if (!stateName || stateName.trim() === '') return;
      if (!agg[stateName]) {
        agg[stateName] = {
          total: 0,
          Suppressor: 0,
          'Short Barreled Rifle': 0,
          'Machine Gun': 0,
          'Short Barreled Shotgun': 0,
          'Destructive Device': 0,
          'Any Other Weapon': 0
        };
      }
      agg[stateName].total += 1;
      const type = item['Type of NFA item'];
      if (type && agg[stateName][type] !== undefined) {
          agg[stateName][type] += 1;
      }
    });
    return agg;
  }, [data]);

  const maxTotal = useMemo(() => {
    return Math.max(1, ...Object.values(stateData).map(d => d.total));
  }, [stateData]);

  // Using a custom dark cyan/blue scale.
  // 0 gets background, max gets bright cyan.
  const colorScale = scaleLinear()
    .domain([0, maxTotal])
    .range(["#1a1f2e", "#00d2ff"]); // 1a1f2e is slightly lighter than our background for contrast

  const buildTooltipText = (stateName) => {
    const d = stateData[stateName];
    if (!d) {
        return `
            <div style="text-align: left; padding: 0.25rem;">
                <span style="font-weight: bold; color: #C62828; font-size: 1.1rem; display: block;">${stateName}</span>
                <span style="color: rgba(255,255,255,0.5);">No Data Available</span>
            </div>
        `;
    }
    return `
      <div style="text-align: left; min-width: 150px; padding: 0.25rem;">
        <span style="font-weight: 800; color: #00d2ff; font-size: 1.2rem; display: block; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 0.4rem;">${stateName}</span>
        <div style="margin-bottom: 0.5rem; font-size: 0.95rem;">Total Found: <b style="color: #ffffff;">${d.total.toLocaleString()}</b></div>
        ${d.Suppressor > 0 ? `<div style="color: #00e676; font-size: 0.85rem; margin-bottom: 0.2rem;">Suppressor: <b>${d.Suppressor.toLocaleString()}</b></div>` : ''}
        ${d['Short Barreled Rifle'] > 0 ? `<div style="color: #C62828; font-size: 0.85rem; margin-bottom: 0.2rem;">SBR: <b>${d['Short Barreled Rifle'].toLocaleString()}</b></div>` : ''}
        ${d['Short Barreled Shotgun'] > 0 ? `<div style="color: #B0BEC5; font-size: 0.85rem; margin-bottom: 0.2rem;">SBS: <b>${d['Short Barreled Shotgun'].toLocaleString()}</b></div>` : ''}
        ${d['Machine Gun'] > 0 ? `<div style="color: #F44336; font-size: 0.85rem; margin-bottom: 0.2rem;">Machine Gun: <b>${d['Machine Gun'].toLocaleString()}</b></div>` : ''}
        ${d['Destructive Device'] > 0 ? `<div style="color: #FF5722; font-size: 0.85rem; margin-bottom: 0.2rem;">DD: <b>${d['Destructive Device'].toLocaleString()}</b></div>` : ''}
        ${d['Any Other Weapon'] > 0 ? `<div style="color: #b8bb86; font-size: 0.85rem; margin-bottom: 0.2rem;">AOW: <b>${d['Any Other Weapon'].toLocaleString()}</b></div>` : ''}
      </div>
    `;
  };

  return (
    <section className="glass-panel" style={{ marginTop: '2rem' }}>
      <div className="panel-header" style={{ marginBottom: '1rem' }}>
        <h2><MapIcon size={20} color="#00e676" /> NFA Submissions Heat Map <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem'}}>(Crowdsourced Geographic Distribution)</span></h2>
      </div>
      <div style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        <ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 1000 }} style={{ width: "100%", height: "auto" }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => {
                const stateName = geo.properties.name;
                const d = stateData[stateName];
                const count = d ? d.total : 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    data-tooltip-id="map-tooltip"
                    data-tooltip-html={buildTooltipText(stateName)}
                    style={{
                      default: {
                        fill: count > 0 ? colorScale(count) : "#1E1F26",
                        stroke: "rgba(255,255,255,0.05)",
                        strokeWidth: 0.75,
                        outline: "none",
                        transition: "all 250ms"
                      },
                      hover: {
                        fill: "#b8bb86",
                        stroke: "rgba(255,255,255,0.5)",
                        strokeWidth: 1.5,
                        outline: "none",
                        cursor: "pointer",
                        transition: "all 250ms"
                      },
                      pressed: {
                        fill: "#C62828",
                        outline: "none"
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        <Tooltip 
           id="map-tooltip" 
           style={{ backgroundColor: 'rgba(11, 12, 16, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', zIndex: 1000, pointerEvents: 'none', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}
        />
      </div>
    </section>
  );
}
