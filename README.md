# ClockIn Study Hub

## 🛠 Tech Stack

### Frontend
- React
- TypeScript
- Vite
- DND Kit

### Backend
- Python
- FastAPI

### Database & Services
- Supabase (PostgreSQL + Auth)

### Deployment
- Vercel (Frontend Hosting)
- Railway (Backend Hosting)
  
## 🚀 Local Dev Instructions
### 🛠 Installation

To install and develop ClockIn locally, there are 3 main steps:

1. Clone the Repo

2. Install dependencies

3. Run development servers

## 📦 First Step: Clone the Repo

Navigate to the root directory where you would like the project created and clone the repository:

`git clone <repo-url>`

After cloning the repo locally, you will have the backend and frontend folders needed for development, along with the required requirements.txt file.

### 🎨 Frontend Setup

To set up the frontend after cloning, run the following commands from the root:

`cd ClockIn`

`cd frontend`

`npm install`

This installs the node_modules folder that is not uploaded to GitHub but is required for functionality.

### 🧠 Backend Setup

After setting up the frontend, to set up the backend, there are three main steps.

First, navigate back to the ClockIn folder:

`cd ClockIn`

Second, navigate into the backend folder:

`cd backend`

Then create the virtual environment:

`python -m venv venv`

Now activate the virtual environment:

Mac/Linux:
`source venv/bin/activate`

Windows (Command Prompt):
`venv\Scripts\activate`

Windows (PowerShell):
`.\venv\Scripts\Activate.ps1`

If activation fails in PowerShell due to execution policy restrictions, run:

`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

After activation, your virtual environment should be active and you are ready for step two.

## 📚 Second Step: Install Dependencies

Install the backend dependencies inside your activated virtual environment:

`pip install -r requirements.txt`

This installs the required backend packages listed in requirements.txt.

🔐 Environment Variables

For your .env file:

Copy .env.example and rename it to .env, then fill in your own API keys.

Example:

SUPABASE_URL=your-url

SUPABASE_KEY=your-key

## ▶️ Third Step: Run Development Servers

You must run both the frontend and backend servers during development.

### Run the Frontend (React + Vite)

From **inside the frontend folder**:

`npm run dev`

The frontend will run at:
http://localhost:5173

### Run the Backend (FastAPI)

From **inside the backend folder** __(with venv activated)__:

`uvicorn main:app --reload`

The backend will run at:
http://127.0.0.1:8000

### ✅ Important

**Both frontend** and backend servers must be running simultaneously for full application functionality.

## 🖥️ Development Branching and Pull Request Strategies

### Branching Strategy
- GitHub Flow (main/feature)
- The main branch will be continuously deployable, and new features will be implemented in temporary branches that will merge with the main branch after thorough testing and review has been completed

### Pull Request Process
- Developers will create a descriptively titled branch of the repository to modify the file they would like to edit
- After finishing the changes and performing local testing, the developer will ask the code to be reviewed by another technical teammate
- After passing the review, the developer will pull any recent changes, resolving any conflicts on their end, and then merge their changes with the main branch
- If two developers are working on the same file, the second developer will pull changes made by the first developer, resolve conflicts on their end, and then merge with the main branch
- If the code within a branch does not work or is rejected by a review, the developer will either work to debug the code or delete the branch.


