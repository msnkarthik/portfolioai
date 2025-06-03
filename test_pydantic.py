from pydantic import BaseModel, Field

class PortfolioBase(BaseModel):
    title: str
    user_id: str = Field(..., description="UUID of the user")

print("Pydantic model defined successfully.") 