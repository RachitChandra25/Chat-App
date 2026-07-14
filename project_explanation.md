# Chat Application - Project Overview

## 1. Introduction
This project is a real-time full-stack chat application. It provides users with a seamless messaging experience, allowing them to communicate instantly, share images, and manage their profiles. The application features a robust backend for handling data and real-time events, alongside a responsive and modern frontend interface.

## 2. Technology Stack

### Frontend (Client-side)
* **React.js**: Used as the core library for building the user interface. It allows for a component-based architecture, making the UI modular and efficient.
* **Tailwind CSS**: A utility-first CSS framework used for rapid and responsive styling. It ensures the application looks great across all device sizes without writing custom CSS files.
* **React Router DOM**: Handles client-side routing, enabling navigation between different pages (like login, signup, and the main chat interface) without reloading the page.
* **Socket.IO-Client**: Establishes a WebSocket connection with the server for real-time, bi-directional communication.
* **Axios**: Used for making standard HTTP requests (REST API calls) for actions like authentication and profile updates.
* **Zustand / Context API (State Management)**: Manages the global state of the application, such as the currently logged-in user and active chat threads.
* **Vite**: The build tool and development server, chosen for its fast Hot Module Replacement (HMR) and optimized builds.

### Backend (Server-side)
* **Node.js & Express.js**: Forms the runtime environment and web framework for the backend. It serves as the foundation for handling API routes, middleware, and business logic.
* **MongoDB & Mongoose**: MongoDB is the NoSQL database used to store user data, messages, and conversation history. Mongoose is the Object Data Modeling (ODM) library that provides a structured schema-based solution to model the application data.
* **Socket.IO**: The server-side WebSocket library that pairs with the client to enable real-time messaging capabilities.
* **Cloudinary**: A cloud-based service used specifically for managing, storing, and delivering media assets (like profile pictures and shared images).
* **JSON Web Tokens (JWT)**: Used for secure authentication and authorization. It verifies the identity of users making requests to protected API endpoints.
* **Bcryptjs**: Used for securely hashing user passwords before storing them in the database, ensuring that sensitive data is protected.

## 3. Core Features and Their Concept

### Real-time Messaging (Socket.io)
**Concept**: Traditional HTTP requests are unidirectional (client asks, server responds). For a chat app, this is inefficient. Socket.IO establishes a persistent, bi-directional WebSocket connection between the client and the server.
**How it works**:
1. When a user logs in, their client connects to the Socket.IO server. The server keeps a mapping of the user's ID to their active socket connection.
2. When User A sends a message to User B, the client emits a "send_message" event to the server.
3. The server receives this event, saves the message to the MongoDB database for persistence, and then looks up User B's active socket connection.
4. The server immediately pushes a "receive_message" event containing the message data directly to User B's client. User B sees the message instantly without needing to refresh or poll the server.

### Image Sharing & Media Storage (Cloudinary)
**Concept**: Storing image files directly in a database like MongoDB is highly inefficient and slows down performance. Instead, we use Cloudinary as a dedicated Content Delivery Network (CDN) and media storage solution.
**How it works**:
1. When a user selects an image to send in a chat, the frontend typically converts the image to a Base64 string or a form-data object.
2. The client sends this data to the backend API.
3. The backend securely uploads the image data to the Cloudinary servers using our API credentials.
4. Cloudinary processes the image, stores it, and returns a secure, optimized public URL (e.g., `https://res.cloudinary.com/.../image.jpg`).
5. The backend saves this URL in the MongoDB message document instead of the actual image file.
6. When the chat loads on the frontend, it simply uses this URL in an `<img src="...">` tag to display the image.

### Profile Editing
**Concept**: Users need the ability to update their personal information, particularly their display name and profile picture.
**How it works**:
1. The user navigates to their profile settings and selects a new profile picture.
2. The frontend sends the new image to the backend via a secure, authenticated REST API endpoint (using JWT).
3. The backend uploads the new image to Cloudinary (similar to image sharing).
4. Cloudinary returns the new image URL.
5. The backend updates the user's document in the MongoDB database, replacing the old profile picture URL with the newly generated Cloudinary URL.
6. The server responds to the frontend with the updated user data, and the frontend state updates immediately to reflect the new profile image across the application.

## 4. Overall Project Flow
1. **Authentication (Signup/Login)**: A user creates an account. Their password is encrypted using Bcrypt and stored in MongoDB. Upon successful login, the server generates a JWT and sends it to the client (often stored in an HTTP-only cookie).
2. **Initialization**: The React frontend initializes, verifies the JWT to ensure the user is logged in, and establishes a Socket.IO connection to the backend.
3. **Fetching Data**: The client fetches the user's sidebar data (list of available users/friends to chat with) via a standard REST API call.
4. **Active Chat**: The user selects a contact. The client fetches the chat history for that specific conversation from the database.
5. **Real-time Interaction**: As the user types and sends text or images, the Socket.IO connection handles the immediate delivery of these assets, while the Express server ensures they are permanently logged in the database via Mongoose. Cloudinary handles any heavy lifting related to media storage.

## 5. Database Models

### User Model
The User model stores all information related to user accounts.
* **email** (String): The unique email address used for login and identification. Required and must be unique.
* **fullName** (String): The display name for the user visible to other contacts. Required.
* **password** (String): The encrypted (hashed) password used for authentication. Required with a minimum length of 6 characters.
* **profilePic** (String): A URL pointing to the user's profile image stored on Cloudinary. Defaults to an empty string.
* **bio** (String): A short biography or status message.
* **timestamps**: Automatically manages `createdAt` and `updatedAt` dates for when the account was created or modified.

### Message Model
The Message model is responsible for persistently storing chat records.
* **senderId** (ObjectId): A reference to the `User` document of the sender. Required.
* **receiverId** (ObjectId): A reference to the `User` document of the intended recipient. Required.
* **text** (String): The actual text content of the message.
* **image** (String): A URL pointing to an image attached to the message, stored on Cloudinary.
* **seen** (Boolean): Indicates whether the receiver has viewed the message. Defaults to `false`.
* **timestamps**: Automatically manages `createdAt` and `updatedAt` dates to order the conversation chronologically.
