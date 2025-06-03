"""
Secrets Manager for PortfolioAI
Handles environment variables for both local development and Hugging Face Spaces deployment.
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SecretsManager:
    """Manages environment variables and secrets for the application."""
    
    # Required environment variables
    REQUIRED_VARS = {
        'SUPABASE_URL': 'Supabase project URL',
        'SUPABASE_KEY': 'Supabase API key',
        'GROQ_API_KEY': 'Groq LLM API key'
    }
    
    def __init__(self):
        """Initialize the secrets manager."""
        # Try to load from .env file first (for local development)
        load_dotenv()
        
        # Check if we're running in Hugging Face Spaces
        self.is_hf_space = os.getenv('SPACE_ID') is not None
        
        if self.is_hf_space:
            logger.info("Running in Hugging Face Spaces environment")
        else:
            logger.info("Running in local development environment")
    
    def get_secret(self, key: str) -> Optional[str]:
        """
        Get a secret value from environment variables.
        
        Args:
            key (str): The name of the environment variable
            
        Returns:
            Optional[str]: The value of the environment variable, or None if not found
            
        Raises:
            ValueError: If a required secret is missing
        """
        value = os.getenv(key)
        
        if key in self.REQUIRED_VARS and not value:
            error_msg = f"Missing required environment variable: {key} ({self.REQUIRED_VARS[key]})"
            if self.is_hf_space:
                error_msg += ". Please add it to your Hugging Face Space secrets."
            else:
                error_msg += ". Please add it to your .env file."
            raise ValueError(error_msg)
            
        return value
    
    def validate_secrets(self) -> bool:
        """
        Validate that all required secrets are present.
        
        Returns:
            bool: True if all required secrets are present
            
        Raises:
            ValueError: If any required secrets are missing
        """
        missing_vars = []
        
        for var_name, description in self.REQUIRED_VARS.items():
            if not self.get_secret(var_name):
                missing_vars.append(f"{var_name} ({description})")
        
        if missing_vars:
            error_msg = "Missing required environment variables:\n"
            for var in missing_vars:
                if self.is_hf_space:
                    error_msg += f"- {var}. Please add it to your Hugging Face Space secrets.\n"
                else:
                    error_msg += f"- {var}. Please add it to your .env file.\n"
            raise ValueError(error_msg)
        
        return True

# Create a singleton instance
secrets_manager = SecretsManager()

# Convenience functions for accessing secrets
def get_supabase_url() -> str:
    """Get the Supabase project URL."""
    return secrets_manager.get_secret('SUPABASE_URL')

def get_supabase_key() -> str:
    """Get the Supabase API key."""
    return secrets_manager.get_secret('SUPABASE_KEY')

def get_groq_api_key() -> str:
    """Get the Groq LLM API key."""
    return secrets_manager.get_secret('GROQ_API_KEY')

# Validate secrets on module import
try:
    secrets_manager.validate_secrets()
    logger.info("All required secrets are present")
except ValueError as e:
    logger.error(str(e))
    raise 