import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const generateTransactionPDF = (transactions, startDate, endDate, userInfo = {}) => {
  console.log('generateTransactionPDF called with:', { 
    transactionsCount: transactions.length, 
    startDate, 
    endDate,
    firstTransaction: transactions[0],
    isBrowser
  });
  
  if (!isBrowser) {
    throw new Error('PDF generation is only available in browser environment');
  }
  
  try {
    const doc = new jsPDF();
    console.log('jsPDF instance created successfully');
    
    // Set up fonts and colors
    doc.setFont('helvetica');
    console.log('Font set successfully');
  
  // Add header with company/user info
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55); // gray-800
  doc.text('Transaction History Report', 20, 30);
  
  // Add date range
  doc.setFontSize(12);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(`Period: ${formatDateForPDF(startDate)} to ${formatDateForPDF(endDate)}`, 20, 45);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 20, 55);
  
  // Add summary info
  const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const successfulTransactions = transactions.filter(t => t.status === 'SUCCESS').length;
  
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99); // gray-600
  doc.text(`Total Transactions: ${transactions.length}`, 20, 70);
  doc.text(`Successful: ${successfulTransactions}`, 100, 70);
  doc.text(`Total Amount: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 160, 70);
  
  // Prepare table data
  const tableColumns = [
    { header: 'Type', dataKey: 'type' },
    { header: 'Amount', dataKey: 'amount' },
    { header: 'Note', dataKey: 'note' },
    { header: 'Date', dataKey: 'date' }
  ];
  
    const tableData = transactions.map(transaction => ({
      type: getTransactionTypeDisplay(transaction.transaction_type),
      amount: formatCurrencyForPDF(transaction.amount),
      note: transaction.description || `Added to wallet from ${transaction.source_name || 'Bank'}`,
      date: formatDateTimeForPDF(transaction.transaction_date)
    }));
    
    console.log('Table data prepared:', tableData.slice(0, 2)); // Log first 2 rows
    
    // Check if autoTable is available
    if (typeof doc.autoTable !== 'function') {
      console.error('autoTable not available on doc object');
      // Fallback: create simple table manually
      createSimpleTable(doc, tableData);
    } else {
      // Generate table with autoTable
      console.log('Using autoTable to generate table');
      doc.autoTable({
        columns: tableColumns,
        body: tableData,
    startY: 85,
    styles: {
      fontSize: 9,
      cellPadding: 8,
      lineColor: [229, 231, 235], // gray-200
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [249, 250, 251], // gray-50
      textColor: [107, 114, 128], // gray-500
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      textColor: [31, 41, 55], // gray-800
      fillColor: [255, 255, 255], // white
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // gray-50
    },
    columnStyles: {
      type: {
        cellWidth: 45,
        fontStyle: 'bold'
      },
      amount: {
        cellWidth: 35,
        halign: 'right',
        textColor: [37, 99, 235], // blue-600 for amounts
        fontStyle: 'bold'
      },
      note: {
        cellWidth: 80,
        textColor: [107, 114, 128] // gray-500
      },
      date: {
        cellWidth: 40,
        textColor: [107, 114, 128], // gray-500
        fontSize: 8
      }
    },
        margin: { left: 20, right: 20 },
        tableWidth: 'auto',
        showHead: 'firstPage',
        theme: 'plain'
      });
    }
    
    console.log('Table generation completed');
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // gray-400
    
    // Page number
    doc.text(`Page ${i} of ${pageCount}`, 
      doc.internal.pageSize.getWidth() - 40, 
      doc.internal.pageSize.getHeight() - 20
    );
    
    // Watermark/footer text
    doc.text('Payment History App - Confidential', 20, doc.internal.pageSize.getHeight() - 20);
  }
  
    // Generate filename
    const filename = `transaction-history-${startDate}-to-${endDate}.pdf`;
    console.log('Generated filename:', filename);
    
    // Save the PDF
    console.log('Attempting to save PDF...');
    doc.save(filename);
    console.log('PDF saved successfully!');
    
    return filename;
  } catch (error) {
    console.error('Error in generateTransactionPDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

// Helper functions
const formatDateForPDF = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateTimeForPDF = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatCurrencyForPDF = (amount) => {
  return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

const getTransactionTypeDisplay = (transactionType) => {
  const typeMap = {
    'WALLET_FUND': 'Wallet Fund',
    'WALLET_TRANSFER': 'Wallet Transfer',
    'BILL_PAYMENT_WALLET': 'Bill Payment',
    'BILL_PAYMENT_BANK': 'Bill Payment',
    'ACCOUNT_TRANSFER': 'Account Transfer',
    'ACCOUNT_DEPOSIT': 'Account Deposit',
    'ACCOUNT_WITHDRAWAL': 'Account Withdrawal',
    'WALLET_TO_ACCOUNT': 'Wallet to Account',
    'ACCOUNT_TO_WALLET': 'Account to Wallet'
  };
  
  return typeMap[transactionType] || transactionType;
};

// Fallback function to create simple table without autoTable
const createSimpleTable = (doc, tableData) => {
  console.log('Creating simple table fallback');
  
  let y = 90;
  
  // Table headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Type', 20, y);
  doc.text('Amount', 80, y);
  doc.text('Note', 120, y);
  doc.text('Date', 180, y);
  
  y += 10;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  tableData.forEach((row, index) => {
    if (y > 270) { // Start new page if needed
      doc.addPage();
      y = 30;
    }
    
    doc.text(String(row.type), 20, y);
    doc.text(String(row.amount), 80, y);
    doc.text(String(row.note).substring(0, 30), 120, y); // Truncate long notes
    doc.text(String(row.date), 180, y);
    
    y += 12;
  });
};
