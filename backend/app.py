from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from dotenv import load_dotenv
from passlib.hash import pbkdf2_sha256
import jwt
import os
import random
import smtplib
from email.mime.text import MIMEText

# Supabase
from supabase import create_client

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- ENVIRONMENT VARIABLES ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SERVICE_ROLE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ======================================================
# 🌟 HELPER FUNCTIONS
# ======================================================

def generate_otp():
    return str(random.randint(100000, 999999))


def send_otp_email(email, otp):
    sender = os.getenv("SMTP_EMAIL")
    password = os.getenv("SMTP_PASSWORD")

    msg = MIMEText(f"Your OTP for LPUQA verification is: {otp}")
    msg["Subject"] = "LPUQA Verification OTP"
    msg["From"] = sender
    msg["To"] = email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(sender, password)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print("Email Error:", e)
        return False


def create_jwt(user_id, email):
    payload = {"user_id": user_id, "email": email}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


# ======================================================
# 🔵 SIGNUP — STEP 1 (User registers, OTP sent)
# ======================================================

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    fullname = data.get("fullname")
    email = data.get("email")
    password = data.get("password")

    # Check if user already exists
    existing = supabase.table("users").select("*").eq("email", email).execute()

    if existing.data:
        return jsonify({"success": False, "message": "Email already registered."})

    password_hash = pbkdf2_sha256.hash(password)
    otp = generate_otp()

    # Store user with is_verified=False
    supabase.table("users").insert({
        "full_name": fullname,
        "email": email,
        "password_hash": password_hash,
        "is_verified": False,
        "otp": otp,
        "google_id": None
    }).execute()

    # Send OTP email
    send_otp_email(email, otp)

    return jsonify({"success": True, "message": "OTP sent to your email."})


# ======================================================
# 🔵 SIGNUP — STEP 2 (Verify OTP)
# ======================================================

@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json
    email = data.get("email")
    otp_entered = data.get("otp")

    user = supabase.table("users").select("*").eq("email", email).execute()

    if not user.data:
        return jsonify({"success": False, "message": "User not found."})

    db_otp = user.data[0]["otp"]

    if otp_entered != db_otp:
        return jsonify({"success": False, "message": "Incorrect OTP."})

    # Mark user as verified
    supabase.table("users").update({"is_verified": True, "otp": None}).eq("email", email).execute()

    return jsonify({"success": True, "message": "OTP verified. Proceed to details page."})


@app.route("/api/resend-otp", methods=["POST"])
def resend_otp():
    data = request.json
    email = data.get("email")

    # Check if user exists
    user_query = supabase.table("users").select("*").eq("email", email).execute()

    if not user_query.data:
        return jsonify({"success": False, "message": "User not found."})

    # Generate new OTP
    otp = generate_otp()

    # Update OTP in DB
    supabase.table("users").update({"otp": otp}).eq("email", email).execute()

    # Send OTP email
    send_otp_email(email, otp)

    return jsonify({"success": True, "message": "New OTP sent successfully!"})


# ======================================================
# 🔵 LOGIN
# ======================================================

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    # username can be email or username
    user_query = supabase.table("users").select("*").eq("email", username).execute()

    if not user_query.data:
        return jsonify({"success": False, "message": "User not found."})

    user = user_query.data[0]

    if not pbkdf2_sha256.verify(password, user["password_hash"]):
        return jsonify({"success": False, "message": "Incorrect password."})

    if user["is_verified"] is False:
        return jsonify({"success": False, "message": "Please verify your OTP first."})

    token = create_jwt(user["id"], user["email"])

    return jsonify({"success": True, "token": token})

# ======================================================
# 🔵 GOOGLE LOGIN (STEP 1)
# ======================================================
@app.route("/auth/google")
def google_login():
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
    )
    return redirect(google_auth_url)


# ======================================================
# 🔵 GOOGLE CALLBACK (STEP 2)
# ======================================================
@app.route("/auth/google/callback")
def google_callback():
    code = request.args.get("code")

    import requests

    # Exchange code for access token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }

    token_res = requests.post(token_url, data=token_data).json()
    access_token = token_res.get("access_token")

    if not access_token:
        return "Google auth failed", 400

    # Get user info
    userinfo = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    email = userinfo["email"]
    google_id = userinfo["id"]
    name = userinfo["name"]

    # Check user in DB
    user_query = supabase.table("users").select("*").eq("email", email).execute()

    if not user_query.data:
        # First time Google login → store details
        supabase.table("users").insert({
            "email": email,
            "full_name": name,
            "google_id": google_id,
            "is_verified": True
        }).execute()

        return redirect("http://127.0.0.1:5501/frontend/detail.html?new_user=true")

    # Returning user → login success
    return redirect("http://127.0.0.1:5501/frontend/home.html")

# ======================================================
# 🔵 FORGOT PASSWORD — SEND OTP
# ======================================================

@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")

    user_query = supabase.table("users").select("*").eq("email", email).execute()

    if not user_query.data:
        return jsonify({"success": False, "message": "No account found with this email."})

    otp = generate_otp()

    # store OTP for password reset
    supabase.table("users").update({"otp": otp}).eq("email", email).execute()

    # send OTP
    send_otp_email(email, otp)

    return jsonify({"success": True, "message": "Password reset OTP sent to your email."})
# ======================================================
# 🔵 FORGOT PASSWORD — VERIFY OTP
# ======================================================

@app.route("/api/verify-reset-otp", methods=["POST"])
def verify_reset_otp():
    data = request.json
    email = data.get("email")
    otp_entered = data.get("otp")

    user_query = supabase.table("users").select("*").eq("email", email).execute()

    if not user_query.data:
        return jsonify({"success": False, "message": "User not found."})

    db_otp = user_query.data[0]["otp"]

    if otp_entered != db_otp:
        return jsonify({"success": False, "message": "Invalid OTP."})

    return jsonify({"success": True, "message": "OTP verified. Proceed to reset password."})
# ======================================================
# 🔵 FORGOT PASSWORD — UPDATE NEW PASSWORD
# ======================================================

@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    email = data.get("email")
    new_password = data.get("new_password")

    password_hash = pbkdf2_sha256.hash(new_password)

    supabase.table("users").update({
        "password_hash": password_hash,
        "otp": None   # clear OTP
    }).eq("email", email).execute()

    return jsonify({"success": True, "message": "Password reset successful! You can login now."})

# ======================================================
# 🚀 START SERVER
# ======================================================

if __name__ == "__main__":
    app.run(debug=True)
