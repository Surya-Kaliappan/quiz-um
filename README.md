# 🚀 Interactive Quiz Platform

**Interactive Quiz Platform** – a dynamic and real-time application where hosts (admins) can create and manage engaging quizzes, and players can join live sessions to compete!

This platform supports both **Admin-Paced** and **Self-Paced** quizzes, complete with per-question timers, secure server-side validation, and real-time score updates.

---

## 🌐 Live Demo

Experience the platform live here: [**https://surya-kaliappan.github.io/quiz-um/**](https://surya-kaliappan.github.io/quiz-um/)

---

## ✨ Features at a Glance

* **Admin Dashboard**: Create, activate, and manage all your quizzes from one central place.
* **Flexible Quiz Settings**:
    * **Admin-Paced**: Host controls when to move to the next question.
    * **Self-Paced**: Players answer at their own speed (optional question shuffling).
    * **Timers**: Set per-question and overall quiz time limits.
* **Question Management**: Easily add, edit, or delete questions with multiple-choice options and designated correct answers.
* **Player Lobby**: Real-time display of connected players before a quiz begins.
* **Live Gameplay**: Interactive question-and-answer interface for players.
* **Real-time Score Tracking**: See player scores update instantly.
* **Robust & Secure**: Server-side logic ensures fair play and accurate scoring.
* **Responsive & Modern UI**: A clean, consistent design that looks great on any device.

---

## 👨‍💻 For Quiz Hosts (Admins)

### 1. **Signing Up & Logging In**

* **Sign Up**: If you're a new host, navigate to the `Admin Sign Up` page. Provide your Name, Email, and Password to create your account.
* **Login**: Visit the `Admin Login` page. Enter your registered email and password to access your dashboard.

### 2. **Creating a New Quiz**

1.  From your Admin Dashboard, click the **"+ Create New Quiz"** button.
2.  **Quiz Title**: Give your quiz a descriptive name (e.g., "General Knowledge").
3.  **Quiz Type**:
    * **Admin Paced**: You (the host) will manually advance to the next question.
    * **Self Paced**: Players advance questions themselves once they answer.
4.  **Shuffle Questions**: (Only for Self-Paced) Choose if questions should appear in a random order for players.
5.  **Per Question Timer**: (Optional) Set a time limit (in seconds) for each question.
6.  Click **"Save Quiz"**.

### 3. **Adding Questions**

1.  After saving a quiz, you'll be redirected to the "Add Questions" page for that quiz.
2.  Enter the **Question Text**.
3.  Add up to **4 Options** for the answer.
4.  Crucially, select the **Correct Answer** from your provided options.
5.  Click **"Add Question"**.
6.  You can **"Edit"** or **"Delete"** existing questions.
7.  When done, click **"Back to Dashboard"**.

### 4. **Deploying and Hosting a Quiz**

1.  On your Admin Dashboard, find the quiz you want to run (its status will be "Draft").
2.  Click the **"Activate"** button next to the quiz.
3.  The quiz status will change to "Deployed," and a unique **6-character Join Code** will be generated.
4.  **Share this Join Code** with your players! They will use it to enter your quiz session.
5.  Click the **"Lobby"** button to open the live admin lobby in a new tab.

### 5. **Managing a Live Quiz Session**

* **In the Live Lobby (Admin View)**:
    * You will see players join in real-time.
    * **Start Quiz**: Click this when all players are ready. The first question will appear for all players.
    * **Next Question**: (For Admin-Paced quizzes) Click this to advance to the next question for all players.
    * **Player List**: See connected players and their current scores. Players who have left will be indicated.
    * **End Quiz**: After the last question, or when you decide, the quiz will conclude.

---

## 🎮 For Players

### 1. **Joining a Quiz**

1.  Go to the platform's Home Page (via the Live Demo link above).
2.  Enter the **6-character Join Code** provided by your host.
3.  Click **"Find Quiz"**.
4.  You'll be directed to the Lobby. Enter your **Player Name**, checked the **"Terms and Condition"** and click **"Join Quiz"**.
5.  Wait for the host to start the quiz!

### 2. **Playing the Quiz**

* **Questions**: Once the quiz starts, questions will appear one by one.
* **Answering**: Click on your chosen answer option. Once you click, your answer is submitted, and the options will freeze to prevent multiple submissions.
* **Timers**: Keep an eye on the per-question timer (if active).
* **Scores**: Your score will update as you answer questions correctly.
* **Persistence**: If you refresh your browser or accidentally close the tab, you can rejoin the quiz, and your progress (current question, submitted answers) will be restored.

### 3. **Quitting the Quiz**

* At any point, you can click the **"Quit Quiz"** button. Your name will be removed in the admin's lobby before quiz ends.

---

## 🛠️ Tech Stack & Tools

* **Frontend**:
    * **React**: A declarative, component-based JavaScript library for building user interfaces.
    * **Vite**: A fast and lightweight build tool for modern web projects.
    * **React Router**: For declarative routing within the single-page application.
* **Backend & Database**:
    * **Supabase**: An open-source Firebase alternative providing:
        * **PostgreSQL Database**: For storing quiz data, questions, players, and scores.
        * **Auth**: User authentication for administrators.
        * **Realtime**: For live updates in lobbies and during gameplay.
        * **Edge Functions (Deno)**: Serverless functions for secure, server-side logic (e.g., answer validation, score incrementing, quiz state management).
* **Styling**:
    * **TailwindCSS**: Tailored for a modern "Glassmorphism" UI design.
* **Deployment**:
    * **GitHub Pages**: For static website hosting.

---

## 📂 Project Structure
```
.
├── public/                     
│   └── logo.png               
├── src/
│   ├── pages/                  # All main application pages
│   │   ├── AdminDashboardPage.jsx
│   │   ├── AdminLoginPage.jsx
│   │   ├── AdminSignUpPage.jsx
│   │   ├── AddQuestionsPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── LiveLobbyPage.jsx
│   │   ├── LobbyPage.jsx
│   │   └── PlayQuizPage.jsx
│   ├── AuthContext.jsx         # React Context for user authentication
│   ├── App.jsx                 # Main application component and router setup
|   ├── index.css               # Connect Tailwindcss
│   ├── main.jsx                # Entry point for the React app
│   └── supabaseClient.js       # Supabase client initialization
├── supabase/                   # Supabase Edge Functions
│   ├── functions/
│   │   ├── _shared/            # Shared utility functions for Edge
│   │   │   └── cors.ts
│   │   └── quiz-manager/       # The core backend logic for quizzes
│   │       └── index.ts
│   └── migrations/             # Database schema migrations
└── .env.example                # environment variables
```