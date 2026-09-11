# Contributing to Amma AI

Albert has collaborator access to this repository. The safest workflow is to make each change on its own branch and merge it through a pull request.

## Clone and start

```bash
git clone https://github.com/AbelLeslieE/Amma-AI-Web_temp.git
cd Amma-AI-Web_temp
npm ci
git checkout -b albert/short-feature-name
npm run dev
```

## Before opening a pull request

```bash
npm run typecheck
npm test
npm run build:render
```

Push the branch, open a pull request into `main`, describe the visible behavior that changed, and include the checks you ran. Never commit `.env`, `.env.local`, `OPENAI_API_KEY`, or any other secret.

If Albert prefers a personal fork, sign into the `albert-sibichan-jacob` account, open the repository, select **Fork**, and create a branch inside that fork. GitHub keeps it connected to the same TinkerHub fork network.
