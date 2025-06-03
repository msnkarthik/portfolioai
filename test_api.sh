#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:8000"

# Test user ID (replace with a valid UUID from your database)
USER_ID="test-user-123"

echo "Starting API Tests..."

# 1. Test Job Description Creation
echo -e "\n${GREEN}Testing Job Description Creation...${NC}"
JOB_DESC_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/job-descriptions" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'${USER_ID}'",
    "title": "Senior Software Engineer",
    "content": "We are looking for a Senior Software Engineer with 5+ years of experience in Python and web development. The ideal candidate should have strong experience with FastAPI, React, and cloud technologies. Responsibilities include designing and implementing scalable backend services, mentoring junior developers, and leading technical initiatives."
  }')

JOB_DESC_ID=$(echo $JOB_DESC_RESPONSE | jq -r '.id')
echo "Created Job Description ID: $JOB_DESC_ID"

# 2. Test Listing Job Descriptions
echo -e "\n${GREEN}Testing Job Description Listing...${NC}"
curl -s -X GET "${BASE_URL}/api/job-descriptions/${USER_ID}" | jq '.'

# 3. Test Resume Upload (Note: This is a mock since we need a file)
echo -e "\n${GREEN}Testing Resume Upload...${NC}"
RESUME_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/portfolios/resume" \
  -H "Content-Type: multipart/form-data" \
  -F "user_id=${USER_ID}" \
  -F "title=My Resume" \
  -F "file=@sample_resume.txt")

RESUME_ID=$(echo $RESUME_RESPONSE | jq -r '.portfolio_id')
echo "Created Resume ID: $RESUME_ID"

# 4. Test Resume Optimization
echo -e "\n${GREEN}Testing Resume Optimization...${NC}"
OPTIMIZE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/resumes/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'${USER_ID}'",
    "job_description_id": "'${JOB_DESC_ID}'",
    "resume_id": "'${RESUME_ID}'"
  }')

OPTIMIZED_RESUME_ID=$(echo $OPTIMIZE_RESPONSE | jq -r '.id')
echo "Optimized Resume ID: $OPTIMIZED_RESUME_ID"

# 5. Test Cover Letter Generation
echo -e "\n${GREEN}Testing Cover Letter Generation...${NC}"
curl -s -X POST "${BASE_URL}/api/cover-letters/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'${USER_ID}'",
    "job_description_id": "'${JOB_DESC_ID}'",
    "optimized_resume_id": "'${OPTIMIZED_RESUME_ID}'"
  }' | jq '.'

# 6. Test Interview Session Start
echo -e "\n${GREEN}Testing Interview Session Start...${NC}"
INTERVIEW_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/interviews/start" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'${USER_ID}'",
    "job_description_id": "'${JOB_DESC_ID}'"
  }')

INTERVIEW_ID=$(echo $INTERVIEW_RESPONSE | jq -r '.id')
echo "Created Interview Session ID: $INTERVIEW_ID"

# 7. Test Interview Answer Submission
echo -e "\n${GREEN}Testing Interview Answer Submission...${NC}"
curl -s -X POST "${BASE_URL}/api/interviews/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "interview_id": "'${INTERVIEW_ID}'",
    "question_index": 0,
    "answer": "I have extensive experience with Python and FastAPI, having built several microservices using these technologies. I follow best practices for code organization, testing, and documentation."
  }' | jq '.'

# 8. Test Career Guide Generation
echo -e "\n${GREEN}Testing Career Guide Generation...${NC}"
curl -s -X POST "${BASE_URL}/api/career-guides/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'${USER_ID}'",
    "job_description_id": "'${JOB_DESC_ID}'",
    "optimized_resume_id": "'${OPTIMIZED_RESUME_ID}'"
  }' | jq '.'

# 9. Test Listing All Resources
echo -e "\n${GREEN}Testing Resource Listing...${NC}"
echo "Listing Cover Letters:"
curl -s -X GET "${BASE_URL}/api/cover-letters/${USER_ID}" | jq '.'

echo -e "\nListing Interview Scores:"
curl -s -X GET "${BASE_URL}/api/interviews/scores/${USER_ID}" | jq '.'

echo -e "\nListing Career Guides:"
curl -s -X GET "${BASE_URL}/api/career-guides/${USER_ID}" | jq '.'

echo -e "\n${GREEN}API Testing Complete!${NC}" 