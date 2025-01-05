import os
import shutil

# Remove .env.example
if os.path.exists('.env.example'):
    os.remove('.env.example')

# Remove .env.validation if it exists
if os.path.exists('.env.validation'):
    os.remove('.env.validation')
