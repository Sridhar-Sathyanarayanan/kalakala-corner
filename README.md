# kalakala-corner

# 🎨 Arts & Crafts E-Commerce App

A full-stack e-commerce application for showcasing and selling arts & crafts products. Built with Angular 20 and Angular Material on the frontend, and powered by Node.js and AWS (CloudFront, S3, DynamoDB) on the backend for scalable, secure delivery.

---

This repository contains two main parts:

- `mid-tier/` - Node/Express middle tier (TypeScript) that talks to AWS services (DynamoDB, S3) and exposes REST endpoints used by the frontend.
- `UI/` - Angular (v20) frontend application that provides the shop UI, admin screens, and PDF export features.

## Quick start

Install dependencies and run both services (from repository root):

```powershell
npm run install:all
npm run dev
```

To build for production:

```powershell
npm run build
```

See `mid-tier/package.json` and `UI/package.json` for individual scripts.

## Notes

- The mid-tier exposes a `/fetch-s3-image` endpoint used by the UI to proxy S3 images (useful for embedding images in PDFs).
- The Add Product UI supports a `notes` array — these are sent to the mid-tier as JSON in form submissions.

For more details, check the `mid-tier/` and `UI/` folders.

