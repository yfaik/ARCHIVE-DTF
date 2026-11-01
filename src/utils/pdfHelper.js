import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * Downloads a PDF file from the server using Axios with responseType: 'blob'
 * and automatically triggers the browser download.
 *
 * @param {string} type - 'arrive' or 'depart' (or plural)
 * @param {Object} courrier - Courrier object containing pdf_filename, pdf_original_name, reference
 */
export async function downloadPdfFile(type = 'arrive', courrier) {
  const rawFilename =
    courrier?.pdf_filename ||
    courrier?.pieceJointe ||
    courrier?.piece_jointe ||
    courrier?.filename ||
    courrier?.file ||
    '';
  const filename = rawFilename ? String(rawFilename).split(/[/\\]/).pop().split('?')[0] : '';

  if (!filename) {
    toast.error('Aucun fichier PDF n est associé à ce courrier.');
    return;
  }

  const isDepart = courrier?.category === 'depart' || (courrier?.destinataire && !courrier?.expediteur) || type === 'depart' || type === 'departs';
  const cleanType = isDepart ? 'depart' : 'arrive';
  const originalName = courrier.pdf_original_name || courrier.reference ? `${courrier.reference}.pdf` : filename;
  const url = `/mails/pdf/${cleanType}/${encodeURIComponent(filename)}?download=true`;

  try {
    const response = await api.get(url, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);

    toast.success(`Téléchargement de "${originalName}" démarré.`);
  } catch (error) {
    console.error('Erreur lors du téléchargement du PDF:', error);
    let errorMessage = 'Impossible de télécharger le fichier PDF.';

    if (error.response && error.response.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        errorMessage = json.error || errorMessage;
      } catch (e) {
        // Fallback to default
      }
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }

    toast.error(errorMessage);
  }
}

export function getPdfStreamUrl(type = 'arrive', filename) {
  if (!filename) return '';
  const isDepart = type === 'depart' || type === 'departs';
  const cleanType = isDepart ? 'depart' : 'arrive';
  const cleanFilename = String(filename).split(/[/\\]/).pop().split('?')[0];
  
  const rawUrl = import.meta.env.VITE_API_URL;
  let baseUrl = '/api';
  if (rawUrl) {
    const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
    baseUrl = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('dtf_jwt_token') : '';
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${baseUrl}/mails/pdf/${cleanType}/${encodeURIComponent(cleanFilename)}${tokenParam}`;
}

