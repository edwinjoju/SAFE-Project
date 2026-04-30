# S.A.F.E. Project: Teaching & Learning Guide

If you want to teach this project to others, it is an incredible showcase of modern web development because it combines a **Frontend UI**, a **Backend API**, **External Data Fetching**, and **AI Integration**. 

Here is exactly what you should cover when teaching it, broken down by Frontend and Backend.

---

## Part 1: What to Teach for the Frontend (React)

When teaching the frontend, your students need to understand how React creates a dynamic, interactive user interface. 

### 1. Component Architecture
* **What to teach:** How the UI is broken into smaller reusable pieces (e.g., a "Weather Card" component, a "Map" component).
* **Why it matters:** It keeps the code clean and prevents writing the same HTML over and over.

### 2. State Management (`useState`)
* **What to teach:** How React remembers things (like what city the user searched for, or the current weather data). 
* **Why it matters:** When state changes, React automatically updates the screen. Show them how typing in the search bar updates a state variable.

### 3. Side Effects (`useEffect`)
* **What to teach:** How to run code *after* the screen loads (like fetching the user's location automatically).
* **Why it matters:** If you fetch data outside of `useEffect`, it will run in an infinite loop and crash the browser!

### 4. API Communication (Axios)
* **What to teach:** How the frontend talks to your Python backend using `axios.get()`.
* **Why it matters:** The frontend is just an empty shell until it asks the backend for the data.

### 5. Conditional Rendering
* **What to teach:** Using JavaScript inside JSX to say: *"If weather data is loading, show a spinner. If it failed, show an error. Otherwise, show the dashboard."*

---

## Part 2: Backend Architecture (Python files explained)

Your backend is built with **FastAPI**. It is heavily "modularized", meaning the code isn't dumped into one giant file, but split logically into separate Python files. This is a crucial professional concept to teach.

Here is the exact purpose of every Python file in your `backend/` folder:

### 1. `main.py` (The Traffic Cop)
* **Purpose:** This is the entry point of the entire backend. It creates the FastAPI app and defines all the URLs (endpoints) the frontend can call, like `/current-weather` and `/plan-trip`.
* **What it does:** It doesn't do the heavy lifting itself. Instead, it receives a request from React, asks the other Python files for the data, and then packages it back up to send to React.

### 2. `weather.py` (The Data Gatherer)
* **Purpose:** Handles all communication with the outside world (specifically, the Open-Meteo API).
* **What it does:** It takes latitude and longitude coordinates, sends them to Open-Meteo, and fetches the hourly weather, UV index, and air quality (AQI). It also contains the math/logic to figure out the "best" and "worst" times to commute based on that data.

### 3. `skincare.py` (The Rules Engine)
* **Purpose:** Generates specific, actionable skincare advice.
* **What it does:** It takes the weather numbers (e.g., UV is 8, Humidity is 80%) and runs them through a series of `if/else` statements to decide exactly what the user should do (e.g., "Use SPF 50+", "Use a light water-based moisturizer"). 

### 4. `ai_assistant.py` (The Brain)
* **Purpose:** Connects your app to the Gemini AI to generate natural, human-like text.
* **What it does:** Instead of showing the user a robotic message like *"Rain at 5 PM. Commute bad."*, this file sends the raw weather data to Gemini, which writes a natural, empathetic summary (e.g., *"It's going to pour around 5 PM, so you might want to leave work a bit early to stay dry!"*).

### 5. `.env` (The Safe)
* **Purpose:** Stores your top-secret Gemini API keys safely so they aren't uploaded to GitHub. 

---

### 💡 Pro-Tip for Teaching
The best way to teach this is to **trace a single request**. 
1. Have a student click "Search" on the React frontend.
2. Show them how React uses Axios to call `main.py`.
3. Show how `main.py` asks `weather.py` for the forecast.
4. Show how `main.py` asks `ai_assistant.py` to write a summary of that forecast.
5. Watch the response travel back to React and update the screen!
