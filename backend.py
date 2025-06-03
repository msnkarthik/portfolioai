"""
PortfolioAI Backend
This module contains the complete backend logic for PortfolioAI application.
It handles portfolio creation via resume upload and chat-based interaction,
using Groq LLM for content generation and Supabase for storage.
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from dotenv import load_dotenv
import json
import re
from jinja2 import Environment, FileSystemLoader

# FastAPI and Pydantic
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Database
from supabase import create_client, Client

# LLM
import groq

# File processing
import PyPDF2
import docx
from io import BytesIO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from .env if present
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="PortfolioAI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services based on environment
if not all([os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"), os.getenv("GROQ_API_KEY")]):
    logger.error("Missing required environment variables for Supabase or Groq LLM.")
    raise ValueError("Missing required environment variables for Supabase or Groq LLM.")
else:
    logger.info("Using real Supabase and Groq LLM clients.")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    supabase = create_client(supabase_url, supabase_key)
    groq_client = groq.Groq(api_key=groq_api_key)

# Enums
class PortfolioMethod(str, Enum):
    RESUME = "resume"
    CHAT = "chat"

class PortfolioStatus(str, Enum):
    PROCESSING = "processing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

# Pydantic Models
class PortfolioBase(BaseModel):
    title: str
    user_id: str = Field(..., description="UUID of the user")

class PortfolioCreate(PortfolioBase):
    method: PortfolioMethod

class Portfolio(PortfolioBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    method: PortfolioMethod
    status: PortfolioStatus
    content: Optional[Dict[str, Any]] = None
    html: Optional[str] = None
    css: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    portfolio_id: str
    current_question: str
    status: PortfolioStatus
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# In-memory chat session store (for development/demo)
chat_sessions_store = {}

class ChatAnswerRequest(BaseModel):
    portfolio_id: str
    answer: str

# Update: Accept JSON body for chat/start
class ChatStartRequest(BaseModel):
    user_id: str
    title: str

# For HTML template rendering
def render_portfolio_html(template_path, context):
    # Use Jinja2 to render the HTML template with the provided context
    env = Environment(loader=FileSystemLoader('.'))
    template = env.get_template(template_path)
    return template.render(**context)

class LLMService:
    """Handles all LLM interactions using Groq"""
    
    def __init__(self):
        self.model = "meta-llama/llama-4-scout-17b-16e-instruct"
    
    def analyze_resume(self, resume_text: str) -> dict:
        """Analyze resume text and structure it into portfolio sections"""
        try:
            prompt = (
                "Analyze the following resume and structure it into a professional portfolio. "
                "Return ONLY a valid JSON object with these sections: About Me, Skills, Work Experience, Projects, Education. "
                "Do NOT include any markdown, explanation, or code blocks. "
                "Example: {\"About Me\": ..., \"Skills\": ..., ...}\n\n"
                f"Resume text:\n{resume_text}"
            )
            logger.info(f"Calling LLM analyze_resume with prompt: {prompt[:200]}...")
            response = groq_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2000
            )
            raw = response.choices[0].message.content
            logger.info(f"LLM analyze_resume raw response: {raw}")
            try:
                return json.loads(raw)
            except Exception:
                # Fallback: extract JSON from code block
                match = re.search(r'\{[\s\S]*\}', raw)
                if match:
                    try:
                        return json.loads(match.group(0))
                    except Exception as e2:
                        logger.error(f"Error parsing extracted JSON: {str(e2)}")
                logger.error(f"Error parsing LLM analyze_resume response as JSON: {raw}")
                raise HTTPException(status_code=500, detail="LLM did not return valid JSON")
        except Exception as e:
            logger.error(f"Error in resume analysis: {str(e)}")
            raise HTTPException(status_code=500, detail="Error analyzing resume")

    def generate_about_me(self, structured_data):
        # Use all available information to generate a personalized About Me
        prompt = (
            "Write a detailed, engaging About Me section for a portfolio website, based on the following information about the person: "
            f"{structured_data}\n"
            "Do NOT include any introductory or instructional text. "
            "Do NOT include Markdown, asterisks, or bold/italic formatting. "
            "Return only the content to be displayed, as plain text or simple HTML paragraphs."
        )
        return self._call_llm(prompt)

    def generate_skills(self, skills_list):
        # Prompt for a summary/gist about the person's skills, not a list
        prompt = (
            "Given this list of skills, write a short, human-like summary (1-2 sentences) describing the person's skills for a portfolio website. "
            f"Skills: {skills_list}\n"
            "Do NOT include any introductory or instructional text. "
            "Do NOT include Markdown, asterisks, or bold/italic formatting. "
            "Do NOT return a list or bullet points. Do NOT repeat the skill names. "
            "Return only a plain text summary."
        )
        return self._call_llm(prompt)

    def generate_work_experience(self, work_experience_list):
        prompt = (
            "Given this work experience data, write a detailed, human-like description for each job for a portfolio website. "
            f"Work Experience: {work_experience_list}\n"
            "Do NOT include any introductory or instructional text. "
            "Do NOT include Markdown, asterisks, or bold/italic formatting. "
            "Return only the content to be displayed, as plain text or simple HTML paragraphs."
        )
        return self._call_llm(prompt)

    def generate_projects(self, projects_list):
        prompt = (
            "Given this list of projects, write a short, human-like description for each project for a portfolio website. "
            f"Projects: {projects_list}\n"
            "Do NOT include any introductory or instructional text. "
            "Do NOT include Markdown, asterisks, or bold/italic formatting. "
            "Return only the content to be displayed, as plain text or simple HTML paragraphs."
        )
        return self._call_llm(prompt)

    def generate_education(self, education_list):
        prompt = (
            "Given this education data, write a detailed, human-like description for each degree for a portfolio website. "
            f"Education: {education_list}\n"
            "Do NOT include any introductory or instructional text. "
            "Do NOT include Markdown, asterisks, or bold/italic formatting. "
            "Return only the content to be displayed, as plain text or simple HTML paragraphs."
        )
        return self._call_llm(prompt)

    def _call_llm(self, prompt):
        response = groq_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000
        )
        raw = response.choices[0].message.content.strip()
        # Remove code block wrappers if present
        if raw.startswith('```'):
            raw = raw.lstrip('`')
            if raw.lower().startswith('json'):
                raw = raw[4:]
            raw = raw.strip()
            if raw.endswith('```'):
                raw = raw[:-3].strip()
        return raw

    def generate_portfolio_content(self, structured_data: dict) -> dict:
        try:
            # Generate content for each section using the LLM
            about_me = self.generate_about_me(structured_data)
            skills = structured_data.get('Skills', [])
            skills_description = self.generate_skills(skills) if skills else ''
            work_experience = structured_data.get('Work Experience', [])
            projects = structured_data.get('Projects', [])
            education = structured_data.get('Education', [])
            # Determine the portfolio title (user's name)
            name = structured_data.get('Name')
            if not name:
                # Try to extract name from About Me (first sentence or first two words)
                about = structured_data.get('About Me', '')
                if about:
                    # Try to extract a name-like phrase from the start
                    match = re.match(r"[Hh]i[,.! ]*([A-Za-z ]+)[,.! ]*", about)
                    if match:
                        name = match.group(1).strip()
                    else:
                        # Fallback: use first two words
                        name = ' '.join(about.split()[:2])
                else:
                    name = 'Portfolio'
            # Render the HTML template with generated content
            context = {
                'title': name,
                'about_me': about_me,
                'skills': skills,
                'skills_description': skills_description,
                'work_experience': work_experience,
                'projects': projects,
                'education': education,
                'year': datetime.now().year
            }
            html = render_portfolio_html('portfolio_template.html', context)
            return {'html': html, 'css': ''}
        except Exception as e:
            logger.error(f"Error generating portfolio content: {str(e)}")
            raise HTTPException(status_code=500, detail="Error generating portfolio content")

class FileProcessingService:
    """Handles file upload and processing"""
    
    async def process_file(self, file: UploadFile) -> str:
        try:
            content = await file.read()
            if file.filename.endswith('.pdf'):
                return await self._process_pdf(content)
            elif file.filename.endswith('.docx'):
                return await self._process_docx(content)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            raise HTTPException(status_code=500, detail="Error processing file")

    async def process_file_bytes(self, file_bytes: bytes, filename: str) -> str:
        try:
            if filename.endswith('.pdf'):
                return await self._process_pdf(file_bytes)
            elif filename.endswith('.docx'):
                return await self._process_docx(file_bytes)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
        except Exception as e:
            logger.error(f"Error processing file bytes: {str(e)}")
            raise HTTPException(status_code=500, detail="Error processing file bytes")

    async def _process_pdf(self, content: bytes) -> str:
        """Extract text from PDF"""
        try:
            pdf_file = BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise HTTPException(status_code=500, detail="Error processing PDF")

    async def _process_docx(self, content: bytes) -> str:
        """Extract text from DOCX"""
        try:
            doc_file = BytesIO(content)
            doc = docx.Document(doc_file)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            logger.error(f"Error processing DOCX: {str(e)}")
            raise HTTPException(status_code=500, detail="Error processing DOCX")

# Initialize services
llm_service = LLMService()
file_service = FileProcessingService()

# API Routes
@app.post("/api/portfolios/resume", response_model=Dict[str, str])
async def create_portfolio_from_resume(
    background_tasks: BackgroundTasks,
    user_id: str = Query(..., description="User ID"),
    title: str = Query(..., description="Portfolio title"),
    file: UploadFile = File(...)
):
    """
    Create a portfolio from uploaded resume
    """
    try:
        portfolio = Portfolio(
            user_id=user_id,
            title=title,
            method=PortfolioMethod.RESUME,
            status=PortfolioStatus.PROCESSING
        )
        portfolio_data = portfolio.model_dump(mode="json")
        result = supabase.table("portfolios").insert(portfolio_data).execute()
        logger.info(f"Inserted new portfolio row: {portfolio_data}")
        file_bytes = await file.read()  # Read file contents before background task
        filename = file.filename
        def process_resume_sync(file_bytes, filename):
            try:
                logger.info(f"[BG] Processing resume for portfolio {portfolio.id}")
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                resume_text = loop.run_until_complete(file_service.process_file_bytes(file_bytes, filename))
                logger.info(f"[BG] Resume text extracted for portfolio {portfolio.id}")
                structured_content = llm_service.analyze_resume(resume_text)
                logger.info(f"[BG] LLM structured content for portfolio {portfolio.id}: {structured_content}")
                portfolio_content = llm_service.generate_portfolio_content(structured_content)
                logger.info(f"[BG] LLM HTML/CSS for portfolio {portfolio.id}: {portfolio_content}")
                supabase.table("portfolios").update({
                    "status": PortfolioStatus.COMPLETED,
                    "content": structured_content,
                    "html": portfolio_content["html"],
                    "css": portfolio_content["css"],
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", portfolio.id).execute()
                logger.info(f"[BG] Portfolio {portfolio.id} updated to COMPLETED")
            except Exception as e:
                logger.error(f"[BG] Error in background processing for portfolio {portfolio.id}: {str(e)}")
                supabase.table("portfolios").update({
                    "status": "error",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", portfolio.id).execute()
        background_tasks.add_task(process_resume_sync, file_bytes, filename)
        return {
            "portfolio_id": portfolio.id,
            "status": "processing",
            "view_url": f"/portfolio/{portfolio.id}"
        }
    except Exception as e:
        logger.error(f"Error creating portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolios/chat/start", response_model=Dict[str, str])
async def start_chat_portfolio(request: ChatStartRequest):
    """
    Start a chat-based portfolio creation session (now accepts JSON body)
    """
    try:
        # Create portfolio record
        portfolio = Portfolio(
            user_id=request.user_id,
            title=request.title,
            method=PortfolioMethod.CHAT,
            status=PortfolioStatus.IN_PROGRESS
        )
        # Create chat session
        first_question = "What is your full name?"
        chat_session = ChatSession(
            portfolio_id=portfolio.id,
            current_question=first_question,
            status=PortfolioStatus.IN_PROGRESS
        )
        # Save to database (mocked)
        portfolio_data = portfolio.model_dump(mode="json")
        chat_data = chat_session.model_dump(mode="json")
        supabase.table("portfolios").insert(portfolio_data).execute()
        supabase.table("chat_sessions").insert(chat_data).execute()
        # Store in-memory session state
        chat_sessions_store[portfolio.id] = {
            "questions": [
                "What is your full name?",
                "What is your most recent job title?",
                "List your top skills.",
                "Describe your work experience.",
                "List your projects.",
                "List your education (e.g., Degree|Institution|Board|Description; ...). For example: Bachelor in Commerce|Hinduja College of Commerce, Mumbai|Maharashtra State Board|Top 10% of class; HSC|Siddharth College, Churchgate, Mumbai|Maharashtra State Board; SSC|St. Xaviers High School, Fort, Mumbai|Maharashtra State Board"
            ],
            "answers": [],
            "current": 0
        }
        logger.info(f"Started chat session for portfolio {portfolio.id}")
        return {
            "next_question": first_question,
            "status": "in_progress",
            "portfolio_id": portfolio.id
        }
    except Exception as e:
        logger.error(f"Error starting chat session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolios/chat/answer", response_model=Dict[str, str])
async def chat_answer(request: ChatAnswerRequest):
    """
    Accepts an answer for the current chat question, returns next question or triggers LLM for portfolio generation.
    """
    try:
        session = chat_sessions_store.get(request.portfolio_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        session["answers"].append(request.answer)
        session["current"] += 1
        if session["current"] < len(session["questions"]):
            next_q = session["questions"][session["current"]]
            logger.info(f"Next question for {request.portfolio_id}: {next_q}")
            return {"next_question": next_q, "status": "in_progress"}
        else:
            logger.info(f"All questions answered for {request.portfolio_id}, generating portfolio...")
            # Parse chat answers into structured data matching resume workflow
            answers = session["answers"]
            structured = {
                "About Me": answers[0] if len(answers) > 0 else "",
                # Parse Work Experience: expect comma-separated jobs, or ask user to enter in a structured way
                "Work Experience": [],
                "Skills": [],
                "Projects": [],
                "Education": []
            }
            # Parse Work Experience (assume answer 1 is a semicolon-separated list of jobs, each as Company|Designation|Duration)
            if len(answers) > 1 and answers[1].strip():
                work_exp = []
                for item in answers[1].split(';'):
                    parts = [p.strip() for p in item.split('|')]
                    if len(parts) >= 3:
                        work_exp.append({
                            "Company": parts[0],
                            "Designation": parts[1],
                            "Duration": parts[2],
                            "Description": parts[3] if len(parts) > 3 else ""
                        })
                structured["Work Experience"] = work_exp
            # Parse Skills (comma or newline separated)
            if len(answers) > 2 and answers[2].strip():
                skills = [s.strip() for s in re.split(r'[\n,]', answers[2]) if s.strip()]
                structured["Skills"] = skills
            # Parse Projects (semicolon-separated, each as Name|Description)
            if len(answers) > 3 and answers[3].strip():
                projects = []
                for item in answers[3].split(';'):
                    parts = [p.strip() for p in item.split('|')]
                    if len(parts) >= 1:
                        projects.append({
                            "Name": parts[0],
                            "Description": parts[1] if len(parts) > 1 else ""
                        })
                structured["Projects"] = projects
            # Parse Education (semicolon-separated, each as Degree|Institution|Board|Description)
            if len(answers) > 4 and answers[4].strip():
                education = []
                for item in answers[4].split(';'):
                    parts = [p.strip() for p in item.split('|')]
                    # Accept Degree|Institution|Board|Description, Degree|Institution|Board, Degree|Institution, or just Degree
                    if len(parts) >= 1:
                        education.append({
                            "Degree": parts[0],
                            "Institution": parts[1] if len(parts) > 1 else "",
                            "Board": parts[2] if len(parts) > 2 else "",
                            "Description": parts[3] if len(parts) > 3 else ""
                        })
                structured["Education"] = education
            portfolio_content = llm_service.generate_portfolio_content(structured)
            supabase.table("portfolios").update({
                "status": PortfolioStatus.COMPLETED,
                "content": structured,
                "html": portfolio_content["html"],
                "css": portfolio_content["css"],
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", request.portfolio_id).execute()
            logger.info(f"Portfolio {request.portfolio_id} completed.")
            return {"status": "completed", "portfolio_id": request.portfolio_id}
    except Exception as e:
        logger.error(f"Error in chat answer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/portfolios/{portfolio_id}", response_model=Portfolio)
async def get_portfolio(portfolio_id: str):
    """
    Get portfolio details by ID
    """
    try:
        result = supabase.table("portfolios").select("*").eq("id", portfolio_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        return result.data[0]
    except Exception as e:
        logger.error(f"Error fetching portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/portfolios/{portfolio_id}/export", response_model=Dict[str, str])
async def export_portfolio(portfolio_id: str):
    """
    Export portfolio HTML and CSS
    """
    try:
        result = supabase.table("portfolios").select("html, css").eq("id", portfolio_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        return {
            "html": result.data[0]["html"],
            "css": result.data[0]["css"]
        }
    except Exception as e:
        logger.error(f"Error exporting portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}/portfolios", response_model=List[Dict[str, Any]])
async def list_user_portfolios(user_id: str):
    """
    List all portfolios for a user, most recent first
    """
    try:
        result = supabase.table("portfolios").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error listing portfolios: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 