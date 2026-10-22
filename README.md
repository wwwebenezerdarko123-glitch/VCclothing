# VC Clothing

A responsive storefront for VC Clothing, built with React, TypeScript and Vite.

## Run locally

```bash
npm install
npm run dev
```

Run `npm run build` to create a production build in `dist/`.

## Storefront and studio demo

- The storefront uses the supplied logo, hero photography, atelier video and product images in `public/`.
- Use the Studio Access link in the footer, or visit `/admin`, to open the product and visitor-hello demo.
- Products, uploaded product images and welcome-screen answers are stored in the current browser's local storage. They are not sent to an owner, shared between browsers, or protected by admin authentication.
- Each studio product accepts a front and a back/side photo. Customers can hover to reveal the alternate view on desktop or tap the front/back control on touch screens. Older starter listings include sample alternate photos; replace these with the actual garment views.
- Products can be tagged for Men, Women or Unisex, and customers can filter the collection by gender and category.
- Each product accepts a front and a back/side photo. Customers can hover to reveal the alternate view on desktop or tap the front/back control on touch screens. Older starter listings include sample alternate photos; replace these with the actual garment views.
- The welcome screen includes a 20% discount request. Choosing the offer opens a prefilled email draft addressed to the owner; the visitor must review and send it. Automatic email delivery and discount-code issuance require a backend/email service.
- The order enquiry form opens WhatsApp (`0531459738`) or an email draft (`Ilesanmivictor26@gmail.com`) with the buyer's supplied contact details and selected item details. The buyer reviews and sends the message; no order, payment or notification is transmitted automatically.
- Starter product image URLs are included in the enquiry. Images uploaded in the local demo are stored only in the studio browser, so they need online image hosting before the owner can view them from a customer's message.
- The welcome screen includes a 20% discount request. Choosing the offer opens a prefilled email draft addressed to the owner; the visitor must review and send it. Automatic email delivery and discount-code issuance require a backend/email service.
- The starter products and prices are examples. Update them in the Studio Access demo before presenting the storefront as a real shop.

This frontend-only demo does not process payments or provide secure, shared product management or private visitor notifications. Those publishing features require a backend with authenticated admin access, persistent storage and hosted product images.
