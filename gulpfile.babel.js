const gulp = require('gulp'),
	del = require('del'),
	fileinclude = require('gulp-file-include'),
	browserSync = require('browser-sync').create(),
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
		// vendor: 'src/@resources/scripts/libs/*.js',
	},
};

function prettyGulp(file, enc, callback) {
	file.contents = Buffer.from(pretty(file.contents.toString(), { ocd: true }));
	callback(null, file);
}

function server(cb) {
	browserSync.init({
		server: {
			baseDir: paths.dev,
		},
	});
	cb();
}

function watchImages() {
	return gulp.src(['sources/assets/images/**']).pipe(browserSync.reload({ stream: true }));
}

function watch(cb) {
	gulp.watch('src/html/**', gulp.series(htmlBuild));
	gulp.watch(paths.svgs.src, gulp.series(stylesSvg));
	gulp.watch(paths.scss.src, gulp.series(watchStyles));
	gulp.watch('src/@resources/styles/*.css', gulp.series(copyStyles));
	gulp.watch(paths.scripts.src, gulp.series(watchScripts));
	gulp.watch(['src/@resources/images/*'], gulp.parallel(watchImages, copyImages));
	cb();
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
		.pipe(through2.obj(prettyGulp))
		.pipe(gulp.dest(paths.html.dest))
		.pipe(browserSync.reload({ stream: true }));
}

function styles() {
	return gulp
		.src(paths.scss.src)
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(sass({ outputStyle: 'expanded', indentType: 'tab', indentWidth: 2 }))
		.on('error', function (err) {
			notify().write(err);
			this.emit('end');
		})
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
// gulp.task('styles:libs', function () {
// 	return gulp.src(['./node_modules/swiper/dist/css/swiper.min.css']).pipe(gulp.dest(paths.styles.dest));
// });

function scripts() {
	return gulp.src(paths.scripts.src).pipe(browserSync.reload({ stream: true }));
}
function scriptsLibs() {
	return gulp
		.src(['node_modules/jquery/dist/jquery.min.js', 'node_modules/focus-visible/dist/focus-visible.min.js'])
		.pipe(gulp.dest(paths.scripts.dest));
}

function cleanDev() {
	return del([paths.dev]);
}
function cleanBuild() {
	return del([paths.build]);
}

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
		.pipe(imagemin({ verbose: true }))
		.pipe(gulp.dest('dev/assets/images/'));
}
function copyBuild() {
	return gulp.src(['dev/**', '!dev/assets/styles/**.map']).pipe(gulp.dest('build/'));
}

function watchStyles(cb) {
	gulp.series(styles, copyStyles);
	cb();
}
function watchScripts(cb) {
	gulp.series(scripts, copyScripts);
	cb();
}

function htmlBuild(cb) {
	gulp.series(htmlInclude);
	cb();
}
function stylesBuild(cb) {
	gulp.series(stylesSvg, styles);
	cb();
}
function scriptsBuild(cb) {
	gulp.series(scriptsLibs, scripts);
	cb();
}

exports.clean = gulp.series(cleanDev, cleanBuild);
exports.default = gulp.series(
	gulp.parallel(htmlInclude, stylesBuild, scriptsBuild),
	// htmlInclude,
	// stylesSvg,
	// styles,
	// scriptsLibs,
	// scripts,
	copyImages,
	copyAssets,
	gulp.parallel(server, watch)
);
exports.build = gulp.series(cleanDev, cleanBuild, gulp.parallel(htmlBuild, stylesBuild, scriptsBuild), copyAssets, copyBuild);
