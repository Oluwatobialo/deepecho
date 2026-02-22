"""
Download a Hugging Face model to a local directory. Use the default MentalBERT
or your own fine-tuned model (e.g. your-username/your-model-name).

  py -m pip install -r requirements.txt
  $env:HF_TOKEN = "hf_xxx"   # Windows PowerShell
  py download_mentalbert.py

To use your own model:
  $env:HF_MODEL_ID = "your-username/your-model-name"
  py download_mentalbert.py

Optional: set MODEL_PATH in .env to a custom folder; or the script uses backend/models/<repo-name>.
"""
import os
import sys
from pathlib import Path

# Add backend to path when run from repo root
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from huggingface_hub import snapshot_download

# Default: MentalBERT. Override with env HF_MODEL_ID (e.g. your-username/your-finetuned-model)
DEFAULT_MODEL_ID = "AIMH/mental-bert-base-cased"
MODELS_DIR = BACKEND_DIR / "models"


def main():
    model_id = os.getenv("HF_MODEL_ID", DEFAULT_MODEL_ID).strip()
    if not model_id:
        model_id = DEFAULT_MODEL_ID

    # Local folder: safe name from repo (e.g. "user__repo-name")
    safe_name = model_id.replace("/", "__")
    local_dir = MODELS_DIR / safe_name
    local_dir.mkdir(parents=True, exist_ok=True)

    token = os.getenv("HF_TOKEN")
    if not token:
        print("HF_TOKEN not set. Using cached login if available (run: py -m huggingface_hub auth login)")

    print(f"Downloading {model_id} to {local_dir} ...")
    local_path = snapshot_download(
        repo_id=model_id,
        local_dir=str(local_dir),
        local_dir_use_symlinks=False,
        token=token,
    )
    print(f"Model saved to: {local_path}")
    print("In .env set: MODEL_PATH=" + str(local_dir.resolve()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
