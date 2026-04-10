import requests
import pandas as pd
from io import StringIO
from datetime import date

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

df.reset_index(inplace=True)
df['Approved Date'] = df['Approved Date'].dt.strftime('%Y-%m-%d')
df.to_json('./frontend/public/data.json', orient='records')