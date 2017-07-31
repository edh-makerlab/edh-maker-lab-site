var gulp = require('gulp');
var cp = require('child_process');
var runSequence = require('run-sequence').use(gulp);
var compass = require('gulp-compass');
var uglify = require('gulp-uglify');
var clean = require('gulp-clean');
var browserSync = require('browser-sync');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var fs = require('fs');
var request = require('request');
var git = require('gulp-git');

// Copy from the .tmp to _site directory.
// To reduce build times the assets are compiles at the same time as jekyll
// renders the site. Once the rendering has finished the assets are copied.
gulp.task('copy:assets', function(done) {
  return gulp.src('.tmp/assets/**')
    .pipe(gulp.dest('_site/assets'));
});

gulp.task('compass', function() {
  return gulp.src('assets/styles/*.scss')
    .pipe(plumber())
    .pipe(compass({
      css: '.tmp/assets/styles',
      sass: 'assets/styles',
      style: 'expanded',
      sourcemap: true,
      require: ['sass-css-importer'],
      bundle_exec: true
    }))
    .on('error', function(err) {
      this.emit('end');
    })
    .pipe(browserSync.reload({stream:true}));
});

gulp.task('compress:main', function() {
  // main.min.js
  var task = gulp.src([
      'assets/scripts/*.js',
    ])
    .pipe(plumber());

    //new version of uglify is breaking things this is a hotfix DK
    task = task.pipe(concat('main.min.js'));
    console.log("concat scripts");

    return task.pipe(gulp.dest('.tmp/assets/scripts'));
});

// Build the jekyll website.
gulp.task('jekyll', function (done) {
  var args = ['exec', 'jekyll', 'build'];

  switch (environment) {
    case 'development':
      args.push('--config=_config.yml,_config-dev.yml');
    break;
    case 'stage':
      args.push('--config=_config.yml,_config-stage.yml');
    break;
    case 'production':
      args.push('--config=_config.yml');
    break;
  }

  return cp.spawn('bundle', args, {stdio: 'inherit'})
    .on('close', done);
});

// Build the jekyll website.
// Reload all the browsers.
gulp.task('jekyll:rebuild', ['jekyll'], function () {
  browserSync.reload();
});

gulp.task('build', function(done) {
  runSequence(['jekyll', 'compress:main', 'compass'], ['copy:assets'], done);
});

// Default task.
var environment = 'development';
gulp.task('default', function(done) {
  runSequence('build', done);
});

gulp.task('serve', ['build'], function () {
  browserSync({
    port: 3000,
    server: {
      baseDir: ['.tmp/', '_site/']
    }
  });

  gulp.watch(['./assets/fonts/**/*', './assets/images/**/*'], function() {
    runSequence('jekyll', browserReload);
  });

  gulp.watch('assets/styles/**/*.scss', function() {
    runSequence('compass');
  });

  gulp.watch(['./assets/scripts/**/*.js', '!./assets/scripts/vendor/**/*'], function() {
    runSequence('compress:main', browserReload);
  });

  gulp.watch(['**/*.html', '**/*.md', '**/*.json',  '_config*'], function() {
    runSequence('jekyll', browserReload);
  });

});

var shouldReload = true;
gulp.task('no-reload', function(done) {
  shouldReload = false;
  runSequence('serve', done);
});


gulp.task('prod', function(done) {
  environment = 'production';
  runSequence('clean', 'build', done);
});
gulp.task('stage', function(done) {
  environment = 'stage';
  runSequence('clean', 'build', done);
});

// Removes jekyll's _site folder
gulp.task('clean', function() {
  return gulp.src(['_site', '.tmp'], {read: false})
    .pipe(clean());
});

function browserReload() {
  if (shouldReload) {
    browserSync.reload();
  }
}
