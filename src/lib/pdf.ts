import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Report {
  campaign: string;
  total: number;
  delivered: number;
  read: number;
  failed?: number;
  date?: string;
  status: 'completed' | 'running' | 'failed' | 'scheduled' | 'ativo' | 'paused' | 'cancelled';
  responseRate: number;
}

export const generatePDF = (reports: Report[], dateRange: [string, string]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add logo and header
  doc.setFillColor(147, 51, 234); // primary-600
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Add title
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('ConecteZap', 15, 25);
  
  doc.setFontSize(14);
  doc.text('Relatório de Campanhas', pageWidth - 15, 25, { align: 'right' });

  // Add date range
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55); // gray-800
  const dateText = dateRange[0] && dateRange[1]
    ? `Período: ${format(new Date(dateRange[0]), 'dd/MM/yyyy', { locale: ptBR })} até ${format(new Date(dateRange[1]), 'dd/MM/yyyy', { locale: ptBR })}`
    : `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
  doc.text(dateText, pageWidth / 2, 50, { align: 'center' });

  // Add summary statistics
  const totalMessages = reports.reduce((sum, report) => sum + report.total, 0);
  const totalDelivered = reports.reduce((sum, report) => sum + report.delivered, 0);
  const totalRead = reports.reduce((sum, report) => sum + report.read, 0);
  const avgResponseRate = reports.reduce((sum, report) => sum + (report.responseRate || 0), 0) / reports.length;

  const stats = [
    ['Total de Mensagens', totalMessages.toLocaleString()],
    ['Taxa de Entrega', `${((totalDelivered / totalMessages) * 100).toFixed(1)}%`],
    ['Taxa de Leitura', `${((totalRead / totalDelivered) * 100).toFixed(1)}%`],
    ['Taxa de Resposta Média', `${avgResponseRate.toFixed(1)}%`]
  ];

  // Add stats table
  autoTable(doc, {
    startY: 60,
    head: [['Métrica', 'Valor']],
    body: stats,
    theme: 'grid',
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: 15 }
  });

  // Add main table
  const tableData = reports.map(report => [
    report.campaign,
    report.total.toLocaleString(),
    `${report.delivered.toLocaleString()} (${((report.delivered / report.total) * 100).toFixed(1)}%)`,
    `${report.read.toLocaleString()} (${((report.read / report.delivered) * 100).toFixed(1)}%)`,
    `${report.responseRate.toFixed(1)}%`,
    report.date ? format(new Date(report.date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A',
    report.status === 'completed' ? 'Concluído' :
    report.status === 'running' ? 'Em andamento' :
    report.status === 'scheduled' ? 'Agendado' :
    report.status === 'paused' ? 'Pausado' :
    report.status === 'cancelled' ? 'Cancelado' :
    report.status === 'failed' ? 'Falhou' :
    report.status === 'ativo' ? 'Ativo' : 'Desconhecido'
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Campanha', 'Total', 'Entregues', 'Lidas', 'Resp.', 'Data', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 25, halign: 'center' }
    }
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // gray-500
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`relatorio-campanhas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
};