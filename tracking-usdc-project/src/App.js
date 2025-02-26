import logo from './logo.svg';
import './App.css';
import { Client, fetchExchange } from 'urql';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const APIURL = "https://api.studio.thegraph.com/query/105433/usdctracker/version/latest";

const query = `
{
  transfers(first: 5, orderBy: timestamp, orderDirection: desc) {
    id
    from {
      id
    }
    to {
      id
    }
    value
    timestamp
  }
  accounts(first: 5, orderBy: balance, orderDirection: desc) {
    id
    balance
    transfersSent {
      id
    }
    transfersReceived {
      id
    }
  }
}
`;

const client = new Client({
  url: APIURL,
  exchanges: [fetchExchange]
});

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountHistory, setAccountHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Use useRef to store Chart
  const dailyVolumeChartRef = useRef(null);
  const accountHistoryChartRef = useRef(null);

  // Use useCallback to pack fetchData
  const fetchData = useCallback(async () => {
    try {
      const response = await client.query(query).toPromise();
      console.log('response', response);
      
      if (response.error) {
        setError(response.error);
      } else {
        setData(response.data);
      }
    } catch (err) {
      console.error("Error: ", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize daily volume chart
  function initDailyVolumeChart(dailyData) {
    const ctx = document.getElementById('dailyVolumeChart');
    if (!ctx) return;
    
    // destroy previous chart
    if (dailyVolumeChartRef.current) {
      dailyVolumeChartRef.current.destroy();
    }
    
    const chartData = {
      labels: dailyData.map(item => `Day ${item.date}`),
      datasets: [
        {
          label: 'Daily Volume',
          data: dailyData.map(item => Number(item.volume) / 1e6),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Transfer Count',
          data: dailyData.map(item => Number(item.transferCount)),
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    };
    
    // Save new chart to ref
    dailyVolumeChartRef.current = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Volume (in millions USDC)'
            }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            title: {
              display: true,
              text: 'Transaction Count'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }

  // Get account history
  async function fetchAccountHistory(accountId) {
    setHistoryLoading(true);
    
    const accountHistoryQuery = `
    {
      accountBalances(
        first: 10,
        orderBy: timestamp,
        orderDirection: desc,
        where: { account: "${accountId}" }
      ) {
        id
        balance
        timestamp
        blockNumber
      }
    }
    `;
    
    try {
      const response = await client.query(accountHistoryQuery).toPromise();
      
      if (response.error) {
        console.error("Error fetching account history:", response.error);
      } else {
        setAccountHistory(response.data.accountBalances || []);
        setSelectedAccount(accountId);
        
        if (response.data.accountBalances && response.data.accountBalances.length > 0) {
          setTimeout(() => {
            initAccountHistoryChart(response.data.accountBalances);
          }, 100);
        }
      }
    } catch (err) {
      console.error("Error fetching account history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Initialize account history chart
  function initAccountHistoryChart(historyData) {
    const ctx = document.getElementById('accountHistoryChart');
    if (!ctx || !historyData || historyData.length === 0) return;
    
    // destroy precious chart
    if (accountHistoryChartRef.current) {
      accountHistoryChartRef.current.destroy();
    }
    
    const chartData = {
      labels: historyData.map(item => {
        const date = new Date(Number(item.timestamp) * 1000);
        return date.toLocaleDateString();
      }),
      datasets: [{
        label: 'Account Balance',
        data: historyData.map(item => Number(item.balance) / 1e6),
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        tension: 0.4
      }]
    };
    
    // Save new chart to ref
    accountHistoryChartRef.current = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Balance (in millions USDC)'
            }
          }
        }
      }
    });
  }

  useEffect(() => {
    fetchData();
    
    // Clean up 
    return () => {
      if (dailyVolumeChartRef.current) {
        dailyVolumeChartRef.current.destroy();
      }
      if (accountHistoryChartRef.current) {
        accountHistoryChartRef.current.destroy();
      }
    };
  }, [fetchData]);

  // Reformat numbers
  function formatNumber(num) {
    if (!num) return "0";
    const value = Number(num);
    
    if (value >= 1e9) {
      return (value / 1e9).toFixed(2) + "B";
    } else if (value >= 1e6) {
      return (value / 1e6).toFixed(2) + "M";
    } else if (value >= 1e3) {
      return (value / 1e3).toFixed(2) + "K";
    }
    
    return value.toString();
  }

  // make timestamp
  function formatTimestamp(timestamp) {
    if (!timestamp) return "";
    return new Date(Number(timestamp) * 1000).toLocaleString();
  }

  // Handle click
  const handleAccountClick = (e, accountId) => {
    e.preventDefault();
    fetchAccountHistory(accountId);
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>USDC Tracker Dashboard</h1>
        
        {loading && <p>Loading...</p>}
        {error && <p>Error: {JSON.stringify(error)}</p>}
        
        {data && data.transfers && data.transfers.length > 0 && (
          <div className="data-container">
            <h3>Recent Transfers</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.transfers.map(transfer => (
                  <tr key={transfer.id}>
                    <td>
                      <button 
                        onClick={(e) => handleAccountClick(e, transfer.from.id)}
                        className="address-link"
                      >
                        {transfer.from.id.substring(0, 10)}...
                      </button>
                    </td>
                    <td>
                      <button 
                        onClick={(e) => handleAccountClick(e, transfer.to.id)}
                        className="address-link"
                      >
                        {transfer.to.id.substring(0, 10)}...
                      </button>
                    </td>
                    <td className="amount-cell">
                      {formatNumber(transfer.value)} USDC
                    </td>
                    <td className="timestamp-cell">
                      {formatTimestamp(transfer.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {data && data.accounts && data.accounts.length > 0 && (
          <div className="data-container">
            <h3>Top Accounts</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Balance</th>
                  <th>Sent</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map(account => (
                  <tr key={account.id}>
                    <td>
                      {account.id.substring(0, 10)}...
                    </td>
                    <td className="amount-cell">
                      {formatNumber(account.balance)} USDC
                    </td>
                    <td className="count-cell">
                      {account.transfersSent.length}
                    </td>
                    <td className="count-cell">
                      {account.transfersReceived.length}
                    </td>
                    <td>
                      <button 
                        onClick={() => fetchAccountHistory(account.id)}
                        className="view-button"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {selectedAccount && (
          <div className="account-history">
            <h3>Account History: {selectedAccount.substring(0, 10)}...</h3>
            {historyLoading ? (
              <p>Loading account history...</p>
            ) : (
              <>
                {accountHistory && accountHistory.length > 0 ? (
                  <>
                    <div className="chart-container">
                      <canvas id="accountHistoryChart" width="400" height="200"></canvas>
                    </div>
                    
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Block</th>
                          <th>Timestamp</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountHistory.map(item => (
                          <tr key={item.id}>
                            <td>{item.blockNumber}</td>
                            <td>{formatTimestamp(item.timestamp)}</td>
                            <td className="amount-cell">{formatNumber(item.balance)} USDC</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p>No history data available for this account.</p>
                )}
              </>
            )}
            <button 
              onClick={() => {
                setSelectedAccount(null);
                setAccountHistory(null);
                // Clean up history chart
                if (accountHistoryChartRef.current) {
                  accountHistoryChartRef.current.destroy();
                  accountHistoryChartRef.current = null;
                }
              }}
              className="close-button"
            >
              Close History View
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;