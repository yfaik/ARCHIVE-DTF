import React, { useState, useEffect } from 'react';
import { MailTable } from '../components/mail/MailTable';
import { MailFormModal } from '../components/mail/MailFormModal';
import { PdfViewerModal } from '../components/mail/PdfViewerModal';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { PriorityBadge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { Plus, Search, RefreshCw, Inbox, Calendar, Send } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const CourriersArrivesPage = () => {
  const { canCreateMail, isUserService, isChefDivision, user } = useAuth();

  const [courriers, setCourriers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState('year');
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriorite, setSelectedPriorite] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editCourrier, setEditCourrier] = useState(null);

  // Transmission modal for Chef de Division
  const [transmitState, setTransmitState] = useState({
    isOpen: false,
    courrier: null,
    targetService: 'Service Technique',
    loading: false
  });

  const [pdfModalState, setPdfModalState] = useState({
    isOpen: false,
    courrier: null,
  });

  const fetchCourriers = async () => {
    setLoading(true);
    try {
      let url = `/mails/arrives?search=${encodeURIComponent(search)}`;
      if (period) url += `&period=${period}`;
      if (selectedService) url += `&service=${encodeURIComponent(selectedService)}`;
      if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;
      if (selectedPriorite) url += `&priorite=${encodeURIComponent(selectedPriorite)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;

      const res = await api.get(url);
      setCourriers(res.data);
    } catch (e) {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourriers();
  }, [search, selectedService, selectedStatus, selectedPriorite, dateFrom, dateTo, period]);

  const handleOpenNewModal = () => {
    setEditCourrier(null);
    setIsFormOpen(true);
  };

  const handleEditCourrier = (courrier) => {
    setEditCourrier(courrier);
    setIsFormOpen(true);
  };

  const handleViewPdf = (param1, param2) => {
    const targetCourrier = param2 && typeof param2 === 'object' ? param2 : param1;
    const targetType = typeof param1 === 'string' ? param1 : 'arrive';
    setPdfModalState({
      isOpen: true,
      type: targetType,
      courrier: targetCourrier,
    });
  };

  // Open transmission modal for Chef de Division
  const handleOpenTransmit = (courrier) => {
    setTransmitState({
      isOpen: true,
      courrier,
      targetService: courrier.service_destinataire || 'Service Technique',
      loading: false
    });
  };

  // Confirm transmission
  const handleConfirmTransmit = async (e) => {
    e.preventDefault();
    if (!transmitState.courrier) return;

    setTransmitState(prev => ({ ...prev, loading: true }));
    try {
      await api.put(`/mails/arrives/${transmitState.courrier.id}/status`, {
        statut: 'TRANSMIS',
        service_destinataire: transmitState.targetService
      });
      toast.success(`Courrier Réf: ${transmitState.courrier.reference} transmis au ${transmitState.targetService}.`);
      setTransmitState({ isOpen: false, courrier: null, targetService: 'Service Technique', loading: false });
      fetchCourriers();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      toast.error(msg || 'Erreur lors de la transmission.');
      setTransmitState(prev => ({ ...prev, loading: false }));
    }
  };

  // Quick status update for Service Destinataire / Admin
  const handleUpdateStatus = async (courrier, newStatus) => {
    try {
      await api.put(`/mails/arrives/${courrier.id}/status`, {
        statut: newStatus
      });
      if (newStatus === 'En cours') {
        toast.success(`Courrier Réf: ${courrier.reference} pris en charge ("En cours").`);
      } else if (newStatus === 'Traité') {
        toast.success(`Courrier Réf: ${courrier.reference} marqué comme Traité avec succès.`);
      } else {
        toast.success(`Statut du courrier Réf: ${courrier.reference} mis à jour : ${newStatus}.`);
      }
      fetchCourriers();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      toast.error(msg || 'Erreur lors du changement de statut.');
    }
  };

  const [dbServices, setDbServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/services');
        setDbServices(res.data);
      } catch (e) {
        console.error('Erreur chargement services:', e);
      }
    };
    fetchServices();
  }, []);

  const serviceOptions = [
    { value: '', label: 'Tous les services' },
    ...(dbServices.length > 0
      ? dbServices.map(s => ({ value: s.nom, label: s.nom }))
      : [
          { value: 'Service Technique', label: 'Service Technique' },
          { value: 'Service Financier', label: 'Service Financier' },
          { value: 'Service Comptabilité', label: 'Service Comptabilité' },
          { value: 'Chef de Division', label: 'Chef de Division' },
        ])
  ];

  const transmitServiceOptions = dbServices.length > 0
    ? dbServices.map(s => ({ value: s.nom, label: s.nom }))
    : [
        { value: 'Service Technique', label: 'Service Technique' },
        { value: 'Service Financier', label: 'Service Financier' },
        { value: 'Service Comptabilité', label: 'Service Comptabilité' },
        { value: 'Chef de Division', label: 'Chef de Division' },
      ];

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'Nouveau', label: '🟡 Nouveau' },
    { value: 'Transmis', label: '🔵 Transmis' },
    { value: 'En cours', label: '🟠 En cours' },
    { value: 'Traité', label: '🟢 Traité' },
  ];

  const serviceStatusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'Transmis', label: '🔵 Transmis (À traiter)' },
    { value: 'En cours', label: '🟠 En cours' },
    { value: 'Traité', label: '🟢 Traité' },
  ];

  const prioriteOptions = [
    { value: '', label: 'Toutes les priorités' },
    { value: 'Normal', label: '🟢 Normal' },
    { value: 'Urgent', label: '🟠 Urgent' },
    { value: 'Très Urgent', label: '🔴 Très Urgent' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Inbox}
        title="Courriers Arrivés"
        description={
          isUserService
            ? `Courriers transmis au ${user?.service}`
            : 'Registre des réceptions du Bureau d\'Ordre'
        }
      >
        <div className="flex items-center gap-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-1.5 shadow-sm transition-all mr-2">
          <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
          <div className="flex items-center gap-1.5">
            <label htmlFor="arrives-period-select" className="text-xs font-semibold text-surface-500 dark:text-surface-400 whitespace-nowrap">
              Période :
            </label>
            <select
              id="arrives-period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-surface-900 dark:text-surface-100 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer border-none py-0.5 pr-1"
              aria-label="Sélectionner la période temporelle"
            >
              <option value="today" className="bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100">Aujourd’hui</option>
              <option value="week" className="bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100">Cette semaine</option>
              <option value="month" className="bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100">Ce mois</option>
              <option value="year" className="bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100">Cette année</option>
              <option value="total" className="bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100">Total</option>
            </select>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCourriers} icon={RefreshCw}>
          Actualiser
        </Button>
        {canCreateMail && (
          <Button variant="primary" size="sm" onClick={handleOpenNewModal} icon={Plus}>
            Nouveau Courrier
          </Button>
        )}
      </PageHeader>

      {/* Filter Bar */}
      <div className={`filter-bar grid grid-cols-1 sm:grid-cols-2 ${isUserService ? 'lg:grid-cols-5' : 'lg:grid-cols-6'} gap-3`}>
        <Input
          placeholder="Rechercher par référence, objet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
        {!isUserService && (
          <Select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            options={serviceOptions}
          />
        )}
        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          options={isUserService ? serviceStatusOptions : statusOptions}
        />
        <Select
          value={selectedPriorite}
          onChange={(e) => setSelectedPriorite(e.target.value)}
          options={prioriteOptions}
        />
        <Input
          type="date"
          label="Du"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          type="date"
          label="Au"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      {/* Table */}
      <MailTable
        courriers={courriers}
        type="arrive"
        onViewPdf={handleViewPdf}
        onEditCourrier={handleEditCourrier}
        onTransmit={handleOpenTransmit}
        onUpdateStatus={handleUpdateStatus}
        loading={loading}
      />

      {/* Transmission Modal for Chef de Division */}
      {transmitState.isOpen && (
        <Modal
          isOpen={transmitState.isOpen}
          onClose={() => setTransmitState({ isOpen: false, courrier: null, targetService: 'Service Technique', loading: false })}
          title={`Transmission du Courrier — Réf: ${transmitState.courrier?.reference}`}
          subtitle="Transmettre le courrier au service destinataire pour traitement"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmTransmit} className="space-y-4">
            <div className="p-3.5 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs text-surface-600 dark:text-surface-300">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-semibold text-surface-900 dark:text-surface-100 text-sm">
                  {transmitState.courrier?.objet}
                </p>
                <PriorityBadge priority={transmitState.courrier?.priorite} />
              </div>
              <p>Expéditeur : {transmitState.courrier?.expediteur}</p>
            </div>

            <Select
              label="Confirmer le Service Destinataire"
              value={transmitState.targetService}
              onChange={(e) => setTransmitState(prev => ({ ...prev, targetService: e.target.value }))}
              options={transmitServiceOptions}
              required
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-200 dark:border-surface-700">
              <Button
                variant="outline"
                onClick={() => setTransmitState({ isOpen: false, courrier: null, targetService: 'Service Technique', loading: false })}
                disabled={transmitState.loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={Send}
                loading={transmitState.loading}
              >
                Transmettre maintenant
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Form Modal */}
      <MailFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        type="arrive"
        editCourrier={editCourrier}
        onSuccess={fetchCourriers}
      />

      {/* Integrated PDF Viewer Modal */}
      {pdfModalState.isOpen && pdfModalState.courrier && (
        <PdfViewerModal
          isOpen={pdfModalState.isOpen}
          onClose={() => setPdfModalState({ isOpen: false, type: 'arrive', courrier: null })}
          type={pdfModalState.type || 'arrive'}
          courrier={pdfModalState.courrier}
        />
      )}
    </div>
  );
};
