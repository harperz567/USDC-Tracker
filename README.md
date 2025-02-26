# USDC Tracker
## 
This project are combained with two parts, tracking-usdc-project for the frontend and usdctracker for the backend

# USDC Tracker Subgraph(backend)

A subgraph built on The Graph protocol for indexing USDC token transfers on Ethereum. This subgraph tracks transfer events, maintains account balances, and generates statistical data for analytical purposes.

## Features

- Index USDC token transfer events
- Track account balances
- Generate aggregated statistics
- Record daily transaction volumes
- Store historical account balance changes

### Key Files

schema.graphql: Defines the data model for the subgraph

subgraph.yaml: Configures data sources and event handlers

src/track-tokens.ts: Contains the event handling logic


### Notes

The subgraph starts indexing from block 21919621

USDC contract address: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

# tracking-usdc-project(frontend)
A React-based dashboard that uses The Graph protocol to track and visualize USDC token transfers on Ethereum.

## Features

View recent USDC transfers
Explore account balances and transaction history
Visualize transaction data with interactive charts
Track account balance history

### Quick Start

Install dependencies

npm install

Start the development server

npm run start

### Development

Update the Graph API endpoint in App.js if needed
Make sure Chart.js is installed to enable visualizations
Deploy updates to the subgraph when adding new entities
