import React, { useState, useEffect } from "react";

const BASE_URL = "http://localhost:5000";

const App = () => {
    const [emails, setEmails] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null); // Store the full email details
    const [loggedIn, setLoggedIn] = useState(false);
    const [replyEmail, setReplyEmail] = useState({ recipient: "", subject: "", body: "" });
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [showComposeBox, setShowComposeBox] = useState(false);
    const [composeEmail, setComposeEmail] = useState({ recipient: "", subject: "", body: "" });


    useEffect(() => {

        const fetchInbox = () => {
            fetch(`${BASE_URL}/inbox`, { credentials: "include" })
                .then((res) => {
                    if (res.status === 401) {
                        setLoggedIn(false);
                    } else {
                        setLoggedIn(true);
                        return res.json();
                    }
                })
                .then((data) => {
                    if (data) setEmails(data);
                })
                .catch((err) => console.error("Error fetching emails:", err));
        };

        fetch(`${BASE_URL}/session`, { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                if (!data.credentials) {
                    setLoggedIn(false);
                } else {
                    setLoggedIn(true);
                    fetchInbox();
                }
            })
            .catch((err) => console.error("Error checking session:", err));
    }, []);

    const handleEmailClick = (emailId) => {
        fetch(`${BASE_URL}/email/${emailId}`, { credentials: "include" })
            .then(res => res.json())
            .then(data => setSelectedEmail(data))
            .catch(err => console.error("Error fetching email:", err));
    };

    const handleComposeEmail = () => {
        fetch(`${BASE_URL}/send`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(composeEmail),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    alert("Failed to send email: " + data.error);
                } else {
                    alert("Email sent successfully!");
                    setShowComposeBox(false);
                    setComposeEmail({ recipient: "", subject: "", body: "" });
                }
            })
            .catch((err) => console.error("Error sending email:", err));
    };

    const updateEmailStatus = (emailId, field, value) => {
        setEmails((prevEmails) =>
            prevEmails.map((email) =>
                email.id === emailId ? { ...email, [field]: value } : email
            )
        );
    };

    const handleStar = (emailId) => {
        fetch(`${BASE_URL}/star/${emailId}`, { method: "GET", credentials: "include" })
            .then(() => {
                updateEmailStatus(emailId, "starred", true);
            })
            .catch((err) => console.error("Error starring email:", err));
    };

    const handleSpam = (emailId, isSpam) => {
        const endpoint = isSpam ? "unspam" : "spam";

        fetch(`${BASE_URL}/${endpoint}/${emailId}`, { method: "GET", credentials: "include" })
            .then(response => response.json())
            .then(data => {
                alert(data.message);

                // Update local state instead of reloading the page
                setEmails((prevEmails) =>
                    prevEmails.map((email) =>
                        email.id === emailId ? { ...email, spam: !isSpam } : email
                    )
                );
            })
            .catch(error => console.error(`Error updating spam status:`, error));
    };



    const handleReply = (recipientEmail) => {
        console.log("Recipient email:", recipientEmail);
        setReplyEmail({ recipient: recipientEmail, subject: "Subject: ", body: "" });
        setShowReplyBox(true);
    };

    const handleSendEmail = () => {
        fetch(`${BASE_URL}/send`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(replyEmail),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    alert("Failed to send email: " + data.error);
                } else {
                    alert("Email sent successfully!");
                    setShowReplyBox(false);
                    setReplyEmail({ recipient: "", subject: "", body: "" });
                }
            })
            .catch((err) => console.error("Error sending email:", err));
    };

    return (

        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1>Email Manager</h1>
            {!loggedIn ? (
                <button onClick={() => (window.location.href = `${BASE_URL}/login`)} style={buttonStyle}>
                    Login with Google
                </button>
            ) : (
                <>
                    <button onClick={() => fetch(`${BASE_URL}/logout`, { method: "GET" }).then(() => setLoggedIn(false))} style={buttonStyle}>
                        Logout
                    </button>
                    <button onClick={() => setShowComposeBox(true)} style={buttonStyle}>✉️ Compose</button>
                    <h2>Your Inbox</h2>
                    <ul style={{ listStyleType: "none", padding: 0 }}>
                        {emails.map((email) => (
                            <li key={email.id} style={emailStyle} >
                                <p><strong>Snippet:</strong> {email.snippet}</p>
                                <p>⭐ Starred: {email.starred ? "Yes" : "No"}</p>
                                <p>⚠️ Spam: {email.spam ? "Yes" : "No"}</p>
                                <button onClick={() => handleStar(email.id)} style={buttonStyle}>⭐ Star</button>
                                <button onClick={() => handleSpam(email.id, email.spam)} style={buttonStyle}>
                                    {email.spam ? "✅ Unspam" : "🚫 Mark as Spam"}
                                </button>
                                <button onClick={() => handleEmailClick(email.id)} style={buttonStyle}>📩 View</button>

                                <button onClick={() => handleReply(email.sender)} style={buttonStyle}>💬 Reply</button>
                            </li>
                        ))}
                    </ul>

                    {selectedEmail && (
                        <div style={{
                            maxWidth: "600px",
                            margin: "20px auto",
                            padding: "15px",
                            background: "#fff",
                            borderRadius: "8px",
                            boxShadow: "0px 0px 10px rgba(0,0,0,0.1)"
                        }}>
                            <h3>{selectedEmail.subject}</h3>
                            <p><strong>From:</strong> {selectedEmail.sender}</p>
                            <p><strong>Date:</strong> {selectedEmail.date}</p>
                            <div style={{ wordBreak: "break-word", lineHeight: "1.6" }}
                                dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                            <button onClick={() => setSelectedEmail(null)}
                                style={{ marginTop: "10px", padding: "8px 12px", cursor: "pointer" }}>
                                Close
                            </button>
                        </div>
                    )}


                </>
            )}

            {showReplyBox && (
                <div style={replyBoxStyle}>
                    <h3>Reply to {replyEmail.recipient}</h3>
                    <input
                        type="text"
                        value={replyEmail.subject}
                        onChange={(e) => setReplyEmail({ ...replyEmail, subject: e.target.value })}
                        placeholder="Subject"
                        style={inputStyle}
                    />
                    <textarea
                        value={replyEmail.body}
                        onChange={(e) => setReplyEmail({ ...replyEmail, body: e.target.value })}
                        placeholder="Write your message..."
                        rows="5"
                        style={textareaStyle}
                    />
                    <button onClick={handleSendEmail} style={buttonStyle}>📧 Send</button>
                    <button onClick={() => setShowReplyBox(false)} style={buttonStyle}>❌ Cancel</button>
                </div>
            )}

            {showComposeBox && (
                <div style={replyBoxStyle}>
                    <h3>Compose Email</h3>
                    <input
                        type="text"
                        value={composeEmail.recipient}
                        onChange={(e) => setComposeEmail({ ...composeEmail, recipient: e.target.value })}
                        placeholder="Recipient"
                        style={inputStyle}
                    />
                    <input
                        type="text"
                        value={composeEmail.subject}
                        onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
                        placeholder="Subject"
                        style={inputStyle}
                    />
                    <textarea
                        value={composeEmail.body}
                        onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                        placeholder="Write your message..."
                        rows="5"
                        style={textareaStyle}
                    />
                    <button onClick={handleComposeEmail} style={buttonStyle}>📧 Send</button>
                    <button onClick={() => setShowComposeBox(false)} style={buttonStyle}>❌ Cancel</button>
                </div>
            )}
        </div>
    );
};

const buttonStyle = {
    padding: "10px 20px",
    margin: "10px",
    fontSize: "16px",
    cursor: "pointer",
    backgroundColor: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "5px",
};

const emailStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    margin: "10px",
    borderRadius: "5px",
    backgroundColor: "#f9f9f9",
    textAlign: "left",
};

const emailDetailsStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
    maxWidth: "600px",
    margin: "20px auto",
    textAlign: "left",
};

const replyBoxStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    margin: "20px auto",
    textAlign: "center",
};

const inputStyle = {
    width: "90%",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
};

const textareaStyle = {
    width: "90%",
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "5px",
};

export default App;