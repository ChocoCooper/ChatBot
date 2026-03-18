# Project Title - ***"HealthAssist: AI-Driven Public Health Chatbot for Disease Awareness"***

## Project Overview

A comprehensive, serverless web application that acts as a personal AI health companion. It provides users with instant medical information, context-aware video recommendations, nearby hospital tracking, and personalized daily health news.

## Features

- 🤖 **Smart AI Chatbot**: Powered by Google Gemini 2.5 Flash. Supports text, voice input (Web Speech API), text-to-speech, and image analysis (e.g., uploading photos for health-related queries).
- 📊 **Personalized Dashboard**: Tracks conversation history, user profile details (age, gender), and calculates a dynamic "Health Status" based on recent AI interactions.
- 📺 **Curated Video Guides**: Automatically fetches and recommends relevant medical explanation videos from YouTube alongside chatbot responses.
- 🏥 **Nearby Hospitals Locator**: Interactive map (powered by Leaflet.js and Overpass API) that scans for clinics and hospitals within a 4km radius of the user's location.
- 📰 **Daily Health Feed**: Displays live, personalized health articles using the GNews API based on the user's health status.
- 🔐 **Secure Authentication**: Full user sign-up and login system powered by Supabase Auth.
- ⚡ **Serverless Architecture**: Securely hides sensitive API keys (Gemini, YouTube, GNews) using Netlify serverless functions.
- 🎨 **Modern UI/UX**: Fully responsive, frosted glass design with light/dark mode toggles and page transition preloaders.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend / BaaS**: Supabase (PostgreSQL Database & Authentication)
- **Serverless Hosting**: Netlify & Netlify Functions (Node.js)
- **Mapping**: Leaflet.js, OpenStreetMap
- **APIs**: Google Gemini AI, YouTube Data v3, GNews API

## License

This project is licensed under the MIT License.
