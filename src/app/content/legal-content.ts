import { BRAND } from './brand';

/**
 * Informations légales de l'éditeur du site. À compléter par la société :
 * tant qu'une valeur commence par « [À COMPLÉTER », elle est signalée en
 * évidence sur les pages légales. Faire relire ces pages par un juriste.
 */
export const LEGAL = {
  /** Raison sociale : par défaut le nom de la marque (à remplacer si elle diffère). */
  companyName: BRAND.name as string,
  legalForm: '[À COMPLÉTER : forme juridique et capital, ex. SARL au capital de … F CFA]',
  rccm: '[À COMPLÉTER : n° RCCM]',
  ifu: '[À COMPLÉTER : n° IFU]',
  headOffice: '[À COMPLÉTER : adresse du siège social], Cotonou, Bénin',
  phone: '+229 01 00 00 00 00',
  email: `contact@${BRAND.domain}`,
  publicationDirector: '[À COMPLÉTER : nom et fonction du directeur de la publication]',
  privacyEmail: '[À COMPLÉTER : adresse dédiée aux données personnelles, ex. donnees@…]',
  host: {
    name: '[À COMPLÉTER : hébergeur du site et de l’API]',
    address: '[À COMPLÉTER : adresse de l’hébergeur]',
    country: '[À COMPLÉTER : pays où sont stockées les données]',
  },
  apdpDeclaration: '[À COMPLÉTER : n° de déclaration ou d’autorisation APDP, le cas échéant]',
  updatedAt: '2026-10-08',
};

export function isPlaceholder(value: string): boolean {
  return value.startsWith('[À COMPLÉTER');
}
