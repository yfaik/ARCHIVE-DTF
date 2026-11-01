import React, { useState, useEffect } from 'react';
import { MailTable } from '../components/mail/MailTable';
import { MailFormModal } from '../components/mail/MailFormModal';
import { PdfViewerModal } from '../components/mail/PdfViewerModal';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { PageHeader } from '../components/common/PageHeader';
import { Plus, Search, RefreshCw, Send, Calendar } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const CourriersDepartPage = () => {
  const { canCreateMail, isUserService, user } = useAuth();

  const [courriers, setCourriers] = useState([]);
  const [dbServices, setDbServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState('year');
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editCourrier, setEditCourrier] = useState(null);

  const [pdfModalState, setPdfModalState] = useState({
    isOpen: false,
    courrier: null,
  });

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
      let url = `/mails/departs?search=${encodeURIComponent(search)}`;
      if (period) url += `&period=${period}`;
      if (selectedService) url += `&service=${encodeURIComponent(selectedService)}`;
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
  }, [search, selectedService, dateFrom, dateTo, period]);

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
    const targetType = typeof param1 === 'string' ? param1 : 'depart';
    setPdfModalState({
      isOpen: true,
      type: targetType,
      courrier: targetCourrier,
    });
  };

  const serviceOptions = [
    { value: '', label: 'Tous les services' },
    ...dbServices.map(s => ({ value: s.nom, label: s.nom }))
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Send}
        title="Courriers Départ"
        description={
          isUserService
            ? `Courriers départ envoyés par le ${user?.service}`
            : 'Registre des envois officiels de la Division'
        }
      >
        <div className="flex items-center gap-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-1.5 shadow-sm transition-all mr-2">
          <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
          <div className="flex items-center gap-1.5">
            <label htmlFor="departs-period-select" className="text-xs font-semibold text-surface-500 dark:text-surface-400 whitespace-nowrap">
              Période :
            </label>
            <select
              id="departs-period-select"
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
      <div className="filter-bar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        type="depart"
        onViewPdf={handleViewPdf}
        onEditCourrier={handleEditCourrier}
        loading={loading}
      />

      {/* Form Modal */}
      <MailFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        type="depart"
        editCourrier={editCourrier}
        onSuccess={fetchCourriers}
      />

      {/* Integrated PDF Viewer Modal */}
      {pdfModalState.isOpen && pdfModalState.courrier && (
        <PdfViewerModal
          isOpen={pdfModalState.isOpen}
          onClose={() => setPdfModalState({ isOpen: false, type: 'depart', courrier: null })}
          type={pdfModalState.type || 'depart'}
          courrier={pdfModalState.courrier}
        />
      )}
    </div>
  );
};
