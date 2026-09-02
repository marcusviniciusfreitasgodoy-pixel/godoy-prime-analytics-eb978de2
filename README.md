# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/21300eff-b88e-4ba4-b7ae-0a699fcd2df5

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/21300eff-b88e-4ba4-b7ae-0a699fcd2df5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having [Bun](https://bun.sh) installed. Bun is the project's package manager: `bun.lock` is the single lockfile (kept in sync by Lovable), so do not commit `package-lock.json` or `yarn.lock`.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies (frozen lockfile, same as CI).
bun install --frozen-lockfile

# Step 4: Create your local environment file and fill in the Supabase values
# (Supabase Dashboard > Project Settings > API). .env is git-ignored.
cp .env.example .env

# Step 5: Start the development server with auto-reloading and an instant preview.
bun run dev
```

## Continuous integration

Every push to `main` and every pull request runs `.github/workflows/ci.yml`, which installs dependencies with the frozen lockfile, runs `bun run typecheck`, `bun run lint` and `bun run build`. Run the same three commands locally before pushing.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/21300eff-b88e-4ba4-b7ae-0a699fcd2df5) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
