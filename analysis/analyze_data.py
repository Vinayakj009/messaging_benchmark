import pandas as pd
import sys
import matplotlib.pyplot as plt
from tabulate import tabulate
import random

# Load the CSV file
if len(sys.argv) < 2:
    print("Usage: python analyze_data.py <file_path> [exclude_server_type1 exclude_server_type2 ...]")
    sys.exit(1)

file_path = sys.argv[1]
exclude_server_types = sys.argv[2:]

data = pd.read_csv(file_path)

# Filter out the server types to be excluded
if exclude_server_types:
    data = data[~data['serverType'].isin(exclude_server_types)]

# Group by serverType and find the max throughput and average latency
grouped = data.groupby('serverType').agg({
    'totalLatency': 'sum',
    'receivedMessagesActual': 'sum',
    'transactionsActual': 'sum',
    'runTime': 'sum',
    'maxLatency': 'max',
}).reset_index()

# Calculate average latency (totalLatency / receivedMessagesActual)
grouped['averageLatency'] = grouped['totalLatency'] / grouped['receivedMessagesActual']


# Calculate average throughput (receivedMessagesActual / runTime)
grouped['throughput'] = grouped['receivedMessagesActual'] / grouped['runTime']

# Rename columns
grouped.rename(columns={
    'receivedMessagesActual': 'received',
    'transactionsActual': 'transmitted'
}, inplace=True)

# Drop the totalLatency column
grouped.drop(columns=['totalLatency'], inplace=True)

# Drop the totalLatency column
grouped.drop(columns=['runTime'], inplace=True)

# Display the final data as a table
# Shuffle the rows randomly
grouped = grouped.sample(frac=1).reset_index(drop=True)

# Display the final data as a table
print(tabulate(grouped, headers='keys', tablefmt='psql', showindex=False))
