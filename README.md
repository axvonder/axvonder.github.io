# Alexander Vonderschmidt

Static personal website for [axvonder.com](https://axvonder.com/).

## Local preview

Run `python3 -m http.server 8000 --bind 127.0.0.1` from this folder, then open `http://127.0.0.1:8000/`.

`index.html` is the homepage. `music.html` lists singing experience. Both use `site.css`. The old `research.html` and `choir.html` URLs redirect to their replacements. `cv.html` keeps its existing content. Both existing CV PDFs remain unchanged. `CNAME` preserves the custom domain. The `FIMreadiness` and `mage-game` folders retain their existing URLs. `RiskStratTool/` redirects to the integrated [Tufts toolkit](https://fimtoolkit.tufts.edu/design/program-design/). The original tool and its assets are archived locally at `../archived-projects/RiskStratTool/`, outside the published repository.

## Colour themes

`theme.css` and `theme.js` share the light and dark palettes and toggle across the homepage, music page, and old CV page. The first visit follows the system preference. A toggle choice is saved in the browser and applied before rendering each page. Run `node theme.test.cjs` to check preference handling.

## Publications

Run `python3 publications/verify.py` to check the ten publication entries, ten PDF downloads, file hashes, and disclosure links.

Edit publication content in `index.html` and keep `publications/publications.json` consistent. List all authors in AMA-style citations and bold **Vonderschmidt A**. Keep the copyright and licence credits. See [publication sharing checks](publications/SHARING.md) for sources and reuse terms. Keep the saved PDFs unchanged. The Cochrane copy includes its required sharing acknowledgement on the cover. The supplied original is archived locally in `../publication-originals/`, outside the published repository.

## Images

The portrait and Tufts logo in `assets/` were supplied by Alexander. The LinkedIn icon comes from [LinkedIn's official downloads](https://brand.linkedin.com/downloads). The choir photograph and Google Scholar icon reuse the existing site files.
