import pandas as pd
import sys
import matplotlib.pyplot as plt

def plot_graph(data, x_column, y_neumerator, y_denominator, title, xlabel, ylabel):
    plt.figure(figsize=(10, 7.5))  # Adjust the figure size to fit the screen better
    server_types = data['serverType'].unique()
    bar_width = 0.1
    index = range(len(data[x_column].unique()))
    
    for i, server_type in enumerate(server_types):
        group = data[data['serverType'] == server_type]
        ynAggreaget = group.groupby(x_column)[y_neumerator].sum()
        ydAggregate = group.groupby(x_column)[y_denominator].sum()
        
        # Align indices
        common_index = ynAggreaget.index.intersection(ydAggregate.index)
        ynAggreaget = ynAggreaget.loc[common_index]
        ydAggregate = ydAggregate.loc[common_index]
        
        y_column = 100 * ynAggreaget / ydAggregate
        plt.bar([p + (bar_width * i) for p in index], y_column, bar_width, label=server_type)  # Adjust bar positions for separation
    
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.xticks([p + (bar_width * (len(server_types) - 1) / 2) for p in index], common_index)
    plt.legend(title='Server Type')
    plt.tight_layout()  # Adjust layout to fit everything nicely
    plt.show()

def main(csv_file):
    # Read the CSV file
    data = pd.read_csv(csv_file)
    
    plot_graph(data, "establishedConnectionsExpected", "transactionsActual", "transactionsExpected", "Transmit Efficiency vs Established Connections", "Established Connections", "Transmit Efficiency")
    plot_graph(data, "publishersPerTopic", "transactionsActual", "transactionsExpected", "Transmit Efficiency vs Publishers Per Topic", "Publishers Per Topic", "Transmit Efficiency")
    plot_graph(data, "subscribersPerTopic", "transactionsActual", "transactionsExpected", "Transmit Efficiency vs Subscribers Per Topic", "Subscribers Per Topic", "Transmit Efficiency")
    
    plot_graph(data, "establishedConnectionsExpected", "receivedMessagesActual", "receivedMessagesExpected", "Receive Efficiency vs Established Connections", "Established Connections", "Receive Efficiency")
    plot_graph(data, "publishersPerTopic", "receivedMessagesActual", "receivedMessagesExpected", "Receive Efficiency vs Publishers Per Topic", "Publishers Per Topic", "Receive Efficiency")
    plot_graph(data, "subscribersPerTopic", "receivedMessagesActual", "receivedMessagesExpected", "Receive Efficiency vs Subscribers Per Topic", "Subscribers Per Topic", "Receive Efficiency")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python analyze_data.py <csv_file>")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    main(csv_file)
