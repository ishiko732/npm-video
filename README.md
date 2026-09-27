# NPM Video

Generate beautiful animated videos that highlight your npm package download trends.

🌐 **Live Demo**: [npmvideo.com](https://npmvideo.com)

## Example output

![Example output](public/example.png)

## Stack

- [Remotion](https://www.remotion.dev/) for previews and browser-side MP4 export; no AWS account or keys required
- [Next.js](https://nextjs.org/) for the web application
- [TailwindCSS](https://tailwindcss.com/) for the styling
- [HeroUI](https://heroui.com/) for the UI components
- [npm Downloads API](https://api.npmjs.org) for usage metrics

## Contribute

If you want to suggest a feature or report a problem, feel free to open an issue or even a pull request 😉.

## Credits

This project is based on [GitHub Stars Video](https://github.com/scastiel/github-stars-video) by [Sebastien Castiel](https://scastiel.dev/?ref=github-stars). Thank you for the inspiration and the excellent foundation! ⭐

## License

MIT, see [LICENSE](./LICENSE).

## Local development

Use Node.js 24 and pnpm 12.5.1:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

No AWS or Redis credentials are needed. MP4 export runs in your browser and offers a download link when finished. It requires a browser with WebCodecs and H.264 encoding support; unsupported browsers display an error. Keep the page open during export, or use Cancel export to stop it.

## GitHub Pages

In the repository's **Settings → Pages**, choose **GitHub Actions** as the source. Push to `main` or run the **Deploy to GitHub Pages** workflow manually. The workflow builds the static `out/` directory and derives the site's base path from Pages, supporting both repository sites and custom domains.

To build for this repository locally:

```sh
NEXT_PUBLIC_BASE_URL=https://ishiko732.github.io NEXT_PUBLIC_BASE_PATH=/npm-video pnpm build
```

Serve `out/` with a static HTTP server mounted at `/npm-video/` to test the same URLs. Omit `NEXT_PUBLIC_BASE_PATH` for a site hosted at the domain root. The app queries the public npm API and jsDelivr directly from the browser; no application server is deployed.

Requests are cached for five minutes (including across reloads when browser storage is available), concurrent identical requests share one fetch, and long date ranges use at most two simultaneous requests. HTTP 429 responses respect `Retry-After`; errors are shown rather than retried continuously.

Run `pnpm typecheck` for TypeScript validation.
