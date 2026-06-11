export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  RECEPTIONIST = 'RECEPTIONIST',
  STAFF = 'STAFF',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
}

export enum BookingSource {
  DIRECT = 'DIRECT',
  MANUAL = 'MANUAL',
  BOOKING_COM = 'BOOKING_COM',
  AIRBNB = 'AIRBNB',
  WALK_IN = 'WALK_IN',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export enum ResBookingStatus {
  PENDING = 'PENDING',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  // Grupo grande que supera el umbral configurado: aceptado pero pendiente de
  // autorización manual del restaurante (puede reorganizar mesas a mano).
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  CONFIRMED = 'CONFIRMED',
  RELEASED = 'RELEASED',
  SEATED = 'SEATED',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  // Fases del flujo de servicio en sala (TablePlan / ReservationList)
  BAR_ARRIVAL = 'BAR_ARRIVAL',
  DESSERT = 'DESSERT',
  BILL_REQUESTED = 'BILL_REQUESTED',
  CLEANING = 'CLEANING',
  TO_REVIEW = 'TO_REVIEW',
}

export enum ResBookingOrigin {
  MANUAL = 'MANUAL',
  GOOGLE = 'GOOGLE',
  WEB = 'WEB',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN',
  THEFORK = 'THEFORK',
  RESY = 'RESY',
  WIDGET = 'WIDGET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum ShiftType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  DRINKS = 'DRINKS',
}

export enum RestaurantWaitlistStatus {
  WAITING = 'WAITING',
  NOTIFIED = 'NOTIFIED',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum EventBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}
