import requests
import pandas as pd
from io import StringIO
from datetime import date
import sys

def fetch_google_sheet_csv(url):
    response = requests.get(url)
    if response.status_code == 200:
        return response.text
    else:
        sys.exit("Unable to acquire remote Google Sheet")

def csv_to_dataframe(csv_data):
    if csv_data is not None:
        data_io = StringIO(csv_data)
        dataframe = pd.read_csv(data_io,index_col=False,header=0)
        return dataframe
    else:
        sys.exit("Unable to load CSV data to dataframe")

url = "https://docs.google.com/spreadsheets/d/1RsR8JOt8fcKIAbuv6ParmYTfSsUHwk3mEhVt0encK6g/pub?gid=1955807116&single=true&output=csv"
csv_data = fetch_google_sheet_csv(url)
df = csv_to_dataframe(csv_data)

df.rename(columns={'Approved Date (This is the date your stamp was approved)':'Approved Date',
                   'Pending Date (This is the date you submitted or the date the status turns to pending depending on the form you used)':'Pending Date',
                   'Days Taken to approve':'Wait Time',
                   'Trust or Individual':'Registrant'},inplace=True)
df = df[df['Wait Time'] != '-----']
df['Approved Date'] =  pd.to_datetime(df['Approved Date'],errors='coerce')
df['Pending Date'] =  pd.to_datetime(df['Pending Date'],errors='coerce')
df['Wait Time'] = pd.to_numeric(df['Wait Time'], errors='coerce')
df = df.dropna(subset=['Approved Date'])
df = df.dropna(subset=['Pending Date'])
df['Form Type'] = df['Form Type'].replace({'Form 4 - SilencerCo Kiosk': 'Form 4 - Silencer Shop Kiosk','Form 4': 'Form 4 - Paper'})
earliest_date = '2018-01-01'
latest_date = date.today()
earliest_date = pd.to_datetime(earliest_date)
latest_date = pd.to_datetime(latest_date)
df = df[df['Approved Date'] >= earliest_date]
df = df[df['Approved Date'] <= latest_date]
df['Wait Time'] = df.apply(
    lambda row: (row['Approved Date'] - row['Pending Date']).days if pd.isnull(row['Wait Time']) else row['Wait Time'],
    axis=1
)
df.set_index('Approved Date', inplace=True,drop=True)
df.sort_index(inplace=True)

grouped = df.groupby(["Form Type","Registrant"])
df['Median Wait 30'] = grouped["Wait Time"].transform(lambda x: x.rolling(window='30d').median())
df['Median Wait 60'] = grouped["Wait Time"].transform(lambda x: x.rolling(window='60d').median())
df['Median Wait 90'] = grouped["Wait Time"].transform(lambda x: x.rolling(window='90d').median())

# Handle NaN values mapping them to exact wait time fallback
for win in [30, 60, 90]:
    col = f'Median Wait {win}'
    df[col] = df.apply(lambda row: row['Wait Time'] if pd.isnull(row[col]) else row[col], axis=1)

import os
import json

# Pre-calculate Daily Standard Deviation for the detailed scatter plots
# We group by Date, Type and Registrant to get the "Daily" variance
std_grouped = df.groupby(['Approved Date', 'Form Type', 'Registrant'])['Wait Time'].std().fillna(0)

df.reset_index(inplace=True)
df['Approved Date'] = df['Approved Date'].dt.strftime('%Y-%m-%d')

# 1. Generate overview.json (Minimized)
# Only date, type, registrant, and the medians
overview_cols = ['Approved Date', 'Form Type', 'Registrant', 'Median Wait 30', 'Median Wait 60', 'Median Wait 90']
overview_df = df[overview_cols].groupby(['Approved Date', 'Form Type', 'Registrant']).first().reset_index()
overview_df.to_json('./frontend/public/overview.json', orient='records')

# 2. Generate Detailed Sub-files
detailed_dir = './frontend/public/detailed'
if not os.path.exists(detailed_dir):
    os.makedirs(detailed_dir)

# Helper to sanitize filenames
def sanitize(name):
    return name.replace(' ', '_').replace('-', '_').replace('/', '_').replace('(', '').replace(')', '')

# Group by Form and Registrant to split files
for (f_type, reg), sub_df in df.groupby(['Form Type', 'Registrant']):
    filename = f"{sanitize(f_type)}_{sanitize(reg)}.json"
    
    # Map in the pre-calculated Std Dev for each row based on its date
    detailed_rows = []
    for _, row in sub_df.iterrows():
        dt = row['Approved Date']
        # std_grouped is indexed by (Approved Date, Form Type, Registrant)
        # Note: Approved Date in std_grouped index is still a Timestamp, while dt is now a string.
        # We'll use the original timestamp for the lookup
        ts = pd.to_datetime(dt)
        std_val = std_grouped.get((ts, f_type, reg), 0)
        
        detailed_rows.append({
            'Approved Date': dt,
            'Wait Time': row['Wait Time'],
            'Median Wait 30': row['Median Wait 30'],
            'Median Wait 60': row['Median Wait 60'],
            'Median Wait 90': row['Median Wait 90'],
            'Std Dev': round(float(std_val), 1)
        })
    
    with open(os.path.join(detailed_dir, filename), 'w') as f:
        json.dump(detailed_rows, f)

# 3. Generate trend_cards.json
# Pre-calculate the "current" and "prev" values for each form type
trend_data = {}
latest_available_date = df['Approved Date'].max()
t_now = pd.to_datetime(latest_available_date)
t_30 = t_now - pd.Timedelta(days=30)
t_60 = t_now - pd.Timedelta(days=60)

for (f_type, reg), sub_df in df.groupby(['Form Type', 'Registrant']):
    sub_df['Approved Date DT'] = pd.to_datetime(sub_df['Approved Date'])
    
    last30 = sub_df[sub_df['Approved Date DT'] >= t_30]
    prev30 = sub_df[(sub_df['Approved Date DT'] >= t_60) & (sub_df['Approved Date DT'] < t_30)]
    
    latest_row = sub_df.iloc[-1]
    
    stats = {}
    for win in [30, 60, 90]:
        col = f'Median Wait {win}'
        current_val = last30[col].mean() if not last30.empty else latest_row[col]
        past_val = prev30[col].mean() if not prev30.empty else current_val
        
        delta = current_val - past_val
        trend = 'steady'
        if delta > 2: trend = 'up'
        elif delta < -2: trend = 'down'
        
        stats[win] = {
            'current': round(float(current_val)),
            'trend': trend,
            'delta': round(float(delta), 1)
        }
        
    if reg not in trend_data: trend_data[reg] = {}
    trend_data[reg][f_type] = stats

with open('./frontend/public/trends.json', 'w') as f:
    json.dump(trend_data, f)

# 4. Generate map_data.json
# Pre-aggregate by State and NFA Item Type
map_agg = {}

# We need the 'State' and 'Type of NFA item' columns which we didn't include in overview or detailed
# But we have the full 'df' here.
for _, row in df.iterrows():
    state = row['State']
    if not state or pd.isna(state) or str(state).strip() == '':
        continue
    
    state = str(state).strip()
    if state not in map_agg:
        map_agg[state] = {
            'total': 0,
            'Suppressor': 0,
            'Short Barreled Rifle': 0,
            'Machine Gun': 0,
            'Short Barreled Shotgun': 0,
            'Destructive Device': 0,
            'Any Other Weapon': 0
        }
    
    map_agg[state]['total'] += 1
    nfa_type = row['Type of NFA item']
    if nfa_type in map_agg[state]:
        map_agg[state][nfa_type] += 1

with open('./frontend/public/map_data.json', 'w') as f:
    json.dump(map_agg, f)