# Bitespeed Identity Reconciliation Service

A backend service that helps "Doc Brown" reconcile user identities across multiple purchase events. This service links different contact information (emails and phone numbers) to a single primary identification cluster.

## 🚀 Live Endpoint
**URL:** `https://bitespeed-identity-reconciliation-wki8.onrender.com/identify`  
**Method:** `POST`  
**Payload:** `JSON`

## 🛠️ Tech Stack
- **Runtime:** Node.js (v22)
- **Language:** TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL (Hosted on Neon.tech)
- **Deployment:** Render

## 💡 Identity Reconciliation Logic
The service implements a **Primary-Root** strategy to handle three core scenarios:

1. **New User:** If no matching email or phone number exists, a new `primary` contact is created.
2. **New Information:** If a match is found but the request contains a new email or phone number, a `secondary` contact is created and linked to the existing primary.
3. **Primary Merging:** If a request contains information that connects two previously unrelated `primary` contacts, the newer primary is demoted to `secondary` and all its descendants are re-linked to the oldest primary root.



## 🏃 How to Run Locally

1. **Clone the repo:**
   ```bash
   git clone [https://github.com/vaibhavjathar/bitespeed-identity-reconciliation-assignment.git](https://github.com/vaibhavjathar/bitespeed-identity-reconciliation-assignment.git)
   cd bitespeed-identity-reconciliation-assignment
