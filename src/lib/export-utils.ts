import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SavedCarrierWithDetails {
  id: string;
  notes: string | null;
  created_at: string;
  carriers: {
    id: string;
    dot_number: string;
    legal_name: string;
    dba_name: string | null;
    physical_address: string | null;
    phone: string | null;
    safety_rating: string | null;
    insurance_status: string | null;
    authority_status: string | null;
    state: string | null;
    city: string | null;
    vehicle_count: number | null;
    driver_count: number | null;
    entity_type: string | null;
  };
}

// CSV Export
export function exportToCSV(savedCarriers: SavedCarrierWithDetails[], filename = 'saved-carriers.csv') {
  const headers = [
    'DOT Number',
    'Legal Name', 
    'City',
    'State',
    'Phone',
    'Safety Rating',
    'Insurance Status',
    'Authority Status',
    'Vehicle Count',
    'Physical Address',
    'Notes',
    'Date Saved'
  ];

  const rows = savedCarriers.map(item => [
    item.carriers.dot_number,
    item.carriers.legal_name,
    item.carriers.city || '',
    item.carriers.state || '',
    item.carriers.phone || '',
    item.carriers.safety_rating || '',
    item.carriers.insurance_status || '',
    item.carriers.authority_status || '',
    item.carriers.vehicle_count || '',
    item.carriers.physical_address || '',
    item.notes || '',
    new Date(item.created_at).toLocaleDateString()
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  downloadFile(csvContent, filename, 'text/csv');
}

// Excel Export
export function exportToExcel(savedCarriers: SavedCarrierWithDetails[], filename = 'saved-carriers.xlsx') {
  const data = savedCarriers.map(item => ({
    'DOT Number': item.carriers.dot_number,
    'Legal Name': item.carriers.legal_name,
    'City': item.carriers.city || '',
    'State': item.carriers.state || '',
    'Phone': item.carriers.phone || '',
    'Safety Rating': item.carriers.safety_rating || '',
    'Insurance Status': item.carriers.insurance_status || '',
    'Authority Status': item.carriers.authority_status || '',
    'Vehicle Count': item.carriers.vehicle_count || '',
    'Physical Address': item.carriers.physical_address || '',
    'Notes': item.notes || '',
    'Date Saved': new Date(item.created_at).toLocaleDateString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Auto-size columns
  const maxWidth = 50;
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxLength = Math.max(
      key.length,
      ...data.map(row => String(row[key as keyof typeof row]).length)
    );
    return { wch: Math.min(maxLength + 2, maxWidth) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Saved Carriers');
  XLSX.writeFile(workbook, filename);
}

// PDF Export
export function exportToPDF(savedCarriers: SavedCarrierWithDetails[], filename = 'saved-carriers.pdf') {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text('CarrierTracker - Saved Carriers Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
  doc.text(`Total Carriers: ${savedCarriers.length}`, 20, 40);

  // Prepare table data
  const tableHeaders = [
    'DOT Number',
    'Legal Name',
    'Location',
    'Safety Rating',
    'Insurance',
    'Authority',
    'Vehicle Count'
  ];

  const tableData = savedCarriers.map(item => [
    item.carriers.dot_number,
    item.carriers.legal_name,
    item.carriers.city && item.carriers.state 
      ? `${item.carriers.city}, ${item.carriers.state}` 
      : item.carriers.state || '',
    item.carriers.safety_rating || '',
    item.carriers.insurance_status || '',
    item.carriers.authority_status || '',
    item.carriers.vehicle_count ? String(item.carriers.vehicle_count) : ''
  ]);

  // Add table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 50,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue-600
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray-50
    },
    columnStyles: {
      0: { cellWidth: 20 }, // DOT Number
      1: { cellWidth: 35 }, // Legal Name
      2: { cellWidth: 25 }, // Location
      3: { cellWidth: 20 }, // Safety Rating
      4: { cellWidth: 18 }, // Insurance
      5: { cellWidth: 18 }, // Authority
      6: { cellWidth: 15 }, // Vehicle Count
    },
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(filename);
}

// Helper function to download files
function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}