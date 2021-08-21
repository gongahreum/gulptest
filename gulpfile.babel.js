const gulp = require('gulp'),
	del = require('del'),
	fileinclude = require('gulp-file-include'),
	browserSync = require('browser-sync').create(),
	// buffer = require('vinyl-buffer'),
	imagemin = require('gulp-imagemin'),
	through2 = require('through2'),
	pretty = require('pretty'),
	sass = require('gulp-sass')(require('sass')),
	cleanCss = require('gulp-clean-css'),
	sourcemaps = require('gulp-sourcemaps'),
	autoprefixer = require('gulp-autoprefixer'),
	concat = require('gulp-concat'),
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
		gulp: 'gulpfile.babel.js',
		vendor: 'src/@resources/scripts/libs/*.js',
	},
};

function prettyGulp(file, enc, callback) {
	file.contents = Buffer.from(pretty(file.contents.toString(), { ocd: true }));
	callback(null, file);
}

gulp.task('browserSync', function () {
	browserSync.init({
		server: {
			baseDir: paths.build, // 서버에 띄울 폴더 위치 지정
			// directory: true,
		},
	});
	// gulp.watch('src/*').on('change', browserSync.reload); // src 안의 파일들을 감시하고 있다가, 내용이 변동되면 재실행
});

gulp.task('watch', function () {
	gulp.watch('src/html/**', gulp.series('html-build'));
	// gulp.watch('src/@resources/svgs/*.svg', gulp.series('sass:svg'));
	// gulp.watch('src/@resources/styles/@scss/**/*.scss', gulp.series('watch-sass'));
	gulp.watch(
		'src/@resources/styles/@scss/**/*.scss',
		gulp.series('watch-sass')
	);
	// gulp.watch('src/@resources/styles/*.css', gulp.series('copy:styles'));
	// gulp.watch(paths.scripts.gulp, gulp.parallel('jshint', 'copy:scripts'));
	// gulp.watch([paths.scripts.src, paths.scripts.vendor], gulp.series('copy:scripts'));
	// gulp.watch(['sources/assets/images/@sprites/*.png'], gulp.series('sprites:common', 'copy:images'));
	// gulp.watch(['sources/assets/images/*'], gulp.parallel('check', 'copy:images'));
});

gulp.task('fileinclude', function () {
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
});

gulp.task('sass', function () {
	return (
		gulp
			.src(paths.scss.src)
			.pipe(sourcemaps.init({ loadMaps: true }))
			.pipe(
				sass({ outputStyle: 'expanded', indentType: 'tab', indentWidth: 2 })
			)
			.pipe(gulp.dest(paths.scss.dest))
			.pipe(autoprefixer({ cascade: false }))
			.pipe(cleanCss({ format: 'keep-breaks' }))
			// .pipe(concat('common.css'))
			.pipe(sourcemaps.write('./maps'))
			.pipe(gulp.dest(paths.styles.dest))
			.pipe(browserSync.reload({ stream: true }))
	);
});
gulp.task('sass:svg', function () {
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
});

gulp.task('clean:dev', function () {
	return del([paths.dev]);
});
gulp.task('clean:build', function () {
	return del([paths.build]);
});

gulp.task('copy:assets', function () {
	return gulp
		.src([
			'src/@resources/**',
			'!**/@scss',
			'!**/@scss/**',
			'!**/@psd/**',
			'!**/@sprites',
			'!**/@sprites/**',
			'!**/svgs',
			'!**/svgs/**',
			'!**/@vendors/',
			'!**/@vendors/**',
		])
		.pipe(gulp.dest('build/assets/'));
});
gulp.task('copy:scripts', function () {
	return gulp
		.src('src/@resources/scripts/**')
		.pipe(gulp.dest('build/assets/scripts/'));
});
gulp.task('copy:styles', function () {
	return gulp
		.src('src/@resources/styles/**/*.css')
		.pipe(gulp.dest('build/assets/styles/'));
});
gulp.task('copy:images', function () {
	return gulp
		.src(['src/@resources/images/**', '!**/@sprites', '!**/@sprites/**'])
		.pipe(gulp.dest('build/assets/images/'));
});
gulp.task('copy:build', function () {
	return gulp.src(['dev/**']).pipe(gulp.dest('build/'));
});

gulp.task('html-build', gulp.series('fileinclude'));
gulp.task('sass-build', gulp.series('sass:svg', 'sass'), function () {});
gulp.task('watch-sass', gulp.series('sass', 'copy:styles'));

gulp.task(
	'default',
	gulp.series(
		'clean:dev',
		gulp.parallel('html-build', 'sass-build'),
		gulp.parallel('browserSync', 'watch')
	)
);

gulp.task(
	'build',
	gulp.series(
		'clean:dev',
		'clean:build',
		gulp.parallel('html-build', 'sass-build'),
		gulp.parallel('browserSync', 'watch')
	)
);
