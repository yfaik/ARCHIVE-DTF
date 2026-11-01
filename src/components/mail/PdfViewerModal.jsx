import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Printer,
  Maximize,
  Minimize,
  AlertTriangle,
  Loader2,
  ExternalLink,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import { downloadPdfFile, getPdfStreamUrl } from '../../utils/pdfHelper';

export const PdfViewerModal = ({ isOpen, onClose, type = 'arrive', courrier }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfSource, setPdfSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  // Extract filename safely from all possible naming conventions and strip any directory paths
  const rawFilename =
    courrier?.pdf_filename ||
    courrier?.pieceJointe ||
    courrier?.piece_jointe ||
    courrier?.filename ||
    courrier?.file ||
    '';
  const filename = rawFilename ? String(rawFilename).split(/[/\\]/).pop().split('?')[0] : '';

  // Determine document type dynamically from courrier object fields or type prop
  const isDepart =
    courrier?.category === 'depart' ||
    (courrier?.destinataire && !courrier?.expediteur) ||
    type === 'depart' ||
    type === 'departs';
  const cleanType = isDepart ? 'depart' : 'arrive';

  useEffect(() => {
    let isSubscribed = true;
    let localBlobUrl = null;

    if (isOpen && courrier) {
      if (!filename) {
        setError("Aucun fichier PDF n'est associé à ce courrier.");
        setLoading(false);
        setPdfSource(null);
        return;
      }

      setLoading(true);
      setError(null);

      // Prepare direct streaming URL (with token in query param) as immediate fallback
      let streamUrl = '';
      try {
        streamUrl = getPdfStreamUrl(cleanType, filename);
      } catch (e) {
        console.warn('Erreur lors de la génération de streamUrl:', e);
      }

      const pdfEndpoint = `/mails/pdf/${cleanType}/${encodeURIComponent(filename)}`;

      // Fetch via axios blob for authenticated in-memory display
      api
        .get(pdfEndpoint, { responseType: 'blob' })
        .then((res) => {
          if (!isSubscribed) return;
          const blob = new Blob([res.data], { type: 'application/pdf' });
          localBlobUrl = window.URL.createObjectURL(blob);
          setPdfSource(localBlobUrl);
          setLoading(false);
        })
        .catch(async (err) => {
          if (!isSubscribed) return;
          console.warn('Axios blob preview request failed, falling back to stream URL:', err);

          // If fallback streamUrl is available, use it directly
          if (streamUrl) {
            setPdfSource(streamUrl);
            setLoading(false);
          } else {
            let errMsg = 'Impossible de charger le document PDF.';
            if (err.response && err.response.data instanceof Blob) {
              try {
                const text = await err.response.data.text();
                const json = JSON.parse(text);
                errMsg = json.error || errMsg;
              } catch (e) {}
            } else if (err.response?.data?.error) {
              errMsg = err.response.data.error;
            }
            setError(errMsg);
            setLoading(false);
          }
        });
    }

    return () => {
      isSubscribed = false;
      if (localBlobUrl) {
        window.URL.revokeObjectURL(localBlobUrl);
      }
      setPdfSource(null);
      setLoading(false);
      setError(null);
      setZoom(100);
      setRotation(0);
    };
  }, [isOpen, cleanType, filename, courrier?.id]);

  if (!isOpen || !courrier) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {}
    }
    if (pdfSource) {
      const printWin = window.open(pdfSource, '_blank');
      printWin?.print();
    }
  };

  const handleDownload = () => {
    downloadPdfFile(cleanType, courrier);
  };

  const handleOpenNewTab = () => {
    let targetUrl = pdfSource;
    if (!targetUrl) {
      try {
        targetUrl = getPdfStreamUrl(cleanType, filename);
      } catch (e) {}
    }
    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const senderOrRecipientText = courrier.expediteur
    ? `Expéditeur: ${courrier.expediteur}`
    : courrier.destinataire
    ? `Destinataire: ${courrier.destinataire}`
    : isDepart
    ? `Destinataire: ${courrier.destinataire || 'Inconnu'}`
    : `Expéditeur: ${courrier.expediteur || 'Inconnu'}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Document — Réf: ${courrier.reference || 'N/A'}`}
      subtitle={courrier.objet || ''}
      maxWidth={isFullscreen ? 'max-w-[99vw] w-[99vw]' : 'max-w-6xl w-[95vw]'}
      bodyClassName="p-3 sm:p-4 h-[86vh] flex flex-col overflow-hidden"
    >
      <div className="flex flex-col h-full space-y-3">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shrink-0">
          <div className="text-xs text-surface-600 dark:text-surface-300 font-medium truncate max-w-md">
            <span className="font-semibold text-surface-900 dark:text-surface-100">{senderOrRecipientText}</span>
            {courrier.service_destinataire && (
              <span> · {courrier.service_destinataire}</span>
            )}
            {courrier.date_arrivee && (
              <span> · {courrier.date_arrivee}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} icon={ZoomOut} disabled={loading || !!error} title="Zoom arrière">
              {zoom}%
            </Button>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} icon={ZoomIn} disabled={loading || !!error} title="Zoom avant" />
            <Button variant="ghost" size="sm" onClick={handleRotate} icon={RotateCw} disabled={loading || !!error} title="Pivoter 90°" />
            <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-0.5" />
            <Button variant="ghost" size="sm" onClick={handleOpenNewTab} icon={ExternalLink} disabled={loading || !pdfSource} title="Ouvrir dans un nouvel onglet">
              <span className="hidden sm:inline">Nouvel onglet</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePrint} icon={Printer} disabled={loading || !pdfSource} title="Imprimer le document" />
            <Button variant="primary" size="sm" onClick={handleDownload} icon={Download} title="Télécharger le fichier PDF">
              Télécharger
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleFullscreen} icon={isFullscreen ? Minimize : Maximize} title={isFullscreen ? "Réduire" : "Plein écran"} />
          </div>
        </div>

        {/* PDF Frame Container with explicit viewport height */}
        <div className="flex-1 w-full h-[calc(86vh-7.5rem)] min-h-[500px] bg-surface-100 dark:bg-surface-950 rounded-lg overflow-hidden relative flex items-center justify-center border border-surface-200 dark:border-surface-700">
          {loading ? (
            <div className="flex flex-col items-center justify-center text-primary-600 space-y-3">
              <Loader2 className="w-9 h-9 animate-spin text-primary-500" />
              <span className="text-sm font-semibold text-surface-600 dark:text-surface-300">
                Chargement du document PDF...
              </span>
            </div>
          ) : error && !pdfSource ? (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
              <AlertTriangle className="w-12 h-12 text-danger-500 mb-3" />
              <h4 className="text-base font-bold text-surface-900 dark:text-surface-100 mb-1">
                Visualisation indisponible
              </h4>
              <p className="text-xs text-surface-500 mb-5">{error}</p>
              <Button variant="primary" size="sm" onClick={handleDownload} icon={Download}>
                Télécharger le document
              </Button>
            </div>
          ) : pdfSource ? (
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-150 overflow-hidden"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <iframe
                ref={iframeRef}
                src={pdfSource}
                title={`Visualiseur PDF - ${courrier.reference || 'Document'}`}
                className="w-full h-full min-h-[500px] border-0 rounded bg-white"
              />
            </div>
          ) : (
            <div className="text-center p-6 text-sm text-surface-500">
              Aucun document à afficher.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
