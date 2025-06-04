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
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import time

# FastAPI and Pydantic
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Database
from supabase import create_client, Client

# LLM
import groq

# File processing
import PyPDF2
import docx
from io import BytesIO

# Import secrets manager
from secrets_manager import get_supabase_url, get_supabase_key, get_groq_api_key

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env if present
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="PortfolioAI API")

# Add logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests for debugging"""
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"Request completed: {request.method} {request.url.path} - Status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request failed: {request.method} {request.url.path} - Error: {str(e)}")
        raise

# Update CORS middleware with more specific configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "http://localhost:8000",  # Local production
        "https://adwhytahumans-portfolioai.hf.space",  # Hugging Face Space
        "https://*.hf.space"  # Any Hugging Face Space
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services using secrets manager
try:
    supabase_url = get_supabase_url()
    supabase_key = get_supabase_key()
    groq_api_key = get_groq_api_key()
    
    logger.info("Successfully loaded all required secrets")
    supabase = create_client(supabase_url, supabase_key)
    groq_client = groq.Groq(api_key=groq_api_key)
except ValueError as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    raise

# ===== SERVICE CLASSES START =====
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

    def analyze_job_description(self, job_description: str) -> dict:
        """Analyze job description to extract key requirements and skills"""
        prompt = (
            "Analyze the following job description and extract key information. "
            "Return ONLY a valid JSON object with these sections: "
            "Required Skills, Preferred Skills, Experience Level, Key Responsibilities, "
            "Technical Requirements, Soft Skills. "
            "Do NOT include any markdown, explanation, or code blocks. "
            "Return ONLY a valid JSON object. Do NOT include any text before or after the JSON. "
            "If you cannot answer, return an empty JSON object: {}.\n\n"
            f"Job Description:\n{job_description}"
        )
        for attempt in range(2):  # Try twice
            logger.info(f"Calling LLM analyze_job_description with prompt: {prompt[:200]}...")
            response = groq_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2000
            )
            raw = response.choices[0].message.content
            logger.info(f"LLM analyze_job_description raw response: {raw}")
            if not raw or not raw.strip():
                logger.error(f"LLM analyze_job_description returned empty response. Prompt: {prompt}")
                continue
            # If the raw response is wrapped in a code block (e.g. "```{…}```"), strip it.
            if raw.startswith("```") and raw.endswith("```"):
                 raw = re.sub(r'```(?:json)?\s*(\{[\s\S]*\})\s*```', r'\1', raw)
            try:
                return json.loads(raw)
            except Exception:
                # Fallback extraction (using regex) for key sections if JSON parsing fails
                fallback = {}
                for key in ["Required Skills", "Preferred Skills", "Experience Level", "Key Responsibilities", "Technical Requirements", "Soft Skills"]:
                     m = re.search(rf"{key}:\s*([^\n]+(?:\n[^\n]+)*)", raw, re.IGNORECASE)
                     if m:
                         fallback[key] = m.group(1).strip()
                if fallback:
                     logger.info("Fallback extraction (using regex) returned: " + str(fallback))
                     return fallback
                # If fallback extraction also fails, log a warning and return a minimal default JSON
                logger.warning("Fallback extraction (using regex) did not yield a match. Returning minimal default JSON.")
                return {"Required Skills": "Fallback Required Skills", "Experience Level": "mid-level", "Key Responsibilities": "Fallback Key Responsibilities", "Soft Skills": "Fallback Soft Skills"}
        raise HTTPException(status_code=500, detail="LLM did not return valid JSON for job description analysis")

    def optimize_resume(self, resume: str, job_analysis: dict) -> str:
        """Optimize resume based on job description analysis"""
        try:
            prompt = (
                "Optimize the following resume to better match the job requirements. "
                "Keep all factual information but enhance the descriptions to better highlight relevant skills and experiences. "
                "Focus on matching the key requirements while maintaining truthfulness. "
                "Do NOT include any introductory or instructional text. "
                "Return the optimized resume in the same format as the input.\n\n"
                f"Job Requirements:\n{json.dumps(job_analysis, indent=2)}\n\n"
                f"Original Resume:\n{resume}"
            )
            logger.info("Calling LLM optimize_resume...")
            return self._call_llm(prompt)
        except Exception as e:
            logger.error(f"Error in resume optimization: {str(e)}")
            raise HTTPException(status_code=500, detail="Error optimizing resume")

    def generate_cover_letter(self, job_description: str, optimized_resume: str) -> str:
        """Generate a cover letter based on job description and optimized resume"""
        try:
            prompt = (
                "Write a professional cover letter based on the following job description and resume. "
                "The cover letter should be personalized, highlight relevant experience, "
                "and demonstrate enthusiasm for the role. "
                "Keep it concise (max 3 paragraphs) and professional. "
                "Do NOT include any introductory or instructional text. "
                "Return only the cover letter content.\n\n"
                f"Job Description:\n{job_description}\n\n"
                f"Resume:\n{optimized_resume}"
            )
            logger.info("Calling LLM generate_cover_letter...")
            return self._call_llm(prompt)
        except Exception as e:
            logger.error(f"Error in cover letter generation: {str(e)}")
            raise HTTPException(status_code=500, detail="Error generating cover letter")

    def generate_career_guide(self, job_description: str, optimized_resume: str) -> str:
        """Generate career guidance based on job description and resume"""
        try:
            prompt = (
                "Analyze the following job description and resume to provide career guidance. "
                "Include: 1) Skills gap analysis, 2) Recommended learning paths, "
                "3) Short-term and long-term career goals, 4) Action items for improvement. "
                "Format the response in clear sections with bullet points where appropriate. "
                "Do NOT include any introductory or instructional text. "
                "Return only the career guidance content.\n\n"
                f"Job Description:\n{job_description}\n\n"
                f"Resume:\n{optimized_resume}"
            )
            logger.info("Calling LLM generate_career_guide...")
            return self._call_llm(prompt)
        except Exception as e:
            logger.error(f"Error in career guide generation: {str(e)}")
            raise HTTPException(status_code=500, detail="Error generating career guide")

    def generate_interview_questions(self, job_description: str, experience_level: str) -> List[str]:
        """Generate technical interview questions based on job description"""
        try:
            prompt = (
                "Generate 10 technical interview questions for a job with the following job description. "
                "Questions should be specific, technical, and relevant to the role. "
                "Return ONLY a JSON array of questions.\n\n"
                f"Job Description:\n{job_description}"
            )
            logger.info("Calling LLM generate_interview_questions_from_jd...")
            response = groq_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1000
            )
            raw = response.choices[0].message.content
            if raw.startswith("```") and raw.endswith("```"):
                 raw = re.sub(r'```(?:json)?\s*(\[[\s\S]*\])\s*```', r'\1', raw)
            try:
                 questions = json.loads(raw)
                 if not isinstance(questions, list) or len(questions) != 10:
                     raise ValueError("LLM did not return 10 questions")
                 return questions
            except Exception as e:
                 logger.error(f"Error parsing LLM generate_interview_questions_from_jd response: {str(e)}")
                 raise HTTPException(status_code=500, detail="Error generating interview questions")
        except Exception as e:
             logger.error(f"Error generating interview questions: {str(e)}")
             raise HTTPException(status_code=500, detail="Error generating interview questions")

    def score_interview(self, questions: List[InterviewQuestion]) -> int:
        """Score the interview based on questions and answers"""
        try:
            # Prepare the interview data for scoring
            interview_data = [
                {"question": q.question, "answer": q.answer}
                for q in questions
            ]
            
            prompt = (
                "Score this technical interview based on the questions and answers provided. "
                "Consider: 1) Technical accuracy (60%), 2) Clarity of explanation (20%), "
                "3) Problem-solving approach (20%). "
                "Return a JSON object in this exact format: {\"score\": number, \"feedback\": \"string\"}. "
                "The score should be a number between 0 and 100. "
                "Do not include any other text or formatting. "
                "Example response: {\"score\": 85, \"feedback\": \"Good technical knowledge\"}\n\n"
                f"Interview Data:\n{json.dumps(interview_data, indent=2)}"
            )
            
            logger.info("Calling LLM score_interview...")
            response = groq_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=500
            )
            
            raw = response.choices[0].message.content.strip()
            logger.info(f"LLM score_interview raw response: {raw}")
            
            # Handle potential code block formatting
            if raw.startswith("```") and raw.endswith("```"):
                raw = re.sub(r'```(?:json)?\s*(\{[\s\S]*\})\s*```', r'\1', raw)
            
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                # Try to extract JSON using regex if direct parsing fails
                match = re.search(r'\{[\s\S]*\}', raw)
                if match:
                    try:
                        result = json.loads(match.group(0))
                    except json.JSONDecodeError as e2:
                        logger.error(f"Error parsing extracted JSON: {str(e2)}")
                        raise ValueError("Could not parse LLM response as JSON")
                else:
                    logger.error(f"No JSON object found in response: {raw}")
                    raise ValueError("No valid JSON found in LLM response")
            
            if not isinstance(result, dict):
                logger.error(f"LLM response is not a dictionary: {result}")
                raise ValueError("LLM response is not a dictionary")
                
            if 'score' not in result:
                logger.error(f"No score found in LLM response: {result}")
                raise ValueError("No score found in LLM response")
                
            score = result['score']
            if not isinstance(score, (int, float)) or score < 0 or score > 100:
                logger.error(f"Invalid score value: {score}")
                raise ValueError("Invalid score value")
                
            return int(score)
            
        except Exception as e:
            logger.error(f"Error scoring interview: {str(e)}")
            logger.error(f"Full error details: {type(e).__name__}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error scoring interview: {str(e)}")

    def generate_interview_feedback(self, questions: List[InterviewQuestion], score: int) -> str:
        """Generate detailed feedback for the interview based on questions, answers, and score"""
        try:
            # Prepare the interview data for feedback
            interview_data = [
                {"question": q.question, "answer": q.answer}
                for q in questions
            ]
            
            prompt = (
                "Generate detailed feedback for this technical interview based on the questions, answers, and score. "
                "Include: 1) Overall performance assessment, 2) Key strengths demonstrated, "
                "3) Areas for improvement, 4) Specific suggestions for each area of improvement, "
                "5) A motivational closing message. "
                "Keep the tone professional but encouraging. "
                "If the score is below 70, focus more on constructive feedback and improvement areas. "
                "If the score is 70 or above, focus more on strengths while still providing some improvement suggestions.\n\n"
                f"Interview Score: {score}/100\n"
                f"Interview Data:\n{json.dumps(interview_data, indent=2)}"
            )
            
            logger.info("Calling LLM generate_interview_feedback...")
            response = groq_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Error generating interview feedback: {str(e)}")
            raise HTTPException(status_code=500, detail="Error generating interview feedback")

    def enhance_portfolio_with_jd(self, structured_data: dict, job_description: dict) -> dict:
        """Enhance portfolio content based on job description"""
        try:
            # Extract relevant information from job description
            jd_content = job_description.get("content", "")
            jd_title = job_description.get("title", "")
            
            # Create a prompt to enhance the portfolio
            prompt = f"""Given the following job description and current portfolio content, enhance the portfolio to better match the job requirements:

Job Title: {jd_title}
Job Description: {jd_content}

Current Portfolio Content:
{json.dumps(structured_data, indent=2)}

Please enhance the portfolio content to better align with the job requirements. Focus on:
1. Highlighting relevant skills and experiences
2. Adjusting the tone and focus of the about me section
3. Emphasizing projects and work experience that match the job requirements
4. Adding or modifying skills to match the job requirements

Return the enhanced portfolio content in the same structured format."""

            # Get enhanced content from LLM
            response = groq_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse the response
            enhanced_content = response.choices[0].message.content
            try:
                # Try to parse as JSON
                enhanced_data = json.loads(enhanced_content)
                # Merge with original data, keeping original structure
                for key in structured_data:
                    if key in enhanced_data:
                        structured_data[key] = enhanced_data[key]
                return structured_data
            except json.JSONDecodeError:
                # If not valid JSON, return original data
                logger.warning("Failed to parse enhanced portfolio content as JSON")
                return structured_data
                
        except Exception as e:
            logger.error(f"Error enhancing portfolio with job description: {str(e)}")
            return structured_data  # Return original data on error

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

# ===== SERVICE CLASSES END =====

# Initialize services
llm_service = LLMService()
file_service = FileProcessingService()

# Run migration on startup
@app.on_event("startup")
async def startup_event():
    """Run startup tasks"""
    # Skip migrations in production (HF Space) environment
    if os.getenv("ENVIRONMENT") != "production":
        logger.info("Running database migrations in development environment")
        await migrate_database()
    else:
        logger.info("Skipping database migrations in production environment")

# ===== API ROUTES START =====
# All API routes must be defined BEFORE mounting static files

@app.get("/api/test")
async def test_api():
    """Test endpoint to verify API routing is working"""
    logger.info("Test API endpoint called")
    return {
        "status": "ok",
        "message": "API is working",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.post("/api/portfolios/resume", response_model=Dict[str, str])
async def create_portfolio_from_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Query(..., description="User ID"),
    title: str = Query(..., description="Portfolio title"),
    job_description_id: Optional[str] = Query(None, description="Optional job description ID")
):
    """
    Create a portfolio from uploaded resume and store the resume
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

        # First create a resume record
        resume = Resume(
            user_id=user_id,
            content=""  # Will be updated in background task
        )
        resume_data = convert_datetimes_to_iso(resume.model_dump())
        resume_result = supabase.table("resumes").insert(resume_data).execute()
        logger.info(f"Created resume record with ID: {resume.id}")

        # Then create portfolio record
        portfolio = Portfolio(
            user_id=user_id,
            title=title,
            method=PortfolioMethod.RESUME,
            status=PortfolioStatus.PROCESSING,
            resume_id=resume.id,  # Link to the resume
            job_description_id=job_description_id  # Optional job description ID
        )
        portfolio_data = portfolio.model_dump(mode="json")
        result = supabase.table("portfolios").insert(portfolio_data).execute()
        logger.info(f"Inserted new portfolio row: {portfolio_data}")
        
        file_bytes = await file.read()  # Read file contents before background task
        filename = file.filename
        
        def process_resume_sync(file_bytes, filename, resume_id):
            try:
                logger.info(f"[BG] Processing resume for portfolio {portfolio.id} (resume_id={resume_id})")
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                resume_text = loop.run_until_complete(file_service.process_file_bytes(file_bytes, filename))
                logger.info(f"[BG] Resume text extracted for portfolio {portfolio.id}")

                # Update resume content
                update_result = supabase.table("resumes").update({
                    "content": resume_text,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", resume_id).execute()
                logger.info(f"[BG] Resume update result for ID {resume_id}: {update_result}")
                if hasattr(update_result, 'data') and update_result.data:
                    logger.info(f"[BG] Resume content updated successfully for ID: {resume_id}")
                else:
                    logger.error(f"[BG] Resume update failed or no record updated for ID: {resume_id}")

                # Then process for portfolio
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
                    "status": PortfolioStatus.ERROR,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", portfolio.id).execute()
                supabase.table("resumes").update({
                    "content": "Error processing resume",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", resume_id).execute()
        
        background_tasks.add_task(process_resume_sync, file_bytes, filename, resume.id)
        return {
            "portfolio_id": portfolio.id,
            "resume_id": resume.id,
            "status": "processing",
            "view_url": f"/portfolio/{portfolio.id}"
        }
    except Exception as e:
        logger.error(f"Error creating portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/start", response_model=Dict[str, str])
async def start_chat(request: ChatStartRequest):
    """
    Start a new chat session
    """
    try:
        # Create chat session
        first_question = "What is your full name?"
        chat_session = ChatSession(
            user_id=request.user_id,
            title=request.title,
            current_question=first_question,
            status=PortfolioStatus.IN_PROGRESS
        )
        
        # Save to database
        chat_data = chat_session.model_dump(mode="json")
        result = supabase.table("chat_sessions").insert(chat_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create chat session")
            
        # Store in-memory session state
        chat_sessions_store[chat_session.id] = {
            "questions": [
                "What is your full name?",
                "What is your most recent job title?",
                "List your top skills.",
                "Describe your work experience.",
                "List your projects.",
                "List your education qualifications"
            ],
            "answers": [],
            "current": 0
        }
        
        # Save initial welcome message
        welcome_message = ChatMessage(
            chat_session_id=chat_session.id,
            content=first_question,
            role="assistant"
        )
        message_data = welcome_message.model_dump(mode="json")
        supabase.table("chat_messages").insert(message_data).execute()
        
        logger.info(f"Started chat session {chat_session.id} for user {request.user_id}")
        return {
            "chat_session_id": chat_session.id,
            "next_question": first_question,
            "status": "in_progress"
        }
    except Exception as e:
        logger.error(f"Error starting chat session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/message", response_model=Dict[str, str])
async def send_chat_message(request: ChatMessageRequest):
    """
    Send a message in a chat session and get the next question or completion
    """
    try:
        # Get chat session
        session_result = supabase.table("chat_sessions").select("*").eq("id", request.chat_session_id).single().execute()
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Chat session not found")
            
        session = chat_sessions_store.get(request.chat_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
            
        # Save user's message
        user_message = ChatMessage(
            chat_session_id=request.chat_session_id,
            content=request.content,
            role="user"
        )
        message_data = user_message.model_dump(mode="json")
        supabase.table("chat_messages").insert(message_data).execute()
        
        # Process the answer
        session["answers"].append(request.content)
        session["current"] += 1
        
        if session["current"] < len(session["questions"]):
            # Get next question
            next_question = session["questions"][session["current"]]
            
            # Save assistant's message
            assistant_message = ChatMessage(
                chat_session_id=request.chat_session_id,
                content=next_question,
                role="assistant"
            )
            message_data = assistant_message.model_dump(mode="json")
            supabase.table("chat_messages").insert(message_data).execute()
            
            # Update session status
            supabase.table("chat_sessions").update({
                "current_question": next_question,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", request.chat_session_id).execute()
            
            return {
                "chat_session_id": request.chat_session_id,
                "next_question": next_question,
                "status": "in_progress"
            }
        else:
            # All questions answered, generate portfolio
            logger.info(f"All questions answered for chat session {request.chat_session_id}")
            
            # Parse chat answers into structured data
            answers = session["answers"]
            structured = {
                "Name": answers[0] if len(answers) > 0 else "",
                "About Me": answers[0] if len(answers) > 0 else "",
                "Work Experience": [],
                "Skills": [],
                "Projects": [],
                "Education": []
            }
            
            # Parse answers into structured data (same as before)
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
                
            if len(answers) > 2 and answers[2].strip():
                skills = [s.strip() for s in re.split(r'[\n,]', answers[2]) if s.strip()]
                structured["Skills"] = skills
                
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
                
            if len(answers) > 4 and answers[4].strip():
                education = []
                for item in answers[4].split(';'):
                    parts = [p.strip() for p in item.split('|')]
                    if len(parts) >= 1:
                        education.append({
                            "Degree": parts[0],
                            "Institution": parts[1] if len(parts) > 1 else "",
                            "Board": parts[2] if len(parts) > 2 else "",
                            "Description": parts[3] if len(parts) > 3 else ""
                        })
                structured["Education"] = education
            
            # Update session status to completed
            supabase.table("chat_sessions").update({
                "status": PortfolioStatus.COMPLETED,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", request.chat_session_id).execute()
            
            return {
                "chat_session_id": request.chat_session_id,
                "status": "completed",
                "structured_data": structured,
                "message": "Chat session completed. Profile information saved."
            }
    except Exception as e:
        logger.error(f"Error in chat message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/sessions/{user_id}", response_model=List[ChatSession])
async def get_chat_sessions(user_id: str):
    """Get all chat sessions for a user"""
    try:
        result = supabase.table("chat_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching chat sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/messages/{chat_session_id}", response_model=List[ChatMessage])
async def get_chat_messages(chat_session_id: str):
    """Get all messages for a chat session"""
    try:
        result = supabase.table("chat_messages").select("*").eq("chat_session_id", chat_session_id).order("created_at", asc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching chat messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/portfolios/{portfolio_id}", response_model=Portfolio)
async def get_portfolio(portfolio_id: str):
    """
    Get portfolio details by ID
    """
    try:
        result = supabase.table("portfolios").select("*").eq("id", portfolio_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        return result.data
    except Exception as e:
        logger.error(f"Error fetching portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/portfolios/user/{user_id}", response_model=List[Portfolio])
async def get_user_portfolios(user_id: str):
    """Get all portfolios for a user"""
    try:
        result = supabase.table("portfolios").select("*").eq("user_id", user_id).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching user portfolios: {str(e)}")
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

@app.get("/api/resumes/{user_id}", response_model=List[OptimizedResume])
async def get_resumes(user_id: str):
    logger.info(f"Fetching resumes for user: {user_id}")
    try:
        result = supabase.table("optimized_resumes").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching resumes: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching resumes")

# Job Description Endpoints
@app.post("/api/job-descriptions", response_model=JobDescription)
async def create_job_description(request: JobDescriptionCreate):
    """Create a new job description"""
    try:
        job_description = JobDescription(
            user_id=request.user_id,
            title=request.title,
            content=request.content
        )
        # Convert datetimes to ISO strings before inserting
        job_desc_data = convert_datetimes_to_iso(job_description.model_dump())
        result = supabase.table("job_descriptions").insert(job_desc_data).execute()
        return result.data[0]
    except Exception as e:
        logger.error(f"Error creating job description: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/job-descriptions/{user_id}", response_model=List[JobDescription])
async def get_job_descriptions(user_id: str):
    logger.info(f"Fetching job descriptions for user: {user_id}")
    try:
        result = supabase.table("job_descriptions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching job descriptions: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching job descriptions")

# Resume Optimization Endpoints
@app.post("/api/resumes/optimize", response_model=OptimizedResume)
async def optimize_resume(request: ResumeOptimizeRequest, background_tasks: BackgroundTasks):
    """Optimize a resume based on job description"""
    try:
        # Get job description and original resume
        jd_result = supabase.table("job_descriptions").select("*").eq("id", request.job_description_id).execute()
        resume_result = supabase.table("resumes").select("*").eq("id", request.resume_id).execute()
        
        if not jd_result.data:
            raise HTTPException(status_code=404, detail=f"Job description with ID {request.job_description_id} not found")
        if not resume_result.data:
            raise HTTPException(status_code=404, detail=f"Resume with ID {request.resume_id} not found")
        
        # Get the first (and should be only) result
        job_description = jd_result.data[0]
        resume = resume_result.data[0]
        
        # Create optimized resume record
        optimized_resume = OptimizedResume(
            user_id=request.user_id,
            job_description_id=request.job_description_id,
            original_resume_id=request.resume_id,
            content=""  # Will be updated in background task
        )
        opt_resume_data = convert_datetimes_to_iso(optimized_resume.model_dump())
        result = supabase.table("optimized_resumes").insert(opt_resume_data).execute()
        
        def process_optimization_sync():
            try:
                # Analyze job description
                job_analysis = llm_service.analyze_job_description(job_description["content"])
                logger.info(f"[BG] Job analysis completed for resume optimization")
                
                # Optimize resume
                optimized_content = llm_service.optimize_resume(resume["content"], job_analysis)
                logger.info(f"[BG] Resume optimization completed")
                
                # Update optimized resume content
                supabase.table("optimized_resumes").update({
                    "content": optimized_content,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", optimized_resume.id).execute()
                logger.info(f"[BG] Optimized resume updated successfully")
            except Exception as e:
                logger.error(f"[BG] Error in resume optimization: {str(e)}")
                supabase.table("optimized_resumes").update({
                    "content": "Error optimizing resume",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", optimized_resume.id).execute()
        
        background_tasks.add_task(process_optimization_sync)
        return result.data[0]
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error optimizing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Cover Letter Endpoints
@app.post("/api/cover-letters/generate", response_model=CoverLetter)
async def generate_cover_letter(request: CoverLetterGenerateRequest):
    """Generate a cover letter based on job description and resume"""
    try:
        # Get job description and resume
        jd_result = supabase.table("job_descriptions").select("*").eq("id", request.job_description_id).execute()
        resume_result = supabase.table("resumes").select("*").eq("id", request.resume_id).execute()
        
        if not jd_result.data:
            raise HTTPException(status_code=404, detail=f"Job description with ID {request.job_description_id} not found")
        if not resume_result.data:
            raise HTTPException(status_code=404, detail=f"Resume with ID {request.resume_id} not found")
        
        # Get the first (and should be only) result
        job_description = jd_result.data[0]
        resume = resume_result.data[0]
        
        # Generate cover letter
        cover_letter_content = llm_service.generate_cover_letter(
            job_description["content"],
            resume["content"]
        )
        
        # Create cover letter record
        cover_letter = CoverLetter(
            user_id=request.user_id,
            job_description_id=request.job_description_id,
            resume_id=request.resume_id,
            content=cover_letter_content
        )
        cover_letter_data = convert_datetimes_to_iso(cover_letter.model_dump())
        result = supabase.table("cover_letters").insert(cover_letter_data).execute()
        return result.data[0]
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error generating cover letter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cover-letters/{user_id}", response_model=List[CoverLetter])
async def get_cover_letters(user_id: str):
    logger.info(f"Fetching cover letters for user: {user_id}")
    try:
        result = supabase.table("cover_letters").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching cover letters: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching cover letters")

# Interview Endpoints
@app.post("/api/interviews/start", response_model=InterviewSession)
async def start_interview(request: InterviewStartRequest):
    """Start a new interview session using only the job description to generate questions."""
    try:
        # Get job description
        jd_result = supabase.table("job_descriptions").select("*").eq("id", request.job_description_id).execute()
        if not jd_result.data:
            raise HTTPException(status_code=404, detail=f"Job description with ID {request.job_description_id} not found")
        
        # Get the first (and should be only) result
        job_description = jd_result.data[0]
        
        # Generate interview questions
        questions = llm_service.generate_interview_questions(job_description["content"], "mid-level")
        
        # Convert questions to proper format - ensure they are strings
        interview_questions = [
            InterviewQuestion(question=str(q["question"]), answer=None) if isinstance(q, dict) else InterviewQuestion(question=str(q), answer=None)
            for q in questions
        ]
        
        # Create interview session
        interview_session = InterviewSession(
            user_id=request.user_id,
            job_description_id=request.job_description_id,
            questions=interview_questions,
            score=None
        )
        
        # Convert to dict and remove resume_id before inserting
        session_data = convert_datetimes_to_iso(interview_session.model_dump())
        session_data.pop('resume_id', None)  # Remove resume_id from the data
        
        # Insert into database
        result = supabase.table("interview_sessions").insert(session_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create interview session")
            
        return result.data[0]
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/interviews/{interview_id}", response_model=InterviewSession)
async def get_interview(interview_id: str):
    """Get interview session details by ID"""
    try:
        result = supabase.table("interview_sessions").select("*").eq("id", interview_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Interview session not found")
        return result.data
    except Exception as e:
        logger.error(f"Error fetching interview session: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching interview session")

@app.post("/api/interviews/answer", response_model=Dict[str, Any])
async def submit_interview_answer(request: InterviewAnswerRequest):
    """Submit an answer to an interview question"""
    try:
        # Get interview session
        session_result = supabase.table("interview_sessions").select("*").eq("id", request.interview_id).single().execute()
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        # Update the answer for the specific question
        questions = session_result.data["questions"]
        if request.question_index >= len(questions):
            raise HTTPException(status_code=400, detail="Invalid question index")
        
        # Update the answer in the questions list
        questions[request.question_index]["answer"] = request.answer
        
        # Update session with new answer
        update_result = supabase.table("interview_sessions").update({
            "questions": questions,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", request.interview_id).execute()
        
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to update interview session")
        
        # If all questions are answered, calculate score and generate feedback
        if all(q.get("answer") for q in questions):
            try:
                # Get job description to get the job role
                jd_result = supabase.table("job_descriptions").select("title").eq("id", session_result.data["job_description_id"]).single().execute()
                if not jd_result.data:
                    raise HTTPException(status_code=404, detail="Job description not found")
                job_role = jd_result.data["title"]

                # Get score and feedback from LLM
                score = llm_service.score_interview([InterviewQuestion(**q) for q in questions])
                feedback = llm_service.generate_interview_feedback([InterviewQuestion(**q) for q in questions], score)
                
                # Create interview score record with feedback and job role
                interview_score = InterviewScore(
                    user_id=session_result.data["user_id"],
                    job_description_id=session_result.data["job_description_id"],
                    job_role=job_role,
                    score=score,
                    feedback=feedback
                )
                interview_score_data = convert_datetimes_to_iso(interview_score.model_dump())
                logger.info(f"Attempting to save interview score: {interview_score_data}")
                
                # Insert into interview_scores table
                try:
                    score_result = supabase.table("interview_scores").insert(interview_score_data).execute()
                    logger.info(f"Score save result: {score_result.data if score_result.data else 'No data returned'}")
                    if not score_result.data:
                        logger.error("Failed to save score - no data returned from insert")
                        raise Exception("Failed to save score - no data returned from insert")
                    logger.info(f"Successfully saved interview score with ID: {score_result.data[0]['id']}")
                except Exception as e:
                    logger.error(f"Error saving interview score: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Failed to save interview score: {str(e)}")
                
                # Update the interview session with the score
                update_score_result = supabase.table("interview_sessions").update({
                    "score": score,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", request.interview_id).execute()
                
                if not update_score_result.data:
                    logger.error("Failed to update interview session with score")
                else:
                    logger.info("Successfully updated interview session with score")
                
                logger.info(f"Interview scored successfully. Score: {score}, Score ID: {score_result.data[0]['id'] if score_result.data else 'None'}")
                
                # Verify the score was saved by immediately fetching it
                try:
                    verify_result = supabase.table("interview_scores").select("*").eq("id", score_result.data[0]['id']).single().execute()
                    logger.info(f"Verification of saved score: {verify_result.data if verify_result.data else 'Not found'}")
                except Exception as e:
                    logger.error(f"Error verifying saved score: {str(e)}")
                
                return {
                    "message": "Interview completed and scored",
                    "score": score,
                    "feedback": feedback,
                    "job_role": job_role,
                    "score_id": score_result.data[0]["id"] if score_result.data else None
                }
            except Exception as e:
                logger.error(f"Error scoring interview: {str(e)}")
                return {
                    "message": "Answer recorded, but scoring failed",
                    "error": str(e)
                }
        
        return {
            "message": "Answer recorded",
            "questions_answered": sum(1 for q in questions if q.get("answer")),
            "total_questions": len(questions)
        }
    except Exception as e:
        logger.error(f"Error submitting interview answer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error submitting interview answer: {str(e)}")

@app.get("/api/interviews/scores/test/{user_id}")
async def test_interview_scores(user_id: str):
    """Test endpoint to verify interview scores data flow"""
    try:
        logger.info(f"=== Testing interview scores endpoint ===")
        logger.info(f"User ID: {user_id}")
        
        # Check interview_scores table directly
        scores_result = supabase.table("interview_scores").select("*").eq("user_id", user_id).execute()
        logger.info(f"Scores check result: {scores_result.data if scores_result.data else 'No scores found'}")
        
        # Return test data
        return {
            "scores_count": len(scores_result.data) if scores_result.data else 0,
            "scores": scores_result.data if scores_result.data else [],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Test endpoint error: {str(e)}")
        logger.error(f"Stack trace:", exc_info=True)
        return {
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/api/interviews/scores/{user_id}", response_model=List[InterviewScore])
async def list_interview_scores(user_id: str):
    """List all interview scores for a user"""
    try:
        logger.info(f"=== Starting interview scores fetch ===")
        logger.info(f"Fetching interview scores for user: {user_id}")
        
        # Fetch scores directly from interview_scores table
        result = supabase.table("interview_scores").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
        if not result.data:
            logger.info("No scores found in database")
            return []
            
        logger.info(f"Found {len(result.data)} interview scores")
        logger.info(f"First score details: {json.dumps(result.data[0], indent=2)}")
        
        return result.data
    except Exception as e:
        logger.error(f"Error listing interview scores: {str(e)}")
        logger.error(f"Full error details: {type(e).__name__}: {str(e)}")
        logger.error(f"Stack trace:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing interview scores: {str(e)}")

# Career Guide Endpoints
@app.post("/api/career-guides/generate", response_model=CareerGuide)
async def generate_career_guide(request: CareerGuideGenerateRequest):
    """Generate career guidance based on job description and resume"""
    try:
        # Get job description and resume
        jd_result = supabase.table("job_descriptions").select("*").eq("id", request.job_description_id).execute()
        resume_result = supabase.table("resumes").select("*").eq("id", request.resume_id).execute()
        
        if not jd_result.data:
            raise HTTPException(status_code=404, detail=f"Job description with ID {request.job_description_id} not found")
        if not resume_result.data:
            raise HTTPException(status_code=404, detail=f"Resume with ID {request.resume_id} not found")
        
        # Get the first (and should be only) result
        job_description = jd_result.data[0]
        resume = resume_result.data[0]
        
        # Generate career guide
        guide_content = llm_service.generate_career_guide(
            job_description["content"],
            resume["content"]
        )
        
        # Create career guide record
        career_guide = CareerGuide(
            user_id=request.user_id,
            job_description_id=request.job_description_id,
            resume_id=request.resume_id,
            content=guide_content
        )
        career_guide_data = convert_datetimes_to_iso(career_guide.model_dump())
        result = supabase.table("career_guides").insert(career_guide_data).execute()
        return result.data[0]
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error generating career guide: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/career-guides/{user_id}", response_model=List[CareerGuide])
async def list_career_guides(user_id: str):
    """List all career guides for a user"""
    try:
        result = supabase.table("career_guides").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Error listing career guides: {str(e)}")
        raise HTTPException(status_code=500, detail="Error listing career guides")

@app.post("/api/portfolios/generate", response_model=Portfolio)
async def generate_portfolio(request: PortfolioGenerateRequest, background_tasks: BackgroundTasks):
    """Generate a portfolio based on job description and resume or chat session"""
    try:
        # Get job description if provided
        job_description = None
        if request.job_description_id:
            jd_result = supabase.table("job_descriptions").select("*").eq("id", request.job_description_id).single().execute()
            if not jd_result.data:
                raise HTTPException(status_code=404, detail="Job description not found")
            job_description = jd_result.data
        
        # Get resume or chat session based on what's provided
        resume_content = None
        if request.resume_id:
            resume_result = supabase.table("resumes").select("*").eq("id", request.resume_id).single().execute()
            if not resume_result.data:
                raise HTTPException(status_code=404, detail="Resume not found")
            resume_content = resume_result.data["content"]
        elif request.chat_session_id:
            chat_result = supabase.table("chat_messages").select("*").eq("chat_session_id", request.chat_session_id).order("created_at").execute()
            if not chat_result.data:
                raise HTTPException(status_code=404, detail="Chat session not found")
            # Get the last message which should contain the structured data
            last_message = chat_result.data[-1]
            try:
                resume_content = json.loads(last_message["content"])
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid chat session data")
        else:
            raise HTTPException(status_code=400, detail="Either resume_id or chat_session_id must be provided")
        
        # Create portfolio record
        portfolio = Portfolio(
            user_id=request.user_id,
            job_description_id=request.job_description_id,
            resume_id=request.resume_id,
            chat_session_id=request.chat_session_id,
            title=request.title,
            method=PortfolioMethod.RESUME if request.resume_id else PortfolioMethod.CHAT,
            status=PortfolioStatus.PROCESSING
        )
        portfolio_data = convert_datetimes_to_iso(portfolio.model_dump())
        result = supabase.table("portfolios").insert(portfolio_data).execute()
        
        # Process in background
        def process_portfolio_sync():
            try:
                if isinstance(resume_content, dict):
                    # If it's already structured (from chat), use it directly
                    structured_content = resume_content
                else:
                    # If it's text (from resume), analyze it
                    structured_content = llm_service.analyze_resume(resume_content)
                
                # If job description is provided, use it to enhance the portfolio
                if job_description:
                    structured_content = llm_service.enhance_portfolio_with_jd(structured_content, job_description)
                
                portfolio_content = llm_service.generate_portfolio_content(structured_content)
                supabase.table("portfolios").update({
                    "status": PortfolioStatus.COMPLETED,
                    "content": structured_content,
                    "html": portfolio_content["html"],
                    "css": portfolio_content["css"],
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", portfolio.id).execute()
            except Exception as e:
                logger.error(f"Error processing portfolio: {str(e)}")
                supabase.table("portfolios").update({
                    "status": PortfolioStatus.ERROR,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", portfolio.id).execute()
        
        background_tasks.add_task(process_portfolio_sync)
        return result.data[0]
    except Exception as e:
        logger.error(f"Error generating portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/resumes/{user_id}/latest")
async def get_latest_resume(user_id: str):
    """Get the latest resume for a user"""
    try:
        result = supabase.table("resumes").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="No resume found for user")
        return result.data[0]
    except Exception as e:
        logger.error(f"Error fetching latest resume: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching latest resume")

@app.get("/api/job-descriptions/{user_id}/latest")
async def get_latest_job_description(user_id: str):
    """Get the latest job description for a user"""
    try:
        result = supabase.table("job_descriptions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="No job description found for user")
        return result.data[0]
    except Exception as e:
        logger.error(f"Error fetching latest job description: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching latest job description")

@app.post("/api/interviews/feedback", response_model=Dict[str, str])
async def get_interview_feedback(request: InterviewFeedbackRequest):
    """Generate detailed feedback for a completed interview"""
    try:
        feedback = llm_service.generate_interview_feedback(request.questions, request.score)
        return {"feedback": feedback}
    except Exception as e:
        logger.error(f"Error generating interview feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== API ROUTES END =====

# Mount static files for frontend AFTER all API routes are defined
frontend_path = Path(__file__).parent / "frontend" / "dist"
if frontend_path.exists():
    # Mount static files at root AFTER all API routes
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="static")
    logger.info(f"Frontend static files mounted at root from {frontend_path}")
else:
    logger.warning(f"Frontend static files not found at {frontend_path}")

# Update the catch-all route to handle both API and frontend routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str, request: Request):
    """Serve the frontend SPA for all non-API routes"""
    # Skip API routes
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    
    # Skip static files (they're handled by StaticFiles middleware)
    if full_path.startswith("assets/") or "." in full_path.split("/")[-1]:
        raise HTTPException(status_code=404, detail="Static file not found")
    
    # Serve index.html for all other routes
    if frontend_path.exists():
        try:
            return FileResponse(frontend_path / "index.html")
        except Exception as e:
            logger.error(f"Error serving frontend: {str(e)}")
            raise HTTPException(status_code=500, detail="Error serving frontend")
    raise HTTPException(status_code=404, detail="Frontend not found")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 