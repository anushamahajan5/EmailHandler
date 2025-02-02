# Email Control System

## Overview

This project is an advanced email management system designed to handle over **100,000 emails**, including those from **Google** and **Microsoft**. The system allows users to:

- **Read and reply** to emails.
- **Send specific content** while ensuring emails reach the **inbox** instead of the spam/promotions folder.
- **Mark/unmark emails as spam** or starred.
- **Maintain a good IP reputation** to avoid getting banned.

The system is built using **Flask** for the backend and **React.js** for the frontend.

---

## Features

✅ Fetch and display emails 📧 
✅ Star/unstar emails  
✅ Mark/unmark spam emails  🚀
✅ Compose & reply to emails  ✉️
✅ OAuth-based authentication  
✅ Scalable to handle large volumes of emails  

---

## Tech Stack

### Backend:
- **Python 3.x**
- **Flask** (REST API)
- **OAuth2** (Google & Microsoft authentication)
- **MongoDB** (storing emails and metadata)
- **Celery** & **Redis** (for async processing)
- **SMTP** (for sending emails)
- **IMAP** (for reading emails)

### Frontend:
- **React.js**
- **Axios** (for API calls)
- **Material-UI** (for styling)

---

## Setup

### Backend Setup

#### Step 1: Clone the Repository
```bash
git clone https://github.com/your-repo/email-control-system.git
cd email-control-system/backend
```
#### Step 2: Set Up a Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```
#### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```
#### Step 4: Configure Environment Variables
Create a .env file in the backend directory:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
SECRET_KEY=your_secret_key
SMTP_SERVER=smtp.yourmail.com
SMTP_PORT=587
IMAP_SERVER=imap.yourmail.com
```

#### Step 5: Start the Backend Server
```bash
flask run
```
The backend will run on http://localhost:5000.

### Fro  ntend Setup

#### Step 1: Navigate to the Frontend Directory
```bash
cd ../frontend
```
#### Step 2: Install Dependencies
```bash
npm install
```
#### Step 3: Start the React App
```bash
npm start
```
The frontend will run on http://localhost:3000.

## API Endpoints
The following endpoints are available:

1. Fetch Emails
GET /inbox
#### Response:
json
```bash
{
  [
  {
    "id": "123",
    "snippet": "This is a test email",
    "starred": false,
    "spam": false
  }
]
}

```

2. Star an Email
```bash
GET /star/<email_id>
```
3. Mark Email as Spam
```bash
GET /spam/<email_id>
```
4. Unmark Email as Spam
```bash
GET /unspam/<email_id>
```
5. Send Email
Retrieves a list of all emails stored in the system.
```bash
POST /send
```
#### Request body:
```bash
{
  "recipient": "example@example.com",
  "subject": "Hello",
  "body": "This is a test email"
}

```
6. OAuth Login
```bash
GET /login
```
7.  Logout
```bash
GET /logout
```

Replies to an email.
Request body:
```bash
{
  "user_email": "user@example.com",
  "message_id": "unique_message_id",
  "reply_content": "This is the reply"
}
```

## Future Enhancements
🔹 AI-based spam detection
🔹 Email categorization using NLP
🔹 Bulk email processing optimizations
🔹 Better IP reputation management techniques

