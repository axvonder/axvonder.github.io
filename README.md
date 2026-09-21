# Alexander Vonderschmidt

Static personal website for [axvonder.com](https://axvonder.com/).

## Local preview

Run `python3 -m http.server 8000 --bind 127.0.0.1` from this folder, then open `http://127.0.0.1:8000/`.

`index.html` is the homepage. `music.html` lists singing experience. Both use `site.css`. The old `research.html` and `choir.html` URLs redirect to their replacements. `cv.html` keeps its existing content. Both existing CV PDFs remain unchanged. `CNAME` preserves the custom domain. The `FIMreadiness` and `mage-game` folders retain their existing URLs. `RiskStratTool/` redirects to the integrated [Tufts toolkit](https://fimtoolkit.tufts.edu/design/program-design/). The original tool and its assets are archived locally at `../archived-projects/RiskStratTool/`, outside the published repository.

## Colour themes

`theme.css` and `theme.js` share the light and dark palettes and toggle across the homepage, music page, and old CV page. Each page starts in light mode, including reloads and browser Back. Dark mode requires a toggle click on that page. System preferences and previously saved choices do not change the default. Run `node theme.test.cjs` to check this behaviour.

## Music player

The homepage and music page use `music-player.js` to play the supplied recording in `assets/audio/`. It starts loading after the page finishes loading, without autoplay. Playback starts at 7.3 seconds to skip the recording's silent opening. The first audio signal is at 7.349 seconds. Click to play or pause. The thin bar appears during playback and supports seeking with a click, drag, or arrow keys. `site-navigation.js` keeps the player attached while changing pages through links marked `data-site-page`, including browser Back and Forward. Leaving the site or reloading pauses playback. Run `node music-player.test.cjs` and `node site-navigation.test.cjs` to check playback and navigation.

## Publications

Run `python3 publications/verify.py` to check the ten publication entries, ten PDF downloads, file hashes, and disclosure links.

Edit publication content in `index.html` and keep `publications/publications.json` consistent. List all authors in AMA-style citations and bold **Vonderschmidt A**. Keep the copyright and licence credits. See [publication sharing checks](publications/SHARING.md) for sources and reuse terms. Keep the saved PDFs unchanged. The Cochrane copy includes its required sharing acknowledgement on the cover. The supplied original is archived locally in `../publication-originals/`, outside the published repository.

## Images

The portrait, Tufts logo, and original sunglasses in `assets/` were supplied by Alexander. `sunglasses-fitted-v2.png` is the current transparent overlay, generated with the built-in image tool. Its lenses have no visible arm shapes, and its bridge and placement follow the portrait's glasses. [The prompts](assets/sunglasses-fitted-v2.prompt.txt) are saved beside it. The original and first fitted variant are retained. The homepage layers the sunglasses over the portrait in dark mode. A manual toggle animates them. Reduced-motion settings skip the animation. The LinkedIn icon comes from [LinkedIn's official downloads](https://brand.linkedin.com/downloads). The choir photograph and Google Scholar icon reuse the existing site files.
