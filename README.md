# VisionVault

An AI-powered document classification application that analyzes and classifies documents, with support for both local and cloud-based AI processing.

## Overview

VisionVault lets users upload documents and automatically classifies them using AI. It supports two modes of operation depending on the user's needs and setup:

- **Local Mode** - runs the AI classification directly on your machine
- **Cloud Mode** - uses an online AI service for classification

## Features

- Document upload and analysis
- AI-based document classification
- Local Mode for offline/on-device processing
- Cloud Mode for online AI-powered processing
- Simple web interface

## Tech Stack

- JavaScript
- Vite (development server and build tool)
- Node.js / npm for dependency management

## Getting Started

1. Make sure Node.js is installed on your machine. Check with:
   ```
   node -v
   ```
2. Clone this repository:
   ```
   git clone https://github.com/rokyyy55/visionvaultt.git
   cd visionvaultt
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. Open the local link shown in the terminal (typically `http://localhost:5173`) in your browser.

Note: Do not open `index.html` directly as a file. The app must be run through the development server (steps above), or it will only show a blank page.

## Local Mode vs Cloud Mode

Local Mode processes documents using AI running directly on your machine, without needing an internet connection or external service. Cloud Mode sends documents to an online AI service for classification instead. Check the app settings to switch between the two modes.

## Video Walkthroughs

Since Local Mode setup can require some additional configuration, video walkthroughs are available showing how the app works in both modes. See the project links for these videos.

## Author

Hana Toubal
