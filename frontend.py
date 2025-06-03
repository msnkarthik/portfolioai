import os
import json
import requests
import streamlit as st
import pandas as pd
import uuid

# --- Configuration ---
# (In production, you'd load these from a .env file or a config.)
BACKEND_URL = "http://localhost:8000"
USER_ID = "test-user-123"  # (No auth for now, so a dummy user id is used.)

# --- Helper Functions ---

def call_resume_upload_api(title, file_bytes, filename):
    """Call the resume upload endpoint (POST /api/portfolios/resume) to trigger LLM analysis and portfolio creation."""
    url = f"{BACKEND_URL}/api/portfolios/resume"
    payload = {"user_id": USER_ID, "title": title}
    files = {"file": (filename, file_bytes, "application/pdf")}  # (Adjust mime type if docx.)
    resp = requests.post(url, data=payload, files=files)
    if resp.status_code == 200:
         return resp.json()
    else:
         st.error(f"Error: {resp.status_code} – {resp.text}")
         return None

def call_chat_start_api(title):
    """Call the chat start endpoint (POST /api/portfolios/chat/start) to initiate a chat-based portfolio creation."""
    url = f"{BACKEND_URL}/api/portfolios/chat/start"
    payload = {"user_id": USER_ID, "title": title}
    resp = requests.post(url, json=payload)
    if resp.status_code == 200:
         return resp.json()
    else:
         st.error(f"Error: {resp.status_code} – {resp.text}")
         return None

def fetch_portfolio_details(portfolio_id):
    """Call GET /api/portfolios/{portfolio_id} to fetch portfolio details (e.g. status, content, html, css)."""
    url = f"{BACKEND_URL}/api/portfolios/{portfolio_id}"
    resp = requests.get(url)
    if resp.status_code == 200:
         return resp.json()
    else:
         st.error(f"Error fetching portfolio details: {resp.status_code} – {resp.text}")
         return None

def fetch_portfolio_export(portfolio_id):
    """Call GET /api/portfolios/{portfolio_id}/export to fetch the generated HTML and CSS."""
    url = f"{BACKEND_URL}/api/portfolios/{portfolio_id}/export"
    resp = requests.get(url)
    if resp.status_code == 200:
         return resp.json()
    else:
         st.error(f"Error exporting portfolio: {resp.status_code} – {resp.text}")
         return None

def fetch_all_portfolios():
    """Call GET /api/users/{user_id}/portfolios to fetch a list of all historical portfolios."""
    url = f"{BACKEND_URL}/api/users/{USER_ID}/portfolios"
    resp = requests.get(url)
    if resp.status_code == 200:
         return resp.json()
    else:
         st.error(f"Error listing portfolios: {resp.status_code} – {resp.text}")
         return []

# --- Streamlit App ---

st.title("Portfolio Builder (PortfolioAI)")

# --- Upper Section: Portfolio Creation Workflow ---
st.header("Create a New Portfolio")

# (Use two sub-tabs for resume upload and chat-based creation.)
tab1, tab2 = st.tabs(["Resume Upload", "Chat-Based Creation"])

# --- Resume Upload Tab ---
with tab1:
     st.subheader("Upload your Resume (PDF or DOCX)")
     title = st.text_input("Portfolio Title (Resume Upload)", key="resume_title")
     uploaded_file = st.file_uploader("Choose a file (PDF or DOCX)", type=["pdf", "docx"], key="resume_uploader")
     if uploaded_file is not None and title:
          if st.button("Generate Portfolio (Resume)", key="resume_btn"):
               with st.spinner("Uploading resume and generating portfolio (this may take a moment)..."):
                    file_bytes = uploaded_file.read()
                    url = f"{BACKEND_URL}/api/portfolios/resume?user_id={USER_ID}&title={title}"
                    files = {"file": (uploaded_file.name, file_bytes, "application/pdf")}  # (Adjust mime type if docx.)
                    resp = requests.post(url, files=files)
                    if resp.status_code == 200:
                         st.success("Portfolio creation (resume) triggered. (Refreshing table below.)")
                         st.rerun()  # (Refresh the table (historical portfolios) automatically.)
                    else:
                         st.error(f"Error: {resp.status_code} – {resp.text}")

# --- Chat-Based Creation Tab ---
with tab2:
     st.subheader("Chat-Based Portfolio Creation (Q&A)")
     chat_title = st.text_input("Portfolio Title (Chat)", key="chat_title")
     if "chat_state" not in st.session_state:
          st.session_state["chat_state"] = {}
     chat_state = st.session_state["chat_state"]

     def start_chat():
          url = f"{BACKEND_URL}/api/portfolios/chat/start"
          payload = {"user_id": USER_ID, "title": chat_title}
          resp = requests.post(url, json=payload)
          if resp.status_code == 200:
               data = resp.json()
               chat_state["portfolio_id"] = data["portfolio_id"]
               chat_state["messages"] = [{"role": "system", "content": data["next_question"]}]
               chat_state["status"] = data["status"]
               st.session_state["chat_state"] = chat_state
               st.rerun()
          else:
               st.error(f"Error: {resp.status_code} – {resp.text}")

     def send_chat_answer(answer):
          url = f"{BACKEND_URL}/api/portfolios/chat/answer"
          payload = {"portfolio_id": chat_state["portfolio_id"], "answer": answer}
          resp = requests.post(url, json=payload)
          if resp.status_code == 200:
               data = resp.json()
               if data["status"] == "in_progress":
                    chat_state["messages"].append({"role": "user", "content": answer})
                    chat_state["messages"].append({"role": "system", "content": data["next_question"]})
                    chat_state["status"] = data["status"]
                    st.session_state["chat_state"] = chat_state
                    st.rerun()
               elif data["status"] == "completed":
                    chat_state["messages"].append({"role": "user", "content": answer})
                    chat_state["messages"].append({"role": "system", "content": "Portfolio generation complete!"})
                    chat_state["status"] = data["status"]
                    st.session_state["chat_state"] = chat_state
                    st.success("Portfolio generated. (Refreshing table below.)")
                    st.rerun()
          else:
               st.error(f"Error: {resp.status_code} – {resp.text}")

     if chat_title and st.button("Start Chat (Generate Portfolio)", key="chat_btn"):
          start_chat()

     if chat_state.get("messages"):
          st.write("Conversation (LLM Chat):")
          for msg in chat_state["messages"]:
               st.chat_message(msg["role"]).write(msg["content"])
          if chat_state.get("status") == "in_progress":
               user_input = st.chat_input("Type your answer and press Enter...")
               if user_input:
                    send_chat_answer(user_input)

     if st.button("Reset Chat Session", key="reset_chat"):
          st.session_state["chat_state"] = {}
          st.rerun()

# --- Lower Section: Historical Portfolios Table ---
st.header("Historical Portfolios")
(st.button("Refresh Table (Historical Portfolios)", key="refresh_table") and st.rerun())
all_portfolios = fetch_all_portfolios()
if all_portfolios:
     # (Convert the list of dicts into a pandas DataFrame for display.)
     df = pd.DataFrame(all_portfolios)
     st.dataframe(df, use_container_width=True)
     # (For each portfolio, if its status is "completed", show "View" and "Export" buttons.)
     for idx, row in df.iterrows():
          if row.get("status") == "completed":
               portfolio_id = row.get("id")
               col1, col2 = st.columns(2)
               with col1:
                    if st.button(f"View Portfolio (ID: {portfolio_id})", key=f"view_{portfolio_id}"):
                         export_resp = fetch_portfolio_export(portfolio_id)
                         if export_resp:
                              # (Open a new tab (or a modal) to display the portfolio.)
                              st.markdown(f"<a href='data:text/html;base64,{export_resp['html']}' target='_blank'>Open Portfolio (New Tab)</a>", unsafe_allow_html=True)
               with col2:
                    if st.button(f"Export (ID: {portfolio_id})", key=f"export_{portfolio_id}"):
                         export_resp = fetch_portfolio_export(portfolio_id)
                         if export_resp:
                              # (Offer a download link for the generated HTML and CSS.)
                              st.download_button("Download HTML", export_resp["html"], file_name=f"portfolio_{portfolio_id}.html", mime="text/html")
                              st.download_button("Download CSS", export_resp["css"], file_name=f"portfolio_{portfolio_id}.css", mime="text/css")
else:
     st.info("No portfolios found. (Upload a resume or start a chat to create one.)") 