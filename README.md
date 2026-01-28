# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/100740da-0dfd-436a-ad08-72a23a3a37f2

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/100740da-0dfd-436a-ad08-72a23a3a37f2) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

**Frontend:**
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

**Backend:**
- FastAPI
- MongoDB
- Python 3.8+

## Backend Setup

The backend is located in the `backend/` directory. To set it up:

1. **Install Python dependencies:**
```sh
cd backend
pip install -r requirements.txt
```

2. **Make sure MongoDB is running:**
   - MongoDB should be running on `mongodb://localhost:27017`
   - If you need to install MongoDB, visit: https://www.mongodb.com/try/download/community

3. **Run the backend server:**
```sh
# Option 1: Using the run script
python run.py

# Option 2: Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

4. **Environment Variables (Optional):**
   Create a `.env` file in the `backend/` directory to customize settings:
   ```
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=datalens_db
   SECRET_KEY=your-secret-key-here
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

## Running the Full Application

1. **Start the backend** (in one terminal):
```sh
cd backend
python run.py
```

2. **Start the frontend** (in another terminal):
```sh
npm run dev
```

The frontend will be available at `http://localhost:8080` (or the port shown in the terminal)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/100740da-0dfd-436a-ad08-72a23a3a37f2) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
