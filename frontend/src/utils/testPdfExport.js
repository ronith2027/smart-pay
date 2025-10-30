import jsPDF from 'jspdf';

export const generateSimpleTestPDF = () => {
  console.log('Creating simple test PDF...');
  console.log('jsPDF available:', typeof jsPDF);
  console.log('Browser check:', typeof window !== 'undefined');
  
  try {
    const doc = new jsPDF();
    console.log('jsPDF instance created:', doc);
    console.log('autoTable available:', typeof doc.autoTable);
    
    // Add simple text
    doc.setFontSize(20);
    doc.text('Transaction History Test', 20, 30);
    
    doc.setFontSize(12);
    doc.text('This is a test PDF to verify jsPDF is working.', 20, 50);
    doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, 70);
    
    console.log('Text added to PDF');
    
    // Save the PDF
    const filename = 'test-pdf.pdf';
    doc.save(filename);
    console.log('Test PDF saved successfully!');
    
    return filename;
  } catch (error) {
    console.error('Error creating test PDF:', error);
    throw error;
  }
};