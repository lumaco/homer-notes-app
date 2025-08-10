# Homer and Golden Epic Notes 🐾

![App Screenshot](https://raw.githubusercontent.com/lumaco/homer-notes-app/main/public/screenshot.png)

**Homer and Golden Epic Notes** is a modern and minimal web app for taking private notes. It's designed with a dark, OLED-friendly interface and a smooth user experience on both desktop and mobile.

## ✨ Features

- **Note Creation:** Add notes with text and/or images.
- **Quick Paste:** Paste text directly from your clipboard with a single click.
- **Drag & Drop:** Reorder your notes with a simple drag-and-drop gesture (also supports long-press on mobile).
- **Quick Actions:** Easily edit, share, or delete your notes.
- **Fullscreen View:** Enlarge notes with images to view them in fullscreen mode.
- **Responsive Design:** A fully responsive UI for a seamless experience on any device.
- **PWA Ready:** Installable as a native-like app on your device.

## 🛠️ Tech Stack

- **Frontend:** [React](https://reactjs.org/) (with Create React App) & [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [Neon](https://neon.tech/) (Serverless PostgreSQL)
- **Deployment:** [Vercel](https://vercel.com/)

## 🚀 Getting Started & Local Development

To run the project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/lumaco/homer-notes-app.git](https://github.com/lumaco/homer-notes-app.git)
    cd homer-notes-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    The app will be available at `http://localhost:3000`.
    ```bash
    npm start
    ```

## ☁️ Deploying to Vercel + Neon

To deploy the application, follow this guide.

### Prerequisites

- A [GitHub](https://github.com/) account.
- A [Vercel](https://vercel.com/) account.
- A [Neon](https://neon.tech/) account.

### 1. Setting up the Neon Database

1.  Create a new project on Neon.
2.  In your project's dashboard, go to the "Connection Details" section and copy the **PostgreSQL** connection string.
3.  Create the `notes` table by running the following SQL query in Neon's SQL editor:
    ```sql
    CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        text TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ```

### 2. Configuring and Deploying on Vercel

1.  Push your code to your GitHub repository.
2.  Go to your Vercel dashboard and click **"Add New... > Project"**.
3.  Import your GitHub repository (`homer-notes-app`).
4.  Vercel will automatically detect that it's a `Create React App` project.
5.  Navigate to the project's **Settings → Environment Variables**.
6.  Add a new environment variable:
    - **Name:** `DATABASE_URL`
    - **Value:** Paste the Neon connection string you copied earlier.
7.  Click **"Deploy"**. Vercel will handle the build and deployment process. Every push to the `main` branch will trigger a new deployment automatically.

---

_Crafted with ❤️ by Eros._
