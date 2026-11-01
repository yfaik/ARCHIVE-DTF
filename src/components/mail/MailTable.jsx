import React from 'react';
import { Badge, StatusBadge, PriorityBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { Eye, Download, Edit3, FileText, Send, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadPdfFile } from '../../utils/pdfHelper';

export const MailTable = ({
  courriers = [],
  type = 'arrive',
  onViewPdf,
  onEditCourrier,
  onTransmit,
  onUpdateStatus,
  loading = false,
}) => {
  const { canEditMail, isUserService, isChefDivision } = useAuth();

  const getServiceBadgeVariant = (service) => {
    if (service === 'Service Technique') return 'primary';
    if (service === 'Service Financier') return 'info';
    if (service === 'Service Comptabilité') return 'purple';
    if (service === 'Chef de Division') return 'warning';
    return 'neutral';
  };

  if (loading) {
    return (
      <div className="card p-0 overflow-hidden w-full">
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="skeleton h-5 flex-[0.10] rounded" />
              <div className="skeleton h-5 flex-[0.25] rounded" />
              <div className="skeleton h-5 flex-[0.17] rounded" />
              <div className="skeleton h-5 flex-[0.09] rounded" />
              <div className="skeleton h-5 flex-[0.08] rounded" />
              <div className="skeleton h-5 flex-[0.10] rounded" />
              <div className="skeleton h-5 flex-[0.09] rounded" />
              <div className="skeleton h-5 flex-[0.12] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (courriers.length === 0) {
    return (
      <div className="card w-full">
        <EmptyState
          icon={FileText}
          title="Aucun courrier trouvé"
          description={
            isUserService
              ? 'Votre service n\'a aucun courrier pour le moment.'
              : 'Aucun résultat ne correspond à vos critères de recherche.'
          }
        />
      </div>
    );
  }

  const isArrive = type === 'arrive';

  return (
    <div className="card p-0 overflow-hidden shadow-elevation-1 w-full">
      <div className="w-full overflow-hidden">
        <table className="w-full table-fixed text-left text-xs sm:text-sm">
          {/* Strict proportional column widths ensuring 100% width and zero horizontal scroll */}
          <colgroup>
            {isArrive ? (
              <>
                <col className="w-[10%]" />
                <col className="w-[25%]" />
                <col className="w-[17%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
                <col className="w-[12%]" />
              </>
            ) : (
              <>
                <col className="w-[13%]" />
                <col className="w-[33%]" />
                <col className="w-[19%]" />
                <col className="w-[14%]" />
                <col className="w-[9%]" />
                <col className="w-[12%]" />
              </>
            )}
          </colgroup>

          <thead>
            <tr className="bg-surface-100 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 text-xs font-extrabold uppercase tracking-wider text-surface-700 dark:text-surface-200">
              <th className="py-2.5 px-2 sm:px-3 sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 truncate">
                Réf.
              </th>
              <th className="py-2.5 px-2 sm:px-3 sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 truncate">
                Objet
              </th>
              <th className="py-2.5 px-2 sm:px-3 sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 truncate">
                {isArrive ? 'Expéditeur' : 'Destinataire'}
              </th>
              {!isArrive && (
                <th className="py-2.5 px-2 sm:px-3 sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 truncate">
                  Service Exp.
                </th>
              )}
              <th className="py-2.5 px-2 sm:px-3 sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 text-center truncate">
                {isArrive ? 'Arrivée' : 'Départ'}
              </th>
              {isArrive && (
                <>
                  <th className="py-2.5 px-2 sm:px-3 sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 text-center truncate">
                    Priorité
                  </th>
                  <th className="py-2.5 px-2 sm:px-3 sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 truncate">
                    Service Dest.
                  </th>
                  <th className="py-2.5 px-2 sm:px-3 sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 truncate">
                    Statut
                  </th>
                </>
              )}
              <th className="py-2.5 px-2 sm:px-3 text-right sticky top-0 bg-surface-100 dark:bg-surface-900 z-10 truncate">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-surface-200/80 dark:divide-surface-700/60">
            {courriers.map((c) => {
              const normStatut = String(c.statut || '').toUpperCase();
              const isNouveau = normStatut === 'NOUVEAU';
              const isTransmis = normStatut === 'TRANSMIS';
              const isEnCours = normStatut.includes('COURS');
              const isTraite = normStatut.includes('TRAIT');

              return (
                <tr
                  key={c.id}
                  className="table-row table-row-zebra hover:bg-surface-100/70 dark:hover:bg-surface-800/60 transition-colors duration-150"
                >
                  {/* Référence */}
                  <td className="py-2.5 px-2 sm:px-3 font-mono font-bold text-primary-700 dark:text-emerald-400 text-xs">
                    <div className="truncate" title={c.reference}>
                      {c.reference}
                    </div>
                  </td>

                  {/* Objet + Observation (wrap on 2 lines, break-words) */}
                  <td className="py-2.5 px-2 sm:px-3">
                    <div
                      className="font-semibold text-surface-900 dark:text-surface-50 line-clamp-2 break-words leading-snug"
                      title={c.objet}
                    >
                      {c.objet}
                    </div>
                    {c.observation && (
                      <div
                        className="text-[11px] text-surface-500 dark:text-surface-400 truncate mt-0.5 font-medium"
                        title={c.observation}
                      >
                        {c.observation}
                      </div>
                    )}
                  </td>

                  {/* Expéditeur / Destinataire (wrap on 2 lines, break-words) */}
                  <td className="py-2.5 px-2 sm:px-3 text-surface-800 dark:text-surface-200 font-medium text-xs sm:text-sm">
                    <div
                      className="line-clamp-2 break-words leading-tight"
                      title={isArrive ? c.expediteur : c.destinataire}
                    >
                      {isArrive ? c.expediteur : c.destinataire}
                    </div>
                  </td>

                  {/* Service Expéditeur (Départ) */}
                  {!isArrive && (
                    <td className="py-2.5 px-2 sm:px-3">
                      <div className="truncate max-w-full">
                        <Badge variant={getServiceBadgeVariant(c.service_expediteur)} dot>
                          {c.service_expediteur || 'Non spécifié'}
                        </Badge>
                      </div>
                    </td>
                  )}

                  {/* Date */}
                  <td className="py-2.5 px-2 sm:px-3 text-[11px] sm:text-xs font-semibold text-surface-600 dark:text-surface-300 font-mono text-center">
                    <div className="whitespace-nowrap" title={isArrive ? c.date_arrivee : c.date_depart}>
                      {isArrive ? c.date_arrivee : c.date_depart}
                    </div>
                  </td>

                  {/* Arrivée: Priorité, Service, Statut */}
                  {isArrive && (
                    <>
                      {/* Priorité */}
                      <td className="py-2.5 px-2 sm:px-3 text-center">
                        <div className="flex justify-center max-w-full">
                          <PriorityBadge priority={c.priorite} />
                        </div>
                      </td>

                      {/* Service Destinataire */}
                      <td className="py-2.5 px-2 sm:px-3">
                        <div className="truncate max-w-full">
                          <Badge variant={getServiceBadgeVariant(c.service_destinataire)} dot>
                            {c.service_destinataire}
                          </Badge>
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="py-2.5 px-2 sm:px-3">
                        <div className="flex flex-col gap-0.5 max-w-full">
                          <StatusBadge status={c.statut} />
                          {c.traite_par && (
                            <div
                              className="text-[10px] text-surface-500 dark:text-surface-400 font-medium truncate max-w-full"
                              title={`Par: ${c.traite_par}`}
                            >
                              Par: {c.traite_par}
                            </div>
                          )}
                        </div>
                      </td>
                    </>
                  )}

                  {/* Actions (compact layout with tooltip) */}
                  <td className="py-2.5 px-2 sm:px-3 text-right">
                    <div className="flex items-center justify-end gap-1 flex-nowrap">
                      {/* Consulter le PDF */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onViewPdf && onViewPdf(type, c)}
                        icon={Eye}
                        title="Consulter le document PDF"
                      />

                      {/* Télécharger le PDF */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadPdfFile(type, c)}
                        icon={Download}
                        title="Télécharger le PDF"
                        className="text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
                      />

                      {/* ACTION TRANSMETTRE : SEULEMENT POUR CHEF DE DIVISION ET STATUT NOUVEAU */}
                      {isArrive && isChefDivision && isNouveau && onTransmit && (
                        <Button
                          variant="primary"
                          size="icon"
                          onClick={() => onTransmit(c)}
                          icon={Send}
                          title="Transmettre au service destinataire"
                        />
                      )}

                      {/* ACTIONS DU SERVICE DESTINATAIRE : PRENDRE EN CHARGE / MARQUER COMME TRAITÉ */}
                      {isArrive && isUserService && isTransmis && onUpdateStatus && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onUpdateStatus(c, 'En cours')}
                          icon={Clock}
                          className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                          title="Prendre en charge ce courrier"
                        />
                      )}

                      {isArrive && isUserService && isEnCours && onUpdateStatus && (
                        <Button
                          variant="primary"
                          size="icon"
                          onClick={() => onUpdateStatus(c, 'Traité')}
                          icon={CheckCircle2}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          title="Marquer ce courrier comme Traité"
                        />
                      )}

                      {isArrive && isUserService && isTraite && (
                        <div className="inline-flex items-center gap-0.5 shrink-0">
                          <span
                            className="w-7 h-7 flex items-center justify-center rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
                            title={c.date_traitement ? `Traité le ${new Date(c.date_traitement).toLocaleDateString()}` : 'Traité'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                          {onUpdateStatus && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onUpdateStatus(c, 'En cours')}
                              icon={RotateCcw}
                              title="Repasser en cours (annulation)"
                              className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                            />
                          )}
                        </div>
                      )}

                      {/* Metadata Edit button for Secrétaire / Admin */}
                      {canEditMail && onEditCourrier && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditCourrier(c)}
                          icon={Edit3}
                          title="Modifier les métadonnées"
                          className="text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
