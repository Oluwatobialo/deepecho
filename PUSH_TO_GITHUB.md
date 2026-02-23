# Push this project to GitHub

Your repo is initialized and the first commit is done. Follow these steps to push to GitHub.

## 1. Set your Git identity (if you haven’t already)

In the project folder, run (use your real name and email):

```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

Optional: amend the last commit so it uses this identity:

```bash
git commit --amend --reset-author --no-edit
```

## 2. Create a new repository on GitHub

1. Open **https://github.com/new**
2. **Repository name:** e.g. `deepecho-clinical-saas` (or any name you like)
3. **Description:** optional
4. Choose **Public** (or Private)
5. **Do not** add a README, .gitignore, or license (this project already has them)
6. Click **Create repository**

## 3. Add the remote and push

GitHub will show you commands. Use these (replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name):

```bash
cd "c:\Users\alool\OneDrive\Desktop\DeepEcho Clinical SaaS Platform"

git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

git branch -M main
git push -u origin main
```

Example: if your repo is `https://github.com/alool/deepecho-clinical`, then:

```bash
git remote add origin https://github.com/alool/deepecho-clinical.git
git branch -M main
git push -u origin main
```

If GitHub prompts for login, use a **Personal Access Token** as the password (Settings → Developer settings → Personal access tokens).

---

**Note:** `.env` and `backend/.env` are in `.gitignore` and are **not** pushed. Anyone cloning the repo must add their own env files using `backend/.env.example` and the root `.env` (see SUPABASE_QUICK_SETUP.md).
