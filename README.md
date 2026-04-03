# inspirations for traetest_game1 from czc

Thanks to czc！

# React + TypeScript + Vite

## Deploy to GitHub Pages

This repo is now configured for GitHub Pages with GitHub Actions.

### What was added

- `/.github/workflows/deploy-pages.yml` builds and deploys the site on every push to `main`
- [`vite.config.ts`](/Users/cen/ClonedProjects/traetest_game1/vite.config.ts) reads `VITE_BASE_PATH` so asset paths work under a project page
- [`src/App.tsx`](/Users/cen/ClonedProjects/traetest_game1/src/App.tsx) uses `HashRouter` so page refreshes do not 404 on GitHub Pages

### How to publish

1. Push this repo to GitHub.
2. Open `Settings -> Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to the `main` branch, or run the `Deploy to GitHub Pages` workflow manually from the `Actions` tab.
5. Wait for the workflow to finish, then open:

`https://<your-github-username>.github.io/<your-repo-name>/`

### Notes

- This setup works for GitHub Pages project sites such as `/traetest_game1/`.
- If you rename the repository, the workflow will automatically use the new repo name as the base path.
- Routes will look like `#/game`, which avoids refresh issues on GitHub Pages static hosting.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```
