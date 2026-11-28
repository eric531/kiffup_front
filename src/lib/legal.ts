/**
 * Legal pages (conditions générales, confidentialité, mentions légales). Customers are addressed
 * with "tu", partners with "vous" (RG52). The company's identity is filled in LEGAL_ENTITY: an empty
 * value is simply not shown (registration details to add once known).
 */

export const LEGAL_ENTITY = {
  /** Raison sociale, e.g. "KiffUp SARL". */
  companyName: '',
  /** Forme juridique et capital, e.g. "SARL au capital de 1 000 000 FCFA". */
  legalForm: '',
  /** Numéro RCCM. */
  rccm: '',
  /** Numéro de compte contribuable (NCC). */
  ncc: '',
  /** Siège social. */
  address: '',
  /** Directeur de la publication (nom et fonction). */
  publicationDirector: '',
  /** Contact public. */
  email: 'contact@kiffup.com',
  whatsapp: '+225 05 03 75 86 56',
}

export const LEGAL_UPDATED_ON = '28 novembre 2026'

export type LegalBlock = string | { list: string[] }
export interface LegalSection {
  id: string
  title: string
  blocks: LegalBlock[]
}
export interface LegalDocument {
  title: string
  intro: string
  sections: LegalSection[]
}

const name = () => LEGAL_ENTITY.companyName || 'l’équipe KiffUp'

/** "Label : value" lines of the identity, the empty ones left out. */
const filled = (lines: [string, string][]) =>
  lines.filter(([, value]) => value !== '').map(([label, value]) => `${label} : ${value}`)

export const LEGAL_DOCUMENTS: Record<'terms' | 'privacy' | 'notice', () => LegalDocument> = {
  terms: () => ({
    title: 'Conditions générales',
    intro:
      'Les règles d’utilisation de KiffUp et de vente des réservations. En créant un compte ou en réservant, tu les acceptes.',
    sections: [
      {
        id: 'kiffup',
        title: 'KiffUp, c’est quoi ?',
        blocks: [
          `KiffUp est une plateforme de mise en relation, éditée par ${name()} (voir les mentions légales), entre toi et des établissements partenaires. Elle te permet de les découvrir en vidéo, de réserver chez eux (une nuit, une journée, une séance, un forfait pour un événement) et de payer en ligne par mobile money.`,
          'Les prestations (hébergement, location de véhicule, parking, soin, activité, accès à un lieu) sont fournies par les établissements partenaires, pas par KiffUp. KiffUp encaisse le paiement de ta réservation pour leur compte et leur reverse leur part.',
        ],
      },
      {
        id: 'compte',
        title: 'Ton compte',
        blocks: [
          {
            list: [
              'Tu peux réserver sans compte. Le compte garde tes réservations, tes favoris et tes messages.',
              'Tu te connectes avec ton numéro de téléphone et un code à 6 chiffres reçu sur WhatsApp, sans mot de passe. Ne communique ce code à personne, même à l’équipe KiffUp.',
              'Tu dois avoir au moins 18 ans pour utiliser KiffUp.',
              'Tu es responsable de ce qui est fait depuis ton numéro. Préviens-nous si tu le perds.',
            ],
          },
        ],
      },
      {
        id: 'reserver',
        title: 'Réserver',
        blocks: [
          'Tu choisis une offre, tes dates ou ton heure et la quantité. Avant de payer, KiffUp t’affiche le détail :',
          {
            list: [
              'le montant à payer maintenant : la réservation chez l’établissement et les frais de service KiffUp ;',
              'si l’offre est déductible : le montant de la réservation est alors retiré du prix de la prestation, et tu vois ce qu’il te restera à payer sur place ;',
              'la date limite d’annulation et la pénalité qui s’applique.',
            ],
          },
          'Les prix sont en francs CFA (FCFA). Les frais de service rémunèrent KiffUp et ne sont jamais déductibles. Pour un forfait événement, le prix peut augmenter à l’approche de l’événement ; le prix affiché au moment du paiement est celui que tu paies.',
        ],
      },
      {
        id: 'payer',
        title: 'Payer',
        blocks: [
          'Tu paies par mobile money (Wave, Orange Money, MTN, Moov, Djamo) sur la page de notre prestataire de paiement, Jèko. KiffUp ne reçoit jamais ton code secret.',
          'Pendant le paiement, ta réservation est gardée 30 minutes. Sans paiement confirmé dans ce délai, elle est libérée et rien ne t’est prélevé.',
          'Une fois le paiement confirmé, ta réservation est confirmée : tu reçois ton code de réservation (KU-XXXX-XXXX) et ton QR code par WhatsApp et, si tu l’as donné, par email. Ta page de suivi les garde aussi.',
        ],
      },
      {
        id: 'sur-place',
        title: 'Sur place',
        blocks: [
          'Présente ton QR code (ou ton code de réservation) à l’établissement. Le reste à payer, s’il y en a un, se règle directement à l’établissement.',
        ],
      },
      {
        id: 'seances',
        title: 'Séances (massage, soin, activité)',
        blocks: [
          {
            list: [
              'Tu demandes une heure et tu paies un acompte. L’établissement confirme, te propose une autre heure (une seule fois) ou refuse.',
              'Sans accord sur l’heure (refus, autre heure que tu refuses, pas de réponse dans le délai), tu es remboursé en entier, frais de service compris.',
              'Tant que l’heure n’est pas confirmée, tu peux retirer ta demande : tu es remboursé en entier.',
              'Une fois l’heure confirmée, tu reçois des rappels sur WhatsApp. L’acompte est déduit du prix de la séance.',
            ],
          },
        ],
      },
      {
        id: 'annulation',
        title: 'Annuler et être remboursé',
        blocks: [
          {
            list: [
              'Nuit, journée ou forfait : tu peux annuler pendant les 48 heures qui suivent ton paiement, et jamais dans les 48 heures qui précèdent le début de l’événement ou ton arrivée (minuit, heure d’Abidjan).',
              'Séance confirmée : tu peux annuler jusqu’à 24 heures avant.',
              'Une pénalité est retenue : un pourcentage du montant payé, indiqué avant le paiement. Tu es remboursé du montant payé moins cette pénalité.',
              'Après la date limite, ou si tu ne viens pas, rien n’est remboursé.',
              'Si l’établissement ou KiffUp annule ta réservation, tu es remboursé en entier.',
            ],
          },
          'Le remboursement est envoyé par mobile money au numéro qui a payé. Ces délais et ce pourcentage peuvent évoluer : ceux qui s’appliquent à ta réservation sont ceux affichés au moment de ton paiement, et rappelés sur ta page de suivi.',
        ],
      },
      {
        id: 'decouvrir',
        title: 'Découvrir, Vitrine et Pass Vitrine',
        blocks: [
          'Le fil Découvrir est gratuit. « Vitrine » regroupe les vidéos de lieux réservés aux clients connectés : quelques vidéos sont gratuites chaque jour, le Pass Vitrine ouvre toutes les vidéos et permet d’écrire à ces lieux pendant sa durée (24 heures, 7 jours ou 30 jours).',
          'Le Pass Vitrine est activé dès que ton paiement est confirmé. C’est un service fourni immédiatement : il n’est pas remboursable une fois activé. Il ne se renouvelle pas tout seul.',
        ],
      },
      {
        id: 'messagerie',
        title: 'Messagerie',
        blocks: [
          'Tu peux écrire aux établissements depuis une vidéo ou une offre. Ton numéro n’est pas montré à l’établissement dans la messagerie. Reste courtois : un message peut être signalé, et l’équipe KiffUp lit les messages signalés pour décider des suites.',
        ],
      },
      {
        id: 'contenus',
        title: 'Ce qui est interdit',
        blocks: [
          {
            list: [
              'Toute rencontre, tout service ou contenu à caractère sexuel, sous quelque forme que ce soit.',
              'Les contenus violents, haineux, trompeurs ou illégaux, et le harcèlement.',
              'Utiliser KiffUp pour une activité illégale, frauder un paiement ou se faire passer pour quelqu’un d’autre.',
            ],
          },
          'Toute vidéo ou tout message peut être signalé. KiffUp peut retirer un contenu et suspendre un compte qui ne respecte pas ces règles.',
        ],
      },
      {
        id: 'partenaires',
        title: 'Pour les établissements partenaires',
        blocks: [
          {
            list: [
              'Seuls des établissements ouverts au public, vérifiés par l’équipe KiffUp, peuvent devenir partenaires. Aucun profil de particulier.',
              'Vous êtes responsable de vos prestations, de l’exactitude de vos offres, de vos prix et de vos autorisations d’exercer.',
              'La commission KiffUp est ajoutée au prix que vous fixez : elle n’est jamais prélevée sur votre part.',
              'Votre part est bloquée au moins 48 heures après chaque paiement, le temps de la période d’annulation, puis devient disponible au retrait.',
              'Les retraits sont envoyés par mobile money au numéro de votre fiche, confirmés par un code reçu sur WhatsApp ; les frais de virement sont déduits. Vos pièces justificatives sont vérifiées avant votre premier retrait.',
              'Vos vidéos sont publiées après validation par l’équipe, selon les règles ci-dessus. Les promotions payantes (Boost, À la une) ne sont pas remboursables une fois diffusées.',
              'KiffUp peut suspendre un partenaire qui ne respecte pas ces conditions ; les réservations déjà payées sont alors remboursées aux clients.',
            ],
          },
        ],
      },
      {
        id: 'responsabilite',
        title: 'Responsabilités',
        blocks: [
          'KiffUp s’engage à faire fonctionner la plateforme et les paiements avec soin. La prestation elle-même relève de l’établissement : en cas de problème sur place, contacte-nous, nous t’aidons à trouver une solution avec lui.',
          'Le service peut être interrompu pour maintenance ou en cas de panne d’un prestataire (paiement, WhatsApp). Nous faisons au mieux pour le rétablir vite.',
        ],
      },
      {
        id: 'donnees',
        title: 'Tes données',
        blocks: [
          'Ce que nous faisons de tes données est expliqué dans la politique de confidentialité.',
        ],
      },
      {
        id: 'droit',
        title: 'Droit applicable et litiges',
        blocks: [
          `Ces conditions sont soumises au droit ivoirien. En cas de désaccord, écris-nous d’abord (${LEGAL_ENTITY.email} ou WhatsApp au ${LEGAL_ENTITY.whatsapp}) : nous cherchons une solution à l’amiable. À défaut, les tribunaux d’Abidjan sont compétents.`,
          'Nous pouvons modifier ces conditions ; la date de mise à jour est indiquée en haut de la page. Les conditions qui s’appliquent à une réservation sont celles en vigueur au moment de son paiement.',
        ],
      },
    ],
  }),

  privacy: () => ({
    title: 'Confidentialité',
    intro:
      'Les données que KiffUp utilise, pourquoi, avec qui elles sont partagées et comment exercer tes droits. Nous ne vendons pas tes données et ne faisons pas de publicité ciblée.',
    sections: [
      {
        id: 'responsable',
        title: 'Qui est responsable de tes données',
        blocks: [
          `Le responsable du traitement est ${name()} (voir les mentions légales). Nous appliquons la loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel et, pour les personnes qui vivent dans l’Union européenne, le RGPD.`,
        ],
      },
      {
        id: 'collecte',
        title: 'Ce que nous collectons',
        blocks: [
          {
            list: [
              'Ton compte : numéro de téléphone, nom, email si tu le donnes.',
              'Tes réservations : offre, dates ou heure, quantité, montants, codes de réservation, arrivée enregistrée par l’établissement.',
              'Tes paiements et remboursements : référence, montant, statut, moyen et numéro de paiement. Ton code secret mobile money n’arrive jamais chez KiffUp.',
              'Tes messages et les fichiers que tu envoies aux établissements.',
              'Ton activité dans Découvrir : vidéos regardées, j’aime, favoris, partages, signalements.',
              'Des données techniques : adresse IP, type d’appareil et journaux de sécurité.',
              'Pour les partenaires : identité du gérant, coordonnées de l’établissement, pièces justificatives, numéro de retrait.',
            ],
          },
        ],
      },
      {
        id: 'usages',
        title: 'Pourquoi',
        blocks: [
          {
            list: [
              'Faire fonctionner tes réservations : paiement, confirmation, accueil par l’établissement, annulation et remboursement.',
              'T’envoyer tes codes de connexion, confirmations et rappels sur WhatsApp et par email.',
              'Payer les établissements partenaires et vérifier leur identité.',
              'Protéger KiffUp et ses utilisateurs : sécurité, lutte contre la fraude, modération des contenus signalés.',
              'Montrer aux partenaires des statistiques sur leurs vidéos (vues, j’aime, contacts), sans les identités des spectateurs.',
              'Respecter nos obligations légales, notamment comptables.',
            ],
          },
        ],
      },
      {
        id: 'partage',
        title: 'Avec qui nous les partageons',
        blocks: [
          {
            list: [
              'L’établissement où tu réserves : ton nom, ton numéro et ta réservation, pour t’accueillir. Dans la messagerie, ton numéro ne lui est pas montré.',
              'Jèko, notre prestataire de paiement, pour les paiements, remboursements et retraits.',
              'Nos prestataires d’envoi de messages WhatsApp (PoolChat, et WhatsApp lui-même) et d’emails (Brevo).',
              'Notre hébergeur, Contabo (Allemagne), qui héberge le site et la base de données.',
              'Les autorités, uniquement si la loi nous y oblige.',
            ],
          },
          'Certains de ces prestataires sont situés hors de Côte d’Ivoire (en Europe notamment). Nous ne leur transmettons que ce qui est nécessaire à leur service.',
        ],
      },
      {
        id: 'conservation',
        title: 'Combien de temps',
        blocks: [
          {
            list: [
              'Ton compte : tant que tu l’utilises. Tu peux demander sa suppression à tout moment.',
              'Réservations et paiements : 10 ans, durée de conservation des pièces comptables.',
              'Codes de connexion WhatsApp : 10 minutes.',
              'Messages, vidéos et données techniques : le temps nécessaire au service et à la sécurité, puis supprimés ou rendus anonymes.',
            ],
          },
        ],
      },
      {
        id: 'droits',
        title: 'Tes droits',
        blocks: [
          `Tu peux demander à consulter, corriger ou supprimer tes données, ou t’opposer à certains usages. Écris-nous à ${LEGAL_ENTITY.email} ou sur WhatsApp au ${LEGAL_ENTITY.whatsapp}, depuis le numéro ou l’email de ton compte : nous répondons dans un délai d’un mois. Les données que la loi nous oblige à garder (pièces comptables) sont conservées jusqu’au bout de ce délai.`,
          'Tu peux aussi saisir l’ARTCI (Autorité de régulation des télécommunications/TIC de Côte d’Ivoire) ou, si tu vis dans l’Union européenne, l’autorité de ton pays (la CNIL en France).',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies',
        blocks: [
          'KiffUp utilise uniquement les cookies nécessaires à son fonctionnement : ta session de connexion et la protection des formulaires. Ton téléphone garde aussi quelques préférences (par exemple, avoir fermé l’invitation à installer l’application). Aucun cookie publicitaire ni de mesure d’audience.',
        ],
      },
      {
        id: 'securite',
        title: 'Sécurité',
        blocks: [
          'Connexion chiffrée (HTTPS), codes à usage unique, double authentification pour l’équipe, accès limités aux personnes qui en ont besoin, pièces justificatives et fichiers de messagerie sur un espace privé.',
        ],
      },
      {
        id: 'mineurs',
        title: 'Mineurs',
        blocks: ['KiffUp est réservé aux personnes de 18 ans et plus.'],
      },
      {
        id: 'modifications',
        title: 'Modifications',
        blocks: [
          'Nous pouvons mettre à jour cette politique ; la date de mise à jour est indiquée en haut de la page.',
        ],
      },
    ],
  }),

  notice: () => ({
    title: 'Mentions légales',
    intro: 'Qui édite et héberge KiffUp.',
    sections: [
      {
        id: 'editeur',
        title: 'Éditeur',
        blocks: [
          'KiffUp est une plateforme de mise en relation entre des clients et des établissements partenaires (hébergement, location de véhicules, bien-être, restauration, loisirs, événements), basée à Abidjan, Côte d’Ivoire.',
          ...(() => {
            const lines = filled([
              ['Raison sociale', LEGAL_ENTITY.companyName],
              ['Forme et capital', LEGAL_ENTITY.legalForm],
              ['RCCM', LEGAL_ENTITY.rccm],
              ['Compte contribuable (NCC)', LEGAL_ENTITY.ncc],
              ['Siège', LEGAL_ENTITY.address],
              ['Directeur de la publication', LEGAL_ENTITY.publicationDirector],
            ])
            return lines.length ? [{ list: lines }] : []
          })(),
        ],
      },
      {
        id: 'contact',
        title: 'Contact',
        blocks: [
          {
            list: filled([
              ['Email', LEGAL_ENTITY.email],
              ['WhatsApp', LEGAL_ENTITY.whatsapp],
            ]),
          },
        ],
      },
      {
        id: 'hebergeur',
        title: 'Hébergeur',
        blocks: ['Contabo GmbH, Aschauer Straße 32a, 81549 Munich, Allemagne.'],
      },
      {
        id: 'propriete',
        title: 'Propriété intellectuelle',
        blocks: [
          'Le nom KiffUp, le logo et le site sont protégés. Les vidéos, photos et textes des établissements restent leur propriété ; ils autorisent KiffUp à les diffuser sur la plateforme et pour la faire connaître.',
        ],
      },
    ],
  }),
}
