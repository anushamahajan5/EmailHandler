from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS

import pymongo
import os
import google.oauth2.credentials
import google_auth_oauthlib.flow
import googleapiclient.discovery
import base64
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

app = Flask(__name__)
app.secret_key = "your_secret_key"  # Required for session cookies
app.config['SESSION_COOKIE_SAMESITE'] = "None"
app.config['SESSION_COOKIE_SECURE'] = True  # Required for cross-site cookies
app.config['SESSION_COOKIE_HTTPONLY'] = False  # Allow JS access if needed
app.config['SESSION_PERMANENT'] = True
CORS(app, supports_credentials=True, origins="*")

# MongoDB Connection
client = pymongo.MongoClient("")
db = client["email_control"]
emails_collection = db["emails"]


# OAuth 2.0 Config
CLIENT_SECRETS_FILE = "credentials.json"
SCOPES = ['https://www.googleapis.com/auth/gmail.modify',  # For starring and marking spam
          'https://www.googleapis.com/auth/gmail.readonly']
REDIRECT_URI = "http://localhost:5000/callback"

@app.route("/")
def home():
    return "Welcome to Email Manager!"

@app.route("/session")
def check_session():
    return jsonify(dict(session))

@app.route("/check-auth", methods=["GET"])
def check_auth():
    if "credentials" in session:
        return jsonify({"authenticated": True}), 200
    return jsonify({"authenticated": False}), 401

# Google Login
@app.route("/login")
def login():
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, SCOPES
    )
    flow.redirect_uri = REDIRECT_URI
    auth_url, _ = flow.authorization_url(access_type="offline", include_granted_scopes="true")
    return redirect(auth_url)

# Google OAuth Callback
@app.route("/callback")
def callback():
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, SCOPES
    )
    flow.redirect_uri = REDIRECT_URI
    flow.fetch_token(authorization_response=request.url)
    
    credentials = flow.credentials
    session["credentials"] = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
    }
    return jsonify({"message": "Login successful"}), 200

# Fetch Emails
# Fetch Emails with Starred and Spam status
@app.route("/inbox", methods=["GET"])
def inbox():
    if "credentials" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    credentials = google.oauth2.credentials.Credentials(**session["credentials"])
    service = googleapiclient.discovery.build("gmail", "v1", credentials=credentials)
    
    # Get the list of messages in the inbox
    results = service.users().messages().list(userId="me", maxResults=10).execute()
    messages = results.get("messages", [])

    email_list = []
    for msg in messages:
        msg_data = service.users().messages().get(userId="me", id=msg["id"]).execute()
        email_snippet = msg_data.get("snippet", "")
        
        # Fetch sender from email headers
        headers = msg_data.get("payload", {}).get("headers", [])
        sender = next((header["value"] for header in headers if header["name"] == "From"), "Unknown")

        # Fetch the labels to check if the email is starred or marked as spam
        labels = msg_data.get("labelIds", [])
        starred = "STARRED" in labels
        spam = "SPAM" in labels
        
        # Add to email list
        email_list.append({
            "id": msg["id"],
            "sender": sender,
            "snippet": email_snippet,
            "starred": starred,
            "spam": spam
        })
        
        # Update the email status in MongoDB
        emails_collection.update_one(
            {"id": msg["id"]},
            {"$set": {"sender":sender,"starred": starred, "spam": spam}},
            upsert=True
        )

    return jsonify(email_list)


# Send Email
@app.route("/send", methods=["POST"])
def send_email():
    if "credentials" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    recipient = data.get("recipient", "").strip()  # Ensure it’s a string
    subject = data.get("subject", "")
    body = data.get("body", "")

    if not recipient or "@" not in recipient:  # Basic validation
        return jsonify({"error": "Invalid recipient email"+recipient.sender}), 400

    print(f"Recipient (cleaned): '{recipient}'")  # Debugging

    credentials = google.oauth2.credentials.Credentials(**session["credentials"])
    service = googleapiclient.discovery.build("gmail", "v1", credentials=credentials)

    message = MIMEText(body)
    message["To"] = recipient
    message["Subject"] = subject
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    try:
        service.users().messages().send(userId="me", body={"raw": raw_message}).execute()
        return jsonify({"message": "Email sent successfully"}), 200
    except Exception as e:
        print(f"Email sending error: {e}")  # Debugging
        return jsonify({"error": str(e)}), 500

@app.route("/compose", methods=["POST"])
def compose_email():
    if "credentials" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    sender = data.get("sender", "").strip()
    recipient = data.get("recipient", "").strip()
    subject = data.get("subject", "")
    body = data.get("body", "")

    if not sender or "@" not in sender:
        return jsonify({"error": "Invalid sender email"}), 400
    if not recipient or "@" not in recipient:
        return jsonify({"error": "Invalid recipient email"}), 400

    credentials = google.oauth2.credentials.Credentials(**session["credentials"])
    service = googleapiclient.discovery.build("gmail", "v1", credentials=credentials)

    message = MIMEMultipart()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    try:
        service.users().messages().send(userId="me", body={"raw": raw_message}).execute()
        return jsonify({"message": "Email sent successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Star an Email
@app.route("/star/<email_id>", methods=["GET","POST"])
def star_email(email_id):
    if "credentials" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    credentials = google.oauth2.credentials.Credentials(**session["credentials"])
    service = googleapiclient.discovery.build("gmail", "v1", credentials=credentials)

    try:
        # Star the email using Gmail API
        service.users().messages().modify(
            userId="me",
            id=email_id,
            body={"addLabelIds": ["STARRED"]}
        ).execute()

        # Update the starred status in the MongoDB collection
        emails_collection.update_one(
            {"id": email_id},  # Match the email by ID
            {"$set": {"starred": True}}  # Set the starred field to True
        )

        return jsonify({"message": "Email starred successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Mark Email as Spam
@app.route("/spam/<email_id>", methods=["GET","POST"])
def mark_spam(email_id):
    if "credentials" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    credentials = google.oauth2.credentials.Credentials(**session["credentials"])
    service = googleapiclient.discovery.build("gmail", "v1", credentials=credentials)

    try:
        # Mark the email as spam using Gmail API
        service.users().messages().modify(
            userId="me",
            id=email_id,
            body={"addLabelIds": ["SPAM"]}
        ).execute()

        # Update the spam status in the MongoDB collection
        emails_collection.update_one(
            {"id": email_id},  # Match the email by ID
            {"$set": {"spam": True}}  # Set the spam field to True
        )

        return jsonify({"message": "Email marked as spam"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/unspam/<email_id>", methods=["GET", "POST"])
def unmark_spam(email_id):
    if "credentials" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    credentials = google.oauth2.credentials.Credentials(**session["credentials"])
    service = googleapiclient.discovery.build("gmail", "v1", credentials=credentials)

    try:
        # Remove the email from spam using Gmail API
        service.users().messages().modify(
            userId="me",
            id=email_id,
            body={"removeLabelIds": ["SPAM"]}
        ).execute()

        # Update the spam status in MongoDB collection
        emails_collection.update_one(
            {"id": email_id},  # Match the email by ID
            {"$set": {"spam": False}}  # Set the spam field to False
        )

        return jsonify({"message": "Email unmarked as spam"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Logout User
@app.route("/logout", methods=["GET"])
def logout():
    session.pop("credentials", None)
    return jsonify({"message": "Logged out successfully"}), 200

if __name__ == "__main__":
    app.run(debug=True)
