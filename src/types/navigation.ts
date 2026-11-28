import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface NavItem {
  label: string
  to: RouteLocationRaw
  icon?: Component
  /** Count shown next to the label (unread messages…). */
  badge?: number
  /** Also active on the pages below (a conversation under "Messages"). */
  prefix?: boolean
  /** Shorter label for the phone tab bar ("Accueil" for "Tableau de bord"). */
  short?: string
  /** One of the phone tab bar's tabs; the other destinations go under "Plus". */
  tab?: boolean
}
