"""Generate a bcrypt password hash for config.yml."""
import sys

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if len(sys.argv) < 2:
    print("Usage: python scripts/hash_password.py <password>")
    sys.exit(1)

password = sys.argv[1]
print(pwd_context.hash(password))
