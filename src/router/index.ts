import { createRouter, createWebHistory, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/identity'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** Page reserved to logged-in users having one of these roles (empty = any logged-in user). */
    roles?: Role[]
    requiresAuth?: boolean
    /** Login, forgot password…: logged-in users are sent to their home page. */
    guestOnly?: boolean
    /** Light page without a dark hero: the public header stays dark from the top (Messaging). */
    solidHeader?: boolean
    /** Full-height page (Messaging): no footer under it. */
    hideFooter?: boolean
    /** Same key for every page of a section: the layout keeps it mounted (Messenger-like list). */
    shellKey?: string
    /** Full-screen step on a phone (a conversation): no bottom tab bar, as in a mobile app. */
    hideTabBar?: boolean
  }
}

// Each area is a separate chunk: visitors never download the admin or partner code.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    // Hash links (#evenements…): wait for the page transition, then clear the fixed header.
    if (to.hash) {
      const delay = to.path === from.path ? 0 : 350
      return new Promise((resolve) =>
        setTimeout(() => resolve({ el: to.hash, top: 72, behavior: 'smooth' }), delay),
      )
    }
    return { top: 0 }
  },
  routes: [
    // "Découvrir" (V3): full-screen feed, outside the public layout.
    {
      path: '/decouvrir',
      name: 'discover',
      component: () => import('@/pages/public/DiscoverPage.vue'),
      meta: { title: 'Découvrir' },
    },
    // "Vitrine" (V3, lot F8): the Vitrine partners' videos, for logged-in customers.
    {
      path: '/decouvrir/vitrine',
      name: 'discover-vitrine',
      component: () => import('@/pages/public/DiscoverPage.vue'),
      props: { vitrine: true },
      meta: { title: 'Vitrine', requiresAuth: true, roles: ['customer'] },
    },
    {
      path: '/decouvrir/:videoId(\\d+)',
      name: 'discover-video',
      component: () => import('@/pages/public/DiscoverPage.vue'),
      props: true,
    },
    {
      path: '/',
      component: () => import('@/layouts/PublicLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/pages/public/HomePage.vue') },
        {
          path: 'connexion',
          name: 'login',
          component: () => import('@/pages/auth/LoginPage.vue'),
          meta: { title: 'Connexion', guestOnly: true },
        },
        {
          path: 'mot-de-passe-oublie',
          name: 'password.forgot',
          component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
          meta: { title: 'Choisir un mot de passe', guestOnly: true },
        },
        {
          path: 'reinitialiser-mot-de-passe',
          name: 'password.reset',
          component: () => import('@/pages/auth/ResetPasswordPage.vue'),
          meta: { title: 'Nouveau mot de passe', guestOnly: true },
        },
        // Customer account (V3): login by WhatsApp code, bookings, favorites.
        {
          path: 'compte/connexion',
          name: 'customer-login',
          component: () => import('@/pages/customer/CustomerLoginPage.vue'),
          meta: { title: 'Se connecter', guestOnly: true },
        },
        {
          path: 'compte',
          name: 'account',
          component: () => import('@/pages/customer/AccountPage.vue'),
          meta: { title: 'Mon compte', requiresAuth: true, roles: ['customer'] },
        },
        // Messaging (lot F9): list and conversation side by side on a computer, like Messenger.
        {
          path: 'compte/messages',
          component: () => import('@/pages/customer/MessagesPage.vue'),
          meta: {
            title: 'Mes messages',
            requiresAuth: true,
            roles: ['customer'],
            solidHeader: true,
            hideFooter: true,
            shellKey: 'customer-messages',
          },
          children: [
            {
              path: '',
              name: 'customer.messages',
              component: () => import('@/components/messaging/MessengerEmpty.vue'),
            },
            {
              path: ':conversationId(\\d+)',
              name: 'customer.conversation',
              component: () => import('@/pages/customer/ConversationPage.vue'),
              props: true,
              meta: { title: 'Conversation', hideTabBar: true },
            },
          ],
        },
        {
          path: 'compte/securite',
          name: 'account.security',
          component: () => import('@/pages/account/SecurityPage.vue'),
          meta: { title: 'Sécurité du compte', requiresAuth: true },
        },
        {
          path: 'reservation/:code',
          name: 'booking',
          component: () => import('@/pages/public/BookingTrackingPage.vue'),
          props: true,
          meta: { title: 'Ma réservation' },
        },
        // Short link encoded in the QR code.
        {
          path: 'r/:code',
          redirect: (to) => ({ name: 'booking', params: to.params, query: to.query }),
        },
        {
          path: 'paiement-simule/:reference',
          name: 'fake-payment',
          component: () => import('@/pages/public/FakePaymentPage.vue'),
          props: true,
          meta: { title: 'Paiement (test)' },
        },
        {
          path: 'devenir-partenaire',
          name: 'become-partner',
          component: () => import('@/pages/public/BecomePartnerPage.vue'),
          meta: { title: 'Devenir partenaire' },
        },
        // Legal pages (also the privacy policy URL asked by the app stores).
        {
          path: 'conditions-generales',
          name: 'legal.terms',
          component: () => import('@/pages/public/LegalPage.vue'),
          props: { doc: 'terms' },
          meta: { title: 'Conditions générales', solidHeader: true },
        },
        {
          path: 'confidentialite',
          name: 'legal.privacy',
          component: () => import('@/pages/public/LegalPage.vue'),
          props: { doc: 'privacy' },
          meta: { title: 'Confidentialité', solidHeader: true },
        },
        {
          path: 'mentions-legales',
          name: 'legal.notice',
          component: () => import('@/pages/public/LegalPage.vue'),
          props: { doc: 'notice' },
          meta: { title: 'Mentions légales', solidHeader: true },
        },
        // "Réserver": catalogue of listings bookable all year, outside events.
        {
          path: 'reserver',
          name: 'stays',
          component: () => import('@/pages/public/StaysPage.vue'),
          meta: { title: 'Réserver' },
        },
        {
          path: 'reserver/:listingId',
          name: 'stay',
          component: () => import('@/pages/public/StayPage.vue'),
          props: true,
        },
        // Links sent before the "Réserver" name (WhatsApp messages, shares).
        { path: 'sejours', redirect: (to) => ({ name: 'stays', query: to.query }) },
        {
          path: 'sejours/:listingId',
          redirect: (to) => ({ name: 'stay', params: to.params, query: to.query }),
        },
        // Event pages: kiffup.com/{slug} (static routes above always take precedence).
        {
          path: ':slug',
          name: 'event',
          component: () => import('@/pages/public/EventPage.vue'),
          props: true,
        },
        {
          path: ':slug/offres/:listingId',
          name: 'listing',
          component: () => import('@/pages/public/ListingPage.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/partenaire',
      component: () => import('@/layouts/PartnerLayout.vue'),
      meta: { requiresAuth: true, roles: ['partner'] },
      children: [
        {
          path: '',
          name: 'partner.dashboard',
          component: () => import('@/pages/partner/PartnerDashboardPage.vue'),
          meta: { title: 'Espace partenaire' },
        },
        {
          path: 'reservations',
          name: 'partner.bookings',
          component: () => import('@/pages/partner/PartnerBookingsPage.vue'),
          meta: { title: 'Mes réservations' },
        },
        {
          path: 'arrivees',
          name: 'partner.check-in',
          component: () => import('@/pages/partner/CheckInPage.vue'),
          meta: { title: 'Enregistrer une arrivée' },
        },
        // V3, lot F6: the partner keeps its own listings up to date when the team allows it.
        {
          path: 'offres',
          name: 'partner.listings',
          component: () => import('@/pages/partner/PartnerListingsPage.vue'),
          meta: { title: 'Mes offres' },
        },
        {
          path: 'offres/nouvelle',
          name: 'partner.listings.create',
          component: () => import('@/pages/admin/listings/ListingEditPage.vue'),
          props: { area: 'partner' },
          meta: { title: 'Nouvelle offre' },
        },
        {
          path: 'offres/:id',
          name: 'partner.listings.edit',
          component: () => import('@/pages/admin/listings/ListingEditPage.vue'),
          props: (route) => ({ id: String(route.params.id), area: 'partner' }),
          meta: { title: 'Mon offre' },
        },
        // Short "Devenir partenaire" request: the partner completes its record here.
        {
          path: 'fiche',
          name: 'partner.profile',
          component: () => import('@/pages/partner/PartnerProfilePage.vue'),
          meta: { title: 'Ma fiche' },
        },
        {
          path: 'horaires',
          name: 'partner.hours',
          component: () => import('@/pages/partner/PartnerHoursPage.vue'),
          meta: { title: 'Mes horaires' },
        },
        {
          path: 'videos',
          name: 'partner.videos',
          component: () => import('@/pages/partner/PartnerVideosPage.vue'),
          meta: { title: 'Mes vidéos' },
        },
        {
          path: 'a-la-une',
          name: 'partner.spotlight',
          component: () => import('@/pages/partner/PartnerSpotlightPage.vue'),
          meta: { title: 'À la une' },
        },
        {
          path: 'solde',
          name: 'partner.balance',
          component: () => import('@/pages/partner/PartnerBalancePage.vue'),
          meta: { title: 'Mon solde' },
        },
        {
          path: 'messages',
          component: () => import('@/pages/partner/PartnerMessagesPage.vue'),
          meta: { title: 'Messages', shellKey: 'partner-messages' },
          children: [
            {
              path: '',
              name: 'partner.messages',
              component: () => import('@/components/messaging/MessengerEmpty.vue'),
            },
            {
              path: ':conversationId(\\d+)',
              name: 'partner.conversation',
              component: () => import('@/pages/partner/PartnerConversationPage.vue'),
              props: true,
              meta: { title: 'Conversation', hideTabBar: true },
            },
          ],
        },
      ],
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'admin'] },
      children: [
        {
          path: '',
          name: 'admin.dashboard',
          component: () => import('@/pages/admin/AdminDashboardPage.vue'),
          meta: { title: 'Tableau de bord' },
        },
        {
          path: 'comptes',
          name: 'admin.staff-users',
          component: () => import('@/pages/admin/StaffUsersPage.vue'),
          meta: { title: 'Comptes administrateurs', roles: ['super_admin'] },
        },
        {
          path: 'reservations',
          name: 'admin.bookings',
          component: () => import('@/pages/admin/BookingsPage.vue'),
          meta: { title: 'Réservations' },
        },
        {
          path: 'moderation',
          name: 'admin.moderation',
          component: () => import('@/pages/admin/ModerationPage.vue'),
          meta: { title: 'Modération des vidéos' },
        },
        {
          path: 'messages-signales',
          name: 'admin.message-reports',
          component: () => import('@/pages/admin/MessageReportsPage.vue'),
          meta: { title: 'Messages signalés' },
        },
        {
          path: 'demandes-partenaires',
          name: 'admin.partner-requests',
          component: () => import('@/pages/admin/PartnerRequestsPage.vue'),
          meta: { title: 'Demandes de partenariat' },
        },
        {
          path: 'retraits',
          name: 'admin.withdrawals',
          component: () => import('@/pages/admin/WithdrawalsPage.vue'),
          meta: { title: 'Retraits partenaires' },
        },
        {
          path: 'journal',
          name: 'admin.audit',
          component: () => import('@/pages/admin/AuditLogPage.vue'),
          meta: { title: "Journal d'audit", roles: ['super_admin'] },
        },
        {
          path: 'parametres',
          name: 'admin.settings',
          component: () => import('@/pages/admin/SettingsPage.vue'),
          meta: { title: 'Paramètres', roles: ['super_admin'] },
        },
        {
          path: 'evenements',
          name: 'admin.events',
          component: () => import('@/pages/admin/events/EventsPage.vue'),
          meta: { title: 'Événements' },
        },
        {
          path: 'evenements/nouveau',
          name: 'admin.events.create',
          component: () => import('@/pages/admin/events/EventEditPage.vue'),
          meta: { title: 'Nouvel événement' },
        },
        {
          path: 'evenements/:id',
          name: 'admin.events.edit',
          component: () => import('@/pages/admin/events/EventEditPage.vue'),
          props: true,
          meta: { title: 'Événement' },
        },
        {
          path: 'partenaires',
          name: 'admin.partners',
          component: () => import('@/pages/admin/partners/PartnersPage.vue'),
          meta: { title: 'Partenaires' },
        },
        {
          path: 'partenaires/nouveau',
          name: 'admin.partners.create',
          component: () => import('@/pages/admin/partners/PartnerEditPage.vue'),
          meta: { title: 'Nouveau partenaire' },
        },
        {
          path: 'partenaires/:id',
          name: 'admin.partners.edit',
          component: () => import('@/pages/admin/partners/PartnerEditPage.vue'),
          props: true,
          meta: { title: 'Partenaire' },
        },
        {
          path: 'offres',
          name: 'admin.listings',
          component: () => import('@/pages/admin/listings/ListingsPage.vue'),
          meta: { title: 'Offres' },
        },
        {
          path: 'offres/nouvelle',
          name: 'admin.listings.create',
          component: () => import('@/pages/admin/listings/ListingEditPage.vue'),
          meta: { title: 'Nouvelle offre' },
        },
        {
          path: 'offres/:id',
          name: 'admin.listings.edit',
          component: () => import('@/pages/admin/listings/ListingEditPage.vue'),
          props: true,
          meta: { title: 'Offre' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/public/NotFoundPage.vue'),
      meta: { title: 'Page introuvable' },
    },
  ],
})

// One session check at a time, shared by concurrent navigations.
let pendingUser: Promise<unknown> | null = null

router.beforeEach(async (to): Promise<RouteLocationRaw | boolean> => {
  const auth = useAuthStore()
  if (!auth.loaded) {
    pendingUser ??= auth.fetchUser().finally(() => (pendingUser = null))
    // Public pages render immediately: the header updates once the session is known.
    const needsUser =
      to.meta.guestOnly ||
      to.matched.some((record) => record.meta.requiresAuth || record.meta.roles)
    if (!needsUser) return true
    await pendingUser
  }

  if (to.meta.guestOnly && auth.isAuthenticated) return auth.homeRoute

  // The most specific route defines the allowed roles (e.g. super_admin only inside /admin).
  const roles = [...to.matched].reverse().find((record) => record.meta.roles)?.meta.roles

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  if (requiresAuth && !auth.isAuthenticated) {
    // Customers log in with their phone number, partners and staff with their email.
    const login = roles?.includes('customer') ? 'customer-login' : 'login'
    return { name: login, query: { redirect: to.fullPath } }
  }

  if (roles && !auth.hasRole(...roles)) return auth.homeRoute

  // Back-office accounts must confirm 2FA before using the back-office.
  if (to.path.startsWith('/admin') && auth.user?.two_factor_required) {
    return { name: 'account.security', query: { required: '1' } }
  }

  return true
})

export default router
