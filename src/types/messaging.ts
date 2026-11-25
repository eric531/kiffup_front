/** Messaging between customers and partners (V3, lot F9). */
export type MessagingSide = 'customer' | 'partner'

export interface MessageAttachment {
  /** API path (prefix with apiUrl()). */
  url: string
  name: string
  mime: string
  size: number
  width: number | null
  height: number | null
  is_image: boolean
}

export interface ChatMessage {
  id: number
  conversation_id: number
  sender: MessagingSide
  body: string | null
  /** What the customer was looking at when writing. */
  context: { type: 'listing' | 'video'; id: number; title: string } | null
  attachment: MessageAttachment | null
  created_at: string
}

export interface ConversationSummary {
  id: number
  partner: {
    id: number
    name: string
    type: string
    city: string
    takes_bookings: boolean
  } | null
  customer: { id: number; name: string }
  last_message: { sender: MessagingSide; preview: string; created_at: string } | null
  last_message_at: string | null
  unread: number
  /** The other side has read my messages up to this id ("Lu"). */
  other_read_id: number | null
  blocked: boolean
  reported: boolean
  report?: { by: MessagingSide; reason: string; at: string; closed_at: string | null } | null
}

export interface ConversationDetail {
  data: ConversationSummary
  messages: ChatMessage[]
  has_more?: boolean
}

/** Pushed on the inbox channels. */
export interface MessagePostedEvent {
  conversation_id: number
  message: ChatMessage
}
export interface ConversationReadEvent {
  conversation_id: number
  side: MessagingSide
  read_id: number
}
