const gulp = require('gulp'),
	del = require('del'),
	fileinclude = require('gulp-file-include'),
	browserSync = require('browser-sync').create(),
	newer = require('gulp-newer'),
	imagemin = require('gulp-imagemin'),
	through2 = require('through2'),
	pretty = require('pretty'),
	sass = require('gulp-sass')(require('sass')),
	cleanCss = require('gulp-clean-css'),
	sourcemaps = require('gulp-sourcemaps'),
	autoprefixer = require('gulp-autoprefixer'),
	// concat = require('gulp-concat'),
	replace = require('gulp-replace'),
	sassInlineSvg = require('gulp-sass-inline-svg'),
	svgmin = require('gulp-svgmin'),
	jshint = require('gulp-jshint'),
	stylish = require('jshint-stylish'),
	// plumber = require('gulp-plumber'),
	notify = require('gulp-notify');

const paths = {
	resources: 'src/@resources/**',
	dev: 'dev/',
	build: 'build/',
	html: {
		src: ['src/html/**/*.html', '!src/html/@includes/**/*.html'],
		base: 'src/html/@includes/',
		dest: 'dev/',
	},
	svgs: {
		src: 'src/@resources/svgs/*.svg',
		dest: 'src/@resources/styles/@scss/@sprites/',
	},
	scss: {
		src: 'src/@resources/styles/@scss/**/*.scss',
		dest: 'src/@resources/styles/',
	},
	styles: {
		src: ['src/@resources/styles/*.css', '!src/@resources/styles/*.min.css'],
		dest: 'src/@resources/styles/',
	},
	scripts: {
		src: 'src/@resources/scripts/*.js',
		dest: 'src/@resources/scripts/',
		gulp: 'gulpfile.babel.js',
		vendor: 'src/@resources/scripts/libs/',
	},
};

function server(cb) {
	browserSync.init({
		server: {
			baseDir: paths.dev,
		},
	});
	cb();
}

function watch(cb) {
	gulp.watch('src/html/**', htmlBuild);
	gulp.watch(paths.svgs.src, stylesSvg);
	gulp.watch(paths.scss.src, watchStyles);
	gulp.watch('src/@resources/styles/*.css', copyStyles);
	gulp.watch([paths.scripts.src, '!src/@resources/scripts/libs/*'], watchScripts);
	gulp.watch(['src/@resources/images/*'], gulp.parallel(watchImages, copyImages));
	cb();
}

/* html */
function prettyGulp(file, enc, callback) {
	file.contents = Buffer.from(pretty(file.contents.toString(), { ocd: true }));
	callback(null, file);
}

function htmlInclude() {
	return gulp
		.src(paths.html.src)
		.pipe(
			fileinclude({
				prefix: '@@',
				basepath: 'src/html/@includes',
			})
		)
		.on('error', notify.onError('Error: <%= error.message %>'))
		.pipe(through2.obj(prettyGulp))
		.pipe(gulp.dest(paths.html.dest))
		.pipe(browserSync.reload({ stream: true }));
}
function htmlBuild(cb) {
	htmlInclude();
	cb();
}

/* css */
function styles() {
	return gulp
		.src(paths.scss.src)
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(sass({ outputStyle: 'expanded', indentType: 'tab', indentWidth: 2 }))
		.on('error', notify.onError('Error: <%= error.message %>'))
		.pipe(gulp.dest(paths.scss.dest))
		.pipe(autoprefixer({ cascade: false }))
		.pipe(cleanCss({ format: 'keep-breaks' }))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(paths.styles.dest))
		.pipe(browserSync.reload({ stream: true }));
}
function stylesSvg() {
	return gulp
		.src(paths.svgs.src)
		.pipe(svgmin())
		.pipe(
			sassInlineSvg({
				destDir: paths.svgs.dest,
			})
		)
		.pipe(gulp.src(paths.svgs.dest + '_sass-inline-svg.scss'))
		.pipe(replace('call($functionname', 'call(get-function($functionname)'))
		.pipe(gulp.dest(paths.svgs.dest));
}
function watchStyles(cb) {
	styles();
	copyStyles();
	cb();
}
function stylesBuild(cb) {
	stylesSvg();
	styles();
	cb();
}
// gulp.task('styles:libs', function () {
// 	return gulp.src(['./node_modules/swiper/dist/css/swiper.min.css']).pipe(gulp.dest(paths.styles.dest));
// });

/* js */
function scripts() {
	return gulp
		.src(paths.scripts.src)
		.pipe(jshint())
		.pipe(jshint.reporter(stylish))
		.pipe(browserSync.reload({ stream: true }));
}
function scriptsLibs() {
	return gulp
		.src(['node_modules/jquery/dist/jquery.min.js', 'node_modules/focus-visible/dist/focus-visible.min.js'])
		.pipe(gulp.dest(paths.scripts.vendor));
}
function watchScripts(cb) {
	scripts();
	copyScripts();
	cb();
}
function scriptsBuild(cb) {
	scriptsLibs();
	scripts();
	cb();
}

/* images */
function watchImages() {
	return gulp.src(['sources/assets/images/**']).pipe(browserSync.reload({ stream: true }));
}

/* clean */
function cleanDev() {
	return del([paths.dev]);
}
function cleanBuild() {
	return del([paths.build]);
}

/* copy file */
function copyAssets() {
	return gulp
		.src(['src/@resources/**', '!**/@scss', '!**/@scss/**', '!**/@sprites', '!**/@sprites/**', '!**/svgs', '!**/svgs/**'])
		.pipe(gulp.dest('dev/assets/'));
}
function copyScripts() {
	return gulp.src('src/@resources/scripts/**').pipe(gulp.dest('dev/assets/scripts/'));
}
function copyStyles() {
	return gulp.src('src/@resources/styles/**/*.css').pipe(gulp.dest('dev/assets/styles/'));
}
function copyImages() {
	return gulp
		.src('src/@resources/images/**')
		.pipe(newer('dev/assets/images/'))
		.pipe(imagemin({ verbose: true }))
		.pipe(gulp.dest('dev/assets/images/'));
}
function copyBuild() {
	return gulp.src(['dev/**', '!dev/assets/styles/**.map']).pipe(gulp.dest('build/'));
}

exports.clean = gulp.series(cleanDev, cleanBuild);
exports.default = gulp.series(
	gulp.parallel(htmlInclude, stylesBuild, scriptsBuild),
	copyImages,
	copyAssets,
	gulp.parallel(server, watch)
);
exports.build = gulp.series(
	cleanDev,
	cleanBuild,
	gulp.parallel(htmlBuild, stylesBuild, scriptsBuild),
	copyImages,
	copyAssets,
	copyBuild,
	server
);
