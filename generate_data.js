const fs = require('fs');
const path = require('path');

const outDir = 'd:/Toon/My Doc/Classmate/Madina/Risk/test_data';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 1. Loan Portfolio
const numClients = 1000;
const interestRate = 0.18; // 18% annual interest
let loanCsv = 'ClientID,DisbursementDate,LoanAmount_Rwf,AnnualInterestRate,ExpectedRepayment_Rwf,ActualRepayment_Rwf,DefaultStatus\n';

let monthlyDisbursements = new Array(12).fill(0);

for(let i=0; i<numClients; i++) {
  const clientId = `CL-${1000+i}`;
  
  // Distribute over the year
  const monthIdx = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  const date = `2024-${(monthIdx+1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // Loan amount between 100k and 5M Rwf
  const loanAmt = Math.floor(Math.random() * 4900000 + 100000); 
  monthlyDisbursements[monthIdx] += loanAmt;
  
  const expected = loanAmt * (1 + interestRate);
  
  // 12% chance of default
  const isDefault = Math.random() > 0.88 ? 1 : 0;
  // If default, they pay back a random amount between 10% and 60% of expected
  const actual = isDefault ? expected * (Math.random() * 0.5 + 0.1) : expected;
  
  loanCsv += `${clientId},${date},${loanAmt},${interestRate},${expected.toFixed(2)},${actual.toFixed(2)},${isDefault}\n`;
}
fs.writeFileSync(path.join(outDir, 'loan_portfolio_history.csv'), loanCsv);

// 2. Liquidity and Capital
let liqCsv = 'Month,TotalCapital_Rwf,TotalDisbursed_Rwf,RemainingLiquidity_Rwf,StatutoryReserveLimit_Rwf,RiskLevel\n';
let initialCapital = 1500000000; // 1.5 Billion Rwf starting capital
let currentLiquidity = initialCapital;
const reserveRequirement = 0.20; // Must hold 20% of capital in reserve

for(let month=0; month<12; month++) {
  const date = `2024-${(month+1).toString().padStart(2, '0')}-28`;
  const disbursedThisMonth = monthlyDisbursements[month];
  
  // Money goes out for loans
  currentLiquidity -= disbursedThisMonth;
  
  // Money comes in from deposits and early repayments
  const deposits = Math.floor(Math.random() * 100000000 + 50000000); 
  currentLiquidity += deposits;
  
  const reserveLimit = initialCapital * reserveRequirement;
  
  let riskLevel = 'Low';
  if (currentLiquidity < reserveLimit * 1.5) riskLevel = 'Moderate';
  if (currentLiquidity < reserveLimit * 1.1) riskLevel = 'High';
  if (currentLiquidity < reserveLimit) riskLevel = 'Critical';
  
  liqCsv += `${date},${initialCapital},${disbursedThisMonth},${currentLiquidity},${reserveLimit},${riskLevel}\n`;
}
fs.writeFileSync(path.join(outDir, 'microfinance_liquidity_reserves.csv'), liqCsv);

console.log('Test data generated successfully in test_data folder.');
