# HeadShotPlay

Create a full-stack multi-tenant web application named "HeadShotPlay" — a unified platform and aggregator for computer clubs in Kazakhstan (starting in Astana, scalable to CIS).

### Core Architecture & Roles:

1. **B2C (Gamers / Players):**

   - Interactive map interface (mock 2GIS/Yandex Maps) showing partner clubs, ratings, addresses, live pricing, and available zones.

   - PC/Console seat selection and booking system for specific time slots.

   - **Universal Subscriptions & Passes:** Purchase of "HeadShotPlay Passes" (gaming hours valid across all partner clubs, inspired by fitness aggregation models like 1Fit) and individual club packages.

   - **QR Check-in:** Digital pass with a dynamic QR code to scan at the club entrance to start and stop the gaming session.

   - **User Profile:** Remaining gaming hours, active bookings, payment history, reviews, and transaction logs.

2. **B2B (Club Owners / Partners):**

   - Partner dashboard with analytics: occupancy rate, daily/monthly revenue, and active bookings.

   - Management panel to configure club details, pricing tiers, hardware zones (Standard, VIP, PS5), and operational hours.

   - **SaaS Billing & Trial:** Automated 7-day free trial for new clubs upon registration. After the trial, a recurring subscription payment model (tiered SaaS fee based on club size / terminal count) to maintain platform access.

3. **Billing & Payment Gateways (Full Payment Support):**

   - Multi-method payment integration supporting local and international options: Kaspi QR / Kaspi Pay, Apple Pay / Google Pay, bank cards (Visa/Mastercard via Stripe, Paybox, or Robokassa simulation).

   - Support for both gamer transactions (top-ups, bookings, universal passes) and club owner subscription payments.

4. **Technical & Architectural Scope (MVP Phase):**

   - Logical seat/PC booking system based on club layouts and zone capacities (hardware status integration via external club software like Senet/Langame is excluded for the MVP phase).

   - State management to toggle between Player, Club Owner, and Super Admin views.

### Tech Stack & UI/UX Requirements:

- Modern, sleek, dark-mode-first gaming UI (cyberpunk/neon accents: deep dark backgrounds, vibrant purple/blue/cyan glowing highlights, clean typography).

- Responsive design optimized for mobile web (players on the go) and desktop (club dashboards).

- Built-in mock database schemas for Users, Clubs, PC_Zones, Bookings, Subscriptions, QR_Sessions, and Payments.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hotshot-play-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/54315ecf-ffa8-4b5b-a4c6-f7171912cfdd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
