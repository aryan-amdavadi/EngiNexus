<div align="center">
  <img src="https://placehold.co/1200x350/1e1e2e/a6e3a1?text=EngiNexus&font=Montserrat" alt="EngiNexus Cover Image">

  # 🚀 EngiNexus
  
  **A Next-Generation Hub for Engineering Collaboration and Innovation**
  
  [![UI/UX Centric](https://img.shields.io/badge/Design-UI%2FUX%20Centric-blueviolet?style=for-the-badge)](#)
  [![Responsive](https://img.shields.io/badge/Layout-Fully%20Responsive-success?style=for-the-badge)](#)
</div>

<br />

## 💡 The General Idea: What is EngiNexus?

**EngiNexus** is a centralized platform designed specifically for engineering students, developers, and professionals. It bridges the gap between conceptual learning and practical development by providing a unified workspace to manage projects, share technical resources, and collaborate seamlessly. 

Whether you are organizing complex laboratory data, writing code snippets, or managing group tasks, EngiNexus streamlines the workflow so you can focus on what matters most: building great things.

### ✨ Key UI/UX Highlights
* **Minimalist & Distraction-Free:** A clean, modern interface designed to reduce cognitive load and enhance focus.
* **Intuitive Navigation:** Complex data is broken down into easily digestible dashboards, ensuring that essential tools are never more than a click away.
* **Dark-Mode First:** Crafted with a deep, high-contrast color palette to prevent eye strain during long, late-night development sessions.
* **Fluid Responsiveness:** A flawless experience that adapts perfectly across desktops, tablets, and mobile devices.

---

## 🛠️ How It Works: First-Time Setup (Including Database)

Getting EngiNexus up and running on a brand-new device is simple. Follow these exact steps to set up your local development environment and database.

### Prerequisites
Before you begin, ensure your new device has the following installed:
* **Git:** For version control.
* **Node.js & npm:** (Or yarn/pnpm) for managing dependencies and running the application.
* **Database Server:** A running instance of your required database (e.g., PostgreSQL, MySQL).

### Installation Steps

**1. Clone the Repository**  
Bring the code to your local machine by cloning the repo:

```bash
git clone https://github.com/aryan-amdavadi/EngiNexus.git
cd EngiNexus
```

**2. Install Dependencies**  
Install all the required packages to make the UI and backend function:

```bash
npm install
```

**3. Configure Environment Variables**  
You need to connect your database and configure API keys. 
* Duplicate the `.env.example` file and rename it to `.env`.
* Open the new `.env` file and update your `DATABASE_URL` with your exact database credentials.

**4. Set Up the Prisma Database**  
Run the following Prisma commands to initialize your database schema and generate the Prisma Client.

Apply migrations to your database (this creates your tables) and generates the Prisma client:
```bash
npx prisma migrate dev
```
*(Note: If you are pulling the repo for the first time and just need to sync the schema without a migration history, you can alternatively use `npx prisma db push`)*

To view and manage your database data visually in your browser, you can run:
```bash
npx prisma studio
```

**5. Fire It Up!**  
Start the development server to see the UI in action:

```bash
npm run dev
```

*Open your browser and navigate to `http://localhost:3000` (or the port specified in your terminal) to explore the EngiNexus interface.*

---

## 🤝 Contributing & Feedback

Great UI/UX is built through iteration and feedback. If you have suggestions on how to improve the interface, optimize the user journey, or fix a bug, feel free to open an **Issue** or submit a **Pull Request**.

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/aryan-amdavadi">aryan-amdavadi</a></p>
</div>
