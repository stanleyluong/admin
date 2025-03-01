# Stanley Luong - Admin Panel

This is the admin panel for Stanley Luong's portfolio website.

## Features

- Authentication with Firebase
- Content Management for portfolio items
- Profile management
- Skills and work experience management
- Certificate management

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Firebase configuration:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key_here
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   REACT_APP_FIREBASE_APP_ID=your_app_id_here
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
   ```
4. Run the development server: `npm start`
5. Build for production: `npm run build`

## Deployment

This admin panel is designed to be deployed to the `/admin` path of the main website:

```
npm run deploy
```

This will build the app and deploy it to the specified path in the GitHub Pages environment.