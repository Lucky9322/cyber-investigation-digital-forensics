import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

# Read Supabase settings from the environment
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "").strip()

# Cached client instance to avoid recreating connections repeatedly
_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Initializes and returns the Supabase client.

    SECURITY NOTICE:
    This client is initialized using SUPABASE_SECRET_KEY (service role key), which has
    administrative privileges and BYPASSES PostgreSQL Row Level Security (RLS).
    - Any future database operations using this client must explicitly enforce user
      authorization in the backend code.
    - Never expose SUPABASE_SECRET_KEY or this client to the frontend or API responses.
    - Do not assume RLS protects queries executed with the secret key.
    """
    global _client

    if _client is not None:
        return _client

    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise ValueError(
            "Supabase configuration is missing. Ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set."
        )

    _client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
    return _client
