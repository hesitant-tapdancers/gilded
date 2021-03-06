'use strict';

var gulp = require('gulp');
var del = require('del');
var browserify = require('browserify');
var reactify = require('reactify');
var source = require('vinyl-source-stream');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var livereload = require('gulp-livereload');
var nodemon = require('gulp-nodemon');
var eslint = require('gulp-eslint');
var ga = require('gulp-ga');
var jade = require('gulp-jade');

gulp.task('clean', function () {
  del.sync([
    './dist/assets',
    './dist/css',
    './dist/js',
    './dist/*.html'
  ]);
});

gulp.task('compile', ['lint-client'], function () {
  var b = browserify();
  b.transform(reactify);
  b.add('./client/js/main.js');
  return b.bundle()
    .pipe(source('main.js'))
    .pipe(gulp.dest('./dist/js'))
    .pipe(livereload());
});

gulp.task('lint-client', function () {
  return gulp.src([
    './client/**/*.js'
  ])
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('lint-server', function () {
  return gulp.src([
    './*.js',
    './server/**/*.js'
  ])
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('less', function () {
  return gulp.src('./client/less/main.less')
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(gulp.dest('./dist/css'))
    .pipe(livereload());
});

gulp.task('html', function () {
  return gulp.src('./client/**/*.html')
    .pipe(ga({
      uid: 'UA-59881274-1',
      url: 'auto',
      anonymizeIp: true
    }))
    .pipe(gulp.dest('./dist/'))
    .pipe(livereload());
});

gulp.task('css', function () {
  return gulp.src('./client/css/*.css')
    .pipe(autoprefixer())
    .pipe(gulp.dest('./dist/css'))
    .pipe(livereload());
});


gulp.task('assets', function () {
  return gulp.src('./client/assets/*')
    .pipe(gulp.dest('./dist/assets'))
    .pipe(livereload());
});

gulp.task('watch', ['build'], function () {
  livereload.listen();
  gulp.watch('./client/*.html', ['html']);
  gulp.watch('./client/css/**/*.css', ['css']);
  gulp.watch('./client/assets/*.*', ['assets']);
  gulp.watch('./client/less/**/*.less', ['less']);
  gulp.watch('./client/js/**/*.js', ['lint-client', 'compile']);
  gulp.watch(['./*.js', './server/**/*.js'], ['lint-server']);
});

gulp.task('templates', function() {
  var YOUR_LOCALS = {};

  gulp.src(['./views/faq.jade', './views/privacypolicy.jade', './views/contact-us.jade'])
    .pipe(jade({
      locals: YOUR_LOCALS
    }))
    .pipe(gulp.dest('./dist/'))
});

gulp.task('run', ['build'], function () {
  nodemon({
    script: 'server.js',
    env: { 'NODE_ENV': 'test' },
    ext: 'js',
    ignore: [
      'gulpfile.js',
      'client/**/*.js',
      'dist/**/*.js',
      'node_modules'
    ]
  });
});

gulp.task('lint', ['lint-server', 'lint-client']);

gulp.task('build', ['clean', 'compile', 'lint', 'assets', 'less', 'css', 'html', 'templates']);

gulp.task('default', ['build', 'watch', 'run']);
