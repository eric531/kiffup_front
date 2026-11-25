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
}
