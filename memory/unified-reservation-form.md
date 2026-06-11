---
name: unified-reservation-form
description: El alta manual de reservas de restaurante en el panel admin usa un único componente compartido (ReservationForm)
metadata:
  type: project
---

En el panel admin, todas las altas manuales de reservas de **restaurante** deben pasar por el componente único `apps/web/components/restaurant/ReservationForm.tsx`, que postea a `POST /restaurant/bookings` con `restaurantId` en el body (servicio `RestaurantService.createBooking`).

Se usa desde: dashboard `restaurant/[id]`, plano de ocupación `occupancy`, y calendario `calendar` (contexto restaurante). El calendario antes tenía su propio formulario inline que estaba roto (posteaba a `/restaurant/{id}/bookings`, ruta inexistente, con campos `email`/`phone`/`time` incorrectos) — se eliminó en favor del compartido.

Reglas del componente: exige nombre + (correo **o** móvil); hora libre (`type="time"`) con sugerencias de `/slots`. El backend refuerza correo-o-móvil en `createBooking`.

El formulario de **hotel** del calendario sigue siendo propio (postea a `/bookings/:id`). El **widget público** (soroetairuna.com) es un flujo aparte (multipaso + Stripe, público) y no se unifica con el admin.

**Why:** el cliente pidió "unificar todo en uno" tras múltiples bugs causados por tener 3 formularios distintos para lo mismo.
**How to apply:** para cambios en el alta manual de reservas de restaurante, editar solo `ReservationForm`; no recrear formularios paralelos.
