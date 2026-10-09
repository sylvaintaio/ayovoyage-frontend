import { BRAND } from './brand';

/**
 * CONTENU ÉDITORIAL DU SITE
 * ------------------------------------------------------------------
 * Tous les textes de présentation de la société sont ici, pour pouvoir
 * les adapter sans toucher aux composants. Les valeurs entre crochets
 * [À COMPLÉTER] doivent être remplacées par les informations réelles
 * de la compagnie avant la mise en ligne. Les engagements (sécurité,
 * assurance…) doivent être validés par la compagnie : ne publiez que ce
 * qui est réellement appliqué.
 *
 * Les chiffres affichés sur le site (villes, agences, lignes, départs)
 * ne sont PAS ici : ils viennent en direct de l'API (/v1/public/showcase).
 */

export interface ContentCard {
  icon: IconName;
  title: string;
  text: string;
}

export type IconName =
  | 'seat'
  | 'phone'
  | 'ticket'
  | 'shield'
  | 'clock'
  | 'parcel'
  | 'star'
  | 'users'
  | 'briefcase'
  | 'map'
  | 'wifi'
  | 'snow'
  | 'plug'
  | 'bag'
  | 'chat'
  | 'search'
  | 'card'
  | 'bus'
  | 'heart'
  | 'check'
  | 'app';

export const COMPANY = {
  name: BRAND.name,
  tagline: 'Voyagez sereinement à travers le Bénin',
  shortDescription:
    'Compagnie de transport de voyageurs et de colis : départs quotidiens, sièges au choix, billets électroniques et agences partout dans le pays.',
  foundedYear: '[À COMPLÉTER]',
  phone: '+229 01 00 00 00 00',
  whatsapp: '+229 01 00 00 00 00',
  email: `contact@${BRAND.domain}`,
  address: 'Siège social : [À COMPLÉTER], Cotonou, Bénin',
  hours: 'Service client : 7 j/7, de 6 h à 21 h',
  /** Heures d'ouverture du service client (heure du Bénin), pour l'indicateur « Ouvert / Fermé ». */
  serviceHours: { open: 6, close: 21 },
  socials: [
    { label: 'Facebook', url: 'https://www.facebook.com/' },
    { label: 'Instagram', url: 'https://www.instagram.com/' },
    { label: 'TikTok', url: 'https://www.tiktok.com/' },
  ],
  paymentMethods: ['MTN MoMo', 'Moov Money', 'Celtiis Cash', 'Visa', 'Mastercard', 'Espèces en agence'],
};

export const ABOUT = {
  title: 'Une compagnie béninoise, au service des voyageurs',
  story: [
    "Depuis notre création, nous relions les grandes villes du Bénin avec une ambition simple : rendre le voyage en bus ponctuel, sûr et confortable, à un prix juste.",
    "Aujourd'hui, nous transportons chaque jour des voyageurs et leurs colis entre le sud et le nord du pays, avec une flotte entretenue dans nos ateliers et des équipes formées à l'accueil et à la sécurité.",
    "Avec la réservation en ligne, le choix du siège et le billet électronique, nous mettons la technologie au service de vos trajets : moins d'attente au guichet, plus de temps pour vous.",
  ],
  mission:
    'Offrir à chacun un moyen de voyager et d’envoyer ses colis en toute confiance, partout au Bénin et bientôt dans la sous-région.',
  values: [
    { icon: 'shield', title: 'Sécurité', text: 'Chauffeurs expérimentés, contrôles techniques réguliers et temps de repos respectés.' },
    { icon: 'clock', title: 'Ponctualité', text: 'Des horaires tenus et une information en temps réel en cas de changement.' },
    { icon: 'heart', title: 'Respect du client', text: 'Un accueil courtois, une écoute attentive et des réclamations traitées rapidement.' },
    { icon: 'check', title: 'Transparence', text: 'Prix affichés à l’avance, conditions d’annulation claires, aucun frais caché.' },
  ] satisfies ContentCard[],
  commitments: [
    'Contrôle technique de chaque bus avant le départ',
    'Ceinture de sécurité à chaque siège',
    'Assurance voyageurs et bagages',
    'Personnel identifiable et formé aux premiers secours',
  ],
};

export const SERVICES: (ContentCard & { link?: string; linkLabel?: string })[] = [
  {
    icon: 'bus',
    title: 'Voyages quotidiens',
    text: 'Des départs chaque jour entre les grandes villes du pays, de jour comme de nuit.',
    link: '/',
    linkLabel: 'Réserver',
  },
  {
    icon: 'seat',
    title: 'Sièges VIP et Premium',
    text: "Plus d'espace, embarquement prioritaire et services à bord : choisissez votre niveau de confort.",
    link: '/services',
    linkLabel: 'Comparer',
  },
  {
    icon: 'parcel',
    title: 'Envoi de colis',
    text: 'Déposez vos colis en agence et suivez-les jusqu’à la remise au destinataire.',
    link: '/colis',
    linkLabel: 'En savoir plus',
  },
  {
    icon: 'users',
    title: 'Groupes et événements',
    text: 'Mariages, funérailles, excursions scolaires ou sorties d’église : nous organisons votre voyage de groupe.',
    link: '/contact',
    linkLabel: 'Demander un devis',
  },
  {
    icon: 'briefcase',
    title: 'Entreprises',
    text: 'Déplacements de vos équipes, facturation centralisée et tarifs négociés.',
    link: '/contact',
    linkLabel: 'Nous contacter',
  },
  {
    icon: 'star',
    title: 'Programme de fidélité',
    text: 'Chaque voyage vous rapporte des points et vous fait gagner des réductions et des avantages.',
    link: '/fidelite',
    linkLabel: 'Découvrir',
  },
];

export const STEPS: ContentCard[] = [
  { icon: 'search', title: 'Recherchez', text: 'Choisissez votre trajet et votre date parmi nos départs.' },
  { icon: 'seat', title: 'Choisissez votre siège', text: 'Fenêtre, couloir, VIP : sélectionnez votre place sur le plan du bus.' },
  { icon: 'card', title: 'Payez en toute sécurité', text: 'Mobile Money ou carte bancaire, en quelques secondes.' },
  { icon: 'ticket', title: 'Voyagez', text: 'Votre billet QR arrive par e-mail et dans votre espace. Présentez-le à l’embarquement.' },
];

export const COMFORT: ContentCard[] = [
  { icon: 'snow', title: 'Climatisation', text: 'Des bus climatisés pour voyager au frais.' },
  { icon: 'plug', title: 'Prises USB', text: 'Rechargez votre téléphone pendant le trajet.' },
  { icon: 'wifi', title: 'Wi-Fi à bord', text: 'Sur une partie de la flotte.' },
  { icon: 'bag', title: 'Bagages inclus', text: 'Un bagage en soute compris dans chaque billet.' },
];

/**
 * Avis de voyageurs : ne publier que des témoignages réels, recueillis avec
 * l'accord des personnes (prénom et ville). Section masquée si la liste est vide.
 */
export const TESTIMONIALS: { name: string; city: string; text: string }[] = [];

/** Bandeau d'information (trafic, promotion). Laisser vide pour le masquer. */
export const INFO_BANNER = '';

export const PARCEL = {
  title: 'Envoyez vos colis partout où nous allons',
  intro:
    'Documents, marchandises, cadeaux : déposez votre colis dans l’une de nos agences. Il voyage dans nos bus et votre destinataire est prévenu dès son arrivée.',
  steps: [
    { icon: 'parcel', title: 'Déposez', text: 'En agence, avec le nom et le téléphone du destinataire.' },
    { icon: 'ticket', title: 'Recevez votre numéro', text: 'Un numéro de suivi unique et un reçu.' },
    { icon: 'bus', title: 'Suivez', text: 'Chaque étape est enregistrée : chargé, en route, arrivé.' },
    { icon: 'check', title: 'Retirez', text: 'Le destinataire est prévenu par SMS et retire le colis avec un code.' },
  ] satisfies ContentCard[],
  rules: [
    'Retrait avec le code reçu par SMS et une pièce d’identité',
    'Objets interdits : produits dangereux, inflammables ou illicites',
    'Valeur déclarée assurée en cas de perte ou de dommage',
    'Tarif selon la catégorie et le poids, payé au dépôt ou par le destinataire',
    'Un problème ? Signalez-le depuis la page de suivi du colis',
  ],
};

export const FAQ: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: 'Réservation et billets',
    items: [
      {
        q: 'Comment réserver un billet ?',
        a: 'Sur le site ou en agence. En ligne, choisissez votre trajet, votre siège, payez par Mobile Money ou carte, et recevez votre billet par e-mail.',
      },
      {
        q: 'Dois-je imprimer mon billet ?',
        a: 'Non. Présentez le QR code depuis votre téléphone (il reste disponible même sans connexion) ou la version PDF.',
      },
      {
        q: 'À quelle heure dois-je me présenter ?',
        a: 'Au moins 30 minutes avant le départ, à l’agence indiquée sur votre billet, pour l’enregistrement des bagages.',
      },
      {
        q: 'Puis-je réserver pour une autre personne ?',
        a: 'Oui. Indiquez le nom de chaque passager. Vous pouvez enregistrer vos proches dans votre espace pour aller plus vite.',
      },
    ],
  },
  {
    category: 'Paiement',
    items: [
      {
        q: 'Quels moyens de paiement acceptez-vous ?',
        a: 'Mobile Money (MTN MoMo, Moov Money…), carte bancaire en ligne, et espèces en agence.',
      },
      {
        q: 'Mon siège est-il réservé pendant le paiement ?',
        a: 'Oui, il est bloqué pour vous pendant quelques minutes. Passé ce délai sans paiement, il est remis en vente.',
      },
    ],
  },
  {
    category: 'Annulation, modification et remboursement',
    items: [
      {
        q: 'Puis-je annuler mon voyage ?',
        a: 'Oui, depuis votre espace client, jusqu’à quelques heures avant le départ (6 h en général). Des frais d’annulation peuvent s’appliquer ; le montant exact remboursé est affiché avant de confirmer. Voir nos conditions de voyage.',
      },
      {
        q: 'Puis-je changer la date ou l’heure de mon voyage ?',
        a: 'Oui, depuis votre espace client, jusqu’à 3 h avant le départ en général : choisissez un autre départ sur le même trajet. Des frais par passager et une éventuelle différence de tarif s’appliquent ; certains niveaux de fidélité modifient gratuitement.',
      },
      {
        q: 'Que se passe-t-il si le départ est annulé par la compagnie ?',
        a: 'Vous êtes prévenu par SMS et intégralement remboursé, ou nous vous proposons un autre départ.',
      },
    ],
  },
  {
    category: 'Bagages et colis',
    items: [
      {
        q: 'Combien de bagages puis-je emporter ?',
        a: 'Un bagage en soute est inclus (le poids est indiqué pour chaque trajet) ainsi qu’un petit sac en cabine. Les bagages supplémentaires sont payants.',
      },
      {
        q: 'Comment envoyer un colis ?',
        a: 'Déposez-le dans une agence proposant le service « Dépôt de colis ». Vous recevez un numéro de suivi (à suivre sur la page Colis) ; le destinataire reçoit un code de retrait par SMS à l’arrivée et le présente avec une pièce d’identité.',
      },
    ],
  },
  {
    category: 'Fidélité',
    items: [
      {
        q: 'Comment gagner des points ?',
        a: 'Chaque voyage effectué vous rapporte des points, crédités après l’embarquement, y compris pour les billets achetés en agence avec votre numéro.',
      },
      {
        q: 'Comment utiliser mes points ?',
        a: 'Au moment de réserver en ligne, indiquez le nombre de points à utiliser : leur valeur est déduite du prix.',
      },
    ],
  },
];
