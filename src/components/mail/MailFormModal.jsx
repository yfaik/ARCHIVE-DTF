import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import { FileUploader } from './FileUploader';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

export const MailFormModal = ({ isOpen, onClose, type = 'arrive', editCourrier = null, onSuccess }) => {
  const isEdit = !!editCourrier;

  const [dbServices, setDbServices] = useState([]);
  const [formData, setFormData] = useState({
    reference: '',
    objet: '',
    expediteur: '',
    destinataire: '',
    date_arrivee: new Date().toISOString().split('T')[0],
    date_depart: new Date().toISOString().split('T')[0],
    observation: '',
    service_destinataire: 'Service Technique',
    service_expediteur_id: '',
    priorite: 'Normal',
  });

  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/services');
        setDbServices(res.data);
      } catch (e) {
        console.error('Erreur chargement services:', e);
      }
    };
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);

  useEffect(() => {
    const defaultServiceId = dbServices.length > 0 ? String(dbServices[0].id) : '1';
    if (editCourrier) {
      setFormData({
        reference: editCourrier.reference || '',
        objet: editCourrier.objet || '',
        expediteur: editCourrier.expediteur || '',
        destinataire: editCourrier.destinataire || '',
        date_arrivee: editCourrier.date_arrivee || new Date().toISOString().split('T')[0],
        date_depart: editCourrier.date_depart || new Date().toISOString().split('T')[0],
        observation: editCourrier.observation || '',
        service_destinataire: editCourrier.service_destinataire || 'Service Technique',
        service_expediteur_id: editCourrier.service_expediteur_id ? String(editCourrier.service_expediteur_id) : defaultServiceId,
        priorite: editCourrier.priorite || 'Normal',
      });
      setPdfFile(null);
    } else {
      setFormData({
        reference: '',
        objet: '',
        expediteur: '',
        destinataire: '',
        date_arrivee: new Date().toISOString().split('T')[0],
        date_depart: new Date().toISOString().split('T')[0],
        observation: '',
        service_destinataire: 'Service Technique',
        service_expediteur_id: defaultServiceId,
        priorite: 'Normal',
      });
      setPdfFile(null);
    }
  }, [editCourrier, isOpen, dbServices]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.reference.trim()) {
      toast.error('La référence doit être saisie manuellement.');
      return;
    }

    if (type === 'depart' && !formData.service_expediteur_id) {
      toast.error('Le service expéditeur est obligatoire.');
      return;
    }

    if (!isEdit && !pdfFile) {
      toast.error('Veuillez joindre le document PDF numérisé.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('reference', formData.reference.trim());
      data.append('objet', formData.objet.trim());
      data.append('observation', formData.observation.trim());

      if (type === 'arrive') {
        data.append('expediteur', formData.expediteur.trim());
        data.append('date_arrivee', formData.date_arrivee);
        data.append('service_destinataire', formData.service_destinataire);
        data.append('priorite', formData.priorite || 'Normal');
      } else {
        data.append('destinataire', formData.destinataire.trim());
        data.append('date_depart', formData.date_depart);
        data.append('service_expediteur_id', formData.service_expediteur_id);
      }

      if (pdfFile) {
        data.append('pdf', pdfFile);
      }

      if (isEdit) {
        const endpoint = type === 'arrive' ? `/mails/arrives/${editCourrier.id}` : `/mails/departs/${editCourrier.id}`;
        await api.put(endpoint, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`Courrier ${formData.reference} modifié avec succès.`);
      } else {
        const endpoint = type === 'arrive' ? '/mails/arrives' : '/mails/departs';
        const res = await api.post(endpoint, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`Courrier ${formData.reference} enregistré.`);
        onSuccess && onSuccess(res.data);
        onClose();
        return;
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      toast.error(serverMsg || 'Erreur lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  };

  const serviceArriveOptions = dbServices.length > 0 
    ? dbServices.map(s => ({ value: s.nom, label: s.nom }))
    : [
        { value: 'Service Technique', label: 'Service Technique' },
        { value: 'Service Financier', label: 'Service Financier' },
        { value: 'Service Comptabilité', label: 'Service Comptabilité' },
        { value: 'Chef de Division', label: 'Chef de Division' },
      ];

  const serviceDepartOptions = dbServices.length > 0 
    ? dbServices.map(s => ({ value: String(s.id), label: s.nom }))
    : [
        { value: '1', label: 'Service Technique' },
        { value: '2', label: 'Service Financier' },
        { value: '3', label: 'Service Comptabilité' },
        { value: '4', label: 'Chef de Division' },
      ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Modifier Courrier ${formData.reference}` : `Nouveau Courrier ${type === 'arrive' ? 'Arrivé' : 'Départ'}`}
      subtitle={isEdit ? 'Modifier les informations de ce courrier' : 'Enregistrer un nouveau courrier dans le registre'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Manual Reference Warning */}
        <div className="info-banner border-warning-200 dark:border-warning-500/20 bg-warning-50 dark:bg-warning-500/5 text-warning-700 dark:text-warning-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Référence manuelle obligatoire</span>
            <span className="block text-xs mt-0.5 opacity-80">
              La référence doit être saisie manuellement (ex: 0000). Aucune référence automatique n'est générée.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Référence"
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            placeholder="Ex: 0000"
            required
            hint="Saisie manuelle unique"
          />

          {type === 'arrive' ? (
            <Input
              label="Expéditeur"
              name="expediteur"
              value={formData.expediteur}
              onChange={handleChange}
              placeholder="Ex: Préfecture de Benslimane"
              required
            />
          ) : (
            <Input
              label="Destinataire"
              name="destinataire"
              value={formData.destinataire}
              onChange={handleChange}
              placeholder="Ex: Ministère de l'Intérieur"
              required
            />
          )}

          {type === 'arrive' ? (
            <Input
              label="Date d'Arrivée"
              name="date_arrivee"
              type="date"
              value={formData.date_arrivee}
              onChange={handleChange}
              required
            />
          ) : (
            <Input
              label="Date de Départ"
              name="date_depart"
              type="date"
              value={formData.date_depart}
              onChange={handleChange}
              required
            />
          )}

          {type === 'arrive' ? (
            <Select
              label="Service Destinataire"
              name="service_destinataire"
              value={formData.service_destinataire}
              onChange={handleChange}
              options={serviceArriveOptions}
              required
            />
          ) : (
            <Select
              label="Service Expéditeur *"
              name="service_expediteur_id"
              value={formData.service_expediteur_id}
              onChange={handleChange}
              options={serviceDepartOptions}
              required
            />
          )}
        </div>

        <Input
          label="Objet du Courrier"
          name="objet"
          value={formData.objet}
          onChange={handleChange}
          placeholder="Résumé précis de la demande ou du document..."
          required
        />

        {/* Priorité / Urgence pour les courriers arrivés */}
        {type === 'arrive' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-200">
              Priorité / Urgence <span className="text-danger-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  value: 'Normal',
                  label: 'Normal',
                  dot: 'bg-emerald-500',
                  activeStyle: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs',
                  desc: 'Traitement standard'
                },
                {
                  value: 'Urgent',
                  label: 'Urgent',
                  dot: 'bg-orange-500',
                  activeStyle: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/80 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 font-bold shadow-xs',
                  desc: 'Traitement prioritaire'
                },
                {
                  value: 'Très Urgent',
                  label: 'Très Urgent',
                  dot: 'bg-red-500',
                  activeStyle: 'border-red-500 ring-2 ring-red-500/20 bg-red-50/80 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-black shadow-xs',
                  desc: 'Immédiat / Critique'
                },
              ].map((item) => {
                const isSelected = formData.priorite === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, priorite: item.value }))}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? item.activeStyle
                        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/80 text-surface-600 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                    <span className="text-[11px] opacity-75 mt-0.5">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Observation / Remarques
          </label>
          <textarea
            name="observation"
            rows="3"
            value={formData.observation}
            onChange={handleChange}
            placeholder="Remarques complémentaires, priorités..."
            className="w-full rounded-md border bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 text-sm px-3.5 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 border-surface-200 dark:border-surface-700 placeholder-surface-400 resize-none"
          />
        </div>

        {/* PDF File Upload */}
        <FileUploader
          selectedFile={pdfFile}
          onFileSelected={(file) => setPdfFile(file)}
          onRemoveFile={() => setPdfFile(null)}
        />

        <div className="flex justify-end gap-2 pt-4 border-t border-surface-200 dark:border-surface-700">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
