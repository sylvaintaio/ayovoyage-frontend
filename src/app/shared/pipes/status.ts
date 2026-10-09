import { Pipe, PipeTransform } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusInfo {
  label: string;
  tone: BadgeTone;
}

/** Libellés et couleurs des statuts renvoyés par l'API. */
const STATUSES: Record<string, Record<string, StatusInfo>> = {
  booking: {
    pending: { label: 'En attente de paiement', tone: 'warning' },
    confirmed: { label: 'Confirmée', tone: 'success' },
    cancelled: { label: 'Annulée', tone: 'danger' },
    expired: { label: 'Expirée', tone: 'neutral' },
    refunded: { label: 'Remboursée', tone: 'info' },
    changed: { label: 'Modifiée', tone: 'neutral' },
  },
  ticket: {
    valid: { label: 'Valide', tone: 'success' },
    used: { label: 'Utilisé', tone: 'info' },
    cancelled: { label: 'Annulé', tone: 'danger' },
  },
  departure: {
    scheduled: { label: 'Programmé', tone: 'neutral' },
    boarding: { label: 'Embarquement', tone: 'warning' },
    departed: { label: 'Parti', tone: 'info' },
    arrived: { label: 'Arrivé', tone: 'success' },
    cancelled: { label: 'Annulé', tone: 'danger' },
  },
  payment: {
    pending: { label: 'En attente', tone: 'warning' },
    succeeded: { label: 'Payé', tone: 'success' },
    failed: { label: 'Échoué', tone: 'danger' },
    cancelled: { label: 'Annulé', tone: 'neutral' },
    refunded: { label: 'Remboursé', tone: 'info' },
  },
  refund: {
    requested: { label: 'À traiter', tone: 'warning' },
    approved: { label: 'Approuvé', tone: 'info' },
    rejected: { label: 'Refusé', tone: 'danger' },
    processed: { label: 'Versé', tone: 'success' },
  },
  parcel: {
    accepted: { label: 'Déposé', tone: 'neutral' },
    assigned: { label: 'Affecté', tone: 'info' },
    loaded: { label: 'Chargé', tone: 'info' },
    in_transit: { label: 'En route', tone: 'info' },
    arrived: { label: 'En correspondance', tone: 'warning' },
    ready: { label: 'À retirer', tone: 'success' },
    delivered: { label: 'Remis', tone: 'success' },
    returned: { label: 'Rendu', tone: 'neutral' },
    cancelled: { label: 'Annulé', tone: 'danger' },
  },
  baggage: {
    checked: { label: 'Enregistré', tone: 'neutral' },
    loaded: { label: 'En soute', tone: 'info' },
    unloaded: { label: 'Déchargé', tone: 'info' },
    delivered: { label: 'Remis', tone: 'success' },
    missing: { label: 'Manquant', tone: 'danger' },
    cancelled: { label: 'Annulé', tone: 'neutral' },
  },
  incident: {
    open: { label: 'Ouvert', tone: 'warning' },
    in_progress: { label: 'En cours', tone: 'info' },
    resolved: { label: 'Résolu', tone: 'success' },
    rejected: { label: 'Clos sans suite', tone: 'neutral' },
  },
  priority: {
    low: { label: 'Basse', tone: 'neutral' },
    normal: { label: 'Normale', tone: 'neutral' },
    high: { label: 'Haute', tone: 'warning' },
    urgent: { label: 'Urgente', tone: 'danger' },
  },
  bus: {
    active: { label: 'En service', tone: 'success' },
    maintenance: { label: 'Maintenance', tone: 'warning' },
    out_of_service: { label: 'Hors service', tone: 'danger' },
  },
};

export type StatusDomain = keyof typeof STATUSES;

export function statusInfo(domain: StatusDomain, status: string | null | undefined): StatusInfo {
  return STATUSES[domain]?.[status ?? ''] ?? { label: status ?? '—', tone: 'neutral' };
}

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(status: string | null | undefined, domain: StatusDomain): string {
    return statusInfo(domain, status).label;
  }
}

export const CHANNEL_LABELS: Record<string, string> = { app: 'Application', web: 'Site web', counter: 'Guichet' };

export const SERVICE_LABELS: Record<string, string> = {
  ticketing: 'Billetterie',
  parcel_drop: 'Dépôt de colis',
  parcel_pickup: 'Retrait de colis',
  lounge: 'Salon d’attente',
};

export const DAY_LABELS: Record<string, string> = {
  mon: 'Lundi',
  tue: 'Mardi',
  wed: 'Mercredi',
  thu: 'Jeudi',
  fri: 'Vendredi',
  sat: 'Samedi',
  sun: 'Dimanche',
};

export const PARCEL_CATEGORY_LABELS: Record<string, string> = {
  document: 'Document / enveloppe',
  small: 'Petit colis',
  medium: 'Colis moyen',
  large: 'Gros colis',
  fragile: 'Fragile',
};

export const INCIDENT_CATEGORY_LABELS: Record<string, string> = {
  not_received: 'Colis non reçu',
  delayed: 'Retard',
  damaged: 'Endommagé',
  opened: 'Ouvert ou contenu manquant',
  wrong_recipient: 'Remis à la mauvaise personne',
  wrong_agency: 'Mauvaise agence',
  info_error: 'Erreur d’information',
  lost: 'Perdu',
  other: 'Autre problème',
};

export const INCIDENT_SUBJECT_LABELS: Record<string, string> = { parcel: 'Colis', baggage: 'Bagage', booking: 'Voyage' };
