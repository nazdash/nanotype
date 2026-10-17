import gulp from 'gulp';
import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
import cleanCss from 'gulp-clean-css';
import webpackStream from 'webpack-stream';
import browserSync from 'browser-sync';
import del from 'del';
import fs from 'fs';
import { Transform } from 'stream';
import { files as seoFiles } from './src/seo.mjs';

const sass = gulpSass(dartSass);
const server = browserSync.create();

// Webpack Stream config
const webpackStreamConfig = {
  mode: process.env.NODE_ENV,
  output: {
    filename: 'bundle.js',
  },
};

// Paths
const paths = {
  src: 'src/**/*',
  srcScss: 'src/scss/**/*',
  srcMainScss: 'src/scss/style.scss',
  srcJs: 'src/js/**/*.js',
  srcMainJs: 'src/js/main.js',

  dist: 'dist',
  distCss: 'dist/css',
  distJs: 'dist/js',

  public: ['public/**/*', '!public/sw.js'],
  serviceWorker: 'public/sw.js',
};

// Clean dist
const clean = () => del([paths.dist]);

// CSS
function css() {
  return gulp.src(paths.srcMainScss)
    .pipe(sass().on('error', sass.logError))
    .pipe(cleanCss())
    .pipe(gulp.dest(paths.distCss));
}

// JS
function js() {
  return gulp.src(paths.srcMainJs)
    .pipe(webpackStream(webpackStreamConfig))
    .pipe(gulp.dest(paths.distJs));
}

// Copy public to dist
function copyPublic() {
  return gulp.src(paths.public)
    .pipe(gulp.dest(paths.dist));
}

// Service worker: stamp the build version and the list of files to cache offline
function serviceWorker() {
  const build = Date.now().toString(36);
  const listDir = (dir) => fs.readdirSync(`public/${dir}`).map((file) => `/${dir}/${file}`);
  const assets = [
    '/', '/css/style.css', '/js/bundle.js', '/site.webmanifest', '/words.txt',
    '/favicon.svg', '/favicon-32x32.png', '/favicon-16x16.png', '/apple-touch-icon.png',
    ...listDir('fonts'),
    ...listDir('sfx'),
  ];
  const stamp = new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      file.contents = Buffer.from(
        String(file.contents)
          .replace(/__BUILD__/g, build)
          .replace(/__ASSETS__/g, JSON.stringify(assets)),
      );
      callback(null, file);
    },
  });

  return gulp.src(paths.serviceWorker)
    .pipe(stamp)
    .pipe(gulp.dest(paths.dist));
}

// The files for search engines and AI assistants, from src/facts.mjs (see src/seo.mjs);
// not in the service worker's list: nothing the app loads
function seo(done) {
  const generated = seoFiles();

  Object.keys(generated).forEach((name) => fs.writeFileSync(`${paths.dist}/${name}`, generated[name]));
  done();
}

// Reload
function reload(done) {
  server.reload();
  done();
}

// Serve
function serve(done) {
  server.init({
    server: {
      baseDir: paths.dist,
    },
    port: 3002,     // always here, whatever else is running
    ui: false,      // no Browsersync control panel
    open: false,
    notify: false,  // no "connected" badge over the page
  });
  done();
}

// Build task
const build = gulp.series(clean, js, css, copyPublic, serviceWorker, seo);

// Build dev task
const buildDev = gulp.series(js, css, copyPublic, serviceWorker, seo);

const watch = () => gulp.watch(
  [paths.src, 'public/**/*'],
  gulp.series(buildDev, reload),
);

// Dev task
export const dev = gulp.series(buildDev, serve, watch);

export default build;
