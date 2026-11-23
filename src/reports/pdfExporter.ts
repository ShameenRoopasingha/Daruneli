import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { aggregateH509Data, type H509ReportParams, type H509ReportData } from './h509Aggregator';
import { renderH509Html } from './h509HtmlTemplate';

export async function generateH509Pdf(data: H509ReportData): Promise<string> {
  const html = renderH509Html(data);
  const { uri } = await Print.printToFileAsync({
    html,
    margins: {
      left: 20,
      top: 20,
      right: 20,
      bottom: 20,
    },
  });
  return uri;
}

export async function shareH509Pdf(pdfUri: string, dialogTitle: string = 'Share H509 Monthly Return PDF'): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('File sharing is not available on this device platform.');
  }

  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    UTI: '.pdf',
    dialogTitle,
  });
}

export async function printH509Directly(data: H509ReportData): Promise<void> {
  const html = renderH509Html(data);
  await Print.printAsync({ html });
}

export async function exportAndShareH509(params: H509ReportParams): Promise<{ uri: string; data: H509ReportData }> {
  const data = await aggregateH509Data(params);
  const uri = await generateH509Pdf(data);
  await shareH509Pdf(uri, `H509_Return_${data.metadata.monthName}_${data.metadata.year}.pdf`);
  return { uri, data };
}
