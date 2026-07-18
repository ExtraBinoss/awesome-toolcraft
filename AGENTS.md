# Project instructions

## Node and npm commands

This project is accessed from WSL, but its Node/npm toolchain must be run through Windows PowerShell.

- Run every `npm`, `npx`, `node`, Vite, TypeScript, and project build command through `powershell.exe`.
- Do not invoke the WSL Node/npm installation directly from Bash.
- Set the Windows project directory explicitly before running the command:

  ```bash
  powershell.exe -NoProfile -Command "Set-Location -LiteralPath '<USERPROFILE>\Documents\Personal_project\Codex\Toolcraft\awesome-toolcraft2'; npm run build"
  ```

- Use the same pattern for other scripts, for example `npm run dev` or `npm run preview`.
- Keep the existing RTK command wrapper requirement when invoking commands from the agent shell.
