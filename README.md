# 📝 Blogify – A Modern Blogging Platform

Blogify is a **full-stack web application** that enables users to **create, read, update, and delete blogs** while interacting through comments.  
It’s a complete blogging platform built with **Node.js, Express.js, MongoDB, and EJS**, with authentication handled via **JWT** and deployment on **AWS Elastic Beanstalk**.

---

## 🌐 Live Demo

🔗 **Hosted on AWS Elastic Beanstalk**  
http://blogsphere-env.eba-k5g2awyw.ap-south-1.elasticbeanstalk.com/

---

## 🚀 Features Overview

### 👥 User Authentication
- Secure **JWT-based authentication** system.
- Create an account, log in, and manage your blogs.
- Non-logged-in users can **view blogs only**, but not comment or edit.

### 🏠 Public Homepage
- Displays all blogs with:
  - Cover image
  - Title and author
  - Description preview
  - “View” button for full post

### 🔐 After Login
- Logged-in users see their **profile in the navbar**.
- Can **add new blogs**, **edit** or **delete** their own blogs.
- Can **comment** on any post.

### 🧾 Blog Details Page
- Shows:
  - Cover image
  - Title
  - Full body (Markdown supported)
  - Author profile
  - Comments section
- Blog owner can **edit** or **delete** directly.

### 👤 User Profile
- Displays:
  - Name and email
  - List of blogs authored by the user
  - Comments made by the user

### ➕ Add Blog
- Upload cover image
- Add title, description, and body (supports Markdown)
- Save and publish instantly

### ✏️ Edit Blog
- Update blog title, body, or image (optional)
- Maintain existing image if not replaced

### 💬 Comments
- Logged-in users can comment on any post.
- Comments display commenter’s name and message.

---

## 🖥️ previews

### 🏠 Homepage (Public View)
<img width="1912" height="1083" alt="image" src="https://github.com/user-attachments/assets/44e160ce-dfad-46ff-874e-982018c51df3" />


### 🔑 After Login
<img width="1929" height="1089" alt="image" src="https://github.com/user-attachments/assets/6fc9d4fc-2847-4486-a445-ad84c6f263ee" />


### 🧾 Blog Details + Comments
<img width="1908" height="1087" alt="image" src="https://github.com/user-attachments/assets/1f0f129b-2577-45f1-868c-188897bbb19b" />
<img width="1909" height="1085" alt="image" src="https://github.com/user-attachments/assets/18a4854d-8de8-469b-81a6-271cb5b27b22" />



### 👤 User Profile
<img width="1924" height="1077" alt="image" src="https://github.com/user-attachments/assets/2d02faa1-dbf4-4082-b094-8f319f47c1d5" />


### ➕ Add Blog
<img width="1929" height="1089" alt="image" src="https://github.com/user-attachments/assets/658c0987-ea2c-4098-84fc-4073ea068e2d" />


### ✏️ Edit Blog
<img width="1909" height="1054" alt="image" src="https://github.com/user-attachments/assets/b34ba600-602d-406a-a254-28fcbd2d7a5b" />



---

## ⚙️ Tech Stack

### 🧠 Backend
- **Node.js**
- **Express.js**
- **MongoDB** (via Mongoose)
- **JWT** for authentication
- **bcrypt.js** for password hashing
- **dotenv** for environment management
- **Multer** for image uploads

### 💻 Frontend
- **EJS** templating
- **Bootstrap 5** for styling and responsiveness
- **Markdown** support for blog content

### ☁️ Deployment
- **AWS Elastic Beanstalk** for scalable hosting
- **MongoDB Atlas** as cloud database


---

## 🧰 Folder Structure

```

Blogify/
│
├── Models/
│ ├── blog.js # Blog schema
│ ├── comments.js # Comment schema
│ └── user.js # User schema
│
├── middlewares/
│ └── authentication.js # JWT auth middleware
│
├── public/
│ ├── images/ # Static images
│ └── uploads/ # Uploaded cover images
│
├── routes/
│ ├── blog.js # Blog routes (CRUD)
│ └── user.js # User & Auth routes
│
├── services/
│ └── authentication.js # Token and auth helper functions
│
├── views/
│ ├── home.ejs # Homepage view
│ ├── addBlog.ejs # Add new blog form
│ ├── editBlog.ejs # Edit blog form
│ ├── profile.ejs # User profile page
│ ├── blogDetails.ejs # Blog details + comments
│ ├── login.ejs # Login page
│ └── register.ejs # Register page
│
├── .env # Environment variables
├── app.js # Main server file
├── package.json # Project dependencies
├── package-lock.json
└── blogSphere.zip # Archived backup of the project

```


---

## 🔐 Authentication Flow

| Step | Description |
|------|--------------|
| **Signup** | User registers using name, email, password |
| **Login** | JWT token generated and stored in cookie |
| **Protected Routes** | Middleware validates token before access |
| **Logout** | Token cleared securely |

---

## 🧾 Environment Variables (.env)

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```
---
## 🧩 Run Locally

Follow these steps to set up and run the project on your local machine 👇

---

###  Clone the Repository
```bash
git clone https://github.com/yourusername/blogify.git
cd blogify
```
###  Install Dependencies

```bash
npm install
```

###  Create a `.env` File

Add your environment variables inside the `.env` file (refer to the example above):

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

###  Run the Server

```bash
npm start
```

### 5️⃣ Visit in Browser

Once the server starts successfully, open your browser and go to:
```bash
**http://localhost:3000**
```

