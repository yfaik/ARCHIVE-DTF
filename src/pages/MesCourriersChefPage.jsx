import React, { useState, useEffect } from 'react';
import { MailTable } from '../components/mail/MailTable';
import { MailFormModal } from '../components/mail/MailFormModal';
import { PdfViewerModal } from '../components/mail/PdfViewerModal';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { PriorityBadge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { Plus, Search, RefreshCw, Briefcase, Calendar, Send, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const MesCourriersChefPage = () => {
  const { canCreateMail, user } = useAuth();

  const [courriers, setCourriers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState('year');
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriorite, setSelectedPriorite] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editCourrier, setEditCourrier] = useState(null);

  // Transmission / Re-routing modal
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

  const fetchCourriers = async () => {
    setLoading(true);
    try {
      let url = `/mails/my-courriers?search=${encodeURIComponent(search)}`;
      if (period) url += `&period=${period}`;
      if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;
      if (selectedPriorite) url += `&priorite=${encodeURIComponent(selectedPriorite)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;

      const res = await api.get(url);
      setCourriers(res.data);
    } catch (e) {
      console.error('Erreur récupération mes courriers chef:', e);
      toast.error('Erreur lors du chargement de vos courriers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourriers();
  }, [search, selectedStatus, selectedPriorite, dateFrom, dateTo, period]);

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

  // Open transmission / routing modal
  const handleOpenTransmit = (courrier) => {
    setTransmitState({
      isOpen: true,
      courrier,
      targetService: courrier.service_destinataire || 'Service Technique',
      loading: false
    });
  };

  const handleConfirmTransmit = async () => {
    if (!transmitState.courrier || !transmitState.targetService) return;
    setTransmitState(prev => ({ ...prev, loading: true }));
    try {
      await api.put(`/mails/arrives/${transmitState.courrier.id}/status`, {
        statut: 'Transmis',
        service_destinataire: transmitState.targetService
      });
      toast.success(`Courrier ${transmitState.courrier.reference} transmis au ${transmitState.targetService}`);
      setTransmitState({ isOpen: false, courrier: null, targetService: 'Service Technique', loading: false });
      fetchCourriers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la transmission du courrier.');
      setTransmitState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleUpdateStatus = async (courrier, newStatus) => {
    try {
      await api.put(`/mails/arrives/${courrier.id}/status`, {
        statut: newStatus,
        service_destinataire: courrier.service_destinataire
      });
      toast.success(`Statut du courrier ${courrier.reference} mis à jour : "${newStatus}"`);
      fetchCourriers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la mise à jour du statut.');
    }
  };

  // KPI counters
  const totalCount = courriers.length;
  const nouveauCount = courriers.filter(c => ['Nouveau', 'NOUVEAU'].includes(c.statut)).length;
  const enCoursCount = courriers.filter(c => ['En cours', 'EN_COURS'].includes(c.statut)).length;
  const traiteCount = courriers.filter(c => ['Traité', 'TRAITE'].includes(c.statut)).length;

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'Nouveau', label: '🟡 Nouveau' },
    { value: 'Transmis', label: '🔵 Transmis' },
    { value: 'En cours', label: '🟠 En cours' },
    { value: 'Traité', label: '🟢 Traité' },
  ];

  const prioriteOptions = [
    { value: '', label: 'Toutes les priorités' },
    { value: 'Normal', label: '🟢 Normal' },
    { value: 'Urgent', label: '🟠 Urgent' },
    { value: 'Très Urgent', label: '🔴 Très Urgent' },
  ];

  const transmitServiceOptions = dbServices.length > 0
    ? dbServices.map(s => ({ value: s.nom, label: s.nom }))
    : [
        { value: 'Service Technique', label: 'Service Technique' },
        { value: 'Service Financier', label: 'Service Financier' },
        { value: 'Service Comptabilité', label: 'Service Comptabilité' },
        { value: 'Chef de Division', label: 'Chef de Division' },
      ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Briefcase}
        title="Mes Courriers — Chef de Division"
        description="Boîte de réception dédiée aux courriers arrivés directement assignés au Chef de Division"
      >
        <div className="flex items-center gap-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-1.5 shadow-sm transition-all mr-2">
          <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
          <div className="flex items-center gap-1.5">
            <label htmlFor="chef-period-select" className="text-xs font-semibold text-surface-500 dark:text-surface-400 whitespace-nowrap">
              Période :
            </label>
            <select
              id="chef-period-select"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-surface-500 dark:text-surface-400">Total Assignés</div>
            <div className="text-lg font-bold text-surface-900 dark:text-surface-100">{totalCount}</div>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-50 dark:bg-yellow-950/50 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-surface-500 dark:text-surface-400">Nouveaux</div>
            <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{nouveauCount}</div>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-surface-500 dark:text-surface-400">En cours</div>
            <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{enCoursCount}</div>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-surface-500 dark:text-surface-400">Traités</div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{traiteCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          placeholder="Rechercher par référence, objet, expéditeur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
          clearable
          className="col-span-1 sm:col-span-2"
        />
        <Select
          options={statusOptions}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        />
        <Select
          options={prioriteOptions}
          value={selectedPriorite}
          onChange={(e) => setSelectedPriorite(e.target.value)}
        />
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-surface-50/70 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200 dark:border-surface-700/80">
        <span className="font-semibold text-surface-600 dark:text-surface-300">Période personnalisée :</span>
        <div className="flex items-center gap-1.5">
          <label className="text-surface-500">Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input py-1 px-2 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-surface-500">Au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input py-1 px-2 text-xs"
          />
        </div>
        {(dateFrom || dateTo || search || selectedStatus || selectedPriorite) && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setSearch('');
              setSelectedStatus('');
              setSelectedPriorite('');
              setDateFrom('');
              setDateTo('');
            }}
            className="ml-auto text-primary-600 dark:text-emerald-400 font-semibold"
          >
            Réinitialiser les filtres
          </Button>
        )}
      </div>

      {/* Main Mail Table */}
      <MailTable
        courriers={courriers}
        type="arrive"
        onViewPdf={handleViewPdf}
        onEditCourrier={handleEditCourrier}
        onTransmit={handleOpenTransmit}
        onUpdateStatus={handleUpdateStatus}
        loading={loading}
      />

      {/* Modals */}
      <MailFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        type="arrive"
        editCourrier={editCourrier}
        onSuccess={fetchCourriers}
      />

      <PdfViewerModal
        isOpen={pdfModalState.isOpen}
        onClose={() => setPdfModalState({ isOpen: false, courrier: null })}
        type={pdfModalState.type}
        courrier={pdfModalState.courrier}
      />

      {/* Re-routing / Transmission Modal */}
      <Modal
        isOpen={transmitState.isOpen}
        onClose={() => setTransmitState({ isOpen: false, courrier: null, targetService: 'Service Technique', loading: false })}
        title="Transmettre ou Réassigner le Courrier"
        subtitle={`Courrier Réf: ${transmitState.courrier?.reference}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg text-xs space-y-1">
            <div><span className="font-bold">Objet :</span> {transmitState.courrier?.objet}</div>
            <div><span className="font-bold">Expéditeur :</span> {transmitState.courrier?.expediteur}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold">Niveau de Priorité :</span>
              <PriorityBadge priority={transmitState.courrier?.priorite || 'Normal'} />
            </div>
          </div>

          <Select
            label="Service Destinataire"
            value={transmitState.targetService}
            onChange={(e) => setTransmitState(prev => ({ ...prev, targetService: e.target.value }))}
            options={transmitServiceOptions}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransmitState({ isOpen: false, courrier: null, targetService: 'Service Technique', loading: false })}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              loading={transmitState.loading}
              onClick={handleConfirmTransmit}
            >
              Confirmer la Transmission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
